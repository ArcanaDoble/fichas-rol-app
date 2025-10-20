(function () {
  const DEFAULTS = {
    cellSize: 70,
    gridOpacity: 0.2,
    gridColor: 0xffffff,
    gridVisible: true,
  };

  function normalizeColor(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('#')) {
        return PIXI.utils.string2hex(trimmed);
      }
      return PIXI.utils.string2hex(`#${trimmed}`);
    }
    return DEFAULTS.gridColor;
  }

  window.createBattleMap = async function createBattleMap({
    containerId = 'battlemap-container',
    coordinatesId = 'cell-coordinates',
    backgroundColor = 0x1b1b1b,
  } = {}) {
    if (!PIXI?.Application) {
      throw new Error('PixiJS no está cargado');
    }
    if (!window.pixi_viewport?.Viewport) {
      throw new Error('pixi-viewport no está cargado');
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`No se encontró el contenedor con id "${containerId}"`);
    }

    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    const app = new PIXI.Application();
    await app.init({
      backgroundColor,
      resizeTo: container,
      antialias: true,
    });

    container.appendChild(app.canvas);
    app.canvas.style.display = 'block';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';

    const viewport = new pixi_viewport.Viewport({
      screenWidth: container.clientWidth || window.innerWidth,
      screenHeight: container.clientHeight || window.innerHeight,
      worldWidth: 1000,
      worldHeight: 1000,
      events: new pixi_viewport.utils.DOMListener(app.canvas),
    });

    viewport.drag().pinch().wheel().decelerate();
    viewport.clampZoom({ minScale: 0.2, maxScale: 5 });
    viewport.sortableChildren = true;

    const backgroundLayer = new PIXI.Container();
    backgroundLayer.zIndex = 0;
    backgroundLayer.eventMode = 'none';

    const gridLayer = new PIXI.Graphics();
    gridLayer.zIndex = 1;
    gridLayer.eventMode = 'static';
    gridLayer.cursor = 'default';

    const tokensLayer = new PIXI.Container();
    tokensLayer.zIndex = 2;
    tokensLayer.sortableChildren = true;

    viewport.addChild(backgroundLayer, gridLayer, tokensLayer);
    app.stage.addChild(viewport);

    const state = {
      worldWidth: 1000,
      worldHeight: 1000,
      cellSize: DEFAULTS.cellSize,
      gridOpacity: DEFAULTS.gridOpacity,
      gridColor: DEFAULTS.gridColor,
      gridVisible: DEFAULTS.gridVisible,
      tokens: new Map(),
      selectedToken: null,
      coordinatesElement: document.getElementById(coordinatesId) || null,
    };

    function updateViewportHitArea() {
      viewport.hitArea = new PIXI.Rectangle(0, 0, state.worldWidth, state.worldHeight);
      gridLayer.hitArea = new PIXI.Rectangle(0, 0, state.worldWidth, state.worldHeight);
    }

    function updateCoordinatesLabel(point) {
      if (!state.coordinatesElement) {
        return;
      }
      if (!point || point.x < 0 || point.y < 0 || point.x > state.worldWidth || point.y > state.worldHeight) {
        state.coordinatesElement.textContent = '--';
        return;
      }
      const column = Math.floor(point.x / state.cellSize);
      const row = Math.floor(point.y / state.cellSize);
      state.coordinatesElement.textContent = `Col ${column}, Fila ${row}`;
    }

    function drawGrid() {
      gridLayer.clear();
      if (!state.gridVisible) {
        return;
      }

      gridLayer.lineStyle({
        width: 1,
        color: state.gridColor,
        alpha: state.gridOpacity,
      });

      // Aquí se dibuja la cuadrícula que se superpone al mapa de batalla.
      for (let x = 0; x <= state.worldWidth; x += state.cellSize) {
        gridLayer.moveTo(x, 0);
        gridLayer.lineTo(x, state.worldHeight);
      }
      for (let y = 0; y <= state.worldHeight; y += state.cellSize) {
        gridLayer.moveTo(0, y);
        gridLayer.lineTo(state.worldWidth, y);
      }
    }

    function snapValue(value, worldLimit) {
      const half = state.cellSize / 2;
      const snapped = Math.round((value - half) / state.cellSize) * state.cellSize + half;
      return Math.min(Math.max(snapped, half), Math.max(worldLimit - half, half));
    }

    function snapTokenPosition(token) {
      const snappedX = snapValue(token.x, state.worldWidth);
      const snappedY = snapValue(token.y, state.worldHeight);
      token.position.set(snappedX, snappedY);
    }

    function clearSelection() {
      if (state.selectedToken) {
        state.selectedToken.selectionGraphic.visible = false;
        state.selectedToken.zIndex = state.selectedToken.baseZIndex;
        state.selectedToken = null;
      }
    }

    function updateSelectionGraphic(token) {
      if (!token.selectionGraphic) {
        return;
      }
      const radius = Math.max(token.width, token.height) / 2 + 4;
      token.selectionGraphic.clear();
      token.selectionGraphic.lineStyle({ width: 3, color: 0xffcc00, alpha: 0.9 });
      token.selectionGraphic.drawCircle(0, 0, radius);
      token.selectionGraphic.visible = true;
    }

    function selectToken(token) {
      if (state.selectedToken === token) {
        return;
      }
      if (state.selectedToken) {
        state.selectedToken.selectionGraphic.visible = false;
        state.selectedToken.zIndex = state.selectedToken.baseZIndex;
      }
      state.selectedToken = token;
      if (token) {
        token.zIndex = 9999;
        updateSelectionGraphic(token);
      }
    }

    function attachTokenInteraction(token) {
      token.eventMode = 'dynamic';
      token.cursor = 'pointer';
      token.hitArea = new PIXI.Rectangle(-token.width / 2, -token.height / 2, token.width, token.height);

      const onPointerMove = (event) => {
        if (!token.dragging || !token.dragData) {
          return;
        }
        const newPosition = token.dragData.getLocalPosition(tokensLayer);
        token.position.set(newPosition.x, newPosition.y);
      };

      const onPointerUp = () => {
        if (!token.dragging) {
          return;
        }
        token.dragging = false;
        token.dragData = null;

        snapTokenPosition(token); // Aquí se realiza el snap a la cuadrícula al soltar la ficha.
        viewport.plugins.resume('drag');
        viewport.plugins.resume('pinch');
        viewport.plugins.resume('wheel');
        viewport.plugins.resume('decelerate');

        app.stage.off('pointermove', onPointerMove);
        app.stage.off('pointerup', onPointerUp);
        app.stage.off('pointerupoutside', onPointerUp);
      };

      token.on('pointerdown', (event) => {
        event.stopPropagation();
        selectToken(token);

        token.dragging = true;
        token.dragData = event.data;

        viewport.plugins.pause('drag');
        viewport.plugins.pause('pinch');
        viewport.plugins.pause('wheel');
        viewport.plugins.pause('decelerate');

        app.stage.on('pointermove', onPointerMove);
        app.stage.on('pointerup', onPointerUp);
        app.stage.on('pointerupoutside', onPointerUp);
      });
    }

    viewport.on('pointerdown', (event) => {
      if (event.target === viewport || event.target === gridLayer || event.target === backgroundLayer) {
        clearSelection();
      }
    });

    viewport.on('pointermove', (event) => {
      const worldPoint = viewport.toWorld(event.global);
      updateCoordinatesLabel(worldPoint);
    });

    viewport.on('pointerleave', () => {
      updateCoordinatesLabel(null);
    });

    window.addEventListener('resize', () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      app.renderer.resize(width, height);
      viewport.resize(width, height, state.worldWidth, state.worldHeight);
    });

    async function loadMap(url, width, height) {
      const texture = await PIXI.Assets.load(url);
      const mapWidth = width ?? texture.width;
      const mapHeight = height ?? texture.height;

      backgroundLayer.removeChildren();
      const backgroundSprite = new PIXI.Sprite(texture);
      backgroundSprite.anchor.set(0);
      backgroundSprite.width = mapWidth;
      backgroundSprite.height = mapHeight;
      backgroundSprite.eventMode = 'none';
      backgroundLayer.addChild(backgroundSprite);

      state.worldWidth = mapWidth;
      state.worldHeight = mapHeight;

      viewport.worldWidth = mapWidth;
      viewport.worldHeight = mapHeight;
      viewport.clamp({ left: 0, right: mapWidth, top: 0, bottom: mapHeight });
      viewport.resize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight, mapWidth, mapHeight);
      viewport.moveCenter(mapWidth / 2, mapHeight / 2);

      updateViewportHitArea();
      drawGrid();
    }

    function setGrid({ cellSize, opacity, color, visible } = {}) {
      if (typeof cellSize === 'number' && cellSize > 0) {
        state.cellSize = cellSize;
      }
      if (typeof opacity === 'number') {
        state.gridOpacity = Math.min(Math.max(opacity, 0), 1);
      }
      if (typeof color !== 'undefined') {
        state.gridColor = normalizeColor(color);
      }
      if (typeof visible === 'boolean') {
        state.gridVisible = visible;
      }
      drawGrid();
    }

    async function addToken({ id, textureUrl, x = state.cellSize / 2, y = state.cellSize / 2, size } = {}) {
      if (!id) {
        throw new Error('El token necesita un id único.');
      }
      if (state.tokens.has(id)) {
        throw new Error(`Ya existe un token con id "${id}".`);
      }
      const texture = await PIXI.Assets.load(textureUrl);
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      const dimension = typeof size === 'number' ? size : state.cellSize * 0.9;
      sprite.width = dimension;
      sprite.height = dimension;

      sprite.selectionGraphic = new PIXI.Graphics();
      sprite.selectionGraphic.visible = false;
      sprite.selectionGraphic.eventMode = 'none';
      sprite.addChildAt(sprite.selectionGraphic, 0);

      tokensLayer.addChild(sprite);
      sprite.baseZIndex = tokensLayer.children.length;
      sprite.zIndex = sprite.baseZIndex;

      sprite.position.set(x, y);
      snapTokenPosition(sprite);

      attachTokenInteraction(sprite);
      state.tokens.set(id, sprite);
      return sprite;
    }

    function centerOn(x, y, scale) {
      if (typeof scale === 'number') {
        viewport.setZoom(scale, true);
      }
      viewport.moveCenter(x, y);
    }

    return {
      app,
      viewport,
      loadMap,
      setGrid,
      addToken,
      centerOn,
      get state() {
        return {
          worldWidth: state.worldWidth,
          worldHeight: state.worldHeight,
          cellSize: state.cellSize,
          gridOpacity: state.gridOpacity,
          gridColor: state.gridColor,
          gridVisible: state.gridVisible,
        };
      },
    };
  };
})();
