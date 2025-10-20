import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { Application, extend, useApplication } from '@pixi/react';
import { Color, Container, Graphics, Sprite, Text, Texture, TextStyle } from 'pixi.js';
extend({ Container, Graphics, Sprite, Text });
import Toolbar from './Toolbar';
import TokenSettings from './TokenSettings';
import TokenEstadoMenu from './TokenEstadoMenu';
import TokenBarMenu from './TokenBarMenu';
import TokenSheetModal from './TokenSheetModal';
import WallDoorMenu from './WallDoorMenu';
import DoorCheckModal from './DoorCheckModal';
import AttackModal from './AttackModal';
import DefenseModal from './DefenseModal';
import { isDoorVisible, isTokenVisible } from '../utils/playerVisibility';
import { DEFAULT_SHOP_CONFIG, normalizeShopConfig } from '../utils/shop';
import { normalizeShopInventories } from '../utils/shopInventory';
import { applyDoorCheck } from '../utils/door';
import { computeVisibilityWithSegments, createVisibilitySegments } from '../utils/visibility';
import LoadingSpinner from './LoadingSpinner';

const DEFAULT_STAGE_BACKGROUND = '#1f2937';

const colorToHex = (value, fallback = '#ffffff') => {
  const resolved = value ?? fallback;
  return Color.shared.setValue(resolved).toNumber();
};

const createTexture = (url) => {
  if (!url) return null;
  return Texture.from(url, {
    resourceOptions: {
      crossOrigin: 'anonymous',
    },
  });
};

const useTexture = (url) => {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return undefined;
    }

    let destroyed = false;
    const tex = createTexture(url);
    if (!destroyed) {
      setTexture(tex);
    }

    return () => {
      destroyed = true;
    };
  }, [url]);

  return texture;
};

const StageViewport = ({
  width,
  height,
  children,
  backgroundColor,
  scale,
  position,
  pivot,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
}) => {
  const app = useApplication();

  useEffect(() => {
    if (!app?.renderer) return;
    const current = app.renderer.background.color;
    const normalized = colorToHex(backgroundColor, DEFAULT_STAGE_BACKGROUND);
    if (current !== normalized) {
      app.renderer.background.color = normalized;
    }
  }, [app, backgroundColor]);

  return (
    <Container
      eventMode="static"
      pointerdown={onPointerDown}
      pointermove={onPointerMove}
      pointerup={onPointerUp}
      pointerupoutside={onPointerLeave}
      pointerout={onPointerLeave}
      scale={scale}
      position={position}
      pivot={pivot}
      sortableChildren
    >
      {children}
    </Container>
  );
};

StageViewport.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  children: PropTypes.node,
  backgroundColor: PropTypes.string,
  scale: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }).isRequired,
  position: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }).isRequired,
  pivot: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }).isRequired,
  onPointerDown: PropTypes.func,
  onPointerMove: PropTypes.func,
  onPointerUp: PropTypes.func,
  onPointerLeave: PropTypes.func,
};

const GridLayer = ({
  width,
  height,
  cellSize,
  offsetX,
  offsetY,
  color,
  opacity,
  visible,
}) => {
  const draw = useCallback(
    (g) => {
      g.clear();
      if (!visible) {
        return;
      }
      g.lineStyle(1, colorToHex(color), opacity ?? 0.25);
      const startX = -((offsetX % cellSize) + cellSize);
      const startY = -((offsetY % cellSize) + cellSize);
      for (let x = startX; x < width + cellSize; x += cellSize) {
        g.moveTo(x, -cellSize);
        g.lineTo(x, height + cellSize);
      }
      for (let y = startY; y < height + cellSize; y += cellSize) {
        g.moveTo(-cellSize, y);
        g.lineTo(width + cellSize, y);
      }
    },
    [visible, color, opacity, offsetX, offsetY, width, height, cellSize]
  );

  return <Graphics draw={draw} />;
};

