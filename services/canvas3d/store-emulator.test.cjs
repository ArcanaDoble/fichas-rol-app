'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { FirestoreRoomStore } = require('./store.cjs');
const { RoomService } = require('./rooms.cjs');
const game = require('../../src/features/canvas/table3d/game.cjs');

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const enabled = /^(127\.0\.0\.1|localhost):\d+$/.test(emulator || '');
const project = 'demo-noma-canvas3d', database = 'noma-canvas3d';

test('two instances see the same leases and ordered commits in the isolated Firestore database',
  { skip: !enabled, timeout: 45_000 }, async t => {
    const a = new FirestoreRoomStore(database, project), b = new FirestoreRoomStore(database, project);
    t.after(() => Promise.all([a.db.terminate(), b.db.terminate()]));
    const one = new RoomService({ store: a, model: game, pilotKey: 'ensayo' });
    const two = new RoomService({ store: b, model: game, pilotKey: 'ensayo' });
    const gm = await one.create({ scene: { id: 'patio', cols: 6, rows: 5 }, masterKey: 'ensayo' }, false);
    const ticket = await one.invite(gm.roomId, gm.token, 'puesto1');
    const visitor = await two.join(gm.roomId, { invite: ticket.invite, name: 'Invitado' });
    await one.snapshot(gm.roomId, gm.token, null);
    const before = await two.snapshot(gm.roomId, visitor.token, null);
    const notice = two.snapshot(gm.roomId, visitor.token, null, before.cursor, 10000);
    const lock = await one.handlePiece(gm.roomId, gm.token, 'g', 'grab', { pieceId: 'caja' });
    assert.ok(lock.granted);
    assert.equal((await notice).grabs.caja.seatId, 'master');
    const race = await two.handlePiece(gm.roomId, visitor.token, 'v', 'grab', { pieceId: 'caja' });
    assert.equal(race.granted, false);
    const action = { operationId: randomUUID(), baseRevision: 0, command: { type: 'bag', pieceId: 'caja' }, leaseId: lock.leaseId };
    assert.equal((await one.command(gm.roomId, gm.token, 'g', action)).revision, 1);
    assert.equal((await two.command(gm.roomId, gm.token, 'g', action)).revision, 1);
    assert.equal((await two.snapshot(gm.roomId, visitor.token, null)).game.pieces.caja.open, true);
  });

test('a calibrated expedition can exceed a single native Firestore document', { skip: !enabled, timeout: 45_000 }, async t => {
  const data = randomBytes(750 * 1024).toString('base64'), id = randomUUID();
  const a = new FirestoreRoomStore(database, project), b = new FirestoreRoomStore(database, project);
  t.after(() => Promise.all([a.db.terminate(), b.db.terminate()]));
  await a.update(id, () => ({ record: { data } }));
  const before = await b.update(id, record => ({ result: record.data === data }));
  assert.ok(before.result);
  await a.update(id, () => ({ record: { data: 'expedición corta' } }));
  const after = await b.update(id, record => ({ result: record.data }));
  assert.equal(after.result, 'expedición corta');
});
