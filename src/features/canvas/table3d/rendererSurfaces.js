import { classFace, paintTablet, patioArt } from './patioClassSkins';
import * as THREE from 'three';
import { decodedMaps } from './decodedMaps';
import { paintBoard, paintMedallion } from './patioInlay';

export const visual = (name) =>
  (process.env.PUBLIC_URL || '') + '/canvas3d/visual/' + name;
const serif = 'NomaMesa, Georgia, "Times New Roman", serif';
const gold = '#b89c68';

function canvas(width, height) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return element;
}

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeGrain(wood) {
  const tile = canvas(512, 256);
  const ctx = tile.getContext('2d');
  const image = ctx.createImageData(tile.width, tile.height);
  const random = seeded(wood ? 19 : 42);
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const u = (x / 512) * Math.PI * 2,
        v = (y / 256) * Math.PI * 2;
      const wave = Math.sin(
        v * 17 + 0.8 * Math.sin(u + v) + 0.4 * Math.cos(u * 3)
      );
      const band = Math.cos(v * 39 + 0.7 * wave + 0.35 * Math.sin(u * 2));
      const fiber = wood
        ? 7 * wave + 4 * band + 5 * Math.cos(v * 4 + Math.sin(u))
        : 2.6 * Math.sin(1.57 * (x + y));
      const tone = fiber + (random() - 0.5) * (wood ? 9 : 10);
      const base = wood ? [63, 45, 32] : [48, 62, 53];
      const i = (y * tile.width + x) * 4;
      image.data[i] = base[0] + tone;
      image.data[i + 1] = base[1] + tone * 0.86;
      image.data[i + 2] = base[2] + tone * 0.67;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return tile;
}

