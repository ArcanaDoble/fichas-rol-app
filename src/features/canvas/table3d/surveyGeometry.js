import { snapWorldPositionToWallEndpoints } from '../../tactical-shared/spatial';

export const surveyKind = (item) =>
  item.kind === 'wall' && item.transparent ? 'window' : item.kind;
export const isLine = (item) => ['wall', 'door', 'window'].includes(item.kind);

export function endpoints(item) {
  return [
    { x: item.x1 ?? item.x - item.width / 2, z: item.z1 ?? item.z },
    { x: item.x2 ?? item.x + item.width / 2, z: item.z2 ?? item.z },
  ];
}

export function lineBetween(item, a, b) {
  return {
    ...item,
    x1: a.x,
    z1: a.z,
    x2: b.x,
    z2: b.z,
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    width: Math.max(0.04, Math.abs(b.x - a.x)),
    depth: Math.max(0.04, Math.abs(b.z - a.z)),
  };
}

export function boundPoint(point, scene) {
  return {
    x: Math.max(0, Math.min(scene.cols, point.x)),
    z: Math.max(0, Math.min(scene.rows, point.z)),
  };
}

// The native Canvas attracts a wall handle within 15 screen pixels before it
// tries the grid. Work in projected pixels so zoom, tilt and non-square maps
// preserve that reach, then return the snapped coordinates in board cells.
export function surveySnap(
  point,
  walls,
  { sx, sz, scene, grid, touch, exclude }
) {
  const segments = walls.map((item) => {
    const [a, b] = endpoints(item);
    return {
      type: 'wall',
      id: item.id,
      x1: a.x * sx,
      y1: a.z * sz,
      x2: b.x * sx,
      y2: b.z * sz,
    };
  });
  const snapped = snapWorldPositionToWallEndpoints(
    { x: point.x * sx, y: point.z * sz },
    segments,
    { isInfinite: true, cellWidth: sx, cellHeight: sz },
    { snapToGrid: grid, excludeWallId: exclude, zoom: touch ? 15 / 21 : 1 }
  );
  return boundPoint({ x: snapped.x / sx, z: snapped.y / sz }, scene);
}

export function translatedLine(item, delta, scene) {
  const [a, b] = endpoints(item);
  const x = Math.max(
    -Math.min(a.x, b.x),
    Math.min(scene.cols - Math.max(a.x, b.x), delta.x)
  );
  const z = Math.max(
    -Math.min(a.z, b.z),
    Math.min(scene.rows - Math.max(a.z, b.z), delta.z)
  );
  return lineBetween(
    item,
    { x: a.x + x, z: a.z + z },
    { x: b.x + x, z: b.z + z }
  );
}

export function distanceToLine(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)
    )
  );
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
