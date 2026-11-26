const {
  children,
  getWorldPosition,
  mountedOffset,
  rootOf,
} = require('./gamePieces.cjs');
const { sampledMask } = require('./gameSightMask.cjs');

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const insideMap = (p, scene) =>
  p.x >= 0 && p.z >= 0 && p.x < scene.cols && p.z < scene.rows;
function sceneEntrance(scene, seatId) {
  if (scene.entrance && insideMap(scene.entrance, scene))
    return { ...scene.entrance };
  const number = /^puesto([1-4])$/.exec(seatId)?.[1] || 1;
  return {
    x: Math.min(scene.cols - 0.5, Number(number) - 0.5),
    z: scene.rows - 0.5,
  };
}
const inRect = (area, p) =>
  Math.abs(p.x - area.x) <= (area.width || 1) / 2 &&
  Math.abs(p.z - area.z) <= (area.depth || 1) / 2;
const inArea = (area, p) =>
  area.radius ? distance(area, p) <= area.radius : inRect(area, p);

function localPoint(area, p) {
  const a = -(area.yaw || 0),
    x = p.x - area.x,
    z = p.z - area.z;
  return {
    x: x * Math.cos(a) + z * Math.sin(a),
    z: -x * Math.sin(a) + z * Math.cos(a),
  };
}

function inPolygon(p, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function inCanopy(tree, point) {
  const p = localPoint(tree, point);
  if (tree.polygon?.length > 2) return inPolygon(p, tree.polygon);
  return (
    Math.hypot(
      p.x / Math.max(0.05, tree.width / 2),
      p.z / Math.max(0.05, tree.depth / 2)
    ) <= 1
  );
}

function underCanopy(tree, piece) {
  const trunk =
    (Math.min(tree.width, tree.depth) * (tree.trunkRatio || 0.35)) / 2;
  if (distance(tree, piece) < trunk) return false;
  if (inCanopy(tree, piece)) return true;
  const rx = (piece.width || 0.8) / 2,
    rz = (piece.depth || 0.8) / 2;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    if (
      inCanopy(tree, {
        x: piece.x + rx * Math.cos(a),
        z: piece.z + rz * Math.sin(a),
      })
    )
      return true;
  }
  return Math.hypot((tree.x - piece.x) / rx, (tree.z - piece.z) / rz) < 1;
}

const cross = (a, b, c) =>
  (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
function crosses(a, b, c, d) {
  return (
    cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) <= 0
  );
}

function treeBlocks(tree, origin, target) {
  const start = localPoint(tree, origin),
    end = localPoint(tree, target);
  const useTrunk =
    (tree.visionMode || tree.treeVisionMode) === 'trunk' ||
    origin.canopies?.has(tree.id) ||
    inCanopy(tree, origin);
  if (!useTrunk && tree.polygon?.length > 2) {
    if (inPolygon(end, tree.polygon)) return true;
    return tree.polygon.some((point, i, list) =>
      crosses(start, end, point, list[(i + 1) % list.length])
    );
  }
  const trunkRadius = Math.max(
    0.05,
    (Math.min(tree.width, tree.depth) * (tree.trunkRatio || 0.35)) / 2
  );
  const rx = useTrunk ? trunkRadius : Math.max(0.05, tree.width / 2);
  const rz = useTrunk ? trunkRadius : Math.max(0.05, tree.depth / 2);
  const ax = start.x / rx,
    az = start.z / rz,
    dx = end.x / rx - ax,
    dz = end.z / rz - az;
  const t = clamp(-(ax * dx + az * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(ax + dx * t, az + dz * t) < 1;
}

function connectedSmoke(smoke) {
  const groups = [];
  const touching = (a, b) =>
    Math.abs(a.x - b.x) <=
      ((a.radius * 2 || a.width) + (b.radius * 2 || b.width)) / 2 + 0.001 &&
    Math.abs(a.z - b.z) <=
      ((a.radius * 2 || a.depth) + (b.radius * 2 || b.depth)) / 2 + 0.001;
  for (const area of smoke) {
    let group = [area];
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i].some((other) => touching(area, other)))
        group = group.concat(groups.splice(i, 1)[0]);
    }
    groups.push(group);
  }
  return groups;
}

