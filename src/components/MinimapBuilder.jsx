import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import PropTypes from 'prop-types';
import Boton from './Boton';
import Modal from './Modal';
import { ESTADOS } from './EstadoSelector';
import HexColorInput from './HexColorInput';
import { getOrUploadFile } from '../utils/storage';
import { updateMinimapExplorationCells } from '../utils/minimapExploration';
import useConfirm from '../hooks/useConfirm';
import * as LucideIcons from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';

const L = {
  arrow: '\u2190',
  back: 'Men\u00FA M\u00E1ster',
  new: 'NUEVO',
  autoFit: 'Auto-ajustar',
  moveMode: 'Mover mapa',
  readable: 'Modo legible',
  shapeEdit: 'Editar forma',
  quadrant: 'Cuadrante',
  rows: 'Filas',
  cols: 'Columnas',
  cellSize: 'Tama\u00F1o de celda',
  selectedCell: 'Celda seleccionada',
  cellPropsOpen: 'Propiedades de celda',
  cellPropsClose: 'Ocultar propiedades',
  quadrantPanelOpen: 'Opciones de cuadrante',
  quadrantPanelClose: 'Ocultar opciones',
  closePanel: 'Cerrar panel',
  color: 'Color',
  border: 'Borde',
  width: 'Ancho',
  style: 'Estilo',
  solid: 'S\u00F3lido',
  dashed: 'Discontinuo',
  dotted: 'Punteado',
  none: 'Ninguno',
  icon: 'Icono',
  iconAdd: 'A\u00F1adir icono personalizado',
  iconDelete: 'Eliminar icono',
  annotations: 'Anotaciones',
  masterNotesSummary: 'Notas del cuadrante',
  masterNotesButton: 'Resumen para el Máster',
  masterNotesTitle: 'Resumen de anotaciones',
  masterNotesEmpty: 'No hay anotaciones registradas en este cuadrante.',
  masterNotesSearchPlaceholder: 'Buscar por celda, autor o texto…',
  masterNotesCounter: 'Anotaciones: {count}',
  masterNotesCell: 'Celda',
  masterNotesNoteSingular: 'nota',
  masterNotesNotePlural: 'notas',
  masterNotesViewCell: 'Ver celda',
  masterNotesRemove: 'Eliminar',
  masterNotesNoText: 'Sin texto, solo icono.',
  masterNoteTag: 'Máster',
  playerNoteTag: 'Jugador',
  playerNotesList: 'Notas de jugadores',
  yourNote: 'Tu nota',
  effect: 'Efecto',
  effectColor: 'Color del efecto',
  glow: 'Brillo',
  pulse: 'Pulso',
  bounce: 'Rebote',
  spin: 'Giro',
  shake: 'Temblor',
  sparkle: 'Destellos',
  saveQuadrant: 'Guardar cuadrante',
  saveChanges: 'Guardar cambios',
  savedQuadrants: 'Cuadrantes guardados',
  defaultQuadrant: 'Cuadrante predeterminado',
  title: 'T\u00EDtulo',
  permissions: 'Permisos',
  sharedWithPlayers: 'Compartir con jugadores',
  noPlayers: 'Sin jugadores disponibles',
  sharedQuadrantTag: 'Compartido',
  sharedQuadrantHint: 'Asignado por el M\u00E1ster',
  explorerMasterHint:
    'Controla qu\u00E9 zonas descubre el modo explorador compartido.',
  explorerMasterToggle: 'Herramientas del m\u00E1ster',
  explorerMasterToggleHide: 'Ocultar herramientas',
  explorerRevealFrontier: 'Revelar frontera',
  explorerRevealSelection: 'Revelar selecci\u00F3n',
  explorerHideSelection: 'Ocultar selecci\u00F3n',
  masterQuadrantLocked:
    'Este cuadrante fue compartido por el M\u00E1ster y es de solo lectura.',
  unsavedChangesConfirm:
    'Tienes cambios sin guardar en el cuadrante actual. ¿Quieres continuar?',
  unsavedChangesIndicator: 'Cambios sin guardar en el cuadrante actual',
  addRowTop: 'A\u00F1adir fila desde arriba',
  addRowBottom: 'A\u00F1adir fila desde abajo',
  addColLeft: 'A\u00F1adir columna izquierda',
  addColRight: 'A\u00F1adir columna derecha',
  addCell: 'A\u00F1adir celda',
  delCell: 'Eliminar celda',
  reset: 'Restablecer',
  mobileQuickControls: 'Controles r\u00E1pidos',
  mobileReadableHint: 'Activo autom\u00E1ticamente en m\u00F3vil',
  zoom: 'Zoom',
  originStyle: 'Origen',
  originNorth: 'Arriba',
  originSouth: 'Abajo',
  originEast: 'Derecha',
  originWest: 'Izquierda',
};

const stripDiacritics = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeRotation = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const wrapped = Math.round(parsed) % 360;
  return wrapped >= 0 ? wrapped : wrapped + 360;
};

const FALLBACK_EMOJI_GROUPS = {
  Smileys: [
    { ch: '😀', name: '', nameEs: '' },
    { ch: '😄', name: '', nameEs: '' },
    { ch: '😁', name: '', nameEs: '' },
    { ch: '😂', name: '', nameEs: '' },
    { ch: '😉', name: '', nameEs: '' },
    { ch: '😊', name: '', nameEs: '' },
    { ch: '😇', name: '', nameEs: '' },
    { ch: '😈', name: '', nameEs: '' },
    { ch: '😌', name: '', nameEs: '' },
    { ch: '🤪', name: '', nameEs: '' },
    { ch: '🤗', name: '', nameEs: '' },
    { ch: '🤔', name: '', nameEs: '' },
    { ch: '🤨', name: '', nameEs: '' },
    { ch: '😃', name: '', nameEs: '' },
    { ch: '😴', name: '', nameEs: '' },
    { ch: '🤝', name: '', nameEs: '' },
    { ch: '🤕', name: '', nameEs: '' },
  ],
};

let emojiGroupsCache = null;
let emojiGroupsPromise = null;

const PING_TTL_MS = 6000;
const PING_CLEANUP_INTERVAL_MS = 4000;

const fetchEmojiGroupsFromNetwork = async () => {
  const res = await fetch('https://unpkg.com/emoji.json/emoji.json', {
    mode: 'cors',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch emoji list');
  }
  const list = await res.json();

  let esList = [];
  try {
    const resEs = await fetch(
      'https://cdn.jsdelivr.net/npm/emojibase-data@latest/es/data.json',
      { mode: 'cors' }
    );
    if (resEs.ok) {
      esList = await resEs.json();
    }
  } catch {
    esList = [];
  }
  const esMap = new Map(esList.map((e) => [e.emoji, e.label]));

  const groups = {};
  list.forEach((e) => {
    const ch = e.char || e.emoji || '';
    if (!ch) return;
    const g = e.group || e.category || 'Otros';
    if (!groups[g]) groups[g] = [];
    groups[g].push({
      ch,
      name: e.name || '',
      nameEs: esMap.get(ch) || '',
    });
  });
  return groups;
};

const ensureEmojiGroups = async () => {
  if (emojiGroupsCache) return emojiGroupsCache;
  if (!emojiGroupsPromise) {
    emojiGroupsPromise = fetchEmojiGroupsFromNetwork()
      .catch(() => FALLBACK_EMOJI_GROUPS)
      .then((groups) => {
        emojiGroupsCache = groups;
        return groups;
      })
      .finally(() => {
        emojiGroupsPromise = null;
      });
  }
  return emojiGroupsPromise;
};

const generateQuadrantId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `quadrant-${Date.now().toString(36)}-${rand}`;
};

