import React, { useRef, useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import InventoryItem from './InventoryItem';
import { ItemTypes } from '../inventory/ItemToken';
import { canPlaceItem, createGrid, placeItem } from './GridUtils';

const CELL_SIZE = 48;

const InventoryGrid = ({ width, height, items, onMove, onRotate }) => {
  const gridRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleKey = (e) => {
    if (e.key.toLowerCase() === 'r' && preview) {
      setPreview(p => p ? { ...p, rotated: !p.rotated, width: p.height, height: p.width } : p);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [preview]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TOKEN,
    hover: (dragged, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const x = Math.floor((offset.x - rect.left) / CELL_SIZE);
      const y = Math.floor((offset.y - rect.top) / CELL_SIZE);
      const rotated = preview?.rotated ?? dragged.rotated;
      const w = rotated ? dragged.height : dragged.width;
      const h = rotated ? dragged.width : dragged.height;
      const grid = createGrid(width, height);
      items.filter(it => it.id !== dragged.id).forEach(it => placeItem(grid, it, it.x, it.y));
      const valid = canPlaceItem(grid, { id: dragged.id, width: w, height: h }, x, y);
      setPreview({ item: dragged, rotated, x, y, width: w, height: h, valid });
    },
    drop: (dragged) => {
      if (!preview) return;
      dragged.rotated = preview.rotated;
      onMove(dragged, preview.x, preview.y);
      setPreview(null);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() })
  }), [onMove, items, preview, width, height]);

  useEffect(() => {
    if (!isOver) setPreview(null);
  }, [isOver]);

  const style = {
    width: width * CELL_SIZE,
    height: height * CELL_SIZE,
    gridTemplateColumns: `repeat(${width}, 1fr)`,
    gridTemplateRows: `repeat(${height}, 1fr)`
  };

  return (
    <div ref={gridRef} className="relative">
      <div ref={drop} className="grid gap-px bg-gray-600" style={style}>
        {Array.from({ length: width * height }).map((_, i) => (
          <div key={i} className="bg-gray-700/70 border border-gray-600" />
        ))}
      </div>
      {preview && (
        <div
          className={`absolute pointer-events-none ${preview.valid ? 'ring-2 ring-green-500/70' : 'ring-2 ring-red-500/70'} bg-white/10`}
          style={{
            width: preview.width * CELL_SIZE,
            height: preview.height * CELL_SIZE,
            left: preview.x * CELL_SIZE,
            top: preview.y * CELL_SIZE,
          }}
        />
      )}
      {items.map(item => (
        <InventoryItem key={item.id} item={item} cellSize={CELL_SIZE} onRotate={onRotate} />
      ))}
    </div>
  );
};

export default InventoryGrid;
