import React from 'react';
import { Activity, RotateCw, Sparkles, Swords, Trash2 } from 'lucide-react';
import { BsDice6 } from 'react-icons/bs';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import DiceSvg from '../../../../components/DiceSvg';
import { CombatTraitLine, EMPUJE_EFFECT_LABEL, RALENTIZADO_EFFECT_LABEL, fixMojibakeText, isCombatDieEvaded } from '../../legacyCombatRules';

export const CombatLogPanel = ({
    BOARD_DICE_ROLL_SIDES,
    activeTab,
    adjustBoardDiceCount,
    boardDiceExplosive,
    boardDicePool,
    boardDiceRollLog,
    clearBoardDicePool,
    combatLog,
    isBoardMode,
    isRollingBoardDice,
    rollBoardDicePool,
    toggleBoardDiceExplosive,
    toggleBoardDiceRollDie,
}) => (
    activeTab === 'COMBAT_LOG' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {/* Header Registro */}
                                        <div className="flex flex-col items-center text-center gap-4 border-b border-slate-800/50 py-10 -mt-6 -mx-6 bg-gradient-to-b from-slate-900/20 to-transparent">
                                            <div className="w-16 h-16 rounded-xl bg-[#0b1120] border border-slate-800 flex items-center justify-center text-[#c8aa6e] shadow-2xl relative ring-1 ring-slate-800/40">
                                                {isBoardMode ? (
                                                    <BsDice6 className="w-8 h-8 drop-shadow-[0_0_8px_rgba(200,170,110,0.4)]" />
                                                ) : (
                                                    <Swords className="w-8 h-8 drop-shadow-[0_0_8px_rgba(200,170,110,0.4)]" />
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <h4 className="text-[#f0e6d2] font-fantasy text-2xl tracking-widest uppercase drop-shadow-lg leading-none">
                                                    Registro
                                                </h4>
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="h-[1px] w-4 bg-gradient-to-r from-transparent to-[#c8aa6e]/40" />
                                                    <span className="text-[10px] text-[#c8aa6e]/60 uppercase font-black tracking-[0.25em]">
                                                        {isBoardMode ? 'Tiradas de Tablero' : 'Combate & Dados'}
                                                    </span>
                                                    <div className="h-[1px] w-4 bg-gradient-to-l from-transparent to-[#c8aa6e]/40" />
                                                </div>
                                            </div>
                                        </div>

                                        {isBoardMode && (
                                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="relative rounded-2xl border border-[#c8aa6e]/30 bg-[#0b1120]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden group/board-pool">
                                                    <div className="absolute -inset-1 bg-gradient-to-r from-[#c8aa6e]/0 via-[#c8aa6e]/10 to-[#c8aa6e]/0 opacity-0 group-hover/board-pool:opacity-100 transition-opacity duration-1000 blur-xl"></div>
                                                    
                                                    <div className="relative px-4 py-3 border-b border-[#c8aa6e]/20 bg-gradient-to-r from-[#c8aa6e]/10 via-slate-900/60 to-transparent">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c8aa6e]/20 blur-3xl rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover/board-pool:scale-150"></div>
                                                        <div className="flex items-center justify-between gap-2 relative z-10">
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="text-[#f0e6d2] font-fantasy text-sm uppercase tracking-[0.15em] flex items-center gap-1.5">
                                                                    <Sparkles className="w-3.5 h-3.5 text-[#c8aa6e] shrink-0" />
                                                                    <span className="truncate">Lanzar dados</span>
                                                                </h5>
                                                                <p className="mt-0.5 text-[9px] text-slate-400 font-light tracking-wide leading-snug">Reserva compartida para tiradas rápidas del tablero.</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="relative p-4 space-y-5 bg-gradient-to-b from-transparent to-black/40">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {BOARD_DICE_ROLL_SIDES.map((sides) => {
                                                                const count = Math.max(0, Number(boardDicePool[sides]) || 0);
                                                                const isActive = count > 0;
                                                                const isExplosive = !!boardDiceExplosive[sides];
                                                                return (
                                                                    <div
                                                                        key={`board-dice-roll-${sides}`}
                                                                        className={`group/die relative rounded-xl border p-3 transition-all duration-300 flex flex-col items-center justify-center ${isExplosive ? 'border-red-400/60 bg-gradient-to-br from-[#c8aa6e]/20 via-red-950/35 to-[#3f0f0f]/30 shadow-[0_0_26px_rgba(239,68,68,0.18)] scale-[1.02] z-10' : isActive ? 'border-[#c8aa6e]/60 bg-gradient-to-br from-[#c8aa6e]/20 to-[#c8aa6e]/5 shadow-[0_0_20px_rgba(200,170,110,0.15)] scale-[1.02] z-10' : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/80 hover:border-slate-700'}`}
                                                                    >
                                                                        {(isActive || isExplosive) && <div className={`absolute inset-0 rounded-xl animate-pulse ${isExplosive ? 'bg-gradient-to-br from-[#c8aa6e]/10 to-red-500/10' : 'bg-[#c8aa6e]/5'}`} />}
                                                                        <div className="relative z-10 flex flex-col items-center gap-2 mb-3">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleBoardDiceExplosive(sides)}
                                                                                title={isExplosive ? 'Quitar crítico' : 'Marcar como crítico'}
                                                                                className={`appearance-none bg-transparent border-0 p-0 outline-none focus:outline-none transition-transform duration-300 hover:scale-125 active:scale-95 ${isActive ? 'scale-110' : 'group-hover/die:scale-105'}`}
                                                                            >
                                                                                <DiceSvg
                                                                                    faces={sides}
                                                                                    value={sides === 10 ? 0 : sides}
                                                                                    className="w-10 h-10 drop-shadow-md"
                                                                                    style={{
                                                                                        borderColor: isExplosive ? 'rgba(248,113,113,0.95)' : isActive ? 'rgba(200,170,110,1)' : 'rgba(148,163,184,0.4)',
                                                                                        color: isExplosive ? 'rgba(254,226,226,1)' : isActive ? 'rgba(240,230,210,1)' : 'rgba(148,163,184,0.6)',
                                                                                        backgroundColor: isExplosive ? 'rgba(239,68,68,0.08)' : 'transparent',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                />
                                                                            </button>
                                                                            <div className="text-center">
                                                                                <div className={`text-[9px] uppercase font-black tracking-[0.2em] mb-0.5 transition-colors ${isExplosive ? 'text-red-300' : isActive ? 'text-[#c8aa6e]' : 'text-slate-500'}`}>D{sides}</div>
                                                                                <div className={`font-fantasy text-xl leading-none transition-colors ${isExplosive ? 'text-[#f0e6d2] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : isActive ? 'text-[#f0e6d2] drop-shadow-[0_0_8px_rgba(200,170,110,0.8)]' : 'text-slate-600'}`}>{count}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="relative z-10 flex items-center overflow-hidden rounded-lg border border-slate-800/80 bg-black/40 backdrop-blur-sm shadow-inner w-full max-w-[100px]">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => adjustBoardDiceCount(sides, -1)}
                                                                                className="h-8 w-8 flex-shrink-0 bg-slate-900/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 active:bg-red-900/60 active:scale-95 transition-all flex items-center justify-center group-hover/die:bg-slate-800/80"
                                                                                aria-label={`Quitar D${sides}`}
                                                                            >
                                                                                <FiMinus className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <div className={`h-8 flex-1 flex items-center justify-center border-x border-slate-800/80 bg-slate-950/80 font-fantasy text-base leading-none transition-colors ${isActive ? 'text-[#c8aa6e]' : 'text-slate-400'}`}>
                                                                                {count}
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => adjustBoardDiceCount(sides, 1)}
                                                                                className="h-8 w-8 flex-shrink-0 bg-slate-900/50 text-slate-400 hover:text-[#c8aa6e] hover:bg-[#c8aa6e]/20 active:bg-[#c8aa6e]/40 active:scale-95 transition-all flex items-center justify-center group-hover/die:bg-slate-800/80"
                                                                                aria-label={`Añadir D${sides}`}
                                                                            >
                                                                                <FiPlus className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="flex flex-col gap-3 pt-2">
                                                            <button
                                                                type="button"
                                                                onClick={rollBoardDicePool}
                                                                disabled={isRollingBoardDice}
                                                                className="group relative w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#c8aa6e] via-[#e5d59f] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-[0.15em] text-sm shadow-[0_0_24px_rgba(200,170,110,0.3)] hover:shadow-[0_0_32px_rgba(200,170,110,0.5)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-300 overflow-hidden"
                                                            >
                                                                {!isRollingBoardDice && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>}
                                                                <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                                                                    {isRollingBoardDice ? (
                                                                        <>
                                                                            <RotateCw className="w-4 h-4 animate-spin" /> Lanzando...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <BsDice6 className="w-4 h-4" /> Lanzar reserva
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={clearBoardDicePool}
                                                                className="w-full min-h-[40px] rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-400 hover:text-red-400 hover:border-red-500/60 hover:bg-red-500/10 font-bold uppercase tracking-[0.15em] text-[10px] transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Limpiar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c8aa6e]/40" />
                                                        <h5 className="text-[#c8aa6e] font-bold uppercase tracking-[0.3em] text-[11px] flex items-center gap-2 shrink-0">
                                                            <Activity className="w-4 h-4" />
                                                            Últimas Tiradas
                                                        </h5>
                                                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c8aa6e]/40" />
                                                    </div>

                                                    {boardDiceRollLog.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center text-center gap-4 py-14 border border-dashed border-slate-800/60 rounded-2xl bg-slate-950/30 backdrop-blur-sm">
                                                            <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center mb-2">
                                                                <BsDice6 className="w-8 h-8 text-slate-600" />
                                                            </div>
                                                            <p className="text-slate-500 text-[11px] uppercase font-bold tracking-[0.4em]">Sin tiradas todavía</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <AnimatePresence>
                                                                {boardDiceRollLog.map((roll) => {
                                                                    const rollTime = roll.timestamp?.seconds
                                                                        ? new Date(roll.timestamp.seconds * 1000)
                                                                        : new Date(roll.clientTimestamp || Date.now());
                                                                    const poolLabel = Array.isArray(roll.pool)
                                                                        ? roll.pool.map(entry => `${entry.count}D${entry.sides}${entry.explosive ? ' crítico' : ''}`).join(' · ')
                                                                        : '';
                                                                    const safeRolls = Array.isArray(roll.rolls) ? roll.rolls : [];
                                                                    const excludedRollIndexes = Array.isArray(roll.excludedRollIndexes)
                                                                        ? roll.excludedRollIndexes.filter(index => Number.isInteger(index))
                                                                        : [];
                                                                    const excludedRollIndexSet = new globalThis.Set(excludedRollIndexes);
                                                                    const effectiveTotal = safeRolls.reduce((sum, die, index) => (
                                                                        excludedRollIndexSet.has(index) ? sum : sum + (Number(die.value) || 0)
                                                                    ), 0);
                                                                    const hasExcludedRolls = excludedRollIndexes.length > 0;
                                                                    return (
                                                                        <motion.div
                                                                            key={roll.id}
                                                                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                                                            className="relative p-5 rounded-2xl border border-slate-800/50 bg-gradient-to-br from-[#0f172a]/90 to-[#020617]/90 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group hover:border-[#c8aa6e]/40 hover:shadow-[0_8px_30px_rgba(200,170,110,0.1)] transition-all duration-300 overflow-hidden"
                                                                        >
                                                                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#c8aa6e] to-[#785a28]" />
                                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c8aa6e]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[#c8aa6e]/10 transition-colors" />
                                                                            
                                                                            <div className="relative z-10 mb-4">
                                                                                <div className="flex items-start justify-between gap-4">
                                                                                    <div className="space-y-2 min-w-0 flex-1">
                                                                                        <div className="inline-block text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                                                                            {rollTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                        </div>
                                                                                        <div className="text-[#c8aa6e] text-[10px] font-black uppercase tracking-[0.25em] mb-1">
                                                                                            Tirada
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[#f0e6d2] font-fantasy text-xl uppercase tracking-widest drop-shadow-sm">{fixMojibakeText(roll.rollerName || 'Jugador')}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="shrink-0 text-right bg-black/40 p-3 rounded-xl border border-slate-800/80 backdrop-blur-md min-w-[80px]">
                                                                                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em] mb-1">Total</div>
                                                                                        <div className="text-[#c8aa6e] font-fantasy text-4xl leading-none drop-shadow-[0_0_12px_rgba(200,170,110,0.6)]">{effectiveTotal}</div>
                                                                                        {hasExcludedRolls && (
                                                                                            <div className="mt-1 text-[8px] text-red-400/70 uppercase font-black tracking-[0.18em]">
                                                                                                Base {Number(roll.total) || 0}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {poolLabel && (
                                                                                    <div className="mt-2 flex items-start gap-2">
                                                                                        <div className="w-3 h-[1px] bg-slate-600 mt-2 shrink-0"></div>
                                                                                        <div className="text-[11px] italic text-slate-400 font-light leading-relaxed">
                                                                                            {poolLabel}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="relative z-10 flex flex-wrap gap-3 pt-4 border-t border-slate-800/60">
                                                                                {safeRolls.map((die, index) => {
                                                                                    const isExcluded = excludedRollIndexSet.has(index);
                                                                                    const isExplosiveDie = !!die.explosive;
                                                                                    const isExplodedDie = !!die.exploded;
                                                                                    const displayValue = die.displayValue ?? die.value;
                                                                                    return (
                                                                                        <button
                                                                                            type="button"
                                                                                            key={`${roll.id}-${index}`}
                                                                                            onClick={() => toggleBoardDiceRollDie(roll, index)}
                                                                                            onMouseDown={(event) => event.preventDefault()}
                                                                                            onFocus={(event) => event.currentTarget.blur()}
                                                                                            className={`relative group/die-result border-0 bg-transparent p-0 appearance-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 active:scale-95 transition-all ${isExcluded ? 'opacity-45 grayscale' : ''}`}
                                                                                            style={{
                                                                                                WebkitTapHighlightColor: 'transparent',
                                                                                                outline: 'none',
                                                                                                boxShadow: 'none',
                                                                                                touchAction: 'manipulation',
                                                                                            }}
                                                                                            title={isExcluded ? 'Reactivar dado' : 'Anular dado'}
                                                                                        >
                                                                                            <div className={`absolute -inset-1 rounded-full blur-md transition-opacity ${isExcluded ? 'bg-red-500/25 opacity-60' : isExplosiveDie ? 'bg-gradient-to-r from-[#c8aa6e]/25 to-red-500/30 opacity-60 group-hover/die-result:opacity-100' : 'bg-[#c8aa6e]/20 opacity-0 group-hover/die-result:opacity-100'}`} />
                                                                                            <DiceSvg
                                                                                                faces={die.sides}
                                                                                                value={displayValue}
                                                                                                className={`relative w-10 h-10 sm:w-11 sm:h-11 drop-shadow-lg transform transition-transform ${isExcluded ? '' : 'group-hover/die-result:scale-110 group-hover/die-result:-translate-y-1'}`}
                                                                                                style={{
                                                                                                    borderColor: isExcluded ? 'rgba(239,68,68,0.65)' : isExplosiveDie ? 'rgba(248,113,113,0.72)' : 'rgba(200,170,110,0.7)',
                                                                                                    color: isExcluded ? 'rgba(239,68,68,0.82)' : isExplosiveDie ? 'rgba(254,226,226,1)' : 'rgba(240,230,210,1)',
                                                                                                    backgroundColor: isExcluded ? 'rgba(127,29,29,0.1)' : isExplosiveDie ? 'rgba(239,68,68,0.09)' : 'rgba(200,170,110,0.1)'
                                                                                                }}
                                                                                            />
                                                                                            {isExplodedDie && !isExcluded && (
                                                                                                <span className="absolute -right-0.5 -top-1.5 z-20 text-[14px] font-black text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.9)]">
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
                                                                        </motion.div>
                                                                    );
                                                                })}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Listado de Combate */}
                                        {!isBoardMode && (
                                        <div className="space-y-6">
                                            {combatLog.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center text-center gap-3 py-16 opacity-30">
                                                    <Swords className="w-12 h-12 text-slate-600 mb-2" />
                                                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Sin registros</p>
                                                </div>
                                            ) : (
                                                combatLog.map((entry) => {
                                                    const isCounter = entry.reactionType === 'parar' && entry.counterDamage > 0;
                                                    const isCounterPreventedByRange = entry.reactionType === 'parar' && entry.counterPreventedByRange;
                                                    const isPerfect = entry.reactionType === 'parar' && entry.damage === 0 && !isCounter && !isCounterPreventedByRange;
                                                    const totalBlocks = (entry.blocksLost?.postura || 0) + (entry.blocksLost?.armadura || 0) + (entry.blocksLost?.vida || 0);
                                                    const traitPosturaBonus = entry.traitBonuses?.postura?.blocks || 0;
                                                    const traitArmaduraBonus = entry.traitBonuses?.armadura?.blocks || 0;
                                                    const traitVidaBonus = entry.traitBonuses?.vida?.blocks || 0;
                                                    const basePosturaLost = entry.baseBlocksLost
                                                        ? entry.baseBlocksLost.postura || 0
                                                        : Math.max(0, (entry.blocksLost?.postura || 0) - traitPosturaBonus);
                                                    const baseArmaduraLost = entry.baseBlocksLost
                                                        ? entry.baseBlocksLost.armadura || 0
                                                        : Math.max(0, (entry.blocksLost?.armadura || 0) - traitArmaduraBonus);
                                                    const baseVidaLost = entry.baseBlocksLost
                                                        ? entry.baseBlocksLost.vida || 0
                                                        : Math.max(0, (entry.blocksLost?.vida || 0) - traitVidaBonus);
                                                    const speedEffectBadges = [
                                                        ...(Array.isArray(entry.speedEffectsApplied?.target)
                                                            ? entry.speedEffectsApplied.target.map((effect) => ({
                                                                ...effect,
                                                                sideLabel: effect.tokenName || entry.targetName || 'Objetivo'
                                                            }))
                                                            : []),
                                                        ...(Array.isArray(entry.speedEffectsApplied?.attacker)
                                                            ? entry.speedEffectsApplied.attacker.map((effect) => ({
                                                                ...effect,
                                                                sideLabel: effect.tokenName || entry.attackerName || 'Atacante'
                                                            }))
                                                            : [])
                                                    ].filter((effect) => Number(effect?.delta) > 0);
                                                    const pushEffectBadges = [
                                                        ...(Array.isArray(entry.pushEffectsApplied?.target)
                                                            ? entry.pushEffectsApplied.target.map((effect) => ({
                                                                ...effect,
                                                                sideLabel: effect.tokenName || entry.targetName || 'Objetivo'
                                                            }))
                                                            : []),
                                                        ...(Array.isArray(entry.pushEffectsApplied?.attacker)
                                                            ? entry.pushEffectsApplied.attacker.map((effect) => ({
                                                                ...effect,
                                                                sideLabel: effect.tokenName || entry.attackerName || 'Atacante'
                                                            }))
                                                            : [])
                                                    ];

                                                    const accentColor = entry.reactionType === 'evadir' ? '#eab308' :
                                                        entry.reactionType === 'parar' ? '#3b82f6' : '#ef4444';
                                                    const attackerName = fixMojibakeText(entry.attackerName);
                                                    const targetName = fixMojibakeText(entry.targetName);
                                                    const weaponName = fixMojibakeText(entry.weaponName);
                                                    const abilityName = fixMojibakeText(entry.abilityName);
                                                    const attackSourceLabel = fixMojibakeText(entry.attackSourceLabel);
                                                    const defenderWeapon = fixMojibakeText(entry.defenderWeapon || 'su arma');

                                                    return (
                                                        <motion.div
                                                            key={entry.id}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="relative pl-6 py-1 space-y-4 group"
                                                        >
                                                            {/* Accent Line Premium */}
                                                            <div
                                                                className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full transition-all group-hover:w-[3px]"
                                                                style={{ 
                                                                    backgroundColor: accentColor,
                                                                    boxShadow: `0 0 10px ${accentColor}40`
                                                                }}
                                                            />

                                                            {/* Header Row */}
                                                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-slate-600 opacity-60">
                                                                        {new Date(entry.timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }} />
                                                                    <span style={{ color: accentColor }} className="opacity-80">
                                                                        Resolución de Ataque
                                                                    </span>
                                                                </div>
                                                                <div className="p-1 rounded bg-slate-900/40 border border-slate-800/50 text-slate-500">
                                                                    <Swords className="w-3 h-3" />
                                                                </div>
                                                            </div>

                                                            {/* Main Text */}
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                    <span className="text-red-400 font-fantasy text-base uppercase tracking-widest drop-shadow-sm">{attackerName}</span>
                                                                    <div className="flex items-center gap-1 opacity-40">
                                                                        <div className="w-1 h-[1px] bg-slate-500" />
                                                                        <span className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em]">Vs</span>
                                                                        <div className="w-1 h-[1px] bg-slate-500" />
                                                                    </div>
                                                                    <span className="text-blue-400 font-fantasy text-base uppercase tracking-widest drop-shadow-sm">{targetName}</span>
                                                                </div>

                                                                {(entry.weaponName || entry.abilityName) && (
                                                                    <div className="flex items-center gap-2 py-0.5 px-2 rounded bg-white/5 border border-white/5 w-fit">
                                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">
                                                                            {entry.attackMode === 'barrido'
                                                                                ? `${abilityName || 'barrido'}${attackSourceLabel ? ` · ${attackSourceLabel}` : ''}`
                                                                                : weaponName}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <CombatTraitLine
                                                                    label="Ataque"
                                                                    traits={entry.attackTraits}
                                                                    accent="red"
                                                                />
                                                            </div>

                                                            {/* Results Section */}
                                                            <div className="space-y-3 border-y border-slate-900/50 py-3">
                                                                <div className="flex items-center gap-4 px-1">
                                                                    <div className="flex gap-1.5">
                                                                        {(entry.attackerDice || []).map((die, i) => {
                                                                            const wasEvaded = isCombatDieEvaded(die, entry.evadedDiceIds);
                                                                            const matchedAttr = typeof die.matchedAttr === 'string' ? die.matchedAttr.trim().toLowerCase() : null;

                                                                            const attrColorMap = {
                                                                                destreza: { color: '#4ade80' },
                                                                                intelecto: { color: '#60a5fa' },
                                                                                voluntad: { color: '#c084fc' },
                                                                                vigor: { color: '#f87171' },
                                                                            };

                                                                            const attrStyle = (!wasEvaded && matchedAttr && attrColorMap[matchedAttr]) ? attrColorMap[matchedAttr] : null;

                                                                            if (wasEvaded) {
                                                                                return (
                                                                                    <div key={i} className="relative flex-shrink-0" title={die.critical ? "Dado Crítico (Evadido)" : matchedAttr ? `Dado de ${matchedAttr.charAt(0).toUpperCase() + matchedAttr.slice(1)} (Evadido)` : "Dado de Arma (Evadido)"}>
                                                                                        <DiceSvg faces={die.faces} value={die.value} className="w-5 h-5 opacity-40 grayscale" style={{ borderColor: 'rgba(153,27,27,0.3)', color: 'rgba(153,27,27,0.6)' }} />
                                                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                                                                            <div className="w-full h-[1.5px] bg-red-600 rounded-full rotate-[-45deg] opacity-70"></div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <div key={i} className="flex-shrink-0 focus:outline-none" title={die.critical ? "Dado Crítico" : matchedAttr ? `Dado de ${matchedAttr.charAt(0).toUpperCase() + matchedAttr.slice(1)}` : "Dado de Arma"}>
                                                                                    <DiceSvg faces={die.faces} value={die.value}
                                                                                        className={`w-5 h-5 ${die.critical ? 'drop-shadow-[0_0_6px_rgba(234,88,12,0.3)]' : 'drop-shadow-sm'}`}
                                                                                        style={die.critical ? {
                                                                                            borderColor: '#ea580c',
                                                                                            color: '#ea580c',
                                                                                            backgroundColor: 'rgba(234, 88, 12, 0.1)'
                                                                                        } : attrStyle ? {
                                                                                            backgroundColor: 'transparent',
                                                                                            borderColor: attrStyle.color,
                                                                                            color: attrStyle.color,
                                                                                        } : {
                                                                                            borderColor: 'rgba(200,170,110,0.3)',
                                                                                            color: 'rgba(200,170,110,0.9)',
                                                                                            backgroundColor: 'transparent',
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <div className="h-4 w-[1px] bg-slate-800" />
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest opacity-60">Poder</span>
                                                                        <span className="text-[#f0e6d2] text-xs font-black">{entry.effectiveAttackTotal ?? entry.attackTotal}</span>
                                                                    </div>
                                                                </div>

                                                                 {entry.reactionType === 'parar' && entry.defenderDice && (
                                                                     <div className="flex items-center gap-4 px-1 border-t border-slate-900/30 pt-3">
                                                                         <div className="flex gap-1.5">
                                                                             {entry.defenderDice.map((die, i) => {
                                                                                const matchedAttr = typeof die.matchedAttr === 'string' ? die.matchedAttr.trim().toLowerCase() : null;
                                                                                const wasEludedByElusion = !!die.eludedByElusion || !!die.elusionRemoved || entry.elusionEffect?.dieId === die.id;
                                                                                const attrColorMap = {
                                                                                    destreza: { color: '#4ade80' },
                                                                                    intelecto: { color: '#60a5fa' },
                                                                                    voluntad: { color: '#c084fc' },
                                                                                    vigor: { color: '#f87171' },
                                                                                };
                                                                                const attrStyle = matchedAttr && attrColorMap[matchedAttr] ? attrColorMap[matchedAttr] : null;

                                                                                return (
                                                                                    <div
                                                                                        key={i}
                                                                                        className={`relative flex-shrink-0 ${wasEludedByElusion ? 'opacity-45 grayscale' : ''}`}
                                                                                        title={wasEludedByElusion ? `Dado retirado por Elusión (${die.value})` : die.critical ? "Dado Crítico" : matchedAttr ? `Dado de ${matchedAttr.charAt(0).toUpperCase() + matchedAttr.slice(1)}` : "Dado de Arma"}
                                                                                    >
                                                                                        <DiceSvg faces={die.faces} value={die.value}
                                                                                            className={`w-5 h-5 ${die.critical ? 'drop-shadow-[0_0_6px_rgba(234,88,12,0.3)]' : 'drop-shadow-sm'}`}
                                                                                            style={die.critical ? {
                                                                                                borderColor: '#ea580c',
                                                                                                color: '#ea580c',
                                                                                                backgroundColor: 'rgba(234, 88, 12, 0.15)'
                                                                                            } : attrStyle ? {
                                                                                                backgroundColor: 'transparent',
                                                                                                borderColor: attrStyle.color,
                                                                                                color: attrStyle.color,
                                                                                            } : {
                                                                                                borderColor: 'rgba(96,165,250,0.3)',
                                                                                                color: 'rgba(96,165,250,0.9)',
                                                                                                backgroundColor: 'transparent',
                                                                                            }}
                                                                                        />
                                                                                        {wasEludedByElusion && (
                                                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                                                <div className="w-[125%] h-0.5 bg-cyan-300 rotate-45 absolute shadow-[0_0_5px_rgba(103,232,249,0.8)]"></div>
                                                                                                <div className="w-[125%] h-0.5 bg-cyan-300 -rotate-45 absolute shadow-[0_0_5px_rgba(103,232,249,0.8)]"></div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                         </div>
                                                                         <div className="h-4 w-[1px] bg-slate-800" />
                                                                          <div className="flex items-center gap-1.5">
                                                                              <span className="text-[9px] text-blue-500/60 uppercase font-black tracking-widest opacity-60">Bloqueo</span>
                                                                              <span className="text-blue-400 text-xs font-black">{entry.defenderTotal}</span>
                                                                          </div>
                                                                      </div>
                                                                 )}
                                                                 <CombatTraitLine
                                                                     label="Parada"
                                                                     traits={entry.reactionType === 'parar' ? entry.defenderTraits : []}
                                                                     accent="blue"
                                                                 />
                                                            </div>

                                                            {/* Reaction Descriptive Text */}
                                                            <div className="px-1 text-[11px] leading-relaxed">
                                                                {entry.reactionType === 'evadir' && (
                                                                    <p className="text-slate-300">
                                                                        <span className="text-yellow-500/80 mr-1.5 italic font-bold uppercase text-[9px] tracking-wider">Evasión</span>
                                                                        Evadió {(entry.evadedDiceIds || []).length} dados e impactó con <span className="text-white font-bold">{entry.finalDamage}</span> de daño.
                                                                    </p>
                                                                )}
                                                                {entry.reactionType === 'parar' && (
                                                                    <p className="text-slate-300">
                                                                        <span className="text-blue-400/80 mr-1.5 italic font-bold uppercase text-[9px] tracking-wider">Parada</span>
                                                                        {entry.elusionEffect ? <span className="text-cyan-300 font-bold">Elusión retiró el dado {entry.elusionEffect.value}. </span> : null}
                                                                        {isPerfect ? `Desvió completamente el ataque con ${defenderWeapon}.` :
                                                                            isCounter ? `Devolvió ${entry.counterDamage} de daño al atacante con ${defenderWeapon}.` :
                                                                                isCounterPreventedByRange ? `Desvió el ataque con ${defenderWeapon}, pero no alcanza la distancia real para devolver el golpe.` :
                                                                                `Parada parcial con ${defenderWeapon}, recibió ${entry.finalDamage} de daño.`}
                                                                    </p>
                                                                )}
                                                                {entry.reactionType === 'recibir' && (
                                                                    <p className="text-slate-400">
                                                                        <span className="text-red-500/80 mr-1.5 italic font-bold uppercase text-[9px] tracking-wider">Impacto</span>
                                                                        Recibió el golpe de lleno por <span className="text-white font-bold">{entry.finalDamage}</span> de daño.
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Damage Badges */}
                                                            {totalBlocks > 0 ? (
                                                                <div className="flex flex-wrap gap-2 px-1 pt-1 opacity-80">
                                                                    {basePosturaLost > 0 && <span className="text-[9px] text-emerald-500/80 border-b border-emerald-900/40 pb-0.5">-{basePosturaLost} Postura</span>}
                                                                    {traitPosturaBonus > 0 && <span className="text-[9px] text-green-300 border-b border-green-500/40 pb-0.5">-{traitPosturaBonus} Postura</span>}
                                                                    {baseArmaduraLost > 0 && <span className="text-[9px] text-slate-400/80 border-b border-slate-800/40 pb-0.5">-{baseArmaduraLost} Armadura</span>}
                                                                    {traitArmaduraBonus > 0 && <span className="text-[9px] text-slate-300 border-b border-slate-400/50 pb-0.5">-{traitArmaduraBonus} Armadura</span>}
                                                                    {baseVidaLost > 0 && <span className="text-[9px] text-red-500/80 border-b border-red-900/40 pb-0.5">-{baseVidaLost} Vida</span>}
                                                                    {traitVidaBonus > 0 && <span className="text-[9px] text-amber-300 border-b border-amber-500/40 pb-0.5">-{traitVidaBonus} Vida</span>}
                                                                </div>
                                                            ) : totalBlocks === 0 && entry.reactionType !== 'parar' && (
                                                                <div className="px-1 pt-1 italic text-[9px] text-green-500/50 tracking-wider font-bold uppercase">Sin daño a bloques</div>
                                                            )}
                                                            {speedEffectBadges.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 px-1 pt-1">
                                                                    {speedEffectBadges.map((effect, idx) => (
                                                                        <span
                                                                            key={`${entry.id}-speed-${idx}`}
                                                                            className="text-[9px] text-amber-300 border-b border-amber-400/40 pb-0.5"
                                                                            title={`${effect.label || RALENTIZADO_EFFECT_LABEL}: +${effect.delta} velocidad para ${effect.sideLabel}`}
                                                                        >
                                                                            +{effect.delta} Velocidad · {effect.label || RALENTIZADO_EFFECT_LABEL}
                                                                            {effect.sideLabel ? ` (${effect.sideLabel})` : ''}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {pushEffectBadges.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 px-1 pt-1">
                                                                    {pushEffectBadges.map((effect, idx) => (
                                                                        <span
                                                                            key={`${entry.id}-push-${idx}`}
                                                                            className={`text-[9px] border-b pb-0.5 ${effect.applied ? 'text-sky-300 border-sky-400/40' : 'text-slate-500 border-slate-700/50'}`}
                                                                            title={effect.applied ? `${EMPUJE_EFFECT_LABEL}: ${effect.sideLabel} se desplaza 1 casilla` : `${EMPUJE_EFFECT_LABEL} bloqueado: ${effect.reason || 'sin desplazamiento'}`}
                                                                        >                                                                            {effect.applied ? `1 Casilla · ${effect.label || EMPUJE_EFFECT_LABEL}` : `${effect.label || EMPUJE_EFFECT_LABEL} bloqueado`}
                                                                            {effect.sideLabel ? ` (${effect.sideLabel})` : ''}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        )}
                                    </div>
                                )
);