export function cutPath(ctx, x, y, w, h, cut) {
  const k = Math.min(cut, w / 3, h / 3);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.lineTo(x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.lineTo(x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.lineTo(x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.closePath();
}

function paintImage(ctx, image, x, y, w, h, cover = false) {
  if (!image || !image.width || w <= 0 || h <= 0) return;
  const scale = (cover ? Math.max : Math.min)(
    w / image.width,
    h / image.height
  );
  const iw = image.width * scale,
    ih = image.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function type(
  ctx,
  text,
  x,
  y,
  size,
  maxWidth,
  color = '#f3e4c5',
  align = 'left'
) {
  if (!text || maxWidth <= 0) return;
  ctx.font = '600 ' + size + 'px ' + serif;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const label = String(text);
  const measured = ctx.measureText(label).width;
  if (measured > maxWidth)
    ctx.font = '600 ' + (size * maxWidth) / measured + 'px ' + serif;
  ctx.fillText(label, x, y);
}

function compass(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#b49a69';
  ctx.lineWidth = r * 0.014;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.81, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.87, 0, 2 * Math.PI);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    const tip = i % 2 ? 0.68 : 1;
    ctx.fillStyle = '#c3a573';
    ctx.beginPath();
    ctx.moveTo(0, -r * tip);
    ctx.lineTo(r * 0.115, -r * 0.12);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.fillStyle = '#83694f';
    ctx.beginPath();
    ctx.moveTo(0, -r * tip);
    ctx.lineTo(-r * 0.115, -r * 0.12);
    ctx.lineTo(0, 0);
    ctx.fill();
  }
  ctx.restore();
}

// All artwork is loaded once per table. Pending draws are detached on unmount.
export class SurfaceLibrary {
  constructor(invalidate) {
    this.invalidate = invalidate;
    this.images = new Map();
    this.textures = new Map();
    this.wood = makeGrain(true);
    this.felt = makeGrain(false);
    this.disposed = false;
    if (document.fonts?.load) {
      Promise.all(
        ['NomaMesa', 'PatioClase'].map((f) =>
          document.fonts.load('600 16px ' + f)
        )
      )
        .then(() => {
          if (this.disposed) return;
          for (const tex of this.textures.values())
            tex.userData.refreshType?.();
          this.invalidate();
        })
        .catch(() => {});
    }
  }

  image(url, repaint) {
    if (typeof url !== 'string' || !url || this.disposed) return null;
    let entry = this.images.get(url);
    if (!entry) {
      const loaded = decodedMaps.get(url);
      if (loaded) {
        this.images.set(url, {
          element: loaded,
          state: 'ready',
          waiting: new Set(),
        });
        return loaded;
      }
      const element = new Image();
      entry = { element, state: 'loading', waiting: new Set() };
      this.images.set(url, entry);
      element.crossOrigin = 'anonymous';
      element.onload = () => {
        entry.state = 'ready';
        if (!this.disposed) {
          for (const draw of entry.waiting) draw();
          this.invalidate();
        }
        entry.waiting.clear();
      };
      element.onerror = () => {
        entry.state = 'error';
        entry.waiting.clear();
      };
      element.src = url;
    }
    if (entry.state === 'loading' && repaint) entry.waiting.add(repaint);
    return entry.state === 'ready' ? entry.element : null;
  }

  texture(key, width, height, painter) {
    if (this.textures.has(key)) return this.textures.get(key);
    const element = canvas(
      Math.max(16, Math.ceil(width)),
      Math.max(16, Math.ceil(height))
    );
    const ctx = element.getContext('2d');
    const tex = new THREE.CanvasTexture(element);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const draw = () => {
      if (this.disposed) return;
      ctx.save();
      ctx.clearRect(0, 0, element.width, element.height);
      painter(ctx, element.width, element.height, (url) =>
        this.image(url, draw)
      );
      ctx.restore();
      tex.needsUpdate = true;
    };
    this.textures.set(key, tex);
    if (key.startsWith('piece:')) tex.userData.refreshType = draw;
    draw();
    return tex;
  }

  release(key) {
    const texture = this.textures.get(key);
    if (texture) {
      texture.dispose();
      this.textures.delete(key);
    }
  }

  forgetImage(url) {
    const entry = this.images.get(url);
    if (!entry) return;
    entry.waiting.clear();
    entry.element.onload = null;
    entry.element.onerror = null;
    this.images.delete(url);
  }

  dispose() {
    this.disposed = true;
    for (const texture of this.textures.values()) texture.dispose();
    for (const entry of this.images.values()) {
      entry.waiting.clear();
      entry.element.onload = null;
      entry.element.onerror = null;
    }
    this.textures.clear();
    this.images.clear();
  }
}

export function tableWood(lib) {
  const tex = lib.texture('table:wood', 940, 520, (ctx, w, h, get) => {
    ctx.drawImage(get(visual('nogal-patio.webp')) || lib.wood, 0, 0, w, h);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// The joints, corner leaves and compass all share the coordinates of the image below them.
export function mapSkin(lib, scene) {
  const aspect = (scene.cols * (scene.cellAspect || 1)) / scene.rows;
  const limit = scene.image ? 3072 : 1800;
  const density = scene.image ? 256 : 132;
  const w = Math.max(
    1,
    Math.round(
      Math.min(limit, Math.max(400, scene.cols * density), limit * aspect)
    )
  );
  const h = Math.round(w / aspect);
  return lib.texture(
    'map:' +
      [
        scene.id,
        scene.cols,
        scene.rows,
        scene.cellAspect,
        scene.image,
        JSON.stringify(scene.imageBounds || null),
      ].join('|'),
    w,
    h,
    (ctx, width, height, get) => {
      paintBoard(ctx, width, height, scene, get, (W, H) => {
        const image = get(scene.image);
        if (!image) return;
        const b = scene.imageBounds;
        if (b)
          paintImage(
            ctx,
            image,
            ((b.x - b.width / 2) * W) / scene.cols,
            ((b.z - b.depth / 2) * H) / scene.rows,
            (b.width * W) / scene.cols,
            (b.depth * H) / scene.rows
          );
        else paintImage(ctx, image, 0, 0, W, H);
      });
    }
  );
}

export function pieceSkin(lib, p, slots) {
  if (p.kind === 'mat') return classFace(lib, p, slots);
  const w = p.width || 1,
    d = p.depth || 1;
  const detail = ['token', 'enemy'].includes(p.kind)
    ? 512 / Math.max(w, d)
    : 225;
  const key =
    'piece:' +
    [
      p.kind,
      p.name,
      p.image,
      p.className,
      p.hands,
      p.dice,
      p.open,
      w,
      d,
      slots.map((s) => s.id).join(','),
      p.role,
      p.defense,
    ].join('|');
  return lib.texture(
    key,
    Math.min(1680, w * detail),
    Math.min(1200, d * detail),
    (ctx, W, H, get) => {
      const px = W / w;
      const goldEdge = (inset, line, color) => {
        cutPath(
          ctx,
          inset,
          inset,
          W - 2 * inset,
          H - 2 * inset,
          Math.max(2, px * 0.037)
        );
        ctx.strokeStyle = color;
        ctx.lineWidth = line;
        ctx.stroke();
      };
      ctx.fillStyle = ctx.createPattern(lib.wood, 'repeat');
      ctx.fillRect(0, 0, W, H);
      if (p.kind === 'box') {
        goldEdge(px * 0.035, px * 0.028, '#ba9b63');
        if (p.open) {
          cutPath(
            ctx,
            px * 0.09,
            px * 0.09,
            W - px * 0.18,
            H - px * 0.18,
            px * 0.07
          );
          ctx.fillStyle = ctx.createPattern(lib.felt, 'repeat');
          ctx.fill();
          type(
            ctx,
            'Descartes',
            W / 2,
            H * 0.86,
            px * 0.13,
            W * 0.78,
            '#dec8a0',
            'center'
          );
        } else {
          for (const x of [W * 0.1, W * 0.86]) {
            ctx.fillStyle = '#35291c';
            ctx.fillRect(x, 0, W * 0.045, H);
            ctx.fillStyle = '#a28651';
            ctx.fillRect(x + W * 0.01, 0, W * 0.013, H);
          }
          compass(ctx, W / 2, H * 0.42, H * 0.23);
          type(
            ctx,
            'Descartes',
            W / 2,
            H * 0.8,
            px * 0.16,
            W * 0.74,
            '#f0dbb2',
            'center'
          );
        }
        return;
      }
      if (p.kind === 'token' || p.kind === 'enemy') {
        paintMedallion(ctx, W, H, p, get);
        return;
      }
      if (p.kind === 'coin') {
        const art = get(visual('moneda-mesa.webp'));
        ctx.clearRect(0, 0, W, H);
        if (art) paintImage(ctx, art, 0, 0, W, H);
        return;
      }
      if (p.kind === 'bag') {
        ctx.clearRect(0, 0, W, H);
        const body = get(visual('bolsa-cuerpo.webp')),
          liner = get(visual('bolsa-forro.webp'));
        if (p.open) {
          paintImage(ctx, liner, 0, 0, W, H * 0.42);
          paintImage(ctx, body, 0, H * 0.26, W, H * 0.74);
        } else {
          paintImage(ctx, get(patioArt('purse')), 0, 0, W, H);
        }
        return;
      }
      if (p.kind === 'health') {
        ctx.fillStyle = '#742e22';
        ctx.fillRect(0, 0, W, H);
        paintImage(ctx, get(visual('sello-de-vida.webp')), 0, 0, W, H, true);
        goldEdge(2, 1, '#aa6a48');
        return;
      }
      if (p.kind === 'ember' || p.kind === 'trait') {
        ctx.fillStyle = p.kind === 'ember' ? '#6c3021' : '#233c3a';
        ctx.fillRect(0, 0, W, H);
        goldEdge(3, 2, gold);
        if (p.kind === 'ember')
          compass(ctx, W / 2, H / 2, Math.min(W, H) * 0.39);
        else {
          ctx.strokeStyle = '#e9d7a2';
          ctx.lineWidth = W * 0.042;
          ctx.beginPath();
          ctx.moveTo(W * 0.17, H * 0.51);
          ctx.quadraticCurveTo(W * 0.5, H * 0.02, W * 0.83, H * 0.51);
          ctx.quadraticCurveTo(W * 0.5, H * 0.95, W * 0.17, H * 0.51);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(W * 0.5, H * 0.5, W * 0.11, 0, 2 * Math.PI);
          ctx.fillStyle = '#b8ae82';
          ctx.fill();
        }
        return;
      }
      paintTablet(ctx, W, H, p, get);
    }
  );
}
