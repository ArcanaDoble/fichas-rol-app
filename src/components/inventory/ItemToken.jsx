import React from 'react';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { Tooltip } from 'react-tooltip';

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

const gradients = {
  remedio: 'from-blue-200 via-blue-400 to-blue-200',
  chatarra: 'from-yellow-200 via-yellow-400 to-yellow-200',
  comida: 'from-green-200 via-green-400 to-green-200',
};

const borders = {
  remedio: 'border-blue-400',
  chatarra: 'border-yellow-400',
  comida: 'border-green-400',
};

const descriptions = {
  remedio: 'Un remedio curativo',
  chatarra: 'Partes de recambio variadas',
  comida: 'Provisiones comestibles',
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
  const gradient = gradients[type] || 'from-gray-300 via-gray-400 to-gray-300';
  const border = borders[type] || 'border-gray-300';
  const dragStyle = isDragging ? 'scale-110 rotate-6' : 'hover:scale-105';

  return (
    <div
      ref={drag}
      className={`w-16 p-2 ${bg} ${border} border-2 rounded shadow text-center select-none transition-transform ${dragStyle} bg-gradient-to-r ${gradient} bg-[length:200%_200%] animate-gradient animate-glow`}
      style={{ opacity }}
      data-tooltip-id={`item-${id}`}
      data-tooltip-content={descriptions[type]}
    >
      <div className="text-black text-2xl">{icons[type] || '❔'}</div>
      <div className="mt-1 text-sm bg-white text-black rounded-full px-2 inline-block">{count}</div>
      <Tooltip id={`item-${id}`} place="top" className="max-w-[90vw] sm:max-w-xs" />
    </div>
  );
};

ItemToken.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.string,
  count: PropTypes.number,
  fromSlot: PropTypes.number,
};

export default ItemToken;
