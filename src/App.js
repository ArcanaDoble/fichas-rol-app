// src/App.js
import React, { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import fetchSheetData from './utils/fetchSheetData';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { BsDice6 } from 'react-icons/bs';
import { GiFist, GiCrossedSwords, GiShield, GiSpellBook } from 'react-icons/gi';
import { FaFire, FaBolt, FaSnowflake, FaRadiationAlt } from 'react-icons/fa';
import {
  FiMap,
  FiTool,
  FiArrowLeft,
  FiPlus,
  FiX,
  FiSearch,
  FiFilter,
  FiXCircle,
  FiChevronDown,
  FiImage,
  FiStar,
  FiEdit2,
  FiEye,
  FiTrash2,
  FiCrop,
  FiCheck,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import Boton from './components/Boton';
import Input from './components/Input';
import Tarjeta from './components/Tarjeta';
import ResourceBar from './components/ResourceBar';
import AtributoCard, { DADOS } from './components/AtributoCard';
import Collapsible from './components/Collapsible';
import EstadoSelector from './components/EstadoSelector';
import Inventory from './components/inventory/Inventory';
import MasterMenu from './components/MasterMenu';
import CustomItemManager from './components/inventory/CustomItemManager';
import { ToastProvider } from './components/Toast';
import DiceCalculator from './components/DiceCalculator';
import BarraReflejos from './components/BarraReflejos';
import InitiativeTracker from './components/InitiativeTracker';
import MapCanvas from './components/MapCanvas';
import EnemyViewModal from './components/EnemyViewModal';
import AssetSidebar from './components/AssetSidebar';
import ChatPanel from './components/ChatPanel';
import sanitize from './utils/sanitize';
import PageSelector from './components/PageSelector';
const MinimapBuilder = React.lazy(() => import('./components/MinimapBuilder'));
import { nanoid } from 'nanoid';
import { saveTokenSheet, ensureSheetDefaults, mergeTokens } from './utils/token';
import useConfirm from './hooks/useConfirm';
import useResourcesHook from './hooks/useResources';
import useGlossary from './hooks/useGlossary';
import { uploadDataUrl, getOrUploadFile, releaseFile } from './utils/storage';
import { deepEqual } from './utils/deepEqual';
import Cropper from 'react-easy-crop';

const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);
// Compara dos páginas ignorando el campo updatedAt
function pageDataEqual(a, b) {
  if (!a || !b) return false;
  const omit = (obj) => {
    if (!obj) return obj;
    const { updatedAt, ...rest } = obj;
    return rest;
  };
  return deepEqual(omit(a), omit(b));
}
const MASTER_PASSWORD = '0904';

const atributos = ['destreza', 'vigor', 'intelecto', 'voluntad'];
const atributoColor = {
  destreza: '#34d399',
  vigor: '#f87171',
  intelecto: '#60a5fa',
  voluntad: '#a78bfa',
};
const defaultRecursos = ['postura', 'vida', 'ingenio', 'cordura', 'armadura'];
const recursoColor = {
  postura: '#34d399',
  vida: '#f87171',
  ingenio: '#60a5fa',
  cordura: '#a78bfa',
  armadura: '#9ca3af',
};
const recursoInfo = {
  postura: 'Explicación de Postura',
  vida: 'Explicación de Vida',
  ingenio: 'Explicación de Ingenio',
  cordura: 'Explicación de Cordura',
  armadura: 'Explicación de Armadura',
};

const defaultStats = defaultRecursos.reduce((acc, r) => {
  acc[r] = { base: 0, buff: 0, total: 0, actual: 0 };
  return acc;
}, {});

const defaultResourcesList = defaultRecursos.map((name) => ({
  id: name,
  name,
  color: recursoColor[name] || '#ffffff',
  info: recursoInfo[name] || '',
}));

const RESOURCE_MAX = 20;
const CLAVE_MAX = 10;
const dadoImgUrl = (dado) => `/dados/${dado}.png`;

const createImageElement = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });

