import React, { useState, useEffect, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import InventoryGrid from '../inventory-grid/InventoryGrid';
import ItemToken, { ItemTypes } from './ItemToken';
import ItemGenerator from './ItemGenerator';
import { createGrid, canPlaceItem, placeItem } from '../inventory-grid/GridUtils';

const DEFAULT_WIDTH = 6;
const DEFAULT_HEIGHT = 10;

const ITEM_SIZES = {
  remedio: { width: 1, height: 1 },
  chatarra: { width: 2, height: 1 },
  comida: { width: 1, height: 2 },
};

const validItem = (item) =>
  item &&
  item.id !== undefined &&
  typeof item.type === 'string' &&
  typeof item.count === 'number' &&
  typeof item.x === 'number' &&
  typeof item.y === 'number' &&
  typeof item.width === 'number' &&
  typeof item.height === 'number' &&
  typeof item.rotated === 'boolean';

const validToken = (t) =>
  t &&
  t.id !== undefined &&
  typeof t.type === 'string' &&
  typeof t.count === 'number' &&
  typeof t.width === 'number' &&
  typeof t.height === 'number' &&
  typeof t.rotated === 'boolean';

const Inventory = ({ playerName }) => {
  const [width] = useState(DEFAULT_WIDTH);
  const [height] = useState(DEFAULT_HEIGHT);
  const [items, setItems] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const docRef = useMemo(() => (playerName ? doc(db, 'inventory', playerName) : null), [playerName]);

  useEffect(() => {
    if (!docRef) return;
    const fetchState = async () => {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const loadedItems = (data.items || []).filter(validItem);
        const loadedTokens = (data.tokens || []).filter(validToken);
        setItems(loadedItems);
        setTokens(loadedTokens);
      }
      setLoaded(true);
    };
    fetchState();
  }, [docRef]);

  useEffect(() => {
    if (loaded && docRef) {
      const cleanItems = items.filter(validItem);
      const cleanTokens = tokens.filter(validToken);
      setDoc(docRef, { items: cleanItems, tokens: cleanTokens });
    }
  }, [items, tokens, loaded, docRef]);

  const generateItem = (type) => {
    const size = ITEM_SIZES[type] || { width: 1, height: 1 };
    setTokens(t => [...t, { id: Date.now() + Math.random(), type, count: 1, ...size, rotated: false }]);
  };

  const moveItem = (dragged, x, y) => {
    const size = dragged.rotated
      ? { width: dragged.height || 1, height: dragged.width || 1 }
      : { width: dragged.width || 1, height: dragged.height || 1 };
    const newItem = { ...dragged, ...size, x, y, fromGrid: true };
    const grid = createGrid(width, height);
    items.filter(it => it.id !== dragged.id).forEach(it => placeItem(grid, it, it.x, it.y));
    if (!canPlaceItem(grid, newItem, x, y)) return;

    if (dragged.fromGrid) {
      setItems(its => its.map(it => it.id === dragged.id ? newItem : it));
    } else {
      setTokens(ts => ts.filter(t => t.id !== dragged.id));
      setItems(its => [...its, newItem]);
    }
  };

  const rotateItem = (id) => {
    setItems(its => its.map(it => {
      if (it.id !== id) return it;
      const rotated = !it.rotated;
      const testItem = { ...it, rotated, width: it.height, height: it.width };
      const grid = createGrid(width, height);
      its.filter(i => i.id !== id).forEach(i => placeItem(grid, i, i.x, i.y));
      return canPlaceItem(grid, testItem, it.x, it.y) ? testItem : it;
    }));
  };

  const rotateToken = (id) => {
    setTokens(ts => ts.map(t => t.id === id ? { ...t, rotated: !t.rotated, width: t.height, height: t.width } : t));
  };

  const [, trashDrop] = useDrop(() => ({
    accept: ItemTypes.TOKEN,
    drop: (dragged) => {
      if (dragged.fromGrid) {
        setItems(its => its.filter(it => it.id !== dragged.id));
      } else {
        setTokens(ts => ts.filter(t => t.id !== dragged.id));
      }
    },
  }), [setItems, setTokens]);

  return (
    <div className="space-y-4 flex flex-col items-center">
      <InventoryGrid width={width} height={height} items={items} onMove={moveItem} onRotate={rotateItem} />
      <div ref={trashDrop} className="w-12 h-12 flex items-center justify-center border border-dashed rounded text-red-400 hover:ring-2 hover:ring-red-500 hover:scale-110 transition-transform">
        🗑
      </div>
      <ItemGenerator onGenerate={generateItem} />
      <div className="flex flex-wrap justify-center gap-2">
        {tokens.map(token => (
          <ItemToken
            key={token.id}
            id={token.id}
            type={token.type}
            width={token.width}
            height={token.height}
            rotated={token.rotated}
            onRotate={rotateToken}
          />
        ))}
      </div>
    </div>
  );
};

export default Inventory;
