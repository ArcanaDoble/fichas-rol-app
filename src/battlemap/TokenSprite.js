import {
  Color,
  Container,
  Graphics,
  Point,
  Rectangle,
  Sprite,
  Text,
  Texture,
  Ticker,
} from 'pixi.js';
import { ensureSheetDefaults, saveTokenSheet } from '../utils/token';
import { ESTADOS } from '../components/EstadoSelector';
import PixiSpinner from './PixiSpinner';

const DAMAGE_ANIMATION_MS = 8000;
const HANDLE_OFFSET_FACTOR = 0.18;
const BUTTON_SIZE_FACTOR = 0.3;
const ICON_SIZE_FACTOR = 0.18;
const NAME_FONT_FACTOR = 0.12;

const DEFAULT_PLACEHOLDER_COLOR = 0xff4444;

const resolveColor = (value, fallback = DEFAULT_PLACEHOLDER_COLOR) => {
  try {
    return Color.shared.setValue(
      value !== undefined && value !== null ? value : fallback
    ).toNumber();
  } catch (error) {
    console.warn('[TokenSprite] Invalid color, using fallback.', error);
    return Color.shared.setValue(fallback).toNumber();
  }
};

const extractPointer = (event) =>
  event?.data?.global ?? event?.global ?? event?.data ?? null;

const degreesFromRadians = (radians) => (radians * 180) / Math.PI;
const radiansFromDegrees = (degrees) => (degrees * Math.PI) / 180;

export default class TokenSprite extends Container {
  constructor({ battlemap, id, cellSize = 70 } = {}) {
    super();
    this.battlemap = battlemap;
    this.battlemapId = id != null ? String(id) : undefined;
    this.eventMode = 'dynamic';
    this.cursor = 'pointer';
    this.sortableChildren = true;

    this._width = cellSize;
    this._height = cellSize;
    this._cellSize = cellSize;
    this._textureUrl = null;
    this._stats = {};
    this._tokenSheetId = null;
    this._ticker = null;
    this._damageStart = 0;
    this._damageDuration = 0;
    this._selected = false;
    this._placeholderColor = DEFAULT_PLACEHOLDER_COLOR;
    this._tintColor = 0xff0000;
    this._tintOpacity = 0;
    this._hovering = false;
    this._rotationState = null;
    this._isTextureLoading = false;
    this._currentTextureLoadId = null;

    this._onSheetSaved = (event) => {
      if (!event?.detail || event.detail.id !== this._tokenSheetId) {
        return;
      }
      const normalized = ensureSheetDefaults(event.detail);
      this._stats = { ...(normalized?.stats || {}) };
    };

    this._buildDisplayObjects();
    this._updateDimensions();
    this._bindInteraction();
  }

  destroy(options) {
    if (this._ticker) {
      this._ticker.destroy();
      this._ticker = null;
    }
    if (this.loadingSpinner) {
      this.loadingSpinner.destroy({ children: true });
      this.loadingSpinner = null;
    }
    this._currentTextureLoadId = null;
    this._setTextureLoading(false);
    window.removeEventListener('tokenSheetSaved', this._onSheetSaved);
    super.destroy(options);
  }