const cropImageToDataUrl = async (
  imageSrc,
  cropPixels,
  maxWidth = 900,
  maxHeight = 900,
  quality = 0.88
) => {
  if (!cropPixels) return imageSrc;
  const image = await createImageElement(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { width, height, x, y } = cropPixels;
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);

  canvas.width = Math.max(1, Math.floor(safeWidth * scale));
  canvas.height = Math.max(1, Math.floor(safeHeight * scale));

  ctx.drawImage(
    image,
    x,
    y,
    safeWidth,
    safeHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL('image/jpeg', quality);
};

const dataUrlToFile = async (dataUrl, filename = 'portrait.jpg') => {
  if (!dataUrl) return null;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : 'jpg';
  const safeName = filename.includes('.') ? filename : `${filename}.${extension}`;
  return new File([blob], safeName, { type: blob.type || 'image/jpeg' });
};

const DEFAULT_ENEMY_THEME_COLOR = '#facc15';
const DEFAULT_ENEMY_TAGS = ['Criatura', 'Enemigo'];
const DEFAULT_ENEMY_THEME = {
  base: DEFAULT_ENEMY_THEME_COLOR,
  accent: '#fbbf24',
  accentSoft: '#fde68a',
  accentStrong: '#b45309',
  accentGlow: '#fef08a',
  complementary: '#7c3aed',
  backgroundGradient:
    'radial-gradient(circle at 12% 20%, rgba(250, 204, 21, 0.18), transparent 55%), radial-gradient(circle at 88% 16%, rgba(99, 102, 241, 0.22), transparent 60%), linear-gradient(140deg, rgba(26, 20, 12, 0.95) 0%, rgba(12, 10, 28, 0.92) 55%, rgba(15, 23, 42, 0.94) 100%)',
  frameBorder: 'rgba(250, 204, 21, 0.25)',
  innerBorder: 'rgba(148, 163, 184, 0.18)',
  textPrimary: '#fefce8',
  textSecondary: 'rgba(252, 211, 77, 0.78)',
  typeText: 'rgba(250, 204, 21, 0.82)',
  rarityColor: 'rgba(252, 211, 77, 0.72)',
  levelBorder: 'rgba(250, 204, 21, 0.5)',
  levelBackground:
    'radial-gradient(circle at 30% 30%, rgba(250, 204, 21, 0.45), rgba(56, 41, 86, 0.85))',
  statPalette: [
    {
      bg: 'rgba(250, 204, 21, 0.12)',
      border: 'rgba(250, 204, 21, 0.38)',
      text: '#fefce8',
    },
    {
      bg: 'rgba(168, 85, 247, 0.16)',
      border: 'rgba(192, 132, 252, 0.42)',
      text: '#f5f3ff',
    },
    {
      bg: 'rgba(56, 189, 248, 0.16)',
      border: 'rgba(56, 189, 248, 0.4)',
      text: '#e0f2fe',
    },
    {
      bg: 'rgba(249, 115, 22, 0.16)',
      border: 'rgba(251, 146, 60, 0.4)',
      text: '#fff7ed',
    },
  ],
  tagBackground: 'rgba(30, 41, 59, 0.65)',
  tagBorder: 'rgba(250, 204, 21, 0.35)',
  tagText: 'rgba(248, 250, 252, 0.85)',
  descriptionColor: 'rgba(226, 232, 240, 0.9)',
  xpBadge: {
    bg: 'rgba(250, 204, 21, 0.18)',
    border: 'rgba(250, 204, 21, 0.45)',
    text: '#fefce8',
  },
  oroBadge: {
    bg: 'rgba(168, 85, 247, 0.2)',
    border: 'rgba(192, 132, 252, 0.45)',
    text: '#f3e8ff',
  },
  cardShadow: '0 18px 36px rgba(8, 7, 21, 0.55)',
  button: {
    edit: {
      from: 'rgba(250, 204, 21, 0.24)',
      via: 'rgba(168, 85, 247, 0.24)',
      to: 'rgba(15, 23, 42, 0.78)',
      hoverFrom: 'rgba(250, 204, 21, 0.32)',
      hoverVia: 'rgba(168, 85, 247, 0.32)',
      hoverTo: 'rgba(15, 23, 42, 0.88)',
      border: 'rgba(250, 204, 21, 0.45)',
      hoverBorder: 'rgba(250, 204, 21, 0.65)',
      glow: 'rgba(250, 204, 21, 0.22)',
      iconGlow: 'rgba(250, 204, 21, 0.5)',
    },
    delete: {
      from: 'rgba(248, 113, 113, 0.3)',
      via: 'rgba(225, 29, 72, 0.32)',
      to: 'rgba(15, 23, 42, 0.85)',
      hoverFrom: 'rgba(248, 113, 113, 0.38)',
      hoverVia: 'rgba(225, 29, 72, 0.4)',
      hoverTo: 'rgba(15, 23, 42, 0.92)',
      border: 'rgba(248, 113, 113, 0.55)',
      hoverBorder: 'rgba(248, 113, 113, 0.75)',
      glow: 'rgba(248, 113, 113, 0.24)',
      iconGlow: 'rgba(248, 113, 113, 0.5)',
    },
    view: {
      from: 'rgba(56, 189, 248, 0.24)',
      via: 'rgba(99, 102, 241, 0.26)',
      to: 'rgba(15, 23, 42, 0.82)',
      hoverFrom: 'rgba(56, 189, 248, 0.32)',
      hoverVia: 'rgba(99, 102, 241, 0.34)',
      hoverTo: 'rgba(15, 23, 42, 0.9)',
      border: 'rgba(59, 130, 246, 0.5)',
      hoverBorder: 'rgba(59, 130, 246, 0.7)',
      glow: 'rgba(56, 189, 248, 0.24)',
      iconGlow: 'rgba(56, 189, 248, 0.5)',
    },
  },
  buttonText: '#fefce8',
  buttonHoverText: '#fefce8',
  buttonBaseText: '#fefce8',
  buttonFontShadow: '0 0 10px rgba(250, 204, 21, 0.45)',
};

const cloneDefaultEnemyTheme = () => ({
  ...DEFAULT_ENEMY_THEME,
  statPalette: DEFAULT_ENEMY_THEME.statPalette.map((palette) => ({
    ...palette,
  })),
  xpBadge: { ...DEFAULT_ENEMY_THEME.xpBadge },
  oroBadge: { ...DEFAULT_ENEMY_THEME.oroBadge },
  button: {
    edit: { ...DEFAULT_ENEMY_THEME.button.edit },
    delete: { ...DEFAULT_ENEMY_THEME.button.delete },
    view: { ...DEFAULT_ENEMY_THEME.button.view },
  },
});
const ENEMY_THEME_PRESETS = [
  '#facc15',
  '#fb7185',
  '#60a5fa',
  '#a855f7',
  '#34d399',
  '#f97316',
  '#14b8a6',
  '#f472b6',
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const expandHex = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  const normalized = hex.trim().toLowerCase();
  if (/^#([0-9a-f]{6})$/.test(normalized)) return normalized;
  if (/^#([0-9a-f]{3})$/.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  return null;
};

const normalizeHexColor = (value, fallback = DEFAULT_ENEMY_THEME_COLOR) =>
  expandHex(value) || expandHex(fallback) || DEFAULT_ENEMY_THEME_COLOR;

const hexToRgb = (hex) => {
  const normalized = expandHex(hex);
  if (!normalized) return { r: 0, g: 0, b: 0 };
  const int = parseInt(normalized.slice(1), 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const rgbToHex = (r, g, b) =>
  `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  let s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
};

const hslToRgb = (h, s, l) => {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const lig = clamp(l, 0, 1);

  if (sat === 0) {
    const value = Math.round(lig * 255);
    return { r: value, g: value, b: value };
  }

  const hueToRgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
  const p = 2 * lig - q;

  const r = hueToRgb(p, q, hue / 360 + 1 / 3);
  const g = hueToRgb(p, q, hue / 360);
  const b = hueToRgb(p, q, hue / 360 - 1 / 3);

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const hexToHsl = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
};

const hslToHex = (h, s, l) => {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
};

const adjustLightness = (hex, amount) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clamp(l + amount / 100, 0, 1));
};

const adjustSaturation = (hex, amount) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, clamp(s + amount / 100, 0, 1), l);
};

const shiftHue = (hex, amount) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h + amount, s, l);
};

const mixColors = (hexA, hexB, weight = 0.5) => {
  const w = clamp(weight, 0, 1);
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = a.r * (1 - w) + b.r * w;
  const g = a.g * (1 - w) + b.g * w;
  const bl = a.b * (1 - w) + b.b * w;
  return rgbToHex(r, g, bl);
};

const toRgba = (hex, alpha = 1) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

const sanitizeEnemyTags = (tags) =>
  Array.from(
    new Set(
      (tags || [])
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(Boolean)
    )
  ).slice(0, 8);

const buildEnemyTheme = (color) => {
  const base = normalizeHexColor(color);

  if (base === DEFAULT_ENEMY_THEME.base) {
    return cloneDefaultEnemyTheme();
  }

  const accent = adjustSaturation(base, 8);
  const accentSoft = adjustLightness(accent, 18);
  const accentStrong = adjustLightness(accent, -28);
  const accentGlow = adjustLightness(accent, 32);
  const complementary = shiftHue(accent, -35);
  const shadowTint = mixColors('#05060a', accentStrong, 0.4);
  const midTint = mixColors('#0f0d18', complementary, 0.45);
  const lightTint = mixColors('#1b1729', accentSoft, 0.35);

  const backgroundGradient = `${`radial-gradient(circle at 12% 20%, ${toRgba(
    accentGlow,
    0.22
  )}, transparent 55%)`}, ${`radial-gradient(circle at 88% 16%, ${toRgba(
    complementary,
    0.22
  )}, transparent 60%)`}, linear-gradient(140deg, ${toRgba(
    shadowTint,
    0.96
  )} 0%, ${toRgba(midTint, 0.92)} 55%, ${toRgba(lightTint, 0.94)} 100%)`;

  const textPrimary = mixColors('#fff7ed', accentGlow, 0.25);
  const textSecondary = toRgba(accentSoft, 0.75);
  const frameBorder = toRgba(accentSoft, 0.2);
  const innerBorder = toRgba(accentSoft, 0.12);

  const statPalette = [
    accent,
    shiftHue(accent, -18),
    shiftHue(accent, 26),
    shiftHue(accent, -42),
  ].map((tone) => ({
    bg: toRgba(tone, 0.16),
    border: toRgba(adjustLightness(tone, 12), 0.32),
    text: textPrimary,
  }));

  const tagBackground = toRgba(mixColors(accentStrong, '#000000', 0.4), 0.55);
  const tagBorder = toRgba(accentSoft, 0.32);

  const xpColor = accent;
  const oroColor = shiftHue(accent, -28);
  const infoColor = shiftHue(accent, 40);
  const dangerColor = shiftHue(accent, -65);
  const cardShadow = `0 18px 36px ${toRgba(mixColors(shadowTint, '#080715', 0.65), 0.65)}`;

  return {
    base,
    accent,
    accentSoft,
    accentStrong,
    accentGlow,
    complementary,
    backgroundGradient,
    frameBorder,
    innerBorder,
    textPrimary,
    textSecondary,
    typeText: toRgba(accentGlow, 0.82),
    rarityColor: toRgba(accentSoft, 0.75),
    levelBorder: toRgba(accentGlow, 0.55),
    levelBackground: `radial-gradient(circle at 30% 30%, ${toRgba(
      accentGlow,
      0.45
    )}, ${toRgba(accentStrong, 0.9)})`,
    statPalette,
    tagBackground,
    tagBorder,
    tagText: textSecondary,
    descriptionColor: toRgba(accentGlow, 0.78),
    xpBadge: {
      bg: toRgba(xpColor, 0.16),
      border: toRgba(adjustLightness(xpColor, 12), 0.45),
      text: textPrimary,
    },
    oroBadge: {
      bg: toRgba(oroColor, 0.16),
      border: toRgba(adjustLightness(oroColor, 8), 0.45),
      text: textPrimary,
    },
    cardShadow,
    button: {
      edit: {
        from: toRgba(accent, 0.24),
        via: toRgba(complementary, 0.24),
        to: toRgba(mixColors(midTint, shadowTint, 0.6), 0.92),
        hoverFrom: toRgba(accent, 0.32),
        hoverVia: toRgba(complementary, 0.32),
        hoverTo: toRgba(mixColors(lightTint, shadowTint, 0.5), 0.96),
        border: toRgba(accentSoft, 0.55),
        hoverBorder: toRgba(accentSoft, 0.7),
        glow: toRgba(accent, 0.22),
        iconGlow: toRgba(accent, 0.5),
      },
      delete: {
        from: toRgba(dangerColor, 0.26),
        via: toRgba(shiftHue(dangerColor, -8), 0.28),
        to: toRgba(mixColors(shadowTint, '#000000', 0.35), 0.9),
        hoverFrom: toRgba(dangerColor, 0.34),
        hoverVia: toRgba(shiftHue(dangerColor, -12), 0.34),
        hoverTo: toRgba(mixColors(lightTint, '#000000', 0.4), 0.94),
        border: toRgba(adjustLightness(dangerColor, 6), 0.5),
        hoverBorder: toRgba(adjustLightness(dangerColor, 10), 0.65),
        glow: toRgba(dangerColor, 0.2),
        iconGlow: toRgba(dangerColor, 0.45),
      },
      view: {
        from: toRgba(infoColor, 0.22),
        via: toRgba(shiftHue(infoColor, 12), 0.26),
        to: toRgba(mixColors(lightTint, infoColor, 0.35), 0.9),
        hoverFrom: toRgba(infoColor, 0.3),
        hoverVia: toRgba(shiftHue(infoColor, 16), 0.34),
        hoverTo: toRgba(mixColors(lightTint, infoColor, 0.5), 0.96),
        border: toRgba(adjustLightness(infoColor, 10), 0.5),
        hoverBorder: toRgba(adjustLightness(infoColor, 14), 0.65),
        glow: toRgba(infoColor, 0.2),
        iconGlow: toRgba(infoColor, 0.4),
      },
    },
    buttonText: textPrimary,
    buttonHoverText: textPrimary,
    buttonBaseText: textPrimary,
    buttonFontShadow: `0 0 10px ${toRgba(accentGlow, 0.4)}`,
  };
};

const createEnemyDefaults = () => ({
  name: '',
  portrait: '',
  description: '',
  weapons: [],
  armaduras: [],
  poderes: [],
  atributos: {},
  stats: {},
  nivel: 1,
  experiencia: 0,
  dinero: 0,
  notas: '',
  estados: [],
  tags: [...DEFAULT_ENEMY_TAGS],
  themeColor: DEFAULT_ENEMY_THEME_COLOR,
});

const ensureEnemyDefaults = (enemy) => {
  const base = createEnemyDefaults();
  const candidate = enemy || {};
  const rawTags = [
    ...(Array.isArray(candidate.tags) ? candidate.tags : []),
    ...(Array.isArray(candidate.etiquetas) ? candidate.etiquetas : []),
  ];
  if (typeof candidate.tags === 'string') {
    rawTags.push(
      ...candidate.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    );
  }
  if (typeof candidate.etiquetas === 'string') {
    rawTags.push(
      ...candidate.etiquetas
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    );
  }

  const sanitizedTags = sanitizeEnemyTags(rawTags);

  return {
    ...base,
    ...candidate,
    tags: sanitizedTags.length > 0 ? sanitizedTags : base.tags,
    themeColor: normalizeHexColor(candidate.themeColor || candidate.color || base.themeColor),
  };
};

const parseCargaValue = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const match = v.match(/🔲/g);
    if (match) return match.length;
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
};
const cargaFisicaIcon = (v) => {
  const n = parseCargaValue(v);
  return n > 0 ? '🔲'.repeat(n) : '❌';
};
const cargaMentalIcon = (v) => {
  const n = parseCargaValue(v);
  return n > 0 ? '🧠'.repeat(n) : '❌';
};
const normalizeName = (name) =>
  name
    ? name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '')
    : '';
const ALVARO_KEY = 'alvaro';
const applyCargaPenalties = (
  data,
  armas,
  armaduras,
  currentPlayerName = ''
) => {
  let fisica = 0;
  let mental = 0;
  data.weapons?.forEach((n) => {
    const w = armas.find((a) => a && a.nombre === n);
    if (w) {
      fisica += parseCargaValue(w.cargaFisica || w.cuerpo || w.carga);
      mental += parseCargaValue(w.cargaMental || w.mente);
    }
  });
  data.armaduras?.forEach((n) => {
    const a = armaduras.find((x) => x && x.nombre === n);
    if (a) {
      fisica += parseCargaValue(a.cargaFisica || a.cuerpo || a.carga);
      mental += parseCargaValue(a.cargaMental || a.mente);
    }
  });

  const isAlvaro = normalizeName(currentPlayerName).includes(ALVARO_KEY);
  const rfId = data.resistenciaFisica || 'vida';
  const rmId = data.resistenciaMental || 'ingenio';
  const newStats = { ...data.stats };
  const rfBase = newStats[rfId]?.base || 0;
  const rmBase = newStats[rmId]?.base || 0;

  if (isAlvaro) {
    if (newStats[rfId]) {
      const base = newStats[rfId].base || 0;
      const buff = newStats[rfId].buff || 0;
      const total = Math.min(base + buff, RESOURCE_MAX);
      newStats[rfId].total = total;
      if (newStats[rfId].actual > total) newStats[rfId].actual = total;
    }
    if (newStats[rmId]) {
      const base = newStats[rmId].base || 0;
      const buff = newStats[rmId].buff || 0;
      const total = Math.min(base + buff, RESOURCE_MAX);
      newStats[rmId].total = total;
      if (newStats[rmId].actual > total) newStats[rmId].actual = total;
    }
  }
  const resistenciaFisica = isAlvaro ? newStats[rfId]?.total || 0 : rfBase;
  const resistenciaMental = isAlvaro ? newStats[rmId]?.total || 0 : rmBase;
  if (newStats.postura) {
    const base = newStats.postura.base || 0;
    const buff = newStats.postura.buff || 0;
    const penal = Math.max(0, fisica - resistenciaFisica);
    const baseEfectiva = Math.max(0, base - penal);
    const extraBuff =
      !isAlvaro && (rfId === 'postura' || rmId === 'postura') ? 0 : buff;
    const total = Math.max(0, Math.min(baseEfectiva + extraBuff, RESOURCE_MAX));
    newStats.postura.total = total;
    if (newStats.postura.actual > total) newStats.postura.actual = total;
  }
  if (newStats.cordura) {
    const base = newStats.cordura.base || 0;
    const buff = newStats.cordura.buff || 0;
    const penal = Math.max(0, mental - resistenciaMental);
    const baseEfectiva = Math.max(0, base - penal);
    const total = Math.max(0, Math.min(baseEfectiva + buff, RESOURCE_MAX));
    newStats.cordura.total = total;
    if (newStats.cordura.actual > total) newStats.cordura.actual = total;
  }

  return {
    ...data,
    stats: newStats,
    cargaAcumulada: { fisica, mental },
  };
};
function App() {
  // ───────────────────────────────────────────────────────────
  // STATES
  // ───────────────────────────────────────────────────────────
  const confirm = useConfirm();
  const [userType, setUserType] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (passwordInput === MASTER_PASSWORD) {
      setAuthenticated(true);
      setShowLogin(false);
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta');
    }
  };

  const resetLogin = () => {
    setUserType(null);
    setShowLogin(false);
    setPasswordInput('');
    setAuthenticated(false);
    setAuthError('');
  };
  const [armas, setArmas] = useState([]);
  const [armaduras, setArmaduras] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [nameEntered, setNameEntered] = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const tooltipCounterRef = useRef(0);
  const [playerData, setPlayerData] = useState({
    weapons: [],
    armaduras: [],
    poderes: [],
    claves: [],
    estados: [],
    atributos: {},
    stats: {},
    cargaAcumulada: { fisica: 0, mental: 0 },
    resistenciaFisica: 'vida',
    resistenciaMental: 'ingenio',
  });
  const [playerError, setPlayerError] = useState('');
  const [playerInputArma, setPlayerInputArma] = useState('');
  const [playerInputArmadura, setPlayerInputArmadura] = useState('');
  const [playerArmaduraError, setPlayerArmaduraError] = useState('');
  const [playerInputPoder, setPlayerInputPoder] = useState('');
  const [playerPoderError, setPlayerPoderError] = useState('');

  // Google Sheets ID
  const sheetId =
    process.env.REACT_APP_GOOGLE_SHEETS_ID ||
    '1Fc46hHjCWRXCEnHl3ZehzMEcxewTYaZEhd-v-dnFUjs';

  // Datos de prueba temporales mientras arreglamos Google Sheets
  const datosPruebaArmas = React.useMemo(
    () => [
      {
        nombre: 'Espada',
        dano: '1D6',
        alcance: 'Cuerpo a cuerpo',
        consumo: '0',
        carga: '0',
        cuerpo: '0',
        mente: '0',
        cargaFisica: '0',
        cargaMental: '0',
        rasgos: [],
        descripcion: 'Espada básica',
        tipoDano: 'físico',
        valor: '10',
        tecnologia: 'Baja',
      },
      {
        nombre: 'Daga',
        dano: '1D4',
        alcance: 'Cuerpo a cuerpo',
        consumo: '0',
        carga: '0',
        cuerpo: '0',
        mente: '0',
        cargaFisica: '0',
        cargaMental: '0',
        rasgos: [],
        descripcion: 'Daga pequeña',
        tipoDano: 'físico',
        valor: '5',
        tecnologia: 'Baja',
      },
      {
        nombre: 'Pistola',
        dano: '1D8',
        alcance: 'Media',
        consumo: '1',
        carga: '0',
        cuerpo: '0',
        mente: '0',
        cargaFisica: '0',
        cargaMental: '0',
        rasgos: [],
        descripcion: 'Pistola básica',
        tipoDano: 'físico',
        valor: '50',
        tecnologia: 'Media',
      },
    ],
    []
  );

  const datosPruebaArmaduras = React.useMemo(
    () => [
      {
        nombre: 'Armadura de Cuero',
        defensa: '1',
        cuerpo: '0',
        mente: '0',
        carga: '0',
        cargaFisica: '0',
        cargaMental: '0',
        rasgos: [],
        descripcion: 'Armadura ligera de cuero',
        valor: '20',
        tecnologia: 'Baja',
      },
      {
        nombre: 'Armadura de Malla',
        defensa: '2',
        cuerpo: '0',
        mente: '0',
        carga: '0',
        cargaFisica: '0',
        cargaMental: '0',
        rasgos: [],
        descripcion: 'Armadura de malla metálica',
        valor: '40',
        tecnologia: 'Baja',
      },
      {
        nombre: 'Armadura Completa',
        defensa: '3',
        cuerpo: '0',
        mente: '0',
        carga: '0',
        cargaFisica: '0',
        cargaMental: '0',
        rasgos: [],
        descripcion: 'Armadura completa de metal',
        valor: '100',
        tecnologia: 'Baja',
      },
    ],
    []
  );
  // Recursos dinámicos (añadir / eliminar)
  const {
    resourcesList,
    setResourcesList,
    showAddResForm,
    setShowAddResForm,
    newResName,
    setNewResName,
    newResColor,
    setNewResColor,
    newResError,
    setNewResError,
    agregarRecurso,
    eliminarRecurso,
  } = useResourcesHook(
    defaultResourcesList,
    (data, list) => savePlayer(data, list),
    playerData
  );
  const [newWeaponData, setNewWeaponData] = useState({
    nombre: '',
    dano: '',
    alcance: '',
    consumo: '',
    cargaFisica: '',
    cargaMental: '',
    rasgos: '',
    descripcion: '',
    tipoDano: '',
    valor: '',
    tecnologia: '',
  });
  const [editingWeapon, setEditingWeapon] = useState(null);
  const [newWeaponError, setNewWeaponError] = useState('');
  const [newArmorData, setNewArmorData] = useState({
    nombre: '',
    defensa: '',
    cargaFisica: '',
    cargaMental: '',
    rasgos: '',
    descripcion: '',
    valor: '',
    tecnologia: '',
  });
  const [editingArmor, setEditingArmor] = useState(null);
  const [newArmorError, setNewArmorError] = useState('');
  const [newAbility, setNewAbility] = useState({
    nombre: '',
    alcance: '',
    consumo: '',
    cuerpo: '',
    mente: '',
    poder: '',
    rasgos: '',
    descripcion: '',
  });
  const [editingAbility, setEditingAbility] = useState(null);
  const [newAbilityError, setNewAbilityError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInfoId, setEditingInfoId] = useState(null);
  const [editingInfoText, setEditingInfoText] = useState('');
  const [hoveredTipId, setHoveredTipId] = useState(null);
  const [pinnedTipId, setPinnedTipId] = useState(null);
  // Claves (acciones consumibles)
  const [claves, setClaves] = useState([]);
  const [showAddClaveForm, setShowAddClaveForm] = useState(false);
  const [newClaveName, setNewClaveName] = useState('');
  const [newClaveColor, setNewClaveColor] = useState('#ffffff');
  const [newClaveTotal, setNewClaveTotal] = useState(0);
  const [newClaveError, setNewClaveError] = useState('');
  // Estados del personaje
  const [estados, setEstados] = useState([]);
  // Estados para fichas de enemigos
  const [enemies, setEnemies] = useState([]);
  const [selectedEnemy, setSelectedEnemy] = useState(null);
  const [showEnemyForm, setShowEnemyForm] = useState(false);
  const [editingEnemy, setEditingEnemy] = useState(null);
  const [newEnemy, setNewEnemy] = useState(() => createEnemyDefaults());
  const [enemyTagInput, setEnemyTagInput] = useState('');
  const [enemyEditingTagIndex, setEnemyEditingTagIndex] = useState(null);
  const [enemyTagDraft, setEnemyTagDraft] = useState('');
  const [enemyThemeColorDraft, setEnemyThemeColorDraft] = useState(
    DEFAULT_ENEMY_THEME_COLOR
  );
  const [enemyEditorTab, setEnemyEditorTab] = useState('ficha'); // 'ficha' | 'equipo'
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [imageCropSource, setImageCropSource] = useState(null);
  const [imageCropName, setImageCropName] = useState('retrato.jpg');
  const [imageCrop, setImageCrop] = useState({ x: 0, y: 0 });
  const [imageCropZoom, setImageCropZoom] = useState(1);
  const [imageCropAreaPixels, setImageCropAreaPixels] = useState(null);
  const [imageCropLoading, setImageCropLoading] = useState(false);
  // Estados para equipar items a enemigos
  const [enemyInputArma, setEnemyInputArma] = useState('');
  const [enemyInputArmadura, setEnemyInputArmadura] = useState('');
  const [enemyInputPoder, setEnemyInputPoder] = useState('');
  const [enemyArmaError, setEnemyArmaError] = useState('');
  const [enemyArmaduraError, setEnemyArmaduraError] = useState('');
  const [enemyPoderError, setEnemyPoderError] = useState('');
  // Vista elegida por el máster (inventario prototipo u opciones clásicas)
  const [chosenView, setChosenView] = useState(null);
  // Acciones móviles (FAB) para la vista de Enemigos
  const [enemyActionsOpen, setEnemyActionsOpen] = useState(false);
  // Buscador y filtros de Enemigos
  const [enemySearch, setEnemySearch] = useState('');
  const deferredEnemySearch = useDeferredValue(enemySearch);
  const [enemyOnlyPortraits, setEnemyOnlyPortraits] = useState(false);
  const [enemySort, setEnemySort] = useState('name'); // 'name' | 'nivel'
  const [enemySortDir, setEnemySortDir] = useState('asc'); // 'asc' | 'desc'
  const [enemyFiltersOpen, setEnemyFiltersOpen] = useState(false);

  const normalizeText = (t) =>
    (t || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  useEffect(() => {
    setEnemyThemeColorDraft(
      newEnemy.themeColor || DEFAULT_ENEMY_THEME_COLOR
    );
  }, [newEnemy.themeColor]);

  const updateEnemyTags = useCallback(
    (tags) => {
      const sanitized = sanitizeEnemyTags(tags);
      setNewEnemy((prev) => ({
        ...prev,
        tags: sanitized.length > 0 ? sanitized : [...DEFAULT_ENEMY_TAGS],
      }));
    },
    [setNewEnemy]
  );

  const handleEnemyTagAdd = useCallback(() => {
    const tag = enemyTagInput.trim();
    if (!tag) return;
    updateEnemyTags([...(newEnemy.tags || []), tag]);
    setEnemyTagInput('');
  }, [enemyTagInput, newEnemy.tags, updateEnemyTags]);

  const handleEnemyTagRemove = useCallback(
    (index) => {
      const updated = (newEnemy.tags || []).filter((_, i) => i !== index);
      updateEnemyTags(updated);
      if (enemyEditingTagIndex === index) {
        setEnemyEditingTagIndex(null);
        setEnemyTagDraft('');
      }
    },
    [newEnemy.tags, updateEnemyTags, enemyEditingTagIndex]
  );

  const handleEnemyTagEditStart = useCallback(
    (index) => {
      const tag = newEnemy.tags?.[index] || '';
      setEnemyEditingTagIndex(index);
      setEnemyTagDraft(tag);
    },
    [newEnemy.tags]
  );

  const handleEnemyTagEditCancel = useCallback(() => {
    setEnemyEditingTagIndex(null);
    setEnemyTagDraft('');
  }, []);

  const handleEnemyTagEditSave = useCallback(() => {
    if (enemyEditingTagIndex === null) return;
    const value = (enemyTagDraft || '').trim();
    if (!value) {
      handleEnemyTagRemove(enemyEditingTagIndex);
      return;
    }
    const updated = [...(newEnemy.tags || [])];
    updated[enemyEditingTagIndex] = value;
    updateEnemyTags(updated);
    setEnemyEditingTagIndex(null);
    setEnemyTagDraft('');
  }, [enemyEditingTagIndex, enemyTagDraft, newEnemy.tags, updateEnemyTags, handleEnemyTagRemove]);

  const handleEnemyTagReset = useCallback(() => {
    updateEnemyTags(DEFAULT_ENEMY_TAGS);
    setEnemyTagInput('');
    setEnemyEditingTagIndex(null);
    setEnemyTagDraft('');
  }, [updateEnemyTags]);

  const handleEnemyThemeColorCommit = useCallback(
    (value) => {
      const normalized = normalizeHexColor(
        value,
        newEnemy.themeColor || DEFAULT_ENEMY_THEME_COLOR
      );
      setNewEnemy((prev) => ({ ...prev, themeColor: normalized }));
      setEnemyThemeColorDraft(normalized);
    },
    [newEnemy.themeColor]
  );

  const handleEnemyThemeColorInputChange = useCallback(
    (value) => {
      setEnemyThemeColorDraft(value);
      if (expandHex(value)) {
        handleEnemyThemeColorCommit(value);
      }
    },
    [handleEnemyThemeColorCommit]
  );

  const handleEnemyThemeColorBlur = useCallback(() => {
    handleEnemyThemeColorCommit(enemyThemeColorDraft);
  }, [enemyThemeColorDraft, handleEnemyThemeColorCommit]);

  const filteredEnemies = useMemo(() => {
    const tokens = normalizeText(deferredEnemySearch).split(/\s+/).filter(Boolean);
    const list = (enemies || []).filter((e) => {
      if (enemyOnlyPortraits && !e.portrait) return false;
      if (tokens.length === 0) return true;
      const hay = [
        e.name,
        e.description,
        e.notas,
        ...(e.weapons || []).map((w) => w?.nombre || w?.name || ''),
        ...(e.armaduras || []).map((a) => a?.nombre || a?.name || ''),
        ...(e.poderes || []).map((p) => p?.nombre || p?.name || ''),
        Object.keys(e.atributos || {}).join(' '),
        ...(e.tags || []),
        ...(typeof e.etiquetas === 'string'
          ? e.etiquetas.split(',').map((t) => t.trim())
          : Array.isArray(e.etiquetas)
          ? e.etiquetas
          : []),
      ]
        .filter(Boolean)
        .join(' ');
      const normalized = normalizeText(hay);
      return tokens.every((t) => normalized.includes(t));
    });
    const dir = enemySortDir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      if (enemySort === 'nivel') {
        const an = parseInt(a.nivel || 0, 10);
        const bn = parseInt(b.nivel || 0, 10);
        if (an !== bn) return (an - bn) * dir;
      }
      const an = normalizeText(a.name || '');
      const bn = normalizeText(b.name || '');
      if (an < bn) return -1 * dir;
      if (an > bn) return 1 * dir;
      return 0;
    });
  }, [enemies, deferredEnemySearch, enemyOnlyPortraits, enemySort, enemySortDir]);
  const enemyResultsLabel =
    filteredEnemies.length !== enemies.length
      ? `${filteredEnemies.length} resultado${filteredEnemies.length === 1 ? '' : 's'}`
      : `${enemies.length} enemigo${enemies.length === 1 ? '' : 's'}`;
  // Glosario de términos destacados
  const {
    glossary,
    newTerm,
    setNewTerm,
    editingTerm,
    setEditingTerm,
    newTermError,
    saveTerm,
    startEditTerm,
    deleteTerm,
  } = useGlossary();

  // Calculadora de dados
  const [showDiceCalculator, setShowDiceCalculator] = useState(false);
  // Minijuego Barra-Reflejos
  const [showBarraReflejos, setShowBarraReflejos] = useState(false);
  // Sistema de Iniciativa
  const [showInitiativeTracker, setShowInitiativeTracker] = useState(false);
  // Minimapa para jugadores
  const [showPlayerMinimap, setShowPlayerMinimap] = useState(false);
  // Mapa de Batalla para jugadores
  const [showPlayerBattleMap, setShowPlayerBattleMap] = useState(false);
  // Páginas para el Mapa de Batalla
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pagesLoadedRef = useRef(false);
  const checkedPagesRef = useRef({});
  const prevTokensRef = useRef([]);
  const canvasTokensRef = useRef([]);
  const isLocalTokenEdit = useRef(false);
  const isRemoteTokenUpdate = useRef(false);
  const pendingTokenChangesRef = useRef(new Map());
  // Señal para diferir guardado de tokens cuando haya ajustes abiertos
  const pendingTokenSaveRef = useRef(false);
  const prevLinesRef = useRef([]);
  const prevWallsRef = useRef([]);
  const wallSaveTimeout = useRef(null);
  const prevTextsRef = useRef([]);
  const prevBgRef = useRef(null);
  const prevGridRef = useRef({});
  const saveVersionRef = useRef({
    tokens: 0,
    lines: 0,
    walls: 0,
    texts: 0,
    background: 0,
    grid: 0,
  });
  const loadVersionRef = useRef(0);
  // Evitar guardados de tokens mientras está abierto TokenSettings
  const settingsEditingCountRef = useRef(0);
  useEffect(() => {
    const handler = (e) => {
      const { delta } = e.detail || {};
      settingsEditingCountRef.current = Math.max(
        0,
        settingsEditingCountRef.current + (typeof delta === 'number' ? delta : 0)
      );
    };
    window.addEventListener('tokenSettingsEditing', handler);
    return () => window.removeEventListener('tokenSettingsEditing', handler);
  }, []);
  // Tokens para el Mapa de Batalla
  const [canvasTokens, setCanvasTokens] = useState([]);
  const [canvasLines, setCanvasLines] = useState([]);
  const [canvasWalls, setCanvasWalls] = useState([]);
  const [canvasTexts, setCanvasTexts] = useState([]);
  const [activeLayer, setActiveLayer] = useState('fichas');
  const [tokenSheets, setTokenSheets] = useState(() => {
    const stored = localStorage.getItem('tokenSheets');
    return stored ? JSON.parse(stored) : {};
  });
  const [canvasBackground, setCanvasBackground] = useState(null);
  // Configuración de la cuadrícula del mapa de batalla
  const [gridSize, setGridSize] = useState(100);
  const [gridCells, setGridCells] = useState(30);
  const [gridOffsetX, setGridOffsetX] = useState(0);
  const [gridOffsetY, setGridOffsetY] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [gridColor, setGridColor] = useState('#ffffff');
  const [gridOpacity, setGridOpacity] = useState(0.2);
  const [enableDarkness, setEnableDarkness] = useState(true);
  const [showVisionRanges, setShowVisionRanges] = useState(true);

  const diffTokens = (prev, next) => {
    const prevMap = new Map(
      prev.map((t) => {
        const id = String(t.id);
        return [id, { ...t, id }];
      })
    );
    const changed = [];
    next.forEach((tk) => {
      const id = String(tk.id);
      const old = prevMap.get(id);
      if (!old) {
        changed.push({ ...tk, id });
      } else if (!deepEqual(old, tk)) {
        changed.push({ ...tk, id });
      }
      prevMap.delete(id);
    });
    prevMap.forEach((tk) => {
      changed.push({ id: String(tk.id), _deleted: true });
    });
    return changed;
  };

  const handleGridSettingsChange = useCallback(
    ({ showGrid: nextShowGrid, gridColor: nextColor, gridOpacity: nextOpacity }) => {
      if (typeof nextShowGrid === 'boolean') {
        setShowGrid((prev) => (prev === nextShowGrid ? prev : nextShowGrid));
      }
      if (typeof nextColor === 'string' && nextColor.trim() !== '') {
        setGridColor((prev) => (prev === nextColor ? prev : nextColor));
      }
      if (nextOpacity !== undefined) {
        const numeric = Math.max(0, Math.min(1, Number(nextOpacity)));
        if (!Number.isNaN(numeric)) {
          setGridOpacity((prev) => (prev === numeric ? prev : numeric));
        }
      }
    },
    []
  );

  const ensureTokenSheetIds = useCallback(async (pageId, tokens) => {
    if (!pageId || checkedPagesRef.current[pageId]) return tokens || [];
    const updated = tokens ? [...tokens] : [];
    let modified = false;
    const tasks = [];
    const updates = [];
    updated.forEach((tk) => {
      if (!tk.tokenSheetId) {
        const newId = nanoid();
        tk.tokenSheetId = newId;
        modified = true;
        updates.push({ id: tk.id, tokenSheetId: newId });
        if (tk.enemyId) {
          tasks.push(
            getDoc(doc(db, 'enemies', tk.enemyId))
              .then((snap) => {
                if (snap.exists()) {
                  return saveTokenSheet({ id: newId, ...snap.data() });
                }
                return setDoc(doc(db, 'tokenSheets', newId), { stats: {} });
              })
              .catch((err) => console.error('clone enemy sheet', err))
          );
        } else {
          tasks.push(
            setDoc(doc(db, 'tokenSheets', newId), { stats: {} }).catch((err) =>
              console.error('create token sheet', err)
            )
          );
        }
      }
    });

    if (modified) {
      try {
        await Promise.all(tasks);
        await Promise.all(
          updates.map((u) =>
            updateDoc(doc(db, 'pages', pageId, 'tokens', String(u.id)), {
              tokenSheetId: u.tokenSheetId,
            })
          )
        );
      } catch (err) {
        console.error('update tokens', err);
        // Revert to original tokens on failure to avoid losing data
        checkedPagesRef.current[pageId] = true;
        return tokens || [];
      }
    }

    checkedPagesRef.current[pageId] = true;
    return updated;
  }, []);

  // Al cerrar el panel de Ajustes de Token, si hubo cambios mientras estaba abierto
  // y se pospuso el guardado, hacemos un guardado único ahora.
  useEffect(() => {
    const maybeFlush = () => {
      setTimeout(async () => {
        if (settingsEditingCountRef.current !== 0 || !pendingTokenSaveRef.current) return;
        try {
          const pageId = pages[currentPage]?.id;
          if (!pageId) return;
          const tokens = await Promise.all(
            canvasTokens.map(async (t) => {
              if (t.url && t.url.startsWith('data:')) {
                const url = await uploadDataUrl(t.url, `canvas-tokens/${t.id}`);
                return { ...t, url };
              }
              return t;
            })
          );
          const tokensRef = collection(db, 'pages', pageId, 'tokens');
          const toDelete = (prevTokensRef.current || []).filter(
            (pt) => !tokens.some((t) => t.id === pt.id)
          );
          await Promise.all([
            ...tokens.map((t) => setDoc(doc(tokensRef, String(t.id)), t)),
            ...toDelete.map((t) => deleteDoc(doc(tokensRef, String(t.id)))),
          ]);
        } catch (err) {
          console.error('Error guardando tokens (al cerrar ajustes):', err);
        } finally {
          isLocalTokenEdit.current = false;
          isRemoteTokenUpdate.current = false;
          pendingTokenSaveRef.current = false;
          prevTokensRef.current = canvasTokens;
        }
      }, 10);
    };
    window.addEventListener('tokenSettingsEditing', maybeFlush);
    return () => window.removeEventListener('tokenSettingsEditing', maybeFlush);
  }, [currentPage, pages, canvasTokens]);

  // Control de visibilidad de páginas para jugadores
  const [playerVisiblePageId, setPlayerVisiblePageId] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const { tokens, pageId } = e.detail || {};
      if (userType === 'master') {
        if (pageId !== pages[currentPage]?.id) return;
        if (!showPlayerBattleMap) isRemoteTokenUpdate.current = true;
        setCanvasTokens(tokens);
        setPages((prev) => {
          const pagesCopy = [...prev];
          if (pagesCopy[currentPage]) pagesCopy[currentPage].tokens = tokens;
          return pagesCopy;
        });
      } else if (userType === 'player') {
        if (pageId !== playerVisiblePageId) return;
        setPages((prev) => {
          const idx = prev.findIndex((p) => p.id === playerVisiblePageId);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx].tokens = tokens;
            return copy;
          }
          return prev;
        });
      }
    };
    window.addEventListener('barsVisibilityChanged', handler);
    return () => window.removeEventListener('barsVisibilityChanged', handler);
  }, [userType, currentPage, playerVisiblePageId]);

  // Cargar páginas desde Firebase al iniciar
  useEffect(() => {
    const loadPages = async () => {
      const snap = await getDocs(collection(db, 'pages'));
      const loaded = snap.docs.map((d) => {
        const { lines, texts, walls, ...meta } = d.data();
        return { id: d.id, ...meta };
      });
      if (loaded.length === 0) {
        // Crear canvas con fondo blanco y grid negro para la página por defecto
        const defaultBackground = createDefaultGridCanvas(1500, 1000, 50);

        const defaultPage = {
          id: nanoid(),
          name: 'Página 1',
          background: defaultBackground, // Usar directamente el data URL
          backgroundHash: null,
          gridSize: 50,
          gridCells: 30,
          gridOffsetX: 0,
          gridOffsetY: 0,
          showGrid: true,
          gridColor: '#ffffff',
          gridOpacity: 0.2,
          enableDarkness: true,
          darknessOpacity: 0.7,
          lines: [],
          walls: [],
          texts: [],
        };
        await setDoc(doc(db, 'pages', defaultPage.id), sanitize(defaultPage));
        const { lines, walls, texts, ...meta } = defaultPage;
        setPages([meta]);
        // Establecer la primera página como visible para jugadores por defecto
        setPlayerVisiblePageId(defaultPage.id);
        await setDoc(doc(db, 'gameSettings', 'playerVisibility'), {
          playerVisiblePageId: defaultPage.id,
        });
      } else {
        setPages(loaded);
      }
      pagesLoadedRef.current = true;
    };
    loadPages();
  }, []);

  // Listener en tiempo real para configuración de visibilidad para jugadores
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'gameSettings', 'playerVisibility'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const newVisiblePageId = data.playerVisiblePageId || null;
          console.log('Cambio de visibilidad detectado:', newVisiblePageId);
          setPlayerVisiblePageId(newVisiblePageId);
        }
      },
      (error) => {
        console.error('Error en listener de visibilidad:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Cargar datos completos de la página visible para jugadores con listener en tiempo real
  useEffect(() => {
    if (!playerVisiblePageId || userType !== 'player') return;

    const pageRef = doc(db, 'pages', playerVisiblePageId);
    const tokensRef = collection(pageRef, 'tokens');

    const unsubscribePage = onSnapshot(
      pageRef,
      (docSnap) => {
        if (docSnap.metadata.hasPendingWrites) return;
        if (docSnap.exists()) {
          const pageData = docSnap.data();
          setEnableDarkness(
            pageData.enableDarkness !== undefined ? pageData.enableDarkness : true
          );
          const opacity =
            pageData.darknessOpacity !== undefined ? pageData.darknessOpacity : 0.7;
          setPages((prevPages) => {
            const pageIndex = prevPages.findIndex(
              (p) => p.id === playerVisiblePageId
            );
            if (pageIndex !== -1) {
              const updatedPages = [...prevPages];
              updatedPages[pageIndex] = {
                ...updatedPages[pageIndex],
                lines: pageData.lines || [],
                walls: pageData.walls || [],
                texts: pageData.texts || [],
                background: pageData.background,
                backgroundHash: pageData.backgroundHash,
                enableDarkness:
                  pageData.enableDarkness !== undefined
                    ? pageData.enableDarkness
                    : updatedPages[pageIndex].enableDarkness,
                darknessOpacity: opacity,
                showGrid:
                  pageData.showGrid !== undefined
                    ? pageData.showGrid
                    : updatedPages[pageIndex].showGrid ?? true,
                gridColor:
                  pageData.gridColor !== undefined
                    ? pageData.gridColor
                    : updatedPages[pageIndex].gridColor ?? '#ffffff',
                gridOpacity:
                  pageData.gridOpacity !== undefined
                    ? Math.max(0, Math.min(1, pageData.gridOpacity))
                    : updatedPages[pageIndex].gridOpacity ?? 0.2,
              };
              return updatedPages;
            }
            return prevPages;
          });
          setCanvasLines(pageData.lines || []);
          setCanvasWalls(pageData.walls || []);
          setCanvasTexts(pageData.texts || []);
        }
      },
      (error) => {
        console.error('Error en listener de página para jugador:', error);
      }
    );

    const unsubscribeTokens = onSnapshot(
      tokensRef,
      async (snap) => {
        const changes = snap.docChanges().map((ch) =>
          ch.type === 'removed'
            ? { id: ch.doc.id, _deleted: true }
            : { id: ch.doc.id, ...ch.doc.data() }
        );
        if (changes.length === 0) return;
        const toEnsure = changes.filter((tk) => !tk._deleted);
        const ensured = await ensureTokenSheetIds(playerVisiblePageId, toEnsure);
        const ensuredMap = new Map(
          ensured.map((t) => {
            const id = String(t.id);
            return [id, { ...t, id }];
          })
        );
        const tokensWithIds = changes.map((t) => {
          const id = String(t.id);
          return t._deleted ? { ...t, id } : ensuredMap.get(id) || { ...t, id };
        });
        const filtered = tokensWithIds.filter((tk) => {
          const pending = pendingTokenChangesRef.current.get(String(tk.id));
          if (pending) {
            if (deepEqual(pending, tk))
              pendingTokenChangesRef.current.delete(String(tk.id));
            return false;
          }
          return true;
        });
        if (filtered.length === 0) return;
        setPages((prevPages) => {
          const pageIndex = prevPages.findIndex((p) => p.id === playerVisiblePageId);
          if (pageIndex !== -1) {
            const updatedPages = [...prevPages];
            const prevTokens = updatedPages[pageIndex].tokens || [];
            updatedPages[pageIndex] = {
              ...updatedPages[pageIndex],
              tokens: mergeTokens(prevTokens, filtered),
            };
            return updatedPages;
          }
          return prevPages;
        });
        setCanvasTokens((prev) => mergeTokens(prev, filtered));
      },
      (error) => {
        console.error('Error en listener de tokens para jugador:', error);
      }
    );

    return () => {
      unsubscribePage();
      unsubscribeTokens();
    };
  }, [playerVisiblePageId, userType]);

  // Listener en tiempo real para la página actual en modo máster
  useEffect(() => {
    if (userType !== 'master') return;
    const pageId = pages[currentPage]?.id;
    if (!pageId) return;
    // Si hay paneles de ajustes abiertos, no dispares guardado
    if (settingsEditingCountRef.current > 0) return;

    const pageRef = doc(db, 'pages', pageId);
    const tokensRef = collection(pageRef, 'tokens');

    const unsubscribePage = onSnapshot(
      pageRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const pageData = docSnap.data();
          setCanvasLines(pageData.lines || []);
          setCanvasWalls(pageData.walls || []);
          setCanvasTexts(pageData.texts || []);
          setCanvasBackground(pageData.background || null);
          setGridSize(pageData.gridSize || 1);
          setGridCells(pageData.gridCells || 1);
          setGridOffsetX(pageData.gridOffsetX || 0);
          setGridOffsetY(pageData.gridOffsetY || 0);
          setShowGrid(
            pageData.showGrid !== undefined ? pageData.showGrid : true
          );
          setGridColor(pageData.gridColor || '#ffffff');
          setGridOpacity(
            pageData.gridOpacity !== undefined
              ? Math.max(0, Math.min(1, pageData.gridOpacity))
              : 0.2
          );
          setEnableDarkness(
            pageData.enableDarkness !== undefined ? pageData.enableDarkness : true
          );
        }
      },
      (error) => {
        console.error('Error en listener de página para máster:', error);
      }
    );

    const unsubscribeTokens = onSnapshot(
      tokensRef,
      async (snap) => {
        const changes = snap.docChanges().map((ch) =>
          ch.type === 'removed'
            ? { id: ch.doc.id, _deleted: true }
            : { id: ch.doc.id, ...ch.doc.data() }
        );
        if (changes.length === 0) return;
        const toEnsure = changes.filter((tk) => !tk._deleted);
        const ensured = await ensureTokenSheetIds(pageId, toEnsure);
        const ensuredMap = new Map(
          ensured.map((t) => {
            const id = String(t.id);
            return [id, { ...t, id }];
          })
        );
        const tokensWithIds = changes.map((t) => {
          const id = String(t.id);
          return t._deleted ? { ...t, id } : ensuredMap.get(id) || { ...t, id };
        });
        const filtered = tokensWithIds.filter((tk) => {
          const pending = pendingTokenChangesRef.current.get(String(tk.id));
          if (pending) {
            if (deepEqual(pending, tk))
              pendingTokenChangesRef.current.delete(String(tk.id));
            return false;
          }
          return true;
        });
        if (filtered.length === 0) return;
        isRemoteTokenUpdate.current = true;
        setCanvasTokens((prev) => mergeTokens(prev, filtered));
        prevTokensRef.current = mergeTokens(prevTokensRef.current, filtered);
      },
      (error) => {
        console.error('Error en listener de tokens para máster:', error);
      }
    );

    return () => {
      unsubscribePage();
      unsubscribeTokens();
    };
  }, [userType, currentPage, pages[currentPage]?.id]);

  // Función para actualizar la página visible para jugadores
  const updatePlayerVisiblePage = async (pageId) => {
    try {
      setPlayerVisiblePageId(pageId);
      await setDoc(doc(db, 'gameSettings', 'playerVisibility'), {
        playerVisiblePageId: pageId,
      });
    } catch (error) {
      console.error('Error actualizando página visible para jugadores:', error);
    }
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Preview locally while uploading
    const localUrl = URL.createObjectURL(file);
    setCanvasBackground(localUrl);
    try {
      const { url, hash } = await getOrUploadFile(file);
      URL.revokeObjectURL(localUrl);
      setCanvasBackground(url);
      const pageId = pages[currentPage]?.id;
      if (pageId) {
        const prevHash = pages[currentPage]?.backgroundHash;
        await updateDoc(doc(db, 'pages', pageId), {
          background: url,
          backgroundHash: hash,
        });
        setPages((ps) =>
          ps.map((p, i) =>
            i === currentPage
              ? { ...p, background: url, backgroundHash: hash }
              : p
          )
        );
        prevBgRef.current = url;
        if (prevHash && prevHash !== hash) {
          await releaseFile(prevHash);
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    saveVersionRef.current.tokens++;
    saveVersionRef.current.lines++;
    saveVersionRef.current.walls++;
    saveVersionRef.current.texts++;
    saveVersionRef.current.background++;
    saveVersionRef.current.grid++;
    if (wallSaveTimeout.current) {
      clearTimeout(wallSaveTimeout.current);
      wallSaveTimeout.current = null;
    }
  }, [currentPage]);

  // Suscribirse a la página actual - SOLO cargar datos cuando cambia de página
  useEffect(() => {
    if (!pagesLoadedRef.current) return undefined;
    const page = pages[currentPage];
    if (!page) return undefined;

    loadVersionRef.current++;
    const version = loadVersionRef.current;

    console.log(
      'Cargando datos de página:',
      page.id,
      'currentPage:',
      currentPage
    );

    // Cargar datos una sola vez al cambiar de página
    const loadPageData = async () => {
      try {
        const snap = await getDoc(doc(db, 'pages', page.id));
        if (!snap.exists()) return;

        const data = snap.data();
        const tokenSnap = await getDocs(collection(db, 'pages', page.id, 'tokens'));
        const tokens = tokenSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const tokensWithIds = await ensureTokenSheetIds(page.id, tokens);
        console.log('Datos cargados para página:', page.id);
        if (version !== loadVersionRef.current) return;

        // Actualizar estados del canvas con los datos de esta página específica
        isRemoteTokenUpdate.current = true;
        setCanvasTokens(tokensWithIds);
        setCanvasLines(data.lines || []);
        setCanvasWalls(data.walls || []);
        setCanvasTexts(data.texts || []);
        setCanvasBackground(data.background || null);
        setGridSize(data.gridSize || 1);
        setGridCells(data.gridCells || 1);
        setGridOffsetX(data.gridOffsetX || 0);
        setGridOffsetY(data.gridOffsetY || 0);
        setShowGrid(data.showGrid !== undefined ? data.showGrid : true);
        setGridColor(data.gridColor || '#ffffff');
        setGridOpacity(
          data.gridOpacity !== undefined
            ? Math.max(0, Math.min(1, data.gridOpacity))
            : 0.2
        );
        setEnableDarkness(
          data.enableDarkness !== undefined ? data.enableDarkness : true
        );

        // Actualizar referencias previas para evitar guardado inmediato
        prevTokensRef.current = tokensWithIds;
        prevLinesRef.current = data.lines || [];
        prevWallsRef.current = data.walls || [];
        prevTextsRef.current = data.texts || [];
        prevBgRef.current = data.background || null;
        prevGridRef.current = {
          gridSize: data.gridSize || 1,
          gridCells: data.gridCells || 1,
          gridOffsetX: data.gridOffsetX || 0,
          gridOffsetY: data.gridOffsetY || 0,
          showGrid: data.showGrid !== undefined ? data.showGrid : true,
          gridColor: data.gridColor || '#ffffff',
          gridOpacity:
            data.gridOpacity !== undefined
              ? Math.max(0, Math.min(1, data.gridOpacity))
              : 0.2,
        };

        // Actualizar metadatos de la página
        setPages((ps) => {
          const existing = ps[currentPage];
          const meta = {
            ...existing,
            id: page.id,
            name: data.name || existing?.name,
            background: data.background || null,
            backgroundHash: data.backgroundHash || null,
            gridSize: data.gridSize || 1,
            gridCells: data.gridCells || 1,
            gridOffsetX: data.gridOffsetX || 0,
            gridOffsetY: data.gridOffsetY || 0,
          };
          if (pageDataEqual(existing, meta)) return ps;
          return ps.map((p, i) => (i === currentPage ? meta : p));
        });
      } catch (error) {
        console.error('Error cargando datos de página:', error);
      }
    };

    loadPageData();
  }, [currentPage, pages[currentPage]?.id]);

  // Timeout para debouncing de guardado de tokens del master
  const tokenSaveTimeout = useRef(null);

  useEffect(() => {
    if (!pagesLoadedRef.current) return;
    if (userType !== 'master') return;
    // No guardar automáticamente si estamos en vista de jugador simulada
    if (showPlayerBattleMap) return;
    const pageId = pages[currentPage]?.id;
    if (!pageId) return;
    if (deepEqual(canvasTokens, prevTokensRef.current)) return;
    if (settingsEditingCountRef.current > 0) { pendingTokenSaveRef.current = true; return; }

    const prevTokens = prevTokensRef.current;
    if (isRemoteTokenUpdate.current) {
      isRemoteTokenUpdate.current = false;
      isLocalTokenEdit.current = false;
      return;
    }
    if (!isLocalTokenEdit.current) return;

    console.log(
      'Programando guardado de tokens en página:',
      pageId,
      'currentPage:',
      currentPage
    );

    // Limpiar timeout anterior
    if (tokenSaveTimeout.current) {
      clearTimeout(tokenSaveTimeout.current);
    }

    // Debouncing: esperar 20ms antes de guardar
    tokenSaveTimeout.current = setTimeout(async () => {
      const saveId = ++saveVersionRef.current.tokens;

      const saveTokens = async () => {
        try {
          const tokens = await Promise.all(
            canvasTokens.map(async (t) => {
              if (t.url && t.url.startsWith('data:')) {
                const url = await uploadDataUrl(t.url, `canvas-tokens/${t.id}`);
                return { ...t, url };
              }
              return t;
            })
          );
          if (saveId !== saveVersionRef.current.tokens) {
            console.log('Guardado de tokens cancelado por cambio de página');
            return;
          }
          const tokensRef = collection(db, 'pages', pageId, 'tokens');
          const toDelete = prevTokens.filter(
            (pt) => !tokens.some((t) => t.id === pt.id)
          );
          await Promise.all([
            ...tokens.map((t) => setDoc(doc(tokensRef, String(t.id)), t)),
            ...toDelete.map((t) => deleteDoc(doc(tokensRef, String(t.id)))),
          ]);
          if (saveId !== saveVersionRef.current.tokens) {
            console.log(
              'Resultado de guardado de tokens ignorado por cambio de página'
            );
            return;
          }
          console.log('Tokens guardados exitosamente en página:', pageId);
        } catch (error) {
          console.error('Error guardando tokens:', error);
        } finally {
          isLocalTokenEdit.current = false;
          isRemoteTokenUpdate.current = false;
          prevTokensRef.current = canvasTokens;
        }
      };
      saveTokens();
    }, 20);
  }, [canvasTokens, currentPage]);

  useEffect(() => {
    canvasTokensRef.current = canvasTokens;
  }, [canvasTokens]);

  useEffect(() => {
    if (!pagesLoadedRef.current) return;
    if (userType !== 'master') return;
    const pageId = pages[currentPage]?.id;
    if (!pageId) return;
    if (deepEqual(canvasTexts, prevTextsRef.current)) return;

    console.log(
      'Guardando textos en página:',
      pageId,
      'currentPage:',
      currentPage
    );
    prevTextsRef.current = canvasTexts;

    const saveId = ++saveVersionRef.current.texts;

    updateDoc(doc(db, 'pages', pageId), { texts: canvasTexts })
      .then(() => {
        if (saveId !== saveVersionRef.current.texts) {
          console.log(
            'Resultado de guardado de textos ignorado por cambio de página'
          );
          return;
        }
        console.log('Textos guardados exitosamente en página:', pageId);
      })
      .catch((error) => console.error('Error guardando textos:', error));
  }, [canvasTexts, currentPage]);

  useEffect(() => {
    if (!pagesLoadedRef.current) return;
    if (userType !== 'master') return;
    const pageId = pages[currentPage]?.id;
    if (!pageId) return;
    if (deepEqual(canvasLines, prevLinesRef.current)) return;

    console.log(
      'Guardando líneas en página:',
      pageId,
      'currentPage:',
      currentPage
    );
    prevLinesRef.current = canvasLines;

    const saveId = ++saveVersionRef.current.lines;

    updateDoc(doc(db, 'pages', pageId), { lines: canvasLines })
      .then(() => {
        if (saveId !== saveVersionRef.current.lines) {
          console.log(
            'Resultado de guardado de líneas ignorado por cambio de página'
          );
          return;
        }
        console.log('Líneas guardadas exitosamente en página:', pageId);
      })
      .catch((error) => console.error('Error guardando líneas:', error));
  }, [canvasLines, currentPage]);

  useEffect(() => {
    if (!pagesLoadedRef.current) return;
    if (userType !== 'master') return;
    const pageId = pages[currentPage]?.id;
    if (!pageId) return;
    if (deepEqual(canvasWalls, prevWallsRef.current)) return;

    console.log(
      'Guardando muros en página:',
      pageId,
      'currentPage:',
      currentPage
    );
    prevWallsRef.current = canvasWalls;

    const saveId = ++saveVersionRef.current.walls;

    if (wallSaveTimeout.current) clearTimeout(wallSaveTimeout.current);
    wallSaveTimeout.current = setTimeout(() => {
      if (saveId !== saveVersionRef.current.walls) {
        console.log('Guardado de muros cancelado por cambio de página');
        return;
      }
      updateDoc(doc(db, 'pages', pageId), { walls: canvasWalls })
        .then(() => {
          if (saveId !== saveVersionRef.current.walls) {
            console.log(
              'Resultado de guardado de muros ignorado por cambio de página'
            );
            return;
          }
          console.log('Muros guardados exitosamente en página:', pageId);
        })
        .catch((error) => console.error('Error guardando muros:', error));
    }, 100);
    return () => {
      if (wallSaveTimeout.current) {
        clearTimeout(wallSaveTimeout.current);
        wallSaveTimeout.current = null;
      }
    };
  }, [canvasWalls, currentPage]);

  useEffect(() => {
    if (!pagesLoadedRef.current) return;
    if (userType !== 'master') return;
    const pageId = pages[currentPage]?.id;
    if (!pageId) return;
    if (canvasBackground === prevBgRef.current) return;

    console.log(
      'Guardando background en página:',
      pageId,
      'currentPage:',
      currentPage
    );
    let bg = canvasBackground;

    const saveId = ++saveVersionRef.current.background;

    const saveBg = async () => {
      try {
        if (bg && bg.startsWith('blob:')) return;
        if (bg && bg.startsWith('data:')) {
          bg = await uploadDataUrl(bg, `Mapas/${pageId}`);
        }
        if (saveId !== saveVersionRef.current.background) {
          console.log('Guardado de background cancelado por cambio de página');
          return;
        }
        await updateDoc(doc(db, 'pages', pageId), { background: bg });
        if (saveId !== saveVersionRef.current.background) {
          console.log(
            'Resultado de guardado de background ignorado por cambio de página'
          );
          return;
        }
        setPages((ps) =>
          ps.map((p, i) => (i === currentPage ? { ...p, background: bg } : p))
        );
        prevBgRef.current = bg;
        console.log('Background guardado exitosamente en página:', pageId);
      } catch (error) {
        console.error('Error guardando background:', error);
      }
    };
    saveBg();
  }, [canvasBackground, currentPage]);

  useEffect(() => {
    if (!pagesLoadedRef.current) return;
    if (userType !== 'master') return;
    const pageId = pages[currentPage]?.id;
    if (!pageId) return;
    const newGrid = {
      gridSize,
      gridCells,
      gridOffsetX,
      gridOffsetY,
      showGrid,
      gridColor,
      gridOpacity,
    };
    if (deepEqual(newGrid, prevGridRef.current)) return;

    console.log(
      'Guardando grid en página:',
      pageId,
      'currentPage:',
      currentPage
    );
    prevGridRef.current = newGrid;
    const saveId = ++saveVersionRef.current.grid;

    updateDoc(doc(db, 'pages', pageId), newGrid)
      .then(() => {
        if (saveId !== saveVersionRef.current.grid) {
          console.log(
            'Resultado de guardado de grid ignorado por cambio de página'
          );
          return;
        }
        console.log('Grid guardado exitosamente en página:', pageId);
        setPages((ps) =>
          ps.map((p, i) => (i === currentPage ? { ...p, ...newGrid } : p))
        );
      })
      .catch((error) => console.error('Error guardando grid:', error));
  }, [gridSize, gridCells, gridOffsetX, gridOffsetY, showGrid, gridColor, gridOpacity, currentPage]);

  // Función para crear un canvas con fondo blanco y grid negro
  const createDefaultGridCanvas = (
    width = 1500,
    height = 1000,
    cellSize = 50
  ) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Borde negro
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // Grid negro
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;

      // Líneas verticales
      for (let x = cellSize; x < width; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Líneas horizontales
      for (let y = cellSize; y < height; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error creando canvas por defecto:', error);
      // Fallback: usar una imagen simple
      return (
        'data:image/svg+xml;base64,' +
        btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white" stroke="black" stroke-width="2"/>
          <defs>
            <pattern id="grid" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
              <path d="M ${cellSize} 0 L 0 0 0 ${cellSize}" fill="none" stroke="black" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      `)
      );
    }
  };

  const addPage = async () => {
    // Crear canvas con fondo blanco y grid negro
    const defaultBackground = createDefaultGridCanvas(1500, 1000, 50);

    const newPage = {
      id: nanoid(),
      name: `Página ${pages.length + 1}`,
      background: defaultBackground, // Usar directamente el data URL
      backgroundHash: null,
      gridSize: 50,
      gridCells: 30,
      gridOffsetX: 0,
      gridOffsetY: 0,
      showGrid: true,
      gridColor: '#ffffff',
      gridOpacity: 0.2,
      enableDarkness: true,
      darknessOpacity: 0.7,
      lines: [],
      walls: [],
      texts: [],
    };
    await setDoc(doc(db, 'pages', newPage.id), sanitize(newPage));
    const { lines, walls, texts, ...meta } = newPage;
    setPages((ps) => [...ps, meta]);
    setCurrentPage(pages.length);
  };

  const updatePage = (index, data) => {
    const pageId = pages[index]?.id;
    if (pageId) {
      const { tokens, ...rest } = data;
      if (Object.keys(rest).length) updateDoc(doc(db, 'pages', pageId), rest);
      if (tokens) {
        const tokensRef = collection(db, 'pages', pageId, 'tokens');
        tokens.forEach((t) => setDoc(doc(tokensRef, String(t.id)), t));
      }
    }
    setPages((ps) => ps.map((p, i) => (i === index ? { ...p, ...data } : p)));
    if (index === currentPage) {
      if (data.gridSize !== undefined) setGridSize(data.gridSize);
      if (data.gridCells !== undefined) setGridCells(data.gridCells);
      if (data.gridOffsetX !== undefined) setGridOffsetX(data.gridOffsetX);
      if (data.gridOffsetY !== undefined) setGridOffsetY(data.gridOffsetY);
      if (data.showGrid !== undefined) setShowGrid(data.showGrid);
      if (data.gridColor !== undefined) setGridColor(data.gridColor);
      if (data.gridOpacity !== undefined)
        setGridOpacity(Math.max(0, Math.min(1, data.gridOpacity)));
      if (data.enableDarkness !== undefined)
        setEnableDarkness(data.enableDarkness);
      if (data.background !== undefined) setCanvasBackground(data.background);
      if (data.tokens !== undefined) {
        isRemoteTokenUpdate.current = true;
        setCanvasTokens(data.tokens);
      }
      if (data.lines !== undefined) setCanvasLines(data.lines);
      if (data.walls !== undefined) setCanvasWalls(data.walls);
      if (data.texts !== undefined) setCanvasTexts(data.texts);
    }
  };

  const deletePage = async (index) => {
    const p = pages[index];
    if (!p) return;
    if (!(await confirm(`¿Eliminar ${p.name}?`))) return;
    if (p.backgroundHash) {
      await releaseFile(p.backgroundHash);
    }
    await deleteDoc(doc(db, 'pages', p.id));
    setPages((ps) => ps.filter((_, i) => i !== index));
    setCurrentPage((cp) => {
      if (cp > index) return cp - 1;
      if (cp === index) return Math.max(0, cp - 1);
      return cp;
    });
  };
  // Sugerencias dinámicas para inputs de equipo
  const armaSugerencias = playerInputArma
    ? armas
        .filter(
          (a) =>
            a &&
            a.nombre &&
            a.nombre.toLowerCase().includes(playerInputArma.toLowerCase())
        )
        .slice(0, 5)
    : [];
  const armaduraSugerencias = playerInputArmadura
    ? armaduras
        .filter(
          (a) =>
            a &&
            a.nombre &&
            a.nombre.toLowerCase().includes(playerInputArmadura.toLowerCase())
        )
        .slice(0, 5)
    : [];
  const poderSugerencias = playerInputPoder
    ? habilidades
        .filter(
          (h) =>
            h &&
            h.nombre &&
            h.nombre.toLowerCase().includes(playerInputPoder.toLowerCase())
        )
        .slice(0, 5)
    : [];
  // Sugerencias dinámicas para inputs de equipo de enemigos
  const enemyArmaSugerencias = enemyInputArma
    ? armas
        .filter(
          (a) =>
            a &&
            a.nombre &&
            a.nombre.toLowerCase().includes(enemyInputArma.toLowerCase())
        )
        .slice(0, 5)
    : [];
  const enemyArmaduraSugerencias = enemyInputArmadura
    ? armaduras
        .filter(
          (a) =>
            a &&
            a.nombre &&
            a.nombre.toLowerCase().includes(enemyInputArmadura.toLowerCase())
        )
        .slice(0, 5)
    : [];
  const enemyPoderSugerencias = enemyInputPoder
    ? habilidades
        .filter(
          (h) =>
            h &&
            h.nombre &&
            h.nombre.toLowerCase().includes(enemyInputPoder.toLowerCase())
        )
        .slice(0, 5)
    : [];
  // ───────────────────────────────────────────────────────────
  // NAVIGATION
  // ───────────────────────────────────────────────────────────
  const volverAlMenu = () => {
    resetLogin();
    setChosenView(null);
    setNameEntered(false);
    setPlayerName('');
    setPlayerData({
      weapons: [],
      armaduras: [],
      poderes: [],
      claves: [],
      estados: [],
      atributos: {},
      stats: {},
      cargaAcumulada: { fisica: 0, mental: 0 },
      resistenciaFisica: 'vida',
      resistenciaMental: 'ingenio',
    });
    setPlayerError('');
    setPlayerInputArma('');
    setPlayerInputArmadura('');
    setPlayerArmaduraError('');
    setPlayerInputPoder('');
    setPlayerPoderError('');
    setNewResError('');
    setNewResName('');
    setNewResColor('#ffffff');
    setSearchTerm('');
    setShowAddResForm(
      typeof window !== 'undefined' ? window.innerWidth >= 640 : false
    );
    setEditingInfoId(null);
    setEditingInfoText('');
    setClaves([]);
    setEstados([]);
    setShowAddClaveForm(false);
    setNewClaveName('');
    setNewClaveColor('#ffffff');
    setNewClaveTotal(0);
    setNewClaveError('');
    setShowDiceCalculator(false);
    setShowBarraReflejos(false);
    setShowInitiativeTracker(false);
    setShowPlayerBattleMap(false);
  };
  const eliminarFichaJugador = async () => {
    if (!(await confirm(`¿Eliminar ficha de ${playerName}?`))) return;
    await deleteDoc(doc(db, 'players', playerName));
    await deleteDoc(doc(db, 'inventory', playerName));
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`player_${playerName}_backup`);
    }
    volverAlMenu();
  };
  const guardarDatosFicha = async () => {
    if (typeof window === 'undefined') return;
    const invSnap = await getDoc(doc(db, 'inventory', playerName));
    const snapshot = {
      playerData,
      resourcesList,
      claves,
      estados,
      inventory: invSnap.exists() ? invSnap.data() : null,
    };
    window.localStorage.setItem(
      `player_${playerName}_backup`,
      JSON.stringify(snapshot)
    );
  };
  const resetearFichaDesdeBackup = async () => {
    if (typeof window === 'undefined') return;
    const backup = window.localStorage.getItem(`player_${playerName}_backup`);
    if (backup) {
      const data = JSON.parse(backup);
      await savePlayer(
        data.playerData,
        data.resourcesList,
        data.claves,
        data.estados
      );
      setResourcesList(data.resourcesList || []);
      setClaves(data.claves || []);
      setEstados(data.estados || []);
      if (data.inventory) {
        await setDoc(doc(db, 'inventory', playerName), data.inventory);
      }
    }
  };
  // ───────────────────────────────────────────────────────────
  // FETCH EXISTING PLAYERS
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userType) return;
    getDocs(collection(db, 'players'))
      .then((snap) => {
        const players = snap.docs.map((d) => d.id);
        setExistingPlayers(players);
      })
      .catch((error) => {
        // Error cargando jugadores
      });
  }, [userType]);
  // ───────────────────────────────────────────────────────────
  // FETCH ARMAS
  // ───────────────────────────────────────────────────────────
  const [fetchArmasError, setFetchArmasError] = useState(false);
  const fetchArmas = useCallback(async () => {
    if (fetchArmasError) return;
    setLoading(true);
    try {
      let datos;
      try {
        const rows = await fetchSheetData(sheetId, 'Lista_Armas');
        if (rows && rows.length > 0) {
          datos = rows.map((obj) => {
            const rasgos = obj.RASGOS
              ? (obj.RASGOS.match(/\[[^\]]+\]/g) || []).map((s) =>
                  s.replace(/[[\]]/g, '').trim()
                )
              : [];
            return {
              nombre: obj.NOMBRE,
              dano: obj.DAÑO,
              alcance: obj.ALCANCE,
              consumo: obj.CONSUMO,
              carga: obj.CARGA,
              cuerpo: obj.CUERPO,
              mente: obj.MENTE,
              cargaFisica:
                obj.CARGA_FISICA ||
                obj['CARGA FISICA'] ||
                obj.CUERPO ||
                obj.CARGA ||
                '',
              cargaMental:
                obj.CARGA_MENTAL || obj['CARGA MENTAL'] || obj.MENTE || '',
              rasgos,
              descripcion: obj.DESCRIPCIÓN || '',
              tipoDano: obj.TIPO_DAÑO || obj['TIPO DAÑO'] || 'físico',
              valor: obj.VALOR || '',
              tecnologia: obj.TECNOLOGÍA || '',
              fuente: 'sheet',
            };
          });
        } else {
          datos = datosPruebaArmas.map((d) => ({ ...d, fuente: 'sheet' }));
        }
      } catch (err) {
        datos = datosPruebaArmas.map((d) => ({ ...d, fuente: 'sheet' }));
        setFetchArmasError(true);
      }
      try {
        const snap = await getDocs(collection(db, 'weapons'));
        const custom = snap.docs.map((d) => ({ ...d.data(), fuente: 'custom' }));
        datos = [...datos, ...custom];
      } catch (e) {}
      setArmas(datos);
    } finally {
      setLoading(false);
    }
  }, [sheetId, datosPruebaArmas, fetchArmasError]);
  useEffect(() => {
    fetchArmas();
  }, [fetchArmas]);
  // ───────────────────────────────────────────────────────────
  // FETCH ARMADURAS
  // ───────────────────────────────────────────────────────────
  const [fetchArmadurasError, setFetchArmadurasError] = useState(false);
  const fetchArmaduras = useCallback(async () => {
    if (fetchArmadurasError) return;
    setLoading(true);
    try {
      let datos;
      try {
        const rows = await fetchSheetData(sheetId, 'Lista_Armaduras');
        if (rows && rows.length > 0) {
          datos = rows.map((obj) => {
            const rasgos = obj.RASGOS
              ? (obj.RASGOS.match(/\[[^\]]+\]/g) || []).map((s) =>
                  s.replace(/[[\]]/g, '').trim()
                )
              : [];
            return {
              nombre: obj.NOMBRE,
              defensa: obj.ARMADURA,
              cuerpo: obj.CUERPO,
              mente: obj.MENTE,
              carga: obj.CARGA,
              cargaFisica:
                obj.CARGA_FISICA ||
                obj['CARGA FISICA'] ||
                obj.CUERPO ||
                obj.CARGA ||
                '',
              cargaMental:
                obj.CARGA_MENTAL || obj['CARGA MENTAL'] || obj.MENTE || '',
              rasgos,
              descripcion: obj.DESCRIPCIÓN || '',
              valor: obj.VALOR || '',
              tecnologia: obj.TECNOLOGÍA || '',
              fuente: 'sheet',
            };
          });
        } else {
          datos = datosPruebaArmaduras.map((d) => ({ ...d, fuente: 'sheet' }));
        }
      } catch (err) {
        datos = datosPruebaArmaduras.map((d) => ({ ...d, fuente: 'sheet' }));
        setFetchArmadurasError(true);
      }
      try {
        const snap = await getDocs(collection(db, 'armors'));
        const custom = snap.docs.map((d) => ({ ...d.data(), fuente: 'custom' }));
        datos = [...datos, ...custom];
      } catch (e) {}
      setArmaduras(datos);
    } finally {
      setLoading(false);
    }
  }, [sheetId, datosPruebaArmaduras, fetchArmadurasError]);
  useEffect(() => {
    fetchArmaduras();
  }, [fetchArmaduras]);
  // ───────────────────────────────────────────────────────────
  // FETCH HABILIDADES
  // ───────────────────────────────────────────────────────────
  const fetchHabilidades = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'abilities'));
      const datos = snap.docs.map((d) => d.data());
      setHabilidades(datos);
    } catch (e) {
      // Error cargando habilidades
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchHabilidades();
  }, [fetchHabilidades]);
  // ───────────────────────────────────────────────────────────
  // FETCH ENEMIGOS
  // ───────────────────────────────────────────────────────────
  const fetchEnemies = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'enemies'));
      const datos = snap.docs.map((d) =>
        ensureEnemyDefaults({ id: d.id, ...d.data() })
      );
      setEnemies(datos);
    } catch (e) {
      // Error cargando enemigos
    }
  }, []);
  useEffect(() => {
    fetchEnemies();
  }, [fetchEnemies]);
  const refreshCatalog = () => {
    fetchArmas();
    fetchArmaduras();
    fetchHabilidades();
    fetchEnemies();
  };
  // ───────────────────────────────────────────────────────────
  // FUNCIONES PARA CARGAR Y GUARDAR
  // ───────────────────────────────────────────────────────────
  // 1) CARGA DE PLAYER DATA
  const loadPlayer = useCallback(async () => {
    if (!playerName) return;

    try {
      const docRef = doc(db, 'players', playerName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const recalculated = applyCargaPenalties(
          data,
          armas,
          armaduras,
          playerName
        );
        setPlayerData(recalculated);
        setResourcesList(recalculated.resourcesList || []);
        setClaves(recalculated.claves || []);
        setEstados(recalculated.estados || []);
      } else {
        const defaultData = {
          weapons: [],
          armaduras: [],
          poderes: [],
          claves: [],
          estados: [],
          atributos: {
            fuerza: 0,
            destreza: 0,
            constitucion: 0,
            inteligencia: 0,
            sabiduria: 0,
            carisma: 0,
          },
          stats: { ...defaultStats },
          cargaAcumulada: { fisica: 0, mental: 0 },
          resistenciaFisica: 'vida',
          resistenciaMental: 'ingenio',
          resourcesList: defaultResourcesList,
          updatedAt: new Date(),
        };
        setPlayerData(defaultData);
        setResourcesList(defaultResourcesList);
        setClaves([]);
        setEstados([]);
      }
    } catch (error) {
      // Error cargando jugador
      const defaultData = {
        weapons: [],
        armaduras: [],
        poderes: [],
        claves: [],
        estados: [],
        atributos: {
          fuerza: 0,
          destreza: 0,
          constitucion: 0,
          inteligencia: 0,
          sabiduria: 0,
          carisma: 0,
        },
        stats: { ...defaultStats },
        cargaAcumulada: { fisica: 0, mental: 0 },
        resistenciaFisica: 'vida',
        resistenciaMental: 'ingenio',
        resourcesList: defaultResourcesList,
        updatedAt: new Date(),
      };
      setPlayerData(defaultData);
      setResourcesList(defaultResourcesList);
      setClaves([]);
      setEstados([]);
    }
  }, [playerName, armas, armaduras, setResourcesList]);

  // useEffect que llama a loadPlayer una vez que se ingresó el nombre
  useEffect(() => {
    if (nameEntered) {
      loadPlayer();
    }
  }, [loadPlayer, nameEntered]);

  useEffect(() => {
    const updateFromSheet = (sheet) => {
      setPlayerData(sheet);
      setResourcesList(sheet.resourcesList || []);
      setClaves(sheet.claves || []);
      setEstados(sheet.estados || []);
    };

    const handler = (e) => {
      const { name, sheet } = e.detail || {};
      if (name !== playerName) return;
      updateFromSheet(sheet);
    };

    const storageHandler = (e) => {
      if (e.key !== `player_${playerName}` || !e.newValue) return;
      try {
        const sheet = JSON.parse(e.newValue);
        updateFromSheet(sheet);
      } catch (err) {
        console.error('invalid sheet from storage', err);
      }
    };

    window.addEventListener('playerSheetSaved', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('playerSheetSaved', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, [playerName]);

  // Debug: Monitorear cambios en playerData
  useEffect(() => {
    // playerData actualizado
  }, [playerData]);

  // Debug: Monitorear cambios en armas y armaduras
  useEffect(() => {
    // armas actualizadas
  }, [armas]);

  useEffect(() => {
    // armaduras actualizadas
  }, [armaduras]);
  // 2) savePlayer: guarda todos los datos en Firestore
  //    Acepta parámetros opcionales para recursos y claves.
  const savePlayer = async (
    data,
    listaParaGuardar = resourcesList,
    clavesParaGuardar = claves,
    estadosParaGuardar = estados
  ) => {
    const recalculated = applyCargaPenalties(
      data,
      armas,
      armaduras,
      playerName
    );
    const fullData = {
      ...recalculated,
      resourcesList: listaParaGuardar,
      claves: clavesParaGuardar,
      estados: estadosParaGuardar,
      updatedAt: new Date(),
    };
    setPlayerData(fullData);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `player_${playerName}`,
        JSON.stringify(fullData)
      );
      window.dispatchEvent(
        new CustomEvent('playerSheetSaved', {
          detail: { name: playerName, sheet: fullData },
        })
      );
    }
    try {
      await setDoc(doc(db, 'players', playerName), fullData);
    } catch (e) {
      console.error(e);
    }
  };
  // 3) HANDLERS para atributos, stats, buff, nerf, eliminar y añadir recurso
  const handleAtributoChange = (k, v) => {
    const newAtributos = { ...playerData.atributos, [k]: v };
    savePlayer({ ...playerData, atributos: newAtributos });
  };
  const handleStatChange = (r, field, val) => {
    let v = parseInt(val) || 0;
    v = Math.max(0, Math.min(v, RESOURCE_MAX));
    const s = { ...playerData.stats[r] };
    if (field === 'base') {
      s.base = v;
      s.total = v;
      if (s.actual > v) s.actual = v;
    }
    if (field === 'actual') {
      s.actual = Math.min(v, s.total + s.buff, RESOURCE_MAX);
    }
    const newStats = { ...playerData.stats, [r]: s };
    savePlayer({ ...playerData, stats: newStats });
  };
  const handleAddBuff = (r) => {
    const s = { ...playerData.stats[r] };
    s.buff = (s.buff || 0) + 1;
    const newStats = { ...playerData.stats, [r]: s };
    savePlayer({ ...playerData, stats: newStats });
  };
  const handleIncrease = (r) => {
    const s = { ...playerData.stats[r] };
    const maxBase = Math.min(RESOURCE_MAX, (s.total || 0) - (s.buff || 0));
    s.actual = Math.min(s.actual + 1, maxBase);
    const newStats = { ...playerData.stats, [r]: s };
    savePlayer({ ...playerData, stats: newStats });
  };
  const handleNerf = (r) => {
    const s = { ...playerData.stats[r] };
    if (s.buff > 0) {
      s.buff--;
    } else {
      s.actual = Math.max(0, s.actual - 1);
    }
    const newStats = { ...playerData.stats, [r]: s };
    savePlayer({ ...playerData, stats: newStats });
  };
  const handleResistenciaChange = (tipo, statId) => {
    const newData =
      tipo === 'fisica'
        ? { ...playerData, resistenciaFisica: statId }
        : { ...playerData, resistenciaMental: statId };
    savePlayer(newData);
  };
  const handleEliminarRecurso = async (id) => {
    if (id === 'postura') {
      const carga = playerData.cargaAcumulada?.fisica || 0;
      const icono = cargaFisicaIcon(carga);
      if (
        !(await confirm(
          `¿Estás seguro? Si eliminas Postura, tu carga física ${icono} (${carga}) quedará pendiente y ya no podrás ver penalización hasta que vuelvas a crear Postura.`
        ))
      )
        return;
    }
    if (id === 'cordura') {
      const carga = playerData.cargaAcumulada?.mental || 0;
      const icono = cargaMentalIcon(carga);
      if (
        !(await confirm(
          `¿Estás seguro? Si eliminas Cordura, tu carga mental ${icono} (${carga}) quedará pendiente y ya no podrás ver penalización hasta que vuelvas a crear Cordura.`
        ))
      )
        return;
    }

    eliminarRecurso(id);
  };

  // Funciones para reordenar estadísticas
  const moveStatUp = (index) => {
    if (index === 0) return; // Ya está en la primera posición
    const newList = [...resourcesList];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    setResourcesList(newList);
    savePlayer(playerData, newList);
  };
  const moveStatDown = (index) => {
    if (index === resourcesList.length - 1) return; // Ya está en la última posición
    const newList = [...resourcesList];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    setResourcesList(newList);
    savePlayer(playerData, newList);
  };
  const agregarArma = async () => {
    const { nombre } = newWeaponData;
    if (!nombre.trim()) {
      setNewWeaponError('Nombre requerido');
      return;
    }
    try {
      if (editingWeapon && editingWeapon !== nombre) {
        await deleteDoc(doc(db, 'weapons', editingWeapon));
      }
      const dataToSave = {
        ...newWeaponData,
        rasgos: (newWeaponData.rasgos || '')
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      };
      await setDoc(doc(db, 'weapons', nombre), dataToSave);
      setEditingWeapon(null);
      setNewWeaponData({
        nombre: '',
        dano: '',
        alcance: '',
        consumo: '',
        cargaFisica: '',
        cargaMental: '',
        rasgos: '',
        descripcion: '',
        tipoDano: '',
        valor: '',
        tecnologia: '',
      });
      setNewWeaponError('');
      fetchArmas();
    } catch (e) {
      setNewWeaponError('Error al guardar');
    }
  };
  const startEditWeapon = (weapon) => {
    setNewWeaponData({
      ...weapon,
      rasgos: Array.isArray(weapon.rasgos)
        ? weapon.rasgos.join(', ')
        : weapon.rasgos || '',
    });
    setEditingWeapon(weapon.nombre);
  };
  const deleteWeapon = async (name) => {
    try {
      await deleteDoc(doc(db, 'weapons', name));
      if (editingWeapon === name) {
        setEditingWeapon(null);
        setNewWeaponData({
          nombre: '',
          dano: '',
          alcance: '',
          consumo: '',
          cargaFisica: '',
          cargaMental: '',
          rasgos: '',
          descripcion: '',
          tipoDano: '',
          valor: '',
          tecnologia: '',
        });
      }
      fetchArmas();
    } catch (e) {}
  };
  const agregarArmadura = async () => {
    const { nombre } = newArmorData;
    if (!nombre.trim()) {
      setNewArmorError('Nombre requerido');
      return;
    }
    try {
      if (editingArmor && editingArmor !== nombre) {
        await deleteDoc(doc(db, 'armors', editingArmor));
      }
      const dataToSave = {
        ...newArmorData,
        rasgos: (newArmorData.rasgos || '')
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      };
      await setDoc(doc(db, 'armors', nombre), dataToSave);
      setEditingArmor(null);
      setNewArmorData({
        nombre: '',
        defensa: '',
        cargaFisica: '',
        cargaMental: '',
        rasgos: '',
        descripcion: '',
        valor: '',
        tecnologia: '',
      });
      setNewArmorError('');
      fetchArmaduras();
    } catch (e) {
      setNewArmorError('Error al guardar');
    }
  };
  const startEditArmor = (armor) => {
    setNewArmorData({
      ...armor,
      rasgos: Array.isArray(armor.rasgos)
        ? armor.rasgos.join(', ')
        : armor.rasgos || '',
    });
    setEditingArmor(armor.nombre);
  };
  const deleteArmor = async (name) => {
    try {
      await deleteDoc(doc(db, 'armors', name));
      if (editingArmor === name) {
        setEditingArmor(null);
        setNewArmorData({
          nombre: '',
          defensa: '',
          cargaFisica: '',
          cargaMental: '',
          rasgos: '',
          descripcion: '',
          valor: '',
          tecnologia: '',
        });
      }
      fetchArmaduras();
    } catch (e) {}
  };
  const agregarHabilidad = async () => {
    const { nombre } = newAbility;
    if (!nombre.trim()) {
      setNewAbilityError('Nombre requerido');
      return;
    }
    try {
      if (editingAbility && editingAbility !== nombre) {
        await deleteDoc(doc(db, 'abilities', editingAbility));
      }
      const dataToSave = {
        ...newAbility,
        rasgos: (newAbility.rasgos || '')
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      };
      await setDoc(doc(db, 'abilities', nombre), dataToSave);
      setEditingAbility(null);
      setNewAbility({
        nombre: '',
        alcance: '',
        consumo: '',
        cuerpo: '',
        mente: '',
        poder: '',
        rasgos: '',
        descripcion: '',
      });
      setNewAbilityError('');
      fetchHabilidades();
    } catch (e) {
      setNewAbilityError('Error al guardar');
    }
  };
  const startEditAbility = (ability) => {
    setNewAbility({
      ...ability,
      rasgos: Array.isArray(ability.rasgos)
        ? ability.rasgos.join(', ')
        : ability.rasgos || '',
    });
    setEditingAbility(ability.nombre);
  };
  const deleteAbility = async (name) => {
    try {
      await deleteDoc(doc(db, 'abilities', name));
      if (editingAbility === name) {
        setEditingAbility(null);
        setNewAbility({
          nombre: '',
          alcance: '',
          consumo: '',
          cuerpo: '',
          mente: '',
          poder: '',
          descripcion: '',
        });
      }
      fetchHabilidades();
    } catch (e) {}
  };
  // ───────────────────────────────────────────────────────────
  // FUNCIONES PARA ENEMIGOS
  // ───────────────────────────────────────────────────────────
  const saveEnemy = async (enemyData) => {
    try {
      const normalized = ensureEnemyDefaults(enemyData);
      const enemyId = enemyData.id || normalized.id || `enemy_${Date.now()}`;
      const dataToSave = {
        ...normalized,
        id: enemyId,
        tags: sanitizeEnemyTags(normalized.tags),
        themeColor: normalizeHexColor(normalized.themeColor),
        updatedAt: new Date(),
      };
      await setDoc(doc(db, 'enemies', enemyId), dataToSave);
      fetchEnemies();
      return enemyId;
    } catch (e) {
      throw e;
    }
  };
  const deleteEnemy = async (enemyId) => {
    try {
      await deleteDoc(doc(db, 'enemies', enemyId));
      fetchEnemies();
      if (selectedEnemy?.id === enemyId) {
        setSelectedEnemy(null);
      }
    } catch (e) {}
  };
  const createNewEnemy = () => {
    const baseAtributos = {};
    atributos.forEach((k) => (baseAtributos[k] = 'D4'));
    const baseStats = { ...defaultStats };
    const baseEnemy = createEnemyDefaults();
    setNewEnemy({
      ...baseEnemy,
      atributos: baseAtributos,
      stats: baseStats,
    });
    setEnemyTagInput('');
    setEnemyEditingTagIndex(null);
    setEnemyTagDraft('');
    setEnemyThemeColorDraft(baseEnemy.themeColor);
    setEditingEnemy(null);
    setShowEnemyForm(true);
  };
  const editEnemy = (enemy) => {
    const normalized = ensureEnemyDefaults(enemy);
    setNewEnemy(normalized);
    setEnemyTagInput('');
    setEnemyEditingTagIndex(null);
    setEnemyTagDraft('');
    setEnemyThemeColorDraft(normalized.themeColor || DEFAULT_ENEMY_THEME_COLOR);
    setEditingEnemy(enemy.id);
    setSelectedEnemy(null); // Close preview when switching to edit mode
    setShowEnemyForm(true);
  };

  const duplicateEnemy = async (enemy) => {
    if (!enemy) return;
    try {
      const normalized = ensureEnemyDefaults(enemy);
      const { id, updatedAt, ...rest } = normalized;
      const copy = {
        ...rest,
        name: normalized.name
          ? `${normalized.name} (copia)`
          : 'Enemigo (copia)',
      };
      const newId = await saveEnemy(copy);
      const saved = { ...copy, id: newId };
      setSelectedEnemy(saved);
    } catch (e) {
      console.error('Error duplicando enemigo', e);
    }
  };

  const sendEnemyToMap = async (enemy) => {
    try {
      const pageId = pages[currentPage]?.id || pages[0]?.id;
      if (!pageId || !enemy) return;
      const tokensRef = collection(doc(db, 'pages', pageId), 'tokens');
      // Preparar una hoja propia de token clonando la ficha del enemigo
      const tokenSheetId = nanoid();
      const clonedSheet = ensureSheetDefaults({ id: tokenSheetId, ...enemy });
      await saveTokenSheet(clonedSheet);

      // Colocar en el centro aproximado del mapa
      const pg = pages.find((p) => p.id === pageId) || {};
      const cells = Math.max(1, pg.gridCells || 30);
      const centerCell = Math.floor(cells / 2);
      const docRef = await addDoc(tokensRef, {
        x: centerCell,
        y: centerCell,
        url: enemy.portrait || '',
        name: enemy.name || 'Enemigo',
        enemyId: enemy.id,
        tokenSheetId,
        showName: false,
        controlledBy: 'master',
        barsVisibility: 'all',
        opacity: 1,
      });
      // Cambiar a la vista de mapa y centrar el nuevo token
      setChosenView('canvas');
      setTimeout(() => {
        try {
          window.dispatchEvent(
            new CustomEvent('focusToken', { detail: { tokenId: docRef.id } })
          );
        } catch {}
      }, 400);
    } catch (e) {
      console.error('Error enviando enemigo al mapa', e);
    }
  };

  const updateEnemyFromToken = async (enemy) => {
    await saveEnemy(enemy);
    setEnemies((prev) => prev.map((e) => (e.id === enemy.id ? enemy : e)));
    setCanvasTokens((prev) =>
      prev.map((t) =>
        t.enemyId === enemy.id
          ? { ...t, url: enemy.portrait || t.url, name: enemy.name }
          : t
      )
    );
    isRemoteTokenUpdate.current = false;
    isLocalTokenEdit.current = true;
  };
  const handleSaveEnemy = async () => {
    if (!newEnemy.name.trim()) {
      alert('El nombre del enemigo es requerido');
      return;
    }
    try {
      // Si estamos editando, usar el ID existente; si no, generar uno nuevo
      const enemyToSave = ensureEnemyDefaults({
        ...newEnemy,
        id: editingEnemy || `enemy_${Date.now()}`,
      });
      await saveEnemy(enemyToSave);
      setShowEnemyForm(false);
      const defaults = createEnemyDefaults();
      setNewEnemy(defaults);
      setEnemyTagInput('');
      setEnemyEditingTagIndex(null);
      setEnemyTagDraft('');
      setEnemyThemeColorDraft(defaults.themeColor);
      setEditingEnemy(null);
      setEnemyInputArma('');
      setEnemyInputArmadura('');
      setEnemyInputPoder('');
      setEnemyArmaError('');
      setEnemyArmaduraError('');
      setEnemyPoderError('');
    } catch (e) {
      alert('Error al guardar el enemigo: ' + e.message);
    }
  };
  const resizeImage = (
    file,
    maxWidth = 300,
    maxHeight = 300,
    quality = 0.8
  ) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        // Convertir a base64 con calidad reducida
        const resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedDataUrl);
      };
      img.src = URL.createObjectURL(file);
    });
  };
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Selecciona un archivo menor a 10MB');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageCropSource(reader.result);
      setImageCropName(file.name || 'retrato.jpg');
      setImageCrop({ x: 0, y: 0 });
      setImageCropZoom(1);
      setImageCropAreaPixels(null);
      setShowImageCropper(true);
    };
    reader.onerror = () => {
      alert('No se pudo leer la imagen seleccionada. Intenta nuevamente.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCropComplete = useCallback((_, croppedAreaPixelsValue) => {
    setImageCropAreaPixels(croppedAreaPixelsValue);
  }, []);

  const closeCropper = useCallback(() => {
    setShowImageCropper(false);
    setImageCropSource(null);
    setImageCropAreaPixels(null);
    setImageCrop({ x: 0, y: 0 });
    setImageCropZoom(1);
    setImageCropLoading(false);
  }, []);

  const handleConfirmCrop = useCallback(async () => {
    if (!imageCropSource || !imageCropAreaPixels) {
      alert('Selecciona el encuadre que deseas guardar.');
      return;
    }

    try {
      setImageCropLoading(true);
      const croppedDataUrl = await cropImageToDataUrl(
        imageCropSource,
        imageCropAreaPixels,
        900,
        900,
        0.92
      );
      const croppedFile = await dataUrlToFile(
        croppedDataUrl,
        imageCropName || 'retrato.jpg'
      );
      if (!croppedFile) throw new Error('No se pudo preparar el archivo recortado');
      let optimizedImage = await resizeImage(croppedFile, 900, 900, 0.88);
      if (optimizedImage.length > 900000) {
        optimizedImage = await resizeImage(croppedFile, 650, 650, 0.76);
      }
      setNewEnemy((prev) => ({ ...prev, portrait: optimizedImage }));
      closeCropper();
    } catch (error) {
      console.error('Error recortando la imagen del enemigo', error);
      alert('Error al recortar la imagen. Intenta nuevamente con otro archivo.');
    } finally {
      setImageCropLoading(false);
    }
  }, [
    imageCropSource,
    imageCropAreaPixels,
    imageCropName,
    closeCropper,
    resizeImage,
  ]);

  const handleRecropPortrait = useCallback(() => {
    if (!newEnemy?.portrait) return;
    setImageCropSource(newEnemy.portrait);
    setImageCropName('retrato.jpg');
    setImageCrop({ x: 0, y: 0 });
    setImageCropZoom(1);
    setImageCropAreaPixels(null);
    setShowImageCropper(true);
  }, [newEnemy?.portrait]);
  // ───────────────────────────────────────────────────────────
  // FUNCIONES PARA EQUIPAR ITEMS A ENEMIGOS
  // ───────────────────────────────────────────────────────────
  const handleEnemyEquipWeapon = () => {
    if (loading) return;
    const f = armas.find(
      (a) =>
        a &&
        a.nombre.toLowerCase().includes(enemyInputArma.trim().toLowerCase())
    );
    if (!f) return setEnemyArmaError('Arma no encontrada');
    if (showEnemyForm) {
      if (!newEnemy.weapons.some((w) => w.nombre === f.nombre)) {
        setNewEnemy({ ...newEnemy, weapons: [...newEnemy.weapons, f] });
        setEnemyInputArma('');
        setEnemyArmaError('');
      }
    } else if (
      selectedEnemy &&
      !selectedEnemy.weapons.some((w) => w.nombre === f.nombre)
    ) {
      setSelectedEnemy({
        ...selectedEnemy,
        weapons: [...selectedEnemy.weapons, f],
      });
      setEnemyInputArma('');
      setEnemyArmaError('');
    }
  };
  const handleEnemyEquipWeaponFromSuggestion = (name) => {
    const w = armas.find((a) => a && a.nombre === name);
    if (!w) return setEnemyArmaError('Arma no encontrada');
    if (showEnemyForm) {
      if (!newEnemy.weapons.some((weapon) => weapon.nombre === w.nombre)) {
        setNewEnemy({ ...newEnemy, weapons: [...newEnemy.weapons, w] });
        setEnemyInputArma('');
        setEnemyArmaError('');
      }
    } else if (
      selectedEnemy &&
      !selectedEnemy.weapons.some((weapon) => weapon.nombre === w.nombre)
    ) {
      setSelectedEnemy({
        ...selectedEnemy,
        weapons: [...selectedEnemy.weapons, w],
      });
      setEnemyInputArma('');
      setEnemyArmaError('');
    }
  };
  const handleEnemyEquipArmor = () => {
    if (loading) return;
    const f = armaduras.find(
      (a) =>
        a &&
        a.nombre.toLowerCase().includes(enemyInputArmadura.trim().toLowerCase())
    );
    if (!f) return setEnemyArmaduraError('Armadura no encontrada');
    if (showEnemyForm) {
      if (!newEnemy.armaduras.some((a) => a.nombre === f.nombre)) {
        setNewEnemy({ ...newEnemy, armaduras: [...newEnemy.armaduras, f] });
        setEnemyInputArmadura('');
        setEnemyArmaduraError('');
      }
    } else if (
      selectedEnemy &&
      !selectedEnemy.armaduras.some((a) => a.nombre === f.nombre)
    ) {
      setSelectedEnemy({
        ...selectedEnemy,
        armaduras: [...selectedEnemy.armaduras, f],
      });
      setEnemyInputArmadura('');
      setEnemyArmaduraError('');
    }
  };
  const handleEnemyEquipArmorFromSuggestion = (name) => {
    const a = armaduras.find((x) => x && x.nombre === name);
    if (!a) return setEnemyArmaduraError('Armadura no encontrada');
    if (showEnemyForm) {
      if (!newEnemy.armaduras.some((armor) => armor.nombre === a.nombre)) {
        setNewEnemy({ ...newEnemy, armaduras: [...newEnemy.armaduras, a] });
        setEnemyInputArmadura('');
        setEnemyArmaduraError('');
      }
    } else if (
      selectedEnemy &&
      !selectedEnemy.armaduras.some((armor) => armor.nombre === a.nombre)
    ) {
      setSelectedEnemy({
        ...selectedEnemy,
        armaduras: [...selectedEnemy.armaduras, a],
      });
      setEnemyInputArmadura('');
      setEnemyArmaduraError('');
    }
  };
  const handleEnemyEquipPower = () => {
    if (loading) return;
    const f = habilidades.find(
      (h) =>
        h &&
        h.nombre &&
        h.nombre.toLowerCase().includes(enemyInputPoder.trim().toLowerCase())
    );
    if (!f) return setEnemyPoderError('Poder no encontrado');
    if (showEnemyForm) {
      if (!newEnemy.poderes.some((p) => p.nombre === f.nombre)) {
        setNewEnemy({ ...newEnemy, poderes: [...newEnemy.poderes, f] });
        setEnemyInputPoder('');
        setEnemyPoderError('');
      }
    } else if (
      selectedEnemy &&
      !selectedEnemy.poderes.some((p) => p.nombre === f.nombre)
    ) {
      setSelectedEnemy({
        ...selectedEnemy,
        poderes: [...selectedEnemy.poderes, f],
      });
      setEnemyInputPoder('');
      setEnemyPoderError('');
    }
  };
  const handleEnemyEquipPowerFromSuggestion = (name) => {
    const h = habilidades.find((x) => x && x.nombre === name);
    if (!h) return setEnemyPoderError('Poder no encontrado');
    if (showEnemyForm) {
      if (!newEnemy.poderes.some((power) => power.nombre === h.nombre)) {
        setNewEnemy({ ...newEnemy, poderes: [...newEnemy.poderes, h] });
        setEnemyInputPoder('');
        setEnemyPoderError('');
      }
    } else if (
      selectedEnemy &&
      !selectedEnemy.poderes.some((power) => power.nombre === h.nombre)
    ) {
      setSelectedEnemy({
        ...selectedEnemy,
        poderes: [...selectedEnemy.poderes, h],
      });
      setEnemyInputPoder('');
      setEnemyPoderError('');
    }
  };
  const unequipEnemyWeapon = (index) => {
    if (showEnemyForm) {
      const updatedWeapons = newEnemy.weapons.filter((_, i) => i !== index);
      setNewEnemy({ ...newEnemy, weapons: updatedWeapons });
    } else if (selectedEnemy) {
      const updatedWeapons = selectedEnemy.weapons.filter(
        (_, i) => i !== index
      );
      setSelectedEnemy({ ...selectedEnemy, weapons: updatedWeapons });
    }
  };
  const unequipEnemyArmor = (index) => {
    if (showEnemyForm) {
      const updatedArmors = newEnemy.armaduras.filter((_, i) => i !== index);
      setNewEnemy({ ...newEnemy, armaduras: updatedArmors });
    } else if (selectedEnemy) {
      const updatedArmors = selectedEnemy.armaduras.filter(
        (_, i) => i !== index
      );
      setSelectedEnemy({ ...selectedEnemy, armaduras: updatedArmors });
    }
  };
  const unequipEnemyPower = (index) => {
    if (showEnemyForm) {
      const updatedPowers = newEnemy.poderes.filter((_, i) => i !== index);
      setNewEnemy({ ...newEnemy, poderes: updatedPowers });
    } else if (selectedEnemy) {
      const updatedPowers = selectedEnemy.poderes.filter((_, i) => i !== index);
      setSelectedEnemy({ ...selectedEnemy, poderes: updatedPowers });
    }
  };
  // ───────────────────────────────────────────────────────────
  // HANDLERS para Login y Equipo de objetos
  // ───────────────────────────────────────────────────────────
  const enterPlayer = () => {
    const trimmed = playerName.trim();
    if (trimmed) {
      setPlayerName(trimmed);
      setNameEntered(true);
    }
  };
  const handlePlayerEquip = () => {
    if (loading) return;
    const nombreArma = playerInputArma.trim();
    if (!nombreArma) return setPlayerError('Nombre de arma requerido');

    const f = armas.find(
      (a) =>
        a &&
        a.nombre &&
        a.nombre.toLowerCase().includes(nombreArma.toLowerCase())
    );
    if (!f) {
      return setPlayerError('Arma no encontrada');
    }

    // Agregar el arma si no está ya equipada
    if (!playerData.weapons.includes(f.nombre)) {
      const newWeapons = [...playerData.weapons, f.nombre];
      savePlayer({ ...playerData, weapons: newWeapons });
      setPlayerInputArma('');
      setPlayerError('');
    } else {
      setPlayerError('Arma ya equipada');
    }
  };
  const handlePlayerUnequip = (n) => {
    savePlayer({
      ...playerData,
      weapons: playerData.weapons.filter((x) => x !== n),
    });
  };
  const handlePlayerEquipFromSuggestion = (name) => {
    const w = armas.find((a) => a && a.nombre === name);
    if (!w) return setPlayerError('Arma no encontrada');

    if (!playerData.weapons.includes(w.nombre)) {
      const newWeapons = [...playerData.weapons, w.nombre];
      savePlayer({ ...playerData, weapons: newWeapons });
      setPlayerInputArma('');
      setPlayerError('');
    } else {
      setPlayerError('Arma ya equipada');
    }
  };
  const handlePlayerEquipArmadura = () => {
    if (loading) return;
    const nombreArmadura = playerInputArmadura.trim();
    if (!nombreArmadura)
      return setPlayerArmaduraError('Nombre de armadura requerido');

    const f = armaduras.find(
      (a) =>
        a &&
        a.nombre &&
        a.nombre.toLowerCase().includes(nombreArmadura.toLowerCase())
    );
    if (!f) {
      return setPlayerArmaduraError('Armadura no encontrada');
    }

    // Agregar la armadura si no está ya equipada
    if (!playerData.armaduras.includes(f.nombre)) {
      const newArmaduras = [...playerData.armaduras, f.nombre];
      savePlayer({ ...playerData, armaduras: newArmaduras });
      setPlayerInputArmadura('');
      setPlayerArmaduraError('');
    } else {
      setPlayerArmaduraError('Armadura ya equipada');
    }
  };
  const handlePlayerUnequipArmadura = (n) => {
    savePlayer({
      ...playerData,
      armaduras: playerData.armaduras.filter((x) => x !== n),
    });
  };
  const handlePlayerEquipArmaduraFromSuggestion = (name) => {
    const a = armaduras.find((x) => x && x.nombre === name);
    if (!a) return setPlayerArmaduraError('Armadura no encontrada');

    if (!playerData.armaduras.includes(a.nombre)) {
      const newArmaduras = [...playerData.armaduras, a.nombre];
      savePlayer({ ...playerData, armaduras: newArmaduras });
      setPlayerInputArmadura('');
      setPlayerArmaduraError('');
    } else {
      setPlayerArmaduraError('Armadura ya equipada');
    }
  };
  const handlePlayerEquipPoder = () => {
    if (loading) return;
    const f = habilidades.find(
      (h) =>
        h &&
        h.nombre &&
        h.nombre.toLowerCase().includes(playerInputPoder.trim().toLowerCase())
    );
    if (!f) return setPlayerPoderError('Poder no encontrado');
    if (!playerData.poderes.includes(f.nombre)) {
      savePlayer({ ...playerData, poderes: [...playerData.poderes, f.nombre] });
      setPlayerInputPoder('');
      setPlayerPoderError('');
    }
  };
  const handlePlayerUnequipPoder = (n) => {
    savePlayer({
      ...playerData,
      poderes: playerData.poderes.filter((x) => x !== n),
    });
  };
  const handlePlayerEquipPoderFromSuggestion = (name) => {
    const h = habilidades.find((x) => x && x.nombre === name);
    if (!h) return setPlayerPoderError('Poder no encontrado');
    if (!playerData.poderes.includes(h.nombre)) {
      savePlayer({ ...playerData, poderes: [...playerData.poderes, h.nombre] });
      setPlayerInputPoder('');
      setPlayerPoderError('');
    }
  };
  // ────────────────────────────────
  // Claves handlers
  // ────────────────────────────────
  const handleClaveChange = (id, field, val) => {
    const v = parseInt(val) || 0;
    const list = claves.map((c) =>
      c.id === id ? { ...c, [field]: Math.max(0, Math.min(v, CLAVE_MAX)) } : c
    );
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
  };
  const handleClaveIncrement = (id, delta) => {
    const list = claves.map((c) => {
      if (c.id !== id) return c;
      const newActual = Math.max(
        0,
        Math.min((c.actual || 0) + delta, c.total || CLAVE_MAX)
      );
      return { ...c, actual: newActual };
    });
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
  };
  const handleClaveReset = (id) => {
    const list = claves.map((c) =>
      c.id === id ? { ...c, actual: c.total } : c
    );
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
  };
  const handleAddClave = () => {
    const nombre = newClaveName.trim();
    if (!nombre) {
      setNewClaveError('Nombre requerido');
      return;
    }
    const nueva = {
      id: `clave${Date.now()}`,
      name: nombre,
      color: newClaveColor,
      total: Math.max(0, Math.min(parseInt(newClaveTotal) || 0, CLAVE_MAX)),
      actual: Math.max(0, Math.min(parseInt(newClaveTotal) || 0, CLAVE_MAX)),
    };
    const list = [...claves, nueva];
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
    setShowAddClaveForm(false);
    setNewClaveName('');
    setNewClaveColor('#ffffff');
    setNewClaveTotal(0);
    setNewClaveError('');
  };
  const handleRemoveClave = (id) => {
    const list = claves.filter((c) => c.id !== id);
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
  };
  // ────────────────────────────────
  // Estados handlers
  // ────────────────────────────────
  const toggleEstado = (id) => {
    const list = estados.includes(id)
      ? estados.filter((e) => e !== id)
      : [...estados, id];
    setEstados(list);
    savePlayer({ ...playerData, estados: list }, undefined, undefined, list);
  };
  const startEditInfo = (id, current) => {
    setPinnedTipId(null);
    setEditingInfoId(id);
    setEditingInfoText(current);
  };
  const finishEditInfo = () => {
    if (!editingInfoId) return;
    const newList = resourcesList.map((r) =>
      r.id === editingInfoId ? { ...r, info: editingInfoText } : r
    );
    setResourcesList(newList);
    savePlayer(playerData, newList);
    setEditingInfoId(null);
    setEditingInfoText('');
  };
  const togglePinnedTip = (id) => {
    setPinnedTipId((prev) => (prev === id ? null : id));
  };
  // ────────────────────────────────
  // Glosario handlers
  // (ahora gestionados por el hook useGlossary)

  const highlightText = (text) => {
    if (!text) return text;
    let parts = [text];
    glossary.forEach((term) => {
      const regex = new RegExp(`(${term.word})`, 'gi');
      parts = parts.flatMap((part) => {
        if (typeof part !== 'string') return [part];
        return part.split(regex).map((p, i) => {
          if (p.toLowerCase() === term.word.toLowerCase()) {
            const id = `gloss-${term.word}-${tooltipCounterRef.current++}`;
            return (
              <React.Fragment key={id}>
                <span
                  style={{ color: term.color }}
                  className="font-bold cursor-help underline decoration-dotted"
                  data-tooltip-id={id}
                  data-tooltip-content={term.info}
                >
                  {p}
                </span>
                <Tooltip
                  id={id}
                  place="top"
                  className="max-w-[90vw] sm:max-w-xs whitespace-pre-line"
                  openOnClick={isTouchDevice}
                />
              </React.Fragment>
            );
          }
          return p;
        });
      });
    });
    return parts;
  };

  // Renderizar tooltips por separado para evitar errores de hidratación
  const renderTooltips = () => {
    return glossary.map((term) => {
      const id = `gloss-${term.word}-${tooltipCounterRef.current++}`;
      return (
        <Tooltip
          key={id}
          id={id}
          place="top"
          className="max-w-[90vw] sm:max-w-xs whitespace-pre-line"
          openOnClick={isTouchDevice}
        />
      );
    });
  };

  const dadoIcono = () => <BsDice6 className="inline" />;
  const iconoDano = (tipo) => {
    if (!tipo) return null;
    switch (tipo.toLowerCase()) {
      case 'físico':
        return <GiFist className="inline" />;
      case 'fuego':
        return <FaFire className="inline" />;
      case 'eléctrico':
        return <FaBolt className="inline" />;
      case 'hielo':
        return <FaSnowflake className="inline" />;
      case 'radiación':
        return <FaRadiationAlt className="inline" />;
      default:
        return null;
    }
  };
  // ───────────────────────────────────────────────────────────
  // RENDERIZADO CONDICIONAL
  // ───────────────────────────────────────────────────────────
  // MENÚ PRINCIPAL
  if (!userType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Partículas de fondo animadas */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
        {/* Círculos decorativos */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div className="w-full max-w-md rounded-2xl shadow-2xl bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-8 flex flex-col gap-8 relative z-10 animate-in fade-in zoom-in-95 duration-700">
          {/* Header minimalista */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-center text-white">
              Fichas de Rol
            </h1>
            <p className="text-gray-400 text-base">
              Sistema de gestión de personajes
            </p>
            <div className="w-16 h-px bg-gray-600 mx-auto"></div>
          </div>
          {/* Pregunta principal */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              ¿Quién eres?
            </h2>
          </div>
          {/* Opciones minimalistas */}
          <div className="flex flex-col gap-4">
            <Boton
              color="green"
              size="lg"
              className="py-4 rounded-lg font-semibold text-lg tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
              onClick={() => setUserType('player')}
            >
              <div className="flex flex-col items-center">
                <span>Soy Jugador</span>
                <span className="text-sm opacity-70 font-normal">
                  Gestiona tu personaje
                </span>
              </div>
            </Boton>
            <Boton
              color="purple"
              size="lg"
              className="py-4 rounded-lg font-semibold text-lg tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
              onClick={() => {
                setUserType('master');
                setShowLogin(true);
              }}
            >
              <div className="flex flex-col items-center">
                <span>Soy Máster</span>
                <span className="text-sm opacity-70 font-normal">
                  Herramientas avanzadas
                </span>
              </div>
            </Boton>
          </div>
          {/* Footer minimalista */}
          <div className="text-center space-y-2 border-t border-gray-700 pt-6">
            <p className="text-sm font-medium text-gray-400">Versión 2.1.9</p>
            <p className="text-xs text-gray-500">
              Animación de dados mejorada.
            </p>
          </div>
        </div>
      </div>
    );
  }
  // LOGIN MÁSTER
  if (userType === 'master' && showLogin && !authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Partículas de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
        {/* Efectos de fondo */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div className="w-full max-w-md rounded-2xl shadow-2xl bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-8 flex flex-col gap-6 relative z-10 animate-in fade-in zoom-in-95 duration-700">
          {/* Header minimalista */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-center text-white">
              Acceso Máster
            </h2>
            <p className="text-gray-400 text-sm">
              Ingresa la contraseña para acceder a las herramientas avanzadas
            </p>
            <div className="w-16 h-px bg-gray-600 mx-auto"></div>
          </div>
          {/* Campo de contraseña */}
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Contraseña de máster"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full text-center"
              size="lg"
            />
            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center animate-in fade-in duration-300">
                <p className="text-red-400 text-sm font-medium">{authError}</p>
              </div>
            )}
          </div>
          {/* Botones */}
          <div className="space-y-3">
            <Boton
              color="green"
              size="lg"
              className="w-full py-4 rounded-lg font-semibold text-lg tracking-wide shadow-lg hover:scale-105 transition-all duration-300"
              onClick={handleLogin}
            >
              Acceder al Sistema
            </Boton>
            <Boton
              color="gray"
              size="md"
              className="w-full py-3 rounded-lg font-semibold text-base tracking-wide shadow hover:scale-105 transition-all duration-300"
              onClick={volverAlMenu}
            >
              Volver al menú principal
            </Boton>
          </div>
        </div>
      </div>
    );
  }
  // SELECCIÓN JUGADOR
  if (userType === 'player' && !nameEntered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Partículas de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-green-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
        {/* Efectos de fondo */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-500/10 rounded-full blur-xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div className="w-full max-w-lg rounded-2xl shadow-2xl bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-8 flex flex-col gap-6 relative z-10 animate-in fade-in zoom-in-95 duration-700">
          {/* Header minimalista */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-center text-white">
              Selecciona tu Personaje
            </h2>
            <p className="text-gray-400 text-sm">
              Elige un personaje existente o crea uno nuevo
            </p>
            <div className="w-16 h-px bg-gray-600 mx-auto"></div>
          </div>
          {/* Jugadores existentes */}
          {existingPlayers.length > 0 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-white mb-3">
                  Personajes Existentes
                </h3>
              </div>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {existingPlayers.map((n) => (
                  <Boton
                    key={n}
                    color="gray"
                    size="md"
                    className="w-full rounded-lg font-semibold text-base px-4 py-2 transition-colors duration-200"
                    onClick={() => {
                      const trimmed = n.trim();
                      setPlayerName(trimmed);
                      setTimeout(() => setNameEntered(true), 0);
                    }}
                  >
                    <div className="flex justify-center items-center">
                      <span className="truncate">{n}</span>
                    </div>
                  </Boton>
                ))}
              </div>
            </div>
          )}
          {/* Crear nuevo personaje */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-white mb-3">
                Crear Nuevo Personaje
              </h3>
            </div>
            <Input
              placeholder="Nombre de tu personaje"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enterPlayer()}
              className="w-full text-center"
              size="lg"
              clearable
            />
            <Boton
              color="green"
              size="lg"
              className="w-full py-4 rounded-lg font-semibold text-lg tracking-wide shadow-lg hover:scale-105 transition-all duration-300"
              onClick={enterPlayer}
            >
              Crear / Entrar
            </Boton>
          </div>
          {/* Botón volver */}
          <div className="border-t border-gray-700 pt-4">
            <Boton
              color="gray"
              size="md"
              className="w-full py-3 rounded-lg font-semibold text-base tracking-wide shadow hover:scale-105 transition-all duration-300"
              onClick={volverAlMenu}
            >
              Volver al menú principal
            </Boton>
          </div>
        </div>
      </div>
    );
  }
  // CALCULADORA DE DADOS
  if (userType === 'player' && nameEntered && showDiceCalculator) {
    return (
      <DiceCalculator
        playerName={playerName}
        onBack={() => setShowDiceCalculator(false)}
      />
    );
  }
  // MINIJUEGO BARRA-REFLEJOS
  if (userType === 'player' && nameEntered && showBarraReflejos) {
    return (
      <BarraReflejos
        playerName={playerName}
        onBack={() => setShowBarraReflejos(false)}
      />
    );
  }
  // SISTEMA DE INICIATIVA
  if (userType === 'player' && nameEntered && showInitiativeTracker) {
    return (
      <InitiativeTracker
        playerName={playerName}
        isMaster={authenticated}
        glossary={glossary}
        playerEquipment={{
          weapons: playerData.weapons,
          armaduras: playerData.armaduras,
          poderes: playerData.poderes,
        }}
        armas={armas}
        armaduras={armaduras}
        habilidades={habilidades}
        onBack={() => setShowInitiativeTracker(false)}
      />
    );
  }
  // MINIMAPA PARA JUGADORES
  if (userType === 'player' && nameEntered && showPlayerMinimap) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
            Cargando Minimapa…
          </div>
        }
      >
        <MinimapBuilder
          mode="player"
          backLabel="Volver a Ficha"
          showNewBadge={false}
          onBack={() => setShowPlayerMinimap(false)}
          playerName={playerName}
        />
      </React.Suspense>
    );
  }
  // MAPA DE BATALLA PARA JUGADORES
  if (userType === 'player' && nameEntered && showPlayerBattleMap) {
    // Usar la página configurada como visible para jugadores por el Master
    let effectivePage = null;
    let effectivePageIndex = 0;
    let playerHasToken = false;

    if (playerVisiblePageId) {
      // Buscar la página por ID
      const pageIndex = pages.findIndex(
        (page) => page.id === playerVisiblePageId
      );
      if (pageIndex !== -1) {
        effectivePage = pages[pageIndex];
        effectivePageIndex = pageIndex;

        // Verificar si el jugador tiene un token asignado en esta página
        const pageTokens = effectivePage?.tokens || [];
        const normalized = playerName.trim().toLowerCase();
        playerHasToken = pageTokens.some((token) =>
          (token.controlledBy || '').trim().toLowerCase() === normalized
        );
      }
    }

    // Si no hay página visible configurada o no se encuentra, mostrar mensaje
    if (!effectivePage) {
      return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-4 overflow-hidden">
          <div className="sticky top-0 bg-gray-900 z-10 h-14 flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">🗺️ Mapa de Batalla</h1>
            <Boton
              size="sm"
              onClick={() => setShowPlayerBattleMap(false)}
              className="bg-gray-700 hover:bg-gray-600"
            >
              ← Volver a Ficha
            </Boton>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-xl font-bold mb-2">Mapa no disponible</h2>
              <p className="text-gray-400 mb-4">
                El Master aún no ha configurado ningún mapa como visible para
                jugadores.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Si el jugador no tiene tokens asignados, no puede ver el mapa
    if (!playerHasToken) {
      return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-4 overflow-hidden">
          <div className="sticky top-0 bg-gray-900 z-10 h-14 flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">🗺️ Mapa de Batalla</h1>
            <Boton
              size="sm"
              onClick={() => setShowPlayerBattleMap(false)}
              className="bg-gray-700 hover:bg-gray-600"
            >
              ← Volver a Ficha
            </Boton>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🚫</div>
              <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
              <p className="text-gray-400">
                Acceso Denegado - No tienes ningún token asignado
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-4 overflow-hidden">
        <div className="sticky top-0 bg-gray-900 z-10 h-14 flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">🗺️ Mapa de Batalla</h1>
          <div className="flex flex-wrap gap-2">
            <Boton
              size="sm"
              onClick={() => setShowPlayerBattleMap(false)}
              className="bg-gray-700 hover:bg-gray-600"
            >
              ← Volver a Ficha
            </Boton>
            <Boton
              size="sm"
              color="green"
              onClick={() => setShowInitiativeTracker(true)}
            >
              ⚡ Sistema de Velocidad
            </Boton>
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            <MapCanvas
            userType="player"
            playerName={playerName}
            playerViewMode={true}
            simulatedPlayer={playerName}
            tokens={effectivePage?.tokens || []}
            onTokensChange={(updater) => {
              const updatedPages = [...pages];
              if (updatedPages[effectivePageIndex]) {
                const prev = updatedPages[effectivePageIndex].tokens || [];
                const next =
                  typeof updater === 'function' ? updater(prev) : updater;
                const changed = diffTokens(prev, next);
                changed.forEach((tk) =>
                  pendingTokenChangesRef.current.set(String(tk.id), tk)
                );
                updatedPages[effectivePageIndex].tokens = next;
                setPages(updatedPages);
              }
            }}
            lines={effectivePage?.lines || []}
            onLinesChange={(newLines) => {
              const updatedPages = [...pages];
              if (updatedPages[effectivePageIndex]) {
                updatedPages[effectivePageIndex].lines = newLines;
                setPages(updatedPages);
              }
            }}
            walls={effectivePage?.walls || []}
            onWallsChange={(newWalls) => {
              const updatedPages = [...pages];
              if (updatedPages[effectivePageIndex]) {
                updatedPages[effectivePageIndex].walls = newWalls;
                setPages(updatedPages);
              }
            }}
            texts={effectivePage?.texts || []}
            onTextsChange={(newTexts) => {
              const updatedPages = [...pages];
              if (updatedPages[effectivePageIndex]) {
                updatedPages[effectivePageIndex].texts = newTexts;
                setPages(updatedPages);
              }
            }}
            backgroundImage={effectivePage?.background}
            imageSize={effectivePage?.imageSize}
            gridCells={effectivePage?.gridCells}
            gridSize={effectivePage?.gridSize || 50}
            gridOffsetX={effectivePage?.gridOffsetX || 0}
            gridOffsetY={effectivePage?.gridOffsetY || 0}
            showGrid={
              effectivePage?.showGrid !== undefined
                ? effectivePage.showGrid
                : true
            }
            gridColor={effectivePage?.gridColor || '#ffffff'}
            gridOpacity={
              effectivePage?.gridOpacity !== undefined
                ? Math.max(0, Math.min(1, effectivePage.gridOpacity))
                : 0.2
            }
            enableDarkness={effectivePage?.enableDarkness || false}
            darknessOpacity={effectivePage?.darknessOpacity || 0.8}
            activeLayer="fichas"
            enemies={enemies}
            players={[playerName]}
            armas={armas}
            armaduras={armaduras}
            habilidades={habilidades}
            highlightText={highlightText}
            isPlayerView={true}
            pageId={playerVisiblePageId}
          />
          </div>
          <ChatPanel playerName={playerName} isMaster={false} />
        </div>
      </div>
    );
  }
  // FICHA JUGADOR
  if (userType === 'player' && nameEntered) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 px-2 py-4">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <h1 className="text-2xl font-bold text-center mb-2">
            Ficha de {playerName}
          </h1>
          {/* Botones de herramientas */}
          <div className="mb-4 flex gap-3 justify-center">
            {/* Botón de calculadora de dados */}
            <Boton
              onClick={() => setShowDiceCalculator(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 text-lg rounded-lg flex items-center justify-center sm:w-12 sm:h-12 sm:text-xl"
            >
              🎲
            </Boton>
            {/* Botón de minijuego reflejos */}
            <Boton
              onClick={() => setShowBarraReflejos(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white w-10 h-10 text-lg rounded-lg flex items-center justify-center sm:w-12 sm:h-12 sm:text-xl"
            >
              🔒
            </Boton>
            {/* Botón de sistema de iniciativa */}
            <Boton
              onClick={() => setShowInitiativeTracker(true)}
              className="bg-green-600 hover:bg-green-700 text-white w-10 h-10 text-lg rounded-lg flex items-center justify-center sm:w-12 sm:h-12 sm:text-xl"
            >
              ⚡
            </Boton>
            {/* Botón de minimapa */}
            <Boton
              onClick={() => setShowPlayerMinimap(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-lg sm:text-xl w-10 h-10 rounded-lg flex items-center justify-center sm:w-12 sm:h-12"
              title="Minimapa"
            >
              ⌚️
            </Boton>
            {/* Botón de Mapa de Batalla */}
            <Boton
              onClick={() => setShowPlayerBattleMap(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 text-lg rounded-lg flex items-center justify-center sm:w-12 sm:h-12 sm:text-xl"
              title="Mapa de Batalla"
            >
              🗺️
            </Boton>
          </div>
          <div className="mb-4 text-center text-sm text-gray-300 flex flex-col gap-1">
            <span className="flex flex-wrap justify-center items-center gap-2">
              Res. Física:
              <select
                value={playerData.resistenciaFisica}
                onChange={(e) =>
                  handleResistenciaChange('fisica', e.target.value)
                }
                className="bg-gray-700 text-white px-1 rounded"
              >
                {resourcesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              ({playerData.stats[playerData.resistenciaFisica]?.total ?? 0})
              {'   |   '}
              Res. Mental:
              <select
                value={playerData.resistenciaMental}
                onChange={(e) =>
                  handleResistenciaChange('mental', e.target.value)
                }
                className="bg-gray-700 text-white px-1 rounded"
              >
                {resourcesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              ({playerData.stats[playerData.resistenciaMental]?.total ?? 0})
            </span>
            <span>
              Carga física total:{' '}
              {cargaFisicaIcon(playerData.cargaAcumulada?.fisica)} (
              {playerData.cargaAcumulada?.fisica || 0}){'   |   '}
              Carga mental total:{' '}
              {cargaMentalIcon(playerData.cargaAcumulada?.mental)} (
              {playerData.cargaAcumulada?.mental || 0})
            </span>
          </div>
          {/* Botones Volver / Eliminar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-center">
            <Boton
              color="gray"
              className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
              onClick={volverAlMenu}
            >
              Volver al menú
            </Boton>
            <Boton
              color="red"
              className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
              onClick={eliminarFichaJugador}
            >
              Eliminar ficha
            </Boton>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-center">
            <Boton
              color="blue"
              className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
              onClick={guardarDatosFicha}
            >
              Guardar datos
            </Boton>
            <Boton
              color="yellow"
              className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
              onClick={resetearFichaDesdeBackup}
            >
              RESET
            </Boton>
          </div>
          {/* ATRIBUTOS */}
          <h2 className="text-xl font-semibold text-center mb-4">Atributos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 w-full">
            {atributos.map((attr) => (
              <AtributoCard
                key={attr}
                name={attr}
                value={playerData.atributos[attr] || 'D4'}
                color={atributoColor[attr]}
                dadoImgUrl={dadoImgUrl}
                onChange={(v) => handleAtributoChange(attr, v)}
              />
            ))}
          </div>
          {/* ESTADÍSTICAS */}
          <h2 className="text-xl font-semibold text-center mb-2">
            Estadísticas
          </h2>
          <div className="flex flex-col gap-4 w-full mb-8">
            {resourcesList.map(({ id: r, name, color, info }, index) => {
              const s = playerData.stats[r] || {
                base: 0,
                total: 0,
                actual: 0,
                buff: 0,
              };
              const baseV = Math.min(s.base || 0, RESOURCE_MAX);
              const actualV = Math.min(s.actual || 0, RESOURCE_MAX);
              const buffV = s.buff || 0;
              const resistenciaFisica =
                playerData.stats[playerData.resistenciaFisica]?.total ?? 0;
              const resistenciaMental =
                playerData.stats[playerData.resistenciaMental]?.total ?? 0;
              const cargaFisicaTotal = playerData.cargaAcumulada?.fisica || 0;
              const cargaMentalTotal = playerData.cargaAcumulada?.mental || 0;
              let penalizacion = 0;
              let baseEfectiva = baseV;
              if (r === 'postura') {
                penalizacion = Math.max(
                  0,
                  cargaFisicaTotal - resistenciaFisica
                );
                baseEfectiva = Math.max(0, baseV - penalizacion);
              } else if (r === 'cordura') {
                penalizacion = Math.max(
                  0,
                  cargaMentalTotal - resistenciaMental
                );
                baseEfectiva = Math.max(0, baseV - penalizacion);
              }
              const overflowBuf = Math.max(
                0,
                buffV - (RESOURCE_MAX - baseEfectiva)
              );
              return (
                <motion.div
                  key={r}
                  layout="position"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="bg-gray-800 rounded-xl p-4 shadow w-full"
                >
                  {/* Nombre centrado y controles a la derecha, en la misma fila */}
                  <div className="relative flex items-center w-full mb-4 min-h-[2rem]">
                    {editingInfoId === r ? (
                      <textarea
                        value={editingInfoText}
                        onChange={(e) => setEditingInfoText(e.target.value)}
                        onBlur={finishEditInfo}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && !e.shiftKey && finishEditInfo()
                        }
                        className="absolute left-1/2 -translate-x-1/2 bg-gray-700 text-white p-2 rounded-lg text-sm focus:outline-none w-[90vw] sm:w-72 h-24 resize-none border border-blue-400 shadow-lg"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="absolute left-1/2 transform -translate-x-1/2 font-bold text-lg capitalize cursor-pointer"
                        data-tooltip-id={`tip-${r}`}
                        data-tooltip-content={info}
                        onClick={
                          isTouchDevice ? undefined : () => togglePinnedTip(r)
                        }
                        onDoubleClick={() => startEditInfo(r, info)}
                        onMouseEnter={() => setHoveredTipId(r)}
                        onMouseLeave={() => setHoveredTipId(null)}
                      >
                        {name}
                      </span>
                    )}
                    {info && editingInfoId !== r && (
                      <Tooltip
                        id={`tip-${r}`}
                        place="top"
                        openOnClick={isTouchDevice}
                        isOpen={
                          !isTouchDevice &&
                          (hoveredTipId === r || pinnedTipId === r)
                        }
                        className="max-w-[90vw] sm:max-w-xs whitespace-pre-line break-words"
                      />
                    )}
                    {/* Controles de reordenamiento y eliminación */}
                    <div className="absolute right-0 flex items-center gap-1">
                      {/* Botón subir */}
                      <button
                        onClick={() => moveStatUp(index)}
                        disabled={index === 0}
                        className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all duration-200 ${
                          index === 0
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-blue-400 hover:text-blue-200 hover:bg-blue-900/30'
                        }`}
                        title="Mover hacia arriba"
                      >
                        ↑
                      </button>
                      {/* Botón bajar */}
                      <button
                        onClick={() => moveStatDown(index)}
                        disabled={index === resourcesList.length - 1}
                        className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all duration-200 ${
                          index === resourcesList.length - 1
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-blue-400 hover:text-blue-200 hover:bg-blue-900/30'
                        }`}
                        title="Mover hacia abajo"
                      >
                        ↓
                      </button>
                      {/* Botón eliminar */}
                      <button
                        onClick={() => handleEliminarRecurso(r)}
                        className="w-6 h-6 flex items-center justify-center text-xs font-bold text-red-400 hover:text-red-200 hover:bg-red-900/30 rounded transition-all duration-200"
                        title="Eliminar esta estadística"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                  {/* Inputs y botones */}
                  <div className="w-full flex justify-center mb-2">
                    <div className="flex items-center gap-2 max-w-fit">
                      <Input
                        type="number"
                        min={0}
                        max={RESOURCE_MAX}
                        value={baseV === 0 ? '' : baseV}
                        placeholder="0"
                        onChange={(e) =>
                          handleStatChange(r, 'base', e.target.value)
                        }
                        className="w-14 text-center"
                      />
                      <span className="font-semibold">/</span>
                      <Input
                        type="number"
                        min={0}
                        max={RESOURCE_MAX}
                        value={actualV === 0 ? '' : actualV}
                        placeholder="0"
                        onChange={(e) =>
                          handleStatChange(r, 'actual', e.target.value)
                        }
                        className="w-14 text-center"
                      />
                      <Boton
                        color="green"
                        className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                        onClick={() => handleIncrease(r)}
                      >
                        +
                      </Boton>
                      <Boton
                        color="yellow"
                        className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                        onClick={() => handleAddBuff(r)}
                      >
                        +
                      </Boton>
                      <Boton
                        color="gray"
                        className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                        onClick={() => handleNerf(r)}
                      >
                        –
                      </Boton>
                    </div>
                  </div>
                  {/* Barra (con margen superior aumentado) */}
                  <div className="relative w-full mt-4">
                    <ResourceBar
                      color={color}
                      penalizacion={penalizacion}
                      actual={actualV}
                      base={baseV}
                      buff={buffV}
                    />
                    <div className="flex justify-center mt-1 text-xs font-semibold text-gray-300">
                      {actualV}/{baseEfectiva}
                      {buffV > 0 && (
                        <span className="ml-1 text-yellow-400">(+{buffV})</span>
                      )}
                    </div>
                    {overflowBuf > 0 && (
                      <div className="flex justify-center mt-1">
                        <span className="px-1 py-0.5 text-xs font-bold bg-yellow-500 text-gray-900 rounded">
                          +{overflowBuf}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {!playerData.stats['postura'] && (
            <div className="text-center text-sm text-gray-400 mb-2">
              No tienes Postura; tu carga física{' '}
              {cargaFisicaIcon(playerData.cargaAcumulada?.fisica)} (
              {playerData.cargaAcumulada?.fisica || 0}) está pendiente sin
              penalizar.
            </div>
          )}
          {!playerData.stats['cordura'] && (
            <div className="text-center text-sm text-gray-400 mb-2">
              No tienes Cordura; tu carga mental{' '}
              {cargaMentalIcon(playerData.cargaAcumulada?.mental)} (
              {playerData.cargaAcumulada?.mental || 0}) está pendiente sin
              penalizar.
            </div>
          )}
          {/* FORMULARIO "Añadir recurso" */}
          {resourcesList.length < 6 && (
            <div className="w-full max-w-md mx-auto mb-4">
              {!showAddResForm ? (
                <Boton
                  color="green"
                  className="py-2 rounded-lg font-extrabold text-base shadow-sm w-full flex items-center justify-center gap-2"
                  onClick={() => setShowAddResForm(true)}
                >
                  + Añadir recurso
                </Boton>
              ) : (
                <div className="bg-gray-800 rounded-xl p-4 shadow flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Añadir recurso</h3>
                    <button
                      onClick={() => {
                        setShowAddResForm(false);
                        setNewResError('');
                        setNewResName('');
                        setNewResColor('#ffffff');
                      }}
                      className="text-white text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <Input
                      type="text"
                      placeholder="Nombre de la nueva estadística"
                      value={newResName}
                      onChange={(e) => setNewResName(e.target.value)}
                      className="w-full text-center sm:flex-1"
                    />
                    <div className="flex items-center justify-center gap-2 mt-2 sm:mt-0">
                      <label className="text-sm font-medium">Color:</label>
                      <input
                        type="color"
                        value={newResColor}
                        onChange={(e) => setNewResColor(e.target.value)}
                        className="w-10 h-8 border-none p-0 rounded"
                      />
                    </div>
                  </div>
                  <Boton
                    color="green"
                    className="py-2 rounded-lg font-extrabold text-base shadow-sm"
                    onClick={agregarRecurso}
                  >
                    Añadir recurso
                  </Boton>
                  {newResError && (
                    <p className="text-red-400 mt-1 text-center">
                      {newResError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {/* CLAVES */}
          <h2 className="text-xl font-semibold text-center mb-2">Claves</h2>
          {claves.length === 0 ? (
            <p className="text-gray-400 text-center mb-4">No tienes claves.</p>
          ) : (
            <div className="flex flex-col gap-4 w-full mb-4">
              {claves.map((c) => (
                <div
                  key={c.id}
                  className="bg-gray-800 rounded-xl p-4 shadow w-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full inline-block"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </span>
                    <button
                      onClick={() => handleRemoveClave(c.id)}
                      className="text-red-400 hover:text-red-200 text-sm font-bold"
                      title="Eliminar clave"
                    >
                      ❌
                    </button>
                  </div>
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Boton
                      color="green"
                      className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                      onClick={() => handleClaveIncrement(c.id, 1)}
                    >
                      +
                    </Boton>
                    <Input
                      type="number"
                      min={0}
                      max={CLAVE_MAX}
                      value={c.actual}
                      onChange={(e) =>
                        handleClaveChange(c.id, 'actual', e.target.value)
                      }
                      className="w-14 text-center"
                    />
                    <span className="font-semibold">/</span>
                    <Input
                      type="number"
                      min={0}
                      max={CLAVE_MAX}
                      value={c.total}
                      onChange={(e) =>
                        handleClaveChange(c.id, 'total', e.target.value)
                      }
                      className="w-14 text-center"
                    />
                    <Boton
                      color="gray"
                      className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                      onClick={() => handleClaveIncrement(c.id, -1)}
                    >
                      –
                    </Boton>
                    <Boton
                      color="blue"
                      className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                      onClick={() => handleClaveReset(c.id)}
                    >
                      ↺
                    </Boton>
                  </div>
                  <ResourceBar
                    color={c.color}
                    actual={c.actual}
                    base={c.total}
                    buff={0}
                    penalizacion={0}
                    max={CLAVE_MAX}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="w-full max-w-md mx-auto mb-4">
            {!showAddClaveForm ? (
              <Boton
                color="green"
                className="py-2 rounded-lg font-extrabold text-base shadow-sm w-full flex items-center justify-center gap-2"
                onClick={() => setShowAddClaveForm(true)}
              >
                + Añadir clave
              </Boton>
            ) : (
              <div className="bg-gray-800 rounded-xl p-4 shadow flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Añadir clave</h3>
                  <button
                    onClick={() => {
                      setShowAddClaveForm(false);
                      setNewClaveError('');
                      setNewClaveName('');
                      setNewClaveColor('#ffffff');
                      setNewClaveTotal(0);
                    }}
                    className="text-white text-lg font-bold"
                  >
                    ×
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="Nombre de la clave"
                  value={newClaveName}
                  onChange={(e) => setNewClaveName(e.target.value)}
                  className="w-full text-center"
                />
                <div className="flex items-center justify-center gap-2">
                  <label className="text-sm font-medium">Color:</label>
                  <input
                    type="color"
                    value={newClaveColor}
                    onChange={(e) => setNewClaveColor(e.target.value)}
                    className="w-10 h-8 border-none p-0 rounded"
                  />
                </div>
                <Input
                  type="number"
                  min={0}
                  max={CLAVE_MAX}
                  placeholder="Total"
                  value={newClaveTotal}
                  onChange={(e) => setNewClaveTotal(e.target.value)}
                  className="w-full text-center"
                />
                <Boton
                  color="green"
                  className="py-2 rounded-lg font-extrabold text-base shadow-sm"
                  onClick={handleAddClave}
                >
                  Añadir clave
                </Boton>
                {newClaveError && (
                  <p className="text-red-400 mt-1 text-center">
                    {newClaveError}
                  </p>
                )}
              </div>
            )}
          </div>
          {/* ESTADOS */}
          <h2 className="text-xl font-semibold text-center mb-2">Estados</h2>
          <div className="mb-6 w-full">
            <EstadoSelector selected={estados} onToggle={toggleEstado} />
          </div>
          {/* INVENTARIO */}
          <h2 className="text-xl font-semibold text-center mb-2">Inventario</h2>
          <div className="mb-6 w-full">
            <Inventory playerName={playerName} />
          </div>
          {/* EQUIPAR ARMA */}
          <div className="mt-4 mb-6 flex flex-col items-center w-full relative">
            <label className="block font-semibold mb-1 text-center">
              Equipa un arma:
            </label>
            <div className="flex justify-center w-full">
              <div className="relative w-full max-w-md">
                <Input
                  placeholder="Busca un arma"
                  value={playerInputArma}
                  onChange={(e) => setPlayerInputArma(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePlayerEquip()}
                  className="w-full mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
                />
                {armaSugerencias.length > 0 && (
                  <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                    {armaSugerencias.map((a) => (
                      <li
                        key={a.nombre}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                        onClick={() =>
                          handlePlayerEquipFromSuggestion(a.nombre)
                        }
                      >
                        {a.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {playerError && (
              <p className="text-red-400 mt-1 text-center">{playerError}</p>
            )}
          </div>
          {/* ARMAS EQUIPADAS */}
          <h2 className="text-xl font-semibold text-center mb-2">
            Armas Equipadas
          </h2>
          {playerData.weapons.length === 0 ? (
            <p className="text-gray-400 text-center">
              No tienes armas equipadas.
            </p>
          ) : (
            <div
              className={`${
                playerData.weapons.length === 1
                  ? 'grid grid-cols-1 place-items-center'
                  : 'grid grid-cols-1 sm:grid-cols-2'
              } gap-4 w-full`}
            >
              {playerData.weapons.map((n, i) => {
                const a = armas.find((x) => x.nombre === n);
                return (
                  a && (
                    <Tarjeta
                      key={i}
                      variant="weapon"
                      className="w-full flex flex-col items-center text-center"
                    >
                      <p className="font-bold text-lg">{a.nombre}</p>
                      <p>
                        <strong>Daño:</strong> {dadoIcono()} {a.dano}{' '}
                        {iconoDano(a.tipoDano)}
                      </p>
                      <p>
                        <strong>Alcance:</strong> {a.alcance}
                      </p>
                      <p>
                        <strong>Consumo:</strong> {a.consumo}
                      </p>
                      <p>
                        <strong>Carga física:</strong>{' '}
                        {parseCargaValue(a.cargaFisica ?? a.carga) > 0
                          ? '🔲'.repeat(
                              parseCargaValue(a.cargaFisica ?? a.carga)
                            )
                          : '❌'}
                      </p>
                      <p>
                        <strong>Carga mental:</strong>{' '}
                        {cargaMentalIcon(a.cargaMental)}
                      </p>
                      <p>
                        <strong>Rasgos:</strong>{' '}
                        {a.rasgos.map((r, ri) => (
                          <React.Fragment key={ri}>
                            {highlightText(r)}
                            {ri < a.rasgos.length - 1 ? ', ' : ''}
                          </React.Fragment>
                        ))}
                      </p>
                      {a.descripcion && (
                        <p className="italic">{highlightText(a.descripcion)}</p>
                      )}
                      <Boton
                        color="red"
                        className="py-3 px-4 rounded-lg font-extrabold text-base tracking-wide shadow-sm max-w-xs w-full mx-auto mt-4"
                        onClick={() => handlePlayerUnequip(a.nombre)}
                      >
                        Desequipar
                      </Boton>
                    </Tarjeta>
                  )
                );
              })}
            </div>
          )}
          {/* EQUIPAR ARMADURA */}
          <div className="mt-8 mb-6 flex flex-col items-center w-full relative">
            <label className="block font-semibold mb-1 text-center">
              Equipa una armadura:
            </label>
            <div className="flex justify-center w-full">
              <div className="relative w-full max-w-md">
                <Input
                  placeholder="Busca una armadura"
                  value={playerInputArmadura}
                  onChange={(e) => setPlayerInputArmadura(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handlePlayerEquipArmadura()
                  }
                  className="w-full mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
                />
                {armaduraSugerencias.length > 0 && (
                  <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                    {armaduraSugerencias.map((a) => (
                      <li
                        key={a.nombre}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                        onClick={() =>
                          handlePlayerEquipArmaduraFromSuggestion(a.nombre)
                        }
                      >
                        {a.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {playerArmaduraError && (
              <p className="text-red-400 mt-1 text-center">
                {playerArmaduraError}
              </p>
            )}
          </div>
          {/* ARMADURAS EQUIPADAS */}
          <h2 className="text-xl font-semibold text-center mb-2">
            Armaduras Equipadas
          </h2>
          {playerData.armaduras.length === 0 ? (
            <p className="text-gray-400 text-center">
              No tienes armaduras equipadas.
            </p>
          ) : (
            <div
              className={`${
                playerData.armaduras.length === 1
                  ? 'grid grid-cols-1 place-items-center'
                  : 'grid grid-cols-1 sm:grid-cols-2'
              } gap-4 w-full`}
            >
              {playerData.armaduras.map((n, i) => {
                const a = armaduras.find((x) => x.nombre === n);
                return (
                  a && (
                    <Tarjeta
                      key={i}
                      variant="armor"
                      className="w-full flex flex-col items-center text-center"
                    >
                      <p className="font-bold text-lg">{a.nombre}</p>
                      <p>
                        <strong>Defensa:</strong> {a.defensa}
                      </p>
                      <p>
                        <strong>Carga física:</strong>{' '}
                        {parseCargaValue(a.cargaFisica ?? a.carga) > 0
                          ? '🔲'.repeat(
                              parseCargaValue(a.cargaFisica ?? a.carga)
                            )
                          : '❌'}
                      </p>
                      <p>
                        <strong>Carga mental:</strong>{' '}
                        {cargaMentalIcon(a.cargaMental)}
                      </p>
                      <p>
                        <strong>Rasgos:</strong>{' '}
                        {a.rasgos.length
                          ? a.rasgos.map((r, ri) => (
                              <React.Fragment key={ri}>
                                {highlightText(r)}
                                {ri < a.rasgos.length - 1 ? ', ' : ''}
                              </React.Fragment>
                            ))
                          : '❌'}
                      </p>
                      {a.descripcion && (
                        <p className="italic">{highlightText(a.descripcion)}</p>
                      )}
                      <Boton
                        color="red"
                        className="py-3 px-4 rounded-lg font-extrabold text-base tracking-wide shadow-sm max-w-xs w-full mx-auto mt-4"
                        onClick={() => handlePlayerUnequipArmadura(a.nombre)}
                      >
                        Desequipar
                      </Boton>
                    </Tarjeta>
                  )
                );
              })}
            </div>
          )}
          {/* EQUIPAR PODER */}
          <div className="mt-8 mb-6 flex flex-col items-center w-full relative">
            <label className="block font-semibold mb-1 text-center">
              Equipa un poder:
            </label>
            <div className="flex justify-center w-full">
              <div className="relative w-full max-w-md">
                <Input
                  placeholder="Busca un poder"
                  value={playerInputPoder}
                  onChange={(e) => setPlayerInputPoder(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handlePlayerEquipPoder()
                  }
                  className="w-full mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
                />
                {poderSugerencias.length > 0 && (
                  <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                    {poderSugerencias.map((a) => (
                      <li
                        key={a.nombre}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                        onClick={() =>
                          handlePlayerEquipPoderFromSuggestion(a.nombre)
                        }
                      >
                        {a.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {playerPoderError && (
              <p className="text-red-400 mt-1 text-center">
                {playerPoderError}
              </p>
            )}
          </div>
          {/* PODERES EQUIPADOS */}
          <h2 className="text-xl font-semibold text-center mb-2">
            Poderes Equipados
          </h2>
          {playerData.poderes.length === 0 ? (
            <p className="text-gray-400 text-center">
              No tienes poderes equipados.
            </p>
          ) : (
            <div
              className={`${
                playerData.poderes.length === 1
                  ? 'grid grid-cols-1 place-items-center'
                  : 'grid grid-cols-1 sm:grid-cols-2'
              } gap-4 w-full`}
            >
              {playerData.poderes.map((n, i) => {
                const p = habilidades.find((x) => x.nombre === n);
                return (
                  p && (
                    <Tarjeta
                      key={i}
                      variant="power"
                      className="w-full flex flex-col items-center text-center"
                    >
                      <p className="font-bold text-lg">{p.nombre}</p>
                      <p>
                        <strong>Daño:</strong> {p.poder}
                      </p>
                      <p>
                        <strong>Alcance:</strong> {p.alcance}
                      </p>
                      <p>
                        <strong>Consumo:</strong> {p.consumo}
                      </p>
                      <p>
                        <strong>Cuerpo:</strong> {p.cuerpo}
                      </p>
                      <p>
                        <strong>Mente:</strong> {p.mente}
                      </p>
                      {p.rasgos && p.rasgos.length > 0 && (
                        <p>
                          <strong>Rasgos:</strong> {p.rasgos.join(', ')}
                        </p>
                      )}
                      {p.descripcion && (
                        <p className="italic">{highlightText(p.descripcion)}</p>
                      )}
                      <Boton
                        color="red"
                        className="py-3 px-4 rounded-lg font-extrabold text-base tracking-wide shadow-sm max-w-xs w-full mx-auto mt-4"
                        onClick={() => handlePlayerUnequipPoder(p.nombre)}
                      >
                        Desequipar
                      </Boton>
                    </Tarjeta>
                  )
                );
              })}
            </div>
          )}
        </div>
        {renderTooltips()}
      </div>
    );
  }
  // MODO MÁSTER
  if (userType === 'master' && authenticated && !chosenView) {
    return <MasterMenu onSelect={setChosenView} onBackToMain={volverAlMenu} />;
  }
  if (userType === 'master' && authenticated && chosenView === 'initiative') {
    return (
      <InitiativeTracker
        playerName="Master"
        isMaster={true}
        enemies={enemies}
        glossary={glossary}
        onBack={() => setChosenView(null)}
      />
    );
  }
  if (userType === 'master' && authenticated && chosenView === 'enemies') {
    const filteredEnemies = enemies.filter((enemy) =>
      enemy.name.toLowerCase().includes(enemySearch.toLowerCase()) ||
      (enemy.description || '').toLowerCase().includes(enemySearch.toLowerCase())
    );
    const sortedEnemies =
      enemySort === 'alpha'
        ? [...filteredEnemies].sort((a, b) => a.name.localeCompare(b.name))
        : enemySort === 'level'
        ? [...filteredEnemies].sort((a, b) => (a.nivel || 0) - (b.nivel || 0))
        : filteredEnemies;
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <div className="sticky top-0 bg-gray-900 pb-2 z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">
              👹 Fichas de Enemigos
            </h1>
            <div className="hidden md:flex gap-2">
              <Boton color="indigo" onClick={() => setChosenView('canvas')}>
                Mapa de Batalla
              </Boton>
              <Boton
                color="purple"
                size="sm"
                className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base"
                onClick={() => setChosenView('tools')}
              >
                Herramientas
              </Boton>
              <Boton
                size="sm"
                onClick={() => setChosenView(null)}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base"
              >
                ← Volver al Menú
              </Boton>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 mb-3">
            <Boton
              color="green"
              onClick={createNewEnemy}
              className="w-full md:w-auto"
            >
              Crear Nuevo Enemigo
            </Boton>
            <Boton onClick={refreshCatalog} className="w-full md:w-auto">
              Refrescar
            </Boton>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 w-full md:w-auto">
              <div className="md:hidden inline-flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
                  {enemyResultsLabel}
                </span>
              </div>
              <button
                type="button"
                className={`md:hidden inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  enemyFiltersOpen
                    ? 'border-purple-400 bg-purple-500/20 text-purple-100 shadow-lg shadow-purple-900/30'
                    : 'border-gray-700 bg-gray-800/70 text-gray-300 hover:border-purple-400/50 hover:text-purple-100'
                }`}
                onClick={() => setEnemyFiltersOpen((v) => !v)}
                aria-expanded={enemyFiltersOpen}
                aria-controls="enemy-filters"
              >
                <FiFilter />
                <span>Filtros</span>
                <FiChevronDown
                  className={`transition-transform duration-200 ${
                    enemyFiltersOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>
            </div>
          </div>
          <div
            className="rounded-3xl border border-purple-500/20 bg-gray-900/80 p-4 md:p-6 shadow-[0_18px_40px_-18px_rgba(147,51,234,0.45)] backdrop-blur"
            id="enemy-filters"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-purple-300/60" />
                <input
                  type="text"
                  value={enemySearch}
                  onChange={(e) => setEnemySearch(e.target.value)}
                  placeholder="Buscar enemigos (nombre, descripción, equipo...)"
                  className="w-full rounded-2xl border border-gray-700/60 bg-gray-800/70 pl-12 pr-12 py-3 text-sm md:text-base text-gray-100 shadow-inner shadow-black/40 transition focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30"
                />
                {enemySearch && (
                  <button
                    type="button"
                    onClick={() => setEnemySearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gray-400 transition hover:text-gray-200"
                    aria-label="Limpiar búsqueda"
                  >
                    <FiXCircle />
                  </button>
                )}
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
                  {enemyResultsLabel}
                </span>
              </div>
            </div>
            <div
              className={`mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_auto] md:items-center ${
                enemyFiltersOpen ? '' : 'hidden md:grid'
              }`}
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEnemyOnlyPortraits((v) => !v)}
                  aria-pressed={enemyOnlyPortraits}
                  className={`group inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                    enemyOnlyPortraits
                      ? 'border-purple-400/70 bg-purple-500/20 text-purple-100 shadow-lg shadow-purple-900/30'
                      : 'border-gray-700/80 bg-gray-800/70 text-gray-300 hover:border-purple-400/50 hover:text-purple-100'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition ${
                      enemyOnlyPortraits
                        ? 'border-purple-300/70 bg-purple-500/40 text-purple-50'
                        : 'border-gray-500/60 bg-gray-900/60 text-gray-300'
                    }`}
                  >
                    <FiImage />
                  </span>
                  <span>Solo con retrato</span>
                </button>
              </div>
              <div className="rounded-2xl border border-gray-700/70 bg-gray-800/70 px-4 py-3 text-sm text-gray-200 shadow-inner shadow-black/30">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400/80">
                  Ordenar por
                </label>
                <select
                  value={`${enemySort}:${enemySortDir}`}
                  onChange={(e) => {
                    const [s, d] = e.target.value.split(':');
                    setEnemySort(s);
                    setEnemySortDir(d);
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-gray-100 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="name:asc">Nombre (A→Z)</option>
                  <option value="name:desc">Nombre (Z→A)</option>
                  <option value="nivel:asc">Nivel (menor→mayor)</option>
                  <option value="nivel:desc">Nivel (mayor→menor)</option>
                </select>
              </div>
              <div className="hidden md:flex items-center justify-end">
                <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
                  {enemyResultsLabel}
                </span>
              </div>
            </div>
          </div>
          </div>
        {/* Acciones flotantes (móvil) */}
        {enemyActionsOpen && (
          <div
            className="fixed inset-0 bg-black/20 md:hidden z-40"
            onClick={() => setEnemyActionsOpen(false)}
          />
        )}
        <div className="fixed bottom-4 right-4 md:hidden z-50">
          <div
            className={`flex flex-col items-end gap-2 mb-2 transition-all ${
              enemyActionsOpen
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <button
              onClick={() => {
                setChosenView('canvas');
                setEnemyActionsOpen(false);
              }}
              aria-label="Abrir mapa de batalla"
              className="h-11 w-11 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center"
            >
              <FiMap className="text-xl" />
            </button>
            <button
              onClick={() => {
                setChosenView('tools');
                setEnemyActionsOpen(false);
              }}
              aria-label="Abrir herramientas"
              className="h-11 w-11 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center"
            >
              <FiTool className="text-xl" />
            </button>
            <button
              onClick={() => {
                setChosenView(null);
                setEnemyActionsOpen(false);
              }}
              aria-label="Volver al menú"
              className="h-11 w-11 rounded-full bg-gray-700 text-white shadow-lg flex items-center justify-center"
            >
              <FiArrowLeft className="text-xl" />
            </button>
          </div>
          <button
            onClick={() => setEnemyActionsOpen((v) => !v)}
            aria-label={enemyActionsOpen ? 'Cerrar acciones' : 'Abrir acciones'}
            className="h-14 w-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center"
          >
            {enemyActionsOpen ? (
              <FiX className="text-2xl" />
            ) : (
              <FiPlus className="text-2xl" />
            )}
          </button>
        </div>
        {/* Lista de enemigos */}
        <div className="enemy-grid relative mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 gap-x-6 lg:gap-x-10 mb-10 lg:justify-items-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-4 hidden border-r border-dashed border-amber-100/20 lg:block"
            style={{ left: '25%' }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-4 hidden border-r border-dashed border-amber-100/20 lg:block"
            style={{ left: '50%' }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-4 hidden border-r border-dashed border-amber-100/20 lg:block"
            style={{ left: '75%' }}
          />
          {filteredEnemies.map((enemy) => {
            const asArray = (value) => {
              if (!value) return [];
              if (Array.isArray(value)) return value.filter(Boolean);
              if (typeof value === 'string') {
                return value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean);
              }
              return [];
            };
            const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');
            const normalizeNumber = (value) => {
              if (value === null || value === undefined) return null;
              if (typeof value === 'number' && Number.isFinite(value)) return value;
              if (typeof value === 'string') {
                const parsed = Number(value.replace(/[^0-9.+-]/g, ''));
                return Number.isFinite(parsed) ? parsed : null;
              }
              return null;
            };
            const pickStat = (...values) => {
              for (const value of values) {
                const numeric = normalizeNumber(value);
                if (numeric !== null) {
                  return Math.max(0, Math.round(numeric));
                }
              }
              return 0;
            };

            const tagsFromData = sanitizeEnemyTags([
              ...asArray(enemy.tags),
              ...asArray(enemy.etiquetas),
            ]);
            const tags =
              tagsFromData.length > 0
                ? tagsFromData
                : [...DEFAULT_ENEMY_TAGS];
            const typePieces = [
              cleanText(enemy.tipo),
              cleanText(enemy.type),
              cleanText(enemy.subtipo),
              cleanText(enemy.subType),
              cleanText(enemy.categoria),
              cleanText(enemy.category),
            ].filter(Boolean);
            const typeLine =
              typePieces.length > 0
                ? typePieces.slice(0, 2).join(' — ')
                : tags.length > 0
                ? tags.slice(0, 2).join(' — ')
                : 'Criatura — Enemigo';
            const rarity = cleanText(enemy.rareza || enemy.rarity);
            const levelValue = normalizeNumber(enemy.nivel ?? enemy.level ?? 1) || 1;
            const description = cleanText(enemy.description);
            const abilityCount = pickStat(enemy.poderes?.length);
            const statusCount = pickStat(enemy.estados?.length);
            const weaponCount = pickStat(enemy.weapons?.length);
            const armorCount = pickStat(enemy.armaduras?.length);
            const theme = buildEnemyTheme(enemy.themeColor);
            const statEntries = [
              {
                id: 'weapons',
                label: 'Armas',
                value: weaponCount,
                icon: <GiCrossedSwords className="text-base" />,
                palette: theme.statPalette[0],
              },
              {
                id: 'armors',
                label: 'Armaduras',
                value: armorCount,
                icon: <GiShield className="text-base" />,
                palette: theme.statPalette[1],
              },
              {
                id: 'powers',
                label: 'Poderes',
                value: abilityCount,
                icon: <GiSpellBook className="text-base" />,
                palette: theme.statPalette[2],
              },
              {
                id: 'statuses',
                label: 'Estados',
                value: statusCount,
                icon: <FaRadiationAlt className="text-base" />,
                palette: theme.statPalette[3],
              },
            ];

            return (
              <Tarjeta
                key={enemy.id}
                variant="magic"
                className="enemy-card group relative z-10 w-full max-w-full p-0 overflow-visible border-0 shadow-[0_18px_36px_rgba(8,7,21,0.55)]"
                style={{
                  boxShadow: theme.cardShadow,
                  '--enemy-button-from': theme.button.edit.from,
                  '--enemy-button-via': theme.button.edit.via,
                  '--enemy-button-to': theme.button.edit.to,
                  '--enemy-button-hover-from': theme.button.edit.hoverFrom,
                  '--enemy-button-hover-via': theme.button.edit.hoverVia,
                  '--enemy-button-hover-to': theme.button.edit.hoverTo,
                  '--enemy-button-border': theme.button.edit.border,
                  '--enemy-button-hover-border': theme.button.edit.hoverBorder,
                  '--enemy-button-text': theme.buttonText,
                  '--enemy-button-glow': theme.button.edit.glow,
                  '--enemy-button-icon-glow': theme.button.edit.iconGlow,
                }}
              >
                <div
                  className="relative flex h-full flex-col rounded-[1.25rem]"
                  style={{
                    background: theme.backgroundGradient,
                    color: theme.textPrimary,
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[1.25rem] border shadow-[0_0_32px_rgba(0,0,0,0.35)]"
                    style={{ borderColor: theme.frameBorder }}
                  />
                  <div
                    className="pointer-events-none absolute inset-[6px] rounded-[1.05rem] border"
                    style={{ borderColor: theme.innerBorder }}
                  />
                  <div className="relative z-10 flex h-full flex-col">
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {rarity && (
                            <span
                              className="text-[10px] uppercase tracking-[0.32em]"
                              style={{ color: theme.rarityColor }}
                            >
                              {rarity}
                            </span>
                          )}
                          <h3
                            className="mt-1 text-xl font-extrabold uppercase tracking-[0.18em] drop-shadow-[0_6px_14px_rgba(0,0,0,0.75)]"
                            style={{
                              color: theme.textPrimary,
                              textShadow: '0 8px 22px rgba(0,0,0,0.85)',
                            }}
                          >
                            {enemy.name}
                          </h3>
                        </div>
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-semibold shadow-[inset_0_0_18px_rgba(0,0,0,0.25)]"
                          style={{
                            backgroundImage: theme.levelBackground,
                            borderColor: theme.levelBorder,
                            color: theme.textPrimary,
                          }}
                        >
                          {levelValue}
                        </div>
                      </div>
                      <div
                        className="mt-2 text-[10px] uppercase tracking-[0.26em] italic"
                        style={{ color: theme.typeText }}
                      >
                        {typeLine}
                      </div>
                    </div>
                    <div
                      className="relative mx-4 mt-1 mb-4 aspect-[3/4] overflow-hidden rounded-[1rem] border shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
                      style={{ borderColor: theme.innerBorder }}
                    >
                      {enemy.portrait ? (
                        <img
                          src={enemy.portrait}
                          alt={enemy.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-5xl text-amber-200/40">
                          👹
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 px-5 pb-4 text-sm">
                      <p
                        className="min-h-[2.5rem] text-center leading-relaxed italic"
                        style={{ color: theme.descriptionColor }}
                      >
                        {description || 'Una presencia misteriosa aguarda su turno en el campo de batalla.'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.18em]">
                        {statEntries.map(({ id, label, value, icon, palette }) => (
                          <span
                            key={id}
                            className="flex items-center justify-between gap-2 rounded-full px-3 py-1 shadow-inner"
                            style={{
                              background: palette.bg,
                              border: `1px solid ${palette.border}`,
                              color: palette.text,
                            }}
                          >
                            <span className="flex items-center gap-1 font-semibold">
                              {icon} {label}
                            </span>
                            <span className="font-mono text-sm">{value}</span>
                          </span>
                        ))}
                      </div>
                      {tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap justify-center gap-2 text-[9px] uppercase tracking-[0.25em]">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full px-3 py-1 shadow-inner"
                              style={{
                                background: theme.tagBackground,
                                border: `1px solid ${theme.tagBorder}`,
                                color: theme.tagText,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="px-5 pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em]">
                        <span
                          className="flex items-center gap-2 rounded-md px-3 py-1 shadow-inner"
                          style={{
                            background: theme.xpBadge.bg,
                            border: `1px solid ${theme.xpBadge.border}`,
                            color: theme.xpBadge.text,
                          }}
                        >
                          <FaBolt className="text-base" /> {pickStat(enemy.experiencia, enemy.xp)} XP
                        </span>
                        <span
                          className="flex items-center gap-2 rounded-md px-3 py-1 shadow-inner"
                          style={{
                            background: theme.oroBadge.bg,
                            border: `1px solid ${theme.oroBadge.border}`,
                            color: theme.oroBadge.text,
                          }}
                        >
                          <FaFire className="text-base" /> {pickStat(enemy.dinero)} Oro
                        </span>
                      </div>
                    </div>
                    <div
                      className="mt-auto flex flex-wrap gap-2 border-t px-5 pb-5 pt-4"
                      style={{
                        borderColor: theme.innerBorder,
                        background: theme.backgroundGradient,
                      }}
                    >
                      <Boton
                        color="gray"
                        size="sm"
                        onClick={() => editEnemy(enemy)}
                        className="enemy-action-button enemy-action-edit flex-1 min-w-[120px]"
                        icon={<FiEdit2 className="text-lg" />}
                        style={{
                          '--enemy-button-from': theme.button.edit.from,
                          '--enemy-button-via': theme.button.edit.via,
                          '--enemy-button-to': theme.button.edit.to,
                          '--enemy-button-hover-from': theme.button.edit.hoverFrom,
                          '--enemy-button-hover-via': theme.button.edit.hoverVia,
                          '--enemy-button-hover-to': theme.button.edit.hoverTo,
                          '--enemy-button-border': theme.button.edit.border,
                          '--enemy-button-hover-border': theme.button.edit.hoverBorder,
                          '--enemy-button-text': theme.buttonText,
                          '--enemy-button-glow': theme.button.edit.glow,
                          '--enemy-button-icon-glow': theme.button.edit.iconGlow,
                        }}
                      >
                        Editar
                      </Boton>
                      <Boton
                        color="gray"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar a ${enemy.name}?`)) {
                            deleteEnemy(enemy.id);
                          }
                        }}
                        className="enemy-action-button enemy-action-delete flex-1 min-w-[120px]"
                        icon={<FiTrash2 className="text-lg" />}
                        style={{
                          '--enemy-button-from': theme.button.delete.from,
                          '--enemy-button-via': theme.button.delete.via,
                          '--enemy-button-to': theme.button.delete.to,
                          '--enemy-button-hover-from': theme.button.delete.hoverFrom,
                          '--enemy-button-hover-via': theme.button.delete.hoverVia,
                          '--enemy-button-hover-to': theme.button.delete.hoverTo,
                          '--enemy-button-border': theme.button.delete.border,
                          '--enemy-button-hover-border': theme.button.delete.hoverBorder,
                          '--enemy-button-text': theme.buttonText,
                          '--enemy-button-glow': theme.button.delete.glow,
                          '--enemy-button-icon-glow': theme.button.delete.iconGlow,
                        }}
                      >
                        Eliminar
                      </Boton>
                      <Boton
                        color="gray"
                        size="sm"
                        onClick={() => setSelectedEnemy(enemy)}
                        className="enemy-action-button enemy-action-view flex-1 min-w-[120px]"
                        icon={<FiEye className="text-lg" />}
                        style={{
                          '--enemy-button-from': theme.button.view.from,
                          '--enemy-button-via': theme.button.view.via,
                          '--enemy-button-to': theme.button.view.to,
                          '--enemy-button-hover-from': theme.button.view.hoverFrom,
                          '--enemy-button-hover-via': theme.button.view.hoverVia,
                          '--enemy-button-hover-to': theme.button.view.hoverTo,
                          '--enemy-button-border': theme.button.view.border,
                          '--enemy-button-hover-border': theme.button.view.hoverBorder,
                          '--enemy-button-text': theme.buttonText,
                          '--enemy-button-glow': theme.button.view.glow,
                          '--enemy-button-icon-glow': theme.button.view.iconGlow,
                        }}
                      >
                        Ver ficha
                      </Boton>
                    </div>
                  </div>
                </div>
              </Tarjeta>
            );
          })}
        </div>
        {enemies.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">No hay enemigos creados</p>
            <p className="text-gray-500 text-sm mt-2">
              Crea tu primer enemigo para empezar
            </p>
          </div>
        )}
        {/* Modal para crear/editar enemigo */}
        {showEnemyForm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowEnemyForm(false);
              setEditingEnemy(null);
              setEnemyInputArma('');
              setEnemyInputArmadura('');
              setEnemyInputPoder('');
              setEnemyArmaError('');
              setEnemyArmaduraError('');
              setEnemyPoderError('');
            }}
          >
            <div
              className="bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-lg sm:max-w-6xl max-h-screen sm:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2">
                {editingEnemy ? 'Editar Enemigo' : 'Crear Nuevo Enemigo'}
              </h2>
              <div className="sticky top-0 z-10 -mx-6 px-6 pb-3 bg-gray-800">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  <button type="button" onClick={() => setEnemyEditorTab('ficha')}
                    className={`px-3 py-1 rounded-full border text-sm ${enemyEditorTab === 'ficha' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    Ficha
                  </button>
                  <button type="button" onClick={() => setEnemyEditorTab('equipo')}
                    className={`px-3 py-1 rounded-full border text-sm ${enemyEditorTab === 'equipo' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    Equipo
                  </button>
                </div>
              </div>
              {enemyEditorTab === 'ficha' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna izquierda: Información básica */}
                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre
                    </label>
                    <Input
                      value={newEnemy.name}
                      onChange={(e) =>
                        setNewEnemy({ ...newEnemy, name: e.target.value })
                      }
                      placeholder="Nombre del enemigo"
                      className="w-full"
                    />
                  </div>
                  {/* Retrato */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Retrato
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    {newEnemy.portrait && (
                      <div className="mt-2 flex w-full max-w-md flex-col items-center gap-3">
                        <div className="aspect-square w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-800/80 shadow-inner">
                          <img
                            src={newEnemy.portrait}
                            alt="Preview"
                            className="h-full w-full object-contain object-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRecropPortrait}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-100 shadow-[0_0_14px_rgba(250,204,21,0.12)] transition hover:border-amber-300/60 hover:bg-amber-500/20"
                        >
                          <FiCrop className="text-base" /> Ajustar recorte
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={newEnemy.description}
                      onChange={(e) =>
                        setNewEnemy({
                          ...newEnemy,
                          description: e.target.value,
                        })
                      }
                      placeholder="Descripción del enemigo"
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-20 resize-none"
                    />
                  </div>
                  {/* Etiquetas personalizadas */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Etiquetas de criatura
                    </label>
                    <p className="text-xs text-gray-400">
                      Personaliza la línea «Criatura — Enemigo» añadiendo tus propias etiquetas.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        value={enemyTagInput}
                        onChange={(e) => setEnemyTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleEnemyTagAdd();
                          }
                        }}
                        placeholder="Añadir etiqueta"
                        className="flex-1 min-w-[8rem]"
                      />
                      <button
                        type="button"
                        onClick={handleEnemyTagAdd}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100 shadow-[0_0_12px_rgba(250,204,21,0.15)] transition hover:border-amber-300/60 hover:bg-amber-500/20"
                      >
                        <FiPlus /> Añadir
                      </button>
                    </div>
                    {newEnemy.tags && newEnemy.tags.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {newEnemy.tags.map((tag, index) => (
                          <div
                            key={`${tag}-${index}`}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-700/60 bg-gray-800/60 px-3 py-2"
                          >
                            {enemyEditingTagIndex === index ? (
                              <>
                                <Input
                                  value={enemyTagDraft}
                                  onChange={(e) => setEnemyTagDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleEnemyTagEditSave();
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleEnemyTagEditCancel();
                                    }
                                  }}
                                  className="flex-1 min-w-[6rem]"
                                />
                                <button
                                  type="button"
                                  onClick={handleEnemyTagEditSave}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20"
                                  aria-label="Guardar etiqueta"
                                >
                                  <FiCheck />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleEnemyTagEditCancel}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/10 text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-500/20"
                                  aria-label="Cancelar edición"
                                >
                                  <FiX />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-sm font-medium text-amber-100/90">
                                  {tag}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleEnemyTagEditStart(index)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-100 transition hover:border-indigo-300/60 hover:bg-indigo-500/20"
                                  aria-label={`Editar etiqueta ${tag}`}
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEnemyTagRemove(index)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/10 text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-500/20"
                                  aria-label={`Eliminar etiqueta ${tag}`}
                                >
                                  <FiX />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleEnemyTagReset}
                        className="rounded-full border border-gray-600 bg-gray-700/60 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-gray-200 transition hover:border-gray-400 hover:bg-gray-600/60"
                      >
                        Restablecer etiquetas
                      </button>
                    </div>
                  </div>
                  {/* Tema visual de la carta */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Color base del estilo
                    </label>
                    <p className="text-xs text-gray-400">
                      Selecciona un color y generaremos automáticamente el degradado y los acentos de la carta.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <input
                        type="color"
                        value={newEnemy.themeColor || DEFAULT_ENEMY_THEME_COLOR}
                        onChange={(e) => handleEnemyThemeColorCommit(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border border-gray-600 bg-gray-700"
                        aria-label="Elegir color base"
                      />
                      <Input
                        value={enemyThemeColorDraft}
                        onChange={(e) => handleEnemyThemeColorInputChange(e.target.value)}
                        onBlur={handleEnemyThemeColorBlur}
                        placeholder="#facc15"
                        className="w-28"
                      />
                      <button
                        type="button"
                        onClick={() => handleEnemyThemeColorCommit(DEFAULT_ENEMY_THEME_COLOR)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-gray-700/60 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-gray-200 transition hover:border-gray-400 hover:bg-gray-600/60"
                      >
                        Restablecer color
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ENEMY_THEME_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleEnemyThemeColorCommit(preset)}
                          className={`h-8 w-8 rounded-full border ${
                            normalizeHexColor(newEnemy.themeColor) === normalizeHexColor(preset)
                              ? 'border-amber-300 shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                              : 'border-gray-600'
                          } transition`}
                          style={{ background: preset }}
                          aria-label={`Usar color ${preset}`}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Nivel y Experiencia */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nivel
                      </label>
                      <Input
                        type="number"
                        value={newEnemy.nivel}
                        onChange={(e) =>
                          setNewEnemy({
                            ...newEnemy,
                            nivel: parseInt(e.target.value) || 1,
                          })
                        }
                        min="1"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Experiencia
                      </label>
                      <Input
                        type="number"
                        value={newEnemy.experiencia}
                        onChange={(e) =>
                          setNewEnemy({
                            ...newEnemy,
                            experiencia: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        className="w-full"
                      />
                    </div>
                  </div>
                  {/* Dinero */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Dinero
                    </label>
                    <Input
                      type="number"
                      value={newEnemy.dinero}
                      onChange={(e) =>
                        setNewEnemy({
                          ...newEnemy,
                          dinero: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      className="w-full"
                    />
                  </div>
                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Notas
                    </label>
                    <textarea
                      value={newEnemy.notas}
                      onChange={(e) =>
                        setNewEnemy({ ...newEnemy, notas: e.target.value })
                      }
                      placeholder="Notas adicionales sobre el enemigo"
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-16 resize-none"
                    />
                  </div>
                </div>
                {/* Columna derecha: Atributos y Estadísticas */}
                <div className="space-y-4">
                  {/* Atributos */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Atributos</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {atributos.map((attr) => (
                        <div key={attr} className="flex items-center gap-2">
                          <label className="text-sm font-medium w-16">
                            {attr}:
                          </label>
                          <select
                            value={newEnemy.atributos[attr] || 'D4'}
                            onChange={(e) => {
                              const newAtributos = {
                                ...newEnemy.atributos,
                                [attr]: e.target.value,
                              };
                              const updatedEnemy = {
                                ...newEnemy,
                                atributos: newAtributos,
                              };
                              setNewEnemy(updatedEnemy);
                            }}
                            className="flex-1 p-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          >
                            {DADOS.map((dado) => (
                              <option key={dado} value={dado}>
                                {dado}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Estadísticas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Estadísticas</h3>
                    <div className="space-y-3">
                      {defaultRecursos.map((recurso) => {
                        const stat = newEnemy.stats[recurso] || {
                          base: 0,
                          total: 0,
                          actual: 0,
                          buff: 0,
                        };
                        const color = recursoColor[recurso] || '#ffffff';
                        return (
                          <div key={recurso} className="space-y-2">
                            {/* Línea minimalista como en fichas de jugador */}
                            <div className="flex items-center justify-between">
                              <span
                                className="text-sm font-medium capitalize"
                                style={{ color }}
                              >
                                {recurso}
                              </span>
                              <div className="flex gap-2 text-xs">
                                <span className="text-gray-400">
                                  Base: {stat.base}
                                </span>
                                <span className="text-green-400">
                                  +{stat.buff}
                                </span>
                                <span className="text-blue-400">
                                  = {stat.total}
                                </span>
                                <span className="text-yellow-400">
                                  ({stat.actual})
                                </span>
                              </div>
                            </div>
                            {/* Controles de edición */}
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                placeholder="Base"
                                value={stat.base}
                                onChange={(e) => {
                                  const newStats = { ...newEnemy.stats };
                                  if (!newStats[recurso])
                                    newStats[recurso] = {
                                      base: 0,
                                      total: 0,
                                      actual: 0,
                                      buff: 0,
                                    };
                                  newStats[recurso].base =
                                    parseInt(e.target.value) || 0;
                                  newStats[recurso].total =
                                    newStats[recurso].base +
                                    newStats[recurso].buff;
                                  if (newStats[recurso].actual === 0) {
                                    newStats[recurso].actual =
                                      newStats[recurso].total;
                                  }
                                  setNewEnemy({ ...newEnemy, stats: newStats });
                                }}
                                className="text-sm"
                              />
                              <Input
                                type="number"
                                placeholder="Buff"
                                value={stat.buff}
                                onChange={(e) => {
                                  const newStats = { ...newEnemy.stats };
                                  if (!newStats[recurso])
                                    newStats[recurso] = {
                                      base: 0,
                                      total: 0,
                                      actual: 0,
                                      buff: 0,
                                    };
                                  newStats[recurso].buff =
                                    parseInt(e.target.value) || 0;
                                  newStats[recurso].total =
                                    newStats[recurso].base +
                                    newStats[recurso].buff;
                                  setNewEnemy({ ...newEnemy, stats: newStats });
                                }}
                                className="text-sm"
                              />
                              <Input
                                type="number"
                                placeholder="Actual"
                                value={stat.actual}
                                onChange={(e) => {
                                  const newStats = { ...newEnemy.stats };
                                  if (!newStats[recurso])
                                    newStats[recurso] = {
                                      base: 0,
                                      total: 0,
                                      actual: 0,
                                      buff: 0,
                                    };
                                  newStats[recurso].actual =
                                    parseInt(e.target.value) || 0;
                                  setNewEnemy({ ...newEnemy, stats: newStats });
                                }}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                </div>
              )}
              {/* Sección de Equipo */}
              {enemyEditorTab === 'equipo' && (<div className="mt-2 space-y-4">
                <h3 className="text-lg font-semibold">Equipo</h3>
                {/* Armas Equipadas */}
                <div>
                  <h4 className="font-medium mb-2">Armas Equipadas</h4>
                  <div className="grid grid-cols-1 gap-2 mb-2">
                    {newEnemy.weapons.map((weapon, index) => (
                      <Tarjeta key={index} variant="weapon" className="text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">⚔️</span>
                              <p className="font-bold">{weapon.nombre}</p>
                            </div>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Daño:</span>{' '}
                              {dadoIcono()} {weapon.dano}{' '}
                              {iconoDano(weapon.tipoDano)}
                            </p>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Alcance:</span>{' '}
                              {weapon.alcance}
                            </p>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Consumo:</span>{' '}
                              {weapon.consumo}
                            </p>
                            {weapon.rasgos && weapon.rasgos.length > 0 && (
                              <p className="text-xs mb-1">
                                <span className="font-medium">Rasgos:</span>{' '}
                                {highlightText(weapon.rasgos.join(', '))}
                              </p>
                            )}
                            {weapon.descripcion && (
                              <p className="text-xs text-gray-300">
                                <span className="font-medium">
                                  Descripción:
                                </span>{' '}
                                {highlightText(weapon.descripcion)}
                              </p>
                            )}
                          </div>
                          <Boton
                            color="red"
                            size="sm"
                            onClick={() => unequipEnemyWeapon(index)}
                            className="text-xs px-2 py-1 ml-2"
                          >
                            ✕
                          </Boton>
                        </div>
                      </Tarjeta>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Buscar arma para equipar"
                      value={enemyInputArma}
                      onChange={(e) => setEnemyInputArma(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleEnemyEquipWeapon()
                      }
                      className="flex-1 text-sm"
                    />
                    {enemyArmaSugerencias.length > 0 && (
                      <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                        {enemyArmaSugerencias.map((a) => (
                          <li
                            key={a.nombre}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                            onClick={() =>
                              handleEnemyEquipWeaponFromSuggestion(a.nombre)
                            }
                          >
                            {a.nombre}
                          </li>
                        ))}
                      </ul>
                    )}
                    {enemyArmaError && (
                      <p className="text-red-400 text-xs mt-1">
                        {enemyArmaError}
                      </p>
                    )}
                  </div>
                </div>
                {/* Armaduras Equipadas */}
                <div>
                  <h4 className="font-medium mb-2">Armaduras Equipadas</h4>
                  <div className="grid grid-cols-1 gap-2 mb-2">
                    {newEnemy.armaduras.map((armor, index) => (
                      <Tarjeta key={index} variant="armor" className="text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">🛡️</span>
                              <p className="font-bold">{armor.nombre}</p>
                            </div>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Defensa:</span>{' '}
                              {armor.defensa}
                            </p>
                            {armor.rasgos && armor.rasgos.length > 0 && (
                              <p className="text-xs mb-1">
                                <span className="font-medium">Rasgos:</span>{' '}
                                {highlightText(armor.rasgos.join(', '))}
                              </p>
                            )}
                            {armor.descripcion && (
                              <p className="text-xs text-gray-300">
                                <span className="font-medium">
                                  Descripción:
                                </span>{' '}
                                {highlightText(armor.descripcion)}
                              </p>
                            )}
                          </div>
                          <Boton
                            color="red"
                            size="sm"
                            onClick={() => unequipEnemyArmor(index)}
                            className="text-xs px-2 py-1 ml-2"
                          >
                            ✕
                          </Boton>
                        </div>
                      </Tarjeta>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Buscar armadura para equipar"
                      value={enemyInputArmadura}
                      onChange={(e) => setEnemyInputArmadura(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleEnemyEquipArmor()
                      }
                      className="flex-1 text-sm"
                    />
                    {enemyArmaduraSugerencias.length > 0 && (
                      <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                        {enemyArmaduraSugerencias.map((a) => (
                          <li
                            key={a.nombre}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                            onClick={() =>
                              handleEnemyEquipArmorFromSuggestion(a.nombre)
                            }
                          >
                            {a.nombre}
                          </li>
                        ))}
                      </ul>
                    )}
                    {enemyArmaduraError && (
                      <p className="text-red-400 text-xs mt-1">
                        {enemyArmaduraError}
                      </p>
                    )}
                  </div>
                </div>
                {/* Poderes Equipados */}
                <div>
                  <h4 className="font-medium mb-2">Poderes Equipados</h4>
                  <div className="grid grid-cols-1 gap-2 mb-2">
                    {newEnemy.poderes.map((power, index) => (
                      <Tarjeta key={index} variant="power" className="text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">💪</span>
                              <p className="font-bold">{power.nombre}</p>
                            </div>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Daño:</span>{' '}
                              {power.poder}
                            </p>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Alcance:</span>{' '}
                              {power.alcance}
                            </p>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Consumo:</span>{' '}
                              {power.consumo}
                            </p>
                            {power.rasgos && power.rasgos.length > 0 && (
                              <p className="text-xs mb-1">
                                <span className="font-medium">Rasgos:</span>{' '}
                                {highlightText(power.rasgos.join(', '))}
                              </p>
                            )}
                            {power.descripcion && (
                              <p className="text-xs text-gray-300">
                                <span className="font-medium">
                                  Descripción:
                                </span>{' '}
                                {highlightText(power.descripcion)}
                              </p>
                            )}
                          </div>
                          <Boton
                            color="red"
                            size="sm"
                            onClick={() => unequipEnemyPower(index)}
                            className="text-xs px-2 py-1 ml-2"
                          >
                            ✕
                          </Boton>
                        </div>
                      </Tarjeta>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Buscar poder para equipar"
                      value={enemyInputPoder}
                      onChange={(e) => setEnemyInputPoder(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleEnemyEquipPower()
                      }
                      className="flex-1 text-sm"
                    />
                    {enemyPoderSugerencias.length > 0 && (
                      <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                        {enemyPoderSugerencias.map((a) => (
                          <li
                            key={a.nombre}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                            onClick={() =>
                              handleEnemyEquipPowerFromSuggestion(a.nombre)
                            }
                          >
                            {a.nombre}
                          </li>
                        ))}
                      </ul>
                    )}
                    {enemyPoderError && (
                      <p className="text-red-400 text-xs mt-1">
                        {enemyPoderError}
                      </p>
                    )}
                  </div>
                </div>
              </div>)}
              {/* Botones sticky */}
              <div className="sticky bottom-0 left-0 right-0 -mx-6 px-6 py-3 bg-gray-900/95 border-t border-gray-700 mt-4">
                <div className="flex gap-2">
                  <Boton
                    color="green"
                    onClick={handleSaveEnemy}
                    className="flex-1"
                  >
                    {editingEnemy ? 'Actualizar' : 'Crear'} Enemigo
                  </Boton>
                  <Boton
                    color="gray"
                    onClick={() => {
                      setShowEnemyForm(false);
                      setEditingEnemy(null);
                      setEnemyInputArma('');
                      setEnemyInputArmadura('');
                      setEnemyInputPoder('');
                      setEnemyArmaError('');
                      setEnemyArmaduraError('');
                      setEnemyPoderError('');
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Boton>
                </div>
              </div>
            </div>
          </div>
        )}
        {showImageCropper && imageCropSource && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
            onClick={closeCropper}
          >
            <div
              className="relative w-full max-w-3xl rounded-2xl bg-gray-900/95 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-amber-100">Ajustar retrato</h3>
              <p className="mt-1 text-sm text-gray-300">
                Arrastra la imagen y usa el zoom para elegir qué parte se mostrará en la carta del enemigo.
              </p>
              <div className="relative mt-4 h-[55vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-amber-300/30 bg-black/40">
                <Cropper
                  image={imageCropSource}
                  crop={imageCrop}
                  zoom={imageCropZoom}
                  aspect={3 / 4}
                  cropShape="rect"
                  showGrid={false}
                  onCropChange={setImageCrop}
                  onCropComplete={handleCropComplete}
                  onZoomChange={setImageCropZoom}
                  objectFit="cover"
                />
              </div>
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex w-full max-w-sm items-center gap-3 text-sm text-amber-100/80">
                  <span className="uppercase tracking-[0.24em] text-amber-200/70">Zoom</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={imageCropZoom}
                    onChange={(e) => setImageCropZoom(Number(e.target.value))}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-amber-500/20 accent-amber-300"
                  />
                </label>
                <div className="flex flex-1 justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCropper}
                    disabled={imageCropLoading}
                    className="rounded-full border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCrop}
                    disabled={imageCropLoading}
                    className={`inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/20 px-5 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300/70 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                      imageCropLoading ? 'cursor-wait' : ''
                    }`}
                  >
                    {imageCropLoading && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-200 border-t-transparent" />
                    )}
                    Guardar recorte
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Modal para ver ficha completa */}
        {selectedEnemy && (
          <EnemyViewModal
            enemy={selectedEnemy}
            onClose={() => setSelectedEnemy(null)}
            onEdit={editEnemy}
            onDuplicate={duplicateEnemy}
            onSendToMap={sendEnemyToMap}
            highlightText={highlightText}
          />
        )}
      </div>
    );
  }
  if (userType === 'master' && authenticated && chosenView === 'minimap') {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-gray-900 text-gray-100 p-4">Cargando Minimapa…</div>}>
        <MinimapBuilder
          mode="master"
          onBack={() => setChosenView(null)}
        />
      </React.Suspense>
    );
  }
  if (userType === 'master' && authenticated && chosenView === 'canvas') {
    return (
      <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-4 pl-16 overflow-hidden">
        <div className="sticky top-0 bg-gray-900 z-10 h-14 flex items-center justify-between mb-4 mr-80">
          <h1 className="text-2xl font-bold">🗺️ Mapa de Batalla</h1>
          <div className="flex flex-wrap gap-2">
            <Boton
              size="sm"
              onClick={() => setChosenView(null)}
              className="bg-gray-700 hover:bg-gray-600"
            >
              ← Menú Máster
            </Boton>
            <Boton
              size="sm"
              color="red"
              onClick={() => setChosenView('enemies')}
            >
              Fichas de Enemigos
            </Boton>
            <Boton
              size="sm"
              color="blue"
              onClick={() => setChosenView('initiative')}
            >
              Sistema de Velocidad
            </Boton>
            <Boton
              size="sm"
              color="purple"
              onClick={() => setChosenView('tools')}
            >
              Herramientas
            </Boton>
            <label className="flex items-center gap-1 text-sm ml-2">
              <input
                type="checkbox"
                checked={showVisionRanges}
                onChange={(e) => setShowVisionRanges(e.target.checked)}
              />
              Rangos de visión
            </label>
          </div>
        </div>
        <div className="mb-4 mr-80">
          <label className="relative inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold tracking-wide rounded-lg bg-gradient-to-b from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 focus:ring-gray-500 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-95 transform shadow-md hover:shadow-lg cursor-pointer text-white">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Subir Mapa
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        </div>
        <div className="mr-80">
          <PageSelector
            pages={pages}
            current={currentPage}
            onSelect={setCurrentPage}
            onAdd={addPage}
            onUpdate={updatePage}
            onDelete={deletePage}
            playerVisiblePageId={playerVisiblePageId}
            onPlayerVisiblePageChange={updatePlayerVisiblePage}
          />
        </div>
        <div className="relative pt-14 flex-1 overflow-hidden">
          <div className="h-full mr-80">
            <MapCanvas
              backgroundImage={
                canvasBackground || 'https://via.placeholder.com/800x600'
              }
              gridSize={gridSize}
              gridCells={gridCells}
              gridOffsetX={gridOffsetX}
              gridOffsetY={gridOffsetY}
              showGrid={showGrid}
              gridColor={gridColor}
              gridOpacity={gridOpacity}
              tokens={canvasTokens}
              onTokensChange={(updater) => {
                setCanvasTokens((prev) => {
                  const next =
                    typeof updater === 'function' ? updater(prev) : updater;
                  const changed = diffTokens(prev, next);
                  changed.forEach((tk) =>
                    pendingTokenChangesRef.current.set(String(tk.id), tk)
                  );
                  return next;
                });
                isRemoteTokenUpdate.current = false;
                isLocalTokenEdit.current = true;
              }}
              texts={canvasTexts}
              onTextsChange={setCanvasTexts}
              lines={canvasLines}
              onLinesChange={setCanvasLines}
              walls={canvasWalls}
              onWallsChange={setCanvasWalls}
              enemies={enemies}
              onEnemyUpdate={updateEnemyFromToken}
              players={existingPlayers}
              armas={armas}
              armaduras={armaduras}
              habilidades={habilidades}
              highlightText={highlightText}
              userType={userType}
              playerName={playerName}
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
              enableDarkness={enableDarkness}
              darknessOpacity={pages[currentPage]?.darknessOpacity || 0.7}
              showVisionPolygons={showVisionRanges}
              pageId={pages[currentPage]?.id}
              onGridSettingsChange={handleGridSettingsChange}
            />
          </div>
          <AssetSidebar isMaster={authenticated} playerName={playerName} />
        </div>
      </div>
    );
  }
  if (userType === 'master' && authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <div className="sticky top-0 bg-gray-900 pb-2 z-10">
          <h1 className="text-2xl font-bold mb-2">Modo Máster</h1>
          <div className="flex flex-wrap gap-2 mb-2">
            <Boton onClick={() => setChosenView(null)}>← Menú Máster</Boton>
            <Boton onClick={volverAlMenu}>Volver al menú principal</Boton>
            <Boton onClick={refreshCatalog}>Refrescar catálogo</Boton>
          </div>
          <div className="flex justify-center">
            <Input
              placeholder="Buscar en el catálogo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md text-center"
            />
          </div>
        </div>
        <Collapsible title="Objetos de inventario personalizados" defaultOpen={false}>
          <CustomItemManager />
        </Collapsible>
        <Collapsible
          title={
            editingTerm
              ? `Editar término: ${editingTerm}`
              : 'Añadir término destacado'
          }
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Palabra"
              value={newTerm.word}
              onChange={(e) =>
                setNewTerm((t) => ({ ...t, word: e.target.value }))
              }
            />
            <input
              type="color"
              value={newTerm.color}
              onChange={(e) =>
                setNewTerm((t) => ({ ...t, color: e.target.value }))
              }
              className="w-10 h-8 border-none p-0 rounded"
            />
            <textarea
              className="bg-gray-700 text-white rounded px-2 py-1 sm:col-span-2"
              placeholder="Descripción"
              value={newTerm.info}
              onChange={(e) =>
                setNewTerm((t) => ({ ...t, info: e.target.value }))
              }
            />
            <div className="sm:col-span-2 flex justify-between items-center">
              {editingTerm && (
                <Boton
                  color="gray"
                  onClick={() => {
                    setEditingTerm(null);
                    setNewTerm({ word: '', color: '#ffff00', info: '' });
                  }}
                >
                  Cancelar
                </Boton>
              )}
              <Boton color="green" onClick={saveTerm}>
                {editingTerm ? 'Actualizar' : 'Guardar'} término
              </Boton>
            </div>
            {newTermError && (
              <p className="text-red-400 text-center sm:col-span-2">
                {newTermError}
              </p>
            )}
          </div>
        </Collapsible>
        <Collapsible title="Glosario" defaultOpen={false}>
          {glossary.length === 0 ? (
            <p className="text-gray-400">No hay términos.</p>
          ) : (
            <ul className="space-y-2">
              {glossary.map((t, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span className="mr-2">
                    <span style={{ color: t.color }} className="font-bold">
                      {t.word}
                    </span>{' '}
                    - {t.info}
                  </span>
                  <div className="flex gap-2">
                    <Boton
                      color="blue"
                      onClick={() => startEditTerm(t)}
                      className="px-2 py-1 text-sm"
                    >
                      Editar
                    </Boton>
                    <Boton
                      color="red"
                      onClick={() => deleteTerm(t.word)}
                      className="px-2 py-1 text-sm"
                    >
                      Borrar
                    </Boton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Collapsible>
        <Collapsible
          title={
            editingWeapon
              ? `Editar arma: ${editingWeapon}`
              : 'Crear nueva arma'
          }
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Nombre"
              value={newWeaponData.nombre}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, nombre: e.target.value }))
              }
            />
            <Input
              placeholder="Daño"
              value={newWeaponData.dano}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, dano: e.target.value }))
              }
            />
            <Input
              placeholder="Alcance"
              value={newWeaponData.alcance}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, alcance: e.target.value }))
              }
            />
            <Input
              placeholder="Consumo"
              value={newWeaponData.consumo}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, consumo: e.target.value }))
              }
            />
            <Input
              placeholder="Carga física"
              value={newWeaponData.cargaFisica}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, cargaFisica: e.target.value }))
              }
            />
            <Input
              placeholder="Carga mental"
              value={newWeaponData.cargaMental}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, cargaMental: e.target.value }))
              }
            />
            <Input
              placeholder="Rasgos (separados por comas)"
              value={newWeaponData.rasgos}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, rasgos: e.target.value }))
              }
            />
            <Input
              placeholder="Tipo de daño"
              value={newWeaponData.tipoDano}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, tipoDano: e.target.value }))
              }
            />
            <Input
              placeholder="Valor"
              value={newWeaponData.valor}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, valor: e.target.value }))
              }
            />
            <Input
              placeholder="Tecnología"
              value={newWeaponData.tecnologia}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, tecnologia: e.target.value }))
              }
            />
            <textarea
              className="bg-gray-700 text-white rounded px-2 py-1 sm:col-span-2"
              placeholder="Descripción"
              value={newWeaponData.descripcion}
              onChange={(e) =>
                setNewWeaponData((w) => ({ ...w, descripcion: e.target.value }))
              }
            />
            <div className="sm:col-span-2 flex justify-between items-center">
              {editingWeapon && (
                <Boton
                  color="gray"
                  onClick={() => {
                    setEditingWeapon(null);
                    setNewWeaponData({
                      nombre: '',
                      dano: '',
                      alcance: '',
                      consumo: '',
                      cargaFisica: '',
                      cargaMental: '',
                      rasgos: '',
                      descripcion: '',
                      tipoDano: '',
                      valor: '',
                      tecnologia: '',
                    });
                  }}
                >
                  Cancelar
                </Boton>
              )}
              <Boton color="green" onClick={agregarArma}>
                {editingWeapon ? 'Actualizar' : 'Guardar'} arma
              </Boton>
            </div>
            {newWeaponError && (
              <p className="text-red-400 text-center sm:col-span-2">
                {newWeaponError}
              </p>
            )}
          </div>
        </Collapsible>
        <Collapsible
          title={
            editingArmor
              ? `Editar armadura: ${editingArmor}`
              : 'Crear nueva armadura'
          }
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Nombre"
              value={newArmorData.nombre}
              onChange={(e) =>
                setNewArmorData((a) => ({ ...a, nombre: e.target.value }))
              }
            />
            <Input
              placeholder="Defensa"
              value={newArmorData.defensa}
              onChange={(e) =>
                setNewArmorData((a) => ({ ...a, defensa: e.target.value }))
              }
            />
            <Input
              placeholder="Carga física"
              value={newArmorData.cargaFisica}
              onChange={(e) =>
                setNewArmorData((a) => ({ ...a, cargaFisica: e.target.value }))
              }
            />
            <Input
              placeholder="Carga mental"
              value={newArmorData.cargaMental}
              onChange={(e) =>
                setNewArmorData((a) => ({ ...a, cargaMental: e.target.value }))
              }
            />
            <Input
              placeholder="Rasgos (separados por comas)"
              value={newArmorData.rasgos}
              onChange={(e) =>
                setNewArmorData((a) => ({ ...a, rasgos: e.target.value }))
              }
            />
            <Input
              placeholder="Valor"
              value={newArmorData.valor}
              onChange={(e) =>
                setNewArmorData((a) => ({ ...a, valor: e.target.value }))
              }
            />
            <Input
              placeholder="Tecnología"
              value={newArmorData.tecnologia}
              onChange={(e) =>
                setNewArmorData((a) => ({ ...a, tecnologia: e.target.value }))
              }
            />
            <textarea
              className="bg-gray-700 text-white rounded px-2 py-1 sm:col-span-2"
              placeholder="Descripción"
              value={newArmorData.descripcion}
              onChange={(e) =>
                setNewArmorData((a) => ({ ...a, descripcion: e.target.value }))
              }
            />
            <div className="sm:col-span-2 flex justify-between items-center">
              {editingArmor && (
                <Boton
                  color="gray"
                  onClick={() => {
                    setEditingArmor(null);
                    setNewArmorData({
                      nombre: '',
                      defensa: '',
                      cargaFisica: '',
                      cargaMental: '',
                      rasgos: '',
                      descripcion: '',
                      valor: '',
                      tecnologia: '',
                    });
                  }}
                >
                  Cancelar
                </Boton>
              )}
              <Boton color="green" onClick={agregarArmadura}>
                {editingArmor ? 'Actualizar' : 'Guardar'} armadura
              </Boton>
            </div>
            {newArmorError && (
              <p className="text-red-400 text-center sm:col-span-2">
                {newArmorError}
              </p>
            )}
          </div>
        </Collapsible>
        <Collapsible
          title={
            editingAbility
              ? `Editar habilidad: ${editingAbility}`
              : 'Crear nueva habilidad'
          }
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Nombre"
              value={newAbility.nombre}
              onChange={(e) =>
                setNewAbility((a) => ({ ...a, nombre: e.target.value }))
              }
            />
            <Input
              placeholder="Alcance"
              value={newAbility.alcance}
              onChange={(e) =>
                setNewAbility((a) => ({ ...a, alcance: e.target.value }))
              }
            />
            <Input
              placeholder="Consumo"
              value={newAbility.consumo}
              onChange={(e) =>
                setNewAbility((a) => ({ ...a, consumo: e.target.value }))
              }
            />
            <Input
              placeholder="Cuerpo"
              value={newAbility.cuerpo}
              onChange={(e) =>
                setNewAbility((a) => ({ ...a, cuerpo: e.target.value }))
              }
            />
            <Input
              placeholder="Mente"
              value={newAbility.mente}
              onChange={(e) =>
                setNewAbility((a) => ({ ...a, mente: e.target.value }))
              }
            />
            <Input
              placeholder="Rasgos (separados por comas)"
              value={newAbility.rasgos}
              onChange={(e) =>
                setNewAbility((a) => ({ ...a, rasgos: e.target.value }))
              }
            />
            <Input
              placeholder="Daño"
              value={newAbility.poder}
              onChange={(e) =>
                setNewAbility((a) => ({ ...a, poder: e.target.value }))
              }
            />
            <textarea
              className="bg-gray-700 text-white rounded px-2 py-1 sm:col-span-2"
              placeholder="Descripción"
              value={newAbility.descripcion}
              onChange={(e) =>
                setNewAbility((a) => ({ ...a, descripcion: e.target.value }))
              }
            />
            <div className="sm:col-span-2 flex justify-between items-center">
              {editingAbility && (
                <Boton
                  color="gray"
                  onClick={() => {
                    setEditingAbility(null);
                    setNewAbility({
                      nombre: '',
                      alcance: '',
                      consumo: '',
                      cuerpo: '',
                      mente: '',
                      poder: '',
                      rasgos: '',
                      descripcion: '',
                    });
                  }}
                >
                  Cancelar
                </Boton>
              )}
              <Boton color="green" onClick={agregarHabilidad}>
                {editingAbility ? 'Actualizar' : 'Guardar'} habilidad
              </Boton>
            </div>
            {newAbilityError && (
              <p className="text-red-400 text-center sm:col-span-2">
                {newAbilityError}
              </p>
            )}
          </div>
        </Collapsible>
        {loading ? (
          <p>Cargando catálogo…</p>
        ) : (
          <>
            {/* Mostrar pestañas solo si hay búsqueda activa */}
            {searchTerm.trim() && (
              <>
                {/* Mostrar Armas si hay coincidencias */}
                {(() => {
                  const armasFiltradas = armas.filter(
                    (a) =>
                      a.nombre
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      a.descripcion
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                  );
                  return (
                    armasFiltradas.length > 0 && (
                      <Collapsible
                        title={`Armas (${armasFiltradas.length})`}
                        defaultOpen={true}
                      >
                        {armasFiltradas.map((a, i) => (
                          <Tarjeta key={`arma-${i}`} variant="weapon">
                            <p className="font-bold text-lg">{a.nombre}</p>
                            <p>
                              <strong>Daño:</strong> {dadoIcono()} {a.dano}{' '}
                              {iconoDano(a.tipoDano)}
                            </p>
                            <p>
                              <strong>Alcance:</strong> {a.alcance}
                            </p>
                            <p>
                              <strong>Consumo:</strong> {a.consumo}
                            </p>
                            <p>
                              <strong>Carga física:</strong>{' '}
                              {parseCargaValue(a.cargaFisica ?? a.carga) > 0
                                ? '🔲'.repeat(
                                    parseCargaValue(a.cargaFisica ?? a.carga)
                                  )
                                : '❌'}
                            </p>
                            <p>
                              <strong>Carga mental:</strong>{' '}
                              {cargaMentalIcon(a.cargaMental)}
                            </p>
                            <p>
                              <strong>Rasgos:</strong>{' '}
                              {a.rasgos.length
                                ? a.rasgos.map((r, ri) => (
                                    <React.Fragment key={ri}>
                                      {highlightText(r)}
                                      {ri < a.rasgos.length - 1 ? ', ' : ''}
                                    </React.Fragment>
                                  ))
                                : '❌'}
                            </p>
                            <p>
                              <strong>Valor:</strong> {a.valor}
                            </p>
                            {a.tecnologia && (
                              <p>
                                <strong>Tecnología:</strong> {a.tecnologia}
                              </p>
                            )}
                            {a.descripcion && (
                              <p className="italic">
                                {highlightText(a.descripcion)}
                              </p>
                            )}
                            {a.fuente === 'custom' && (
                              <div className="flex justify-end gap-2 mt-2">
                                <Boton
                                  color="blue"
                                  onClick={() => startEditWeapon(a)}
                                  className="px-2 py-1 text-sm"
                                >
                                  Editar
                                </Boton>
                                <Boton
                                  color="red"
                                  onClick={() => deleteWeapon(a.nombre)}
                                  className="px-2 py-1 text-sm"
                                >
                                  Borrar
                                </Boton>
                              </div>
                            )}
                          </Tarjeta>
                        ))}
                      </Collapsible>
                    )
                  );
                })()}
                {/* Mostrar Armaduras si hay coincidencias */}
                {(() => {
                  const armadurasFiltradas = armaduras.filter(
                    (a) =>
                      a.nombre
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      a.descripcion
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                  );
                  return (
                    armadurasFiltradas.length > 0 && (
                      <Collapsible
                        title={`Armaduras (${armadurasFiltradas.length})`}
                        defaultOpen={true}
                      >
                        {armadurasFiltradas.map((a, i) => (
                          <Tarjeta key={`armadura-${i}`} variant="armor">
                            <p className="font-bold text-lg">{a.nombre}</p>
                            <p>
                              <strong>Defensa:</strong> {a.defensa}
                            </p>
                            <p>
                              <strong>Carga física:</strong>{' '}
                              {parseCargaValue(a.cargaFisica ?? a.carga) > 0
                                ? '🔲'.repeat(
                                    parseCargaValue(a.cargaFisica ?? a.carga)
                                  )
                                : '❌'}
                            </p>
                            <p>
                              <strong>Carga mental:</strong>{' '}
                              {cargaMentalIcon(a.cargaMental)}
                            </p>
                            <p>
                              <strong>Rasgos:</strong>{' '}
                              {a.rasgos.length
                                ? a.rasgos.map((r, ri) => (
                                    <React.Fragment key={ri}>
                                      {highlightText(r)}
                                      {ri < a.rasgos.length - 1 ? ', ' : ''}
                                    </React.Fragment>
                                  ))
                                : '❌'}
                            </p>
                            <p>
                              <strong>Valor:</strong> {a.valor}
                            </p>
                            {a.tecnologia && (
                              <p>
                                <strong>Tecnología:</strong> {a.tecnologia}
                              </p>
                            )}
                            {a.descripcion && (
                              <p className="italic">
                                {highlightText(a.descripcion)}
                              </p>
                            )}
                            {a.fuente === 'custom' && (
                              <div className="flex justify-end gap-2 mt-2">
                                <Boton
                                  color="blue"
                                  onClick={() => startEditArmor(a)}
                                  className="px-2 py-1 text-sm"
                                >
                                  Editar
                                </Boton>
                                <Boton
                                  color="red"
                                  onClick={() => deleteArmor(a.nombre)}
                                  className="px-2 py-1 text-sm"
                                >
                                  Borrar
                                </Boton>
                              </div>
                            )}
                          </Tarjeta>
                        ))}
                      </Collapsible>
                    )
                  );
                })()}
                {/* Mostrar Habilidades si hay coincidencias */}
                {(() => {
                  const habilidadesFiltradas = habilidades.filter(
                    (h) =>
                      h.nombre
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      (h.descripcion || '')
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                  );
                  return (
                    habilidadesFiltradas.length > 0 && (
                      <Collapsible
                        title={`Habilidades (${habilidadesFiltradas.length})`}
                        defaultOpen={true}
                      >
                        {habilidadesFiltradas.map((h, i) => (
                          <Tarjeta key={`hab-${i}`} variant="power">
                            <p className="font-bold text-lg">{h.nombre}</p>
                            <p>
                              <strong>Alcance:</strong> {h.alcance}
                            </p>
                            <p>
                              <strong>Consumo:</strong> {h.consumo}
                            </p>
                            <p>
                              <strong>Cuerpo:</strong> {h.cuerpo}
                            </p>
                            <p>
                              <strong>Mente:</strong> {h.mente}
                            </p>
                            {h.rasgos && h.rasgos.length > 0 && (
                              <p>
                                <strong>Rasgos:</strong> {h.rasgos.join(', ')}
                              </p>
                            )}
                            <p>
                              <strong>Daño:</strong> {h.poder}
                            </p>
                            {h.descripcion && (
                              <p className="italic">
                                {highlightText(h.descripcion)}
                              </p>
                            )}
                            <div className="flex justify-end gap-2 mt-2">
                              <Boton
                                color="blue"
                                onClick={() => startEditAbility(h)}
                                className="px-2 py-1 text-sm"
                              >
                                Editar
                              </Boton>
                              <Boton
                                color="red"
                                onClick={() => deleteAbility(h.nombre)}
                                className="px-2 py-1 text-sm"
                              >
                                Borrar
                              </Boton>
                            </div>
                          </Tarjeta>
                        ))}
                      </Collapsible>
                    )
                  );
                })()}
              </>
            )}
            {/* Mostrar mensaje cuando no hay búsqueda activa */}
            {!searchTerm.trim() && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">
                  Usa el buscador para explorar el catálogo
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Las pestañas se abrirán automáticamente cuando busques
                </p>
              </div>
            )}
            {/* Mostrar mensaje cuando no hay resultados */}
            {searchTerm.trim() &&
              armas.filter(
                (a) =>
                  a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  a.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 &&
              armaduras.filter(
                (a) =>
                  a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  a.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 &&
              habilidades.filter(
                (h) =>
                  h.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (h.descripcion || '')
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">
                    No se encontraron resultados para "{searchTerm}"
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Intenta con otros términos de búsqueda
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    );
  }
  // FALLBACK
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <p>Algo salió mal. Vuelve al menú.</p>
      <Boton onClick={volverAlMenu}>Volver al menú</Boton>
    </div>
  );
}
// Componente principal envuelto con ToastProvider
const AppWithProviders = () => {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
};
export default AppWithProviders;
