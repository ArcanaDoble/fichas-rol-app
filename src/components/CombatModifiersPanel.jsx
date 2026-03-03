import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Zap } from 'lucide-react';

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const AVAILABLE_TRAITS = [
    { id: 'crítico', label: 'Crítico', icon: Zap, color: 'text-yellow-400', border: 'border-yellow-500/50', bg: 'bg-yellow-900/30' },
    // Más rasgos se pueden añadir aquí fácilmente
];

const CombatModifiersPanel = ({
    modifiers,
    onChange,
    isExpanded,
    onToggleExpand
}) => {
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

    const hasAnyModifiers = Object.keys(modifiers.extraDice).length > 0 || modifiers.activeTraits.length > 0;

    return (
        <div className={`w-full rounded-xl border transition-all overflow-hidden shadow-lg mb-2 mt-1 ${isExpanded ? 'bg-[#c8aa6e]/10 border-[#c8aa6e]' : 'border-white/5 hover:bg-[#c8aa6e]/5 hover:border-[#c8aa6e]/30'}`}>
            {/* Cabecera / Botón para expandir */}
            <button
                onClick={onToggleExpand}
                className="w-full flex items-center justify-center p-3 relative"
            >
                <div className="flex items-center justify-center gap-2 text-[#c8aa6e]">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-fantasy text-sm uppercase tracking-[0.2em] font-bold">Modificadores</span>
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
                                <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-3 block text-center">Rasgos Especiales (Opcional)</span>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {AVAILABLE_TRAITS.map(trait => {
                                        const isActive = modifiers.activeTraits.includes(trait.id);
                                        const TraitIcon = trait.icon;

                                        return (
                                            <button
                                                key={trait.id}
                                                onClick={() => handleToggleTrait(trait.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${isActive
                                                    ? `${trait.border} ${trait.bg} ${trait.color} shadow-[0_0_10px_rgba(250,204,21,0.2)]`
                                                    : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                                                    }`}
                                            >
                                                <TraitIcon className="w-3.5 h-3.5" />
                                                {trait.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
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
        const newTraits = customModifiers.activeTraits.map(t => t.charAt(0).toUpperCase() + t.slice(1));

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
