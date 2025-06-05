import React from 'react';
import { useDrag } from 'react-dnd';
import RotationHandle from './RotationHandle';
import ItemToken, { ItemTypes } from '../inventory/ItemToken';

const InventoryItem = ({ item, cellSize, onRotate }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TOKEN,
    item: { ...item, fromGrid: true },
    collect: (monitor) => ({ isDragging: monitor.isDragging() })
  }), [item]);

  const style = {
    width: item.width * cellSize,
    height: item.height * cellSize,
    left: item.x * cellSize,
    top: item.y * cellSize,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={drag} className="absolute" style={style}>
      <ItemToken id={item.id} type={item.type} count={item.count} />
      <RotationHandle onRotate={() => onRotate(item.id)} />
    </div>
  );
};

export default InventoryItem;
