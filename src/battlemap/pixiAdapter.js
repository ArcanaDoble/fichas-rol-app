import {
  Application,
  Assets,
  Color,
  Container,
  Graphics,
  Rectangle,
  Point,
  Sprite,
  Texture,
} from 'pixi.js';
import { Viewport } from 'pixi-viewport';

const DEFAULTS = {
  cellSize: 70,
  gridOpacity: 0.2,
  gridColor: 0xffffff,
  gridVisible: true,
  backgroundColor: 0x000000,
};

const SELECTION_COLOR = 0xffcc00;
const MIN_WORLD_SIZE = 200;
const TOKEN_SELECTION_Z_OFFSET = 10000;
const DEFAULT_LAYER_START_Z_INDEX = 20;
const FOG_DEFAULTS = {
  color: 0x000000,
  opacity: 0.65,
  visible: false,
};

function normalizeColor(value, fallback = DEFAULTS.gridColor) {
  try {
    return Color.shared.setValue(
      value !== undefined && value !== null ? value : fallback
    ).toNumber();
  } catch (error) {
    console.warn('[PixiBattleMap] Color inválido, usando fallback.', error);
    return Color.shared.setValue(fallback).toNumber();
  }
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(Math.max(numeric, min), max);
  }
  return fallback;
}

export default class PixiBattleMap {
  constructor(containerEl, opts = {}) {
    if (!containerEl) {
      throw new Error('PixiBattleMap necesita un contenedor válido');
    }

    this.container = containerEl;
    this.container.style.position = this.container.style.position || 'relative';
    this.container.style.overflow = 'hidden';
    if (!this.container.style.width) {
      this.container.style.width = '100%';
    }
    if (!this.container.style.height) {
      this.container.style.height = '100%';
    }
    if (!this.container.style.minHeight) {
      this.container.style.minHeight = '400px';
    }

    this.state = {
      cellSize: clampNumber(opts.cellSize, 8, 512, DEFAULTS.cellSize),
      gridOpacity: DEFAULTS.gridOpacity,
      gridColor: DEFAULTS.gridColor,
      gridVisible: DEFAULTS.gridVisible,
      gridOffsetX: Number.isFinite(Number(opts.offsetX))
        ? Number(opts.offsetX)
        : 0,
      gridOffsetY: Number.isFinite(Number(opts.offsetY))
        ? Number(opts.offsetY)
        : 0,
      gridCells: null,
      gridColumns: null,
      gridRows: null,
      worldWidth: MIN_WORLD_SIZE,
      worldHeight: MIN_WORLD_SIZE,
    };

    this.tokens = new Map();
    this.textureCache = new Map();
    this.layers = new Map();
    this.selectedTokens = new Set();
    this.clipboard = null;
    this.activeTool = 'select';
    this.lights = new Map();
    this.events = new Map();
    this.fogState = { ...FOG_DEFAULTS };
    this.nextLayerIndex = DEFAULT_LAYER_START_Z_INDEX;
    this.resizeObserver = null;
    this.destroyed = false;
    this.cleanupDone = false;
    this.destroyPromise = null;
    this.canvas = null;
    this.viewport = null;
    this.backgroundSprite = null;
    this.backgroundMaskSprite = null;

    this.app = new Application();
    this.readyPromise = this.init().catch((error) => {
      console.error('[PixiBattleMap] Error inicializando Pixi:', error);
      throw error;
    });
  }

  get ready() {
    return this.readyPromise;
  }

