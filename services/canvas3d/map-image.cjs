'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const { RoomError } = require('./errors.cjs');
const { unpackMask } = require('../../src/features/canvas/table3d/gameSightMask.cjs');

const publicRoot = path.resolve(__dirname, '../../public');
const maxBytes = 20 * 1024 * 1024;
const cache = new Map();
const bucketNames = new Set(['base-de-datos-noma.firebasestorage.app', 'base-de-datos-noma.appspot.com']);

function approvedSource(raw) {
  if (typeof raw !== 'string') return null;
  if (/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(raw) && raw.length <= maxBytes * 4 / 3 + 40) {
    return { buffer: Buffer.from(raw.slice(raw.indexOf(',') + 1), 'base64') };
  }
  const local = /^\/(canvas3d|scenery)\/[a-z0-9_./%-]+\.(png|jpe?g|webp)$/i.exec(raw);
  if (local) {
    let decoded;
    try { decoded = decodeURIComponent(raw); } catch { return null; }
    const filename = path.resolve(publicRoot, '.' + decoded);
    const allowed = path.join(publicRoot, local[1]) + path.sep;
    if (filename.startsWith(allowed)) return { filename };
    return null;
  }
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const parts = url.pathname.split('/');
  if ((url.hostname === 'firebasestorage.googleapis.com' && parts[1] === 'v0' && parts[2] === 'b' && bucketNames.has(parts[3]) && parts[4] === 'o')
      || (url.hostname === 'storage.googleapis.com' && bucketNames.has(parts[1]))) return { url };
  return null;
}

async function readArtwork(raw) {
  if (cache.has(raw)) return cache.get(raw);
  const source = approvedSource(raw);
  if (!source) return null;
  let bytes = source.buffer;
  if (source.filename) {
    const stat = await fs.stat(source.filename);
    if (stat.size > maxBytes) throw new Error('La ilustración supera los 20 MB.');
    bytes = await fs.readFile(source.filename);
  }
  if (source.url) {
    const response = await fetch(source.url, { redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('No se pudo abrir la ilustración del escenario.');
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > maxBytes) throw new Error('La ilustración supera los 20 MB.');
      chunks.push(chunk);
    }
    bytes = Buffer.concat(chunks);
  }
  if (!bytes?.length || bytes.length > maxBytes) return null;
  if (bytes.length < 4 * 1024 * 1024 && !source.buffer) {
    if (cache.size >= 5) cache.delete(cache.keys().next().value);
    cache.set(raw, bytes);
  }
  return bytes;
}

// Remove RGB as well as alpha. The source is masked before resampling so a
// bright room behind a wall cannot bleed into a visible pixel during filtering.
function eraseHidden(pixels, width, height, mask, columnAt, rowAt) {
  const ranges = [];
  for (let x = 0; x < width; x++) {
    const column = columnAt(x);
    if (ranges.length && ranges.at(-1).column === column) ranges.at(-1).end++;
    else ranges.push({ column, start: x, end: x + 1 });
  }
  let previousRow, hidden;
  for (let y = 0; y < height; y++) {
    const row = rowAt(y);
    if (row !== previousRow || !hidden) {
      hidden = ranges.filter(r => mask[row]?.[r.column] !== '1');
      previousRow = row;
    }
    const offset = y * width;
    for (const { start, end } of hidden) pixels.fill(0, (offset + start) * 4, (offset + end) * 4);
  }
}

