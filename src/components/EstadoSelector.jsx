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
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(effects).map(([id, e]) => {
        const Icon = ICON_MAP[e.iconName] || ICON_MAP.AlertCircle;
        const active = selected.includes(id) || selected.includes(e.label);

        // Recuperar color hexadecimal (prioridad: data actual > default > fallback)
        const colorHex = e.hex || DEFAULT_STATUS_EFFECTS[id]?.hex || '#c8aa6e';

        // Colores base para inactivo (gris apagado) vs activo (color del elemento)
        const borderColor = active ? colorHex : '#334155';
        const textColor = active ? colorHex : '#64748b';

        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            style={{
              borderColor: borderColor,
              color: textColor,
              boxShadow: active ? `0 0 10px -2px ${colorHex}40` : 'none'
            }}
            className={`
                relative rounded-lg p-3 border transition-all duration-300
                flex flex-col items-center justify-center gap-2 aspect-square
                bg-[#0b1120] hover:bg-[#111827]
                ${active ? 'bg-opacity-100' : 'bg-opacity-50'}
            `}
            title={e.desc}
          >
            <Icon
              size={24}
              style={{
                filter: active ? `drop-shadow(0 0 2px ${colorHex})` : 'none'
              }}
            />
            <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">
              {e.label}
            </span>
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
