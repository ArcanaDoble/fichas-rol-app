import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Zap, Target, Hammer, Shield, Plus, X, ArrowDown, Wind, Droplet } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getCombatTraitIds, getSpeedConsumption, hasCombatTrait, normalizeCombatTraitId } from '../utils/combatSystem';

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const formatTraitLabel = (trait = '') => {
    const normalized = trait.toString().trim().toLowerCase();
    if (normalized === 'derribado' || normalized === 'derribar' || normalized === 'derribo') return 'Derribo';
    if (normalized === 'conmocionante') return 'Conmocionante';
    if (normalized === 'fluida') return 'Fluida';
    if (normalized === 'sangrado') return 'Sangrado';
    if (normalized === 'sin guardia' || normalized === 'singuardia' || normalized === 'sin_guardia') return 'Sin guardia';
    return trait.charAt(0).toUpperCase() + trait.slice(1);
};

const AVAILABLE_TRAITS = [
    { id: 'crítico', label: 'Crítico', icon: Zap, color: 'text-red-400', border: 'border-red-500/50', bg: 'bg-red-900/30' },
    { id: 'agudeza', label: 'Agudeza', icon: Target, color: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'bg-cyan-900/30' },
    { id: 'derribo', label: 'Derribo', icon: Hammer, color: 'text-green-400', border: 'border-green-500/50', bg: 'bg-green-900/30' },
    { id: 'hendir', label: 'Hendir', icon: Shield, color: 'text-slate-300', border: 'border-slate-400/50', bg: 'bg-slate-700/30' },
    { id: 'conmocionante', label: 'Conmocionante', icon: ArrowDown, color: 'text-indigo-300', border: 'border-indigo-400/50', bg: 'bg-indigo-900/30' },
    { id: 'sangrado', label: 'Sangrado', icon: Droplet, color: 'text-red-500', border: 'border-red-700/50', bg: 'bg-red-950/30' },
    { id: 'fluida', label: 'Fluida', icon: Wind, color: 'text-sky-300', border: 'border-sky-400/50', bg: 'bg-sky-900/30' },
    { id: 'sin guardia', label: 'Sin guardia', icon: Shield, color: 'text-rose-300', border: 'border-rose-500/50', bg: 'bg-rose-900/30' },
    // Más rasgos se pueden añadir aquí fácilmente
];

const QUICK_TRAIT_COUNT = 2;
const DEFAULT_TRAIT_STYLE = {
    icon: Sparkles,
    color: 'text-slate-300',
    border: 'border-slate-500/40',
    bg: 'bg-slate-800/60'
};

const getTraitConfig = (traitId) => {
    const foundTrait = AVAILABLE_TRAITS.find((trait) => trait.id === traitId);
    if (foundTrait) return foundTrait;

    return {
        id: traitId,
        label: formatTraitLabel(traitId),
        ...DEFAULT_TRAIT_STYLE
    };
};

