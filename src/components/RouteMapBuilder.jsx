import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Application,
  BitmapFont,
  BitmapText,
  Cache,
  Container,
  Graphics,
  Point,
  Sprite,
  Text,
  Texture,
  TilingSprite,
  WRAP_MODES,
  Rectangle,
} from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { nanoid } from 'nanoid';
import {
  ArrowLeft,
  Compass,
  Copy,
  FileDown,
  Link2,
  LockKeyhole,
  MousePointer2,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Wand2,
} from 'lucide-react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import Boton from './Boton';
import Input from './Input';
import { db } from '../firebase';
import { getOrUploadFile } from '../utils/storage';

const ensurePixiViewportCompatibility = (() => {
  let patched = false;
  return () => {
    if (patched) return;

    const containerPrototypes = new Set();
    if (Container?.prototype) {
      containerPrototypes.add(Container.prototype);
      const parentProto = Object.getPrototypeOf(Container.prototype);
      if (parentProto) {
        containerPrototypes.add(parentProto);
      }
    }

    const updateLocalTransformFallback = function updateLocalTransformFallback() {
      const transform = this.transform;
      if (!transform) {
        return;
      }

      const matrix = transform.matrix;
      let localTransform = this.localTransform;

      if (!localTransform) {
        this.localTransform = matrix;
        return;
      }

      if (localTransform !== matrix) {
        if (typeof localTransform.copyFrom === 'function') {
          localTransform.copyFrom(matrix);
        } else {
          localTransform.a = matrix.a;
          localTransform.b = matrix.b;
          localTransform.c = matrix.c;
          localTransform.d = matrix.d;
          localTransform.tx = matrix.tx;
          localTransform.ty = matrix.ty;
        }
      }

      if (typeof this._didContainerChangeTick === 'number') {
        this._didLocalTransformChangeId = this._didContainerChangeTick;
      }
    };

    containerPrototypes.forEach((proto) => {
      if (proto && typeof proto.updateLocalTransform !== 'function') {
        proto.updateLocalTransform = updateLocalTransformFallback;
      }
    });

    if (Viewport?.prototype && typeof Viewport.prototype.isInteractive !== 'function') {
      Viewport.prototype.isInteractive = function isInteractive() {
        if (typeof this.eventMode !== 'undefined') {
          return this.eventMode !== 'none' && this.renderable !== false;
        }
        return this.interactive !== false && this.renderable !== false;
      };
    }

    patched = true;
  };
})();

ensurePixiViewportCompatibility();

const ROUTE_MAP_CUSTOM_ICONS_KEY = 'routeMapCustomIcons';
const MINIMAP_CUSTOM_ICONS_KEY = 'minimapCustomIcons';

function IconThumb({ src, selected, onClick, label, onDelete }) {
  return (
    <div className="relative inline-block">
      <button
        type="button"
        title={label || ''}
        onClick={onClick}
        className={`relative h-14 w-14 overflow-hidden rounded-lg border bg-slate-900/80 transition ${
          selected
            ? 'border-sky-400 ring-2 ring-sky-400'
            : 'border-slate-700/80 hover:border-slate-500/80'
        }`}
      >
        <img
          loading="lazy"
          src={src}
          alt={label || 'icon'}
          className="h-full w-full object-contain"
        />
      </button>
      {onDelete && (
        <button
          type="button"
          aria-label="Eliminar icono"
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-1 ring-black/40 transition hover:bg-red-500"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}

IconThumb.propTypes = {
  src: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  label: PropTypes.string,
  onDelete: PropTypes.func,
};

const sanitizeCustomIcons = (icons) => {
  if (!Array.isArray(icons)) return [];
  const seen = new Set();
  return icons
    .map((icon) => (typeof icon === 'string' ? icon.trim() : ''))
    .filter((icon) => {
      if (!icon || seen.has(icon)) {
        return false;
      }
      seen.add(icon);
      return true;
    });
};

const readLocalCustomIcons = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(ROUTE_MAP_CUSTOM_ICONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeCustomIcons(parsed);
  } catch {
    return [];
  }
};

const readMinimapLocalCustomIcons = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MINIMAP_CUSTOM_ICONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeCustomIcons(parsed);
  } catch {
    return [];
  }
};

const NODE_TYPES = [
  {
    id: 'start',
    label: 'Inicio',
    iconLabel: 'Casa',
    defaults: {
      accent: '#38bdf8',
      fill: '#0c1a2e',
      border: '#7dd3fc',
      icon: '#f8fafc',
    },
  },
  {
    id: 'normal',
    label: 'Normal',
    iconLabel: 'Combate',
    defaults: {
      accent: '#a855f7',
      fill: '#180d2b',
      border: '#c084fc',
      icon: '#f5f3ff',
    },
  },
  {
    id: 'event',
    label: 'Evento',
    iconLabel: 'Evento',
    defaults: {
      accent: '#fbbf24',
      fill: '#2a1705',
      border: '#fcd34d',
      icon: '#fef3c7',
    },
  },
  {
    id: 'shop',
    label: 'Tienda',
    iconLabel: 'Mercader',
    defaults: {
      accent: '#f97316',
      fill: '#2a1305',
      border: '#fb923c',
      icon: '#fff7ed',
    },
  },
  {
    id: 'elite',
    label: 'Elite',
    iconLabel: 'Élite',
    defaults: {
      accent: '#fb7185',
      fill: '#2a0f16',
      border: '#fda4af',
      icon: '#ffe4e6',
    },
  },
  {
    id: 'heal',
    label: 'Curación',
    iconLabel: 'Curación',
    defaults: {
      accent: '#34d399',
      fill: '#052015',
      border: '#6ee7b7',
      icon: '#ecfdf5',
    },
  },
  {
    id: 'boss',
    label: 'Jefe',
    iconLabel: 'Jefe',
    defaults: {
      accent: '#f59e0b',
      fill: '#2b1503',
      border: '#fbbf24',
      icon: '#fef3c7',
    },
  },
];

const NODE_STATES = {
  locked: {
    label: 'Bloqueado',
    stroke: '#1f2937',
    fillAlpha: 0.48,
    aura: '#0f172a',
    badge: 'lock',
    badgeColor: '#f8fafc',
  },
  visible: {
    label: 'Visible',
    stroke: '#334155',
    fillAlpha: 0.6,
    aura: '#1e293b',
    badge: 'lockOpen',
    badgeColor: '#fbbf24',
  },
  unlocked: {
    label: 'Desbloqueado',
    stroke: '#38bdf8',
    fillAlpha: 0.92,
    aura: '#0ea5e9',
  },
  completed: {
    label: 'Completado',
    stroke: '#facc15',
    fillAlpha: 0.96,
    aura: '#facc15',
  },
  current: {
    label: 'Actual',
    stroke: '#22d3ee',
    fillAlpha: 0.98,
    aura: '#38bdf8',
  },
};

const TOOLBAR_ACTIONS = [
  { id: 'select', label: 'Seleccionar / Mover', icon: MousePointer2 },
  { id: 'create', label: 'Crear Nodo', icon: Wand2 },
  { id: 'connect', label: 'Conectar', icon: Link2 },
  { id: 'delete', label: 'Borrar', icon: Trash2 },
  { id: 'toggleLock', label: 'Bloquear / Desbloquear', icon: LockKeyhole },
];

const GRID_SIZES = [20, 32, 40, 48, 64];

const hexToInt = (hex) => parseInt(hex.replace('#', ''), 16);

const normalizeHex = (hex) => {
  if (typeof hex !== 'string') return null;
  const trimmed = hex.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(prefixed) ? prefixed.toLowerCase() : null;
};

const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
};

const rgbToHex = (r, g, b) => {
  const clamp = (num) => Math.min(255, Math.max(0, Math.round(num)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
};

const mixHex = (hexA, hexB, amount) => {
  const colorA = hexToRgb(hexA);
  const colorB = hexToRgb(hexB);
  if (!colorA || !colorB) return normalizeHex(hexA) || normalizeHex(hexB);
  const t = Math.min(1, Math.max(0, amount));
  const mix = (a, b) => a + (b - a) * t;
  return rgbToHex(mix(colorA.r, colorB.r), mix(colorA.g, colorB.g), mix(colorA.b, colorB.b));
};

const lightenHex = (hex, amount) => mixHex(hex, '#ffffff', amount);
const darkenHex = (hex, amount) => mixHex(hex, '#000000', amount);

const EDGE_SEGMENT_BASE_LENGTH = 48;
const EDGE_SEGMENT_MIN_STEPS = 8;
const EDGE_DASH_SPEED = 4.5;
const EDGE_STROKE_WIDTH = 12;
const EDGE_STROKE_WIDTH_SELECTED = 14;
const DASH_TEXTURE_TOTAL_WIDTH = 96;
const DASH_TEXTURE_DASH_WIDTH = 52;
const DASH_TEXTURE_HEIGHT = 12;
const DASH_TEXTURE_CORE_HEIGHT = 6;
const clamp01 = (value) => Math.min(1, Math.max(0, value));

const createDashTexture = (renderer) => {
  if (!renderer) return null;
  const dashGraphic = new Graphics();
  dashGraphic.beginFill(0xffffff, 0);
  dashGraphic.drawRect(0, 0, DASH_TEXTURE_TOTAL_WIDTH, DASH_TEXTURE_HEIGHT);
  dashGraphic.endFill();
  const dashStartY = (DASH_TEXTURE_HEIGHT - DASH_TEXTURE_CORE_HEIGHT) / 2;
  dashGraphic.beginFill(0xffffff, 1);
  dashGraphic.drawRoundedRect(
    0,
    dashStartY,
    DASH_TEXTURE_DASH_WIDTH,
    DASH_TEXTURE_CORE_HEIGHT,
    DASH_TEXTURE_CORE_HEIGHT / 2,
  );
  dashGraphic.endFill();
  const texture = renderer.generateTexture(dashGraphic, {
    resolution: 1,
    region: new Rectangle(0, 0, DASH_TEXTURE_TOTAL_WIDTH, DASH_TEXTURE_HEIGHT),
  });
  dashGraphic.destroy(true);
  if (texture?.baseTexture) {
    texture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
  }
  return texture;
};

const getQuadraticPoint = (from, control, to, t) => {
  const inv = 1 - t;
  return {
    x: inv * inv * from.x + 2 * inv * t * control.x + t * t * to.x,
    y: inv * inv * from.y + 2 * inv * t * control.y + t * t * to.y,
  };
};

const createQuadraticSegments = (from, control, to) => {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(EDGE_SEGMENT_MIN_STEPS, Math.ceil(distance / EDGE_SEGMENT_BASE_LENGTH) * 4);
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    points.push(getQuadraticPoint(from, control, to, i / steps));
  }
  const segments = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length <= 0.5) continue;
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    segments.push({ start, end, midpoint, length, angle });
  }
  return segments;
};

const cloneState = (nodes, edges) => ({
  nodes: nodes.map((node) => ({ ...node })),
  edges: edges.map((edge) => ({ ...edge })),
});

const DEFAULT_APPEARANCE = {
  accent: '#38bdf8',
  fill: '#0f172a',
  border: '#38bdf8',
  icon: '#f8fafc',
};

const getTypeDefaults = (typeId) => {
  const type = NODE_TYPES.find((item) => item.id === typeId);
  if (!type || !type.defaults) return DEFAULT_APPEARANCE;
  return {
    accent: normalizeHex(type.defaults.accent) || DEFAULT_APPEARANCE.accent,
    fill: normalizeHex(type.defaults.fill) || DEFAULT_APPEARANCE.fill,
    border: normalizeHex(type.defaults.border) || DEFAULT_APPEARANCE.border,
    icon: normalizeHex(type.defaults.icon) || DEFAULT_APPEARANCE.icon,
  };
};

const applyAppearanceDefaults = (node) => {
  if (!node) return node;
  const palette = getTypeDefaults(node.type);
  return {
    ...node,
    accentColor: normalizeHex(node.accentColor) || palette.accent,
    fillColor: normalizeHex(node.fillColor) || palette.fill,
    borderColor: normalizeHex(node.borderColor) || palette.border,
    iconColor: normalizeHex(node.iconColor) || palette.icon,
    iconUrl:
      typeof node.iconUrl === 'string' && node.iconUrl.trim()
        ? node.iconUrl.trim()
        : null,
  };
};

const normalizeNodesCollection = (nodes) => nodes.map((node) => applyAppearanceDefaults(node));

const emojiTextureCache = new Map();
const customIconTextureCache = new Map();

const EMOJI_TEXTURE_SIZE = 96;
const EMOJI_TEXTURE_RESOLUTION = 2;

const getEmojiDrawingSurface = (size) => {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(size, size);
  }
  if (typeof document !== 'undefined' && document.createElement) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
  }
  return null;
};

