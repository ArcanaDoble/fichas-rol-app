import React, { useState, useEffect } from 'react';
import { Shield, Lock, Zap, Star, Crown, Flame, Footprints, Sword, Hand, Clock, AlertCircle, HelpCircle, Eye, ArrowUpCircle, CornerDownRight, Edit2, Check, Plus, Trash2, Settings, Save, Skull, Heart, Ghost, Crosshair, Droplets, Sun, Moon, Sparkles } from 'lucide-react';

// --- POOLS DE CONFIGURACIÓN ---

const ICON_POOL = {
    sword: <Sword className="w-full h-full p-2" />,
    shield: <Shield className="w-full h-full p-2" />,
    magic: <Zap className="w-full h-full p-2" />,
    fire: <Flame className="w-full h-full p-2" />,
    star: <Star className="w-full h-full p-2" />,
    skull: <Skull className="w-full h-full p-2" />,
    heart: <Heart className="w-full h-full p-2" />,
    ghost: <Ghost className="w-full h-full p-2" />,
    crosshair: <Crosshair className="w-full h-full p-2" />,
    poison: <Droplets className="w-full h-full p-2" />,
    sun: <Sun className="w-full h-full p-2" />,
    moon: <Moon className="w-full h-full p-2" />,
    crown: <Crown className="w-full h-full p-2" />,
    eye: <Eye className="w-full h-full p-2" />,
    hand: <Hand className="w-full h-full p-2" />,
    arrowUp: <ArrowUpCircle className="w-full h-full p-2" />,
    book: <Clock className="w-full h-full p-2" /> // Using Clock as temp placeholder for book/ritual if Book icon missing or reuse
};

const COLOR_THEMES = {
    gold: {
        bg: 'bg-[#c8aa6e]/10',
        border: 'border-[#c8aa6e]',
        text: 'text-[#c8aa6e]',
        title: 'text-[#f0e6d2]',
        shadow: 'shadow-[0_0_20px_rgba(200,170,110,0.4)]',
        accent: 'bg-[#c8aa6e]',
        iconBg: 'bg-[#0b1120]',
        spinBorder: 'border-[#c8aa6e]/50',
    },
    red: {
        bg: 'bg-red-900/10',
        border: 'border-red-600',
        text: 'text-red-500',
        title: 'text-red-100',
        shadow: 'shadow-[0_0_20px_rgba(220,38,38,0.4)]',
        accent: 'bg-red-600',
        iconBg: 'bg-[#1a0505]',
        spinBorder: 'border-red-600/50',
    },
    blue: {
        bg: 'bg-blue-900/10',
        border: 'border-blue-500',
        text: 'text-blue-400',
        title: 'text-blue-100',
        shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        accent: 'bg-blue-500',
        iconBg: 'bg-[#050b1a]',
        spinBorder: 'border-blue-500/50',
    },
    green: {
        bg: 'bg-emerald-900/10',
        border: 'border-emerald-500',
        text: 'text-emerald-400',
        title: 'text-emerald-100',
        shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]',
        accent: 'bg-emerald-500',
        iconBg: 'bg-[#021f12]',
        spinBorder: 'border-emerald-500/50',
    },
    purple: {
        bg: 'bg-purple-900/10',
        border: 'border-purple-500',
        text: 'text-purple-400',
        title: 'text-purple-100',
        shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
        accent: 'bg-purple-500',
        iconBg: 'bg-[#15051a]',
        spinBorder: 'border-purple-500/50',
    },
    slate: {
        bg: 'bg-slate-800/10',
        border: 'border-slate-500',
        text: 'text-slate-400',
        title: 'text-slate-200',
        shadow: 'shadow-[0_0_20px_rgba(100,116,139,0.4)]',
        accent: 'bg-slate-500',
        iconBg: 'bg-[#0f172a]',
        spinBorder: 'border-slate-500/50',
    }
};

