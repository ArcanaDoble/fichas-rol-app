import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  ICON_MAP, DEFAULT_STATUS_EFFECTS, NON_SELECTABLE_STATUS_EFFECT_IDS, mergeStatusEffectsConfig,
} from '../utils/statusEffects';

function EstadoSelector({ selected = [], onToggle, roguelite = false, allowBarrier = true }) {
  const [effects, setEffects] = useState(DEFAULT_STATUS_EFFECTS);
  const hasConmocionadoSelected = selected.includes('conmocionado') || selected.includes(DEFAULT_STATUS_EFFECTS.conmocionado?.label);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'status_effects_config'), (snapshot) => {
      const data = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = docSnap.data();
      });
      setEffects(mergeStatusEffectsConfig(data));
    });

    return () => unsub();
  }, []);

  const visibleEffects = Object.entries(effects)
    .filter(([id]) => !NON_SELECTABLE_STATUS_EFFECT_IDS.includes(id) && (allowBarrier || id !== 'barrera'))
    .map(([id, effect]) => {
      if (id === 'derribado' && hasConmocionadoSelected) {
        const conmocionadoEffect = effects.conmocionado || DEFAULT_STATUS_EFFECTS.conmocionado;
        return [
          id,
          {
            ...effect,
            ...conmocionadoEffect,
            _toggleId: 'conmocionado'
          }
        ];
      }

      return [
        id,
        {
          ...effect,
          _toggleId: id
        }
      ];
    });

  return (
    <div className="grid grid-cols-3 gap-2">
      {visibleEffects.map(([id, e]) => {
        const Icon = ICON_MAP[e.iconName] || ICON_MAP.AlertCircle;
        const toggleId = e._toggleId || id;
        const active = selected.includes(toggleId) || selected.includes(e.label);

        // Recuperar color hexadecimal (prioridad: data actual > default > fallback)
        const colorHex = e.hex || DEFAULT_STATUS_EFFECTS[toggleId]?.hex || DEFAULT_STATUS_EFFECTS[id]?.hex || '#c8aa6e';

        // Colores base para inactivo (gris apagado) vs activo (color del elemento)
        const borderColor = active ? colorHex : '#334155';
        const textColor = active ? colorHex : '#64748b';

        return (
          <button
            key={`${id}-${toggleId}`}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(toggleId)}
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
            title={roguelite && id === 'sangrado'
              ? 'Al comenzar tu activación, pierde 1 Vida o renuncia al Movimiento básico de ese turno. Puedes usar Sprint. No se acumula; termina con un Vendaje o al finalizar el combate.'
              : e.desc}
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
  allowBarrier: PropTypes.bool,
  roguelite: PropTypes.bool,
  selected: PropTypes.arrayOf(PropTypes.string),
  onToggle: PropTypes.func.isRequired,
};

export default EstadoSelector;
export { ESTADOS } from '../utils/statusEffects';