  _buildDisplayObjects() {
    this.auraLayer = new Graphics();
    this.auraLayer.sortableChildren = false;
    this.auraLayer.eventMode = 'none';
    this.addChild(this.auraLayer);

    this.bodyLayer = new Container();
    this.bodyLayer.sortableChildren = true;
    this.bodyLayer.eventMode = 'none';
    this.addChild(this.bodyLayer);

    this.bodySprite = new Sprite(Texture.WHITE);
    this.bodySprite.anchor.set(0.5);
    this.bodySprite.tint = 0xffffff;
    this.bodyLayer.addChild(this.bodySprite);

    this.placeholder = new Graphics();
    this.placeholder.eventMode = 'none';
    this.bodyLayer.addChild(this.placeholder);

    this.tintOverlay = new Graphics();
    this.tintOverlay.eventMode = 'none';
    this.tintOverlay.visible = false;
    this.bodyLayer.addChild(this.tintOverlay);

    this.damageOverlay = new Graphics();
    this.damageOverlay.eventMode = 'none';
    this.damageOverlay.visible = false;
    this.bodyLayer.addChild(this.damageOverlay);

    this.loadingSpinner = new PixiSpinner({
      radius: Math.max(this._cellSize * 0.35, 10),
      thickness: Math.max(this._cellSize * 0.1, 3),
      color: 0xffffff,
      alpha: 0.9,
      active: false,
    });
    this.loadingSpinner.eventMode = 'none';
    this.bodyLayer.addChild(this.loadingSpinner);

    this.estadoLayer = new Container();
    this.estadoLayer.sortableChildren = true;
    this.estadoLayer.eventMode = 'none';
    this.addChild(this.estadoLayer);

    this.uiLayer = new Container();
    this.uiLayer.sortableChildren = true;
    this.uiLayer.eventMode = 'static';
    this.addChild(this.uiLayer);

    this.rotationHandle = new Graphics();
    this.rotationHandle.eventMode = 'static';
    this.rotationHandle.cursor = 'grab';
    this.rotationHandle.visible = false;
    this.uiLayer.addChild(this.rotationHandle);

    const buttonStyle = {
      fontFamily: 'sans-serif',
      fontSize: 16,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2,
      align: 'center',
    };

    this.settingsButton = new Text('⚙️', buttonStyle);
    this.settingsButton.eventMode = 'static';
    this.settingsButton.cursor = 'pointer';
    this.settingsButton.visible = false;
    this.uiLayer.addChild(this.settingsButton);

    this.barsButton = new Text('📊', buttonStyle);
    this.barsButton.eventMode = 'static';
    this.barsButton.cursor = 'pointer';
    this.barsButton.visible = false;
    this.uiLayer.addChild(this.barsButton);

    this.statesButton = new Text('🩸', buttonStyle);
    this.statesButton.eventMode = 'static';
    this.statesButton.cursor = 'pointer';
    this.statesButton.visible = false;
    this.uiLayer.addChild(this.statesButton);

    this.nameLayer = new Container();
    this.nameLayer.eventMode = 'none';
    this.addChild(this.nameLayer);

    this.nameShadows = [
      new Text('', { fontFamily: 'sans-serif', fontWeight: '700', fontSize: 14, fill: 0x000000 }),
      new Text('', { fontFamily: 'sans-serif', fontWeight: '700', fontSize: 14, fill: 0x000000 }),
      new Text('', { fontFamily: 'sans-serif', fontWeight: '700', fontSize: 14, fill: 0x000000 }),
      new Text('', { fontFamily: 'sans-serif', fontWeight: '700', fontSize: 14, fill: 0x000000 }),
    ];
    this.nameShadows.forEach((text) => {
      text.anchor.set(0.5);
      text.alpha = 0.85;
      this.nameLayer.addChild(text);
    });

    this.nameText = new Text('', {
      fontFamily: 'sans-serif',
      fontWeight: '700',
      fontSize: 14,
      fill: 0xffffff,
      align: 'center',
    });
    this.nameText.anchor.set(0.5);
    this.nameLayer.addChild(this.nameText);

    this._updateNameVisibility();
  }

