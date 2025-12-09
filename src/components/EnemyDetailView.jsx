import React, { useState, useRef, useEffect } from 'react';
import { Skull, Shield, Heart, Activity, Camera, Save, Trash2, Edit2, X, Plus, Play, Minus, Target, Brain, Zap } from 'lucide-react';
import { FiX, FiEdit2, FiPlus, FiCheckSquare, FiMinus } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- HELPER COMPONENTS ---

const DiceSelector = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const diceOptions = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-[60px] h-[60px] transition-transform hover:scale-110 focus:outline-none"
            >
                <img
                    src={`/dados/${value.toUpperCase()}.png`}
                    alt={value}
                    className="w-full h-full object-contain drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]"
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#0f172a] border border-red-500/40 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50 p-3 grid grid-cols-3 gap-3 w-[180px] backdrop-blur-md"
                    >
                        {diceOptions.map((dice) => (
                            <button
                                key={dice}
                                onClick={() => {
                                    onChange(dice);
                                    setIsOpen(false);
                                }}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 group ${value === dice ? 'bg-red-500/20 border border-red-500/50' : 'hover:bg-red-500/10 border border-transparent'}`}
                            >
                                <div className="w-8 h-8 mb-1 transition-transform group-hover:scale-110">
                                    <img src={`/dados/${dice.toUpperCase()}.png`} alt={dice} className="w-full h-full object-contain" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${value === dice ? 'text-red-500' : 'text-slate-400 group-hover:text-red-500'}`}>
                                    {dice.toUpperCase()}
                                </span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatBar = ({ label, statKey, current, max, colorClass, borderClass, bgClass, updateStat, isEditing }) => {
    const handleDecrementCurrent = () => updateStat(statKey, 'current', Math.max(0, current - 1));
    const handleIncrementCurrent = () => updateStat(statKey, 'current', Math.min(max, current + 1));
    const handleDecrementMax = () => updateStat(statKey, 'max', Math.max(1, max - 1));
    const handleIncrementMax = () => updateStat(statKey, 'max', Math.min(20, max + 1));

    return (
        <div className="flex flex-col w-full">
            <div className="flex items-end justify-between mb-2">
                <span className="text-red-100 font-['Cinzel'] font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                    <span className="w-1 h-1 bg-red-500 rotate-45"></span>
                    {label}
                </span>

                {/* Visual Controls for Value Editing - Only show if editing */}
                {isEditing && (
                    <div className="flex items-center gap-3 bg-[#0b1120] border border-red-900/30 rounded px-3 py-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Valor</span>
                            <button onClick={handleDecrementCurrent} className="text-slate-400 hover:text-red-500 transition-colors"><FiMinus className="w-3 h-3" /></button>
                            <span className={`text-xs font-mono w-4 text-center font-bold ${colorClass}`}>{current}</span>
                            <button onClick={handleIncrementCurrent} className="text-slate-400 hover:text-red-500 transition-colors"><FiPlus className="w-3 h-3" /></button>
                        </div>
                        <div className="w-[1px] h-3 bg-slate-700"></div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Max</span>
                            <button onClick={handleDecrementMax} className="text-slate-400 hover:text-red-500 transition-colors"><FiMinus className="w-3 h-3" /></button>
                            <span className="text-xs font-mono w-4 text-center text-slate-400">{max}</span>
                            <button onClick={handleIncrementMax} className="text-slate-400 hover:text-red-500 transition-colors"><FiPlus className="w-3 h-3" /></button>
                        </div>
                    </div>
                )}
                {!isEditing && (
                    <div className="flex items-center justify-center min-w-[60px]">
                        <span className="font-['Cinzel'] font-bold text-sm tracking-widest text-[#e8b0b0]">
                            {current}
                        </span>
                        <span className="mx-1.5 text-red-500/50 text-xs font-bold">/</span>
                        <span className="font-['Cinzel'] font-bold text-sm tracking-widest text-red-700/80">
                            {max}
                        </span>
                    </div>
                )}
            </div>

            {/* Segmented Bar */}
            <div className="flex h-6 w-full max-w-[420px] relative pl-1">
                {Array.from({ length: max }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-full transition-all duration-300 relative min-w-[20px] ${i < current ? bgClass + ' ' + borderClass : bgClass + '/20 ' + borderClass + '/30'}`}
                        style={{
                            clipPath: i === 0
                                ? 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
                                : 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)',
                            marginLeft: i === 0 ? '0' : '-6px',
                            zIndex: max - i,
                            filter: 'drop-shadow(2px 0 0 rgba(0,9,11,0.8))'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20"></div>
                    </div>
                ))}
            </div>
            <div className="w-full h-[1px] bg-gradient-to-r from-red-900/50 to-transparent mt-3"></div>
        </div>
    );
};

const EditableField = ({
    value,
    onChange,
    onCommit,
    placeholder = 'Haz clic para editar',
    multiline = false,
    className = '',
    inputClassName = '',
    textClassName = '',
    type = 'text',
    autoSelect = true,
    showEditIcon = true,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (autoSelect && typeof inputRef.current.select === 'function') {
                inputRef.current.select();
            }
        }
    }, [isEditing, autoSelect]);

    const handleBlur = () => {
        setIsEditing(false);
        if (onCommit) onCommit();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !multiline) {
            event.preventDefault();
            setIsEditing(false);
            if (onCommit) onCommit();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            setIsEditing(false);
        }
    };

    const baseInputClasses =
        'w-full bg-black/50 border border-red-500/50 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-red-500 transition-colors';

    const displayValue = value && value.toString().length > 0 ? value : placeholder;
    const isPlaceholder = !value || value.toString().length === 0;

    return (
        <div className={`relative group/edit ${className}`}>
            {isEditing ? (
                multiline ? (
                    <textarea
                        ref={inputRef}
                        value={value || ''}
                        onChange={(event) => onChange(event.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className={`${baseInputClasses} min-h-[100px] resize-none ${inputClassName}`}
                        placeholder={placeholder}
                    />
                ) : (
                    <input
                        ref={inputRef}
                        type={type}
                        value={value || ''}
                        onChange={(event) => onChange(event.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className={`${baseInputClasses} ${inputClassName}`}
                        placeholder={placeholder}
                    />
                )
            ) : (
                <div
                    onClick={() => setIsEditing(true)}
                    className="relative cursor-pointer flex items-center gap-2"
                >
                    <span className={`${textClassName} ${isPlaceholder ? 'opacity-50 italic' : ''}`}>
                        {displayValue}
                    </span>
                    {showEditIcon && <FiEdit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/edit:opacity-100 transition-opacity" />}
                </div>
            )}
        </div>
    );
};

export const EnemyDetailView = ({ enemy, onClose, onUpdate, onDelete }) => {
    // Initial State Setup with Fallbacks for Attributes and Stats
    const [localEnemy, setLocalEnemy] = useState(() => {
        const initial = { ...enemy };

        // Ensure Attributes
        if (!initial.attributes) {
            initial.attributes = {
                dexterity: 'd4',
                vigor: 'd4',
                intellect: 'd4',
                willpower: 'd4'
            };
        }

        // Ensure Stats
        if (!initial.stats) {
            initial.stats = {
                postura: { current: 3, max: 4 },
                vida: { current: initial.hp || 4, max: initial.hp || 4 }, // Fallback to flat HP if exists
                ingenio: { current: 2, max: 3 },
                cordura: { current: 3, max: 3 },
                armadura: { current: initial.ac ? Math.min(initial.ac, 10) : 1, max: initial.ac ? Math.min(initial.ac, 10) : 1 } // Fallback to AC
            };
        }

        // Ensure Tags
        if (!initial.tags) {
            initial.tags = [];
        }

        return initial;
    });

    const [isUploading, setIsUploading] = useState(false);
    const [isStatsEditing, setIsStatsEditing] = useState(false);
    const fileInputRef = useRef(null);

    // Sync local state if prop changes, preserving structure
    useEffect(() => {
        setLocalEnemy(prev => {
            const updated = { ...enemy };
            // Preserve robust structure if incoming enemy lacks it
            if (!updated.attributes) updated.attributes = prev.attributes;
            if (!updated.stats) updated.stats = prev.stats;
            return updated;
        });
    }, [enemy]);

    const handleFieldChange = (field, value) => {
        setLocalEnemy(prev => {
            const updated = { ...prev, [field]: value };
            onUpdate(updated); // Auto-save on top level changes
            return updated;
        });
    };

    // Commit changes is now handled mostly inline by the specific updaters,
    // but EditableField uses this for text/desc
    // Commit changes is now handled mostly inline by the specific updaters,
    // but EditableField uses this for text/desc
    const handleCommit = () => {
        setLocalEnemy(prev => {
            // Filter out empty tags on commit
            const cleanTags = (prev.tags || []).filter(t => t.trim() !== '');

            // Only update if changes occurred (optimization, but simple check is okay)
            const updated = { ...prev, tags: cleanTags };
            onUpdate(updated);
            return updated;
        });
    };

    const updateAttribute = (key, value) => {
        setLocalEnemy(prev => {
            const updated = {
                ...prev,
                attributes: {
                    ...prev.attributes,
                    [key]: value
                }
            };
            onUpdate(updated);
            return updated;
        });
    };

    const updateStat = (statKey, field, value) => {
        setLocalEnemy(prev => {
            const currentStat = prev.stats[statKey] || { current: 0, max: 0 };
            const updatedStat = { ...currentStat, [field]: value };

            // Logic: if current > max, clamp it (optional, but good UX)
            if (field === 'max' && updatedStat.current > value) {
                updatedStat.current = value;
            }

            const updated = {
                ...prev,
                stats: {
                    ...prev.stats,
                    [statKey]: updatedStat
                }
            };
            onUpdate(updated);
            return updated;
        });
    };

    const handleAddTag = () => {
        setLocalEnemy(prev => {
            const updated = { ...prev, tags: [...(prev.tags || []), "ETIQUETA"] };
            onUpdate(updated);
            return updated;
        });
    };

    const handleTagChange = (index, value) => {
        setLocalEnemy(prev => {
            const newTags = [...(prev.tags || [])];
            newTags[index] = value;
            const updated = { ...prev, tags: newTags };
            onUpdate(updated);
            return updated;
        });
    };

    const handleAbilityChange = (index, field, value) => {
        const newAbilities = [...(localEnemy.abilities || [])];
        if (typeof newAbilities[index] === 'string') {
            newAbilities[index] = { name: newAbilities[index], description: '' };
        }
        newAbilities[index] = { ...newAbilities[index], [field]: value };

        setLocalEnemy(prev => {
            const updated = { ...prev, abilities: newAbilities };
            onUpdate(updated);
            return updated;
        });
    };

    const handleAddAbility = () => {
        const newAbilities = [...(localEnemy.abilities || []), { name: 'Nueva Habilidad', description: 'Descripción...' }];
        setLocalEnemy(prev => {
            const updated = { ...prev, abilities: newAbilities };
            onUpdate(updated);
            return updated;
        });
    };

    const handleDeleteAbility = (index) => {
        const newAbilities = [...(localEnemy.abilities || [])];
        newAbilities.splice(index, 1);
        setLocalEnemy(prev => {
            const updated = { ...prev, abilities: newAbilities };
            onUpdate(updated);
            return updated;
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `enemies/${localEnemy.id}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            setLocalEnemy(prev => {
                const updated = { ...prev, image: downloadURL };
                onUpdate(updated);
                return updated;
            });
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Error al subir la imagen.");
        } finally {
            setIsUploading(false);
        }
    };

    const attributesList = [
        { key: 'dexterity', label: 'DESTREZA', val: localEnemy.attributes?.dexterity },
        { key: 'vigor', label: 'VIGOR', val: localEnemy.attributes?.vigor },
        { key: 'intellect', label: 'INTELECTO', val: localEnemy.attributes?.intellect },
        { key: 'willpower', label: 'VOLUNTAD', val: localEnemy.attributes?.willpower },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-[#09090b] flex flex-col z-50 overflow-hidden"
        >
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Lato:wght@300;400;700&display=swap');
                `}
            </style>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2 rounded-full bg-black/40 text-slate-400 hover:text-white hover:bg-black/60 transition-colors border border-slate-700/50"
            >
                <FiX className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[#0b1120]/80 z-10"></div>
                {localEnemy.image && (
                    <img src={localEnemy.image} className="w-full h-full object-cover opacity-20 blur-sm" alt="" />
                )}
                <div className="absolute inset-0 bg-gradient-to-l from-[#0b1120] via-transparent to-[#0b1120] z-10"></div>
            </div>

            <div className="relative z-20 flex flex-col lg:flex-row min-h-full items-center justify-start lg:justify-center p-4 pt-16 md:p-8 lg:p-16 gap-6 md:gap-12 lg:gap-24 pb-20 md:pb-8 w-full max-w-[1800px] mx-auto overflow-y-auto custom-scrollbar">

                {/* Left: Character Card Presentation (3D Style) */}
                <div className="relative group w-full max-w-[280px] md:max-w-sm lg:max-w-md aspect-[2.5/3.5] shrink-0 perspective-1000">
                    <div className="relative w-full h-full transition-transform duration-700 transform group-hover:scale-[1.02] group-hover:rotate-y-12">
                        {/* Glowing aura */}
                        <div className="absolute -inset-6 bg-red-900 rounded-full opacity-20 blur-[50px] group-hover:opacity-30 transition-opacity"></div>

                        {/* Card Frame */}
                        <div className="absolute inset-0 z-10 rounded-xl overflow-hidden border-[3px] border-red-900 bg-[#1a0505] shadow-2xl">
                            {/* Edit Button overlay inside card */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute top-2 right-2 z-50 p-2 bg-black/50 hover:bg-red-600 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100"
                                title="Editar Retrato"
                            >
                                <Camera className="w-4 h-4" />
                            </button>

                            {localEnemy.image ? (
                                <img src={localEnemy.image} alt={localEnemy.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#1a0505] text-red-900/50">
                                    <Skull className="h-24 w-24 opacity-20" />
                                </div>
                            )}

                            {/* Loading Overlay */}
                            {isUploading && (
                                <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
                                    <div className="text-red-500 font-bold uppercase tracking-wider animate-pulse">Subiendo...</div>
                                </div>
                            )}

                            {/* Card UI Overlays */}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0b1120] via-[#0b1120]/90 to-transparent p-6 pt-16">
                                <EditableField
                                    value={localEnemy.name}
                                    onChange={(val) => handleFieldChange('name', val)}
                                    onCommit={handleCommit}
                                    textClassName="text-3xl font-['Cinzel'] text-center text-red-100 drop-shadow-lg mb-1 block"
                                    inputClassName="text-center font-['Cinzel'] text-xl bg-black/80"
                                    placeholder="NOMBRE"
                                    className="flex justify-center mb-1 pointer-events-auto"
                                />
                                <div className="h-[1px] w-1/2 mx-auto bg-gradient-to-r from-transparent via-red-600 to-transparent mb-3"></div>
                                <EditableField
                                    value={localEnemy.type}
                                    onChange={(val) => handleFieldChange('type', val)}
                                    onCommit={handleCommit}
                                    textClassName="text-red-400 text-center text-xs font-bold tracking-[0.2em] uppercase block"
                                    inputClassName="text-center text-xs uppercase bg-black/80"
                                    placeholder="TIPO"
                                    className="flex justify-center pointer-events-auto"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Data & Stats */}
                <div className="flex-1 w-full flex flex-col gap-8">

                    {/* Header / Title Section */}
                    <div>
                        <div className="flex items-center gap-4 mb-4 flex-wrap">
                            <div className="px-3 py-1 bg-red-900/10 border border-red-500/50 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                                ENEMIGO
                            </div>

                            {/* Dynamic Tags */}
                            {(localEnemy.tags || []).map((tag, index) => (
                                <div key={index} className="flex relative">
                                    <EditableField
                                        value={tag}
                                        onChange={(val) => handleTagChange(index, val)}
                                        onCommit={handleCommit}
                                        showEditIcon={false}
                                        textClassName="px-3 py-1 bg-red-900/10 border border-red-500/50 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] block min-w-[60px] text-center"
                                        inputClassName="px-2 py-1 bg-black text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] border border-red-500/50 text-center min-w-[60px]"
                                        placeholder="ETIQUETA"
                                    />
                                </div>
                            ))}

                            {/* Add Tag Button */}
                            <button
                                onClick={handleAddTag}
                                className="text-red-500 hover:text-red-400 transition-colors"
                                title="Añadir Etiqueta"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <h1 className="text-5xl lg:text-6xl font-['Cinzel'] text-transparent bg-clip-text bg-gradient-to-b from-red-200 to-red-600 drop-shadow-sm mb-6">
                            {localEnemy.name}
                        </h1>

                        <div className="relative pl-8">
                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-red-500/10 via-red-500/50 to-red-500/10"></div>
                            <div className="absolute left-[1px] top-0 w-2 h-2 bg-[#d4a0a0] rotate-45 -translate-x-1/2 shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
                            <div className="absolute left-[1px] bottom-0 w-2 h-2 bg-[#d4a0a0] rotate-45 -translate-x-1/2 shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
                            <EditableField
                                value={localEnemy.description}
                                onChange={(val) => handleFieldChange('description', val)}
                                onCommit={handleCommit}
                                multiline={true}
                                textClassName="text-lg text-slate-300 leading-relaxed font-serif italic"
                                inputClassName="bg-[#1a0505] text-lg text-slate-300 font-serif italic border-red-900/30"
                                placeholder='"Descripción de la criatura..."'
                            />
                        </div>
                    </div>

                    {/* Content Grid: Attributes (Left) & Stats (Right) */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full">

                        {/* Center Column: Attributes & Abilities */}
                        <div className="xl:col-span-7 flex flex-col gap-6">
                            <div>
                                <div className="mb-4 border-b border-red-900/30 pb-1">
                                    <h4 className="text-red-500 font-['Cinzel'] text-sm tracking-widest flex items-center gap-2">
                                        <span className="w-8 h-[1px] bg-red-500"></span>
                                        ATRIBUTOS DE CLASE
                                    </h4>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {attributesList.map((attr) => (
                                        <div key={attr.key} className="bg-[#1a0a0a]/80 p-2 rounded-lg border border-red-900/20 hover:border-red-500/50 transition-colors group flex flex-col items-center justify-center w-full min-h-[90px]">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1 text-center">{attr.label}</div>
                                            <DiceSelector
                                                value={attr.val || 'd4'}
                                                onChange={(newVal) => updateAttribute(attr.key, newVal)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ABILITIES SECTION - Compact 2-Col Grid */}
                            <div className="flex-1 min-h-0 flex flex-col">
                                <div className="flex items-center justify-between mb-4 border-b border-red-900/30 pb-1">
                                    <h4 className="text-red-500 font-['Cinzel'] text-sm tracking-widest flex items-center gap-2">
                                        <span className="w-8 h-[1px] bg-red-500"></span>
                                        HABILIDADES
                                    </h4>
                                    <button
                                        onClick={handleAddAbility}
                                        className="text-[10px] text-red-500/70 hover:text-red-400 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Añadir
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 custom-scrollbar content-start">
                                    {(localEnemy.abilities || []).length > 0 ? (
                                        (localEnemy.abilities || []).map((ability, idx) => {
                                            const abilityName = typeof ability === 'string' ? ability : ability.name || '';
                                            const abilityDesc = typeof ability === 'string' ? '' : ability.description || '';

                                            return (
                                                <div key={idx} className="flex flex-col gap-1 p-3 bg-red-900/5 border border-red-900/10 hover:border-red-900/30 rounded transition-all group/ability relative h-fit">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-red-600 rotate-45 shrink-0"></div>
                                                        <div className="flex-1 min-w-0">
                                                            <EditableField
                                                                value={abilityName}
                                                                onChange={(val) => handleAbilityChange(idx, 'name', val)}
                                                                onCommit={handleCommit}
                                                                textClassName="font-['Cinzel'] font-bold text-red-100 block text-xs uppercase tracking-wide cursor-text truncate"
                                                                inputClassName="font-['Cinzel'] font-bold text-red-100 bg-black/50 border-red-500/50 w-full text-xs"
                                                                placeholder="NOMBRE"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteAbility(idx)}
                                                            className="opacity-0 group-hover/ability:opacity-100 text-slate-600 hover:text-red-500 transition-all flex-shrink-0"
                                                            title="Eliminar"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <EditableField
                                                        value={abilityDesc}
                                                        onChange={(val) => handleAbilityChange(idx, 'description', val)}
                                                        onCommit={handleCommit}
                                                        multiline={true}
                                                        textClassName="text-slate-400 font-serif text-[10px] cursor-text hover:text-slate-300 transition-colors leading-snug line-clamp-4 italic"
                                                        inputClassName="text-slate-300 font-serif text-[10px] bg-black/50 border-red-500/50 min-h-[60px] italic"
                                                        placeholder="Descripción..."
                                                    />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full text-slate-600 italic text-xs py-8 text-center border border-dashed border-red-900/20 rounded">
                                            Sin habilidades especiales.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-auto pt-2 grid grid-cols-2 gap-3">
                                <button className="group relative px-4 py-3 bg-gradient-to-b from-red-800 to-red-950 hover:to-red-700 text-white font-['Cinzel'] font-bold text-sm uppercase tracking-[0.15em] transition-all transform hover:-translate-y-0.5 shadow-lg border border-red-900/50 rounded overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        Jugar
                                        <Play className="w-3 h-3 fill-current" />
                                    </span>
                                </button>

                                <button
                                    onClick={onDelete}
                                    className="px-4 py-3 border border-dashed border-red-900/30 text-red-900/60 font-bold uppercase tracking-widest hover:border-red-500/50 hover:text-red-500 transition-colors flex items-center justify-center gap-2 text-[10px] hover:bg-red-950/20 rounded"
                                >
                                    <Trash2 className="w-3 h-3" /> Eliminar
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Stats Only */}
                        <div className="xl:col-span-5">
                            {/* STATS SECTION */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-6 border-b border-red-900/30 pb-2">
                                    <h4 className="text-red-500 font-['Cinzel'] text-lg tracking-widest flex items-center gap-2">
                                        <span className="w-8 h-[1px] bg-red-500"></span>
                                        ESTADÍSTICAS
                                    </h4>
                                    <button
                                        onClick={() => setIsStatsEditing(!isStatsEditing)}
                                        className={`p-2 rounded-full transition-colors ${isStatsEditing ? 'text-red-500 bg-red-900/20' : 'text-slate-500 hover:text-red-400'}`}
                                        title={isStatsEditing ? 'Terminar edición' : 'Editar estadísticas'}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Stack Layout for Stats */}
                                <div className="flex flex-col gap-5 px-1">
                                    <StatBar label="POSTURA" statKey="postura" current={localEnemy.stats?.postura?.current} max={localEnemy.stats?.postura?.max} colorClass="text-green-500" bgClass="bg-[#a3c9a8]" borderClass="border-green-900" updateStat={updateStat} isEditing={isStatsEditing} />
                                    <StatBar label="VIDA" statKey="vida" current={localEnemy.stats?.vida?.current} max={localEnemy.stats?.vida?.max} colorClass="text-red-500" bgClass="bg-[#c9a3a3]" borderClass="border-red-900" updateStat={updateStat} isEditing={isStatsEditing} />
                                    <StatBar label="INGENIO" statKey="ingenio" current={localEnemy.stats?.ingenio?.current} max={localEnemy.stats?.ingenio?.max} colorClass="text-blue-500" bgClass="bg-[#a3b1c9]" borderClass="border-blue-900" updateStat={updateStat} isEditing={isStatsEditing} />
                                    <StatBar label="CORDURA" statKey="cordura" current={localEnemy.stats?.cordura?.current} max={localEnemy.stats?.cordura?.max} colorClass="text-purple-500" bgClass="bg-[#bda3c9]" borderClass="border-purple-900" updateStat={updateStat} isEditing={isStatsEditing} />
                                    <StatBar label="ARMADURA" statKey="armadura" current={localEnemy.stats?.armadura?.current} max={localEnemy.stats?.armadura?.max} colorClass="text-slate-500" bgClass="bg-slate-400" borderClass="border-slate-700" updateStat={updateStat} isEditing={isStatsEditing} />
                                </div>
                            </div>

                            {/* ABILITIES SECCION MOVIDA AL PANEL IZQUIERDO */}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
