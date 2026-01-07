import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiCheckCircle, FiLock, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';

// Editable Text Component for inline editing
const EditableText = ({ value, onChange, className = '', multiline = false, placeholder = 'Click para editar', readOnly = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => {
        setTempValue(value || '');
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (!multiline) {
                inputRef.current.select();
            }
        }
    }, [isEditing, multiline]);

    const handleSave = () => {
        onChange(tempValue);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            setTempValue(value || '');
            setIsEditing(false);
        }
    };

    if (isEditing && !readOnly) {
        return multiline ? (
            <textarea
                ref={inputRef}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={`${className} bg-slate-900/90 border border-[#c8aa6e]/50 rounded px-2 py-1 focus:outline-none focus:border-[#c8aa6e] w-full resize-none`}
                rows={3}
            />
        ) : (
            <input
                ref={inputRef}
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={`${className} bg-slate-900/90 border border-[#c8aa6e]/50 rounded px-2 py-1 focus:outline-none focus:border-[#c8aa6e] w-full`}
            />
        );
    }

    return (
        <div
            onClick={() => !readOnly && setIsEditing(true)}
            className={`${className} ${!readOnly ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} group relative flex items-center gap-2`}
            title={!readOnly ? "Click para editar" : ""}
        >
            <span className="break-words w-full">{value || placeholder}</span>
            {!readOnly && (
                <FiEdit2 className="opacity-0 group-hover:opacity-100 text-[#c8aa6e] w-3 h-3 transition-opacity shrink-0" />
            )}
        </div>
    );
};

