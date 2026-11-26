const MAT_WIDTH = 8.3;
const MAT_DEPTH = 2.32;
const EQUIPMENT = ['weapon', 'shield', 'armor', 'accessory', 'item'];
const SUPPORTED_DICE = [4, 6, 8, 10, 12, 20, 100];
const handTypes = ['weapon', 'shield'];
const matSlotCache = new Map();

function slot(id, x, z, width, depth, accepts, label) {
  return { id, x, z, width, depth, accepts, label };
}

function matSlots(piece) {
  const maxLife = Math.max(1, Math.min(40, piece.maxLife || 8));
  const key = maxLife + (piece.isBarbarian ? ':furia' : '');
  if (matSlotCache.has(key)) return matSlotCache.get(key);
  // Coordinates measured on the original Patio class frame, including the
  // sliding leaf. They are the same for the surface, hit tests and network pose.
  const rect = (id, u, v, w, h, accepts, label) =>
    slot(
      id,
      (u - 0.5) * MAT_WIDTH,
      (v - 0.5) * MAT_DEPTH,
      w * MAT_WIDTH,
      h * MAT_DEPTH,
      accepts,
      label
    );
  const slots = [
    rect('portrait', 0.059, 0.724, 0.099, 0.36, ['token'], 'Peana'),
    rect(
      'hand1',
      0.32362,
      0.46733,
      0.10844,
      0.6265,
      handTypes,
      'Mano izquierda'
    ),
    rect('hand2', 0.43584, 0.46733, 0.10844, 0.6265, handTypes, 'Mano derecha'),
    rect('sheath1', 0.5709, 0.46733, 0.10844, 0.6265, handTypes, 'Funda'),
    rect('sheath2', 0.68311, 0.46733, 0.10844, 0.6265, handTypes, 'Funda'),
    rect('bag', 0.801, 0.645, 0.1, 0.306, ['bag'], 'Bolsa'),
    rect('vision', 0.618, 0.89, 0.038, 0.127, ['trait'], 'Visión'),
    rect('spent', 0.7935, 0.89, 0.185, 0.158, ['die'], 'Gastados'),
  ];
  const pockets = [
    ['armor', ['armor'], 'Armadura'],
    ['accessory', ['accessory', 'item'], 'Accesorio'],
    ['accessory2', ['accessory', 'item'], 'Accesorio'],
    ...[1, 2, 3].map((i) => ['inventory' + i, EQUIPMENT, 'Inventario']),
  ];
  pockets.forEach(([id, accepts, label], i) => {
    slots.push(
      rect(id, 0.3192 + 0.10484 * i, -0.2988, 0.0982, 0.5682, accepts, label)
    );
  });
  for (let i = 0; i < 3; i++) {
    for (const [id, label] of [
      ['action', 'Acción'],
      ['reserve', 'Reserva'],
    ])
      slots.push(
        rect(
          id + (i + 1),
          0.7876 + i * 0.0781,
          0.352,
          0.071,
          0.318,
          ['die'],
          label
        )
      );
  }
  if (piece.isBarbarian) {
    slots.push(rect('expose', 0.218, 0.862, 0.062, 0.22, ['die'], 'Exponerse'));
    for (let i = 0; i < 3; i++)
      slots.push(
        rect(
          'ember' + (i + 1),
          0.934 + i * 0.0185,
          0.89,
          0.0175,
          0.07,
          ['ember'],
          'Furia'
        )
      );
  }
  const pitch = 0.2543 / maxLife;
  for (let i = 0; i < maxLife; i++)
    slots.push(
      rect(
        'hp' + (i + 1),
        0.3069 + (i + 0.5) * pitch,
        0.8895,
        pitch * 0.95,
        0.1096,
        ['health'],
        'Vida'
      )
    );
  matSlotCache.set(key, slots);
  return slots;
}

