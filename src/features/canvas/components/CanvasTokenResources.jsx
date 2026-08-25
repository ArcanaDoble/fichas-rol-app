import React from 'react';
import PropTypes from 'prop-types';
import { Footprints, Gauge, Heart, Shield, Sparkles } from 'lucide-react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import LegacyTokenResources from '../../../components/TokenResources';

const RESOURCE_DEFINITIONS = [
  { id: 'vida', fallbackLabel: 'Vida', fallbackColor: '#e7a0a8', Icon: Heart },
  { id: 'cd', fallbackLabel: 'CD', fallbackColor: '#c8c6be', Icon: Shield },
  { id: 'movimiento', fallbackLabel: 'Movimiento', fallbackColor: '#86bfe2', Icon: Footprints },
  { id: 'iniciativa', fallbackLabel: 'Iniciativa', fallbackColor: '#d7b867', Icon: Gauge },
  { id: 'recurso', fallbackLabel: 'Recurso', fallbackColor: '#a77bd4', Icon: Sparkles },
];

const normalizeValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const CanvasTokenResources = ({ token, onUpdate, movementRuntime = null }) => {
  if (token?.profileType !== 'rogueliteClass' && token?.profileType !== 'rogueliteEnemy') {
    return <LegacyTokenResources token={token} onUpdate={onUpdate} />;
  }

  const updateStat = (resourceId, field, delta) => {
    const stats = token.stats || {};
    const currentStat = stats[resourceId] || { current: 0, max: 0 };
    const nextStat = {
      ...currentStat,
      current: normalizeValue(currentStat.current),
      max: normalizeValue(currentStat.max),
    };
    nextStat[field] = normalizeValue(nextStat[field] + delta);

    if (field === 'max' && nextStat.current > nextStat.max) {
      nextStat.current = nextStat.max;
    }
    if (field === 'current' && nextStat.current > nextStat.max) {
      nextStat.current = nextStat.max;
    }

    const runtimeMirror = token.profileType === 'rogueliteEnemy'
      ? {
        ...(resourceId === 'iniciativa' ? { velocidad: nextStat.current, fixedInitiative: nextStat.current } : {}),
        ...(resourceId === 'ofensiva' ? { offenseBase: nextStat.current } : {}),
      }
      : {};
    const updates = {
      stats: {
        ...stats,
        [resourceId]: nextStat,
      },
      ...runtimeMirror,
    };
    if (resourceId === 'movimiento') onUpdate(updates, { resourceId, field });
    else onUpdate(updates);
  };

  const setCurrentStat = (resourceId, value) => {
    const stats = token.stats || {};
    const currentStat = stats[resourceId] || { current: 0, max: 0 };
    const maximum = normalizeValue(currentStat.max);
    const nextCurrent = Math.min(normalizeValue(value), maximum);
    const runtimeMirror = token.profileType === 'rogueliteEnemy'
      ? {
        ...(resourceId === 'iniciativa' ? { velocidad: nextCurrent, fixedInitiative: nextCurrent } : {}),
        ...(resourceId === 'ofensiva' ? { offenseBase: nextCurrent } : {}),
      }
      : {};
    const updates = {
      stats: {
        ...stats,
        [resourceId]: {
          ...currentStat,
          current: nextCurrent,
          max: maximum,
        },
      },
      ...runtimeMirror,
    };
    if (resourceId === 'movimiento') onUpdate(updates, { resourceId, field: 'current' });
    else onUpdate(updates);
  };

  return (
    <section className="space-y-3" data-testid="roguelite-token-resources">
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
          Estadísticas de aventura
        </h4>
        <span className="text-[8px] uppercase tracking-[0.16em] text-slate-600">Editable en encuentro</span>
      </div>

      <div className="divide-y divide-slate-800/55 border-y border-slate-800/55 bg-[#0b1120]/45">
        {(token.profileType === 'rogueliteEnemy'
          ? [
            ...RESOURCE_DEFINITIONS.slice(0, 4),
            { id: 'ofensiva', fallbackLabel: 'Base ofensiva', fallbackColor: '#d68469', Icon: Gauge },
          ]
          : RESOURCE_DEFINITIONS
        ).map(({ id, fallbackLabel, fallbackColor, Icon }) => {
          const stat = token.stats?.[id] || { current: 0, max: 0 };
          const current = normalizeValue(stat.current);
          const maximum = normalizeValue(stat.max);
          const color = stat.color || fallbackColor;
          const label = stat.label || fallbackLabel;
          const movementBaseMaximum = id === 'movimiento' && movementRuntime
            ? Math.max(
              normalizeValue(movementRuntime.statMax ?? movementRuntime.base),
              normalizeValue((Number(movementRuntime.base) || 0) + (Number(movementRuntime.modifier) || 0)),
            )
            : maximum;
          const sprintExtension = id === 'movimiento'
            ? Math.min(
              normalizeValue(movementRuntime?.sprintBonus),
              Math.max(0, maximum - movementBaseMaximum),
            )
            : 0;
          const sprintStart = Math.max(0, maximum - sprintExtension);

          return (
            <div key={id} className="space-y-2.5 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon size={15} style={{ color }} aria-hidden="true" />
                  <span className="truncate font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.12em] text-[#eee5d3]">
                    {label}
                  </span>
                  <span className="font-mono text-[9px]" style={{ color }}>{current} / {maximum}</span>
                </div>

                <div className="flex shrink-0 items-center gap-1 border border-slate-700/70 bg-[#080d16]">
                  <button
                    type="button"
                    onClick={() => updateStat(id, 'max', -1)}
                    className="grid h-7 w-7 place-items-center border-r border-slate-800 text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-[#c8aa6e]"
                    aria-label={`Reducir máximo de ${label}`}
                  >
                    <FiMinus size={10} />
                  </button>
                  <span className="min-w-5 text-center font-mono text-[10px] text-[#eee5d3]" aria-label={`Máximo de ${label}: ${maximum}`}>
                    {maximum}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateStat(id, 'max', 1)}
                    className="grid h-7 w-7 place-items-center border-l border-slate-800 text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-[#c8aa6e]"
                    aria-label={`Aumentar máximo de ${label}`}
                  >
                    <FiPlus size={10} />
                  </button>
                </div>
              </div>

              {maximum === 0 ? (
                <div className="flex h-6 items-center justify-center border border-dashed border-slate-800/80 bg-black/15 text-[8px] font-bold uppercase tracking-[0.15em] text-slate-700">
                  Sin {label.toLowerCase()}
                </div>
              ) : (
                <div className="flex h-7 w-full gap-1" role="group" aria-label={`Valor actual de ${label}`}>
                  {Array.from({ length: maximum }).map((_, index) => {
                    const value = index + 1;
                    const isFilled = value <= current;
                    const isSprintMovement = sprintExtension > 0 && index >= sprintStart;
                    const segmentColor = isSprintMovement ? '#c8aa6e' : color;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCurrentStat(id, value === current ? value - 1 : value)}
                        className="min-w-0 flex-1 border transition-[background-color,border-color,opacity] duration-150 hover:opacity-100 active:scale-y-90"
                        style={{
                          backgroundColor: isFilled
                            ? segmentColor
                            : (isSprintMovement ? 'rgba(200, 170, 110, 0.16)' : 'transparent'),
                          borderColor: isFilled
                            ? segmentColor
                            : (isSprintMovement ? 'rgba(200, 170, 110, 0.5)' : '#263244'),
                          boxShadow: isFilled && isSprintMovement
                            ? '0 0 8px rgba(200, 170, 110, 0.38)'
                            : 'none',
                          opacity: isFilled ? 0.9 : (isSprintMovement ? 0.8 : 0.65),
                        }}
                        aria-label={`Fijar ${label} en ${value === current ? value - 1 : value}${isSprintMovement ? ' (Correr)' : ''}`}
                        aria-pressed={isFilled}
                        data-movement-segment={isSprintMovement ? 'sprint' : (id === 'movimiento' ? 'base' : undefined)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

CanvasTokenResources.propTypes = {
  token: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
  movementRuntime: PropTypes.object,
};

export default CanvasTokenResources;
