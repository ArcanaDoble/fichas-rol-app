import React, { useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Slot from './Slot';
import ItemToken, { ItemTypes } from './ItemToken';
import ItemGenerator from './ItemGenerator';

const STORAGE_DOC = doc(db, 'inventory', 'slots');
const initialSlots = Array.from({ length: 4 }, (_, i) => ({ id: i, enabled: false, item: null }));

const Inventory = () => {
  const [slots, setSlots] = useState(initialSlots);
  const [nextId, setNextId] = useState(initialSlots.length);
  const [tokens, setTokens] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchState = async () => {
      const snap = await getDoc(STORAGE_DOC);
      if (snap.exists()) {
        const data = snap.data();
        setSlots(data.slots || initialSlots);
        setTokens(data.tokens || []);
        setNextId(data.nextId || initialSlots.length);
      }
      setLoaded(true);
    };
    fetchState();
  }, []);

  useEffect(() => {
    if (loaded) {
      setDoc(STORAGE_DOC, { slots, tokens, nextId });
    }
  }, [slots, tokens, nextId, loaded]);

  const toggleSlot = (index) => {
    setSlots(s => s.map((slot, i) => i === index ? { ...slot, enabled: !slot.enabled } : slot));
  };

  const closeSlot = (index) => {
    setSlots(s => s.map((slot, i) => i === index ? { ...slot, enabled: false, item: null } : slot));
  };

  const removeSlot = (index) => {
    setSlots(s => s.filter((_, i) => i !== index));
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

  const [, trashDrop] = useDrop(() => ({
    accept: ItemTypes.TOKEN,
    drop: (dragged) => {
      if (dragged.fromSlot != null) {
        setSlots(s => s.map(slot => slot.id === dragged.fromSlot ? { ...slot, item: null } : slot));
      } else if (dragged.id) {
        setTokens(t => t.filter(tok => tok.id !== dragged.id));
      }
    },
  }), [setSlots, setTokens]);

  return (
    <div className="space-y-4 flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-2">
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
              onDelete={() => removeSlot(i)}
            />
          ))}
          <button
            onClick={addSlot}
            className="w-20 h-20 border border-dashed rounded flex items-center justify-center text-xl text-gray-400 hover:ring-2 hover:ring-green-400 transition-all"
          >
            +
          </button>
          <div
            ref={trashDrop}
            className="w-20 h-20 border border-dashed rounded flex items-center justify-center text-xl text-red-400 hover:ring-2 hover:ring-red-500 transition-all"
          >
            🗑
          </div>
        </div>
        <ItemGenerator onGenerate={generateItem} />
        <div className="flex flex-wrap justify-center gap-2">
          {tokens.map(token => (
            <ItemToken key={token.id} id={token.id} type={token.type} />
          ))}
        </div>
      </div>
  );
};

export default Inventory;
