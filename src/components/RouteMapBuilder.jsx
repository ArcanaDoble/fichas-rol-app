import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Application,
  Container,
  Graphics,
  MIPMAP_MODES,
  Point,
  SCALE_MODES,
  Sprite,
  Text,
  Texture,
  TilingSprite,
  WRAP_MODES,
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
  Crown,
  HeartPulse,
  Home,
  ScrollText,
  Shield,
  Store,
  Swords,
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import Boton from './Boton';
import Input from './Input';

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

const drawDottedQuadratic = (graphics, from, control, to, { color, size = 4, spacing = 18 }) => {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(12, Math.floor(distance / spacing) * 4);
  graphics.beginFill(color, 0.9);
  for (let i = 0; i <= steps; i += 1) {
    if (i % 2 !== 0) continue;
    const t = i / steps;
    const inv = 1 - t;
    const x = inv * inv * from.x + 2 * inv * t * control.x + t * t * to.x;
    const y = inv * inv * from.y + 2 * inv * t * control.y + t * t * to.y;
    graphics.drawCircle(x, y, size);
  }
  graphics.endFill();
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
  };
};

const normalizeNodesCollection = (nodes) => nodes.map((node) => applyAppearanceDefaults(node));

const ensureSvgNamespace = (svgString) =>
  svgString.includes('xmlns') ? svgString : svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

const encodeSvgDataUri = (svgString) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')}`;

const lucideTextureCache = new Map();

const LUCIDE_TEXTURE_SIZE = 96;
const LUCIDE_TEXTURE_RESOLUTION = 2;

const getLucideTexture = (IconComponent, color) => {
  const normalizedColor = normalizeHex(color) || '#f8fafc';
  const key = `${IconComponent.displayName || IconComponent.name || 'icon'}-${normalizedColor}`;
  const cached = lucideTextureCache.get(key);

  if (cached instanceof Texture) {
    if (!cached.destroyed && cached.valid) {
      return cached;
    }
    lucideTextureCache.delete(key);
  } else if (cached && typeof cached.then === 'function') {
    return cached;
  }

  const svgMarkup = renderToStaticMarkup(
    <IconComponent
      color={normalizedColor}
      size={LUCIDE_TEXTURE_SIZE}
      strokeWidth={2.4}
      absoluteStrokeWidth
    />
  );
  const svgWithNs = ensureSvgNamespace(svgMarkup);
  const encoded = encodeSvgDataUri(svgWithNs);

  if (typeof Image === 'undefined') {
    return Texture.WHITE;
  }

  const image = new Image();
  image.decoding = 'async';
  image.width = LUCIDE_TEXTURE_SIZE;
  image.height = LUCIDE_TEXTURE_SIZE;

  const texturePromise = new Promise((resolve, reject) => {
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      try {
        const texture = Texture.from({
          resource: image,
          label: key,
          resolution: LUCIDE_TEXTURE_RESOLUTION,
          scaleMode: 'linear',
          mipmap: 'on',
        });
        if (texture?.baseTexture) {
          texture.baseTexture.scaleMode = 'linear';
          texture.baseTexture.mipmap = 'on';
          texture.baseTexture.anisotropicLevel = 8;
        }
        if (texture?.source && typeof texture.source.resize === 'function') {
          texture.source.resize(LUCIDE_TEXTURE_SIZE, LUCIDE_TEXTURE_SIZE);
        }
        lucideTextureCache.set(key, texture);
        cleanup();
        resolve(texture);
      } catch (error) {
        lucideTextureCache.delete(key);
        cleanup();
        reject(error);
      }
    };

    image.onerror = () => {
      lucideTextureCache.delete(key);
      cleanup();
      reject(new Error(`No se pudo cargar la textura del icono ${key}`));
    };
  });

  lucideTextureCache.set(key, texturePromise);
  image.src = encoded;

  return texturePromise;
};

