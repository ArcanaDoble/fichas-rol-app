'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { FileRoomStore } = require('./store.cjs');
const { createHandler } = require('./server.cjs');

const scene = { id: 'patio', name: 'Patio de Ceniza', cols: 8, rows: 6, image: '/canvas3d/secret-fondo.webp',
  terrain: [], enemies: [{ id: 'duende', name: 'Mella', x: 4.5, z: 2.5, life: 6, defense: 4 },
    { id: 'espia', name: 'Tras la puerta de ceniza', x: 7.5, z: 5.5, hidden: true }] };
const character = (name, isBarbarian) => ({
  id: name, name, className: isBarbarian ? 'Bárbaro' : 'Pícaro', life: 7, defense: 5, actionDice: [8, 6, 4],
  isBarbarian, pool: [{ id: 'hatchet', name: 'Hacha de viaje', kind: 'weapon', dice: [6], hands: 1, thrown: true }],
});
const pilotKey = 'ensayo-del-servidor';
async function start(directory) {
  const server = http.createServer(createHandler({ store: new FileRoomStore(directory), pilotKey, allowLoopback: false }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/canvas3d/rooms';
  const request = async (suffix, actor, body, expected = 200, hand = actor?.token.slice(0, 12)) => {
    const response = await fetch(base + suffix, { method: body ? 'POST' : 'GET', headers: {
      ...(actor && { Authorization: 'Bearer ' + actor.token }), ...(hand && { 'X-Canvas-Hand': hand }),
      ...(body && { 'Content-Type': 'application/json' }),
    }, ...(body && { body: JSON.stringify(body) }) });
    const data = await response.json();
    assert.equal(response.status, expected, JSON.stringify(data));
    return data;
  };
  const create = () => request('', null, { masterKey: pilotKey, title: 'Expedición', scene }, 201);
  const view = (who, suffix = '') => request('/' + who.roomId + '/view' + suffix, who);
  const post = (who, route, data, status) => request('/' + who.roomId + '/' + route, who, data, status);
  const seat = async (gm, seatId, name) => {
    const inv = await post(gm, 'invites', { seatId }, 201);
    const player = await request('/' + gm.roomId + '/join', null, { invite: inv.invite, name });
    return { player, inv };
  };
  const command = async (who, input, leaseId) => {
    const body = { command: input, operationId: randomUUID(), baseRevision: (await view(who)).revision, leaseId };
    return { result: await post(who, 'commands', body), body };
  };
  const withPiece = async (who, input) => {
    const { granted, leaseId } = await post(who, 'grab', { pieceId: input.pieceId });
    assert.equal(granted, true);
    return command(who, input, leaseId);
  };
  const stop = () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  const map = (who, asSeat) => fetch(base + '/' + who.roomId + '/map' + (asSeat ? '?asSeat=' + asSeat : ''),
    { headers: { authorization: 'Bearer ' + who.token } });
  return { base, request, view, post, map, create, seat, command, withPiece, stop };
}
async function temporary(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'noma-canvas3d-room-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('master and four independent seats, atomic hands, die result, group travel and reconnection', async t => {
  const dir = await temporary(t);
  const api = await start(dir);
  t.after(api.stop);
  const gm = await api.create();
  const guests = await Promise.all(['Bran', 'Zorzal', 'Hark', 'Nube'].map((name, index) =>
    api.seat(gm, 'puesto' + (index + 1), name)));
  const players = guests.map(g => g.player);
  await Promise.all(players.map((p, i) => api.command(p, { type: 'seat', seatId: p.seatId, name: p.name,
    character: character(p.name, i % 2 === 0) })));
  const full = await api.view(gm);
  assert.equal(Object.keys(full.game.seats).length, 4);
  assert.equal(full.game.seats.puesto1.className, full.game.seats.puesto3.className);
  assert.notEqual(full.game.seats.puesto1.matId, full.game.seats.puesto3.matId);
  assert.equal(full.presence.length, 5);
  const [barbarian, rogue] = players;
  const axe = 'puesto1:equipo1';
  await api.withPiece(barbarian, { type: 'drop', pieceId: axe, parentId: 'puesto1:mat', slot: 'hand1' });
  const contenders = await Promise.all([barbarian, rogue].map(p => api.post(p, 'grab', { pieceId: axe })));
  assert.equal(contenders.filter(g => g.granted).length, 1);
  const winner = contenders[0].granted ? 0 : 1;
  await api.post(players[winner], 'release', { pieceId: axe, leaseId: contenders[winner].leaseId });
  const visibleEnemy = Object.values(full.game.pieces).find(p => p.name === 'Mella');
  await api.withPiece(barbarian, { type: 'drop', pieceId: 'puesto1:peana', x: 2.5, z: 2.5 });
  await api.withPiece(rogue, { type: 'drop', pieceId: 'puesto2:peana', x: .5, z: .5 });
  await api.withPiece(barbarian, { type: 'drop', pieceId: 'puesto1:accion1', targetId: visibleEnemy.id, value: 7 });
  await api.withPiece(barbarian, { type: 'drop', pieceId: axe, targetId: visibleEnemy.id, values: [4] });
  assert.equal((await api.view(rogue)).game.pieces[axe].parentId, null);
  const { result, body } = await api.withPiece(rogue, { type: 'drop', pieceId: axe, parentId: 'puesto2:mat', slot: 'hand1' });
  const duplicate = await api.post(rogue, 'commands', body);
  assert.equal(duplicate.revision, result.revision);
  const after = await api.view(barbarian);
  assert.equal(after.game.pieces[axe].parentId, 'puesto2:mat');
  assert.equal(after.game.pieces['puesto1:accion1'].value, 7);
  assert.ok(after.game.log.some(entry => entry.warning && /alcance/.test(entry.text)));
  await api.post(gm, 'undo', { operationId: randomUUID(), baseRevision: result.revision });
  assert.equal((await api.view(rogue)).game.pieces[axe].parentId, null);
  await api.command(gm, { type: 'scene', scene: { id: 'bosque', name: 'Bosque', cols: 7, rows: 7 } });
  assert.equal((await api.view(rogue)).game.pieces[axe], undefined);
  await api.command(gm, { type: 'scene', sceneId: 'patio' });
  const reopened = await start(dir);
  t.after(reopened.stop);
  const restored = await reopened.view(rogue);
  const landed = restored.game.pieces[axe];
  assert.equal(landed.parentId, null);
  assert.deepEqual([Math.floor(landed.x), Math.floor(landed.z)],
    [Math.floor(visibleEnemy.x), Math.floor(visibleEnemy.z)]);
  assert.ok(Math.hypot(landed.x - visibleEnemy.x, landed.z - visibleEnemy.z) > 0);
  const pickedUp = await reopened.post(rogue, 'grab', { pieceId: axe });
  assert.ok(pickedUp.granted);
  await reopened.post(rogue, 'release', { pieceId: axe, leaseId: pickedUp.leaseId });
  assert.equal(restored.game.seats.puesto2.characterName, 'Zorzal');
});

test('single-use seats, secret projection, hidden hand, immutable actor and preview', async t => {
  const api = await start(await temporary(t));
  t.after(api.stop);
  await api.request('', null, { masterKey: 'otra', scene }, 403);
  const gm = await api.create();
  const { player, inv } = await api.seat(gm, 'puesto1', 'Ana');
  await api.request('/' + gm.roomId + '/join', null, { invite: inv.invite, name: 'Otro' }, 401);
  await api.post(player, 'invites', { seatId: 'puesto2' }, 403);
  const isolated = await api.create();
  await api.request('/' + isolated.roomId + '/view', player, null, 401);
  await api.request('/' + gm.roomId + '/view?asSeat=master', player, null, 403);
  const hidden = Object.values((await api.view(gm)).game.pieces).find(p => p.sourceId === 'espia');
  assert.ok(hidden);
  const held = await api.post(gm, 'grab', { pieceId: hidden.id });
  await api.post(gm, 'drag', { pieceId: hidden.id, leaseId: held.leaseId, x: 3, z: 3 });
  const guest = await api.view(player);
  assert.ok(!JSON.stringify(guest).includes(hidden.name));
  assert.ok(!JSON.stringify(guest).includes('secret-fondo.webp'));
  assert.equal(guest.game.scenes.patio.mapProtected, true);
  assert.deepEqual(guest.grabs, {});
  assert.deepEqual((await api.view(gm, '?asSeat=puesto1')).game, guest.game);
  await api.post(player, 'grab', { pieceId: hidden.id }, 404);
  await api.post(player, 'commands', { command: { type: 'reveal', pieceId: hidden.id }, operationId: randomUUID(), baseRevision: 0 }, 403);
  await api.post(player, 'commands', { command: { type: 'seat', seatId: 'puesto2',
    character: character('Suplantado', true) }, operationId: randomUUID(), baseRevision: 0 }, 403);
  const renewed = await api.seat(gm, 'puesto1', 'Ana en otro móvil');
  await api.request('/' + gm.roomId + '/view', player, null, 401);
  assert.equal(renewed.player.seatId, 'puesto1');
});

test('an active spectator receives the moved hand and a stale master cannot undo another command', async t => {
  const api = await start(await temporary(t));
  t.after(api.stop);
  const gm = await api.create();
  const { player } = await api.seat(gm, 'puesto1', 'Pícaro');
  await api.view(gm);
  const snapshot = await api.view(player);
  const event = api.view(player, '?after=' + snapshot.cursor + '&wait=1&known=' + snapshot.revision);
  const held = await api.post(gm, 'grab', { pieceId: 'caja' });
  const live = await event;
  assert.equal(live.grabs.caja.seatId, 'master');
  assert.equal(live.game, undefined);
  const pose = { height: .8, orientation: [0, 0, 0, 1], rolling: true,
    percentileOrientation: [[1, 0, 0, 0], [0, 1, 0, 0]] };
  await api.post(gm, 'drag', { pieceId: 'caja', leaseId: held.leaseId, x: 2, z: 1, pose });
  const flight = (await api.view(player)).grabs.caja;
  assert.equal(flight.height, .8);
  assert.deepEqual(flight.percentileOrientation, pose.percentileOrientation);
  assert.equal(flight.rolling, true);
  await api.post(gm, 'drag', { pieceId: 'caja', leaseId: held.leaseId, x: 2, z: 1,
    pose: { orientation: [50,0,0,0] } }, 400);
  const played = await api.command(gm, { type: 'bag', pieceId: 'caja' }, held.leaseId);
  await api.post(gm, 'undo', { operationId: randomUUID(), baseRevision: played.result.revision - 1 }, 409);
  assert.equal((await api.view(player)).game.pieces.caja.open, true);
});

test('piece artwork is a bounded WebP and follows the actual room and seat projection', async t => {
  const sharp = require('sharp');
  const api = await start(await temporary(t));
  t.after(api.stop);
  const gm = await api.request('', null, { masterKey: pilotKey, scene: {
    ...scene, enemies: [
      { ...scene.enemies[0], image: '/canvas3d/box/picaro.webp' },
      { ...scene.enemies[1], image: '/canvas3d/box/mandoble.webp' },
      { id: 'otro', name: 'Otro', x: .5, z: .5, image: 'https://example.org/retrato.webp' },
    ],
  } }, 201);
  const { player } = await api.seat(gm, 'puesto1', 'Niebla');
  const game = (await api.view(gm)).game;
  const enemyId = ref => Object.values(game.pieces).find(p => p.sourceId === ref).id;
  const visible = enemyId('duende'), hidden = enemyId('espia');
  const art = (actor, pieceId, asSeat) => fetch(
    api.base + '/' + actor.roomId + '/art?'
      + new URLSearchParams({ pieceId, ...(asSeat && { asSeat }), url: '/canvas3d/box/picaro.webp' }),
    { headers: { authorization: 'Bearer ' + actor.token } });
  for (const actor of [gm, player]) {
    const ok = await art(actor, visible);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/webp');
    const meta = await sharp(Buffer.from(await ok.arrayBuffer())).metadata();
    assert.ok(meta.width <= 512 && meta.height <= 512);
  }
  const unknown = await art(player, 'ausente');
  assert.equal(unknown.status, 404);
  const message = await unknown.text();
  for (const response of [await art(player, hidden), await art(gm, hidden, 'puesto1'), await art(player, enemyId('otro'))]) {
    assert.equal(response.status, 404);
    assert.equal(await response.text(), message);
  }
  assert.equal((await art(player, hidden, 'master')).status, 403);
  assert.equal((await art(gm, hidden)).status, 200);
  await api.command(gm, { type: 'reveal', pieceId: hidden, hidden: false });
  assert.equal((await art(player, hidden)).status, 200);
});

test('protected artwork endpoint only serves current visible pixels, including master preview', async t => {
  const sharp = require('sharp');
  const api = await start(await temporary(t));
  t.after(api.stop);
  async function illustratedRoom(secretColor) {
    const data = Buffer.alloc(384 * 192 * 3);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 384; x++) {
      const index = (y * 384 + x) * 3;
      data[index + (x < 192 ? 1 : secretColor)] = 255;
    }
    const png = await sharp(data, { raw: { width: 384, height: 192, channels: 3 } }).png().toBuffer();
    const gm = await api.request('', null, { masterKey: pilotKey, scene: { id: 'secreto', name: 'Secreto',
      cols: 2, rows: 1, imagePrivate: true, image: 'data:image/png;base64,' + png.toString('base64'),
      terrain: [{ id: 'velo', kind: 'fog', x: 1.5, z: .5, width: 1, depth: 1 }] } }, 201);
    const { player } = await api.seat(gm, 'puesto1', 'Visitante');
    const { game } = await api.view(player);
    assert.equal(game.scenes.secreto.visibility.rowsMask[0], '10');
    assert.ok(!JSON.stringify(game).includes('data:image'));
    const response = await api.map(player);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const pixels = await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < pixels.info.height; y++) for (let x = 0; x < pixels.info.width; x++) {
      const at = (y * pixels.info.width + x) * 4;
      if (x >= pixels.info.width / 2) assert.equal(pixels.data[at + 3], 0);
    }
    const preview = await api.map(gm, 'puesto1');
    assert.deepEqual(await sharp(Buffer.from(await preview.arrayBuffer())).ensureAlpha().raw().toBuffer(), pixels.data);
    assert.equal((await api.map(player, 'master')).status, 403);
    return pixels.data;
  }
  // Even transparent RGB channels must not contain the original hidden room.
  assert.deepEqual(await illustratedRoom(0), await illustratedRoom(2));
});

