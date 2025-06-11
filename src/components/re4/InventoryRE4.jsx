import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDrop } from 'react-dnd';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import InventoryItem, { ItemTypes } from './InventoryItem';
import GridCell from './GridCell';
import { itemTemplates } from './itemTemplates';

const cols = 10;
const rows = 8;
const cellSize = 40;

const InventoryRE4 = ({ playerName }) => {
  const [items, setItems] = useState([]);

  const docRef = playerName ? doc(db, 'inventory_prototype', playerName) : null;

  useEffect(() => {
    if (!docRef) return;
    (async () => {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setItems(snap.data().items || []);
      }
    })();
  }, [docRef]);

  useEffect(() => {
    if (docRef) {
      setDoc(docRef, { items });
    }
  }, [items, docRef]);

  const findCollision = useCallback((x, y, width, height, id) => {
    if (x < 0 || y < 0 || x + width > cols || y + height > rows) return true;
    return items.some(it => it.id !== id &&
      x < it.x + it.width && x + width > it.x &&
      y < it.y + it.height && y + height > it.y);
  }, [items]);

  const [, drop] = useDrop(() => ({
    accept: ItemTypes.ITEM,
    drop: (dragged, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      const nx = Math.round(dragged.x + delta.x / cellSize);
      const ny = Math.round(dragged.y + delta.y / cellSize);
      if (!findCollision(nx, ny, dragged.width, dragged.height, dragged.id)) {
        setItems(it => it.map(i => i.id === dragged.id ? { ...i, x: nx, y: ny } : i));
      }
    },
  }), [findCollision]);

  const addItem = templateId => {
    const template = itemTemplates.find(t => t.id === templateId);
    if (!template) return;
    const id = Date.now();
    let x = 0, y = 0;
    while (findCollision(x, y, template.width, template.height, id)) {
      x++;
      if (x >= cols) { x = 0; y++; }
      if (y >= rows) return; // full
    }
    setItems([...items, { ...template, id, x, y }]);
  };

  return (
    <div className="space-y-4">
      <div
        ref={drop}
        className="relative"
        style={{ width: cols * cellSize, height: rows * cellSize }}
      >
        {[...Array(rows)].map((_, y) => (
          <div key={y} className="flex">
            {[...Array(cols)].map((_, x) => (
              <GridCell key={x} size={cellSize} />
            ))}
          </div>
        ))}
        {items.map(item => (
          <InventoryItem key={item.id} item={item} cellSize={cellSize} />
        ))}
      </div>
      <div className="flex gap-2">
        {itemTemplates.map(t => (
          <button
            key={t.id}
            onClick={() => addItem(t.id)}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
};

InventoryRE4.propTypes = {
  playerName: PropTypes.string,
};

export default InventoryRE4;
