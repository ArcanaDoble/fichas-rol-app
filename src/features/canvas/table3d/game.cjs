const {
  MAT_WIDTH,
  MAT_DEPTH,
  EQUIPMENT,
  dieProfile,
  getSlots,
  getWorldPosition,
  getSeatPosition,
  children,
  placeIn,
  placeOnTable,
} = require('./gamePieces.cjs');
const {
  projectGame,
  makeSight,
  insideMap,
  sceneEntrance,
  clamp,
} = require('./gameVision.cjs');
const combat = require('./gameCombat.cjs');

const SEAT_IDS = ['puesto1', 'puesto2', 'puesto3', 'puesto4'];
const TERRAIN_TYPES = ['tree', 'wall', 'door', 'window', 'light', 'smoke', 'fog'];
const MASTER_COMMANDS = [
  'scene',
  'terrain',
  'darkness',
  'fogOfWar',
  'enemy',
  'enemyAttack',
  'reveal',
  'supply',
];
const clean = (text, max = 120) =>
  String(text ?? '')
    .trim()
    .slice(0, max);
const number = (v, fallback, min, max) =>
  Number.isFinite(Number(v)) && v != null
    ? clamp(Number(v), min, max)
    : fallback;
const integer = (v, fallback, min, max) =>
  Math.round(number(v, fallback, min, max));
function identifier(v) {
  const id = clean(v, 140);
  if (
    !id ||
    id === 'prototype' ||
    Object.hasOwn(Object.prototype, id) ||
    /[\x00-\x1f]/.test(id)
  )
    throw new Error('Identificador de mesa incorrecto.');
  return id;
}
function coordinates(c) {
  if (
    !Number.isFinite(c.x) ||
    !Number.isFinite(c.z) ||
    Math.abs(c.x) > 1000 ||
    Math.abs(c.z) > 1000
  )
    throw new Error('La posición debe estar sobre la mesa.');
  return { x: c.x, z: c.z };
}