const CombatModifiersPanel = ({
    modifiers,
    onChange,
    isExpanded,
    onToggleExpand,
    currentWeapon = null
}) => {
    const [isTraitPickerOpen, setIsTraitPickerOpen] = useState(false);

    const quickTraits = useMemo(
        () => AVAILABLE_TRAITS.slice(0, QUICK_TRAIT_COUNT),
        []
    );

    const quickTraitIds = useMemo(
        () => quickTraits.map((trait) => trait.id),
        [quickTraits]
    );

    const activeTraitEntries = useMemo(
        () => modifiers.activeTraits.map((traitId) => getTraitConfig(traitId)),
        [modifiers.activeTraits]
    );

    const hiddenActiveTraits = useMemo(
        () => activeTraitEntries.filter((trait) => !quickTraitIds.includes(trait.id)),
        [activeTraitEntries, quickTraitIds]
    );

    const fluidaDisabled = useMemo(() => {
        if (!currentWeapon) return false;
        if (hasCombatTrait(currentWeapon, 'fluida')) return false;
        return getSpeedConsumption(currentWeapon) <= 1;
    }, [currentWeapon]);

    const disabledTraitMeta = useMemo(() => {
        const disabled = {};
        if (fluidaDisabled) {
            disabled.fluida = 'Fluida no puede reducir un arma por debajo de 1 de velocidad.';
        }
        return disabled;
    }, [fluidaDisabled]);

    useEffect(() => {
        if (!isExpanded) {
            setIsTraitPickerOpen(false);
        }
    }, [isExpanded]);

    useEffect(() => {
        if (!modifiers.activeTraits.includes('fluida') || !fluidaDisabled) return;

        onChange({
            ...modifiers,
            activeTraits: modifiers.activeTraits.filter((traitId) => traitId !== 'fluida')
        });
    }, [fluidaDisabled, modifiers, onChange]);

    useEffect(() => {
        if (!isTraitPickerOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsTraitPickerOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isTraitPickerOpen]);

    const handleAddDie = (dieType) => {
        onChange({
            ...modifiers,
            extraDice: {
                ...modifiers.extraDice,
                [dieType]: (modifiers.extraDice[dieType] || 0) + 1
            }
        });
    };

    const handleClearDice = () => {
        onChange({
            ...modifiers,
            extraDice: {}
        });
    };

    const handleToggleTrait = (traitId) => {
        if (disabledTraitMeta[traitId]) return;

        const isCurrentlyActive = modifiers.activeTraits.includes(traitId);
        let newTraits = [...modifiers.activeTraits];

        if (isCurrentlyActive) {
            newTraits = newTraits.filter(t => t !== traitId);
        } else {
            newTraits.push(traitId);
        }

        onChange({
            ...modifiers,
            activeTraits: newTraits
        });
    };

    const handleClearTraits = () => {
        onChange({
            ...modifiers,
            activeTraits: []
        });
    };

    const hasAnyModifiers = Object.keys(modifiers.extraDice).length > 0 || modifiers.activeTraits.length > 0;

    const traitPickerOverlay = isTraitPickerOpen && typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
                <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsTraitPickerOpen(false)}
                    className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm"
                />

                <div className="fixed inset-0 z-[301] flex items-end justify-center p-2 sm:items-center sm:p-4 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="pointer-events-auto w-full max-w-[42rem] max-h-[78dvh] rounded-2xl border border-[#c8aa6e]/30 bg-[#0f1728]/97 shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden sm:max-h-[70vh]"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#c8aa6e]/15 bg-black/20">
                            <div>
                                <p className="text-[10px] text-[#c8aa6e] uppercase tracking-[0.24em] font-bold font-fantasy">Selector de Rasgos</p>
                                <p className="text-[10px] text-slate-500/75 mt-1 font-fantasy tracking-[0.03em]">
                                    Aplica a tu ataque otros rasgos disponibles.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsTraitPickerOpen(false)}
                                className="w-9 h-9 rounded-full border border-slate-700 bg-slate-900/70 text-slate-400 hover:text-[#c8aa6e] hover:border-[#c8aa6e]/40 flex items-center justify-center transition-colors"
                                aria-label="Cerrar selector de rasgos"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-5 space-y-4 max-h-[calc(78dvh-4.5rem)] overflow-y-auto custom-scrollbar sm:max-h-[calc(70vh-4.5rem)]">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {AVAILABLE_TRAITS.map((trait) => {
                                    const isActive = modifiers.activeTraits.includes(trait.id);
                                    const TraitIcon = trait.icon;
                                    const disabledReason = disabledTraitMeta[trait.id];
                                    const isDisabled = !!disabledReason;

                                    return (
                                        <button
                                            key={`picker-${trait.id}`}
                                            onClick={() => handleToggleTrait(trait.id)}
                                            disabled={isDisabled}
                                            title={disabledReason || trait.label}
                                            className={`rounded-xl border p-3 min-h-[6.25rem] flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 ${isActive
                                                ? `${trait.border} ${trait.bg} ${trait.color} shadow-[0_0_16px_rgba(200,170,110,0.18)]`
                                                : isDisabled
                                                    ? 'border-slate-800 bg-slate-950/60 text-slate-600 cursor-not-allowed opacity-55'
                                                    : 'border-slate-700 bg-slate-900/65 text-slate-400 hover:border-[#c8aa6e]/40 hover:text-slate-200'
                                                }`}
                                        >
                                            <TraitIcon className="w-6 h-6" />
                                            <span className="text-[11px] font-bold uppercase tracking-[0.18em] leading-tight">
                                                {trait.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {activeTraitEntries.length > 0 && (
                                <div className="rounded-xl border border-slate-700/60 bg-black/25 px-3 py-3">
                                    <div className="text-[9px] text-slate-500 uppercase tracking-[0.22em] font-bold text-center mb-2">
                                        Activos ahora
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {activeTraitEntries.map((trait) => {
                                            const TraitIcon = trait.icon;
                                            return (
                                                <button
                                                    key={`picker-active-${trait.id}`}
                                                    onClick={() => handleToggleTrait(trait.id)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${trait.border} ${trait.bg} ${trait.color}`}
                                                >
                                                    <TraitIcon className="w-3 h-3" />
                                                    {trait.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>,
            document.body
        )
        : null;

    return (
        <>
        <div className={`w-full rounded-xl border transition-all overflow-hidden shadow-lg mb-2 mt-1 ${isExpanded ? 'bg-[#c8aa6e]/10 border-[#c8aa6e]' : 'border-white/5 hover:bg-[#c8aa6e]/5 hover:border-[#c8aa6e]/30'}`}>
            {/* Cabecera / Botón para expandir */}
            <button
                onClick={onToggleExpand}
                className="w-full flex items-center justify-center p-3 relative"
            >
                <div className="flex items-center justify-center gap-2 text-[#c8aa6e]">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-fantasy text-xs md:text-sm uppercase tracking-[0.1em] md:tracking-[0.2em] font-bold">Modificadores</span>
                </div>
                {hasAnyModifiers && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse block"></span>
                    </div>
                )}
            </button>

            {/* Panel Expandible */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 border-t border-[#c8aa6e]/10 space-y-5">

                            {/* DADOS EXTRA */}
                            <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center relative w-full mb-3">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold text-center">Dados de Daño Extra</span>
                                    {Object.keys(modifiers.extraDice).length > 0 && (
                                        <button
                                            onClick={handleClearDice}
                                            className="absolute right-0 text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-wider bg-transparent p-1 -mr-2"
                                            title="Limpiar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap justify-center gap-2 mb-3">
                                    {DICE_TYPES.map(die => (
                                        <button
                                            key={die}
                                            onClick={() => handleAddDie(die)}
                                            className="px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-600/80 font-fantasy text-sm text-[#f0e6d2] hover:border-[#c8aa6e] hover:text-[#c8aa6e] hover:bg-[#c8aa6e]/10 transition-colors shadow-inner active:scale-95"
                                        >
                                            +{die}
                                        </button>
                                    ))}
                                </div>

                                {/* Visualización de la pila de dados agregada */}
                                {Object.keys(modifiers.extraDice).length > 0 && (
                                    <div className="flex flex-wrap justify-center gap-1.5 p-2 bg-black/40 rounded border border-slate-700/50 w-full">
                                        {Object.entries(modifiers.extraDice).map(([die, count]) => {
                                            if (count === 0) return null;
                                            return (
                                                <span key={die} className="text-xs font-bold text-red-400 bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded shadow">
                                                    +{count}{die}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* RASGOS ESPECIALES */}
                            <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center relative w-full mb-3">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold text-center">Rasgos Especiales (Opcional)</span>
                                    {modifiers.activeTraits.length > 0 && (
                                        <button
                                            onClick={handleClearTraits}
                                            className="absolute right-0 text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-wider bg-transparent p-1 -mr-2"
                                            title="Limpiar rasgos"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {quickTraits.map((trait) => {
                                            const isActive = modifiers.activeTraits.includes(trait.id);
                                            const TraitIcon = trait.icon;
                                            const disabledReason = disabledTraitMeta[trait.id];
                                            const isDisabled = !!disabledReason;

                                            return (
                                                <button
                                                    key={trait.id}
                                                    onClick={() => handleToggleTrait(trait.id)}
                                                    disabled={isDisabled}
                                                    title={disabledReason || trait.label}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${isActive
                                                        ? `${trait.border} ${trait.bg} ${trait.color} shadow-[0_0_10px_rgba(250,204,21,0.2)]`
                                                        : isDisabled
                                                            ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed opacity-55'
                                                            : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                                                        }`}
                                                >
                                                    <TraitIcon className="w-3.5 h-3.5" />
                                                    {trait.label}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => setIsTraitPickerOpen(true)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${hiddenActiveTraits.length > 0
                                                ? 'border-[#c8aa6e] bg-[#c8aa6e]/10 text-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.18)]'
                                                : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Ver más
                                        </button>
                                    </div>

                                    {hiddenActiveTraits.length > 0 && (
                                        <div className="w-full rounded-lg border border-slate-700/50 bg-black/30 px-3 py-2">
                                            <div className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-bold text-center mb-2">
                                                Rasgos activos
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {hiddenActiveTraits.map((trait) => {
                                                    const TraitIcon = trait.icon;
                                                    return (
                                                        <button
                                                            key={`active-${trait.id}`}
                                                            onClick={() => handleToggleTrait(trait.id)}
                                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${trait.border} ${trait.bg} ${trait.color}`}
                                                        >
                                                            <TraitIcon className="w-3 h-3" />
                                                            {trait.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
        {traitPickerOverlay}
        </>
    );
};

// Helper utility to apply modifiers to a weapon object
export const applyModifiersToWeapon = (weapon, customModifiers) => {
    if (!weapon || (!Object.keys(customModifiers.extraDice).length && !customModifiers.activeTraits.length)) {
        return weapon;
    }

    // Create clone
    const clonedWep = { ...weapon };

    // Apply Damage
    let addedDamage = [];
    Object.entries(customModifiers.extraDice).forEach(([die, count]) => {
        if (count > 0) addedDamage.push(`${count}${die}`);
    });

    if (addedDamage.length > 0) {
        clonedWep.extraDamageString = addedDamage.join(' + ');
    }

    // Apply traits — preserve original type (array or string)
    if (customModifiers.activeTraits.length > 0) {
        const traitsField = clonedWep.rasgos ? 'rasgos' : clonedWep.traits ? 'traits' : 'rasgos';
        const original = clonedWep[traitsField];
        const nativeTraitIds = new Set(getCombatTraitIds(weapon));
        const normalizedActiveTraitIds = customModifiers.activeTraits
            .map((traitId) => normalizeCombatTraitId(traitId))
            .filter(Boolean);
        const newTraits = customModifiers.activeTraits.map((t) => formatTraitLabel(t));
        const manualCombatTraitIds = normalizedActiveTraitIds.filter(
            (traitId) => !nativeTraitIds.has(traitId)
        );

        if (manualCombatTraitIds.length > 0) {
            clonedWep.manualCombatTraits = manualCombatTraitIds;
        } else {
            delete clonedWep.manualCombatTraits;
        }

        if (Array.isArray(original)) {
            clonedWep[traitsField] = [...original, ...newTraits];
        } else {
            const originalStr = String(original || '');
            clonedWep[traitsField] = originalStr
                ? `${originalStr}, ${newTraits.join(', ')}`
                : newTraits.join(', ');
        }
    }

    return clonedWep;
};

export default CombatModifiersPanel;
