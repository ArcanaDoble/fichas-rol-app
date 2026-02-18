import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiPlus, FiMinus, FiShield, FiActivity, FiZap, FiMenu, FiCpu, FiTrash2 } from 'react-icons/fi';
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

const SegmentedStatControl = ({ icon: Icon, value, max, color, onChange, label }) => {
    if (max <= 0) return null;

    // Use smaller blocks if max is large to fit
    const isLarge = max > 10;

    return (
        <div className={`flex flex-col w-full max-w-[140px] ${color}`}>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 opacity-90">
                    <Icon className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
                </div>
                <div className="flex items-center gap-1 bg-black/40 rounded px-1 border border-white/5">
                    <button
                        onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, value - 1)); }}
                        className="hover:text-white transition-colors px-1"
                    >
                        <FiMinus className="w-3 h-3" />
                    </button>
                    <span className="min-w-[20px] text-center font-['Cinzel'] font-bold text-xs">{value}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + 1)); }}
                        className="hover:text-white transition-colors px-1"
                    >
                        <FiPlus className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Segments */}
            <div className="flex gap-[2px] h-2 w-full">
                {Array.from({ length: max }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-full rounded-[1px] transition-all duration-300 ${i < value
                            ? 'bg-current shadow-[0_0_8px_currentColor] opacity-100'
                            : 'bg-current opacity-10'
                            }`}
                    />
                ))}
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

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative bg-[#120505] border border-red-900/30 rounded-lg overflow-hidden flex flex-col md:flex-row shadow-lg"
        >
            {/* Portrait / Info Section */}
            <div
                className="relative w-full md:w-32 h-64 md:h-auto shrink-0 bg-black cursor-pointer group/portrait"
                onClick={() => onViewDetails(combatant)}
                title="Ver Ficha Completa"
            >
                {combatant.image ? (
                    <img
                        src={combatant.image}
                        alt={combatant.name}
                        className="w-full h-full object-cover object-top opacity-80 group-hover/portrait:opacity-100 transition-opacity"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-red-900/20">
                        <Skull className="w-10 h-10 text-red-900/50" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(combatant.instanceId); }}
                    className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-red-900 text-red-500 rounded-full transition-colors z-10"
                >
                    <FiTrash2 className="w-3 h-3" />
                </button>
                <div className="absolute bottom-2 left-2 right-2 text-left pointer-events-none">
                    <h3 className="text-xl md:text-sm font-['Cinzel'] font-bold text-white leading-tight truncate drop-shadow-md">{combatant.name}</h3>
                    <p className="text-xs md:text-[10px] text-red-400 font-bold uppercase tracking-wider drop-shadow-md">{combatant.type}</p>
                </div>
            </div>

            {/* Stats Controls */}
            <div className="flex-1 p-4 flex flex-col gap-4 justify-center">
                <div className="flex flex-wrap items-start justify-center md:justify-start gap-x-8 gap-y-6">
                    <SegmentedStatControl
                        icon={Shield}
                        label="POSTURA"
                        value={combatant.stats.postura.current}
                        max={combatant.stats.postura.max}
                        color="text-green-500"
                        onChange={(v) => updateStat('postura', v)}
                    />
                    <SegmentedStatControl
                        icon={Heart}
                        label="VIDA"
                        value={combatant.stats.vida.current}
                        max={combatant.stats.vida.max}
                        color="text-red-500"
                        onChange={(v) => updateStat('vida', v)}
                    />
                    <SegmentedStatControl
                        icon={Zap}
                        label="INGENIO"
                        value={combatant.stats.ingenio.current}
                        max={combatant.stats.ingenio.max}
                        color="text-blue-500"
                        onChange={(v) => updateStat('ingenio', v)}
                    />
                    <SegmentedStatControl
                        icon={Brain}
                        label="CORDURA"
                        value={combatant.stats.cordura.current}
                        max={combatant.stats.cordura.max}
                        color="text-purple-500"
                        onChange={(v) => updateStat('cordura', v)}
                    />
                    <SegmentedStatControl
                        icon={Shield}
                        label="ARMADURA"
                        value={combatant.stats.armadura.current}
                        max={combatant.stats.armadura.max}
                        color="text-slate-400"
                        onChange={(v) => updateStat('armadura', v)}
                    />
                </div>
            </div>

            {/* Status Effects Tags */}
            <div className="p-2 md:w-32 border-t md:border-t-0 md:border-l border-red-900/20 bg-black/20 flex flex-wrap content-start gap-1 justify-center md:justify-start">
                {(combatant.conditions || []).map(conditionId => {
                    const def = CONDITIONS.find(c => c.id === conditionId) || { id: conditionId, color: 'text-gray-400 border-gray-400', label: conditionId };
                    const Icon = def.icon || FiActivity;
                    return (
                        <button
                            key={conditionId}
                            onClick={() => removeCondition(conditionId)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border bg-black/40 hover:bg-red-900/30 transition-all ${def.color}`}
                        >
                            <Icon className="w-3 h-3" /> {def.label}
                        </button>
                    );
                })}
                <button
                    onClick={() => onOpenconditions(combatant)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border border-dashed border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300 transition-all ml-1"
                >
                    <FiPlus className="w-3 h-3" /> ESTADO
                </button>
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

    const handleOpenDetails = (combatant) => {
        // Find the original template to show the "general" sheet
        const original = allEnemies.find(e => e.id === combatant.id);
        setDetailEnemy(original || combatant);
    };

    return (
        <div className="fixed inset-0 bg-[#050b14] text-slate-200 z-[60] flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="h-16 bg-[#0a1222] border-b border-red-900/30 flex items-center justify-between px-4 shadow-xl shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 border border-red-900/30 rounded-full hover:border-red-500 hover:text-red-500 text-slate-400 transition-colors">
                        <FiX className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-['Cinzel'] font-bold text-red-100 flex items-center gap-2">
                            <Swords className="w-5 h-5 text-red-500" /> GESTOR DE COMBATE
                        </h2>
                        <span className="text-[10px] text-red-500/60 font-bold uppercase tracking-widest hidden md:inline-block">Sincronizado en tiempo real</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {combatants.length > 0 && (
                        <button
                            onClick={clearCombat}
                            className="px-3 py-2 text-xs font-bold text-red-900 hover:text-red-500 uppercase tracking-wider mr-2"
                        >
                            Limpiar
                        </button>
                    )}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
                    >
                        <FiPlus className="w-4 h-4" /> <span className="hidden md:inline">Añadir Enemigo</span>
                    </button>
                </div>
            </div>

            {/* Combatants List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
                <div className="max-w-4xl mx-auto flex flex-col gap-4 pb-20">
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
                        <div className="text-center py-20 opacity-30 flex flex-col items-center">
                            <Swords className="w-16 h-16 mb-4" />
                            <p className="font-['Cinzel'] text-xl">EL CAMPO DE BATALLA ESTÁ VACÍO</p>
                            <p className="text-sm">Añade enemigos para comenzar el encuentro</p>
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
                            className="bg-[#0b1120]/95 border border-[#c8aa6e]/30 rounded-2xl shadow-2xl p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto custom-scrollbar relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c8aa6e]/50 to-transparent" />

                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-['Cinzel'] font-bold text-xl text-[#f0e6d2] uppercase tracking-wider">Estados Alterados</h3>
                                <button onClick={() => setConditionPickerTarget(null)} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-1"><FiX size={20} /></button>
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
                                                    ? 'bg-[#c8aa6e]/10 border-[#c8aa6e]/50 shadow-[0_0_20px_rgba(200,170,110,0.15)]'
                                                    : 'bg-black/40 border-slate-800 hover:border-[#c8aa6e]/30 hover:bg-black/60'}
                                            `}
                                        >
                                            <Icon className={`w-10 h-10 ${color.split(' ')[0]} ${isActive ? 'drop-shadow-[0_0_12px_currentColor]' : 'opacity-40 group-hover:opacity-100'} transition-all`} />
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-[#f0e6d2]' : 'text-slate-500 group-hover:text-slate-300'}`}>{label}</span>
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
                            className="bg-[#0b1120]/95 w-full max-w-2xl h-[80vh] rounded-2xl border border-[#c8aa6e]/30 shadow-2xl flex flex-col overflow-hidden relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c8aa6e]/50 to-transparent" />

                            <div className="p-6 border-b border-[#c8aa6e]/20 flex items-center gap-4 bg-[#161f32]/50 backdrop-blur-md">
                                <FiSearch className="text-[#c8aa6e] w-5 h-5" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="BUSCAR ENEMIGO..."
                                    className="bg-transparent border-none outline-none text-[#f0e6d2] placeholder-[#c8aa6e]/30 font-['Cinzel'] font-bold text-xl w-full"
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
                                        className="group flex items-center gap-4 p-4 bg-[#050b14]/50 border border-white/5 hover:border-[#c8aa6e]/50 rounded-xl cursor-pointer transition-all hover:bg-[#c8aa6e]/5"
                                    >
                                        <div className="w-16 h-16 bg-black rounded-lg overflow-hidden shrink-0 border border-white/10 group-hover:border-[#c8aa6e]/50 shadow-lg">
                                            {enemy.image ? (
                                                <img src={enemy.image} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-[#1a1b26]"><Skull className="w-8 h-8 text-[#c8aa6e]/20" /></div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-['Cinzel'] font-bold text-lg text-[#f0e6d2] truncate group-hover:text-[#c8aa6e] transition-colors">{enemy.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{enemy.type}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full border border-[#c8aa6e]/30 flex items-center justify-center text-[#c8aa6e] opacity-0 group-hover:opacity-100 transition-all">
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