function orientation(values) {
  if (
    !Array.isArray(values) ||
    values.length !== 4 ||
    values.some((v) => !Number.isFinite(v) || Math.abs(v) > 1.01)
  ) {
    throw new Error('La orientación del dado no es válida.');
  }
  const length = Math.hypot(...values);
  if (length < 0.001) throw new Error('La orientación del dado no es válida.');
  return values.map((v) => v / length);
}
function terrainItem(t) {
  if (!t || !TERRAIN_TYPES.includes(t.kind))
    throw new Error('Elemento de escenario desconocido.');
  const item = {
    id: identifier(t.id),
    kind: t.kind,
    ...coordinates(t),
    name: clean(t.name),
    width: number(t.width, 1, 0.04, 200),
    depth: number(t.depth, 1, 0.04, 200),
    hidden: Boolean(t.hidden),
  };
  for (const key of [
    'yaw',
    'radius',
    'x1',
    'z1',
    'x2',
    'z2',
    'trunkRatio',
    'intensity',
  ]) {
    if (Number.isFinite(t[key])) item[key] = number(t[key], 0, -1000, 1000);
  }
  for (const key of ['open', 'blocksVision', 'transparent', 'secret', 'flicker'])
    if (typeof t[key] === 'boolean') item[key] = t[key];
  if (t.kind === 'window') item.transparent = true;
  if (item.transparent) item.blocksVision = false;
  if (Number.isFinite(t.thickness)) item.thickness = number(t.thickness, .08, .01, 2);
  if (t.image) item.image = clean(t.image, 3000);
  if (t.color) item.color = clean(t.color, 32);
  if (t.visionMode || t.treeVisionMode)
    item.visionMode =
      (t.visionMode || t.treeVisionMode) === 'trunk' ? 'trunk' : 'canopy';
  if (Array.isArray(t.polygon))
    item.polygon = t.polygon.slice(0, 128).map(coordinates);
  return item;
}
function sceneData(scene) {
  if (!scene) throw new Error('Elige un escenario.');
  if (scene.unavailable || scene.cols > 100 || scene.rows > 100)
    throw new Error(
      scene.unavailable ||
        'Esta mesa admite escenarios finitos de hasta 100 × 100 casillas.'
    );
  if (scene.terrain?.length > 1500 || scene.enemies?.length > 100)
    throw new Error('El escenario supera la capacidad de esta mesa.');
  let image = clean(scene.image, 3300);
  if (/^data:/i.test(String(scene.image || ''))) {
    if (
      scene.image.length > 2 * 1024 * 1024 ||
      !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/i.test(
        scene.image
      )
    ) {
      throw new Error(
        'La imagen del escenario debe ser PNG, JPEG o WebP y ocupar hasta 2 MiB codificada.'
      );
    }
    image = scene.image;
  }
  const result = {
    id: identifier(scene.id),
    name: clean(scene.name) || 'Escenario',
    image,
    cols: integer(scene.cols, 6, 1, 100),
    rows: integer(scene.rows, 4, 1, 100),
    darkness: number(scene.darkness, 0, 0, 1),
    fogOfWar: Boolean(scene.fogOfWar),
    snapToGrid: scene.snapToGrid !== false,
    cellAspect: number(scene.cellAspect, 1, 0.05, 20),
    visionRadius: number(scene.visionRadius, 6, 0.25, 150),
    imagePrivate: Boolean(scene.imagePrivate),
    terrain: (Array.isArray(scene.terrain) ? scene.terrain : [])
      .slice(0, 1500)
      .map(terrainItem),
  };
  if (scene.playerImage) result.playerImage = clean(scene.playerImage, 3000);
  for (const key of ['imageWidth', 'imageHeight'])
    if (scene[key]) result[key] = integer(scene[key], 1, 1, 65535);
  if (scene.imageBounds)
    result.imageBounds = {
      ...coordinates(scene.imageBounds),
      width: number(scene.imageBounds.width, result.cols, 0.01, 500),
      depth: number(scene.imageBounds.depth, result.rows, 0.01, 500),
    };
  if (scene.entrance) result.entrance = coordinates(scene.entrance);
  return result;
}
function addPiece(state, props) {
  const id = identifier(props.id);
  if (Object.hasOwn(state.pieces, id))
    throw new Error('La pieza ya existe en la mesa.');
  const piece = {
    x: 0,
    z: 0,
    yaw: 0,
    sceneId: null,
    parentId: null,
    slot: null,
    ...props,
    id,
  };
  state.pieces[id] = piece;
  return piece;
}
function addDie(state, props) {
  return addPiece(state, {
    kind: 'die',
    value: null,
    rolled: false,
    used: false,
    width: 0.42,
    depth: 0.42,
    ...props,
  });
}
function newId(state, prefix) {
  return prefix + ':' + ++state.sequence;
}
function addEnemy(state, data, sceneId) {
  const sourceId = identifier(data.id || newId(state, 'figura'));
  let id = sceneId + ':enemy:' + sourceId;
  if (state.pieces[id]) id = newId(state, id);
  const life = integer(data.life, 5, 0, 250),
    size = number(data.width ?? data.size, 1, 0.25, 4);
  const enemy = addPiece(state, {
    id,
    kind: 'enemy',
    name: clean(data.name) || 'Criatura',
    image: clean(data.image, 3000),
    sceneId,
    ...coordinates(data),
    width: size,
    depth: number(data.depth, size, 0.25, 4),
    life,
    maxLife: integer(data.maxLife, life, 1, 250),
    defense: integer(data.defense, 5, 1, 40),
    offense: integer(data.offense ?? data.offenseBase, 2, 0, 60),
    initiative: integer(data.initiative, 7, 0, 50),
    dice: dieProfile(data.dice, [6]),
    range: number(data.range, 1, 0, 100),
    hidden: Boolean(data.hidden),
    defeated: life === 0,
    sourceId,
  });
  const profile = enemy.dice.length ? enemy.dice : [6];
  profile.forEach((sides, i) => {
    const die = addDie(state, {
      id: id + ':die' + (i + 1),
      name: enemy.name + ' · d' + sides,
      role: 'enemy',
      sides,
      sourceId: id,
      parentId: id,
      slot: 'die' + (i + 1),
      x: (i - (profile.length - 1) / 2) * 0.33,
      z: size * 0.59,
      width: 0.3,
      depth: 0.3,
    });
    die.hidden = false;
  });
  return enemy;
}
function installScene(state, data) {
  const scene = sceneData(data);
  if (Object.hasOwn(state.scenes, scene.id)) return state.scenes[scene.id];
  state.scenes[scene.id] = scene;
  state.encounters[scene.id] = {
    opening: {},
    scores: {},
    started: false,
    rewarded: false,
  };
  for (const enemy of (Array.isArray(data.enemies) ? data.enemies : []).slice(
    0,
    100
  ))
    addEnemy(state, enemy, scene.id);
  return scene;
}
function createGame({ id, title, scene }) {
  const state = {
    version: 1,
    id: identifier(id),
    title: clean(title) || 'Mesa de Roguelike',
    sceneId: identifier(scene?.id),
    scenes: {},
    pieces: {},
    seats: {},
    positions: {},
    encounters: {},
    attacks: [],
    log: [],
    sequence: 0,
    round: 1,
    gold: 0,
  };
  installScene(state, scene);
  addPiece(state, {
    id: 'caja',
    kind: 'box',
    name: 'Caja de descartes',
    x: -1.3,
    z: -1.3,
    width: 2.3,
    depth: 1.6,
    open: false,
  });
  return state;
}

