import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ICON_MAP, DEFAULT_STATUS_EFFECTS } from '../utils/statusEffects';

function EstadoSelector({ selected = [], onToggle }) {
  const [effects, setEffects] = useState(DEFAULT_STATUS_EFFECTS);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'status_effects_config'), (snapshot) => {
      const data = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = docSnap.data();
      });
      if (Object.keys(data).length > 0) {
        setEffects(data);
      }
    });

    return () => unsub();
  }, []);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
      {Object.entries(effects).map(([id, e]) => {
        const Icon = ICON_MAP[e.iconName] || ICON_MAP.AlertCircle;
        const colorClass = e.color || 'text-white';
        const isSelected = selected.includes(id) || selected.includes(e.label);

        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={`relative rounded-lg p-2 bg-gray-800 hover:bg-gray-700 transition flex flex-col items-center justify-center gap-1 ${isSelected ? 'ring-2 ring-[#c8aa6e] bg-[#c8aa6e]/10' : ''}`}
            title={e.desc}
          >
            <Icon className={`w-8 h-8 ${colorClass}`} />
            <span className="text-[10px] mt-1 font-bold uppercase tracking-wider text-center line-clamp-1">{e.label}</span>
          </button>
        );
      })}
    </div>
  );
}

EstadoSelector.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.string),
  onToggle: PropTypes.func.isRequired,
};

export default EstadoSelector;
export { ESTADOS } from '../utils/statusEffects';
