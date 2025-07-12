import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