GridLayer.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  cellSize: PropTypes.number.isRequired,
  offsetX: PropTypes.number.isRequired,
  offsetY: PropTypes.number.isRequired,
  color: PropTypes.string,
  opacity: PropTypes.number,
  visible: PropTypes.bool,
};

const TileSprite = ({ tile }) => {
  const texture = useMemo(() => (tile.url ? createTexture(tile.url) : Texture.WHITE), [
    tile.url,
  ]);
  return (
    <Container
      x={tile.x}
      y={tile.y}
      rotation={((tile.rotation ?? 0) * Math.PI) / 180}
      alpha={tile.opacity ?? 1}
      eventMode="none"
    >
      <Sprite
        texture={texture}
        width={tile.width}
        height={tile.height}
        anchor={0.5}
      />
    </Container>
  );
};

TileSprite.propTypes = {
  tile: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number,
    height: PropTypes.number,
    url: PropTypes.string,
    rotation: PropTypes.number,
    opacity: PropTypes.number,
  }).isRequired,
};

const TokenSprite = ({ token, gridSize, onPointerDown, selected, alpha, showName }) => {
  const width = (token.w || 1) * gridSize;
  const height = (token.h || 1) * gridSize;
  const texture = useMemo(() => (token.url ? createTexture(token.url) : Texture.WHITE), [
    token.url,
  ]);
  return (
    <Container
      x={token.x}
      y={token.y}
      rotation={((token.angle ?? 0) * Math.PI) / 180}
      eventMode="static"
      pointerdown={(event) => onPointerDown?.(event, token)}
      sortableChildren
    >
      <Sprite
        texture={texture}
        width={width}
        height={height}
        anchor={0.5}
        tint={token.tintColor ? colorToHex(token.tintColor) : 0xffffff}
        alpha={alpha}
      />
      {selected && (
        <Graphics
          draw={(g) => {
            g.clear();
            g.lineStyle(2, 0x6366f1, 0.8);
            g.drawRect(-width / 2, -height / 2, width, height);
          }}
        />
      )}
      {showName && (
        <Text
          text={token.customName || token.name || 'Token'}
          anchor={{ x: 0.5, y: 0 }}
          y={height / 2 + 6}
          style={new TextStyle({
            fill: '#fff',
            fontSize: Math.round(gridSize * 0.4),
            stroke: '#000',
            strokeThickness: 4,
          })}
        />
      )}
    </Container>
  );
};

TokenSprite.propTypes = {
  token: PropTypes.object.isRequired,
  gridSize: PropTypes.number.isRequired,
  onPointerDown: PropTypes.func,
  selected: PropTypes.bool,
  alpha: PropTypes.number,
  showName: PropTypes.bool,
};

const LightMask = ({
  lights,
  visible,
  darknessOpacity,
  width,
  height,
}) => {
  const draw = useCallback(
    (g) => {
      g.clear();
      if (!visible) {
        return;
      }

      g.beginFill(0x000000, darknessOpacity);
      g.drawRect(0, 0, width, height);
      g.endFill();

      lights.forEach((light) => {
        g.beginHole();
        if (light.polygonPoints && light.polygonPoints.length >= 6) {
          g.moveTo(light.polygonPoints[0], light.polygonPoints[1]);
          for (let i = 2; i < light.polygonPoints.length; i += 2) {
            g.lineTo(light.polygonPoints[i], light.polygonPoints[i + 1]);
          }
          g.closePath();
        } else {
          g.drawCircle(light.x, light.y, Math.max(light.dimRadius || 0, 0));
        }
        g.endHole();
      });
    },
    [visible, width, height, lights, darknessOpacity]
  );

  if (!visible || (lights?.length ?? 0) === 0) {
    return null;
  }

  return <Graphics draw={draw} />;
};

LightMask.propTypes = {
  lights: PropTypes.array,
  visible: PropTypes.bool,
  darknessOpacity: PropTypes.number,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};

