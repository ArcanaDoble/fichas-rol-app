import React, { useState, useMemo } from 'react';
import { Shield, FastForward, Sword, Zap, X } from 'lucide-react';
import { getSpeedConsumption, rollAttack } from '../utils/combatSystem';

const CombatReactionModal = ({ event, targetToken, onReact }) => {
    const [selectedDiceIndices, setSelectedDiceIndices] = useState([]);
    const [reactionType, setReactionType] = useState(null); // 'evadir', 'parar', 'recibir'
    const [selectedWeapon, setSelectedWeapon] = useState('');

    // Extraer dados del atacante (manteniendo individualidad de los críticos)
    const attackerDice = useMemo(() => {
        if (!event?.attackerRollResult?.details) return [];
        const dice = [];
        event.attackerRollResult.details.forEach((detail, detailIdx) => {
            if (detail.type === 'dice') {
                detail.rolls.forEach((r, idx) => {
                    const isCrit = typeof r === 'object' && r.critical;
                    dice.push({
                        value: typeof r === 'object' ? r.value : r,
                        matchedAttr: detail.matchedAttr || null,
                        detailIdx,
                        rollIdx: idx,
                        isCrit,
                        id: `${detailIdx}-${idx}`
                    });
                });
            } else if (detail.matchedAttr && (detail.type === 'calc' || detail.type === 'modifier')) {
                // Attribute dice that arrived as calc/modifier (legacy "d6" → 6 issue)
                dice.push({
                    value: detail.value || detail.total || 0,
                    matchedAttr: detail.matchedAttr,
                    detailIdx,
                    rollIdx: 0,
                    isCrit: false,
                    id: `${detailIdx}-0`
                });
            }
        });

        // Ordenar: 1º Arma Base, 2º Críticos, 3º Atributos
        return dice.sort((a, b) => {
            const rankA = a.isCrit ? 1 : a.matchedAttr ? 2 : 0;
            const rankB = b.isCrit ? 1 : b.matchedAttr ? 2 : 0;
            return rankA - rankB;
        });
    }, [event]);

    const yellowSpeed = targetToken?.velocidad ?? 0;

    // Asumimos que podemos acceder al atacante por event.attackerToken (si se pasara),
    // pero la diferencia de velocidad se calcula con la velocidad de ambos.
    // Necesitamos que el evento nos pase la diffVelocidad o las velocidades.
    const diffVelocidad = event?.diffVelocidad ?? 0;
    const canEvade = diffVelocidad <= 1;

    const weapons = useMemo(() => {
        return (targetToken?.equippedItems || []).filter(i => i.type === 'weapon');
    }, [targetToken]);

    const toggleDie = (dieId) => {
        setSelectedDiceIndices(prev =>
            prev.includes(dieId) ? prev.filter(id => id !== dieId) : [...prev, dieId]
        );
    };

    const getWeaponId = (w, idx) => `${w.nombre || w.name || 'Arma'}-${idx}`;

    const handleConfirm = () => {
        if (reactionType === 'evadir') {
            onReact({ type: 'evadir', data: { evadedDiceIds: selectedDiceIndices, yellowCost: selectedDiceIndices.length } });
        } else if (reactionType === 'parar') {
            const weapon = weapons.find((w, idx) => getWeaponId(w, idx) === selectedWeapon);
            const cost = getSpeedConsumption(weapon);
            onReact({ type: 'parar', data: { weapon, yellowCost: cost } });
        } else {
            onReact({ type: 'recibir', data: null });
        }
    };

    if (!event) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1a1b26] border-2 border-red-900/50 rounded-lg p-6 max-w-lg w-full shadow-2xl shadow-red-900/20 relative overflow-hidden">
                {/* Fondo decorativo */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-fantasy text-red-500 text-center mb-2 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                        ¡Ataque Inminente!
                    </h2>
                    <p className="text-center text-slate-300 mb-6">
                        <strong className="text-white">{event.attackerName}</strong> te está atacando con <strong className="text-red-400">{event.weapon?.nombre || 'su arma'}</strong>.
                    </p>

                    <div className="bg-black/40 border border-[#c8aa6e]/20 rounded-lg p-4 mb-6">
                        <p className="text-sm text-[#c8aa6e] uppercase tracking-widest mb-3 text-center">Dados del Atacante</p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {attackerDice.map((die) => {
                                const isSelected = selectedDiceIndices.includes(die.id);

                                // Use inline styles to avoid Tailwind purging dynamic classes
                                const attrColorMap = {
                                    destreza: { color: '#4ade80' },
                                    intelecto: { color: '#60a5fa' },
                                    voluntad: { color: '#c084fc' },
                                    vigor: { color: '#f87171' },
                                };

                                const matchedAttr = die.matchedAttr ? die.matchedAttr.trim().toLowerCase() : null;
                                const attrStyle = (matchedAttr && attrColorMap[matchedAttr]) ? attrColorMap[matchedAttr] : null;

                                const baseStyle = die.isCrit ? {
                                    backgroundColor: 'rgba(234, 88, 12, 0.15)', // Dorado rojizo (#ea580c)
                                    borderColor: '#ea580c',
                                    color: '#ea580c',
                                    boxShadow: '0 0 10px rgba(234,88,12,0.3)',
                                } : attrStyle ? {
                                    backgroundColor: 'transparent',
                                    borderColor: attrStyle.color,
                                    color: attrStyle.color,
                                    boxShadow: 'none',
                                } : {
                                    backgroundColor: '#c8aa6e',
                                    borderColor: '#f0e6d2',
                                    color: '#0b1120',
                                };

                                const selectedStyle = {
                                    backgroundColor: 'rgba(127,29,29,0.8)',
                                    borderColor: '#ef4444',
                                    color: '#fecaca',
                                    opacity: 0.5,
                                    boxShadow: 'none',
                                };

                                return (
                                    <div
                                        key={die.id}
                                        onClick={() => reactionType === 'evadir' && toggleDie(die.id)}
                                        className={`w-12 h-12 flex items-center justify-center rounded-lg text-xl font-bold font-fantasy border-2 transition-all relative ${reactionType === 'evadir' ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                                        style={isSelected ? selectedStyle : baseStyle}
                                        title={die.isCrit ? "Dado Crítico" : matchedAttr ? `Dado de ${matchedAttr.charAt(0).toUpperCase() + matchedAttr.slice(1)}` : "Dado de Arma"}
                                    >
                                        {die.value}
                                        {die.isCrit && <span className="absolute -top-3 -right-2 text-[#ea580c] text-[10px] font-sans tracking-tight font-bold drop-shadow-md pointer-events-none uppercase bg-black/60 px-1 rounded border border-[#ea580c]/50">CRIT</span>}
                                        {isSelected && <X className="absolute text-red-500 w-8 h-8" />}
                                    </div>
                                )
                            })}
                        </div>
                        {reactionType === 'evadir' && (
                            <p className="text-center text-xs text-slate-400 mt-3">Toca los dados que quieras eludir (Coste: 1🟡 por dado)</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 mb-6">
                        {/* BOTÓN EVADIR */}
                        <button
                            onClick={() => { setReactionType('evadir'); setSelectedWeapon(''); setSelectedDiceIndices([]); }}
                            disabled={!canEvade}
                            className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${reactionType === 'evadir' ? 'bg-[#c8aa6e]/20 border-[#c8aa6e]' : 'bg-black/40 border-slate-700 hover:border-slate-500'
                                } ${!canEvade ? 'opacity-50 cursor-not-allowed hidden' : ''}`}
                        >
                            <div className="flex items-center gap-2 text-[#c8aa6e] font-bold uppercase tracking-wider">
                                <FastForward size={18} /> Evadir
                            </div>
                            <span className="text-xs text-slate-400 mt-1">Requiere V.Diff ≤ 1</span>
                        </button>

                        {/* BOTÓN PARAR */}
                        <button
                            onClick={() => {
                                setReactionType('parar');
                                setSelectedWeapon(weapons[0] ? getWeaponId(weapons[0], 0) : '');
                                setSelectedDiceIndices([]);
                            }}
                            disabled={weapons.length === 0}
                            className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${reactionType === 'parar' ? 'bg-[#c8aa6e]/20 border-[#c8aa6e]' : 'bg-black/40 border-slate-700 hover:border-slate-500'
                                } ${weapons.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-2 text-[#c8aa6e] font-bold uppercase tracking-wider">
                                <Sword size={18} /> Parar
                            </div>
                            <span className="text-xs text-slate-400 mt-1">Contraataca con tu propia arma</span>
                        </button>

                        {/* BOTÓN RECIBIR */}
                        <button
                            onClick={() => { setReactionType('recibir'); setSelectedWeapon(''); setSelectedDiceIndices([]); }}
                            className={`flex items-center justify-center gap-2 p-3 rounded border transition-all ${reactionType === 'recibir' ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-black/40 border-slate-700 hover:border-slate-500 text-slate-300'
                                }`}
                        >
                            <Shield size={18} /> Recibir Golpe
                        </button>
                    </div>

                    {/* SELECTOR DE ARMA (Si es Parar) */}
                    {reactionType === 'parar' && weapons.length > 0 && (
                        <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <label className="block text-[10px] text-[#c8aa6e] font-bold uppercase tracking-[0.2em] mb-3">
                                Selecciona el arma para parar:
                            </label>
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {weapons.map((w, idx) => {
                                    const currentId = getWeaponId(w, idx);
                                    return (
                                        <WeaponCard
                                            key={currentId}
                                            weapon={w}
                                            isSelected={selectedWeapon === currentId}
                                            onSelect={() => setSelectedWeapon(currentId)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-5 border-t border-red-900/30">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Costo de Reacción</span>
                            <div className="text-lg font-fantasy text-yellow-500 flex items-center gap-1.5 leading-none">
                                {reactionType === 'evadir' ? `-${selectedDiceIndices.length}` :
                                    reactionType === 'parar' && selectedWeapon ? `-${(() => {
                                        const w = weapons.find((w, idx) => getWeaponId(w, idx) === selectedWeapon);
                                        return getSpeedConsumption(w);
                                    })()}` : '0'}
                                <span className="text-base">🟡</span>
                            </div>
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={!reactionType || (reactionType === 'parar' && !selectedWeapon)}
                            className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white font-fantasy text-sm uppercase tracking-[0.2em] rounded shadow-lg hover:shadow-red-600/20 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const WeaponCard = ({ weapon, isSelected, onSelect }) => {
    const [imgError, setImgError] = useState(false);

    const damage = weapon.dano || weapon.damage || '';
    const range = weapon.alcance || weapon.range || weapon.alc || '';

    const parryCost = getSpeedConsumption(weapon);

    const costDisplay = weapon.consumo || weapon.consumption || parryCost;
    const power = weapon.poder || '';
    const traits = (weapon.rasgos || weapon.traits || weapon.trait || '').toString();

    const getRarityColors = (r = '') => {
        const rareza = r.toLowerCase();
        if (rareza.includes('legendari')) return { border: 'border-orange-500', glow: 'from-orange-900/80', stripe: 'bg-orange-500', text: 'text-orange-400' };
        if (rareza.includes('épic') || rareza.includes('epic')) return { border: 'border-purple-500', glow: 'from-purple-900/80', stripe: 'bg-purple-500', text: 'text-purple-400' };
        if (rareza.includes('rar')) return { border: 'border-blue-500', glow: 'from-blue-900/80', stripe: 'bg-blue-500', text: 'text-blue-400' };
        if (rareza.includes('poco com')) return { border: 'border-green-500', glow: 'from-green-900/80', stripe: 'bg-green-500', text: 'text-green-400' };
        return { border: 'border-slate-600', glow: 'from-slate-800', stripe: 'bg-slate-600', text: 'text-slate-400' };
    };

    const rarity = getRarityColors(weapon.rareza);

    const getItemImage = (i) => {
        if (i.img || i.icon) return i.img || i.icon;
        const name = (i.name || i.nombre || '').toLowerCase();
        if (name.includes('fauces')) return '/armas/fauces.png';
        if (name.includes('garras')) return '/armas/garras.png';
        if (name.includes('hacha')) return '/armas/hacha_de_mano.png';
        if (name.includes('alabarda')) return '/armas/alabarda.png';
        if (name.includes('espada')) {
            if (name.includes('corta')) return '/armas/espada_corta.png';
            if (name.includes('bastarda')) return '/armas/espada_bastarda.png';
            if (name.includes('hierro')) return '/armas/espada_de_hierro.png';
            if (name.includes('larga')) return '/armas/espada_larga.png';
            return '/armas/espada_de_acero.png';
        }
        if (name.includes('daga')) return '/armas/daga.png';
        if (name.includes('arco')) return name.includes('largo') ? '/armas/arco_largo.png' : '/armas/arco_corto.png';
        if (name.includes('ballesta')) {
            if (name.includes('mano')) return '/armas/ballesta_de_mano.png';
            if (name.includes('ligera')) return '/armas/ballesta_ligera.png';
            return '/armas/ballesta_pesada.png';
        }
        if (name.includes('escudo')) return '/armas/escudo.png';
        if (i.type === 'weapon' || i.categoria?.toLowerCase()?.includes('arma')) return '/armas/espada_de_acero.png';
        return null;
    };

    const itemImg = getItemImage(weapon);
    const borderColor = isSelected ? 'border-[#c8aa6e]' : rarity.border;
    const textColor = isSelected ? 'text-[#c8aa6e]' : rarity.text;

    return (
        <button
            onClick={onSelect}
            className={`relative bg-[#161f32] border ${borderColor} rounded-lg overflow-hidden group hover:border-[#c8aa6e]/60 transition-all duration-300 w-full text-left p-0 m-0 ${isSelected ? 'shadow-[0_0_15px_rgba(200,170,110,0.3)] ring-1 ring-[#c8aa6e]' : ''}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-r ${isSelected ? 'from-[#c8aa6e]/20' : rarity.glow} via-transparent to-transparent opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''} transition-opacity duration-500 z-0`}></div>
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isSelected ? 'bg-[#c8aa6e]' : rarity.stripe} z-10`} />

            <div className="flex z-20 relative min-h-[4.5rem]">
                <div className="w-16 bg-black/50 relative shrink-0 ml-[3px] flex flex-col z-10 overflow-hidden">
                    {itemImg && !imgError ? (
                        <>
                            <img
                                src={itemImg}
                                alt={weapon.nombre || weapon.name}
                                onError={() => setImgError(true)}
                                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center relative z-20 py-2">
                            <Sword className={`w-7 h-7 ${rarity.text} opacity-60 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`} />
                        </div>
                    )}
                    {weapon.rareza && weapon.rareza.toLowerCase() !== 'común' && (
                        <span className={`text-[8px] uppercase font-bold ${rarity.text} text-center leading-tight px-1 drop-shadow-md mt-auto pt-1 relative z-30 mb-1`}>
                            {weapon.rareza}
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0 p-2 pl-2.5 flex flex-col">
                    <div className="flex justify-between items-start gap-2">
                        <span className={`text-[11px] font-['Cinzel'] uppercase tracking-wider font-bold truncate leading-tight ${textColor}`}>
                            {weapon.nombre || weapon.name}
                        </span>
                        {isSelected && <Zap size={12} className="text-[#c8aa6e] animate-pulse shrink-0" />}
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-[9px]">
                        {damage && (
                            <div>
                                <span className="text-slate-500 uppercase font-bold">Daño:</span>{' '}
                                <span className="text-red-300 font-mono">{damage}</span>
                            </div>
                        )}
                        {range && (
                            <div>
                                <span className="text-slate-500 uppercase font-bold">Alc:</span>{' '}
                                <span className="text-slate-300">{range}</span>
                            </div>
                        )}
                        {costDisplay && (
                            <div className="flex items-center gap-1">
                                <span className="text-slate-500 uppercase font-bold">Coste:</span>{' '}
                                <span className="text-yellow-500 font-bold">{costDisplay}{!isNaN(costDisplay) && ' 🟡'}</span>
                            </div>
                        )}
                        {power && (
                            <div>
                                <span className="text-slate-500 uppercase font-bold">Poder:</span>{' '}
                                <span className="text-purple-300 font-mono">{power}</span>
                            </div>
                        )}
                    </div>

                    {traits && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {traits.split(',').map((t, idx) => {
                                const tTrim = t.trim();
                                if (!tTrim) return null;
                                return (
                                    <span key={idx} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 uppercase">
                                        {tTrim}
                                    </span>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
};

export default CombatReactionModal;
