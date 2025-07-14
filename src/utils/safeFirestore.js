import {
  doc as fbDoc,
  getDoc as fbGetDoc,
  setDoc as fbSetDoc,
  deleteDoc as fbDeleteDoc,
  collection as fbCollection,
  getDocs as fbGetDocs,
  onSnapshot as fbOnSnapshot,
  updateDoc as fbUpdateDoc,
  increment as fbIncrement,
} from 'firebase/firestore';

const lastCall = new Map();
const LIMIT_MS = 1000;

function throttle(key) {
  const now = Date.now();
  const prev = lastCall.get(key) || 0;
  if (now - prev < LIMIT_MS) {
    throw new Error('Peticiones demasiado seguidas. Intentar más tarde.');
  }
  lastCall.set(key, now);
}

export const doc = (...args) => fbDoc(...args);
export const collection = (...args) => fbCollection(...args);
export const increment = (...args) => fbIncrement(...args);
export const onSnapshot = (...args) => fbOnSnapshot(...args);

export async function getDoc(ref) {
  throttle(`getDoc:${ref.path}`);
  return fbGetDoc(ref);
}

export async function setDoc(ref, data, options) {
  throttle(`setDoc:${ref.path}`);
  return fbSetDoc(ref, data, options);
}

export async function deleteDoc(ref, options) {
  throttle(`deleteDoc:${ref.path}`);
  return fbDeleteDoc(ref, options);
}

export async function getDocs(q) {
  throttle(`getDocs:${q._queryPath?.canonicalString || q.path}`);
  return fbGetDocs(q);
}

export async function updateDoc(ref, data) {
  throttle(`updateDoc:${ref.path}`);
  return fbUpdateDoc(ref, data);
}
