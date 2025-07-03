import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Stage, Layer, Rect, Line, Image as KonvaImage } from 'react-konva';
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
  gridOffsetX = 0,
  gridOffsetY = 0,
  tokens,
  onTokensChange,
}) => {
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 300, height: 300 });
  const [bg] = useImage(backgroundImage);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const drawGrid = () => {
    const lines = [];
    // Líneas verticales
    for (let i = gridOffsetX; i < stageSize.width; i += gridSize) {
      lines.push(
        <Line key={`v${i}`} points={[i, 0, i, stageSize.height]} stroke="rgba(255,255,255,0.2)" />
      );
    }
    // Líneas horizontales
    for (let i = gridOffsetY; i < stageSize.height; i += gridSize) {
      lines.push(
        <Line key={`h${i}`} points={[0, i, stageSize.width, i]} stroke="rgba(255,255,255,0.2)" />
      );
    }
    return lines;
  };

  const handleDragEnd = (id, x, y) => {
    const newTokens = tokens.map((t) => (t.id === id ? { ...t, x, y } : t));
    onTokensChange(newTokens);
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <Stage width={stageSize.width} height={stageSize.height} style={{ background: '#000' }}>
        <Layer>
          {bg && <KonvaImage image={bg} width={stageSize.width} height={stageSize.height} />}
        </Layer>
        <Layer>{drawGrid()}</Layer>
        <Layer>
          {tokens.map((token) => (
            <Token key={token.id} {...token} size={gridSize} onDragEnd={handleDragEnd} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

MapCanvas.propTypes = {
  backgroundImage: PropTypes.string,
  gridSize: PropTypes.number,
  gridOffsetX: PropTypes.number,
  gridOffsetY: PropTypes.number,
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
