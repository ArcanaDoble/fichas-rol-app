'use strict';

const { createHash, randomBytes, randomInt, timingSafeEqual } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { requireRoom, RoomError } = require('./errors.cjs');

const SEATS = ['puesto1', 'puesto2', 'puesto3', 'puesto4'];
const PLAYER_COMMANDS = new Set(['seat', 'drop', 'roll', 'bag', 'drawer', 'turn', 'resolve']);
const PIECE_COMMANDS = new Set(['drop', 'roll', 'bag']);
const PRESENCE = 40_000;
const LEASE = 8_000;
const MAX_HISTORY = 16;
const token = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('hex');
const validProof = value => typeof value === 'string' && /^[A-Za-z0-9_-]{32,120}$/.test(value);
const human = (name, fallback) => (typeof name === 'string' ? name.trim().slice(0, 70) : '') || fallback;
const safeRole = actor => ({ role: actor.role, name: actor.name, seatId: actor.seatId });
const session = (id, actor, secret) => ({ roomId: id, ...safeRole(actor), token: secret });

function sameSecret(provided, actual) {
  return typeof provided === 'string' && typeof actual === 'string' && actual.length > 0
    && timingSafeEqual(Buffer.from(digest(provided), 'hex'), Buffer.from(digest(actual), 'hex'));
}

function authenticate(record, secret) {
  requireRoom(record && validProof(secret), 401, 'Necesitas una invitación válida para esta mesa.');
  const key = digest(secret);
  const actor = Object.values(record.members).find(member => member.key === key);
  requireRoom(actor, 401, 'La sesión de esta mesa ha caducado.');
  return actor;
}

function perspective(actor, asSeat) {
  if (!asSeat || asSeat === actor.seatId) return actor.seatId;
  requireRoom(actor.role === 'master' && SEATS.includes(asSeat), 403, 'Perspectiva reservada al máster.');
  return asSeat;
}

function visibleMapPoint(scene, x, z) {
  const mask = scene?.visibility?.rowsMask;
  const col = Math.floor(x), row = Math.floor(z);
  if (!mask || col < 0 || row < 0 || col >= scene.cols || row >= scene.rows) return true;
  return mask[row]?.[col] === '1' || mask[row]?.[col] === 1;
}

function visibleView(model, game, viewer) {
  const projection = model.projectGame(game, viewer);
  if (viewer === 'master') return projection;
  const original = game.scenes[game.sceneId];
  const scene = projection.scenes?.[game.sceneId];
  if (!scene || !original?.image || original.playerImage || !(scene.mapProtected || original.imagePrivate
      || scene.visibility?.rowsMask?.some(row => row.includes('0')))) return projection;
  const safeScene = { ...scene, image: '', mapProtected: true };
  return { ...projection, scenes: { [game.sceneId]: safeScene } };
}

// Undo only what this command changed; background artwork and unchanged scenes
// are large and usually identical. Credentials, leases and revision never rewind.
function reversePatch(before, after, path = [], result = []) {
  if (Object.is(before, after)) return result;
  const map = value => value && typeof value === 'object' && !Array.isArray(value);
  if (map(before) && map(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const next = [...path, key];
      if (!Object.hasOwn(before, key)) result.push({ path: next, remove: true });
      else if (!Object.hasOwn(after, key)) result.push({ path: next, value: before[key] });
      else reversePatch(before[key], after[key], next, result);
    }
  } else if (!isDeepStrictEqual(before, after)) result.push({ path, value: before });
  return result;
}

function restore(value, patch) {
  const restored = structuredClone(value);
  for (const entry of patch) {
    const key = entry.path.at(-1);
    const owner = entry.path.slice(0, -1).reduce((object, field) => object[field], restored);
    if (entry.remove) delete owner[key];
    else Object.defineProperty(owner, key, { value: entry.value, writable: true, configurable: true, enumerable: true });
  }
  return restored;
}

function ancestry(pieces, id) {
  const ids = new Set();
  for (let at = pieces[id]; at && !ids.has(at.id); at = pieces[at.parentId]) ids.add(at.id);
  return ids;
}

function blockingLease(pieces, leases, pieceId, actor, hand, time) {
  const parents = ancestry(pieces, pieceId);
  return Object.entries(leases).find(([id, lease]) => lease.until > time
    && (lease.member !== actor.key || lease.hand !== hand)
    && (parents.has(id) || ancestry(pieces, id).has(pieceId)));
}

function safePayload(input) {
  requireRoom(input && typeof input === 'object' && !Array.isArray(input), 400, 'Acción no válida.');
  return input;
}

