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
  Text,
} from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import TokenSprite from './TokenSprite';

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
const MIN_TOKEN_CELLS = 0.25;
const MAX_TOKEN_CELLS = 10;
const TOKEN_CYCLE_SIZES = [1, 2, 3];
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

function getSpriteLocalSize(sprite) {
  if (!sprite) {
    return { width: 0, height: 0 };
  }

  if (typeof sprite.getLocalSize === 'function') {
    return sprite.getLocalSize();
  }

  const texture = sprite.texture;
  const scaleX = Math.abs(sprite.scale?.x ?? 1);
  const scaleY = Math.abs(sprite.scale?.y ?? 1);

  let width = Number.isFinite(sprite.width) && scaleX > 0 ? sprite.width / scaleX : 0;
  let height = Number.isFinite(sprite.height) && scaleY > 0 ? sprite.height / scaleY : 0;

  if (!Number.isFinite(width) || width <= 0) {
    width = texture?.orig?.width ?? texture?.width ?? 0;
  }
  if (!Number.isFinite(height) || height <= 0) {
    height = texture?.orig?.height ?? texture?.height ?? 0;
  }

  if (!Number.isFinite(width) || width <= 0) {
    width = Math.abs(sprite.width ?? 0);
  }
  if (!Number.isFinite(height) || height <= 0) {
    height = Math.abs(sprite.height ?? 0);
  }

  return {
    width: Number.isFinite(width) && width > 0 ? width : 0,
    height: Number.isFinite(height) && height > 0 ? height : 0,
  };
}