function IconThumb({ src, selected, onClick, label, onDelete }) {
  const DeleteIcon = LucideIcons.Trash2 || LucideIcons.X || null;
  return (
    <div className="relative inline-block">
      <button
        type="button"
        title={label || ''}
        onClick={onClick}
        className={`relative w-14 h-14 rounded-lg overflow-hidden border transition ${selected ? 'border-green-400 ring-2 ring-green-400' : 'border-gray-600 hover:border-gray-400'}`}
      >
        <img
          loading="lazy"
          src={src}
          alt={label || 'icon'}
          className="w-full h-full object-contain bg-gray-800"
        />
      </button>
      {onDelete && DeleteIcon && (
        <button
          type="button"
          aria-label={L.iconDelete}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-1 ring-black/40 transition hover:bg-red-500"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
        >
          <DeleteIcon className="h-3 w-3" />
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

const QuadrantPreview = ({ q, size = 72 }) => {
  const ensurePositive = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };
  const rows = ensurePositive(q?.rows);
  const cols = ensurePositive(q?.cols);
  const maxDimension = Math.max(rows, cols);
  const dimension = Math.max(size, 1);
  const cell = dimension / (maxDimension || 1);
  const width = cell * cols;
  const height = cell * rows;
  const emptyCell = {
    active: false,
    fill: 'transparent',
    borderColor: 'rgba(255,255,255,0.1)',
  };
  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-600/70 bg-gray-900/40"
      style={{ width: dimension, height: dimension }}
    >
      <div
        className="grid"
        style={{
          width,
          height,
          gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
          gridTemplateRows: `repeat(${rows}, ${cell}px)`,
        }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const cellData = q?.grid?.[r]?.[c] || emptyCell;
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: cell,
                  height: cell,
                  background: cellData.active ? cellData.fill : 'transparent',
                  border: `1px solid ${
                    cellData.active
                      ? cellData.borderColor
                      : 'rgba(255,255,255,0.1)'
                  }`,
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
QuadrantPreview.propTypes = {
  q: PropTypes.object.isRequired,
  size: PropTypes.number,
};

const SparkleEffect = ({ color }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 1.5,
        size: 2 + Math.random() * 2,
        tx: (Math.random() - 0.5) * 40,
        ty: (Math.random() - 0.5) * 40,
        rot: Math.random() * 720,
        duration: 1 + Math.random() * 0.8,
      })),
    []
  );
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 5 }}
    >
      {particles.map((p, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="absolute rounded-full opacity-80 animate-sparkle"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            '--rot': `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
};
SparkleEffect.propTypes = {
  color: PropTypes.string,
};

const EffectOverlay = ({ effect }) => {
  if (!effect || effect.type === 'none') return null;
  if (effect.type === 'glow' || effect.type === 'pulse') {
    return (
      <div
        className="absolute inset-0 rounded pointer-events-none"
        style={{
          boxShadow: `0 0 10px 2px ${effect.color}`,
          animation: effect.type === 'pulse' ? 'pulse 1.5s infinite' : undefined,
          zIndex: -1,
        }}
      />
    );
  }
  if (effect.type === 'sparkle') {
    return <SparkleEffect color={effect.color} />;
  }
  return null;
};
EffectOverlay.propTypes = {
  effect: PropTypes.shape({
    type: PropTypes.string,
    color: PropTypes.string,
  }),
};

const defaultCell = () => ({
  fill: '#111827',
  borderColor: '#374151',
  borderWidth: 1,
  borderStyle: 'solid',
  icon: null,
  iconRotation: 0,
  effect: { type: 'none', color: '#ffff00' },
  active: true,
});

const VALID_BORDER_STYLES = new Set(['solid', 'dashed', 'dotted', 'none']);
const VALID_EFFECT_TYPES = new Set([
  'none',
  'glow',
  'pulse',
  'bounce',
  'spin',
  'shake',
  'sparkle',
]);

const clampNumber = (value, min, max, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const rounded = Math.round(num);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
};

const sanitizeEffect = (value, fallback) => {
  const base = fallback || defaultCell().effect;
  if (!value || typeof value !== 'object') {
    return { ...base };
  }
  const type =
    typeof value.type === 'string' && VALID_EFFECT_TYPES.has(value.type)
      ? value.type
      : 'none';
  const color =
    typeof value.color === 'string' && value.color.trim()
      ? value.color
      : base.color;
  if (type === 'none') {
    return { type: 'none', color: base.color };
  }
  return { type, color };
};

const sanitizeCell = (cell) => {
  const base = defaultCell();
  if (!cell || typeof cell !== 'object') {
    return { ...base };
  }
  const fill =
    typeof cell.fill === 'string' && cell.fill.trim() ? cell.fill : base.fill;
  const borderColor =
    typeof cell.borderColor === 'string' && cell.borderColor.trim()
      ? cell.borderColor
      : base.borderColor;
  const borderWidthValue = Number(cell.borderWidth);
  const borderWidth = Number.isFinite(borderWidthValue)
    ? Math.min(Math.max(Math.round(borderWidthValue), 0), 6)
    : base.borderWidth;
  const style =
    typeof cell.borderStyle === 'string' ? cell.borderStyle.trim() : base.borderStyle;
  const borderStyle = VALID_BORDER_STYLES.has(style) ? style : base.borderStyle;
  const icon =
    typeof cell.icon === 'string' && cell.icon.trim() ? cell.icon : null;
  const iconRotation = normalizeRotation(cell.iconRotation, base.iconRotation);
  let active;
  if (typeof cell.active === 'boolean') {
    active = cell.active;
  } else if (
    cell.active === 0 ||
    cell.active === '0' ||
    cell.active === 'false'
  ) {
    active = false;
  } else if (
    cell.active === 1 ||
    cell.active === '1' ||
    cell.active === 'true'
  ) {
    active = true;
  } else if (typeof cell.active !== 'undefined') {
    active = Boolean(cell.active);
  } else {
    active = base.active;
  }
  const effect = sanitizeEffect(cell.effect, base.effect);
  return {
    fill,
    borderColor,
    borderWidth,
    borderStyle,
    icon,
    iconRotation,
    effect,
    active,
  };
};

const ORIGIN_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="originArrow" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.65" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
    </defs>
    <g stroke="url(#originArrow)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M48 80V24" />
      <path d="M24 44L48 16L72 44" fill="url(#originArrow)" />
    </g>
  </svg>
`;

const ORIGIN_ICON_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  ORIGIN_ICON_SVG
)}`;

const ORIGIN_BASE_STYLE = {
  fill: '#0f172a',
  borderColor: '#38bdf8',
  borderWidth: 2,
  borderStyle: 'solid',
  icon: ORIGIN_ICON_DATA_URL,
  iconRotation: 0,
  effect: { type: 'none', color: '#38bdf8' },
};

const ORIGIN_DIRECTIONS = [
  { id: 'north', rotation: 0, icon: LucideIcons.ArrowUp, labelKey: 'originNorth' },
  {
    id: 'east',
    rotation: 90,
    icon: LucideIcons.ArrowRight,
    labelKey: 'originEast',
  },
  {
    id: 'south',
    rotation: 180,
    icon: LucideIcons.ArrowDown,
    labelKey: 'originSouth',
  },
  {
    id: 'west',
    rotation: 270,
    icon: LucideIcons.ArrowLeft,
    labelKey: 'originWest',
  },
];

const buildOriginCellStyle = (rotation = 0) => ({
  ...ORIGIN_BASE_STYLE,
  iconRotation: rotation,
});

const buildAnnotationKey = (quadrantId, r, c, scope = '') => {
  const base = `${quadrantId}-${r}-${c}`;
  if (!scope) return base;
  return `${base}-${scope}`;
};

const getGridCell = (grid, r, c) =>
  Array.isArray(grid) && Array.isArray(grid[r]) ? grid[r][c] : null;

const cellKeyFromIndices = (r, c) => `${r}-${c}`;

const parseCellKey = (key) => {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-');
  if (parts.length !== 2) return null;
  const r = Number.parseInt(parts[0], 10);
  const c = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
  return { r, c };
};

const getOrthogonalNeighbors = (r, c) => [
  { r: r - 1, c },
  { r: r + 1, c },
  { r, c: c - 1 },
  { r, c: c + 1 },
];

const sanitizeGridStructure = (grid, rows, cols) => {
  const fallbackRows = Array.isArray(grid) && grid.length > 0 ? grid.length : 8;
  const fallbackCols =
    Array.isArray(grid) && Array.isArray(grid[0]) && grid[0].length > 0
      ? grid[0].length
      : 12;
  const safeRows = clampNumber(rows, 1, 200, fallbackRows);
  const safeCols = clampNumber(cols, 1, 200, fallbackCols);
  const sanitizedGrid = Array.from({ length: safeRows }, (_, r) =>
    Array.from({ length: safeCols }, (_, c) => sanitizeCell(getGridCell(grid, r, c)))
  );
  return { rows: safeRows, cols: safeCols, grid: sanitizedGrid };
};

const sanitizeCellSize = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 48;
  if (num <= 8) return 8;
  if (num >= 512) return 512;
  return Math.round(num);
};

const sanitizeTitle = (value, fallback) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  } else if (typeof value === 'number') {
    const stringified = String(value).trim();
    if (stringified) return stringified;
  }
  return fallback || 'Cuadrante';
};

const sanitizeOrder = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizePlayerName = (value) =>
  stripDiacritics(String(value || '')).toLowerCase().trim();

const sanitizeOwner = (value, fallback = 'master') => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
};

const sanitizeSharedWith = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const trimmed = entry.trim();
    if (!trimmed) return;
    const key = normalizePlayerName(trimmed);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result;
};

const arraysShallowEqual = (a = [], b = []) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const createQuadrantSnapshot = (data = {}) => {
  const { rows, cols, grid } = sanitizeGridStructure(
    data.grid,
    data.rows,
    data.cols
  );
  return {
    rows,
    cols,
    cellSize: sanitizeCellSize(data.cellSize),
    grid,
    sharedWith: sanitizeSharedWith(data.sharedWith),
  };
};

const quadrantSnapshotsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.rows !== b.rows || a.cols !== b.cols) return false;
  if (a.cellSize !== b.cellSize) return false;
  if (!sharedWithEquals(a.sharedWith, b.sharedWith)) return false;
  if (a.grid.length !== b.grid.length) return false;
  for (let r = 0; r < a.grid.length; r += 1) {
    const rowA = a.grid[r];
    const rowB = b.grid[r];
    if (!rowA || !rowB || rowA.length !== rowB.length) return false;
    for (let c = 0; c < rowA.length; c += 1) {
      const cellA = rowA[c];
      const cellB = rowB[c];
      if (!cellA || !cellB) return false;
      if (
        cellA.fill !== cellB.fill ||
        cellA.borderColor !== cellB.borderColor ||
        cellA.borderWidth !== cellB.borderWidth ||
        cellA.borderStyle !== cellB.borderStyle ||
        cellA.icon !== cellB.icon ||
        cellA.iconRotation !== cellB.iconRotation ||
        cellA.active !== cellB.active
      ) {
        return false;
      }
      const effectA = cellA.effect || { type: 'none', color: '' };
      const effectB = cellB.effect || { type: 'none', color: '' };
      if (
        effectA.type !== effectB.type ||
        effectA.color !== effectB.color
      ) {
        return false;
      }
    }
  }
  return true;
};

const normalizeAnnotationMetadata = (
  annotation,
  { ownerKey = 'master' } = {}
) => {
  if (!annotation || typeof annotation !== 'object') {
    return {
      scope: '',
      authorRole: ownerKey === 'master' ? 'master' : 'player',
      authorKey: ownerKey === 'master' ? 'master' : ownerKey || 'player',
      authorName: ownerKey === 'master' ? 'Máster' : 'Jugador',
    };
  }
  const rawScope = typeof annotation.scope === 'string' ? annotation.scope.trim() : '';
  const scope = rawScope;
  const computedAuthorKey = (() => {
    if (typeof annotation.authorKey === 'string' && annotation.authorKey.trim()) {
      return annotation.authorKey.trim();
    }
    if (scope) return scope;
    if (ownerKey === 'master') return 'master';
    if (typeof annotation.createdBy === 'string' && annotation.createdBy.trim()) {
      return normalizePlayerName(annotation.createdBy.trim()) || 'player';
    }
    return ownerKey || 'player';
  })();
  const authorRole = (() => {
    if (typeof annotation.authorRole === 'string' && annotation.authorRole.trim()) {
      return annotation.authorRole.trim();
    }
    return computedAuthorKey === 'master' ? 'master' : 'player';
  })();
  const authorName = (() => {
    if (typeof annotation.authorName === 'string' && annotation.authorName.trim()) {
      return annotation.authorName.trim();
    }
    if (authorRole === 'master') return 'Máster';
    if (typeof annotation.createdBy === 'string' && annotation.createdBy.trim()) {
      return annotation.createdBy.trim();
    }
    return 'Jugador';
  })();
  return {
    scope,
    authorRole,
    authorKey: computedAuthorKey,
    authorName,
  };
};

const sharedWithEquals = (a = [], b = []) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const normA = a.map(normalizePlayerName).sort();
  const normB = b.map(normalizePlayerName).sort();
  for (let i = 0; i < normA.length; i += 1) {
    if (normA[i] !== normB[i]) return false;
  }
  return true;
};

const sanitizeQuadrantValues = (data = {}, options = {}) => {
  const {
    titleFallback = 'Cuadrante',
    orderFallback = 0,
    ownerFallback = 'master',
  } = options;
  const { rows, cols, grid } = sanitizeGridStructure(
    data.grid,
    data.rows,
    data.cols
  );
  return {
    title: sanitizeTitle(data.title, titleFallback),
    rows,
    cols,
    cellSize: sanitizeCellSize(data.cellSize),
    grid,
    order: sanitizeOrder(data.order, orderFallback),
    owner: sanitizeOwner(data.owner, ownerFallback),
    sharedWith: sanitizeSharedWith(data.sharedWith),
  };
};

const LOCAL_QUADRANTS_KEY = 'minimapQuadrants';

const sortQuadrantsList = (items = []) =>
  [...items]
    .filter(Boolean)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });

const prepareQuadrantForLocalStorage = (quadrant) => ({
  id: quadrant.id,
  title: quadrant.title,
  rows: quadrant.rows,
  cols: quadrant.cols,
  cellSize: quadrant.cellSize,
  grid: quadrant.grid,
  order: quadrant.order,
  owner: quadrant.owner,
  sharedWith: quadrant.sharedWith,
});

const persistQuadrantsToLocalStorage = (items) => {
  if (typeof window === 'undefined') return;
  try {
    const payload = items.map(prepareQuadrantForLocalStorage);
    window.localStorage.setItem(LOCAL_QUADRANTS_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Error writing local minimap quadrants', error);
  }
};

const readQuadrantsFromLocalStorage = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_QUADRANTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    let needsRewrite = false;
    const normalized = parsed.map((item, index) => {
      const sanitized = sanitizeQuadrantValues(item, {
        titleFallback: `Cuadrante ${index + 1}`,
        orderFallback: index,
      });
      let id =
        typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : null;
      if (!id) {
        id = generateQuadrantId();
        needsRewrite = true;
      }
      return { id, ...sanitized, updatedAt: item?.updatedAt || null };
    });
    const sorted = sortQuadrantsList(normalized);
    if (needsRewrite) {
      persistQuadrantsToLocalStorage(sorted);
    }
    return sorted;
  } catch (error) {
    console.error('Error reading local minimap quadrants', error);
    return [];
  }
};

const sanitizeCustomIcons = (icons) => {
  if (!Array.isArray(icons)) return [];
  return icons.filter((icon) => typeof icon === 'string' && icon);
};
const sanitizeCellStylePresets = (presets) => {
  if (!Array.isArray(presets)) return [];
  return presets
    .filter((preset) => preset && typeof preset === 'object')
    .map((preset) => {
      const sanitized = sanitizeCell({ ...defaultCell(), ...preset });
      const { active, ...style } = sanitized;
      return style;
    });
};
const readLocalCustomization = () => {
  const result = {
    customIcons: [],
    cellStylePresets: [],
  };
  if (typeof window === 'undefined' || !window.localStorage) {
    return result;
  }
  try {
    const rawIcons = window.localStorage.getItem('minimapCustomIcons');
    if (rawIcons) {
      result.customIcons = sanitizeCustomIcons(JSON.parse(rawIcons));
    }
  } catch {}
  try {
    const rawPresets = window.localStorage.getItem('minimapCellStylePresets');
    if (rawPresets) {
      result.cellStylePresets = sanitizeCellStylePresets(
        JSON.parse(rawPresets)
      );
    }
  } catch {}
  return result;
};
const buildGrid = (rows, cols, prev = []) =>
  Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      prev[r] && prev[r][c] ? { ...prev[r][c] } : defaultCell()
    )
  );

function MinimapBuilder({
  onBack,
  backLabel,
  showNewBadge,
  mode = 'master',
  playerName = '',
}) {
  const isPlayerMode = mode === 'player';
  const effectiveBackLabel = backLabel || L.back;
  const shouldShowNewBadge =
    typeof showNewBadge === 'boolean' ? showNewBadge : !isPlayerMode;
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMapTop, setMobileMapTop] = useState(0);
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(12);
  const [cellSize, setCellSize] = useState(48);
  const [grid, setGrid] = useState(() => buildGrid(8, 12));
  const [selectedCells, setSelectedCells] = useState([]);
  const hasSelectedCells = selectedCells.length > 0;
  const selectedCell = selectedCells[0];
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(false);
  const [isQuadrantPanelOpen, setIsQuadrantPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('style');
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [pings, setPings] = useState([]);
  const [isMasterNotesOpen, setIsMasterNotesOpen] = useState(false);
  const [masterNotesSearch, setMasterNotesSearch] = useState('');
  const [shapeEdit, setShapeEdit] = useState(false);
  const [readableMode, setReadableMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [isMultiTouchActive, setIsMultiTouchActive] = useState(false);
  const [iconSource, setIconSource] = useState('estados'); // estados | personalizados | recursos | emojis | lucide
  const [emojiSearch, setEmojiSearch] = useState('');
  const [lucideSearch, setLucideSearch] = useState('');
  const [customIcons, setCustomIcons] = useState([]);
  const [resourceItems, setResourceItems] = useState([]);
  const [exploredCellKeys, setExploredCellKeys] = useState([]);
  const [showMasterExplorerControls, setShowMasterExplorerControls] =
    useState(false);
  const [explorationLoaded, setExplorationLoaded] = useState(false);
  const [playersList, setPlayersList] = useState([]);
  const trimmedPlayerName =
    typeof playerName === 'string' ? playerName.trim() : '';
  const defaultOwner = isPlayerMode
    ? trimmedPlayerName || 'player'
    : 'master';
  const [activeQuadrantOwner, setActiveQuadrantOwner] = useState(defaultOwner);
  const [activeQuadrantSharedWith, setActiveQuadrantSharedWith] = useState([]);
  const [cellStylePresets, setCellStylePresets] = useState([]);
  const normalizedPlayerName = useMemo(
    () => normalizePlayerName(trimmedPlayerName),
    [trimmedPlayerName]
  );
  const customizationDocRef = useMemo(
    () => doc(db, 'minimapSettings', 'customization'),
    [db]
  );
  const customizationSnapshotRef = useRef({
    icons: JSON.stringify([]),
    presets: JSON.stringify([]),
  });
  const [isCustomizationReady, setCustomizationReady] = useState(false);
  const [quadrantTitle, setQuadrantTitle] = useState('');
  const [quadrants, setQuadrants] = useState(() => readQuadrantsFromLocalStorage());
  const [currentQuadrantIndex, setCurrentQuadrantIndex] = useState(null);
  const localQuadrantsRef = useRef(null);
  if (localQuadrantsRef.current === null) {
    localQuadrantsRef.current = quadrants;
  }
  const filterQuadrantsForMode = useCallback(
    (items = []) => {
      const sorted = sortQuadrantsList(items);
      if (!isPlayerMode) {
        return sorted;
      }
      return sorted.filter((item) => {
        const ownerKey = normalizePlayerName(item?.owner);
        if (ownerKey && ownerKey !== 'master') {
          return true;
        }
        if (!normalizedPlayerName) {
          return false;
        }
        const sharedWith = Array.isArray(item?.sharedWith)
          ? item.sharedWith
          : [];
        return sharedWith.some(
          (entry) => normalizePlayerName(entry) === normalizedPlayerName
        );
      });
    },
    [isPlayerMode, normalizedPlayerName]
  );
  const updateLocalQuadrants = (items) => {
    const filtered = filterQuadrantsForMode(items);
    localQuadrantsRef.current = filtered;
    persistQuadrantsToLocalStorage(filtered);
  };
  useEffect(() => {
    if (!isMasterNotesOpen) {
      setMasterNotesSearch('');
    }
  }, [isMasterNotesOpen]);
  useEffect(() => {
    setQuadrants((prev) => filterQuadrantsForMode(prev));
    localQuadrantsRef.current = filterQuadrantsForMode(
      Array.isArray(localQuadrantsRef.current)
        ? localQuadrantsRef.current
        : []
    );
  }, [filterQuadrantsForMode]);
  useEffect(() => {
    if (currentQuadrantIndex === null) return;
    const current = quadrants[currentQuadrantIndex];
    if (!current) return;
    const ownerValue = sanitizeOwner(current.owner, defaultOwner);
    setActiveQuadrantOwner((prev) =>
      prev === ownerValue ? prev : ownerValue
    );
    const sanitizedShared = sanitizeSharedWith(current.sharedWith);
    setActiveQuadrantSharedWith((prev) =>
      sharedWithEquals(prev, sanitizedShared) ? prev : sanitizedShared
    );
    const snapshot = createQuadrantSnapshot({
      rows: current.rows,
      cols: current.cols,
      cellSize: current.cellSize,
      grid: current.grid,
      sharedWith: sanitizedShared,
    });
    setLoadedQuadrantData((prev) =>
      prev && quadrantSnapshotsEqual(prev, snapshot) ? prev : snapshot
    );
  }, [quadrants, currentQuadrantIndex, defaultOwner]);
  const getLocalQuadrantsSnapshot = () =>
    Array.isArray(localQuadrantsRef.current) ? localQuadrantsRef.current : [];
  const quadrantsMigrationRef = useRef(false);
  const [loadedQuadrantData, setLoadedQuadrantData] = useState(null);
  const [emojiGroups, setEmojiGroups] = useState(null);
  const [lucideNames, setLucideNames] = useState(null);
  const [iconsLoading, setIconsLoading] = useState(false);
  const confirmAction = useConfirm();
  const selectedCellData =
    selectedCell ? grid[selectedCell.r]?.[selectedCell.c] || null : null;
  const activeQuadrantId = useMemo(() => {
    if (currentQuadrantIndex === null) return 'default';
    const current = quadrants[currentQuadrantIndex];
    return current?.id || 'default';
  }, [currentQuadrantIndex, quadrants]);
  const activeOwnerKey = useMemo(
    () => normalizePlayerName(activeQuadrantOwner),
    [activeQuadrantOwner]
  );
  const isSharedMasterQuadrant = useMemo(() => {
    if (!isPlayerMode) return false;
    return activeOwnerKey === 'master';
  }, [isPlayerMode, activeOwnerKey]);
  const isMasterSharingQuadrant = useMemo(() => {
    if (isPlayerMode) return false;
    return Array.isArray(activeQuadrantSharedWith)
      ? activeQuadrantSharedWith.length > 0
      : false;
  }, [activeQuadrantSharedWith, isPlayerMode]);
  const canEditActiveQuadrant = useMemo(() => {
    if (!isPlayerMode) return true;
    if (!activeOwnerKey) return true;
    if (activeOwnerKey === 'master') return false;
    if (!normalizedPlayerName) return false;
    return activeOwnerKey === normalizedPlayerName;
  }, [isPlayerMode, activeOwnerKey, normalizedPlayerName]);
  const canAnnotateActiveQuadrant = useMemo(() => {
    if (!isPlayerMode) return true;
    if (!normalizedPlayerName) return false;
    if (!activeOwnerKey) return true;
    return (
      activeOwnerKey === normalizedPlayerName || activeOwnerKey === 'master'
    );
  }, [isPlayerMode, activeOwnerKey, normalizedPlayerName]);
  const playerAnnotationKey = useMemo(() => {
    if (!isPlayerMode) return 'master';
    if (!normalizedPlayerName) return '';
    const base = `player-${normalizedPlayerName}`;
    if (activeOwnerKey === 'master') {
      return base;
    }
    return base;
  }, [isPlayerMode, normalizedPlayerName, activeOwnerKey]);
  const pingAuthor = useMemo(
    () => (isPlayerMode ? trimmedPlayerName || 'player' : 'master'),
    [isPlayerMode, trimmedPlayerName]
  );
  const quadrantPreviewSize = useMemo(
    () => (isMobile ? 72 : 96),
    [isMobile]
  );
  const activeAnnotations = useMemo(() => {
    const ownerKey = activeOwnerKey;
    return annotations
      .filter((ann) => (ann?.quadrantId || 'default') === activeQuadrantId)
      .map((ann) => ({
        ...ann,
        ...normalizeAnnotationMetadata(ann, { ownerKey }),
      }));
  }, [annotations, activeQuadrantId, activeOwnerKey]);
  const visibleAnnotations = useMemo(() => {
    if (!isPlayerMode) return activeAnnotations;
    return activeAnnotations.filter((ann) => ann.authorRole !== 'master');
  }, [activeAnnotations, isPlayerMode]);
  const visiblePings = useMemo(() => {
    if (!Array.isArray(pings) || pings.length === 0) return [];
    return pings
      .filter(
        (ping) =>
          Number.isInteger(ping?.r) &&
          Number.isInteger(ping?.c) &&
          Number.isFinite(ping?.createdAtMs)
      )
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
  }, [pings]);
  const masterAnnotationsSummary = useMemo(() => {
    if (isPlayerMode) return [];
    const groups = new Map();
    activeAnnotations.forEach((ann) => {
      const cellKey = `${ann.r}-${ann.c}`;
      if (!groups.has(cellKey)) {
        groups.set(cellKey, {
          key: cellKey,
          r: ann.r,
          c: ann.c,
          notes: [],
        });
      }
      groups.get(cellKey).notes.push(ann);
    });
    const sortNotes = (a, b) => {
      if (a.authorRole !== b.authorRole) {
        return a.authorRole === 'master' ? -1 : 1;
      }
      const nameA = stripDiacritics(a.authorName || '').toLowerCase();
      const nameB = stripDiacritics(b.authorName || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      const textA = stripDiacritics(a.text || '').toLowerCase();
      const textB = stripDiacritics(b.text || '').toLowerCase();
      if (textA < textB) return -1;
      if (textA > textB) return 1;
      return 0;
    };
    return Array.from(groups.values())
      .map((entry) => ({
        ...entry,
        notes: entry.notes.slice().sort(sortNotes),
      }))
      .sort((a, b) => {
        if (a.r !== b.r) return a.r - b.r;
        return a.c - b.c;
      });
  }, [activeAnnotations, isPlayerMode]);
  const masterAnnotationsCount = useMemo(
    () =>
      masterAnnotationsSummary.reduce(
        (total, entry) => total + entry.notes.length,
        0
      ),
    [masterAnnotationsSummary]
  );
  const filteredMasterAnnotations = useMemo(() => {
    if (isPlayerMode) return [];
    const normalizedTerm = stripDiacritics(masterNotesSearch || '')
      .toLowerCase()
      .trim();
    if (!normalizedTerm) {
      return masterAnnotationsSummary;
    }
    return masterAnnotationsSummary
      .map((entry) => {
        const filteredNotes = entry.notes.filter((note) => {
          const haystack = [
            `${entry.r + 1}`,
            `${entry.c + 1}`,
            `${entry.r + 1}x${entry.c + 1}`,
            `${entry.r + 1},${entry.c + 1}`,
            note.text,
            note.icon,
            note.authorName,
            note.authorRole === 'master' ? L.masterNoteTag : L.playerNoteTag,
          ];
          return haystack.some((value) => {
            if (!value) return false;
            return stripDiacritics(String(value))
              .toLowerCase()
              .includes(normalizedTerm);
          });
        });
        if (filteredNotes.length === 0) return null;
        return { ...entry, notes: filteredNotes };
      })
      .filter(Boolean);
  }, [
    isPlayerMode,
    masterNotesSearch,
    masterAnnotationsSummary,
  ]);
  const propertyTabs = useMemo(() => {
    const tabs = [];
    if (canEditActiveQuadrant) {
      tabs.push(
        { id: 'style', label: 'Estilos', icon: LucideIcons.Palette },
        { id: 'icon', label: L.icon, icon: LucideIcons.Images },
        { id: 'effect', label: L.effect, icon: LucideIcons.Wand2 }
      );
    }
    if (canAnnotateActiveQuadrant) {
      tabs.push({ id: 'notes', label: L.annotations, icon: LucideIcons.NotebookText });
    }
    return tabs;
  }, [canEditActiveQuadrant, canAnnotateActiveQuadrant]);
  const originCellPosition = useMemo(() => {
    if (!isPlayerMode) return null;
    for (let r = 0; r < grid.length; r += 1) {
      const row = grid[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c += 1) {
        const cell = row[c];
        if (cell && cell.icon === ORIGIN_ICON_DATA_URL) {
          return { r, c };
        }
      }
    }
    return null;
  }, [grid, isPlayerMode]);
  const originCellKey = originCellPosition
    ? cellKeyFromIndices(originCellPosition.r, originCellPosition.c)
    : null;
  const isExplorerModeActive = useMemo(
    () => isPlayerMode && isSharedMasterQuadrant && originCellKey !== null,
    [isPlayerMode, isSharedMasterQuadrant, originCellKey]
  );
  const shouldTrackExploration = useMemo(() => {
    if (!activeQuadrantId) {
      return false;
    }
    if (isPlayerMode) {
      return isSharedMasterQuadrant;
    }
    return true;
  }, [activeQuadrantId, isPlayerMode, isSharedMasterQuadrant]);

  const explorerState = useMemo(() => {
    if (!isExplorerModeActive && !isMasterSharingQuadrant) {
      return { exploredSet: new Set(), frontierSet: new Set() };
    }
    const validExplored = new Set();
    exploredCellKeys.forEach((key) => {
      const pos = parseCellKey(key);
      if (!pos) return;
      const { r, c } = pos;
      if (r < 0 || c < 0 || r >= rows || c >= cols) return;
      const cell = grid[r]?.[c];
      if (!cell || !cell.active) return;
      validExplored.add(cellKeyFromIndices(r, c));
    });
    if (originCellKey && !validExplored.has(originCellKey)) {
      validExplored.add(originCellKey);
    }
    const frontier = new Set();
    validExplored.forEach((key) => {
      const pos = parseCellKey(key);
      if (!pos) return;
      getOrthogonalNeighbors(pos.r, pos.c).forEach(({ r, c }) => {
        if (r < 0 || c < 0 || r >= rows || c >= cols) return;
        const neighbor = grid[r]?.[c];
        if (!neighbor || !neighbor.active) return;
        const neighborKey = cellKeyFromIndices(r, c);
        if (validExplored.has(neighborKey)) return;
        frontier.add(neighborKey);
      });
    });
    return { exploredSet: validExplored, frontierSet: frontier };
  }, [
    exploredCellKeys,
    grid,
    isExplorerModeActive,
    isMasterSharingQuadrant,
    originCellKey,
    rows,
    cols,
  ]);
  const exploredCellsSet = explorerState.exploredSet;
  const explorerFrontierSet = explorerState.frontierSet;
  const explorerVisibleSet = useMemo(() => {
    if (!isExplorerModeActive) return null;
    const combined = new Set();
    exploredCellsSet.forEach((key) => combined.add(key));
    explorerFrontierSet.forEach((key) => combined.add(key));
    return combined;
  }, [exploredCellsSet, explorerFrontierSet, isExplorerModeActive]);
  const selectedExplorerFrontierKeys = useMemo(() => {
    if (!isMasterSharingQuadrant || selectedCells.length === 0) return [];
    const seen = new Set();
    const keys = [];
    selectedCells.forEach(({ r, c }) => {
      if (r < 0 || c < 0) return;
      const key = cellKeyFromIndices(r, c);
      if (seen.has(key)) return;
      seen.add(key);
      if (!explorerFrontierSet.has(key)) return;
      if (exploredCellsSet.has(key)) return;
      keys.push(key);
    });
    return keys;
  }, [
    exploredCellsSet,
    explorerFrontierSet,
    isMasterSharingQuadrant,
    selectedCells,
  ]);
  const selectedExploredKeys = useMemo(() => {
    if (!isMasterSharingQuadrant || selectedCells.length === 0) return [];
    const seen = new Set();
    const keys = [];
    selectedCells.forEach(({ r, c }) => {
      if (r < 0 || c < 0) return;
      const key = cellKeyFromIndices(r, c);
      if (seen.has(key)) return;
      seen.add(key);
      if (!exploredCellsSet.has(key)) return;
      if (originCellKey && key === originCellKey) return;
      keys.push(key);
    });
    return keys;
  }, [
    exploredCellsSet,
    isMasterSharingQuadrant,
    originCellKey,
    selectedCells,
  ]);
  const shouldShowExplorerNotice =
    isExplorerModeActive || isMasterSharingQuadrant;
  useEffect(() => {
    if (propertyTabs.length === 0) return;
    if (!propertyTabs.some((tab) => tab.id === panelTab)) {
      setPanelTab(propertyTabs[0].id);
    }
  }, [panelTab, propertyTabs]);
  const hasUnsavedChanges = useMemo(() => {
    if (currentQuadrantIndex === null || !loadedQuadrantData) return false;
    if (!canEditActiveQuadrant) return false;
    const currentSnapshot = createQuadrantSnapshot({
      rows,
      cols,
      cellSize,
      grid,
      sharedWith: activeQuadrantSharedWith,
    });
    return !quadrantSnapshotsEqual(loadedQuadrantData, currentSnapshot);
  }, [
    activeQuadrantSharedWith,
    canEditActiveQuadrant,
    currentQuadrantIndex,
    grid,
    loadedQuadrantData,
    rows,
    cols,
    cellSize,
  ]);
  const runUnsavedChangesGuard = useCallback(
    (callback) => {
      if (typeof callback !== 'function') return false;
      if (!hasUnsavedChanges) {
        callback();
        return true;
      }
      if (confirmAction(L.unsavedChangesConfirm)) {
        callback();
        return true;
      }
      return false;
    },
    [hasUnsavedChanges, confirmAction]
  );
  const setAnnotation = (r, c, data, options = {}) => {
    if (!canAnnotateActiveQuadrant && !options?.override) return;
    const { skipLocalUpdate = false, existing = null } = options;
    const baseData = typeof data === 'object' && data ? data : {};
    const text = typeof baseData.text === 'string' ? baseData.text : '';
    const icon = typeof baseData.icon === 'string' ? baseData.icon : '';
    const hasContent = Boolean(text.trim() || icon.trim());
    const existingMeta = existing
      ? normalizeAnnotationMetadata(existing, { ownerKey: activeOwnerKey })
      : null;
    let scope = existingMeta?.scope || '';
    let authorKey = existingMeta?.authorKey || '';
    let authorRole = existingMeta?.authorRole || '';
    let authorName = existingMeta?.authorName || '';
    if (!authorKey) {
      if (!isPlayerMode) {
        authorKey = 'master';
      } else if (activeOwnerKey === 'master') {
        authorKey = playerAnnotationKey || 'player';
      } else if (normalizedPlayerName) {
        authorKey = `player-${normalizedPlayerName}`;
      } else {
        authorKey = 'player';
      }
    }
    if (!authorRole) {
      authorRole = authorKey === 'master' ? 'master' : 'player';
    }
    if (!authorName) {
      authorName =
        authorRole === 'master'
          ? 'Máster'
          : trimmedPlayerName || existing?.authorName || 'Jugador';
    }
    if (!scope) {
      if (authorKey === 'master') {
        scope = '';
      } else if (existingMeta?.scope) {
        scope = existingMeta.scope;
      } else if (activeOwnerKey === 'master') {
        scope = authorKey;
      } else {
        scope = '';
      }
    }
    const key = buildAnnotationKey(activeQuadrantId, r, c, scope);
    const payload = {
      quadrantId: activeQuadrantId,
      r,
      c,
      text,
      icon,
      key,
      scope,
      authorRole,
      authorKey,
      authorName,
    };
    if (!skipLocalUpdate) {
      setAnnotations((prev) => {
        const next = prev.filter((a) => a.key !== key);
        if (hasContent) {
          next.push(payload);
        }
        return next;
      });
    }
    const ref = doc(db, 'minimapAnnotations', key);
    const legacyKey = scope ? null : `${r}-${c}`;
    const legacyRef =
      legacyKey && legacyKey !== key
        ? doc(db, 'minimapAnnotations', legacyKey)
        : null;
    if (hasContent) {
      setDoc(ref, payload).catch(() => {});
      if (legacyRef) deleteDoc(legacyRef).catch(() => {});
    } else {
      deleteDoc(ref).catch(() => {});
      if (legacyRef) deleteDoc(legacyRef).catch(() => {});
    }
  };

  const migratedLegacyAnnotationIdsRef = useRef(new Set());
  const migrateLegacyAnnotations = useCallback((entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return;
    const pending = entries.filter(
      ({ docId }) => docId && !migratedLegacyAnnotationIdsRef.current.has(docId)
    );
    if (pending.length === 0) {
      return;
    }
    pending.forEach(({ docId }) => {
      if (docId) {
        migratedLegacyAnnotationIdsRef.current.add(docId);
      }
    });
    const writes = pending.map(({ annotation, docId }) => {
      const nextKey = annotation?.key;
      if (!nextKey) {
        return Promise.resolve();
      }
      const payload = {
        ...annotation,
        quadrantId: annotation?.quadrantId || 'default',
        key: nextKey,
      };
      return setDoc(doc(db, 'minimapAnnotations', nextKey), payload)
        .then(() => {
          if (docId && docId !== nextKey) {
            return deleteDoc(doc(db, 'minimapAnnotations', docId)).catch(() => {});
          }
          return undefined;
        })
        .catch((error) => {
          console.error('Error migrating legacy minimap annotation', error);
          if (docId) {
            migratedLegacyAnnotationIdsRef.current.delete(docId);
          }
        });
    });
    if (writes.length > 0) {
      Promise.all(writes).catch((error) => {
        console.error('Error migrating legacy minimap annotations', error);
      });
    }
  }, []);

  const containerRef = useRef(null);
  const headerSectionRef = useRef(null);
  const skipRebuildRef = useRef(false);
  const longPressTimersRef = useRef(new Map());
  const lastLongPressRef = useRef({ key: null, t: 0 });
  const activePanPointerRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const skipClickRef = useRef(false);
  const hadMultiTouchRef = useRef(false);
  const pingCleanupTimerRef = useRef(null);
  const cleanupExpiredPings = useCallback(() => {
    const now = Date.now();
    const expiredIds = [];
    setPings((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) {
        return prev;
      }
      const next = [];
      prev.forEach((ping) => {
        if (!ping || !Number.isFinite(ping.createdAtMs)) {
          return;
        }
        if (now - ping.createdAtMs >= PING_TTL_MS) {
          if (ping.id) {
            expiredIds.push(ping.id);
          }
        } else {
          next.push(ping);
        }
      });
      if (next.length === prev.length) {
        return prev;
      }
      return next;
    });
    if (expiredIds.length > 0) {
      expiredIds.forEach((pingId) => {
        if (!pingId) return;
        deleteDoc(doc(db, 'minimapPings', pingId)).catch(() => {});
      });
    }
  }, [db]);
  const clearLongPressTimers = useCallback(() => {
    longPressTimersRef.current.forEach((timer) => {
      clearTimeout(timer.id);
    });
    longPressTimersRef.current.clear();
  }, []);
  const cancelLongPressTimer = useCallback((key) => {
    const timer = longPressTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer.id);
      longPressTimersRef.current.delete(key);
    }
  }, []);

  const updateMobileMapTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!isMobile) {
      setMobileMapTop(0);
      return;
    }
    const headerEl = headerSectionRef.current;
    if (!headerEl) return;
    const rect = headerEl.getBoundingClientRect();
    const spacing = 12;
    const nextTop = Math.max(rect.bottom + spacing, 0);
    setMobileMapTop((prev) => (Math.abs(prev - nextTop) > 0.5 ? nextTop : prev));
  }, [isMobile]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    updateMobileMapTop();
    if (!isMobile) return undefined;
    window.addEventListener('resize', updateMobileMapTop);
    window.addEventListener('orientationchange', updateMobileMapTop);
    return () => {
      window.removeEventListener('resize', updateMobileMapTop);
      window.removeEventListener('orientationchange', updateMobileMapTop);
    };
  }, [isMobile, updateMobileMapTop]);

  useEffect(() => {
    if (!isMobile) return;
    updateMobileMapTop();
  }, [isMobile, updateMobileMapTop, isQuadrantPanelOpen, shouldShowNewBadge]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const handleChange = (event) => setIsMobile(event.matches);
    setIsMobile(mq.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
    mq.addListener(handleChange);
    return () => mq.removeListener(handleChange);
  }, []);
  useEffect(() => {
    if (!isMobile) {
      setIsQuadrantPanelOpen(false);
    }
  }, [isMobile]);
  useEffect(() => {
    if (isPlayerMode) {
      setPlayersList([]);
      return undefined;
    }
    const playersRef = collection(db, 'players');
    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const names = [];
        snapshot.forEach((docSnap) => {
          const id = docSnap.id;
          if (typeof id === 'string') {
            const trimmed = id.trim();
            if (trimmed) {
              names.push(trimmed);
            }
          }
        });
        names.sort((a, b) =>
          a.localeCompare(b, 'es', { sensitivity: 'accent', usage: 'sort' })
        );
        setPlayersList(names);
      },
      (error) => {
        console.error('Error fetching minimap players', error);
        setPlayersList([]);
      }
    );
    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, [db, isPlayerMode]);
  useEffect(() => {
    if (isPlayerMode) return;
    if (playersList.length === 0) return;
    const allowed = new Set(playersList.map((name) => normalizePlayerName(name)));
    setActiveQuadrantSharedWith((prev) => {
      const sanitized = sanitizeSharedWith(prev);
      const filtered = sanitized.filter((name) =>
        allowed.has(normalizePlayerName(name))
      );
      if (filtered.length === prev.length) {
        let unchanged = true;
        for (let i = 0; i < filtered.length; i += 1) {
          if (filtered[i] !== prev[i]) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) {
          return prev;
        }
      }
      return filtered;
    });
  }, [isPlayerMode, playersList]);
  useEffect(() => {
    setGrid((prev) => buildGrid(rows, cols, prev));
  }, [rows, cols]);
  useEffect(() => {
    if (!isMasterSharingQuadrant) {
      setShowMasterExplorerControls(false);
    }
  }, [isMasterSharingQuadrant]);
  useEffect(() => {
    if (!activeQuadrantId || !shouldTrackExploration) {
      setExplorationLoaded(false);
      setExploredCellKeys([]);
      return undefined;
    }
    const explorationDocRef = doc(db, 'minimapExplorations', activeQuadrantId);
    let isCancelled = false;
    setExplorationLoaded(false);
    const unsubscribe = onSnapshot(
      explorationDocRef,
      (snapshot) => {
        if (isCancelled) return;
        setExplorationLoaded(true);
        const data = snapshot.data();
        if (!data || !Array.isArray(data.cells)) {
          setExploredCellKeys((prev) => (prev.length === 0 ? prev : []));
          return;
        }
        const seen = new Set();
        const sanitized = [];
        data.cells.forEach((entry) => {
          if (typeof entry !== 'string') return;
          const trimmed = entry.trim();
          if (!trimmed || seen.has(trimmed)) return;
          if (!/^\d+-\d+$/.test(trimmed)) return;
          seen.add(trimmed);
          sanitized.push(trimmed);
        });
        setExploredCellKeys((prev) =>
          arraysShallowEqual(prev, sanitized) ? prev : sanitized
        );
      },
      (error) => {
        if (isCancelled) return;
        console.error('Error fetching minimap exploration', error);
        setExplorationLoaded(true);
      }
    );
    return () => {
      isCancelled = true;
      try {
        unsubscribe();
      } catch {}
      setExplorationLoaded(false);
    };
  }, [activeQuadrantId, db, shouldTrackExploration]);
  useEffect(() => {
    if (!isExplorerModeActive || !originCellKey) return;
    if (!explorationLoaded) return;
    if (exploredCellsSet.has(originCellKey)) return;
    setExploredCellKeys((prev) =>
      prev.includes(originCellKey) ? prev : [...prev, originCellKey]
    );
    if (!activeQuadrantId) return;
    const explorationDocRef = doc(db, 'minimapExplorations', activeQuadrantId);
    setDoc(
      explorationDocRef,
      {
        cells: arrayUnion(originCellKey),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((error) =>
      console.error('Error registering minimap origin exploration', error)
    );
  }, [
    activeQuadrantId,
    db,
    explorationLoaded,
    exploredCellsSet,
    isExplorerModeActive,
    originCellKey,
  ]);
  useEffect(() => {
    const quadrantsRef = collection(db, 'minimapQuadrants');
    let isUnmounted = false;

    const migrateLocalQuadrants = () => {
      const localQuadrants = Array.isArray(localQuadrantsRef.current)
        ? localQuadrantsRef.current
        : [];
      if (localQuadrants.length === 0) {
        return;
      }
      const runMigration = async () => {
        try {
          const batch = writeBatch(db);
          localQuadrants.forEach((item, index) => {
            const docId = item?.id || generateQuadrantId();
            const sanitized = sanitizeQuadrantValues(item, {
              titleFallback: `Cuadrante ${index + 1}`,
              orderFallback: index,
              ownerFallback: defaultOwner,
            });
            batch.set(doc(db, 'minimapQuadrants', docId), {
              ...sanitized,
              updatedAt: serverTimestamp(),
            });
          });
          await batch.commit();
          updateLocalQuadrants([]);
        } catch (error) {
          console.error('Error migrating minimap quadrants', error);
        }
      };
      runMigration();
    };

    const unsubscribe = onSnapshot(
      quadrantsRef,
      (snapshot) => {
        if (isUnmounted) return;
        const docsData = [];
        snapshot.forEach((docSnap) => {
          docsData.push({ id: docSnap.id, data: docSnap.data() });
        });
        if (docsData.length === 0) {
          if (!quadrantsMigrationRef.current) {
            quadrantsMigrationRef.current = true;
            migrateLocalQuadrants();
          }
          const fallback = filterQuadrantsForMode(getLocalQuadrantsSnapshot());
          setQuadrants(fallback);
          return;
        }
        quadrantsMigrationRef.current = true;
        const normalized = docsData.map(({ id, data }, index) => {
          const sanitized = sanitizeQuadrantValues(data, {
            titleFallback: `Cuadrante ${index + 1}`,
            orderFallback: index,
            ownerFallback: 'master',
          });
          return {
            id,
            ...sanitized,
            updatedAt: data?.updatedAt || null,
          };
        });
        const filtered = filterQuadrantsForMode(normalized);
        setQuadrants(filtered);
        updateLocalQuadrants(filtered);
      },
      (error) => {
        if (!isUnmounted) {
          console.error('Error fetching minimap quadrants', error);
          const fallback = filterQuadrantsForMode(getLocalQuadrantsSnapshot());
          setQuadrants(fallback);
        }
      }
    );

    return () => {
      isUnmounted = true;
      try {
        unsubscribe();
      } catch {}
    };
  }, []);
  useEffect(() => {
    if (isMobile && !readableMode) setReadableMode(true);
  }, [isMobile, readableMode]);
  useEffect(() => {
    if (!activeQuadrantId) {
      setPings([]);
      return undefined;
    }
    const pingsRef = collection(db, 'minimapPings');
    const pingQuery = query(
      pingsRef,
      where('quadrantId', '==', activeQuadrantId)
    );
    let isUnmounted = false;
    const unsubscribe = onSnapshot(
      pingQuery,
      (snapshot) => {
        if (isUnmounted) return;
        const now = Date.now();
        const entries = [];
        const expiredIds = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const row = Number.isInteger(data?.r) ? data.r : null;
          const col = Number.isInteger(data?.c) ? data.c : null;
          if (row === null || col === null) {
            return;
          }
          const createdAtRaw = data?.createdAt;
          const createdAtMs =
            createdAtRaw && typeof createdAtRaw.toMillis === 'function'
              ? createdAtRaw.toMillis()
              : typeof createdAtRaw === 'number'
              ? createdAtRaw
              : Date.now();
          if (!Number.isFinite(createdAtMs)) {
            return;
          }
          if (now - createdAtMs >= PING_TTL_MS) {
            expiredIds.push(docSnap.id);
            return;
          }
          entries.push({
            id: docSnap.id,
            r: row,
            c: col,
            author: typeof data?.author === 'string' ? data.author : '',
            createdAtMs,
          });
        });
        setPings(entries);
        if (expiredIds.length > 0) {
          expiredIds.forEach((pingId) => {
            if (!pingId) return;
            deleteDoc(doc(db, 'minimapPings', pingId)).catch(() => {});
          });
        }
      },
      (error) => {
        console.error('Error fetching minimap pings', error);
        if (!isUnmounted) {
          setPings([]);
        }
      }
    );
    return () => {
      isUnmounted = true;
      try {
        unsubscribe();
      } catch {}
      setPings([]);
    };
  }, [activeQuadrantId, db]);
  useEffect(() => {
    let isCancelled = false;
    const scheduleCleanup = () => {
      if (isCancelled) return;
      pingCleanupTimerRef.current = setTimeout(() => {
        if (isCancelled) return;
        cleanupExpiredPings();
        scheduleCleanup();
      }, PING_CLEANUP_INTERVAL_MS);
    };
    cleanupExpiredPings();
    scheduleCleanup();
    return () => {
      isCancelled = true;
      if (pingCleanupTimerRef.current) {
        clearTimeout(pingCleanupTimerRef.current);
        pingCleanupTimerRef.current = null;
      }
    };
  }, [cleanupExpiredPings]);
  useEffect(() => {
    const annotationsRef = collection(db, 'minimapAnnotations');
    const activeQueries = [
      query(annotationsRef, where('quadrantId', '==', activeQuadrantId)),
    ];
    if (activeQuadrantId === 'default') {
      activeQueries.push(query(annotationsRef, where('quadrantId', '==', null)));
    }
    const snapshotsByQuery = new Map();
    let isUnmounted = false;

    const updateFromSnapshots = () => {
      const byKey = new Map();
      const legacyEntries = [];
      snapshotsByQuery.forEach((entries) => {
        entries.forEach(({ annotation, hasQuadrantValue, docId }) => {
          if (!byKey.has(annotation.key) || hasQuadrantValue) {
            byKey.set(annotation.key, annotation);
          }
          if (!hasQuadrantValue) {
            legacyEntries.push({ annotation, docId });
          }
        });
      });
      const filtered = Array.from(byKey.values()).filter(
        (item) => (item?.quadrantId || 'default') === activeQuadrantId
      );
      setAnnotations((prev) => {
        const others = prev.filter(
          (item) => (item?.quadrantId || 'default') !== activeQuadrantId
        );
        if (filtered.length === 0) {
          const existing = prev.filter(
            (item) => (item?.quadrantId || 'default') === activeQuadrantId
          );
          return [...others, ...existing];
        }
        return [...others, ...filtered];
      });
      if (activeQuadrantId === 'default' && legacyEntries.length > 0) {
        migrateLegacyAnnotations(legacyEntries);
      }
    };

    const unsubscribeFns = activeQueries.map((q, index) =>
      onSnapshot(
        q,
        (snapshot) => {
          const entries = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (typeof data?.r !== 'number' || typeof data?.c !== 'number') {
              return;
            }
            const quadrantValue = data?.quadrantId || 'default';
            const hasQuadrantValue = Boolean(data?.quadrantId);
            const key = `${quadrantValue}-${data.r}-${data.c}`;
            entries.push({
              annotation: { ...data, quadrantId: quadrantValue, key },
              hasQuadrantValue,
              docId: docSnap.id,
            });
          });
          snapshotsByQuery.set(index, entries);
          if (!isUnmounted) {
            updateFromSnapshots();
          }
        },
        (error) => {
          if (!isUnmounted) {
            console.error('Error fetching minimap annotations', error);
          }
        }
      )
    );

    return () => {
      isUnmounted = true;
      unsubscribeFns.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch {}
      });
    };
  }, [activeQuadrantId, migrateLegacyAnnotations]);
  useEffect(() => {
    let isUnmounted = false;
    const fallback = readLocalCustomization();
    const unsubscribe = onSnapshot(
      customizationDocRef,
      (snapshot) => {
        if (isUnmounted) return;
        let nextIcons = [];
        let nextPresets = [];
        if (snapshot.exists()) {
          const data = snapshot.data() || {};
          nextIcons = sanitizeCustomIcons(data.customIcons);
          nextPresets = sanitizeCellStylePresets(data.cellStylePresets);
        } else {
          nextIcons = fallback.customIcons;
          nextPresets = fallback.cellStylePresets;
          setDoc(
            customizationDocRef,
            {
              customIcons: nextIcons,
              cellStylePresets: nextPresets,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((error) => {
            console.error('Error initializing minimap customization', error);
          });
        }
        const iconsStr = JSON.stringify(nextIcons);
        const presetsStr = JSON.stringify(nextPresets);
        customizationSnapshotRef.current = {
          icons: iconsStr,
          presets: presetsStr,
        };
        setCustomIcons((prev) => {
          const prevStr = JSON.stringify(prev);
          if (prevStr === iconsStr) {
            return prev;
          }
          return nextIcons;
        });
        setCellStylePresets((prev) => {
          const prevStr = JSON.stringify(prev);
          if (prevStr === presetsStr) {
            return prev;
          }
          return nextPresets;
        });
        setCustomizationReady(true);
      },
      (error) => {
        if (!isUnmounted) {
          console.error('Error fetching minimap customization', error);
        }
      }
    );
    return () => {
      isUnmounted = true;
      try {
        unsubscribe();
      } catch {}
    };
  }, [customizationDocRef]);
  useEffect(() => {
    if (!isCustomizationReady || typeof window === 'undefined') return;
    const sanitizedIcons = sanitizeCustomIcons(customIcons);
    const sanitizedPresets = sanitizeCellStylePresets(cellStylePresets);
    try {
      window.localStorage.setItem(
        'minimapCustomIcons',
        JSON.stringify(sanitizedIcons)
      );
    } catch {}
    try {
      window.localStorage.setItem(
        'minimapCellStylePresets',
        JSON.stringify(sanitizedPresets)
      );
    } catch {}
  }, [customIcons, cellStylePresets, isCustomizationReady]);
  useEffect(() => {
    if (!isCustomizationReady) return;
    const sanitizedIcons = sanitizeCustomIcons(customIcons);
    const sanitizedPresets = sanitizeCellStylePresets(cellStylePresets);
    const iconsStr = JSON.stringify(sanitizedIcons);
    const presetsStr = JSON.stringify(sanitizedPresets);
    const last = customizationSnapshotRef.current;
    if (iconsStr === last.icons && presetsStr === last.presets) {
      return;
    }
    setDoc(
      customizationDocRef,
      {
        customIcons: sanitizedIcons,
        cellStylePresets: sanitizedPresets,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((error) => {
      console.error('Error saving minimap customization', error);
    });
  }, [
    customIcons,
    cellStylePresets,
    isCustomizationReady,
    customizationDocRef,
  ]);
  useEffect(() => {
    if (shapeEdit) {
      const all = [];
      grid.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.active) all.push({ r, c });
        })
      );
      setSelectedCells(all);
    }
  }, [shapeEdit, grid]);
  useEffect(() => {
    if (canEditActiveQuadrant) return;
    if (shapeEdit) setShapeEdit(false);
  }, [canEditActiveQuadrant, shapeEdit]);
  useEffect(() => {
    if (canEditActiveQuadrant || canAnnotateActiveQuadrant) return;
    if (isPropertyPanelOpen) setIsPropertyPanelOpen(false);
    if (selectedCells.length > 0) setSelectedCells([]);
  }, [
    canEditActiveQuadrant,
    canAnnotateActiveQuadrant,
    isPropertyPanelOpen,
    selectedCells.length,
  ]);
  useEffect(() => {
    if (!shapeEdit) setSelectedCells([]);
  }, [shapeEdit]);
  useEffect(() => {
    if (!hasSelectedCells && isPropertyPanelOpen) {
      setIsPropertyPanelOpen(false);
    }
  }, [hasSelectedCells, isPropertyPanelOpen]);
  useEffect(() => {
    if (!isPropertyPanelOpen) {
      setActiveColorPicker(null);
    }
  }, [isPropertyPanelOpen]);
  useEffect(() => {
    if (!isPropertyPanelOpen) {
      skipClickRef.current = false;
    }
  }, [isPropertyPanelOpen]);
  useEffect(() => {
    if (!hasSelectedCells) {
      setPanelTab('style');
      setActiveColorPicker(null);
    }
  }, [hasSelectedCells]);
  useEffect(() => {
    if (activeColorPicker !== 'effect') return;
    const effectType = selectedCellData?.effect?.type || 'none';
    if (effectType === 'none') {
      setActiveColorPicker(null);
    }
  }, [activeColorPicker, selectedCellData]);

  const ColorPickerButton = ({
    id,
    label,
    value,
    onChange,
    icon: Icon,
    disabled = false,
  }) => {
    const containerRef = useRef(null);
    const isOpen = activeColorPicker === id;
    useEffect(() => {
      if (!isOpen) return undefined;
      const handlePointerDown = (event) => {
        if (!containerRef.current) return;
        if (containerRef.current.contains(event.target)) return;
        setActiveColorPicker(null);
      };
      document.addEventListener('pointerdown', handlePointerDown);
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
      };
    }, [isOpen]);
    const safeValue = value || '#000000';
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (disabled) return;
            setActiveColorPicker(isOpen ? null : id);
          }}
          disabled={disabled}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
            disabled
              ? 'cursor-not-allowed border-gray-800 bg-gray-800 text-gray-500'
              : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500'
          }`}
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>{label}</span>
          <span
            className="h-4 w-4 rounded-full border border-gray-600 shadow-inner"
            style={{ backgroundColor: safeValue }}
          />
        </button>
        {isOpen && (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-48 rounded-lg border border-gray-700 bg-gray-900/95 p-3 shadow-xl">
            <HexColorInput value={safeValue} onChange={onChange} />
          </div>
        )}
      </div>
    );
  };

  // Catálogo básico (Estados/Personalizados). Emojis/Lucide se añaden por entrada.
  const baseIconCatalog = useMemo(() => {
    const estadoIcons = ESTADOS.map((e) => ({ url: e.img, name: e.name }));
    const custom = customIcons.map((u) => ({ url: u, name: 'Personalizado' }));
    return {
      estados: estadoIcons,
      personalizados: custom,
    };
  }, [customIcons]);

  useEffect(() => {
    let isMounted = true;
    const itemsRef = collection(db, 'customItems');
    const unsubscribe = onSnapshot(
      itemsRef,
      (snapshot) => {
        if (!isMounted) return;
        const entries = snapshot.docs.map((docSnap) => docSnap.data() || {});
        setResourceItems(entries);
      },
      (error) => {
        if (!isMounted) return;
        console.error('Error fetching custom inventory items', error);
        setResourceItems([]);
      }
    );
    return () => {
      isMounted = false;
      try {
        unsubscribe();
      } catch {}
    };
  }, [db]);

  const emojiDataUrl = useCallback((ch) => {
    const safe = ch && typeof ch === 'string' && ch.length ? ch : '❔';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-size='52'>${safe}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  const lucideCache = useRef(new Map());
  const lucideDataUrl = useCallback(
    (name) => {
      if (!name) return '';
      const cache = lucideCache.current;
      if (cache.has(name)) return cache.get(name);
      const pascal = name
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
      const Icon = LucideIcons[pascal];
      if (!Icon) return '';
      const svg = renderToStaticMarkup(<Icon size={64} />);
      const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      cache.set(name, url);
      return url;
    },
    []
  );

  const resourceCatalog = useMemo(() => {
    if (!resourceItems.length) return [];
    const fallback = emojiDataUrl('❔');
    const seen = new Set();
    return resourceItems
      .map((item) => {
        if (!item) return null;
        const label = item.name || item.type || 'Recurso';
        const icon = item.icon || '';
        let url = '';
        if (typeof icon === 'string' && icon.startsWith('data:')) {
          url = icon;
        } else if (typeof icon === 'string' && icon.startsWith('lucide:')) {
          url = lucideDataUrl(icon.slice(7));
        } else if (typeof icon === 'string' && /^https?:/i.test(icon)) {
          url = icon;
        } else if (icon) {
          url = emojiDataUrl(icon);
        }
        const finalUrl = url || fallback;
        if (seen.has(finalUrl)) return null;
        seen.add(finalUrl);
        return { url: finalUrl, name: label };
      })
      .filter(Boolean);
  }, [resourceItems, emojiDataUrl, lucideDataUrl]);

  const allIcons = useMemo(
    () => ({
      estados: baseIconCatalog.estados,
      personalizados: baseIconCatalog.personalizados,
      recursos: resourceCatalog,
      emojis: [],
      lucide: [],
    }),
    [baseIconCatalog, resourceCatalog]
  );

  // Cargar todos los emojis (agrupados) cuando se selecciona la pestaña
  useEffect(() => {
    if (emojiGroups || iconSource !== 'emojis') return undefined;
    let isMounted = true;

    const cachedGroups = emojiGroupsCache;
    if (cachedGroups) {
      setEmojiGroups(cachedGroups);
      setIconsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIconsLoading(true);
    ensureEmojiGroups()
      .then((groups) => {
        if (!isMounted) return;
        setEmojiGroups(groups);
      })
      .catch(() => {
        if (!isMounted) return;
        emojiGroupsCache = FALLBACK_EMOJI_GROUPS;
        setEmojiGroups(FALLBACK_EMOJI_GROUPS);
      })
      .finally(() => {
        if (isMounted) {
          setIconsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [iconSource, emojiGroups]);

  // Cargar todos los nombres de Lucide localmente del paquete
  useEffect(() => {
    if (lucideNames || iconSource !== 'lucide') return;
    setIconsLoading(true);
    try {
      const names = Object.keys(LucideIcons)
        .filter((n) => /^[A-Z]/.test(n) && n !== 'Icon')
        .map((n) => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
        .sort();
      setLucideNames(names);
    } finally {
      setIconsLoading(false);
    }
  }, [iconSource, lucideNames]);

  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;
  const adderSize = Math.max(24, Math.min(36, Math.round(cellSize * 0.75)));
  const adderBtn = Math.max(
    22,
    Math.min(adderSize - 6, Math.round(cellSize * 0.75))
  );
  const perimGap = Math.max(10, Math.min(24, Math.round(cellSize * 0.35)));
  const perimMargin = perimGap + adderBtn;
  const touchActionClass = isMobile
    ? isMoveMode || isMultiTouchActive
      ? 'touch-none'
      : 'touch-pan-y'
    : 'touch-none';

  const [autoFit, setAutoFit] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const pointersRef = useRef(new Map());
  const pinchDistRef = useRef(0);
  const pinchStateRef = useRef(null);
  const resetPinchRefs = useCallback(() => {
    pinchDistRef.current = 0;
    pinchStateRef.current = null;
  }, []);
  const offsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const resetPointerState = useCallback(() => {
    pointersRef.current.clear();
    isPanningRef.current = false;
    activePanPointerRef.current = null;
    resetPinchRefs();
    hadMultiTouchRef.current = false;
    setIsMultiTouchActive(false);
  }, [resetPinchRefs, setIsMultiTouchActive]);
  useEffect(() => {
    if (isMobile) {
      setAutoFit(false);
    }
  }, [isMobile]);
  const recomputeFit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cw = (Number.isFinite(rect.width) ? rect.width : el.clientWidth) - 16;
    const ch = (Number.isFinite(rect.height) ? rect.height : el.clientHeight) - 16;
    const neededW = gridWidth + perimMargin * 2;
    const neededH = gridHeight + perimMargin * 2;
    if (neededW <= 0 || neededH <= 0) {
      setFitScale(1);
      return;
    }
    const safeCw = Math.max(cw, 1);
    const safeCh = Math.max(ch, 1);
    const rawScale = Math.min(safeCw / neededW, safeCh / neededH);
    if (!Number.isFinite(rawScale) || rawScale <= 0) {
      setFitScale(1);
      return;
    }
    const minScale = isMobile ? 0.8 : 0.4;
    const canRespectMin =
      safeCw >= neededW * minScale && safeCh >= neededH * minScale;
    const nextScale = canRespectMin
      ? Math.min(1, Math.max(minScale, rawScale))
      : Math.min(1, rawScale);
    setFitScale(nextScale);
  }, [gridWidth, gridHeight, perimMargin, isMobile]);
  useEffect(() => {
    recomputeFit();
  }, [recomputeFit, rows, cols, cellSize, isMobile]);
  useEffect(() => {
    if (!isMobile) return;
    recomputeFit();
  }, [isMobile, mobileMapTop, recomputeFit]);
  useEffect(() => {
    const onResize = () => recomputeFit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recomputeFit]);

  useEffect(() => {
    if (autoFit) setOffset({ x: 0, y: 0 });
  }, [autoFit]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    resetPointerState();
    if (isMoveMode) {
      setAutoFit(false);
      skipClickRef.current = true;
    } else {
      skipClickRef.current = false;
    }
  }, [isMoveMode, resetPointerState]);
  useEffect(() => {
    if (!isPropertyPanelOpen) {
      resetPointerState();
    }
  }, [isPropertyPanelOpen, resetPointerState]);

  const handleWheel = useCallback(
    (e) => {
      if (autoFit) return;
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom((z) => {
        const newZoom = Math.min(2, Math.max(0.35, z - e.deltaY * 0.001));
        const scale = newZoom / z;
        setOffset((prev) => {
          const next = {
            x: prev.x - (mx - prev.x) * (scale - 1),
            y: prev.y - (my - prev.y) * (scale - 1),
          };
          offsetRef.current = next;
          return next;
        });
        return newZoom;
      });
    },
    [autoFit]
  );

  const initPinchState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const entries = Array.from(pointersRef.current.entries());
    if (entries.length < 2) return;
    const rect = el.getBoundingClientRect();
    const baseScale = autoFit ? fitScale : zoomRef.current;
    if (!Number.isFinite(baseScale) || baseScale <= 0) return;
    const [[idA, pA], [idB, pB]] = entries;
    const posA = { x: pA.x - rect.left, y: pA.y - rect.top };
    const posB = { x: pB.x - rect.left, y: pB.y - rect.top };
    const contentA = {
      x: (posA.x - offsetRef.current.x) / baseScale,
      y: (posA.y - offsetRef.current.y) / baseScale,
    };
    const contentB = {
      x: (posB.x - offsetRef.current.x) / baseScale,
      y: (posB.y - offsetRef.current.y) / baseScale,
    };
    const contentDist = Math.hypot(
      contentB.x - contentA.x,
      contentB.y - contentA.y
    );
    pinchStateRef.current = {
      pointers: {
        [idA]: { content: contentA },
        [idB]: { content: contentB },
      },
      contentDist: contentDist > 0 ? contentDist : 0.0001,
    };
    pinchDistRef.current = Math.hypot(posB.x - posA.x, posB.y - posA.y);
  }, [autoFit, fitScale]);

  const handlePointerDownCapture = useCallback((e) => {
    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
    });
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      pointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });
      if (pointersRef.current.size === 1) {
        hadMultiTouchRef.current = false;
        pinchStateRef.current = null;
      } else if (pointersRef.current.size > 1) {
        hadMultiTouchRef.current = true;
        clearLongPressTimers();
        initPinchState();
      }
      setIsMultiTouchActive(pointersRef.current.size > 1);
      skipClickRef.current = isMoveMode || pointersRef.current.size > 1;
      if (isMoveMode) {
        clearLongPressTimers();
      }
      const allowNativeScroll =
        isMobile &&
        !isMoveMode &&
        e.pointerType === 'touch' &&
        pointersRef.current.size === 1;
      if (allowNativeScroll) {
        return;
      }
      if (autoFit && !isMoveMode) return;
      e.preventDefault();
      if (pointersRef.current.size === 1) {
        activePanPointerRef.current = e.pointerId;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        isPanningRef.current = false;
      } else if (pointersRef.current.size === 2) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        pinchDistRef.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        isPanningRef.current = true;
        skipClickRef.current = true;
      }
    },
    [
      autoFit,
      isMobile,
      isMoveMode,
      clearLongPressTimers,
      initPinchState,
      setIsMultiTouchActive,
    ]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });
      const allowNativeScroll =
        isMobile &&
        !isMoveMode &&
        e.pointerType === 'touch' &&
        pointersRef.current.size === 1;
      if (allowNativeScroll) {
        return;
      }
      if (autoFit && !isMoveMode) return;
      e.preventDefault();
      if (pointersRef.current.size === 2) {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        let state = pinchStateRef.current;
        const entries = Array.from(pointersRef.current.entries());
        const hasState =
          state &&
          state.pointers[entries[0][0]] &&
          state.pointers[entries[1][0]];
        if (!hasState) {
          initPinchState();
          state = pinchStateRef.current;
        }
        if (!state) return;
        const [[idA, pA], [idB, pB]] = entries;
        const pointerA = state.pointers[idA];
        const pointerB = state.pointers[idB];
        if (!pointerA || !pointerB) return;
        const posA = { x: pA.x - rect.left, y: pA.y - rect.top };
        const posB = { x: pB.x - rect.left, y: pB.y - rect.top };
        const dist = Math.hypot(posB.x - posA.x, posB.y - posA.y);
        const baseContentDist =
          state.contentDist ||
          Math.hypot(
            pointerB.content.x - pointerA.content.x,
            pointerB.content.y - pointerA.content.y
          ) ||
          0.0001;
        const clampedScale = Math.min(2, Math.max(0.35, dist / baseContentDist));
        const offsetA = {
          x: posA.x - pointerA.content.x * clampedScale,
          y: posA.y - pointerA.content.y * clampedScale,
        };
        const offsetB = {
          x: posB.x - pointerB.content.x * clampedScale,
          y: posB.y - pointerB.content.y * clampedScale,
        };
        const nextOffset = {
          x: (offsetA.x + offsetB.x) / 2,
          y: (offsetA.y + offsetB.y) / 2,
        };
        skipClickRef.current = true;
        isPanningRef.current = true;
        pinchDistRef.current = dist;
        offsetRef.current = nextOffset;
        setOffset(nextOffset);
        if (!autoFit) {
          zoomRef.current = clampedScale;
          setZoom(clampedScale);
        }
        return;
      }
      if (activePanPointerRef.current !== e.pointerId) return;
      const canPan = e.pointerType === 'mouse' || isMoveMode;
      if (!canPan) return;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const distFromStart = Math.hypot(
        e.clientX - panStartRef.current.x,
        e.clientY - panStartRef.current.y
      );
      if (!isPanningRef.current) {
        if (e.pointerType !== 'mouse' && distFromStart < 3) {
          lastPosRef.current = { x: e.clientX, y: e.clientY };
          return;
        }
        isPanningRef.current = true;
        skipClickRef.current = true;
        clearLongPressTimers();
      }
      skipClickRef.current = true;
      setOffset((prev) => {
        const next = { x: prev.x + dx, y: prev.y + dy };
        offsetRef.current = next;
        return next;
      });
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    },
    [
      autoFit,
      isMobile,
      isMoveMode,
      clearLongPressTimers,
      initPinchState,
    ]
  );

  const handlePointerUp = useCallback(
    (e) => {
      const wasPanning = isPanningRef.current;
      pointersRef.current.delete(e.pointerId);
      setIsMultiTouchActive(pointersRef.current.size > 1);
      if (pointersRef.current.size < 2) {
        resetPinchRefs();
      }
      if (activePanPointerRef.current === e.pointerId) {
        activePanPointerRef.current = null;
      }
      if (pointersRef.current.size === 0) {
        isPanningRef.current = false;
        skipClickRef.current = hadMultiTouchRef.current
          ? true
          : isMoveMode || wasPanning;
      } else {
        skipClickRef.current = true;
        if (pointersRef.current.size === 1) {
          const [remainingId, pos] = pointersRef.current.entries().next().value;
          lastPosRef.current = { x: pos.x, y: pos.y };
          panStartRef.current = { x: pos.x, y: pos.y };
          activePanPointerRef.current = isMoveMode ? remainingId : null;
          isPanningRef.current = false;
        }
      }
      const allowNativeScroll =
        isMobile &&
        !isMoveMode &&
        e.pointerType === 'touch' &&
        !hadMultiTouchRef.current;
      if (allowNativeScroll) {
        return;
      }
      if (autoFit && !isMoveMode) return;
      e.preventDefault();
    },
    [
      autoFit,
      isMobile,
      isMoveMode,
      resetPinchRefs,
      setIsMultiTouchActive,
    ]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const listenerOptions = { passive: false };
    const handleDownCapture = (event) => handlePointerDownCapture(event);
    const handleDown = (event) => handlePointerDown(event);
    const handleMove = (event) => handlePointerMove(event);
    const handleUp = (event) => handlePointerUp(event);

    el.addEventListener('pointerdown', handleDownCapture, true);
    el.addEventListener('pointerdown', handleDown, listenerOptions);
    el.addEventListener('pointermove', handleMove, listenerOptions);
    el.addEventListener('pointerup', handleUp, listenerOptions);
    el.addEventListener('pointerleave', handleUp, listenerOptions);
    el.addEventListener('pointercancel', handleUp, listenerOptions);

    return () => {
      el.removeEventListener('pointerdown', handleDownCapture, true);
      el.removeEventListener('pointerdown', handleDown, listenerOptions);
      el.removeEventListener('pointermove', handleMove, listenerOptions);
      el.removeEventListener('pointerup', handleUp, listenerOptions);
      el.removeEventListener('pointerleave', handleUp, listenerOptions);
      el.removeEventListener('pointercancel', handleUp, listenerOptions);
    };
  }, [
    handlePointerDownCapture,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  ]);

  const applyExplorerMutation = ({
    keys,
    action,
    masterModeOverride = false,
  }) => {
    if (!activeQuadrantId) return;
    updateMinimapExplorationCells({
      db,
      quadrantId: activeQuadrantId,
      keys,
      action,
      masterMode: masterModeOverride,
      exploredCellsSet,
      explorerFrontierSet,
      setExploredCellKeys,
    }).catch((error) => {
      console.error('Error updating minimap exploration cells', error);
    });
  };
  const revealExplorerCell = (r, c) => {
    if (!isExplorerModeActive) return;
    const key = cellKeyFromIndices(r, c);
    applyExplorerMutation({ keys: [key], action: 'add' });
  };
  const handleMasterRevealFrontier = () => {
    if (!isMasterSharingQuadrant) return;
    const keys = Array.from(explorerFrontierSet);
    if (keys.length === 0) return;
    applyExplorerMutation({
      keys,
      action: 'add',
      masterModeOverride: true,
    });
  };
  const handleMasterRevealSelection = () => {
    if (!isMasterSharingQuadrant) return;
    if (selectedExplorerFrontierKeys.length === 0) return;
    applyExplorerMutation({
      keys: selectedExplorerFrontierKeys,
      action: 'add',
      masterModeOverride: true,
    });
  };
  const handleMasterHideSelection = () => {
    if (!isMasterSharingQuadrant) return;
    if (selectedExploredKeys.length === 0) return;
    applyExplorerMutation({
      keys: selectedExploredKeys,
      action: 'remove',
      masterModeOverride: true,
    });
  };
  const createPing = useCallback(
    (r, c) => {
      if (!activeQuadrantId) return false;
      if (!(canEditActiveQuadrant || canAnnotateActiveQuadrant)) return false;
      if (isExplorerModeActive) {
        const key = cellKeyFromIndices(r, c);
        if (!exploredCellsSet.has(key)) {
          return false;
        }
      }
      const payload = {
        quadrantId: activeQuadrantId,
        r,
        c,
        createdAt: serverTimestamp(),
        author: pingAuthor,
      };
      addDoc(collection(db, 'minimapPings'), payload).catch((error) => {
        console.error('Error creating minimap ping', error);
      });
      return true;
    },
    [
      activeQuadrantId,
      db,
      canAnnotateActiveQuadrant,
      canEditActiveQuadrant,
      exploredCellsSet,
      isExplorerModeActive,
      pingAuthor,
    ]
  );
  const handleCellClick = (r, c, event) => {
    if (isExplorerModeActive) {
      const key = cellKeyFromIndices(r, c);
      if (!exploredCellsSet.has(key)) {
        if (explorerFrontierSet.has(key)) {
          revealExplorerCell(r, c);
        }
        return;
      }
    }
    const isClickEvent = event && event.type === 'click';
    const isPrimaryButton =
      !isClickEvent || typeof event.button !== 'number'
        ? true
        : event.button === 0;
    const hasPingModifier =
      isClickEvent && isPrimaryButton && (event.altKey || event.metaKey);
    const isDoubleClick =
      isClickEvent && isPrimaryButton && event.detail >= 2;
    if (isClickEvent && (isDoubleClick || hasPingModifier)) {
      const didCreatePing = createPing(r, c);
      if (didCreatePing) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if (!canEditActiveQuadrant && !canAnnotateActiveQuadrant) return;
    if (
      isMoveMode ||
      skipClickRef.current ||
      hadMultiTouchRef.current ||
      isPanningRef.current
    ) {
      return;
    }
    let didSelect = false;
    let didDeselect = false;
    setSelectedCells((prev) => {
      if (!canEditActiveQuadrant) {
        const isSame =
          prev.length === 1 && prev[0].r === r && prev[0].c === c;
        if (isSame) {
          didDeselect = true;
          return [];
        }
        didSelect = true;
        return [{ r, c }];
      }
      const exists = prev.some((cell) => cell.r === r && cell.c === c);
      if (exists) {
        const next = prev.filter((cell) => cell.r !== r || cell.c !== c);
        if (next.length === 0) {
          setIsPropertyPanelOpen(false);
        }
        return next;
      }
      return [...prev, { r, c }];
    });
    if (!canEditActiveQuadrant) {
      if (didSelect) {
        setIsPropertyPanelOpen(true);
      } else if (didDeselect) {
        setIsPropertyPanelOpen(false);
      }
    }
  };
  const updateCell = (cells, updater) =>
    setGrid((prev) => {
      if (!canEditActiveQuadrant) return prev;
      const next = prev.map((row) => row.slice());
      (Array.isArray(cells) ? cells : [cells]).forEach(({ r, c }) => {
        next[r] = next[r].slice();
        next[r][c] = { ...next[r][c], ...updater };
      });
      return next;
    });
  const trimGrid = (g) => {
    if (!canEditActiveQuadrant) return g;
    let next = g;
    const originalRows = next.length;
    const originalCols = next[0]?.length || 0;
    let newRows = originalRows;
    let newCols = originalCols;
    let removedTop = 0;
    let removedLeft = 0;
    const rowEmpty = (row) => row.every((cell) => !cell.active);
    const colEmpty = (idx) => next.every((row) => !row[idx].active);
    while (newRows > 1 && rowEmpty(next[0])) {
      next = next.slice(1);
      newRows--;
      removedTop++;
    }
    while (newRows > 1 && rowEmpty(next[newRows - 1])) {
      next = next.slice(0, -1);
      newRows--;
    }
    while (newCols > 1 && colEmpty(0)) {
      next = next.map((row) => row.slice(1));
      newCols--;
      removedLeft++;
    }
    while (newCols > 1 && colEmpty(newCols - 1)) {
      next = next.map((row) => row.slice(0, -1));
      newCols--;
    }
    if (newRows !== rows) setRows(newRows);
    if (newCols !== cols) setCols(newCols);
    setSelectedCells((prev) =>
      prev.filter(({ r, c }) => r < newRows && c < newCols && next[r][c].active)
    );
    const shouldAdjustAnnotations =
      removedTop > 0 ||
      removedLeft > 0 ||
      newRows !== originalRows ||
      newCols !== originalCols;
    if (shouldAdjustAnnotations) {
      const movedAnnotations = [];
      const removedAnnotationKeys = new Set();
      const removedLegacyKeys = new Set();
      setAnnotations((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const nextAnnotations = [];
        prev.forEach((ann) => {
          if (!ann) return;
          const annQuadrant = ann.quadrantId || 'default';
          if (annQuadrant !== activeQuadrantId) {
            nextAnnotations.push(ann);
            return;
          }
          const oldR = ann.r;
          const oldC = ann.c;
          if (
            typeof oldR !== 'number' ||
            Number.isNaN(oldR) ||
            typeof oldC !== 'number' ||
            Number.isNaN(oldC)
          ) {
            nextAnnotations.push(ann);
            return;
          }
          const newR = oldR - removedTop;
          const newC = oldC - removedLeft;
          if (newR < 0 || newC < 0 || newR >= newRows || newC >= newCols) {
            if (ann.key) {
              removedAnnotationKeys.add(ann.key);
            }
            if (
              !ann.scope &&
              Number.isInteger(oldR) &&
              Number.isInteger(oldC)
            ) {
              removedLegacyKeys.add(`${oldR}-${oldC}`);
            }
            return;
          }
          const nextScope = typeof ann.scope === 'string' ? ann.scope : '';
          const newKey = buildAnnotationKey(activeQuadrantId, newR, newC, nextScope);
          const updatedAnn = {
            ...ann,
            r: newR,
            c: newC,
            key: newKey,
            quadrantId: activeQuadrantId,
            scope: nextScope,
          };
          nextAnnotations.push(updatedAnn);
          if (newKey !== ann.key) {
            movedAnnotations.push({
              annotation: updatedAnn,
              previousKey: ann.key,
              previousLegacyKey:
                !nextScope && Number.isInteger(oldR) && Number.isInteger(oldC)
                  ? `${oldR}-${oldC}`
                  : null,
            });
          }
        });
        return nextAnnotations;
      });
      movedAnnotations.forEach(({ annotation, previousKey, previousLegacyKey }) => {
        if (annotation.text || annotation.icon) {
          setAnnotation(
            annotation.r,
            annotation.c,
            {
              text: annotation.text || '',
              icon: annotation.icon || '',
            },
            { skipLocalUpdate: true, existing: annotation, override: true }
          );
        }
        if (previousKey && previousKey !== annotation.key) {
          deleteDoc(doc(db, 'minimapAnnotations', previousKey)).catch(() => {});
        }
        const newLegacyKey = annotation.scope
          ? null
          : `${annotation.r}-${annotation.c}`;
        if (
          previousLegacyKey &&
          newLegacyKey &&
          previousLegacyKey !== newLegacyKey
        ) {
          deleteDoc(doc(db, 'minimapAnnotations', previousLegacyKey)).catch(() => {});
        }
      });
      removedAnnotationKeys.forEach((key) => {
        if (key) {
          deleteDoc(doc(db, 'minimapAnnotations', key)).catch(() => {});
        }
      });
      removedLegacyKeys.forEach((legacyKey) => {
        if (legacyKey) {
          deleteDoc(doc(db, 'minimapAnnotations', legacyKey)).catch(() => {});
        }
      });
    }
    return next;
  };
  const setActive = (cells, active) =>
    setGrid((prev) => {
      if (!canEditActiveQuadrant) return prev;
      let next = prev.map((row) => row.slice());
      (Array.isArray(cells) ? cells : [cells]).forEach(({ r, c }) => {
        next[r] = next[r].slice();
        next[r][c] = { ...next[r][c], active };
      });
      return trimGrid(next);
    });
  const clearIcon = (cells) => updateCell(cells, { icon: null, iconRotation: 0 });
  const resetCellStyle = (cells) =>
    setGrid((prev) => {
      if (!canEditActiveQuadrant) return prev;
      const next = prev.map((row) => row.slice());
      (Array.isArray(cells) ? cells : [cells]).forEach(({ r, c }) => {
        next[r] = next[r].slice();
        const active = next[r][c].active;
        next[r][c] = { ...defaultCell(), active };
      });
      return next;
    });
  const saveCellPreset = () => {
    if (!selectedCell) return;
    const cell = grid[selectedCell.r][selectedCell.c];
    const preset = {
      fill: cell.fill,
      borderColor: cell.borderColor,
      borderWidth: cell.borderWidth,
      borderStyle: cell.borderStyle,
      icon: cell.icon,
      iconRotation: cell.iconRotation,
      effect: cell.effect,
    };
    setCellStylePresets((p) => [...p, preset]);
  };
  const applyCellPreset = (preset) => {
    if (selectedCells.length === 0) return;
    updateCell(selectedCells, preset);
  };
  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const { url } = await getOrUploadFile(file, 'MinimapaIcons');
      setCustomIcons((p) => [...p, url]);
    } catch {
      const fr = new FileReader();
      await new Promise((res, rej) => {
        fr.onerror = rej;
        fr.onload = () => res();
        fr.readAsDataURL(file);
      });
      if (typeof fr.result === 'string')
        setCustomIcons((p) => [...p, fr.result]);
    }
  };
  const handleRemoveCustomIcon = (index) => {
    setCustomIcons((prev) => {
      if (!Array.isArray(prev) || index < 0 || index >= prev.length) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getNextQuadrantOrder = () => {
    if (!Array.isArray(quadrants) || quadrants.length === 0) {
      return 0;
    }
    let maxOrder = -1;
    quadrants.forEach((q, index) => {
      const value = Number.isFinite(q?.order) ? q.order : index;
      if (value > maxOrder) {
        maxOrder = value;
      }
    });
    return maxOrder + 1;
  };
  const saveQuadrant = async () => {
    const nextOrder = getNextQuadrantOrder();
    const fallbackTitle = `Cuadrante ${quadrants.length + 1}`;
    const ownerValue = isPlayerMode ? defaultOwner : 'master';
    const sharedList = isPlayerMode ? [] : activeQuadrantSharedWith;
    const sanitized = sanitizeQuadrantValues(
      {
        title: quadrantTitle,
        rows,
        cols,
        cellSize,
        grid,
        order: nextOrder,
        owner: ownerValue,
        sharedWith: sharedList,
      },
      {
        titleFallback: fallbackTitle,
        orderFallback: nextOrder,
        ownerFallback: ownerValue,
      }
    );
    const newQuadrantId = generateQuadrantId();
    const localQuadrant = {
      id: newQuadrantId,
      ...sanitized,
      updatedAt: new Date().toISOString(),
    };
    const nextQuadrantsState = sortQuadrantsList([
      ...quadrants.filter(Boolean),
      localQuadrant,
    ]);
    const filteredState = filterQuadrantsForMode(nextQuadrantsState);
    const newQuadrantIndex = filteredState.findIndex(
      (item) => item.id === newQuadrantId
    );
    setQuadrants(filteredState);
    updateLocalQuadrants(filteredState);
    setCurrentQuadrantIndex(newQuadrantIndex === -1 ? null : newQuadrantIndex);
    setActiveQuadrantOwner(sanitized.owner);
    setActiveQuadrantSharedWith(sanitized.sharedWith);
    const savedSnapshot = createQuadrantSnapshot(sanitized);
    setLoadedQuadrantData(savedSnapshot);
    setQuadrantTitle('');
    let savedRemotely = true;
    try {
      await setDoc(doc(db, 'minimapQuadrants', newQuadrantId), {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      savedRemotely = false;
      console.error('Error saving minimap quadrant', error);
    }
    setAnnotations((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      let hasChanges = false;
      const next = prev.map((ann) => {
        if (!ann) return ann;
        const annQuadrant = ann?.quadrantId || 'default';
        if (annQuadrant !== 'default') {
          return ann;
        }
        const { r, c } = ann;
        if (!Number.isInteger(r) || !Number.isInteger(c)) {
          return ann;
        }
        const newKey = `${newQuadrantId}-${r}-${c}`;
        if (ann.key === newKey && ann.quadrantId === newQuadrantId) {
          return ann;
        }
        hasChanges = true;
        return { ...ann, key: newKey, quadrantId: newQuadrantId };
      });
      return hasChanges ? next : prev;
    });
    if (!savedRemotely) {
      return;
    }
    const migrateDefaultAnnotations = async () => {
      try {
        const annotationsRef = collection(db, 'minimapAnnotations');
        const snapshot = await getDocs(annotationsRef);
        const writes = [];
          const updatedKeys = new Set();
          const pendingDeletes = new Set();
          const enqueueDelete = (id) => {
            if (!id || pendingDeletes.has(id)) return;
            pendingDeletes.add(id);
            writes.push(deleteDoc(doc(db, 'minimapAnnotations', id)));
          };
          snapshot.forEach((docSnap) => {
            const dataDoc = docSnap.data();
            const hasQuadrantField = Object.prototype.hasOwnProperty.call(
              dataDoc,
              'quadrantId'
            );
            const rawQuadrantId = hasQuadrantField ? dataDoc?.quadrantId : null;
            if (
              hasQuadrantField &&
              rawQuadrantId &&
              rawQuadrantId !== 'default'
            ) {
              return;
            }
            const { r, c } = dataDoc || {};
            if (!Number.isInteger(r) || !Number.isInteger(c)) {
              return;
            }
            const newKey = `${newQuadrantId}-${r}-${c}`;
            if (!updatedKeys.has(newKey)) {
              updatedKeys.add(newKey);
              writes.push(
                setDoc(doc(db, 'minimapAnnotations', newKey), {
                  ...dataDoc,
                  quadrantId: newQuadrantId,
                  key: newKey,
                })
              );
            }
            enqueueDelete(docSnap.id);
            const legacyKey = `${r}-${c}`;
            if (legacyKey !== docSnap.id) {
              enqueueDelete(legacyKey);
            }
          });
          if (writes.length > 0) {
            await Promise.all(writes);
          }
        } catch (error) {
          console.error('Error migrating default minimap annotations', error);
        }
      };
      migrateDefaultAnnotations();
    };
  const loadQuadrant = (q, idx) => {
    if (!q) return;
    const sanitizedShared = sanitizeSharedWith(q.sharedWith);
    const ownerValue = sanitizeOwner(q.owner, defaultOwner);
    if (isPlayerMode) {
      setExploredCellKeys([]);
      setExplorationLoaded(false);
    }
    setRows(q.rows);
    setCols(q.cols);
    setCellSize(q.cellSize);
    setGrid(() => buildGrid(q.rows, q.cols, q.grid));
    setSelectedCells([]);
    setCurrentQuadrantIndex(idx);
    setActiveQuadrantOwner(ownerValue);
    setActiveQuadrantSharedWith(sanitizedShared);
    const snapshot = createQuadrantSnapshot({
      rows: q.rows,
      cols: q.cols,
      cellSize: q.cellSize,
      grid: q.grid,
      sharedWith: sanitizedShared,
    });
    setLoadedQuadrantData(snapshot);
  };
  const loadDefaultQuadrant = () => {
    const dRows = 8;
    const dCols = 12;
    const dSize = 48;
    setRows(dRows);
    setCols(dCols);
    setCellSize(dSize);
    setGrid(buildGrid(dRows, dCols));
    setSelectedCells([]);
    setCurrentQuadrantIndex(null);
    setLoadedQuadrantData(null);
    setAnnotations([]);
    setActiveQuadrantOwner(defaultOwner);
    setActiveQuadrantSharedWith([]);
    setExploredCellKeys([]);
    setExplorationLoaded(false);
  };
  const saveQuadrantChanges = async () => {
    if (!canEditActiveQuadrant) return;
    if (currentQuadrantIndex === null) return;
    const current = quadrants[currentQuadrantIndex];
    if (!current?.id) return;
    const orderValue = Number.isFinite(current?.order)
      ? current.order
      : currentQuadrantIndex;
    const fallbackTitle = current?.title || `Cuadrante ${currentQuadrantIndex + 1}`;
    const sanitized = sanitizeQuadrantValues(
      {
        title: current?.title,
        rows,
        cols,
        cellSize,
        grid,
        order: orderValue,
        owner: current?.owner,
        sharedWith: isPlayerMode
          ? current?.sharedWith || []
          : activeQuadrantSharedWith,
      },
      {
        titleFallback: fallbackTitle,
        orderFallback: orderValue,
        ownerFallback: current?.owner || defaultOwner,
      }
    );
    const updatedQuadrant = {
      ...current,
      ...sanitized,
      id: current.id,
      updatedAt: current?.updatedAt || new Date().toISOString(),
    };
    const nextQuadrantsState = sortQuadrantsList(
      quadrants.map((item) => (item?.id === current.id ? updatedQuadrant : item))
    );
    const filteredState = filterQuadrantsForMode(nextQuadrantsState);
    setQuadrants(filteredState);
    updateLocalQuadrants(filteredState);
    try {
      await setDoc(
        doc(db, 'minimapQuadrants', current.id),
        { ...sanitized, updatedAt: serverTimestamp() },
        {
          merge: true,
        }
      );
    } catch (error) {
      console.error('Error saving minimap quadrant changes', error);
    }
    const savedSnapshot = createQuadrantSnapshot(sanitized);
    setLoadedQuadrantData(savedSnapshot);
    setActiveQuadrantOwner(sanitized.owner);
    setActiveQuadrantSharedWith(sanitized.sharedWith);
  };
  const duplicateQuadrant = async (i) => {
    const source = quadrants[i];
    if (!source?.id) return;
    const sourceId = source.id;
    const copyId = generateQuadrantId();
    const title = `${source?.title || `Cuadrante ${i + 1}`} copia`;
    const nextOrder = getNextQuadrantOrder();
    const sourceOwner = sanitizeOwner(source?.owner, defaultOwner);
    const copyOwner = isPlayerMode ? defaultOwner : sourceOwner;
    const copySharedWith = isPlayerMode
      ? []
      : sanitizeSharedWith(source?.sharedWith);
    const sanitized = sanitizeQuadrantValues(
      {
        title,
        rows: source?.rows,
        cols: source?.cols,
        cellSize: source?.cellSize,
        grid: source?.grid,
        order: nextOrder,
        owner: copyOwner,
        sharedWith: copySharedWith,
      },
      {
        titleFallback: title,
        orderFallback: nextOrder,
        ownerFallback: copyOwner,
      }
    );
    const copyQuadrant = {
      id: copyId,
      ...sanitized,
      updatedAt: new Date().toISOString(),
    };
    const nextQuadrantsState = sortQuadrantsList([
      ...quadrants.filter(Boolean),
      copyQuadrant,
    ]);
    const filteredState = filterQuadrantsForMode(nextQuadrantsState);
    setQuadrants(filteredState);
    updateLocalQuadrants(filteredState);
    if (sourceId === activeQuadrantId) {
      setAnnotations((prev) => {
        const clones = prev
          .filter((ann) => (ann?.quadrantId || 'default') === sourceId)
          .map((ann) => {
            if (typeof ann?.r !== 'number' || typeof ann?.c !== 'number') {
              return null;
            }
            const scope = typeof ann.scope === 'string' ? ann.scope : '';
            const newKey = buildAnnotationKey(copyId, ann.r, ann.c, scope);
            return {
              ...ann,
              key: newKey,
              quadrantId: copyId,
              scope,
            };
          })
          .filter(Boolean);
        if (clones.length === 0) {
          return prev;
        }
        return [...prev, ...clones];
      });
    }
    try {
      await setDoc(doc(db, 'minimapQuadrants', copyId), {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
      const duplicateAnnotations = async () => {
        try {
          const annotationsRef = collection(db, 'minimapAnnotations');
          const annotationsQuery = query(
            annotationsRef,
            where('quadrantId', '==', sourceId)
          );
          const snap = await getDocs(annotationsQuery);
          const writes = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (typeof data?.r !== 'number' || typeof data?.c !== 'number') {
              return;
            }
            const scope =
              typeof data?.scope === 'string' ? data.scope.trim() : '';
            const newKey = buildAnnotationKey(copyId, data.r, data.c, scope);
            writes.push(
              setDoc(doc(db, 'minimapAnnotations', newKey), {
                ...data,
                quadrantId: copyId,
                key: newKey,
                scope,
              })
            );
          });
          await Promise.all(writes);
        } catch (error) {
          console.error('Error duplicating minimap annotations', error);
        }
      };
      await duplicateAnnotations();
    } catch (error) {
      console.error('Error duplicating minimap quadrant', error);
    }
  };
  const deleteQuadrant = async (i) => {
    if (isPlayerMode) {
      const target = quadrants[i];
      const ownerKey = normalizePlayerName(target?.owner);
      if (ownerKey === 'master') return;
      if (ownerKey && ownerKey !== normalizedPlayerName) return;
    }
    const removedQuadrant = quadrants[i] || null;
    const removedId = removedQuadrant?.id;
    if (currentQuadrantIndex === i) {
      setCurrentQuadrantIndex(null);
      setLoadedQuadrantData(null);
    } else if (currentQuadrantIndex > i) {
      setCurrentQuadrantIndex(currentQuadrantIndex - 1);
    }
    if (!removedId) {
      return;
    }
    const nextQuadrantsState = quadrants.filter((item) => item?.id !== removedId);
    setQuadrants(nextQuadrantsState);
    updateLocalQuadrants(nextQuadrantsState);
    setAnnotations((prev) =>
      prev.filter((ann) => (ann?.quadrantId || 'default') !== removedId)
    );
    try {
      await deleteDoc(doc(db, 'minimapQuadrants', removedId));
    } catch (error) {
      console.error('Error deleting minimap quadrant', error);
    }
    const cleanupAnnotations = async () => {
      try {
        const annotationsRef = collection(db, 'minimapAnnotations');
        const annotationsQuery = query(
          annotationsRef,
          where('quadrantId', '==', removedId)
        );
        const snapshot = await getDocs(annotationsQuery);
        const deletions = [];
        snapshot.forEach((docSnap) => {
          deletions.push(deleteDoc(docSnap.ref));
        });
        await Promise.all(deletions);
      } catch (error) {
        // ignore cleanup errors to avoid interrupting the flow
      }
    };
    cleanupAnnotations();
  };

  const effectiveReadable = readableMode || isMobile;

  // Adders periferia
  const addRowTopAt = (cIndex) => {
    if (!canEditActiveQuadrant) return;
    setGrid((prev) => {
      const newRow = Array.from({ length: cols }, () => ({
        ...defaultCell(),
        active: false,
      }));
      if (cIndex >= 0 && cIndex < cols) newRow[cIndex].active = true;
      return [newRow, ...prev.map((row) => row.slice())];
    });
    skipRebuildRef.current = true;
    setRows((r) => r + 1);
  };
  const addRowBottomAt = (cIndex) => {
    if (!canEditActiveQuadrant) return;
    setGrid((prev) => {
      const newRow = Array.from({ length: cols }, () => ({
        ...defaultCell(),
        active: false,
      }));
      if (cIndex >= 0 && cIndex < cols) newRow[cIndex].active = true;
      return [...prev.map((row) => row.slice()), newRow];
    });
    skipRebuildRef.current = true;
    setRows((r) => r + 1);
  };
  const addColLeftAt = (rIndex) => {
    if (!canEditActiveQuadrant) return;
    setGrid((prev) =>
      prev.map((row, r) => [{ ...defaultCell(), active: r === rIndex }, ...row])
    );
    skipRebuildRef.current = true;
    setCols((c) => c + 1);
  };
  const addColRightAt = (rIndex) => {
    if (!canEditActiveQuadrant) return;
    setGrid((prev) =>
      prev.map((row, r) => [...row, { ...defaultCell(), active: r === rIndex }])
    );
    skipRebuildRef.current = true;
    setCols((c) => c + 1);
  };
  const hasActiveNeighbor = (r, c) =>
    (r > 0 && grid[r - 1][c]?.active) ||
    (r < rows - 1 && grid[r + 1][c]?.active) ||
    (c > 0 && grid[r][c - 1]?.active) ||
    (c < cols - 1 && grid[r][c + 1]?.active);
  const toggleQuadrantPlayer = (name) => {
    if (isPlayerMode) return;
    const normalized = normalizePlayerName(name);
    if (!normalized) return;
    setActiveQuadrantSharedWith((prev) => {
      const sanitized = sanitizeSharedWith(prev);
      const exists = sanitized.some(
        (entry) => normalizePlayerName(entry) === normalized
      );
      if (exists) {
        return sanitized.filter(
          (entry) => normalizePlayerName(entry) !== normalized
        );
      }
      return [...sanitized, name];
    });
  };

  const mobileToggleRowClass =
    'flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2';
  const mobileToggleGroupClass =
    'space-y-2 rounded-xl border border-gray-700 bg-gray-900/60 p-3 shadow-inner backdrop-blur-sm';

  const quadrantSettingsBody = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{L.quadrant}</h2>
        {isMobile && (
          <button
            type="button"
            className="text-xs text-gray-300 hover:text-gray-100 underline"
            onClick={() => setIsQuadrantPanelOpen(false)}
          >
            {L.closePanel}
          </button>
        )}
      </div>
      {isSharedMasterQuadrant && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {L.masterQuadrantLocked}
        </div>
      )}
      {isMobile && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {L.mobileQuickControls}
          </div>
          <div className={mobileToggleGroupClass}>
            <label
              className={`${mobileToggleRowClass} ${
                canEditActiveQuadrant ? '' : 'opacity-40'
              }`}
            >
              <span className="text-sm font-medium text-gray-200">{L.shapeEdit}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-500"
                checked={shapeEdit}
                onChange={(e) => setShapeEdit(e.target.checked)}
                disabled={!canEditActiveQuadrant}
              />
            </label>
            <div className={`${mobileToggleRowClass} opacity-80`}>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-200">{L.readable}</span>
                <span className="text-[11px] text-gray-400">{L.mobileReadableHint}</span>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-500"
                checked={effectiveReadable}
                readOnly
                disabled
              />
            </div>
            <div className={mobileToggleRowClass}>
              <span className="text-sm font-medium text-gray-200">{L.moveMode}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-500"
                checked={isMoveMode}
                onChange={(e) => setIsMoveMode(e.target.checked)}
              />
            </div>
            <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">{L.autoFit}</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-emerald-500"
                  checked={autoFit}
                  onChange={(e) => setAutoFit(e.target.checked)}
                />
              </div>
              {!autoFit && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{L.zoom}</span>
                    <span className="font-semibold text-gray-200">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={35}
                    max={200}
                    value={Math.round(zoom * 100)}
                    onChange={(e) => setZoom(Number(e.target.value) / 100)}
                    className="h-2 w-full accent-emerald-500"
                  />
                </div>
              )}
              <Boton
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                {L.reset}
              </Boton>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-gray-300">{L.rows}</span>
          <input
            type="number"
            min={1}
            max={200}
            value={rows}
            onChange={(e) =>
              setRows(Math.max(1, Math.min(200, Number(e.target.value) || 1)))
            }
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
            disabled={!canEditActiveQuadrant}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-300">{L.cols}</span>
          <input
            type="number"
            min={1}
            max={200}
            value={cols}
            onChange={(e) =>
              setCols(Math.max(1, Math.min(200, Number(e.target.value) || 1)))
            }
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
            disabled={!canEditActiveQuadrant}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-gray-300">
            {L.cellSize}: {cellSize}px
          </span>
          <input
            type="range"
            min={24}
            max={96}
            step={4}
            value={cellSize}
            onChange={(e) => setCellSize(Number(e.target.value))}
            disabled={!canEditActiveQuadrant}
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasSelectedCells} readOnly />
          <span>{L.selectedCell}</span>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={quadrantTitle}
            onChange={(e) => setQuadrantTitle(e.target.value)}
            placeholder={L.title}
            className="flex-1 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-sm"
            disabled={!canEditActiveQuadrant}
          />
          <Boton size="sm" onClick={saveQuadrant} disabled={!canEditActiveQuadrant}>
            {L.saveQuadrant}
          </Boton>
        </div>
        {!isPlayerMode && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {L.permissions}
            </div>
            <div className="text-xs text-gray-400">{L.sharedWithPlayers}</div>
            {playersList.length === 0 ? (
              <div className="text-xs text-gray-500">{L.noPlayers}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {playersList.map((player) => {
                  const isSelected = activeQuadrantSharedWith.some(
                    (entry) => normalizePlayerName(entry) === normalizePlayerName(player)
                  );
                  return (
                    <button
                      key={player}
                      type="button"
                      onClick={() => toggleQuadrantPlayer(player)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-emerald-400 hover:text-emerald-200'
                      }`}
                    >
                      {player}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {!isPlayerMode && (
          <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {L.masterNotesSummary}
              </span>
              <span className="text-[11px] text-gray-400">
                {L.masterNotesCounter.replace(
                  '{count}',
                  String(masterAnnotationsCount)
                )}
              </span>
            </div>
            <Boton
              size="sm"
              className="w-full justify-center"
              onClick={() => setIsMasterNotesOpen(true)}
            >
              {L.masterNotesButton}
            </Boton>
          </div>
        )}
        {currentQuadrantIndex !== null && (
          <div className="text-xs text-emerald-400">
            Editando: {quadrants[currentQuadrantIndex]?.title}
          </div>
        )}
        {currentQuadrantIndex !== null && hasUnsavedChanges && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <LucideIcons.AlertTriangle
                size={14}
                className="flex-shrink-0 text-amber-300"
              />
              <span>{L.unsavedChangesIndicator}</span>
            </div>
            <Boton
              size="sm"
              onClick={saveQuadrantChanges}
              disabled={!canEditActiveQuadrant}
            >
              {L.saveChanges}
            </Boton>
          </div>
        )}
        {currentQuadrantIndex !== null && (
          <div>
            <Boton
              size="sm"
              onClick={() => runUnsavedChangesGuard(() => loadDefaultQuadrant())}
            >
              {L.defaultQuadrant}
            </Boton>
          </div>
        )}
        {quadrants.length > 0 && (
          <div className="space-y-1 mt-2">
            <div className="text-xs text-gray-300">{L.savedQuadrants}:</div>
            <div className="flex flex-wrap gap-2">
              {quadrants.map((q, i) => {
                const keyId = q.id || `quadrant-${i}`;
                const isSelectedQuadrant = currentQuadrantIndex === i;
                const ownerKey = normalizePlayerName(q?.owner);
                const isMasterQuadrant = ownerKey === 'master';
                const isOwnedByPlayer =
                  !!normalizedPlayerName && ownerKey === normalizedPlayerName;
                const isSharedFromMaster =
                  isPlayerMode &&
                  isMasterQuadrant &&
                  Array.isArray(q?.sharedWith) &&
                  q.sharedWith.some(
                    (entry) => normalizePlayerName(entry) === normalizedPlayerName
                  );
                const canDeleteQuadrant = !isPlayerMode || isOwnedByPlayer;
                const tileWidth = quadrantPreviewSize + (isMobile ? 28 : 40);
                const tileMinHeight = quadrantPreviewSize + (isMobile ? 40 : 56);
                return (
                  <div
                    key={keyId}
                    className="relative"
                    style={{ width: tileWidth }}
                  >
                    <button
                      onClick={(e) => {
                        if (
                          lastLongPressRef.current.key === keyId &&
                          Date.now() - lastLongPressRef.current.t < 700
                        ) {
                          e.preventDefault();
                          return;
                        }
                        runUnsavedChangesGuard(() => loadQuadrant(q, i));
                      }}
                      onPointerDown={(e) => {
                        if (
                          !isMobile ||
                          (e.pointerType !== 'touch' && e.pointerType !== 'pen')
                        )
                          return;
                        cancelLongPressTimer(keyId);
                        if (!canDeleteQuadrant) {
                          return;
                        }
                        const timer = setTimeout(() => {
                          const executed = runUnsavedChangesGuard(() =>
                            deleteQuadrant(i)
                          );
                          if (executed) {
                            lastLongPressRef.current = {
                              key: keyId,
                              t: Date.now(),
                            };
                          }
                          longPressTimersRef.current.delete(keyId);
                        }, 600);
                        longPressTimersRef.current.set(keyId, {
                          id: timer,
                          pointerId: e.pointerId,
                        });
                      }}
                      onPointerUp={(e) => {
                        if (
                          !isMobile ||
                          (e.pointerType !== 'touch' && e.pointerType !== 'pen')
                        )
                          return;
                        const st = longPressTimersRef.current.get(keyId);
                        if (st && st.pointerId === e.pointerId) {
                          clearTimeout(st.id);
                          longPressTimersRef.current.delete(keyId);
                        }
                      }}
                      onPointerLeave={(e) => {
                        if (
                          !isMobile ||
                          (e.pointerType !== 'touch' && e.pointerType !== 'pen')
                        )
                          return;
                        cancelLongPressTimer(keyId);
                      }}
                      onPointerCancel={(e) => {
                        if (
                          !isMobile ||
                          (e.pointerType !== 'touch' && e.pointerType !== 'pen')
                        )
                          return;
                        cancelLongPressTimer(keyId);
                      }}
                      onPointerMove={(e) => {
                        if (
                          !isMobile ||
                          (e.pointerType !== 'touch' && e.pointerType !== 'pen')
                        )
                          return;
                        cancelLongPressTimer(keyId);
                      }}
                      className={`relative flex w-full flex-col items-center rounded border ${
                        isSharedFromMaster
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                          : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                      } ${
                        isSelectedQuadrant ? 'ring-2 ring-emerald-400' : ''
                      } ${
                        isMobile
                          ? 'gap-1.5 p-2 text-[11px]'
                          : 'gap-2 p-3 text-xs'
                      }`}
                      style={{ minHeight: tileMinHeight }}
                    >
                      <div
                        className={`flex w-full justify-center min-h-[18px] ${
                          isSharedFromMaster ? 'mb-1' : 'mb-0.5'
                        }`}
                      >
                        {isSharedFromMaster && (
                          <span
                            className="rounded-full border border-emerald-400 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-100"
                            title={L.sharedQuadrantHint}
                          >
                            {L.sharedQuadrantTag}
                          </span>
                        )}
                      </div>
                      <QuadrantPreview q={q} size={quadrantPreviewSize} />
                      <span
                        className={`mt-1 ${
                          isMobile
                            ? 'text-center leading-tight break-words whitespace-normal'
                            : ''
                        }`}
                      >
                        {q.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 text-gray-300 rounded-full flex items-center justify-center hover:bg-gray-700"
                      title="Duplicar"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuadrant(i);
                      }}
                    >
                      <LucideIcons.Copy size={10} />
                    </button>
                    {!isMobile && canDeleteQuadrant && (
                      <button
                        type="button"
                        className="absolute -top-1 -left-1 w-4 h-4 bg-gray-800 text-rose-500 rounded-full flex items-center justify-center hover:bg-gray-700"
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          runUnsavedChangesGuard(() => deleteQuadrant(i));
                        }}
                      >
                        <LucideIcons.Trash2 size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 px-3 py-4 sm:px-4 lg:px-6 flex flex-col overflow-x-hidden">
      <div ref={headerSectionRef} className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Boton
              size="sm"
              className="w-full sm:w-auto justify-center bg-gray-700 hover:bg-gray-600"
              onClick={onBack}
            >
              {L.arrow} {effectiveBackLabel}
            </Boton>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Minimapa</h1>
              {shouldShowNewBadge && (
                <span className="px-2 py-0.5 text-xs bg-yellow-500 text-yellow-900 rounded-full font-bold">
                  {L.new}
                </span>
              )}
            </div>
          </div>
          <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
            <label
              className={`flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1 ${
                canEditActiveQuadrant ? '' : 'opacity-40'
              }`}
            >
              <input
                type="checkbox"
                checked={shapeEdit}
                onChange={(e) => setShapeEdit(e.target.checked)}
                disabled={!canEditActiveQuadrant}
              />
              <span>{L.shapeEdit}</span>
            </label>
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
              <input
                type="checkbox"
                checked={effectiveReadable}
                onChange={(e) => setReadableMode(e.target.checked)}
              />
              <span>{L.readable}</span>
            </label>
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
              <span>{L.autoFit}</span>
              <input
                type="checkbox"
                checked={autoFit}
                onChange={(e) => setAutoFit(e.target.checked)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
              <input
                type="checkbox"
                checked={isMoveMode}
                onChange={(e) => setIsMoveMode(e.target.checked)}
              />
              <span>{L.moveMode}</span>
            </label>
            {!autoFit && (
              <div className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
                <span>Zoom</span>
                <input
                  type="range"
                  min={35}
                  max={200}
                  value={Math.round(zoom * 100)}
                  onChange={(e) => setZoom(Number(e.target.value) / 100)}
                />
                <span className="w-10 text-right">{Math.round(zoom * 100)}%</span>
              </div>
            )}
            <Boton
              size="sm"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
            >
              {L.reset}
            </Boton>
          </div>
        </div>
        {isMobile && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-800/60 px-3 py-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
              {L.quadrant}
            </h2>
            <Boton
              size="sm"
              className="shrink-0"
              onClick={() => setIsQuadrantPanelOpen((prev) => !prev)}
            >
              {isQuadrantPanelOpen ? L.quadrantPanelClose : L.quadrantPanelOpen}
            </Boton>
          </div>
        )}
        {shouldShowExplorerNotice && (
          <div className="flex flex-col gap-2 rounded-xl border border-sky-500/40 bg-sky-900/40 px-3 py-2 text-sm text-sky-100 shadow-inner sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <LucideIcons.Compass className="h-5 w-5 text-sky-300" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-200">
                  Modo explorador
                </span>
                <span className="text-xs text-sky-100/80">
                  {isPlayerMode
                    ? 'Descubre celdas adyacentes para revelar el cuadrante compartido.'
                    : L.explorerMasterHint}
                </span>
              </div>
            </div>
            {isMasterSharingQuadrant && (
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Boton
                  size="xs"
                  className="justify-center border border-sky-600/40 bg-sky-800/60 text-sky-100 hover:bg-sky-700/60"
                  onClick={() =>
                    setShowMasterExplorerControls((prev) => !prev)
                  }
                >
                  {showMasterExplorerControls
                    ? L.explorerMasterToggleHide
                    : L.explorerMasterToggle}
                </Boton>
                {showMasterExplorerControls && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Boton
                      size="xs"
                      onClick={handleMasterRevealFrontier}
                      disabled={explorerFrontierSet.size === 0}
                    >
                      {L.explorerRevealFrontier}
                    </Boton>
                    <Boton
                      size="xs"
                      onClick={handleMasterRevealSelection}
                      disabled={selectedExplorerFrontierKeys.length === 0}
                    >
                      {L.explorerRevealSelection}
                    </Boton>
                    <Boton
                      size="xs"
                      onClick={handleMasterHideSelection}
                      disabled={selectedExploredKeys.length === 0}
                    >
                      {L.explorerHideSelection}
                    </Boton>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {!isMobile && (
          <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 lg:col-span-1">
            {quadrantSettingsBody}
          </div>
        )}

        <div
          className={`bg-gray-800/80 border border-gray-700 rounded-xl p-3 lg:col-span-3 min-h-[60vh] md:min-h-[50vh] flex flex-col ${
            isMobile ? 'fixed inset-x-0 bottom-0' : ''
          }`}
          style={isMobile ? { top: Math.max(mobileMapTop, 0) } : undefined}
        >
          <div
            className={`flex-1 min-h-0 w-full overflow-hidden overscroll-contain ${touchActionClass}`}
            ref={containerRef}
            onWheel={handleWheel}
          >
            <div
              className={`${isMobile ? 'mx-auto w-full max-w-full px-1' : ''} h-full`}
              style={{ height: '100%' }}
            >
              <div
                className="relative mx-auto"
                style={{
                  width: `${gridWidth + perimMargin * 2}px`,
                  height: `${gridHeight + perimMargin * 2}px`,
                }}
              >
                <div
                  className="absolute top-0 left-0"
                  style={{
                    transformOrigin: 'top left',
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${
                      autoFit ? fitScale : zoom
                    })`,
                    width: `${gridWidth + perimMargin * 2}px`,
                    height: `${gridHeight + perimMargin * 2}px`,
                  }}
                >
                  {canEditActiveQuadrant &&
                    Array.from({ length: cols }).map((_, c) => (
                      <button
                        key={`top-${c}`}
                        className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition"
                        style={{
                          width: adderBtn,
                          height: adderBtn,
                          top: (perimMargin - adderBtn) / 2,
                          left:
                            perimMargin +
                            c * cellSize +
                            (cellSize - adderBtn) / 2,
                        }}
                        title={L.addRowTop}
                        onClick={() => addRowTopAt(c)}
                      >
                        <LucideIcons.Plus size={adderBtn * 0.6} />
                      </button>
                    ))}
                  {canEditActiveQuadrant &&
                    Array.from({ length: cols }).map((_, c) => (
                      <button
                        key={`bottom-${c}`}
                        className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition"
                        style={{
                          width: adderBtn,
                          height: adderBtn,
                          top:
                            perimMargin +
                            gridHeight +
                            (perimMargin - adderBtn) / 2,
                          left:
                            perimMargin +
                            c * cellSize +
                            (cellSize - adderBtn) / 2,
                        }}
                        title={L.addRowBottom}
                        onClick={() => addRowBottomAt(c)}
                      >
                        <LucideIcons.Plus size={adderBtn * 0.6} />
                      </button>
                    ))}
                  {canEditActiveQuadrant &&
                    Array.from({ length: rows }).map((_, r) => (
                      <button
                        key={`left-${r}`}
                        className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition"
                        style={{
                          width: adderBtn,
                          height: adderBtn,
                          left: (perimMargin - adderBtn) / 2,
                          top:
                            perimMargin +
                            r * cellSize +
                            (cellSize - adderBtn) / 2,
                        }}
                        title={L.addColLeft}
                        onClick={() => addColLeftAt(r)}
                      >
                        <LucideIcons.Plus size={adderBtn * 0.6} />
                      </button>
                    ))}
                  {canEditActiveQuadrant &&
                    Array.from({ length: rows }).map((_, r) => (
                      <button
                        key={`right-${r}`}
                        className="absolute rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-base shadow transition"
                        style={{
                          width: adderBtn,
                          height: adderBtn,
                          left:
                            perimMargin +
                            gridWidth +
                            (perimMargin - adderBtn) / 2,
                          top:
                            perimMargin +
                            r * cellSize +
                            (cellSize - adderBtn) / 2,
                        }}
                        title={L.addColRight}
                        onClick={() => addColRightAt(r)}
                      >
                        <LucideIcons.Plus size={adderBtn * 0.6} />
                      </button>
                    ))}

                  <div
                    className="absolute"
                  style={{
                    left: perimMargin,
                    top: perimMargin,
                    width: gridWidth,
                    height: gridHeight,
                  }}
                >
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                        {grid.map((row, r) =>
                          row.map((cell, c) => {
                            const key = `${r}-${c}`;
                            const cellKey = key;
                            const isSelected = selectedCells.some(
                              (cell) => cell.r === r && cell.c === c
                            );
                            const isHovered =
                              hoveredCell?.r === r && hoveredCell?.c === c;
                            const selectedStackIndex = isSelected
                              ? selectedCells.findIndex(
                                  (cell) => cell.r === r && cell.c === c
                                )
                              : -1;
                            if (!cell.active) {
                              const showAdder =
                                canEditActiveQuadrant && hasActiveNeighbor(r, c);
                              return (
                                <div
                                  key={key}
                                  className="relative"
                                  style={{
                                    width: `${cellSize}px`,
                                    height: `${cellSize}px`,
                                  }}
                                >
                                  {showAdder && (
                                    <button
                                      className="absolute inset-0 m-auto w-7 h-7 rounded-md border-2 border-dashed border-gray-500/70 text-gray-400 bg-transparent hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center leading-none text-xs shadow transition"
                                      onClick={() => setActive({ r, c }, true)}
                                      title={L.addCell}
                                    >
                                      <LucideIcons.Plus size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            const isExplorerVisible =
                              !isExplorerModeActive ||
                              (explorerVisibleSet
                                ? explorerVisibleSet.has(cellKey)
                                : false);
                            if (isExplorerModeActive && !isExplorerVisible) {
                              return (
                                <div
                                  key={key}
                                  className="relative"
                                  style={{
                                    width: `${cellSize}px`,
                                    height: `${cellSize}px`,
                                    background: '#020617',
                                    border: '1px solid #0f172a',
                                  }}
                                />
                              );
                            }
                            const isExplorerExplored =
                              isExplorerModeActive && exploredCellsSet.has(cellKey);
                            const isExplorerFrontier =
                              isExplorerModeActive && explorerFrontierSet.has(cellKey);
                            const showCellContent =
                              !isExplorerModeActive || isExplorerExplored;
                            const showQuestionFace =
                              isExplorerModeActive &&
                              !isExplorerExplored &&
                              isExplorerFrontier;
                            const borderWidthValue =
                              readableMode || isMobile
                                ? Math.max(cell.borderWidth, 2)
                                : cell.borderWidth;
                            const effectiveBorderWidth = showCellContent
                              ? borderWidthValue
                              : Math.max(borderWidthValue, 2);
                            const displayBackground = showCellContent
                              ? cell.fill
                              : '#0f172a';
                            const displayBorderColor = showCellContent
                              ? cell.borderColor
                              : '#1e293b';
                            const displayBorderStyle = showCellContent
                              ? cell.borderStyle
                              : 'solid';
                            const displayAnimation = showCellContent
                              ? cell.effect?.type === 'pulse'
                                ? 'pulse 1.5s infinite'
                                : cell.effect?.type === 'bounce'
                                ? 'bounce 1s infinite'
                                : cell.effect?.type === 'spin'
                                ? 'spin 1s infinite linear'
                                : cell.effect?.type === 'shake'
                                ? 'shake 0.5s infinite'
                                : undefined
                              : undefined;
                            const zIndex = isSelected
                              ? 30
                              : showCellContent && cell.effect?.type !== 'none'
                              ? 20
                              : 10;
                            let computedZIndex = zIndex;
                            if (isHovered) {
                              computedZIndex = Math.max(computedZIndex, 40);
                            }
                            if (isSelected) {
                              const stackBoost =
                                selectedStackIndex >= 0
                                  ? selectedCells.length - selectedStackIndex
                                  : 0;
                              computedZIndex = Math.max(
                                computedZIndex,
                                60 + stackBoost
                              );
                            }
                            const hasVividEffect =
                              showCellContent &&
                              ['glow', 'sparkle', 'pulse'].includes(
                                cell.effect?.type
                              );
                            const selectionAura =
                              isSelected || isHovered ? (
                                <span
                                  className={`pointer-events-none absolute inset-[3px] rounded-lg transition-all duration-150 ${
                                    isSelected
                                      ? `bg-sky-400/15 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.6),0_0_10px_4px_rgba(56,189,248,0.35)] scale-[0.97] animate-[pulse_2s_ease-in-out_infinite]${
                                          hasVividEffect
                                            ? ' ring-2 ring-white/80 ring-offset-[2px] ring-offset-slate-950/60 drop-shadow-[0_0_8px_rgba(15,23,42,0.55)]'
                                            : ''
                                        }`
                                      : ''
                                  } ${
                                    isHovered
                                      ? 'bg-slate-200/10 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.45),0_0_6px_2px_rgba(148,163,184,0.25)]'
                                      : ''
                                  }`}
                                  style={{ zIndex: 15 }}
                                />
                              ) : null;
                            const explorerCursorClass =
                              isExplorerModeActive && !showCellContent && isExplorerFrontier
                                ? 'cursor-pointer'
                                : '';
                            return (
                              <div
                                key={key}
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  if (
                                    isMoveMode ||
                                    skipClickRef.current ||
                                    hadMultiTouchRef.current ||
                                    isPanningRef.current
                                  ) {
                                    return;
                                  }
                                  const keyId = `${r}-${c}`;
                                  if (
                                    lastLongPressRef.current.key === keyId &&
                                    Date.now() - lastLongPressRef.current.t <
                                      700
                                  ) {
                                    e.preventDefault();
                                    return;
                                  }
                                  handleCellClick(r, c, e);
                                }}
                                onPointerDown={(e) => {
                                  if (
                                    (e.pointerType !== 'touch' &&
                                      e.pointerType !== 'pen') ||
                                    isMoveMode ||
                                    pointersRef.current.size > 1 ||
                                    isPanningRef.current
                                  ) {
                                    return;
                                  }
                                  if (isExplorerModeActive && !showCellContent) {
                                    return;
                                  }
                                  const keyId = `${r}-${c}`;
                                  cancelLongPressTimer(keyId);
                                  const timer = setTimeout(() => {
                                    setActive({ r, c }, false);
                                    setSelectedCells((prev) =>
                                      prev.filter(
                                        (cell) => cell.r !== r || cell.c !== c
                                      )
                                    );
                                    lastLongPressRef.current = {
                                      key: keyId,
                                      t: Date.now(),
                                    };
                                    skipClickRef.current = true;
                                    longPressTimersRef.current.delete(keyId);
                                  }, 550);
                                  longPressTimersRef.current.set(keyId, {
                                    id: timer,
                                    pointerId: e.pointerId,
                                  });
                                }}
                                onPointerUp={(e) => {
                                  if (
                                    e.pointerType !== 'touch' &&
                                    e.pointerType !== 'pen'
                                  )
                                    return;
                                  const keyId = `${r}-${c}`;
                                  const st = longPressTimersRef.current.get(keyId);
                                  if (st && st.pointerId === e.pointerId) {
                                    clearTimeout(st.id);
                                    longPressTimersRef.current.delete(keyId);
                                  }
                                }}
                                onPointerMove={(e) => {
                                  if (
                                    e.pointerType !== 'touch' &&
                                    e.pointerType !== 'pen'
                                  )
                                    return;
                                  if (isExplorerModeActive && !showCellContent) {
                                    return;
                                  }
                                  cancelLongPressTimer(`${r}-${c}`);
                                }}
                                onPointerCancel={(e) => {
                                  if (
                                    e.pointerType !== 'touch' &&
                                    e.pointerType !== 'pen'
                                  )
                                    return;
                                  cancelLongPressTimer(`${r}-${c}`);
                                }}
                                onMouseEnter={() => {
                                  if (isExplorerModeActive && !showCellContent) return;
                                  setHoveredCell({ r, c });
                                }}
                                onMouseLeave={() => setHoveredCell(null)}
                                onKeyDown={(e) =>
                                  e.key === 'Enter' && handleCellClick(r, c, e)
                                }
                                className={`group relative overflow-visible select-none transition-transform duration-150 ease-out focus-visible:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/10 ring-0 ${explorerCursorClass}`}
                                style={{
                                  background: 'transparent',
                                  borderColor: 'transparent',
                                  borderWidth: 0,
                                  borderStyle: 'solid',
                                  width: `${cellSize}px`,
                                  height: `${cellSize}px`,
                                  animation: undefined,
                                  zIndex: computedZIndex,
                                  boxShadow: 'none',
                                }}
                              >
                                {selectionAura}
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    pointerEvents: 'none',
                                    zIndex: 10,
                                    perspective: isExplorerModeActive
                                      ? '1200px'
                                      : undefined,
                                  }}
                                >
                                  <div
                                    className={`relative h-full w-full ${
                                      isExplorerModeActive
                                        ? 'transition-transform duration-500'
                                        : ''
                                    }`}
                                    style={
                                      isExplorerModeActive
                                        ? {
                                            transform: `rotateY(${showCellContent ? 0 : 180}deg)`,
                                            transformStyle: 'preserve-3d',
                                          }
                                        : undefined
                                    }
                                  >
                                    <div
                                      className="absolute inset-0"
                                      style={{
                                        backfaceVisibility: isExplorerModeActive
                                          ? 'hidden'
                                          : undefined,
                                        background: displayBackground,
                                        borderColor: displayBorderColor,
                                        borderWidth: `${effectiveBorderWidth}px`,
                                        borderStyle: displayBorderStyle,
                                        animation: displayAnimation,
                                        zIndex: 10,
                                      }}
                                    />
                                    <div
                                      className="absolute inset-0"
                                      style={{ pointerEvents: 'none', zIndex: 20 }}
                                    >
                                      {showCellContent &&
                                        cell.effect?.type !== 'none' && (
                                          <EffectOverlay effect={cell.effect} />
                                        )}
                                      {showCellContent && cell.icon && (
                                        <img
                                          src={cell.icon}
                                          alt="icon"
                                          className="absolute inset-0 m-auto h-2/3 w-2/3 object-contain pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
                                          style={{
                                            transform: cell.iconRotation
                                              ? `rotate(${cell.iconRotation}deg)`
                                              : undefined,
                                          }}
                                        />
                                      )}
                                    </div>
                                    {isExplorerModeActive && (
                                      <div
                                        className="absolute inset-0 flex items-center justify-center"
                                        style={{
                                          transform: 'rotateY(180deg)',
                                          backfaceVisibility: 'hidden',
                                          background: '#0f172a',
                                          borderColor: '#1e293b',
                                          borderWidth: `${Math.max(borderWidthValue, 2)}px`,
                                          borderStyle: 'solid',
                                        }}
                                      >
                                        {showQuestionFace && (
                                          <LucideIcons.HelpCircle className="h-1/2 w-1/2 text-sky-300 drop-shadow-[0_2px_6px_rgba(56,189,248,0.45)]" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {!isMobile && (
                                  <button
                                    type="button"
                                    className={`absolute top-0 right-0 m-0.5 z-30 w-4 h-4 rounded text-rose-600 flex items-center justify-center transition-opacity duration-75 ${
                                      shapeEdit || isSelected
                                        ? 'opacity-100 pointer-events-auto'
                                        : 'opacity-0 pointer-events-none'
                                    }`}
                                    title="Eliminar celda"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActive({ r, c }, false);
                                      setSelectedCells((prev) =>
                                        prev.filter(
                                          (cell) => cell.r !== r || cell.c !== c
                                        )
                                      );
                                    }}
                                  >
                                    <svg
                                      width="10"
                                      height="10"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                      focusable="false"
                                    >
                                      <path
                                        d="M5 5L19 19M19 5L5 19"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 2 }}
                    >
                      {visibleAnnotations.map((a) => {
                        if (
                          isExplorerModeActive &&
                          !exploredCellsSet.has(cellKeyFromIndices(a.r, a.c))
                        ) {
                          return null;
                        }
                        const showTooltip =
                          (hoveredCell &&
                            hoveredCell.r === a.r &&
                              hoveredCell.c === a.c) ||
                            selectedCells.some(
                              (cell) => cell.r === a.r && cell.c === a.c
                            );
                          return (
                            <div
                              key={a.key}
                              className="absolute"
                              style={{
                                left: a.c * cellSize,
                                top: a.r * cellSize,
                                width: cellSize,
                                height: cellSize,
                              }}
                            >
                              <div
                                className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
                                  a.authorRole === 'master'
                                    ? 'bg-emerald-400'
                                    : 'border border-amber-200 bg-amber-400'
                                }`}
                              />
                              {showTooltip && (
                                <div className="absolute z-40 left-1/2 -translate-x-1/2 -translate-y-full mb-2 pointer-events-none">
                                  <div className="relative px-2 py-1 bg-gray-900/90 text-white text-xs rounded-md shadow-lg whitespace-pre-line text-center">
                                    <div className="flex flex-col gap-1">
                                      {a.authorRole === 'master' ? (
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                          {L.masterNoteTag}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                                          {a.authorName || L.playerNoteTag}
                                        </span>
                                      )}
                                      <span>{a.text}</span>
                                    </div>
                                    <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900/90" />
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 3 }}
                    >
                      {visiblePings.map((ping) => {
                        const cellKey = cellKeyFromIndices(ping.r, ping.c);
                        if (
                          isExplorerModeActive &&
                          !exploredCellsSet.has(cellKey)
                        ) {
                          return null;
                        }
                        const dotSize = Math.max(
                          12,
                          Math.min(28, Math.round(cellSize * 0.6))
                        );
                        const coreSize = Math.max(
                          8,
                          Math.round(dotSize * 0.55)
                        );
                        const ringClass =
                          ping.author && ping.author !== 'master'
                            ? 'bg-sky-400'
                            : 'bg-emerald-400';
                        const coreClass =
                          ping.author && ping.author !== 'master'
                            ? 'bg-sky-300'
                            : 'bg-emerald-300';
                        return (
                          <div
                            key={ping.id}
                            className="absolute pointer-events-none"
                            style={{
                              left: ping.c * cellSize + cellSize / 2,
                              top: ping.r * cellSize + cellSize / 2,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <span
                              className="relative flex items-center justify-center"
                              style={{ width: dotSize, height: dotSize }}
                            >
                              <span
                                className={`absolute inline-flex rounded-full opacity-60 ${ringClass} animate-ping`}
                                style={{ width: dotSize, height: dotSize }}
                              />
                              <span
                                className={`relative inline-flex rounded-full shadow ${coreClass}`}
                                style={{ width: coreSize, height: coreSize }}
                              />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>

      {isMobile && (
        <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
          <div
            className={`mx-auto w-full max-w-md overflow-hidden rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl transition-all duration-200 ${
              isQuadrantPanelOpen
                ? 'pointer-events-auto opacity-100 translate-y-0'
                : 'pointer-events-none opacity-0 translate-y-2'
            }`}
          >
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {quadrantSettingsBody}
            </div>
          </div>
        </div>
      )}

      {hasSelectedCells &&
        (() => {
          if (!selectedCell || !selectedCellData) return null;
          const selected = selectedCellData;
          return (
            <div
              className={`fixed bottom-4 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 flex-col items-end gap-2 sm:left-auto sm:right-6 sm:max-w-lg sm:translate-x-0 ${
                isPropertyPanelOpen ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
              <Boton
                size="sm"
                className="pointer-events-auto"
                onClick={() => setIsPropertyPanelOpen((prev) => !prev)}
              >
                {isPropertyPanelOpen ? L.cellPropsClose : L.cellPropsOpen}
              </Boton>
              <div
                className={`w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl transition-all duration-200 ${
                  isPropertyPanelOpen
                    ? 'pointer-events-auto opacity-100 translate-y-0'
                    : 'pointer-events-none opacity-0 translate-y-2'
                }`}
              >
                <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold">
                      Celda ({selectedCell.r + 1} × {selectedCell.c + 1})
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Boton
                        size="sm"
                        color="red"
                        onClick={() => {
                          setActive(selectedCells, false);
                          setSelectedCells([]);
                        }}
                        disabled={!canEditActiveQuadrant}
                      >
                        {L.delCell}
                      </Boton>
                      <button
                        type="button"
                        className="text-xs text-gray-300 hover:text-gray-100 underline"
                        onClick={() => setIsPropertyPanelOpen(false)}
                      >
                        {L.closePanel}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-gray-700 pt-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {propertyTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = panelTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setPanelTab(tab.id)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold uppercase tracking-wide transition ${
                              isActive
                                ? 'border-blue-500 bg-blue-600 text-white shadow'
                                : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                            }`}
                          >
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            <span className="text-[11px]">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-inner">
                      {panelTab === 'style' && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
                              Estilos
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              <Boton size="sm" onClick={() => resetCellStyle(selectedCells)}>
                                {L.reset}
                              </Boton>
                              <Boton size="sm" onClick={saveCellPreset}>
                                Guardar estilo
                              </Boton>
                              {!isPlayerMode && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-300">
                                    {L.originStyle}
                                  </span>
                                  <div className="flex overflow-hidden rounded-md border border-gray-700 bg-gray-800/70">
                                    {ORIGIN_DIRECTIONS.map((direction) => {
                                      const DirectionIcon = direction.icon;
                                      const isActive =
                                        selected?.icon === ORIGIN_ICON_DATA_URL &&
                                        normalizeRotation(selected?.iconRotation ?? 0) ===
                                          direction.rotation;
                                      return (
                                        <button
                                          key={direction.id}
                                          type="button"
                                          disabled={!hasSelectedCells}
                                          onClick={() => {
                                            if (!hasSelectedCells) return;
                                            updateCell(
                                              selectedCells,
                                              buildOriginCellStyle(direction.rotation)
                                            );
                                          }}
                                          title={`${L.originStyle} · ${L[direction.labelKey]}`}
                                          className={`flex h-8 w-8 items-center justify-center text-gray-300 transition ${
                                            isActive
                                              ? 'bg-blue-600 text-white shadow-inner'
                                              : 'hover:bg-gray-700/80'
                                          } ${
                                            hasSelectedCells
                                              ? ''
                                              : 'cursor-not-allowed opacity-40'
                                          }`}
                                        >
                                          {DirectionIcon && (
                                            <DirectionIcon className="h-4 w-4" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {cellStylePresets.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {cellStylePresets.map((p, i) => (
                                <button
                                  key={i}
                                  onClick={() => applyCellPreset(p)}
                                  className="h-9 w-9 overflow-hidden rounded border border-gray-600 transition hover:border-gray-400"
                                  title="Aplicar preset"
                                >
                                  <div
                                    className="relative h-full w-full"
                                    style={{
                                      backgroundColor: p.fill,
                                      borderColor: p.borderColor,
                                      borderWidth: p.borderWidth,
                                      borderStyle: p.borderStyle,
                                      animation:
                                        p.effect?.type === 'pulse'
                                          ? 'pulse 1.5s infinite'
                                          : undefined,
                                    }}
                                  >
                                    {p.effect?.type !== 'none' && <EffectOverlay effect={p.effect} />}
                                    {p.icon && (
                                      <img
                                        src={p.icon}
                                        alt=""
                                        className="h-full w-full object-contain"
                                        style={{
                                          transform: p.iconRotation
                                            ? `rotate(${p.iconRotation}deg)`
                                            : undefined,
                                        }}
                                      />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-start gap-3 text-xs">
                            <ColorPickerButton
                              id="fill"
                              label={L.color}
                              icon={LucideIcons.Droplet}
                              value={selected.fill}
                              onChange={(v) =>
                                updateCell(selectedCells, {
                                  fill: v,
                                })
                              }
                            />
                            <ColorPickerButton
                              id="border"
                              label={L.border}
                              icon={LucideIcons.Square}
                              value={selected.borderColor}
                              onChange={(v) =>
                                updateCell(selectedCells, {
                                  borderColor: v,
                                })
                              }
                            />
                            <div className="flex w-24 flex-col gap-1">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                {L.width}
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={6}
                                value={selected.borderWidth}
                                onChange={(e) =>
                                  updateCell(selectedCells, {
                                    borderWidth: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex w-32 flex-col gap-1">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                {L.style}
                              </span>
                              <select
                                value={selected.borderStyle}
                                onChange={(e) =>
                                  updateCell(selectedCells, {
                                    borderStyle: e.target.value,
                                  })
                                }
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="solid">{L.solid}</option>
                                <option value="dashed">{L.dashed}</option>
                                <option value="dotted">{L.dotted}</option>
                                <option value="none">{L.none}</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                      {panelTab === 'icon' && (
                        <div className="space-y-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
                              {L.icon}
                            </h4>
                            {selected.icon && (
                              <button
                                className="text-xs font-semibold uppercase tracking-wide text-red-300 hover:text-red-200"
                                onClick={() => clearIcon(selectedCells)}
                                type="button"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'estados', label: 'Estados' },
                              { id: 'personalizados', label: 'Personalizados' },
                              { id: 'recursos', label: 'Recursos' },
                              { id: 'emojis', label: 'Emojis' },
                              { id: 'lucide', label: 'Lucide' },
                            ].map((b) => (
                              <button
                                key={b.id}
                                onClick={() => setIconSource(b.id)}
                                type="button"
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                                  iconSource === b.id
                                    ? 'border-blue-500 bg-blue-600 text-white shadow'
                                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                                }`}
                              >
                                {b.label}
                              </button>
                            ))}
                          </div>
                          {iconSource === 'emojis' && emojiGroups && (
                            <div className="max-h-52 space-y-2 overflow-auto rounded-lg bg-gray-900 p-2">
                              <input
                                type="text"
                                value={emojiSearch}
                                onChange={(e) => setEmojiSearch(e.target.value)}
                                placeholder="Buscar"
                                className="mb-2 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              {Object.entries(emojiGroups).map(([group, items]) => {
                                const term = stripDiacritics(emojiSearch).toLowerCase();
                                const filtered = items.filter(({ ch, name, nameEs }) => {
                                  const hay = [ch, name, nameEs].map((s) =>
                                    stripDiacritics(s || '').toLowerCase()
                                  );
                                  return hay.some((h) => h.includes(term));
                                });
                                if (!filtered.length) return null;
                                return (
                                  <div key={group}>
                                    <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
                                      {group}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {filtered.map((item, i) => (
                                        <IconThumb
                                          key={`${group}-${i}`}
                                          src={emojiDataUrl(item.ch)}
                                          label={item.ch}
                                          selected={selected.icon === emojiDataUrl(item.ch)}
                                          onClick={() =>
                                            updateCell(selectedCells, {
                                              icon: emojiDataUrl(item.ch),
                                              iconRotation: 0,
                                            })
                                          }
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {iconSource === 'lucide' && lucideNames && (
                            <div className="max-h-52 space-y-2 overflow-auto rounded-lg bg-gray-900 p-2">
                              <input
                                type="text"
                                value={lucideSearch}
                                onChange={(e) => setLucideSearch(e.target.value)}
                                placeholder="Buscar"
                                className="mb-2 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              {Object.entries(
                                lucideNames
                                  .filter((n) => n.includes(lucideSearch.toLowerCase()))
                                  .reduce((acc, name) => {
                                    const k = name[0].toUpperCase();
                                    (acc[k] ||= []).push(name);
                                    return acc;
                                  }, {})
                              ).map(([letter, names]) => (
                                <div key={letter}>
                                  <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
                                    {letter}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {names.map((n) => {
                                      const url = lucideDataUrl(n);
                                      return (
                                        <IconThumb
                                          key={n}
                                          src={url}
                                          label={n}
                                          selected={selected.icon === url}
                                          onClick={() =>
                                            updateCell(selectedCells, {
                                              icon: url,
                                              iconRotation: 0,
                                            })
                                          }
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {['estados', 'personalizados', 'recursos'].includes(iconSource) && (
                            <div className="max-h-40 flex flex-wrap gap-2 overflow-auto rounded-lg bg-gray-900 p-2">
                              {(allIcons[iconSource] || []).map((ico, i) => (
                                <IconThumb
                                  key={`${iconSource}-${i}`}
                                  src={ico.url}
                                  label={ico.name}
                                  selected={selected.icon === ico.url}
                                  onClick={() =>
                                    updateCell(selectedCells, {
                                      icon: ico.url,
                                      iconRotation: 0,
                                    })
                                  }
                                  onDelete={
                                    iconSource === 'personalizados'
                                      ? () => handleRemoveCustomIcon(i)
                                      : undefined
                                  }
                                />
                              ))}
                            </div>
                          )}
                          {iconsLoading && (
                            <div className="text-[11px] text-gray-400">Cargando…</div>
                          )}
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-300">
                            {L.iconAdd}
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              e.target.files &&
                              e.target.files[0] &&
                              handleFileUpload(e.target.files[0])
                            }
                            className="block w-full cursor-pointer rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-gray-700 file:px-3 file:py-1 file:text-xs file:font-semibold file:uppercase file:text-white hover:file:bg-gray-600"
                          />
                        </div>
                      )}
                      {panelTab === 'effect' && (
                        <div className="space-y-3 text-xs">
                          <div className="flex w-full flex-col gap-1 sm:w-40">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              {L.effect}
                            </span>
                            <select
                              value={selected.effect?.type || 'none'}
                              onChange={(e) =>
                                updateCell(selectedCells, {
                                  effect: {
                                    ...selected.effect,
                                    type: e.target.value,
                                  },
                                })
                              }
                              className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="none">{L.none}</option>
                              <option value="glow">{L.glow}</option>
                              <option value="pulse">{L.pulse}</option>
                              <option value="bounce">{L.bounce}</option>
                              <option value="spin">{L.spin}</option>
                              <option value="shake">{L.shake}</option>
                              <option value="sparkle">{L.sparkle}</option>
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <ColorPickerButton
                              id="effect"
                              label={L.effectColor}
                              icon={LucideIcons.Sparkles}
                              value={selected.effect?.color || '#ffff00'}
                              disabled={(selected.effect?.type || 'none') === 'none'}
                              onChange={(v) =>
                                updateCell(selectedCells, {
                                  effect: {
                                    ...selected.effect,
                                    color: v,
                                  },
                                })
                              }
                            />
                            {(selected.effect?.type || 'none') === 'none' && (
                              <p className="text-[11px] text-gray-500">
                                Selecciona un efecto para habilitar el color.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {panelTab === 'notes' && (
                        <div className="space-y-3 text-xs">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
                              {L.annotations}
                            </h4>
                            {(() => {
                              const annotationsAtCell = activeAnnotations.filter(
                                (a) => a.r === selectedCell.r && a.c === selectedCell.c
                              );
                              const playerKeyCandidates = [];
                              if (playerAnnotationKey) playerKeyCandidates.push(playerAnnotationKey);
                              if (normalizedPlayerName)
                                playerKeyCandidates.push(normalizedPlayerName);
                              const isViewerPlayerNote = (annotation) => {
                                if (annotation.authorRole === 'master') return false;
                                if (annotation.authorKey) {
                                  return playerKeyCandidates.some(
                                    (candidate) => candidate && candidate === annotation.authorKey
                                  );
                                }
                                return playerKeyCandidates.length === 0;
                              };
                              const editableAnn = isPlayerMode
                                ? annotationsAtCell.find((a) => isViewerPlayerNote(a))
                                : annotationsAtCell.find((a) => a.authorRole === 'master');
                              const otherNotes = annotationsAtCell.filter((a) => {
                                if (a.authorRole === 'master') return false;
                                if (!isPlayerMode) return true;
                                return !isViewerPlayerNote(a);
                              });
                              return (
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                      {isPlayerMode ? L.yourNote : L.masterNoteTag}
                                    </p>
                                    <input
                                      type="text"
                                      value={editableAnn?.text || ''}
                                      onChange={(e) =>
                                        setAnnotation(
                                          selectedCell.r,
                                          selectedCell.c,
                                          {
                                            text: e.target.value,
                                            icon: editableAnn?.icon || '',
                                          },
                                          { existing: editableAnn }
                                        )
                                      }
                                      placeholder="Texto"
                                      disabled={!canAnnotateActiveQuadrant}
                                      className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                                    />
                                    <input
                                      type="text"
                                      value={editableAnn?.icon || ''}
                                      onChange={(e) =>
                                        setAnnotation(
                                          selectedCell.r,
                                          selectedCell.c,
                                          {
                                            text: editableAnn?.text || '',
                                            icon: e.target.value,
                                          },
                                          { existing: editableAnn }
                                        )
                                      }
                                      placeholder="URL icono"
                                      disabled={!canAnnotateActiveQuadrant}
                                      className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                                    />
                                  </div>
                                  {otherNotes.length > 0 && (
                                    <div className="space-y-1 rounded-md border border-gray-800 bg-gray-900/70 p-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                        {L.playerNotesList}
                                      </p>
                                      <div className="space-y-1">
                                        {otherNotes.map((note) => (
                                          <div
                                            key={note.key}
                                            className="rounded bg-gray-800/80 px-2 py-1 text-[11px] text-gray-200"
                                          >
                                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                                              {note.authorName || L.playerNoteTag}
                                            </span>
                                            <span>{note.text}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })()}

      {!isPlayerMode && (
        <Modal
          isOpen={isMasterNotesOpen}
          onClose={() => setIsMasterNotesOpen(false)}
          title={L.masterNotesTitle}
          size="lg"
        >
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {L.masterNotesSummary}
                </p>
                <p className="text-[11px] text-gray-400">
                  {L.masterNotesCounter.replace(
                    '{count}',
                    String(masterAnnotationsCount)
                  )}
                </p>
              </div>
              <input
                type="text"
                value={masterNotesSearch}
                onChange={(e) => setMasterNotesSearch(e.target.value)}
                placeholder={L.masterNotesSearchPlaceholder}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {filteredMasterAnnotations.length === 0 ? (
              <p className="text-sm text-gray-400">{L.masterNotesEmpty}</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {filteredMasterAnnotations.map((entry) => (
                  <div
                    key={entry.key}
                    className="rounded-lg border border-gray-700 bg-gray-800/70"
                  >
                    <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2 text-xs text-gray-300">
                      <span className="font-semibold uppercase tracking-wide">
                        {L.masterNotesCell} {entry.r + 1} × {entry.c + 1}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {entry.notes.length}{' '}
                        {entry.notes.length === 1
                          ? L.masterNotesNoteSingular
                          : L.masterNotesNotePlural}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-700">
                      {entry.notes.map((note) => (
                        <div
                          key={note.key}
                          className="space-y-2 px-3 py-2 text-sm text-gray-200"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                            <span
                              className={`font-semibold uppercase tracking-wide ${
                                note.authorRole === 'master'
                                  ? 'text-emerald-300'
                                  : 'text-amber-200'
                              }`}
                            >
                              {note.authorRole === 'master'
                                ? L.masterNoteTag
                                : note.authorName || L.playerNoteTag}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <Boton
                                size="xs"
                                onClick={() => {
                                  setSelectedCells([{ r: note.r, c: note.c }]);
                                  setPanelTab('notes');
                                  setIsPropertyPanelOpen(true);
                                  setIsMasterNotesOpen(false);
                                }}
                              >
                                {L.masterNotesViewCell}
                              </Boton>
                              <Boton
                                size="xs"
                                color="red"
                                onClick={() =>
                                  setAnnotation(
                                    note.r,
                                    note.c,
                                    { text: '', icon: '' },
                                    { existing: note, override: true }
                                  )
                                }
                              >
                                {L.masterNotesRemove}
                              </Boton>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            {note.icon && (
                              <img
                                src={note.icon}
                                alt=""
                                className="h-8 w-8 flex-shrink-0 rounded border border-gray-700 bg-gray-900 object-contain"
                              />
                            )}
                            <div className="space-y-1">
                              {note.text ? (
                                <p className="text-sm text-gray-100">{note.text}</p>
                              ) : (
                                <p className="text-xs italic text-gray-400">
                                  {L.masterNotesNoText}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
}

MinimapBuilder.propTypes = {
  onBack: PropTypes.func.isRequired,
  backLabel: PropTypes.string,
  showNewBadge: PropTypes.bool,
  mode: PropTypes.oneOf(['master', 'player']),
  playerName: PropTypes.string,
};
export default MinimapBuilder;
