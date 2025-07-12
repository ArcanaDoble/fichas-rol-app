import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  getMetadata,
  deleteObject,
} from 'firebase/storage';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const storage = getStorage();

const LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const USAGE_DOC = doc(db, 'storageUsage', 'usage');

const safePath = (path) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

export const getUsage = async () => {
  const snap = await getDoc(USAGE_DOC);
  return snap.exists() ? snap.data().bytesUsed || 0 : 0;
};

const updateUsage = async (delta) => {
  const current = await getUsage();
  await setDoc(USAGE_DOC, { bytesUsed: current + delta });
};

export const uploadFile = async (file, path) => {
  const current = await getUsage();
  if (current + file.size > LIMIT_BYTES) {
    throw new Error('Límite de almacenamiento superado');
  }
  const storageRef = ref(storage, safePath(path));
  try {
    await uploadBytes(storageRef, file);
  } catch (err) {
    const msg = err?.message?.toLowerCase() || '';
    if (msg.includes('cors') || msg.includes('network')) {
      throw new Error('Error de red o CORS al subir archivo');
    }
    throw err;
  }
  await updateUsage(file.size);
  return getDownloadURL(storageRef);
};

export const uploadDataUrl = async (dataUrl, path) => {
  const base64 = dataUrl.split(',')[1] || '';
  const size = Math.ceil((base64.length * 3) / 4);
  const current = await getUsage();
  if (current + size > LIMIT_BYTES) {
    throw new Error('Límite de almacenamiento superado');
  }
  const storageRef = ref(storage, safePath(path));
  try {
    await uploadString(storageRef, dataUrl, 'data_url');
  } catch (err) {
    const msg = err?.message?.toLowerCase() || '';
    if (msg.includes('cors') || msg.includes('network')) {
      throw new Error('Error de red o CORS al subir archivo');
    }
    throw err;
  }
  await updateUsage(size);
  return getDownloadURL(storageRef);
};

export const getFileHash = async (fileOrDataUrl) => {
  let buffer;
  if (typeof fileOrDataUrl === 'string') {
    const base64 = fileOrDataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    buffer = bytes.buffer;
  } else {
    buffer = await fileOrDataUrl.arrayBuffer();
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const getOrUploadFile = async (file, basePath = 'Mapas') => {
  const hash = await getFileHash(file);
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${basePath}/${hash}.${ext}`;
  const storageRef = ref(storage, safePath(path));
  let exists = true;
  try {
    await getMetadata(storageRef);
  } catch {
    exists = false;
  }
  if (!exists) {
    const current = await getUsage();
    if (current + file.size > LIMIT_BYTES) {
      throw new Error('Límite de almacenamiento superado');
    }
    await uploadBytes(storageRef, file);
    await updateUsage(file.size);
  }
  const url = await getDownloadURL(storageRef);
  const refDoc = doc(db, 'fileRefs', hash);
  await setDoc(refDoc, { url, count: increment(1) }, { merge: true });
  return { url, hash };
};

export const releaseFile = async (hash) => {
  const refDoc = doc(db, 'fileRefs', hash);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;
  const data = snap.data();
  const newCount = (data.count || 1) - 1;
  if (newCount <= 0) {
    const encoded = data.url.split('/o/')[1].split('?')[0];
    const path = decodeURIComponent(encoded);
    const storageRef = ref(storage, safePath(path));
    let size = 0;
    try {
      const meta = await getMetadata(storageRef);
      size = meta.size || 0;
    } catch {}
    await deleteObject(storageRef);
    await updateUsage(-size);
    await deleteDoc(refDoc);
  } else {
    await updateDoc(refDoc, { count: increment(-1) });
  }
};