function makeSight(state, seatId) {
  const scene = state.scenes[state.sceneId];
  const seat = state.seats[seatId];
  const token = state.pieces[seat?.tokenId];
  const origin =
    token &&
    !token.parentId &&
    token.sceneId === scene.id &&
    insideMap(token, scene)
      ? getWorldPosition(state, token)
      : {
          ...(state.positions?.[scene.id]?.[seatId]?.sight ||
            sceneEntrance(scene, seatId)),
        };
  const terrain = scene.terrain;
  const blockers = terrain.filter(
    (t) =>
      ['wall', 'door', 'tree'].includes(t.kind) &&
      !t.open &&
      t.blocksVision !== false
  );
  const footprint = { ...origin, width: token?.width, depth: token?.depth };
  origin.canopies = new Set(
    blockers
      .filter((t) => t.kind === 'tree' && underCanopy(t, footprint))
      .map((t) => t.id)
  );
  const fog = terrain.filter((t) => t.kind === 'fog');
  const lights = terrain.filter((t) => t.kind === 'light' && !t.hidden);
  const smoke = connectedSmoke(terrain.filter((t) => t.kind === 'smoke'));
  const observerClouds = smoke.filter((group) =>
    group.some((s) => inArea(s, origin))
  );
  const trait =
    seat &&
    children(state, seat.matId).find(
      (p) => p.slot === 'vision' && p.kind === 'trait'
    );
  const darkRadius = Math.max(
    token?.darkvision || 0,
    trait ? trait.radius || 4 : 0
  );
  const radius = token?.visionRadius || scene.visionRadius || 6;

  function visiblePoint(p, excludeTreeId = null) {
    if (seatId === 'master') return true;
    if (!insideMap(p, scene)) return true;
    if (fog.some((area) => inArea(area, p))) return false;
    const dist = distance(origin, p);
    if (dist < 0.05) return true;
    if (scene.fogOfWar && dist > radius) return false;
    if (
      scene.darkness > 0 &&
      dist > Math.max(darkRadius, 0.8 + (1 - scene.darkness) * radius) &&
      !lights.some(
        (lamp) =>
          distance(lamp, p) <= (lamp.radius || 3) &&
          !blockers.some((b) => blocked(b, lamp, p, excludeTreeId))
      )
    )
      return false;
    const targetClouds = smoke.filter((group) =>
      group.some((s) => inArea(s, p))
    );
    if (
      (observerClouds.length || targetClouds.length) &&
      !observerClouds.some((g) => targetClouds.includes(g))
    )
      return false;
    return !blockers.some((b) => blocked(b, origin, p, excludeTreeId));
  }
  function blocked(b, a, p, excludeTreeId) {
    if (b.id === excludeTreeId) return false;
    if (b.kind === 'tree') return treeBlocks(b, a, p);
    return crosses(
      a,
      p,
      { x: b.x1 ?? b.x - b.width / 2, z: b.z1 ?? b.z },
      { x: b.x2 ?? b.x + b.width / 2, z: b.z2 ?? b.z }
    );
  }
  function visiblePiece(piece) {
    const root = rootOf(state, piece);
    if (!root || (root.sceneId && root.sceneId !== state.sceneId)) return false;
    if (seatId === 'master') return true;
    if (root.hidden || piece.hidden) return false;
    if (piece.role === 'enemy') {
      const source = state.pieces[piece.sourceId];
      if (
        !source ||
        source.hidden ||
        source.sceneId !== state.sceneId ||
        !visiblePoint(getWorldPosition(state, source))
      )
        return false;
    }
    if (root.kind === 'mat' || root.kind === 'box' || root.id === seat?.tokenId)
      return true;
    const at = getWorldPosition(state, root);
    if (visiblePoint(at)) return true;
    if (root.width > 1 || root.depth > 1) {
      const rx = root.width * 0.45,
        rz = root.depth * 0.45;
      return [
        [rx, 0],
        [-rx, 0],
        [0, rz],
        [0, -rz],
        [rx, rz],
        [rx, -rz],
        [-rx, rz],
        [-rx, -rz],
      ].some(([x, z]) => visiblePoint({ x: at.x + x, z: at.z + z }));
    }
    return false;
  }
  return { visiblePoint, visiblePiece, origin, radius, darkRadius };
}

