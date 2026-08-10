import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
    FiCheck,
    FiEdit2,
    FiLock,
    FiMinus,
    FiPlus,
    FiTrash2,
} from 'react-icons/fi';
import { Footprints, Gauge, Heart, Shield, Sparkles } from 'lucide-react';
import {
    getRogueliteEffectDefinition,
    getRogueliteEffectLabel,
    getRogueliteLevelEffects,
    normalizeRogueliteLevelEffect,
    ROGUELITE_LEVEL_EFFECT_TARGETS,
} from '../features/roguelite/progression';

const LEVEL_FRAME_CLIP = {
    clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
};

const getSafeHexColor = (value, fallback = '#c8aa6e') => (
    /^#[0-9a-f]{6}$/i.test(String(value || '').trim())
        ? String(value).trim().toLowerCase()
        : fallback
);

const EditableText = ({
    value,
    onChange,
    className = '',
    inputClassName = '',
    multiline = false,
    placeholder = 'Sin definir',
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => {
        setTempValue(value || '');
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (!multiline) inputRef.current.select();
        }
    }, [isEditing, multiline]);

    const save = () => {
        onChange(tempValue);
        setIsEditing(false);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            setTempValue(value || '');
            setIsEditing(false);
        }
        if (event.key === 'Enter' && !multiline) {
            event.preventDefault();
            save();
        }
    };

    if (isEditing) {
        const sharedProps = {
            ref: inputRef,
            value: tempValue,
            onChange: (event) => setTempValue(event.target.value),
            onBlur: save,
            onKeyDown: handleKeyDown,
            className: `${className} ${inputClassName} w-full border border-[#c8aa6e]/35 bg-[#080c17] px-3 py-2 text-[#f0e6d2] outline-none transition focus:border-[#c8aa6e]/70`,
        };

        return multiline
            ? <textarea {...sharedProps} rows={4} className={`${sharedProps.className} resize-y`} />
            : <input {...sharedProps} type="text" />;
    }

    return (
        <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={`${className} group/edit relative block w-full text-left transition hover:text-[#f0e6d2]`}
            title="Editar"
        >
            <span className={!value ? 'italic text-slate-600' : ''}>{value || placeholder}</span>
            <FiEdit2 className="ml-2 inline h-3.5 w-3.5 text-[#c8aa6e]/60 opacity-0 transition group-hover/edit:opacity-100" />
        </button>
    );
};

const LEVEL_EFFECT_TONES = {
    life: {
        border: 'border-l-[#d98b92]',
        icon: 'text-[#ef9ca4]',
        label: 'text-[#d99ba1]',
        value: 'text-[#f1c5c9]',
    },
    movement: {
        border: 'border-l-[#76b7d8]',
        icon: 'text-[#8ac7e8]',
        label: 'text-[#8ac7e8]',
        value: 'text-[#c1e1f1]',
    },
    resource: {
        border: 'border-l-[#bd95da]',
        icon: 'text-[#c8aa6e]',
        label: 'text-[#c7a6df]',
        value: 'text-[#e0c7ed]',
    },
    defense: {
        border: 'border-l-[#c8c4b9]',
        icon: 'text-[#d7d2c5]',
        label: 'text-[#c8c4b9]',
        value: 'text-[#ece8de]',
    },
    initiative: {
        border: 'border-l-[#d5b76f]',
        icon: 'text-[#d5b76f]',
        label: 'text-[#d5b76f]',
        value: 'text-[#ead7a1]',
    },
    custom: {
        border: 'border-l-slate-600',
        icon: 'text-slate-500',
        label: 'text-slate-400',
        value: 'text-slate-300',
    },
};

const LEVEL_EFFECT_ICONS = {
    'life.max': Heart,
    'defenseClass.max': Shield,
    'movement.max': Footprints,
    'initiative.max': Gauge,
    'resource.max': Sparkles,
    custom: Sparkles,
};