  _bindInteraction() {
    this.on('pointerover', () => {
      if (this._hovering) return;
      this._hovering = true;
      this.emit('battlemap:hover', { id: this.battlemapId, hover: true });
    });
    this.on('pointerout', () => {
      if (!this._hovering) return;
      this._hovering = false;
      this.emit('battlemap:hover', { id: this.battlemapId, hover: false });
    });

    this.rotationHandle.on('pointerdown', (event) => {
      event.stopPropagation();
      const pointerId =
        event?.pointerId ?? event?.data?.pointerId ?? event?.data?.identifier ?? 0;
      this._rotationState = {
        pointerId,
        original: this.rotation,
      };
      this.rotationHandle.cursor = 'grabbing';
      const stage = this.battlemap?.app?.stage;
      if (!stage) {
        return;
      }
      const handleMove = (moveEvent) => {
        if (!this._rotationState) {
          return;
        }
        const currentPointerId =
          moveEvent?.pointerId ??
          moveEvent?.data?.pointerId ??
          moveEvent?.data?.identifier ??
          0;
        if (currentPointerId !== this._rotationState.pointerId) {
          return;
        }
        const globalPoint = extractPointer(moveEvent);
        if (!globalPoint) {
          return;
        }
        const localPoint = this.parent?.toLocal
          ? this.parent.toLocal(globalPoint, null, new Point())
          : new Point(globalPoint.x, globalPoint.y);
        const dx = localPoint.x - this.x;
        const dy = localPoint.y - this.y;
        const angle = Math.atan2(dy, dx);
        this.rotation = angle;
        if (this.uiLayer) {
          this.uiLayer.rotation = -this.rotation;
        }
        this._updateLayout();
        this.emit('battlemap:tokenRotatePreview', {
          id: this.battlemapId,
          rotation: degreesFromRadians(angle),
        });
      };
      const handleUp = (upEvent) => {
        const currentPointerId =
          upEvent?.pointerId ??
          upEvent?.data?.pointerId ??
          upEvent?.data?.identifier ??
          0;
        if (!this._rotationState || currentPointerId !== this._rotationState.pointerId) {
          return;
        }
        stage.off('pointermove', handleMove);
        stage.off('pointerup', handleUp);
        stage.off('pointerupoutside', handleUp);
        this.rotationHandle.cursor = 'grab';
        const finalRotation = degreesFromRadians(this.rotation);
        this.emit('battlemap:tokenRotate', {
          id: this.battlemapId,
          rotation: finalRotation,
        });
        this._rotationState = null;
      };

      stage.on('pointermove', handleMove);
      stage.on('pointerup', handleUp);
      stage.on('pointerupoutside', handleUp);
    });

    this.settingsButton.on('pointertap', (event) => {
      event.stopPropagation();
      this.emit('battlemap:openSettings', { id: this.battlemapId });
    });
    this.barsButton.on('pointertap', (event) => {
      event.stopPropagation();
      this.emit('battlemap:openBars', { id: this.battlemapId });
    });
    this.statesButton.on('pointertap', (event) => {
      event.stopPropagation();
      this.emit('battlemap:openStates', { id: this.battlemapId });
    });
  }

