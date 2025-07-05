import React, { useRef, useState, useEffect, useCallback } from 'react';
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
} from 'react-konva';
import useImage from 'use-image';
import { useDrop } from 'react-dnd';
import { AssetTypes } from './AssetSidebar';

const Token = ({
  id,
  x,
  y,
  width,
  height,
  angle,
  color,
  image,
  gridSize,
  selected,
  onDragEnd,
  onClick,
  onTransformEnd,
  onRotate,
}) => {
  const [img] = useImage(image);
  const shapeRef = useRef();
  const trRef = useRef();
  const rotateRef = useRef();
  const SNAP = gridSize / 4;

  const updateHandle = () => {
    const node = shapeRef.current;
    const handle = rotateRef.current;
    if (!node || !handle) return;
    const box = node.getClientRect({ relativeTo: node.getParent() });
    handle.position({ x: box.x + box.width + 12, y: box.y - 12 });
    handle.getLayer().batchDraw();
  };
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
    draggable: true,
    dragBoundFunc: (pos) => ({
      x: Math.round((pos.x - offX) / gridSize) * gridSize + offX,
      y: Math.round((pos.y - offY) / gridSize) * gridSize + offY,
    }),
    
    onDragMove: updateHandle,
    onDragEnd: (e) => onDragEnd(id, e.target.x() - offX, e.target.y() - offY),
    onClick: () => onClick?.(id),
    stroke: selected ? '#e0e0e0' : undefined,
    strokeWidth: selected ? 3 : 0,
  };

  return (
    <Group>
      {img ? (
        <KonvaImage ref={shapeRef} image={img} onTransform={updateHandle} {...common} />
      ) : (
        <Rect ref={shapeRef} fill={color || 'red'} onTransform={updateHandle} {...common} />
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
            radius={6}
            fill="#fff"
            stroke="#000"
            strokeWidth={1}
            draggable
            onDragMove={handleRotateMove}
            onDragEnd={handleRotateEnd}
          />
        </>
      )}
    </Group>
  );
};

Token.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  angle: PropTypes.number.isRequired,
  gridSize: PropTypes.number.isRequired,
  color: PropTypes.string,
  image: PropTypes.string,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  onDragEnd: PropTypes.func.isRequired,
  onTransformEnd: PropTypes.func.isRequired,
  onRotate: PropTypes.func.isRequired,
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
}) => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });
  const [imageSize, setImageSize] = useState({ width: 300, height: 300 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(initialZoom);
  const [groupPos, setGroupPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const [bg] = useImage(backgroundImage, 'anonymous');

  // Si se especifica el número de casillas, calculamos el tamaño de cada celda
  const effectiveGridSize = gridCells ? imageSize.width / gridCells : gridSize;

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
    if (!imageSize.width) return;
    const scaleX = containerSize.width / imageSize.width;
    const scaleY = containerSize.height / imageSize.height;
    const scale = scaleMode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    setBaseScale(scale);
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;
    setGroupPos({
      x: (containerSize.width - displayWidth) / 2,
      y: (containerSize.height - displayHeight) / 2,
    });
  }, [containerSize, imageSize, scaleMode]);

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

  const handleDragEnd = (id, px, py) => {
    const cellX = pxToCell(px, gridOffsetX);
    const cellY = pxToCell(py, gridOffsetY);
    const newTokens = tokens.map((t) => (t.id === id ? { ...t, x: cellX, y: cellY } : t));
    onTokensChange(newTokens);
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

  const mapWidth = Math.round(imageSize.width / effectiveGridSize);
  const mapHeight = Math.round(imageSize.height / effectiveGridSize);

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
        const newToken = { id: Date.now(), x, y, w: 1, h: 1, angle: 0, url: item.url, name: item.name };
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
            {tokens.map((token) => (
              <Token
                key={token.id}
                id={token.id}
                x={cellToPx(token.x, gridOffsetX)}
                y={cellToPx(token.y, gridOffsetY)}
                width={token.w || 1}
                height={token.h || 1}
                angle={token.angle || 0}
                gridSize={effectiveGridSize}
                image={token.url}
                color={token.color}
                selected={token.id === selectedId}
                onDragEnd={handleDragEnd}
                onClick={setSelectedId}
                onTransformEnd={handleSizeChange}
                onRotate={handleRotateChange}
              />
            ))}
          </Group>
        </Layer>
        </Stage>
      </div>
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
      w: PropTypes.number,
      h: PropTypes.number,
      angle: PropTypes.number,
    })
  ).isRequired,
  onTokensChange: PropTypes.func.isRequired,
};

export default MapCanvas;
