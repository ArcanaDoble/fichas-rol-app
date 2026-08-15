import React, { useMemo, useState } from 'react';
import { Activity, Dices, Minus, Plus, RotateCw, Trash2, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import DiceSvg from '../../../components/DiceSvg';
import {
  SUPPORTED_DICE_FACES,
  calculateEffectiveTotal,
  countTotalDiceInPool,
  formatDiceFormula,
} from '../dice/canvasDiceEngine';

const INITIAL_POOL = { 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0 };
const INITIAL_EXPLOSIVE = { 4: false, 6: false, 8: false, 10: false, 12: false, 20: false };

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const CanvasDiceTable = ({ combatRuntime, isPlayerView, playerName }) => {
  const [pool, setPool] = useState(INITIAL_POOL);
  const [explosiveMap, setExplosiveMap] = useState(INITIAL_EXPLOSIVE);
  const [flatModifier, setFlatModifier] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  const totalDice = useMemo(() => countTotalDiceInPool(pool), [pool]);
  const rollHistory = combatRuntime?.canvasRolls || [];

  const adjustDieCount = (faces, delta) => {
    setPool((current) => {
      const currentCount = Number(current[faces] || 0);
      const nextCount = Math.max(0, Math.min(20, currentCount + delta));
      return { ...current, [faces]: nextCount };
    });
  };

  const toggleDieExplosive = (faces) => {
    setExplosiveMap((current) => ({
      ...current,
      [faces]: !current[faces],
    }));
  };

  const clearPool = () => {
    setPool(INITIAL_POOL);
    setExplosiveMap(INITIAL_EXPLOSIVE);
    setFlatModifier(0);
  };

  const canRoll = totalDice > 0 || flatModifier !== 0;

  const handleRoll = () => {
    if (!canRoll || isRolling) return;
    setIsRolling(true);

    if (combatRuntime?.rollFreeDice) {
      combatRuntime.rollFreeDice(pool, {
        rolledBy: playerName || (isPlayerView ? 'Jugador' : 'Máster'),
        explosive: explosiveMap,
        modifier: flatModifier,
      });
    }
    setTimeout(() => setIsRolling(false), 250);
  };

  const handleRepeatRoll = (targetRoll) => {
    if (!targetRoll?.pool || countTotalDiceInPool(targetRoll.pool) === 0 || isRolling) return;
    setPool(targetRoll.pool);
    setExplosiveMap(targetRoll.explosiveMap || INITIAL_EXPLOSIVE);
    setFlatModifier(Number(targetRoll.modifier) || 0);
    setIsRolling(true);
    if (combatRuntime?.rollFreeDice) {
      combatRuntime.rollFreeDice(targetRoll.pool, {
        rolledBy: playerName || (isPlayerView ? 'Jugador' : 'Máster'),
        explosive: targetRoll.explosiveMap || INITIAL_EXPLOSIVE,
        modifier: Number(targetRoll.modifier) || 0,
      });
    }
    setTimeout(() => setIsRolling(false), 250);
  };

  return (
    <div data-testid="canvas-dice-table" className="space-y-6">
      {/* Contenedor de la reserva de dados */}
      <div className="relative rounded-2xl border border-[#c8aa6e]/30 bg-[#0b1120]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden group/board-pool">
        {/* Cabecera de la reserva */}
        <div className="relative px-4 py-3 border-b border-[#c8aa6e]/20 bg-gradient-to-r from-[#c8aa6e]/10 via-slate-900/60 to-transparent">
          <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="flex-1 min-w-0">
              <h5 className="text-[#f0e6d2] font-['Cinzel'] text-sm uppercase tracking-[0.15em] flex items-center gap-2 font-bold">
                <Dices className="w-4 h-4 text-[#c8aa6e] shrink-0" />
                <span className="truncate">Lanzar dados</span>
              </h5>
              <p className="mt-0.5 text-[9px] text-slate-400 font-light tracking-wide leading-snug">
                Tiradas manuales para situaciones, pruebas y ataques. Pulsa el dado para marcar crítico.
              </p>
            </div>
          </div>
        </div>

        {/* Rejilla de dados D4, D6, D8, D10, D12, D20 (2 columnas fijas) */}
        <div className="relative p-4 space-y-4 bg-gradient-to-b from-transparent to-black/40">
          <div className="grid grid-cols-2 gap-3">
            {SUPPORTED_DICE_FACES.map((faces) => {
              const count = Math.max(0, Number(pool[faces]) || 0);
              const isActive = count > 0;
              const isExplosive = Boolean(explosiveMap[faces]);

              return (
                <div
                  key={`dice-cell-${faces}`}
                  className={`group/die relative rounded-xl border p-3 transition-all duration-300 flex flex-col items-center justify-center ${
                    isExplosive
                      ? 'border-red-400/60 bg-gradient-to-br from-[#c8aa6e]/20 via-red-950/35 to-[#3f0f0f]/30 shadow-[0_0_24px_rgba(239,68,68,0.2)] scale-[1.02] z-10'
                      : isActive
                        ? 'border-[#c8aa6e]/60 bg-gradient-to-br from-[#c8aa6e]/20 to-[#c8aa6e]/5 shadow-[0_0_20px_rgba(200,170,110,0.15)] scale-[1.02] z-10'
                        : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  {(isActive || isExplosive) && (
                    <div
                      className={`absolute inset-0 rounded-xl animate-pulse pointer-events-none ${
                        isExplosive ? 'bg-gradient-to-br from-[#c8aa6e]/10 to-red-500/10' : 'bg-[#c8aa6e]/5'
                      }`}
                    />
                  )}

                  <div className="relative z-10 flex flex-col items-center gap-2 mb-3 w-full">
                    {/* Botón de dado: activa/desactiva crítico */}
                    <button
                      type="button"
                      onClick={() => toggleDieExplosive(faces)}
                      title={isExplosive ? `D${faces} es crítico (pulsa para quitar)` : `Pulsar para marcar D${faces} como crítico`}
                      className={`appearance-none bg-transparent border-0 p-0 outline-none focus:outline-none transition-transform duration-300 hover:scale-115 active:scale-95 ${
                        isActive ? 'scale-105' : 'group-hover/die:scale-105'
                      }`}
                    >
                      <DiceSvg
                        faces={faces}
                        value={faces === 10 ? 0 : faces}
                        className="w-10 h-10 drop-shadow-md"
                        style={{
                          borderColor: isExplosive
                            ? 'rgba(248,113,113,0.95)'
                            : isActive
                              ? 'rgba(200,170,110,1)'
                              : 'rgba(148,163,184,0.4)',
                          color: isExplosive
                            ? 'rgba(254,226,226,1)'
                            : isActive
                              ? 'rgba(240,230,210,1)'
                              : 'rgba(148,163,184,0.6)',
                          backgroundColor: isExplosive ? 'rgba(239,68,68,0.12)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      />
                    </button>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={`text-[9px] uppercase font-black tracking-[0.18em] transition-colors ${
                            isExplosive ? 'text-red-400 font-bold' : isActive ? 'text-[#c8aa6e]' : 'text-slate-500'
                          }`}
                        >
                          D{faces}
                        </span>
                        {isExplosive && (
                          <Zap size={10} className="text-red-400 fill-red-400/50" />
                        )}
                      </div>
                      <span
                        className={`text-[8px] uppercase font-semibold tracking-wider ${
                          isExplosive ? 'text-red-300/90 font-bold' : 'text-slate-600'
                        }`}
                      >
                        {isExplosive ? 'Crítico' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  {/* Controles de incremento y decremento holgados y cómodos */}
                  <div className="relative z-10 flex items-center overflow-hidden rounded-lg border border-slate-800/80 bg-black/40 backdrop-blur-sm shadow-inner w-full max-w-[105px]">
                    <button
                      type="button"
                      onClick={() => adjustDieCount(faces, -1)}
                      disabled={count === 0}
                      className="h-8 w-8 flex-shrink-0 bg-slate-900/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 active:bg-red-900/60 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center"
                      aria-label={`Quitar D${faces}`}
                    >
                      <Minus size={14} />
                    </button>

                    <div
                      data-testid={`dice-count-d${faces}`}
                      className={`h-8 flex-1 flex items-center justify-center border-x border-slate-800/80 bg-slate-950/80 font-['Cinzel'] text-sm font-bold leading-none transition-colors ${
                        isActive ? 'text-[#c8aa6e]' : 'text-slate-400'
                      }`}
                    >
                      {count}
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustDieCount(faces, 1)}
                      className="h-8 w-8 flex-shrink-0 bg-slate-900/50 text-slate-400 hover:text-[#c8aa6e] hover:bg-[#c8aa6e]/20 active:bg-[#c8aa6e]/40 active:scale-95 transition-all flex items-center justify-center"
                      aria-label={`Añadir D${faces}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modificador numérico fijo (sumado al final sin crítico) */}
          <div className="rounded-xl border border-slate-800/80 bg-[#080d16]/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#d8bf88]">
                  Modificador fijo
                </span>
                <p className="text-[8px] text-slate-500 leading-none mt-0.5">
                  Se suma al cómputo final (no aplica crítico).
                </p>
              </div>

              <div className="flex items-center gap-1">
                {flatModifier !== 0 && (
                  <button
                    type="button"
                    onClick={() => setFlatModifier(0)}
                    className="text-[8px] uppercase tracking-wider text-slate-500 hover:text-slate-300 mr-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              {/* Botón rápido −5 */}
              <button
                type="button"
                onClick={() => setFlatModifier((m) => m - 5)}
                className="h-8 px-2 rounded border border-slate-800 bg-slate-900/60 font-mono text-[10px] font-bold text-slate-400 hover:border-red-900/60 hover:bg-red-950/20 hover:text-red-300 active:scale-95 transition-all"
                aria-label="Restar 5"
              >
                −5
              </button>

              {/* Botón −1 */}
              <button
                type="button"
                onClick={() => setFlatModifier((m) => m - 1)}
                className="h-8 w-8 rounded border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white active:scale-95 transition-all"
                aria-label="Restar modificador"
              >
                <Minus size={13} />
              </button>

              {/* Valor central editable */}
              <div className="flex-1 min-w-[3.5rem] flex items-center justify-center rounded border border-[#c8aa6e]/30 bg-black/50 h-8 px-2">
                <input
                  type="number"
                  value={flatModifier}
                  onChange={(e) => setFlatModifier(Number(e.target.value) || 0)}
                  className="w-full bg-transparent text-center font-mono text-sm font-bold text-[#f0e6d2] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Valor del modificador fijo"
                />
              </div>

              {/* Botón +1 */}
              <button
                type="button"
                onClick={() => setFlatModifier((m) => m + 1)}
                className="h-8 w-8 rounded border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white active:scale-95 transition-all"
                aria-label="Sumar modificador"
              >
                <Plus size={13} />
              </button>

              {/* Botón rápido +5 */}
              <button
                type="button"
                onClick={() => setFlatModifier((m) => m + 5)}
                className="h-8 px-2 rounded border border-slate-800 bg-slate-900/60 font-mono text-[10px] font-bold text-slate-400 hover:border-[#c8aa6e]/60 hover:bg-[#c8aa6e]/15 hover:text-[#f0e3c8] active:scale-95 transition-all"
                aria-label="Sumar 5"
              >
                +5
              </button>
            </div>
          </div>

          {/* Botonera de lanzamiento */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleRoll}
              disabled={!canRoll || isRolling}
              className="group relative w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#c8aa6e] via-[#e5d59f] to-[#785a28] text-[#0b1120] font-['Cinzel'] font-bold uppercase tracking-[0.16em] text-xs shadow-[0_0_24px_rgba(200,170,110,0.3)] hover:shadow-[0_0_32px_rgba(200,170,110,0.5)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-300 overflow-hidden"
            >
              {!isRolling && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                {isRolling ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" /> Lanzando...
                  </>
                ) : (
                  <>
                    <Dices className="w-4 h-4" /> Lanzar reserva
                  </>
                )}
              </span>
            </button>

            {(totalDice > 0 || flatModifier !== 0) && (
              <button
                type="button"
                onClick={clearPool}
                className="w-full min-h-[34px] rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-400 hover:text-red-400 hover:border-red-500/60 hover:bg-red-500/10 font-bold uppercase tracking-[0.14em] text-[9px] transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} />
                Limpiar reserva
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Listado de Últimas Tiradas (Estilo BoardCards adaptado) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c8aa6e]/40" />
          <h5 className="text-[#c8aa6e] font-bold uppercase tracking-[0.25em] text-[10px] flex items-center gap-1.5 shrink-0">
            <Activity className="w-3.5 h-3.5" />
            Últimas Tiradas
          </h5>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c8aa6e]/40" />
        </div>

        {rollHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-10 border border-dashed border-slate-800/60 rounded-2xl bg-slate-950/30 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-slate-900/50 flex items-center justify-center">
              <Dices className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Sin tiradas todavía</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[8px] uppercase tracking-wider text-slate-500">
                Haz clic en un dado para anularlo o reactivarlo
              </span>
              {!isPlayerView && combatRuntime?.clearRollHistory && (
                <button
                  type="button"
                  onClick={combatRuntime.clearRollHistory}
                  className="text-[8px] uppercase tracking-wider text-slate-600 hover:text-red-400"
                >
                  Limpiar historial
                </button>
              )}
            </div>

            <AnimatePresence>
              {rollHistory.map((roll) => {
                const excludedIndexes = Array.isArray(roll.excludedRollIndexes) ? roll.excludedRollIndexes : [];
                const excludedSet = new Set(excludedIndexes);
                const effectiveTotal = roll.effectiveTotal !== undefined
                  ? roll.effectiveTotal
                  : calculateEffectiveTotal(roll);
                const hasExcluded = excludedIndexes.length > 0;
                const safeDice = Array.isArray(roll.dice) ? roll.dice : [];

                return (
                  <motion.div
                    key={roll.id}
                    initial={{ opacity: 0, y: 15, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="relative p-4 rounded-2xl border border-slate-800/60 bg-gradient-to-br from-[#0f172a]/90 to-[#020617]/90 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group hover:border-[#c8aa6e]/40 hover:shadow-[0_8px_30px_rgba(200,170,110,0.1)] transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#c8aa6e] to-[#785a28]" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#c8aa6e]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[#c8aa6e]/10 transition-colors" />

                    <div className="relative z-10 mb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="inline-block text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-[9px] font-mono font-bold uppercase tracking-wider mb-1">
                            {formatTimestamp(roll.timestamp)}
                          </div>
                          <div className="text-[#c8aa6e] text-[9px] font-bold uppercase tracking-[0.2em]">
                            Tirada
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#f0e6d2] font-['Cinzel'] text-base uppercase tracking-wider font-bold truncate">
                              {roll.rolledBy || 'Jugador'}
                            </span>
                          </div>
                        </div>

                        {/* Caja del Total */}
                        <div className="shrink-0 text-right bg-black/40 p-2.5 rounded-xl border border-slate-800/80 backdrop-blur-md min-w-[70px]">
                          <div className="text-[9px] text-slate-400 uppercase font-bold tracking-[0.2em] mb-0.5">Total</div>
                          <div className="text-[#c8aa6e] font-['Cinzel'] text-3xl font-black leading-none drop-shadow-[0_0_12px_rgba(200,170,110,0.6)]">
                            {effectiveTotal}
                          </div>
                          {hasExcluded && (
                            <div className="mt-1 text-[8px] text-red-400/70 uppercase font-mono font-bold tracking-wider">
                              Base {roll.total}
                            </div>
                          )}
                        </div>
                      </div>

                      {roll.formula && (
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <div className="w-2.5 h-[1px] bg-slate-600 mt-2 shrink-0" />
                          <div className="text-[10px] italic text-slate-400 font-light leading-relaxed truncate">
                            {roll.formula}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dados individuales interactivos */}
                    <div className="relative z-10 flex flex-wrap gap-2.5 pt-3 border-t border-slate-800/60">
                      {safeDice.map((die, index) => {
                        const isExcluded = excludedSet.has(index);
                        const isExplosiveDie = Boolean(die.explosive);
                        const isExplodedDie = Boolean(die.exploded);

                        return (
                          <button
                            type="button"
                            key={`${roll.id}-die-${index}`}
                            onClick={() => combatRuntime?.toggleRollDie && combatRuntime.toggleRollDie(roll.id, index)}
                            onMouseDown={(event) => event.preventDefault()}
                            onFocus={(event) => event.currentTarget.blur()}
                            className={`relative group/die-result border-0 bg-transparent p-0 appearance-none outline-none ring-0 focus:outline-none active:scale-95 transition-all ${
                              isExcluded ? 'opacity-40 grayscale' : ''
                            }`}
                            title={isExcluded ? 'Reactivar dado' : 'Anular dado'}
                          >
                            <div
                              className={`absolute -inset-1 rounded-full blur-md transition-opacity ${
                                isExcluded
                                  ? 'bg-red-500/25 opacity-60'
                                  : isExplosiveDie
                                    ? 'bg-gradient-to-r from-[#c8aa6e]/25 to-red-500/30 opacity-60 group-hover/die-result:opacity-100'
                                    : 'bg-[#c8aa6e]/20 opacity-0 group-hover/die-result:opacity-100'
                              }`}
                            />
                            <DiceSvg
                              faces={die.faces}
                              value={die.value}
                              className={`relative w-9 h-9 sm:w-10 sm:h-10 drop-shadow-lg transform transition-transform ${
                                isExcluded ? '' : 'group-hover/die-result:scale-110 group-hover/die-result:-translate-y-0.5'
                              }`}
                              style={{
                                borderColor: isExcluded
                                  ? 'rgba(239,68,68,0.65)'
                                  : isExplosiveDie
                                    ? 'rgba(248,113,113,0.85)'
                                    : 'rgba(200,170,110,0.7)',
                                color: isExcluded
                                  ? 'rgba(239,68,68,0.82)'
                                  : isExplosiveDie
                                    ? 'rgba(254,226,226,1)'
                                    : 'rgba(240,230,210,1)',
                                backgroundColor: isExcluded
                                  ? 'rgba(127,29,29,0.1)'
                                  : isExplosiveDie
                                    ? 'rgba(239,68,68,0.12)'
                                    : 'rgba(200,170,110,0.1)',
                              }}
                            />

                            {isExplodedDie && !isExcluded && (
                              <span className="absolute -right-1 -top-1.5 z-20 text-[13px] font-black text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.9)]">
                                +
                              </span>
                            )}

                            {isExcluded && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[125%] h-0.5 bg-red-500 rotate-45 absolute shadow-[0_0_5px_rgba(239,68,68,0.85)]" />
                                <div className="w-[125%] h-0.5 bg-red-500 -rotate-45 absolute shadow-[0_0_5px_rgba(239,68,68,0.85)]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Botón rápido para repetir esta tirada exacta */}
                    <div className="mt-3 pt-2 border-t border-slate-800/40 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRepeatRoll(roll)}
                        className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:text-[#d8bf88] transition-colors"
                      >
                        Cargar y repetir
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasDiceTable;
