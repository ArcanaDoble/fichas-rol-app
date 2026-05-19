import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiPlus, FiMinus, FiTrash2 } from 'react-icons/fi';
import {
    Swords, Skull, Heart, Shield, Brain, Zap, Ghost,
    EyeOff, VolumeX, Hand, XCircle, Eye, Pause, Box, Droplet,
    ArrowDown, Anchor, AlertCircle, Snowflake, Flame
} from 'lucide-react';
import { EnemyDetailView } from './EnemyDetailView';

// Configuration for Status Effects
const CONDITIONS = [
    { id: 'Cegado', icon: EyeOff, color: 'text-slate-400 border-slate-400', label: 'Cegado' },
    { id: 'Hechizado', icon: Heart, color: 'text-pink-500 border-pink-500', label: 'Hechizado' },
    { id: 'Ensordecido', icon: VolumeX, color: 'text-slate-500 border-slate-500', label: 'Ensordecido' },
    { id: 'Asustado', icon: Ghost, color: 'text-purple-400 border-purple-400', label: 'Asustado' },
    { id: 'Agarrado', icon: Hand, color: 'text-orange-600 border-orange-600', label: 'Agarrado' },
    { id: 'Incapacitado', icon: XCircle, color: 'text-red-500 border-red-500', label: 'Incapacitado' },
    { id: 'Invisible', icon: Eye, color: 'text-blue-200 border-blue-200', label: 'Invisible' },
    { id: 'Paralizado', icon: Pause, color: 'text-yellow-500 border-yellow-500', label: 'Paralizado' },
    { id: 'Petrificado', icon: Box, color: 'text-stone-400 border-stone-400', label: 'Petrificado' },
    { id: 'Envenenado', icon: Droplet, color: 'text-green-500 border-green-500', label: 'Envenenado' },
    { id: 'Derribado', icon: ArrowDown, color: 'text-amber-600 border-amber-600', label: 'Derribado' },
    { id: 'Apresado', icon: Anchor, color: 'text-indigo-400 border-indigo-400', label: 'Apresado' },
    { id: 'Aturdido', icon: Zap, color: 'text-yellow-400 border-yellow-400', label: 'Aturdido' },
    { id: 'Inconsciente', icon: Skull, color: 'text-red-600 border-red-600', label: 'Inconsciente' },
    { id: 'Exhausto', icon: AlertCircle, color: 'text-orange-400 border-orange-400', label: 'Exhausto' },
    { id: 'Congelado', icon: Snowflake, color: 'text-cyan-400 border-cyan-400', label: 'Congelado' },
    { id: 'Ardiendo', icon: Flame, color: 'text-orange-500 border-orange-500', label: 'Ardiendo' },
];

const STAT_THEME = {
    postura: {
        icon: Shield,
        label: 'POSTURA',
        color: 'text-emerald-400',
        bar: 'bg-emerald-400',
        glow: 'shadow-[0_0_10px_rgba(52,211,153,0.45)]',
        border: 'border-emerald-500/20',
    },
    vida: {
        icon: Heart,
        label: 'VIDA',
        color: 'text-red-400',
        bar: 'bg-red-400',
        glow: 'shadow-[0_0_10px_rgba(248,113,113,0.5)]',
        border: 'border-red-500/25',
    },
    ingenio: {
        icon: Zap,
        label: 'INGENIO',
        color: 'text-blue-400',
        bar: 'bg-blue-400',
        glow: 'shadow-[0_0_10px_rgba(96,165,250,0.45)]',
        border: 'border-blue-500/20',
    },
    cordura: {
        icon: Brain,
        label: 'CORDURA',
        color: 'text-purple-400',
        bar: 'bg-purple-400',
        glow: 'shadow-[0_0_10px_rgba(192,132,252,0.45)]',
        border: 'border-purple-500/20',
    },
    armadura: {
        icon: Shield,
        label: 'ARMADURA',
        color: 'text-slate-300',
        bar: 'bg-slate-300',
        glow: 'shadow-[0_0_10px_rgba(203,213,225,0.35)]',
        border: 'border-slate-400/20',
    },
};

const STAT_ORDER = ['postura', 'vida', 'ingenio', 'cordura', 'armadura'];

const getStatValue = (combatant, key) => combatant.stats?.[key] || { current: 0, max: 0 };