function visibleArea(item, sight) {
  if (item.hidden || (item.kind === 'door' && item.secret && !item.open)) return false;
  if (item.kind === 'fog') return true;
  const skip = item.kind === 'tree' ? item.id : null;
  if (sight.visiblePoint(item, skip)) return true;
  const dx = (item.width || 1) / 2 + 0.02,
    dz = (item.depth || 1) / 2 + 0.02;
  return [
    [dx, 0],
    [-dx, 0],
    [0, dz],
    [0, -dz],
    [dx, dz],
    [-dx, -dz],
    [dx, -dz],
    [-dx, dz],
  ].some(([x, z]) =>
    sight.visiblePoint({ x: item.x + x, z: item.z + z }, skip)
  );
}

function projectGame(state, seatId = null) {
  if (seatId === 'master') {
    const snapshot = JSON.parse(JSON.stringify(state));
    for (const p of Object.values(snapshot.pieces)) {
      const offset = mountedOffset(state, p);
      if (offset) Object.assign(p, { x: offset.x, z: offset.z });
    }
    const occupants = Object.values(state.pieces).filter(
      (p) =>
        ['enemy', 'token'].includes(p.kind) &&
        p.sceneId === state.sceneId &&
        !p.parentId &&
        !p.defeated
    );
    for (const t of snapshot.scenes[state.sceneId].terrain)
      if (t.kind === 'tree') t.faded = occupants.some((p) => underCanopy(t, p));
    return snapshot;
  }
  const sight = makeSight(state, seatId);
  const viewPieces = Object.values(state.pieces).filter(sight.visiblePiece);
  const ids = new Set(viewPieces.map((p) => p.id));
  const pieces = Object.fromEntries(
    viewPieces.map((p) => {
      const copy = { ...p };
      const offset = mountedOffset(state, p);
      if (offset) Object.assign(copy, { x: offset.x, z: offset.z });
      for (const key of [
        'sourceId',
        'assignedTo',
        'lastOwnerId',
        'lastThrownBy',
        'attackId',
      ]) {
        if (copy[key] && !ids.has(copy[key])) delete copy[key];
      }
      return [p.id, copy];
    })
  );
  const source = state.scenes[state.sceneId];
  const terrain = source.terrain
    .filter((t) => visibleArea(t, sight))
    .map((t) => {
      const item = { ...t };
      if (item.kind === 'tree')
        item.faded = viewPieces.some(
          (p) =>
            ['enemy', 'token'].includes(p.kind) &&
            !p.parentId &&
            !p.defeated &&
            underCanopy(t, p)
        );
      return item;
    });
  const rowsMask = Array.from({ length: source.rows }, (_, z) =>
    Array.from({ length: source.cols }, (_, x) =>
      sight.visiblePoint({ x: x + 0.5, z: z + 0.5 }) ? '1' : '0'
    ).join('')
  );
  const scene = {
    id: source.id,
    name: source.name,
    cols: source.cols,
    rows: source.rows,
    cellAspect: source.cellAspect,
    darkness: source.darkness,
    fogOfWar: source.fogOfWar,
    terrain,
    visibility: {
      cols: source.cols, rows: source.rows, rowsMask,
      detail: sampledMask(source,sight),
      ...(source.fogOfWar ? { observer: {x:sight.origin.x,z:sight.origin.z,radius:sight.radius} } : {}),
    },
  };
  const protectedArt = Boolean(source.image);
  if (source.playerImage) scene.image = source.playerImage;
  else if (source.image && !protectedArt) scene.image = source.image;
  if (protectedArt && !source.playerImage) scene.mapProtected = true;
  if (source.imageBounds) scene.imageBounds = { ...source.imageBounds };
  if (source.imageWidth) scene.imageWidth = source.imageWidth;
  if (source.imageHeight) scene.imageHeight = source.imageHeight;
  const attacks = state.attacks
    .filter(
      (a) =>
        a.sceneId === state.sceneId &&
        ids.has(a.attackerId) &&
        ids.has(a.targetId)
    )
    .map((a) => ({
      ...a,
      dice: a.dice.filter((d) => ids.has(d.id)),
      defenseDice: a.defenseDice.filter((d) => ids.has(d.id)),
    }));
  const log = state.log
    .filter((e) => e.sceneId === state.sceneId && e.seenBy.includes(seatId))
    .map(({ seenBy, ...entry }) => entry);
  return {
    id: state.id,
    title: state.title,
    sceneId: state.sceneId,
    scenes: { [scene.id]: scene },
    round: state.round,
    turnId: ids.has(state.turnId) ? state.turnId : null,
    gold: state.gold,
    seats: state.seats,
    pieces,
    attacks,
    log,
  };
}
module.exports = { projectGame, makeSight, insideMap, sceneEntrance, clamp };