  setCellSize(size) {
    const numeric = Number(size);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return;
    }
    this._cellSize = numeric;
    this._updateLayout();
  }

  setSize(width, height) {
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return;
    }
    this._width = w;
    this._height = h;
    this._updateDimensions();
  }

  _updateDimensions() {
    this.bodySprite.width = this._width;
    this.bodySprite.height = this._height;
    this.bodySprite.anchor.set(0.5);
    this._updateLayout();
  }

  _updateLayout() {
    const halfWidth = this._width / 2;
    const halfHeight = this._height / 2;
    const handleOffset = Math.max(12, this._cellSize * HANDLE_OFFSET_FACTOR);

    this.placeholder.clear();
    this.placeholder.beginFill(this._placeholderColor, 1);
    this.placeholder.drawRoundedRect(-halfWidth, -halfHeight, this._width, this._height, Math.min(halfWidth, halfHeight) * 0.1);
    this.placeholder.endFill();
    this.placeholder.visible = !this._hasTexture;

    this.tintOverlay.clear();
    if (this._tintOpacity > 0) {
      this.tintOverlay.beginFill(this._tintColor, this._tintOpacity);
      this.tintOverlay.drawRect(-halfWidth, -halfHeight, this._width, this._height);
      this.tintOverlay.endFill();
      this.tintOverlay.visible = true;
    } else {
      this.tintOverlay.visible = false;
    }

    this.damageOverlay.clear();
    if (this.damageOverlay.visible) {
      this.damageOverlay.beginFill(0xffffff, this.damageOverlay.alpha);
      this.damageOverlay.drawRect(-halfWidth, -halfHeight, this._width, this._height);
      this.damageOverlay.endFill();
    }

    this.rotationHandle.clear();
    if (this._selected) {
      const radius = Math.max(8, this._cellSize * ICON_SIZE_FACTOR * 0.5);
      this.rotationHandle.lineStyle({ width: 1, color: 0x000000, alpha: 0.35 });
      this.rotationHandle.beginFill(0xffcc00, 0.95);
      this.rotationHandle.drawCircle(0, 0, radius);
      this.rotationHandle.endFill();
      this.rotationHandle.position.set(halfWidth + handleOffset, -halfHeight - handleOffset);
    }

    if (this.loadingSpinner) {
      const minDimension = Math.min(this._width, this._height);
      const spinnerRadius = Math.max(Math.min(minDimension, this._cellSize * 2) * 0.25, 8);
      const spinnerThickness = Math.max(spinnerRadius * 0.35, 3);
      this.loadingSpinner.setStyle({
        radius: spinnerRadius,
        thickness: spinnerThickness,
        color: 0xffffff,
        alpha: 0.9,
      });
      this.loadingSpinner.position.set(0, 0);
      this.loadingSpinner.setActive(this._isTextureLoading);
    }

    const buttonSize = Math.max(12, this._cellSize * BUTTON_SIZE_FACTOR);
    [this.settingsButton, this.barsButton, this.statesButton].forEach((button, index) => {
      button.style.fontSize = buttonSize;
      button.pivot.set(button.width / 2, button.height / 2);
      button.position.set(-halfWidth - handleOffset + (buttonSize + 4) * index, halfHeight + handleOffset);
      button.visible = this._selected;
    });

    const nameFontSize = Math.max(10, this._cellSize * NAME_FONT_FACTOR * Math.min(Math.max(this._width / this._cellSize, this._height / this._cellSize), 2));
    this.nameText.style = {
      ...this.nameText.style,
      fontSize: nameFontSize,
    };
    this.nameText.anchor.set(0.5);
    this.nameShadows.forEach((shadow) => {
      shadow.style = { ...shadow.style, fontSize: nameFontSize };
      shadow.anchor.set(0.5);
    });

    this.nameLayer.position.set(0, halfHeight + nameFontSize * 0.8);

    const offsets = [
      new Point(1, 1),
      new Point(-1, 1),
      new Point(-1, -1),
      new Point(1, -1),
    ];
    offsets.forEach((offset, index) => {
      const shadow = this.nameShadows[index];
      shadow.position.set(offset.x, offset.y);
    });

    this.updateHitArea();
    if (this.uiLayer) {
      this.uiLayer.rotation = -this.rotation;
    }
    this._layoutEstadoIcons();
  }

  updateHitArea() {
    this.hitArea = new Rectangle(-this._width / 2, -this._height / 2, this._width, this._height);
  }

  setTextureFrom(texture) {
    if (!texture) {
      this.bodySprite.texture = Texture.WHITE;
      this._hasTexture = false;
      this.placeholder.visible = true;
      this._updateDimensions();
      return;
    }
    this.bodySprite.texture = texture;
    this._hasTexture = texture !== Texture.WHITE;
    this.placeholder.visible = !this._hasTexture;
    this._updateDimensions();
  }

  async setTexture(url, loader) {
    if (!url) {
      this._textureUrl = null;
      this._currentTextureLoadId = null;
      this._setTextureLoading(false);
      this.setTextureFrom(Texture.WHITE);
      return;
    }
    if (this._textureUrl === url && this._hasTexture && !this._isTextureLoading) {
      return;
    }
    this._textureUrl = url;
    const loadId = Symbol('texture-load');
    this._currentTextureLoadId = loadId;
    this._setTextureLoading(true);
    this.setTextureFrom(Texture.WHITE);

    if (typeof loader === 'function') {
      try {
        const texture = await loader(url);
        if (this._currentTextureLoadId !== loadId || this.destroyed) {
          return;
        }
        if (!texture) {
          throw new Error('Loader returned no texture');
        }
        this.setTextureFrom(texture);
      } catch (error) {
        if (this._currentTextureLoadId === loadId && !this.destroyed) {
          console.error('[TokenSprite] Error loading texture', error);
          this.setTextureFrom(Texture.WHITE);
        }
      } finally {
        if (this._currentTextureLoadId === loadId && !this.destroyed) {
          this._setTextureLoading(false);
        }
      }
      return;
    }

    const texture = Texture.from(url);
    if (this._currentTextureLoadId !== loadId || this.destroyed) {
      return;
    }
    this.setTextureFrom(texture);
    const baseTexture = texture?.baseTexture;
    if (!baseTexture) {
      if (this._currentTextureLoadId === loadId && !this.destroyed) {
        this._setTextureLoading(false);
      }
      return;
    }

    if (baseTexture.valid) {
      if (this._currentTextureLoadId === loadId && !this.destroyed) {
        this._setTextureLoading(false);
      }
      return;
    }

    const handleLoad = () => {
      if (this._currentTextureLoadId !== loadId || this.destroyed) {
        return;
      }
      this._setTextureLoading(false);
      baseTexture.off('error', handleError);
    };

    const handleError = (event) => {
      if (this._currentTextureLoadId !== loadId || this.destroyed) {
        return;
      }
      console.error('[TokenSprite] Error loading texture', event);
      this.setTextureFrom(Texture.WHITE);
      this._setTextureLoading(false);
      baseTexture.off('loaded', handleLoad);
    };

    baseTexture.once('loaded', handleLoad);
    baseTexture.once('error', handleError);
  }

  _setTextureLoading(loading) {
    const normalized = Boolean(loading);
    if (this._isTextureLoading === normalized) {
      if (this.loadingSpinner) {
        this.loadingSpinner.setActive(normalized);
      }
      return;
    }
    this._isTextureLoading = normalized;
    if (this.loadingSpinner) {
      this.loadingSpinner.setActive(normalized);
    }
  }

  setPlaceholderColor(color) {
    this._placeholderColor = resolveColor(color, DEFAULT_PLACEHOLDER_COLOR);
    this._updateLayout();
  }

  setTint(color, opacity) {
    this._tintColor = resolveColor(color, this._tintColor);
    const numericOpacity = Number(opacity);
    this._tintOpacity = Number.isFinite(numericOpacity)
      ? Math.min(Math.max(numericOpacity, 0), 1)
      : 0;
    this._updateLayout();
  }

  setAura({ radius = 0, shape = 'circle', color = '#ffff00', opacity = 0.25 } = {}) {
    const numericRadius = Number(radius);
    const normalizedOpacity = Math.min(Math.max(Number(opacity) || 0, 0), 1);
    if (!Number.isFinite(numericRadius) || numericRadius <= 0 || normalizedOpacity <= 0) {
      this.auraLayer.visible = false;
      this.auraLayer.alpha = 0;
      this.auraLayer.clear();
      return;
    }
    const auraColor = resolveColor(color, 0xffff00);
    const pixelRadius = numericRadius * this._cellSize;
    const halfWidth = this._width / 2;
    const halfHeight = this._height / 2;
    this.auraLayer.clear();
    this.auraLayer.beginFill(auraColor, normalizedOpacity);
    if (shape === 'square') {
      this.auraLayer.drawRect(-halfWidth - pixelRadius, -halfHeight - pixelRadius, this._width + pixelRadius * 2, this._height + pixelRadius * 2);
    } else {
      const radius = Math.max(halfWidth, halfHeight) + pixelRadius;
      this.auraLayer.drawCircle(0, 0, radius);
    }
    this.auraLayer.endFill();
    this.auraLayer.visible = true;
    this.auraLayer.alpha = 1;
  }

  setSelected(selected) {
    this._selected = Boolean(selected);
    this.rotationHandle.visible = this._selected;
    this.settingsButton.visible = this._selected;
    this.barsButton.visible = this._selected;
    this.statesButton.visible = this._selected;
    this._updateLayout();
  }

  setName({ name, customName, showName }) {
    const resolvedName = customName || name || '';
    this._showName = Boolean(showName && resolvedName);
    this._nameValue = resolvedName;
    this.nameText.text = resolvedName;
    this.nameShadows.forEach((shadow) => {
      shadow.text = resolvedName;
    });
    this._updateNameVisibility();
    this._updateLayout();
  }

  _updateNameVisibility() {
    this.nameLayer.visible = Boolean(this._showName && this._nameValue);
  }

  setEstados(estados = []) {
    const list = Array.isArray(estados) ? estados.filter(Boolean) : [];
    this._estados = list;
    this._layoutEstadoIcons();
  }

  _layoutEstadoIcons() {
    if (!this.estadoLayer) {
      return;
    }
    this.estadoLayer.removeChildren();
    if (!this._estados || this._estados.length === 0) {
      return;
    }
    const estadoSize = Math.min(
      this._cellSize * 0.35,
      this._estados.length > 0 ? (this._width / this._estados.length) * 0.9 : this._cellSize * 0.35
    );
    this._estados
      .map((id) => ESTADOS.find((estado) => estado.id === id))
      .filter(Boolean)
      .forEach((estado, index) => {
        const sprite = Sprite.from(estado.img);
        sprite.width = estadoSize;
        sprite.height = estadoSize;
        sprite.anchor.set(0, 1);
        sprite.position.set(-this._width / 2 + index * estadoSize, -this._height / 2 - estadoSize - 4);
        sprite.eventMode = 'none';
        this.estadoLayer.addChild(sprite);
      });
  }

  async applyBattlemapData(data = {}, { loader, cellSize } = {}) {
    if (!data) {
      return;
    }
    this.setCellSize(cellSize ?? this._cellSize);
    const pixelSize = Number(data.pixelSize ?? data.size ?? this._width);
    if (Number.isFinite(pixelSize) && pixelSize > 0) {
      this.setSize(pixelSize, pixelSize);
    }
    if (Number.isFinite(data.width) && Number.isFinite(data.height)) {
      this.setSize(data.width, data.height);
    }
    if (data.x !== undefined && data.y !== undefined) {
      this.position.set(Number(data.x) || 0, Number(data.y) || 0);
    }
    if (data.rotation !== undefined) {
      this.rotation = radiansFromDegrees(Number(data.rotation) || 0);
      if (this.uiLayer) {
        this.uiLayer.rotation = -this.rotation;
      }
    }
    if (data.opacity !== undefined) {
      this.alpha = Math.min(Math.max(Number(data.opacity) || 0, 0), 1);
    }
    if (data.zIndex !== undefined) {
      this.zIndex = Number(data.zIndex) || 0;
    }
    if (data.textureUrl !== undefined) {
      await this.setTexture(data.textureUrl, loader);
    }
    if (data.color !== undefined) {
      this.setPlaceholderColor(data.color);
    }
    if (data.tint !== undefined || data.tintOpacity !== undefined) {
      this.setTint(data.tint ?? this._tintColor, data.tintOpacity ?? this._tintOpacity);
    }
    if (data.auraRadius !== undefined || data.auraShape !== undefined) {
      this.setAura({
        radius: data.auraRadius,
        shape: data.auraShape,
        color: data.auraColor,
        opacity: data.auraOpacity,
      });
    }
    if (data.metadata) {
      const { name, customName, showName, estados, tokenSheetId } = data.metadata;
      this.setName({ name: data.name ?? name, customName, showName });
      if (estados !== undefined) {
        this.setEstados(estados);
      }
      if (tokenSheetId !== undefined) {
        this.setTokenSheetId(tokenSheetId);
      }
      this._metadata = { ...data.metadata };
    } else {
      this.setName({ name: data.name, customName: data.customName, showName: data.showName });
      if (data.estados !== undefined) {
        this.setEstados(data.estados);
      }
      if (data.tokenSheetId !== undefined) {
        this.setTokenSheetId(data.tokenSheetId);
      }
    }
    if (data.showName !== undefined || data.name !== undefined || data.customName !== undefined) {
      this.setName({ name: data.name, customName: data.customName, showName: data.showName });
    }
  }

  setTokenSheetId(id) {
    if (!id) {
      this._tokenSheetId = null;
      window.removeEventListener('tokenSheetSaved', this._onSheetSaved);
      return;
    }
    if (this._tokenSheetId === id) {
      return;
    }
    this._tokenSheetId = id;
    window.removeEventListener('tokenSheetSaved', this._onSheetSaved);
    window.addEventListener('tokenSheetSaved', this._onSheetSaved);
    try {
      const stored = localStorage.getItem('tokenSheets');
      if (!stored) {
        this._stats = {};
        return;
      }
      const sheets = JSON.parse(stored);
      const sheet = ensureSheetDefaults(sheets?.[id]);
      this._stats = { ...(sheet?.stats || {}) };
    } catch (error) {
      console.error('[TokenSprite] Error loading token sheet stats', error);
      this._stats = {};
    }
  }

  getStats() {
    return { ...this._stats };
  }

  handleStatClick(statKey, event) {
    if (!statKey || !this._tokenSheetId) {
      return;
    }
    const current = this._stats?.[statKey] || {};
    const max = current.total ?? current.base ?? current.actual ?? 0;
    const delta = event?.shiftKey ? -1 : 1;
    const nextActual = Math.max(0, Math.min(max, (current.actual || 0) + delta));
    const updated = {
      ...this._stats,
      [statKey]: {
        ...current,
        actual: nextActual,
      },
    };
    this._stats = updated;
    saveTokenSheet({ id: this._tokenSheetId, stats: updated });
    this.emit('battlemap:statChange', { id: this.battlemapId, stat: statKey, value: nextActual });
  }

  getLocalSize() {
    return { width: this._width, height: this._height };
  }

  getBoundsRelativeTo(displayObject) {
    const bounds = super.getBounds(false);
    if (!displayObject || typeof displayObject.toLocal !== 'function') {
      return bounds;
    }
    const topLeft = displayObject.toLocal(new Point(bounds.x, bounds.y));
    const bottomRight = displayObject.toLocal(
      new Point(bounds.x + bounds.width, bounds.y + bounds.height)
    );
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  highlightDamage({ opacity = 0.5, duration = DAMAGE_ANIMATION_MS } = {}) {
    const startOpacity = Math.min(Math.max(Number(opacity) || 0, 0), 1);
    const totalDuration = Math.max(Number(duration) || DAMAGE_ANIMATION_MS, 100);
    this.damageOverlay.visible = true;
    this.damageOverlay.alpha = startOpacity;
    this._updateLayout();
    this._damageStart = performance.now();
    this._damageDuration = totalDuration;
    if (this._ticker) {
      this._ticker.stop();
      this._ticker.destroy();
    }
    this._ticker = new Ticker();
    this._ticker.add(() => {
      const elapsed = performance.now() - this._damageStart;
      const progress = Math.min(Math.max(elapsed / this._damageDuration, 0), 1);
      const nextAlpha = startOpacity * (1 - progress);
      this.damageOverlay.alpha = nextAlpha;
      if (progress >= 1) {
        this.damageOverlay.visible = false;
        this.damageOverlay.clear();
        this._ticker.stop();
        this._ticker.destroy();
        this._ticker = null;
      } else {
        this.damageOverlay.visible = true;
        this.damageOverlay.clear();
        this.damageOverlay.beginFill(0xffffff, nextAlpha);
        this.damageOverlay.drawRect(-this._width / 2, -this._height / 2, this._width, this._height);
        this.damageOverlay.endFill();
      }
    });
    this._ticker.start();
  }
}
