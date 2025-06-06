import React from 'react';
import { useDrag } from 'react-dnd';

export const ItemTypes = { ITEM: 'item' };

const InventoryItem = ({ item, cellSize }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ITEM,
    item,
  }), [item]);

  const style = {
    position: 'absolute',
    left: item.x * cellSize,
    top: item.y * cellSize,
    width: item.width * cellSize,
    height: item.height * cellSize,
    backgroundImage: `url(${item.icon})`,
    backgroundSize: 'cover',
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
  };

  return <div ref={drag} style={style} />;
};

export default InventoryItem;