const fallbackHex = (...values) => {
  for (const value of values) {
    const normalized = normalizeHex(value);
    if (normalized) return normalized;
  }
  return '#f8fafc';
};

const createLucideIconBuilder = (IconComponent) => ({ iconColor, accentColor, borderColor }) => {
  const container = new Container();
  const accentBase = fallbackHex(accentColor, borderColor, iconColor, '#38bdf8');
  const auraColor = lightenHex(accentBase, 0.18) || accentBase;
  const auraSoftColor = lightenHex(accentBase, 0.4) || auraColor;
  const ringColor = lightenHex(accentBase, 0.05) || accentBase;
  const ringShadowColor = darkenHex(accentBase, 0.35) || accentBase;
  const resolvedIconColor = fallbackHex(iconColor, '#e2e8f0');

  const outerGlow = new Sprite(Texture.WHITE);
  outerGlow.anchor.set(0.5);
  outerGlow.tint = hexToInt(auraSoftColor);
  outerGlow.alpha = 0.38;
  outerGlow.width = 82;
  outerGlow.height = 82;
  outerGlow.blendMode = 'add';
  container.addChild(outerGlow);

  const innerGlow = new Sprite(Texture.WHITE);
  innerGlow.anchor.set(0.5);
  innerGlow.tint = hexToInt(auraColor);
  innerGlow.alpha = 0.42;
  innerGlow.width = 64;
  innerGlow.height = 64;
  innerGlow.blendMode = 'screen';
  container.addChild(innerGlow);

  const basePlate = new Graphics();
  basePlate.beginFill(hexToInt(darkenHex(accentBase, 0.55)), 0.95);
  basePlate.drawCircle(0, 0, 20);
  basePlate.endFill();
  basePlate.blendMode = 'multiply';
  container.addChild(basePlate);

  const baseHighlight = new Graphics();
  baseHighlight.beginFill(hexToInt(lightenHex(accentBase, 0.25)), 0.75);
  baseHighlight.drawCircle(-2, -3, 16);
  baseHighlight.endFill();
  baseHighlight.alpha = 0.9;
  baseHighlight.blendMode = 'screen';
  container.addChild(baseHighlight);

  const coreShadow = new Graphics();
  coreShadow.beginFill(hexToInt(darkenHex(accentBase, 0.75)), 0.45);
  coreShadow.drawCircle(3, 4, 11);
  coreShadow.endFill();
  coreShadow.blendMode = 'multiply';
  container.addChild(coreShadow);

  const ringShadow = new Graphics();
  ringShadow.lineStyle({ width: 4, color: hexToInt(ringShadowColor), alpha: 0.45 });
  ringShadow.drawCircle(1.5, 1.5, 15);
  ringShadow.blendMode = 'multiply';
  container.addChild(ringShadow);

  const ring = new Graphics();
  ring.lineStyle({ width: 4, color: hexToInt(ringColor), alpha: 0.9 });
  ring.drawCircle(0, 0, 15);
  container.addChild(ring);

  const innerSheen = new Graphics();
  innerSheen.beginFill(hexToInt(lightenHex(resolvedIconColor, 0.3)), 0.2);
  innerSheen.drawCircle(-4, -5, 11);
  innerSheen.endFill();
  innerSheen.blendMode = 'screen';
  container.addChild(innerSheen);

  const focalRing = new Graphics();
  focalRing.lineStyle({ width: 2, color: hexToInt(lightenHex(resolvedIconColor, 0.4)), alpha: 0.6 });
  focalRing.drawCircle(0, 0, 9);
  focalRing.blendMode = 'screen';
  container.addChild(focalRing);

  const sprite = new Sprite(Texture.WHITE);
  sprite.anchor.set(0.5);
  sprite.alpha = 0;
  const targetSize = 36;
  const applyTargetSize = () => {
    if (typeof sprite.setSize === 'function') {
      sprite.setSize(targetSize);
    } else {
      sprite.width = targetSize;
      sprite.height = targetSize;
    }
  };

  const applyTexture = (texture) => {
    if (!texture || sprite.destroyed) return;
    sprite.texture = texture;
    sprite.alpha = 1;
    if (texture.valid) {
      applyTargetSize();
    } else {
      texture.once('update', applyTargetSize);
    }
  };

  const textureResult = getLucideTexture(IconComponent, resolvedIconColor);

  if (textureResult instanceof Texture) {
    applyTexture(textureResult);
  } else if (textureResult && typeof textureResult.then === 'function') {
    textureResult
      .then(applyTexture)
      .catch((error) => {
        console.warn('[RouteMapBuilder] Error al cargar el icono de nodo', error);
        if (!sprite.destroyed) {
          sprite.texture = Texture.WHITE;
          sprite.alpha = 1;
          applyTargetSize();
        }
      });
  }

  container.addChild(sprite);

  return container;
};

