import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
import TokenBarMenu from './TokenBarMenu';
import TokenSheetModal from './TokenSheetModal';
import { ESTADOS } from './EstadoSelector';
import { nanoid } from 'nanoid';
import { motion } from 'framer-motion';
import {
  createToken,
  cloneTokenSheet,
  saveTokenSheet,
  ensureSheetDefaults,
  updateLocalTokenSheet,
} from '../utils/token';
import TokenBars from './TokenBars';
import LoadingSpinner from './LoadingSpinner';
import KonvaSpinner from './KonvaSpinner';
import Konva from 'konva';
import Toolbar from './Toolbar';
import WallDoorMenu from './WallDoorMenu';
import DoorCheckModal from './DoorCheckModal';
import AttackModal from './AttackModal';
import DefenseModal from './DefenseModal';
import { applyDoorCheck } from '../utils/door';
import { computeVisibility, combineVisibilityPolygons, isPointVisible } from '../utils/visibility';
import { isTokenVisible, isDoorVisible } from '../utils/playerVisibility';
import { applyDamage, parseDieValue } from '../utils/damage';
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { deepEqual } from '../utils/deepEqual';
import useAttackRequests from '../hooks/useAttackRequests';



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

const normalizeWallRotation = (x1, y1, x2, y2) => {
  let deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  deg = (deg + 360) % 180;
  if (deg > 90) deg -= 180;
  return Math.abs(deg);
};

// Componente para mostrar puertas interactivas en la capa fichas
const InteractiveDoor = ({ wall, effectiveGridSize, onToggle }) => {
  const [x1, y1, x2, y2] = wall.points;
  
  // Calcular el punto central exacto del segmento del muro
  const centerX = wall.x + (x1 + x2) / 2;
  const centerY = wall.y + (y1 + y2) / 2;
  
  // Calcular la orientación del muro para orientar la puerta
  const wallAngle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  const isVertical = Math.abs(wallAngle) > 45 && Math.abs(wallAngle) < 135;
  
  // Tamaño más sutil y proporcional
  const doorWidth = effectiveGridSize * 0.6;
  const doorHeight = effectiveGridSize * 0.15;
  
  // Solo mostrar puertas cerradas y abiertas (no secretas) desde la capa fichas
  if (wall.door === 'secret') return null;
  
  // Colores más sutiles y realistas
  const doorColor = wall.door === 'closed' ? '#8B4513' : '#90EE90'; // Marrón para cerrada, verde claro para abierta
  const handleColor = wall.door === 'closed' ? '#FFD700' : '#32CD32'; // Dorado para cerrada, verde para abierta
  
  return (
    <Group>
      {/* Marco de la puerta */}
      <Rect
        x={centerX}
        y={centerY}
        width={isVertical ? doorHeight : doorWidth}
        height={isVertical ? doorWidth : doorHeight}
        offsetX={isVertical ? doorHeight / 2 : doorWidth / 2}
        offsetY={isVertical ? doorWidth / 2 : doorHeight / 2}
        fill={doorColor}
        stroke="#654321"
        strokeWidth={2}
        cornerRadius={2}
        onClick={() => onToggle(wall.id)}
        onTap={() => onToggle(wall.id)}
        listening={true}
        opacity={0.9}
      />
      
      {/* Manija/indicador de la puerta */}
      <Circle
        x={centerX + (isVertical ? 0 : (wall.door === 'closed' ? -doorWidth * 0.3 : doorWidth * 0.3))}
        y={centerY + (isVertical ? (wall.door === 'closed' ? -doorWidth * 0.3 : doorWidth * 0.3) : 0)}
        radius={3}
        fill={handleColor}
        stroke="#000000"
        strokeWidth={1}
        onClick={() => onToggle(wall.id)}
        onTap={() => onToggle(wall.id)}
        listening={true}
      />
      
      {/* Indicador sutil de estado (solo aparece al hacer hover) */}
      <Text
        x={centerX}
        y={centerY - (isVertical ? doorWidth / 2 + 15 : doorHeight / 2 + 15)}
        text={wall.door === 'closed' ? '🔒' : '🔓'}
        fontSize={12}
        fill={handleColor}
        align="center"
        verticalAlign="middle"
        onClick={() => onToggle(wall.id)}
        onTap={() => onToggle(wall.id)}
        listening={true}
        opacity={0.7}
      />
      
      {/* Área de click más grande pero invisible */}
      <Circle
        x={centerX}
        y={centerY}
        radius={Math.max(doorWidth, doorHeight) / 2 + 10}
        fill="transparent"
        onClick={() => onToggle(wall.id)}
        onTap={() => onToggle(wall.id)}
        listening={true}
      />
    </Group>
  );
};