function updateSpriteHitArea(sprite) {
  if (!sprite) {
    return;
  }

  if (typeof sprite.updateHitArea === 'function') {
    sprite.updateHitArea();
    return;
  }

  const { width, height } = getSpriteLocalSize(sprite);
  if (!width || !height) {
    sprite.hitArea = null;
    return;
  }

  const anchorX = sprite.anchor?.x ?? 0;
  const anchorY = sprite.anchor?.y ?? 0;
  const originX = -anchorX * width;
  const originY = -anchorY * height;

  sprite.hitArea = new Rectangle(originX, originY, width, height);
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

    this.tiles = new Map();
    this.tokens = new Map();
    this.lines = new Map();
    this.texts = new Map();
    this.walls = new Map();
    this.doorIcons = new Map();
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
    this.measureLayer = null;
    this.measureGraphics = null;
    this.measureLabel = null;
    this.measureConfig = {
      shape: 'line',
      snap: 'center',
      visible: true,
      rule: 'chebyshev',
      unitValue: 5,
      unitLabel: 'ft',
    };
    this.measureState = {
      active: false,
      pointerId: null,
      start: null,
      end: null,
    };

    this.handleViewportPointerDown = this.handleViewportPointerDown.bind(this);
    this.handleViewportPointerMove = this.handleViewportPointerMove.bind(this);
    this.handleViewportPointerUp = this.handleViewportPointerUp.bind(this);

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
    this.tilesLayer = new Container();
    this.tilesLayer.sortableChildren = true;
    this.tilesLayer.eventMode = 'static';
    this.gridLayer = new Graphics();
    this.linesLayer = new Container();
    this.linesLayer.sortableChildren = true;
    this.linesLayer.eventMode = 'static';
    this.textsLayer = new Container();
    this.textsLayer.sortableChildren = true;
    this.textsLayer.eventMode = 'static';
    this.tokensLayer = new Container();
    this.tokensLayer.sortableChildren = true;
    this.tokensLayer.eventMode = 'static';
    this.tokensLayer.cursor = 'pointer';

    this.wallsLayer = new Container();
    this.wallsLayer.sortableChildren = true;
    this.wallsLayer.eventMode = 'static';
    this.doorLayer = new Container();
    this.doorLayer.sortableChildren = true;
    this.doorLayer.eventMode = 'static';
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
    this.registerLayer('tiles', this.tilesLayer, {
      type: 'tiles',
      locked: false,
      sortableChildren: true,
      eventMode: 'static',
      zIndex: 10,
    });
    this.registerLayer('grid', this.gridLayer, {
      type: 'grid',
      locked: true,
      eventMode: 'static',
      zIndex: 5,
    });
    this.registerLayer('lines', this.linesLayer, {
      type: 'lines',
      locked: false,
      sortableChildren: true,
      eventMode: 'static',
      zIndex: 15,
    });
    this.registerLayer('texts', this.textsLayer, {
      type: 'texts',
      locked: false,
      sortableChildren: true,
      eventMode: 'static',
      zIndex: 18,
    });
    this.registerLayer('tokens', this.tokensLayer, {
      type: 'tokens',
      locked: false,
      sortableChildren: true,
      eventMode: 'static',
      zIndex: 20,
      cursor: 'pointer',
    });
    this.registerLayer('walls', this.wallsLayer, {
      type: 'walls',
      locked: false,
      sortableChildren: true,
      eventMode: 'static',
      zIndex: 25,
    });
    this.registerLayer('doors', this.doorLayer, {
      type: 'doors',
      locked: false,
      sortableChildren: true,
      eventMode: 'static',
      zIndex: 30,
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

    this.measureLayer = new Container();
    this.measureLayer.eventMode = 'none';
    this.measureLayer.sortableChildren = false;
    this.measureLayer.visible = false;
    this.overlayLayer.addChild(this.measureLayer);
    this.measureGraphics = new Graphics();
    this.measureGraphics.eventMode = 'none';
    this.measureLayer.addChild(this.measureGraphics);
    this.measureLabel = new Text({
      text: '',
      style: {
        fill: '#ffffff',
        fontSize: 16,
        stroke: '#000000',
        strokeThickness: 4,
      },
    });
    if (this.measureLabel?.anchor) {
      this.measureLabel.anchor.set(0, 0);
    }
    this.measureLabel.visible = false;
    this.measureLayer.addChild(this.measureLabel);

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

    this.viewport.on('pointerdown', this.handleViewportPointerDown);
    this.viewport.on('pointermove', this.handleViewportPointerMove);
    this.viewport.on('pointerup', this.handleViewportPointerUp);
    this.viewport.on('pointerupoutside', this.handleViewportPointerUp);
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
    this.updateMeasureGraphics();
    this.tokens.forEach((token) => this.updateSelectionGraphic(token));
  }

  applyTokenOptions(token, options = {}) {
    if (!token) {
      return null;
    }

    const current = token.battlemapData || { id: token.battlemapId };
    const next = { ...current };
    const cellSize = this.getCellSize();
    const minPixelSize = cellSize * MIN_TOKEN_CELLS;
    const maxPixelSize = cellSize * MAX_TOKEN_CELLS;

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
      clampMin: minPixelSize,
      clampMax: maxPixelSize,
    });
    assignNumber('pixelSize', options.pixelSize, {
      clampMin: minPixelSize,
      clampMax: maxPixelSize,
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
    if (options.color !== undefined) {
      next.color = options.color;
    }
    if (options.customName !== undefined) {
      next.customName = options.customName;
      next.metadata = { ...(next.metadata || {}), customName: options.customName };
    }
    if (options.name !== undefined) {
      next.name = options.name;
      next.metadata = { ...(next.metadata || {}), name: options.name };
    }
    if (options.showName !== undefined) {
      next.showName = Boolean(options.showName);
      next.metadata = { ...(next.metadata || {}), showName: Boolean(options.showName) };
    }
    if (options.tokenSheetId !== undefined) {
      next.tokenSheetId = options.tokenSheetId;
      next.metadata = { ...(next.metadata || {}), tokenSheetId: options.tokenSheetId };
    }
    if (options.barsVisibility !== undefined) {
      next.metadata = { ...(next.metadata || {}), barsVisibility: options.barsVisibility };
    }
    if (options.controlledBy !== undefined) {
      next.metadata = { ...(next.metadata || {}), controlledBy: options.controlledBy };
    }
    if (options.enemyId !== undefined) {
      next.metadata = { ...(next.metadata || {}), enemyId: options.enemyId };
    }
    if (options.estados !== undefined) {
      const estadosList = Array.isArray(options.estados)
        ? options.estados.filter((estado) => estado !== undefined && estado !== null)
        : [];
      next.estados = estadosList;
      next.metadata = { ...(next.metadata || {}), estados: estadosList };
    }
    if (options.auraRadius !== undefined) {
      assignNumber('auraRadius', options.auraRadius, {});
    }
    if (options.auraShape !== undefined) {
      next.auraShape = options.auraShape;
    }
    if (options.auraColor !== undefined) {
      next.auraColor = options.auraColor;
    }
    if (options.auraOpacity !== undefined) {
      assignNumber('auraOpacity', options.auraOpacity, { clampMin: 0, clampMax: 1 });
    }
    if (options.vision !== undefined) {
      next.vision = options.vision;
    }
    if (options.name !== undefined) {
      next.name = options.name;
    }

    if (options.sizeCells !== undefined || options.cells !== undefined || options.gridSize !== undefined) {
      const cellsCandidate =
        options.sizeCells ?? options.cells ?? options.gridSize;
      next.sizeCells = this.clampSizeCells(cellsCandidate);
    }

    if (next.x === undefined) next.x = 0;
    if (next.y === undefined) next.y = 0;

    let resolvedCells = Number(next.sizeCells);
    if (!Number.isFinite(resolvedCells) || resolvedCells <= 0) {
      const pixelCandidate = Number(next.pixelSize ?? next.size);
      if (Number.isFinite(pixelCandidate) && pixelCandidate > 0) {
        resolvedCells = pixelCandidate / cellSize;
      } else {
        resolvedCells = this.clampSizeCells(current.sizeCells ?? 1);
      }
    }
    resolvedCells = this.clampSizeCells(resolvedCells);
    const resolvedPixels = resolvedCells * cellSize;
    next.sizeCells = resolvedCells;
    next.pixelSize = resolvedPixels;
    next.size = resolvedPixels;
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

    if (typeof token.applyBattlemapData === 'function') {
      const maybePromise = token.applyBattlemapData(next, {
        loader: (url) => this.loadTexture(url),
        cellSize,
      });
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.catch((error) => {
          console.error('[PixiBattleMap] Error al aplicar datos del token:', error);
        });
      }
    } else {
      token.position.set(next.x, next.y);

      this.applyTokenSize(token, next.sizeCells, {
        isCells: true,
        updateData: next,
        force: true,
      });

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

    if (typeof token.applyBattlemapData !== 'function') {
      if (next.textureUrl && next.textureUrl !== token.__textureUrl) {
        token.__textureUrl = next.textureUrl;
        this.loadTexture(next.textureUrl)
          .then((texture) => {
            if (this.tokens.get(token.battlemapId) === token && !this.destroyed) {
              token.texture = texture;
              this.applyTokenSize(token, token.battlemapData?.sizeCells, {
                isCells: true,
              });
              this.updateSelectionGraphic(token);
            }
          })
          .catch((error) => {
            console.warn('[PixiBattleMap] No se pudo cargar la textura del token.', error);
          });
      } else if (!next.textureUrl) {
        token.__textureUrl = null;
        token.texture = Texture.WHITE;
      }
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
      token = new TokenSprite({ battlemap: this, id: tokenId, cellSize: this.getCellSize() });
      token.eventMode = 'dynamic';
      token.cursor = 'pointer';
      token.sortableChildren = true;
      this.setupSelectionOverlay(token);
      token.battlemapId = tokenId;
      this.attachTokenInteraction(token);
      this._attachTokenUiListeners(token);
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
    this.activeTool =
      typeof toolId === 'string' && toolId.trim() !== '' ? toolId : 'select';
    if (this.activeTool !== 'measure') {
      this.cancelMeasure();
    }
    let cursor = 'default';
    if (this.activeTool === 'select' || this.activeTool === 'target') {
      cursor = 'pointer';
    } else if (this.activeTool === 'measure') {
      cursor = 'crosshair';
    }
    if (this.viewport) {
      this.viewport.cursor =
        this.activeTool === 'draw' || this.activeTool === 'measure'
          ? 'crosshair'
          : 'default';
    }
    this.tokens.forEach((token) => {
      token.cursor = cursor;
    });
  }

  async setMeasureOptions(options = {}) {
    await this.ready;
    if (this.destroyed) {
      return;
    }

    const allowedShapes = ['line', 'square', 'circle', 'cone', 'beam'];
    const allowedSnaps = ['center', 'corner', 'free'];
    const allowedRules = ['chebyshev', 'manhattan', 'euclidean', '5105'];

    const next = { ...(this.measureConfig || {}) };
    let changed = false;

    if (options.shape !== undefined) {
      const normalized = String(options.shape || 'line').toLowerCase();
      if (allowedShapes.includes(normalized)) {
        next.shape = normalized;
        changed = true;
      }
    }

    if (options.snap !== undefined) {
      const normalized = String(options.snap || 'center').toLowerCase();
      if (allowedSnaps.includes(normalized)) {
        next.snap = normalized;
        changed = true;
      }
    }

    if (options.rule !== undefined) {
      const normalized = String(options.rule || 'chebyshev').toLowerCase();
      if (allowedRules.includes(normalized)) {
        next.rule = normalized;
        changed = true;
      }
    }

    if (options.visible !== undefined) {
      const visible = Boolean(options.visible);
      if (visible !== Boolean(next.visible)) {
        next.visible = visible;
        changed = true;
      }
    }

    if (options.unitValue !== undefined) {
      const numeric = Number(options.unitValue);
      if (Number.isFinite(numeric) && numeric > 0 && numeric !== next.unitValue) {
        next.unitValue = numeric;
        changed = true;
      }
    }

    if (options.unitLabel !== undefined) {
      const label = String(options.unitLabel || '').trim();
      if (label !== next.unitLabel) {
        next.unitLabel = label;
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    this.measureConfig = next;
    this.updateMeasureGraphics();
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

  highlightTokenDamage(id, options = {}) {
    const token = this.tokens.get(String(id));
    if (!token || typeof token.highlightDamage !== 'function') {
      return false;
    }
    token.highlightDamage(options);
    return true;
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
    if (typeof token.setSelected === 'function') {
      token.setSelected(false);
    }
  }

  selectToken(token, options = {}) {
    if (!token) {
      return;
    }
    const additive = Boolean(options.additive);
    const toggle = Boolean(options.toggle);

    if (!additive && !toggle) {
      this.clearSelection();
    }

    let alreadySelected = this.selectedTokens.has(token);

    if (toggle && alreadySelected) {
      this.deselectToken(token);
      this.emit('selection:change', this.getSelection());
      return;
    }

    if (!alreadySelected) {
      this.selectedTokens.add(token);
      if (typeof token.setSelected === 'function') {
        token.setSelected(true);
      }
    }
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

      const sizeLabel = new Text('', {
        fontFamily: 'sans-serif',
        fontSize: 14,
        fill: 0xffffff,
        align: 'center',
      });
      sizeLabel.anchor.set(0.5, 1);
      sizeLabel.eventMode = 'none';
      sizeLabel.visible = false;
      overlay.addChild(sizeLabel);
      overlay.sizeLabel = sizeLabel;
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

    if (overlay.sizeLabel) {
      const sizeCells = this.getTokenSizeCells(token);
      overlay.sizeLabel.visible = true;
      overlay.sizeLabel.text = this.getSizeLabel(sizeCells);
      overlay.sizeLabel.position.set(0, -height / 2 - baseSize * 0.8);
      overlay.sizeLabel.alpha = 0.95;
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

    if (hideHandles && overlay.sizeLabel) {
      overlay.sizeLabel.visible = false;
    }

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
      const pointerDown = (event) => {
        const detail =
          event?.data?.originalEvent?.detail ?? event?.data?.nativeEvent?.detail;
        if (detail >= 2) {
          event.stopPropagation();
          if (typeof event.preventDefault === 'function') {
            event.preventDefault();
          }
          this.cycleTokenSize(token);
          return;
        }
        this.startTokenResize(token, handle, event);
      };
      handle.__pointerdownHandler = pointerDown;
      handle.on('pointerdown', pointerDown);
    });
  }

  cycleTokenSize(token) {
    if (!token) {
      return;
    }
    const currentCells = this.getTokenSizeCells(token);
    const currentIndex = TOKEN_CYCLE_SIZES.findIndex(
      (size) => Math.abs(size - currentCells) < 0.01
    );
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % TOKEN_CYCLE_SIZES.length;
    const nextCells = TOKEN_CYCLE_SIZES[nextIndex];
    const changed = this.applyTokenSize(token, nextCells, {
      isCells: true,
      force: true,
    });
    if (changed) {
      this.emitTokenResize(token);
    }
    this.snapToken(token);
    this.refreshSelectionOverlay(token);
  }

  resizeSelection(options = {}) {
    const selected = Array.from(this.selectedTokens || []);
    if (selected.length === 0) {
      return [];
    }

    let params = options;
    if (typeof options === 'number') {
      params = { deltaCells: options };
    } else if (!options || typeof options !== 'object') {
      params = {};
    }

    const {
      deltaCells,
      deltaPixels,
      sizeCells,
      sizePixels,
      disableSnap = false,
      force = false,
    } = params;

    const cellSize = this.getCellSize();
    const results = [];

    selected.forEach((token) => {
      if (!token || this.isLayerLocked(token.battlemapLayerId)) {
        return;
      }

      const currentCells = this.getTokenSizeCells(token);
      let targetCells;

      if (Number.isFinite(sizeCells)) {
        targetCells = Number(sizeCells);
      } else if (Number.isFinite(sizePixels)) {
        targetCells = Number(sizePixels) / cellSize;
      } else {
        let deltaTotal = 0;
        if (Number.isFinite(deltaCells)) {
          deltaTotal += Number(deltaCells);
        }
        if (Number.isFinite(deltaPixels)) {
          deltaTotal += Number(deltaPixels) / cellSize;
        }
        if (deltaTotal === 0) {
          return;
        }
        targetCells = currentCells + deltaTotal;
      }

      if (!Number.isFinite(targetCells)) {
        return;
      }

      const nextCells = disableSnap
        ? this.clampSizeCells(targetCells)
        : this.snapSizeCells(targetCells);

      const changed = this.applyTokenSize(token, nextCells, {
        isCells: true,
        force,
      });

      if (!changed && !force) {
        return;
      }

      this.snapToken(token);
      this.refreshSelectionOverlay(token);
      this.emitTokenResize(token);

      results.push({
        id: token.battlemapId,
        sizeCells: nextCells,
        sizePixels: nextCells * cellSize,
      });
    });

    return results;
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

    if (this.viewport?.plugins) {
      this.viewport.plugins.pause('drag');
    }

    const pointerId =
      event.pointerId ?? event.data?.pointerId ?? event.data?.identifier ?? 0;

    const cellSize = this.getCellSize();
    const rawInitialCells = this.getTokenSizeCells(token);
    const initialSizeCells = Number.isFinite(rawInitialCells)
      ? this.clampSizeCells(rawInitialCells)
      : null;
    const resolvedInitialCells =
      initialSizeCells ?? this.snapSizeCells(rawInitialCells ?? MIN_TOKEN_CELLS);
    const initialPixelSize = resolvedInitialCells * cellSize;
    const initialSnappedCells = this.snapSizeCells(resolvedInitialCells);
    const initialSnappedSize = initialSnappedCells * cellSize;

    const globalPoint =
      event.global ?? event.data?.global ?? event.data ?? new Point(0, 0);
    const resolvedGlobal = {
      x: Number(globalPoint?.x) || 0,
      y: Number(globalPoint?.y) || 0,
    };

    const viewport = this.viewport;
    const worldPoint = viewport
      ? viewport.toWorld(resolvedGlobal.x, resolvedGlobal.y)
      : resolvedGlobal;
    const resolvedWorld = {
      x: Number(worldPoint?.x) || resolvedGlobal.x,
      y: Number(worldPoint?.y) || resolvedGlobal.y,
    };

    const parent = token.parent || this.tokensLayer || viewport;
    let parentLocal = { ...resolvedWorld };
    if (parent && typeof parent.toLocal === 'function' && parent !== viewport) {
      const localPoint = parent.toLocal(resolvedWorld, viewport);
      parentLocal = {
        x: Number(localPoint?.x) || resolvedWorld.x,
        y: Number(localPoint?.y) || resolvedWorld.y,
      };
    }

    const localOffset = {
      x: parentLocal.x - token.x,
      y: parentLocal.y - token.y,
    };

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
      const state = token.__resizeState;
      token.__resizeState = null;
      this.snapToken(token);
      this.attachResizeHandles(token);
      if (this.viewport?.plugins) {
        this.viewport.plugins.resume('drag');
      }
      const currentCells = this.getTokenSizeCells(token);
      const snappedCurrent = this.snapSizeCells(currentCells);
      const initialSnapped = state?.initialSnappedCells ?? this.snapSizeCells(state?.initialSizeCells ?? currentCells);
      if (
        !Number.isFinite(initialSnapped) ||
        Math.abs((state?.lastSnappedCells ?? snappedCurrent) - initialSnapped) > 0.01
      ) {
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
      initialSize: initialPixelSize,
      initialSizeCells: resolvedInitialCells,
      initialHalfSize: initialPixelSize / 2,
      initialSnappedSize,
      initialSnappedCells,
      initialWorld: resolvedWorld,
      initialParentLocal: parentLocal,
      initialLocal: localOffset,
      lastSnappedSize: initialPixelSize,
      lastSnappedCells: resolvedInitialCells,
      handleDirection: handle?.__resizeMeta ?? null,
    };
  }

  resizeTokenWithPointer(token, event) {
    if (!token) {
      return;
    }

    const state = token.__resizeState;
    if (!state) {
      return;
    }

    if (!token.parent && !this.tokensLayer) {
      return;
    }

    const globalPoint =
      event.global ?? event.data?.global ?? event.data ?? new Point(0, 0);
    const resolvedGlobal = {
      x: Number(globalPoint?.x) || 0,
      y: Number(globalPoint?.y) || 0,
    };

    const viewport = this.viewport;
    const worldPoint = viewport
      ? viewport.toWorld(resolvedGlobal.x, resolvedGlobal.y)
      : resolvedGlobal;
    const resolvedWorld = {
      x: Number(worldPoint?.x) || resolvedGlobal.x,
      y: Number(worldPoint?.y) || resolvedGlobal.y,
    };

    const parent = token.parent || this.tokensLayer || viewport;
    let parentLocal = { ...resolvedWorld };
    if (parent && typeof parent.toLocal === 'function' && parent !== viewport) {
      const localPoint = parent.toLocal(resolvedWorld, viewport);
      parentLocal = {
        x: Number(localPoint?.x) || resolvedWorld.x,
        y: Number(localPoint?.y) || resolvedWorld.y,
      };
    }

    const startParentLocal = state.initialParentLocal || {
      x: (state.initialLocal?.x ?? 0) + token.x,
      y: (state.initialLocal?.y ?? 0) + token.y,
    };

    const delta = {
      x: parentLocal.x - (startParentLocal.x ?? 0),
      y: parentLocal.y - (startParentLocal.y ?? 0),
    };

    const direction = state.handleDirection || { sx: 0, sy: 0 };
    const components = [];
    if (direction.sx) {
      components.push((delta.x || 0) * direction.sx);
    }
    if (direction.sy) {
      components.push((delta.y || 0) * direction.sy);
    }
    if (components.length === 0) {
      components.push(delta.x || 0, delta.y || 0);
    }
    let projectedDelta = components[0] || 0;
    for (let i = 1; i < components.length; i += 1) {
      const value = components[i];
      if (Math.abs(value) > Math.abs(projectedDelta)) {
        projectedDelta = value;
      }
    }

    const hasMovement = Math.abs(projectedDelta) > 0.0001;
    if (!hasMovement) {
      return;
    }

    const cellSize = this.getCellSize();
    const rawInitialHalf = Number(state.initialHalfSize);
    const derivedInitialHalf = Number(state.initialSize) / 2;
    const snappedInitialHalf = Number(state.initialSnappedSize) / 2;
    const safeInitialHalf = (() => {
      if (Number.isFinite(rawInitialHalf) && rawInitialHalf > 0) {
        return rawInitialHalf;
      }
      if (Number.isFinite(derivedInitialHalf) && derivedInitialHalf > 0) {
        return derivedInitialHalf;
      }
      if (Number.isFinite(snappedInitialHalf) && snappedInitialHalf > 0) {
        return snappedInitialHalf;
      }
      return cellSize / 2;
    })();
    const minHalf = (MIN_TOKEN_CELLS * cellSize) / 2;
    const maxHalf = (MAX_TOKEN_CELLS * cellSize) / 2;
    let nextHalf = safeInitialHalf + projectedDelta;
    nextHalf = Math.min(Math.max(nextHalf, minHalf), maxHalf);
    const nextCellsRaw = (nextHalf * 2) / cellSize;

    const originalEvent = event?.data?.originalEvent || event?.data?.nativeEvent || event;
    const snapRequested = Boolean(originalEvent?.shiftKey);
    const forceFreeResize = Boolean(originalEvent?.altKey);
    const disableSnap = forceFreeResize || !snapRequested;

    let snappedCells = this.snapSizeCells(nextCellsRaw, { disableSnap });
    if (snapRequested && !disableSnap) {
      const lastCells = state.lastSnappedCells ?? state.initialSnappedCells ?? snappedCells;
      const epsilon = 0.0001;
      if (nextCellsRaw > lastCells + epsilon) {
        const stepUp = this.getSizeStep(lastCells);
        const nextUp = this.clampSizeCells(lastCells + stepUp);
        snappedCells = Math.min(snappedCells, nextUp);
      } else if (nextCellsRaw < lastCells - epsilon) {
        const stepDown = this.getSizeStep(lastCells - epsilon);
        const nextDown = this.clampSizeCells(lastCells - stepDown);
        snappedCells = Math.max(snappedCells, nextDown);
      } else {
        snappedCells = lastCells;
      }
    }

    const snappedSize = snappedCells * cellSize;
    const applied = this.applyTokenSize(token, snappedCells, { isCells: true });
    state.lastSnappedCells = snappedCells;
    state.lastSnappedSize = snappedSize;
    if (applied) {
      this.refreshSelectionOverlay(token);
    }
  }

  getCellSize() {
    return Math.max(this.state.cellSize || DEFAULTS.cellSize, 1);
  }

  clampSizeCells(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return MIN_TOKEN_CELLS;
    }
    return Math.min(Math.max(numeric, MIN_TOKEN_CELLS), MAX_TOKEN_CELLS);
  }

  getTokenSizeCells(token) {
    if (!token) {
      return this.clampSizeCells(1);
    }
    const cellSize = this.getCellSize();
    const data = token.battlemapData || {};
    const storedCells = Number(data.sizeCells);
    if (Number.isFinite(storedCells) && storedCells > 0) {
      return this.clampSizeCells(storedCells);
    }
    const pixelSize = Number(data.pixelSize ?? data.size ?? token.width);
    if (!Number.isFinite(pixelSize) || pixelSize <= 0) {
      return this.clampSizeCells(token.width / cellSize || 1);
    }
    return this.clampSizeCells(pixelSize / cellSize);
  }

  getSizeStep(cells) {
    const clamped = this.clampSizeCells(cells);
    return clamped < 1 ? 0.25 : 1;
  }

  snapSizeCells(cells, options = {}) {
    const disableSnap = Boolean(options.disableSnap);
    let target = this.clampSizeCells(cells);
    if (disableSnap) {
      return target;
    }
    const step = this.getSizeStep(target);
    const snapped = Math.round(target / step) * step;
    return this.clampSizeCells(snapped);
  }

  snapSizeValue(value, options = {}) {
    const numeric = Number(value);
    const cellSize = this.getCellSize();
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return this.clampSizeCells(1) * cellSize;
    }
    const snappedCells = this.snapSizeCells(numeric / cellSize, options);
    return snappedCells * cellSize;
  }

  formatCellsValue(cells) {
    const clamped = this.clampSizeCells(cells);
    return clamped
      .toFixed(2)
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1');
  }

  getSizeLabel(cells) {
    const formatted = this.formatCellsValue(cells);
    return `${formatted}×${formatted}`;
  }

  applyTokenSize(token, size, options = {}) {
    if (!token) {
      return false;
    }

    const { isCells = false, disableClamp = false, force = false, updateData } = options;
    const cellSize = this.getCellSize();
    let targetCells = isCells ? Number(size) : Number(size) / cellSize;
    if (!Number.isFinite(targetCells)) {
      targetCells = MIN_TOKEN_CELLS;
    }
    if (!disableClamp) {
      targetCells = this.clampSizeCells(targetCells);
    }
    const targetPixels = targetCells * cellSize;
    const currentCells = this.getTokenSizeCells(token);
    if (!force && Math.abs(targetCells - currentCells) < 0.001) {
      const data = updateData || token.battlemapData || { id: token.battlemapId };
      data.sizeCells = this.clampSizeCells(currentCells);
      data.pixelSize = data.sizeCells * cellSize;
      data.size = data.pixelSize;
      if (!updateData) {
        token.battlemapData = data;
      }
      return false;
    }

    if (typeof token.setSize === 'function') {
      token.setSize(targetPixels, targetPixels);
      if (typeof token.setCellSize === 'function') {
        token.setCellSize(cellSize);
      }
    } else {
      token.width = targetPixels;
      token.height = targetPixels;
      updateSpriteHitArea(token);
    }

    const data = updateData || token.battlemapData || { id: token.battlemapId };
    data.sizeCells = targetCells;
    data.pixelSize = targetPixels;
    data.size = targetPixels;
    if (!updateData) {
      token.battlemapData = data;
    }
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
    const getPointerId = (event) =>
      event?.pointerId ?? event?.data?.pointerId ?? event?.data?.identifier ?? 0;

    const cleanupStageDragListeners = () => {
      if (!token.__dragState) {
        return;
      }
      const stage = this.app?.stage;
      const { moveHandler, upHandler } = token.__dragState;
      if (stage) {
        if (moveHandler) {
          stage.off('pointermove', moveHandler);
        }
        if (upHandler) {
          stage.off('pointerup', upHandler);
          stage.off('pointerupoutside', upHandler);
        }
      }
      token.__dragState = null;
    };

    const updateDragPosition = (event) => {
      const viewport = this.viewport;
      const globalPoint = event?.global ?? event?.data?.global ?? event?.data;
      if (!globalPoint) {
        return;
      }
      let worldPoint = null;
      if (viewport?.toWorld) {
        worldPoint = viewport.toWorld(globalPoint.x, globalPoint.y);
      }
      if (worldPoint) {
        token.position.set(worldPoint.x, worldPoint.y);
      } else {
        const parentLayer = token.parent || this.tokensLayer;
        if (!parentLayer?.toLocal) {
          return;
        }
        const localPoint = parentLayer.toLocal(globalPoint);
        token.position.set(localPoint.x, localPoint.y);
      }
      this.updateSelectionGraphic(token);
    };

    token.on('pointerdown', (event) => {
      if (this.activeTool === 'measure') {
        return;
      }
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
      token.dragPointerId = getPointerId(event);
      token.__dragStart = { x: token.x, y: token.y };

      const stage = this.app?.stage;
      if (stage && this.viewport) {
        const pointerId = token.dragPointerId;
        const stageMoveHandler = (moveEvent) => {
          if (!token.dragging || getPointerId(moveEvent) !== pointerId) {
            return;
          }
          updateDragPosition(moveEvent);
        };

        const stageUpHandler = (endEvent) => {
          if (getPointerId(endEvent) !== pointerId) {
            return;
          }
          handlePointerUp(endEvent);
        };

        cleanupStageDragListeners();
        stage.on('pointermove', stageMoveHandler);
        stage.on('pointerup', stageUpHandler);
        stage.on('pointerupoutside', stageUpHandler);
        token.__dragState = {
          pointerId,
          moveHandler: stageMoveHandler,
          upHandler: stageUpHandler,
        };
      }
    });

    const handlePointerUp = (event) => {
      if (!token.dragging || token.dragPointerId !== getPointerId(event)) {
        return;
      }
      token.dragging = false;
      token.dragPointerId = null;
      cleanupStageDragListeners();
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
      if (!token.dragging || token.dragPointerId !== getPointerId(event)) {
        return;
      }
      updateDragPosition(event);
    });
  }

  _attachTokenUiListeners(token) {
    if (!token || typeof token.on !== 'function') {
      return;
    }
    const reEmit = (sourceEvent, targetEvent) => {
      token.on(sourceEvent, (payload = {}) => {
        const eventPayload = {
          id: token.battlemapId,
          ...payload,
        };
        this.emit(targetEvent, eventPayload);
      });
    };

    reEmit('battlemap:hover', 'token:hover');
    reEmit('battlemap:openSettings', 'token:settings');
    reEmit('battlemap:openBars', 'token:bars');
    reEmit('battlemap:openStates', 'token:states');
    reEmit('battlemap:statChange', 'token:statChange');

    token.on('battlemap:tokenRotate', ({ rotation }) => {
      const degrees = Number(rotation) || 0;
      if (!token.battlemapData) {
        token.battlemapData = { id: token.battlemapId };
      }
      token.battlemapData.rotation = degrees;
      token.rotation = (degrees * Math.PI) / 180;
      this.refreshSelectionOverlay(token);
      this.emit('token:rotate', {
        id: token.battlemapId,
        rotation: degrees,
        data: token.battlemapData ? { ...token.battlemapData } : undefined,
      });
    });

    token.on('battlemap:tokenRotatePreview', ({ rotation }) => {
      this.refreshSelectionOverlay(token);
      this.emit('token:rotate:preview', {
        id: token.battlemapId,
        rotation: Number(rotation) || 0,
      });
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
    if (!token) {
      return;
    }
    const cellSize = this.getCellSize();
    const sizeCells = this.getTokenSizeCells(token);
    const sizePixels = sizeCells * cellSize;
    const halfSize = sizePixels / 2;

    const isEvenFootprint =
      Number.isFinite(sizeCells) && Math.abs(sizeCells % 2) < 1e-6;

    let snappedCenterX;
    let snappedCenterY;

    if (isEvenFootprint) {
      const topLeftX = this.snapCoordinateToGrid(token.x - halfSize, 'x', sizePixels);
      const topLeftY = this.snapCoordinateToGrid(token.y - halfSize, 'y', sizePixels);
      snappedCenterX = topLeftX + halfSize;
      snappedCenterY = topLeftY + halfSize;
    } else {
      const worldWidth =
        Number.isFinite(this.state.worldWidth) && this.state.worldWidth > 0
          ? this.state.worldWidth
          : cellSize;
      const worldHeight =
        Number.isFinite(this.state.worldHeight) && this.state.worldHeight > 0
          ? this.state.worldHeight
          : cellSize;
      const offsetX = Number.isFinite(this.state.gridOffsetX)
        ? this.state.gridOffsetX
        : 0;
      const offsetY = Number.isFinite(this.state.gridOffsetY)
        ? this.state.gridOffsetY
        : 0;
      const cellHalf = cellSize / 2;

      const computeCenter = (value, axis) => {
        const worldLimit = axis === 'x' ? worldWidth : worldHeight;
        const offset = axis === 'x' ? offsetX : offsetY;
        const rawValue = Number.isFinite(value) ? value : offset + cellHalf;
        const index = Math.round((rawValue - offset - cellHalf) / cellSize);
        const snapped = offset + index * cellSize + cellHalf;
        const min = offset + halfSize;
        const max = Math.max(worldLimit - halfSize, min);
        return Math.min(Math.max(snapped, min), max);
      };

      snappedCenterX = computeCenter(token.x, 'x');
      snappedCenterY = computeCenter(token.y, 'y');
    }

    token.position.set(snappedCenterX, snappedCenterY);
    if (token.battlemapData) {
      token.battlemapData.x = snappedCenterX;
      token.battlemapData.y = snappedCenterY;
    }
    this.updateSelectionGraphic(token);
  }

  snapCoordinateToGrid(value, axis = 'x', sizePixels = 0) {
    const cellSize = this.getCellSize();
    const resolvedCell = Math.max(cellSize, 1);
    const offset =
      axis === 'x'
        ? (Number.isFinite(this.state.gridOffsetX) ? this.state.gridOffsetX : 0)
        : (Number.isFinite(this.state.gridOffsetY) ? this.state.gridOffsetY : 0);
    const worldLimit =
      axis === 'x'
        ? Number.isFinite(this.state.worldWidth)
          ? this.state.worldWidth
          : resolvedCell
        : Number.isFinite(this.state.worldHeight)
          ? this.state.worldHeight
          : resolvedCell;

    const size = Math.max(sizePixels, resolvedCell);
    const min = offset;
    const max = Math.max(worldLimit - size, min);
    const index = Math.round((value - offset) / resolvedCell);
    const snapped = offset + index * resolvedCell;
    return Math.min(Math.max(snapped, min), max);
  }

  snapValue(value, worldLimit, axis = 'x') {
    const cellSize = this.getCellSize();
    const resolvedCell = Math.max(cellSize, 1);
    const offset =
      axis === 'x'
        ? (Number.isFinite(this.state.gridOffsetX) ? this.state.gridOffsetX : 0)
        : (Number.isFinite(this.state.gridOffsetY) ? this.state.gridOffsetY : 0);
    const limit = Number.isFinite(worldLimit) && worldLimit > 0 ? worldLimit : resolvedCell;
    const half = resolvedCell / 2;
    const min = offset + half;
    const max = Math.max(limit - half, min);
    const index = Math.round((value - offset - half) / resolvedCell);
    const snapped = offset + index * resolvedCell + half;
    return Math.min(Math.max(snapped, min), max);
  }

  snapMeasureCell(value, axis = 'x') {
    const cellSize = this.getCellSize();
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      return 0;
    }
    const offset =
      axis === 'x'
        ? (Number.isFinite(this.state.gridOffsetX) ? this.state.gridOffsetX : 0)
        : (Number.isFinite(this.state.gridOffsetY) ? this.state.gridOffsetY : 0);
    return Math.floor((Number(value) - offset) / cellSize);
  }

  snapMeasurePoint(x, y) {
    const mode = (this.measureConfig?.snap || 'center').toLowerCase();
    if (mode === 'free') {
      return [Number(x) || 0, Number(y) || 0];
    }
    const cellSize = this.getCellSize();
    const offsetX = Number.isFinite(this.state.gridOffsetX)
      ? this.state.gridOffsetX
      : 0;
    const offsetY = Number.isFinite(this.state.gridOffsetY)
      ? this.state.gridOffsetY
      : 0;
    const cellX = this.snapMeasureCell(x, 'x');
    const cellY = this.snapMeasureCell(y, 'y');
    if (mode === 'center') {
      return [
        offsetX + (cellX + 0.5) * cellSize,
        offsetY + (cellY + 0.5) * cellSize,
      ];
    }
    return [offsetX + cellX * cellSize, offsetY + cellY * cellSize];
  }

  getPointerId(event) {
    if (!event) {
      return null;
    }
    return (
      event.pointerId ??
      event.data?.pointerId ??
      event.data?.identifier ??
      event.data?.id ??
      event.data?.pointerId ??
      null
    );
  }

  resolveWorldPoint(event) {
    if (!event) {
      return { x: 0, y: 0 };
    }
    const globalPoint =
      event.global ?? event.data?.global ?? event.data ?? new Point(0, 0);
    const resolvedGlobal = {
      x: Number(globalPoint?.x) || 0,
      y: Number(globalPoint?.y) || 0,
    };
    if (!this.viewport || typeof this.viewport.toWorld !== 'function') {
      return resolvedGlobal;
    }
    const world = this.viewport.toWorld(resolvedGlobal.x, resolvedGlobal.y);
    return {
      x: Number(world?.x) || resolvedGlobal.x,
      y: Number(world?.y) || resolvedGlobal.y,
    };
  }

  computeMeasureData(start, end) {
    if (!start || !end) {
      return null;
    }
    const [sx1, sy1] = this.snapMeasurePoint(start.x, start.y);
    const [sx2, sy2] = this.snapMeasurePoint(end.x, end.y);
    const sdx = sx2 - sx1;
    const sdy = sy2 - sy1;
    const cellDx = Math.abs(this.snapMeasureCell(sx2, 'x') - this.snapMeasureCell(sx1, 'x'));
    const cellDy = Math.abs(this.snapMeasureCell(sy2, 'y') - this.snapMeasureCell(sy1, 'y'));
    const diagonalSteps = Math.min(cellDx, cellDy);
    const straightSteps = Math.abs(cellDx - cellDy);

    const rule = (this.measureConfig?.rule || 'chebyshev').toLowerCase();
    const unitValue = Number.isFinite(this.measureConfig?.unitValue)
      ? Math.max(this.measureConfig.unitValue, 0)
      : 0;
    let distanceCells = 0;
    let distanceUnits = 0;
    if (rule === 'manhattan') {
      distanceCells = cellDx + cellDy;
      distanceUnits = distanceCells * unitValue;
    } else if (rule === 'euclidean') {
      distanceCells = Math.sqrt(cellDx * cellDx + cellDy * cellDy);
      distanceUnits = distanceCells * unitValue;
    } else if (rule === '5105') {
      distanceCells = diagonalSteps + straightSteps;
      let diagonalUnits = 0;
      for (let i = 0; i < diagonalSteps; i += 1) {
        diagonalUnits += unitValue * (i % 2 === 0 ? 1 : 2);
      }
      distanceUnits = diagonalUnits + straightSteps * unitValue;
    } else {
      distanceCells = Math.max(cellDx, cellDy);
      distanceUnits = distanceCells * unitValue;
    }

    const len = Math.hypot(sdx, sdy);
    const angle = Math.atan2(sdy, sdx);
    const roundedCells =
      distanceCells % 1 === 0
        ? distanceCells
        : Math.round(distanceCells * 100) / 100;
    const roundedUnits =
      distanceUnits % 1 === 0
        ? distanceUnits
        : Math.round(distanceUnits * 100) / 100;
    const unitLabel = this.measureConfig?.unitLabel
      ? ` ${this.measureConfig.unitLabel}`
      : '';

    return {
      sx1,
      sy1,
      sx2,
      sy2,
      sdx,
      sdy,
      len,
      angle,
      cellDx,
      cellDy,
      diagonalSteps,
      straightSteps,
      distanceCells,
      distanceUnits,
      roundedCells,
      roundedUnits,
      unitLabel,
      shape: (this.measureConfig?.shape || 'line').toLowerCase(),
      label: `${roundedCells} casillas (${roundedUnits}${unitLabel})`,
      labelX: sx2 + 20,
      labelY: sy2 + 20,
    };
  }

  updateMeasureGraphics() {
    if (!this.measureLayer || !this.measureGraphics || !this.measureLabel) {
      return;
    }
    const { visible = true } = this.measureConfig || {};
    const { start, end } = this.measureState || {};
    if (!visible || !start || !end) {
      this.measureGraphics.clear();
      this.measureLayer.visible = false;
      this.measureLabel.visible = false;
      this.measureLabel.text = '';
      return;
    }

    const data = this.computeMeasureData(start, end);
    if (!data || !Number.isFinite(data.len) || data.len === 0) {
      this.measureGraphics.clear();
      this.measureLayer.visible = false;
      this.measureLabel.visible = false;
      this.measureLabel.text = '';
      return;
    }

    const { sx1, sy1, sx2, sy2, len, angle, shape } = data;
    this.measureLayer.visible = true;
    this.measureGraphics.clear();
    this.measureGraphics.lineStyle({ color: 0x00ffff, width: 2, alpha: 1 });

    if (shape === 'square') {
      const x = Math.min(sx1, sx2);
      const y = Math.min(sy1, sy2);
      const width = Math.abs(sx2 - sx1) || 1;
      const height = Math.abs(sy2 - sy1) || 1;
      this.measureGraphics.drawRect(x, y, width, height);
    } else if (shape === 'circle') {
      this.measureGraphics.drawCircle(sx1, sy1, len);
    } else if (shape === 'cone') {
      const spread = Math.PI / 6;
      const p2x = sx1 + len * Math.cos(angle + spread);
      const p2y = sy1 + len * Math.sin(angle + spread);
      const p3x = sx1 + len * Math.cos(angle - spread);
      const p3y = sy1 + len * Math.sin(angle - spread);
      this.measureGraphics.moveTo(sx1, sy1);
      this.measureGraphics.lineTo(p2x, p2y);
      this.measureGraphics.lineTo(p3x, p3y);
      this.measureGraphics.closePath();
    } else if (shape === 'beam') {
      const cellSize = this.getCellSize();
      const half = (cellSize / 2) || 1;
      const dx = half * Math.cos(angle + Math.PI / 2);
      const dy = half * Math.sin(angle + Math.PI / 2);
      this.measureGraphics.moveTo(sx1 + dx, sy1 + dy);
      this.measureGraphics.lineTo(sx2 + dx, sy2 + dy);
      this.measureGraphics.lineTo(sx2 - dx, sy2 - dy);
      this.measureGraphics.lineTo(sx1 - dx, sy1 - dy);
      this.measureGraphics.closePath();
    } else {
      this.measureGraphics.moveTo(sx1, sy1);
      this.measureGraphics.lineTo(sx2, sy2);
    }

    this.measureLabel.text = data.label;
    this.measureLabel.position.set(data.labelX, data.labelY);
    this.measureLabel.visible = true;
    this.measureState.lastData = data;
    this.emit('measure:update', { ...data });
  }

  isPrimaryPointer(event) {
    const original =
      event?.data?.originalEvent ?? event?.data?.nativeEvent ?? event?.data ?? event;
    if (!original) {
      return true;
    }
    if (original.button !== undefined) {
      return original.button === 0;
    }
    if (original.which !== undefined) {
      return original.which === 1;
    }
    if (original.buttons !== undefined) {
      return original.buttons === 1;
    }
    return true;
  }

  startMeasure(event) {
    if (this.destroyed || this.activeTool !== 'measure') {
      return false;
    }
    if (!this.isPrimaryPointer(event)) {
      return false;
    }
    const pointerId = this.getPointerId(event);
    const world = this.resolveWorldPoint(event);
    this.measureState = {
      active: true,
      pointerId,
      start: world,
      end: { ...world },
      lastData: null,
    };
    this.updateMeasureGraphics();
    this.emit('measure:start', { start: { ...world }, pointerId });
    return true;
  }

  updateMeasure(event) {
    if (!this.measureState?.active) {
      return;
    }
    const pointerId = this.getPointerId(event);
    if (
      this.measureState.pointerId !== null &&
      pointerId !== null &&
      pointerId !== this.measureState.pointerId
    ) {
      return;
    }
    const world = this.resolveWorldPoint(event);
    this.measureState.end = { ...world };
    this.updateMeasureGraphics();
  }

  cancelMeasure() {
    if (this.measureState?.active || this.measureLayer?.visible) {
      this.emit('measure:end', {
        pointerId: this.measureState?.pointerId ?? null,
        data: this.measureState?.lastData ? { ...this.measureState.lastData } : null,
      });
    }
    this.measureState = {
      active: false,
      pointerId: null,
      start: null,
      end: null,
      lastData: null,
    };
    this.updateMeasureGraphics();
  }

  endMeasure(event) {
    if (!this.measureState?.active) {
      return;
    }
    const pointerId = this.getPointerId(event);
    if (
      this.measureState.pointerId !== null &&
      pointerId !== null &&
      pointerId !== this.measureState.pointerId
    ) {
      // Ignore events from other pointers
      return;
    }
    this.cancelMeasure();
  }

  handleViewportPointerDown(event) {
    if (this.activeTool === 'measure' && this.startMeasure(event)) {
      return;
    }
    if (event?.target === this.viewport) {
      this.clearSelection();
    }
  }

  handleViewportPointerMove(event) {
    if (this.measureState?.active) {
      this.updateMeasure(event);
    }
  }

  handleViewportPointerUp(event) {
    if (this.measureState?.active) {
      this.endMeasure(event);
    }
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

    const snappedX = this.snapValue(world.x, this.state.worldWidth, 'x');
    const snappedY = this.snapValue(world.y, this.state.worldHeight, 'y');

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

  applyTileOptions(sprite, options = {}) {
    if (!sprite) {
      return null;
    }

    const data = sprite.battlemapData || {};
    if (options.id !== undefined) {
      data.id = String(options.id);
    } else if (!data.id && sprite.battlemapId) {
      data.id = sprite.battlemapId;
    }

    if (!data.id) {
      data.id = `tile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const assignNumeric = (key, value, fallback = 0) => {
      if (value === undefined || value === null) {
        return;
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        data[key] = numeric;
      } else if (fallback !== undefined) {
        data[key] = fallback;
      }
    };

    assignNumeric('x', options.x ?? options.position?.x);
    assignNumeric('y', options.y ?? options.position?.y);
    assignNumeric('width', options.width ?? options.w);
    assignNumeric('height', options.height ?? options.h);
    assignNumeric('rotation', options.rotation ?? options.angle, 0);
    assignNumeric('opacity', options.opacity, 1);

    data.layer = options.layer ? String(options.layer) : data.layer || 'tiles';
    data.url = options.url ?? options.textureUrl ?? data.url ?? null;
    data.isBackground = Boolean(options.isBackground ?? data.isBackground);
    data.locked = Boolean(options.locked ?? data.locked);

    sprite.battlemapId = data.id;
    sprite.battlemapData = { ...data };

    const width = Math.max(Number(data.width) || 0, 1);
    const height = Math.max(Number(data.height) || 0, 1);

    sprite.width = width;
    sprite.height = height;
    sprite.position.set(Number(data.x) || 0, Number(data.y) || 0);
    sprite.rotation = (Number(data.rotation) || 0) * (Math.PI / 180);
    sprite.alpha = Math.min(Math.max(Number(data.opacity) || 1, 0), 1);

    updateSpriteHitArea(sprite);

    return sprite.battlemapData;
  }

  async ensureTileSprite(tile) {
    if (!tile?.id) {
      return null;
    }
    const tileId = String(tile.id);
    let sprite = this.tiles.get(tileId);
    const textureUrl = tile.url ?? tile.textureUrl;
    if (!sprite) {
      let texture = Texture.WHITE;
      if (textureUrl) {
        try {
          texture = await this.loadTexture(textureUrl);
        } catch (error) {
          console.warn('[PixiBattleMap] No se pudo cargar la textura del tile:', error);
        }
      }
      sprite = new Sprite(texture);
      sprite.anchor.set(0, 0);
      sprite.eventMode = 'static';
      sprite.cursor = tile.locked ? 'not-allowed' : 'move';
      sprite.sortableChildren = false;
      sprite.battlemapId = tileId;
      sprite.on('pointerdown', (event) => {
        if (this.isLayerLocked(sprite.battlemapLayerId)) {
          return;
        }
        sprite.dragging = true;
        sprite.__dragOffset = {
          x: event.globalX - sprite.x,
          y: event.globalY - sprite.y,
        };
        this.emit('tile:pointerdown', { id: tileId, data: { ...sprite.battlemapData } });
      });
      sprite.on('pointerup', () => {
        if (!sprite.dragging) {
          return;
        }
        sprite.dragging = false;
        sprite.__dragOffset = null;
        const data = this.applyTileOptions(sprite, { ...sprite.battlemapData });
        this.emit('tile:move', { id: tileId, data: { ...data } });
      });
      sprite.on('pointerupoutside', () => {
        if (!sprite.dragging) {
          return;
        }
        sprite.dragging = false;
        sprite.__dragOffset = null;
        const data = this.applyTileOptions(sprite, { ...sprite.battlemapData });
        this.emit('tile:move', { id: tileId, data: { ...data } });
      });
      sprite.on('pointermove', (event) => {
        if (!sprite.dragging || this.isLayerLocked(sprite.battlemapLayerId)) {
          return;
        }
        const offset = sprite.__dragOffset || { x: 0, y: 0 };
        sprite.position.set(event.globalX - offset.x, event.globalY - offset.y);
        this.applyTileOptions(sprite, { x: sprite.x, y: sprite.y });
        this.emit('tile:drag', {
          id: tileId,
          x: sprite.x,
          y: sprite.y,
          data: { ...sprite.battlemapData },
        });
      });
      this.tiles.set(tileId, sprite);
    }
    const container = tile.isBackground
      ? this.backgroundLayer
      : this.getLayerContainer(tile.layer || 'tiles', 'tiles');
    sprite.battlemapLayerId = tile.isBackground
      ? 'background'
      : String(tile.layer || 'tiles');
    if (container && sprite.parent !== container) {
      container.addChild(sprite);
    }
    const textureUrlChanged =
      textureUrl && sprite.texture?.baseTexture?.resource?.url !== textureUrl;
    if (textureUrlChanged) {
      try {
        const texture = await this.loadTexture(textureUrl);
        sprite.texture = texture;
      } catch (error) {
        console.warn('[PixiBattleMap] Error recargando textura de tile:', error);
      }
    }
    this.applyTileOptions(sprite, tile);
    return sprite;
  }

  async setTiles(list = []) {
    await this.ready;
    const validList = Array.isArray(list) ? list : [];
    const seen = new Set();
    for (const tile of validList) {
      if (!tile || tile.hidden) {
        continue;
      }
      const sprite = await this.ensureTileSprite(tile);
      if (!sprite) {
        continue;
      }
      seen.add(sprite.battlemapId);
    }
    this.tiles.forEach((sprite, id) => {
      if (seen.has(id)) {
        return;
      }
      if (sprite.parent) {
        sprite.removeFromParent();
      }
      sprite.destroy({ texture: false, baseTexture: false });
      this.tiles.delete(id);
    });
  }

  applyLineOptions(graphic, line) {
    if (!graphic || !line) {
      return;
    }
    const id = String(line.id ?? graphic.battlemapId);
    graphic.battlemapId = id;
    graphic.battlemapData = {
      ...(graphic.battlemapData || {}),
      ...line,
      id,
    };
    graphic.position.set(Number(line.x) || 0, Number(line.y) || 0);
    graphic.alpha = Number.isFinite(line.opacity) ? line.opacity : 1;
    graphic.zIndex = Number.isFinite(line.zIndex) ? line.zIndex : graphic.zIndex;
    graphic.tint = normalizeColor(line.color ?? '#ffffff', 0xffffff);
    updateSpriteHitArea(graphic);
  }

  ensureLineGraphic(line) {
    if (!line?.id) {
      return null;
    }
    const lineId = String(line.id);
    let graphic = this.lines.get(lineId);
    if (!graphic) {
      graphic = new Graphics();
      graphic.eventMode = 'static';
      graphic.cursor = 'pointer';
      graphic.battlemapId = lineId;
      graphic.dragging = false;
      graphic.__dragOffset = { x: 0, y: 0 };
      graphic.on('pointerdown', (event) => {
        if (this.activeTool !== 'select' || this.isLayerLocked(graphic.battlemapLayerId)) {
          return;
        }
        graphic.dragging = true;
        graphic.__dragOffset = {
          x: event.globalX - graphic.x,
          y: event.globalY - graphic.y,
        };
        this.emit('line:pointerdown', { id: lineId, data: { ...graphic.battlemapData } });
      });
      const stopDrag = () => {
        if (!graphic.dragging) {
          return;
        }
        graphic.dragging = false;
        const data = { ...graphic.battlemapData, x: graphic.x, y: graphic.y };
        graphic.battlemapData = data;
        this.emit('line:move', { id: lineId, data });
      };
      graphic.on('pointerup', stopDrag);
      graphic.on('pointerupoutside', stopDrag);
      graphic.on('pointermove', (event) => {
        if (!graphic.dragging || this.isLayerLocked(graphic.battlemapLayerId)) {
          return;
        }
        graphic.position.set(
          event.globalX - (graphic.__dragOffset?.x ?? 0),
          event.globalY - (graphic.__dragOffset?.y ?? 0)
        );
        graphic.battlemapData = {
          ...(graphic.battlemapData || {}),
          x: graphic.x,
          y: graphic.y,
        };
        this.emit('line:drag', {
          id: lineId,
          x: graphic.x,
          y: graphic.y,
          data: { ...graphic.battlemapData },
        });
      });
      this.lines.set(lineId, graphic);
    }

    const container = this.getLayerContainer(line.layer || 'lines', 'lines');
    graphic.battlemapLayerId = String(line.layer || 'lines');
    if (container && graphic.parent !== container) {
      container.addChild(graphic);
    }

    graphic.clear();
    const color = normalizeColor(line.color ?? '#ffffff', 0xffffff);
    const width = Math.max(Number(line.width) || 4, 1);
    graphic.lineStyle({ width, color, alpha: Number.isFinite(line.opacity) ? line.opacity : 1 });
    const points = Array.isArray(line.points) ? line.points : [];
    if (points.length >= 2) {
      graphic.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        graphic.lineTo(points[i], points[i + 1]);
      }
    }

    this.applyLineOptions(graphic, line);
    return graphic;
  }

  async setLines(list = []) {
    await this.ready;
    const valid = Array.isArray(list) ? list : [];
    const seen = new Set();
    valid.forEach((line) => {
      if (!line) {
        return;
      }
      const graphic = this.ensureLineGraphic(line);
      if (graphic) {
        seen.add(graphic.battlemapId);
      }
    });
    this.lines.forEach((graphic, id) => {
      if (seen.has(id)) {
        return;
      }
      if (graphic.parent) {
        graphic.removeFromParent();
      }
      graphic.destroy();
      this.lines.delete(id);
    });
  }

  ensureTextContainer(text) {
    if (!text?.id) {
      return null;
    }
    const textId = String(text.id);
    let container = this.texts.get(textId);
    if (!container) {
      container = new Container();
      container.eventMode = 'static';
      container.cursor = 'text';
      container.battlemapId = textId;
      container.dragging = false;
      const label = new Text({ text: '', fill: '#ffffff' });
      label.anchor.set(0.5);
      container.addChild(label);
      container.textNode = label;
      container.on('pointerdown', (event) => {
        if (this.activeTool !== 'select' || this.isLayerLocked(container.battlemapLayerId)) {
          return;
        }
        container.dragging = true;
        container.__dragOffset = {
          x: event.globalX - container.x,
          y: event.globalY - container.y,
        };
        this.emit('text:pointerdown', {
          id: textId,
          data: { ...(container.battlemapData || {}) },
        });
      });
      const stopDrag = () => {
        if (!container.dragging) {
          return;
        }
        container.dragging = false;
        const data = { ...container.battlemapData, x: container.x, y: container.y };
        container.battlemapData = data;
        this.emit('text:move', { id: textId, data });
      };
      container.on('pointerup', stopDrag);
      container.on('pointerupoutside', stopDrag);
      container.on('pointermove', (event) => {
        if (!container.dragging || this.isLayerLocked(container.battlemapLayerId)) {
          return;
        }
        container.position.set(
          event.globalX - (container.__dragOffset?.x ?? 0),
          event.globalY - (container.__dragOffset?.y ?? 0)
        );
        container.battlemapData = {
          ...(container.battlemapData || {}),
          x: container.x,
          y: container.y,
        };
        this.emit('text:drag', {
          id: textId,
          x: container.x,
          y: container.y,
          data: { ...container.battlemapData },
        });
      });
      this.texts.set(textId, container);
    }

    const layerId = String(text.layer || 'texts');
    const layerContainer = this.getLayerContainer(layerId, 'texts');
    container.battlemapLayerId = layerId;
    if (layerContainer && container.parent !== layerContainer) {
      layerContainer.addChild(container);
    }

    const style = {
      fill: text.fill || '#ffffff',
      fontFamily: text.fontFamily || 'Arial',
      fontSize: Number(text.fontSize) || 24,
      fontWeight: text.bold ? 'bold' : 'normal',
      fontStyle: text.italic ? 'italic' : 'normal',
      align: 'center',
    };
    const decoration = text.underline ? 'underline' : 'none';
    const label = container.textNode;
    if (label) {
      label.style = { ...label.style, ...style, textDecoration: decoration };
      label.text = text.text ?? '';
    }
    container.alpha = Number.isFinite(text.opacity) ? text.opacity : 1;
    container.position.set(Number(text.x) || 0, Number(text.y) || 0);
    container.battlemapData = { ...text, id: textId };
    return container;
  }

  async setTexts(list = []) {
    await this.ready;
    const valid = Array.isArray(list) ? list : [];
    const seen = new Set();
    valid.forEach((text) => {
      if (!text) {
        return;
      }
      const container = this.ensureTextContainer(text);
      if (container) {
        seen.add(container.battlemapId);
      }
    });
    this.texts.forEach((container, id) => {
      if (seen.has(id)) {
        return;
      }
      if (container.parent) {
        container.removeFromParent();
      }
      container.destroy({ children: true });
      this.texts.delete(id);
    });
  }

  ensureWallGraphic(wall) {
    if (!wall?.id) {
      return null;
    }
    const wallId = String(wall.id);
    let graphic = this.walls.get(wallId);
    if (!graphic) {
      graphic = new Graphics();
      graphic.eventMode = 'static';
      graphic.cursor = 'pointer';
      graphic.battlemapId = wallId;
      graphic.dragging = false;
      graphic.__dragOffset = { x: 0, y: 0 };
      graphic.on('pointerdown', (event) => {
        if (this.activeTool !== 'select' || this.isLayerLocked(graphic.battlemapLayerId)) {
          return;
        }
        graphic.dragging = true;
        graphic.__dragOffset = {
          x: event.globalX - graphic.x,
          y: event.globalY - graphic.y,
        };
        this.emit('wall:pointerdown', {
          id: wallId,
          data: { ...(graphic.battlemapData || {}) },
        });
      });
      const stopDrag = () => {
        if (!graphic.dragging) {
          return;
        }
        graphic.dragging = false;
        const data = { ...graphic.battlemapData, x: graphic.x, y: graphic.y };
        graphic.battlemapData = data;
        this.emit('wall:move', { id: wallId, data });
      };
      graphic.on('pointerup', stopDrag);
      graphic.on('pointerupoutside', stopDrag);
      graphic.on('pointermove', (event) => {
        if (!graphic.dragging || this.isLayerLocked(graphic.battlemapLayerId)) {
          return;
        }
        graphic.position.set(
          event.globalX - (graphic.__dragOffset?.x ?? 0),
          event.globalY - (graphic.__dragOffset?.y ?? 0)
        );
        graphic.battlemapData = {
          ...(graphic.battlemapData || {}),
          x: graphic.x,
          y: graphic.y,
        };
        this.emit('wall:drag', {
          id: wallId,
          x: graphic.x,
          y: graphic.y,
          data: { ...graphic.battlemapData },
        });
      });
      this.walls.set(wallId, graphic);
    }

    const layerId = String(wall.layer || 'walls');
    const container = this.getLayerContainer(layerId, 'walls');
    graphic.battlemapLayerId = layerId;
    if (container && graphic.parent !== container) {
      container.addChild(graphic);
    }

    const width = Math.max(Number(wall.width) || 6, 1);
    const color = normalizeColor(wall.color ?? '#ffffff', 0xffffff);
    graphic.clear();
    graphic.lineStyle({ width, color, alpha: Number.isFinite(wall.opacity) ? wall.opacity : 1 });
    const points = Array.isArray(wall.points) ? wall.points : [];
    if (points.length >= 4) {
      graphic.moveTo(points[0], points[1]);
      graphic.lineTo(points[2], points[3]);
    }
    graphic.position.set(Number(wall.x) || 0, Number(wall.y) || 0);
    graphic.battlemapData = { ...wall, id: wallId };
    return graphic;
  }

  ensureDoorIcon(wall) {
    const wallId = String(wall.id);
    const doorState = wall.door;
    if (doorState !== 'closed' && doorState !== 'open') {
      const existing = this.doorIcons.get(wallId);
      if (existing) {
        if (existing.parent) {
          existing.removeFromParent();
        }
        existing.destroy();
        this.doorIcons.delete(wallId);
      }
      return null;
    }

    let icon = this.doorIcons.get(wallId);
    if (!icon) {
      icon = new Container();
      icon.eventMode = 'static';
      icon.cursor = 'pointer';
      const background = new Graphics();
      const label = new Text({ text: '', fill: '#000000' });
      label.anchor.set(0.5);
      icon.addChild(background);
      icon.addChild(label);
      icon.background = background;
      icon.label = label;
      icon.on('pointertap', () => {
        this.emit('door:toggle', {
          id: wallId,
          current: wall.door,
        });
      });
      this.doorIcons.set(wallId, icon);
    }

    const doorColor = doorState === 'closed' ? 0x8b4513 : 0x32cd32;
    const text = doorState === 'closed' ? '🔒' : '🔓';
    const background = icon.background;
    background.clear();
    background.beginFill(doorColor, 0.9);
    background.drawCircle(0, 0, 16);
    background.endFill();
    if (icon.label) {
      icon.label.text = text;
      icon.label.style = { ...icon.label.style, fontSize: 20 };
    }
    const container = this.doorLayer;
    if (container && icon.parent !== container) {
      container.addChild(icon);
    }
    const midPoint = this.getWallMidpoint(wall);
    icon.position.set(midPoint.x, midPoint.y);
    icon.battlemapId = wallId;
    return icon;
  }

  getWallMidpoint(wall) {
    const points = Array.isArray(wall.points) ? wall.points : [];
    const x = Number(wall.x) || 0;
    const y = Number(wall.y) || 0;
    if (points.length < 4) {
      return { x, y };
    }
    const x1 = x + Number(points[0]);
    const y1 = y + Number(points[1]);
    const x2 = x + Number(points[2]);
    const y2 = y + Number(points[3]);
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }

  async setWalls(list = []) {
    await this.ready;
    const valid = Array.isArray(list) ? list : [];
    const seen = new Set();
    const doorSeen = new Set();
    valid.forEach((wall) => {
      if (!wall) {
        return;
      }
      const graphic = this.ensureWallGraphic(wall);
      if (graphic) {
        seen.add(graphic.battlemapId);
      }
      const icon = this.ensureDoorIcon(wall);
      if (icon) {
        doorSeen.add(String(wall.id));
      }
    });
    this.walls.forEach((graphic, id) => {
      if (seen.has(id)) {
        return;
      }
      if (graphic.parent) {
        graphic.removeFromParent();
      }
      graphic.destroy();
      this.walls.delete(id);
    });
    this.doorIcons.forEach((icon, id) => {
      if (doorSeen.has(id)) {
        return;
      }
      if (icon.parent) {
        icon.removeFromParent();
      }
      icon.destroy({ children: true });
      this.doorIcons.delete(id);
    });
  }

  getInteractiveDoors() {
    const doors = [];
    this.walls.forEach((wall) => {
      const data = wall.battlemapData || {};
      if (data.door === 'closed' || data.door === 'open') {
        doors.push({ ...data });
      }
    });
    return doors;
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
      this.cancelMeasure();
      this.tiles.forEach((tile) => {
        if (tile?.parent) {
          tile.removeFromParent();
        }
        tile?.destroy?.({ texture: false, baseTexture: false });
      });
      this.tiles.clear();
      this.tokens.forEach((token) => {
        token.removeFromParent();
        token.destroy({ children: true });
      });
      this.tokens.clear();
      this.lines.forEach((graphic) => {
        if (graphic?.parent) {
          graphic.removeFromParent();
        }
        graphic?.destroy?.();
      });
      this.lines.clear();
      this.texts.forEach((container) => {
        if (container?.parent) {
          container.removeFromParent();
        }
        container?.destroy?.({ children: true });
      });
      this.texts.clear();
      this.walls.forEach((graphic) => {
        if (graphic?.parent) {
          graphic.removeFromParent();
        }
        graphic?.destroy?.();
      });
      this.walls.clear();
      this.doorIcons.forEach((icon) => {
        if (icon?.parent) {
          icon.removeFromParent();
        }
        icon?.destroy?.({ children: true });
      });
      this.doorIcons.clear();
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
        this.viewport.off('pointerdown', this.handleViewportPointerDown);
        this.viewport.off('pointermove', this.handleViewportPointerMove);
        this.viewport.off('pointerup', this.handleViewportPointerUp);
        this.viewport.off('pointerupoutside', this.handleViewportPointerUp);
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
      if (this.tilesLayer) {
        this.tilesLayer.destroy({ children: true });
        this.tilesLayer = null;
      }
      if (this.linesLayer) {
        this.linesLayer.destroy({ children: true });
        this.linesLayer = null;
      }
      if (this.textsLayer) {
        this.textsLayer.destroy({ children: true });
        this.textsLayer = null;
      }
      if (this.gridLayer) {
        this.gridLayer.destroy();
        this.gridLayer = null;
      }
      if (this.tokensLayer) {
        this.tokensLayer.destroy({ children: true });
        this.tokensLayer = null;
      }
      if (this.wallsLayer) {
        this.wallsLayer.destroy({ children: true });
        this.wallsLayer = null;
      }
      if (this.doorLayer) {
        this.doorLayer.destroy({ children: true });
        this.doorLayer = null;
      }
      if (this.lightsLayer) {
        this.lightsLayer.destroy({ children: true });
        this.lightsLayer = null;
      }
      if (this.overlayLayer) {
        this.overlayLayer.destroy({ children: true });
        this.overlayLayer = null;
      }
      this.measureLayer = null;
      this.measureGraphics = null;
      this.measureLabel = null;
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
