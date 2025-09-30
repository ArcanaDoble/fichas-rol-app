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
import { ESTADOS } from './EstadoSelector';
import HexColorInput from './HexColorInput';
import { getOrUploadFile } from '../utils/storage';
import useConfirm from '../hooks/useConfirm';
import * as LucideIcons from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
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
};

const stripDiacritics = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

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

const QuadrantPreview = ({ q, size = 36 }) => {
  const ensurePositive = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };
  const rows = ensurePositive(q?.rows);
  const cols = ensurePositive(q?.cols);
  const maxDimension = Math.max(rows, cols);
  const cell = size / (maxDimension || 1);
  const width = cell * cols;
  const height = cell * rows;
  const emptyCell = {
    active: false,
    fill: 'transparent',
    borderColor: 'rgba(255,255,255,0.1)',
  };
  return (
    <div
      className="grid flex-shrink-0 overflow-hidden rounded border border-gray-600/70 bg-gray-900/40"
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
    effect,
    active,
  };
};

const getGridCell = (grid, r, c) =>
  Array.isArray(grid) && Array.isArray(grid[r]) ? grid[r][c] : null;

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

const sanitizeQuadrantValues = (data = {}, options = {}) => {
  const { titleFallback = 'Cuadrante', orderFallback = 0 } = options;
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
    .map((preset) => ({ ...preset }));
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

function MinimapBuilder({ onBack, backLabel, showNewBadge, mode = 'master' }) {
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
  const [shapeEdit, setShapeEdit] = useState(false);
  const [readableMode, setReadableMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [isMultiTouchActive, setIsMultiTouchActive] = useState(false);
  const [iconSource, setIconSource] = useState('estados'); // estados | personalizados | recursos | emojis | lucide
  const [emojiSearch, setEmojiSearch] = useState('');
  const [lucideSearch, setLucideSearch] = useState('');
  const [customIcons, setCustomIcons] = useState([]);
  const [resourceItems, setResourceItems] = useState([]);
  const [cellStylePresets, setCellStylePresets] = useState([]);
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
  const localQuadrantsRef = useRef(null);
  if (localQuadrantsRef.current === null) {
    localQuadrantsRef.current = quadrants;
  }
  const updateLocalQuadrants = (items) => {
    const sorted = sortQuadrantsList(items);
    localQuadrantsRef.current = sorted;
    persistQuadrantsToLocalStorage(sorted);
  };
  const getLocalQuadrantsSnapshot = () =>
    Array.isArray(localQuadrantsRef.current) ? localQuadrantsRef.current : [];
  const quadrantsMigrationRef = useRef(false);
  const [currentQuadrantIndex, setCurrentQuadrantIndex] = useState(null);
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
  const activeAnnotations = useMemo(
    () =>
      annotations.filter(
        (ann) => (ann?.quadrantId || 'default') === activeQuadrantId
      ),
    [annotations, activeQuadrantId]
  );
  const hasUnsavedChanges = useMemo(() => {
    if (currentQuadrantIndex === null || !loadedQuadrantData) return false;
    const current = { rows, cols, cellSize, grid };
    return JSON.stringify(current) !== JSON.stringify(loadedQuadrantData);
  }, [currentQuadrantIndex, loadedQuadrantData, rows, cols, cellSize, grid]);
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
    const { skipLocalUpdate = false } = options;
    const key = `${activeQuadrantId}-${r}-${c}`;
    const payload = { quadrantId: activeQuadrantId, r, c, ...data };
    const legacyKey = `${r}-${c}`;
    if (!skipLocalUpdate) {
      setAnnotations((prev) => {
        const next = prev.filter((a) => a.key !== key);
        if (data.text || data.icon) {
          next.push({ key, quadrantId: activeQuadrantId, r, c, ...data });
        }
        return next;
      });
    }
    const ref = doc(db, 'minimapAnnotations', key);
    const legacyRef = legacyKey !== key ? doc(db, 'minimapAnnotations', legacyKey) : null;
    if (data.text || data.icon) {
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
    setGrid((prev) => buildGrid(rows, cols, prev));
  }, [rows, cols]);
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
          const fallback = getLocalQuadrantsSnapshot();
          setQuadrants(fallback);
          return;
        }
        quadrantsMigrationRef.current = true;
        const normalized = sortQuadrantsList(
          docsData.map(({ id, data }, index) => {
            const sanitized = sanitizeQuadrantValues(data, {
              titleFallback: `Cuadrante ${index + 1}`,
              orderFallback: index,
            });
            return {
              id,
              ...sanitized,
              updatedAt: data?.updatedAt || null,
            };
          })
        );
        setQuadrants(normalized);
        updateLocalQuadrants(normalized);
      },
      (error) => {
        if (!isUnmounted) {
          console.error('Error fetching minimap quadrants', error);
          const fallback = getLocalQuadrantsSnapshot();
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

  const handleCellClick = (r, c) => {
    if (
      isMoveMode ||
      skipClickRef.current ||
      hadMultiTouchRef.current ||
      isPanningRef.current
    ) {
      return;
    }
    setSelectedCells((prev) => {
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
  };
  const updateCell = (cells, updater) =>
    setGrid((prev) => {
      const next = prev.map((row) => row.slice());
      (Array.isArray(cells) ? cells : [cells]).forEach(({ r, c }) => {
        next[r] = next[r].slice();
        next[r][c] = { ...next[r][c], ...updater };
      });
      return next;
    });
  const trimGrid = (g) => {
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
            if (Number.isInteger(oldR) && Number.isInteger(oldC)) {
              removedLegacyKeys.add(`${oldR}-${oldC}`);
            }
            return;
          }
          const newKey = `${activeQuadrantId}-${newR}-${newC}`;
          const updatedAnn = {
            ...ann,
            r: newR,
            c: newC,
            key: newKey,
            quadrantId: activeQuadrantId,
          };
          nextAnnotations.push(updatedAnn);
          if (newKey !== ann.key) {
            movedAnnotations.push({
              annotation: updatedAnn,
              previousKey: ann.key,
              previousLegacyKey:
                Number.isInteger(oldR) && Number.isInteger(oldC)
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
            { skipLocalUpdate: true }
          );
        }
        if (previousKey && previousKey !== annotation.key) {
          deleteDoc(doc(db, 'minimapAnnotations', previousKey)).catch(() => {});
        }
        const newLegacyKey = `${annotation.r}-${annotation.c}`;
        if (previousLegacyKey && previousLegacyKey !== newLegacyKey) {
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
      let next = prev.map((row) => row.slice());
      (Array.isArray(cells) ? cells : [cells]).forEach(({ r, c }) => {
        next[r] = next[r].slice();
        next[r][c] = { ...next[r][c], active };
      });
      return trimGrid(next);
    });
  const clearIcon = (cells) => updateCell(cells, { icon: null });
  const resetCellStyle = (cells) =>
    setGrid((prev) => {
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
    const sanitized = sanitizeQuadrantValues(
      {
        title: quadrantTitle,
        rows,
        cols,
        cellSize,
        grid,
        order: nextOrder,
      },
      { titleFallback: fallbackTitle, orderFallback: nextOrder }
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
    const newQuadrantIndex = nextQuadrantsState.findIndex(
      (item) => item.id === newQuadrantId
    );
    setQuadrants(nextQuadrantsState);
    updateLocalQuadrants(nextQuadrantsState);
    setCurrentQuadrantIndex(newQuadrantIndex);
    setLoadedQuadrantData({
      rows: sanitized.rows,
      cols: sanitized.cols,
      cellSize: sanitized.cellSize,
      grid: sanitized.grid,
    });
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
    setRows(q.rows);
    setCols(q.cols);
    setCellSize(q.cellSize);
    setGrid(() => buildGrid(q.rows, q.cols, q.grid));
    setSelectedCells([]);
    setCurrentQuadrantIndex(idx);
    setLoadedQuadrantData({ rows: q.rows, cols: q.cols, cellSize: q.cellSize, grid: q.grid });
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
  };
  const saveQuadrantChanges = async () => {
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
      },
      { titleFallback: fallbackTitle, orderFallback: orderValue }
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
    setQuadrants(nextQuadrantsState);
    updateLocalQuadrants(nextQuadrantsState);
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
    setLoadedQuadrantData({
      rows: sanitized.rows,
      cols: sanitized.cols,
      cellSize: sanitized.cellSize,
      grid: sanitized.grid,
    });
  };
  const duplicateQuadrant = async (i) => {
    const source = quadrants[i];
    if (!source?.id) return;
    const sourceId = source.id;
    const copyId = generateQuadrantId();
    const title = `${source?.title || `Cuadrante ${i + 1}`} copia`;
    const nextOrder = getNextQuadrantOrder();
    const sanitized = sanitizeQuadrantValues(
      {
        title,
        rows: source?.rows,
        cols: source?.cols,
        cellSize: source?.cellSize,
      grid: source?.grid,
      order: nextOrder,
    },
    { titleFallback: title, orderFallback: nextOrder }
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
    setQuadrants(nextQuadrantsState);
    updateLocalQuadrants(nextQuadrantsState);
    if (sourceId === activeQuadrantId) {
      setAnnotations((prev) => {
        const clones = prev
          .filter((ann) => (ann?.quadrantId || 'default') === sourceId)
          .map((ann) => {
            if (typeof ann?.r !== 'number' || typeof ann?.c !== 'number') {
              return null;
            }
            const newKey = `${copyId}-${ann.r}-${ann.c}`;
            return {
              ...ann,
              key: newKey,
              quadrantId: copyId,
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
            const newKey = `${copyId}-${data.r}-${data.c}`;
            writes.push(
              setDoc(doc(db, 'minimapAnnotations', newKey), {
                ...data,
                quadrantId: copyId,
                key: newKey,
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
    setGrid((prev) =>
      prev.map((row, r) => [{ ...defaultCell(), active: r === rIndex }, ...row])
    );
    skipRebuildRef.current = true;
    setCols((c) => c + 1);
  };
  const addColRightAt = (rIndex) => {
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
      {isMobile && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {L.mobileQuickControls}
          </div>
          <div className={mobileToggleGroupClass}>
            <label className={mobileToggleRowClass}>
              <span className="text-sm font-medium text-gray-200">{L.shapeEdit}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-500"
                checked={shapeEdit}
                onChange={(e) => setShapeEdit(e.target.checked)}
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
          />
          <Boton size="sm" onClick={saveQuadrant}>
            {L.saveQuadrant}
          </Boton>
        </div>
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
            <Boton size="sm" onClick={saveQuadrantChanges}>
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
                return (
                  <div
                    key={keyId}
                    className={`relative ${isMobile ? 'w-24' : ''}`}
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
                      className={`flex flex-col items-center rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 ${
                        isSelectedQuadrant ? 'ring-2 ring-emerald-400' : ''
                      } ${
                        isMobile
                          ? 'w-24 p-1 text-[10px] min-h-[72px]'
                          : 'p-1 text-xs'
                      }`}
                    >
                      <QuadrantPreview q={q} size={36} />
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
                    {!isMobile && (
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
            <label className="flex items-center gap-2 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1">
              <input
                type="checkbox"
                checked={shapeEdit}
                onChange={(e) => setShapeEdit(e.target.checked)}
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
                  {Array.from({ length: cols }).map((_, c) => (
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
                  {Array.from({ length: cols }).map((_, c) => (
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
                  {Array.from({ length: rows }).map((_, r) => (
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
                  {Array.from({ length: rows }).map((_, r) => (
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
                            const isSelected = selectedCells.some(
                              (cell) => cell.r === r && cell.c === c
                            );
                            if (!cell.active) {
                              const showAdder = hasActiveNeighbor(r, c);
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
                                  handleCellClick(r, c);
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
                                onMouseEnter={() => setHoveredCell({ r, c })}
                                onMouseLeave={() => setHoveredCell(null)}
                                onKeyDown={(e) =>
                                  e.key === 'Enter' && handleCellClick(r, c)
                                }
                                className={`group relative z-0 overflow-visible select-none transition-transform duration-150 ease-out ${isSelected ? 'z-10 scale-[1.06] ring-2 ring-blue-400 outline outline-2 outline-white/10' : 'hover:z-10 hover:scale-[1.06] hover:outline hover:outline-2 hover:outline-white/10'}`}
                                style={{
                                  background: cell.fill,
                                  borderColor: cell.borderColor,
                                  borderWidth: `${readableMode || isMobile ? Math.max(cell.borderWidth, 2) : cell.borderWidth}px`,
                                  borderStyle: cell.borderStyle,
                                  width: `${cellSize}px`,
                                  height: `${cellSize}px`,
                                  animation:
                                    cell.effect?.type === 'pulse'
                                      ? 'pulse 1.5s infinite'
                                      : cell.effect?.type === 'bounce'
                                      ? 'bounce 1s infinite'
                                      : cell.effect?.type === 'spin'
                                      ? 'spin 1s infinite linear'
                                      : cell.effect?.type === 'shake'
                                      ? 'shake 0.5s infinite'
                                      : undefined,
                                  zIndex: isSelected
                                    ? 30
                                    : cell.effect?.type !== 'none'
                                    ? 20
                                    : 10,
                                }}
                              >
                                {cell.effect?.type !== 'none' && (
                                  <EffectOverlay effect={cell.effect} />
                                )}
                                {cell.icon && (
                                  <img
                                    src={cell.icon}
                                    alt="icon"
                                    className="absolute inset-0 m-auto w-2/3 h-2/3 object-contain pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
                                  />
                                )}
                                {!isMobile && (
                                  <button
                                    type="button"
                                    className={`absolute top-0 right-0 m-0.5 z-30 w-4 h-4 rounded text-rose-600 flex items-center justify-center transition-opacity duration-75 ${shapeEdit || isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
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
                      {activeAnnotations.map((a) => {
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
                              <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full" />
                              {showTooltip && (
                                <div className="absolute z-40 left-1/2 -translate-x-1/2 -translate-y-full mb-2 pointer-events-none">
                                  <div className="relative px-2 py-1 bg-gray-900/90 text-white text-xs rounded-md shadow-lg whitespace-pre-line text-center">
                                    {a.text}
                                    <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900/90" />
                                  </div>
                                </div>
                              )}
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
                      Celda ({selectedCell.r + 1}
                      {'\\u00D7'}
                      {selectedCell.c + 1})
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Boton
                        size="sm"
                        color="red"
                        onClick={() => {
                          setActive(selectedCells, false);
                          setSelectedCells([]);
                        }}
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
                      {[
                        { id: 'style', label: 'Estilos', icon: LucideIcons.Palette },
                        { id: 'icon', label: L.icon, icon: LucideIcons.Images },
                        { id: 'effect', label: L.effect, icon: LucideIcons.Wand2 },
                        { id: 'notes', label: L.annotations, icon: LucideIcons.NotebookText },
                      ].map((tab) => {
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
                                      <img src={p.icon} alt="" className="h-full w-full object-contain" />
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
                                            updateCell(selectedCells, { icon: url })
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
                                    updateCell(selectedCells, { icon: ico.url })
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
                        <div className="space-y-2 text-xs">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
                            {L.annotations}
                          </h4>
                          {(() => {
                            const ann = activeAnnotations.find(
                              (a) =>
                                a.r === selectedCell.r && a.c === selectedCell.c
                            );
                            return (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={ann?.text || ''}
                                  onChange={(e) =>
                                    setAnnotation(selectedCell.r, selectedCell.c, {
                                      text: e.target.value,
                                      icon: ann?.icon || '',
                                    })
                                  }
                                  placeholder="Texto"
                                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <input
                                  type="text"
                                  value={ann?.icon || ''}
                                  onChange={(e) =>
                                    setAnnotation(selectedCell.r, selectedCell.c, {
                                      text: ann?.text || '',
                                      icon: e.target.value,
                                    })
                                  }
                                  placeholder="URL icono"
                                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })()}

    </div>
  );
}

MinimapBuilder.propTypes = {
  onBack: PropTypes.func.isRequired,
  backLabel: PropTypes.string,
  showNewBadge: PropTypes.bool,
  mode: PropTypes.oneOf(['master', 'player']),
};
export default MinimapBuilder;