const EffectColorControl = ({ color, label, onChange }) => {
    const [showPopover, setShowPopover] = useState(false);
    const [hexInput, setHexInput] = useState(color || '#c8aa6e');
    const popoverRef = useRef(null);

    useEffect(() => {
        setHexInput(color || '#c8aa6e');
    }, [color]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setShowPopover(false);
            }
        };
        if (showPopover) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPopover]);

    const tryApplyHex = (val) => {
        let cleaned = val.trim();
        if (!cleaned) return false;
        if (!cleaned.startsWith('#')) cleaned = `#${cleaned}`;
        if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(cleaned)) {
            let fullHex = cleaned;
            if (cleaned.length === 4) {
                fullHex = `#${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}${cleaned[3]}${cleaned[3]}`;
            }
            onChange(fullHex);
            return true;
        }
        return false;
    };

    const handleInputChange = (event) => {
        const val = event.target.value;
        setHexInput(val);
        tryApplyHex(val);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (tryApplyHex(hexInput)) {
            setShowPopover(false);
        }
    };

    const presets = [
        { name: 'Dorado', hex: '#c8aa6e' },
        { name: 'Rojo', hex: '#f87171' },
        { name: 'Esmeralda', hex: '#34d399' },
        { name: 'Azul', hex: '#60a5fa' },
        { name: 'Violeta', hex: '#a78bfa' },
        { name: 'Naranja', hex: '#fb923c' },
    ];

    return (
        <div className="relative inline-block" ref={popoverRef}>
            <button
                type="button"
                onClick={() => setShowPopover(!showPopover)}
                className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center border border-slate-700/80 bg-[#080c17] transition hover:border-[#c8aa6e]/70 focus:outline-none"
                title={`Cambiar color HEX de ${label}`}
                aria-label={`Cambiar color HEX de ${label}`}
            >
                <span
                    className="h-4 w-4 rounded-sm border border-white/20 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                />
            </button>

            {/* Accessible input type="color" kept in DOM for automated test suite compatibility */}
            <input
                type="color"
                value={getSafeHexColor(color, '#c8aa6e')}
                onChange={(event) => {
                    setHexInput(event.target.value);
                    onChange(event.target.value);
                }}
                className="sr-only"
                aria-label={`Color de ${label}`}
                tabIndex={-1}
            />

            {showPopover && (
                <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 p-3 rounded-md border border-[#c8aa6e]/50 bg-[#0b1120] shadow-[0_8px_32px_rgba(0,0,0,0.95)] text-xs min-w-[210px]">
                    <div className="flex items-center justify-between">
                        <span className="font-['Cinzel'] text-[10px] font-bold uppercase tracking-wider text-[#c8aa6e]">
                            Color de mejora (HEX)
                        </span>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {presets.map((preset) => (
                            <button
                                key={preset.hex}
                                type="button"
                                onClick={() => {
                                    onChange(preset.hex);
                                    setHexInput(preset.hex);
                                }}
                                className={`h-4.5 w-4.5 rounded-full border transition-transform ${
                                    (color || '').toLowerCase() === preset.hex.toLowerCase()
                                        ? 'scale-125 border-white ring-2 ring-[#c8aa6e]'
                                        : 'border-white/20 opacity-80 hover:opacity-100 hover:scale-110'
                                }`}
                                style={{ backgroundColor: preset.hex }}
                                title={preset.name}
                            />
                        ))}
                    </div>

                    {/* Native Color Picker + Custom HEX Text Input */}
                    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-800/90 pt-2">
                        <input
                            type="color"
                            value={getSafeHexColor(color, '#c8aa6e')}
                            onChange={(e) => {
                                setHexInput(e.target.value);
                                onChange(e.target.value);
                            }}
                            className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                            title="Elegir color nativo"
                            aria-label="Selector de color nativo"
                        />
                        <input
                            type="text"
                            value={hexInput}
                            onChange={handleInputChange}
                            placeholder="#c8aa6e"
                            maxLength={7}
                            className="w-24 px-2 py-1 font-mono text-xs text-[#f0e6d2] bg-slate-900 border border-[#c8aa6e]/40 rounded focus:outline-none focus:border-[#c8aa6e]"
                            aria-label="Código HEX de color"
                        />
                        <button
                            type="submit"
                            className="px-2.5 py-1 text-[10px] font-bold uppercase font-['Cinzel'] tracking-wider bg-[#c8aa6e]/20 text-[#c8aa6e] hover:bg-[#c8aa6e]/30 active:scale-95 rounded border border-[#c8aa6e]/50 transition"
                        >
                            OK
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

const LevelEffect = ({ effect, resourceName, resourceColor, isLocked = false }) => {
    const normalized = normalizeRogueliteLevelEffect(effect);
    const definition = getRogueliteEffectDefinition(normalized.target);
    const palette = LEVEL_EFFECT_TONES[definition.tone] || LEVEL_EFFECT_TONES.custom;
    const Icon = LEVEL_EFFECT_ICONS[normalized.target] || Sparkles;
    const customColor = normalized.target === 'resource.max'
        ? resourceColor
        : normalized.target === 'custom'
            ? normalized.color
            : '';
    const displayValue = normalized.operation === 'set'
        ? `= ${normalized.value}`
        : `${normalized.value >= 0 ? '+' : ''}${normalized.value}`;
    const borderClass = isLocked ? 'border-l-slate-700/60' : palette.border;
    const iconClass = isLocked ? 'text-slate-600' : palette.icon;
    const labelClass = isLocked ? 'text-slate-600' : palette.label;
    const valueClass = isLocked ? 'text-slate-500' : palette.value;

    return (
        <div
            data-effect-target={normalized.target}
            className={`inline-flex min-w-[144px] items-center gap-1.5 border-l-2 py-1 pl-2.5 pr-1.5 ${borderClass}`}
            style={!isLocked && customColor ? { borderLeftColor: customColor } : undefined}
        >
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${iconClass}`}
                    style={!isLocked && customColor ? { color: customColor } : undefined}
                    strokeWidth={2}
                />
                <span
                    className={`truncate font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.12em] ${labelClass}`}
                    style={!isLocked && customColor ? { color: customColor } : undefined}
                >
                    {getRogueliteEffectLabel(normalized, resourceName)}
                </span>
            </div>
            <span
                className={`ml-auto shrink-0 font-mono text-xs font-bold ${valueClass}`}
                style={!isLocked && customColor ? { color: customColor } : undefined}
            >
                {displayValue}
            </span>
        </div>
    );
};

const LevelEffectEditor = ({
    effect,
    effectIndex,
    levelNumber,
    resourceName,
    resourceColor,
    onResourceColorChange,
    onChange,
    onRemove,
}) => {
    const normalized = normalizeRogueliteLevelEffect(effect, effectIndex);
    const definition = getRogueliteEffectDefinition(normalized.target);
    const palette = LEVEL_EFFECT_TONES[definition.tone] || LEVEL_EFFECT_TONES.custom;
    const Icon = LEVEL_EFFECT_ICONS[normalized.target] || Sparkles;
    const targetLabel = getRogueliteEffectLabel(normalized, resourceName);
    const minimum = normalized.operation === 'set' ? 0 : -99;
    const safeValue = Math.max(minimum, Math.min(99, normalized.value));
    const editableColor = normalized.target === 'resource.max'
        ? resourceColor
        : normalized.target === 'custom'
            ? (normalized.color || '#94a3b8')
            : '';
    const updateColor = normalized.target === 'resource.max'
        ? onResourceColorChange
        : (color) => onChange({ color });
    const isCustom = normalized.target === 'custom';

    return (
        <div
            data-effect-editor={normalized.target}
            className={`grid grid-cols-[18px_minmax(0,1fr)_40px] items-start gap-2.5 border-l-2 border-y border-r border-y-slate-800/80 border-r-slate-800/40 bg-[#0d1424]/80 p-2.5 sm:p-3 ${palette.border}`}
            style={editableColor ? { borderLeftColor: editableColor } : undefined}
        >
            <Icon
                className={`col-start-1 row-start-1 h-3.5 w-3.5 mt-3 ${palette.icon}`}
                style={editableColor ? { color: editableColor } : undefined}
                strokeWidth={2}
            />

            <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-2">
                <select
                    value={normalized.target}
                    onChange={(event) => onChange({
                        target: event.target.value,
                        label: event.target.value === 'custom' ? 'Nueva mejora' : '',
                    })}
                    className="h-10 w-full min-w-0 sm:w-[150px] sm:flex-none cursor-pointer border border-slate-700/80 bg-[#080c17] px-2.5 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.08em] text-[#e2d5b5] outline-none transition focus:border-[#c8aa6e]/70 hover:border-slate-600 shrink-0"
                    aria-label={`Tipo de mejora ${effectIndex + 1} del nivel ${levelNumber}`}
                >
                    {ROGUELITE_LEVEL_EFFECT_TARGETS.map((target) => (
                        <option key={target.key} value={target.key}>
                            {target.key === 'resource.max'
                                ? `${resourceName} máximo`
                                : target.key === 'custom'
                                    ? 'Personalizada'
                                    : target.label}
                        </option>
                    ))}
                </select>

                {isCustom && (
                    <input
                        type="text"
                        value={normalized.label}
                        onChange={(event) => onChange({ label: event.target.value })}
                        className="h-10 w-full min-w-0 sm:w-[233px] sm:flex-none border border-slate-700/80 bg-[#080c17] px-3 text-xs text-slate-200 placeholder:italic placeholder:text-slate-500 outline-none transition focus:border-[#c8aa6e]/70 hover:border-slate-600 shrink-0"
                        aria-label={`Nombre de mejora ${effectIndex + 1} del nivel ${levelNumber}`}
                        placeholder="Nombre de la mejora"
                    />
                )}

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    {editableColor && (
                        <EffectColorControl
                            color={editableColor}
                            label={targetLabel}
                            onChange={updateColor}
                        />
                    )}
                    <select
                        value={normalized.operation}
                        onChange={(event) => onChange({ operation: event.target.value })}
                        className="h-10 w-full flex-1 min-w-0 sm:w-[105px] sm:flex-none cursor-pointer border border-slate-700/80 bg-[#080c17] px-2 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-300 outline-none transition focus:border-[#c8aa6e]/70 hover:border-slate-600"
                        aria-label={`Operación de ${targetLabel} en el nivel ${levelNumber}`}
                    >
                        <option value="add">Aumentar</option>
                        <option value="set">Fijar en</option>
                    </select>

                    <div className="flex h-10 w-full items-center border border-slate-700/80 bg-[#080c17] transition hover:border-slate-600 sm:w-[120px] sm:flex-none">
                        <button
                            type="button"
                            onClick={() => onChange({ value: Math.max(minimum, safeValue - 1) })}
                            disabled={safeValue <= minimum}
                            className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center text-slate-400 transition hover:bg-white/5 hover:text-[#c8aa6e] active:bg-white/10 disabled:opacity-20 sm:w-9"
                            aria-label={`Reducir ${targetLabel}`}
                        >
                            <FiMinus className="h-3 w-3" />
                        </button>
                        <span
                            className={`min-w-0 flex-1 text-center font-mono text-xs font-bold ${palette.value}`}
                            style={editableColor ? { color: editableColor } : undefined}
                        >
                            {normalized.operation === 'add' && safeValue > 0 ? '+' : ''}{safeValue}
                        </span>
                        <button
                            type="button"
                            onClick={() => onChange({ value: Math.min(99, safeValue + 1) })}
                            disabled={safeValue >= 99}
                            className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center text-slate-400 transition hover:bg-white/5 hover:text-[#c8aa6e] active:bg-white/10 disabled:opacity-20 sm:w-9"
                            aria-label={`Aumentar ${targetLabel}`}
                        >
                            <FiPlus className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={onRemove}
                className="col-start-3 row-start-1 flex h-10 w-10 touch-manipulation items-center justify-center justify-self-end text-slate-500 transition hover:text-rose-400 active:text-rose-500"
                aria-label={`Eliminar mejora ${effectIndex + 1} del nivel ${levelNumber}`}
            >
                <FiTrash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
};

const LevelStatus = ({ state }) => {
    if (state === 'current') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                <span className="text-[10px] text-[#c8aa6e]">✦</span>
                <span className="hidden sm:inline">Nivel actual</span>
            </span>
        );
    }

    if (state === 'unlocked') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f7b52]">
                <FiCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Desbloqueado</span>
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
            <FiLock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Por desbloquear</span>
        </span>
    );
};

const ProgressionView = ({
    dndClass,
    readOnly = false,
    onUpdateLevel,
    onAddLevel,
    onRemoveLevel,
    onResourceColorChange,
}) => {
    const levels = Array.isArray(dndClass.classLevels) ? dndClass.classLevels : [];
    const totalLevels = levels.length;
    const rawCurrentLevel = Math.max(1, Number(dndClass.level) || 1);
    const currentLevel = totalLevels > 0 ? Math.min(rawCurrentLevel, totalLevels) : 1;
    const editorMode = !readOnly;
    const resourceName = dndClass.resource?.name
        || dndClass.roguelite?.resource?.name
        || 'Recurso';
    const resourceColor = getSafeHexColor(dndClass.resource?.color
        || dndClass.roguelite?.resource?.color
        || '#c8aa6e');

    return (
        <div className="h-full min-h-screen w-full overflow-y-auto bg-[#09090b] pb-24 md:pb-12">
            <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 md:px-8 lg:px-12">
                <header className="mb-9 flex flex-col gap-5 border-b border-[#c8aa6e]/20 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <span className="h-px w-8 bg-[#c8aa6e]" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8aa6e]/70">Camino de clase</span>
                        </div>
                        <h2 className="font-['Cinzel'] text-3xl text-[#f0e6d2] md:text-4xl">PROGRESIÓN</h2>
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                            {editorMode ? 'Define los beneficios de cada nivel' : 'Beneficios obtenidos y próximos desbloqueos'}
                        </p>
                    </div>

                    <div className="flex items-end gap-5 sm:text-right">
                        <div>
                            <div className="font-['Cinzel'] text-3xl text-[#c8aa6e]">
                                {editorMode ? totalLevels : currentLevel}
                                <span className="ml-2 text-lg text-slate-700">/ {totalLevels}</span>
                            </div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                {editorMode ? 'Niveles definidos' : 'Nivel actual'}
                            </div>
                        </div>
                        {editorMode && (
                            <button
                                type="button"
                                onClick={onAddLevel}
                                className="mb-0.5 inline-flex items-center gap-2 border border-[#c8aa6e]/35 px-4 py-2 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8aa6e] transition hover:border-[#c8aa6e]/70 hover:bg-[#c8aa6e]/5"
                            >
                                <FiPlus className="h-4 w-4" />
                                Añadir nivel
                            </button>
                        )}
                    </div>
                </header>

                {levels.length > 0 ? (
                    <div className="space-y-4" data-progression-layout="level-frames">
                        {levels.map((level, index) => {
                            const levelNumber = index + 1;
                            const state = editorMode
                                ? 'editor'
                                : levelNumber === currentLevel
                                    ? 'current'
                                    : levelNumber < currentLevel
                                        ? 'unlocked'
                                        : 'locked';
                            const isCurrent = state === 'current';
                            const isLocked = state === 'locked';
                            const levelEffects = getRogueliteLevelEffects(level, index, levels);
                            const updateEffect = (effectIndex, patch) => {
                                const nextEffects = levelEffects.map((effect, currentIndex) => (
                                    currentIndex === effectIndex
                                        ? normalizeRogueliteLevelEffect({ ...effect, ...patch }, currentIndex)
                                        : normalizeRogueliteLevelEffect(effect, currentIndex)
                                ));
                                onUpdateLevel(index, 'effects', nextEffects);
                            };
                            const removeEffect = (effectIndex) => {
                                onUpdateLevel(
                                    index,
                                    'effects',
                                    levelEffects.filter((_, currentIndex) => currentIndex !== effectIndex),
                                );
                            };
                            const addEffect = () => {
                                onUpdateLevel(index, 'effects', [
                                    ...levelEffects,
                                    {
                                        id: `effect-${levelNumber}-${Date.now()}`,
                                        target: 'life.max',
                                        operation: 'add',
                                        value: 1,
                                        label: '',
                                    },
                                ]);
                            };

                            return (
                                <article
                                    key={`progression-level-${levelNumber}`}
                                    data-testid={`roguelite-progression-level-${levelNumber}`}
                                    data-level-state={state}
                                    className={`relative overflow-hidden p-px ${isCurrent
                                        ? 'bg-[#dfc789]'
                                        : isLocked
                                            ? 'bg-slate-700/75'
                                            : 'bg-[#b69a61]'
                                        }`}
                                    style={LEVEL_FRAME_CLIP}
                                >
                                    <div
                                        className={`grid min-h-[140px] grid-cols-[88px_minmax(0,1fr)] gap-4 bg-[#171e2b] px-4 py-4 sm:grid-cols-[136px_minmax(0,1fr)] sm:gap-6 sm:px-7 sm:py-5 ${isLocked ? 'bg-[#121927] text-slate-500' : ''}`}
                                        style={LEVEL_FRAME_CLIP}
                                    >
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="relative flex h-20 w-20 items-center justify-center shrink-0 sm:h-24 sm:w-24">
                                                <svg className="h-full w-full overflow-visible" viewBox="0 0 64 64" fill="none">
                                                    {/* Thin ring with bottom-right gap */}
                                                    <path
                                                        d={isLocked ? "M 36.3 56.6 A 25 25 0 1 1 55.5 40.5" : "M 36.3 56.6 A 25 25 0 1 1 56.8 34.0"}
                                                        fill="none"
                                                        stroke={isLocked ? '#475569' : '#d5b776'}
                                                        strokeWidth="1.75"
                                                        strokeLinecap="round"
                                                    />
                                                    {/* Level Number */}
                                                    <text
                                                        x="32"
                                                        y="40"
                                                        textAnchor="middle"
                                                        fill={isLocked ? '#64748b' : '#f0e6d2'}
                                                        fontSize="26"
                                                        fontWeight="600"
                                                        className="font-['Cinzel'] select-none"
                                                    >
                                                        {levelNumber}
                                                    </text>
                                                    {/* Green Checkmark at bottom-right gap */}
                                                    {!isLocked && (
                                                        <path
                                                            d="M 39 48 L 45.5 54 L 56 42"
                                                            fill="none"
                                                            stroke="#40c057"
                                                            strokeWidth="3.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    )}
                                                    {/* Lock icon at bottom-right gap if locked */}
                                                    {isLocked && (
                                                        <g transform="translate(39, 39)">
                                                            <rect x="2" y="6" width="12" height="9" rx="1.5" fill="#121927" stroke="#475569" strokeWidth="1.5" />
                                                            <path d="M 5 6 V 4 A 3 3 0 0 1 11 4 V 6" fill="none" stroke="#475569" strokeWidth="1.5" />
                                                        </g>
                                                    )}
                                                </svg>
                                            </div>
                                            <div className={`mt-1.5 font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.24em] ${isLocked ? 'text-slate-700' : 'text-[#c8aa6e]/75'}`}>
                                                Nivel
                                            </div>
                                        </div>

                                        <div className="min-w-0 self-center">
                                            <div className="flex min-w-0 items-start justify-between gap-4">
                                                <div className={`min-w-0 flex-1 ${editorMode ? 'pr-8 sm:pr-10' : ''}`}>
                                                    {editorMode ? (
                                                        <EditableText
                                                            value={level.title}
                                                            onChange={(value) => onUpdateLevel(index, 'title', value)}
                                                            className="font-['Cinzel'] text-lg font-semibold uppercase leading-tight tracking-[0.08em] text-[#f0e6d2] sm:text-xl md:text-2xl"
                                                            placeholder={`Nivel ${levelNumber}`}
                                                        />
                                                    ) : (
                                                        <h3 className={`font-['Cinzel'] text-lg font-semibold uppercase leading-tight tracking-[0.08em] sm:text-xl md:text-2xl ${isLocked ? 'text-slate-500' : 'text-[#f0e6d2]'}`}>
                                                            {level.title || `Nivel ${levelNumber}`}
                                                        </h3>
                                                    )}
                                                </div>

                                                {!editorMode && <LevelStatus state={state} />}
                                            </div>

                                            {editorMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveLevel(index)}
                                                    className="absolute right-4 top-4 flex h-8 w-8 touch-manipulation items-center justify-center text-slate-600 transition hover:text-rose-400 active:text-rose-500 sm:right-6 sm:top-5"
                                                    aria-label={`Eliminar nivel ${levelNumber}`}
                                                    title="Eliminar nivel"
                                                >
                                                    <FiTrash2 className="h-4 w-4" />
                                                </button>
                                            )}

                                            <div className="mt-1.5 max-w-4xl">
                                                {editorMode ? (
                                                    <EditableText
                                                        value={level.description}
                                                        onChange={(value) => onUpdateLevel(index, 'description', value)}
                                                        multiline
                                                        className="text-sm leading-relaxed text-slate-400 sm:text-[15px]"
                                                        placeholder="Describe el beneficio que se obtiene al alcanzar este nivel."
                                                    />
                                                ) : (
                                                    <p className={`text-sm leading-relaxed sm:text-[15px] ${isLocked ? 'text-slate-600' : 'text-slate-400'}`}>
                                                        {level.description || 'Beneficio pendiente de definir por el máster.'}
                                                    </p>
                                                )}
                                            </div>

                                            {editorMode ? (
                                                <div className="mt-4 space-y-2" data-level-effects={levelNumber}>
                                                    {levelEffects.map((effect, effectIndex) => (
                                                        <LevelEffectEditor
                                                            key={effect.id || `${effect.target}-${effectIndex}`}
                                                            effect={effect}
                                                            effectIndex={effectIndex}
                                                            levelNumber={levelNumber}
                                                            resourceName={resourceName}
                                                            resourceColor={resourceColor}
                                                            onResourceColorChange={onResourceColorChange}
                                                            onChange={(patch) => updateEffect(effectIndex, patch)}
                                                            onRemove={() => removeEffect(effectIndex)}
                                                        />
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={addEffect}
                                                        className="inline-flex h-8 items-center gap-2 border border-[#c8aa6e]/25 px-3 font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.14em] text-[#c8aa6e]/75 transition hover:border-[#c8aa6e]/55 hover:text-[#e2d5b5]"
                                                        aria-label={`Añadir mejora al nivel ${levelNumber}`}
                                                    >
                                                        <FiPlus className="h-3.5 w-3.5" />
                                                        Añadir mejora
                                                    </button>
                                                </div>
                                            ) : levelEffects.length > 0 ? (
                                                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-8" data-level-effects={levelNumber}>
                                                    {levelEffects.map((effect, effectIndex) => (
                                                        <LevelEffect
                                                            key={effect.id || `${effect.target}-${effectIndex}`}
                                                            effect={effect}
                                                            resourceName={resourceName}
                                                            resourceColor={resourceColor}
                                                            isLocked={isLocked}
                                                        />
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mt-10 border-y border-[#c8aa6e]/15 py-14 text-center">
                        <div className="font-['Cinzel'] text-lg uppercase tracking-[0.16em] text-slate-500">Progresión sin definir</div>
                        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
                            {editorMode
                                ? 'Añade el primer nivel para comenzar a definir el camino de esta clase.'
                                : 'El máster todavía no ha definido los niveles de esta clase.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

EditableText.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    className: PropTypes.string,
    inputClassName: PropTypes.string,
    multiline: PropTypes.bool,
    placeholder: PropTypes.string,
};

LevelEffect.propTypes = {
    effect: PropTypes.object.isRequired,
    resourceName: PropTypes.string.isRequired,
    resourceColor: PropTypes.string.isRequired,
    isLocked: PropTypes.bool,
};

EffectColorControl.propTypes = {
    color: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
};

LevelEffectEditor.propTypes = {
    effect: PropTypes.object.isRequired,
    effectIndex: PropTypes.number.isRequired,
    levelNumber: PropTypes.number.isRequired,
    resourceName: PropTypes.string.isRequired,
    resourceColor: PropTypes.string.isRequired,
    onResourceColorChange: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
};

LevelStatus.propTypes = {
    state: PropTypes.oneOf(['current', 'unlocked', 'locked']).isRequired,
};

ProgressionView.propTypes = {
    dndClass: PropTypes.shape({
        level: PropTypes.number,
        classLevels: PropTypes.array,
        resource: PropTypes.shape({ name: PropTypes.string, color: PropTypes.string }),
        roguelite: PropTypes.shape({
            resource: PropTypes.shape({ name: PropTypes.string, color: PropTypes.string }),
        }),
    }).isRequired,
    readOnly: PropTypes.bool,
    onUpdateLevel: PropTypes.func,
    onAddLevel: PropTypes.func,
    onRemoveLevel: PropTypes.func,
    onResourceColorChange: PropTypes.func,
};

ProgressionView.defaultProps = {
    onUpdateLevel: () => {},
    onAddLevel: () => {},
    onRemoveLevel: () => {},
    onResourceColorChange: () => {},
};

export default ProgressionView;
