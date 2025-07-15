import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
} from 'react';
import PropTypes from 'prop-types';
import {
  Stage,
  Layer,
  Rect,
  Line,
  Image as KonvaImage,
  Group,
  Transformer,
  Circle,
  Text,
  Label,
  Tag,
} from 'react-konva';
import useImage from 'use-image';
import { useDrop } from 'react-dnd';
import { AssetTypes } from './AssetSidebar';
import TokenSettings from './TokenSettings';
import TokenEstadoMenu from './TokenEstadoMenu';
import TokenSheetModal from './TokenSheetModal';
import { ESTADOS } from './EstadoSelector';
import { nanoid } from 'nanoid';
import TokenBars from './TokenBars';
import LoadingSpinner from './LoadingSpinner';
import KonvaSpinner from './KonvaSpinner';
import Konva from 'konva';
import Toolbar from './Toolbar';

const hexToRgba = (hex, alpha = 1) => {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((ch) => ch + ch)
      .join('');
  const int = parseInt(h, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

const hexToRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((ch) => ch + ch)
      .join('');
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};

const mixColors = (baseHex, tintHex, opacity) => {
  const base = hexToRgb(baseHex);
  const tint = hexToRgb(tintHex);
  const r = Math.round(base.r * (1 - opacity) + tint.r * opacity);
  const g = Math.round(base.g * (1 - opacity) + tint.g * opacity);
  const b = Math.round(base.b * (1 - opacity) + tint.b * opacity);
  return `rgb(${r},${g},${b})`;
};

const BRUSH_WIDTHS = {
  small: 2,
  medium: 4,
  large: 6,
};

const TokenAura = ({
  x,
  y,
  width,
  height,
  gridSize,
  auraRadius = 0,
  auraShape = 'circle',
  auraColor = '#ffff00',
  auraOpacity = 0.25,
  showAura = true,
}) => {
  const offX = (width * gridSize) / 2;
  const offY = (height * gridSize) / 2;

  if (auraRadius <= 0 || !showAura) return null;

  return auraShape === 'circle' ? (
    <Circle
      x={x + offX}
      y={y + offY}
      radius={(Math.max(width, height) / 2 + auraRadius) * gridSize}
      fill={hexToRgba(auraColor, auraOpacity)}
      listening={false}
    />
  ) : (
    <Rect
      x={x + offX}
      y={y + offY}
      width={(width + auraRadius * 2) * gridSize}
      height={(height + auraRadius * 2) * gridSize}
      offsetX={((width + auraRadius * 2) * gridSize) / 2}
      offsetY={((height + auraRadius * 2) * gridSize) / 2}
      fill={hexToRgba(auraColor, auraOpacity)}
      listening={false}
    />
  );
};

TokenAura.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  gridSize: PropTypes.number.isRequired,
  auraRadius: PropTypes.number,
  auraShape: PropTypes.oneOf(['circle', 'square']),
  auraColor: PropTypes.string,
  auraOpacity: PropTypes.number,
  showAura: PropTypes.bool,
};

const EstadoImg = ({ src, ...props }) => {
  const [img] = useImage(src, 'anonymous');
  if (!img) return null;
  return <KonvaImage image={img} listening={false} {...props} />;
};