const NODE_ICON_BUILDERS = {
  start: createLucideIconBuilder(Home),
  normal: createLucideIconBuilder(Swords),
  event: createLucideIconBuilder(ScrollText),
  shop: createLucideIconBuilder(Store),
  elite: createLucideIconBuilder(Shield),
  heal: createLucideIconBuilder(HeartPulse),
  boss: createLucideIconBuilder(Crown),
};

const createLockBadge = ({ badgeColor, accentColor, open }) => {
  const container = new Container();
  const aura = new Graphics();
  aura.beginFill(hexToInt(lightenHex(accentColor, 0.2)), 0.2);
  aura.drawCircle(0, 0, 13);
  aura.endFill();
  container.addChild(aura);

  const ring = new Graphics();
  ring.lineStyle(2, hexToInt(badgeColor), 0.9);
  ring.drawCircle(0, 0, 12);
  container.addChild(ring);

  const shackle = new Graphics();
  shackle.lineStyle(2.2, hexToInt(badgeColor), 0.95);
  shackle.moveTo(-6, -3);
  shackle.quadraticCurveTo(0, open ? -12 : -10, 6, -3);
  container.addChild(shackle);

  const body = new Graphics();
  body.beginFill(hexToInt(badgeColor), 0.92);
  const width = open ? 12 : 14;
  body.drawRoundedRect(-width / 2, -3, width, 12, 4);
  body.endFill();
  container.addChild(body);

  if (open) {
    body.rotation = -0.15;
    body.y += 1;
  }

  const keyStem = new Graphics();
  const innerColor = hexToInt(darkenHex(badgeColor, 0.35));
  keyStem.beginFill(innerColor, 0.95);
  keyStem.drawRoundedRect(-1.4, 0, 2.8, 5, 1.2);
  keyStem.endFill();
  container.addChild(keyStem);

  const keyDot = new Graphics();
  keyDot.beginFill(innerColor, 0.95);
  keyDot.drawCircle(0, 4.2, 1.8);
  keyDot.endFill();
  container.addChild(keyDot);

  return container;
};