const getEmojiTexture = (emoji, color) => {
  const normalizedColor = normalizeHex(color) || '#f8fafc';
  const fallbackEmoji = '❔';
  const rawEmoji = typeof emoji === 'string' && emoji.trim().length ? emoji : fallbackEmoji;
  const cacheKey = `${rawEmoji}-${normalizedColor}`;
  const cached = emojiTextureCache.get(cacheKey);

  if (cached instanceof Texture) {
    if (!cached.destroyed && cached.valid) {
      return cached;
    }
    emojiTextureCache.delete(cacheKey);
  } else if (cached && typeof cached.then === 'function') {
    // Limpia cualquier promesa obsoleta generada por versiones anteriores del caché.
    emojiTextureCache.delete(cacheKey);
  }

  const scaledSize = EMOJI_TEXTURE_SIZE * EMOJI_TEXTURE_RESOLUTION;
  const drawingSurface = getEmojiDrawingSurface(scaledSize);

  if (!drawingSurface) {
    return Texture.WHITE;
  }

  if ('width' in drawingSurface && 'height' in drawingSurface) {
    drawingSurface.width = scaledSize;
    drawingSurface.height = scaledSize;
  }

  const context = drawingSurface.getContext('2d');

  if (!context) {
    return Texture.WHITE;
  }

  context.clearRect(0, 0, scaledSize, scaledSize);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  const fontSize = Math.round(EMOJI_TEXTURE_SIZE * 0.72 * EMOJI_TEXTURE_RESOLUTION);
  context.font = `${fontSize}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'EmojiOne Color', sans-serif`;
  context.fillStyle = normalizedColor;
  const metrics = context.measureText(rawEmoji);
  const leftBearing = metrics.actualBoundingBoxLeft ?? metrics.width / 2;
  const rightBearing = metrics.actualBoundingBoxRight ?? metrics.width / 2;
  const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.5;
  const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.5;
  const drawX = scaledSize / 2 + (leftBearing - rightBearing) / 2;
  const drawY = scaledSize / 2 + (ascent - descent) / 2;
  context.fillText(rawEmoji, drawX, drawY);

  const texture = Texture.from(drawingSurface, {
    resolution: EMOJI_TEXTURE_RESOLUTION,
    scaleMode: 'linear',
  });

  if (texture?.baseTexture) {
    texture.baseTexture.mipmap = 'on';
    texture.baseTexture.scaleMode = 'linear';
    texture.baseTexture.anisotropicLevel = 8;
  }

  emojiTextureCache.set(cacheKey, texture);

  return texture;
};

const getTextureDimensions = (texture) => {
  const pickNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  if (!texture) {
    return { width: 0, height: 0 };
  }
  const width = Math.max(
    0,
    pickNumber(texture.width),
    pickNumber(texture?.orig?.width),
    pickNumber(texture?.frame?.width),
    pickNumber(texture?.baseTexture?.realWidth),
    pickNumber(texture?.baseTexture?.width),
  );
  const height = Math.max(
    0,
    pickNumber(texture.height),
    pickNumber(texture?.orig?.height),
    pickNumber(texture?.frame?.height),
    pickNumber(texture?.baseTexture?.realHeight),
    pickNumber(texture?.baseTexture?.height),
  );
  return { width, height };
};

const hasPositiveTextureDimensions = (texture) => {
  const { width, height } = getTextureDimensions(texture);
  return width > 0 && height > 0;
};

