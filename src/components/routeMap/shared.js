import { nanoid } from 'nanoid';

export const ROUTE_MAP_CUSTOM_ICONS_KEY = 'routeMapCustomIcons';
export const MINIMAP_CUSTOM_ICONS_KEY = 'minimapCustomIcons';
export const ROUTE_MAP_DRAFT_KEY = 'routeMapDraft';

export const NODE_TYPES = [
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

export const NODE_STATES = {
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

export const TOOLBAR_ACTIONS = [
  { id: 'select', label: 'Seleccionar / Mover' },
  { id: 'create', label: 'Crear Nodo' },
  { id: 'connect', label: 'Conectar' },
  { id: 'delete', label: 'Borrar' },
  { id: 'toggleLock', label: 'Bloquear / Desbloquear' },
];

export const GRID_SIZES = [20, 32, 40, 48, 64];

export const sanitizeCustomIcons = (icons) => {
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

export const readLocalCustomIcons = () => {
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

export const readMinimapLocalCustomIcons = () => {
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

export const normalizeHex = (hex) => {
  if (typeof hex !== 'string') return null;
  const trimmed = hex.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(prefixed) ? prefixed.toLowerCase() : null;
};

export const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
};

export const rgbToHex = (r, g, b) => {
  const clamp = (num) => Math.min(255, Math.max(0, Math.round(num)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
};

export const mixHex = (hexA, hexB, amount) => {
  const colorA = hexToRgb(hexA);
  const colorB = hexToRgb(hexB);
  if (!colorA || !colorB) return normalizeHex(hexA) || normalizeHex(hexB);
  const t = Math.min(1, Math.max(0, amount));
  const mix = (a, b) => a + (b - a) * t;
  return rgbToHex(mix(colorA.r, colorB.r), mix(colorA.g, colorB.g), mix(colorA.b, colorB.b));
};

export const NODE_SHAPE_OPTIONS = [
  { id: 'panel', label: 'Panel suave' },
  { id: 'circle', label: 'Círculo' },
  { id: 'triangle', label: 'Triángulo' },
  { id: 'diamond', label: 'Diamante' },
  { id: 'hexagon', label: 'Hexágono' },
];

export const normalizeNodeShape = (value) => {
  if (typeof value !== 'string') {
    return 'panel';
  }
  const normalized = value.trim().toLowerCase();
  return NODE_SHAPE_OPTIONS.some((option) => option.id === normalized) ? normalized : 'panel';
};

const DEFAULT_APPEARANCE = {
  accent: '#38bdf8',
  fill: '#0f172a',
  border: '#38bdf8',
  icon: '#f8fafc',
};

export const DEFAULT_GLOW_INTENSITY = 0.75;

const clamp01 = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

export const normalizeGlowIntensity = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp01(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return clamp01(parsed);
    }
  }
  return DEFAULT_GLOW_INTENSITY;
};

export const getTypeDefaults = (typeId) => {
  const type = NODE_TYPES.find((item) => item.id === typeId);
  if (!type || !type.defaults) return DEFAULT_APPEARANCE;
  return {
    accent: normalizeHex(type.defaults.accent) || DEFAULT_APPEARANCE.accent,
    fill: normalizeHex(type.defaults.fill) || DEFAULT_APPEARANCE.fill,
    border: normalizeHex(type.defaults.border) || DEFAULT_APPEARANCE.border,
    icon: normalizeHex(type.defaults.icon) || DEFAULT_APPEARANCE.icon,
  };
};

export const applyAppearanceDefaults = (node) => {
  if (!node) return node;
  const palette = getTypeDefaults(node.type);
  return {
    ...node,
    accentColor: normalizeHex(node.accentColor) || palette.accent,
    fillColor: normalizeHex(node.fillColor) || palette.fill,
    borderColor: normalizeHex(node.borderColor) || palette.border,
    iconColor: normalizeHex(node.iconColor) || palette.icon,
    glowIntensity: normalizeGlowIntensity(node.glowIntensity),
    shape: normalizeNodeShape(node.shape),
    iconUrl:
      typeof node.iconUrl === 'string' && node.iconUrl.trim()
        ? node.iconUrl.trim()
        : null,
  };
};

export const normalizeNodesCollection = (nodes) => nodes.map((node) => applyAppearanceDefaults(node));

export const cloneState = (nodes, edges) => ({
  nodes: nodes.map((node) => ({ ...node })),
  edges: edges.map((edge) => ({ ...edge })),
});

export const DEFAULT_NODE = () =>
  applyAppearanceDefaults({
    id: nanoid(),
    name: 'Inicio',
    type: 'start',
    x: 0,
    y: 0,
    state: 'locked',
    unlockMode: 'or',
    loot: '',
    event: '',
    notes: '',
    shape: 'panel',
    iconUrl: null,
    glowIntensity: DEFAULT_GLOW_INTENSITY,
  });

export const initialState = () => {
  const starter = DEFAULT_NODE();
  const snapshot = cloneState([starter], []);
  return {
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    history: [snapshot],
    historyIndex: 0,
  };
};

export function routeMapReducer(state, action) {
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
      const nextIndex = state.historyIndex - 1;
      const snapshot = state.history[nextIndex];
      return {
        ...state,
        nodes: snapshot.nodes.map((node) => ({ ...node })),
        edges: snapshot.edges.map((edge) => ({ ...edge })),
        historyIndex: nextIndex,
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) {
        return state;
      }
      const nextIndex = state.historyIndex + 1;
      const snapshot = state.history[nextIndex];
      return {
        ...state,
        nodes: snapshot.nodes.map((node) => ({ ...node })),
        edges: snapshot.edges.map((edge) => ({ ...edge })),
        historyIndex: nextIndex,
      };
    }
    default:
      return state;
  }
}

export const loadDraft = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const payload = window.localStorage.getItem(ROUTE_MAP_DRAFT_KEY);
    if (!payload) return null;
    const parsed = JSON.parse(payload);
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return {
        nodes: normalizeNodesCollection(parsed.nodes),
        edges: parsed.edges,
      };
    }
  } catch (error) {
    console.error('[routeMap] No se pudo cargar el mapa en localStorage', error);
  }
  return null;
};

export const saveDraft = (nodes, edges) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const payload = JSON.stringify({ nodes, edges });
    window.localStorage.setItem(ROUTE_MAP_DRAFT_KEY, payload);
  } catch (error) {
    console.error('[routeMap] No se pudo guardar el mapa en localStorage', error);
  }
};

export const exportRouteMap = (nodes, edges) => {
  const data = JSON.stringify({ nodes, edges }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `route-map-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const parseRouteMapFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Archivo inválido'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          resolve({
            nodes: normalizeNodesCollection(parsed.nodes),
            edges: parsed.edges,
          });
        } else {
          reject(new Error('Estructura inválida'));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