function getSlots(piece) {
  if (!piece) return [];
  if (piece.kind === 'mat') return matSlots(piece);
  if (piece.kind === 'enemy') {
    const count = Math.max(1, (piece.dice || []).length);
    return Array.from({ length: count }, (_, i) =>
      slot(
        'die' + (i + 1),
        (i - (count - 1) / 2) * 0.33,
        (piece.width || 1) * 0.59,
        0.32,
        0.32,
        ['die'],
        'Dado de ' + piece.name
      )
    );
  }
  if (EQUIPMENT.includes(piece.kind)) {
    const count = (piece.dice || []).length;
    const width = piece.width || 0.84;
    const depth = piece.depth || 1.36;
    const wide = piece.hands === 2 && piece.kind === 'weapon';
    return Array.from({ length: count }, (_, i) => {
      let u, v, size;
      if (wide) {
        const columns = Math.ceil(count / 3);
        const rows = Math.ceil(count / columns);
        u = 0.818 + (((i % columns) - (columns - 1) / 2) * 0.28) / columns;
        v = 0.505 + ((Math.floor(i / columns) - (rows - 1) / 2) * 0.86) / rows;
        size = Math.min(0.32, (width * 0.28) / columns, (depth * 0.83) / rows);
      } else {
        const columns = Math.min(3, count),
          rows = Math.ceil(count / columns);
        size = Math.min(0.31, (width * 0.88) / columns, (depth * 0.25) / rows);
        u = 0.826 - ((columns - 1 - (i % columns)) * size) / width;
        v =
          (count > 1 ? 0.634 : 0.823) -
          (Math.floor(i / columns) * size) / depth;
      }
      return slot(
        'die' + (i + 1),
        (u - 0.5) * width,
        (v - 0.5) * depth,
        size,
        size,
        ['die'],
        'Dado de equipo'
      );
    });
  }
  if (piece.kind === 'bag' || piece.kind === 'box') {
    const isBag = piece.kind === 'bag';
    const columns = isBag ? 3 : 5;
    const spacing = isBag ? 0.23 : 0.32;
    return Array.from({ length: isBag ? 12 : 50 }, (_, i) =>
      slot(
        'pocket' + (i + 1),
        ((i % columns) - (columns - 1) / 2) * spacing,
        ((Math.floor(i / columns) % 3) - 1) * 0.2,
        spacing,
        0.25,
        [...EQUIPMENT, 'coin', 'die', 'health', 'ember', 'trait'],
        isBag ? 'Compartimento' : 'Caja'
      )
    );
  }
  return [];
}

const isDrawerSlot = (id) =>
  /^(armor|accessory2?|inventory[123])$/.test(id || '');
function patioDimensions(piece, parent) {
  if (piece.kind === 'die' && piece.role === 'action' && piece.width === 0.55)
    return { width: 0.48, depth: 0.48 };
  if (piece.kind === 'mat') return { width: MAT_WIDTH, depth: MAT_DEPTH };
  if (EQUIPMENT.includes(piece.kind))
    return { width: isDoubleHand(piece) ? 1.8 : 0.845, depth: 1.36 };
  if (piece.kind === 'health' && parent?.kind === 'mat') {
    const socket = getSlots(parent).find((s) => s.id === piece.slot);
    if (socket) return { width: socket.width * 0.98, depth: socket.depth };
  }
  return null;
}

function getWorldPosition(state, pieceId) {
  const piece = typeof pieceId === 'object' ? pieceId : state.pieces[pieceId];
  if (!piece) return null;
  let current = piece;
  let x = 0,
    z = 0,
    yaw = 0;
  const chain = new Set();
  while (current && !chain.has(current.id)) {
    chain.add(current.id);
    const at = mountedOffset(state, current) || current;
    const angle = Number(current.yaw) || 0;
    const nextX =
      x * Math.cos(angle) + z * Math.sin(angle) + (Number(at.x) || 0);
    z = -x * Math.sin(angle) + z * Math.cos(angle) + (Number(at.z) || 0);
    x = nextX;
    yaw += angle;
    current = state.pieces[current.parentId];
  }
  return { x, z, yaw };
}

function mountedOffset(state, piece) {
  const parent = state.pieces[piece.parentId];
  if (
    piece.kind === 'die' &&
    parent?.kind === 'mat' &&
    piece.slot === 'spent'
  ) {
    const tray = getSlots(parent).find((s) => s.id === 'spent');
    const dice = children(state, parent.id)
      .filter((p) => p.slot === 'spent')
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const position = Math.max(
      0,
      dice.findIndex((d) => d.id === piece.id)
    );
    const column = position % 3;
    // Half an action die and the clearance of the bevel at each end.
    const endClearance = 0.275;
    return {
      x: tray.x + (column - 1) * (tray.width / 2 - endClearance),
      z:
        tray.z + (column === 1 ? 0.08 : -0.04) + Math.floor(position / 3) * 0.1,
    };
  }
  if (parent?.kind === 'mat' && piece.slot) {
    const slots = getSlots(parent);
    const socket = slots.find((s) => s.id === piece.slot);
    if (/^(action|reserve)[1-3]$/.test(piece.slot)) {
      const guests = children(state, parent.id).filter((p) =>
        /^(action|reserve)[1-3]$/.test(p.slot)
      );
      guests.sort(
        (a, b) =>
          Number(b.slot.startsWith('reserve')) -
            Number(a.slot.startsWith('reserve')) || a.slot.localeCompare(b.slot)
      );
      const free = new Set([1, 2, 3]);
      for (const guest of guests) {
        const request = Number(guest.slot.slice(-1));
        const physical = free.has(request)
          ? request
          : free.values().next().value;
        free.delete(physical);
        if (guest.id === piece.id)
          return slots.find((s) => s.id === 'action' + physical) || socket;
      }
    }
    if (socket && isDoubleHand(piece) && /^(hand|sheath)1$/.test(piece.slot)) {
      const other = slots.find((s) => s.id === piece.slot.slice(0, -1) + '2');
      return { x: (socket.x + other.x) / 2, z: socket.z };
    }
    return socket || null;
  }
  if (
    piece.kind !== 'die' ||
    !parent ||
    !EQUIPMENT.includes(parent.kind) ||
    !/^die\d+$/.test(piece.slot || '')
  )
    return null;
  return getSlots(parent)[Number(piece.slot.slice(3)) - 1] || null;
}

