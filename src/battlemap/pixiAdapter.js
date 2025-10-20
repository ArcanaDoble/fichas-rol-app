import {
  Application,
  Assets,
  Color,
  Container,
  Graphics,
  Rectangle,
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
    this.overlayLayer.eventMode = 'none';

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
      eventMode: 'none',
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
        this.backgroundLayer.addChild(background);
        this.hidePlaceholder();
      } catch (error) {
        console.error('[PixiBattleMap] No se pudo cargar el mapa:', error);
        this.ensurePlaceholder();
      }
    }
    if (!url) {
      this.ensurePlaceholder();
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

    token.battlemapData = next;
    token.position.set(next.x, next.y);

    const resolvedSize = Math.max(1, Number(next.size));
    token.width = resolvedSize;
    token.height = resolvedSize;
    token.hitArea = new Rectangle(-resolvedSize / 2, -resolvedSize / 2, resolvedSize, resolvedSize);

    const rotationRadians = (Number(next.rotation) * Math.PI) / 180;
    token.rotation = rotationRadians;
    token.alpha = Math.min(Math.max(Number(next.opacity), 0), 1);

    if (next.tint !== undefined && next.tint !== null) {
      token.tint = normalizeColor(next.tint, 0xffffff);
    } else {
      token.tint = 0xffffff;
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
      token.selectionGraphic = new Graphics();
      token.selectionGraphic.visible = false;
      token.addChild(token.selectionGraphic);
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
    previous.forEach((sprite) => this.deselectToken(sprite));
    this.emit('selection:change', []);
  }

  deselectToken(token) {
    if (!token || !this.selectedTokens.has(token)) {
      return;
    }
    this.selectedTokens.delete(token);
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
    if (!token?.selectionGraphic) {
      return;
    }
    const radius = Math.max(token.width, token.height) / 2 + 4;
    token.selectionGraphic.clear();
    token.selectionGraphic.lineStyle({ width: 3, color: SELECTION_COLOR, alpha: 0.9 });
    token.selectionGraphic.drawCircle(0, 0, radius);
    token.selectionGraphic.visible = this.selectedTokens.has(token);
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

  drawGrid() {
    if (!this.gridLayer) {
      return;
    }
    this.gridLayer.clear();
    if (!this.state.gridVisible) {
      return;
    }

    this.gridLayer.lineStyle({
      width: 1,
      color: this.state.gridColor,
      alpha: this.state.gridOpacity,
    });

    // Aquí se dibuja la cuadrícula que se superpone al mapa de batalla.
    for (let x = 0; x <= this.state.worldWidth; x += this.state.cellSize) {
      this.gridLayer.moveTo(x, 0);
      this.gridLayer.lineTo(x, this.state.worldHeight);
    }
    for (let y = 0; y <= this.state.worldHeight; y += this.state.cellSize) {
      this.gridLayer.moveTo(0, y);
      this.gridLayer.lineTo(this.state.worldWidth, y);
    }
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
