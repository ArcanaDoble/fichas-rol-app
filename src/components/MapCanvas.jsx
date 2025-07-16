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
  Path,
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
import WallDoorMenu from './WallDoorMenu';

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

const DEFAULT_WALL_LENGTH = 50;

const DOOR_PATHS = {
  closed: [
    'M2.99805 21V19H4.99805V4C4.99805 3.44772 5.44576 3 5.99805 3H17.998C18.5503 3 18.998 3.44772 18.998 4V19H20.998V21H2.99805ZM16.998 5H6.99805V19H16.998V5ZM14.998 11V13H12.998V11H14.998Z',
  ],
  open: [
    'M1.99805 21.0001V19.0001L3.99805 18.9999V4.83465C3.99805 4.35136 4.34367 3.93723 4.81916 3.85078L14.2907 2.12868C14.6167 2.0694 14.9291 2.28564 14.9884 2.61167C14.9948 2.64708 14.998 2.68301 14.998 2.719V3.9999L18.998 4.00007C19.5503 4.00007 19.998 4.44779 19.998 5.00007V18.9999L21.998 19.0001V21.0001H17.998V6.00007L14.998 5.9999V21.0001H1.99805ZM12.998 4.3965L5.99805 5.66923V19.0001H12.998V4.3965ZM11.998 11.0001V13.0001H9.99805V11.0001H11.998Z',
  ],
  secret: [
    'M17.8827 19.2968C16.1814 20.3755 14.1638 21.0002 12.0003 21.0002C6.60812 21.0002 2.12215 17.1204 1.18164 12.0002C1.61832 9.62282 2.81932 7.5129 4.52047 5.93457L1.39366 2.80777L2.80788 1.39355L22.6069 21.1925L21.1927 22.6068L17.8827 19.2968ZM5.9356 7.3497C4.60673 8.56015 3.6378 10.1672 3.22278 12.0002C4.14022 16.0521 7.7646 19.0002 12.0003 19.0002C13.5997 19.0002 15.112 18.5798 16.4243 17.8384L14.396 15.8101C13.7023 16.2472 12.8808 16.5002 12.0003 16.5002C9.51498 16.5002 7.50026 14.4854 7.50026 12.0002C7.50026 11.1196 7.75317 10.2981 8.19031 9.60442L5.9356 7.3497ZM12.9139 14.328L9.67246 11.0866C9.5613 11.3696 9.50026 11.6777 9.50026 12.0002C9.50026 13.3809 10.6196 14.5002 12.0003 14.5002C12.3227 14.5002 12.6309 14.4391 12.9139 14.328ZM20.8068 16.5925L19.376 15.1617C20.0319 14.2268 20.5154 13.1586 20.7777 12.0002C19.8603 7.94818 16.2359 5.00016 12.0003 5.00016C11.1544 5.00016 10.3329 5.11773 9.55249 5.33818L7.97446 3.76015C9.22127 3.26959 10.5793 3.00016 12.0003 3.00016C17.3924 3.00016 21.8784 6.87992 22.8189 12.0002C22.5067 13.6998 21.8038 15.2628 20.8068 16.5925ZM11.7229 7.50857C11.8146 7.50299 11.9071 7.50016 12.0003 7.50016C14.4855 7.50016 16.5003 9.51488 16.5003 12.0002C16.5003 12.0933 16.4974 12.1858 16.4919 12.2775L11.7229 7.50857Z',
  ],
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
  walls: propWalls = [],
  onWallsChange = () => {},
  texts: propTexts = [],
  onTextsChange = () => {},
  activeLayer: propActiveLayer = 'fichas',
  onLayerChange = () => {},
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
  const [currentWall, setCurrentWall] = useState(null);
  const [walls, setWalls] = useState(propWalls);
  const [selectedWallId, setSelectedWallId] = useState(null);
  const [doorMenuWallId, setDoorMenuWallId] = useState(null);
  const [measureLine, setMeasureLine] = useState(null);
  const [measureShape, setMeasureShape] = useState('line');
  const [measureSnap, setMeasureSnap] = useState('center');
  const [measureVisible, setMeasureVisible] = useState(true);
  const [texts, setTexts] = useState(propTexts);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [textOptions, setTextOptions] = useState({
    fill: '#ffffff',
    bgColor: 'rgba(0,0,0,0.5)',
    fontFamily: 'Arial',
    fontSize: 20,
    bold: false,
    italic: false,
    underline: false,
  });
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState('medium');
  const [activeLayer, setActiveLayer] = useState(propActiveLayer);

  // Sincronizar con la prop externa
  useEffect(() => {
    setActiveLayer(propActiveLayer);
  }, [propActiveLayer]);

  // Filtrar elementos por capa activa
  const filteredTokens = tokens.filter(token => (token.layer || 'fichas') === activeLayer);
  const filteredLines = lines.filter(line => (line.layer || 'fichas') === activeLayer);
  const filteredWalls = walls.filter(wall => (wall.layer || 'fichas') === activeLayer);
  const filteredTexts = texts.filter(text => (text.layer || 'fichas') === activeLayer);

  // Función para cambiar de capa
  const handleLayerChange = (newLayer) => {
    setActiveLayer(newLayer);
    onLayerChange(newLayer);
    // Limpiar selecciones al cambiar de capa
    setSelectedId(null);
    setSelectedLineId(null);
    setSelectedWallId(null);
    setSelectedTextId(null);
  };

  // Función para detectar colisiones con muros (independiente de la capa)
  const isPositionBlocked = useCallback((x, y) => {
    // Verificar todos los muros, independientemente de la capa
    return walls.some(wall => {
      // Solo bloquear si la puerta está cerrada
      if (wall.door !== 'closed') return false;
      
      // Obtener las coordenadas del muro
      const [x1, y1, x2, y2] = wall.points;
      const wallX = wall.x;
      const wallY = wall.y;
      
      // Calcular el área ocupada por el muro
      const minX = wallX + Math.min(x1, x2);
      const maxX = wallX + Math.max(x1, x2);
      const minY = wallY + Math.min(y1, y2);
      const maxY = wallY + Math.max(y1, y2);
      
      // Convertir coordenadas del muro a celdas de la cuadrícula
      const wallCellMinX = Math.floor(minX / effectiveGridSize);
      const wallCellMaxX = Math.floor(maxX / effectiveGridSize);
      const wallCellMinY = Math.floor(minY / effectiveGridSize);
      const wallCellMaxY = Math.floor(maxY / effectiveGridSize);
      
      // Verificar si la posición del token intersecta con el muro
      return (
        x >= wallCellMinX && 
        x <= wallCellMaxX &&
        y >= wallCellMinY && 
        y <= wallCellMaxY
      );
    });
  }, [walls, effectiveGridSize]);
  const tokenRefs = useRef({});
  const lineRefs = useRef({});
  const wallRefs = useRef({});
  const lineTrRef = useRef();
  const textRefs = useRef({});
  const textTrRef = useRef();
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

  useEffect(() => {
    setWalls(propWalls);
  }, [propWalls]);

  useEffect(() => {
    setTexts(propTexts);
  }, [propTexts]);

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

  const updateWalls = (updater) => {
    setWalls((prev) =>
      typeof updater === 'function' ? updater(prev) : updater
    );
  };

  const saveWalls = (updater) => {
    setWalls((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onWallsChange(next);
      return next;
    });
  };

  const updateTexts = (updater) => {
    setTexts((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onTextsChange(next);
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

  const handleWallDragEnd = (id, e) => {
    const node = e.target;
    const x = node.x();
    const y = node.y();
    saveWalls((ws) => ws.map((w) => (w.id === id ? { ...w, x, y } : w)));
  };

  const handleWallPointDrag = (id, index, e, save = false) => {
    const node = e.target;
    const x = node.x();
    const y = node.y();
    const updater = (ws) =>
      ws.map((w) => {
        if (w.id !== id) return w;
        const abs = [
          w.x + w.points[0],
          w.y + w.points[1],
          w.x + w.points[2],
          w.y + w.points[3],
        ];
        abs[index * 2] = x;
        abs[index * 2 + 1] = y;
        const minX = Math.min(abs[0], abs[2]);
        const minY = Math.min(abs[1], abs[3]);
        const rel = [abs[0] - minX, abs[1] - minY, abs[2] - minX, abs[3] - minY];
        return { ...w, x: minX, y: minY, points: rel };
      });
    if (save) saveWalls(updater); else updateWalls(updater);
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
    updateTexts((ts) => ts.map((t) => (t.id === id ? { ...t, x, y } : t)));
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
    updateTexts((ts) =>
      ts.map((t) => (t.id === id ? { ...t, fontSize: newFontSize } : t))
    );
    node.getLayer().batchDraw();
  };

  const handleTextEdit = (id) => {
    const current = texts.find((t) => t.id === id);
    if (!current) return;
    const content = prompt('Texto:', current.text);
    if (content !== null) {
      updateTexts((ts) =>
        ts.map((t) => (t.id === id ? { ...t, text: content } : t))
      );
    }
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
    
    // Verificar colisiones con muros antes de colocar el token
    if (isPositionBlocked(col, row)) {
      // Si la posición está bloqueada, devolver el token a su posición original
      const originalToken = tokens.find(t => t.id === id);
      if (originalToken) {
        node.position({
          x: originalToken.x * effectiveGridSize + offX + gridOffsetX,
          y: originalToken.y * effectiveGridSize + offY + gridOffsetY,
        });
        node.getLayer().batchDraw();
      }
      setDragShadow(null);
      return;
    }
    
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
        layer: activeLayer,
      });
    }
    if (activeTool === 'wall' && e.evt.button === 0) {
      const pointer = stageRef.current.getPointerPosition();
      const relX = (pointer.x - groupPos.x) / (baseScale * zoom);
      const relY = (pointer.y - groupPos.y) / (baseScale * zoom);
      setSelectedWallId(null);
      setCurrentWall({
        x: relX,
        y: relY,
        points: [relX, relY, relX, relY],
        color: '#ff6600',
        width: 4,
        door: 'closed',
        layer: activeLayer,
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
      const content = prompt('Texto:', '');
      if (content !== null) {
        updateTexts((t) => [
          ...t,
          { id, x: relX, y: relY, text: content, ...textOptions, bgColor, layer: activeLayer },
        ]);
        setSelectedTextId(id);
      }
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
    if (currentWall) {
      setCurrentWall((wl) => ({
        ...wl,
        points: [wl.points[0], wl.points[1], relX, relY],
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
    if (currentWall) {
      const xs = currentWall.points.filter((_, i) => i % 2 === 0);
      const ys = currentWall.points.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const rel = currentWall.points.map((p, i) =>
        i % 2 === 0 ? p - minX : p - minY
      );
      const finished = {
        ...currentWall,
        id: Date.now(),
        x: minX,
        y: minY,
        points: rel,
      };
      saveWalls((ws) => [...ws, finished]);
      setCurrentWall(null);
      setSelectedWallId(finished.id);
    }
    if (measureLine) setMeasureLine(null);
    if (isPanning) setIsPanning(false);
  };

  const handleStageClick = (e) => {
    if (e.target === stageRef.current) {
      setSelectedId(null);
      setSelectedLineId(null);
      setSelectedWallId(null);
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
      if (selectedWallId != null && e.key.toLowerCase() === 'delete') {
        saveWalls(walls.filter((w) => w.id !== selectedWallId));
        setSelectedWallId(null);
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
              updateTexts(texts.filter((t) => t.id !== selectedTextId));
              setSelectedTextId(null);
              return;
            default:
              break;
          }
          updateTexts((ts) =>
            ts.map((t) => (t.id === selectedTextId ? { ...t, x, y } : t))
          );
          return;
        }
      }

      if (selectedId == null) return;
      const index = tokens.findIndex((t) => t.id === selectedId);
      if (index === -1) return;
      let { x, y } = tokens[index];
      let newX = x;
      let newY = y;
      
      switch (e.key.toLowerCase()) {
        case 'w':
          newY = y - 1;
          break;
        case 's':
          newY = y + 1;
          break;
        case 'a':
          newX = x - 1;
          break;
        case 'd':
          newX = x + 1;
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
      
      // Aplicar límites del mapa
      newX = Math.max(0, Math.min(mapWidth - 1, newX));
      newY = Math.max(0, Math.min(mapHeight - 1, newY));
      
      // Verificar colisiones con muros (independiente de la capa)
      if (isPositionBlocked(newX, newY)) {
        // Si la posición está bloqueada, no mover el token
        return;
      }
      
      const updated = tokens.map((t) =>
        t.id === selectedId ? { ...t, x: newX, y: newY } : t
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
      walls,
      selectedTextId,
      selectedWallId,
      texts,
      isPositionBlocked,
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
        
        // Verificar colisiones con muros antes de crear el token
        if (isPositionBlocked(x, y)) {
          // Si la posición está bloqueada, no crear el token
          return;
        }
        
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
          layer: activeLayer,
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
      activeLayer,
      isPositionBlocked,
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
          style={{
            background: '#000',
            cursor: activeTool === 'wall' ? 'crosshair' : 'default',
          }}
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
                {filteredTokens.map((token) => (
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
              {filteredTokens.map((token) => (
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
              {filteredLines.map((ln) => (
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
              {filteredTexts.map((t) => (
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
                  <Tag
                    fill={t.bgColor}
                    {...(!t.text ? { width: t.fontSize, height: t.fontSize } : {})}
                  />
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
              {currentWall && (
                <Line
                  points={currentWall.points}
                  stroke={currentWall.color}
                  strokeWidth={currentWall.width}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
              {measureElement}
            </Group>
          </Layer>
          <Layer>
            <Group
              x={groupPos.x}
              y={groupPos.y}
              scaleX={groupScale}
              scaleY={groupScale}
            >
              {filteredWalls.map((wl) => (
                <React.Fragment key={wl.id}>
                  <Line
                    ref={(el) => {
                      if (el) wallRefs.current[wl.id] = el;
                    }}
                    x={wl.x}
                    y={wl.y}
                    points={wl.points}
                    stroke={wl.color}
                    strokeWidth={wl.width}
                    lineCap="round"
                    lineJoin="round"
                    draggable={activeTool === 'select'}
                    onClick={() => {
                      setSelectedWallId(wl.id);
                      setSelectedId(null);
                      setSelectedLineId(null);
                      setSelectedTextId(null);
                    }}
                    onDragEnd={(e) => handleWallDragEnd(wl.id, e)}
                  />
                  <Circle
                    x={wl.x + wl.points[0]}
                    y={wl.y + wl.points[1]}
                    radius={6}
                    fill="#ff6600"
                    draggable={activeTool === 'select'}
                    onMouseDown={() => {
                      setSelectedWallId(wl.id);
                      setSelectedId(null);
                      setSelectedLineId(null);
                      setSelectedTextId(null);
                    }}
                    onDragMove={(e) => handleWallPointDrag(wl.id, 0, e)}
                    onDragEnd={(e) => handleWallPointDrag(wl.id, 0, e, true)}
                    onMouseEnter={() =>
                      (stageRef.current.container().style.cursor = 'crosshair')
                    }
                    onMouseLeave={() =>
                      (stageRef.current.container().style.cursor =
                        activeTool === 'wall' ? 'crosshair' : 'default')
                    }
                  />
                  {/* Door icon at midpoint */}
                  <Group
                    x={wl.x + (wl.points[0] + wl.points[2]) / 2}
                    y={wl.y + (wl.points[1] + wl.points[3]) / 2}
                    rotation={
                      (Math.atan2(
                        wl.points[3] - wl.points[1],
                        wl.points[2] - wl.points[0]
                      ) /
                        Math.PI) *
                      180
                    }
                    onClick={() => setDoorMenuWallId(wl.id)}
                  >
                    {DOOR_PATHS[wl.door || 'closed'].map((d, i) => (
                      <Path
                        key={i}
                        data={d}
                        stroke={wl.color}
                        strokeWidth={1}
                        lineCap="round"
                        lineJoin="round"
                      />
                    ))}
                  </Group>
                  <Circle
                    x={wl.x + wl.points[2]}
                    y={wl.y + wl.points[3]}
                    radius={6}
                    fill="#ff6600"
                    draggable={activeTool === 'select'}
                    onMouseDown={() => {
                      setSelectedWallId(wl.id);
                      setSelectedId(null);
                      setSelectedLineId(null);
                      setSelectedTextId(null);
                    }}
                    onDragMove={(e) => handleWallPointDrag(wl.id, 1, e)}
                    onDragEnd={(e) => handleWallPointDrag(wl.id, 1, e, true)}
                    onMouseEnter={() =>
                      (stageRef.current.container().style.cursor = 'crosshair')
                    }
                    onMouseLeave={() =>
                      (stageRef.current.container().style.cursor =
                        activeTool === 'wall' ? 'crosshair' : 'default')
                    }
                  />
                </React.Fragment>
              ))}
            </Group>
          </Layer>
          <Layer listening>
            {filteredTokens.map((token) => (
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
        activeLayer={activeLayer}
        onLayerChange={handleLayerChange}
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
      {doorMenuWallId != null && (
        <WallDoorMenu
          wall={walls.find((w) => w.id === doorMenuWallId)}
          onClose={() => setDoorMenuWallId(null)}
          onUpdate={(w) => {
            saveWalls((ws) => ws.map((wl) => (wl.id === w.id ? w : wl)));
          }}
        />
      )}
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
  walls: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      points: PropTypes.arrayOf(PropTypes.number).isRequired,
      color: PropTypes.string,
      width: PropTypes.number,
      door: PropTypes.oneOf(['secret', 'closed', 'open']),
    })
  ),
  onWallsChange: PropTypes.func,
  texts: PropTypes.array,
  onTextsChange: PropTypes.func,
  activeLayer: PropTypes.string,
  onLayerChange: PropTypes.func,
};

export default MapCanvas;
