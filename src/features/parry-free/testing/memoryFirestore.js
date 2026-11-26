// Local transport used by tests and the browser verification fixture only.
// The production repository still executes its real queries and transactions.
const records = new Map();
const listeners = new Set();
let queue = Promise.resolve();
export const writes = [];
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const pathFor = args => args.filter(value => typeof value === 'string').join('/');
export const getFirestore = () => ({});
export const enableIndexedDbPersistence = () => Promise.resolve();
export const doc = (...args) => ({ path:pathFor(args) });
export const collection = doc;
export const where = (field, op, value) => ({ field, op, value });
export const query = (reference, ...filters) => ({ ...reference, filters });
const snapshot = path => ({ id:path.split('/').pop(), exists:() => records.has(path), data:() => copy(records.get(path)), ref:{ path }, metadata:{ fromCache:false } });
const querySnapshot = reference => ({ docs:[...records.keys()].filter(path => {
  if (!path.startsWith(`${reference.path}/`) || path.slice(reference.path.length + 1).includes('/')) return false;
  return (reference.filters || []).every(({ field, op, value }) => op === 'array-contains' ? records.get(path)[field]?.includes(value) : records.get(path)[field] === value);
}).map(snapshot) });
export const getDocs = async reference => querySnapshot(reference);
export const onSnapshot = (reference, optionsOrNext, onNext) => {
  const next = typeof optionsOrNext === 'function' ? optionsOrNext : onNext;
  const listener = () => next(reference.path.split('/').length % 2 === 0 ? snapshot(reference.path) : querySnapshot(reference));
  listeners.add(listener); listener();
  return () => listeners.delete(listener);
};
export const runTransaction = (database, action) => {
  const operation = queue.then(async () => {
    const pending = [];
    const value = await action({ get:async reference => snapshot(reference.path), set:(reference, data) => pending.push([reference.path, copy(data)]) });
    for (const [path, data] of pending) { records.set(path, data); writes.push({ path, data:copy(data) }); }
    if (pending.length) listeners.forEach(listener => listener());
    return value;
  });
  queue = operation.catch(() => {});
  return operation;
};
export function resetMemoryFirestore() { records.clear(); listeners.clear(); writes.length = 0; queue = Promise.resolve(); }
export function seedMemoryRecord(path, value) { records.set(path, copy(value)); listeners.forEach(listener => listener()); }
export function readMemoryRecord(path) { return copy(records.get(path)); }
export const memoryStorage = () => {
  const values = new Map();
  return { get length() { return values.size; }, key:index => [...values.keys()][index] ?? null,
    getItem:key => values.get(key) ?? null, setItem:(key, value) => values.set(key, value), removeItem:key => values.delete(key), keys:() => [...values.keys()] };
};
