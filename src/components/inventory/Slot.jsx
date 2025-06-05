import React from 'react';
import { useDrop } from 'react-dnd';
import ItemToken, { ItemTypes } from './ItemToken';

const Slot = ({ id, enabled, item, onDrop, onIncrement, onDecrement }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.TOKEN,
    canDrop: () => enabled,
    drop: (dragged) => {
      onDrop && onDrop(dragged);
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    })
  }), [enabled, onDrop]);

  const border = enabled ? 'border-gray-500' : 'border-dashed border-gray-400';
  const bg = enabled ? 'bg-gray-700/70' : 'bg-gray-600/40';
  const highlight = isOver && canDrop ? 'ring-2 ring-blue-400' : '';

  return (
    <div ref={drop} className={`w-20 h-20 flex items-center justify-center border ${border} ${bg} ${highlight} rounded relative`}>
      {item && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ItemToken type={item.type} count={item.count} />
          <div className="absolute bottom-1 right-1 flex space-x-1">
            <button onClick={onIncrement} className="bg-white text-xs px-1 rounded">+</button>
            <button onClick={onDecrement} className="bg-white text-xs px-1 rounded">-</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Slot;
