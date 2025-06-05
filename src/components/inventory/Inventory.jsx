import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Slot from './Slot';
import ItemToken from './ItemToken';
import ItemGenerator from './ItemGenerator';

const STORAGE_KEY = 'inventory-slots';
const initialSlots = Array.from({ length: 4 }, (_, i) => ({ id: i, enabled: false, item: null }));

const Inventory = () => {
  const [slots, setSlots] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialSlots;
  });
  const [nextId, setNextId] = useState(slots.length);
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  }, [slots]);

  const toggleSlot = (index) => {
    setSlots(s => s.map((slot, i) => i === index ? { ...slot, enabled: !slot.enabled } : slot));
  };

  const closeSlot = (index) => {
    setSlots(s => s.map((slot, i) => i === index ? { ...slot, enabled: false, item: null } : slot));
  };

  const addSlot = () => {
    setSlots(s => [...s, { id: nextId, enabled: false, item: null }]);
    setNextId(id => id + 1);
  };

  const handleDrop = (index, dragged) => {
    setSlots(s => s.map((slot, i) => {
      if (i !== index) return slot;
      if (!slot.item) return { ...slot, item: { type: dragged.type, count: 1 } };
      return { ...slot, item: { ...slot.item, count: Math.min(slot.item.count + 1, 99) } };
    }));
  };

  const increment = (index) => {
    setSlots(s => s.map((slot, i) => i === index ? { ...slot, item: { ...slot.item, count: Math.min(slot.item.count + 1, 99) } } : slot));
  };

  const decrement = (index) => {
    setSlots(s => s.map((slot, i) => i === index ? { ...slot, item: { ...slot.item, count: Math.max(slot.item.count - 1, 0) } } : slot));
  };

  const generateItem = (type) => {
    setTokens(t => [...t, { id: Date.now() + Math.random(), type }]);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {slots.map((slot, i) => (
            <Slot
              key={slot.id}
              id={slot.id}
              enabled={slot.enabled}
              item={slot.item}
              onDrop={(dragged) => handleDrop(i, dragged)}
              onIncrement={() => increment(i)}
              onDecrement={() => decrement(i)}
              onToggle={() => toggleSlot(i)}
              onClose={() => closeSlot(i)}
            />
          ))}
          <button onClick={addSlot} className="w-20 h-20 border border-dashed rounded flex items-center justify-center text-xl text-gray-400">+</button>
        </div>
        <ItemGenerator onGenerate={generateItem} />
        <div className="flex flex-wrap gap-2">
          {tokens.map(token => (
            <ItemToken key={token.id} type={token.type} />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

export default Inventory;
