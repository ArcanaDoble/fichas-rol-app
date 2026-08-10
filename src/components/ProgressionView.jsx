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
import { Footprints, Heart, Sparkles } from 'lucide-react';

const LEVEL_FRAME_CLIP = {
    clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
};

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

const LEVEL_METRIC_TONES = {
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
};

const LevelMetric = ({ icon: Icon, label, value, editable, onChange, tone, isLocked = false }) => {
    if (!editable && (value === null || value === undefined)) return null;

    const palette = LEVEL_METRIC_TONES[tone] || LEVEL_METRIC_TONES.resource;
    const safeValue = Math.max(0, Math.min(99, Number(value) || 0));
    const displayValue = `${safeValue}`;

    const borderClass = isLocked ? 'border-l-slate-700/60' : palette.border;
    const iconClass = isLocked ? 'text-slate-600' : palette.icon;
    const labelClass = isLocked ? 'text-slate-600' : palette.label;
    const valueClass = isLocked ? 'text-slate-500' : palette.value;

    return (
        <div
            data-metric-tone={tone}
            className={`inline-flex min-w-[132px] w-[148px] items-center gap-2 border-l-2 py-1 pl-2.5 pr-1.5 ${borderClass}`}
        >
            <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} strokeWidth={2} />
                <span className={`truncate font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.14em] ${labelClass}`}>
                    {label}
                </span>
            </div>

            {editable ? (
                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => onChange(Math.max(0, safeValue - 1))}
                        disabled={safeValue <= 0}
                        className="p-0.5 text-slate-500 transition hover:text-[#f0e6d2] disabled:opacity-20 touch-manipulation"
                        aria-label={`Reducir ${label}`}
                    >
                        <FiMinus className="h-3 w-3" />
                    </button>
                    <span
                        className={`min-w-[16px] text-center font-mono text-xs font-bold ${valueClass}`}
                        aria-label={`${label}: ${safeValue}`}
                    >
                        {displayValue}
                    </span>
                    <button
                        type="button"
                        onClick={() => onChange(Math.min(99, safeValue + 1))}
                        disabled={safeValue >= 99}
                        className="p-0.5 text-slate-500 transition hover:text-[#f0e6d2] disabled:opacity-20 touch-manipulation"
                        aria-label={`Aumentar ${label}`}
                    >
                        <FiPlus className="h-3 w-3" />
                    </button>
                </div>
            ) : (
                <span className={`ml-auto shrink-0 font-mono text-xs font-bold ${valueClass}`}>
                    {displayValue}
                </span>
            )}
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
}) => {
    const levels = Array.isArray(dndClass.classLevels) ? dndClass.classLevels : [];
    const totalLevels = levels.length;
    const rawCurrentLevel = Math.max(1, Number(dndClass.level) || 1);
    const currentLevel = totalLevels > 0 ? Math.min(rawCurrentLevel, totalLevels) : 1;
    const editorMode = !readOnly;
    const resourceName = dndClass.resource?.name
        || dndClass.roguelite?.resource?.name
        || 'Recurso';

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
                                                            className="font-['Cinzel'] text-lg font-semibold uppercase tracking-[0.08em] text-[#f0e6d2] sm:text-xl md:text-2xl"
                                                            placeholder={`Nivel ${levelNumber}`}
                                                        />
                                                    ) : (
                                                        <h3 className={`font-['Cinzel'] text-lg font-semibold uppercase tracking-[0.08em] sm:text-xl md:text-2xl ${isLocked ? 'text-slate-500' : 'text-[#f0e6d2]'}`}>
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
                                                    className="absolute right-4 top-4 flex h-8 w-8 touch-manipulation items-center justify-center border border-transparent text-slate-600 transition hover:border-rose-400/30 hover:bg-rose-400/5 hover:text-rose-400 active:bg-rose-400/10 sm:right-6 sm:top-5"
                                                    aria-label={`Eliminar nivel ${levelNumber}`}
                                                    title="Eliminar nivel"
                                                >
                                                    <FiTrash2 className="h-4 w-4" />
                                                </button>
                                            )}

                                            <div className="mt-2.5 max-w-4xl">
                                                {editorMode ? (
                                                    <EditableText
                                                        value={level.description}
                                                        onChange={(value) => onUpdateLevel(index, 'description', value)}
                                                        multiline
                                                        className="text-sm leading-6 text-slate-400 sm:text-[15px]"
                                                        placeholder="Describe el beneficio que se obtiene al alcanzar este nivel."
                                                    />
                                                ) : (
                                                    <p className={`text-sm leading-6 sm:text-[15px] ${isLocked ? 'text-slate-600' : 'text-slate-400'}`}>
                                                        {level.description || 'Beneficio pendiente de definir por el máster.'}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 sm:gap-x-7">
                                                <LevelMetric
                                                    icon={Heart}
                                                    label="Vida"
                                                    tone="life"
                                                    value={level.maxLife}
                                                    editable={editorMode}
                                                    isLocked={isLocked}
                                                    onChange={(value) => onUpdateLevel(index, 'maxLife', value)}
                                                />
                                                <LevelMetric
                                                    icon={Footprints}
                                                    label="Movimiento"
                                                    tone="movement"
                                                    value={level.movement}
                                                    editable={editorMode}
                                                    isLocked={isLocked}
                                                    onChange={(value) => onUpdateLevel(index, 'movement', value)}
                                                />
                                                <LevelMetric
                                                    icon={Sparkles}
                                                    label={`${resourceName} máx.`}
                                                    tone="resource"
                                                    value={level.resourceMaximum}
                                                    editable={editorMode}
                                                    isLocked={isLocked}
                                                    onChange={(value) => onUpdateLevel(index, 'resourceMaximum', value)}
                                                />
                                            </div>
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

LevelMetric.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.number,
    editable: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    tone: PropTypes.oneOf(['life', 'movement', 'resource']).isRequired,
};

LevelStatus.propTypes = {
    state: PropTypes.oneOf(['current', 'unlocked', 'locked']).isRequired,
};

ProgressionView.propTypes = {
    dndClass: PropTypes.shape({
        level: PropTypes.number,
        classLevels: PropTypes.array,
        resource: PropTypes.shape({ name: PropTypes.string }),
        roguelite: PropTypes.shape({
            resource: PropTypes.shape({ name: PropTypes.string }),
        }),
    }).isRequired,
    readOnly: PropTypes.bool,
    onUpdateLevel: PropTypes.func,
    onAddLevel: PropTypes.func,
    onRemoveLevel: PropTypes.func,
};

ProgressionView.defaultProps = {
    onUpdateLevel: () => {},
    onAddLevel: () => {},
    onRemoveLevel: () => {},
};

export default ProgressionView;