EstadoImg.propTypes = {
  src: PropTypes.string.isRequired,
};
const Token = forwardRef(
  (
    {
      id,
      x,
      y,
      width,
      height,
      angle,
      color,
      image,
      name,
      customName,
      showName,
      gridSize,
      gridOffsetX,
      gridOffsetY,
      cellSize,
      zoom,
      maxZoom,
      groupScale,
      selected,
      draggable = true,
      listening = true,
      opacity = 1,
      onDragEnd,
      onDragStart,
      onClick,
      onTransformEnd,
      onRotate,
      onSettings,
      onStates,
      onHoverChange,
      tokenSheetId,
      auraRadius = 0,
      auraShape = 'circle',
      auraColor = '#ffff00',
      auraOpacity = 0.25,
      showAura = true,
      tintColor = '#ff0000',
      tintOpacity = 0,
      showSpinner = true,
      estados = [],
    },
    ref
  ) => {
    // Load token texture with CORS enabled so filters like tint work
    const [img, imgStatus] = useImage(image, 'anonymous');
    const isImgLoading = !!image && imgStatus === 'loading';
    const groupRef = useRef();
    const shapeRef = useRef();
    const trRef = useRef();
    const rotateRef = useRef();
    const gearRef = useRef();
    const estadosRef = useRef();
    const textRef = useRef();
    const textGroupRef = useRef();
    const HANDLE_OFFSET = 12;
    const iconSize = cellSize * 0.15;
    const buttonSize = cellSize * 0.3;
    const estadoBase = cellSize * 0.3;
    const estadosInfo = estados
      .map((id) => ESTADOS.find((e) => e.id === id))
      .filter(Boolean);
    const estadoSize =
      estadosInfo.length > 0
        ? Math.min(estadoBase, (width * gridSize) / estadosInfo.length)
        : estadoBase;
    const nameFontSize = Math.max(
      10,
      cellSize * 0.12 * Math.min(Math.max(width, height), 2)
    );
    const [stats, setStats] = useState({});

    const SNAP = gridSize / 4;

    const placeholderBase = color || 'red';
    const fillColor =
      tintOpacity > 0
        ? mixColors(placeholderBase, tintColor, tintOpacity)
        : placeholderBase;
    const estadoData = estados
      .map((id) => ESTADOS.find((e) => e.id === id))
      .filter(Boolean);

    useEffect(() => {
      const node = shapeRef.current;
      if (!node || !img) return;
      const { r, g, b } = hexToRgb(tintColor);

      if (tintOpacity > 0) {
        const pixelRatio = window.devicePixelRatio * groupScale;
        node.cache({
          pixelRatio,
        });
        node.filters([Konva.Filters.RGBA]);
        node.red(r);
        node.green(g);
        node.blue(b);
        node.alpha(tintOpacity);
      } else {
        node.filters([]);
        node.clearCache();
      }
      node.getLayer()?.batchDraw();
    }, [tintColor, tintOpacity, img, groupScale]);

    useEffect(() => {
      if (!tokenSheetId) return;
      const load = () => {
        const stored = localStorage.getItem('tokenSheets');
        if (!stored) return;
        const sheets = JSON.parse(stored);
        const sheet = sheets[tokenSheetId];
        if (sheet && sheet.stats) setStats(sheet.stats);
      };
      load();
      const handler = (e) => {
        if (e.detail && e.detail.id === tokenSheetId) {
          setStats(e.detail.stats || {});
        }
      };
      window.addEventListener('tokenSheetSaved', handler);
      return () => window.removeEventListener('tokenSheetSaved', handler);
    }, [tokenSheetId]);

    const updateHandle = () => {
      const node = shapeRef.current;
      const handle = rotateRef.current;
      const gear = gearRef.current;
      const label = textRef.current;
      const labelGroup = textGroupRef.current;
      if (!node || !handle) return;
      const box = node.getClientRect({ relativeTo: node.getParent() });
      handle.position({
        x: box.x + box.width + HANDLE_OFFSET,
        y: box.y - HANDLE_OFFSET,
      });
      if (gear) {
        gear.position({
          x: box.x - HANDLE_OFFSET,
          y: box.y + box.height + HANDLE_OFFSET,
        });
      }
      if (estadosRef.current) {
        estadosRef.current.position({
          x: box.x - HANDLE_OFFSET + buttonSize + 4,
          y: box.y + box.height + HANDLE_OFFSET,
        });
      }
      if (labelGroup && label) {
        labelGroup.position({
          x: box.x + box.width / 2,
          y: box.y + box.height + 4,
        });
        labelGroup.offsetX(label.width() / 2);
      }
      handle.getLayer().batchDraw();
    };
    useLayoutEffect(() => {
      const label = textRef.current;
      const group = textGroupRef.current;
      if (label && group) {
        group.offsetX(label.width() / 2);
        group.getLayer()?.batchDraw();
      }
    }, [customName, name, cellSize]);
    const updateSizes = () => {
      if (rotateRef.current) {
        rotateRef.current.radius(iconSize / 2);
      }
      if (gearRef.current) {
        gearRef.current.fontSize(buttonSize);
      }
      if (estadosRef.current) {
        estadosRef.current.fontSize(buttonSize);
      }
    };

    useEffect(() => {
      updateSizes();
      if (selected) updateHandle();
    }, [cellSize, selected]);
    useEffect(() => {
      if (selected && trRef.current && shapeRef.current) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer().batchDraw();
        updateHandle();
      }
    }, [selected]);

    useEffect(() => {
      if (selected) updateHandle();
    }, [x, y, width, height, angle, selected]);

    const snapBox = (box) => {
      const threshold = gridSize;
      const snap =
        box.width < threshold && box.height < threshold ? SNAP : gridSize;

      box.x = Math.round(box.x / snap) * snap;
      box.y = Math.round(box.y / snap) * snap;

      if (snap === SNAP) {
        box.width = Math.max(SNAP, Math.round(box.width / SNAP) * SNAP);
        box.height = Math.max(SNAP, Math.round(box.height / SNAP) * SNAP);
      } else {
        const cells = Math.max(
          1,
          Math.round(Math.max(box.width, box.height) / gridSize)
        );
        box.width = cells * gridSize;
        box.height = cells * gridSize;
      }

      return box;
    };

    const handleTransformStart = () => {
      if (shapeRef.current) shapeRef.current.draggable(false);
    };

    const handleTransformEnd = () => {
      if (shapeRef.current) shapeRef.current.draggable(true);
      const node = shapeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      let newWidth = node.width() * scaleX;
      let newHeight = node.height() * scaleY;

      const subCell = newWidth < gridSize && newHeight < gridSize;
      const snap = subCell ? SNAP : gridSize;

      let left = node.x() - node.offsetX();
      let top = node.y() - node.offsetY();
      left = Math.round(left / snap) * snap;
      top = Math.round(top / snap) * snap;

      if (subCell) {
        newWidth = Math.max(SNAP, Math.round(newWidth / SNAP) * SNAP);
        newHeight = Math.max(SNAP, Math.round(newHeight / SNAP) * SNAP);
      } else {
        const cells = Math.max(
          1,
          Math.round(Math.max(newWidth, newHeight) / gridSize)
        );
        newWidth = cells * gridSize;
        newHeight = cells * gridSize;
      }

      node.width(newWidth);
      node.height(newHeight);
      node.offsetX(newWidth / 2);
      node.offsetY(newHeight / 2);

      node.position({ x: left + newWidth / 2, y: top + newHeight / 2 });

      updateHandle();
      onTransformEnd(id, newWidth / gridSize, newHeight / gridSize, left, top);
    };

    const handleRotateMove = (e) => {
      const node = shapeRef.current;
      const stage = node.getStage();
      const pointer = stage.getPointerPosition();
      const center = node.getAbsolutePosition();
      let angle =
        (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) /
        Math.PI;
      if (e.evt.shiftKey) angle = Math.round(angle / 15) * 15;
      const snapped = Math.round(angle / 90) * 90;
      if (Math.abs(angle - snapped) <= 7) angle = snapped;
      node.rotation(angle);
      updateHandle();
    };

    const handleRotateEnd = () => {
      updateHandle();
      onRotate(id, shapeRef.current.rotation());
    };

    const handleStatClick = (statKey, e) => {
      if (!draggable) return;
      e.cancelBubble = true;
      setStats((prev) => {
        const current = prev[statKey] || {};
        const max = current.total ?? current.base ?? current.actual ?? 0;
        const delta = e.evt.shiftKey ? -1 : 1;
        const next = {
          ...current,
          actual: Math.max(0, Math.min(max, (current.actual || 0) + delta)),
        };
        const updated = { ...prev, [statKey]: next };
        if (tokenSheetId) {
          const stored = localStorage.getItem('tokenSheets');
          if (stored) {
            const sheets = JSON.parse(stored);
            const sheet = sheets[tokenSheetId];
            if (sheet && sheet.stats) {
              sheet.stats = updated;
              sheets[tokenSheetId] = sheet;
              localStorage.setItem('tokenSheets', JSON.stringify(sheets));
              window.dispatchEvent(
                new CustomEvent('tokenSheetSaved', {
                  detail: { id: tokenSheetId, stats: updated },
                })
              );
            }
          }
        }
        return updated;
      });
    };

    useImperativeHandle(ref, () => ({
      node: groupRef.current,
      shapeNode: shapeRef.current,
      getStats: () => stats,
      handleStatClick,
    }));

    const offX = (width * gridSize) / 2;
    const offY = (height * gridSize) / 2;

    const geometry = {
      x: x + offX,
      y: y + offY,
      width: width * gridSize,
      height: height * gridSize,
      offsetX: offX,
      offsetY: offY,
      rotation: angle,
    };

    const common = {
      ...geometry,
      draggable,
      listening,
      opacity,
      onDragStart: () => onDragStart?.(id),
      onDragMove: updateHandle,
      onDragEnd: (e) => {
        onDragEnd(id, e);
        updateHandle();
      },
      onClick: () => onClick?.(id),
    };

    const outline = {
      ...geometry,
      stroke: '#e0e0e0',
      strokeWidth: 3,
      listening: false,
    };

    return (
      <Group
        ref={groupRef}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        onDblClick={() => onSettings?.(id)}
      >
        {auraRadius > 0 &&
          showAura &&
          (auraShape === 'circle' ? (
            <Circle
              x={x + offX}
              y={y + offY}
              radius={(Math.max(width, height) / 2 + auraRadius) * gridSize}
              fill={hexToRgba(auraColor, auraOpacity)}
              listening={false}
            />
          ) : (
            <Rect
              x={x + offX}
              y={y + offY}
              width={(width + auraRadius * 2) * gridSize}
              height={(height + auraRadius * 2) * gridSize}
              offsetX={((width + auraRadius * 2) * gridSize) / 2}
              offsetY={((height + auraRadius * 2) * gridSize) / 2}
              fill={hexToRgba(auraColor, auraOpacity)}
              listening={false}
            />
          ))}
        {img && !isImgLoading ? (
          <KonvaImage ref={shapeRef} image={img} {...common} />
        ) : (
          <>
            <Rect
              ref={shapeRef}
              {...common}
              fill={isImgLoading ? undefined : fillColor}
              fillEnabled={!isImgLoading}
              strokeEnabled={false}
            />
            {isImgLoading && showSpinner && (
              <KonvaSpinner
                x={x + offX}
                y={y + offY}
                radius={Math.min(width, height) * gridSize * 0.3}
                color="white"
              />
            )}
          </>
        )}
        {selected && <Rect {...outline} />}
        {estadosInfo.length > 0 && (
          <Group listening={false}>
            {estadosInfo.map((e, i) => (
              <EstadoImg
                key={e.id}
                src={e.img}
                x={x + width * gridSize - estadoSize * (i + 1)}
                y={y - estadoSize - 2}
                width={estadoSize}
                height={estadoSize}
              />
            ))}
          </Group>
        )}
        {showName && (customName || name) && (
          <Group
            ref={textGroupRef}
            x={x + (width * gridSize) / 2}
            y={y + height * gridSize + 4}
            offsetX={(width * gridSize) / 2}
            listening={false}
          >
            {[
              { x: 1, y: 1 },
              { x: -1, y: 1 },
              { x: -1, y: -1 },
              { x: 1, y: -1 },
            ].map((o, i) => (
              <Text
                key={i}
                text={customName || name}
                x={o.x}
                y={o.y}
                fontSize={nameFontSize}
                fontStyle="bold"
                fontFamily="sans-serif"
                fill="#000"
                align="center"
                shadowColor="#000"
                shadowBlur={1}
                shadowOpacity={0.9}
              />
            ))}
            <Text
              ref={textRef}
              text={customName || name}
              fontSize={nameFontSize}
              fontStyle="bold"
              fontFamily="sans-serif"
              fill="#fff"
              align="center"
              shadowColor="#000"
              shadowBlur={1}
              shadowOpacity={0.8}
            />
          </Group>
        )}
        {selected && (
          <>
            <Transformer
              ref={trRef}
              enabledAnchors={[
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
              ]}
              rotateEnabled={false}
              boundBoxFunc={(oldBox, newBox) => snapBox(newBox)}
              onTransformStart={handleTransformStart}
              onTransform={updateHandle}
              onTransformEnd={handleTransformEnd}
            />
            <Circle
              ref={rotateRef}
              x={width * gridSize}
              y={-12}
              radius={iconSize / 2}
              fill="#fff"
              stroke="#000"
              strokeWidth={1}
              draggable
              onDragMove={handleRotateMove}
              onDragEnd={handleRotateEnd}
            />
            <Text
              ref={gearRef}
              text="⚙️"
              fontSize={buttonSize}
              shadowColor="#000"
              shadowBlur={4}
              shadowOpacity={0.9}
              listening
              onClick={() => onSettings?.(id)}
            />
            <Text
              ref={estadosRef}
              text="🩸"
              fontSize={buttonSize}
              shadowColor="#000"
              shadowBlur={4}
              shadowOpacity={0.9}
              listening
              onClick={() => onStates?.(id)}
            />
          </>
        )}
      </Group>
    );
  }
);