function unitQuaternion(input) {
  requireRoom(Array.isArray(input) && input.length === 4
    && input.every(n => Number.isFinite(n) && Math.abs(n) <= 1.01), 400, 'Orientación de la pieza no válida.');
  const length = Math.hypot(...input);
  requireRoom(length > .9 && length < 1.1, 400, 'Orientación de la pieza no válida.');
  return input.map(n => n / length);
}

function readPose(input) {
  if (input == null) return undefined;
  requireRoom(typeof input === 'object' && !Array.isArray(input), 400, 'Postura de la pieza no válida.');
  const pose = {};
  if (input.height != null) {
    requireRoom(Number.isFinite(input.height) && input.height >= -.2 && input.height <= 100, 400, 'Altura de la pieza no válida.');
    pose.height = Math.max(0, input.height);
  }
  if (input.orientation != null) pose.orientation = unitQuaternion(input.orientation);
  if (input.rolling != null) {
    requireRoom(typeof input.rolling === 'boolean', 400, 'Rodadura de la pieza no válida.');
    pose.rolling = input.rolling;
  }
  if (input.percentileOrientation != null) {
    requireRoom(Array.isArray(input.percentileOrientation) && input.percentileOrientation.length === 2, 400, 'Postura del d100 no válida.');
    pose.percentileOrientation = input.percentileOrientation.map(unitQuaternion);
  }
  return pose;
}

function validateReferences(view, command) {
  const candidates = ['pieceId', 'parentId', 'targetId', 'sourceId', 'dieId', 'interactionDieId'];
  for (const field of candidates) {
    if (command[field]) requireRoom(typeof command[field] === 'string'
      && Object.hasOwn(view.pieces, command[field]), 404, 'Esa pieza ya no está disponible.');
  }
}