function rootOf(state, piece) {
  if (!piece) return null;
  const seen = new Set([piece.id]);
  while (
    piece.parentId &&
    state.pieces[piece.parentId] &&
    !seen.has(piece.parentId)
  ) {
    seen.add(piece.parentId);
    piece = state.pieces[piece.parentId];
  }
  return piece;
}

function parentMat(state, piece) {
  const root = rootOf(state, piece);
  return root?.kind === 'mat' ? root : null;
}

function children(state, parentId) {
  return Object.values(state.pieces).filter(
    (piece) => piece.parentId === parentId
  );
}

function isDoubleHand(piece) {
  return handTypes.includes(piece.kind) && piece.hands === 2;
}

function occupiedSlots(piece) {
  if (isDoubleHand(piece) && /^(hand|sheath)1$/.test(piece.slot || '')) {
    return [piece.slot, piece.slot.slice(0, -1) + '2'];
  }
  return [piece.slot];
}

function placeIn(state, piece, parent, slotId) {
  let id = slotId;
  const slots = getSlots(parent);
  const guests = children(state, parent.id).filter((p) => p.id !== piece.id);
  const occupied = new Set(guests.flatMap(occupiedSlots));
  if (!id && ['bag', 'box'].includes(parent.kind)) {
    id = slots.find(
      (s) => !occupied.has(s.id) && s.accepts.includes(piece.kind)
    )?.id;
  }
  if (isDoubleHand(piece) && /^(hand|sheath)2$/.test(id || ''))
    id = id.slice(0, -1) + '1';
  const seat = slots.find((s) => s.id === id);
  if (!seat || !seat.accepts.includes(piece.kind))
    throw new Error('Esta pieza no encaja en ese hueco.');
  if (parent.kind === 'mat' && piece.kind === 'die') {
    if (
      (id === 'expose') !== (piece.role === 'expose') ||
      (id !== 'expose' && piece.role !== 'action')
    ) {
      throw new Error('Ese hueco corresponde a otro dado.');
    }
  }
  if (
    (EQUIPMENT.includes(parent.kind) || parent.kind === 'enemy') &&
    piece.sides !== parent.dice[Number(id.slice(3)) - 1]
  ) {
    throw new Error('El dado no tiene la forma de este hueco.');
  }
  if (
    parent.kind === 'mat' &&
    /^(action|reserve)[1-3]$/.test(id) &&
    guests.filter((p) => /^(action|reserve)[1-3]$/.test(p.slot)).length >= 3
  )
    throw new Error('Los tres alojamientos de dados están ocupados.');
  if (occupied.has(id) && id !== 'spent')
    throw new Error('El hueco ya está ocupado.');
  const nextSlot =
    isDoubleHand(piece) && /^(hand|sheath)1$/.test(id)
      ? slots.find((s) => s.id === id.slice(0, -1) + '2')
      : null;
  if (nextSlot && occupied.has(nextSlot.id))
    throw new Error('El arma necesita los dos huecos de manos.');
  piece.parentId = parent.id;
  piece.slot = id;
  piece.sceneId = null;
  delete piece.orientation;
  delete piece.percentileOrientation;
  piece.x = nextSlot ? (seat.x + nextSlot.x) / 2 : seat.x;
  piece.z = seat.z;
  if (id === 'spent') {
    const offset = mountedOffset(state, piece);
    piece.x = offset.x;
    piece.z = offset.z;
  }
  piece.yaw = 0;
  return piece;
}

function placeOnTable(piece, sceneId, x, z, yaw = 0) {
  Object.assign(piece, { sceneId, x, z, yaw, parentId: null, slot: null });
}

function dieProfile(list, fallback = []) {
  if (!Array.isArray(list)) return fallback;
  return list
    .slice(0, 10)
    .map((d) => Number(String(d?.sides || d).replace(/^d/i, '')))
    .filter((n) => SUPPORTED_DICE.includes(n));
}

const getSeatPosition = (scene, index) => {
  const mid = scene.cols / 2,
    gap = MAT_DEPTH / 2 + 0.85;
  if (index === 0) return { x: mid, z: scene.rows + gap };
  if (index === 1) return { x: mid, z: -gap };
  if (index === 2) return { x: -MAT_WIDTH / 2 - 0.85, z: scene.rows / 2 };
  return { x: scene.cols + MAT_WIDTH / 2 + 0.85, z: scene.rows / 2 };
};

module.exports = {
  MAT_WIDTH,
  MAT_DEPTH,
  isDrawerSlot,
  patioDimensions,
  EQUIPMENT,
  SUPPORTED_DICE,
  getSlots,
  getWorldPosition,
  mountedOffset,
  rootOf,
  parentMat,
  children,
  placeIn,
  placeOnTable,
  dieProfile,
  getSeatPosition,
};