function prepareSeat(state, c, actor) {
  const id = identifier(c.seatId);
  if (
    !SEAT_IDS.includes(id) ||
    (actor.role !== 'master' && actor.seatId !== id)
  )
    throw new Error('Ese puesto no te corresponde.');
  if (state.seats[id])
    throw new Error('El puesto ya tiene un personaje en juego.');
  const character = c.character;
  if (!character || !character.name)
    throw new Error('Falta la ficha de clase.');
  const scene = state.scenes[state.sceneId],
    index = SEAT_IDS.indexOf(id);
  const at = c.position
    ? coordinates(c.position)
    : getSeatPosition(scene, index);
  const className = clean(character.className || character.name);
  const playerName = clean(c.name) || clean(actor.name);
  const characterName = clean(character.name);
  const name =
    playerName &&
    characterName.localeCompare(className, 'es', { sensitivity: 'base' }) === 0
      ? playerName
      : characterName;
  const life = integer(character.life, 8, 1, 40),
    defense = integer(character.defense, 6, 1, 30);
  const seat = {
    id,
    name: playerName || name,
    characterName: name,
    className,
    classId: clean(character.id),
    matId: id + ':mat',
    tokenId: id + ':peana',
    life,
    maxLife: life,
    defense,
    isBarbarian: Boolean(character.isBarbarian),
    initiativeBase: integer(
      character.initiativeBase,
      character.isBarbarian
        ? 2
        : /p[ií]caro/i.test(character.className)
          ? 4
          : 3,
      0,
      30
    ),
    fury: 0,
    furyGained: 0,
  };
  state.seats[id] = seat;
  if (!state.turnId) state.turnId = seat.tokenId;
  const mat = addPiece(state, {
    id: seat.matId,
    kind: 'mat',
    name,
    className: seat.className,
    seatId: id,
    image: clean(character.portrait, 3000),
    ...at,
    width: MAT_WIDTH,
    depth: MAT_DEPTH,
    maxLife: life,
    baseDefense: defense,
    isBarbarian: seat.isBarbarian,
  });
  const token = addPiece(state, {
    id: seat.tokenId,
    kind: 'token',
    name,
    seatId: id,
    image: mat.image,
    life,
    maxLife: life,
    defense,
    width: number(character.width ?? character.size, 0.83, 0.25, 4),
    depth: number(character.depth ?? character.size, 0.83, 0.25, 4),
    visionRadius: number(character.visionRadius, scene.visionRadius, 0.25, 150),
    darkvision: number(character.darkvision, 0, 0, 150),
  });
  placeIn(state, token, mat, 'portrait');
  const profile = dieProfile(character.actionDice);
  const actions = [...profile, ...[8, 6, 4].slice(profile.length)].slice(0, 3);
  actions.slice(0, 3).forEach((sides, i) => {
    const die = addDie(state, {
      id: id + ':accion' + (i + 1),
      kind: 'die',
      role: 'action',
      sides,
      name: name + ' · d' + sides,
      seatId: id,
      homeSlot: 'action' + (i + 1),
      width: 0.48,
      depth: 0.48,
    });
    placeIn(state, die, mat, die.homeSlot);
  });
  for (let i = 0; i < life; i++) {
    const socket = getSlots(mat).find((s) => s.id === 'hp' + (i + 1));
    const tile = addPiece(state, {
      id: id + ':vida' + (i + 1),
      kind: 'health',
      seatId: id,
      name: 'Vida de ' + name,
      width: socket.width * 0.95,
      depth: socket.depth,
    });
    placeIn(state, tile, mat, socket.id);
  }
  const bag = addPiece(state, {
    id: id + ':bolsa',
    kind: 'bag',
    seatId: id,
    name: 'Bolsa de ' + name,
    open: false,
    width: 0.83,
    depth: 0.66,
  });
  placeIn(state, bag, mat, 'bag');
  if (seat.isBarbarian) {
    const die = addDie(state, {
      id: id + ':exponerse',
      role: 'expose',
      sides: 6,
      name: 'Exponerse',
      seatId: id,
      homeSlot: 'expose',
    });
    placeIn(state, die, mat, die.homeSlot);
  }
  const options = Array.isArray(character.pool)
    ? character.pool.slice(0, 50)
    : [];
  options.forEach((raw, i) => {
    const kind = EQUIPMENT.includes(raw.kind) ? raw.kind : 'item',
      hands = integer(raw.hands, 1, 1, 2);
    const wid = hands === 2 && kind === 'weapon' ? 1.8 : 0.84;
    const gear = addPiece(state, {
      id: id + ':equipo' + (i + 1),
      kind,
      name: clean(raw.name) || 'Objeto',
      catalogId: clean(raw.id),
      image: clean(raw.image, 3000),
      dice: dieProfile(raw.dice),
      hands,
      thrown: Boolean(raw.thrown),
      range: number(raw.range, 1, 0, 100),
      defense: number(raw.defense, 0, 0, 30),
      defenseBonus: number(raw.defenseBonus, kind === 'shield' ? 1 : 0, 0, 10),
      critical: Boolean(raw.critical),
      heavy: Boolean(raw.heavy),
      perforating: Boolean(raw.perforating),
      seatId: id,
      width: wid,
      depth: 1.36,
      x: at.x + ((i % 5) - 2) * 1.43,
      z:
        at.z +
        (index === 1 ? -1 : 1) * (MAT_DEPTH / 2 + 1 + Math.floor(i / 5) * 1.38),
      sceneId: scene.id,
    });
    gear.dice.forEach((sides, n) => {
      const die = addDie(state, {
        id: gear.id + ':die' + (n + 1),
        role: 'weapon',
        sides,
        seatId: id,
        sourceId: gear.id,
        homeSlot: 'die' + (n + 1),
        width: 0.31,
        depth: 0.31,
        name: gear.name + ' · d' + sides,
      });
      placeIn(state, die, gear, die.homeSlot);
    });
  });
  return seat;
}

