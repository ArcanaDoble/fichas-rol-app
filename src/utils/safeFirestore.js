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

const callHistory = new Map();
const WINDOW_MS = 1000;
const MAX_CALLS = 50;

function throttle(key) {
  const now = Date.now();
  const timestamps = callHistory.get(key) || [];
  const recent = timestamps.filter(ts => now - ts < WINDOW_MS);
  if (recent.length >= MAX_CALLS) {
    throw new Error('Demasiadas peticiones. Espera un momento e intenta de nuevo.');
  }
  recent.push(now);
  callHistory.set(key, recent);
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
