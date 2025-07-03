import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Stage, Layer, Rect, Line, Image as KonvaImage, Group } from 'react-konva';
import useImage from 'use-image';

const Token = ({ id, x, y, size, color, image, onDragEnd }) => {
  const [img] = useImage(image);
  if (img) {
    return (
      <KonvaImage
        image={img}
        x={x}
        y={y}
        width={size}
        height={size}
        draggable
        onDragEnd={(e) => onDragEnd(id, e.target.x(), e.target.y())}
      />
    );
  }
  return (
    <Rect
      x={x}
      y={y}
      width={size}
      height={size}
      fill={color || 'red'}
      draggable
      onDragEnd={(e) => onDragEnd(id, e.target.x(), e.target.y())}
    />
  );
};

Token.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  color: PropTypes.string,
  image: PropTypes.string,
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
  const [bg] = useImage(backgroundImage, 'anonymous');

  // Si se especifica el número de casillas, calculamos el tamaño de cada celda
  const effectiveGridSize = gridCells ? imageSize.width / gridCells : gridSize;

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

  const handleDragEnd = (id, x, y) => {
    const newTokens = tokens.map((t) => (t.id === id ? { ...t, x, y } : t));
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

  const groupScale = baseScale * zoom;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        onWheel={handleWheel}
        style={{ background: '#000' }}
      >
        <Layer>
          <Group x={groupPos.x} y={groupPos.y} scaleX={groupScale} scaleY={groupScale}>
            {bg && <KonvaImage image={bg} width={imageSize.width} height={imageSize.height} />}
            {drawGrid()}
            {tokens.map((token) => (
              <Token key={token.id} {...token} size={effectiveGridSize} onDragEnd={handleDragEnd} />
            ))}
          </Group>
        </Layer>
      </Stage>
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
      color: PropTypes.string,
      image: PropTypes.string,
    })
  ).isRequired,
  onTokensChange: PropTypes.func.isRequired,
};

export default MapCanvas;
