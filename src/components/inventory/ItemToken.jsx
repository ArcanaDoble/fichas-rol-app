import React from 'react';
import { useDrag } from 'react-dnd';

export const ItemTypes = {
  TOKEN: 'token'
};

const icons = {
  remedio: '💊',
  chatarra: '⚙️',
  comida: '🍖',
};

const colors = {
  remedio: 'bg-blue-300',
  chatarra: 'bg-yellow-300',
  comida: 'bg-green-300',
};

const ItemToken = ({ id, type = 'remedio', count = 1, fromSlot = null }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TOKEN,
    item: { id, type, count, fromSlot },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [id, type, count, fromSlot]);

  const opacity = isDragging ? 0.5 : 1;
  const bg = colors[type] || 'bg-gray-300';

  return (
    <div ref={drag} className={`w-16 p-2 ${bg} rounded shadow text-center select-none`} style={{ opacity }}>
      <div className="text-black text-2xl">{icons[type] || '❔'}</div>
      <div className="mt-1 text-sm bg-white text-black rounded-full px-2 inline-block">{count}</div>
    </div>
  );
};

export default ItemToken;