const PixiMapCanvas = forwardRef((props, ref) => {
  const {
    backgroundImage,
    gridSize = 64,
    gridCells = 30,
    gridOffsetX = 0,
    gridOffsetY = 0,
    minZoom = 0.5,
    maxZoom = 2,
    initialZoom = 1,
    tokens = [],
    onTokensChange,
    tiles = [],
    onTilesChange,
    lines = [],
    onLinesChange,
    walls = [],
    onWallsChange,
    texts = [],
    onTextsChange,
    ambientLights = [],
    onAmbientLightsChange,
    activeLayer = 'tokens',
    onLayerChange,
    enableDarkness = false,
    darknessOpacity = 0.8,
    showVisionPolygons = false,
    pageId,
    isPlayerView = false,
    showGrid = true,
    gridColor = '#ffffff',
    gridOpacity = 0.2,
    onGridSettingsChange,
    enemies = [],
    players = [],
    armas = [],
    armaduras = [],
    habilidades = [],
    highlightText,
    rarityColorMap,
    userType = 'master',
    playerName,
    shopConfig,
    onShopConfigChange,
    tilesScaleMode = 'contain',
    ...rest
  } = props;

  const containerRef = useRef(null);
  const [containerElement, setContainerElement] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(initialZoom);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [pivot, setPivot] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selectedTokenIds, setSelectedTokenIds] = useState([]);
  const [hoverTokenId, setHoverTokenId] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(4);
  const [measureShape, setMeasureShape] = useState('line');
  const [measureVisible, setMeasureVisible] = useState(false);
  const [measureSnap, setMeasureSnap] = useState(true);
  const [measureRule, setMeasureRule] = useState('grid');
  const [measureUnitValue, setMeasureUnitValue] = useState(5);
  const [measureUnitLabel, setMeasureUnitLabel] = useState('ft');
  const [textOptions, setTextOptions] = useState({
    fontFamily: 'Roboto',
    fontSize: 18,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    align: 'center',
  });
  const [textMenuVisible, setTextMenuVisible] = useState(false);
  const [settingsTokenIds, setSettingsTokenIds] = useState([]);
  const [estadoTokenIds, setEstadoTokenIds] = useState([]);
  const [barsToken, setBarsToken] = useState(null);
  const [openSheetTokens, setOpenSheetTokens] = useState([]);
  const [doorMenuWallId, setDoorMenuWallId] = useState(null);
  const [doorCheckWallId, setDoorCheckWallId] = useState(null);
  const [attackReady, setAttackReady] = useState(false);
  const [attackSourceId, setAttackSourceId] = useState(null);
  const [attackTargetId, setAttackTargetId] = useState(null);
  const [attackLine, setAttackLine] = useState(null);
  const [attackResult, setAttackResult] = useState(null);
  const [attackRequestId, setAttackRequestId] = useState(null);
  const [inventoryFeedback, setInventoryFeedback] = useState(null);
  const [shopDraft, setShopDraft] = useState(normalizeShopConfig(shopConfig || DEFAULT_SHOP_CONFIG));
  const [shopSoldItemIds, setShopSoldItemIds] = useState([]);
  const [shopInventories, setShopInventories] = useState(normalizeShopInventories({}));
  const [shopHasPendingChanges, setShopHasPendingChanges] = useState(false);
  const [selectedAmbientLightId, setSelectedAmbientLightId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const stageRef = useRef();

  const backgroundTexture = useTexture(backgroundImage);

  useEffect(() => {
    const application = stageRef.current?.getApplication?.();
    if (!application) return;
    const { width, height } = stageSize;
    if (!width || !height) return;

    application.renderer?.resize(width, height);
    const canvas = stageRef.current?.getCanvas?.();
    if (canvas) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
  }, [stageSize]);

  const handleContainerRef = useCallback((node) => {
    containerRef.current = node;
    setContainerElement(node);
  }, []);

  useLayoutEffect(() => {
    const node = containerElement;
    if (!node) return undefined;

    const updateSize = () => {
      const bounds = node.getBoundingClientRect();
      const { width, height } = bounds;
      setStageSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }
        return { width, height };
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        setStageSize((prev) => {
          if (prev.width === width && prev.height === height) {
            return prev;
          }
          return { width, height };
        });
      });

      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerElement]);

  useEffect(() => {
    setShopDraft(normalizeShopConfig(shopConfig || DEFAULT_SHOP_CONFIG));
  }, [shopConfig]);

  const cellToPx = useCallback((value) => value * gridSize, [gridSize]);
  const pxToCell = useCallback((value) => value / gridSize, [gridSize]);

  const visibleTokens = useMemo(() => {
    if (!isPlayerView) return tokens;
    return tokens.filter((token) => isTokenVisible(token, tokens, walls));
  }, [isPlayerView, tokens, walls]);

  const visibleWalls = useMemo(() => {
    if (!isPlayerView) return walls;
    return walls.filter((wall) => isDoorVisible(wall, tokens));
  }, [isPlayerView, walls, tokens]);

  const handleWheel = useCallback(
    (event) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(maxZoom, Math.max(minZoom, prev + delta)));
    },
    [maxZoom, minZoom]
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel, { passive: false });
  }, [handleWheel]);

  const handlePointerDown = useCallback((event) => {
    setDragging(true);
    setDragStart({ x: event.globalX, y: event.globalY, stagePosition });
  }, [stagePosition]);

  const handlePointerMove = useCallback(
    (event) => {
      if (!dragging || !dragStart) return;
      const dx = event.globalX - dragStart.x;
      const dy = event.globalY - dragStart.y;
      setStagePosition({ x: dragStart.stagePosition.x + dx, y: dragStart.stagePosition.y + dy });
    },
    [dragStart, dragging]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    setDragStart(null);
  }, []);

  const handleTokenPointerDown = useCallback(
    (event, token) => {
      event.stopPropagation();
      if (activeTool === 'select') {
        setSelectedTokenIds([token.id]);
      }
      if (activeTool === 'attack') {
        if (!attackSourceId) {
          setAttackSourceId(token.id);
        } else if (attackSourceId !== token.id) {
          const sourceToken = tokens.find((t) => t.id === attackSourceId);
          setAttackTargetId(token.id);
          if (sourceToken) {
            setAttackLine([sourceToken.x, sourceToken.y, token.x, token.y]);
          }
          setAttackReady(true);
        }
      }
    },
    [activeTool, attackSourceId, tokens]
  );

  const handleTokenHover = useCallback((tokenId) => setHoverTokenId(tokenId), []);

  const renderTokens = useMemo(
    () =>
      visibleTokens.map((token) => (
        <TokenSprite
          key={token.id}
          token={token}
          gridSize={gridSize}
          onPointerDown={handleTokenPointerDown}
          selected={selectedTokenIds.includes(token.id)}
          alpha={token.opacity ?? 1}
          showName={token.showName}
        />
      )),
    [visibleTokens, gridSize, handleTokenPointerDown, selectedTokenIds]
  );

  const visibilitySegments = useMemo(
    () => createVisibilitySegments(visibleWalls),
    [visibleWalls]
  );

  const lightPolygons = useMemo(() => {
    if (!enableDarkness) return [];
    return ambientLights
      .filter((light) => light.enabled !== false)
      .map((light) => {
        const polygon = computeVisibilityWithSegments(
          { x: light.x, y: light.y },
          visibilitySegments,
          { maxDistance: light.dimRadius || gridSize * 8 }
        );
        const polygonPoints = polygon.flatMap((point) => [point.x, point.y]);
        return {
          ...light,
          polygonPoints,
        };
      });
  }, [ambientLights, enableDarkness, visibilitySegments, gridSize]);

  const handleLayerChange = useCallback(
    (layer) => {
      if (onLayerChange) onLayerChange(layer);
    },
    [onLayerChange]
  );

  const handleGridOpacityChange = useCallback(
    (value) => {
      onGridSettingsChange?.({ gridOpacity: value });
    },
    [onGridSettingsChange]
  );

  const handleGridColorChange = useCallback(
    (value) => {
      onGridSettingsChange?.({ gridColor: value });
    },
    [onGridSettingsChange]
  );

  useImperativeHandle(
    ref,
    () => ({
      resetView: () => {
        setZoom(initialZoom);
        setStagePosition({ x: 0, y: 0 });
        setPivot({ x: 0, y: 0 });
      },
      getSelectedTokens: () => tokens.filter((t) => selectedTokenIds.includes(t.id)),
    }),
    [initialZoom, selectedTokenIds, tokens]
  );

  return (
    <div ref={handleContainerRef} className="relative h-full w-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <LoadingSpinner />
        </div>
      )}
      <Application
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        resolution={window.devicePixelRatio}
        antialias
        autoDensity
        background={DEFAULT_STAGE_BACKGROUND}
        resizeTo={containerElement ?? undefined}
      >
        <StageViewport
          width={stageSize.width}
          height={stageSize.height}
          scale={{ x: zoom, y: zoom }}
          position={stagePosition}
          pivot={pivot}
          backgroundColor={DEFAULT_STAGE_BACKGROUND}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <Container sortableChildren>
            {backgroundTexture && (
              <Sprite
                texture={backgroundTexture}
                x={0}
                y={0}
                width={gridCells * gridSize}
                height={gridCells * gridSize}
                anchor={0}
                alpha={1}
              />
            )}
            <GridLayer
              width={gridCells * gridSize}
              height={gridCells * gridSize}
              cellSize={gridSize}
              offsetX={gridOffsetX}
              offsetY={gridOffsetY}
              color={gridColor}
              opacity={gridOpacity}
              visible={showGrid}
            />
            <Container sortableChildren>
              {tiles.map((tile) => (
                <TileSprite key={tile.id} tile={tile} />
              ))}
            </Container>
            <Container sortableChildren>{renderTokens}</Container>
            <Container sortableChildren>
              {texts.map((text) => (
                <Text
                  key={text.id}
                  text={text.text}
                  x={text.x}
                  y={text.y}
                  anchor={{ x: 0.5, y: 0.5 }}
                  style={new TextStyle({
                    fill: text.fill || '#ffffff',
                    fontFamily: text.fontFamily || 'Roboto',
                    fontSize: (text.fontSize || 18) * zoom,
                    stroke: text.stroke || '#000000',
                    strokeThickness: text.strokeWidth || 2,
                    align: text.align || 'center',
                  })}
                />
              ))}
            </Container>
            <Container sortableChildren>
              {visibleWalls.map((wall) => (
                <Graphics
                  key={wall.id}
                  draw={(g) => {
                    g.clear();
                    g.lineStyle(wall.width || 4, colorToHex(wall.color, '#e5e7eb'), 1);
                    const points = wall.points || [];
                    if (points.length >= 2) {
                      g.moveTo(points[0], points[1]);
                      for (let i = 2; i < points.length; i += 2) {
                        g.lineTo(points[i], points[i + 1]);
                      }
                    }
                  }}
                />
              ))}
            </Container>
            <Container sortableChildren>
              {lines.map((line) => (
                <Graphics
                  key={line.id}
                  draw={(g) => {
                    g.clear();
                    g.lineStyle(line.strokeWidth || 3, colorToHex(line.color, '#f87171'), line.opacity || 1);
                    const points = line.points || [];
                    if (points.length >= 2) {
                      g.moveTo(points[0], points[1]);
                      for (let i = 2; i < points.length; i += 2) {
                        g.lineTo(points[i], points[i + 1]);
                      }
                    }
                  }}
                />
              ))}
            </Container>
            <LightMask
              lights={lightPolygons}
              visible={enableDarkness}
              darknessOpacity={darknessOpacity}
              width={gridCells * gridSize}
              height={gridCells * gridSize}
            />
          </Container>
        </StageViewport>
      </Application>

      <Toolbar
        activeTool={activeTool}
        onSelect={setActiveTool}
        drawColor={drawColor}
        onColorChange={setDrawColor}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        measureShape={measureShape}
        onMeasureShapeChange={setMeasureShape}
        measureSnap={measureSnap}
        onMeasureSnapChange={setMeasureSnap}
        measureVisible={measureVisible}
        onMeasureVisibleChange={setMeasureVisible}
        measureRule={measureRule}
        onMeasureRuleChange={setMeasureRule}
        measureUnitValue={measureUnitValue}
        onMeasureUnitValueChange={setMeasureUnitValue}
        measureUnitLabel={measureUnitLabel}
        onMeasureUnitLabelChange={setMeasureUnitLabel}
        textOptions={textOptions}
        onTextOptionsChange={setTextOptions}
        onResetTextOptions={() => setTextOptions({
          fontFamily: 'Roboto',
          fontSize: 18,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 2,
          align: 'center',
        })}
        shopConfig={shopDraft}
        onShopConfigChange={(config) => {
          setShopDraft(config);
          setShopHasPendingChanges(true);
        }}
        onShopApply={() => {
          if (onShopConfigChange) {
            onShopConfigChange(shopDraft);
          }
          setShopHasPendingChanges(false);
        }}
        shopHasPendingChanges={shopHasPendingChanges}
        shopActivePlayers={[]}
        shopAvailableItems={[]}
        onShopPurchase={() => {}}
        shopSoldItemIds={shopSoldItemIds}
        inventoryData={shopInventories}
        inventoryPlayers={[]}
        onInventoryAddItem={() => {}}
        onInventoryRemoveItem={() => {}}
        canManageInventory={userType === 'master'}
        stylePresets={[]}
        onSaveStylePreset={() => {}}
        onApplyStylePreset={() => {}}
        showTextMenu={textMenuVisible}
        activeLayer={activeLayer}
        onLayerChange={handleLayerChange}
        isPlayerView={isPlayerView}
        playerName={playerName}
        rarityColorMap={rarityColorMap}
        inventoryFeedback={inventoryFeedback}
        ambientLights={ambientLights}
        selectedAmbientLightId={selectedAmbientLightId}
        onSelectAmbientLight={setSelectedAmbientLightId}
        onCreateAmbientLight={() => {
          if (!onAmbientLightsChange) return;
          const newLight = {
            id: Date.now(),
            x: gridCells * gridSize * 0.5,
            y: gridCells * gridSize * 0.5,
            brightRadius: gridSize * 2,
            dimRadius: gridSize * 4,
            color: '#ffffff',
            opacity: 1,
            enabled: true,
          };
          onAmbientLightsChange([...ambientLights, newLight]);
          setSelectedAmbientLightId(newLight.id);
        }}
        onUpdateAmbientLight={(light) => {
          if (!onAmbientLightsChange) return;
          onAmbientLightsChange(ambientLights.map((l) => (l.id === light.id ? light : l)));
        }}
        onDeleteAmbientLight={(lightId) => {
          if (!onAmbientLightsChange) return;
          onAmbientLightsChange(ambientLights.filter((l) => l.id !== lightId));
          if (selectedAmbientLightId === lightId) {
            setSelectedAmbientLightId(null);
          }
        }}
        gridCellSize={gridSize}
      />

      {settingsTokenIds.map((id) => {
        const token = tokens.find((t) => t.id === id);
        if (!token) return null;
        return (
          <TokenSettings
            key={id}
            token={token}
            enemies={enemies}
            players={players}
            onClose={() => setSettingsTokenIds((prev) => prev.filter((v) => v !== id))}
            onUpdate={(tk) => {
              onTokensChange(tokens.map((t) => (t.id === tk.id ? tk : t)));
            }}
            onOpenSheet={() => {
              if (token.tokenSheetId) {
                setOpenSheetTokens((prev) =>
                  prev.find((t) => t.tokenSheetId === token.tokenSheetId)
                    ? prev
                    : [...prev, token]
                );
              }
            }}
            onMoveFront={() => {
              const sorted = tokens.filter((t) => t.id !== id);
              onTokensChange([...sorted, token]);
            }}
            onMoveBack={() => {
              const sorted = tokens.filter((t) => t.id !== id);
              onTokensChange([token, ...sorted]);
            }}
            isPlayerView={isPlayerView}
            currentPlayerName={playerName}
          />
        );
      })}

      {estadoTokenIds.map((id) => {
        const token = tokens.find((t) => t.id === id);
        if (!token) return null;
        return (
          <TokenEstadoMenu
            key={id}
            token={token}
            onClose={() => setEstadoTokenIds((prev) => prev.filter((v) => v !== id))}
            onUpdate={(tk) => {
              onTokensChange(tokens.map((t) => (t.id === tk.id ? tk : t)));
            }}
          />
        );
      })}

      {barsToken != null && (() => {
        const token = tokens.find((t) => t.id === barsToken);
        if (!token) return null;
        return (
          <TokenBarMenu
            token={token}
            onClose={() => setBarsToken(null)}
            onUpdate={(tk) => {
              onTokensChange(tokens.map((t) => (t.id === tk.id ? tk : t)));
            }}
          />
        );
      })()}

      {openSheetTokens.map((tk) => (
        <TokenSheetModal
          key={tk.tokenSheetId || tk.id}
          token={tokens.find((t) => t.tokenSheetId === tk.tokenSheetId) || tk}
          enemies={enemies}
          armas={armas}
          armaduras={armaduras}
          habilidades={habilidades}
          onClose={() =>
            setOpenSheetTokens((prev) => prev.filter((t) => t.tokenSheetId !== tk.tokenSheetId))
          }
          highlightText={highlightText}
          rarityColorMap={rarityColorMap}
        />
      ))}

      {doorMenuWallId != null && (
        <WallDoorMenu
          wall={walls.find((w) => w.id === doorMenuWallId)}
          isMaster={userType === 'master'}
          onClose={() => setDoorMenuWallId(null)}
          onUpdate={(w) => {
            onWallsChange?.(walls.map((wall) => (wall.id === w.id ? w : wall)));
          }}
        />
      )}

      {doorCheckWallId != null && (
        <DoorCheckModal
          isOpen
          onClose={(result) => {
            setDoorCheckWallId(null);
            if (result) {
              const targetWall = walls.find((w) => w.id === doorCheckWallId);
              if (targetWall) {
                const updated = applyDoorCheck(targetWall, result);
                onWallsChange?.(walls.map((w) => (w.id === updated.id ? updated : w)));
              }
            }
          }}
          playerName={playerName}
          difficulty={walls.find((w) => w.id === doorCheckWallId)?.difficulty || 1}
        />
      )}

      {attackReady && attackTargetId && (
        <AttackModal
          isOpen
          attacker={tokens.find((t) => t.id === attackSourceId)}
          target={tokens.find((t) => t.id === attackTargetId)}
          distance={
            attackLine
              ? Math.round(
                  Math.hypot(
                    pxToCell(attackLine[2] - attackLine[0]),
                    pxToCell(attackLine[3] - attackLine[1])
                  )
                )
              : 0
          }
          pageId={pageId}
          armas={armas}
          poderesCatalog={habilidades}
          onClose={(res) => {
            setAttackReady(false);
            if (!res) {
              setAttackTargetId(null);
              setAttackLine(null);
            }
          }}
        />
      )}

      {attackResult && (
        <DefenseModal
          isOpen
          attacker={tokens.find((t) => t.id === attackSourceId)}
          target={tokens.find((t) => t.id === attackTargetId)}
          distance={
            attackLine
              ? Math.round(
                  Math.hypot(
                    pxToCell(attackLine[2] - attackLine[0]),
                    pxToCell(attackLine[3] - attackLine[1])
                  )
                )
              : 0
          }
          attackResult={attackResult}
          pageId={pageId}
          armas={armas}
          poderesCatalog={habilidades}
          onClose={() => {
            setAttackResult(null);
            setAttackTargetId(null);
            setAttackReady(false);
          }}
        />
      )}
    </div>
  );
});