  on(eventName, handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    const handlers = this.events.get(eventName);
    handlers.add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const handlers = this.events.get(eventName);
    if (!handlers) {
      return;
    }
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.events.delete(eventName);
    }
  }

  emit(eventName, payload) {
    if (this.destroyed) {
      return;
    }
    const handlers = this.events.get(eventName);
    if (!handlers || handlers.size === 0) {
      return;
    }
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[PixiBattleMap] Error en handler de evento "${eventName}":`, error);
      }
    });
  }

  registerLayer(id, container, options = {}) {
    if (!container) {
      return null;
    }
    const layerId = String(id);
    const viewport = this.viewport;
    if (this.layers.has(layerId)) {
      const meta = this.layers.get(layerId);
      meta.container = container;
      if (viewport && !viewport.children.includes(container)) {
        viewport.addChild(container);
      }
      this.setLayerVisibility(layerId, meta.visible);
      return meta;
    }

    const meta = {
      id: layerId,
      container,
      locked: Boolean(options.locked),
      visible: options.visible !== undefined ? Boolean(options.visible) : true,
      type: options.type || 'custom',
      zIndex:
        Number.isFinite(options.zIndex) && !Number.isNaN(options.zIndex)
          ? Number(options.zIndex)
          : this.nextLayerIndex++,
    };

    container.zIndex = meta.zIndex;
    container.sortableChildren = Boolean(options.sortableChildren);
    container.eventMode = options.eventMode || 'static';
    container.cursor = options.cursor || 'default';
    container.visible = meta.visible;

    this.layers.set(layerId, meta);
    if (viewport && !viewport.children.includes(container)) {
      viewport.addChild(container);
    }
    if (viewport?.sortChildren) {
      viewport.sortChildren();
    }
    return meta;
  }

  ensureLayer(id, options = {}) {
    const layerId = String(id);
    const existing = this.layers.get(layerId);
    if (existing) {
      return existing;
    }
    const container = new Container();
    return this.registerLayer(layerId, container, options);
  }

  getLayer(layerId) {
    if (layerId === undefined || layerId === null) {
      return null;
    }
    return this.layers.get(String(layerId)) || null;
  }

  getLayerContainer(layerId, fallbackId = 'tokens') {
    const meta = this.getLayer(layerId);
    if (meta?.container) {
      return meta.container;
    }
    const fallback = this.getLayer(fallbackId);
    return fallback?.container || this.tokensLayer || null;
  }

  isLayerLocked(layerId) {
    const meta = this.getLayer(layerId);
    return Boolean(meta?.locked);
  }

  setLayerVisibility(layerId, visible) {
    const meta = this.getLayer(layerId);
    if (!meta?.container) {
      return;
    }
    const nextVisible = Boolean(visible);
    meta.visible = nextVisible;
    meta.container.visible = nextVisible;
  }

  lockLayer(layerId, locked) {
    const meta = this.getLayer(layerId);
    if (!meta) {
      return;
    }
    meta.locked = Boolean(locked);
  }

  setLayerZIndex(layerId, zIndex) {
    const meta = this.getLayer(layerId);
    if (!meta?.container) {
      return;
    }
    if (!Number.isFinite(zIndex)) {
      return;
    }
    meta.zIndex = Number(zIndex);
    meta.container.zIndex = meta.zIndex;
    if (this.viewport?.sortChildren) {
      this.viewport.sortChildren();
    }
  }

  async init() {
    if (this.destroyed) {
      return;
    }

    await this.app.init({
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      resizeTo: this.container,
      backgroundColor: DEFAULTS.backgroundColor,
    });

    if (this.destroyed) {
      try {
        await this.app.destroy();
      } catch (error) {
        console.warn('[PixiBattleMap] Error destruyendo aplicación tras cancelación.', error);
      }
      return;
    }

    this.canvas = this.app.canvas;
    this.container.appendChild(this.canvas);
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.backgroundColor = '#000';

    const screenWidth = this.container.clientWidth || MIN_WORLD_SIZE;
    const screenHeight = this.container.clientHeight || MIN_WORLD_SIZE;

    this.viewport = new Viewport({
      screenWidth,
      screenHeight,
      worldWidth: this.state.worldWidth,
      worldHeight: this.state.worldHeight,
      ticker: this.app.ticker,
      events: this.app.renderer.events,
      disableOnContextMenu: true,
    });

    this.viewport.drag().pinch().wheel().decelerate();
    this.viewport.clampZoom({ minScale: 0.2, maxScale: 5 });
    this.viewport.sortableChildren = true;
    this.viewport.eventMode = 'static';

    this.backgroundLayer = new Container();
    this.gridLayer = new Graphics();
    this.tokensLayer = new Container();
    this.tokensLayer.sortableChildren = true;
    this.tokensLayer.eventMode = 'static';
    this.tokensLayer.cursor = 'pointer';

    this.lightsLayer = new Container();
    this.lightsLayer.sortableChildren = true;
    this.lightsLayer.eventMode = 'none';

    this.overlayLayer = new Container();
    this.overlayLayer.sortableChildren = true;
    this.overlayLayer.eventMode = 'static';

    this.fogLayer = new Graphics();
    this.fogLayer.eventMode = 'none';
    this.fogLayer.visible = false;

    this.registerLayer('background', this.backgroundLayer, {
      type: 'background',
      locked: true,
      eventMode: 'none',
      zIndex: 0,
    });
    this.registerLayer('grid', this.gridLayer, {
      type: 'grid',
      locked: true,
      eventMode: 'static',
      zIndex: 5,
    });
    this.registerLayer('tokens', this.tokensLayer, {
      type: 'tokens',
      locked: false,
      sortableChildren: true,
      eventMode: 'static',
      zIndex: 20,
      cursor: 'pointer',
    });
    this.registerLayer('lights', this.lightsLayer, {
      type: 'lights',
      locked: false,
      eventMode: 'none',
      zIndex: 40,
    });
    this.registerLayer('overlay', this.overlayLayer, {
      type: 'overlay',
      locked: true,
      eventMode: 'static',
      zIndex: 60,
    });
    this.registerLayer('fog', this.fogLayer, {
      type: 'fog',
      locked: true,
      eventMode: 'none',
      zIndex: 80,
      visible: false,
    });

    this.layers.forEach((meta) => {
      if (!meta?.container) {
        return;
      }
      if (!this.viewport.children.includes(meta.container)) {
        this.viewport.addChild(meta.container);
      }
      if (meta.zIndex !== undefined) {
        meta.container.zIndex = meta.zIndex;
      }
      meta.container.visible = meta.visible !== false;
    });

    this.app.stage.addChild(this.viewport);

    this.placeholderGraphic = null;
    this.ensurePlaceholder();
    this.updatePlaceholderPosition();

    this.viewport.on('pointerdown', (event) => {
      if (event.target === this.viewport) {
        this.clearSelection();
      }
    });
    this.gridLayer.on('pointerdown', () => this.clearSelection());

    this.updateViewportHitArea();
    this.drawGrid();
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  async loadMap(url, width, height) {
    await this.ready;
    if (this.destroyed) {
      return;
    }

    const targetWidth = Math.max(width || 0, MIN_WORLD_SIZE);
    const targetHeight = Math.max(height || 0, MIN_WORLD_SIZE);

    if (!this.viewport) {
      return;
    }

    this.hidePlaceholder();
    if (this.backgroundSprite) {
      this.backgroundSprite.removeFromParent();
      this.backgroundSprite.destroy({ texture: false, baseTexture: false });
      this.backgroundSprite = null;
    }
    if (this.backgroundMaskSprite) {
      this.backgroundMaskSprite.removeFromParent();
      this.backgroundMaskSprite.destroy({ texture: false, baseTexture: false });
      this.backgroundMaskSprite = null;
    }
    if (this.gridLayer) {
      this.gridLayer.mask = null;
    }
    this.backgroundLayer.removeChildren();

    if (url) {
      try {
        const texture = await this.loadTexture(url);
        const background = new Sprite(texture);
        background.anchor.set(0);
        background.position.set(0, 0);
        background.width = targetWidth;
        background.height = targetHeight;
        background.eventMode = 'none';

        const maskSprite = new Sprite(texture);
        maskSprite.anchor.set(0);
        maskSprite.position.set(0, 0);
        maskSprite.width = targetWidth;
        maskSprite.height = targetHeight;
        maskSprite.eventMode = 'none';

        this.backgroundLayer.addChild(background);
        this.backgroundLayer.addChild(maskSprite);

        this.backgroundSprite = background;
        this.backgroundMaskSprite = maskSprite;

        if (this.gridLayer) {
          this.gridLayer.mask = this.backgroundMaskSprite;
        }
        this.hidePlaceholder();
      } catch (error) {
        console.error('[PixiBattleMap] No se pudo cargar el mapa:', error);
        this.ensurePlaceholder();
        if (this.gridLayer) {
          this.gridLayer.mask = null;
        }
        if (this.backgroundMaskSprite) {
          this.backgroundMaskSprite.removeFromParent();
          this.backgroundMaskSprite.destroy({ texture: false, baseTexture: false });
          this.backgroundMaskSprite = null;
        }
      }
    }
    if (!url) {
      this.ensurePlaceholder();
      if (this.gridLayer) {
        this.gridLayer.mask = null;
      }
      if (this.backgroundMaskSprite) {
        this.backgroundMaskSprite.removeFromParent();
        this.backgroundMaskSprite.destroy({ texture: false, baseTexture: false });
        this.backgroundMaskSprite = null;
      }
    }

    this.state.worldWidth = targetWidth;
    this.state.worldHeight = targetHeight;
    this.updateViewportHitArea();
    this.refreshFog();
    this.drawGrid();
    this.resize();
    this.updatePlaceholderPosition();
    this.viewport.clamp({
      direction: 'all',
      top: 0,
      left: 0,
      right: this.state.worldWidth,
      bottom: this.state.worldHeight,
    });
    this.viewport.fitWorld(true);
    this.viewport.moveCenter(this.state.worldWidth / 2, this.state.worldHeight / 2);
  }

  async setGrid(opts = {}) {
    await this.ready;
    if (this.destroyed) {
      return;
    }

    if (opts.cellSize !== undefined) {
      this.state.cellSize = clampNumber(
        opts.cellSize,
        8,
        512,
        this.state.cellSize
      );
    }
    if (opts.opacity !== undefined) {
      const numeric = Number(opts.opacity);
      if (Number.isFinite(numeric)) {
        this.state.gridOpacity = Math.min(Math.max(numeric, 0), 1);
      }
    }
    if (opts.color !== undefined) {
      this.state.gridColor = normalizeColor(opts.color, this.state.gridColor);
    }
    if (opts.visible !== undefined) {
      this.state.gridVisible = Boolean(opts.visible);
    }

    if (opts.offsetX !== undefined) {
      const numeric = Number(opts.offsetX);
      if (Number.isFinite(numeric)) {
        this.state.gridOffsetX = numeric;
      }
    }
    if (opts.offsetY !== undefined) {
      const numeric = Number(opts.offsetY);
      if (Number.isFinite(numeric)) {
        this.state.gridOffsetY = numeric;
      }
    }

    const parsePositive = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    };

    let resolvedColumns = null;
    let resolvedRows = null;
    let resolvedCells = null;

    if (opts.gridCells !== undefined) {
      if (typeof opts.gridCells === 'object' && opts.gridCells !== null) {
        const config = opts.gridCells;
        resolvedColumns =
          parsePositive(config.columns ?? config.cols ?? config.x) ?? null;
        resolvedRows =
          parsePositive(config.rows ?? config.row ?? config.y) ?? null;
        resolvedCells = parsePositive(config.count ?? config.value);
      } else {
        const numeric = parsePositive(opts.gridCells);
        if (numeric !== null) {
          resolvedColumns = numeric;
          resolvedRows = numeric;
          resolvedCells = numeric;
        }
      }
    }

    const extraColumns =
      parsePositive(opts.columns ?? opts.gridColumns ?? opts.cols) ?? null;
    const extraRows =
      parsePositive(opts.rows ?? opts.gridRows ?? opts.row) ?? null;

    if (extraColumns !== null) {
      resolvedColumns = extraColumns;
    }
    if (extraRows !== null) {
      resolvedRows = extraRows;
    }

    if (resolvedColumns !== null || resolvedRows !== null) {
      const fallback =
        resolvedColumns !== null
          ? resolvedColumns
          : resolvedRows !== null
          ? resolvedRows
          : null;
      if (resolvedColumns === null && fallback !== null) {
        resolvedColumns = fallback;
      }
      if (resolvedRows === null && fallback !== null) {
        resolvedRows = fallback;
      }
      if (resolvedColumns !== null) {
        this.state.gridColumns = Math.max(1, Math.floor(resolvedColumns));
      }
      if (resolvedRows !== null) {
        this.state.gridRows = Math.max(1, Math.floor(resolvedRows));
      }
      if (resolvedCells !== null) {
        this.state.gridCells = Math.max(1, Math.floor(resolvedCells));
      } else if (resolvedColumns !== null && resolvedRows !== null) {
        this.state.gridCells =
          resolvedColumns === resolvedRows
            ? Math.max(1, Math.floor(resolvedColumns))
            : null;
      } else if (resolvedColumns !== null) {
        this.state.gridCells = Math.max(1, Math.floor(resolvedColumns));
      } else if (resolvedRows !== null) {
        this.state.gridCells = Math.max(1, Math.floor(resolvedRows));
      }
    }

    const effectiveCellSize = this.getEffectiveCellSize();
    if (Number.isFinite(effectiveCellSize) && effectiveCellSize > 0) {
      this.state.cellSize = effectiveCellSize;
    }

    this.drawGrid();
    this.tokens.forEach((token) => this.updateSelectionGraphic(token));
  }

  applyTokenOptions(token, options = {}) {
    if (!token) {
      return null;
    }

    const current = token.battlemapData || { id: token.battlemapId };
    const next = { ...current };

    const assignNumber = (key, value, { clampMin, clampMax } = {}) => {
      if (value === undefined || value === null) {
        return;
      }
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return;
      }
      let resolved = numeric;
      if (Number.isFinite(clampMin)) {
        resolved = Math.max(clampMin, resolved);
      }
      if (Number.isFinite(clampMax)) {
        resolved = Math.min(clampMax, resolved);
      }
      next[key] = resolved;
    };

    if (options.id !== undefined) {
      next.id = String(options.id);
    } else if (!next.id) {
      next.id = token.battlemapId;
    }

    assignNumber('x', options.x ?? options.position?.x, {});
    assignNumber('y', options.y ?? options.position?.y, {});
    assignNumber('size', options.size ?? options.width ?? options.height, {
      clampMin: 1,
    });
    assignNumber('rotation', options.rotation ?? options.angle, {});
    assignNumber('opacity', options.opacity ?? options.alpha, {
      clampMin: 0,
      clampMax: 1,
    });
    assignNumber('zIndex', options.zIndex, {});
    assignNumber(
      'tintOpacity',
      options.tintOpacity ?? options.tintAlpha,
      {
        clampMin: 0,
        clampMax: 1,
      }
    );

    if (options.layer !== undefined) {
      next.layer = String(options.layer);
    } else if (!next.layer) {
      next.layer = 'tokens';
    }

    if (options.textureUrl !== undefined) {
      next.textureUrl = options.textureUrl;
    }
    if (options.tint !== undefined || options.tintColor !== undefined) {
      next.tint = options.tintColor ?? options.tint;
    }
    if (options.metadata) {
      next.metadata = { ...(next.metadata || {}), ...options.metadata };
    }
    if (options.vision !== undefined) {
      next.vision = options.vision;
    }
    if (options.name !== undefined) {
      next.name = options.name;
    }

    if (next.x === undefined) next.x = 0;
    if (next.y === undefined) next.y = 0;
    if (!Number.isFinite(next.size) || next.size <= 0) {
      next.size = this.state.cellSize;
    }
    if (!Number.isFinite(next.rotation)) {
      next.rotation = 0;
    }
    if (!Number.isFinite(next.opacity)) {
      next.opacity = 1;
    }
    if (!Number.isFinite(next.zIndex)) {
      next.zIndex = token.baseZIndex ?? this.tokensLayer.children.length + 1;
    }

    const hasTintColor = next.tint !== undefined && next.tint !== null;
    let resolvedTintOpacity = Number(next.tintOpacity);
    if (!Number.isFinite(resolvedTintOpacity)) {
      resolvedTintOpacity = hasTintColor ? 1 : 0;
    }
    resolvedTintOpacity = Math.min(Math.max(resolvedTintOpacity, 0), 1);
    next.tintOpacity = resolvedTintOpacity;

    token.battlemapData = next;
    token.position.set(next.x, next.y);

    const resolvedSize = Math.max(1, Number(next.size));
    token.width = resolvedSize;
    token.height = resolvedSize;
    token.hitArea = new Rectangle(-resolvedSize / 2, -resolvedSize / 2, resolvedSize, resolvedSize);

    const rotationRadians = (Number(next.rotation) * Math.PI) / 180;
    token.rotation = rotationRadians;
    token.alpha = Math.min(Math.max(Number(next.opacity), 0), 1);

    if (hasTintColor && resolvedTintOpacity > 0) {
      token.tint = normalizeColor(next.tint, 0xffffff);
      token.tintAlpha = resolvedTintOpacity;
    } else {
      token.tint = 0xffffff;
      token.tintAlpha = 0;
    }

    token.baseZIndex = Number(next.zIndex) || 0;
    token.zIndex = this.selectedTokens.has(token)
      ? token.baseZIndex + TOKEN_SELECTION_Z_OFFSET
      : token.baseZIndex;

    const targetLayerId = next.layer || 'tokens';
    if (!this.getLayer(targetLayerId) && targetLayerId !== 'tokens') {
      this.ensureLayer(targetLayerId, {
        type: 'tokens',
        sortableChildren: true,
        eventMode: 'static',
        cursor: 'pointer',
      });
    }
    const targetLayer = this.getLayerContainer(targetLayerId, 'tokens');
    if (targetLayer && token.parent !== targetLayer) {
      targetLayer.addChild(token);
    }
    token.battlemapLayerId = targetLayerId;

    if (next.textureUrl && next.textureUrl !== token.__textureUrl) {
      token.__textureUrl = next.textureUrl;
      this.loadTexture(next.textureUrl)
        .then((texture) => {
          if (this.tokens.get(token.battlemapId) === token && !this.destroyed) {
            token.texture = texture;
          }
        })
        .catch((error) => {
          console.warn('[PixiBattleMap] No se pudo cargar la textura del token.', error);
        });
    } else if (!next.textureUrl) {
      token.__textureUrl = null;
      token.texture = Texture.WHITE;
    }

    this.updateSelectionGraphic(token);
    return next;
  }

  async addToken({ id, textureUrl, x = 0, y = 0, size, ...rest }) {
    await this.ready;
    if (this.destroyed) {
      return null;
    }
    if (!id && id !== 0) {
      throw new Error('Los tokens necesitan un id');
    }

    const tokenId = String(id);
    let token = this.tokens.get(tokenId);
    const created = !token;
    if (!token) {
      token = new Sprite(Texture.WHITE);
      token.anchor.set(0.5);
      token.eventMode = 'dynamic';
      token.cursor = 'pointer';
      token.sortableChildren = false;
      this.setupSelectionOverlay(token);
      token.battlemapId = tokenId;
      this.attachTokenInteraction(token);
      this.tokens.set(tokenId, token);
    }

    const data = this.applyTokenOptions(token, {
      id: tokenId,
      textureUrl: textureUrl ?? rest.textureUrl,
      x,
      y,
      size,
      ...rest,
    });

    const eventName = created ? 'token:create' : 'token:update';
    this.emit(eventName, { id: tokenId, data: { ...data } });
    return token;
  }

  async updateToken(id, patch = {}) {
    await this.ready;
    const tokenId = String(id);
    const token = this.tokens.get(tokenId);
    if (!token) {
      return null;
    }
    const data = this.applyTokenOptions(token, patch);
    this.emit('token:update', { id: tokenId, data: { ...data } });
    return token;
  }

  async deleteSelection() {
    await this.ready;
    const ids = this.getSelection();
    if (!ids.length) {
      return [];
    }
    const removed = [];
    for (const id of ids) {
      const token = this.tokens.get(id);
      if (!token) {
        continue;
      }
      if (this.isLayerLocked(token.battlemapLayerId)) {
        continue;
      }
      await this.removeToken(id);
      removed.push(id);
    }
    return removed;
  }

  copySelection() {
    if (!this.selectedTokens || this.selectedTokens.size === 0) {
      this.clipboard = null;
      return { tokens: [] };
    }
    const tokens = Array.from(this.selectedTokens).map((token) => ({
      ...(token.battlemapData || {}),
    }));
    this.clipboard = { tokens };
    return { tokens: tokens.map((tokenData) => ({ ...tokenData })) };
  }

  async pasteAt(x, y) {
    await this.ready;
    if (!this.clipboard?.tokens || this.clipboard.tokens.length === 0) {
      return [];
    }
    let targetX = x;
    let targetY = y;
    if (typeof x === 'object' && x !== null) {
      targetX = x.x;
      targetY = x.y;
    }
    const clipboardTokens = this.clipboard.tokens.filter(Boolean);
    if (!clipboardTokens.length) {
      return [];
    }

    const validTokens = clipboardTokens.filter((token) => Number.isFinite(token?.x) && Number.isFinite(token?.y));
    const sourceTokens = validTokens.length > 0 ? validTokens : clipboardTokens;
    const count = sourceTokens.length;
    let centerX = 0;
    let centerY = 0;
    sourceTokens.forEach((token) => {
      centerX += Number(token.x) || 0;
      centerY += Number(token.y) || 0;
    });
    centerX /= count;
    centerY /= count;

    const offsetX = Number.isFinite(targetX) ? Number(targetX) - centerX : this.state.cellSize;
    const offsetY = Number.isFinite(targetY) ? Number(targetY) - centerY : this.state.cellSize;

    const created = [];
    const timestamp = Date.now();
    clipboardTokens.forEach((tokenData, index) => {
      if (!tokenData) {
        return;
      }
      const baseId = tokenData.id || `token-${timestamp}`;
      const newId = `${baseId}-copy-${timestamp}-${index}`;
      const data = {
        ...tokenData,
        id: newId,
        x: (Number(tokenData.x) || 0) + offsetX,
        y: (Number(tokenData.y) || 0) + offsetY,
      };
      this.addToken(data);
      created.push({ ...data });
    });

    this.setSelection(created.map((token) => token.id));
    this.emit('token:paste', { tokens: created.map((token) => ({ ...token })) });
    return created;
  }

  setTool(toolId) {
    this.activeTool = typeof toolId === 'string' && toolId.trim() !== '' ? toolId : 'select';
    const cursor = this.activeTool === 'select' ? 'pointer' : 'default';
    if (this.viewport) {
      this.viewport.cursor = this.activeTool === 'draw' ? 'crosshair' : 'default';
    }
    this.tokens.forEach((token) => {
      token.cursor = cursor;
    });
  }

  createLayer(options = {}) {
    const { id, type = 'custom', zIndex, visible = true, locked = false } = options;
    if (!id && id !== 0) {
      throw new Error('createLayer requiere un id');
    }
    const layerId = String(id);
    const meta = this.ensureLayer(layerId, {
      type,
      zIndex,
      visible,
      locked,
      sortableChildren: options.sortableChildren,
      eventMode: options.eventMode || 'static',
    });
    meta.locked = Boolean(locked);
    meta.visible = Boolean(visible);
    if (Number.isFinite(zIndex)) {
      this.setLayerZIndex(layerId, zIndex);
    }
    this.setLayerVisibility(layerId, meta.visible);
    return {
      id: meta.id,
      type: meta.type,
      zIndex: meta.zIndex,
      visible: meta.visible,
      locked: meta.locked,
    };
  }

  async addLight(light = {}) {
    await this.ready;
    if (light.id === undefined || light.id === null) {
      throw new Error('Las luces necesitan un id');
    }
    const lightId = String(light.id);
    let graphic = this.lights.get(lightId);
    if (!graphic) {
      graphic = new Graphics();
      graphic.eventMode = 'none';
      this.lights.set(lightId, graphic);
    }
    const layerId = light.layer || 'lights';
    if (!this.getLayer(layerId)) {
      this.ensureLayer(layerId, { type: 'lights', eventMode: 'none', sortableChildren: true });
    }
    const container = this.getLayerContainer(layerId, 'lights');
    if (container && graphic.parent !== container) {
      container.addChild(graphic);
    }

    const colorValue = normalizeColor(light.color, 0xffffaa);
    const opacity = Math.min(Math.max(Number(light.opacity ?? 0.6), 0), 1);
    const brightRadius = Math.max(0, Number(light.brightRadius ?? light.radius ?? 0));
    const dimRadius = Math.max(brightRadius, Number(light.dimRadius ?? brightRadius));

    graphic.clear();
    if (dimRadius > 0) {
      graphic.beginFill(colorValue, opacity * 0.35);
      graphic.drawCircle(0, 0, dimRadius);
      graphic.endFill();
    }
    if (brightRadius > 0) {
      graphic.beginFill(colorValue, opacity);
      graphic.drawCircle(0, 0, brightRadius);
      graphic.endFill();
    }
    graphic.position.set(Number(light.x) || 0, Number(light.y) || 0);
    graphic.alpha = 1;
    graphic.battlemapLightId = lightId;
    graphic.battlemapData = {
      id: lightId,
      x: Number(light.x) || 0,
      y: Number(light.y) || 0,
      brightRadius,
      dimRadius,
      color: light.color,
      opacity,
      layer: layerId,
    };
    this.emit('light:update', { id: lightId, data: { ...graphic.battlemapData } });
    return graphic;
  }

  async removeLight(id) {
    await this.ready;
    const lightId = String(id);
    const graphic = this.lights.get(lightId);
    if (!graphic) {
      return;
    }
    graphic.removeFromParent();
    graphic.destroy();
    this.lights.delete(lightId);
    this.emit('light:remove', { id: lightId });
  }

  async setTokenVision(id, vision = {}) {
    await this.ready;
    const token = this.tokens.get(String(id));
    if (!token) {
      return null;
    }
    const data = token.battlemapData || { id: token.battlemapId };
    data.vision = { ...(data.vision || {}), ...vision };
    token.battlemapData = data;
    this.emit('token:vision', { id: token.battlemapId, data: { ...data.vision } });
    return data.vision;
  }

  toggleFog(enabled, options = {}) {
    const visible = Boolean(enabled ?? options.visible ?? options.enabled);
    const colorOption = options.color !== undefined ? options.color : this.fogState.color;
    const opacityOption = options.opacity ?? options.alpha ?? this.fogState.opacity;
    this.fogState = {
      color: colorOption,
      opacity: opacityOption,
      visible,
    };
    this.refreshFog();
  }

  refreshFog() {
    if (!this.fogLayer) {
      return;
    }
    const visible = Boolean(this.fogState?.visible);
    if (!visible) {
      this.fogLayer.visible = false;
      this.fogLayer.clear();
      return;
    }
    const colorValue = normalizeColor(
      this.fogState?.color,
      FOG_DEFAULTS.color
    );
    const opacity = Math.min(
      Math.max(Number(this.fogState?.opacity ?? FOG_DEFAULTS.opacity), 0),
      1
    );
    this.fogLayer.visible = true;
    this.fogLayer.clear();
    this.fogLayer.beginFill(colorValue, opacity);
    this.fogLayer.drawRect(
      0,
      0,
      Math.max(this.state.worldWidth, MIN_WORLD_SIZE),
      Math.max(this.state.worldHeight, MIN_WORLD_SIZE)
    );
    this.fogLayer.endFill();
  }

  async removeToken(id) {
    await this.ready;
    const tokenId = String(id);
    const token = this.tokens.get(tokenId);
    if (!token) {
      return;
    }
    const wasSelected = this.selectedTokens.has(token);
    if (wasSelected) {
      this.deselectToken(token);
      this.emit('selection:change', this.getSelection());
    }
    const payload = {
      id: tokenId,
      data: token.battlemapData ? { ...token.battlemapData } : undefined,
    };
    if (token.selectionGraphic?.__isOverlay) {
      const overlay = token.selectionGraphic;
      this.detachResizeHandles(token);
      if (overlay.parent) {
        overlay.removeFromParent();
      }
      if (typeof overlay.destroy === 'function') {
        overlay.destroy({ children: true });
      }
      token.selectionGraphic = null;
    }
    token.removeFromParent();
    token.destroy({ children: true });
    this.tokens.delete(tokenId);
    this.emit('token:remove', payload);
  }

  getToken(id) {
    return this.tokens.get(String(id)) || null;
  }

  async centerOn(x, y, scale) {
    await this.ready;
    if (this.destroyed) {
      return;
    }
    if (typeof scale === 'number' && Number.isFinite(scale)) {
      this.viewport.setZoom(scale, true);
    }
    this.viewport.moveCenter(x, y);
  }

  resize() {
    if (this.destroyed || !this.viewport || !this.app) {
      return;
    }
    const renderer = this.app.renderer;
    if (!renderer) {
      return;
    }
    const rawWidth = Number(this.container.clientWidth);
    const rawHeight = Number(this.container.clientHeight);

    if (
      !Number.isFinite(rawWidth) ||
      !Number.isFinite(rawHeight) ||
      rawWidth <= 0 ||
      rawHeight <= 0
    ) {
      return;
    }

    const width = Math.max(rawWidth, MIN_WORLD_SIZE);
    const height = Math.max(rawHeight, MIN_WORLD_SIZE);

    const currentCenter = this.viewport.center;
    if (typeof renderer.resize === 'function') {
      renderer.resize(width, height);
    }
    this.viewport.resize(width, height, this.state.worldWidth, this.state.worldHeight);
    this.viewport.clamp({
      direction: 'all',
      top: 0,
      left: 0,
      right: this.state.worldWidth,
      bottom: this.state.worldHeight,
    });
    if (currentCenter) {
      this.viewport.moveCenter(currentCenter.x, currentCenter.y);
    }
    this.updatePlaceholderPosition();
  }

  clearSelection() {
    if (!this.selectedTokens || this.selectedTokens.size === 0) {
      return;
    }
    const previous = Array.from(this.selectedTokens);
    previous.forEach((sprite) => {
      this.deselectToken(sprite);
      const overlay = sprite?.selectionGraphic;
      if (overlay?.frameGraphic) {
        overlay.frameGraphic.clear();
      }
      if (Array.isArray(overlay?.handles)) {
        overlay.handles.forEach((handle) => {
          handle.clear();
          handle.visible = false;
        });
      }
    });
    this.emit('selection:change', []);
  }

  deselectToken(token) {
    if (!token || !this.selectedTokens.has(token)) {
      return;
    }
    this.selectedTokens.delete(token);
    this.detachResizeHandles(token);
    if (token.selectionGraphic) {
      token.selectionGraphic.visible = false;
    }
    if (Number.isFinite(token.baseZIndex)) {
      token.zIndex = token.baseZIndex;
    }
  }

  selectToken(token, options = {}) {
    if (!token) {
      return;
    }
    const additive = Boolean(options.additive);
    const toggle = Boolean(options.toggle);
    const alreadySelected = this.selectedTokens.has(token);

    if (!additive && !toggle) {
      this.clearSelection();
    }

    if (toggle && alreadySelected) {
      this.deselectToken(token);
      this.emit('selection:change', this.getSelection());
      return;
    }

    if (alreadySelected) {
      return;
    }

    this.selectedTokens.add(token);
    if (Number.isFinite(token.baseZIndex)) {
      token.zIndex = token.baseZIndex + TOKEN_SELECTION_Z_OFFSET;
    }
    this.updateSelectionGraphic(token);
    this.emit('selection:change', this.getSelection());
  }

  getSelection() {
    if (!this.selectedTokens || this.selectedTokens.size === 0) {
      return [];
    }
    return Array.from(this.selectedTokens).map((token) => token.battlemapId);
  }

  setSelection(ids = []) {
    const set = new Set((ids || []).map((value) => String(value)));
    this.clearSelection();
    set.forEach((id) => {
      const token = this.tokens.get(id);
      if (token) {
        this.selectToken(token, { additive: true });
      }
    });
  }

  setupSelectionOverlay(token) {
    if (!token) {
      return;
    }

    let overlay = token.selectionGraphic;

    if (overlay && !overlay.__isOverlay) {
      if (overlay.parent) {
        overlay.removeFromParent();
      }
      if (typeof overlay.destroy === 'function') {
        overlay.destroy({ children: true });
      }
      overlay = null;
    }

    if (!overlay) {
      overlay = new Container();
      overlay.visible = false;
      overlay.sortableChildren = false;
      overlay.eventMode = 'static';
      overlay.__isOverlay = true;

      const frame = new Graphics();
      frame.eventMode = 'none';
      overlay.addChild(frame);
      overlay.frameGraphic = frame;

      const handleDefinitions = [
        { key: 'topLeft', sx: -1, sy: -1, cursor: 'nwse-resize' },
        { key: 'topRight', sx: 1, sy: -1, cursor: 'nesw-resize' },
        { key: 'bottomRight', sx: 1, sy: 1, cursor: 'nwse-resize' },
        { key: 'bottomLeft', sx: -1, sy: 1, cursor: 'nesw-resize' },
      ];

      overlay.handles = handleDefinitions.map((definition) => {
        const handle = new Graphics();
        handle.__resizeMeta = definition;
        handle.visible = false;
        handle.eventMode = 'static';
        handle.cursor = definition.cursor;
        overlay.addChild(handle);
        return handle;
      });
    }

    overlay.followToken = token;
    if (overlay.parent !== this.overlayLayer && this.overlayLayer) {
      overlay.removeFromParent();
      this.overlayLayer.addChild(overlay);
    }

    token.selectionGraphic = overlay;
  }

  refreshSelectionOverlay(token) {
    const overlay = token?.selectionGraphic;
    const frameGraphic = overlay?.frameGraphic;
    if (!overlay || !frameGraphic || !token) {
      return;
    }

    const overlayParent = overlay.parent ?? this.overlayLayer;
    const tokenParent = token.parent;

    if (!overlayParent) {
      return;
    }

    let centerX = Number.isFinite(token?.x) ? token.x : 0;
    let centerY = Number.isFinite(token?.y) ? token.y : 0;

    if (
      overlayParent !== tokenParent &&
      typeof overlayParent.toLocal === 'function' &&
      tokenParent
    ) {
      const centerPoint = overlayParent.toLocal(token.position, tokenParent);
      centerX = centerPoint.x;
      centerY = centerPoint.y;
    }

    overlay.position.set(centerX, centerY);

    let width = Number(token?.width);
    let height = Number(token?.height);

    const needsConversion =
      overlayParent !== tokenParent &&
      typeof overlayParent.toLocal === 'function' &&
      tokenParent &&
      Number.isFinite(token?.x) &&
      Number.isFinite(token?.y);

    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      if (needsConversion) {
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const left = overlayParent.toLocal(
          new Point(token.x - halfWidth, token.y),
          tokenParent
        );
        const right = overlayParent.toLocal(
          new Point(token.x + halfWidth, token.y),
          tokenParent
        );
        const top = overlayParent.toLocal(
          new Point(token.x, token.y - halfHeight),
          tokenParent
        );
        const bottom = overlayParent.toLocal(
          new Point(token.x, token.y + halfHeight),
          tokenParent
        );
        width = Math.abs(right.x - left.x);
        height = Math.abs(bottom.y - top.y);
      }
    } else {
      const bounds = typeof token.getBounds === 'function' ? token.getBounds(false) : null;
      if (bounds) {
        const topLeft = overlayParent.toLocal(new Point(bounds.x, bounds.y));
        const bottomRight = overlayParent.toLocal(
          new Point(bounds.x + bounds.width, bounds.y + bounds.height)
        );
        width = Math.abs(bottomRight.x - topLeft.x);
        height = Math.abs(bottomRight.y - topLeft.y);
      }
    }

    width = Math.max(1, Number(width) || 0);
    height = Math.max(1, Number(height) || 0);

    frameGraphic.clear();

    if (typeof frameGraphic.setStrokeStyle === 'function') {
      frameGraphic.setStrokeStyle({ width: 2, color: SELECTION_COLOR, alpha: 0.9 });
    } else if (typeof frameGraphic.lineStyle === 'function') {
      frameGraphic.lineStyle({ width: 2, color: SELECTION_COLOR, alpha: 0.9 });
    }

    if (typeof frameGraphic.strokeRect === 'function') {
      frameGraphic.strokeRect(-width / 2, -height / 2, width, height);
    } else {
      frameGraphic.rect(-width / 2, -height / 2, width, height);
      if (typeof frameGraphic.stroke === 'function') {
        frameGraphic.stroke();
      }
    }

    const baseSize = Math.max(
      8,
      Math.min(28, Math.round((this.state.cellSize || 20) * 0.35))
    );

    if (Array.isArray(overlay.handles)) {
      overlay.handles.forEach((handle) => {
        handle.clear();
        handle.lineStyle({ width: 1, color: 0x000000, alpha: 0.35 });
        handle.beginFill(SELECTION_COLOR, 0.95);
        handle.drawRect(-baseSize / 2, -baseSize / 2, baseSize, baseSize);
        handle.endFill();
        const direction = handle.__resizeMeta;
        const offsetX = (width / 2) * (direction?.sx ?? 0);
        const offsetY = (height / 2) * (direction?.sy ?? 0);
        handle.position.set(offsetX, offsetY);
        handle.visible = true;
      });
    }
  }

  detachResizeHandles(token, options = {}) {
    const overlay = token?.selectionGraphic;
    if (!overlay?.handles) {
      return;
    }
    const { hideHandles = true } = options;

    overlay.handles.forEach((handle) => {
      if (handle.__pointerdownHandler) {
        handle.off('pointerdown', handle.__pointerdownHandler);
        handle.__pointerdownHandler = null;
      }
      if (hideHandles) {
        handle.visible = false;
      }
    });

    if (token?.__resizeState) {
      const stage = this.app?.stage;
      const { moveHandler, upHandler } = token.__resizeState;
      if (stage) {
        if (moveHandler) {
          stage.off('pointermove', moveHandler);
        }
        if (upHandler) {
          stage.off('pointerup', upHandler);
          stage.off('pointerupoutside', upHandler);
        }
      }
      token.__resizeState = null;
    }
  }

  attachResizeHandles(token) {
    const overlay = token?.selectionGraphic;
    if (!overlay?.handles) {
      return;
    }

    this.detachResizeHandles(token, { hideHandles: false });

    overlay.handles.forEach((handle) => {
      const pointerDown = (event) => this.startTokenResize(token, handle, event);
      handle.__pointerdownHandler = pointerDown;
      handle.on('pointerdown', pointerDown);
    });
  }

  startTokenResize(token, handle, event) {
    if (!token || !handle) {
      return;
    }
    event.stopPropagation();
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const stage = this.app?.stage;
    if (!stage) {
      return;
    }

    const pointerId =
      event.pointerId ?? event.data?.pointerId ?? event.data?.identifier ?? 0;

    const initialSize = Number(token.battlemapData?.size ?? token.width);

    const handleResizeMove = (moveEvent) => {
      const movePointerId =
        moveEvent.pointerId ?? moveEvent.data?.pointerId ?? moveEvent.data?.identifier ?? 0;
      if (movePointerId !== pointerId) {
        return;
      }
      this.resizeTokenWithPointer(token, moveEvent);
    };

    const stopResize = (endEvent) => {
      const endPointerId =
        endEvent.pointerId ?? endEvent.data?.pointerId ?? endEvent.data?.identifier ?? 0;
      if (endPointerId !== pointerId) {
        return;
      }
      stage.off('pointermove', handleResizeMove);
      stage.off('pointerup', stopResize);
      stage.off('pointerupoutside', stopResize);
      token.__resizeState = null;
      this.attachResizeHandles(token);
      const currentSize = Number(token.battlemapData?.size ?? token.width);
      if (!Number.isFinite(initialSize) || Math.abs(currentSize - initialSize) > 0.01) {
        this.emitTokenResize(token);
      }
    };

    stage.on('pointermove', handleResizeMove);
    stage.on('pointerup', stopResize);
    stage.on('pointerupoutside', stopResize);

    token.__resizeState = {
      pointerId,
      moveHandler: handleResizeMove,
      upHandler: stopResize,
      initialSize,
    };

    this.resizeTokenWithPointer(token, event);
  }

  resizeTokenWithPointer(token, event) {
    if (!token) {
      return;
    }

    if (!token.parent && !this.tokensLayer) {
      return;
    }

    const local = token.toLocal(event.global ?? event.data?.global ?? event.data);
    const halfWidth = Math.abs(local?.x ?? 0);
    const halfHeight = Math.abs(local?.y ?? 0);
    const nextSize = Math.max(halfWidth, halfHeight) * 2;
    const snappedSize = this.snapSizeValue(nextSize);

    if (this.applyTokenSize(token, snappedSize)) {
      this.refreshSelectionOverlay(token);
    }
  }

  snapSizeValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return Math.max(this.state.cellSize, 1);
    }
    const cellSize = Math.max(this.state.cellSize || DEFAULTS.cellSize, 1);
    const snapped = Math.round(numeric / cellSize) * cellSize;
    return Math.max(cellSize, snapped);
  }

  applyTokenSize(token, size) {
    const resolved = Math.max(this.state.cellSize || 1, Number(size) || 0);
    const current = Number(token.width) || 0;
    if (Math.abs(resolved - current) < 0.01) {
      return false;
    }

    token.width = resolved;
    token.height = resolved;
    token.hitArea = new Rectangle(-resolved / 2, -resolved / 2, resolved, resolved);

    if (!token.battlemapData) {
      token.battlemapData = { id: token.battlemapId };
    }
    token.battlemapData.size = resolved;
    return true;
  }

  emitTokenResize(token) {
    if (!token) {
      return;
    }

    const payload = {
      id: token.battlemapId,
      x: token.x,
      y: token.y,
      data: token.battlemapData
        ? { ...token.battlemapData, x: token.x, y: token.y }
        : undefined,
    };
    token.emit('battlemap:tokenResize', payload);
    this.emit('token:resize', payload);
  }

  attachTokenInteraction(token) {
    token.on('pointerdown', (event) => {
      event.stopPropagation();
      const originalEvent = event.data?.originalEvent || event.data?.nativeEvent;
      const additive = Boolean(
        originalEvent?.shiftKey || originalEvent?.ctrlKey || originalEvent?.metaKey
      );
      const toggle = Boolean(originalEvent?.ctrlKey || originalEvent?.metaKey);
      this.selectToken(token, { additive, toggle });

      if (this.isLayerLocked(token.battlemapLayerId) || this.activeTool !== 'select') {
        return;
      }

      if (this.viewport?.plugins) {
        this.viewport.plugins.pause('drag');
      }
      token.dragging = true;
      token.dragPointerId = event.pointerId;
      token.__dragStart = { x: token.x, y: token.y };
    });

    const handlePointerUp = (event) => {
      if (!token.dragging || token.dragPointerId !== event.pointerId) {
        return;
      }
      token.dragging = false;
      token.dragPointerId = null;
      this.snapToken(token);
      if (this.viewport?.plugins) {
        this.viewport.plugins.resume('drag');
      }
      const payload = {
        id: token.battlemapId,
        x: token.x,
        y: token.y,
        data: token.battlemapData
          ? { ...token.battlemapData, x: token.x, y: token.y }
          : undefined,
      };
      token.emit('battlemap:tokenDrop', payload);
      this.emit('token:move', payload);
    };

    token.on('pointerup', handlePointerUp);
    token.on('pointerupoutside', handlePointerUp);

    token.on('pointermove', (event) => {
      if (!token.dragging || token.dragPointerId !== event.pointerId) {
        return;
      }
      const parentLayer = token.parent || this.tokensLayer;
      const nextPosition = parentLayer.toLocal(event.global);
      token.position.set(nextPosition.x, nextPosition.y);
      this.updateSelectionGraphic(token);
    });
  }

  updateSelectionGraphic(token) {
    if (!token) {
      return;
    }
    this.setupSelectionOverlay(token);
    if (!token.selectionGraphic) {
      return;
    }

    const isSelected = this.selectedTokens.has(token);
    token.selectionGraphic.visible = isSelected;
    if (!isSelected) {
      this.detachResizeHandles(token);
      return;
    }

    this.refreshSelectionOverlay(token);
    this.attachResizeHandles(token);
  }

  snapToken(token) {
    const snappedX = this.snapValue(token.x, this.state.worldWidth);
    const snappedY = this.snapValue(token.y, this.state.worldHeight);
    // Aquí se realiza el snap del token al centro de la celda más cercana.
    token.position.set(snappedX, snappedY);
    this.updateSelectionGraphic(token);
  }

  snapValue(value, worldLimit) {
    const half = this.state.cellSize / 2;
    const snapped = Math.round((value - half) / this.state.cellSize) * this.state.cellSize + half;
    return Math.min(Math.max(snapped, half), Math.max(worldLimit - half, half));
  }

  getSnappedWorldPosition(screenX, screenY) {
    if (!this.viewport) {
      return null;
    }

    const point =
      typeof screenX === 'object' && screenX !== null
        ? { x: Number(screenX.x) || 0, y: Number(screenX.y) || 0 }
        : { x: Number(screenX) || 0, y: Number(screenY) || 0 };

    const world = this.viewport.toWorld(point.x, point.y);
    if (!world) {
      return null;
    }

    const snappedX = this.snapValue(world.x, this.state.worldWidth);
    const snappedY = this.snapValue(world.y, this.state.worldHeight);

    const cellSize = this.state.cellSize || DEFAULTS.cellSize;
    const half = cellSize / 2;
    const maxCellX = Math.max(Math.floor((this.state.worldWidth - half) / cellSize), 0);
    const maxCellY = Math.max(Math.floor((this.state.worldHeight - half) / cellSize), 0);

    const cellX = Math.min(Math.max(Math.round((snappedX - half) / cellSize), 0), maxCellX);
    const cellY = Math.min(Math.max(Math.round((snappedY - half) / cellSize), 0), maxCellY);

    return {
      x: snappedX,
      y: snappedY,
      cellX,
      cellY,
    };
  }

  getGridDimensions() {
    const columns = Number.isFinite(this.state.gridColumns)
      ? Math.max(1, Math.floor(this.state.gridColumns))
      : null;
    const rows = Number.isFinite(this.state.gridRows)
      ? Math.max(1, Math.floor(this.state.gridRows))
      : null;
    if (columns !== null && rows !== null) {
      return { columns, rows };
    }
    if (columns !== null) {
      return { columns, rows: columns };
    }
    if (rows !== null) {
      return { columns: rows, rows };
    }
    const cells = Number.isFinite(this.state.gridCells)
      ? Math.max(1, Math.floor(this.state.gridCells))
      : null;
    if (cells !== null) {
      return { columns: cells, rows: cells };
    }
    return { columns: null, rows: null };
  }

  getEffectiveCellSize() {
    const { columns, rows } = this.getGridDimensions();
    const worldWidth = Number.isFinite(this.state.worldWidth)
      ? this.state.worldWidth
      : 0;
    const worldHeight = Number.isFinite(this.state.worldHeight)
      ? this.state.worldHeight
      : 0;
    if (columns && worldWidth > 0) {
      return worldWidth / columns;
    }
    if (rows && worldHeight > 0) {
      return worldHeight / rows;
    }
    return this.state.cellSize || DEFAULTS.cellSize;
  }

  drawGrid() {
    if (!this.gridLayer) {
      return;
    }
    this.gridLayer.clear();
    if (!this.state.gridVisible) {
      return;
    }

    const cellSize = this.getEffectiveCellSize();
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      return;
    }

    this.state.cellSize = cellSize;

    const offsetX = Number.isFinite(this.state.gridOffsetX)
      ? this.state.gridOffsetX
      : 0;
    const offsetY = Number.isFinite(this.state.gridOffsetY)
      ? this.state.gridOffsetY
      : 0;
    const { columns, rows } = this.getGridDimensions();
    const worldWidth = Number.isFinite(this.state.worldWidth)
      ? this.state.worldWidth
      : 0;
    const worldHeight = Number.isFinite(this.state.worldHeight)
      ? this.state.worldHeight
      : 0;

    const usingMask = Boolean(this.gridLayer?.mask);
    const gridWidth =
      columns && cellSize > 0 ? columns * cellSize : worldWidth;
    const gridHeight =
      rows && cellSize > 0 ? rows * cellSize : worldHeight;

    const maskBounds = {
      left: 0,
      top: 0,
      right: worldWidth,
      bottom: worldHeight,
    };
    if (usingMask && this.backgroundMaskSprite) {
      const { x, y, width: w, height: h } = this.backgroundMaskSprite;
      maskBounds.left = Number.isFinite(x) ? x : 0;
      maskBounds.top = Number.isFinite(y) ? y : 0;
      maskBounds.right = maskBounds.left + (Number.isFinite(w) ? w : worldWidth);
      maskBounds.bottom = maskBounds.top + (Number.isFinite(h) ? h : worldHeight);
    }

    const gridBounds = {
      left: offsetX,
      top: offsetY,
      right: offsetX + gridWidth,
      bottom: offsetY + gridHeight,
    };

    const fallbackRight =
      columns && cellSize > 0 ? offsetX + columns * cellSize : worldWidth;
    const fallbackBottom =
      rows && cellSize > 0 ? offsetY + rows * cellSize : worldHeight;

    const epsilon = cellSize * 0.0001;

    this.gridLayer.setStrokeStyle({
      width: 1,
      color: this.state.gridColor,
      alpha: this.state.gridOpacity,
    });

    if (usingMask) {
      const left = Math.max(maskBounds.left, gridBounds.left);
      const top = Math.max(maskBounds.top, gridBounds.top);
      const right = Math.min(maskBounds.right, gridBounds.right);
      const bottom = Math.min(maskBounds.bottom, gridBounds.bottom);

      if (!(right > left && bottom > top)) {
        this.gridLayer.stroke();
        return;
      }

      let startX = offsetX;
      if (startX + epsilon < left) {
        const delta = left - startX;
        const steps = Math.ceil(delta / cellSize);
        startX = offsetX + steps * cellSize;
      }
      let lastVertical = null;
      for (let x = startX; x <= right + epsilon; x += cellSize) {
        if (x + epsilon < left || x - epsilon > right) {
          continue;
        }
        this.gridLayer.moveTo(x, top);
        this.gridLayer.lineTo(x, bottom);
        lastVertical = x;
      }
      if (
        Number.isFinite(right) &&
        (lastVertical === null || Math.abs(right - lastVertical) > epsilon)
      ) {
        this.gridLayer.moveTo(right, top);
        this.gridLayer.lineTo(right, bottom);
      }

      let startY = offsetY;
      if (startY + epsilon < top) {
        const delta = top - startY;
        const steps = Math.ceil(delta / cellSize);
        startY = offsetY + steps * cellSize;
      }
      let lastHorizontal = null;
      for (let y = startY; y <= bottom + epsilon; y += cellSize) {
        if (y + epsilon < top || y - epsilon > bottom) {
          continue;
        }
        this.gridLayer.moveTo(left, y);
        this.gridLayer.lineTo(right, y);
        lastHorizontal = y;
      }
      if (
        Number.isFinite(bottom) &&
        (lastHorizontal === null || Math.abs(bottom - lastHorizontal) > epsilon)
      ) {
        this.gridLayer.moveTo(left, bottom);
        this.gridLayer.lineTo(right, bottom);
      }
    } else {
      const left = 0;
      const top = 0;
      const right = fallbackRight;
      const bottom = fallbackBottom;

      let lastVertical = null;
      for (let x = offsetX; x <= right + epsilon; x += cellSize) {
        this.gridLayer.moveTo(x, top);
        this.gridLayer.lineTo(x, worldHeight);
        lastVertical = x;
      }
      if (
        Number.isFinite(right) &&
        (lastVertical === null || Math.abs(right - lastVertical) > epsilon)
      ) {
        this.gridLayer.moveTo(right, top);
        this.gridLayer.lineTo(right, worldHeight);
      }

      let lastHorizontal = null;
      for (let y = offsetY; y <= bottom + epsilon; y += cellSize) {
        this.gridLayer.moveTo(left, y);
        this.gridLayer.lineTo(worldWidth, y);
        lastHorizontal = y;
      }
      if (
        Number.isFinite(bottom) &&
        (lastHorizontal === null || Math.abs(bottom - lastHorizontal) > epsilon)
      ) {
        this.gridLayer.moveTo(left, bottom);
        this.gridLayer.lineTo(worldWidth, bottom);
      }
    }

    this.gridLayer.stroke();
  }

  ensurePlaceholder() {
    if (this.destroyed || !this.backgroundLayer) {
      return;
    }
    if (this.placeholderGraphic) {
      return;
    }
    const graphic = new Graphics();
    graphic.alpha = 0.6;
    graphic.lineStyle({ width: 3, color: 0x555555, alpha: 0.8 });
    graphic.beginFill(0x2d2d2d, 0.9);
    graphic.drawRoundedRect(-100, -60, 200, 120, 16);
    graphic.endFill();
    graphic.moveTo(-100, 0);
    graphic.lineTo(100, 0);
    graphic.moveTo(0, -60);
    graphic.lineTo(0, 60);
    graphic.eventMode = 'none';
    this.placeholderGraphic = graphic;
    this.backgroundLayer.addChild(graphic);
    this.updatePlaceholderPosition();
  }

  hidePlaceholder() {
    if (!this.placeholderGraphic) {
      return;
    }
    this.placeholderGraphic.removeFromParent();
    this.placeholderGraphic.destroy();
    this.placeholderGraphic = null;
  }

  updatePlaceholderPosition() {
    if (!this.placeholderGraphic) {
      return;
    }
    const centerX = (this.state.worldWidth || MIN_WORLD_SIZE) / 2;
    const centerY = (this.state.worldHeight || MIN_WORLD_SIZE) / 2;
    this.placeholderGraphic.position.set(centerX, centerY);
  }

  updateViewportHitArea() {
    if (!this.viewport) {
      return;
    }
    const bounds = new Rectangle(
      0,
      0,
      Math.max(this.state.worldWidth, MIN_WORLD_SIZE),
      Math.max(this.state.worldHeight, MIN_WORLD_SIZE)
    );
    this.viewport.hitArea = bounds;
    if (this.gridLayer) {
      this.gridLayer.hitArea = bounds;
    }
  }

  async loadTexture(url) {
    if (!url) {
      return Texture.WHITE;
    }
    if (!this.textureCache.has(url)) {
      const promise = Assets.load({ src: url, data: { crossOrigin: 'anonymous' } })
        .then((resource) => {
          if (resource instanceof Texture) {
            return resource;
          }
          if (resource?.texture instanceof Texture) {
            return resource.texture;
          }
          return Texture.from(url);
        })
        .catch((error) => {
          this.textureCache.delete(url);
          throw error;
        });
      this.textureCache.set(url, promise);
    }
    return this.textureCache.get(url);
  }

  destroy() {
    if (this.destroyPromise) {
      return this.destroyPromise;
    }

    this.destroyed = true;

    const cleanup = () => {
      if (this.cleanupDone) {
        return;
      }
      this.cleanupDone = true;

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      this.tokens.forEach((token) => {
        token.removeFromParent();
        token.destroy({ children: true });
      });
      this.tokens.clear();
      this.selectedTokens.clear();
      this.clipboard = null;
      this.events.clear();
      this.lights.forEach((graphic) => {
        if (graphic) {
          graphic.removeFromParent();
          graphic.destroy();
        }
      });
      this.lights.clear();
      this.textureCache.clear();
      if (this.viewport) {
        this.viewport.destroy({ children: true });
        this.viewport = null;
      }
      if (this.backgroundLayer) {
        this.hidePlaceholder();
        this.backgroundLayer.destroy({ children: true });
        this.backgroundLayer = null;
      }
      this.backgroundSprite = null;
      this.backgroundMaskSprite = null;
      if (this.gridLayer) {
        this.gridLayer.destroy();
        this.gridLayer = null;
      }
      if (this.tokensLayer) {
        this.tokensLayer.destroy({ children: true });
        this.tokensLayer = null;
      }
      if (this.lightsLayer) {
        this.lightsLayer.destroy({ children: true });
        this.lightsLayer = null;
      }
      if (this.overlayLayer) {
        this.overlayLayer.destroy({ children: true });
        this.overlayLayer = null;
      }
      if (this.fogLayer) {
        this.fogLayer.destroy();
        this.fogLayer = null;
      }
      this.layers.clear();
      const canvas = this.canvas;
      if (canvas?.parentNode === this.container) {
        this.container.removeChild(canvas);
      }
      this.canvas = null;
      this.placeholderGraphic = null;
      if (this.app?.destroy) {
        try {
          this.app.destroy();
        } catch (error) {
          console.warn('[PixiBattleMap] Error al destruir la aplicación.', error);
        }
      }
      this.app = null;
    };

    this.destroyPromise = this.ready
      .catch((error) => {
        console.warn('[PixiBattleMap] Error esperando ready durante destroy.', error);
      })
      .finally(() => {
        cleanup();
      });

    return this.destroyPromise;
  }
}
