'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');
const { gzipSync, gunzipSync } = require('node:zlib');
const { requireRoom } = require('./errors.cjs');

const freshLive = () => ({ cursor: '', presence: {}, leases: {} });
const validId = id => requireRoom(/^[a-zA-Z0-9_-]{8,80}$/.test(id), 400, 'Sala no válida.');

// The callback is synchronous and side-effect free. It may be run again by a
// Firestore transaction. Omitting record or live means that part was read only.
function resultOf(before, previousLive, change) {
  const changed = !!(change.record || change.live);
  const live = changed
    ? { ...(change.live || previousLive), cursor: randomUUID() }
    : previousLive;
  return { record: change.record || before, live, result: change.result, changed };
}

function waitFor(subscribe, milliseconds, signal) {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let unsubscribe, finished = false;
    const finish = error => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      unsubscribe?.();
      if (error) reject(error);
      else resolve();
    };
    const abort = () => finish();
    const timer = setTimeout(abort, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
    try { unsubscribe = subscribe(() => finish(), finish); }
    catch (error) { finish(error); }
    if (finished) unsubscribe?.();
  });
}

class FileRoomStore {
  constructor(directory = path.join(os.homedir(), '.noma', 'canvas3d')) {
    this.directory = directory;
    this.pending = new Map();
    this.records = new Map();
    this.live = new Map();
    this.events = new EventEmitter();
    this.events.setMaxListeners(0);
  }
  async update(id, mutate) {
    validId(id);
    const operation = (this.pending.get(id) || Promise.resolve()).catch(() => {}).then(async () => {
      const filename = path.join(this.directory, id + '.json.gz');
      let previous = this.records.get(id) || null;
      if (!previous) {
        try { previous = JSON.parse(gunzipSync(await fs.readFile(filename)).toString()); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      const live = this.live.get(id) || freshLive();
      const change = mutate(previous, live);
      const next = resultOf(previous, live, change);
      if (change.record) {
        await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
        const temporary = filename + '.' + randomUUID() + '.tmp';
        try {
          await fs.writeFile(temporary, gzipSync(JSON.stringify(next.record)), { mode: 0o600 });
          await fs.rename(temporary, filename);
        } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
      }
      if (next.changed) {
        this.live.set(id, next.live);
        this.events.emit(id, next.live.cursor);
      }
      if (next.record) {
        if (this.records.size >= 32 && !this.records.has(id)) this.records.delete(this.records.keys().next().value);
        this.records.set(id, next.record);
      }
      return next;
    });
    this.pending.set(id, operation);
    try { return await operation; }
    finally { if (this.pending.get(id) === operation) this.pending.delete(id); }
  }
  wait(id, cursor, milliseconds, signal) {
    return waitFor(done => {
      const changed = current => { if (current !== cursor) done(); };
      this.events.on(id, changed);
      changed(this.live.get(id)?.cursor || '');
      return () => this.events.off(id, changed);
    }, milliseconds, signal);
  }
}

// Persist a compressed game in chunks so an imported scene or the undo history
// can exceed Firestore's one-document limit. Leases and hand positions live in
// one small separate document, including across Cloud Run instances.
const CHUNK_BYTES = 600 * 1024;
// A pointer movement needs the current owner and version, not a 600 KiB
// compressed map. Fetch the binary fields only when the durable version changed.
const liveFields = { fieldMask: ['version', 'count', 'cursor', 'presence', 'leases'] };
class FirestoreRoomStore {
  constructor(databaseId, projectId) {
    requireRoom(databaseId && databaseId !== '(default)', 503, 'Falta la base de datos independiente de Canvas 3D.');
    const { Firestore } = require('@google-cloud/firestore');
    this.db = new Firestore({ databaseId, ...(projectId ? { projectId } : {}) });
    this.cache = new Map();
  }
  remember(id, version, record) {
    if (!this.cache.has(id) && this.cache.size >= 24) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(id, { version, record });
  }
  async update(id, mutate) {
    validId(id);
    const root = this.db.collection('canvas3dRooms').doc(id);
    const runtime = root.collection('runtime').doc('live');
    const part = i => root.collection('chunks').doc(String(i));
    let writtenVersion;
    const result = await this.db.runTransaction(async transaction => {
      writtenVersion = null;
      const [manifest, snapshot] = await transaction.getAll(root, runtime, liveFields);
      const previousMeta = manifest.data();
      let previous = null;
      if (previousMeta) {
        const cached = this.cache.get(id);
        if (cached?.version === previousMeta.version) previous = cached.record;
        else {
          const refs = Array.from({ length: previousMeta.count - 1 }, (_, i) => part(i + 1));
          const [first, ...others] = await transaction.getAll(root, ...refs, { fieldMask: ['first', 'bytes'] });
          const data = Buffer.concat([first.get('first'), ...others.map(doc => doc.get('bytes'))]);
          previous = JSON.parse(gunzipSync(data).toString());
          this.remember(id, previousMeta.version, previous);
        }
      }
      const live = snapshot.data() || freshLive();
      const change = mutate(previous, live);
      const next = resultOf(previous, live, change);
      if (change.record) {
        const compressed = gzipSync(JSON.stringify(next.record));
        requireRoom(compressed.length <= 7 * 1024 * 1024, 413, 'El escenario supera la capacidad de esta sala.');
        const count = Math.ceil(compressed.length / CHUNK_BYTES);
        writtenVersion = randomUUID();
        transaction.set(root, { count, version: writtenVersion, first: compressed.subarray(0, CHUNK_BYTES) });
        for (let i = 1; i < count; i++) {
          transaction.set(part(i), { bytes: compressed.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES) });
        }
        for (let i = count; i < (previousMeta?.count || 0); i++) transaction.delete(part(i));
      }
      if (next.changed) transaction.set(runtime, next.live);
      return next;
    });
    if (writtenVersion) this.remember(id, writtenVersion, result.record);
    return result;
  }
  wait(id, cursor, milliseconds, signal) {
    validId(id);
    const live = this.db.collection('canvas3dRooms').doc(id).collection('runtime').doc('live');
    return waitFor((done, fail) => live.onSnapshot(snapshot => {
      if ((snapshot.get('cursor') || '') !== cursor) done();
    }, fail), milliseconds, signal);
  }
}

function configuredStore() {
  if (process.env.K_SERVICE || process.env.CANVAS3D_DATABASE || process.env.NODE_ENV === 'production') {
    return new FirestoreRoomStore(process.env.CANVAS3D_DATABASE, process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT);
  }
  return new FileRoomStore(process.env.CANVAS3D_DATA_DIR);
}

module.exports = { FileRoomStore, FirestoreRoomStore, configuredStore };