const CATEGORY_THEME = {
    movement: {
        color: 'border-red-800 bg-red-950/20 text-red-200',
        borderColor: 'border-red-900/30 hover:border-red-600',
        textColor: 'text-red-100 group-hover:text-red-400',
        icon: <Footprints className="w-5 h-5" />,
        title: 'MOVIMIENTO',
        limit: 'Limitado por velocidad',
    },
    action: {
        color: 'border-blue-800 bg-blue-950/20 text-blue-200',
        borderColor: 'border-blue-900/30 hover:border-blue-500',
        textColor: 'text-blue-100 group-hover:text-blue-400',
        icon: <Sword className="w-5 h-5" />,
        title: 'ACCIONES BÁSICAS',
        limit: '1 / Turno',
    },
    bonus: {
        color: 'border-purple-800 bg-purple-950/20 text-purple-200',
        borderColor: 'border-purple-900/30 hover:border-purple-500',
        textColor: 'text-purple-100 group-hover:text-purple-400',
        icon: <Zap className="w-5 h-5" />,
        title: 'ACCIONES EXCLUSIVAS',
        limit: 'Max. 4',
    },
    reaction: {
        color: 'border-green-800 bg-green-950/20 text-green-200',
        borderColor: 'border-green-900/30 hover:border-green-500',
        textColor: 'text-green-100 group-hover:text-green-400',
        icon: <Star className="w-5 h-5" />,
        title: 'TALENTOS',
        limit: 'Max. 3',
    }
};

// Initial Data
const INITIAL_ACTIONS = {
    movement: [
        { id: 'm1', name: 'Moverse', desc: 'Coste: 5 pies por 5 pies.' },
        { id: 'm2', name: 'Escalar / Nadar', desc: 'Coste: 10 pies por 5 pies.' },
        { id: 'm3', name: 'Levantarse', desc: 'Coste: Mitad de velocidad.' },
        { id: 'm4', name: 'Arrastrarse', desc: 'Coste: 10 pies por 5 pies.' },
        { id: 'm5', name: 'Tirarse al suelo', desc: 'Coste: 0 pies.' },
        { id: 'm6', name: 'Terreno Difícil', desc: 'Coste: +5 pies por 5 pies.' }
    ],
    action: [
        { id: 'a1', name: 'Atacar', desc: 'Cuerpo a cuerpo o distancia.' },
        { id: 'a2', name: 'Lanzar Conjuro', desc: 'Tiempo: 1 acción.' },
        { id: 'a3', name: 'Correr (Dash)', desc: 'Dobla tu velocidad.' },
        { id: 'a4', name: 'Destrabarse', desc: 'Evita ataques de oportunidad.' },
        { id: 'a5', name: 'Esquivar', desc: 'Desventaja en ataques contra ti.' },
        { id: 'a6', name: 'Ayudar', desc: 'Ventaja a un aliado.' },
        { id: 'a7', name: 'Esconderse', desc: 'Prueba de Sigilo.' },
        { id: 'a8', name: 'Preparar', desc: 'Disparador y Reacción.' },
        { id: 'a9', name: 'Usar Objeto', desc: 'Interactuar con mecanismo/poción.' }
    ],
    bonus: [
        // Empty by default, populated by selected skills
    ],
    reaction: [
        // Empty by default, populated by talents
    ]
};

