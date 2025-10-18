import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDrop } from 'react-dnd';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Slot from './Slot';
import ItemToken, { ItemTypes } from './ItemToken';
import ItemGenerator from './ItemGenerator';
import {
  createDefaultInventoryState,
  ensureInventoryState,
} from './inventoryState';

const Inventory = ({ playerName, isMaster = false }) => {
  const defaultState = useMemo(() => createDefaultInventoryState(), []);
  const [slots, setSlots] = useState(defaultState.slots);
  const [nextId, setNextId] = useState(defaultState.nextId);
  const [tokens, setTokens] = useState(defaultState.tokens);
  const [loaded, setLoaded] = useState(false);
  const docRef = useMemo(() => (playerName ? doc(db, 'inventory', playerName) : null), [playerName]);

  useEffect(() => {
    if (!docRef) return;
    const fetchState = async () => {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const state = ensureInventoryState(snap.data());
        setSlots(state.slots);
        setTokens(state.tokens);
        setNextId(state.nextId);
      } else {
        setSlots(defaultState.slots);
        setTokens(defaultState.tokens);
        setNextId(defaultState.nextId);
      }
      setLoaded(true);
    };
    fetchState();
  }, [defaultState, docRef]);

  useEffect(() => {
    if (loaded && docRef) {
      setDoc(docRef, { slots, tokens, nextId });
    }
  }, [slots, tokens, nextId, loaded, docRef]);

  const removeSlot = (index) => {
    setSlots(s => s.filter((_, i) => i !== index));
  };

  const addSlot = () => {
    setSlots(s => [...s, { id: nextId, item: null }]);
    setNextId(id => id + 1);
  };

  const MAX_STACK = 5;

  const handleDrop = (index, dragged) => {
    setSlots(s => s.map((slot, i) => {
      if (i !== index) return slot;
      const itemData = {
        type: dragged.type,
        name: dragged.name || slot.item?.name || '',
        itemId: dragged.itemId || slot.item?.itemId || '',
        rarity: dragged.rarity || slot.item?.rarity || '',
        description: dragged.description || slot.item?.description || '',
        typeLabel: dragged.typeLabel || slot.item?.typeLabel || '',
        cost: typeof dragged.cost === 'number' ? dragged.cost : slot.item?.cost,
        costLabel: dragged.costLabel || slot.item?.costLabel || '',
      };
      if (!slot.item) return { ...slot, item: { ...itemData, count: 1 } };
      return {
        ...slot,
        item: {
          ...slot.item,
          ...itemData,
          count: Math.min((slot.item.count || 0) + 1, MAX_STACK),
        },
      };
    }));
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
              item={slot.item}
              onDrop={(dragged) => handleDrop(i, dragged)}
              onDelete={() => removeSlot(i)}
            />
          ))}
          <button
            onClick={addSlot}
            className="w-20 h-20 md:w-24 md:h-24 border border-dashed rounded flex items-center justify-center text-xl text-gray-400 hover:ring-2 hover:ring-green-400 hover:scale-110 transition-transform"
          >
            +
          </button>
          <div
            ref={trashDrop}
            className="w-20 h-20 md:w-24 md:h-24 border border-dashed rounded flex items-center justify-center text-xl text-red-400 hover:ring-2 hover:ring-red-500 hover:scale-110 hover:animate-pulse transition-transform"
          >
            🗑
          </div>
        </div>
        <ItemGenerator onGenerate={generateItem} allowCustom={isMaster} />
        <div className="flex flex-wrap justify-center gap-2">
          {tokens.map(token => (
            <ItemToken
              key={token.id}
              id={token.id}
              type={token.type}
              count={token.count}
              name={token.name}
              itemId={token.itemId}
              rarity={token.rarity}
              description={token.description}
              typeLabel={token.typeLabel}
              cost={token.cost}
              costLabel={token.costLabel}
            />
          ))}
        </div>
      </div>
  );
};

Inventory.propTypes = {
  playerName: PropTypes.string,
  isMaster: PropTypes.bool,
};

export default Inventory;
