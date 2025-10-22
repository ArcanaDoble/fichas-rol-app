import { Color, Container, Graphics, Ticker } from 'pixi.js';

const normalizeColor = (value, fallback = 0xffffff) => {
  try {
    return Color.shared.setValue(
      value !== undefined && value !== null ? value : fallback
    ).toNumber();
  } catch (error) {
    console.warn('[PixiSpinner] Invalid color provided. Using fallback.', error);
    return Color.shared.setValue(fallback).toNumber();
  }
};

export default class PixiSpinner extends Container {
  constructor({ radius = 12, thickness = 4, color = 0xffffff, alpha = 0.85, active = false } = {}) {
    super();
    this.eventMode = 'none';
    this.cursor = 'default';

    this._graphics = new Graphics();
    this._graphics.eventMode = 'none';
    this._graphics.cursor = 'default';
    this.addChild(this._graphics);

    this._radius = Math.max(Number(radius) || 0, 1);
    this._thickness = Math.max(Number(thickness) || 0, 1);
    this._color = normalizeColor(color);
    this._alpha = Math.min(Math.max(Number(alpha) || 0, 0), 1);

    this._ticker = new Ticker();
    this._ticker.stop();
    this._ticker.add(this._handleTick, this);

    this.setStyle({ radius: this._radius, thickness: this._thickness, color: this._color, alpha: this._alpha });
    this.setActive(active);
  }

  setStyle({ radius, thickness, color, alpha } = {}) {
    if (radius !== undefined) {
      const numericRadius = Number(radius);
      this._radius = Math.max(Number.isFinite(numericRadius) ? numericRadius : this._radius, 1);
    }
    if (thickness !== undefined) {
      const numericThickness = Number(thickness);
      this._thickness = Math.max(Number.isFinite(numericThickness) ? numericThickness : this._thickness, 1);
    }
    if (color !== undefined) {
      this._color = normalizeColor(color, this._color);
    }
    if (alpha !== undefined) {
      const numericAlpha = Number(alpha);
      this._alpha = Number.isFinite(numericAlpha)
        ? Math.min(Math.max(numericAlpha, 0), 1)
        : this._alpha;
    }

    this._draw();
    return this;
  }

  setActive(active) {
    const shouldBeActive = Boolean(active);
    this.visible = shouldBeActive;
    if (!this._ticker) {
      return;
    }
    if (shouldBeActive && !this._ticker.started) {
      this._ticker.start();
    } else if (!shouldBeActive && this._ticker.started) {
      this._ticker.stop();
    }
  }

  _draw() {
    const outerRadius = this._radius;
    const innerRadius = Math.max(outerRadius - this._thickness, 0);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 3) / 2; // 270 degrees

    this._graphics.clear();
    if (!outerRadius || outerRadius <= 0) {
      return;
    }

    this._graphics.beginFill(this._color, this._alpha);
    this._graphics.moveTo(Math.cos(startAngle) * outerRadius, Math.sin(startAngle) * outerRadius);
    this._graphics.arc(0, 0, outerRadius, startAngle, endAngle);

    if (innerRadius > 0) {
      this._graphics.lineTo(Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
      this._graphics.arc(0, 0, innerRadius, endAngle, startAngle, true);
    } else {
      this._graphics.lineTo(0, 0);
    }

    this._graphics.closePath();
    this._graphics.endFill();
  }

  _handleTick() {
    if (!this._ticker) {
      return;
    }
    const deltaMs = this._ticker.deltaMS || 16.67;
    const deltaSeconds = deltaMs / 1000;
    const rotationSpeed = Math.PI * 2; // full rotation per second
    this.rotation = (this.rotation + rotationSpeed * deltaSeconds) % (Math.PI * 2);
  }

  destroy(options) {
    if (this._ticker) {
      this._ticker.stop();
      this._ticker.destroy();
      this._ticker = null;
    }
    return super.destroy(options);
  }
}
