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
    this.selectedToken = null;
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
    this.backgroundLayer.zIndex = 0;
    this.backgroundLayer.eventMode = 'none';

    this.gridLayer = new Graphics();
    this.gridLayer.zIndex = 1;
    this.gridLayer.eventMode = 'static';
    this.gridLayer.cursor = 'default';

    this.tokensLayer = new Container();
    this.tokensLayer.zIndex = 2;
    this.tokensLayer.sortableChildren = true;

    this.viewport.addChild(this.backgroundLayer, this.gridLayer, this.tokensLayer);
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

  async addToken({ id, textureUrl, x = 0, y = 0, size }) {
    await this.ready;
    if (this.destroyed) {
      return null;
    }
    if (!id && id !== 0) {
      throw new Error('Los tokens necesitan un id');
    }

    const tokenId = String(id);
    let token = this.tokens.get(tokenId);
    if (!token) {
      token = new Sprite(Texture.WHITE);
      token.anchor.set(0.5);
      token.eventMode = 'dynamic';
      token.cursor = 'pointer';
      token.sortableChildren = false;
      token.baseZIndex = this.tokensLayer.children.length + 1;
      token.zIndex = token.baseZIndex;
      token.selectionGraphic = new Graphics();
      token.selectionGraphic.visible = false;
      token.addChild(token.selectionGraphic);
      token.battlemapId = tokenId;
      this.attachTokenInteraction(token);
      this.tokensLayer.addChild(token);
      this.tokens.set(tokenId, token);
    }

    const resolvedSize = Number(size) > 0 ? Number(size) : this.state.cellSize;
    token.width = resolvedSize;
    token.height = resolvedSize;
    token.hitArea = new Rectangle(
      -resolvedSize / 2,
      -resolvedSize / 2,
      resolvedSize,
      resolvedSize
    );
    token.position.set(x, y);

    if (textureUrl && textureUrl !== token.__textureUrl) {
      token.__textureUrl = textureUrl;
      this.loadTexture(textureUrl)
        .then((texture) => {
          if (this.tokens.get(tokenId) === token && !this.destroyed) {
            token.texture = texture;
          }
        })
        .catch((error) => {
          console.warn('[PixiBattleMap] No se pudo cargar la textura del token.', error);
        });
    } else if (!textureUrl) {
      token.__textureUrl = null;
      token.texture = Texture.WHITE;
    }

    this.updateSelectionGraphic(token);
    return token;
  }

  async removeToken(id) {
    await this.ready;
    const tokenId = String(id);
    const token = this.tokens.get(tokenId);
    if (!token) {
      return;
    }
    if (this.selectedToken === token) {
      this.selectedToken = null;
    }
    token.removeFromParent();
    token.destroy({ children: true });
    this.tokens.delete(tokenId);
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
    if (!this.selectedToken) {
      return;
    }
    this.selectedToken.selectionGraphic.visible = false;
    this.selectedToken.zIndex = this.selectedToken.baseZIndex;
    this.selectedToken = null;
  }

  selectToken(token) {
    if (this.selectedToken === token) {
      return;
    }
    if (this.selectedToken) {
      this.selectedToken.selectionGraphic.visible = false;
      this.selectedToken.zIndex = this.selectedToken.baseZIndex;
    }
    this.selectedToken = token;
    if (token) {
      token.zIndex = 9999;
      this.updateSelectionGraphic(token);
    }
  }

  attachTokenInteraction(token) {
    token.on('pointerdown', (event) => {
      event.stopPropagation();
      this.viewport.plugins.pause('drag');
      token.dragging = true;
      token.dragPointerId = event.pointerId;
      this.selectToken(token);
    });

    const handlePointerUp = (event) => {
      if (!token.dragging || token.dragPointerId !== event.pointerId) {
        return;
      }
      token.dragging = false;
      token.dragPointerId = null;
      this.snapToken(token);
      this.viewport.plugins.resume('drag');
      token.emit('battlemap:tokenDrop', {
        id: token.battlemapId,
        x: token.x,
        y: token.y,
      });
    };

    token.on('pointerup', handlePointerUp);
    token.on('pointerupoutside', handlePointerUp);

    token.on('pointermove', (event) => {
      if (!token.dragging || token.dragPointerId !== event.pointerId) {
        return;
      }
      const nextPosition = this.tokensLayer.toLocal(event.global);
      token.position.set(nextPosition.x, nextPosition.y);
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
    token.selectionGraphic.visible = this.selectedToken === token;
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