InteractiveDoor.propTypes = {
  wall: PropTypes.object.isRequired,
  effectiveGridSize: PropTypes.number.isRequired,
  onToggle: PropTypes.func.isRequired,
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
      isAttacker = false,
      isTarget = false,
      onDragEnd,
      onDragStart,
      onClick,
      onTransformEnd,
      onRotate,
      onSettings,
      activeTool = 'select',
      onStates,
      onBars,
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
    const barsRef = useRef();
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
        if (sheet) {
          const normalized = ensureSheetDefaults(sheet);
          setStats(normalized.stats || {});
        }
      };
      load();
      const handler = (e) => {
        if (e.detail && e.detail.id === tokenSheetId) {
          const normalized = ensureSheetDefaults(e.detail);
          setStats(normalized.stats || {});
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
      if (barsRef.current) {
        barsRef.current.position({
          x: box.x - HANDLE_OFFSET + buttonSize + 4,
          y: box.y + box.height + HANDLE_OFFSET,
        });
      }
      if (estadosRef.current) {
        estadosRef.current.position({
          x: box.x - HANDLE_OFFSET + (buttonSize + 4) * 2,
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
      if (barsRef.current) {
        barsRef.current.fontSize(buttonSize);
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
              saveTokenSheet(sheet);
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

    const roleOutline = isAttacker
      ? { stroke: '#f6e05e', strokeWidth: 3, dash: [4, 4] }
      : isTarget
        ? { stroke: '#f87171', strokeWidth: 3, dash: [4, 4] }
        : null;

    return (
      <Group
        ref={groupRef}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        onDblClick={() => {
          if (activeTool !== 'target') onSettings?.(id);
        }}
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
        {roleOutline && <Rect {...outline} {...roleOutline} />}
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
              // No snap mientras se redimensiona para evitar saltos abruptos
              boundBoxFunc={(oldBox, newBox) => newBox}
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
              ref={barsRef}
              text="📊"
              fontSize={buttonSize}
              shadowColor="#000"
              shadowBlur={4}
              shadowOpacity={0.9}
              listening
              onClick={() => onBars?.(id)}
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
  onBars: PropTypes.func,
  onHoverChange: PropTypes.func,
  estados: PropTypes.array,
  tokenSheetId: PropTypes.string,
  activeTool: PropTypes.string,
  isAttacker: PropTypes.bool,
  isTarget: PropTypes.bool,
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
  enableDarkness = true,
  darknessOpacity = 0.7,
  showVisionPolygons = true,
  // Nuevas props para sincronización bidireccional
  pageId = null,
  isPlayerView = false,
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

  // Refs para acceder a valores actuales sin dependencias
  const zoomRef = useRef(zoom);
  const groupPosRef = useRef(groupPos);
  const baseScaleRef = useRef(baseScale);
  const tokensRef = useRef(tokens);
  const gridOffsetXRef = useRef(gridOffsetX);
  const gridOffsetYRef = useRef(gridOffsetY);
  const gridSizeRef = useRef(gridSize);

  // Actualizar refs cuando cambien los valores
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { groupPosRef.current = groupPos; }, [groupPos]);
  useEffect(() => { baseScaleRef.current = baseScale; }, [baseScale]);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  useEffect(() => { gridOffsetXRef.current = gridOffsetX; }, [gridOffsetX]);
  useEffect(() => { gridOffsetYRef.current = gridOffsetY; }, [gridOffsetY]);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [damagePopups, setDamagePopups] = useState([]);
  const [dragShadow, setDragShadow] = useState(null);
  const [settingsTokenIds, setSettingsTokenIds] = useState([]);
  const [estadoTokenIds, setEstadoTokenIds] = useState([]);
  const [barsToken, setBarsToken] = useState(null);
  const [openSheetTokens, setOpenSheetTokens] = useState([]);
  // Track tokenSheet IDs that have already been fetched to avoid redundant requests
  const loadedSheetIds = useRef(new Set());
  const [activeTool, setActiveTool] = useState('select');
  const [lines, setLines] = useState(propLines);
  const [currentLine, setCurrentLine] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [currentWall, setCurrentWall] = useState(null);
  const [walls, setWalls] = useState(propWalls);
  const [selectedWallId, setSelectedWallId] = useState(null);
  const [doorMenuWallId, setDoorMenuWallId] = useState(null);
  const [doorCheckWallId, setDoorCheckWallId] = useState(null);
  const [measureLine, setMeasureLine] = useState(null);
  const [measureShape, setMeasureShape] = useState('line');
  const [measureSnap, setMeasureSnap] = useState('center');
  const [measureVisible, setMeasureVisible] = useState(true);
  const [texts, setTexts] = useState(propTexts);
  const [selectedTextId, setSelectedTextId] = useState(null);

  // Estados para sistema de ataque
  const [attackSourceId, setAttackSourceId] = useState(null);
  const attackSourceIdRef = useRef(null);
  const [attackTargetId, setAttackTargetId] = useState(null);
  const attackTargetIdRef = useRef(null);
  const [attackLine, setAttackLine] = useState(null);
  const [attackResult, setAttackResult] = useState(null);
  const [attackReady, setAttackReady] = useState(false);
  const [attackRequestId, setAttackRequestId] = useState(null);

  useEffect(() => {
    attackSourceIdRef.current = attackSourceId;
  }, [attackSourceId]);

  useEffect(() => {
    attackTargetIdRef.current = attackTargetId;
  }, [attackTargetId]);

  useEffect(() => {
    if (activeTool !== 'target') {
      setAttackSourceId(null);
      setAttackTargetId(null);
      setAttackLine(null);
      setAttackResult(null);
      setAttackReady(false);
    }
  }, [activeTool]);

  useAttackRequests({
    tokens,
    playerName,
    userType,
    onAttack: ({ id, attackerId, targetId, result, deleted }) => {
      if (deleted) {
        if (attackRequestId === id) {
          setAttackRequestId(null);
          setAttackSourceId(null);
          setAttackTargetId(null);
          setAttackLine(null);
          setAttackResult(null);
          setAttackReady(false);
        }
        return;
      }
      setAttackRequestId(id);
      setAttackSourceId(attackerId);
      setAttackTargetId(targetId);
      setAttackResult(result);
      const source = tokens.find(t => t.id === attackerId);
      const target = tokens.find(t => t.id === targetId);
      if (source && target) {
        setAttackLine([source.x, source.y, target.x, target.y]);
      }
    },
  });

  // Eliminado triggerDamagePopup de aquí - se moverá después de effectiveGridSize

  // Sincronización manual de fichas con las hojas de personaje

  // Eliminado el listener de eventos window para evitar duplicación
  // Las animaciones ahora solo se manejan a través de Firebase

  // Eliminado el listener de localStorage para evitar duplicación de animaciones
  // Las animaciones ahora solo se sincronizan a través de Firebase

  // Listener de Firebase movido después de la definición de triggerDamagePopup



  // Estados para selección múltiple
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [selectedWalls, setSelectedWalls] = useState([]);
  const [selectedTexts, setSelectedTexts] = useState([]);

  // Estados para cuadro de selección
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });

  // Estado para clipboard (copiar/pegar)
  const [clipboard, setClipboard] = useState(null);

  // Estado para tracking de posición del cursor
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Estado para vista previa de pegado
  const [showPastePreview, setShowPastePreview] = useState(false);

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
  
  // Estados para el sistema de iluminación
  const [lightPolygons, setLightPolygons] = useState({});
  const [combinedLight, setCombinedLight] = useState([]);

  // Estados para el sistema de visión de jugadores
  const [playerVisionPolygons, setPlayerVisionPolygons] = useState({});
  const [combinedPlayerVision, setCombinedPlayerVision] = useState([]);

  // Estado para simulación de vista de jugador
  const [playerViewMode, setPlayerViewMode] = useState(false);

  // Tiempo de espera para guardar en Firebase (ajustable 150-300ms)
  const saveDelayRef = useRef(150);
  const setSaveDelay = (ms) => {
    saveDelayRef.current = Math.max(150, Math.min(300, ms));
  };

  // Crear syncManager para jugadores usando la función global
  const syncManager = useMemo(() => {
    if (!isPlayerView || !pageId || !playerName) return null;

    // Crear el manager con refs y callbacks dentro del componente
    const saveTimeouts = {
      tokens: null,
      lines: null,
      walls: null,
      texts: null,
    };

    const prevData = {
      tokens: [],
      lines: [],
      walls: [],
      texts: [],
    };

    const saveToFirebase = async (type, data) => {
      if (!pageId || !isPlayerView) return;

      // Verificar si hay cambios reales
      if (deepEqual(data, prevData[type])) return;

      // Limpiar timeout anterior
      if (saveTimeouts[type]) {
        clearTimeout(saveTimeouts[type]);
      }

      // Debouncing: esperar el tiempo configurado antes de guardar
      saveTimeouts[type] = setTimeout(async () => {
        try {
          // Validaciones de seguridad para jugadores
          let filteredData = data;

          if (type === 'tokens') {
            // Jugadores solo pueden modificar tokens que controlan
            filteredData = data.filter(
              (token) => token.controlledBy === playerName
            );

            const pageRef = doc(db, 'pages', pageId);
            let mergedTokens = [];

            await runTransaction(db, async (transaction) => {
              const snap = await transaction.get(pageRef);
              const current = snap.data()?.tokens || [];
              const others = current.filter(
                (t) => t.controlledBy !== playerName
              );
              mergedTokens = [...filteredData, ...others].sort((a, b) =>
                String(a.id).localeCompare(String(b.id))
              );
              transaction.update(pageRef, { tokens: mergedTokens });
            });

            prevData[type] = mergedTokens;
            console.log(
              `✅ Jugador ${playerName} guardó ${type} exitosamente (${mergedTokens.length} elementos)`
            );
            return;
          }

          // Actualizar referencia previa
          prevData[type] = filteredData;

          // Guardar en Firebase
          await updateDoc(doc(db, 'pages', pageId), { [type]: filteredData });
          console.log(
            `✅ Jugador ${playerName} guardó ${type} exitosamente (${filteredData.length} elementos)`
          );
        } catch (error) {
          console.error(`Error guardando ${type} para jugador:`, error);
        }
      }, saveDelayRef.current);
    };
    
    return { saveToFirebase, setSaveDelay };
  }, [isPlayerView, pageId, playerName]);

  // Función wrapper para manejar cambios de tokens con sincronización
  const handleTokensChange = useCallback((newTokens, options = {}) => {
    if (options.localOnly) {
      onTokensChange(newTokens);
      return;
    }
    if (isPlayerView) {
      // Para jugadores: solo permitir cambios en tokens que controlan
      // Mantener todos los tokens existentes y solo actualizar los que el jugador puede modificar
      const updatedTokens = tokens.map(existingToken => {
        // Buscar si este token tiene una actualización en newTokens
        const updatedToken = newTokens.find(t => t.id === existingToken.id);

        if (updatedToken) {
          // Verificar si el jugador puede modificar este token
          if (existingToken.controlledBy === playerName) {
            return updatedToken; // Permitir la actualización
          } else {
            return existingToken; // Mantener el token original (no permitir cambios)
          }
        }

        return existingToken; // Mantener tokens que no fueron modificados
      });

      // Agregar tokens nuevos solo si el jugador los controla
      const newTokensToAdd = newTokens.filter(newToken => {
        const isNewToken = !tokens.find(t => t.id === newToken.id);
        return isNewToken && newToken.controlledBy === playerName;
      });

      const finalTokens = [...updatedTokens, ...newTokensToAdd];

      // Usar syncManager para guardar en Firebase Y actualizar estado local
      if (syncManager) {
        syncManager.saveToFirebase('tokens', finalTokens);
      }
      onTokensChange(finalTokens);
    } else {
      // Para Master, usar el flujo normal
      onTokensChange(newTokens);
    }
  }, [isPlayerView, playerName, tokens, syncManager, onTokensChange]);

  // Sincronización manual: sin listeners automáticos de fichas

  // Funciones wrapper para otros elementos
  const handleLinesChange = useCallback((newLines) => {
    if (isPlayerView && syncManager) {
      syncManager.saveToFirebase('lines', newLines);
    }
    onLinesChange(newLines);
  }, [isPlayerView, syncManager, onLinesChange]);

  const handleWallsChange = useCallback((newWalls) => {
    if (isPlayerView && syncManager) {
      syncManager.saveToFirebase('walls', newWalls);
    }
    onWallsChange(newWalls);
  }, [isPlayerView, syncManager, onWallsChange]);

  const handleTextsChange = useCallback((newTexts) => {
    if (isPlayerView && syncManager) {
      syncManager.saveToFirebase('texts', newTexts);
    }
    onTextsChange(newTexts);
  }, [isPlayerView, syncManager, onTextsChange]);

  const [simulatedPlayer, setSimulatedPlayer] = useState('');
  const [activeTokenId, setActiveTokenId] = useState(null);
  const [tokenSwitcherPos, setTokenSwitcherPos] = useState(() => {
    try {
      const stored = localStorage.getItem('tokenSwitcherPos');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { x: window.innerWidth / 2 - 140, y: 70 };
  });
  const [draggingSwitcher, setDraggingSwitcher] = useState(false);
  const switcherOffset = useRef({ x: 0, y: 0 });
  const switcherRef = useRef(null);

  useEffect(() => {
    const currentPlayer = userType === 'player' ? playerName : simulatedPlayer;
    const playerTokens = tokens.filter(t => t.controlledBy === currentPlayer);
    if (playerTokens.length === 0) {
      setActiveTokenId(null);
      return;
    }
    setActiveTokenId(id => playerTokens.find(t => t.id === id)?.id || playerTokens[0].id);
  }, [tokens, playerName, userType, simulatedPlayer]);

  // Sincronizar con la prop externa
  useEffect(() => {
    setActiveLayer(propActiveLayer);
  }, [propActiveLayer]);

  // Event listener para Ctrl + L (simulación de vista de jugador)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'l' && userType === 'master') {
        e.preventDefault();

        if (!playerViewMode) {
          const availablePlayers = [...new Set(tokens.map(t => t.controlledBy).filter(Boolean))];

          if (availablePlayers.length === 0) {
            alert('No hay tokens controlados por jugadores para simular');
            return;
          }

          if (availablePlayers.length === 1) {
            setSimulatedPlayer(availablePlayers[0]);
            setPlayerViewMode(true);
          } else {
            const selectedPlayer = prompt(
              `Selecciona el jugador a simular:\n${availablePlayers.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
              '1'
            );
            const playerIndex = parseInt(selectedPlayer) - 1;
            if (playerIndex >= 0 && playerIndex < availablePlayers.length) {
              setSimulatedPlayer(availablePlayers[playerIndex]);
              setPlayerViewMode(true);
            }
          }
        } else {
          setPlayerViewMode(false);
          setSimulatedPlayer('');
        }
        return;
      }

      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        const isPlayerMode = userType === 'player' || (userType === 'master' && playerViewMode);
        if (!isPlayerMode) return;
        const currentPlayer = userType === 'player' ? playerName : simulatedPlayer;
        const playerTokens = tokens.filter(t => t.controlledBy === currentPlayer);
        if (playerTokens.length < 2) return;
        e.preventDefault();
        const idx = playerTokens.findIndex(t => t.id === activeTokenId);
        const next = playerTokens[(idx + 1) % playerTokens.length];
        setActiveTokenId(next.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userType, playerViewMode, tokens, activeTokenId, playerName, simulatedPlayer]);

  useEffect(() => {
    if (!draggingSwitcher) return;
    const move = (e) => {
      setTokenSwitcherPos({
        x: e.clientX - switcherOffset.current.x,
        y: e.clientY - switcherOffset.current.y,
      });
    };
    const up = () => setDraggingSwitcher(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [draggingSwitcher]);

  useEffect(() => {
    localStorage.setItem('tokenSwitcherPos', JSON.stringify(tokenSwitcherPos));
  }, [tokenSwitcherPos]);

  // Sistema de visibilidad cruzada entre capas
  const getVisibleElements = (elements, currentLayer) => {
    const visible = [];
    const background = [];
    
    elements.forEach(element => {
      const elementLayer = element.layer || 'fichas';
      
      if (elementLayer === currentLayer) {
        // Elementos de la capa actual - opacidad normal
        visible.push({ ...element, crossLayerOpacity: 1, isBackground: false });
      } else {
        // Elementos de otras capas - opacidad reducida según la capa actual
        let opacity = 1;
        
        if (currentLayer === 'master') {
          // Capa Master ve Fichas con opacidad reducida
          if (elementLayer === 'fichas') {
            opacity = 0.4; // Un poco más visible para mejor referencia
          }
        } else if (currentLayer === 'luz') {
          // Capa Luz ve Master y Fichas con opacidad reducida
          if (elementLayer === 'master') {
            opacity = 0.35; // Master un poco más visible que Fichas
          } else if (elementLayer === 'fichas') {
            opacity = 0.25; // Fichas más tenue
          }
        }
        
        // Solo agregar si debe ser visible (Fichas no ve otras capas)
        if (currentLayer !== 'fichas' && opacity < 1) {
          background.push({ ...element, crossLayerOpacity: opacity, isBackground: true });
        }
      }
    });
    
    return { visible, background };
  };

  // Obtener elementos visibles y de fondo para cada tipo
  const tokenLayers = getVisibleElements(tokens, activeLayer);
  const lineLayers = getVisibleElements(lines, activeLayer);
  const wallLayers = getVisibleElements(walls, activeLayer);
  const textLayers = getVisibleElements(texts, activeLayer);

  // Combinar elementos principales y de fondo
  const filteredTokens = [...tokenLayers.background, ...tokenLayers.visible];
  const filteredLines = [...lineLayers.background, ...lineLayers.visible];
  const filteredWalls = [...wallLayers.background, ...wallLayers.visible];
  const filteredTexts = [...textLayers.background, ...textLayers.visible];

  // Función para cambiar de capa
  const handleLayerChange = (newLayer) => {
    setActiveLayer(newLayer);
    onLayerChange(newLayer);
    // Limpiar selecciones al cambiar de capa
    setSelectedId(null);
    setSelectedLineId(null);
    setSelectedWallId(null);
    setSelectedTextId(null);
    clearMultiSelection();
  };

  // Funciones para validar permisos de selección
  const canSelectElement = useCallback((element, elementType) => {
    if (userType === 'master') return true; // Master puede seleccionar todo

    switch (elementType) {
      case 'token':
        return element.controlledBy === playerName;
      case 'line':
        return element.createdBy === playerName || !element.createdBy; // Permitir líneas sin creador por compatibilidad
      case 'wall':
        return element.createdBy === playerName || !element.createdBy; // Permitir muros sin creador por compatibilidad
      case 'text':
        return element.createdBy === playerName || !element.createdBy; // Permitir textos sin creador por compatibilidad
      default:
        return false;
    }
  }, [userType, playerName]);

  // Funciones para manejo de selección múltiple
  const clearMultiSelection = () => {
    setSelectedTokens([]);
    setSelectedLines([]);
    setSelectedWalls([]);
    setSelectedTexts([]);
  };

  const clearAllSelections = () => {
    setSelectedId(null);
    setSelectedLineId(null);
    setSelectedWallId(null);
    setSelectedTextId(null);
    clearMultiSelection();
  };

  // Función para verificar si un punto está dentro de un rectángulo
  const isPointInRect = (point, rect) => {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height;
  };

  // Función para convertir posición de pantalla a coordenadas del mapa
  const screenToMapCoordinates = (screenX, screenY) => {
    const relX = (screenX - groupPos.x) / (baseScale * zoom);
    const relY = (screenY - groupPos.y) / (baseScale * zoom);
    return { x: relX, y: relY };
  };

  // Función para ajustar coordenadas a la grilla
  const snapToGrid = (x, y) => {
    const gridX = Math.round(x / effectiveGridSize) * effectiveGridSize;
    const gridY = Math.round(y / effectiveGridSize) * effectiveGridSize;
    return { x: gridX, y: gridY };
  };

  // Función para convertir coordenadas del mapa a celdas de grilla
  const mapToGridCoordinates = (mapX, mapY) => {
    const gridX = Math.round(mapX / effectiveGridSize);
    const gridY = Math.round(mapY / effectiveGridSize);
    return { x: gridX, y: gridY };
  };

  // Función para asegurar que las coordenadas estén dentro de los límites del mapa
  const clampToMapBounds = (x, y) => {
    const clampedX = Math.max(0, Math.min(mapWidth - 1, x));
    const clampedY = Math.max(0, Math.min(mapHeight - 1, y));
    return { x: clampedX, y: clampedY };
  };

  // Función para calcular el centro de un grupo de elementos
  const calculateElementsCenter = (elements, elementType) => {
    if (elements.length === 0) return { x: 0, y: 0 };

    let totalX = 0, totalY = 0;

    elements.forEach(element => {
      switch (elementType) {
        case 'tokens':
          totalX += element.x;
          totalY += element.y;
          break;
        case 'lines':
          totalX += element.x;
          totalY += element.y;
          break;
        case 'walls':
          // Para muros, calcular el centro real usando la base + puntos relativos
          const [x1, y1, x2, y2] = element.points;
          const centerX = element.x + (x1 + x2) / 2;
          const centerY = element.y + (y1 + y2) / 2;
          totalX += centerX / effectiveGridSize; // Convertir a coordenadas de grid
          totalY += centerY / effectiveGridSize;
          break;
        case 'texts':
          totalX += element.x / effectiveGridSize;
          totalY += element.y / effectiveGridSize;
          break;
        default:
          break;
      }
    });

    return {
      x: totalX / elements.length,
      y: totalY / elements.length
    };
  };

  // Función para obtener la posición de pegado inteligente
  const getSmartPastePosition = () => {
    // Verificar si el cursor está dentro del área visible del stage
    const stageRect = stageRef.current?.container().getBoundingClientRect();
    if (!stageRect) {
      // Fallback: centro de la vista actual
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;
      return screenToMapCoordinates(centerX, centerY);
    }

    // Verificar si la posición del mouse está dentro del stage
    const isMouseInStage = mousePosition.x >= stageRect.left &&
                          mousePosition.x <= stageRect.right &&
                          mousePosition.y >= stageRect.top &&
                          mousePosition.y <= stageRect.bottom;

    if (isMouseInStage) {
      // Usar posición del cursor relativa al stage
      const relativeX = mousePosition.x - stageRect.left;
      const relativeY = mousePosition.y - stageRect.top;
      return screenToMapCoordinates(relativeX, relativeY);
    } else {
      // Cursor fuera del stage: usar centro de la vista actual
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;
      return screenToMapCoordinates(centerX, centerY);
    }
  };

  // Función para verificar si un elemento está dentro del cuadro de selección
  const isElementInSelectionBox = (element, box, elementType) => {
    if (box.width === 0 || box.height === 0) return false;

    // Normalizar el cuadro de selección (en caso de que se arrastre hacia atrás)
    const normalizedBox = {
      x: Math.min(box.x, box.x + box.width),
      y: Math.min(box.y, box.y + box.height),
      width: Math.abs(box.width),
      height: Math.abs(box.height)
    };

    switch (elementType) {
      case 'token': {
        const tokenX = element.x * effectiveGridSize;
        const tokenY = element.y * effectiveGridSize;
        const tokenWidth = element.w * effectiveGridSize;
        const tokenHeight = element.h * effectiveGridSize;

        // Verificar si el token intersecta con el cuadro de selección
        return !(tokenX + tokenWidth < normalizedBox.x ||
                tokenX > normalizedBox.x + normalizedBox.width ||
                tokenY + tokenHeight < normalizedBox.y ||
                tokenY > normalizedBox.y + normalizedBox.height);
      }
      case 'line': {
        // Para líneas, verificar si algún punto está dentro del cuadro
        for (let i = 0; i < element.points.length; i += 2) {
          const pointX = element.x + element.points[i];
          const pointY = element.y + element.points[i + 1];
          if (isPointInRect({ x: pointX, y: pointY }, normalizedBox)) {
            return true;
          }
        }
        return false;
      }
      case 'wall': {
        // Para muros, verificar si algún punto está dentro del cuadro
        for (let i = 0; i < element.points.length; i += 2) {
          const pointX = element.x + element.points[i];
          const pointY = element.y + element.points[i + 1];
          if (isPointInRect({ x: pointX, y: pointY }, normalizedBox)) {
            return true;
          }
        }
        return false;
      }
      case 'text': {
        // Para textos, verificar si el punto está dentro del cuadro
        return isPointInRect({ x: element.x, y: element.y }, normalizedBox);
      }
      default:
        return false;
    }
  };

  // Función para alternar el estado de las puertas (solo desde capa fichas)
  const handleDoorToggle = useCallback((wallId) => {
    if (activeLayer !== 'fichas') return; // Solo permitir desde capa fichas
    
    const updatedWalls = walls.map(wall => {
      if (wall.id === wallId) {
        // Solo alternar entre cerrado y abierto (no tocar secretas)
        if (wall.door === 'closed') {
          return { ...wall, door: 'open' };
        } else if (wall.door === 'open') {
          return { ...wall, door: 'closed' };
        }
      }
      return wall;
    });
    
    setWalls(updatedWalls);
    handleWallsChange(updatedWalls);
  }, [walls, activeLayer, handleWallsChange]);


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
    setWalls(
      propWalls.map(w => ({
        difficulty: 1,
        baseDifficulty: 1,
        ...w,
      }))
    );
  }, [propWalls]);

  useEffect(() => {
    setTexts(propTexts);
  }, [propTexts]);

  const prevBarsRef = useRef({});
  useEffect(() => {
    let changed = false;
    tokens.forEach(t => {
      if (prevBarsRef.current[t.id] !== undefined && prevBarsRef.current[t.id] !== t.barsVisibility) {
        changed = true;
      }
      prevBarsRef.current[t.id] = t.barsVisibility;
    });
    Object.keys(prevBarsRef.current).forEach(id => {
      if (!tokens.find(t => t.id === id)) {
        delete prevBarsRef.current[id];
      }
    });
    if (changed) {
      window.dispatchEvent(
        new CustomEvent('barsVisibilityChanged', { detail: { tokens, pageId } })
      );
    }
  }, [tokens]);

  const tokenSheetIdsKey = useMemo(
    () => tokens.map((t) => t.tokenSheetId).filter(Boolean).sort().join(','),
    [tokens]
  );

  const canSeeBars = useCallback(
    (tk) => {
      // El Master SIEMPRE puede ver las barras, independientemente de la configuración
      if (userType === 'master') return true;

      // Para jugadores, aplicar las reglas de visibilidad
      if (!tk.barsVisibility || tk.barsVisibility === 'all') return true;
      if (tk.barsVisibility === 'none') return false;
      if (tk.barsVisibility === 'controlled') {
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

  useEffect(() => {
    const loadSheets = async () => {
      const stored = localStorage.getItem('tokenSheets');
      const sheets = stored ? JSON.parse(stored) : {};
      Object.keys(sheets).forEach((id) => loadedSheetIds.current.add(id));
      const promises = tokens.map(async (tk) => {
        if (
          !tk.tokenSheetId ||
          sheets[tk.tokenSheetId] ||
          loadedSheetIds.current.has(tk.tokenSheetId) ||
          !canSeeBars(tk)
        )
          return;

        try {
          const snap = await getDoc(doc(db, 'tokenSheets', tk.tokenSheetId));
          if (snap.exists()) {
            const sheet = ensureSheetDefaults({
              id: tk.tokenSheetId,
              ...snap.data(),
            });
            sheets[tk.tokenSheetId] = sheet;
            loadedSheetIds.current.add(tk.tokenSheetId);
            return;
          }
        } catch (err) {
          console.error('load token sheet', err);
        }

        if (!tk.enemyId) return;
        try {
          const snap = await getDoc(doc(db, 'enemies', tk.enemyId));
          if (snap.exists()) {
            const sheet = ensureSheetDefaults({
              id: tk.tokenSheetId,
              ...snap.data(),
            });
            await saveTokenSheet(sheet);
            sheets[tk.tokenSheetId] = sheet;
            loadedSheetIds.current.add(tk.tokenSheetId);
          }
        } catch (err) {
          console.error('load enemy sheet', err);
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        localStorage.setItem('tokenSheets', JSON.stringify(sheets));
        Object.values(sheets).forEach((sh) =>
          window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: sh }))
        );
      }
    };
    loadSheets();
  }, [playerName, userType, tokenSheetIdsKey]);

  const sheetListeners = useRef({});
  useEffect(() => {
    tokens.forEach((tk) => {
      if (!tk.tokenSheetId || !canSeeBars(tk)) return;
      if (!sheetListeners.current[tk.tokenSheetId]) {
        const ref = doc(db, 'tokenSheets', tk.tokenSheetId);
        sheetListeners.current[tk.tokenSheetId] = onSnapshot(ref, (snap) => {
          if (snap.exists()) {
            const data = { id: tk.tokenSheetId, ...snap.data() };
            updateLocalTokenSheet(data);
          }
        });
      }
    });
    Object.keys(sheetListeners.current).forEach((id) => {
      if (!tokens.find((t) => t.tokenSheetId === id)) {
        sheetListeners.current[id]();
        delete sheetListeners.current[id];
      }
    });
    return () => {
      Object.values(sheetListeners.current).forEach((unsub) => unsub());
      sheetListeners.current = {};
    };
  }, [tokenSheetIdsKey, playerName, userType]);

  // Si se especifica el número de casillas, calculamos el tamaño de cada celda
  const effectiveGridSize =
    imageSize.width && gridCells ? imageSize.width / gridCells : gridSize;

  // Funciones de conversión de coordenadas
  const pxToCell = (px, offset) =>
    Math.round((px - offset) / effectiveGridSize);
  const cellToPx = (cell, offset) => cell * effectiveGridSize + offset;
  const snapCell = (px, offset) =>
    Math.floor((px - offset) / effectiveGridSize);

  useEffect(() => {
    gridSizeRef.current = effectiveGridSize;
  }, [effectiveGridSize]);

  // Función para mostrar animaciones de daño
  const triggerDamagePopup = useCallback(
    ({ tokenId, value, stat, type }) => {
      // Validaciones más robustas
      if (!tokenId) {
        console.warn('triggerDamagePopup: tokenId no proporcionado');
        return;
      }

      // Buscar el token en la lista de tokens para obtener sus coordenadas de celda
      const token = tokensRef.current.find(t => t.id === tokenId);
      if (!token) {
        console.warn(`triggerDamagePopup: No se encontró token con id ${tokenId}`);
        return;
      }

      if (!stageRef.current || !containerRef.current) {
        console.warn('triggerDamagePopup: Referencias de stage o container no disponibles');
        return;
      }

      try {
        // Usar refs para obtener valores actuales sin dependencias (evita recreación del callback)
        const currentBaseScale = baseScaleRef.current;
        const currentZoom = zoomRef.current;
        const currentGroupPos = groupPosRef.current;

        // Usar las mismas funciones que se usan para renderizar los tokens
        const tokenPixelX = token.x * gridSizeRef.current + gridOffsetXRef.current;
        const tokenPixelY = token.y * gridSizeRef.current + gridOffsetYRef.current;
        const tokenWidth = (token.w || 1) * gridSizeRef.current;
        const tokenHeight = (token.h || 1) * gridSizeRef.current;

        // Calcular el centro del token en coordenadas del mundo
        const centerX = tokenPixelX + tokenWidth / 2;
        const centerY = tokenPixelY + tokenHeight / 2;

        // Transformar a coordenadas de pantalla usando las transformaciones actuales
        const groupScale = currentBaseScale * currentZoom;
        const screenX = centerX * groupScale + currentGroupPos.x;
        const screenY = centerY * groupScale + currentGroupPos.y;

        // Obtener la posición relativa al contenedor
        const stageRect = stageRef.current.container().getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        const x = screenX + stageRect.left - containerRect.left;
        const y = screenY + stageRect.top - containerRect.top;

        // Validar que las coordenadas sean números válidos
        if (isNaN(x) || isNaN(y)) {
          console.warn(`triggerDamagePopup: Coordenadas inválidas x=${x}, y=${y}`);
          return;
        }

        console.log(`Animación de daño para token ${tokenId} en celda (${token.x}, ${token.y}) -> píxeles (${tokenPixelX}, ${tokenPixelY}) -> pantalla (${x}, ${y}) [zoom: ${currentZoom}, pos: ${currentGroupPos.x},${currentGroupPos.y}]`);

        const id = nanoid();
        // No guardar coordenadas fijas, solo el tokenId para calcular posición en tiempo real
        setDamagePopups((prev) => [...prev, { id, tokenId, value, stat, type }]);

        setTimeout(() => {
          setDamagePopups((prev) => prev.filter((p) => p.id !== id));
        }, 7000);
      } catch (error) {
        console.error('Error en triggerDamagePopup:', error);
      }
    },
    []
  );

  const damageTimersRef = useRef({});

  const highlightTokenDamage = useCallback(
    (tokenId) => {
      if (!tokenId) return;
      const current = tokensRef.current;
      if (!current.find((t) => t.id === tokenId)) return;
      const startOpacity = 0.5;
      const duration = 7000;

      const existing = damageTimersRef.current[tokenId];
      if (existing && existing.raf) {
        cancelAnimationFrame(existing.raf);
      }

      const highlight = current.map((t) =>
        t.id === tokenId ? { ...t, tintOpacity: startOpacity } : t
      );
      handleTokensChange(highlight, { localOnly: true });

      const startTime = performance.now();
      const animate = (time) => {
        const progress = Math.min((time - startTime) / duration, 1);
        const opacity = startOpacity * (1 - progress);
        const updated = tokensRef.current.map((t) =>
          t.id === tokenId ? { ...t, tintOpacity: Math.max(0, opacity) } : t
        );
        handleTokensChange(updated, { localOnly: true });
        if (progress < 1) {
          damageTimersRef.current[tokenId].raf = requestAnimationFrame(animate);
        } else {
          delete damageTimersRef.current[tokenId];
        }
      };

      damageTimersRef.current[tokenId] = {
        raf: requestAnimationFrame(animate),
      };
    },
    [handleTokensChange]
  );

  useEffect(
    () => () => {
      Object.values(damageTimersRef.current).forEach((anim) => {
        if (anim.raf) cancelAnimationFrame(anim.raf);
      });
      damageTimersRef.current = {};
    },
    []
  );

  // Listener de Firebase para eventos de daño
  useEffect(() => {
    if (!pageId) return undefined;
    console.log(`Configurando listener de damageEvents para pageId: ${pageId}`);
    const q = query(collection(db, 'damageEvents'), where('pageId', '==', pageId));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        console.log('Evento de daño recibido desde Firebase:', data);
        triggerDamagePopup(data);
        if (
          ['vida', 'armadura', 'postura'].includes(data.stat) &&
          data.value > 0
        ) {
          highlightTokenDamage(data.tokenId);
        }
        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, 'damageEvents', change.doc.id));
          } catch (err) {
            console.error('Error eliminando evento de daño:', err);
          }
        }, 7000);
      });
    });
    return () => unsub();
  }, [pageId]);

  // Función para verificar si un token es visible para el jugador actual
  const isTokenVisibleToPlayer = useCallback((token) => {
    const isPlayerMode = userType === 'player' || (userType === 'master' && playerViewMode);
    if (!isPlayerMode) return true;
    return isTokenVisible(token, activeTokenId, tokens, playerVisionPolygons, effectiveGridSize);
  }, [userType, playerViewMode, activeTokenId, tokens, playerVisionPolygons, effectiveGridSize]);

  // Los tokens siempre mantienen opacidad completa - la visibilidad se controla solo por sombras
  const getTokenOpacity = useCallback((token) => {
    // Todos los tokens siempre tienen opacidad completa
    // La visibilidad se controla únicamente a través de la capa de sombras/oscuridad
    return 1;
  }, []);

  // Función para calcular polígonos de visibilidad para tokens con luz
  const calculateLightPolygons = useCallback(() => {
    const newPolygons = {};
    
    tokens.forEach(token => {
      if (token.light && token.light.enabled && token.light.radius > 0) {
        const origin = {
          x: (token.x + token.w / 2) * effectiveGridSize,
          y: (token.y + token.h / 2) * effectiveGridSize
        };
        
        // Aumentar significativamente el número de rayos para mayor precisión
        // Especialmente importante para evitar "saltos" de luz
        const polygon = computeVisibility(origin, walls, {
          rays: 180, // Aumentado de 64 a 180 para mayor precisión
          maxDistance: token.light.radius * effectiveGridSize
        });
        
        newPolygons[token.id] = {
          polygon,
          color: token.light.color || '#ffff88',
          opacity: token.light.opacity || 0.3
        };
      }
    });

    setLightPolygons(newPolygons);

    // Combinar todos los polígonos de luz en uno solo
    const allPolygons = Object.values(newPolygons).map(data => data.polygon).filter(p => p && p.length >= 3);
    const combined = combineVisibilityPolygons(allPolygons);
    setCombinedLight(combined);
  }, [tokens, walls, effectiveGridSize]);

  // Recalcular polígonos cuando cambien tokens o muros
  useEffect(() => {
    calculateLightPolygons();
  }, [calculateLightPolygons]);

  // Función para calcular polígonos de visión para todos los tokens
  const calculatePlayerVisionPolygons = useCallback(() => {
    const newPolygons = {};

    // Calcular visión para todos los tokens que tienen visión habilitada
    tokens.forEach(token => {
      // Verificar si el token tiene visión habilitada
      const visionEnabled = token.vision?.enabled !== false; // Por defecto true
      const visionRange = token.vision?.range || 10; // Rango por defecto de 10 casillas

      if (visionEnabled && visionRange > 0) {
        const origin = {
          x: (token.x + token.w / 2) * effectiveGridSize,
          y: (token.y + token.h / 2) * effectiveGridSize
        };

        // Calcular el polígono de visión usando ray casting
        const polygon = computeVisibility(origin, walls, {
          rays: 360, // Más rayos para mayor precisión en visión
          maxDistance: visionRange * effectiveGridSize
        });

        newPolygons[token.id] = {
          polygon,
          tokenId: token.id,
          controlledBy: token.controlledBy,
          visionRange: visionRange
        };
      }
    });

    setPlayerVisionPolygons(newPolygons);

    // Combinar todos los polígonos de visión
    const allPolygons = Object.values(newPolygons).map(data => data.polygon).filter(p => p && p.length >= 3);
    const combined = combineVisibilityPolygons(allPolygons);
    setCombinedPlayerVision(combined);
  }, [tokens, walls, effectiveGridSize]);

  // Recalcular polígonos de visión cuando cambien las dependencias
  useEffect(() => {
    calculatePlayerVisionPolygons();
  }, [calculatePlayerVisionPolygons]);



  // Función para detectar colisiones con muros (independiente de la capa)
  const isPositionBlocked = useCallback((x, y) => {
    // Verificar todos los muros, independientemente de la capa
    return walls.some(wall => {
      // Solo bloquear si la puerta está cerrada o secreta
      if (wall.door !== 'closed' && wall.door !== 'secret') return false;
      
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

  // Función para conectar automáticamente extremos de muros cercanos
  const snapWallEndpoints = useCallback((walls) => {
    const SNAP_DISTANCE = effectiveGridSize * 0.25; // Distancia de snap (1/4 de celda)
    const connectedWalls = [...walls];
    
    for (let i = 0; i < connectedWalls.length; i++) {
      const wall1 = connectedWalls[i];
      const [x1_1, y1_1, x2_1, y2_1] = wall1.points;
      
      // Extremos del primer muro en coordenadas absolutas
      const wall1_start = { x: wall1.x + x1_1, y: wall1.y + y1_1 };
      const wall1_end = { x: wall1.x + x2_1, y: wall1.y + y2_1 };
      
      for (let j = i + 1; j < connectedWalls.length; j++) {
        const wall2 = connectedWalls[j];
        const [x1_2, y1_2, x2_2, y2_2] = wall2.points;
        
        // Extremos del segundo muro en coordenadas absolutas
        const wall2_start = { x: wall2.x + x1_2, y: wall2.y + y1_2 };
        const wall2_end = { x: wall2.x + x2_2, y: wall2.y + y2_2 };
        
        // Verificar todas las combinaciones de extremos
        const connections = [
          { w1_point: wall1_start, w1_isStart: true, w2_point: wall2_start, w2_isStart: true },
          { w1_point: wall1_start, w1_isStart: true, w2_point: wall2_end, w2_isStart: false },
          { w1_point: wall1_end, w1_isStart: false, w2_point: wall2_start, w2_isStart: true },
          { w1_point: wall1_end, w1_isStart: false, w2_point: wall2_end, w2_isStart: false }
        ];
        
        connections.forEach(conn => {
          const distance = Math.sqrt(
            Math.pow(conn.w1_point.x - conn.w2_point.x, 2) + 
            Math.pow(conn.w1_point.y - conn.w2_point.y, 2)
          );
          
          if (distance > 0 && distance <= SNAP_DISTANCE) {
            // Calcular punto medio para la conexión
            const midX = (conn.w1_point.x + conn.w2_point.x) / 2;
            const midY = (conn.w1_point.y + conn.w2_point.y) / 2;
            
            // Actualizar el primer muro
            const newWall1Points = [...wall1.points];
            if (conn.w1_isStart) {
              newWall1Points[0] = midX - wall1.x;
              newWall1Points[1] = midY - wall1.y;
            } else {
              newWall1Points[2] = midX - wall1.x;
              newWall1Points[3] = midY - wall1.y;
            }
            connectedWalls[i] = { ...wall1, points: newWall1Points };
            
            // Actualizar el segundo muro
            const newWall2Points = [...wall2.points];
            if (conn.w2_isStart) {
              newWall2Points[0] = midX - wall2.x;
              newWall2Points[1] = midY - wall2.y;
            } else {
              newWall2Points[2] = midX - wall2.x;
              newWall2Points[3] = midY - wall2.y;
            }
            connectedWalls[j] = { ...wall2, points: newWall2Points };
          }
        });
      }
    }
    
    return connectedWalls;
  }, [effectiveGridSize]);



  // Función para alternar el estado de una puerta
  const toggleDoor = useCallback((wallId) => {
    const wall = walls.find(w => w.id === wallId);
    if (!wall) return;
    if (userType === 'player' && wall.door === 'closed' && (wall.difficulty || 1) > 1) {
      setDoorCheckWallId(wallId);
      return;
    }
    const updatedWalls = walls.map(w => {
      if (w.id !== wallId) return w;
      if (w.door === 'closed') return { ...w, door: 'open' };
      if (w.door === 'open') return { ...w, door: 'closed' };
      return w;
    });
    handleWallsChange(updatedWalls);
  }, [walls, handleWallsChange, userType]);

  const handleDoorCheckResult = useCallback((result) => {
    const wall = walls.find(w => w.id === doorCheckWallId);
    if (!wall) {
      setDoorCheckWallId(null);
      return;
    }
    if (result != null) {
      const updated = applyDoorCheck(wall, result);
      const updatedWalls = walls.map(w => (w.id === wall.id ? updated : w));
      handleWallsChange(updatedWalls);
    }
    setDoorCheckWallId(null);
  }, [doorCheckWallId, walls, handleWallsChange]);

  // Función para encontrar el punto de conexión más cercano
  const findNearestWallEndpoint = useCallback((x, y, threshold = 25) => {
    let nearestPoint = null;
    let minDistance = threshold;
    
    walls.forEach(wall => {
      const [x1, y1, x2, y2] = wall.points;
      const endpoints = [
        { x: wall.x + x1, y: wall.y + y1 },
        { x: wall.x + x2, y: wall.y + y2 }
      ];
      
      endpoints.forEach(endpoint => {
        const distance = Math.sqrt(
          Math.pow(x - endpoint.x, 2) + Math.pow(y - endpoint.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = endpoint;
        }
      });
    });
    
    return nearestPoint;
  }, [walls]);

  // Función auxiliar para calcular si un punto está cerca de un segmento de muro
  const isNearWallSegment = useCallback((x, y, wall, threshold = 20) => {
    const [x1, y1, x2, y2] = wall.points;
    const wallX1 = wall.x + x1;
    const wallY1 = wall.y + y1;
    const wallX2 = wall.x + x2;
    const wallY2 = wall.y + y2;
    
    // Calcular la distancia del punto al segmento de línea
    const A = x - wallX1;
    const B = y - wallY1;
    const C = wallX2 - wallX1;
    const D = wallY2 - wallY1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B) <= threshold;
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));
    
    const xx = wallX1 + param * C;
    const yy = wallY1 + param * D;
    
    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }, []);

  // Función para sugerir la mejor posición para una puerta en un muro
  const suggestDoorPosition = useCallback((wall) => {
    const [x1, y1, x2, y2] = wall.points;
    
    // Calcular el punto medio del segmento
    const centerX = wall.x + (x1 + x2) / 2;
    const centerY = wall.y + (y1 + y2) / 2;
    
    // Ajustar a la cuadrícula más cercana
    const gridCenterX = Math.round(centerX / effectiveGridSize) * effectiveGridSize;
    const gridCenterY = Math.round(centerY / effectiveGridSize) * effectiveGridSize;
    
    return { x: gridCenterX, y: gridCenterY };
  }, [effectiveGridSize]);

  // Función para verificar si una puerta es visible para el jugador actual
  const isDoorVisibleToPlayer = useCallback((wall) => {
    const isPlayerMode = userType === 'player' || (userType === 'master' && playerViewMode);
    if (!isPlayerMode) return true;
    return isDoorVisible(wall, activeTokenId, tokens, playerVisionPolygons);
  }, [userType, playerViewMode, activeTokenId, tokens, playerVisionPolygons]);

  // Filtrar muros que deben mostrar iconos interactivos
  // Ahora siempre devuelve las puertas - la visibilidad se controla por la capa de sombras
  const getInteractiveDoors = useCallback(() => {
    if (activeLayer === 'fichas') {
      // En la capa fichas, mostrar iconos solo para muros de otras capas
      // Las puertas siempre se cargan pero la visibilidad se controla por sombras
      return walls.filter(wall =>
        (wall.layer && wall.layer !== 'fichas') &&
        (wall.door === 'closed' || wall.door === 'open')
      );
    }
    return [];
  }, [walls, activeLayer]);

  // Funciones movidas arriba después de effectiveGridSize
  const snapPoint = useCallback(
    (x, y) => {
      if (measureSnap === 'free') return [x, y];
      const cellX = snapCell(x, gridOffsetX);
      const cellY = snapCell(y, gridOffsetY);
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
    } else if (backgroundImage && backgroundImage.startsWith('data:image')) {
      // Para data URLs generados, usar dimensiones por defecto
      setImageSize({ width: 1500, height: 1000 });
    }
  }, [bg, backgroundImage]);

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

  const saveLines = useCallback((updater) => {
    setLines((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      undoStack.current.push(prev);
      redoStack.current = [];
      handleLinesChange(next);
      return next;
    });
  }, [handleLinesChange]);

  const updateWalls = (updater) => {
    setWalls((prev) =>
      typeof updater === 'function' ? updater(prev) : updater
    );
  };

  const saveWalls = useCallback((updater) => {
    setWalls((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      handleWallsChange(next);
      return next;
    });
  }, [handleWallsChange]);

  const updateTexts = useCallback((updater) => {
    setTexts((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      handleTextsChange(next);
      return next;
    });
  }, [handleTextsChange]);

  const undoLines = useCallback(() => {
    setLines((prev) => {
      if (undoStack.current.length === 0) return prev;
      redoStack.current.push(prev);
      const next = undoStack.current.pop();
      handleLinesChange(next);
      return next;
    });
  }, [handleLinesChange]);

  const redoLines = useCallback(() => {
    setLines((prev) => {
      if (redoStack.current.length === 0) return prev;
      undoStack.current.push(prev);
      const next = redoStack.current.pop();
      handleLinesChange(next);
      return next;
    });
  }, [handleLinesChange]);

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

  // Función para encontrar puntos de snap cercanos
  const findSnapPoint = (x, y, currentWallId, snapDistance = 15) => {
    for (const wall of walls) {
      if (wall.id === currentWallId) continue;
      
      // Obtener los puntos absolutos del muro
      const points = [
        { x: wall.x + wall.points[0], y: wall.y + wall.points[1] },
        { x: wall.x + wall.points[2], y: wall.y + wall.points[3] }
      ];
      
      // Verificar distancia a cada punto
      for (const point of points) {
        const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
        if (distance <= snapDistance) {
          return { x: point.x, y: point.y, snapped: true };
        }
      }
    }
    return { x, y, snapped: false };
  };

  const handleWallPointDrag = (id, index, e, save = false) => {
    const node = e.target;
    let x = node.x();
    let y = node.y();
    
    // Aplicar snap si estamos guardando (al soltar)
    if (save) {
      const snapResult = findSnapPoint(x, y, id);
      x = snapResult.x;
      y = snapResult.y;
      
      // Actualizar la posición visual del nodo si hubo snap
      if (snapResult.snapped) {
        node.x(x);
        node.y(y);
      }
    }
    
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

    const token = tokens.find((t) => t.id === id);

    // Validación de permisos para jugadores
    if (isPlayerView) {
      if (!token || token.controlledBy !== playerName) {
        // Si el jugador no puede mover este token, devolverlo a su posición original
        if (token) {
          node.position({
            x: token.x * effectiveGridSize + node.offsetX() + gridOffsetX,
            y: token.y * effectiveGridSize + node.offsetY() + gridOffsetY,
          });
          node.getLayer().batchDraw();
        }
        setDragShadow(null);
        return;
      }
    }

    const offX = node.offsetX();
    const offY = node.offsetY();
    const left = node.x() - offX;
    const top = node.y() - offY;
    const col = Math.round((left - gridOffsetX) / effectiveGridSize);
    const row = Math.round((top - gridOffsetY) / effectiveGridSize);
    
    // Verificar colisiones con muros antes de colocar el token
    if (isPositionBlocked(col, row)) {
      // Si la posición está bloqueada, devolver el token a su posición original
      if (token) {
        node.position({
          x: token.x * effectiveGridSize + offX + gridOffsetX,
          y: token.y * effectiveGridSize + offY + gridOffsetY,
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


    if (token && (token.x !== col || token.y !== row)) {
      const newTokens = tokens.map((t) =>
        t.id === id ? { ...t, x: col, y: row } : t
      );
      handleTokensChange(newTokens);
    }
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
    handleTokensChange(updated);
  };

  const handleRotateChange = (id, angle) => {
    const updated = tokens.map((t) => (t.id === id ? { ...t, angle } : t));
    handleTokensChange(updated);
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

  const handleOpenBars = (id) => {
    const token = tokens.find((t) => t.id === id);
    if (!token) return;
    if (!canSelectElement(token, 'token')) return;
    setBarsToken(id);
  };

  const handleCloseBars = () => {
    setBarsToken(null);
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
    handleTokensChange(reordered);
  };

  const moveTokenToBack = (id) => {
    const index = tokens.findIndex((t) => t.id === id);
    if (index === -1) return;
    const reordered = [...tokens];
    const [token] = reordered.splice(index, 1);
    reordered.unshift(token);
    handleTokensChange(reordered);
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
    if (activeTool === 'target' && e.evt.button === 0) {

      const pointer = stageRef.current.getPointerPosition();
      let relX = (pointer.x - groupPos.x) / (baseScale * zoom);
      let relY = (pointer.y - groupPos.y) / (baseScale * zoom);
      const cellX = Math.floor((relX - gridOffsetX) / effectiveGridSize);
      const cellY = Math.floor((relY - gridOffsetY) / effectiveGridSize);
      const clicked = tokens.find(t =>
        cellX >= t.x && cellX < t.x + (t.w || 1) &&
        cellY >= t.y && cellY < t.y + (t.h || 1)
      );
      if (clicked) {
        const sourceId = attackSourceIdRef.current;
        const isOwnToken = clicked.controlledBy === playerName;
        const canSelectAsSource = userType === 'master' || isOwnToken;
        const canSelectAsTarget = userType === 'master' ? clicked.id !== sourceId : (!isOwnToken && clicked.id !== sourceId);

        if (!sourceId) {
          if (canSelectAsSource && canSelectElement(clicked, 'token')) {
            setAttackSourceId(clicked.id);
            attackSourceIdRef.current = clicked.id;
            return;
          }
        } else if (attackTargetIdRef.current == null && canSelectAsTarget) {
          setAttackTargetId(clicked.id);
          attackTargetIdRef.current = clicked.id;
          const source = tokens.find(t => t.id === sourceId);
          if (source) {
            const sx = cellToPx(source.x + (source.w || 1) / 2, gridOffsetX);
            const sy = cellToPx(source.y + (source.h || 1) / 2, gridOffsetY);
            const tx = cellToPx(clicked.x + (clicked.w || 1) / 2, gridOffsetX);
            const ty = cellToPx(clicked.y + (clicked.h || 1) / 2, gridOffsetY);
            setAttackLine([sx, sy, tx, ty]);
          }
          setAttackReady(false);
        } else if (attackTargetIdRef.current === clicked.id) {
          if (!attackReady) setAttackReady(true);
        } else if (canSelectAsTarget) {
          setAttackTargetId(clicked.id);
          attackTargetIdRef.current = clicked.id;
          const source = tokens.find(t => t.id === sourceId);
          if (source) {
            const sx = cellToPx(source.x + (source.w || 1) / 2, gridOffsetX);
            const sy = cellToPx(source.y + (source.h || 1) / 2, gridOffsetY);
            const tx = cellToPx(clicked.x + (clicked.w || 1) / 2, gridOffsetX);
            const ty = cellToPx(clicked.y + (clicked.h || 1) / 2, gridOffsetY);
            setAttackLine([sx, sy, tx, ty]);
          }
        }
      }
      return;
    }
    if (activeTool === 'target' && e.evt.button === 1) {
      e.evt.preventDefault();
      setIsPanning(true);
      panStart.current = stageRef.current.getPointerPosition();
      panOrigin.current = { ...groupPos };
      return;
    }
    if (activeTool === 'select' && e.evt.button === 1) {
      e.evt.preventDefault();
      setIsPanning(true);
      panStart.current = stageRef.current.getPointerPosition();
      panOrigin.current = { ...groupPos };
    }

    // Iniciar selección múltiple con botón izquierdo en herramienta select
    if (activeTool === 'select' && e.evt.button === 0 && e.target === stageRef.current) {
      const pointer = stageRef.current.getPointerPosition();
      const relX = (pointer.x - groupPos.x) / (baseScale * zoom);
      const relY = (pointer.y - groupPos.y) / (baseScale * zoom);

      // Si no se mantiene Ctrl, limpiar selección anterior
      const isCtrlPressed = e?.evt?.ctrlKey || false;
      if (!isCtrlPressed) {
        clearAllSelections();
      }

      setIsSelecting(true);
      setSelectionStart({ x: relX, y: relY });
      setSelectionBox({ x: relX, y: relY, width: 0, height: 0 });
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
        createdBy: playerName, // Agregar información del creador
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
        difficulty: 1,
        baseDifficulty: 1,
        layer: activeLayer,
        createdBy: playerName, // Agregar información del creador
      });
    }
    if (activeTool === 'measure' && e.evt.button === 0) {
      const pointer = stageRef.current.getPointerPosition();
      const relX = (pointer.x - groupPos.x) / (baseScale * zoom);
      const relY = (pointer.y - groupPos.y) / (baseScale * zoom);
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
          { id, x: relX, y: relY, text: content, ...textOptions, bgColor, layer: activeLayer, createdBy: playerName },
        ]);
        setSelectedTextId(id);
      }
    }
  };

  // Actualiza la acción activa según la herramienta
  const handleMouseMove = (e) => {
    const pointer = stageRef.current.getPointerPosition();
    let relX = (pointer.x - groupPos.x) / (baseScale * zoom);
    let relY = (pointer.y - groupPos.y) / (baseScale * zoom);

    // Actualizar posición global del mouse para el sistema de pegado
    if (e?.evt) {
      setMousePosition({ x: e.evt.clientX, y: e.evt.clientY });
    }

    // Actualizar cuadro de selección
    if (isSelecting) {
      setSelectionBox({
        x: selectionStart.x,
        y: selectionStart.y,
        width: relX - selectionStart.x,
        height: relY - selectionStart.y
      });
      return;
    }

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
    if (activeTool === 'target' && attackSourceId && !attackTargetId) {
      return;
    }
    if (measureLine) {
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
    // Finalizar selección múltiple
    if (isSelecting) {
      // Filtrar elementos por capa actual
      const filteredTokens = tokens.filter(token => token.layer === activeLayer);
      const filteredLines = lines.filter(line => line.layer === activeLayer);
      const filteredWalls = walls.filter(wall => wall.layer === activeLayer);
      const filteredTexts = texts.filter(text => text.layer === activeLayer);

      // Encontrar elementos dentro del cuadro de selección y validar permisos
      const selectedTokensInBox = filteredTokens.filter(token =>
        isElementInSelectionBox(token, selectionBox, 'token') && canSelectElement(token, 'token')
      );
      const selectedLinesInBox = filteredLines.filter(line =>
        isElementInSelectionBox(line, selectionBox, 'line') && canSelectElement(line, 'line')
      );
      const selectedWallsInBox = filteredWalls.filter(wall =>
        isElementInSelectionBox(wall, selectionBox, 'wall') && canSelectElement(wall, 'wall')
      );
      const selectedTextsInBox = filteredTexts.filter(text =>
        isElementInSelectionBox(text, selectionBox, 'text') && canSelectElement(text, 'text')
      );

      // Actualizar selecciones múltiples
      setSelectedTokens(prev => [...prev, ...selectedTokensInBox.map(t => t.id)]);
      setSelectedLines(prev => [...prev, ...selectedLinesInBox.map(l => l.id)]);
      setSelectedWalls(prev => [...prev, ...selectedWallsInBox.map(w => w.id)]);
      setSelectedTexts(prev => [...prev, ...selectedTextsInBox.map(t => t.id)]);

      setIsSelecting(false);
      setSelectionBox({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

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
      // Solo limpiar selecciones si no se está manteniendo Ctrl
      const isCtrlPressed = e?.evt?.ctrlKey || false;
      if (!isCtrlPressed) {
        setSelectedId(null);
        setSelectedLineId(null);
        setSelectedWallId(null);
        setSelectedTextId(null);
        clearMultiSelection();
      }
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
      const [sx1, sy1] = snapPoint(x1, y1);
      const [sx2, sy2] = snapPoint(x2, y2);
      const sdx = sx2 - sx1;
      const sdy = sy2 - sy1;
      const cellDx = Math.abs(
        snapCell(sx2, gridOffsetX) - snapCell(sx1, gridOffsetX)
      );
      const cellDy = Math.abs(
        snapCell(sy2, gridOffsetY) - snapCell(sy1, gridOffsetY)
      );
      let distance = Math.max(cellDx, cellDy);
      const len = Math.hypot(sdx, sdy);
      const angle = Math.atan2(sdy, sdx);
      let shape;
      if (measureShape === 'square') {
        distance = Math.max(cellDx, cellDy);
        shape = (
          <Rect
            x={Math.min(sx1, sx2)}
            y={Math.min(sy1, sy2)}
            width={Math.abs(sdx)}
            height={Math.abs(sdy)}
            stroke="cyan"
            strokeWidth={2}
            dash={[4, 4]}
          />
        );
      } else if (measureShape === 'circle') {
        distance = Math.max(cellDx, cellDy);
        shape = (
          <Circle
            x={sx1}
            y={sy1}
            radius={len}
            stroke="cyan"
            strokeWidth={2}
            dash={[4, 4]}
          />
        );
      } else if (measureShape === 'cone') {
        const half = Math.PI / 6;
        const p2x = sx1 + len * Math.cos(angle + half);
        const p2y = sy1 + len * Math.sin(angle + half);
        const p3x = sx1 + len * Math.cos(angle - half);
        const p3y = sy1 + len * Math.sin(angle - half);
        shape = (
          <Line
            points={[sx1, sy1, p2x, p2y, p3x, p3y]}
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
              sx1 + dxp,
              sy1 + dyp,
              sx2 + dxp,
              sy2 + dyp,
              sx2 - dxp,
              sy2 - dyp,
              sx1 - dxp,
              sy1 - dyp,
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
            points={[sx1, sy1, sx2, sy2]}
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
            x={sx2 + 20}
            y={sy2 + 20}
            text={`${Math.round(distance)} casillas`}
            fontSize={16}
            fill="#fff"
          />
        </>
      );
    })();

  const attackElement =
    attackLine &&
    (() => {
      const [x1, y1, x2, y2] = attackLine;
      const cellDx = Math.abs(
        pxToCell(x2, gridOffsetX) - pxToCell(x1, gridOffsetX)
      );
      const cellDy = Math.abs(
        pxToCell(y2, gridOffsetY) - pxToCell(y1, gridOffsetY)
      );
      const distance = Math.max(cellDx, cellDy);
      return (
        <>
          <Line points={attackLine} stroke="red" strokeWidth={2} />
          <Text x={x2 + 20} y={y2 + 20} text={`${distance} casillas`} fontSize={16} fill="red" />
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

      // Copiar elementos seleccionados
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const clipboardData = {
          tokens: selectedTokens.length > 0 ? tokens.filter(t => selectedTokens.includes(t.id)) :
                  selectedId ? [tokens.find(t => t.id === selectedId)] : [],
          lines: selectedLines.length > 0 ? lines.filter(l => selectedLines.includes(l.id)) :
                 selectedLineId ? [lines.find(l => l.id === selectedLineId)] : [],
          walls: selectedWalls.length > 0 ? walls.filter(w => selectedWalls.includes(w.id)) :
                 selectedWallId ? [walls.find(w => w.id === selectedWallId)] : [],
          texts: selectedTexts.length > 0 ? texts.filter(t => selectedTexts.includes(t.id)) :
                 selectedTextId ? [texts.find(t => t.id === selectedTextId)] : []
        };

        // Solo copiar si hay elementos seleccionados
        if (clipboardData.tokens.length > 0 || clipboardData.lines.length > 0 ||
            clipboardData.walls.length > 0 || clipboardData.texts.length > 0) {
          setClipboard(clipboardData);
        }
        return;
      }

      // Seleccionar todos los elementos de la capa actual (con validación de permisos)
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const filteredTokens = tokens.filter(token =>
          token.layer === activeLayer && canSelectElement(token, 'token')
        );
        const filteredLines = lines.filter(line =>
          line.layer === activeLayer && canSelectElement(line, 'line')
        );
        const filteredWalls = walls.filter(wall =>
          wall.layer === activeLayer && canSelectElement(wall, 'wall')
        );
        const filteredTexts = texts.filter(text =>
          text.layer === activeLayer && canSelectElement(text, 'text')
        );

        setSelectedTokens(filteredTokens.map(t => t.id));
        setSelectedLines(filteredLines.map(l => l.id));
        setSelectedWalls(filteredWalls.map(w => w.id));
        setSelectedTexts(filteredTexts.map(t => t.id));

        // Limpiar selecciones individuales
        setSelectedId(null);
        setSelectedLineId(null);
        setSelectedWallId(null);
        setSelectedTextId(null);
        return;
      }

      // Pegar elementos del clipboard
      if (e.ctrlKey && e.key.toLowerCase() === 'v' && clipboard) {
        e.preventDefault();

        // Obtener posición inteligente de pegado
        const pastePosition = getSmartPastePosition();
        const pasteGridPos = mapToGridCoordinates(pastePosition.x, pastePosition.y);

        // Calcular centros de cada tipo de elemento para posicionamiento relativo
        const tokensCenter = calculateElementsCenter(clipboard.tokens, 'tokens');
        const linesCenter = calculateElementsCenter(clipboard.lines, 'lines');
        const wallsCenter = calculateElementsCenter(clipboard.walls, 'walls');
        const textsCenter = calculateElementsCenter(clipboard.texts, 'texts');

        // Pegar tokens
        if (clipboard.tokens.length > 0) {
          const newTokens = clipboard.tokens.map(token => {
            // Calcular offset relativo al centro del grupo
            const relativeX = token.x - tokensCenter.x;
            const relativeY = token.y - tokensCenter.y;

            // Aplicar offset al punto de pegado y asegurar límites
            const finalPos = clampToMapBounds(
              pasteGridPos.x + relativeX,
              pasteGridPos.y + relativeY
            );

            const newToken = createToken({
              ...token,
              id: Date.now() + Math.random(),
              x: finalPos.x,
              y: finalPos.y,
              layer: activeLayer,
            });
            const stored = localStorage.getItem('tokenSheets');
            if (stored) {
              const sheets = JSON.parse(stored);
              const sheet = sheets[token.tokenSheetId];
              if (sheet) {
                const copy = JSON.parse(JSON.stringify(sheet));
                copy.id = newToken.tokenSheetId;
                sheets[newToken.tokenSheetId] = copy;
                localStorage.setItem('tokenSheets', JSON.stringify(sheets));
                window.dispatchEvent(
                  new CustomEvent('tokenSheetSaved', { detail: copy })
                );
              }
            }
            return newToken;
          });
          handleTokensChange([...tokens, ...newTokens]);
        }

        // Pegar líneas
        if (clipboard.lines.length > 0) {
          const newLines = clipboard.lines.map(line => {
            // Calcular offset relativo al centro del grupo
            const relativeX = line.x - (linesCenter.x * effectiveGridSize);
            const relativeY = line.y - (linesCenter.y * effectiveGridSize);

            // Aplicar offset al punto de pegado
            const finalX = pastePosition.x + relativeX;
            const finalY = pastePosition.y + relativeY;

            return {
              ...line,
              id: Date.now() + Math.random(),
              x: finalX,
              y: finalY,
              layer: activeLayer
            };
          });
          saveLines([...lines, ...newLines]);
        }

        // Pegar muros
        if (clipboard.walls.length > 0) {
          const newWalls = clipboard.walls.map(wall => {
            // Calcular el centro real del muro original
            const [x1, y1, x2, y2] = wall.points;
            const wallCenterX = wall.x + (x1 + x2) / 2;
            const wallCenterY = wall.y + (y1 + y2) / 2;

            // Calcular offset relativo al centro del grupo (wallsCenter ya está en pixels)
            const relativeX = wallCenterX - (wallsCenter.x * effectiveGridSize);
            const relativeY = wallCenterY - (wallsCenter.y * effectiveGridSize);

            // Calcular la nueva posición del centro
            const newCenterX = pastePosition.x + relativeX;
            const newCenterY = pastePosition.y + relativeY;

            // Calcular la nueva posición base del muro
            const finalX = newCenterX - (x1 + x2) / 2;
            const finalY = newCenterY - (y1 + y2) / 2;

            return {
              ...wall,
              id: Date.now() + Math.random(),
              x: finalX,
              y: finalY,
              layer: activeLayer
            };
          });
          saveWalls([...walls, ...newWalls]);
        }

        // Pegar textos
        if (clipboard.texts.length > 0) {
          const newTexts = clipboard.texts.map(text => {
            // Calcular offset relativo al centro del grupo
            const relativeX = text.x - (textsCenter.x * effectiveGridSize);
            const relativeY = text.y - (textsCenter.y * effectiveGridSize);

            // Aplicar offset al punto de pegado
            const finalX = pastePosition.x + relativeX;
            const finalY = pastePosition.y + relativeY;

            return {
              ...text,
              id: Date.now() + Math.random(),
              x: finalX,
              y: finalY,
              layer: activeLayer
            };
          });
          updateTexts([...texts, ...newTexts]);
        }
        return;
      }

      // Cancelar mirilla o deseleccionar con Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeTool === 'target' && (attackSourceId || attackTargetId)) {
          setAttackTargetId(null);
          setAttackLine(null);
          setAttackResult(null);
          setAttackReady(false);
        } else if (attackSourceId || attackTargetId) {
          setAttackSourceId(null);
          setAttackTargetId(null);
          setAttackLine(null);
          setAttackResult(null);
        } else {
          clearAllSelections();
        }
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

      // Eliminar elementos seleccionados (múltiples o individuales)
      if (e.key.toLowerCase() === 'delete') {
        e.preventDefault();

        // Eliminar selección múltiple
        if (selectedTokens.length > 0) {
          handleTokensChange(tokens.filter(t => !selectedTokens.includes(t.id)));
          setSelectedTokens([]);
        }
        if (selectedLines.length > 0) {
          saveLines(lines.filter(l => !selectedLines.includes(l.id)));
          setSelectedLines([]);
        }
        if (selectedWalls.length > 0) {
          saveWalls(walls.filter(w => !selectedWalls.includes(w.id)));
          setSelectedWalls([]);
        }
        if (selectedTexts.length > 0) {
          updateTexts(texts.filter(t => !selectedTexts.includes(t.id)));
          setSelectedTexts([]);
        }

        // Eliminar selección individual si no hay selección múltiple
        if (selectedLineId != null && selectedLines.length === 0) {
          saveLines(lines.filter((ln) => ln.id !== selectedLineId));
          setSelectedLineId(null);
        }
        if (selectedWallId != null && selectedWalls.length === 0) {
          saveWalls(walls.filter((w) => w.id !== selectedWallId));
          setSelectedWallId(null);
        }
        if (selectedTextId != null && selectedTexts.length === 0) {
          updateTexts(texts.filter((t) => t.id !== selectedTextId));
          setSelectedTextId(null);
        }
        if (selectedId != null && selectedTokens.length === 0) {
          handleTokensChange(tokens.filter((t) => t.id !== selectedId));
          setSelectedId(null);
        }
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

      // Mover múltiples tokens seleccionados
      if (selectedTokens.length > 0) {
        let deltaX = 0, deltaY = 0;

        switch (e.key.toLowerCase()) {
          case 'w':
            deltaY = -1;
            break;
          case 's':
            deltaY = 1;
            break;
          case 'a':
            deltaX = -1;
            break;
          case 'd':
            deltaX = 1;
            break;
          case 'r': {
            const delta = e.shiftKey ? -90 : 90;
            const rotated = tokens.map((t) => {
              if (selectedTokens.includes(t.id)) {
                // Validación de permisos para jugadores
                if (isPlayerView && t.controlledBy !== playerName) {
                  return t; // No permitir rotación si no controla el token
                }
                const updatedAngle = ((t.angle || 0) + delta + 360) % 360;
                return { ...t, angle: updatedAngle };
              }
              return t;
            });
            handleTokensChange(rotated);
            return;
          }
          default:
            break;
        }

        if (deltaX !== 0 || deltaY !== 0) {
          const updated = tokens.map((t) => {
            if (selectedTokens.includes(t.id)) {
              // Validación de permisos para jugadores
              if (isPlayerView && t.controlledBy !== playerName) {
                return t; // No permitir movimiento si no controla el token
              }

              const newX = Math.max(0, Math.min(mapWidth - 1, t.x + deltaX));
              const newY = Math.max(0, Math.min(mapHeight - 1, t.y + deltaY));

              // Verificar colisiones con muros
              if (!isPositionBlocked(newX, newY)) {
                return { ...t, x: newX, y: newY };
              }
            }
            return t;
          });
          handleTokensChange(updated);
        }
        return;
      }

      // Mover token individual seleccionado
      if (selectedId == null) return;
      const index = tokens.findIndex((t) => t.id === selectedId);
      if (index === -1) return;

      // Validación de permisos para jugadores
      if (isPlayerView && tokens[index].controlledBy !== playerName) {
        return; // No permitir movimiento si no controla el token
      }

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
        case 'r': {
          // Validación de permisos para jugadores ya hecha arriba
          const delta = e.shiftKey ? -90 : 90;
          const updatedAngle = ((tokens[index].angle || 0) + delta + 360) % 360;
          const rotated = tokens.map((t) =>
            t.id === selectedId ? { ...t, angle: updatedAngle } : t
          );
          handleTokensChange(rotated);
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
      handleTokensChange(updated);
    },
    [
      selectedId,
      tokens,
      handleTokensChange,
      mapWidth,
      mapHeight,
      selectedLineId,
      lines,
      walls,
      selectedTextId,
      selectedWallId,
      texts,
      isPositionBlocked,
      selectedTokens,
      selectedLines,
      selectedWalls,
      selectedTexts,
      clipboard,
      groupPos,
      baseScale,
      zoom,
      effectiveGridSize,
      activeLayer,
      saveLines,
      saveWalls,
      updateTexts,
      undoLines,
      redoLines,
      getSmartPastePosition,
      mapToGridCoordinates,
      calculateElementsCenter,
      clampToMapBounds,
      containerSize,
      mousePosition,
    ]
  );

  const handleKeyUp = useCallback(
    (e) => {
      if (!syncManager) return;
      if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
        syncManager.saveToFirebase('tokens', tokens);
      }
    },
    [syncManager, tokens]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [handleKeyUp]);

  // Listener global para tracking de posición del mouse
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

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
        
        const newToken = createToken({
          id: Date.now(),
          x,
          y,
          w: 1,
          h: 1,
          angle: 0,
          url: item.url,
          name: item.name || '',
          enemyId: item.enemyId || null,
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
        });
        if (item.tokenSheetId) {
          const stored = localStorage.getItem('tokenSheets');
          if (stored) {
            const sheets = JSON.parse(stored);
            const sheet = sheets[item.tokenSheetId];
            if (sheet) {
              const copy = JSON.parse(JSON.stringify(sheet));
              copy.id = newToken.tokenSheetId;
              sheets[newToken.tokenSheetId] = copy;
              localStorage.setItem('tokenSheets', JSON.stringify(sheets));
              window.dispatchEvent(
                new CustomEvent('tokenSheetSaved', { detail: copy })
              );
            }
          }
        }
        handleTokensChange([...tokens, newToken]);
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
                    auraOpacity={(token.auraOpacity || 0.25) * (token.crossLayerOpacity || 1)}
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
                  opacity={(token.opacity ?? 1) * (token.crossLayerOpacity ?? 1) * getTokenOpacity(token)}
                  tintColor={token.tintColor}
                  tintOpacity={token.tintOpacity}
                  showAura={false}
                  tokenSheetId={token.tokenSheetId}
                  auraRadius={token.auraRadius}
                  auraShape={token.auraShape}
                  auraColor={token.auraColor}
                  auraOpacity={token.auraOpacity}
                  isAttacker={activeTool === 'target' && token.id === attackSourceId}
                  isTarget={activeTool === 'target' && token.id === attackTargetId}
                  selected={token.id === selectedId || selectedTokens.includes(token.id)}
                  onDragEnd={handleDragEnd}
                  onDragStart={handleDragStart}
                  onClick={(e) => {
                    if (activeTool === 'target') return; // Evitar selección durante la mirilla

                    // Validar permisos de selección
                    if (!canSelectElement(token, 'token')) {
                      return; // Bloquear selección si no tiene permisos
                    }

                    const isCtrlPressed = e?.evt?.ctrlKey || false;
                    if (isCtrlPressed) {
                      // Selección múltiple con Ctrl
                      if (selectedTokens.includes(token.id)) {
                        setSelectedTokens(prev => prev.filter(id => id !== token.id));
                      } else {
                        setSelectedTokens(prev => [...prev, token.id]);
                      }
                    } else {
                      // Selección individual
                      setSelectedId(token.id);
                      setSelectedLineId(null);
                      setSelectedTextId(null);
                      clearMultiSelection();
                    }
                  }}
                  onSettings={handleOpenSettings}
                  onStates={handleOpenEstados}
                  onBars={handleOpenBars}
                  onTransformEnd={handleSizeChange}
                  onRotate={handleRotateChange}
                  onHoverChange={(h) => setHoveredId(h ? token.id : null)}
                  estados={token.estados || []}
                  draggable={
                    activeTool === 'select' && canSelectElement(token, 'token')
                  }
                  listening={activeTool === 'select' || activeTool === 'target'}
                  activeTool={activeTool}
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
                  stroke={selectedLines.includes(ln.id) ? '#0066ff' : ln.color}
                  strokeWidth={selectedLines.includes(ln.id) ? ln.width + 2 : ln.width}
                  lineCap="round"
                  lineJoin="round"
                  opacity={ln.crossLayerOpacity || 1}
                  draggable={
                    activeTool === 'select' &&
                    !ln.isBackground &&
                    canSelectElement(ln, 'line')
                  }
                  listening={!ln.isBackground}
                  onClick={(e) => {
                    if (!ln.isBackground) {
                      // Validar permisos de selección
                      if (!canSelectElement(ln, 'line')) {
                        return; // Bloquear selección si no tiene permisos
                      }

                      const isCtrlPressed = e?.evt?.ctrlKey || false;
                      if (isCtrlPressed) {
                        // Selección múltiple con Ctrl
                        if (selectedLines.includes(ln.id)) {
                          setSelectedLines(prev => prev.filter(id => id !== ln.id));
                        } else {
                          setSelectedLines(prev => [...prev, ln.id]);
                        }
                      } else {
                        // Selección individual
                        setSelectedLineId(ln.id);
                        setSelectedId(null);
                        setSelectedTextId(null);
                        clearMultiSelection();
                      }
                    }
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
                  draggable={
                    activeTool === 'select' && canSelectElement(t, 'text')
                  }
                  onDragEnd={(e) => handleTextDragEnd(t.id, e)}
                  onTransformEnd={(e) => handleTextTransformEnd(t.id, e)}
                  onClick={(e) => {
                    // Validar permisos de selección
                    if (!canSelectElement(t, 'text')) {
                      return; // Bloquear selección si no tiene permisos
                    }

                    const isCtrlPressed = e?.evt?.ctrlKey || false;
                    if (isCtrlPressed) {
                      // Selección múltiple con Ctrl
                      if (selectedTexts.includes(t.id)) {
                        setSelectedTexts(prev => prev.filter(id => id !== t.id));
                      } else {
                        setSelectedTexts(prev => [...prev, t.id]);
                      }
                    } else {
                      // Selección individual
                      setSelectedTextId(t.id);
                      setSelectedId(null);
                      setSelectedLineId(null);
                      clearMultiSelection();
                    }
                  }}
                  onDblClick={() => handleTextEdit(t.id)}
                >
                  <Tag
                    fill={t.bgColor}
                    stroke={selectedTexts.includes(t.id) ? '#0066ff' : undefined}
                    strokeWidth={selectedTexts.includes(t.id) ? 2 : 0}
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
                    stroke={selectedWalls.includes(wl.id) ? '#0066ff' : wl.color}
                    strokeWidth={selectedWalls.includes(wl.id) ? wl.width + 2 : wl.width}
                    lineCap="round"
                    lineJoin="round"
                    opacity={wl.crossLayerOpacity || 1}
                    draggable={
                      activeTool === 'select' &&
                      !wl.isBackground &&
                      canSelectElement(wl, 'wall')
                    }
                    listening={!wl.isBackground}
                    onClick={(e) => {
                      if (!wl.isBackground) {
                        // Validar permisos de selección
                        if (!canSelectElement(wl, 'wall')) {
                          return; // Bloquear selección si no tiene permisos
                        }

                        const isCtrlPressed = e?.evt?.ctrlKey || false;
                        if (isCtrlPressed) {
                          // Selección múltiple con Ctrl
                          if (selectedWalls.includes(wl.id)) {
                            setSelectedWalls(prev => prev.filter(id => id !== wl.id));
                          } else {
                            setSelectedWalls(prev => [...prev, wl.id]);
                          }
                        } else {
                          // Selección individual
                          setSelectedWallId(wl.id);
                          setSelectedId(null);
                          setSelectedLineId(null);
                          setSelectedTextId(null);
                          clearMultiSelection();
                        }
                      }
                    }}
                    onDragEnd={(e) => handleWallDragEnd(wl.id, e)}
                  />
                  <Circle
                    x={wl.x + wl.points[0]}
                    y={wl.y + wl.points[1]}
                    radius={6}
                    fill="#ff6600"
                    opacity={wl.crossLayerOpacity || 1}
                  draggable={
                    activeTool === 'select' &&
                    !wl.isBackground &&
                    canSelectElement(wl, 'wall')
                  }
                    listening={!wl.isBackground}
                    onMouseDown={() => {
                      if (!wl.isBackground) {
                        setSelectedWallId(wl.id);
                        setSelectedId(null);
                        setSelectedLineId(null);
                        setSelectedTextId(null);
                      }
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
                    rotation={normalizeWallRotation(
                      wl.points[0],
                      wl.points[1],
                      wl.points[2],
                      wl.points[3]
                    )}
                    onClick={() => setDoorMenuWallId(wl.id)}
                    onTap={() => setDoorMenuWallId(wl.id)}
                    onMouseEnter={() =>
                      (stageRef.current.container().style.cursor = 'pointer')
                    }
                    onMouseLeave={() =>
                      (stageRef.current.container().style.cursor =
                        activeTool === 'wall' ? 'crosshair' : 'default')
                    }
                  >
                    <Rect
                      width={32}
                      height={32}
                      offsetX={16}
                      offsetY={16}
                      fill="transparent"
                    />
                    {DOOR_PATHS[wl.door || 'closed'].map((d, i) => (
                      <Path
                        key={i}
                        data={d}
                        stroke={wl.color}
                        strokeWidth={1}
                        lineCap="round"
                        lineJoin="round"
                        hitStrokeWidth={10}
                      />
                    ))}
                  </Group>
                  <Circle
                    x={wl.x + wl.points[2]}
                    y={wl.y + wl.points[3]}
                    radius={6}
                    fill="#ff6600"
                  draggable={
                    activeTool === 'select' && canSelectElement(wl, 'wall')
                  }
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
                  (activeTool === 'select' || activeTool === 'target') &&
                  hoveredId === token.id &&
                  canSeeBars(token)
                }
              />
            ))}
          </Layer>

          {attackElement && (
            <Layer listening>
              <Group
                x={groupPos.x}
                y={groupPos.y}
                scaleX={groupScale}
                scaleY={groupScale}
              >
                {attackElement}
              </Group>
            </Layer>
          )}

          {/* Capa de iluminación */}
          <Layer listening={false}>
            <Group
              x={groupPos.x}
              y={groupPos.y}
              scaleX={groupScale}
              scaleY={groupScale}
            >
              {/* Renderizar luz básica para todos los tokens con luz */}
              {tokens.filter(token => 
                token.light && 
                token.light.enabled && 
                token.light.radius && 
                token.light.radius > 0
              ).map(token => {
                const centerX = (token.x + token.w / 2) * effectiveGridSize;
                const centerY = (token.y + token.h / 2) * effectiveGridSize;
                const radius = token.light.radius * effectiveGridSize;
                const color = token.light.color || '#ffa500';
                const opacity = Math.max(0.2, token.light.opacity || 0.4);
                
                // Verificar si hay polígono de visibilidad para este token
                const lightData = lightPolygons[token.id];
                const hasWallBlocking = lightData && lightData.polygon && lightData.polygon.length >= 3;
                
                if (hasWallBlocking) {
                  // Si hay muros, usar el polígono de visibilidad
                  const points = [];
                  lightData.polygon.forEach(point => {
                    points.push(point.x, point.y);
                  });
                  
                  return (
                    <Group key={`wall-blocked-light-${token.id}`}>
                      {/* Luz limitada por muros usando polígono de visibilidad */}
                      <Line
                        points={points}
                        closed={true}
                        fillRadialGradientStartPoint={{ x: centerX, y: centerY }}
                        fillRadialGradientEndPoint={{ x: centerX, y: centerY }}
                        fillRadialGradientStartRadius={0}
                        fillRadialGradientEndRadius={radius}
                        fillRadialGradientColorStops={[
                          0, hexToRgba(color, opacity * 0.8),
                          0.3, hexToRgba(color, opacity * 0.6),
                          0.6, hexToRgba(color, opacity * 0.3),
                          0.85, hexToRgba(color, opacity * 0.1),
                          1, hexToRgba(color, 0)
                        ]}
                        listening={false}
                        perfectDrawEnabled={false}
                      />
                    </Group>
                  );
                } else {
                  // Si no hay muros o no se calculó el polígono, usar círculo simple
                  return (
                    <Group key={`simple-light-${token.id}`}>
                      <Circle
                        x={centerX}
                        y={centerY}
                        radius={radius}
                        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                        fillRadialGradientStartRadius={0}
                        fillRadialGradientEndRadius={radius}
                        fillRadialGradientColorStops={[
                          0, hexToRgba(color, opacity * 0.8),
                          0.3, hexToRgba(color, opacity * 0.6),
                          0.6, hexToRgba(color, opacity * 0.3),
                          0.85, hexToRgba(color, opacity * 0.1),
                          1, hexToRgba(color, 0)
                        ]}
                        listening={false}
                      />
                    </Group>
                  );
                }
              })}
            </Group>
          </Layer>

          {/* Capa de oscuridad - solo si está habilitada */}
          {enableDarkness && (
            <Layer listening={false}>
              <Group
                x={groupPos.x}
                y={groupPos.y}
                scaleX={groupScale}
                scaleY={groupScale}
              >
                {/* Rectángulo negro que cubre todo el mapa */}
                <Rect
                  x={0}
                  y={0}
                  width={imageSize.width || 3000}
                  height={imageSize.height || 3000}
                  fill={`rgba(0, 0, 0, ${darknessOpacity})`}
                  listening={false}
                />

                {/* Polígono combinado que revela las áreas iluminadas - solo si hay luz */}
                {combinedLight.length >= 3 && (
                  <Line
                    points={combinedLight.flatMap(point => [point.x, point.y])}
                    closed={true}
                    fill="rgba(0, 0, 0, 1)"
                    globalCompositeOperation="destination-out"
                    listening={false}
                    perfectDrawEnabled={false}
                  />
                )}
              </Group>
            </Layer>
          )}

          {/* Capa de visión - mostrar polígonos de visión de tokens (solo en modo master) */}
          {showVisionPolygons && !playerViewMode && userType === 'master' && (
            <Layer listening={false}>
              <Group
                x={groupPos.x}
                y={groupPos.y}
                scaleX={groupScale}
                scaleY={groupScale}
              >
                {/* Renderizar polígonos de visión para tokens con visión habilitada */}
                {Object.values(playerVisionPolygons).map(visionData => {
                  if (!visionData.polygon || visionData.polygon.length < 3) return null;

                  const token = tokens.find(t => t.id === visionData.tokenId);
                  if (!token) return null;

                  return (
                    <Line
                      key={`vision-${visionData.tokenId}`}
                      points={visionData.polygon.flatMap(point => [point.x, point.y])}
                      closed={true}
                      fill="rgba(255, 255, 0, 0.1)"
                      stroke="rgba(255, 255, 0, 0.3)"
                      strokeWidth={2}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  );
                })}
              </Group>
            </Layer>
          )}

          {/* Capa de puertas interactivas - renderizada antes de las sombras para que sean ocluidas */}
          <Layer listening>
            <Group
              x={groupPos.x}
              y={groupPos.y}
              scaleX={groupScale}
              scaleY={groupScale}
            >
              {getInteractiveDoors().map((wall) => (
                <InteractiveDoor
                  key={`door-icon-${wall.id}`}
                  wall={wall}
                  effectiveGridSize={effectiveGridSize}
                  onToggle={toggleDoor}
                />
              ))}
            </Group>
          </Layer>

          {/* Capa de sombras para bloquear visión - renderizada encima de todos los tokens y puertas */}
          {(() => {
            // Determinar si estamos en modo jugador real o simulado
            const isPlayerMode = userType === 'player' || (userType === 'master' && playerViewMode);
            if (!isPlayerMode || !activeTokenId) {
              return null;
            }

            const playerToken = tokens.find(token => token.id === activeTokenId);
            if (!playerToken) {
              return null;
            }

            const visionEnabled = playerToken.vision?.enabled !== false;
            if (!visionEnabled) {
              return (
                <Layer listening={false}>
                  <Group
                    x={groupPos.x}
                    y={groupPos.y}
                    scaleX={groupScale}
                    scaleY={groupScale}
                  >
                    {/* Oscuridad completa si no tiene visión */}
                    <Rect
                      x={0}
                      y={0}
                      width={imageSize.width || 3000}
                      height={imageSize.height || 3000}
                      fill="rgba(0, 0, 0, 1)"
                      listening={false}
                    />
                  </Group>
                </Layer>
              );
            }

            // Obtener el polígono de visión del jugador
            const playerVisionData = playerVisionPolygons[playerToken.id];
            if (!playerVisionData || !playerVisionData.polygon || playerVisionData.polygon.length < 3) {
              return null;
            }

            return (
              <Layer listening={false}>
                <Group
                  x={groupPos.x}
                  y={groupPos.y}
                  scaleX={groupScale}
                  scaleY={groupScale}
                >
                  {/* Rectángulo negro que cubre todo el mapa - opacidad completa para oclusión total */}
                  <Rect
                    x={0}
                    y={0}
                    width={imageSize.width || 3000}
                    height={imageSize.height || 3000}
                    fill="rgba(0, 0, 0, 1)"
                    listening={false}
                  />

                  {/* Polígono de visión del jugador que revela las áreas visibles */}
                  <Line
                    points={playerVisionData.polygon.flatMap(point => [point.x, point.y])}
                    closed={true}
                    fill="rgba(0, 0, 0, 1)"
                    globalCompositeOperation="destination-out"
                    listening={false}
                    perfectDrawEnabled={false}
                  />
                </Group>
              </Layer>
            );
          })()}





          {/* Cuadro de selección múltiple */}
          {isSelecting && (
            <Layer listening={false}>
              <Group
                x={groupPos.x}
                y={groupPos.y}
                scaleX={groupScale}
                scaleY={groupScale}
              >
                <Rect
                  x={selectionBox.x}
                  y={selectionBox.y}
                  width={selectionBox.width}
                  height={selectionBox.height}
                  stroke="#0066ff"
                  strokeWidth={2}
                  dash={[5, 5]}
                  fill="rgba(0, 102, 255, 0.1)"
                  listening={false}
                />
              </Group>
            </Layer>
          )}
        </Stage>
      </div>
      <div className="absolute inset-0 pointer-events-none z-40">
        {(() => {
          const groups = damagePopups.reduce((acc, p) => {
            acc[p.tokenId] = acc[p.tokenId] || [];
            acc[p.tokenId].push(p);
            return acc;
          }, {});
          return damagePopups.map((p) => {
            // Calcular posición en tiempo real basándose en la posición actual del token
            const token = tokens.find(t => t.id === p.tokenId);
            if (!token || !stageRef.current || !containerRef.current) {
              return null; // No renderizar si no se encuentra el token
            }

            try {
              // Usar valores actuales de transformación
              const currentBaseScale = baseScaleRef.current;
              const currentZoom = zoomRef.current;
              const currentGroupPos = groupPosRef.current;

              // Calcular posición actual del token
              const tokenPixelX = cellToPx(token.x, gridOffsetX);
              const tokenPixelY = cellToPx(token.y, gridOffsetY);
              const tokenWidth = (token.w || 1) * effectiveGridSize;
              const tokenHeight = (token.h || 1) * effectiveGridSize;

              // Centro del token en coordenadas del mundo
              const centerX = tokenPixelX + tokenWidth / 2;
              const centerY = tokenPixelY + tokenHeight / 2;

              // Transformar a coordenadas de pantalla
              const groupScale = currentBaseScale * currentZoom;
              const screenX = centerX * groupScale + currentGroupPos.x;
              const screenY = centerY * groupScale + currentGroupPos.y;

              // Posición relativa al contenedor
              const stageRect = stageRef.current.container().getBoundingClientRect();
              const containerRect = containerRef.current.getBoundingClientRect();

              const x = screenX + stageRect.left - containerRect.left;
              const y = screenY + stageRect.top - containerRect.top;

              const colors = {
                postura: '#34d399',
                vida: '#f87171',
                armadura: '#9ca3af',
                ingenio: '#60a5fa',
                counter: '#facc15',
                perfect: '#60a5fa',
              };
              const color = p.type ? colors[p.type] || '#fff' : colors[p.stat] || '#fff';
              const text =
                p.type === 'counter'
                  ? '¡Contraataque!'
                  : p.type === 'perfect'
                  ? '¡Bloqueo perfecto!'
                  : `-${p.value}`;
              const group = groups[p.tokenId] || [];
              const index = group.findIndex((g) => g.id === p.id);
              const offset = (index - (group.length - 1) / 2) * 30;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -20 }}
                  transition={{ duration: 7 }}
                  style={{
                    position: 'absolute',
                    left: x + offset,
                    top: y,
                    transform: 'translate(-50%, -100%)',
                    color,
                    fontSize: 20,
                    fontWeight: 'bold',
                    textShadow: '0 0 2px #000',
                  }}
                >
                  {text}
                </motion.div>
              );
            } catch (error) {
              console.error('Error renderizando animación de daño:', error);
              return null;
            }
          }).filter(Boolean); // Filtrar elementos null
        })()}
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
        isPlayerView={isPlayerView}
      />
      {settingsTokenIds.map((id) => {
        const token = tokens.find((t) => t.id === id);
        if (!token) {
          setSettingsTokenIds((prev) => prev.filter((sid) => sid !== id));
          return null;
        }
        return (
          <TokenSettings
            key={id}
            token={token}
            enemies={enemies}
            players={players}
            onClose={() => handleCloseSettings(id)}
            onUpdate={(tk) => {
              const updated = tokens.map((t) => (t.id === tk.id ? tk : t));
              handleTokensChange(updated);
            }}
            onOpenSheet={handleOpenSheet}
            onMoveFront={() => moveTokenToFront(id)}
            onMoveBack={() => moveTokenToBack(id)}
            isPlayerView={isPlayerView}
            currentPlayerName={playerName}
          />
        );
      })}
      {estadoTokenIds.map((id) => {
        const token = tokens.find((t) => t.id === id);
        if (!token) {
          setEstadoTokenIds((prev) => prev.filter((sid) => sid !== id));
          return null;
        }
        return (
          <TokenEstadoMenu
            key={id}
            token={token}
            onClose={() => handleCloseEstados(id)}
            onUpdate={(tk) => {
              const updated = tokens.map((t) => (t.id === tk.id ? tk : t));
              handleTokensChange(updated);
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
            onClose={handleCloseBars}
            onUpdate={(tk) => {
              const updated = tokens.map((t) => (t.id === tk.id ? tk : t));
              handleTokensChange(updated);
            }}
          />
        );
      })()}
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
          isMaster={userType === 'master'}
          onClose={() => setDoorMenuWallId(null)}
          onUpdate={(w) => {
            saveWalls((ws) => ws.map((wl) => (wl.id === w.id ? w : wl)));
          }}
        />
      )}
      {doorCheckWallId != null && (
        <DoorCheckModal
          isOpen={true}
          onClose={handleDoorCheckResult}
          playerName={playerName}
          difficulty={(walls.find((w) => w.id === doorCheckWallId)?.difficulty) || 1}
        />
      )}
      {attackReady && attackTargetId && (
        <AttackModal
          isOpen
          attacker={tokens.find(t => t.id === attackSourceId)}
          target={tokens.find(t => t.id === attackTargetId)}
          distance={attackLine ? Math.round(Math.hypot(
            pxToCell(attackLine[2], gridOffsetX) - pxToCell(attackLine[0], gridOffsetX),
            pxToCell(attackLine[3], gridOffsetY) - pxToCell(attackLine[1], gridOffsetY)
          )) : 0}
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
            attacker={tokens.find(t => t.id === attackSourceId)}
            target={tokens.find(t => t.id === attackTargetId)}
            distance={attackLine ? Math.round(Math.hypot(
              pxToCell(attackLine[2], gridOffsetX) - pxToCell(attackLine[0], gridOffsetX),
              pxToCell(attackLine[3], gridOffsetY) - pxToCell(attackLine[1], gridOffsetY)
            )) : 0}
            attackResult={attackResult}
            pageId={pageId}
            armas={armas}
            poderesCatalog={habilidades}
            onClose={async (res) => {
              if (!res && attackResult) {
                try {
                  let alreadyCompleted = false;
                  if (attackRequestId) {
                    try {
                      const snap = await getDoc(doc(db, 'attacks', attackRequestId));
                      if (snap.exists() && snap.data().completed) alreadyCompleted = true;
                    } catch {}
                  }
                  if (!alreadyCompleted) {
                    const target = tokens.find(t => t.id === attackTargetId);
                    if (target) {
                      let lost = { armadura: 0, postura: 0, vida: 0 };
                      let updatedSheet = null;
                      if (target.tokenSheetId) {
                        const stored = localStorage.getItem('tokenSheets');
                        if (stored) {
                          const sheets = JSON.parse(stored);
                          const sheet = sheets[target.tokenSheetId];
                          if (sheet) {
                            let updated = sheet;
                            let remaining = attackResult.total;
                            ['postura', 'armadura', 'vida'].forEach((stat) => {
                              const resDam = applyDamage(updated, remaining, stat);
                              remaining = resDam.remaining;
                              updated = resDam.sheet;
                              lost[stat] = resDam.blocks;
                            });
                            sheets[updated.id] = updated;
                            localStorage.setItem('tokenSheets', JSON.stringify(sheets));
                            window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: updated }));
                            saveTokenSheet(updated);
                            updatedSheet = updated;
                          }
                        }
                      }
                      for (const stat of ['postura', 'armadura', 'vida']) {
                        if (lost[stat] > 0) {
                          const anim = { tokenId: target.id, value: lost[stat], stat, ts: Date.now() };
                          try {
                            let effectivePageId = pageId;
                            try {
                              const visibilityDoc = await getDoc(doc(db, 'gameSettings', 'playerVisibility'));
                              if (visibilityDoc.exists()) {
                                effectivePageId = visibilityDoc.data().playerVisiblePageId || pageId;
                              }
                            } catch (err) {
                              console.warn('No se pudo obtener playerVisiblePageId, usando pageId actual:', err);
                            }
                            await addDoc(collection(db, 'damageEvents'), {
                              ...anim,
                              pageId: effectivePageId,
                              timestamp: serverTimestamp(),
                            });
                          } catch {}
                        }
                      }
                      let msgs = [];
                      try {
                        const chatSnap = await getDoc(doc(db, 'assetSidebar', 'chat'));
                        if (chatSnap.exists()) msgs = chatSnap.data().messages || [];
                      } catch {}
                      const targetName = target.customName || target.name || 'Defensor';
                      const vigor = parseDieValue(updatedSheet?.atributos?.vigor);
                      const destreza = parseDieValue(updatedSheet?.atributos?.destreza);
                      const diff = attackResult.total;
                      const totalLost = lost.armadura + lost.postura + lost.vida;
                      const noDamageText = `${targetName} resiste el daño. Ataque ${attackResult.total} Defensa 0 Dif ${diff} (V${vigor} D${destreza}) Bloques A-${lost.armadura} P-${lost.postura} V-${lost.vida}`;
                      const damageText = `${targetName} no se defendió. Ataque ${attackResult.total} Defensa 0 Dif ${diff} (V${vigor} D${destreza}) Bloques A-${lost.armadura} P-${lost.postura} V-${lost.vida}`;
                      msgs.push({
                        id: nanoid(),
                        author: targetName,
                        text: totalLost === 0 ? noDamageText : damageText,
                      });
                      await setDoc(doc(db, 'assetSidebar', 'chat'), { messages: msgs });
                      if (attackRequestId) {
                        try {
                          await updateDoc(doc(db, 'attacks', attackRequestId), { completed: true, auto: true });
                        } catch {}
                      }
                    }
                  }
                } catch (err) {
                  console.error(err);
                }
              }
              if (attackRequestId) {
                try {
                  await deleteDoc(doc(db, 'attacks', attackRequestId));
                } catch (err) {
                  console.error(err);
                }
                setAttackRequestId(null);
              }
              setAttackTargetId(null);
              setAttackLine(null);
              setAttackResult(null);
              setAttackReady(false);
            }}
          />
      )}

      {/* Indicador de modo simulación */}
      {userType === 'master' && playerViewMode && (
        <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">👁️ Simulando vista de:</span>
            <span className="font-bold">{simulatedPlayer}</span>
            <span className="text-xs opacity-75">(Ctrl+L para salir)</span>
          </div>
        </div>
      )}

      {(userType === 'player' || playerViewMode) && tokens.some(t => t.controlledBy === (userType === 'player' ? playerName : simulatedPlayer)) && (
        <div
          ref={switcherRef}
          className="fixed bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 cursor-move"
          style={{ top: tokenSwitcherPos.y, left: tokenSwitcherPos.x }}
          onMouseDown={(e) => {
            setDraggingSwitcher(true);
            switcherOffset.current = { x: e.clientX - tokenSwitcherPos.x, y: e.clientY - tokenSwitcherPos.y };
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Ficha activa:</span>
            <select
              className="text-black text-sm"
              value={activeTokenId || ''}
              onChange={e => setActiveTokenId(e.target.value)}
            >
              {tokens.filter(t => t.controlledBy === (userType === 'player' ? playerName : simulatedPlayer)).map(t => (
                <option key={t.id} value={t.id}>{t.customName || t.name || t.id}</option>
              ))}
            </select>
            <span className="text-xs opacity-75">(Tab para alternar)</span>
          </div>
        </div>
      )}

      {/* Contador de selección múltiple */}
      {(selectedTokens.length > 0 || selectedLines.length > 0 || selectedWalls.length > 0 || selectedTexts.length > 0) && (
        <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">📋 Seleccionados:</span>
            <span className="font-bold">
              {selectedTokens.length + selectedLines.length + selectedWalls.length + selectedTexts.length}
            </span>
            <span className="text-xs opacity-75">
              ({selectedTokens.length > 0 && `${selectedTokens.length} tokens`}
              {selectedLines.length > 0 && ` ${selectedLines.length} líneas`}
              {selectedWalls.length > 0 && ` ${selectedWalls.length} muros`}
              {selectedTexts.length > 0 && ` ${selectedTexts.length} textos`})
            </span>
          </div>
          <div className="text-xs opacity-75 mt-1">
            Ctrl+C: Copiar | Ctrl+V: Pegar | Delete: Eliminar | Escape: Deseleccionar
          </div>
        </div>
      )}

      {/* Indicador de clipboard */}
      {clipboard && (
        <div className="absolute bottom-4 right-4 bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">📋 Clipboard:</span>
            <span className="font-bold">
              {(clipboard.tokens?.length || 0) + (clipboard.lines?.length || 0) +
               (clipboard.walls?.length || 0) + (clipboard.texts?.length || 0)} elementos
            </span>
          </div>
          <div className="text-xs opacity-75">
            Ctrl+V para pegar en la posición del cursor
          </div>
        </div>
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
      difficulty: PropTypes.number,
      baseDifficulty: PropTypes.number,
    })
  ),
  onWallsChange: PropTypes.func,
  texts: PropTypes.array,
  onTextsChange: PropTypes.func,
  activeLayer: PropTypes.string,
  onLayerChange: PropTypes.func,
  enableDarkness: PropTypes.bool,
  darknessOpacity: PropTypes.number,
  showVisionPolygons: PropTypes.bool,
  pageId: PropTypes.string,
  isPlayerView: PropTypes.bool,
};

export default MapCanvas;