test('partial-cell fog erases private artwork even when the centre of every tile is visible', async () => {
  const sharp = require('sharp');
  const { createGame, projectGame } = require('../../src/features/canvas/table3d/game.cjs');
  const { renderMapImage } = require('./map-image.cjs');
  const pixels = await sharp({create:{width:128,height:64,channels:4,background:'#8b633a'}}).png().toBuffer();
  const game = createGame({id:'vela',scene:{id:'mapa',name:'Mapa',cols:2,rows:1,
    image:'data:image/png;base64,'+pixels.toString('base64'),
    terrain:[{id:'oculto',kind:'fog',x:1.125,z:0.5,width:.25,depth:1}]}});
  const viewer = projectGame(game,'puesto1').scenes.mapa;
  assert.deepEqual(viewer.visibility.rowsMask,['11']);
  const masked = await renderMapImage({scene:game.scenes.mapa,visibleScene:viewer,seatId:'puesto1'});
  const {info,data} = await sharp(masked.body).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha = x => data[(Math.floor(info.height/2)*info.width + Math.floor(x/2*info.width))*4+3];
  assert.equal(alpha(1.12),0);
  assert.equal(alpha(1.5),255);
});

test('calibrated art clips outside the board and uses rectangular cells and the same world coordinates as vision', async () => {
  const sharp = require('sharp');
  const { renderMapImage } = require('./map-image.cjs');
  const rgb = Buffer.alloc(300 * 100 * 3);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 300; x++) {
    const i = (y * 300 + x) * 3;
    rgb[i] = 230;
    if (x >= 150) rgb[i + 1] = 230;
  }
  const png = await sharp(rgb, { raw: { width: 300, height: 100, channels: 3 } }).png().toBuffer();
  const scene = { id: 'calibrada', cols: 4, rows: 2, cellAspect: 1.5,
    imageBounds: { x: .75, z: 1, width: 2, depth: 1 }, image: 'data:image/png;base64,' + png.toString('base64') };
  async function points(seatId) {
    const masked = await renderMapImage({ scene, visibleScene: { id: scene.id, visibility: { rowsMask: ['1000', '1000'] } }, seatId });
    const { data, info } = await sharp(masked.body).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, info.height * 3);
    return (x, z) => {
      const i = (Math.floor(z / 2 * info.height) * info.width + Math.floor(x / 4 * info.width)) * 4;
      return [...data.subarray(i, i + 4)];
    };
  }
  const player = await points('puesto1'), master = await points('master');
  assert.ok(master(.25, .75)[0] > 190 && master(.25, .75)[1] < 40);
  assert.ok(master(1.5, 1.3)[0] > 190 && master(1.5, 1.3)[1] > 190);
  assert.equal(master(2.25, 1)[3], 0);
  assert.equal(master(.25, .25)[3], 0);
  assert.equal(player(.25, .75)[3], 255);
  assert.equal(player(1.5, 1.3)[3], 0);
  for (const image of ['/canvas3d/../yerma/Yerma.webp', 'https://example.org/map.webp']) {
    const invalid = await renderMapImage({ scene: { ...scene, image }, visibleScene: scene, seatId: 'master' });
    assert.equal(invalid, null);
  }
});