Token.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  angle: PropTypes.number.isRequired,
  gridSize: PropTypes.number.isRequired,
  gridOffsetX: PropTypes.number.isRequired,
  gridOffsetY: PropTypes.number.isRequired,
  cellSize: PropTypes.number.isRequired,
  zoom: PropTypes.number.isRequired,
  maxZoom: PropTypes.number.isRequired,
  groupScale: PropTypes.number.isRequired,
  color: PropTypes.string,
  image: PropTypes.string,
  selected: PropTypes.bool,
  draggable: PropTypes.bool,
  listening: PropTypes.bool,
  opacity: PropTypes.number,
  name: PropTypes.string,
  customName: PropTypes.string,
  showName: PropTypes.bool,
  auraRadius: PropTypes.number,
  auraShape: PropTypes.oneOf(['circle', 'square']),
  auraColor: PropTypes.string,
  auraOpacity: PropTypes.number,
  showAura: PropTypes.bool,
  tintColor: PropTypes.string,
  tintOpacity: PropTypes.number,
  onClick: PropTypes.func,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func.isRequired,
  onTransformEnd: PropTypes.func.isRequired,
  onRotate: PropTypes.func.isRequired,
  onSettings: PropTypes.func,
  onStates: PropTypes.func,
  onHoverChange: PropTypes.func,
  estados: PropTypes.array,
  tokenSheetId: PropTypes.string,
};

/**
 * Canvas que muestra un mapa con una cuadrícula ajustable.
 * Permite definir tamaño de celda y desplazamiento para
 * alinear la grid con la imagen de fondo.
 */
