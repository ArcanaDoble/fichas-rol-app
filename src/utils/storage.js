import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';

const LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const USAGE_DOC = doc(db, 'storageUsage', 'usage');

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
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  await updateUsage(file.size);
  return getDownloadURL(storageRef);
};

export const uploadDataUrl = async (dataUrl, path) => {
  const base64 = dataUrl.split(',')[1] || '';
  const size = Buffer.from(base64, 'base64').length;
  const current = await getUsage();
  if (current + size > LIMIT_BYTES) {
    throw new Error('Límite de almacenamiento superado');
  }
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, 'data_url');
  await updateUsage(size);
  return getDownloadURL(storageRef);
};
