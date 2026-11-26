'use strict';

// Both the scene compositor and the private artwork service use the same
// sub-cell mask. Four samples fit in one hex character on the wire.
const masks = new Map();
function sampledMask(scene, sight) {
  const terrain = scene.terrain.filter((t) =>
    ['wall', 'door', 'tree', 'fog', 'smoke', 'light'].includes(t.kind)
  );
  if (
    !scene.fogOfWar &&
    !scene.darkness &&
    !terrain.some((t) => t.kind !== 'light')
  )
    return null;
  const layout = terrain.map((t) => [
    t.id,
    t.kind,
    t.x,
    t.z,
    t.x1,
    t.z1,
    t.x2,
    t.z2,
    t.width,
    t.depth,
    t.radius,
    t.yaw,
    t.open,
    t.transparent,
    t.blocksVision,
    t.hidden,
    t.visionMode,
    t.treeVisionMode,
    t.trunkRatio,
    t.polygon,
  ]);
  const key = JSON.stringify([
    scene.cols,
    scene.rows,
    scene.fogOfWar,
    scene.darkness,
    sight.origin.x,
    sight.origin.z,
    sight.radius,
    sight.darkRadius,
    [...sight.origin.canopies],
    layout,
  ]);
  if (masks.has(key)) return masks.get(key);
  const samples = Math.max(
    2,
    Math.min(16, Math.floor(160 / Math.max(scene.cols, scene.rows)))
  );
  const width = scene.cols * samples,
    height = scene.rows * samples,
    digits = [];
  let bits = 0,
    index = 0,
    anyHidden = false;
  for (let row = 0; row < height; row++) {
    const z = (row + 0.5) / samples;
    for (let col = 0; col < width; col++, index++) {
      const visible = sight.visiblePoint({ x: (col + 0.5) / samples, z });
      if (visible) bits |= 1 << index % 4;
      else anyHidden = true;
      if (index % 4 === 3) {
        digits.push(bits.toString(16));
        bits = 0;
      }
    }
  }
  if (index % 4) digits.push(bits.toString(16));
  const result = anyHidden ? { width, height, hex: digits.join('') } : null;
  if (masks.size >= 20) masks.delete(masks.keys().next().value);
  masks.set(key, result);
  return result;
}

function unpackMask(grid) {
  if (!grid) return null;
  const rows = [];
  for (let y = 0; y < grid.height; y++) {
    let row = '';
    for (let x = 0; x < grid.width; x++) {
      const i = y * grid.width + x;
      row +=
        parseInt(grid.hex[Math.floor(i / 4)], 16) & (1 << i % 4) ? '1' : '0';
    }
    rows.push(row);
  }
  return rows;
}
module.exports = { sampledMask, unpackMask };