const MapCanvas = ({
  backgroundImage,
  gridSize = 100,
  gridCells,
  gridOffsetX = 0,
  gridOffsetY = 0,
  minZoom = 0.5,
  maxZoom = 4,
  initialZoom = 1,
  scaleMode = 'contain',
  tokens,
  onTokensChange,
  enemies = [],
  onEnemyUpdate,
  players = [],
  armas = [],
  armaduras = [],
  habilidades = [],
  highlightText,
  userType = 'master',
  playerName = '',
  lines: propLines = [],
  onLinesChange = () => {},
}) => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [containerSize, setContainerSize] = useState({
    width: 300,
    height: 300,
  });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(initialZoom);
  const [groupPos, setGroupPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [dragShadow, setDragShadow] = useState(null);
  const [settingsTokenIds, setSettingsTokenIds] = useState([]);
  const [estadoTokenIds, setEstadoTokenIds] = useState([]);
  const [openSheetTokens, setOpenSheetTokens] = useState([]);
  const [activeTool, setActiveTool] = useState('select');
  const [lines, setLines] = useState(propLines);
  const [currentLine, setCurrentLine] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [measureLine, setMeasureLine] = useState(null);
  const [measureShape, setMeasureShape] = useState('line');
  const [measureSnap, setMeasureSnap] = useState('center');
  const [measureVisible, setMeasureVisible] = useState(true);
  const [texts, setTexts] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [textOptions, setTextOptions] = useState({
    fill: '#ffffff',
    bgColor: 'rgba(0,0,0,0)',
    fontFamily: 'Arial',
    fontSize: 20,
    bold: false,
    italic: false,
    underline: false,
  });
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState('medium');
  const tokenRefs = useRef({});
  const lineRefs = useRef({});
  const lineTrRef = useRef();
  const textRefs = useRef({});
  const textTrRef = useRef();
  const textareaRef = useRef();
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const [bg, bgStatus] = useImage(backgroundImage, 'anonymous');
  const isBgLoading = bgStatus === 'loading';
  const isBgError = bgStatus === 'failed';

  useEffect(() => {
    setLines(propLines);
    undoStack.current = [];
    redoStack.current = [];
  }, [propLines]);

  const canSeeBars = useCallback(
    (tk) => {
      if (!tk.barsVisibility || tk.barsVisibility === 'all') return true;
      if (tk.barsVisibility === 'none') return false;
      if (tk.barsVisibility === 'controlled') {
        if (userType === 'master') return true;
        return tk.controlledBy === playerName;
      }
      return true;
    },
    [playerName, userType]
  );

  const canSeeAura = useCallback(
    (tk) => {
      if (!tk.auraVisibility || tk.auraVisibility === 'all') return true;
      if (tk.auraVisibility === 'none') return false;
      if (tk.auraVisibility === 'controlled') {
        if (userType === 'master') return true;
        return tk.controlledBy === playerName;
      }
      return true;
    },
    [playerName, userType]
  );

  // Si se especifica el número de casillas, calculamos el tamaño de cada celda
  const effectiveGridSize =
    imageSize.width && gridCells ? imageSize.width / gridCells : gridSize;

  const pxToCell = (px, offset) =>
    Math.round((px - offset) / effectiveGridSize);
  const cellToPx = (cell, offset) => cell * effectiveGridSize + offset;
  const snapPoint = useCallback(
    (x, y) => {
      if (measureSnap === 'free') return [x, y];
      const cellX = pxToCell(x, gridOffsetX);
      const cellY = pxToCell(y, gridOffsetY);
      if (measureSnap === 'center') {
        return [
          cellToPx(cellX + 0.5, gridOffsetX),
          cellToPx(cellY + 0.5, gridOffsetY),
        ];
      }
      return [cellToPx(cellX, gridOffsetX), cellToPx(cellY, gridOffsetY)];
    },
    [measureSnap, gridOffsetX, gridOffsetY, effectiveGridSize]
  );

  // Tamaño del contenedor para ajustar el stage al redimensionar la ventana
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Cuando cargue la imagen guardamos sus dimensiones reales
  useEffect(() => {
    if (bg) {
      setImageSize({ width: bg.width, height: bg.height });
    }
  }, [bg]);

  // Calcula la escala base según el modo seleccionado y centra el mapa
  useEffect(() => {
    const refWidth =
      imageSize.width || gridCells * gridSize || containerSize.width;
    const refHeight =
      imageSize.height || gridCells * gridSize || containerSize.height;
    const scaleX = containerSize.width / refWidth;
    const scaleY = containerSize.height / refHeight;
    const scale =
      scaleMode === 'cover'
        ? Math.max(scaleX, scaleY)
        : Math.min(scaleX, scaleY);
    setBaseScale(scale);
    const displayWidth = refWidth * scale;
    const displayHeight = refHeight * scale;
    setGroupPos({
      x: (containerSize.width - displayWidth) / 2,
      y: (containerSize.height - displayHeight) / 2,
    });
  }, [containerSize, imageSize, gridCells, gridSize, scaleMode]);

  const drawGrid = () => {
    const lines = [];
    // Líneas verticales
    for (let i = gridOffsetX; i < imageSize.width; i += effectiveGridSize) {
      lines.push(
        <Line
          key={`v${i}`}
          points={[i, 0, i, imageSize.height]}
          stroke="rgba(255,255,255,0.2)"
          listening={false}
        />
      );
    }
    // Líneas horizontales
    for (let i = gridOffsetY; i < imageSize.height; i += effectiveGridSize) {
      lines.push(
        <Line
          key={`h${i}`}
          points={[0, i, imageSize.width, i]}
          stroke="rgba(255,255,255,0.2)"
          listening={false}
        />
      );
    }
    return lines;
  };

  const saveLines = (updater) => {
    setLines((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      undoStack.current.push(prev);
      redoStack.current = [];
      onLinesChange(next);
      return next;
    });
  };

  const undoLines = () => {
    setLines((prev) => {
      if (undoStack.current.length === 0) return prev;
      redoStack.current.push(prev);
      const next = undoStack.current.pop();
      onLinesChange(next);
      return next;
    });
  };

  const redoLines = () => {
    setLines((prev) => {
      if (redoStack.current.length === 0) return prev;
      undoStack.current.push(prev);
      const next = redoStack.current.pop();
      onLinesChange(next);
      return next;
    });
  };

  const handleLineDragEnd = (id, e) => {
    const node = e.target;
    const x = node.x();
    const y = node.y();
    saveLines((ls) => ls.map((ln) => (ln.id === id ? { ...ln, x, y } : ln)));
  };

  const handleLineTransformEnd = (id, e) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const newPoints = node
      .points()
      .map((p, i) => (i % 2 === 0 ? p * scaleX : p * scaleY));
    node.points(newPoints);
    const x = node.x();
    const y = node.y();
    saveLines((ls) =>
      ls.map((ln) => (ln.id === id ? { ...ln, x, y, points: newPoints } : ln))
    );
  };

  const handleTextDragEnd = (id, e) => {
    const node = e.target;
    const x = node.x();
    const y = node.y();
    setTexts((ts) => ts.map((t) => (t.id === id ? { ...t, x, y } : t)));
  };

  const handleTextTransformEnd = (id, e) => {
    const node = textRefs.current[id];
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const textNode = node.findOne('Text');
    const newFontSize = (textNode.fontSize() || 0) * ((scaleX + scaleY) / 2);
    setTexts((ts) =>
      ts.map((t) => (t.id === id ? { ...t, fontSize: newFontSize } : t))
    );
    node.getLayer().batchDraw();
  };

  const handleTextEdit = (id) => {
    const current = texts.find((t) => t.id === id);
    if (!current) return;
    setSelectedTextId(id);
    setEditingTextId(id);
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    const id = editingTextId;
    setTexts((ts) => ts.map((t) => (t.id === id ? { ...t, text: value } : t)));
    e.target.style.height = 'auto';
    e.target.style.width = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    e.target.style.width = `${e.target.scrollWidth}px`;
  };

  const closeTextarea = () => {
    setEditingTextId(null);
  };

  const handleDragEnd = (id, evt) => {
    const node = evt?.target;
    if (!node) return;
    const offX = node.offsetX();
    const offY = node.offsetY();
    const left = node.x() - offX;
    const top = node.y() - offY;
    const col = Math.round((left - gridOffsetX) / effectiveGridSize);
    const row = Math.round((top - gridOffsetY) / effectiveGridSize);
    node.position({
      x: col * effectiveGridSize + offX + gridOffsetX,
      y: row * effectiveGridSize + offY + gridOffsetY,
    });
    node.getLayer().batchDraw();

    const newTokens = tokens.map((t) =>
      t.id === id ? { ...t, x: col, y: row } : t
    );
    onTokensChange(newTokens);
    setDragShadow(null);
  };

  const handleDragStart = (id) => {
    const token = tokens.find((t) => t.id === id);
    if (token) setDragShadow({ ...token });
  };

  const handleSizeChange = (id, w, h, px, py) => {
    const x = pxToCell(px, gridOffsetX);
    const y = pxToCell(py, gridOffsetY);
    const updated = tokens.map((t) => (t.id === id ? { ...t, w, h, x, y } : t));
    onTokensChange(updated);
  };

  const handleRotateChange = (id, angle) => {
    const updated = tokens.map((t) => (t.id === id ? { ...t, angle } : t));
    onTokensChange(updated);
  };

  const handleOpenSettings = (id) => {
    setSettingsTokenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleCloseSettings = (id) => {
    setSettingsTokenIds((prev) => prev.filter((sid) => sid !== id));
  };

  const handleOpenEstados = (id) => {
    setEstadoTokenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleCloseEstados = (id) => {
    setEstadoTokenIds((prev) => prev.filter((sid) => sid !== id));
  };

  const handleOpenSheet = (token) => {
    setOpenSheetTokens((prev) =>
      prev.some((t) => t.tokenSheetId === token.tokenSheetId)
        ? prev
        : [...prev, token]
    );
  };

  const handleCloseSheet = (sheetId) => {
    setOpenSheetTokens((prev) =>
      prev.filter((t) => t.tokenSheetId !== sheetId)
    );
  };

  const moveTokenToFront = (id) => {
    const index = tokens.findIndex((t) => t.id === id);
    if (index === -1) return;
    const reordered = [...tokens];
    const [token] = reordered.splice(index, 1);
    reordered.push(token);
    onTokensChange(reordered);
  };

  const moveTokenToBack = (id) => {
    const index = tokens.findIndex((t) => t.id === id);
    if (index === -1) return;
    const reordered = [...tokens];
    const [token] = reordered.splice(index, 1);
    reordered.unshift(token);
    onTokensChange(reordered);
  };

  // Zoom interactivo con la rueda del ratón
  const handleWheel = (e) => {
    e.evt.preventDefault();
    if (!stageRef.current) return;
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    const scaleBy = e.evt.deltaY > 0 ? 1 / 1.2 : 1.2;
    const newZoom = Math.min(maxZoom, Math.max(minZoom, zoom * scaleBy));
    if (newZoom === zoom) return;
    const oldScale = baseScale * zoom;
    const mousePoint = {
      x: (pointer.x - groupPos.x) / oldScale,
      y: (pointer.y - groupPos.y) / oldScale,
    };
    const newScale = baseScale * newZoom;
    setZoom(newZoom);
    setGroupPos({
      x: pointer.x - mousePoint.x * newScale,
      y: pointer.y - mousePoint.y * newScale,
    });
  };

  // Iniciar acciones según la herramienta seleccionada
  const handleMouseDown = (e) => {
    if (activeTool === 'select' && e.evt.button === 1) {
      e.evt.preventDefault();
      setIsPanning(true);
      panStart.current = stageRef.current.getPointerPosition();
      panOrigin.current = { ...groupPos };
    }
    if (activeTool === 'draw' && e.evt.button === 0) {
      const pointer = stageRef.current.getPointerPosition();
      const relX = (pointer.x - groupPos.x) / (baseScale * zoom);
      const relY = (pointer.y - groupPos.y) / (baseScale * zoom);
      setSelectedLineId(null);
      setCurrentLine({
        points: [relX, relY],
        color: drawColor,
        width: BRUSH_WIDTHS[brushSize],
      });
    }
    if (activeTool === 'measure' && e.evt.button === 0) {
      const pointer = stageRef.current.getPointerPosition();
      let relX = (pointer.x - groupPos.x) / (baseScale * zoom);
      let relY = (pointer.y - groupPos.y) / (baseScale * zoom);
      [relX, relY] = snapPoint(relX, relY);
      setMeasureLine([relX, relY, relX, relY]);
    }
    if (activeTool === 'text' && e.evt.button === 0) {
      const pointer = stageRef.current.getPointerPosition();
      const relX = (pointer.x - groupPos.x) / (baseScale * zoom);
      const relY = (pointer.y - groupPos.y) / (baseScale * zoom);
      const id = nanoid();
      const bgColor = textOptions.bgColor || 'rgba(0,0,0,0)';
      setTexts((t) => [
        ...t,
        { id, x: relX, y: relY, text: '', ...textOptions, bgColor },
      ]);
      setSelectedTextId(id);
      setEditingTextId(id);
    }
  };

  // Actualiza la acción activa según la herramienta
  const handleMouseMove = () => {
    const pointer = stageRef.current.getPointerPosition();
    let relX = (pointer.x - groupPos.x) / (baseScale * zoom);
    let relY = (pointer.y - groupPos.y) / (baseScale * zoom);
    if (currentLine) {
      setCurrentLine((ln) => ({
        ...ln,
        points: [...ln.points, relX, relY],
      }));
      return;
    }
    if (measureLine) {
      [relX, relY] = snapPoint(relX, relY);
      setMeasureLine(([x1, y1]) => [x1, y1, relX, relY]);
      return;
    }
    if (!isPanning) return;
    setGroupPos({
      x: panOrigin.current.x + (pointer.x - panStart.current.x),
      y: panOrigin.current.y + (pointer.y - panStart.current.y),
    });
  };

  const stopPanning = () => {
    if (currentLine) {
      const xs = currentLine.points.filter((_, i) => i % 2 === 0);
      const ys = currentLine.points.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const rel = currentLine.points.map((p, i) =>
        i % 2 === 0 ? p - minX : p - minY
      );
      const finished = {
        ...currentLine,
        id: Date.now(),
        x: minX,
        y: minY,
        points: rel,
      };
      saveLines((ls) => [...ls, finished]);
      setCurrentLine(null);
      setSelectedLineId(finished.id);
    }
    if (measureLine) setMeasureLine(null);
    if (isPanning) setIsPanning(false);
  };

  const handleStageClick = (e) => {
    if (e.target === stageRef.current) {
      setSelectedId(null);
      setSelectedLineId(null);
      setSelectedTextId(null);
    }
  };

  const mapWidth = gridCells || Math.round(imageSize.width / effectiveGridSize);
  const mapHeight =
    gridCells || Math.round(imageSize.height / effectiveGridSize);

  const measureElement =
    measureLine &&
    measureVisible &&
    (() => {
      const [x1, y1, x2, y2] = measureLine;
      const cellDx = Math.abs(
        pxToCell(x2, gridOffsetX) - pxToCell(x1, gridOffsetX)
      );
      const cellDy = Math.abs(
        pxToCell(y2, gridOffsetY) - pxToCell(y1, gridOffsetY)
      );
      let distance = Math.hypot(cellDx, cellDy);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      let shape;
      if (measureShape === 'square') {
        distance = Math.max(cellDx, cellDy);
        shape = (
          <Rect
            x={Math.min(x1, x2)}
            y={Math.min(y1, y2)}
            width={Math.abs(dx)}
            height={Math.abs(dy)}
            stroke="cyan"
            strokeWidth={2}
            dash={[4, 4]}
          />
        );
      } else if (measureShape === 'circle') {
        distance = Math.max(cellDx, cellDy);
        shape = (
          <Circle
            x={x1}
            y={y1}
            radius={len}
            stroke="cyan"
            strokeWidth={2}
            dash={[4, 4]}
          />
        );
      } else if (measureShape === 'cone') {
        const half = Math.PI / 6;
        const p2x = x1 + len * Math.cos(angle + half);
        const p2y = y1 + len * Math.sin(angle + half);
        const p3x = x1 + len * Math.cos(angle - half);
        const p3y = y1 + len * Math.sin(angle - half);
        shape = (
          <Line
            points={[x1, y1, p2x, p2y, p3x, p3y]}
            closed
            stroke="cyan"
            strokeWidth={2}
            dash={[4, 4]}
          />
        );
      } else if (measureShape === 'beam') {
        const w = effectiveGridSize;
        const dxp = (w / 2) * Math.cos(angle + Math.PI / 2);
        const dyp = (w / 2) * Math.sin(angle + Math.PI / 2);
        shape = (
          <Line
            points={[
              x1 + dxp,
              y1 + dyp,
              x2 + dxp,
              y2 + dyp,
              x2 - dxp,
              y2 - dyp,
              x1 - dxp,
              y1 - dyp,
            ]}
            closed
            stroke="cyan"
            strokeWidth={2}
            dash={[4, 4]}
          />
        );
      } else {
        shape = (
          <Line
            points={measureLine}
            stroke="cyan"
            strokeWidth={2}
            dash={[4, 4]}
          />
        );
      }
      return (
        <>
          {shape}
          <Text
            x={x2}
            y={y2}
            text={`${Math.round(distance)} casillas`}
            fontSize={16}
            fill="#fff"
          />
        </>
      );
    })();

  const handleKeyDown = useCallback(
    (e) => {
      // Avoid moving the token when typing inside inputs or editable fields
      const target = e.target;
      if (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoLines();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoLines();
        return;
      }

      if (selectedLineId != null && e.key.toLowerCase() === 'delete') {
        saveLines(lines.filter((ln) => ln.id !== selectedLineId));
        setSelectedLineId(null);
        return;
      }

      if (selectedTextId != null) {
        const idx = texts.findIndex((t) => t.id === selectedTextId);
        if (idx !== -1) {
          let { x, y } = texts[idx];
          switch (e.key.toLowerCase()) {
            case 'w':
              y -= 5;
              break;
            case 's':
              y += 5;
              break;
            case 'a':
              x -= 5;
              break;
            case 'd':
              x += 5;
              break;
            case 'delete':
              setTexts(texts.filter((t) => t.id !== selectedTextId));
              setSelectedTextId(null);
              return;
            default:
              break;
          }
          setTexts((ts) =>
            ts.map((t) => (t.id === selectedTextId ? { ...t, x, y } : t))
          );
          return;
        }
      }

      if (selectedId == null) return;
      const index = tokens.findIndex((t) => t.id === selectedId);
      if (index === -1) return;
      let { x, y } = tokens[index];
      switch (e.key.toLowerCase()) {
        case 'w':
          y -= 1;
          break;
        case 's':
          y += 1;
          break;
        case 'a':
          x -= 1;
          break;
        case 'd':
          x += 1;
          break;
        case 'delete':
          onTokensChange(tokens.filter((t) => t.id !== selectedId));
          setSelectedId(null);
          return;
        case 'r': {
          const delta = e.shiftKey ? -90 : 90;
          const updatedAngle = ((tokens[index].angle || 0) + delta + 360) % 360;
          const rotated = tokens.map((t) =>
            t.id === selectedId ? { ...t, angle: updatedAngle } : t
          );
          onTokensChange(rotated);
          return;
        }
        default:
          return;
      }
      x = Math.max(0, Math.min(mapWidth - 1, x));
      y = Math.max(0, Math.min(mapHeight - 1, y));
      const updated = tokens.map((t) =>
        t.id === selectedId ? { ...t, x, y } : t
      );
      onTokensChange(updated);
    },
    [
      selectedId,
      tokens,
      onTokensChange,
      mapWidth,
      mapHeight,
      selectedLineId,
      lines,
      selectedTextId,
      texts,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const tr = lineTrRef.current;
    const node = selectedLineId ? lineRefs.current[selectedLineId] : null;
    if (tr && node && activeTool === 'select') {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else if (tr) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedLineId, activeTool]);

  useEffect(() => {
    const tr = textTrRef.current;
    const node = selectedTextId ? textRefs.current[selectedTextId] : null;
    if (tr && node && activeTool === 'select') {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else if (tr) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedTextId, activeTool]);

  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTextId]);
  const groupScale = baseScale * zoom;

  const [, drop] = useDrop(
    () => ({
      accept: AssetTypes.IMAGE,
      drop: (item) => {
        if (!stageRef.current) return;
        const pointer = stageRef.current.getPointerPosition();
        const relX = (pointer.x - groupPos.x) / groupScale;
        const relY = (pointer.y - groupPos.y) / groupScale;
        const cellX = pxToCell(relX, gridOffsetX);
        const cellY = pxToCell(relY, gridOffsetY);
        const x = Math.max(0, Math.min(mapWidth - 1, cellX));
        const y = Math.max(0, Math.min(mapHeight - 1, cellY));
        const newToken = {
          id: Date.now(),
          x,
          y,
          w: 1,
          h: 1,
          angle: 0,
          url: item.url,
          name: item.name || '',
          enemyId: item.enemyId || null,
          tokenSheetId: nanoid(),
          customName: '',
          showName: false,
          controlledBy: 'master',
          barsVisibility: 'all',
          auraRadius: 0,
          auraShape: 'circle',
          auraColor: '#ffff00',
          auraOpacity: 0.25,
          auraVisibility: 'all',
          opacity: 1,
          tintColor: '#ff0000',
          tintOpacity: 0,
          estados: [],
        };
        onTokensChange([...tokens, newToken]);
      },
    }),
    [
      tokens,
      groupPos,
      groupScale,
      mapWidth,
      mapHeight,
      gridOffsetX,
      gridOffsetY,
    ]
  );

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative">
      {isBgLoading && (
        <LoadingSpinner overlay color="white" text="Cargando mapa..." />
      )}
      {isBgError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/75 text-white z-10">
          Error al cargar el mapa
        </div>
      )}
      <div ref={drop}>
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopPanning}
          onMouseLeave={stopPanning}
          onClick={handleStageClick}
          style={{ background: '#000' }}
        >
          <Layer>
            <Group
              x={groupPos.x}
              y={groupPos.y}
              scaleX={groupScale}
              scaleY={groupScale}
            >
              {bg && (
                <KonvaImage
                  image={bg}
                  width={imageSize.width}
                  height={imageSize.height}
                  listening={false}
                />
              )}
              {drawGrid()}
              <Group listening={false}>
                {dragShadow && (
                  <TokenAura
                    x={cellToPx(dragShadow.x, gridOffsetX)}
                    y={cellToPx(dragShadow.y, gridOffsetY)}
                    width={dragShadow.w || 1}
                    height={dragShadow.h || 1}
                    gridSize={effectiveGridSize}
                    auraRadius={dragShadow.auraRadius}
                    auraShape={dragShadow.auraShape}
                    auraColor={dragShadow.auraColor}
                    auraOpacity={dragShadow.auraOpacity}
                    showAura={canSeeAura(dragShadow)}
                  />
                )}
                {tokens.map((token) => (
                  <TokenAura
                    key={`aura-${token.id}`}
                    x={cellToPx(token.x, gridOffsetX)}
                    y={cellToPx(token.y, gridOffsetY)}
                    width={token.w || 1}
                    height={token.h || 1}
                    gridSize={effectiveGridSize}
                    auraRadius={token.auraRadius}
                    auraShape={token.auraShape}
                    auraColor={token.auraColor}
                    auraOpacity={token.auraOpacity}
                    showAura={canSeeAura(token)}
                  />
                ))}
              </Group>
              {dragShadow && (
                <Token
                  key={`shadow-${dragShadow.id}`}
                  id={dragShadow.id}
                  x={cellToPx(dragShadow.x, gridOffsetX)}
                  y={cellToPx(dragShadow.y, gridOffsetY)}
                  width={dragShadow.w || 1}
                  height={dragShadow.h || 1}
                  angle={dragShadow.angle || 0}
                  gridSize={effectiveGridSize}
                  cellSize={effectiveGridSize}
                  zoom={zoom}
                  maxZoom={maxZoom}
                  groupScale={groupScale}
                  gridOffsetX={gridOffsetX}
                  gridOffsetY={gridOffsetY}
                  image={dragShadow.url}
                  color={dragShadow.color}
                  name={dragShadow.name}
                  selected={false}
                  draggable={false}
                  listening={false}
                  opacity={0.35}
                  tintColor={dragShadow.tintColor}
                  tintOpacity={dragShadow.tintOpacity}
                  showSpinner={false}
                  showAura={false}
                  auraRadius={dragShadow.auraRadius}
                  auraShape={dragShadow.auraShape}
                  auraColor={dragShadow.auraColor}
                  auraOpacity={dragShadow.auraOpacity}
                />
              )}
              {tokens.map((token) => (
                <Token
                  ref={(el) => {
                    if (el) tokenRefs.current[token.id] = el;
                  }}
                  key={token.id}
                  id={token.id}
                  x={cellToPx(token.x, gridOffsetX)}
                  y={cellToPx(token.y, gridOffsetY)}
                  width={token.w || 1}
                  height={token.h || 1}
                  angle={token.angle || 0}
                  gridSize={effectiveGridSize}
                  cellSize={effectiveGridSize}
                  zoom={zoom}
                  maxZoom={maxZoom}
                  groupScale={groupScale}
                  gridOffsetX={gridOffsetX}
                  gridOffsetY={gridOffsetY}
                  image={token.url}
                  color={token.color}
                  name={token.name}
                  customName={token.customName}
                  showName={token.showName}
                  opacity={token.opacity ?? 1}
                  tintColor={token.tintColor}
                  tintOpacity={token.tintOpacity}
                  showAura={false}
                  tokenSheetId={token.tokenSheetId}
                  auraRadius={token.auraRadius}
                  auraShape={token.auraShape}
                  auraColor={token.auraColor}
                  auraOpacity={token.auraOpacity}
                  selected={token.id === selectedId}
                  onDragEnd={handleDragEnd}
                  onDragStart={handleDragStart}
                  onClick={() => {
                    setSelectedId(token.id);
                    setSelectedLineId(null);
                    setSelectedTextId(null);
                  }}
                  onSettings={handleOpenSettings}
                  onStates={handleOpenEstados}
                  onTransformEnd={handleSizeChange}
                  onRotate={handleRotateChange}
                  onHoverChange={(h) => setHoveredId(h ? token.id : null)}
                  estados={token.estados || []}
                  draggable={activeTool === 'select'}
                  listening={activeTool === 'select'}
                />
              ))}
              {lines.map((ln) => (
                <Line
                  ref={(el) => {
                    if (el) lineRefs.current[ln.id] = el;
                  }}
                  key={ln.id}
                  x={ln.x}
                  y={ln.y}
                  points={ln.points}
                  stroke={ln.color}
                  strokeWidth={ln.width}
                  lineCap="round"
                  lineJoin="round"
                  draggable={activeTool === 'select'}
                  onClick={() => {
                    setSelectedLineId(ln.id);
                    setSelectedId(null);
                    setSelectedTextId(null);
                  }}
                  onDragEnd={(e) => handleLineDragEnd(ln.id, e)}
                  onTransformEnd={(e) => handleLineTransformEnd(ln.id, e)}
                />
              ))}
              {activeTool === 'select' && (
                <Transformer ref={lineTrRef} rotateEnabled={false} />
              )}
              {texts.map((t) => (
                <Label
                  key={t.id}
                  ref={(el) => {
                    if (el) textRefs.current[t.id] = el;
                  }}
                  x={t.x}
                  y={t.y}
                  draggable={activeTool === 'select'}
                  onDragEnd={(e) => handleTextDragEnd(t.id, e)}
                  onTransformEnd={(e) => handleTextTransformEnd(t.id, e)}
                  onClick={() => setSelectedTextId(t.id)}
                  onDblClick={() => handleTextEdit(t.id)}
                >
                  <Tag fill={t.bgColor} />
                  <Text
                    text={t.text}
                    fill={t.fill}
                    fontFamily={t.fontFamily}
                    fontSize={t.fontSize}
                    fontStyle={`${t.bold ? 'bold ' : ''}${t.italic ? 'italic' : ''}`}
                    textDecoration={t.underline ? 'underline' : ''}
                    padding={4}
                  />
                </Label>
              ))}
              {activeTool === 'select' && (
                <Transformer ref={textTrRef} rotateEnabled={false} />
              )}
              {currentLine && (
                <Line
                  points={currentLine.points}
                  stroke={currentLine.color}
                  strokeWidth={currentLine.width}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
              {measureElement}
            </Group>
          </Layer>
          <Layer listening>
            {tokens.map((token) => (
              <TokenBars
                key={`bars-${token.id}`}
                tokenRef={tokenRefs.current[token.id]}
                stageRef={stageRef}
                onStatClick={(key, e) =>
                  tokenRefs.current[token.id]?.handleStatClick(key, e)
                }
                transformKey={`${groupPos.x},${groupPos.y},${groupScale},${token.x},${token.y},${token.w},${token.h},${token.angle}`}
                visible={
                  activeTool === 'select' &&
                  hoveredId === token.id &&
                  canSeeBars(token)
                }
              />
            ))}
          </Layer>
        </Stage>
      </div>
      {editingTextId && (() => {
        const t = texts.find((txt) => txt.id === editingTextId);
        if (!t) return null;
        const left = groupPos.x + t.x * groupScale;
        const top = groupPos.y + t.y * groupScale;
        return (
          <textarea
            ref={textareaRef}
            value={t.text}
            onChange={handleTextareaChange}
            onBlur={closeTextarea}
            placeholder="Texto"
            className="absolute bg-transparent text-white border-none outline-none resize-none whitespace-pre"
            style={{
              left,
              top,
              fontSize: t.fontSize,
              fontFamily: t.fontFamily,
              fontStyle: `${t.bold ? 'bold ' : ''}${t.italic ? 'italic' : ''}`,
              textDecoration: t.underline ? 'underline' : 'none',
              minWidth: '1ch',
              minHeight: t.fontSize,
              transform: `translate(-4px,-4px)`,
            }}
          />
        );
      })()}
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
        textOptions={textOptions}
        onTextOptionsChange={setTextOptions}
      />
      {settingsTokenIds.map((id) => (
        <TokenSettings
          key={id}
          token={tokens.find((t) => t.id === id)}
          enemies={enemies}
          players={players}
          onClose={() => handleCloseSettings(id)}
          onUpdate={(tk) => {
            const updated = tokens.map((t) => (t.id === tk.id ? tk : t));
            onTokensChange(updated);
          }}
          onOpenSheet={handleOpenSheet}
          onMoveFront={() => moveTokenToFront(id)}
          onMoveBack={() => moveTokenToBack(id)}
        />
      ))}
      {estadoTokenIds.map((id) => (
        <TokenEstadoMenu
          key={id}
          token={tokens.find((t) => t.id === id)}
          onClose={() => handleCloseEstados(id)}
          onUpdate={(tk) => {
            const updated = tokens.map((t) => (t.id === tk.id ? tk : t));
            onTokensChange(updated);
          }}
        />
      ))}
      {openSheetTokens.map((tk) => (
        <TokenSheetModal
          key={tk.tokenSheetId}
          token={tokens.find((t) => t.tokenSheetId === tk.tokenSheetId) || tk}
          enemies={enemies}
          armas={armas}
          armaduras={armaduras}
          habilidades={habilidades}
          onClose={() => handleCloseSheet(tk.tokenSheetId)}
          highlightText={highlightText}
        />
      ))}
    </div>
  );
};

MapCanvas.propTypes = {
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
  enemies: PropTypes.array,
  onEnemyUpdate: PropTypes.func,
  players: PropTypes.array,
  armas: PropTypes.array,
  armaduras: PropTypes.array,
  habilidades: PropTypes.array,
  highlightText: PropTypes.func,
  userType: PropTypes.oneOf(['master', 'player']),
  playerName: PropTypes.string,
  lines: PropTypes.array,
  onLinesChange: PropTypes.func,
};

export default MapCanvas;
