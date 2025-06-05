import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Slot from './Slot';
import ItemToken from './ItemToken';

const initialSlots = Array.from({ length: 4 }, (_, i) => ({ id: i, enabled: false, item: null }));

const Inventory = () => {
  const [slots, setSlots] = useState(initialSlots);

  const toggleSlot = (index) => {
    setSlots(s => s.map((slot, i) => i === index ? { ...slot, enabled: !slot.enabled } : slot));
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex space-x-2">
          {slots.map((slot, i) => (
            <label key={slot.id} className="flex items-center space-x-1">
              <input type="checkbox" checked={slot.enabled} onChange={() => toggleSlot(i)} />
              <span>Slot {i + 1}</span>
            </label>
          ))}
        </div>
        <div className="flex space-x-2">
          {slots.map((slot, i) => (
            <Slot
              key={slot.id}
              id={slot.id}
              enabled={slot.enabled}
              item={slot.item}
              onDrop={(dragged) => handleDrop(i, dragged)}
              onIncrement={() => increment(i)}
              onDecrement={() => decrement(i)}
            />
          ))}
        </div>
        <div className="mt-4">
          <ItemToken />
        </div>
      </div>
    </DndProvider>
  );
};

export default Inventory;