PixiMapCanvas.displayName = 'PixiMapCanvas';

PixiMapCanvas.propTypes = {
  backgroundImage: PropTypes.string,
  gridSize: PropTypes.number,
  gridCells: PropTypes.number,
  gridOffsetX: PropTypes.number,
  gridOffsetY: PropTypes.number,
  minZoom: PropTypes.number,
  maxZoom: PropTypes.number,
  initialZoom: PropTypes.number,
  scaleMode: PropTypes.oneOf(['contain', 'cover']),
  tokens: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      url: PropTypes.string,
      name: PropTypes.string,
      color: PropTypes.string,
      enemyId: PropTypes.string,
      tokenSheetId: PropTypes.string,
      customName: PropTypes.string,
      showName: PropTypes.bool,
      controlledBy: PropTypes.string,
      barsVisibility: PropTypes.oneOf(['all', 'controlled', 'none']),
      w: PropTypes.number,
      h: PropTypes.number,
      angle: PropTypes.number,
      auraRadius: PropTypes.number,
      auraShape: PropTypes.oneOf(['circle', 'square']),
      auraColor: PropTypes.string,
      auraOpacity: PropTypes.number,
      auraVisibility: PropTypes.oneOf(['all', 'controlled', 'none']),
      opacity: PropTypes.number,
      tintColor: PropTypes.string,
      tintOpacity: PropTypes.number,
      estados: PropTypes.array,
    })
  ).isRequired,
  onTokensChange: PropTypes.func.isRequired,
  tiles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      width: PropTypes.number,
      height: PropTypes.number,
      url: PropTypes.string.isRequired,
      rotation: PropTypes.number,
      opacity: PropTypes.number,
      layer: PropTypes.string,
      createdBy: PropTypes.string,
    })
  ),
  onTilesChange: PropTypes.func,
  enemies: PropTypes.array,
  onEnemyUpdate: PropTypes.func,
  players: PropTypes.array,
  armas: PropTypes.array,
  armaduras: PropTypes.array,
  habilidades: PropTypes.array,
  highlightText: PropTypes.func,
  rarityColorMap: PropTypes.object,
  userType: PropTypes.oneOf(['master', 'player']),
  playerName: PropTypes.string,
  lines: PropTypes.array,
  onLinesChange: PropTypes.func,
  walls: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      points: PropTypes.arrayOf(PropTypes.number).isRequired,
      color: PropTypes.string,
      width: PropTypes.number,
      door: PropTypes.oneOf(['secret', 'closed', 'open']),
      difficulty: PropTypes.number,
      baseDifficulty: PropTypes.number,
    })
  ),
  onWallsChange: PropTypes.func,
  texts: PropTypes.array,
  onTextsChange: PropTypes.func,
  ambientLights: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      x: PropTypes.number,
      y: PropTypes.number,
      brightRadius: PropTypes.number,
      dimRadius: PropTypes.number,
      color: PropTypes.string,
      opacity: PropTypes.number,
      enabled: PropTypes.bool,
      layer: PropTypes.string,
    })
  ),
  onAmbientLightsChange: PropTypes.func,
  activeLayer: PropTypes.string,
  onLayerChange: PropTypes.func,
  enableDarkness: PropTypes.bool,
  darknessOpacity: PropTypes.number,
  showVisionPolygons: PropTypes.bool,
  pageId: PropTypes.string,
  isPlayerView: PropTypes.bool,
  showGrid: PropTypes.bool,
  gridColor: PropTypes.string,
  gridOpacity: PropTypes.number,
  onGridSettingsChange: PropTypes.func,
  shopConfig: PropTypes.shape({
    gold: PropTypes.number,
    suggestedItemIds: PropTypes.arrayOf(PropTypes.string),
    playerWallets: PropTypes.objectOf(PropTypes.number),
  }),
  onShopConfigChange: PropTypes.func,
};

export default PixiMapCanvas;