const createCompletionBadge = (accentColor) => {
  const color = normalizeHex(accentColor) || '#facc15';
  const container = new Container();
  const halo = new Graphics();
  halo.beginFill(hexToInt(lightenHex(color, 0.25)), 0.28);
  halo.drawCircle(0, 0, 14);
  halo.endFill();
  container.addChild(halo);

  const circle = new Graphics();
  circle.beginFill(hexToInt(color), 0.95);
  circle.drawCircle(0, 0, 11);
  circle.endFill();
  container.addChild(circle);

  const check = new Graphics();
  check.lineStyle(3, hexToInt(darkenHex(color, 0.45)), 0.95);
  check.moveTo(-6, 0);
  check.lineTo(-2, 5);
  check.lineTo(6, -4);
  container.addChild(check);

  return container;
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
  const backgroundLayersRef = useRef({ far: null, mid: null, near: null });
  const fxLayerRef = useRef(null);
  const fogLayerRef = useRef(null);
  const fogSpriteRef = useRef(null);
  const tickerCallbackRef = useRef(null);
  const selectionGraphicsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const shouldResumeDragRef = useRef(false);
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [activeTool, setActiveTool] = useState('select');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([]);
  const [nodeTypeToCreate, setNodeTypeToCreate] = useState('normal');
  const [connectOriginId, setConnectOriginId] = useState(null);
  const [nodeEditor, setNodeEditor] = useState(null);
  const [edgeEditor, setEdgeEditor] = useState(null);
  const selectionStartRef = useRef(null);
  const dragStateRef = useRef(null);
  const copyBufferRef = useRef(null);
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
    if (!containerRef.current) return;
    let destroyed = false;
    const initPixi = async () => {
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

      const applyTextureSettings = (texture) => {
        if (texture?.baseTexture) {
          texture.baseTexture.mipmap = MIPMAP_MODES.ON;
          texture.baseTexture.scaleMode = SCALE_MODES.LINEAR;
          texture.baseTexture.anisotropicLevel = 8;
        }
        return texture;
      };

      const createGradientTexture = (stops, options = {}) => {
        const size = options.size ?? 1024;
        const orientation = options.orientation ?? 'diagonal';
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
          return Texture.WHITE;
        }

        let gradient;
        if (orientation === 'horizontal') {
          gradient = context.createLinearGradient(0, 0, size, 0);
        } else if (orientation === 'vertical') {
          gradient = context.createLinearGradient(0, 0, 0, size);
        } else if (orientation === 'radial') {
          const radius = size * (options.radiusMultiplier ?? 0.75);
          gradient = context.createRadialGradient(
            size / 2,
            size / 2,
            size * 0.05,
            size / 2,
            size / 2,
            radius,
          );
        } else {
          gradient = context.createLinearGradient(0, 0, size, size);
        }

        stops.forEach((stop) => {
          gradient.addColorStop(stop.offset, stop.color);
        });

        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);

        if (Array.isArray(options.overlays)) {
          options.overlays.forEach((overlay) => {
            if (overlay.type === 'radial-fade') {
              const overlayGradient = context.createRadialGradient(
                size / 2,
                size / 2,
                size * (overlay.innerRadius ?? 0.05),
                size / 2,
                size / 2,
                size * (overlay.outerRadius ?? 0.85),
              );
              overlayGradient.addColorStop(0, overlay.from ?? 'rgba(255,255,255,0.08)');
              overlayGradient.addColorStop(1, overlay.to ?? 'rgba(0,0,0,0.6)');
              context.globalCompositeOperation = overlay.composite ?? 'source-over';
              context.fillStyle = overlayGradient;
              context.fillRect(0, 0, size, size);
            }
            if (overlay.type === 'noise') {
              const density = Math.max(1, Math.floor(size * (overlay.density ?? 0.25)));
              context.save();
              context.globalAlpha = overlay.alpha ?? 0.05;
              context.fillStyle = overlay.color ?? '#ffffff';
              for (let i = 0; i < density * density; i += 1) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const radius = (overlay.radius ?? 1.2) * (Math.random() * 0.6 + 0.4);
                context.beginPath();
                context.arc(x, y, radius, 0, Math.PI * 2);
                context.fill();
              }
              context.restore();
            }
          });
          context.globalCompositeOperation = 'source-over';
        }

        const texture = Texture.from(canvas, {
          mipmap: MIPMAP_MODES.ON,
          scaleMode: SCALE_MODES.LINEAR,
          anisotropicLevel: 8,
        });
        return applyTextureSettings(texture);
      };

      const createFogTexture = (size = 512) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
          return Texture.WHITE;
        }

        const imageData = context.createImageData(size, size);
        const { data } = imageData;
        for (let i = 0; i < data.length; i += 4) {
          const variation = Math.random();
          const base = 185 + Math.floor(variation * 40);
          data[i] = base;
          data[i + 1] = base + 10;
          data[i + 2] = base + 30;
          data[i + 3] = 80 + Math.floor(variation * 70);
        }
        context.putImageData(imageData, 0, 0);

        context.globalAlpha = 0.25;
        context.fillStyle = 'rgba(100, 130, 180, 0.35)';
        for (let i = 0; i < size * 0.6; i += 1) {
          const radius = Math.random() * (size * 0.06) + size * 0.02;
          const x = Math.random() * size;
          const y = Math.random() * size;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;

        const texture = Texture.from(canvas, {
          mipmap: MIPMAP_MODES.ON,
          scaleMode: SCALE_MODES.LINEAR,
          anisotropicLevel: 8,
        });
        return applyTextureSettings(texture);
      };

      const createBackgroundSprite = (texture) => {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.roundPixels = true;
        return sprite;
      };

      const backgroundFarLayer = new Container();
      backgroundFarLayer.eventMode = 'none';
      const backgroundMidLayer = new Container();
      backgroundMidLayer.eventMode = 'none';
      const backgroundNearLayer = new Container();
      backgroundNearLayer.eventMode = 'none';

      const fxLayer = new Container();
      fxLayer.eventMode = 'none';
      fxLayer.sortableChildren = true;

      const fogLayer = new Container();
      fogLayer.eventMode = 'none';

      const edgesLayer = new Container();
      edgesLayer.eventMode = 'none';
      const nodesLayer = new Container();
      nodesLayer.eventMode = 'static';

      const selectionGraphics = new Graphics();

      const farTexture = createGradientTexture(
        [
          { offset: 0, color: '#020617' },
          { offset: 0.45, color: '#07152f' },
          { offset: 1, color: '#0b1220' },
        ],
        {
          orientation: 'vertical',
          overlays: [
            {
              type: 'radial-fade',
              from: 'rgba(30,64,175,0.28)',
              to: 'rgba(2,6,23,0.95)',
              innerRadius: 0.15,
              outerRadius: 0.95,
            },
          ],
        },
      );

      const midTexture = createGradientTexture(
        [
          { offset: 0, color: '#081529' },
          { offset: 0.4, color: '#0b1f3d' },
          { offset: 1, color: '#112544' },
        ],
        {
          orientation: 'diagonal',
          overlays: [
            { type: 'noise', density: 0.18, alpha: 0.06, color: '#4f83ff', radius: 1.4 },
          ],
        },
      );

      const nearTexture = createGradientTexture(
        [
          { offset: 0, color: '#0e1a30' },
          { offset: 0.5, color: '#142d4d' },
          { offset: 1, color: '#1a3555' },
        ],
        {
          orientation: 'horizontal',
          overlays: [
            {
              type: 'noise',
              density: 0.25,
              alpha: 0.08,
              color: '#60a5fa',
              radius: 1.1,
            },
            {
              type: 'radial-fade',
              from: 'rgba(96,165,250,0.18)',
              to: 'rgba(2,6,23,0.95)',
              innerRadius: 0.1,
              outerRadius: 0.9,
            },
          ],
        },
      );

      const fogTexture = createFogTexture(512);
      if (fogTexture?.baseTexture) {
        fogTexture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
      }

      backgroundFarLayer.addChild(createBackgroundSprite(farTexture));
      backgroundMidLayer.addChild(createBackgroundSprite(midTexture));
      backgroundNearLayer.addChild(createBackgroundSprite(nearTexture));

      const fogSprite = new TilingSprite(
        fogTexture,
        Math.max(app.renderer.width, 2048),
        Math.max(app.renderer.height, 2048),
      );
      fogSprite.alpha = 0.2;
      fogSprite.tileScale.set(0.5);
      fogLayer.addChild(fogSprite);

      viewport.addChild(backgroundFarLayer);
      viewport.addChild(backgroundMidLayer);
      viewport.addChild(backgroundNearLayer);
      viewport.addChild(edgesLayer);
      viewport.addChild(nodesLayer);
      viewport.addChild(fxLayer);
      viewport.addChild(fogLayer);
      viewport.addChild(selectionGraphics);

      backgroundLayersRef.current = {
        far: backgroundFarLayer,
        mid: backgroundMidLayer,
        near: backgroundNearLayer,
      };
      fxLayerRef.current = fxLayer;
      fogLayerRef.current = fogLayer;
      fogSpriteRef.current = fogSprite;
      viewportRef.current = viewport;
      appRef.current = app;
      nodesContainerRef.current = nodesLayer;
      edgesContainerRef.current = edgesLayer;
      selectionGraphicsRef.current = selectionGraphics;
      viewport.eventMode = 'static';

      const updateEnvironmentalLayers = () => {
        if (!viewportRef.current || !appRef.current) return;
        const currentViewport = viewportRef.current;
        const currentApp = appRef.current;
        const scaleX = currentViewport.scale?.x || 1;
        const scaleY = currentViewport.scale?.y || 1;
        const vx = currentViewport.x;
        const vy = currentViewport.y;

        const farLayer = backgroundLayersRef.current.far;
        const midLayer = backgroundLayersRef.current.mid;
        const nearLayer = backgroundLayersRef.current.near;

        const applyParallax = (layer, factor) => {
          if (!layer) return;
          layer.position.set(vx * (factor - 1), vy * (factor - 1));
          layer.scale.set(1 / scaleX, 1 / scaleY);
        };

        applyParallax(farLayer, 0.2);
        applyParallax(midLayer, 0.5);
        applyParallax(nearLayer, 0.8);

        const fogLayerInstance = fogLayerRef.current;
        if (fogLayerInstance) {
          fogLayerInstance.position.set(-vx, -vy);
          fogLayerInstance.scale.set(1 / scaleX, 1 / scaleY);
          const fogSpriteInstance = fogSpriteRef.current;
          if (fogSpriteInstance) {
            const renderer = currentApp.renderer;
            const fogWidth = renderer.width * 1.5;
            const fogHeight = renderer.height * 1.5;
            fogSpriteInstance.width = fogWidth;
            fogSpriteInstance.height = fogHeight;
            fogSpriteInstance.position.set(-fogWidth / 2, -fogHeight / 2);
            fogSpriteInstance.tileScale.set(1 / scaleX, 1 / scaleY);
          }
        }
      };

      updateEnvironmentalLayers();

      const tickerCallback = (delta) => {
        const fogSpriteInstance = fogSpriteRef.current;
        if (fogSpriteInstance) {
          fogSpriteInstance.tilePosition.x += delta * 0.24;
          fogSpriteInstance.tilePosition.y += delta * 0.18;
        }
        updateEnvironmentalLayers();
      };

      app.ticker.add(tickerCallback);
      tickerCallbackRef.current = tickerCallback;
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
      if (appRef.current && tickerCallbackRef.current) {
        appRef.current.ticker?.remove(tickerCallbackRef.current);
      }
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.removeAllListeners();
        viewport.destroy({ children: true });
      }
      const app = appRef.current;
      if (app) {
        const canvas = app.canvas ?? app.view;
        if (canvas?.parentNode === containerRef.current) {
          canvas.parentNode.removeChild(canvas);
        }
        app.stage?.removeChildren();
        app.destroy(true, { children: false });
      }
      viewportRef.current = null;
      appRef.current = null;
      nodesContainerRef.current = null;
      edgesContainerRef.current = null;
      selectionGraphicsRef.current = null;
      backgroundLayersRef.current = { far: null, mid: null, near: null };
      fxLayerRef.current = null;
      fogLayerRef.current = null;
      fogSpriteRef.current = null;
      tickerCallbackRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewportRef.current || !nodesContainerRef.current || !edgesContainerRef.current) return;
    const viewport = viewportRef.current;
    const edgesLayer = edgesContainerRef.current;
    const nodesLayer = nodesContainerRef.current;
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
      const path = new Graphics();
      drawDottedQuadratic(path, from, control, to, {
        color,
        size: selected ? 5 : 4,
        spacing: 18,
      });
      path.edgeId = edge.id;
      path.eventMode = 'static';
      path.cursor = 'pointer';
      path.hitArea = {
        contains: (x, y) => {
          const minX = Math.min(from.x, to.x, control.x) - 24;
          const maxX = Math.max(from.x, to.x, control.x) + 24;
          const minY = Math.min(from.y, to.y, control.y) - 24;
          const maxY = Math.max(from.y, to.y, control.y) + 24;
          return x >= minX && x <= maxX && y >= minY && y <= maxY;
        },
      };
      path.on('pointertap', (event) => {
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
      edgesLayer.addChild(path);

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
      edgesLayer.addChild(arrow);

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
        edgesLayer.addChild(labelContainer);
      }
    });

    state.nodes.forEach((node) => {
      const nodeContainer = new Container();
      const typeDef = NODE_TYPES.find((item) => item.id === node.type) || NODE_TYPES[1];
      const stateDef = NODE_STATES[node.state] || NODE_STATES.locked;
      const selected = selectedNodeIds.includes(node.id);
      const palette = getTypeDefaults(typeDef.id);
      const accentHex = normalizeHex(node.accentColor) || palette.accent;
      const fillHex = normalizeHex(node.fillColor) || palette.fill;
      const borderHex = normalizeHex(node.borderColor) || palette.border;
      const iconHex = normalizeHex(node.iconColor) || palette.icon;
      const accentColor = hexToInt(accentHex);
      const fillColor = hexToInt(fillHex);
      const borderColor = hexToInt(borderHex);
      const stateStroke = hexToInt(normalizeHex(stateDef.stroke) || '#38bdf8');
      const radius = 36;

      const auraHex = normalizeHex(stateDef.aura) || lightenHex(accentHex, 0.08);
      if (auraHex) {
        const aura = new Graphics();
        aura.beginFill(hexToInt(auraHex), selected ? 0.26 : 0.2);
        aura.drawCircle(0, 0, radius + 18);
        aura.endFill();
        nodeContainer.addChild(aura);
      }

      if (selected) {
        const selectionAura = new Graphics();
        selectionAura.beginFill(hexToInt(lightenHex(accentHex, 0.35)), 0.18);
        selectionAura.drawCircle(0, 0, radius + 24);
        selectionAura.endFill();
        nodeContainer.addChild(selectionAura);
      }

      const base = new Graphics();
      base.beginFill(hexToInt(darkenHex(fillHex, 0.45)), 0.95);
      base.drawCircle(0, 0, radius + 2);
      base.endFill();
      nodeContainer.addChild(base);

      const body = new Graphics();
      body.beginFill(fillColor, 0.98);
      body.drawCircle(0, 0, radius - 2);
      body.endFill();
      nodeContainer.addChild(body);

      const innerGlow = new Graphics();
      innerGlow.beginFill(hexToInt(lightenHex(fillHex, 0.18)), 0.65);
      innerGlow.drawCircle(0, 0, radius - 14);
      innerGlow.endFill();
      nodeContainer.addChild(innerGlow);

      const highlight = new Graphics();
      highlight.beginFill(hexToInt(lightenHex(fillHex, 0.55)), 0.22);
      highlight.drawEllipse(0, -radius * 0.35, radius * 0.95, radius * 0.6);
      highlight.endFill();
      highlight.rotation = -0.25;
      nodeContainer.addChild(highlight);

      const accentGlow = new Graphics();
      accentGlow.beginFill(hexToInt(lightenHex(accentHex, 0.4)), 0.16);
      accentGlow.drawCircle(0, 0, radius - 8);
      accentGlow.endFill();
      nodeContainer.addChild(accentGlow);

      const accentRing = new Graphics();
      accentRing.lineStyle(4, accentColor, 0.9);
      accentRing.drawCircle(0, 0, radius - 10);
      nodeContainer.addChild(accentRing);

      const borderRing = new Graphics();
      borderRing.lineStyle(selected ? 6 : 4, borderColor, selected ? 1 : 0.96);
      borderRing.drawCircle(0, 0, radius + (selected ? 1.5 : 0));
      nodeContainer.addChild(borderRing);

      const stateRing = new Graphics();
      const stateAlpha = node.state === 'locked' ? 0.68 : node.state === 'visible' ? 0.56 : 0.38;
      stateRing.lineStyle(3, stateStroke, stateAlpha);
      stateRing.drawCircle(0, 0, radius + 10);
      nodeContainer.addChild(stateRing);

      if (node.state === 'current') {
        const halo = new Graphics();
        halo.lineStyle(5, accentColor, 0.5);
        halo.drawCircle(0, 0, radius + 16);
        halo.endFill();
        nodeContainer.addChild(halo);
      }

      const iconBuilder = NODE_ICON_BUILDERS[typeDef.id] || NODE_ICON_BUILDERS.normal;
      const iconContainer = iconBuilder({ iconColor: iconHex, accentColor: accentHex, borderColor: borderHex });
      iconContainer.position.set(0, 2);
      iconContainer.scale.set(0.82);
      nodeContainer.addChild(iconContainer);

      if (node.state === 'locked' || node.state === 'visible') {
        const badge = createLockBadge({
          badgeColor: normalizeHex(stateDef.badgeColor) || accentHex,
          accentColor: accentHex,
          open: node.state === 'visible',
        });
        badge.scale.set(0.62);
        badge.position.set(-radius + 18, -radius + 18);
        nodeContainer.addChild(badge);
      }

      if (node.state === 'completed') {
        const completion = createCompletionBadge(accentHex);
        completion.scale.set(0.6);
        completion.position.set(radius - 18, -radius + 18);
        nodeContainer.addChild(completion);
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

      const labelText = new Text({
        text: node.name,
        style: {
          fill: '#e2e8f0',
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          letterSpacing: 0.6,
        },
      });
      labelText.anchor.set(0.5);
      const labelContainer = new Container();
      const paddingX = 14;
      const paddingY = 6;
      const labelBackground = new Graphics();
      const labelStrokeColor = selected ? accentColor : stateStroke;
      const labelWidth = labelText.width + paddingX * 2;
      const labelHeight = labelText.height + paddingY * 2;
      labelBackground.beginFill(0x0b1220, 0.9);
      labelBackground.lineStyle(1, labelStrokeColor, 0.6);
      labelBackground.drawRoundedRect(-labelWidth / 2, -labelHeight / 2, labelWidth, labelHeight, labelHeight / 2);
      labelBackground.endFill();
      labelContainer.addChild(labelBackground);
      labelContainer.addChild(labelText);
      labelText.position.set(0, 0);
      labelContainer.position.set(node.x, node.y + radius + 28);
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
    });
    return () => {
      viewport.off('pointermove', handleViewportDragMove);
      viewport.off('pointerup', handleViewportDragEnd);
      viewport.off('pointerupoutside', handleViewportDragEnd);
    };
  }, [state.nodes, state.edges, nodesMap, selectedNodeIds, selectedEdgeIds, showGrid, gridSize, connectOriginId, activeTool, deleteSelection, toggleNodeLock, applyDragDelta, pauseViewportDrag, resumeViewportDrag]);

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
          backgroundBlendMode: backgroundImage ? 'soft-light' : undefined,
        }}
      >
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-slate-950/55 via-slate-900/10 to-slate-950/60" />
        {backgroundImage && (
          <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950/55 mix-blend-multiply" />
        )}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(148, 163, 184, 0.18), transparent 45%), radial-gradient(circle at 80% 0%, rgba(14, 116, 144, 0.16), transparent 55%), radial-gradient(circle at 50% 90%, rgba(125, 211, 252, 0.12), transparent 50%)' }} />
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

