import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection,
    getDocs,
    setDoc,
    deleteDoc,
    doc,
    onSnapshot
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiSearch,
    FiPlus,
    FiEdit3,
    FiSave,
    FiX,
    FiTrash2,
    FiArrowLeft,
    FiLayout
} from 'react-icons/fi';
import { ICON_MAP, DEFAULT_STATUS_EFFECTS } from '../utils/statusEffects';
import { Image as KonvaImage, Circle } from 'react-konva';
import useImage from 'use-image';
import PropTypes from 'prop-types';

// Utility to convert common tailwind colors to hex
const TAILWIND_COLOR_MAP = {
    'red': '#ef4444',
    'orange': '#f97316',
    'amber': '#f59e0b',
    'yellow': '#eab308',
    'lime': '#84cc16',
    'green': '#22c55e',
    'emerald': '#10b981',
    'teal': '#14b8a6',
    'cyan': '#06b6d4',
    'sky': '#0ea5e9',
    'blue': '#3b82f6',
    'indigo': '#6366f1',
    'violet': '#8b5cf6',
    'purple': '#a855f7',
    'fuchsia': '#d946ef',
    'pink': '#ec4899',
    'rose': '#f43f5e',
    'slate': '#64748b',
    'gray': '#6b7280',
    'zinc': '#71717a',
    'neutral': '#737373',
    'stone': '#78716c'
};

const extractHex = (effect) => {
    if (effect.hex) return effect.hex;
    const colorStr = effect.color || '';
    if (colorStr.includes('[') && colorStr.includes(']')) {
        return colorStr.match(/\[(.*?)\]/)?.[1];
    }
    // Match standard like text-red-500
    const standardMatch = colorStr.match(/text-([a-z]+)-(\d+)/);
    if (standardMatch) {
        const colorName = standardMatch[1];
        return TAILWIND_COLOR_MAP[colorName] || '#94a3b8';
    }
    return '#94a3b8';
};

const EstadoImg = ({ src, hex, ...props }) => {
    const [img, status] = useImage(src, 'anonymous');

    if (status === 'loaded' && img) {
        return <KonvaImage image={img} listening={false} {...props} />;
    }

    // Fallback to a colored circle if image is not available or loading
    return (
        <Circle
            {...props}
            x={props.x + props.width / 2}
            y={props.y + props.height / 2}
            radius={props.width / 2}
            fill={hex || '#94a3b8'}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
            listening={false}
        />
    );
};

EstadoImg.propTypes = {
    src: PropTypes.string.isRequired,
    hex: PropTypes.string,
};

