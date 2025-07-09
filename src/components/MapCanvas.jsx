import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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
} from 'react-konva';
import useImage from 'use-image';
import { useDrop } from 'react-dnd';
import { AssetTypes } from './AssetSidebar';
import TokenSettings from './TokenSettings';
import TokenSheetModal from './TokenSheetModal';
import { nanoid } from 'nanoid';
import TokenBars from './TokenBars';
import Konva from 'konva';

const hexToRgba = (hex, alpha = 1) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
  const int = parseInt(h, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

const hexToRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
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
  const Token = forwardRef(({
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
  onHoverChange,
  tokenSheetId,
  auraRadius = 0,
  auraShape = 'circle',
  auraColor = '#ffff00',
  auraOpacity = 0.25,
  showAura = true,
  tintColor = '#ff0000',
  tintOpacity = 0,
}, ref) => {
  // Load token texture with CORS enabled so filters like tint work
  const [img] = useImage(image, 'anonymous');
  const groupRef = useRef();
  const shapeRef = useRef();
  const trRef = useRef();
  const rotateRef = useRef();
  const gearRef = useRef();
  const textRef = useRef();
  const textGroupRef = useRef();
  const HANDLE_OFFSET = 12;
  const iconSize = cellSize * 0.15;
  const nameFontSize = Math.max(10, cellSize * 0.12 * Math.min(Math.max(width, height), 2));
  const [stats, setStats] = useState({});

  const SNAP = gridSize / 4;

  const placeholderBase = color || 'red';
  const fillColor = tintOpacity > 0 ? mixColors(placeholderBase, tintColor, tintOpacity) : placeholderBase;

  useEffect(() => {
    const node = shapeRef.current;
    if (!node || !img) return;
    const tintRgb = hexToRgb(tintColor);
    if (tintOpacity > 0) {
      node.cache();
      node.filters([Konva.Filters.RGBA]);
      node.red(tintRgb.r);
      node.green(tintRgb.g);
      node.blue(tintRgb.b);
      node.alpha(tintOpacity);
    } else {
      node.clearCache();
      node.filters([]);
    }
    node.getLayer()?.batchDraw();
  }, [tintColor, tintOpacity, img]);



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
    const handler = e => {
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
    if (labelGroup && label) {
      labelGroup.position({ x: box.x + box.width / 2, y: box.y + box.height + 4 });
      labelGroup.offsetX(label.width() / 2);
    }
    handle.getLayer().batchDraw();
  };

  const updateSizes = () => {
    if (rotateRef.current) {
      rotateRef.current.radius(iconSize / 2);
    }
    if (gearRef.current) {
      gearRef.current.fontSize(iconSize);
    }
  };

  useEffect(() => {
    updateSizes();
    if (selected) updateHandle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const snap = box.width < threshold && box.height < threshold ? SNAP : gridSize;

    box.x = Math.round(box.x / snap) * snap;
    box.y = Math.round(box.y / snap) * snap;

    if (snap === SNAP) {
      box.width = Math.max(SNAP, Math.round(box.width / SNAP) * SNAP);
      box.height = Math.max(SNAP, Math.round(box.height / SNAP) * SNAP);
    } else {
      const cells = Math.max(1, Math.round(Math.max(box.width, box.height) / gridSize));
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
      const cells = Math.max(1, Math.round(Math.max(newWidth, newHeight) / gridSize));
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
    setStats(prev => {
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
              new CustomEvent('tokenSheetSaved', { detail: { id: tokenSheetId, stats: updated } })
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

  const common = {
    x: x + offX,
    y: y + offY,
    width: width * gridSize,
    height: height * gridSize,
    offsetX: offX,
    offsetY: offY,
    rotation: angle,
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
    stroke: selected ? '#e0e0e0' : undefined,
    strokeWidth: selected ? 3 : 0,
  };


  return (
    <Group
      ref={groupRef}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onDblClick={() => onSettings?.(id)}
    >
      {auraRadius > 0 && showAura && (
        auraShape === 'circle' ? (
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
        )
      )}
      {img ? (
        <KonvaImage ref={shapeRef} image={img} {...common} />
      ) : (
        <Rect ref={shapeRef} fill={fillColor} {...common} />
      )}
      {showName && (customName || name) && (
        <Group
          ref={textGroupRef}
          x={x + (width * gridSize) / 2}
          y={y + height * gridSize + 4}
          offsetX={(width * gridSize) / 2}
          listening={false}
        >
          {[{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }].map(
            (o, i) => (
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
            )
          )}
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
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
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
            fontSize={iconSize}
            listening
            onClick={() => onSettings?.(id)}
          />
        </>
      )}
    </Group>
  );
});

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
  onHoverChange: PropTypes.func,
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
}) => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(initialZoom);
  const [groupPos, setGroupPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [dragShadow, setDragShadow] = useState(null);
  const [settingsTokenIds, setSettingsTokenIds] = useState([]);
  const [openSheetTokens, setOpenSheetTokens] = useState([]);
  const tokenRefs = useRef({});
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const [bg] = useImage(backgroundImage, 'anonymous');

  const canSeeBars = useCallback((tk) => {
    if (!tk.barsVisibility || tk.barsVisibility === 'all') return true;
    if (tk.barsVisibility === 'none') return false;
    if (tk.barsVisibility === 'controlled') {
      if (userType === 'master') return true;
      return tk.controlledBy === playerName;
    }
    return true;
  }, [playerName, userType]);

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
  const effectiveGridSize = imageSize.width && gridCells ? imageSize.width / gridCells : gridSize;

  const pxToCell = (px, offset) => Math.round((px - offset) / effectiveGridSize);
  const cellToPx = (cell, offset) => cell * effectiveGridSize + offset;

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
    const refWidth = imageSize.width || gridCells * gridSize || containerSize.width;
    const refHeight = imageSize.height || gridCells * gridSize || containerSize.height;
    const scaleX = containerSize.width / refWidth;
    const scaleY = containerSize.height / refHeight;
    const scale = scaleMode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
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
    const updated = tokens.map((t) =>
      t.id === id ? { ...t, w, h, x, y } : t
    );
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

  const handleOpenSheet = (token) => {
    setOpenSheetTokens((prev) =>
      prev.some((t) => t.tokenSheetId === token.tokenSheetId)
        ? prev
        : [...prev, token]
    );
  };

  const handleCloseSheet = (sheetId) => {
    setOpenSheetTokens((prev) => prev.filter((t) => t.tokenSheetId !== sheetId));
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

  // Iniciar paneo con el botón central del ratón
  const handleMouseDown = (e) => {
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      setIsPanning(true);
      panStart.current = stageRef.current.getPointerPosition();
      panOrigin.current = { ...groupPos };
    }
  };

  // Actualiza la posición del grupo durante el paneo
  const handleMouseMove = () => {
    if (!isPanning) return;
    const pointer = stageRef.current.getPointerPosition();
    setGroupPos({
      x: panOrigin.current.x + (pointer.x - panStart.current.x),
      y: panOrigin.current.y + (pointer.y - panStart.current.y),
    });
  };

  const stopPanning = () => {
    if (isPanning) setIsPanning(false);
  };

  const handleStageClick = (e) => {
    if (e.target === stageRef.current) {
      setSelectedId(null);
    }
  };

  const mapWidth = gridCells || Math.round(imageSize.width / effectiveGridSize);
  const mapHeight = gridCells || Math.round(imageSize.height / effectiveGridSize);

  const handleKeyDown = useCallback((e) => {
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
    const updated = tokens.map((t) => (t.id === selectedId ? { ...t, x, y } : t));
    onTokensChange(updated);
  }, [selectedId, tokens, onTokensChange, mapWidth, mapHeight]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
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
          name: item.name,
          enemyId: item.enemyId,
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
        };
        onTokensChange([...tokens, newToken]);
      },
    }),
    [tokens, groupPos, groupScale, mapWidth, mapHeight, gridOffsetX, gridOffsetY]
  );

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
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
          <Group x={groupPos.x} y={groupPos.y} scaleX={groupScale} scaleY={groupScale}>
            {bg && (
              <KonvaImage
                image={bg}
                width={imageSize.width}
                height={imageSize.height}
                listening={false}
              />
            )}
            {drawGrid()}
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
                showAura={canSeeAura(dragShadow)}
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
                showAura={canSeeAura(token)}
                tokenSheetId={token.tokenSheetId}
                auraRadius={token.auraRadius}
                auraShape={token.auraShape}
                auraColor={token.auraColor}
                auraOpacity={token.auraOpacity}
                selected={token.id === selectedId}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
                onClick={setSelectedId}
                onSettings={handleOpenSettings}
                onTransformEnd={handleSizeChange}
                onRotate={handleRotateChange}
                onHoverChange={(h) => setHoveredId(h ? token.id : null)}
              />
            ))}
          </Group>
        </Layer>
        <Layer listening>
          {tokens.map((token) => (
            <TokenBars
              key={`bars-${token.id}`}
              tokenRef={tokenRefs.current[token.id]}
              stageRef={stageRef}
              onStatClick={(key, e) => tokenRefs.current[token.id]?.handleStatClick(key, e)}
              transformKey={`${groupPos.x},${groupPos.y},${groupScale},${token.x},${token.y},${token.w},${token.h},${token.angle}`}
              visible={hoveredId === token.id && canSeeBars(token)}
            />
          ))}
        </Layer>
        </Stage>
      </div>
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
};

export default MapCanvas;
