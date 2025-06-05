import React from 'react';
import { useDrag } from 'react-dnd';

export const ItemTypes = {
  TOKEN: 'token'
};

const ItemToken = ({ type = 'remedio', count = 1 }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TOKEN,
    item: { type, count },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [type, count]);

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div ref={drag} className="w-16 p-2 bg-blue-300 rounded shadow text-center select-none" style={{ opacity }}>
      <div className="text-black text-2xl">💊</div>
      <div className="mt-1 text-sm bg-white text-black rounded-full px-2 inline-block">{count}</div>
    </div>
  );
};

export default ItemToken;
