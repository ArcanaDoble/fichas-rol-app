import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const current = await getUsage();
  if (current + blob.size > LIMIT_BYTES) {
    throw new Error('Límite de almacenamiento superado');
  }
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  await updateUsage(blob.size);
  return getDownloadURL(storageRef);
};