export const RelicsView = ({ dndClass, onFeaturesChange, onActionsChange }) => {
    const [actionData, setActionData] = useState(() => dndClass.actionData || INITIAL_ACTIONS);
    const [features, setFeatures] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    // Initialize features from props
    useEffect(() => {
        setFeatures((dndClass.features || []).sort((a, b) => a.level - b.level));
    }, [dndClass.features]);

    // Also sync actionData if dndClass changes and has data
    useEffect(() => {
        if (dndClass.actionData) {
            setActionData(dndClass.actionData);
        }
    }, [dndClass.actionData]);

    const isFeatureUnlocked = (feature) => (dndClass.level || dndClass.currentLevel || 1) >= feature.level;

    // Filter unlocked class actions (auto-injected)
    const unlockedClassActions = features.filter(f => isFeatureUnlocked(f) && f.actionType);

    // --- CRUD HANDLERS FOR FEATURES ---
    const updateActionData = (newData) => {
        setActionData(newData);
        if (onActionsChange) onActionsChange(newData);
    };

    const handleUpdateAction = (category, id, field, value) => {
        const newData = {
            ...actionData,
            [category]: actionData[category].map(item => item.id === id ? { ...item, [field]: value } : item)
        };
        updateActionData(newData);
    };

    const handleDeleteAction = (category, id) => {
        const newData = {
            ...actionData,
            [category]: actionData[category].filter(item => item.id !== id)
        };
        updateActionData(newData);
    };

    const handleAddAction = (category) => {
        const newAction = {
            id: `custom-${Date.now()}`,
            name: 'Nueva Acción',
            desc: 'Descripción o Coste...',
            isClassFeature: false
        };
        const newData = {
            ...actionData,
            [category]: [...actionData[category], newAction]
        };
        updateActionData(newData);
    };

    // --- CRUD HANDLERS FOR FEATURES ---
    const updateFeatures = (newFeatures) => {
        setFeatures(newFeatures);
        if (onFeaturesChange) onFeaturesChange(newFeatures);
    };

    const handleUpdateFeature = (index, field, value) => {
        const newFeatures = [...features];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        updateFeatures(newFeatures);
    };

    const handleAddFeature = () => {
        const newFeature = {
            level: 1,
            name: 'Nuevo Rasgo',
            description: 'Descripción de la habilidad...',
            isUnlocked: true,
            actionType: 'PASSIVE',
            color: 'gold',
            icon: 'star',
            isUltimate: false
        };
        updateFeatures([...features, newFeature]);
    };

    const handleDeleteFeature = (index) => {
        updateFeatures(features.filter((_, i) => i !== index));
    };


    const handleToggleActionActive = (index) => {
        const newFeatures = [...features];
        if (!newFeatures[index]) return;

        const currentState = newFeatures[index].isActiveAction;
        // Check limits if trying to activate
        if (!currentState) {
            const activeCount = newFeatures.filter(f => f.isActiveAction).length;
            if (activeCount >= 4) {
                return; // Max 4 reached
            }
        }

        newFeatures[index] = { ...newFeatures[index], isActiveAction: !currentState };
        updateFeatures(newFeatures);
    };

    const handleToggleTalentActive = (id) => {
        const talents = [...actionData.reaction];
        const index = talents.findIndex(t => t.id === id);
        if (index === -1) return;

        const talent = talents[index];
        const currentState = talent.isActive;

        if (!currentState) {
            const activeCount = talents.filter(t => t.isActive).length;
            if (activeCount >= 3) return; // Max 3 Activas
        }

        talents[index] = { ...talent, isActive: !currentState };

        const newData = {
            ...actionData,
            reaction: talents
        };
        updateActionData(newData);
    };

    // --- ICONS ---
    const getFeatureIcon = (feature) => {
        // Use selected icon if available
        if (feature.icon && ICON_POOL[feature.icon]) {
            return ICON_POOL[feature.icon];
        }

        // Fallback logic
        const lower = feature.name.toLowerCase();
        if (lower.includes('ataque') || lower.includes('golpe')) return ICON_POOL.sword;
        if (lower.includes('magia') || lower.includes('conjuro')) return ICON_POOL.magic;
        if (lower.includes('divino') || lower.includes('sagrado')) return ICON_POOL.star;
        if (lower.includes('defensa') || lower.includes('protección')) return ICON_POOL.shield;
        return ICON_POOL.fire;
    };

    // --- RENDER BLOCK HELPER ---
    const renderActionBlock = (act, categoryKey) => {
        if (isEditing) {
            return (
                <div key={act.id} className="bg-[#161f32] border border-[#c8aa6e]/30 p-2 rounded relative flex flex-col gap-2 shadow-lg z-10">
                    <input
                        type="text"
                        value={act.name}
                        onChange={(e) => handleUpdateAction(categoryKey, act.id, 'name', e.target.value)}
                        className="bg-[#0b1120] text-[#c8aa6e] text-xs font-bold p-1 rounded border border-slate-700 focus:border-[#c8aa6e] outline-none"
                    />
                    <textarea
                        value={act.desc}
                        onChange={(e) => handleUpdateAction(categoryKey, act.id, 'desc', e.target.value)}
                        className="bg-[#0b1120] text-slate-400 text-[10px] p-1 rounded border border-slate-700 focus:border-[#c8aa6e] outline-none resize-none h-12"
                    />
                    <div className="flex items-center justify-between border-t border-slate-700 pt-2 mt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={act.isClassFeature || false}
                                onChange={(e) => handleUpdateAction(categoryKey, act.id, 'isClassFeature', e.target.checked)}
                                className="w-3 h-3 accent-[#c8aa6e] bg-[#0b1120] border-slate-600 rounded"
                            />
                            <span className="text-[9px] text-slate-400 uppercase font-bold">¿Habilidad?</span>
                        </label>
                        <button onClick={() => handleDeleteAction(categoryKey, act.id)} className="text-red-500 hover:bg-red-900/20 p-1 rounded">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            );
        }

        // Render View Mode
        if (act.isClassFeature) {
            // Gold Style (Like Class Feature)
            return (
                <div key={act.id} className="bg-[#c8aa6e]/10 border border-[#c8aa6e] p-2 rounded hover:bg-[#c8aa6e]/20 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-0.5 bg-[#c8aa6e] text-[#0b1120] text-[8px] font-bold uppercase tracking-wider rounded-bl">HABILIDAD</div>
                    <div className="text-[#c8aa6e] font-bold text-xs mb-1 font-fantasy pr-2">{act.name}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{act.desc}</div>
                </div>
            );
        } else {
            // Standard Category Style
            const theme = CATEGORY_THEME[categoryKey];
            return (
                <div key={act.id} className={`bg-[#0b1120] border ${theme.borderColor} p-2 rounded transition-colors group`}>
                    <div className={`${theme.textColor} font-bold text-xs mb-1`}>{act.name}</div>
                    <div className="text-[10px] text-slate-500 leading-tight">{act.desc}</div>
                </div>
            );
        }
    };

    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#09090b]">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 border-b border-[#c8aa6e]/20 pb-6">
                    <div>
                        <h2 className="text-3xl font-fantasy text-[#f0e6d2] mb-2">GUÍA DE ACCIONES & TALENTOS</h2>
                        <p className="text-slate-400 text-xs uppercase tracking-widest">Referencia de Combate + Rasgos de Clase</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* EDIT TOGGLE */}
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest border transition-all ${isEditing ? 'bg-[#c8aa6e] text-[#0b1120] border-[#c8aa6e]' : 'bg-transparent border-slate-700 text-slate-500 hover:border-[#c8aa6e] hover:text-[#c8aa6e]'}`}
                        >
                            {isEditing ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                            {isEditing ? 'Finalizar' : 'Editar'}
                        </button>

                        <div className="hidden md:flex items-center gap-3 bg-[#161f32] px-4 py-2 rounded-full border border-[#c8aa6e]/30">
                            <div className="w-3 h-3 rounded-full bg-[#c8aa6e] animate-pulse"></div>
                            <span className="text-xs font-bold text-[#c8aa6e] uppercase tracking-wider">Nivel {dndClass.level || dndClass.currentLevel || 1}</span>
                        </div>
                    </div>
                </div>

                {/* --- SECTION 1: ACTION REFERENCE GUIDE --- */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-16">

                    {/* MOVEMENT */}
                    <div className="xl:col-span-4 bg-gradient-to-r from-red-950/40 to-transparent border-l-4 border-red-800 p-1 rounded-r-lg">
                        <div className="flex items-center justify-between bg-red-950/50 p-2 px-4 rounded mb-2">
                            <div className="flex items-center gap-2 text-red-200 font-fantasy tracking-widest text-sm font-bold">
                                {CATEGORY_THEME.movement.icon} {CATEGORY_THEME.movement.title}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-red-400">{CATEGORY_THEME.movement.limit}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {actionData.movement.map(act => renderActionBlock(act, 'movement'))}
                            {isEditing && (
                                <button onClick={() => handleAddAction('movement')} className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-700 rounded hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 text-slate-500 hover:text-[#c8aa6e] transition-colors min-h-[60px]">
                                    <Plus className="w-5 h-5 mb-1" />
                                    <span className="text-[9px] font-bold uppercase">Añadir</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ACTION */}
                    <div className="xl:col-span-4 bg-gradient-to-r from-blue-950/40 to-transparent border-l-4 border-blue-800 p-1 rounded-r-lg">
                        <div className="flex items-center justify-between bg-blue-950/50 p-2 px-4 rounded mb-2">
                            <div className="flex items-center gap-2 text-blue-200 font-fantasy tracking-widest text-sm font-bold">
                                {CATEGORY_THEME.action.icon} {CATEGORY_THEME.action.title}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-blue-400">{CATEGORY_THEME.action.limit}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {actionData.action.map(act => renderActionBlock(act, 'action'))}

                            {/* INJECTED CLASS ACTIONS */}


                            {isEditing && (
                                <button onClick={() => handleAddAction('action')} className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-700 rounded hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 text-slate-500 hover:text-[#c8aa6e] transition-colors min-h-[60px]">
                                    <Plus className="w-5 h-5 mb-1" />
                                    <span className="text-[9px] font-bold uppercase">Añadir</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ACCIONES EXCLUSIVAS (Dynasty Warrior esque slots) */}
                    <div className="xl:col-span-2 bg-gradient-to-r from-purple-950/40 to-transparent border-l-4 border-purple-800 p-1 rounded-r-lg">
                        <div className="flex items-center justify-between bg-purple-950/50 p-2 px-4 rounded mb-2">
                            <div className="flex items-center gap-2 text-purple-200 font-fantasy tracking-widest text-sm font-bold">
                                {CATEGORY_THEME.bonus.icon} {CATEGORY_THEME.bonus.title}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-purple-400">Max. 4 Activas</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Map ALL unlocked class actions directly here */}
                            {unlockedClassActions.map((feat, i) => {
                                const realIndex = features.indexOf(feat);
                                const isActive = feat.isActiveAction;
                                const isUlt = feat.isUltimate;

                                // Determine styling based on active state
                                // Active: Use the feature's defined color theme (or gold default)
                                // Inactive: Use a dimmed purple "available" style
                                const colorKey = feat.color || 'gold';
                                const theme = COLOR_THEMES[colorKey];

                                // Ultimate specific overrides
                                const ultBorder = isActive ? 'border-yellow-500' : 'border-yellow-900/60 hover:border-yellow-500/60';
                                const ultShadow = isActive ? 'shadow-[0_0_25px_rgba(234,179,8,0.5)]' : '';
                                const ultBg = isActive ? 'bg-gradient-to-br from-yellow-950/40 to-purple-950/20' : 'bg-purple-900/10';

                                return (
                                    <div
                                        key={`exclusive-opt-${i}`}
                                        className={`
                                            p-2 rounded border transition-all duration-300 cursor-pointer relative overflow-hidden group
                                            ${isUlt
                                                ? `${ultBorder} ${ultShadow} ${ultBg} ${!isActive ? 'opacity-80 hover:opacity-100' : ''}`
                                                : isActive
                                                    ? `${theme.bg} ${theme.border} hover:bg-opacity-40 shadow-[0_0_15px_rgba(0,0,0,0.5)]`
                                                    : 'bg-purple-900/10 border-purple-800/50 hover:border-purple-500 hover:bg-purple-900/20 opacity-70 hover:opacity-100'
                                            }
                                         `}
                                        onClick={() => handleToggleActionActive(realIndex)}
                                    >
                                        {/* Ultimate Background Effect */}
                                        {isUlt && isActive && (
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none"></div>
                                        )}

                                        {/* Active Indicator Badge */}
                                        {isActive && (
                                            <div className={`absolute top-0 right-0 p-0.5 ${isUlt ? 'bg-yellow-500 text-black' : `${theme.accent} text-[#0b1120]`} text-[8px] font-bold uppercase tracking-wider rounded-bl shadow-sm z-10`}>
                                                ACTIVA
                                            </div>
                                        )}

                                        {/* Definitive/Ultimate Indicator */}
                                        {isUlt && (
                                            <div className={`absolute bottom-0 right-0 p-1 ${isActive ? 'text-yellow-500 opacity-20 scale-150' : 'text-yellow-700 opacity-10'} pointer-events-none transition-all`}>
                                                <Crown className="w-8 h-8 rotate-12" />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5 mb-1 relative z-10">
                                            {isUlt && <Crown className={`w-3 h-3 ${isActive ? 'text-yellow-400' : 'text-yellow-600'}`} />}
                                            <div className={`font-fantasy font-bold text-xs transition-colors ${isUlt && isActive ? 'text-yellow-200' : isActive ? theme.text : 'text-purple-300 group-hover:text-purple-200'}`}>
                                                {feat.name}
                                            </div>
                                        </div>

                                        <div className={`text-[10px] leading-tight line-clamp-2 relative z-10 ${isActive ? 'text-slate-300' : 'text-purple-400/80 group-hover:text-purple-300'}`}>
                                            {feat.description}
                                        </div>

                                        {/* Pulse effect for active items */}
                                        {isActive && (
                                            <div className={`absolute inset-0 border ${isUlt ? 'border-yellow-400' : theme.border} opacity-20 animate-pulse pointer-events-none rounded`}></div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Show message if no skills are unlocked yet */}
                            {unlockedClassActions.length === 0 && (
                                <div className="col-span-full border border-dashed border-purple-800/30 bg-purple-900/5 p-4 rounded text-center text-purple-500/50 text-xs italic">
                                    No hay habilidades de clase desbloqueadas todavía. Sube de nivel para acceder a tus acciones exclusivas.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TALENTOS (Passive Buffs / Reactions) */}
                    <div className="xl:col-span-2 bg-gradient-to-r from-green-950/40 to-transparent border-l-4 border-green-800 p-1 rounded-r-lg">
                        <div className="flex items-center justify-between bg-green-950/50 p-2 px-4 rounded mb-2">
                            <div className="flex items-center gap-2 text-green-200 font-fantasy tracking-widest text-sm font-bold">
                                {CATEGORY_THEME.reaction.icon} {CATEGORY_THEME.reaction.title}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-green-400">Max. 3 Activas</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                            {/* VIEW MODE: Custom Toggleable Cards */}
                            {!isEditing && actionData.reaction.map((act) => {
                                const isActive = act.isActive;
                                return (
                                    <div
                                        key={act.id}
                                        className={`
                                            p-2 rounded border transition-all duration-300 cursor-pointer relative overflow-hidden group min-h-[60px]
                                            ${isActive
                                                ? 'border-green-500 bg-green-950/60 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                                : 'bg-green-900/5 border-green-900/20 hover:border-green-500/50 hover:bg-green-900/20 opacity-60 hover:opacity-100'}
                                         `}
                                        onClick={() => handleToggleTalentActive(act.id)}
                                    >
                                        {isActive && (
                                            <div className="absolute top-0 right-0 p-0.5 bg-green-600 text-[#0b1120] text-[8px] font-bold uppercase tracking-wider rounded-bl shadow-sm">
                                                ACTIVO
                                            </div>
                                        )}
                                        <div className={`font-fantasy font-bold text-xs mb-1 pr-10 transition-colors ${isActive ? 'text-green-100' : 'text-green-200/50 group-hover:text-green-200'}`}>
                                            {act.name}
                                        </div>
                                        <div className={`text-[10px] leading-tight line-clamp-2 ${isActive ? 'text-green-100/80' : 'text-green-500/50 group-hover:text-green-400'}`}>
                                            {act.desc}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* EDIT MODE: Use standard builder blocks */}
                            {isEditing && actionData.reaction.map(act => renderActionBlock(act, 'reaction'))}

                            {isEditing && (
                                <button onClick={() => handleAddAction('reaction')} className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-700 rounded hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 text-slate-500 hover:text-[#c8aa6e] transition-colors min-h-[60px]">
                                    <Plus className="w-5 h-5 mb-1" />
                                    <span className="text-[9px] font-bold uppercase">Añadir Talento</span>
                                </button>
                            )}

                            {/* Empty State if View Mode and no items */}
                            {!isEditing && actionData.reaction.length === 0 && (
                                <div className="col-span-full border border-dashed border-green-900/30 bg-green-950/10 p-4 rounded text-center text-green-500/50 text-xs italic">
                                    No hay talentos configurados.
                                </div>
                            )}
                        </div>
                    </div>

                </div>


                {/* --- SECTION 2: CLASS FEATURES (RELICS) - EDITABLE BUILDER --- */}

                <div className="flex items-center gap-4 mb-8">
                    <div className="h-[1px] flex-1 bg-[#c8aa6e]/20"></div>
                    <h3 className="text-[#c8aa6e] font-fantasy text-xl tracking-widest uppercase">
                        {isEditing ? 'CONSTRUCTOR DE HABILIDADES DE CLASE' : `RASGOS EXCLUSIVOS: ${dndClass.name}`}
                    </h3>
                    <div className="h-[1px] flex-1 bg-[#c8aa6e]/20"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
                    {features.map((feature, idx) => {
                        const unlocked = isFeatureUnlocked(feature) || isEditing;
                        // Determine theme based on feature color
                        const theme = COLOR_THEMES[feature.color || 'gold'];
                        const isUlt = feature.isUltimate;

                        return (
                            <div
                                key={idx}
                                className={`
                                group relative aspect-[3/4.5] perspective-1000 transition-all duration-500
                                ${unlocked ? 'opacity-100' : 'opacity-80 grayscale'}
                                ${isUlt && !isEditing ? 'scale-105' : ''}
                            `}
                            >
                                {/* CARD CONTAINER */}
                                <div className={`
                                w-full h-full relative rounded-xl overflow-hidden border-[3px] shadow-2xl transition-all duration-300
                                ${unlocked
                                        ? isUlt
                                            ? 'border-transparent bg-[#1a0b05]' // Border handled by ring/glow for Ultimate
                                            : `${theme.border} bg-[#1a0b05] ${theme.shadow}`
                                        : 'border-slate-700 bg-[#0f1219] shadow-none'
                                    }
                                ${isUlt && !isEditing ? 'ring-2 ring-yellow-400 shadow-[0_0_40px_rgba(251,191,36,0.6)]' : ''}
                            `}>
                                    {/* Ultimate Glow Animation */}
                                    {isUlt && !isEditing && (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 via-transparent to-purple-500/20 animate-pulse z-0 pointer-events-none"></div>
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent z-10"></div>
                                        </>
                                    )}

                                    {/* Background Texture */}
                                    <div className="absolute inset-0 z-0">
                                        <div className={`absolute inset-0 opacity-20 ${unlocked ? 'bg-[url("https://www.transparenttextures.com/patterns/black-scales.png")]' : 'bg-[url("https://www.transparenttextures.com/patterns/diagmonds-light.png")]'}`}></div>
                                        <div className={`absolute inset-0 bg-gradient-to-b ${unlocked ? `from-${feature.color === 'gold' ? '[#c8aa6e]' : feature.color === 'red' ? 'red-600' : feature.color === 'blue' ? 'blue-500' : feature.color === 'green' ? 'emerald-500' : feature.color === 'purple' ? 'purple-500' : 'slate-500'}/10 via-transparent to-[#0b1120]` : 'from-black via-black/80 to-black'}`}></div>
                                    </div>

                                    {/* EDIT MODE FORM */}
                                    {isEditing ? (
                                        <div className="relative z-20 flex flex-col h-full p-4 gap-2 bg-[#0b1120]/90 backdrop-blur-sm">
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold">Nivel</label>
                                                    <input
                                                        type="number"
                                                        min="1" max="20"
                                                        value={feature.level}
                                                        onChange={(e) => handleUpdateFeature(idx, 'level', parseInt(e.target.value))}
                                                        className="w-12 bg-[#161f32] border border-slate-700 rounded p-1 text-center text-[#c8aa6e] font-bold text-xs"
                                                    />
                                                </div>
                                                <button onClick={() => handleDeleteFeature(idx)} className="text-red-500 hover:text-red-400">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex flex-col">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={feature.name}
                                                    onChange={(e) => handleUpdateFeature(idx, 'name', e.target.value)}
                                                    className="w-full bg-[#161f32] border border-slate-700 rounded p-1.5 text-[#f0e6d2] font-fantasy font-bold text-sm tracking-wide focus:border-[#c8aa6e] outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold">Acción</label>
                                                    <select
                                                        value={feature.actionType || 'PASSIVE'}
                                                        onChange={(e) => handleUpdateFeature(idx, 'actionType', e.target.value)}
                                                        className="w-full bg-[#161f32] border border-slate-700 rounded p-1.5 text-slate-300 text-xs focus:border-[#c8aa6e] outline-none"
                                                    >
                                                        <option value="PASSIVE">Pasiva</option>
                                                        <option value="ACTION">Acción</option>
                                                        <option value="BONUS">Bonificación</option>
                                                        <option value="REACTION">Reacción</option>
                                                        <option value="MOVEMENT">Movimiento</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold">Icono</label>
                                                    <select
                                                        value={feature.icon || 'star'}
                                                        onChange={(e) => handleUpdateFeature(idx, 'icon', e.target.value)}
                                                        className="w-full bg-[#161f32] border border-slate-700 rounded p-1.5 text-slate-300 text-xs focus:border-[#c8aa6e] outline-none"
                                                    >
                                                        {Object.keys(ICON_POOL).map(iconKey => (
                                                            <option key={iconKey} value={iconKey}>{iconKey.charAt(0).toUpperCase() + iconKey.slice(1)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* COLOR PICKER */}
                                            <div className="flex flex-col">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold mb-1">Color del Tema</label>
                                                <div className="flex gap-2">
                                                    {Object.keys(COLOR_THEMES).map((colorKey) => (
                                                        <div
                                                            key={colorKey}
                                                            onClick={() => handleUpdateFeature(idx, 'color', colorKey)}
                                                            className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-transform hover:scale-110 ${feature.color === colorKey ? 'border-white scale-110' : 'border-transparent'}`}
                                                            style={{ backgroundColor: colorKey === 'gold' ? '#c8aa6e' : colorKey === 'slate' ? '#64748b' : colorKey === 'purple' ? '#a855f7' : colorKey }}
                                                            title={colorKey}
                                                        ></div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* ULTIMATE TOGGLE */}
                                            <label className="flex items-center gap-2 cursor-pointer mt-1 bg-black/40 p-1.5 rounded border border-yellow-500/30">
                                                <input
                                                    type="checkbox"
                                                    checked={feature.isUltimate || false}
                                                    onChange={(e) => handleUpdateFeature(idx, 'isUltimate', e.target.checked)}
                                                    className="w-3 h-3 accent-yellow-500 bg-[#0b1120] border-slate-600 rounded"
                                                />
                                                <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1">
                                                    <Crown className="w-3 h-3" /> Habilidad Definitiva
                                                </span>
                                            </label>

                                            <div className="flex-1 flex flex-col mt-1">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold">Descripción</label>
                                                <textarea
                                                    value={feature.description}
                                                    onChange={(e) => handleUpdateFeature(idx, 'description', e.target.value)}
                                                    className="flex-1 w-full bg-[#161f32] border border-slate-700 rounded p-2 text-slate-400 text-xs resize-none focus:border-[#c8aa6e] outline-none leading-relaxed"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        /* VIEW MODE CONTENT */
                                        <div className="relative z-10 flex flex-col h-full p-6 items-center text-center">
                                            <div className={`
                                            mb-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border
                                            ${unlocked ? (isUlt ? 'bg-yellow-900/40 border-yellow-500 text-yellow-200 shadow-[0_0_10px_orange]' : `${theme.bg} ${theme.border} ${theme.text}`) : 'bg-slate-800 border-slate-600 text-slate-500'}
                                        `}>
                                                Nivel {feature.level}
                                            </div>

                                            <div className={`
                                            w-24 h-24 rounded-full border-2 mb-6 flex items-center justify-center relative
                                            ${unlocked
                                                    ? isUlt
                                                        ? 'border-yellow-400 bg-black/50 text-yellow-400 shadow-[0_0_20px_rgba(255,215,0,0.5)]'
                                                        : `${theme.border} ${theme.iconBg} ${theme.text} ${theme.shadow}`
                                                    : 'border-slate-700 bg-[#0f1219] text-slate-700'}
                                        `}>
                                                <div className={`absolute inset-1 rounded-full border border-dashed ${unlocked ? (isUlt ? 'border-yellow-500' : theme.spinBorder) : 'border-slate-800'}`}></div>
                                                {unlocked ? getFeatureIcon(feature) : <Lock className="w-8 h-8" />}
                                            </div>

                                            <h3 className={`
                                            text-xl font-fantasy font-bold uppercase tracking-wide mb-3
                                            ${unlocked
                                                    ? isUlt ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-400 to-yellow-200 drop-shadow-md animate-pulse' : `${theme.title} drop-shadow-md`
                                                    : 'text-slate-600'}
                                        `}>
                                                {feature.name}
                                            </h3>

                                            {feature.actionType && unlocked && (
                                                <div className={`mb-2 px-2 py-0.5 rounded ${theme.bg} ${theme.text} text-[9px] font-bold uppercase border border-opacity-30`}>
                                                    {feature.actionType}
                                                </div>
                                            )}

                                            <div className={`w-16 h-[2px] mb-4 ${unlocked ? theme.accent : 'bg-slate-700'}`}></div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
                                                <p className={`text-xs leading-relaxed font-serif ${unlocked ? 'text-slate-300' : 'text-slate-600 italic'}`}>
                                                    {feature.description}
                                                </p>
                                            </div>

                                            {/* ULTIMATE BADGE */}
                                            {isUlt && unlocked && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-900/80 to-transparent pt-6 pb-2">
                                                    <div className="inline-flex items-center gap-2 text-[10px] font-bold text-yellow-300 tracking-[0.2em] uppercase border-t border-yellow-500/50 pt-1 px-4">
                                                        <Sparkles className="w-3 h-3" /> DEFINITIVA <Sparkles className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {unlocked && !isEditing && (
                                        <>
                                            <div className={`absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 ${isUlt ? 'border-yellow-500' : theme.border}`}></div>
                                            <div className={`absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 ${isUlt ? 'border-yellow-500' : theme.border}`}></div>
                                            <div className={`absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 ${isUlt ? 'border-yellow-500' : theme.border}`}></div>
                                            <div className={`absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 ${isUlt ? 'border-yellow-500' : theme.border}`}></div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* ADD NEW FEATURE BUTTON */}
                    {isEditing && (
                        <div
                            onClick={handleAddFeature}
                            className="group relative aspect-[3/4.5] rounded-xl cursor-pointer border-2 border-dashed border-[#c8aa6e]/40 hover:border-[#c8aa6e] bg-[#0b1120]/50 hover:bg-[#c8aa6e]/5 transition-all flex flex-col items-center justify-center gap-4"
                        >
                            <div className="w-16 h-16 rounded-full border border-[#c8aa6e]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8 text-[#c8aa6e]" />
                            </div>
                            <div className="text-center">
                                <div className="text-[#c8aa6e] font-fantasy font-bold uppercase tracking-wider">Añadir Rasgo</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
