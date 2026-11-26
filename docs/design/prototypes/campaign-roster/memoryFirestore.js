// Browser verification only: all records and writes stay in this tab.
const records = new Map(), listeners = new Set();
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const notify = () => listeners.forEach(listener => listener());
export const getFirestore = () => ({});
export const enableIndexedDbPersistence = async () => {};
export const serverTimestamp = () => Date.now();
export const increment = amount => amount;
export const doc = (...args) => ({ path: args.filter(value => typeof value === 'string').join('/') });
export const collection = doc;
export const where = (field, op, value) => ({ field, op, value });
export const query = (reference, ...filters) => ({ ...reference, filters });
const documentSnapshot = path => ({ id: path.split('/').pop(), ref: { path }, exists: () => records.has(path), data: () => copy(records.get(path)) });
const snapshot = reference => {
  if (reference.path.split('/').length % 2 === 0) return documentSnapshot(reference.path);
  const docs = [...records.keys()].filter(path => path.startsWith(`${reference.path}/`) && !path.slice(reference.path.length + 1).includes('/'))
    .map(documentSnapshot).filter(entry => (reference.filters || []).every(({ field, op, value }) => op === 'array-contains' ? entry.data()[field]?.includes(value) : entry.data()[field] === value));
  return { docs, empty: !docs.length, forEach: fn => docs.forEach(fn) };
};
export const onSnapshot = (reference, next) => {
  const listener = () => next(snapshot(reference));
  listeners.add(listener); listener();
  return () => listeners.delete(listener);
};
export const getDoc = async reference => snapshot(reference);
export const getDocs = getDoc;
export const setDoc = async (reference, data, options) => {
  records.set(reference.path, copy(options?.merge ? { ...records.get(reference.path), ...data } : data)); notify();
};
export const updateDoc = (reference, data) => setDoc(reference, data, { merge: true });
export const deleteDoc = async reference => { records.delete(reference.path); notify(); };
export const addDoc = async (reference, data) => { const ref = doc(reference.path, String(Date.now())); await setDoc(ref, data); return ref; };
export const writeBatch = () => {
  const pending = [];
  return { set: (...args) => pending.push(args), commit: async () => { for (const args of pending) await setDoc(...args); } };
};
let queue = Promise.resolve();
export const runTransaction = (database, callback) => {
  const operation = queue.then(async () => {
    const pending = [];
    const result = await callback({ get: getDoc, set: (...args) => pending.push(args) });
    for (const args of pending) await setDoc(...args);
    return result;
  });
  queue = operation.catch(() => {});
  return operation;
};
export const seed = (path, data) => records.set(path, copy(data));