async function bake(scene, mask) {
  const { cols, rows } = scene;
  const aspect = Math.max(0.05, Math.min(20, Number(scene.cellAspect) || 1));
  const unit = Math.min(256, 3072 / Math.max(cols * aspect, rows));
  const width = Math.max(1, Math.round(cols * aspect * unit)), height = Math.max(1, Math.round(rows * unit));
  const result = Buffer.alloc(width * height * 4);
  const maskCols = mask?.[0]?.length || cols, maskRows = mask?.length || rows;
  if (!mask || mask.some(row => row?.includes('1'))) {
    const bytes = await readArtwork(scene.image);
    if (!bytes) return null;
    const source = await sharp(bytes, { limitInputPixels: 64 * 1024 * 1024 })
      .rotate().toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const sw = source.info.width, sh = source.info.height;
    const bounds = scene.imageBounds || { x: cols / 2, z: rows / 2, width: cols, depth: rows };
    const zoom = Math.min(bounds.width * width / cols / sw, bounds.depth * height / rows / sh);
    const left = bounds.x * width / cols - sw * zoom / 2;
    const top = bounds.z * height / rows - sh * zoom / 2;
    const dx = Math.max(0, Math.round(left)), dy = Math.max(0, Math.round(top));
    const right = Math.min(width, Math.round(left + zoom * sw)), bottom = Math.min(height, Math.round(top + zoom * sh));
    if (right > dx && bottom > dy) {
      if (mask) eraseHidden(source.data, sw, sh, mask,
        x => Math.floor((left + (x + 0.5) * zoom) * maskCols / width),
        y => Math.floor((top + (y + 0.5) * zoom) * maskRows / height));
      const sx = Math.min(sw - 1, Math.max(0, Math.floor((dx - left) / zoom)));
      const sy = Math.min(sh - 1, Math.max(0, Math.floor((dy - top) / zoom)));
      const ex = Math.min(sw, Math.max(sx + 1, Math.ceil((right - left) / zoom)));
      const ey = Math.min(sh, Math.max(sy + 1, Math.ceil((bottom - top) / zoom)));
      // Crop first: oversized or partly off-map bounds never allocate an
      // off-screen image.
      const w = right - dx, h = bottom - dy;
      const fitted = await sharp(source.data, { raw: { width: sw, height: sh, channels: 4 } })
        .extract({ left: sx, top: sy, width: ex - sx, height: ey - sy })
        .resize(w, h, { fit: 'fill' }).raw().toBuffer();
      for (let y = 0; y < h; y++) fitted.copy(result, ((dy + y) * width + dx) * 4, y * w * 4, (y + 1) * w * 4);
      if (mask) eraseHidden(result, width, height, mask,
        x => Math.floor((x + 0.5) * maskCols / width), y => Math.floor((y + 0.5) * maskRows / height));
    }
  }
  const body = await sharp(result, { raw: { width, height, channels: 4 } })
    .webp({ quality: 86, alphaQuality: 100 }).toBuffer();
  return { type: 'image/webp', body };
}

const baked = new Map(), pending = new Map();
let cachedBytes = 0, queue = Promise.resolve();
async function cachedImage(key, render) {
  if (baked.has(key)) return baked.get(key);
  if (pending.has(key)) return pending.get(key);
  if (pending.size >= 24) throw new RoomError(429, 'Las ilustraciones de la mesa se están preparando.');
  // A 64-megapixel illustration can occupy 256 MB when decoded. Serialize the
  // native work and share it for participants with identical visibility.
  const job = queue.then(render);
  pending.set(key, job);
  queue = job.catch(() => {});
  try {
    const image = await job;
    if (image && image.body.length < 5 * 1024 * 1024) {
      while (baked.size && (baked.size >= 32 || cachedBytes + image.body.length > 16 * 1024 * 1024)) {
        const old = baked.keys().next().value;
        cachedBytes -= baked.get(old).body.length;
        baked.delete(old);
      }
      baked.set(key, image); cachedBytes += image.body.length;
    }
    return image;
  } finally { pending.delete(key); }
}

function renderMapImage({ scene, visibleScene, seatId }) {
  if (!scene?.image || !visibleScene || scene.id !== visibleScene.id) return null;
  const visibility=visibleScene.visibility;
  const mask = seatId === 'master' ? null : (unpackMask(visibility?.detail) || visibility?.rowsMask || []);
  const key = createHash('sha256').update(JSON.stringify([
    scene.image, scene.imageBounds, scene.cellAspect, scene.cols, scene.rows, mask,
  ])).digest('hex');
  return cachedImage(key, () => bake(scene, mask));
}

function renderPieceImage(raw) {
  // Piece art is referenced through the authorized game projection. Permit
  // shipped assets and the NOMA Storage bucket, never a caller-provided URL.
  const source = approvedSource(raw);
  if (!source?.filename && !source?.url) return null;
  const key = 'piece:' + createHash('sha256').update(raw).digest('hex');
  return cachedImage(key, async () => {
    const bytes = await readArtwork(raw);
    if (!bytes) return null;
    const body = await sharp(bytes, { limitInputPixels: 32 * 1024 * 1024 })
      .rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 100, effort: 3 }).toBuffer();
    return { type: 'image/webp', body };
  });
}

module.exports = { renderMapImage, renderPieceImage };
