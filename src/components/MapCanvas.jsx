import React, { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Stage, Layer, Rect, Line, Image as KonvaImage, Group } from 'react-konva';
import useImage from 'use-image';
import { useDrop } from 'react-dnd';
import { AssetTypes } from './AssetSidebar';

const Token = ({ id, x, y, size, color, image, selected, onDragEnd, onClick }) => {
  const [img] = useImage(image);
  const common = {
    x,
    y,
    width: size,
    height: size,
    draggable: true,
    onDragEnd: (e) => onDragEnd(id, e.target.x(), e.target.y()),
    onClick: () => onClick?.(id),
    stroke: selected ? '#e0e0e0' : undefined,
    strokeWidth: selected ? 3 : 0,
  };
  if (img) {
    return <KonvaImage image={img} {...common} />;
  }
  return <Rect fill={color || 'red'} {...common} />;
};

Token.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  color: PropTypes.string,
  image: PropTypes.string,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  onDragEnd: PropTypes.func.isRequired,
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
        <Line key={`v${i}`} points={[i, 0, i, imageSize.height]} stroke="rgba(255,255,255,0.2)" />
      );
    }
    // Líneas horizontales
    for (let i = gridOffsetY; i < imageSize.height; i += effectiveGridSize) {
      lines.push(
        <Line key={`h${i}`} points={[0, i, imageSize.width, i]} stroke="rgba(255,255,255,0.2)" />
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
        const newToken = { id: Date.now(), x, y, url: item.url, name: item.name };
        onTokensChange([...tokens, newToken]);
      },
    }),
    [tokens, groupPos, groupScale, mapWidth, mapHeight, gridOffsetX, gridOffsetY]
  );

  const groupScale = baseScale * zoom;

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
        style={{ background: '#000' }}
      >
        <Layer>
          <Group x={groupPos.x} y={groupPos.y} scaleX={groupScale} scaleY={groupScale}>
            {bg && <KonvaImage image={bg} width={imageSize.width} height={imageSize.height} />}
            {drawGrid()}
            {tokens.map((token) => (
              <Token
                key={token.id}
                id={token.id}
                x={cellToPx(token.x, gridOffsetX)}
                y={cellToPx(token.y, gridOffsetY)}
                size={effectiveGridSize}
                image={token.url}
                color={token.color}
                selected={token.id === selectedId}
                onDragEnd={handleDragEnd}
                onClick={setSelectedId}
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
    })
  ).isRequired,
  onTokensChange: PropTypes.func.isRequired,
};

export default MapCanvas;