function changeScene(state, c) {
  const current = state.scenes[state.sceneId];
  const next = c.scene
    ? installScene(state, c.scene)
    : state.scenes[identifier(c.sceneId)];
  if (!next) throw new Error('El escenario no está preparado.');
  if (next.id === current.id) return;
  if (!state.positions[current.id]) state.positions[current.id] = {};
  for (const seat of Object.values(state.seats)) {
    const mat = state.pieces[seat.matId],
      token = state.pieces[seat.tokenId];
    const previous = state.positions[next.id]?.[seat.id],
      index = SEAT_IDS.indexOf(seat.id);
    state.positions[current.id][seat.id] = {
      ...state.positions[current.id][seat.id],
      mat: { x: mat.x, z: mat.z, yaw: mat.yaw },
      token: !token.parentId ? { x: token.x, z: token.z } : null,
    };
    if (!token.parentId && insideMap(token, current)) {
      state.positions[current.id][seat.id].sight = { x: token.x, z: token.z };
    }
    Object.assign(mat, previous?.mat || getSeatPosition(next, index));
    if (!token.parentId) {
      const entry = previous?.token || sceneEntrance(next, seat.id);
      placeOnTable(token, next.id, entry.x, entry.z);
    }
  }
  state.sceneId = next.id;
  if (
    state.pieces[state.turnId]?.kind === 'enemy' &&
    state.pieces[state.turnId].sceneId !== next.id
  ) {
    state.turnId = Object.values(state.seats)[0]?.tokenId || null;
  }
}
function refreshStats(state) {
  for (const seat of Object.values(state.seats)) {
    const mat = state.pieces[seat.matId],
      token = state.pieces[seat.tokenId];
    const held = children(state, mat.id);
    seat.initiative =
      state.encounters[state.sceneId]?.scores[seat.tokenId] ?? null;
    seat.life = held.filter(
      (p) => p.kind === 'health' && p.slot?.startsWith('hp')
    ).length;
    seat.fury = held.filter((p) => p.kind === 'ember').length;
    const armor = held.find((p) => p.slot === 'armor');
    seat.defense =
      (armor?.defense || mat.baseDefense) +
      held
        .filter((p) => p.slot?.startsWith('hand'))
        .reduce((sum, p) => sum + (p.defenseBonus || 0), 0);
    Object.assign(token, { life: seat.life, defense: seat.defense });
    Object.assign(mat, {
      life: seat.life,
      defense: seat.defense,
      fury: seat.fury,
    });
  }
  const cells = new Map();
  for (const token of Object.values(state.pieces)) {
    if (!['enemy', 'token'].includes(token.kind)) continue;
    token.inDuel = false;
    if (
      token.life <= 0 ||
      token.width > 1 ||
      token.depth > 1 ||
      token.parentId ||
      token.sceneId !== state.sceneId ||
      token.hidden
    )
      continue;
    const key = Math.floor(token.x) + ',' + Math.floor(token.z);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(token);
  }
  for (const actors of cells.values()) {
    if (
      actors.some((p) => p.kind === 'token') &&
      actors.some((p) => p.kind === 'enemy')
    ) {
      for (const actor of actors) actor.inDuel = true;
    }
  }
}
function addSupply(state, c) {
  if (!['coin', 'trait'].includes(c.kind))
    throw new Error('Útil de mesa desconocido.');
  const coin = c.kind === 'coin';
  return addPiece(state, {
    id: newId(state, c.kind),
    kind: c.kind,
    name: coin ? 'Moneda de oro' : 'Visión en la oscuridad',
    ...(coin
      ? { amount: integer(c.amount, 1, 1, 100), collected: false }
      : { radius: number(c.radius, 4, 0.25, 100) }),
    width: coin ? 0.32 : 0.44,
    depth: coin ? 0.32 : 0.44,
    ...coordinates(c),
    sceneId: state.sceneId,
  });
}
function appendLog(state, actor, text, refs = [], warning = false) {
  const seenBy = Object.keys(state.seats).filter((id) => {
    const sight = makeSight(state, id);
    return refs.every(
      (ref) => state.pieces[ref] && sight.visiblePiece(state.pieces[ref])
    );
  });
  state.log.push({
    id: newId(state, 'gesto'),
    sceneId: state.sceneId,
    round: state.round,
    actor: clean(actor.name || actor.seatId || 'Máster'),
    text,
    warning: Boolean(warning),
    seenBy,
  });
  if (state.log.length > 100) state.log.shift();
}
function applyGameCommand(previous, c, actor) {
  if (!c || !actor || !['master', 'player'].includes(actor.role))
    throw new Error('Sesión de mesa inválida.');
  if (MASTER_COMMANDS.includes(c.type) && actor.role !== 'master')
    throw new Error('Este gesto corresponde al máster.');
  if (actor.role === 'player' && !SEAT_IDS.includes(actor.seatId))
    throw new Error('Falta un puesto de jugador.');
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const state = {
    ...previous,
    scenes: { ...previous.scenes },
    pieces: clone(previous.pieces),
    seats: clone(previous.seats),
    attacks: clone(previous.attacks),
    encounters: clone(previous.encounters || {}),
    log: [...previous.log],
    positions:
      c.type === 'scene' ? clone(previous.positions) : previous.positions,
  };
  if (!state.encounters[state.sceneId])
    state.encounters[state.sceneId] = {
      opening: {},
      scores: {},
      started: false,
      rewarded: false,
    };
  if (c.type === 'terrain' || c.type === 'darkness' || c.type === 'fogOfWar') {
    const current = previous.scenes[previous.sceneId];
    state.scenes[previous.sceneId] = {
      ...current,
      terrain: [...current.terrain],
    };
  }
  const scene = state.scenes[state.sceneId];
  const sight = makeSight(
    state,
    actor.role === 'master' ? 'master' : actor.seatId
  );
  for (const key of [
    'pieceId',
    'parentId',
    'targetId',
    'sourceId',
    'dieId',
    'interactionDieId',
  ]) {
    if (!c[key]) continue;
    const piece = state.pieces[identifier(c[key])];
    if (!piece || !sight.visiblePiece(piece))
      throw new Error('La pieza no está disponible en esta mesa.');
  }
  let message;
  const piece = state.pieces[c.pieceId],
    target = state.pieces[c.targetId];
  const ctx = {
    state,
    scene,
    actor,
    c,
    piece,
    target,
    addPiece,
    addDie,
    newId,
    addSupply,
    appendLog,
  };
  switch (c.type) {
    case 'seat': {
      const seat = prepareSeat(state, c, actor);
      message = {
        text: seat.name + ' abre la ficha de ' + seat.characterName + '.',
      };
      break;
    }
    case 'drop':
      if (
        piece?.kind === 'token' &&
        !piece.parentId &&
        piece.sceneId === scene.id &&
        insideMap(piece, scene)
      ) {
        const positions = state.positions[scene.id] || {};
        state.positions = {
          ...state.positions,
          [scene.id]: {
            ...positions,
            [piece.seatId]: {
              ...positions[piece.seatId],
              sight: { x: piece.x, z: piece.z },
            },
          },
        };
      }
      message = combat.drop(ctx);
      break;
    case 'roll':
      message = combat.roll(ctx);
      break;
    case 'resolve':
      message = combat.resolve(ctx);
      break;
    case 'enemyAttack':
      message = combat.enemyAttack(ctx);
      break;
    case 'turn':
      message = combat.newRound(ctx);
      break;
    case 'drawer':
      if (piece?.kind !== 'mat') throw new Error('Elige una ficha de clase.');
      piece.drawerOpen = typeof c.open === 'boolean' ? c.open : !piece.drawerOpen;
      message = {text: (piece.drawerOpen ? 'Abre' : 'Cierra') + ' el cajón de ' + piece.name + '.', refs: [piece.id]};
      break;
    case 'bag':
      if (!piece || !['bag', 'box'].includes(piece.kind))
        throw new Error('Elige una bolsa o la caja.');
      piece.open = !piece.open;
      message = {
        text: piece.open
          ? 'Abre ' + piece.name + '.'
          : 'Cierra ' + piece.name + '.',
        refs: [piece.id],
      };
      break;
    case 'scene':
      changeScene(state, c);
      message = {
        text: 'El grupo llega a ' + state.scenes[state.sceneId].name + '.',
      };
      break;
    case 'terrain': {
      if (c.removeId)
        scene.terrain = scene.terrain.filter((t) => t.id !== c.removeId);
      else {
        const next = terrainItem(c.terrain);
        const index = scene.terrain.findIndex((t) => t.id === next.id);
        if (index < 0) {
          if (scene.terrain.length >= 1500) throw new Error('El mapa admite hasta 1500 elementos.');
          scene.terrain.push(next);
        }
        else scene.terrain[index] = next;
      }
      break;
    }
    case 'darkness':
      scene.darkness = number(c.value, 0, 0, 1);
      break;
    case 'fogOfWar':
      scene.fogOfWar = Boolean(c.enabled);
      break;
    case 'enemy': {
      addEnemy(state, c.enemy, state.sceneId);
      break;
    }
    case 'reveal':
      if (piece?.kind !== 'enemy') throw new Error('Elige una criatura.');
      piece.hidden = typeof c.hidden === 'boolean' ? c.hidden : !piece.hidden;
      break;
    case 'supply': {
      addSupply(state, c);
      break;
    }
    default:
      throw new Error('Gesto de mesa desconocido.');
  }
  if (
    piece?.kind === 'die' &&
    !piece.parentId &&
    ['drop', 'roll'].includes(c.type)
  ) {
    if (c.orientation != null) piece.orientation = orientation(c.orientation);
    if (piece.sides === 100 && c.percentileOrientation != null) {
      if (
        !Array.isArray(c.percentileOrientation) ||
        c.percentileOrientation.length !== 2
      )
        throw new Error('El d100 tiene dos cuerpos.');
      piece.percentileOrientation = c.percentileOrientation.map(orientation);
    }
  }
  refreshStats(state);
  if (message)
    appendLog(state, actor, message.text, message.refs, message.warning);
  return state;
}
module.exports = {
  createGame,
  applyGameCommand,
  projectGame,
  getSlots,
  getWorldPosition,
  SEAT_IDS,
};
