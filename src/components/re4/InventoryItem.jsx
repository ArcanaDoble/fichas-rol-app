import React from 'react';
import PropTypes from 'prop-types';
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

InventoryItem.propTypes = {
  item: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    icon: PropTypes.string.isRequired,
  }).isRequired,
  cellSize: PropTypes.number.isRequired,
};

export default InventoryItem;
