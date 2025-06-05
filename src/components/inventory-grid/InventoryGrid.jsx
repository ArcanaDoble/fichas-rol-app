import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import InventoryItem from './InventoryItem';
import { ItemTypes } from '../inventory/ItemToken';
import { canPlaceItem } from './GridUtils';

const CELL_SIZE = 48;

const InventoryGrid = ({ width, height, items, onMove, onRotate }) => {
  const gridRef = useRef(null);

  const [, drop] = useDrop(() => ({
    accept: ItemTypes.TOKEN,
    drop: (dragged, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const x = Math.floor((offset.x - rect.left) / CELL_SIZE);
      const y = Math.floor((offset.y - rect.top) / CELL_SIZE);
      onMove(dragged, x, y);
    },
  }), [onMove]);

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
      {items.map(item => (
        <InventoryItem key={item.id} item={item} cellSize={CELL_SIZE} onRotate={onRotate} />
      ))}
    </div>
  );
};

export default InventoryGrid;
