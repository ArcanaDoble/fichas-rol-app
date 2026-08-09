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
import NumberStepper from './NumberStepper';

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
        surface: 'from-[#713b43]/[0.14]',
        icon: 'text-[#ef4444]',
        label: 'text-[#e2d5b5]',
    },
    movement: {
        surface: 'from-[#31586a]/[0.14]',
        icon: 'text-[#38bdf8]',
        label: 'text-[#e2d5b5]',
    },
    resource: {
        surface: 'from-[#523d68]/[0.14]',
        icon: 'text-[#c8aa6e]',
        label: 'text-[#e2d5b5]',
    },
};

const LevelMetric = ({ icon: Icon, label, value, editable, onChange, tone }) => {
    if (!editable && (value === null || value === undefined)) return null;

    const palette = LEVEL_METRIC_TONES[tone] || LEVEL_METRIC_TONES.resource;
    const safeValue = Math.max(0, Math.min(99, Number(value) || 0));
    const displayValue = safeValue > 0 ? `+${safeValue}` : `${safeValue}`;

    return (
        <div
            data-metric-tone={tone}
            className={`flex min-w-0 w-full sm:w-auto overflow-hidden items-center justify-between gap-1.5 border-b border-[#c8aa6e]/25 pb-2 px-2 ${
                editable ? 'sm:w-[176px] py-2.5' : 'sm:w-[152px] py-2'
            } ${palette.surface}`}
        >
            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${palette.icon}`} strokeWidth={2} />
                <span className="truncate text-[10.5px] sm:text-[11px] font-bold font-['Cinzel'] tracking-wide text-[#e2d5b5] uppercase">
                    {label}
                </span>
            </div>

            {editable ? (
                <div className="flex shrink-0 items-center gap-0.5 ml-auto">
                    <button
                        type="button"
                        onClick={() => onChange(Math.max(0, safeValue - 1))}
                        disabled={safeValue <= 0}
                        className="text-slate-400 hover:text-[#c8aa6e] transition p-0.5 disabled:opacity-20 touch-manipulation"
                        aria-label={`Reducir ${label}`}
                    >
                        <FiMinus className="h-3 w-3" />
                    </button>
                    <span
                        className="font-mono text-xs font-bold text-[#c8aa6e] min-w-[16px] text-center"
                        aria-label={`${label}: ${safeValue}`}
                    >
                        {displayValue}
                    </span>
                    <button
                        type="button"
                        onClick={() => onChange(Math.min(99, safeValue + 1))}
                        disabled={safeValue >= 99}
                        className="text-slate-400 hover:text-[#c8aa6e] transition p-0.5 disabled:opacity-20 touch-manipulation"
                        aria-label={`Aumentar ${label}`}
                    >
                        <FiPlus className="h-3 w-3" />
                    </button>
                </div>
            ) : (
                <span className="font-mono text-xs font-bold text-[#c8aa6e] shrink-0 ml-auto">
                    {displayValue}
                </span>
            )}
        </div>
    );
};

const ProgressionRail = ({ totalLevels, currentLevel, editorMode }) => {
    if (totalLevels === 0) return null;

    const progress = totalLevels <= 1
        ? 0
        : ((currentLevel - 1) / (totalLevels - 1)) * 100;

    return (
        <div className="overflow-x-auto custom-scrollbar pb-2" data-testid="roguelite-progression-rail">
            <div
                className="relative mx-auto flex h-24 items-start justify-between px-6 pt-1"
                style={{ minWidth: `${Math.max(620, totalLevels * 76)}px` }}
            >
                <div className="absolute left-10 right-10 top-[22px] h-px bg-slate-800" />
                {!editorMode && (
                    <div
                        className="absolute left-10 top-[22px] h-px bg-[#c8aa6e] shadow-[0_0_8px_rgba(200,170,110,0.45)] transition-all duration-700"
                        style={{ width: `calc((100% - 80px) * ${progress / 100})` }}
                    />
                )}

                {Array.from({ length: totalLevels }, (_, index) => {
                    const level = index + 1;
                    const isCurrent = !editorMode && level === currentLevel;
                    const isUnlocked = editorMode || level <= currentLevel;

                    return (
                        <div key={level} className="relative z-10 flex w-12 flex-col items-center">
                            <div
                                className={`flex h-11 w-11 items-center justify-center rounded-full border bg-[#0b1120] font-['Cinzel'] text-sm font-bold transition ${isCurrent
                                    ? 'scale-110 border-[#c8aa6e] text-[#f0e6d2] shadow-[0_0_18px_rgba(200,170,110,0.35)]'
                                    : isUnlocked
                                        ? 'border-[#c8aa6e]/60 text-[#c8aa6e]'
                                        : 'border-slate-800 text-slate-600'
                                    }`}
                            >
                                {level}
                            </div>
                            <span className={`mt-3 text-[9px] font-bold uppercase tracking-[0.16em] ${isCurrent ? 'text-[#c8aa6e]' : 'text-slate-700'}`}>
                                {editorMode ? 'Definido' : isCurrent ? 'Actual' : isUnlocked ? 'Obtenido' : 'Pendiente'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const LevelStatus = ({ state }) => {
    if (state === 'current') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8aa6e]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c8aa6e] shadow-[0_0_8px_#c8aa6e]" />
                Nivel actual
            </span>
        );
    }

    if (state === 'unlocked') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f7b52]">
                <FiCheck className="h-3.5 w-3.5" />
                Desbloqueado
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
            <FiLock className="h-3.5 w-3.5" />
            Por desbloquear
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

                <ProgressionRail
                    totalLevels={totalLevels}
                    currentLevel={currentLevel}
                    editorMode={editorMode}
                />

                {levels.length > 0 ? (
                    <div className="mt-5 border-t border-[#c8aa6e]/15">
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
                                    className={`relative grid grid-cols-[52px_minmax(0,1fr)] gap-4 border-b px-1 py-6 transition md:grid-cols-[72px_minmax(0,1fr)] md:gap-6 md:px-4 ${isCurrent
                                        ? 'border-[#c8aa6e]/40 bg-[#c8aa6e]/[0.045]'
                                        : 'border-slate-800/80'
                                        } ${isLocked ? 'opacity-60' : ''}`}
                                >
                                    {isCurrent && <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-[#c8aa6e]" />}

                                    <div className="pt-0.5 text-center">
                                        <div className={`font-['Cinzel'] text-3xl ${isCurrent ? 'text-[#c8aa6e]' : isLocked ? 'text-slate-700' : 'text-[#8f7b52]'}`}>
                                            {String(levelNumber).padStart(2, '0')}
                                        </div>
                                        <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.22em] text-slate-700">Nivel</div>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className={`min-w-0 flex-1 ${editorMode ? 'pr-12' : ''}`}>
                                                {editorMode ? (
                                                    <EditableText
                                                        value={level.title}
                                                        onChange={(value) => onUpdateLevel(index, 'title', value)}
                                                        className="font-['Cinzel'] text-lg font-semibold uppercase tracking-[0.08em] text-[#f0e6d2] md:text-xl"
                                                        placeholder={`Nivel ${levelNumber}`}
                                                    />
                                                ) : (
                                                    <h3 className={`font-['Cinzel'] text-lg font-semibold uppercase tracking-[0.08em] md:text-xl ${isLocked ? 'text-slate-500' : 'text-[#f0e6d2]'}`}>
                                                        {level.title || `Nivel ${levelNumber}`}
                                                    </h3>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3">
                                                {!editorMode && <LevelStatus state={state} />}
                                            </div>
                                        </div>

                                        {editorMode && (
                                            <button
                                                type="button"
                                                onClick={() => onRemoveLevel(index)}
                                                className="absolute right-1 top-5 flex h-10 w-10 touch-manipulation items-center justify-center border border-transparent text-slate-700 transition hover:border-rose-400/30 hover:bg-rose-400/5 hover:text-rose-400 active:bg-rose-400/10 md:right-4"
                                                aria-label={`Eliminar nivel ${levelNumber}`}
                                                title="Eliminar nivel"
                                            >
                                                <FiTrash2 className="h-4 w-4" />
                                            </button>
                                        )}

                                        <div className="mt-3 max-w-4xl">
                                            {editorMode ? (
                                                <EditableText
                                                    value={level.description}
                                                    onChange={(value) => onUpdateLevel(index, 'description', value)}
                                                    multiline
                                                    className="text-sm leading-6 text-slate-400"
                                                    placeholder="Describe el beneficio que se obtiene al alcanzar este nivel."
                                                />
                                            ) : (
                                                <p className={`text-sm leading-6 ${isLocked ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    {level.description || 'Beneficio pendiente de definir por el máster.'}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-6 md:gap-8">
                                            <LevelMetric
                                                icon={Heart}
                                                label="Vida"
                                                tone="life"
                                                value={level.maxLife}
                                                editable={editorMode}
                                                onChange={(value) => onUpdateLevel(index, 'maxLife', value)}
                                            />
                                            <LevelMetric
                                                icon={Footprints}
                                                label="Movimiento"
                                                tone="movement"
                                                value={level.movement}
                                                editable={editorMode}
                                                onChange={(value) => onUpdateLevel(index, 'movement', value)}
                                            />
                                            <LevelMetric
                                                icon={Sparkles}
                                                label={`${resourceName} máx.`}
                                                tone="resource"
                                                value={level.resourceMaximum}
                                                editable={editorMode}
                                                onChange={(value) => onUpdateLevel(index, 'resourceMaximum', value)}
                                            />
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

ProgressionRail.propTypes = {
    totalLevels: PropTypes.number.isRequired,
    currentLevel: PropTypes.number.isRequired,
    editorMode: PropTypes.bool.isRequired,
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