const StatusEffectsManager = ({ onBack, highlightText }) => {
    const [effects, setEffects] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingKey, setEditingKey] = useState(null);
    const [editValues, setEditValues] = useState(null);
    const [showIconPicker, setShowIconPicker] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'status_effects_config'), (snapshot) => {
            const data = {};
            snapshot.forEach(doc => {
                data[doc.id] = doc.data();
            });

            // If empty, initialize with defaults
            if (Object.keys(data).length === 0) {
                initializeDefaults();
            } else {
                setEffects(data);
                setLoading(false);
            }
        });

        return () => unsub();
    }, []);

    const initializeDefaults = async () => {
        try {
            for (const [key, value] of Object.entries(DEFAULT_STATUS_EFFECTS)) {
                await setDoc(doc(db, 'status_effects_config', key), value);
            }
        } catch (error) {
            console.error("Error initializing defaults:", error);
        }
    };

    const handleStartEdit = (key, value) => {
        setEditingKey(key);
        setEditValues({ ...value });
    };

    const handleSave = async (key) => {
        try {
            await setDoc(doc(db, 'status_effects_config', key), editValues);
            setEditingKey(null);
            setEditValues(null);
        } catch (error) {
            console.error("Error saving status effect:", error);
        }
    };

    const handleAddNew = () => {
        const newId = `nuevo_estado_${Date.now()}`;
        const newValue = {
            label: 'Nuevo Estado',
            iconName: 'AlertCircle',
            hex: '#94a3b8',
            color: 'text-[#94a3b8]',
            bg: 'bg-[#94a3b8]/10',
            border: 'border-[#94a3b8]/50',
            desc: 'Descripción del nuevo estado.'
        };
        // Add to local state first so it's rendered and editable
        setEffects(prev => ({ [newId]: newValue, ...prev }));
        handleStartEdit(newId, newValue);
    };

    const handleDelete = async (key) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este estado?')) {
            try {
                await deleteDoc(doc(db, 'status_effects_config', key));
            } catch (error) {
                console.error("Error deleting status effect:", error);
            }
        }
    };

    const filteredEffects = Object.entries(effects).filter(([key, effect]) =>
        effect.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        key.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="text-[#c8aa6e] font-['Cinzel'] animate-pulse text-xl">
                    Cargando configuración de estados...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-[#e2e8f0] font-['Lato'] p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#c8aa6e]/20 pb-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c8aa6e]">
                            <span className="opacity-70">ARCANA VAULT</span>
                            <span className="h-px w-4 bg-[#c8aa6e]/40"></span>
                            <span>GESTOR DE ESTADOS</span>
                        </div>
                        <h1 className="font-['Cinzel'] text-4xl font-bold uppercase tracking-wider text-[#f0e6d2] drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)] md:text-5xl">
                            Estados Alterados
                        </h1>
                        <p className="max-w-2xl font-['Lato'] text-lg font-light leading-relaxed text-[#94a3b8]">
                            Configura los iconos, colores y efectos que se aplicarán globalmente a todas las fichas.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleAddNew}
                            className="flex items-center gap-2 px-6 py-2 bg-[#c8aa6e] text-[#0b1120] font-['Cinzel'] font-bold text-xs uppercase tracking-[0.2em] rounded-sm hover:brightness-110 transition-all shadow-lg shadow-[#c8aa6e]/20"
                        >
                            <FiPlus /> Añadir Estado
                        </button>
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-6 py-2 border border-[#c8aa6e]/30 text-[#c8aa6e] font-['Cinzel'] font-bold text-xs uppercase tracking-[0.2em] rounded-sm hover:bg-[#c8aa6e]/10 transition-all"
                        >
                            <FiArrowLeft /> Volver
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c8aa6e]/50" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#161f32]/50 border border-[#c8aa6e]/20 rounded-xl py-3 pl-12 pr-4 text-[#f0e6d2] focus:outline-none focus:border-[#c8aa6e]/50 transition-colors"
                    />
                </div>

                {/* Effects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEffects.map(([key, effect]) => {
                        const isEditing = editingKey === key;
                        const IconComponent = ICON_MAP[effect.iconName] || ICON_MAP.AlertCircle;

                        return (
                            <motion.div
                                key={key}
                                layout
                                className={`group relative rounded-2xl border transition-all duration-300 ${isEditing ? 'border-[#c8aa6e] bg-[#161f32]' : 'border-slate-800 bg-[#0f172a] hover:border-[#c8aa6e]/40'}`}
                            >
                                {isEditing ? (
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`p-3 rounded-xl border-2 cursor-pointer hover:brightness-125 transition-all ${editValues.bg} ${editValues.border}`}
                                                style={{
                                                    borderColor: !editValues.border.includes('[') && !editValues.border.startsWith('border-') ? editValues.hex : undefined,
                                                    background: !editValues.bg.includes('[') && !editValues.bg.startsWith('bg-') ? `${editValues.hex}1a` : undefined
                                                }}
                                                onClick={() => setShowIconPicker(true)}
                                            >
                                                {(() => {
                                                    const EditIcon = ICON_MAP[editValues.iconName] || ICON_MAP.AlertCircle;
                                                    return <EditIcon
                                                        className={`w-8 h-8 ${editValues.color}`}
                                                        style={{ color: !editValues.color.includes('[') && !editValues.color.startsWith('text-') ? editValues.hex : undefined }}
                                                    />;
                                                })()}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Identificador</label>
                                                <input
                                                    type="text"
                                                    value={editingKey || ''}
                                                    disabled
                                                    className="w-full bg-black/30 border border-white/5 rounded px-2 py-2 text-xs opacity-50 cursor-not-allowed h-[36px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-[#c8aa6e] font-bold">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={editValues.label}
                                                    onChange={(e) => setEditValues({ ...editValues, label: e.target.value })}
                                                    className="w-full bg-[#0b1120] border border-[#c8aa6e]/20 rounded-lg px-3 py-2 text-sm mt-1 focus:border-[#c8aa6e] focus:outline-none transition-colors h-[36px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-[#c8aa6e] font-bold">Descripción</label>
                                                <textarea
                                                    rows={3}
                                                    value={editValues.desc}
                                                    onChange={(e) => setEditValues({ ...editValues, desc: e.target.value })}
                                                    className="w-full bg-[#0b1120] border border-[#c8aa6e]/20 rounded-lg px-3 py-2 text-sm mt-1 focus:border-[#c8aa6e] focus:outline-none transition-colors resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-widest text-[#c8aa6e] font-bold block">Color (Hex)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={editValues.hex || '#ffffff'}
                                                        onChange={(e) => {
                                                            const hex = e.target.value;
                                                            setEditValues({
                                                                ...editValues,
                                                                hex: hex,
                                                                color: `text-[${hex}]`,
                                                                bg: `bg-[${hex}]/10`,
                                                                border: `border-[${hex}]/50`
                                                            });
                                                        }}
                                                        className="h-[36px] w-12 bg-[#0b1120] border border-[#c8aa6e]/20 rounded-lg cursor-pointer p-1"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editValues.hex || ''}
                                                        onChange={(e) => {
                                                            const hex = e.target.value;
                                                            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                                                                setEditValues({
                                                                    ...editValues,
                                                                    hex: hex,
                                                                    color: `text-[${hex}]`,
                                                                    bg: `bg-[${hex}]/10`,
                                                                    border: `border-[${hex}]/50`
                                                                });
                                                            } else {
                                                                setEditValues({ ...editValues, hex: hex });
                                                            }
                                                        }}
                                                        className="flex-1 bg-[#0b1120] border border-[#c8aa6e]/20 rounded-lg px-2 py-2 text-[11px] text-[#f0e6d2] h-[36px] font-mono"
                                                        placeholder="#000000"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-widest text-[#c8aa6e] font-bold block">Tailwind</label>
                                                <input
                                                    type="text"
                                                    value={editValues.color}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEditValues({ ...editValues, color: val });
                                                    }}
                                                    className="w-full bg-[#0b1120] border border-[#c8aa6e]/20 rounded-lg px-2 py-2 text-[11px] h-[36px] font-mono"
                                                    placeholder="text-emerald-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => handleSave(key)}
                                                className="flex-1 bg-[#c8aa6e] text-[#0b1120] py-2 rounded font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2"
                                            >
                                                <FiSave /> Guardar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingKey(null);
                                                    setEditValues(null);
                                                }}
                                                className="p-2 border border-slate-700 rounded text-slate-400 hover:text-white"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className={`p-4 rounded-2xl border-2 shadow-lg shadow-black/20 ${effect.color} ${effect.bg} ${effect.border}`}
                                                style={{
                                                    borderColor: !effect.border.includes('[') && !effect.border.startsWith('border-') ? effect.hex : undefined,
                                                    background: !effect.bg.includes('[') && !effect.bg.startsWith('bg-') ? `${effect.hex}1a` : undefined,
                                                    color: !effect.color.includes('[') && !effect.color.startsWith('text-') ? effect.hex : undefined
                                                }}
                                            >
                                                <IconComponent className="w-8 h-8" />
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleStartEdit(key, effect)}
                                                    className="p-2 bg-[#1a1b26] border border-[#c8aa6e]/20 text-[#c8aa6e] rounded-lg hover:bg-[#c8aa6e]/10 transition-colors"
                                                    title="Editar"
                                                >
                                                    <FiEdit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(key)}
                                                    className="p-2 bg-[#1a1b26] border border-rose-900/40 text-rose-400 rounded-lg hover:bg-rose-900/20 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-['Cinzel'] text-xl font-bold tracking-wider text-[#f0e6d2] mb-2">
                                                {effect.label}
                                            </h3>
                                            <p className="text-sm text-slate-400 leading-relaxed font-light line-clamp-3">
                                                {highlightText ? highlightText(effect.desc) : effect.desc}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">ID: {key}</span>
                                            <div
                                                className="w-3 h-3 rounded-full border border-white/10"
                                                style={{
                                                    backgroundColor: extractHex(effect)
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Icon Picker Modal */}
            <AnimatePresence>
                {showIconPicker && editValues && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowIconPicker(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl bg-[#0f172a] border border-[#c8aa6e]/30 rounded-3xl p-8 z-[110] max-h-[80vh] overflow-y-auto custom-scrollbar shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6 border-b border-[#c8aa6e]/10 pb-4">
                                <h3 className="font-['Cinzel'] text-2xl font-bold text-[#f0e6d2] tracking-wider">Seleccionar Icono</h3>
                                <button
                                    onClick={() => setShowIconPicker(false)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <FiX className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                                {Object.entries(ICON_MAP).map(([name, Icon]) => (
                                    <button
                                        key={name}
                                        onClick={() => {
                                            setEditValues({ ...editValues, iconName: name });
                                            setShowIconPicker(false);
                                        }}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${editValues.iconName === name ? 'bg-[#c8aa6e]/20 border-[#c8aa6e] text-[#c8aa6e]' : 'border-slate-800 hover:border-slate-600 text-slate-400'}`}
                                    >
                                        <Icon className="w-6 h-6" />
                                        <span className="text-[8px] font-mono truncate w-full text-center">{name}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StatusEffectsManager;