const getCustomIconTexture = (url) => {
  const source = typeof url === 'string' ? url.trim() : '';
  if (!source) {
    return null;
  }
  const cached = customIconTextureCache.get(source);
  if (cached instanceof Texture) {
    if (!cached.destroyed && !cached.baseTexture?.destroyed && hasPositiveTextureDimensions(cached)) {
      return cached;
    }
    customIconTextureCache.delete(source);
  } else if (cached && typeof cached.then === 'function') {
    return cached;
  }

  const applyTextureSettings = (texture) => {
    if (texture?.baseTexture) {
      texture.baseTexture.mipmap = 'on';
      texture.baseTexture.scaleMode = 'linear';
      texture.baseTexture.anisotropicLevel = 8;
    }
    return texture;
  };

  const validateCustomTexture = (texture) => {
    if (!texture || texture.destroyed || texture?.baseTexture?.destroyed) {
      throw new Error('La textura del icono personalizado no existe o está destruida');
    }
    const { width, height } = getTextureDimensions(texture);
    if (width <= 0 || height <= 0) {
      throw new Error('La textura del icono personalizado no es válida o carece de dimensiones utilizables');
    }
    return texture;
  };

  const ensureTextureReady = (texture) => {
    const finalizeTexture = (preparedTexture) => {
      const textureWithSettings = applyTextureSettings(preparedTexture);
      return validateCustomTexture(textureWithSettings);
    };

    if (!texture?.baseTexture) {
      try {
        return Promise.resolve(finalizeTexture(texture));
      } catch (error) {
        return Promise.reject(error);
      }
    }

    const baseTexture = texture.baseTexture;
    const hasValidFlag = typeof baseTexture.valid === 'boolean';
    if ((hasValidFlag && baseTexture.valid) || hasPositiveTextureDimensions(texture)) {
      try {
        return Promise.resolve(finalizeTexture(texture));
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        try {
          baseTexture.off('loaded', handleReady);
          baseTexture.off('update', handleReady);
          baseTexture.off('error', handleError);
        } catch {}
      };
      const settleWithTexture = () => {
        cleanup();
        try {
          resolve(finalizeTexture(texture));
        } catch (error) {
          reject(error);
        }
      };
      const handleReady = () => {
        if (!hasPositiveTextureDimensions(texture)) {
          return;
        }
        settleWithTexture();
      };
      const handleError = (error) => {
        cleanup();
        reject(error);
      };
      try {
        if (typeof baseTexture.once === 'function') {
          if (hasValidFlag) {
            baseTexture.once('loaded', handleReady);
          }
          baseTexture.once('update', handleReady);
          baseTexture.once('error', handleError);
        } else {
          // If the event emitter API is not available, attempt immediate validation.
          handleReady();
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  };

  const loadTexture = () => {
    if (typeof window === 'undefined') {
      try {
        const texture = Texture.from(source);
        return ensureTextureReady(texture);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    const isDataUrl = source.startsWith('data:');

    if (isDataUrl) {
      try {
        const dataTexture = Texture.from(source);
        return ensureTextureReady(dataTexture);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    if (typeof Image === 'undefined') {
      try {
        const fallbackTexture = Texture.from(source);
        return ensureTextureReady(fallbackTexture);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;

      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
      };

      image.onload = () => {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          const texture = Texture.from(image);
          ensureTextureReady(texture).then(resolve).catch(reject);
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = (event) => {
        if (settled) return;
        settled = true;
        cleanup();
        const error = event?.error instanceof Error ? event.error : new Error('No se pudo cargar el icono personalizado');
        reject(error);
      };

      try {
        image.crossOrigin = 'anonymous';
        image.decoding = 'async';
        image.referrerPolicy = 'no-referrer';
      } catch {}

      image.src = source;

      if (image.complete && image.naturalWidth > 0) {
        Promise.resolve().then(() => {
          if (typeof image.onload === 'function') {
            image.onload();
          }
        });
      }
    });
  };

  const promise = loadTexture()
    .then((texture) => {
      if (!texture) {
        throw new Error('No texture generated for custom icon');
      }
      customIconTextureCache.set(source, texture);
      return texture;
    })
    .catch((error) => {
      customIconTextureCache.delete(source);
      throw error;
    });

  customIconTextureCache.set(source, promise);
  return promise;
};

const fallbackHex = (...values) => {
  for (const value of values) {
    const normalized = normalizeHex(value);
    if (normalized) return normalized;
  }
  return '#f8fafc';
};

const NODE_ICON_EMOJIS = {
  start: '🏠',
  normal: '⚔️',
  event: '📜',
  shop: '🛒',
  elite: '🛡️',
  heal: '💖',
  boss: '👑',
};

const NODE_TEXTURE_KEYS = [
  'frame',
  'frameActive',
  'frameBoss',
  'frameBossActive',
  'core',
  'gloss',
  'halo',
  'haloBoss',
  'haloComplete',
  'lock',
  'check',
  'label',
];

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const effectiveRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + effectiveRadius, y);
  ctx.lineTo(x + width - effectiveRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + effectiveRadius);
  ctx.lineTo(x + width, y + height - effectiveRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - effectiveRadius, y + height);
  ctx.lineTo(x + effectiveRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - effectiveRadius);
  ctx.lineTo(x, y + effectiveRadius);
  ctx.quadraticCurveTo(x, y, x + effectiveRadius, y);
  ctx.closePath();
};

const createCanvasTexture = (id, size, draw) => {
  if (typeof document === 'undefined') {
    return Texture.WHITE;
  }

  const scale = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Texture.WHITE;
  }

  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, size, size);
  draw(ctx, size);

  const texture = Texture.from({ resource: canvas, resolution: scale, scaleMode: 'linear' });
  if (texture?.baseTexture) {
    if (typeof texture.baseTexture.setSize === 'function') {
      texture.baseTexture.setSize(size, size, true);
    }
    texture.baseTexture.scaleMode = 'linear';
    texture.baseTexture.mipmap = 'on';
    texture.baseTexture.anisotropicLevel = 8;
  }
  texture.label = id;
  return texture;
};

const normalizeGradientStops = (stops) => {
  if (!Array.isArray(stops) || stops.length === 0) {
    return [
      { offset: 0, color: '#0f172a' },
      { offset: 1, color: '#020617' },
    ];
  }
  const normalized = stops
    .map((stop, index) => {
      if (!stop || typeof stop !== 'object') {
        return null;
      }
      const offset = typeof stop.offset === 'number' ? clamp01(stop.offset) : clamp01(index / Math.max(stops.length - 1, 1));
      const color = normalizeHex(stop.color) || stop.color;
      if (!color) {
        return null;
      }
      return { offset, color };
    })
    .filter(Boolean)
    .sort((a, b) => a.offset - b.offset);
  if (normalized.length === 0) {
    return [
      { offset: 0, color: '#0f172a' },
      { offset: 1, color: '#020617' },
    ];
  }
  return normalized;
};

const createGradientTexture = (stops, options = {}) => {
  const {
    orientation = 'vertical',
    size = 2048,
    overlays = [],
  } = options;
  const normalizedStops = normalizeGradientStops(stops);
  const overlaysArray = Array.isArray(overlays) ? overlays : [];
  const overlayKey = overlaysArray
    .map((overlay) => {
      if (!overlay || typeof overlay !== 'object') return 'none';
      const type = overlay.type || 'unknown';
      const details = Object.keys(overlay)
        .filter((key) => key !== 'type')
        .sort()
        .map((key) => `${key}:${overlay[key]}`)
        .join(',');
      return `${type}(${details})`;
    })
    .join('|');
  const textureId = `route-gradient-${orientation}-${size}-${normalizedStops
    .map((stop) => `${stop.offset.toFixed(2)}-${stop.color}`)
    .join('_')}-${overlayKey}`;

  return createCanvasTexture(textureId, size, (ctx, canvasSize) => {
    const center = canvasSize / 2;
    let gradient;
    switch (orientation) {
      case 'horizontal':
        gradient = ctx.createLinearGradient(0, 0, canvasSize, 0);
        break;
      case 'diagonal':
        gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
        break;
      case 'radial':
        gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
        break;
      default:
        gradient = ctx.createLinearGradient(0, 0, 0, canvasSize);
        break;
    }

    normalizedStops.forEach((stop) => {
      gradient.addColorStop(stop.offset, stop.color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    overlaysArray.forEach((overlay) => {
      if (!overlay || typeof overlay !== 'object') return;
      if (overlay.type === 'radial-fade') {
        const innerRadius = clamp01(overlay.innerRadius ?? 0);
        const outerRadius = Math.max(innerRadius, clamp01(overlay.outerRadius ?? 1));
        const fadeGradient = ctx.createRadialGradient(
          center,
          center,
          innerRadius * center * 2,
          center,
          center,
          outerRadius * center * 2,
        );
        fadeGradient.addColorStop(0, overlay.from || 'rgba(255,255,255,0.18)');
        fadeGradient.addColorStop(1, overlay.to || 'rgba(2,6,23,0.95)');
        ctx.fillStyle = fadeGradient;
        const previousComposite = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = overlay.mode || 'source-over';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        ctx.globalCompositeOperation = previousComposite;
      } else if (overlay.type === 'noise') {
        const density = Math.max(0, overlay.density ?? 0.2);
        const alpha = clamp01(overlay.alpha ?? 0.08);
        const radius = Math.max(0.5, overlay.radius ?? 1.2);
        const rgb = hexToRgb(overlay.color) || { r: 148, g: 163, b: 184 };
        const particles = Math.floor(canvasSize * canvasSize * density * 0.0025);
        for (let i = 0; i < particles; i += 1) {
          const x = Math.random() * canvasSize;
          const y = Math.random() * canvasSize;
          const noiseRadius = Math.random() * radius + 0.4;
          const localAlpha = alpha * (0.4 + Math.random() * 0.6);
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${localAlpha})`;
          ctx.beginPath();
          ctx.arc(x, y, noiseRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  });
};

const createCoreTexture = (id) =>
  createCanvasTexture(id, 320, (ctx, size) => {
    const center = size / 2;
    const radius = center - 24;

    const baseGradient = ctx.createRadialGradient(
      center - radius * 0.28,
      center - radius * 0.32,
      radius * 0.15,
      center,
      center,
      radius,
    );
    baseGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    baseGradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.7)');
    baseGradient.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
    ctx.fillStyle = baseGradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    const shadowGradient = ctx.createRadialGradient(
      center,
      center + radius * 0.35,
      radius * 0.15,
      center,
      center,
      radius,
    );
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    const rimGradient = ctx.createLinearGradient(center, center - radius, center, center + radius);
    rimGradient.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    rimGradient.addColorStop(1, 'rgba(255, 255, 255, 0.28)');
    ctx.lineWidth = size * 0.02;
    ctx.strokeStyle = rimGradient;
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.82, 0, Math.PI * 2);
    ctx.stroke();
  });

const createGlossTexture = (id) =>
  createCanvasTexture(id, 320, (ctx, size) => {
    const center = size / 2;
    const radiusX = size * 0.42;
    const radiusY = size * 0.32;

    const highlightGradient = ctx.createRadialGradient(
      center - radiusX * 0.2,
      center - radiusY * 0.6,
      radiusX * 0.1,
      center,
      center,
      radiusX,
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    highlightGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.ellipse(center, center - radiusY * 0.2, radiusX, radiusY, -0.4, 0, Math.PI * 2);
    ctx.fill();

    const streakGradient = ctx.createLinearGradient(0, center, size, center);
    streakGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    streakGradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.18)');
    streakGradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.32)');
    streakGradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.08)');
    streakGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = streakGradient;
    ctx.beginPath();
    ctx.ellipse(center + radiusX * 0.05, center - radiusY * 0.3, radiusX * 0.9, radiusY * 0.55, -0.45, 0, Math.PI * 2);
    ctx.fill();
  });

const createFrameTexture = (id, options = {}) =>
  createCanvasTexture(id, 320, (ctx, size) => {
    const {
      rimWidth = options.rimWidth ?? 26,
      rimAlpha = options.rimAlpha ?? 0.88,
      innerAlpha = options.innerAlpha ?? 0.42,
      glow = options.glow ?? 0.25,
    } = options;
    const center = size / 2;
    const outerRadius = center - 12;
    const innerRadius = Math.max(outerRadius - rimWidth, 0);
    const ringThickness = outerRadius - innerRadius;

    if (glow > 0) {
      const gradient = ctx.createRadialGradient(center, center, innerRadius, center, center, outerRadius + ringThickness * 0.7);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(glow, 0.45)})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(center, center, outerRadius + ringThickness * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const rimGradient = ctx.createLinearGradient(center, center - outerRadius, center, center + outerRadius);
    rimGradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, rimAlpha + 0.1)})`);
    rimGradient.addColorStop(0.5, `rgba(255, 255, 255, ${Math.min(1, rimAlpha + 0.2)})`);
    rimGradient.addColorStop(1, `rgba(255, 255, 255, ${rimAlpha * 0.7})`);
    ctx.strokeStyle = rimGradient;
    ctx.lineWidth = ringThickness;
    ctx.beginPath();
    ctx.arc(center, center, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = Math.max(3, ringThickness * 0.32);
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, innerAlpha + 0.15)})`;
    ctx.beginPath();
    ctx.arc(center, center, innerRadius + ringThickness * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = Math.max(2, ringThickness * 0.22);
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, rimAlpha)})`;
    ctx.beginPath();
    ctx.arc(center, center, outerRadius - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();

    const innerShadow = ctx.createRadialGradient(center, center, innerRadius * 0.35, center, center, innerRadius);
    innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
    innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerShadow;
    ctx.beginPath();
    ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
    ctx.fill();
  });

const createHaloTexture = (id, { innerAlpha = 0.6, outerAlpha = 0 }) =>
  createCanvasTexture(id, 420, (ctx, size) => {
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, size * 0.08, center, center, center);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${innerAlpha})`);
    gradient.addColorStop(0.6, `rgba(255, 255, 255, ${(innerAlpha + outerAlpha) / 2})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, ${outerAlpha})`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, center - 4, 0, Math.PI * 2);
    ctx.fill();
  });

const createBadgeTexture = (id, drawSymbol) =>
  createCanvasTexture(id, 144, (ctx, size) => {
    const center = size / 2;
    const radius = center - 6;
    const bgGradient = ctx.createRadialGradient(center, center, radius * 0.2, center, center, radius);
    bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.18)');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = radius * 0.12;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    drawSymbol(ctx, center, radius, size);
  });

const drawLockSymbol = (ctx, center, radius, size) => {
  const shackleRadius = radius * 0.55;
  const bodyWidth = radius * 1.2;
  const bodyHeight = radius * 1.1;
  const bodyX = center - bodyWidth / 2;
  const bodyY = center - bodyHeight / 4;
  ctx.lineWidth = radius * 0.22;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.arc(center, bodyY, shackleRadius, Math.PI * 0.85, Math.PI * 0.15, false);
  ctx.stroke();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  drawRoundedRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, radius * 0.25);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  const keyholeWidth = radius * 0.24;
  const keyholeHeight = radius * 0.4;
  ctx.beginPath();
  ctx.arc(center, bodyY + bodyHeight * 0.48, keyholeWidth * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(center - keyholeWidth / 2, bodyY + bodyHeight * 0.48, keyholeWidth, keyholeHeight);
  ctx.fill();
};

const drawCheckSymbol = (ctx, center, radius) => {
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.lineWidth = radius * 0.28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(center - radius * 0.6, center);
  ctx.lineTo(center - radius * 0.1, center + radius * 0.45);
  ctx.lineTo(center + radius * 0.7, center - radius * 0.5);
  ctx.stroke();
};

const createLabelTexture = () =>
  createCanvasTexture('route-label', 360, (ctx, size) => {
    const padding = size * 0.14;
    const radius = size * 0.22;
    const height = size * 0.42;
    const width = size - padding * 2;
    const x = padding;
    const y = (size - height) / 2;
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();

    ctx.lineWidth = size * 0.015;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.stroke();
  });

const generateNodeTextures = () => ({
  frame: createFrameTexture('route-frame', { innerAlpha: 0.32, rimAlpha: 0.78, rimWidth: 26, glow: 0.2 }),
  frameActive: createFrameTexture('route-frame-active', {
    innerAlpha: 0.5,
    rimAlpha: 0.94,
    rimWidth: 28,
    glow: 0.32,
  }),
  frameBoss: createFrameTexture('route-frame-boss', {
    innerAlpha: 0.38,
    rimAlpha: 0.86,
    rimWidth: 30,
    glow: 0.26,
  }),
  frameBossActive: createFrameTexture('route-frame-boss-active', {
    innerAlpha: 0.56,
    rimAlpha: 0.98,
    rimWidth: 30,
    glow: 0.38,
  }),
  core: createCoreTexture('route-core'),
  gloss: createGlossTexture('route-gloss'),
  halo: createHaloTexture('route-halo', { innerAlpha: 0.52, outerAlpha: 0 }),
  haloBoss: createHaloTexture('route-halo-boss', { innerAlpha: 0.62, outerAlpha: 0.02 }),
  haloComplete: createHaloTexture('route-halo-complete', { innerAlpha: 0.72, outerAlpha: 0.08 }),
  lock: createBadgeTexture('route-lock', drawLockSymbol),
  check: createBadgeTexture('route-check', drawCheckSymbol),
  label: createLabelTexture(),
});

const ROUTE_MAP_FONT_CACHE_KEY = 'RouteMapLabel-bitmap';

const ensureRouteMapFont = (() => {
  let ensured = false;
  return () => {
    if (ensured) return;
    if (!Cache.has(ROUTE_MAP_FONT_CACHE_KEY)) {
      BitmapFont.install({
        name: 'RouteMapLabel',
        style: {
          fontFamily: 'Inter, sans-serif',
          fontSize: 32,
          fontWeight: '500',
          fill: '#e2e8f0',
          stroke: { color: '#020617', width: 6 },
          letterSpacing: 2,
        },
        chars: [[' ', '~']],
        resolution: 2,
      });
    }
    ensured = true;
  };
})();

const ensureNodeTextures = (() => {
  let promise;
  return async () => {
    if (!promise) {
      promise = Promise.resolve().then(() => generateNodeTextures());
    }
    return promise;
  };
})();

const attachHoverInteraction = ({ container, halo, frame, baseHaloScale, baseFrameAlpha, ticker }) => {
  if (!container || !halo || !frame || !ticker) {
    return () => {};
  }
  let targetScale = baseHaloScale;
  let targetAlpha = baseFrameAlpha;
  let active = false;

  const update = () => {
    const nextScale = halo.scale.x + (targetScale - halo.scale.x) * 0.18;
    const nextAlpha = frame.alpha + (targetAlpha - frame.alpha) * 0.18;
    halo.scale.set(nextScale);
    frame.alpha = nextAlpha;
    if (Math.abs(targetScale - nextScale) < 0.0005 && Math.abs(targetAlpha - nextAlpha) < 0.0005) {
      halo.scale.set(targetScale);
      frame.alpha = targetAlpha;
      ticker.remove(update);
      active = false;
    }
  };

  const start = (scale, alpha) => {
    targetScale = scale;
    targetAlpha = alpha;
    if (!active) {
      active = true;
      ticker.add(update);
    }
  };

  const handleOver = () => start(baseHaloScale * 1.06, Math.min(1, baseFrameAlpha + 0.18));
  const handleOut = () => start(baseHaloScale, baseFrameAlpha);

  container.on('pointerover', handleOver);
  container.on('pointerout', handleOut);

  return () => {
    container.off('pointerover', handleOver);
    container.off('pointerout', handleOut);
    ticker.remove(update);
    halo.scale.set(baseHaloScale);
    frame.alpha = baseFrameAlpha;
  };
};

const attachSelectionPulse = ({ container, texture, baseScale, ticker }) => {
  if (!container || !texture || !ticker) {
    return () => {};
  }
  const pulse = new Sprite(texture);
  pulse.anchor.set(0.5);
  pulse.alpha = 0.35;
  pulse.scale.set(baseScale * 1.1);
  container.addChildAt(pulse, 0);
  let elapsed = Math.random() * Math.PI * 2;

  const update = (delta) => {
    elapsed += delta * 0.05;
    const scale = baseScale * (1.04 + 0.03 * Math.sin(elapsed));
    const alpha = 0.3 + 0.08 * (Math.sin(elapsed + Math.PI / 3) + 1) * 0.5;
    pulse.scale.set(scale);
    pulse.alpha = alpha;
  };

  ticker.add(update);

  return () => {
    ticker.remove(update);
    if (pulse.parent) {
      pulse.parent.removeChild(pulse);
    }
    pulse.destroy();
  };
};

const DEFAULT_NODE = () =>
  applyAppearanceDefaults({
    id: nanoid(),
    name: 'Inicio',
    type: 'start',
    x: 0,
    y: 0,
    state: 'current',
  unlockMode: 'or',
  loot: '',
  event: '',
  notes: '',
  iconUrl: null,
});

const initialState = () => {
  const starter = DEFAULT_NODE();
  const snapshot = cloneState([starter], []);
  return {
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    history: [snapshot],
    historyIndex: 0,
  };
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': {
      const { nodes, edges } = action;
      const normalizedNodes = normalizeNodesCollection(nodes);
      const snapshot = cloneState(normalizedNodes, edges);
      return {
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        history: [snapshot],
        historyIndex: 0,
      };
    }
    case 'UPDATE': {
      const draftNodes = state.nodes.map((node) => ({ ...node }));
      const draftEdges = state.edges.map((edge) => ({ ...edge }));
      action.updater(draftNodes, draftEdges);
      const normalizedNodes = normalizeNodesCollection(draftNodes);
      if (action.skipHistory) {
        return {
          ...state,
          nodes: normalizedNodes,
          edges: draftEdges,
        };
      }
      const snapshot = cloneState(normalizedNodes, draftEdges);
      const trimmed = state.history.slice(0, state.historyIndex + 1);
      trimmed.push(snapshot);
      const limited = trimmed.length > 10 ? trimmed.slice(trimmed.length - 10) : trimmed;
      return {
        nodes: normalizedNodes,
        edges: snapshot.edges,
        history: limited,
        historyIndex: limited.length - 1,
      };
    }
    case 'PUSH_HISTORY': {
      const snapshot = cloneState(state.nodes, state.edges);
      const trimmed = state.history.slice(0, state.historyIndex + 1);
      trimmed.push(snapshot);
      const limited = trimmed.length > 10 ? trimmed.slice(trimmed.length - 10) : trimmed;
      return {
        ...state,
        history: limited,
        historyIndex: limited.length - 1,
      };
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) {
        return state;
      }
      const snapshot = state.history[state.historyIndex - 1];
      return {
        ...state,
        nodes: snapshot.nodes.map((node) => ({ ...node })),
        edges: snapshot.edges.map((edge) => ({ ...edge })),
        historyIndex: state.historyIndex - 1,
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) {
        return state;
      }
      const snapshot = state.history[state.historyIndex + 1];
      return {
        ...state,
        nodes: snapshot.nodes.map((node) => ({ ...node })),
        edges: snapshot.edges.map((edge) => ({ ...edge })),
        historyIndex: state.historyIndex + 1,
      };
    }
    default:
      return state;
  }
}

const pointerToWorld = (viewport, event) => {
  if (!viewport) return { x: 0, y: 0 };
  const global = event.data?.global ?? event.global;
  if (!global) return { x: 0, y: 0 };
  const point = viewport.toWorld(global.x, global.y);
  return point instanceof Point ? { x: point.x, y: point.y } : point;
};

const RouteMapBuilder = ({ onBack }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const viewportRef = useRef(null);
  const nodesContainerRef = useRef(null);
  const edgesContainerRef = useRef(null);
  const selectionGraphicsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dashTextureRef = useRef(null);
  const dashSpritesRef = useRef(new Set());
  const dashTickerRef = useRef(null);
  const shouldResumeDragRef = useRef(false);
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const initialCustomIcons = useMemo(() => {
    const routeMapIcons = readLocalCustomIcons();
    const minimapIcons = readMinimapLocalCustomIcons();
    return sanitizeCustomIcons([...(routeMapIcons || []), ...(minimapIcons || [])]);
  }, []);
  const [customIcons, setCustomIcons] = useState(initialCustomIcons);
  const [customIconsReady, setCustomIconsReady] = useState(false);
  const minimapCustomizationDocRef = useMemo(
    () => doc(db, 'minimapSettings', 'customization'),
    [db]
  );
  const routeMapCustomizationDocRef = useMemo(
    () => doc(db, 'routeMapSettings', 'customization'),
    [db]
  );
  const customizationSnapshotRef = useRef({
    minimap: null,
    routeMap: null,
  });
  const customIconSourcesRef = useRef({
    fallback: initialCustomIcons,
    minimap: null,
    routeMap: null,
  });
  const [activeTool, setActiveTool] = useState('select');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [dashTexture, setDashTexture] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([]);
  const [nodeTypeToCreate, setNodeTypeToCreate] = useState('normal');
  const [connectOriginId, setConnectOriginId] = useState(null);
  const [nodeEditor, setNodeEditor] = useState(null);
  const [edgeEditor, setEdgeEditor] = useState(null);
  const selectionStartRef = useRef(null);
  const dragStateRef = useRef(null);
  const copyBufferRef = useRef(null);
  const tickerRef = useRef(null);
  const nodeTexturesRef = useRef(null);
  const nodeCleanupRef = useRef([]);
  const [texturesReady, setTexturesReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const nodesMap = useMemo(() => {
    const map = new Map();
    state.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [state.nodes]);
  const selectedNodes = useMemo(
    () => selectedNodeIds.map((id) => nodesMap.get(id)).filter(Boolean),
    [nodesMap, selectedNodeIds],
  );
  const sanitizedCustomIcons = useMemo(
    () => sanitizeCustomIcons(customIcons),
    [customIcons]
  );
  const appearanceValues = useMemo(() => {
    if (selectedNodes.length === 0) {
      const defaults = getTypeDefaults('start');
      return {
        accentColor: defaults.accent,
        fillColor: defaults.fill,
        borderColor: defaults.border,
        iconColor: defaults.icon,
      };
    }
    const reference = selectedNodes[0];
    const defaults = getTypeDefaults(reference.type);
    return {
      accentColor: normalizeHex(reference.accentColor) || defaults.accent,
      fillColor: normalizeHex(reference.fillColor) || defaults.fill,
      borderColor: normalizeHex(reference.borderColor) || defaults.border,
      iconColor: normalizeHex(reference.iconColor) || defaults.icon,
    };
  }, [selectedNodes]);

  const mixedAppearance = useMemo(() => {
    if (selectedNodes.length <= 1) {
      return {
        accentColor: false,
        fillColor: false,
        borderColor: false,
        iconColor: false,
      };
    }
    const reference = selectedNodes[0];
    const compare = (key) =>
      selectedNodes.some((node) => normalizeHex(node[key]) !== normalizeHex(reference[key]));
    return {
      accentColor: compare('accentColor'),
      fillColor: compare('fillColor'),
      borderColor: compare('borderColor'),
      iconColor: compare('iconColor'),
    };
  }, [selectedNodes]);
  const customIconSelection = useMemo(() => {
    if (selectedNodes.length === 0) {
      return { url: null, hasAny: false, mixed: false };
    }
    const values = selectedNodes.map((node) => {
      const value = typeof node.iconUrl === 'string' ? node.iconUrl.trim() : '';
      return value || null;
    });
    const hasAny = values.some((value) => value !== null);
    const uniqueValues = Array.from(new Set(values));
    const singleValue = uniqueValues.length === 1 ? uniqueValues[0] : null;
    return {
      url: typeof singleValue === 'string' ? singleValue : null,
      hasAny,
      mixed: hasAny && uniqueValues.length > 1,
    };
  }, [selectedNodes]);
  const activeToolRef = useRef(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);
  const addNodeAtRef = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const hasSkippedInitialSaveRef = useRef(false);

  const ensureVisibleMessage = useCallback((text) => {
    setStatusMessage(text);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      setTimeout(() => setStatusMessage(''), 2200);
    });
  }, []);

  const pauseViewportDrag = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport?.plugins) return;
    viewport.plugins.pause('drag');
  }, []);

  const resumeViewportDrag = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport?.plugins) return;
    viewport.plugins.resume('drag');
  }, []);

  const saveToLocalStorage = useCallback((nodes, edges) => {
    try {
      const payload = JSON.stringify({ nodes, edges });
      window.localStorage.setItem('routeMapDraft', payload);
    } catch (error) {
      console.error('No se pudo guardar el mapa en localStorage', error);
    }
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const payload = window.localStorage.getItem('routeMapDraft');
      if (!payload) return;
      const parsed = JSON.parse(payload);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        dispatch({ type: 'LOAD', nodes: normalizeNodesCollection(parsed.nodes), edges: parsed.edges });
        ensureVisibleMessage('Mapa cargado desde el navegador');
      }
    } catch (error) {
      console.error('No se pudo cargar el mapa en localStorage', error);
    }
  }, [ensureVisibleMessage]);

  const exportToFile = useCallback(() => {
    const data = JSON.stringify({ nodes: state.nodes, edges: state.edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `route-map-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    ensureVisibleMessage('Mapa exportado como JSON');
  }, [state.nodes, state.edges, ensureVisibleMessage]);

  const importFromFile = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          dispatch({ type: 'LOAD', nodes: normalizeNodesCollection(parsed.nodes), edges: parsed.edges });
          ensureVisibleMessage('Mapa importado correctamente');
        }
      } catch (error) {
        console.error('Archivo inválido', error);
      }
    };
    reader.readAsText(file);
  }, [ensureVisibleMessage]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const addNodeAt = useCallback((point) => {
    const typeDef = NODE_TYPES.find((item) => item.id === nodeTypeToCreate) || NODE_TYPES[1];
    const palette = getTypeDefaults(typeDef.id);
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        const snappedX = snapToGrid ? Math.round(point.x / gridSize) * gridSize : point.x;
        const snappedY = snapToGrid ? Math.round(point.y / gridSize) * gridSize : point.y;
        nodes.push({
          id: nanoid(),
          name: `${typeDef.label} ${nodes.length + 1}`,
          type: typeDef.id,
          x: snappedX,
          y: snappedY,
          state: typeDef.id === 'start' ? 'current' : 'locked',
          unlockMode: 'or',
          loot: '',
          event: '',
          notes: '',
          accentColor: palette.accent,
          fillColor: palette.fill,
          borderColor: palette.border,
          iconColor: palette.icon,
          iconUrl: null,
        });
      },
    });
  }, [gridSize, nodeTypeToCreate, snapToGrid]);
  useEffect(() => {
    addNodeAtRef.current = addNodeAt;
  }, [addNodeAt]);

  const applyDragDelta = useCallback(
    (dragState, delta, snap) => {
      if (!dragState || !delta) return;
      const { startPositions } = dragState;
      dispatch({
        type: 'UPDATE',
        skipHistory: true,
        updater: (nodes) => {
          nodes.forEach((node) => {
            const start = startPositions.get(node.id);
            if (!start) return;
            let nextX = start.x + delta.x;
            let nextY = start.y + delta.y;
            if (snap && snapToGrid) {
              nextX = Math.round(nextX / gridSize) * gridSize;
              nextY = Math.round(nextY / gridSize) * gridSize;
            }
            node.x = nextX;
            node.y = nextY;
          });
        },
      });
    },
    [gridSize, snapToGrid],
  );

  const deleteSelection = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes, edges) => {
        const nodeSet = new Set(selectedNodeIds);
        const edgeSet = new Set(selectedEdgeIds);
        for (let i = edges.length - 1; i >= 0; i -= 1) {
          if (edgeSet.has(edges[i].id) || nodeSet.has(edges[i].from) || nodeSet.has(edges[i].to)) {
            edges.splice(i, 1);
          }
        }
        for (let i = nodes.length - 1; i >= 0; i -= 1) {
          if (nodeSet.has(nodes[i].id)) {
            nodes.splice(i, 1);
          }
        }
      },
    });
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [selectedNodeIds, selectedEdgeIds]);

  const toggleNodeLock = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        nodes.forEach((node) => {
          if (selectedNodeIds.includes(node.id)) {
            node.state = node.state === 'locked' ? 'unlocked' : 'locked';
          }
        });
      },
    });
  }, [selectedNodeIds]);

  const handleAppearanceChange = useCallback(
    (key, value) => {
      if (selectedNodeIds.length === 0) return;
      const normalized = normalizeHex(value);
      if (!normalized) return;
      dispatch({
        type: 'UPDATE',
        updater: (nodes) => {
          nodes.forEach((node) => {
            if (selectedNodeIds.includes(node.id)) {
              node[key] = normalized;
            }
          });
        },
      });
    },
    [selectedNodeIds],
  );

  const handleResetAppearance = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        nodes.forEach((node) => {
          if (!selectedNodeIds.includes(node.id)) return;
          const defaults = getTypeDefaults(node.type);
          node.accentColor = defaults.accent;
          node.fillColor = defaults.fill;
          node.borderColor = defaults.border;
          node.iconColor = defaults.icon;
        });
      },
    });
  }, [selectedNodeIds]);

  const applyCustomIconToSelection = useCallback(
    (iconUrl) => {
      if (selectedNodeIds.length === 0) return;
      const normalized = typeof iconUrl === 'string' ? iconUrl.trim() : '';
      dispatch({
        type: 'UPDATE',
        updater: (nodes) => {
          nodes.forEach((node) => {
            if (!selectedNodeIds.includes(node.id)) return;
            node.iconUrl = normalized || null;
          });
        },
      });
    },
    [dispatch, selectedNodeIds]
  );

  const handleCustomIconUpload = useCallback(async (file) => {
    if (!file) return;
    try {
      const { url } = await getOrUploadFile(file, 'RouteMapIcons');
      if (url) {
        setCustomIcons((prev) => sanitizeCustomIcons([...(prev || []), url]));
      }
    } catch (error) {
      console.warn('[RouteMapBuilder] Error subiendo icono personalizado, usando fallback', error);
      const reader = new FileReader();
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onerror = () => reject(reader.error);
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        if (typeof dataUrl === 'string' && dataUrl) {
          setCustomIcons((prev) => sanitizeCustomIcons([...(prev || []), dataUrl]));
        }
      } catch (readerError) {
        console.error('[RouteMapBuilder] No se pudo leer el icono personalizado', readerError);
      }
    }
  }, []);

  const handleRemoveCustomIcon = useCallback(
    (index) => {
      let removed = null;
      setCustomIcons((prev) => {
        if (!Array.isArray(prev) || index < 0 || index >= prev.length) {
          return prev;
        }
        removed = typeof prev[index] === 'string' ? prev[index].trim() : null;
        const next = prev.filter((_, i) => i !== index);
        return sanitizeCustomIcons(next);
      });
      if (removed) {
        dispatch({
          type: 'UPDATE',
          skipHistory: true,
          updater: (nodes) => {
            nodes.forEach((node) => {
              if (typeof node.iconUrl === 'string' && node.iconUrl.trim() === removed) {
                node.iconUrl = null;
              }
            });
          },
        });
      }
    },
    [dispatch]
  );

  const applyAutoLayout = useCallback(() => {
    const edgesByTarget = new Map();
    state.edges.forEach((edge) => {
      if (!nodesMap.has(edge.from) || !nodesMap.has(edge.to)) return;
      const list = edgesByTarget.get(edge.to) || [];
      list.push(edge);
      edgesByTarget.set(edge.to, list);
    });
    const levelMap = new Map();
    const computeLevel = (nodeId, stack = new Set()) => {
      if (levelMap.has(nodeId)) return levelMap.get(nodeId);
      if (stack.has(nodeId)) return 0;
      stack.add(nodeId);
      const incoming = edgesByTarget.get(nodeId) || [];
      if (incoming.length === 0) {
        levelMap.set(nodeId, 0);
        stack.delete(nodeId);
        return 0;
      }
      const parentLevels = incoming.map((edge) => computeLevel(edge.from, stack));
      const maxLevel = parentLevels.length ? Math.max(...parentLevels) : 0;
      const level = maxLevel + 1;
      levelMap.set(nodeId, level);
      stack.delete(nodeId);
      return level;
    };
    state.nodes.forEach((node) => {
      computeLevel(node.id);
    });
    const columns = new Map();
    levelMap.forEach((level, nodeId) => {
      const bucket = columns.get(level) || [];
      bucket.push(nodesMap.get(nodeId));
      columns.set(level, bucket);
    });
    const sorted = Array.from(columns.keys()).sort((a, b) => a - b);
    const targets = new Map();
    sorted.forEach((level) => {
      const bucket = columns.get(level) || [];
      bucket.forEach((node, index) => {
        if (!node) return;
        targets.set(node.id, {
          x: level * 220,
          y: index * 160,
        });
      });
    });
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        nodes.forEach((node) => {
          const target = targets.get(node.id);
          if (target) {
            node.x = target.x;
            node.y = target.y;
          }
        });
      },
    });
    ensureVisibleMessage('Auto-layout aplicado');
  }, [state.nodes, state.edges, nodesMap, ensureVisibleMessage]);

  const duplicateSelection = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes, edges) => {
        const nodeIdMap = new Map();
        selectedNodeIds.forEach((id) => {
          const original = nodes.find((node) => node.id === id);
          if (!original) return;
          const cloneId = nanoid();
          nodeIdMap.set(id, cloneId);
          nodes.push({
            ...original,
            id: cloneId,
            name: `${original.name} (copia)`,
            x: original.x + 40,
            y: original.y + 40,
          });
        });
        state.edges.forEach((edge) => {
          if (nodeIdMap.has(edge.from) && nodeIdMap.has(edge.to)) {
            edges.push({
              ...edge,
              id: nanoid(),
              from: nodeIdMap.get(edge.from),
              to: nodeIdMap.get(edge.to),
            });
          }
        });
      },
    });
  }, [selectedNodeIds, state.edges]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete') {
        deleteSelection();
      }
      if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleUndo();
      }
      if (event.key === 'y' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleRedo();
      }
      if (event.key === 'c' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        copyBufferRef.current = {
          nodes: state.nodes.filter((node) => selectedNodeIds.includes(node.id)).map((node) => ({ ...node })),
          edges: state.edges.filter((edge) => selectedEdgeIds.includes(edge.id)).map((edge) => ({ ...edge })),
        };
        ensureVisibleMessage('Copiado');
      }
      if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        const buffer = copyBufferRef.current;
        if (!buffer) return;
        dispatch({
          type: 'UPDATE',
          updater: (nodes, edges) => {
            const idMap = new Map();
            buffer.nodes.forEach((node) => {
              const newId = nanoid();
              idMap.set(node.id, newId);
              nodes.push({
                ...node,
                id: newId,
                name: `${node.name} (copia)`,
                x: node.x + 32,
                y: node.y + 32,
              });
            });
            buffer.edges.forEach((edge) => {
              const from = idMap.get(edge.from);
              const to = idMap.get(edge.to);
              if (from && to) {
                edges.push({ ...edge, id: nanoid(), from, to });
              }
            });
          },
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection, handleRedo, handleUndo, ensureVisibleMessage, selectedNodeIds, selectedEdgeIds, state.nodes, state.edges]);

  useEffect(() => {
    if (!hasSkippedInitialSaveRef.current) {
      hasSkippedInitialSaveRef.current = true;
      return;
    }
    saveToLocalStorage(state.nodes, state.edges);
  }, [state.nodes, state.edges, saveToLocalStorage]);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    let isUnmounted = false;
    customIconSourcesRef.current.fallback = sanitizeCustomIcons(initialCustomIcons);

    const ensureCombinedIcons = () => {
      const { fallback, minimap, routeMap } = customIconSourcesRef.current;
      const combined = sanitizeCustomIcons([
        ...(Array.isArray(fallback) ? fallback : []),
        ...(Array.isArray(routeMap) ? routeMap : []),
        ...(Array.isArray(minimap) ? minimap : []),
      ]);
      if (isUnmounted) {
        return combined;
      }
      setCustomIcons((prev) => {
        const prevStr = JSON.stringify(sanitizeCustomIcons(prev));
        const combinedStr = JSON.stringify(combined);
        if (prevStr === combinedStr) {
          return prev;
        }
        return combined;
      });
      setCustomIconsReady(true);
      return combined;
    };

    const unsubscribes = [];

    try {
      const unsubscribeMinimap = onSnapshot(
        minimapCustomizationDocRef,
        (snapshot) => {
          if (isUnmounted) return;
          let icons = [];
          if (snapshot.exists()) {
            const data = snapshot.data() || {};
            icons = sanitizeCustomIcons(data.customIcons);
          }
          customIconSourcesRef.current.minimap = icons;
          customizationSnapshotRef.current = {
            ...(customizationSnapshotRef.current || {}),
            minimap: JSON.stringify(icons),
          };
          const combined = ensureCombinedIcons();
          if (!snapshot.exists() && combined.length > 0) {
            setDoc(
              minimapCustomizationDocRef,
              {
                customIcons: combined,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).catch((error) => {
              console.error(
                '[RouteMapBuilder] No se pudo inicializar la configuración compartida de iconos',
                error
              );
            });
          }
        },
        (error) => {
          if (!isUnmounted) {
            console.error('[RouteMapBuilder] Error al obtener iconos del minimapa', error);
            setCustomIconsReady(true);
          }
        }
      );
      unsubscribes.push(unsubscribeMinimap);
    } catch (error) {
      console.error('[RouteMapBuilder] Error al suscribirse a los iconos del minimapa', error);
      setCustomIconsReady(true);
    }

    try {
      const unsubscribeRouteMap = onSnapshot(
        routeMapCustomizationDocRef,
        (snapshot) => {
          if (isUnmounted) return;
          let icons = [];
          if (snapshot.exists()) {
            const data = snapshot.data() || {};
            icons = sanitizeCustomIcons(data.customIcons);
          }
          customIconSourcesRef.current.routeMap = icons;
          customizationSnapshotRef.current = {
            ...(customizationSnapshotRef.current || {}),
            routeMap: JSON.stringify(icons),
          };
          ensureCombinedIcons();
        },
        (error) => {
          if (!isUnmounted) {
            console.error(
              '[RouteMapBuilder] Error al obtener iconos personalizados del mapa de rutas',
              error
            );
            setCustomIconsReady(true);
          }
        }
      );
      unsubscribes.push(unsubscribeRouteMap);
    } catch (error) {
      console.error(
        '[RouteMapBuilder] Error al suscribirse a los iconos personalizados del mapa de rutas',
        error
      );
      setCustomIconsReady(true);
    }

    ensureCombinedIcons();

    return () => {
      isUnmounted = true;
      unsubscribes.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch {}
      });
    };
  }, [initialCustomIcons, minimapCustomizationDocRef, routeMapCustomizationDocRef]);

  useEffect(() => {
    if (!customIconsReady || typeof window === 'undefined') {
      return;
    }
    const sanitized = sanitizeCustomIcons(customIcons);
    try {
      window.localStorage.setItem(
        ROUTE_MAP_CUSTOM_ICONS_KEY,
        JSON.stringify(sanitized)
      );
    } catch {}
    try {
      window.localStorage.setItem(
        MINIMAP_CUSTOM_ICONS_KEY,
        JSON.stringify(sanitized)
      );
    } catch {}
  }, [customIcons, customIconsReady]);

  useEffect(() => {
    if (!customIconsReady) {
      return;
    }
    const sanitized = sanitizeCustomIcons(customIcons);
    const iconsStr = JSON.stringify(sanitized);
    const lastSnapshots = customizationSnapshotRef.current || {};
    const writes = [];
    if (iconsStr !== lastSnapshots.minimap) {
      writes.push(
        setDoc(
          minimapCustomizationDocRef,
          {
            customIcons: sanitized,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((error) => {
          console.error(
            '[RouteMapBuilder] No se pudieron guardar los iconos personalizados del minimapa',
            error
          );
        })
      );
    }
    if (iconsStr !== lastSnapshots.routeMap) {
      writes.push(
        setDoc(
          routeMapCustomizationDocRef,
          {
            customIcons: sanitized,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((error) => {
          console.error(
            '[RouteMapBuilder] No se pudieron guardar los iconos personalizados del mapa de rutas',
            error
          );
        })
      );
    }
    if (writes.length > 0) {
      Promise.all(writes).catch(() => {});
    }
  }, [
    customIcons,
    customIconsReady,
    minimapCustomizationDocRef,
    routeMapCustomizationDocRef,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    ensureRouteMapFont();
    setTexturesReady(false);
    let destroyed = false;
    const initPixi = async () => {
      let textures = null;
      try {
        textures = await ensureNodeTextures();
      } catch (error) {
        console.error('[RouteMapBuilder] No se pudieron cargar las texturas de nodos', error);
      }
      if (destroyed) {
        return;
      }
      if (!textures) {
        textures = Object.fromEntries(NODE_TEXTURE_KEYS.map((key) => [key, Texture.WHITE]));
      }
      const options = {
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: containerRef.current,
      };

      let app;
      if (typeof Application.prototype?.init === 'function') {
        app = new Application();
        await app.init(options);
      } else {
        app = new Application(options);
      }
      if (destroyed) {
        app.destroy(true);
        return;
      }
      const canvas = app.canvas ?? app.view;
      if (canvas) {
        containerRef.current.appendChild(canvas);
      }
      const viewport = new Viewport({
        ticker: app.ticker,
        events: app.renderer.events,
        passiveWheel: false,
      });
      viewport.drag({ pressDrag: true });
      viewport.wheel({ smooth: 3 });
      viewport.pinch();
      viewport.clampZoom({ minScale: 0.2, maxScale: 3 });
      viewport.sortableChildren = true;
      app.stage.addChild(viewport);
      const dashTicker = (delta) => {
        dashSpritesRef.current.forEach((sprite) => {
          if (!sprite || sprite.destroyed) return;
          sprite.tilePosition.x -= delta * EDGE_DASH_SPEED;
        });
      };
      app.ticker.add(dashTicker);
      dashTickerRef.current = dashTicker;
      const edgesLayer = new Container();
      edgesLayer.eventMode = 'none';
      const nodesLayer = new Container();
      nodesLayer.eventMode = 'static';

      const selectionGraphics = new Graphics();

      viewport.addChild(edgesLayer);
      viewport.addChild(nodesLayer);
      viewport.addChild(selectionGraphics);
      viewportRef.current = viewport;
      appRef.current = app;
      tickerRef.current = app.ticker;
      nodeTexturesRef.current = textures;
      setTexturesReady(true);
      nodesContainerRef.current = nodesLayer;
      edgesContainerRef.current = edgesLayer;
      selectionGraphicsRef.current = selectionGraphics;
      if (dashTextureRef.current) {
        setDashTexture(dashTextureRef.current);
      } else {
        const generatedTexture = createDashTexture(app.renderer);
        if (generatedTexture) {
          dashTextureRef.current = generatedTexture;
          setDashTexture(generatedTexture);
        }
      }
      viewport.eventMode = 'static';

      viewport.on('pointerdown', (event) => {
        const tool = activeToolRef.current;
        if (event.target?.nodeId || event.target?.edgeId) return;
        const button = event.data?.originalEvent?.button;
        const isLeftButton = button === undefined || button === 0;
        if (!isLeftButton) {
          shouldResumeDragRef.current = false;
          return;
        }
        shouldResumeDragRef.current = true;
        pauseViewportDrag();
        if (tool === 'create') {
          const point = pointerToWorld(viewport, event);
          addNodeAtRef.current?.(point);
          return;
        }
        if (tool === 'select') {
          const start = pointerToWorld(viewport, event);
          selectionStartRef.current = start;
          if (selectionGraphicsRef.current) {
            const g = selectionGraphicsRef.current;
            g.clear();
            g.lineStyle(2, 0x38bdf8, 0.8);
            g.beginFill(0x38bdf8, 0.1);
            g.drawRect(start.x, start.y, 1, 1);
            g.endFill();
          }
        }
      });
      viewport.on('pointermove', (event) => {
        if (!selectionStartRef.current) return;
        const current = pointerToWorld(viewport, event);
        const rect = {
          x: Math.min(selectionStartRef.current.x, current.x),
          y: Math.min(selectionStartRef.current.y, current.y),
          width: Math.abs(current.x - selectionStartRef.current.x),
          height: Math.abs(current.y - selectionStartRef.current.y),
        };
        if (selectionGraphicsRef.current) {
          const g = selectionGraphicsRef.current;
          g.clear();
          g.lineStyle(2, 0x38bdf8, 0.8);
          g.beginFill(0x38bdf8, 0.1);
          g.drawRect(rect.x, rect.y, rect.width, rect.height);
          g.endFill();
        }
      });
      const finishSelection = (event) => {
        if (shouldResumeDragRef.current) {
          shouldResumeDragRef.current = false;
          resumeViewportDrag();
        }
        if (!selectionStartRef.current) return;
        const current = pointerToWorld(viewport, event);
        const rect = {
          x: Math.min(selectionStartRef.current.x, current.x),
          y: Math.min(selectionStartRef.current.y, current.y),
          width: Math.abs(current.x - selectionStartRef.current.x),
          height: Math.abs(current.y - selectionStartRef.current.y),
        };
        selectionStartRef.current = null;
        if (selectionGraphicsRef.current) {
          selectionGraphicsRef.current.clear();
        }
        const currentState = stateRef.current;
        const selected = currentState.nodes
          .filter(
            (node) =>
              node.x >= rect.x &&
              node.x <= rect.x + rect.width &&
              node.y >= rect.y &&
              node.y <= rect.y + rect.height,
          )
          .map((node) => node.id);
        setSelectedNodeIds(selected);
        setSelectedEdgeIds([]);
      };
      viewport.on('pointerup', finishSelection);
      viewport.on('pointerupoutside', finishSelection);
    };
    initPixi();
    return () => {
      destroyed = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      dashSpritesRef.current.clear();
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.removeAllListeners();
        viewport.destroy({ children: true });
      }
      const app = appRef.current;
      if (app) {
        if (dashTickerRef.current) {
          app.ticker?.remove(dashTickerRef.current);
        }
        const canvas = app.canvas ?? app.view;
        if (canvas?.parentNode === containerRef.current) {
          canvas.parentNode.removeChild(canvas);
        }
        app.stage?.removeChildren();
        app.destroy(true, { children: false });
      }
      if (dashTextureRef.current) {
        dashTextureRef.current.destroy(true);
        dashTextureRef.current = null;
      }
      dashTickerRef.current = null;
      viewportRef.current = null;
      appRef.current = null;
      tickerRef.current = null;
      nodeTexturesRef.current = null;
      nodesContainerRef.current = null;
      edgesContainerRef.current = null;
      selectionGraphicsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewportRef.current || !nodesContainerRef.current || !edgesContainerRef.current) return;
    const viewport = viewportRef.current;
    const edgesLayer = edgesContainerRef.current;
    const nodesLayer = nodesContainerRef.current;
    dashSpritesRef.current.clear();
    edgesLayer.removeChildren();
    nodesLayer.removeChildren();

    const commitDrag = () => {
      if (!dragStateRef.current) return;
      if (dragStateRef.current.moved && !dragStateRef.current.committed) {
        applyDragDelta(dragStateRef.current, dragStateRef.current.lastDelta, true);
        dispatch({ type: 'PUSH_HISTORY' });
        dragStateRef.current.committed = true;
      }
    };

    const endDrag = () => {
      commitDrag();
      dragStateRef.current = null;
      if (shouldResumeDragRef.current) {
        shouldResumeDragRef.current = false;
        resumeViewportDrag();
      }
    };

    const handleViewportDragMove = (event) => {
      if (!dragStateRef.current || activeTool !== 'select') return;
      const buttons = event.data?.originalEvent?.buttons ?? 0;
      if (buttons === 0) {
        endDrag();
        return;
      }
      const world = pointerToWorld(viewport, event);
      if (!world) return;
      const delta = {
        x: world.x - dragStateRef.current.startPointer.x,
        y: world.y - dragStateRef.current.startPointer.y,
      };
      dragStateRef.current.lastDelta = delta;
      applyDragDelta(dragStateRef.current, delta, true);
      dragStateRef.current.moved = true;
    };

    const handleViewportDragEnd = () => {
      if (!dragStateRef.current) return;
      endDrag();
    };

    viewport.on('pointermove', handleViewportDragMove);
    viewport.on('pointerup', handleViewportDragEnd);
    viewport.on('pointerupoutside', handleViewportDragEnd);

    if (showGrid) {
      const grid = new Graphics();
      grid.lineStyle(1, 0x1e293b, 0.4);
      const size = gridSize;
      const extent = 4000;
      for (let x = -extent; x <= extent; x += size) {
        grid.moveTo(x, -extent);
        grid.lineTo(x, extent);
      }
      for (let y = -extent; y <= extent; y += size) {
        grid.moveTo(-extent, y);
        grid.lineTo(extent, y);
      }
      edgesLayer.addChild(grid);
    }

    state.edges.forEach((edge) => {
      const from = nodesMap.get(edge.from);
      const to = nodesMap.get(edge.to);
      if (!from || !to) return;
      const control = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - Math.abs(from.x - to.x) * 0.2,
      };
      const selected = selectedEdgeIds.includes(edge.id);
      const color = selected ? 0xfbbf24 : 0x5f6b8d;
      const strokeWidth = selected ? EDGE_STROKE_WIDTH_SELECTED : EDGE_STROKE_WIDTH;
      const edgeContainer = new Container();
      edgeContainer.sortableChildren = true;
      const segmentsContainer = new Container();
      segmentsContainer.eventMode = 'none';
      segmentsContainer.interactiveChildren = false;
      segmentsContainer.zIndex = 0;
      edgeContainer.addChild(segmentsContainer);
      const segments = createQuadraticSegments(from, control, to);
      segments.forEach((segment) => {
        const segmentContainer = new Container();
        segmentContainer.position.set(segment.midpoint.x, segment.midpoint.y);
        segmentContainer.rotation = segment.angle;
        segmentContainer.eventMode = 'none';
        segmentContainer.interactiveChildren = false;
        const tilingSprite = new TilingSprite({
          texture: dashTexture ?? Texture.WHITE,
          width: segment.length + strokeWidth,
          height: strokeWidth,
        });
        tilingSprite.anchor.set(0.5);
        tilingSprite.tint = color;
        tilingSprite.alpha = selected ? 1 : 0.92;
        tilingSprite.eventMode = 'none';
        if (dashTexture) {
          const yScale = strokeWidth / DASH_TEXTURE_HEIGHT;
          tilingSprite.tileScale.set(1, yScale);
          dashSpritesRef.current.add(tilingSprite);
        }
        segmentContainer.addChild(tilingSprite);
        segmentsContainer.addChild(segmentContainer);
      });
      edgeContainer.edgeId = edge.id;
      edgeContainer.eventMode = 'static';
      edgeContainer.cursor = 'pointer';
      edgeContainer.hitArea = {
        contains: (x, y) => {
          const minX = Math.min(from.x, to.x, control.x) - 24;
          const maxX = Math.max(from.x, to.x, control.x) + 24;
          const minY = Math.min(from.y, to.y, control.y) - 24;
          const maxY = Math.max(from.y, to.y, control.y) + 24;
          return x >= minX && x <= maxX && y >= minY && y <= maxY;
        },
      };
      edgeContainer.on('pointertap', (event) => {
        event.stopPropagation();
        if (event.detail >= 2) {
          setEdgeEditor(edge);
          return;
        }
        setSelectedEdgeIds([edge.id]);
        setSelectedNodeIds([]);
        if (activeTool === 'delete') {
          dispatch({
            type: 'UPDATE',
            updater: (nodes, edgesDraft) => {
              const index = edgesDraft.findIndex((item) => item.id === edge.id);
              if (index >= 0) {
                edgesDraft.splice(index, 1);
              }
            },
          });
        }
      });
      edgesLayer.addChild(edgeContainer);

      const arrow = new Graphics();
      const arrowSize = selected ? 18 : 16;
      const dx = to.x - control.x;
      const dy = to.y - control.y;
      const angle = Math.atan2(dy, dx);
      arrow.beginFill(color, 0.9);
      arrow.moveTo(0, 0);
      arrow.lineTo(-arrowSize, arrowSize / 2);
      arrow.lineTo(-arrowSize, -arrowSize / 2);
      arrow.lineTo(0, 0);
      arrow.endFill();
      arrow.position.set(to.x, to.y);
      arrow.rotation = angle;
      arrow.zIndex = 1;
      arrow.eventMode = 'none';
      edgeContainer.addChild(arrow);

      if (edge.label) {
        const labelText = new Text({
          text: edge.label,
          style: {
            fill: selected ? '#fbbf24' : '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            letterSpacing: 1,
          },
        });
        labelText.anchor.set(0.5);
        const labelContainer = new Container();
        const paddingX = 12;
        const paddingY = 6;
        const background = new Graphics();
        const width = labelText.width + paddingX * 2;
        const height = labelText.height + paddingY * 2;
        background.beginFill(0x0b1220, 0.85);
        background.lineStyle(1, color, 0.6);
        background.drawRoundedRect(-width / 2, -height / 2, width, height, height / 2);
        background.endFill();
        labelContainer.addChild(background);
        labelContainer.addChild(labelText);
        labelText.position.set(0, 0);
        labelContainer.position.set((from.x + to.x) / 2, (from.y + to.y) / 2 - 20);
        labelContainer.zIndex = 2;
        labelContainer.eventMode = 'static';
        labelContainer.cursor = 'text';
        labelContainer.on('pointertap', (event) => {
          event.stopPropagation();
          if (event.detail >= 2) {
            setEdgeEditor(edge);
          } else {
            setSelectedEdgeIds([edge.id]);
            setSelectedNodeIds([]);
          }
        });
        edgeContainer.addChild(labelContainer);
      }
    });

    const textures = nodeTexturesRef.current;
    const ticker = tickerRef.current;
    const nodeCleanups = [];

    if (textures && texturesReady) {
      state.nodes.forEach((node) => {
        const nodeContainer = new Container();
        const typeDef = NODE_TYPES.find((item) => item.id === node.type) || NODE_TYPES[1];
        const stateDef = NODE_STATES[node.state] || NODE_STATES.locked;
        const selected = selectedNodeIds.includes(node.id);
        const palette = getTypeDefaults(typeDef.id);
        const accentHex = normalizeHex(node.accentColor) || palette.accent;
        const borderHex = normalizeHex(node.borderColor) || palette.border;
        const fillHex = normalizeHex(node.fillColor) || palette.fill;
        const iconHex = normalizeHex(node.iconColor) || palette.icon;
        const stateStroke = hexToInt(normalizeHex(stateDef.stroke) || '#38bdf8');
        const accentColor = hexToInt(accentHex);
        const radius = 36;
        const isBoss = node.type === 'boss';
        const isLocked = node.state === 'locked';
        const isCompleted = node.state === 'completed';
        const isVisited = node.state === 'current' || node.state === 'unlocked' || node.state === 'completed';
        const baseFrameKey = isBoss ? 'frameBoss' : 'frame';
        const activeFrameKey = isBoss ? 'frameBossActive' : 'frameActive';
        const frameTexture = textures[isVisited ? activeFrameKey : baseFrameKey] || Texture.WHITE;
        const haloTexture = textures[isBoss ? 'haloBoss' : 'halo'] || Texture.WHITE;
        const coreTexture = textures.core || Texture.WHITE;
        const glossTexture = textures.gloss || Texture.WHITE;

        if (isCompleted && textures.haloComplete) {
          const completionAura = new Sprite(textures.haloComplete);
          completionAura.anchor.set(0.5);
          completionAura.alpha = 0.7;
          const completionScale = isBoss ? 0.52 : 0.5;
          completionAura.scale.set(completionScale);
          completionAura.tint = hexToInt(lightenHex(accentHex, 0.1));
          nodeContainer.addChild(completionAura);
        }

        const baseHaloScale = isBoss ? 0.46 : 0.42;
        const currentBoost = node.state === 'current' ? 1.05 : 1;
        const haloBaseScale = baseHaloScale * currentBoost;
        const haloSprite = new Sprite(haloTexture);
        haloSprite.anchor.set(0.5);
        haloSprite.scale.set(haloBaseScale);
        haloSprite.alpha = isLocked ? 0.42 : 0.82;
        haloSprite.tint = hexToInt(lightenHex(accentHex, 0.15));
        nodeContainer.addChild(haloSprite);

        const coreSprite = new Sprite(coreTexture);
        coreSprite.anchor.set(0.5);
        const coreSize = radius * 2 - 6;
        const coreScale = coreSprite.texture?.width ? coreSize / coreSprite.texture.width : coreSize / 320;
        coreSprite.scale.set(coreScale);
        const unlockedDarkenMix = 0.45;
        const lockedExtraDarken = 0.25;
        const coreMixAmount = isLocked
          ? Math.min(1, unlockedDarkenMix + lockedExtraDarken)
          : unlockedDarkenMix;
        const coreTintHex = mixHex(fillHex, '#000000', coreMixAmount);
        coreSprite.tint = hexToInt(coreTintHex);
        coreSprite.alpha = isLocked ? 0.85 : 1;
        nodeContainer.addChild(coreSprite);

        const frameSprite = new Sprite(frameTexture);
        frameSprite.anchor.set(0.5);
        const frameSize = radius * 2 + (isBoss ? 30 : 24);
        const frameScale = frameSprite.texture?.width ? frameSize / frameSprite.texture.width : frameSize / 320;
        frameSprite.scale.set(frameScale);
        const frameBaseAlpha = selected ? 1 : isLocked ? 0.7 : 0.92;
        frameSprite.alpha = frameBaseAlpha;
        const baseFrameTint = isLocked ? mixHex(borderHex, '#1f2937', 0.55) : borderHex;
        const frameTintHex = selected ? lightenHex(baseFrameTint, 0.18) : baseFrameTint;
        frameSprite.tint = hexToInt(frameTintHex);
        nodeContainer.addChild(frameSprite);

        const iconSprite = new Sprite(Texture.WHITE);
        iconSprite.anchor.set(0);
        iconSprite.position.set(0, 0);
        iconSprite.alpha = 0;
        nodeContainer.addChild(iconSprite);
        const customIconUrl = typeof node.iconUrl === 'string' ? node.iconUrl.trim() : '';
        const applyIconTexture = (texture, alpha = 1, options = {}) => {
          if (!texture || iconSprite.destroyed) return;
          const { skipFallback = false } = options;
          const iconDiameter = Math.max(coreSize - 12, 0);
          const { width: baseWidth, height: baseHeight } = getTextureDimensions(texture);
          if (
            texture.destroyed ||
            texture?.baseTexture?.destroyed ||
            baseWidth <= 0 ||
            baseHeight <= 0
          ) {
            if (!skipFallback) {
              applyFallbackEmoji();
            }
            return;
          }
          iconSprite.texture = texture;
          iconSprite.anchor.set(0.5);
          iconSprite.position.set(0, 0);
          iconSprite.tint = 0xffffff;
          iconSprite.alpha = alpha;
          const baseMaxDimension = Math.max(baseWidth, baseHeight) || 1;
          const uniformScale = iconDiameter / baseMaxDimension;
          iconSprite.scale.set(uniformScale);
          iconSprite.position.set(0, 0);
        };
        const applyFallbackEmoji = () => {
          const iconSymbol = NODE_ICON_EMOJIS[typeDef.id] || NODE_ICON_EMOJIS.normal;
          const iconColorValue = isLocked ? mixHex(iconHex, '#94a3b8', 0.6) : iconHex;
          const iconTextureResult = getEmojiTexture(iconSymbol, iconColorValue);
          const targetAlpha = isLocked ? 0.78 : 1;
          if (iconTextureResult instanceof Texture) {
            applyIconTexture(iconTextureResult, targetAlpha, { skipFallback: true });
          } else if (iconTextureResult && typeof iconTextureResult.then === 'function') {
            iconTextureResult
              .then((texture) => {
                if (!iconSprite.destroyed) {
                  applyIconTexture(texture, targetAlpha, { skipFallback: true });
                }
              })
              .catch((error) => {
                console.warn('[RouteMapBuilder] Error al cargar el icono de nodo', error);
              });
          }
        };
        if (customIconUrl) {
          const customTextureResult = getCustomIconTexture(customIconUrl);
          const targetAlpha = isLocked ? 0.75 : 1;
          if (customTextureResult instanceof Texture) {
            applyIconTexture(customTextureResult, targetAlpha);
          } else if (customTextureResult && typeof customTextureResult.then === 'function') {
            customTextureResult
              .then((texture) => {
                if (!iconSprite.destroyed) {
                  applyIconTexture(texture, targetAlpha);
                }
              })
              .catch((error) => {
                console.warn('[RouteMapBuilder] Error al cargar el icono personalizado', error);
                if (!iconSprite.destroyed) {
                  applyFallbackEmoji();
                }
              });
          } else {
            applyFallbackEmoji();
          }
        } else {
          applyFallbackEmoji();
        }

        if (isLocked) {
          const lockSprite = new Sprite(textures.lock || Texture.WHITE);
          lockSprite.anchor.set(0.5);
          const lockScale = lockSprite.texture?.width ? 26 / lockSprite.texture.width : 0.22;
          lockSprite.scale.set(lockScale);
          lockSprite.alpha = 0.92;
          nodeContainer.addChild(lockSprite);
        }

        if (isCompleted) {
          const checkSprite = new Sprite(textures.check || Texture.WHITE);
          checkSprite.anchor.set(0.5);
          const checkScale = checkSprite.texture?.width ? 28 / checkSprite.texture.width : 0.22;
          checkSprite.scale.set(checkScale);
          checkSprite.alpha = 0.95;
          checkSprite.position.set(radius - 12, -radius + 12);
          nodeContainer.addChild(checkSprite);
        }

        const hoverCleanup = attachHoverInteraction({
          container: nodeContainer,
          halo: haloSprite,
          frame: frameSprite,
          baseHaloScale: haloBaseScale,
          baseFrameAlpha: frameBaseAlpha,
          ticker,
        });
        if (hoverCleanup) {
          nodeCleanups.push(hoverCleanup);
        }
        if (selected) {
          const pulseCleanup = attachSelectionPulse({
            container: nodeContainer,
            texture: haloTexture,
            baseScale: haloBaseScale,
            ticker,
          });
          if (pulseCleanup) {
            nodeCleanups.push(pulseCleanup);
          }
        }

        nodeContainer.position.set(node.x, node.y);
        nodeContainer.nodeId = node.id;
        nodeContainer.eventMode = 'static';
        nodeContainer.cursor = activeTool === 'connect' ? 'crosshair' : 'pointer';
        nodeContainer.on('pointerdown', (event) => {
          event.stopPropagation();
          const button = event.data?.originalEvent?.button;
          const isLeftButton = button === undefined || button === 0;
          if (!isLeftButton) {
            shouldResumeDragRef.current = false;
            return;
          }
          shouldResumeDragRef.current = true;
          pauseViewportDrag();
          if (activeTool === 'delete') {
            setSelectedNodeIds([node.id]);
            deleteSelection();
            return;
          }
          if (activeTool === 'toggleLock') {
            setSelectedNodeIds([node.id]);
            toggleNodeLock();
            return;
          }
          if (activeTool === 'connect') {
            if (!connectOriginId) {
              setConnectOriginId(node.id);
              setSelectedNodeIds([node.id]);
            } else if (connectOriginId !== node.id) {
              dispatch({
                type: 'UPDATE',
                updater: (nodes, edges) => {
                  edges.push({
                    id: nanoid(),
                    from: connectOriginId,
                    to: node.id,
                    label: '',
                    requirement: 'OR',
                  });
                },
              });
              setConnectOriginId(null);
              setSelectedNodeIds([node.id]);
            }
            return;
          }
          if (activeTool !== 'select') {
            return;
          }
          const shift = event.data?.originalEvent?.shiftKey;
          const alreadySelected = selectedNodeIds.includes(node.id);
          let nextSelection = selectedNodeIds;
          if (shift) {
            if (!alreadySelected) {
              nextSelection = [...selectedNodeIds, node.id];
            }
          } else if (!alreadySelected) {
            nextSelection = [node.id];
          }
          if (nextSelection !== selectedNodeIds) {
            setSelectedNodeIds(nextSelection);
          }
          setSelectedEdgeIds([]);
          const dragIds = nextSelection.includes(node.id) ? [...new Set(nextSelection)] : [node.id];
          const pointerStart = pointerToWorld(viewport, event);
          const startPositions = new Map();
          dragIds.forEach((id) => {
            const target = nodesMap.get(id);
            if (target) {
              startPositions.set(id, { x: target.x, y: target.y });
            }
          });
          if (startPositions.size === 0) {
            dragStateRef.current = null;
            if (shouldResumeDragRef.current) {
              shouldResumeDragRef.current = false;
              resumeViewportDrag();
            }
            return;
          }
          dragStateRef.current = {
            nodeIds: [...startPositions.keys()],
            startPointer: pointerStart,
            startPositions,
            lastDelta: { x: 0, y: 0 },
            moved: false,
            committed: false,
          };
        });
        nodeContainer.on('pointerup', (event) => {
          event.stopPropagation();
          handleViewportDragEnd();
        });
        nodeContainer.on('pointerupoutside', () => {
          handleViewportDragEnd();
        });
        nodeContainer.on('pointertap', (event) => {
          if (event.detail >= 2) {
            setNodeEditor(applyAppearanceDefaults(node));
          }
        });
        nodesLayer.addChild(nodeContainer);

        if (node.name && node.name.trim()) {
          const labelText = new BitmapText({
            text: node.name,
            style: {
              fontName: 'RouteMapLabel',
              fontSize: 30,
              align: 'center',
              tint: selected ? 0xffffff : isLocked ? 0xdbeafe : 0xe2e8f0,
            },
          });
          const labelContainer = new Container();
          const labelBgTexture = textures.label || Texture.WHITE;
          const labelBackground = new Sprite(labelBgTexture);
          labelBackground.anchor.set(0.5);
          const paddingX = 28;
          const paddingY = 16;
          const textWidth = Math.max(labelText.textWidth, 1);
          const textHeight = Math.max(labelText.textHeight, 1);
          const scaleX = Math.max(0.35, (textWidth + paddingX) / (labelBgTexture.width || 400));
          const scaleY = Math.max(0.4, (textHeight + paddingY) / (labelBgTexture.height || 140));
          labelBackground.scale.set(scaleX, scaleY);
          labelBackground.alpha = 0.9;
          labelBackground.tint = selected ? accentColor : stateStroke;
          labelContainer.addChild(labelBackground);
          labelText.pivot.set(labelText.textWidth / 2, labelText.textHeight / 2);
          labelText.position.set(0, 0);
          labelContainer.addChild(labelText);
          labelContainer.position.set(node.x, node.y + radius + 30);
          labelContainer.eventMode = 'static';
          labelContainer.cursor = 'text';
          labelContainer.on('pointertap', (event) => {
            event.stopPropagation();
            if (event.detail >= 2) {
              setNodeEditor(applyAppearanceDefaults(node));
            } else {
              setSelectedNodeIds([node.id]);
            }
          });
          nodesLayer.addChild(labelContainer);
        }
      });
    }

    nodeCleanupRef.current = nodeCleanups;
    return () => {
      nodeCleanups.forEach((fn) => fn());
      viewport.off('pointermove', handleViewportDragMove);
      viewport.off('pointerup', handleViewportDragEnd);
      viewport.off('pointerupoutside', handleViewportDragEnd);
    };
  }, [
    state.nodes,
    state.edges,
    nodesMap,
    selectedNodeIds,
    selectedEdgeIds,
    showGrid,
    gridSize,
    connectOriginId,
    activeTool,
    deleteSelection,
    toggleNodeLock,
    applyDragDelta,
    pauseViewportDrag,
    resumeViewportDrag,
    dashTexture,
  ]);

  const handleBackgroundInput = useCallback((event) => {
    setBackgroundImage(event.target.value);
  }, []);

  const handleNodeEditorSave = useCallback(() => {
    if (!nodeEditor) return;
    const sanitizedEditor = applyAppearanceDefaults(nodeEditor);
    dispatch({
      type: 'UPDATE',
      updater: (nodes) => {
        const target = nodes.find((item) => item.id === nodeEditor.id);
        if (target) {
          Object.assign(target, sanitizedEditor);
        }
      },
    });
    setNodeEditor(null);
  }, [nodeEditor]);

  const handleEdgeEditorSave = useCallback(() => {
    if (!edgeEditor) return;
    dispatch({
      type: 'UPDATE',
      updater: (nodes, edges) => {
        const target = edges.find((item) => item.id === edgeEditor.id);
        if (target) {
          Object.assign(target, edgeEditor);
        }
      },
    });
    setEdgeEditor(null);
  }, [edgeEditor]);

  const currentTool = useMemo(
    () => TOOLBAR_ACTIONS.find((item) => item.id === activeTool),
    [activeTool],
  );

  return (
    <div className="w-full h-screen flex bg-[#050b18] text-slate-100">
      <div className="w-80 border-r border-slate-900/70 bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-xl flex flex-col shadow-[inset_-1px_0_0_rgba(56,189,248,0.25)]">
        <div className="p-6 border-b border-slate-900/60 bg-slate-950/60">
          <h2 className="text-xl font-semibold tracking-wide text-sky-200">Mapa de rutas</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Diseña recorridos roguelike enlazando nodos, tiendas y jefes con el pulido de un tablero arcano.
          </p>
          <Boton
            className="mt-4 w-full border border-sky-500/40 bg-none bg-slate-900/70 text-slate-200 hover:border-sky-400/70 hover:bg-slate-900"
            onClick={onBack}
            icon={<ArrowLeft className="h-4 w-4" aria-hidden />}
          >
            Volver al menú
          </Boton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Herramientas</h3>
            <div className="mt-3 space-y-2">
              {TOOLBAR_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(action.id);
                    setConnectOriginId(null);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    activeTool === action.id
                      ? 'border-sky-400/80 bg-sky-500/15 text-sky-200 shadow-[0_0_22px_rgba(56,189,248,0.35)]'
                      : 'border-slate-800/80 bg-slate-900/80 hover:border-slate-600/70 hover:bg-slate-800/70'
                  }`}
                >
                  <action.icon className="h-4 w-4" aria-hidden />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Creación</h3>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-slate-400">Tipo de nodo</span>
              <select
                value={nodeTypeToCreate}
                onChange={(event) => setNodeTypeToCreate(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 focus:border-sky-500 focus:outline-none"
              >
                {NODE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label} · {type.iconLabel}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Acciones rápidas</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Boton
                onClick={handleUndo}
                className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<Undo2 className="h-4 w-4" aria-hidden />}
              >
                Deshacer
              </Boton>
              <Boton
                onClick={handleRedo}
                className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<Redo2 className="h-4 w-4" aria-hidden />}
              >
                Rehacer
              </Boton>
              <Boton
                onClick={duplicateSelection}
                className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<Copy className="h-4 w-4" aria-hidden />}
              >
                Duplicar
              </Boton>
              <Boton
                onClick={deleteSelection}
                className="bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<Trash2 className="h-4 w-4" aria-hidden />}
              >
                Suprimir
              </Boton>
              <Boton
                onClick={toggleNodeLock}
                className="col-span-2 bg-none bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/70"
                icon={<LockKeyhole className="h-4 w-4" aria-hidden />}
              >
                Bloquear / Desbloquear
              </Boton>
            </div>
          </section>
          {selectedNodes.length > 0 && (
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Apariencia</h3>
                <span className="text-[11px] text-slate-500">
                  {selectedNodes.length > 1 ? `${selectedNodes.length} nodos` : 'Nodo seleccionado'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ajusta el color del núcleo, los bordes y el icono para personalizar la ruta.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Fondo</span>
                  <input
                    type="color"
                    value={appearanceValues.fillColor}
                    onChange={(event) => handleAppearanceChange('fillColor', event.target.value)}
                    className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
                  />
                  {mixedAppearance.fillColor && (
                    <span className="text-[10px] text-amber-300">Valores mixtos</span>
                  )}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Destello</span>
                  <input
                    type="color"
                    value={appearanceValues.accentColor}
                    onChange={(event) => handleAppearanceChange('accentColor', event.target.value)}
                    className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
                  />
                  {mixedAppearance.accentColor && (
                    <span className="text-[10px] text-amber-300">Valores mixtos</span>
                  )}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Borde</span>
                  <input
                    type="color"
                    value={appearanceValues.borderColor}
                    onChange={(event) => handleAppearanceChange('borderColor', event.target.value)}
                    className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
                  />
                  {mixedAppearance.borderColor && (
                    <span className="text-[10px] text-amber-300">Valores mixtos</span>
                  )}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Icono</span>
                  <input
                    type="color"
                    value={appearanceValues.iconColor}
                    onChange={(event) => handleAppearanceChange('iconColor', event.target.value)}
                    className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
                  />
                  {mixedAppearance.iconColor && (
                    <span className="text-[10px] text-amber-300">Valores mixtos</span>
                  )}
                </label>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-800/60 bg-slate-900/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Iconos personalizados
                  </h4>
                  <div className="flex items-center gap-2">
                    {customIconSelection.hasAny && (
                      <button
                        type="button"
                        onClick={() => applyCustomIconToSelection(null)}
                        className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-300 hover:text-sky-200"
                      >
                        Icono por defecto
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Elige una imagen para reemplazar el emoji de los nodos seleccionados. Los iconos se comparten con todo el grupo.
                </p>
                {customIconSelection.mixed && (
                  <p className="text-[10px] text-amber-300">
                    La selección contiene múltiples iconos personalizados.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {sanitizedCustomIcons.length > 0 ? (
                    sanitizedCustomIcons.map((url, index) => (
                      <IconThumb
                        key={`route-custom-icon-${index}`}
                        src={url}
                        label={`Icono personalizado ${index + 1}`}
                        selected={customIconSelection.url === url}
                        onClick={() => applyCustomIconToSelection(url)}
                        onDelete={() => handleRemoveCustomIcon(index)}
                      />
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Aún no hay iconos personalizados disponibles.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    Subir icono
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleCustomIconUpload(file);
                        event.target.value = '';
                      }
                    }}
                    className="block w-full cursor-pointer rounded border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200 transition file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:uppercase file:text-slate-100 hover:file:bg-slate-700"
                  />
                </div>
              </div>
              <Boton
                onClick={handleResetAppearance}
                className="w-full border border-slate-700/70 bg-slate-900/80 text-xs hover:border-slate-500/60 hover:bg-slate-800/80"
              >
                Restablecer colores por tipo
              </Boton>
            </section>
          )}
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3 text-sm">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Grid & Layout</h3>
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(event) => setSnapToGrid(event.target.checked)}
                  className="accent-sky-500"
                />
                <span>Snap a grid</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(event) => setShowGrid(event.target.checked)}
                  className="accent-sky-500"
                />
                <span>Mostrar grid</span>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Tamaño de grid</span>
              <select
                value={gridSize}
                onChange={(event) => setGridSize(Number(event.target.value))}
                className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 focus:border-sky-500 focus:outline-none"
              >
                {GRID_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </label>
            <Boton
              onClick={applyAutoLayout}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
              icon={<Compass className="h-4 w-4" aria-hidden />}
            >
              Auto-layout
            </Boton>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3 text-sm">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Guardar</h3>
            <Boton
              onClick={() => saveToLocalStorage(state.nodes, state.edges)}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
              icon={<Save className="h-4 w-4" aria-hidden />}
            >
              Guardar en navegador
            </Boton>
            <Boton
              onClick={exportToFile}
              className="w-full border border-slate-700/70 bg-none bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-800/80"
              icon={<FileDown className="h-4 w-4" aria-hidden />}
            >
              Exportar JSON
            </Boton>
            <label className="block w-full text-xs text-slate-400">
              Importar JSON
              <input
                type="file"
                accept="application/json"
                onChange={importFromFile}
                className="mt-1 w-full text-xs"
              />
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-3 text-sm">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Fondo</h3>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Color</span>
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setBackgroundColor(event.target.value)}
                className="h-10 w-full rounded border border-slate-800/70 bg-slate-900/80"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-slate-400">Imagen (URL)</span>
              <Input
                value={backgroundImage}
                onChange={handleBackgroundInput}
                placeholder="https://..."
                className="bg-slate-900/80"
              />
            </label>
          </section>
          <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-lg shadow-sky-900/20 space-y-2 text-sm">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Estados</h3>
            <div className="space-y-1 text-xs">
              {Object.entries(NODE_STATES).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: value.stroke }}
                  />
                  <span className="capitalize text-slate-300">{value.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 16%, rgba(148, 163, 184, 0.15), transparent 52%), ' +
              'radial-gradient(circle at 88% 8%, rgba(56, 189, 248, 0.12), transparent 58%), ' +
              'radial-gradient(circle at 50% 92%, rgba(14, 165, 233, 0.1), transparent 54%)',
            mixBlendMode: backgroundImage ? 'soft-light' : 'screen',
            opacity: backgroundImage ? 0.55 : 0.7,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 120%, rgba(2, 6, 23, 0.55), transparent 70%), ' +
              'radial-gradient(circle at 50% -20%, rgba(15, 23, 42, 0.35), transparent 58%)',
            mixBlendMode: 'multiply',
            opacity: 0.55,
          }}
        />
        <div className="absolute left-6 top-6 z-20 flex items-center gap-3 rounded-full border border-sky-500/40 bg-slate-900/80 px-6 py-2.5 text-sm shadow-lg shadow-sky-900/40 backdrop-blur">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Herramienta</span>
          <span className="font-medium text-sky-200 flex items-center gap-2">
            {currentTool ? (
              <>
                <currentTool.icon className="h-4 w-4" aria-hidden />
                {currentTool.label}
              </>
            ) : (
              'Selecciona una herramienta'
            )}
          </span>
          {connectOriginId && activeTool === 'connect' && (
            <span className="text-xs text-amber-300">Selecciona nodo destino…</span>
          )}
        </div>
        {statusMessage && (
          <div className="absolute right-6 top-6 z-20 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-5 py-2 text-sm text-emerald-200 shadow-lg shadow-emerald-900/30 backdrop-blur">
            {statusMessage}
          </div>
        )}
        <div ref={containerRef} className="relative z-10 h-full w-full" />
      </div>
      {(nodeEditor || edgeEditor) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6">
            {nodeEditor && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Editar nodo</h3>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Nombre</span>
                  <Input
                    value={nodeEditor.name}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, name: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Tipo</span>
                  <select
                    value={nodeEditor.type}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      const defaults = getTypeDefaults(nextType);
                      setNodeEditor({
                        ...nodeEditor,
                        type: nextType,
                        accentColor: defaults.accent,
                        fillColor: defaults.fill,
                        borderColor: defaults.border,
                        iconColor: defaults.icon,
                      });
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  >
                    {NODE_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label} · {type.iconLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-sm">
                    <span>X</span>
                    <Input
                      type="number"
                      value={Math.round(nodeEditor.x)}
                      onChange={(event) => setNodeEditor({ ...nodeEditor, x: Number(event.target.value) })}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Y</span>
                    <Input
                      type="number"
                      value={Math.round(nodeEditor.y)}
                      onChange={(event) => setNodeEditor({ ...nodeEditor, y: Number(event.target.value) })}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Color de fondo</span>
                    <input
                      type="color"
                      value={nodeEditor.fillColor}
                      onChange={(event) => setNodeEditor({ ...nodeEditor, fillColor: event.target.value })}
                      className="h-10 w-full rounded border border-slate-700 bg-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Destello</span>
                    <input
                      type="color"
                      value={nodeEditor.accentColor}
                      onChange={(event) => setNodeEditor({ ...nodeEditor, accentColor: event.target.value })}
                      className="h-10 w-full rounded border border-slate-700 bg-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Borde</span>
                    <input
                      type="color"
                      value={nodeEditor.borderColor}
                      onChange={(event) => setNodeEditor({ ...nodeEditor, borderColor: event.target.value })}
                      className="h-10 w-full rounded border border-slate-700 bg-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Color del icono</span>
                    <input
                      type="color"
                      value={nodeEditor.iconColor}
                      onChange={(event) => setNodeEditor({ ...nodeEditor, iconColor: event.target.value })}
                      className="h-10 w-full rounded border border-slate-700 bg-slate-800"
                    />
                  </label>
                </div>
                <Boton
                  className="w-full border border-slate-700 bg-slate-800 hover:bg-slate-700"
                  onClick={() => {
                    const defaults = getTypeDefaults(nodeEditor.type);
                    setNodeEditor({
                      ...nodeEditor,
                      accentColor: defaults.accent,
                      fillColor: defaults.fill,
                      borderColor: defaults.border,
                      iconColor: defaults.icon,
                    });
                  }}
                >
                  Restablecer colores por defecto
                </Boton>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Estado</span>
                  <select
                    value={nodeEditor.state}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, state: event.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  >
                    {Object.entries(NODE_STATES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Regla de desbloqueo</span>
                  <select
                    value={nodeEditor.unlockMode}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, unlockMode: event.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  >
                    <option value="or">Cualquiera (OR)</option>
                    <option value="and">Todos (AND)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Loot / Recompensa</span>
                  <textarea
                    value={nodeEditor.loot}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, loot: event.target.value })}
                    className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Evento asociado</span>
                  <textarea
                    value={nodeEditor.event}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, event: event.target.value })}
                    className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Notas</span>
                  <textarea
                    value={nodeEditor.notes}
                    onChange={(event) => setNodeEditor({ ...nodeEditor, notes: event.target.value })}
                    className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <Boton className="bg-slate-800 hover:bg-slate-700" onClick={() => setNodeEditor(null)}>
                    Cancelar
                  </Boton>
                  <Boton className="bg-sky-600 hover:bg-sky-500" onClick={handleNodeEditorSave}>
                    Guardar
                  </Boton>
                </div>
              </div>
            )}
            {edgeEditor && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Editar conexión</h3>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Etiqueta / Regla</span>
                  <Input
                    value={edgeEditor.label || ''}
                    onChange={(event) => setEdgeEditor({ ...edgeEditor, label: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Requisito</span>
                  <textarea
                    value={edgeEditor.requirement || ''}
                    onChange={(event) => setEdgeEditor({ ...edgeEditor, requirement: event.target.value })}
                    className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <Boton className="bg-slate-800 hover:bg-slate-700" onClick={() => setEdgeEditor(null)}>
                    Cancelar
                  </Boton>
                  <Boton className="bg-sky-600 hover:bg-sky-500" onClick={handleEdgeEditorSave}>
                    Guardar
                  </Boton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

RouteMapBuilder.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default RouteMapBuilder;