const ProgressionView = ({ dndClass, onUpdateLevel, onToggleAcquired, onAddFeature, onRemoveFeature, onUpdateFeature }) => {
    // Usamos classLevels directamente. Si no hay suficientes, mostramos hasta el max configurado o 20 por defecto.
    const levelsList = dndClass.classLevels || [];
    const totalLevels = Math.max(20, levelsList.length);

    return (
        <div className="w-full h-full min-h-screen overflow-y-auto custom-scrollbar bg-[#09090b] pb-20 md:pb-0">
            <div className="max-w-5xl mx-auto p-4 pt-12 md:p-8 lg:p-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 border-b border-[#c8aa6e]/20 pb-4 md:pb-6 gap-4">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-['Cinzel'] text-[#f0e6d2] mb-1 md:mb-2">CONSTELACIÓN</h2>
                        <p className="text-slate-400 text-xs md:text-sm uppercase tracking-widest">Progreso de Nivel y Rasgos</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <div className="text-2xl md:text-3xl font-bold text-[#c8aa6e]">{dndClass.level || 0} <span className="text-slate-600 text-lg md:text-xl">/ {totalLevels}</span></div>
                        <div className="text-[10px] md:text-xs text-slate-500 uppercase font-bold">Nivel Actual</div>
                    </div>
                </div>

                <div className="relative space-y-0 pl-1 md:pl-0">
                    {/* Vertical connecting line - centered on node: pl-1 (4px) + w-12/2 (24px) = 28px for mobile */}
                    <div className="absolute left-[28px] md:left-[32px] top-8 bottom-8 w-[2px] bg-slate-800 z-0"></div>
                    <div
                        className="absolute left-[28px] md:left-[32px] top-8 w-[2px] bg-gradient-to-b from-[#c8aa6e] to-slate-800 z-0 transition-all duration-1000"
                        style={{ height: `${((dndClass.level || 0) / totalLevels) * 100}%` }}
                    ></div>

                    {Array.from({ length: totalLevels }, (_, i) => i + 1).map((level) => {
                        const levelIndex = level - 1;
                        const levelData = levelsList[levelIndex] || { title: `Nivel ${level}`, description: '' };
                        const isPast = level <= (dndClass.level || 0);
                        const isCurrent = level === (dndClass.level || 0);

                        // Calculate total items (main + extras) to limit to 3
                        const extraFeatures = levelData.additionalFeatures || [];
                        const canAddMore = extraFeatures.length < 2; // 1 main + 2 extras = 3 max

                        return (
                            <div key={level} className="relative z-10 group mb-4 md:mb-6 last:mb-0">
                                <div className={`
                                flex items-stretch gap-3 md:gap-6 p-1 rounded-lg transition-all duration-300
                                ${isCurrent ? 'bg-gradient-to-r from-[#c8aa6e]/10 to-transparent border-l-4 border-[#c8aa6e] pl-1 md:pl-4' : ''}
                            `}>
                                    {/* Level Node */}
                                    <div className="flex flex-col items-center shrink-0 pt-2">
                                        <div className={`
                                        w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-lg md:text-xl font-bold font-['Cinzel'] border-3 md:border-4 relative bg-[#0b1120] shadow-xl transition-all duration-300
                                        ${isPast ? 'border-[#c8aa6e] text-[#c8aa6e]' : 'border-slate-700 text-slate-600 grayscale'}
                                        ${isCurrent ? 'scale-110 shadow-[0_0_20px_rgba(200,170,110,0.4)]' : ''}
                                     `}>
                                            {level}
                                            {isCurrent && <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping"></div>}
                                        </div>
                                    </div>

                                    {/* Content Box */}
                                    <div className={`
                                    flex-1 p-3 md:p-5 rounded border backdrop-blur-sm transition-all duration-300 flex flex-col md:flex-row md:items-start gap-4 md:gap-6
                                    ${isPast
                                            ? 'bg-[#161f32]/60 border-[#c8aa6e]/30 hover:bg-[#161f32]/80'
                                            : 'bg-[#0b1120]/40 border-slate-800 text-slate-500'
                                        }
                                `}>
                                        <div className="flex-1 space-y-6">
                                            {/* Main Feature (Always present) */}
                                            <div className="relative group/main">
                                                <EditableText
                                                    value={levelData.title}
                                                    onChange={(val) => onUpdateLevel && onUpdateLevel(levelIndex, 'title', val)}
                                                    className={`font-bold text-base md:text-lg font-['Cinzel'] mb-1 block ${isPast ? 'text-[#f0e6d2]' : 'text-slate-400'}`}
                                                />
                                                <EditableText
                                                    value={levelData.description}
                                                    onChange={(val) => onUpdateLevel && onUpdateLevel(levelIndex, 'description', val)}
                                                    className={`text-sm leading-relaxed block ${isPast ? 'text-slate-300' : 'text-slate-600'}`}
                                                    multiline={true}
                                                />

                                                {/* Add Button for first extra if none exist */}
                                                {canAddMore && extraFeatures.length === 0 && (
                                                    <div className="mt-2">
                                                        <button
                                                            onClick={() => onAddFeature && onAddFeature(levelIndex)}
                                                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-[#c8aa6e] transition-colors opacity-0 group-hover/main:opacity-100"
                                                            title="Añadir rasgo adicional"
                                                        >
                                                            <FiPlus className="w-3 h-3" /> Añadir Rasgo
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Additional Features */}
                                            {extraFeatures.map((extra, idx) => (
                                                <div key={idx} className="relative pl-4 border-l-2 border-slate-700/30 group/extra">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-1">
                                                            <EditableText
                                                                value={extra.title}
                                                                onChange={(val) => onUpdateFeature && onUpdateFeature(levelIndex, idx, 'title', val)}
                                                                className={`font-bold text-sm md:text-base font-['Cinzel'] mb-1 block ${isPast ? 'text-[#e2d5b5]' : 'text-slate-500'}`}
                                                                placeholder="Nuevo Título"
                                                            />
                                                            <EditableText
                                                                value={extra.description}
                                                                onChange={(val) => onUpdateFeature && onUpdateFeature(levelIndex, idx, 'description', val)}
                                                                className={`text-xs md:text-sm leading-relaxed block ${isPast ? 'text-slate-400' : 'text-slate-600'}`}
                                                                multiline={true}
                                                                placeholder="Descripción del rasgo adicional..."
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => onRemoveFeature && onRemoveFeature(levelIndex, idx)}
                                                            className="opacity-0 group-hover/extra:opacity-100 p-1.5 text-slate-600 hover:text-rose-400 transition-opacity"
                                                            title="Eliminar rasgo"
                                                        >
                                                            <FiTrash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    {/* Add Button for subsequent extras (if below limit) */}
                                                    {canAddMore && idx === extraFeatures.length - 1 && (
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() => onAddFeature && onAddFeature(levelIndex)}
                                                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-[#c8aa6e] transition-colors opacity-0 group-hover/extra:opacity-100"
                                                                title="Añadir otro rasgo"
                                                            >
                                                                <FiPlus className="w-3 h-3" /> Añadir Rasgo
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Status Icon with Toggle */}
                                        <div className="hidden sm:flex shrink-0 opacity-50 group-hover:opacity-100 transition-opacity self-center">
                                            <button
                                                onClick={() => onToggleAcquired && onToggleAcquired(levelIndex)}
                                                className="flex flex-col items-center gap-1 cursor-pointer hover:scale-110 transition-transform focus:outline-none"
                                                title={isPast ? "Click para marcar como no adquirido" : "Click para marcar como adquirido"}
                                            >
                                                {isPast ? (
                                                    <>
                                                        <FiCheckCircle className="w-6 h-6 text-[#c8aa6e]" />
                                                        <span className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-wider">Adquirido</span>
                                                    </>
                                                ) : (
                                                    <FiLock className="w-6 h-6 text-slate-700" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* End of path decoration */}
                <div className="text-center py-12">
                    <div className="inline-block p-4 rounded-full border border-slate-800 bg-[#0b1120] text-slate-600">
                        <span className="font-['Cinzel'] uppercase tracking-[0.2em] text-xs">Maestría de Clase</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

ProgressionView.propTypes = {
    dndClass: PropTypes.shape({
        level: PropTypes.number,
        classLevels: PropTypes.array
    }).isRequired,
    onUpdateLevel: PropTypes.func,
    onToggleAcquired: PropTypes.func,
    onAddFeature: PropTypes.func,
    onRemoveFeature: PropTypes.func,
    onUpdateFeature: PropTypes.func
};

export default ProgressionView;
