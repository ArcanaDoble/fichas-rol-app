import React from 'react';
import { useDrop } from 'react-dnd';
import ItemToken, { ItemTypes } from './ItemToken';

const Slot = ({ id, item, onDrop, onDelete }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TOKEN,
    drop: (dragged) => {
      onDrop && onDrop(dragged);
    },
    collect: monitor => ({
      isOver: monitor.isOver()
    })
  }), [onDrop]);

  const border = 'border-gray-500';
  const bg = 'bg-gray-700/70';
  const highlight = isOver ? 'ring-2 ring-blue-400' : '';
  const glow = item ? 'ring-2 ring-yellow-300' : 'hover:ring-2 hover:ring-yellow-300';
  const scale = 'scale-100 opacity-100';

  return (
    <div
      ref={drop}
      onDoubleClick={() => onDelete && !item && onDelete()}
      className={`group w-20 h-20 md:w-24 md:h-24 flex items-center justify-center border ${border} ${bg} ${highlight} ${glow} ${scale} rounded relative transition-all duration-300 transform`}
      title="Doble clic para borrar"
    >
      {onDelete && !item && (
        <span className="absolute bottom-0 right-0 text-xl select-none pointer-events-none opacity-60">
          🗑
        </span>
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
