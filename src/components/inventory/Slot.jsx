import React from 'react';
import { useDrop } from 'react-dnd';
import ItemToken, { ItemTypes } from './ItemToken';

const Slot = ({ id, enabled, item, onDrop, onToggle, onClose, onDelete }) => {
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
  const bg = enabled ? 'bg-gray-700/70' : 'bg-gray-600/40 group-hover:bg-green-700/40';
  const highlight = isOver && canDrop ? 'ring-2 ring-blue-400' : '';
  const blocked = isOver && !canDrop ? 'animate-shake ring-2 ring-red-500' : '';
  const glow = item ? 'ring-2 ring-yellow-300' : 'hover:ring-2 hover:ring-yellow-300';
  const scale = enabled ? 'scale-100 opacity-100' : 'scale-90 opacity-70';

  return (
    <div
      ref={drop}
      onClick={() => !enabled && onToggle && onToggle()}
      className={`group w-20 h-20 flex items-center justify-center border ${border} ${bg} ${highlight} ${blocked} ${glow} ${scale} rounded relative transition-all duration-300 transform`}
    >
      {!enabled && (
        <span className="text-gray-400 group-active:scale-125 group-active:text-green-400 group-hover:text-green-400 text-3xl select-none pointer-events-none transition-transform duration-200">+</span>
      )}
      {enabled && !item && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
            className="absolute top-0 right-0 text-2xl"
          >
            ✕
          </button>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="absolute bottom-0 right-0 text-2xl"
            >
              🗑
            </button>
          )}
        </>
      )}
      {item && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ItemToken type={item.type} count={item.count} fromSlot={id} />
        </div>
      )}
    </div>
  );
};

export default Slot;
