import React, { useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import ItemToken, { ItemTypes } from './ItemToken';

const borderColors = {
  remedio: 'border-blue-400',
  chatarra: 'border-yellow-400',
  comida: 'border-green-400',
  polvora: 'border-gray-500',
};

const ringColors = {
  remedio: 'ring-blue-400',
  chatarra: 'ring-yellow-400',
  comida: 'ring-green-400',
  polvora: 'ring-gray-500',
};

const Slot = ({ id, item, onDrop, onDelete }) => {
  const [animateDrop, setAnimateDrop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    check();
  }, []);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TOKEN,
    drop: (dragged) => {
      onDrop && onDrop(dragged);
      setAnimateDrop(true);
    },
    collect: monitor => ({
      isOver: monitor.isOver()
    })
  }), [onDrop]);

  const bg = 'bg-gray-700/70';
  const border = item ? (borderColors[item.type] || 'border-gray-500') : 'border-gray-500';
  const ringColor = item ? (ringColors[item.type] || 'ring-yellow-300') : 'ring-yellow-300';
  const highlight = isOver ? `ring-2 ${ringColor}` : '';
  const glow = item ? `ring-2 ${ringColor}` : `hover:ring-2 ${ringColor}`;
  const scale = 'scale-100 opacity-100';

  return (
    <div
      ref={drop}
      onDoubleClick={() => onDelete && !item && onDelete()}
      className={`group w-20 h-20 md:w-24 md:h-24 flex items-center justify-center border ${border} ${bg} ${highlight} ${glow} ${scale} rounded relative transition-all duration-300 transform`}
      title="Doble clic para borrar"
    >
      {onDelete && !item && (
        <span className="absolute bottom-0 right-0 text-xl select-none pointer-events-none text-gray-400 hover:text-gray-300 transition-colors">
          🗑
        </span>
      )}
      {item && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={animateDrop ? { scale: [0.8, 1.2, 1], y: [-10, 0], rotate: [ -15, 0 ] } : {}}
          initial={false}
          transition={{ duration: isMobile ? 0.2 : 0.4, type: 'spring', bounce: 0.5 }}
          onAnimationComplete={() => setAnimateDrop(false)}
        >
          <ItemToken type={item.type} count={item.count} fromSlot={id} />
        </motion.div>
      )}
    </div>
  );
};

export default Slot;