const SegmentedStatControl = ({ icon: Icon, value, max, theme, onChange, label }) => {
    if (max <= 0) return null;
    const segmentCount = Math.min(max, 16);
    const filledSegments = max > segmentCount ? Math.round((value / max) * segmentCount) : value;

    return (
        <div className={`min-w-0 rounded border ${theme.border} bg-black/18 p-2.5`}>
            <div className="mb-2 flex items-center justify-between gap-3">
                <div className={`flex min-w-0 items-center gap-1.5 ${theme.color}`}>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
                </div>
                <div className="flex h-6 shrink-0 items-center overflow-hidden rounded border border-white/5 bg-black/45">
                    <button
                        onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, value - 1)); }}
                        className="flex h-full w-6 items-center justify-center text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label={`Reducir ${label}`}
                    >
                        <FiMinus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[2rem] border-x border-white/5 px-2 text-center font-['Cinzel'] text-xs font-bold text-red-50">{value}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + 1)); }}
                        className="flex h-full w-6 items-center justify-center text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label={`Aumentar ${label}`}
                    >
                        <FiPlus className="h-3 w-3" />
                    </button>
                </div>
            </div>

            <div className="flex h-2.5 w-full gap-[3px]">
                {Array.from({ length: segmentCount }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-full min-w-[5px] flex-1 rounded-[1px] transition-all duration-300 ${i < filledSegments ? `${theme.bar} ${theme.glow}` : 'bg-slate-700/30'}`}
                    />
                ))}
            </div>
            <div className="mt-1 flex justify-end font-mono text-[10px] text-slate-500">
                {value} / {max}
            </div>
        </div>
    );
};

const CombatantCard = ({ combatant, onUpdate, onRemove, onViewDetails, onOpenconditions }) => {
    const updateStat = (stat, newValue) => {
        onUpdate(combatant.instanceId, {
            stats: {
                ...combatant.stats,
                [stat]: { ...combatant.stats[stat], current: newValue }
            }
        });
    };

    const removeCondition = (conditionId) => {
        const current = combatant.conditions || [];
        onUpdate(combatant.instanceId, { conditions: current.filter(c => c !== conditionId) });
    };

    const activeConditionCount = (combatant.conditions || []).length;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative overflow-hidden rounded border border-red-900/30 bg-[#0a101d] shadow-[0_18px_55px_rgba(0,0,0,0.28)] transition-colors hover:border-red-500/40"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-red-950/25 via-transparent to-transparent opacity-80" />
            <div className="relative grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)_11rem]">
                <div
                    className="relative grid min-h-[11rem] cursor-pointer grid-cols-[7rem_minmax(0,1fr)] overflow-hidden border-b border-red-900/20 bg-[#120707] lg:block lg:border-b-0 lg:border-r lg:border-red-900/25"
                    onClick={() => onViewDetails(combatant)}
                    title="Ver ficha completa"
                >
                    <div className="relative h-full min-h-[11rem] overflow-hidden bg-black lg:absolute lg:inset-y-0 lg:left-0 lg:w-32">
                        {combatant.image ? (
                            <img
                                src={combatant.image}
                                alt={combatant.name}
                                className="h-full w-full object-cover object-top opacity-75 grayscale-[0.15] transition-all duration-500 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-red-900/20">
                                <Skull className="h-10 w-10 text-red-900/50" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent lg:bg-gradient-to-r" />
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(combatant.instanceId); }}
                            className="absolute left-2 top-2 z-10 rounded-full border border-red-900/40 bg-black/55 p-1.5 text-red-500 transition-colors hover:border-red-500 hover:bg-red-950"
                            aria-label={`Eliminar ${combatant.name}`}
                        >
                            <FiTrash2 className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="relative flex min-w-0 flex-col justify-end p-4 lg:ml-32 lg:min-h-[11rem]">
                        <div className="mb-3 w-fit border border-red-900/40 bg-black/25 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.22em] text-red-500/80">
                            En combate
                        </div>
                        <h3 className="break-words font-['Cinzel'] text-2xl font-bold uppercase leading-tight text-red-50 drop-shadow-md lg:text-xl">{combatant.name}</h3>
                        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.22em] text-red-400/80">{combatant.type}</p>
                        <button
                            type="button"
                            className="mt-4 w-fit text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-red-300"
                        >
                            Ver ficha
                        </button>
                    </div>
                </div>

                <div className="relative p-4 lg:p-5">
                    <div className="mb-4 flex items-center justify-between gap-4 border-b border-red-900/20 pb-3">
                        <div>
                            <div className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.24em] text-red-400">Recursos</div>
                            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-600">Ajuste rápido de bloques</div>
                        </div>
                        <div className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 sm:block">
                            {activeConditionCount} estados
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {STAT_ORDER.map((statKey) => {
                            const theme = STAT_THEME[statKey];
                            const stat = getStatValue(combatant, statKey);
                            return (
                                <SegmentedStatControl
                                    key={statKey}
                                    icon={theme.icon}
                                    label={theme.label}
                                    value={stat.current}
                                    max={stat.max}
                                    theme={theme}
                                    onChange={(v) => updateStat(statKey, v)}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="relative border-t border-red-900/20 bg-black/20 p-4 lg:border-l lg:border-t-0">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.22em] text-red-400/90">Estados</span>
                        <button
                            onClick={() => onOpenconditions(combatant)}
                            className="flex items-center gap-1 rounded border border-dashed border-red-900/40 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 transition-all hover:border-red-500/50 hover:text-red-300"
                        >
                            <FiPlus className="h-3 w-3" /> Estado
                        </button>
                    </div>
                    <div className="flex flex-wrap content-start gap-1.5 lg:flex-col">
                        {(combatant.conditions || []).length > 0 ? (
                            (combatant.conditions || []).map(conditionId => {
                                const def = CONDITIONS.find(c => c.id === conditionId) || { id: conditionId, color: 'text-gray-400 border-gray-400', label: conditionId };
                                const Icon = def.icon || AlertCircle;
                                return (
                                    <button
                                        key={conditionId}
                                        onClick={() => removeCondition(conditionId)}
                                        className={`flex items-center gap-1.5 rounded border bg-black/40 px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-all hover:bg-red-900/30 ${def.color}`}
                                        title="Quitar estado"
                                    >
                                        <Icon className="h-3 w-3" /> {def.label}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="rounded border border-dashed border-slate-800 px-3 py-2 text-[10px] italic text-slate-600">
                                Sin estados activos
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const modalVariants = {
    initial: { opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { type: "spring", stiffness: 400, damping: 30 }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        filter: 'blur(5px)',
        transition: { duration: 0.2 }
    }
};

const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

export const CombatTrackerView = ({ onBack, onUpdateEnemy }) => {
    const [combatants, setCombatants] = useState([]);
    const [allEnemies, setAllEnemies] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailEnemy, setDetailEnemy] = useState(null);
    const [conditionPickerTarget, setConditionPickerTarget] = useState(null);

    // Load definitions and active session
    useEffect(() => {
        // Load enemy definitions
        const fetchEnemies = async () => {
            const querySnapshot = await getDocs(collection(db, 'enemies'));
            const loaded = [];
            querySnapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() }));
            setAllEnemies(loaded);
        };
        fetchEnemies();

        // Listen for active combat state
        const unsubscribe = onSnapshot(doc(db, 'combat_sessions', 'active_session'), (doc) => {
            if (doc.exists()) {
                setCombatants(doc.data().combatants || []);
            }
        });
        return () => unsubscribe();
    }, []);

    const saveCombatState = async (newCombatants) => {
        // Optimistic update
        setCombatants(newCombatants);
        try {
            await setDoc(doc(db, 'combat_sessions', 'active_session'), {
                combatants: newCombatants,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error("Error saving combat state:", error);
        }
    };

    const addCombatant = (enemyTemplate) => {
        const newInstance = {
            ...enemyTemplate,
            instanceId: `${enemyTemplate.id}_${Date.now()}`,
            stats: JSON.parse(JSON.stringify(enemyTemplate.stats || {
                vida: { current: enemyTemplate.hp || 10, max: enemyTemplate.hp || 10 },
                postura: { current: 3, max: 4 },
                ingenio: { current: 2, max: 3 },
                cordura: { current: 3, max: 3 },
                armadura: { current: 1, max: 1 }
            })),
            conditions: []
        };
        saveCombatState([...combatants, newInstance]);
        setShowAddModal(false);
    };

    const removeCombatant = (instanceId) => {
        saveCombatState(combatants.filter(c => c.instanceId !== instanceId));
    };

    const updateCombatant = (instanceId, updates) => {
        const updated = combatants.map(c =>
            c.instanceId === instanceId ? { ...c, ...updates } : c
        );
        saveCombatState(updated);
    };

    const toggleConditionForTarget = (conditionId) => {
        if (!conditionPickerTarget) return;
        const current = conditionPickerTarget.conditions || [];
        const newConditions = current.includes(conditionId)
            ? current.filter(c => c !== conditionId)
            : [...current, conditionId];

        updateCombatant(conditionPickerTarget.instanceId, { conditions: newConditions });

        // Update local reference to keep modal in sync visually if needed, though simpler to just close or rely on real-time update
        setConditionPickerTarget(prev => ({ ...prev, conditions: newConditions }));
    };

    const clearCombat = () => {
        if (window.confirm('¿Limpiar todo el combate?')) {
            saveCombatState([]);
        }
    }

    const filteredEnemies = allEnemies.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalActiveConditions = combatants.reduce((total, combatant) => total + (combatant.conditions || []).length, 0);
    const woundedCombatants = combatants.filter((combatant) => {
        const vida = getStatValue(combatant, 'vida');
        return vida.max > 0 && vida.current < vida.max;
    }).length;

    const handleOpenDetails = (combatant) => {
        // Find the original template to show the "general" sheet
        const original = allEnemies.find(e => e.id === combatant.id);
        setDetailEnemy(original || combatant);
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#050b14] text-slate-200">
            {/* Toolbar */}
            <div className="shrink-0 border-b border-red-900/30 bg-[#0a1222]/95 shadow-[0_18px_45px_rgba(0,0,0,0.25)] backdrop-blur">
                <div className="mx-auto flex min-h-16 w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <div className="flex min-w-0 items-center gap-4">
                        <button onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-900/40 text-slate-500 transition-colors hover:border-red-500 hover:text-red-400">
                            <FiX className="h-5 w-5" />
                        </button>
                        <div className="min-w-0">
                            <h2 className="flex items-center gap-2 truncate font-['Cinzel'] text-lg font-bold uppercase tracking-wide text-red-50 sm:text-xl">
                                <Swords className="h-5 w-5 shrink-0 text-red-500" /> Gestor de Combate
                            </h2>
                            <span className="block truncate text-[10px] font-bold uppercase tracking-[0.25em] text-red-500/60">Sincronizado en tiempo real</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        {combatants.length > 0 && (
                            <button
                                onClick={clearCombat}
                                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-900 transition-colors hover:text-red-400"
                            >
                                Limpiar
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 rounded bg-red-800 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_18px_rgba(220,38,38,0.28)] transition-all hover:bg-red-700"
                        >
                            <FiPlus className="h-4 w-4" /> <span>Añadir Enemigo</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Combatants List */}
            <div className="relative flex-1 overflow-y-auto p-4 custom-scrollbar md:p-8">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_50%_0%,rgba(127,29,29,0.2),transparent_55%)]" />
                <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-20">
                    <div className="grid gap-4 border-b border-red-900/20 pb-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <div>
                            <div className="mb-2 flex items-center gap-3">
                                <div className="h-[1px] w-10 bg-red-500/70" />
                                <h3 className="font-['Cinzel'] text-sm font-bold uppercase tracking-[0.28em] text-red-400">Encuentro activo</h3>
                            </div>
                            <p className="max-w-2xl text-sm text-slate-500">
                                Ajusta recursos, revisa estados y abre la ficha completa de cada enemigo desde una sola vista.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 overflow-hidden rounded border border-red-900/25 bg-[#0a101d]/80">
                            <div className="border-r border-red-900/20 p-3 text-center">
                                <div className="font-['Cinzel'] text-xl font-bold text-red-50">{combatants.length}</div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Enemigos</div>
                            </div>
                            <div className="border-r border-red-900/20 p-3 text-center">
                                <div className="font-['Cinzel'] text-xl font-bold text-red-300">{woundedCombatants}</div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Heridos</div>
                            </div>
                            <div className="p-3 text-center">
                                <div className="font-['Cinzel'] text-xl font-bold text-purple-300">{totalActiveConditions}</div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Estados</div>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {combatants.map(combatant => (
                            <CombatantCard
                                key={combatant.instanceId}
                                combatant={combatant}
                                onUpdate={updateCombatant}
                                onRemove={removeCombatant}
                                onViewDetails={handleOpenDetails}
                                onOpenconditions={setConditionPickerTarget}
                            />
                        ))}
                    </AnimatePresence>

                    {combatants.length === 0 && (
                        <div className="flex min-h-[42vh] flex-col items-center justify-center rounded border border-dashed border-red-900/25 bg-[#0a101d]/45 px-6 py-16 text-center">
                            <Swords className="mb-4 h-14 w-14 text-red-900/60" />
                            <p className="font-['Cinzel'] text-xl uppercase tracking-wider text-red-100/70">El campo de batalla está vacío</p>
                            <p className="mt-2 max-w-md text-sm text-slate-500">Añade enemigos para comenzar el encuentro y controlar sus recursos en tiempo real.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-6 flex items-center gap-2 rounded border border-red-900/40 bg-red-950/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-300 transition-colors hover:border-red-500/60 hover:bg-red-900/30"
                            >
                                <FiPlus className="h-4 w-4" /> Añadir enemigo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Condition Picker Modal */}
            <AnimatePresence>
                {conditionPickerTarget && (
                    <motion.div
                        variants={overlayVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 bg-black/80 z-[70] backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setConditionPickerTarget(null)}
                    >
                        <motion.div
                            variants={modalVariants}
                            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded border border-red-900/35 bg-[#0b1120]/95 p-6 shadow-2xl custom-scrollbar sm:p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-['Cinzel'] font-bold text-xl text-red-50 uppercase tracking-wider">Estados Alterados</h3>
                                <button onClick={() => setConditionPickerTarget(null)} className="text-slate-500 hover:text-red-300 transition-colors p-1"><FiX size={20} /></button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {CONDITIONS.map(({ id, icon: Icon, color, label }) => {
                                    const isActive = (conditionPickerTarget.conditions || []).includes(id);
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => toggleConditionForTarget(id)}
                                            className={`
                                                flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-3 relative overflow-hidden group
                                                ${isActive
                                                    ? 'bg-red-950/20 border-red-500/45 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
                                                    : 'bg-black/40 border-slate-800 hover:border-red-500/30 hover:bg-black/60'}
                                            `}
                                        >
                                            <Icon className={`w-10 h-10 ${color.split(' ')[0]} ${isActive ? 'drop-shadow-[0_0_12px_currentColor]' : 'opacity-40 group-hover:opacity-100'} transition-all`} />
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-red-50' : 'text-slate-500 group-hover:text-slate-300'}`}>{label}</span>
                                            {isActive && <div className={`absolute inset-0 border-2 ${color.split(' ')[1]} rounded-xl opacity-30`}></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail View Modal */}
            <AnimatePresence>
                {detailEnemy && (
                    <motion.div
                        variants={overlayVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <motion.div
                            variants={modalVariants}
                            className="relative w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden rounded-2xl shadow-2xl border border-red-900/50 flex flex-col bg-[#0b1120]"
                        >
                            <EnemyDetailView
                                enemy={detailEnemy}
                                onClose={() => setDetailEnemy(null)}
                                onUpdate={(updated) => {
                                    onUpdateEnemy && onUpdateEnemy(updated);
                                    setAllEnemies(prev => prev.map(e => e.id === updated.id ? updated : e));
                                }}
                                onDelete={() => { }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Enemy Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        variants={overlayVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 bg-black/80 z-[70] backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            variants={modalVariants}
                            className="relative flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded border border-red-900/35 bg-[#0b1120]/95 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

                            <div className="flex items-center gap-4 border-b border-red-900/25 bg-[#101827]/70 p-5 backdrop-blur-md sm:p-6">
                                <FiSearch className="h-5 w-5 text-red-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="BUSCAR ENEMIGO..."
                                    className="w-full border-none bg-transparent font-['Cinzel'] text-lg font-bold text-red-50 outline-none placeholder:text-red-500/30 sm:text-xl"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors p-2"><FiX size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 custom-scrollbar">
                                {filteredEnemies.map(enemy => (
                                    <div
                                        key={enemy.id}
                                        onClick={() => addCombatant(enemy)}
                                        className="group flex cursor-pointer items-center gap-4 rounded border border-white/5 bg-[#050b14]/50 p-4 transition-all hover:border-red-500/45 hover:bg-red-950/10"
                                    >
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-black shadow-lg ring-1 ring-white/10 transition-all group-hover:ring-red-500/50">
                                            {enemy.image ? (
                                                <img src={enemy.image} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-[#1a1b26]"><Skull className="h-8 w-8 text-red-500/20" /></div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-['Cinzel'] font-bold text-lg text-red-50 truncate group-hover:text-red-300 transition-colors">{enemy.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{enemy.type}</p>
                                        </div>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500/30 text-red-300 opacity-0 transition-all group-hover:opacity-100">
                                            <FiPlus size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