class RoomService {
  constructor({ store, model, pilotKey, allowLoopback = false, now = Date.now }) {
    this.store = store;
    this.model = model;
    this.pilotKey = pilotKey;
    this.allowLoopback = allowLoopback;
    this.now = now;
    this.views = new Map();
  }
  view(record, viewer) {
    const key = record.game.id + '/' + record.revision + '/' + viewer;
    if (this.views.has(key)) return this.views.get(key);
    const value = visibleView(this.model, record.game, viewer);
    if (this.views.size >= 40) this.views.delete(this.views.keys().next().value);
    this.views.set(key, value);
    return value;
  }
  async create(body, loopback) {
    requireRoom((this.allowLoopback && loopback) || sameSecret(body.masterKey, this.pilotKey), 403,
      'Introduce la clave de máster de Canvas 3D.');
    const id = body.requestRoomId || randomBytes(12).toString('hex');
    const secret = validProof(body.proof) ? body.proof : token();
    const actor = { role: 'master', seatId: 'master', name: human(body.name, 'Máster'), key: digest(secret) };
    const created = await this.store.update(id, record => {
      if (record) {
        requireRoom(record.members.master.key === actor.key, 409, 'Esa mesa ya existe.');
        return { result: { ...session(id, actor, secret), revision: record.revision } };
      }
      let game;
      try { game = this.model.createGame({ id, title: human(body.title, 'Mesa de Roguelike'), scene: body.scene }); }
      catch (error) { throw new RoomError(400, error.message || 'Escenario no válido.'); }
      return {
        record: { game, revision: 0, history: [], receipts: [], floor: 0, members: { master: actor }, invites: {} },
        result: { ...session(id, actor, secret), revision: 0 },
      };
    });
    return created.result;
  }
  async invite(id, secret, target) {
    requireRoom(SEATS.includes(target), 400, 'Elige uno de los cuatro puestos.');
    const code = token();
    await this.store.update(id, record => {
      const actor = authenticate(record, secret);
      requireRoom(actor.role === 'master', 403, 'Solo el máster puede invitar.');
      const invitation = { key: digest(code), expires: this.now() + 24 * 60 * 60 * 1000 };
      return { record: { ...record, invites: { ...record.invites, [target]: invitation } } };
    });
    return { roomId: id, seatId: target, invite: code };
  }
  async join(id, body) {
    requireRoom(validProof(body.invite), 401, 'La invitación no es válida.');
    const code = digest(body.invite);
    const secret = validProof(body.proof) ? body.proof : token();
    const key = digest(secret);
    const changed = await this.store.update(id, (record, live) => {
      const existing = Object.values(record?.members || {}).find(member => member.invite === code && member.key === key);
      if (existing) return { result: { ...session(id, existing, secret), revision: record.revision } };
      const entry = Object.entries(record?.invites || {}).find(([, inv]) => inv.key === code && inv.expires > this.now());
      requireRoom(entry, 401, 'Esta invitación ya se utilizó o ha caducado.');
      const [seatId] = entry;
      const actor = { role: 'player', seatId, name: human(body.name, 'Jugador'), key, invite: code };
      const invites = { ...record.invites };
      delete invites[seatId];
      const leases = Object.fromEntries(Object.entries(live.leases).filter(([, l]) => l.seatId !== seatId));
      return {
        record: { ...record, members: { ...record.members, [seatId]: actor }, invites },
        live: { ...live, leases, presence: { ...live.presence, [seatId]: this.now() } },
        result: { ...session(id, actor, secret), revision: record.revision },
      };
    });
    return changed.result;
  }
  async snapshot(id, secret, asSeat, after, wait, signal) {
    const touch = () => this.store.update(id, (record, live) => {
      const actor = authenticate(record, secret);
      const viewer = perspective(actor, asSeat);
      const time = this.now();
      const updatePresence = (live.presence[actor.seatId] || 0) < time - 12_000;
      return {
        ...(updatePresence && { live: { ...live, presence: { ...live.presence, [actor.seatId]: time } } }),
        result: { actor, viewer },
      };
    });
    let row = await touch();
    if (after && after === row.live.cursor && wait) {
      await this.store.wait(id, after, wait, signal);
      if (signal?.aborted) return null;
      row = await touch();
    }
    const { record, live, result: { actor, viewer } } = row;
    const game = this.view(record, viewer);
    const time = this.now();
    const presence = Object.values(record.members).filter(member => live.presence[member.seatId] >= time - PRESENCE)
      .map(safeRole);
    const grabs = {};
    for (const [pieceId, lease] of Object.entries(live.leases)) {
      if (lease.until <= time || !Object.hasOwn(game.pieces, pieceId)) continue;
      if (Number.isFinite(lease.x) && !visibleMapPoint(game.scenes[game.sceneId], lease.x, lease.z)) continue;
      grabs[pieceId] = { seatId: lease.seatId, name: lease.name,
        ...(Number.isFinite(lease.x) && { x: lease.x, z: lease.z, ...lease.pose }) };
    }
    return { game, presence, grabs, revision: record.revision, cursor: live.cursor,
      canUndo: actor.role === 'master' && viewer === 'master' && record.history.length > 0 };
  }
  async map(id, secret, asSeat) {
    const row = await this.store.update(id, record => {
      const actor = authenticate(record, secret);
      const seatId = perspective(actor, asSeat);
      const game = this.view(record, seatId);
      return { result: { scene: record.game.scenes[game.sceneId], visibleScene: game.scenes[game.sceneId], seatId } };
    });
    return row.result;
  }
  async art(id, secret, asSeat, pieceId) {
    const row = await this.store.update(id, record => {
      const actor = authenticate(record, secret);
      const game = this.view(record, perspective(actor, asSeat));
      const piece = typeof pieceId === 'string' && Object.hasOwn(game.pieces, pieceId) ? game.pieces[pieceId] : null;
      return { result: piece?.image || null };
    });
    return row.result;
  }
  async handlePiece(id, secret, hand, operation, body) {
    const pieceId = body.pieceId;
    requireRoom(typeof pieceId === 'string' && pieceId.length <= 200, 400, 'Pieza no válida.');
    const changed = await this.store.update(id, (record, live) => {
      const actor = authenticate(record, secret);
      const view = this.view(record, actor.seatId);
      const current = Object.hasOwn(live.leases, pieceId) ? live.leases[pieceId] : null;
      const mine = current?.member === actor.key && current?.hand === hand;
      if (operation === 'release') {
        if (!mine || current.id !== body.leaseId) return { result: { released: false } };
        const leases = { ...live.leases };
        delete leases[pieceId];
        return { live: { ...live, leases }, result: { released: true } };
      }
      validateReferences(view, { pieceId });
      const time = this.now();
      if (operation === 'grab') {
        if (blockingLease(record.game.pieces, live.leases, pieceId, actor, hand, time)) return { result: { granted: false } };
        if (body.leaseId && (!mine || current.id !== body.leaseId || current.until <= time)) return { result: { granted: false } };
        const lease = mine && current.until > time ? { ...current, until: time + LEASE } :
          { id: token(), member: actor.key, seatId: actor.seatId, name: actor.name, hand, until: time + LEASE };
        return { live: { ...live, leases: { ...live.leases, [pieceId]: lease } }, result: { granted: true, leaseId: lease.id } };
      }
      requireRoom(mine && current.until > time && body.leaseId === current.id, 409, 'La pieza ya ha cambiado de manos.');
      requireRoom([body.x, body.z].every(n => Number.isFinite(n) && Math.abs(n) <= 100000), 400, 'Posición no válida.');
      const pose = readPose(body.pose);
      const lease = { ...current, x: body.x, z: body.z, pose: pose || {}, until: time + LEASE };
      return { live: { ...live, leases: { ...live.leases, [pieceId]: lease } }, result: { moved: true } };
    });
    return changed.result;
  }
  async command(id, secret, hand, body, undo = false) {
    requireRoom(typeof body.operationId === 'string' && /^[\w-]{12,100}$/.test(body.operationId), 400, 'Falta la identidad de la jugada.');
    requireRoom(Number.isSafeInteger(body.baseRevision) && body.baseRevision >= 0, 400, 'Revisión no válida.');
    const input = undo ? { type: 'undo' } : safePayload(body.command);
    const signature = digest(JSON.stringify(input));
    const next = await this.store.update(id, (record, live) => {
      const actor = authenticate(record, secret);
      const receipt = record.receipts.find(r => r.member === actor.key && r.op === body.operationId);
      if (receipt) {
        requireRoom(receipt.signature === signature, 409, 'Esta jugada ya tiene otro resultado.');
        return { result: { revision: receipt.revision } };
      }
      requireRoom(body.baseRevision >= record.floor && body.baseRevision <= record.revision, 409, 'Actualiza la mesa antes de repetir esta jugada.');
      let game, history;
      let leases = live.leases;
      if (undo) {
        requireRoom(actor.role === 'master', 403, 'Solo el máster puede deshacer una jugada.');
        requireRoom(body.baseRevision === record.revision, 409, 'Ha habido otra jugada. Comprueba cuál quieres deshacer.');
        requireRoom(record.history.length, 409, 'No quedan jugadas para deshacer.');
        game = restore(record.game, record.history.at(-1));
        history = record.history.slice(0, -1);
        leases = {};
      } else {
        requireRoom(actor.role === 'master' || PLAYER_COMMANDS.has(input.type), 403, 'Operación reservada al máster.');
        if (input.type === 'seat' && actor.role === 'player')
          requireRoom(input.seatId === actor.seatId, 403, 'Esta invitación pertenece a otro puesto.');
        if (input.type === 'seat') requireRoom(SEATS.includes(input.seatId), 400, 'Puesto no válido.');
        const view = this.view(record, actor.seatId);
        validateReferences(view, input);
        if (PIECE_COMMANDS.has(input.type)) {
          validateReferences(view, { pieceId: input.pieceId });
          const lease = live.leases[input.pieceId];
          requireRoom(lease && lease.member === actor.key && lease.hand === hand && lease.until > this.now()
            && lease.id === body.leaseId, 409, 'Vuelve a coger la pieza antes de soltarla.');
          if (input.parentId) {
            const support = ancestry(record.game.pieces, input.parentId);
            const held = Object.entries(live.leases).some(([id, other]) => {
              const occupant = record.game.pieces[id];
              return other.until > this.now() && (other.member !== actor.key || other.hand !== hand)
                && (support.has(id) || (input.slot && occupant?.parentId === input.parentId && occupant.slot === input.slot));
            });
            requireRoom(!held, 409, 'Otra mano está moviendo ese encaje.');
          }
          leases = { ...leases };
          delete leases[input.pieceId];
        }
        const command = { ...input };
        if (command.type === 'roll' && command.value == null) {
          const sides = view.pieces[command.pieceId]?.sides;
          if (Number.isSafeInteger(sides) && sides >= 2 && sides <= 100) command.value = randomInt(1, sides + 1);
        }
        try { game = this.model.applyGameCommand(record.game, command, safeRole(actor)); }
        catch (error) { throw new RoomError(400, error.message || 'Esa jugada no se puede resolver.'); }
        if (game.sceneId !== record.game.sceneId) leases = {};
        const patch = reversePatch(record.game, game);
        history = patch.length ? [...record.history.slice(-(MAX_HISTORY - 1)), patch] : record.history;
      }
      const revision = record.revision + 1;
      const receipts = [...record.receipts, { op: body.operationId, member: actor.key, signature, revision }];
      let floor = record.floor;
      if (receipts.length > 256) floor = receipts.shift().revision;
      return { record: { ...record, game, revision, receipts, floor, history },
        live: { ...live, leases }, result: { revision } };
    });
    return next.result;
  }
}

module.exports = { RoomService, validProof };
