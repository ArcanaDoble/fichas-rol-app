import React from 'react';
import { Activity, Image, LayoutGrid, Link, Maximize, RotateCw, Ruler, Trash2, Upload } from 'lucide-react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

export const GridConfigPanel = ({
    activeTab,
    applyBackgroundGridPreset,
    backgroundGridPresets,
    clearBackgroundImage,
    commitGridDraft,
    currentBackgroundGridPresetIndex,
    fileInputRef,
    finiteGridHeight,
    finiteGridWidth,
    gridConfig,
    gridInputDrafts,
    handleConfigChange,
    handleGridDraftChange,
    handleGridDraftKeyDown,
    handleImageUpload,
    isPlayerView,
    resetAllSpeed,
}) => (
    activeTab === 'CONFIG' && !isPlayerView && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {/* 1. Modo de Mapa */}
                                        <div className="space-y-3">
                                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <LayoutGrid className="w-3 h-3" />
                                                Modo de Mapa
                                            </h4>
                                            <div className="bg-[#111827] p-1 rounded border border-slate-800 flex text-[10px] font-bold font-fantasy shadow-inner">
                                                <button
                                                    onClick={() => handleConfigChange('isInfinite', true)}
                                                    className={`flex-1 py-2.5 rounded transition-all uppercase tracking-widest ${gridConfig.isInfinite ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                >
                                                    Infinito
                                                </button>
                                                <button
                                                    onClick={() => handleConfigChange('isInfinite', false)}
                                                    className={`flex-1 py-2.5 rounded transition-all uppercase tracking-widest ${!gridConfig.isInfinite ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                >
                                                    Finito
                                                </button>
                                            </div>
                                        </div>

                                        {/* Control de Snap */}
                                        <div className="flex items-center justify-between bg-[#111827] p-3 rounded border border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <LayoutGrid className="w-4 h-4 text-[#c8aa6e]" />
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Ajustar a Rejilla (Snap)</span>
                                            </div>
                                            <button
                                                onClick={() => handleConfigChange('snapToGrid', !gridConfig.snapToGrid)}
                                                className={`relative w-12 h-6 rounded-full transition-all ${gridConfig.snapToGrid ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gridConfig.snapToGrid ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="w-full h-px bg-slate-800/50"></div>

                                        {/* 1.5 Gestión de Encuentro (Combate Dinámico) */}
                                        <div className="space-y-4">
                                            <h4 className="text-[#c8aa6e] font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <Activity className="w-3 h-3" />
                                                Gestión de Encuentro
                                            </h4>

                                            <div className="flex items-center justify-between bg-[#0b1120] p-4 rounded-lg border border-[#c8aa6e]/20 shadow-lg">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold uppercase text-[#f0e6d2]">Modo Combate</span>
                                                    <span className="text-[8px] text-slate-500 uppercase">Habilita costes de velocidad</span>
                                                </div>
                                                <button
                                                    onClick={() => handleConfigChange('isCombatActive', !gridConfig.isCombatActive)}
                                                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${gridConfig.isCombatActive ? 'bg-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.4)]' : 'bg-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${gridConfig.isCombatActive ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={resetAllSpeed}
                                                className="w-full py-3 bg-[#161f32] border border-slate-700/50 text-slate-400 rounded text-[9px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] transition-all group"
                                            >
                                                <RotateCw className="w-3.5 h-3.5 group-active:rotate-180 transition-transform duration-500" />
                                                Reiniciar Cronología
                                            </button>
                                        </div>

                                        <div className="w-full h-px bg-slate-800/50"></div>

                                        {/* 2. Fondo de Mapa */}
                                        <div className="space-y-3">
                                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <Image className="w-3 h-3" />
                                                Imagen de Fondo
                                            </h4>

                                            {!gridConfig.backgroundImage ? (
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="border-2 border-dashed border-slate-700/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5 transition-all group"
                                                >
                                                    <Upload className="w-8 h-8 text-slate-600 group-hover:text-[#c8aa6e] mb-2 transition-colors" />
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300 tracking-widest">Subir Mapa</span>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                        accept="image/*"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="relative w-full h-32 bg-[#0b1120] rounded-lg overflow-hidden border border-slate-700/50 group shadow-lg">
                                                        <img src={gridConfig.backgroundImage} alt="Background Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                                                            <span className="text-[10px] font-bold text-[#f0e6d2] uppercase tracking-[0.2em]">Vista Previa</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={clearBackgroundImage}
                                                        className="w-full py-2.5 bg-red-900/10 border border-red-900/30 text-red-500 rounded text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-900/20 transition-all font-sans"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Eliminar Fondo
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full h-px bg-slate-800/50"></div>

                                        {/* 3. Dimensiones (Solo Finito) */}
                                        {!gridConfig.isInfinite && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                                <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                    <Maximize className="w-3 h-3" />
                                                    Dimensiones (Celdas)
                                                </h4>
                                                <div className={`bg-[#0b1120] p-3 rounded border transition-all ${gridConfig.lockFiniteMapSize ? 'border-[#c8aa6e]/30 shadow-[0_0_18px_rgba(200,170,110,0.08)]' : 'border-slate-800'}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                                                <Link className={`w-3 h-3 ${gridConfig.lockFiniteMapSize ? 'text-[#c8aa6e]' : 'text-slate-500'}`} />
                                                                Mantener tamaño total
                                                            </div>
                                                            <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
                                                                Al cambiar columnas, filas o el tamaño de celda, el mapa conserva su ancho y alto automáticamente.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleConfigChange('lockFiniteMapSize', !gridConfig.lockFiniteMapSize)}
                                                            className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${gridConfig.lockFiniteMapSize ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                            title={gridConfig.lockFiniteMapSize ? 'Manteniendo tamaño total' : 'Edición libre'}
                                                        >
                                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gridConfig.lockFiniteMapSize ? 'left-7' : 'left-1'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors">Columnas</span>
                                                        <div className="flex items-center justify-between">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={gridInputDrafts.columns}
                                                                onChange={(e) => handleGridDraftChange('columns', e.target.value)}
                                                                onBlur={() => commitGridDraft('columns')}
                                                                onKeyDown={(e) => handleGridDraftKeyDown('columns', e)}
                                                                className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <div className="flex flex-col gap-0.5 ml-2">
                                                                <button onClick={() => handleConfigChange('columns', Math.min(100, gridConfig.columns + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                                                <button onClick={() => handleConfigChange('columns', Math.max(1, gridConfig.columns - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors">Filas</span>
                                                        <div className="flex items-center justify-between">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={gridInputDrafts.rows}
                                                                onChange={(e) => handleGridDraftChange('rows', e.target.value)}
                                                                onBlur={() => commitGridDraft('rows')}
                                                                onKeyDown={(e) => handleGridDraftKeyDown('rows', e)}
                                                                className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <div className="flex flex-col gap-0.5 ml-2">
                                                                <button onClick={() => handleConfigChange('rows', Math.min(100, gridConfig.rows + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                                                <button onClick={() => handleConfigChange('rows', Math.max(1, gridConfig.rows - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {!gridConfig.isInfinite && gridConfig.backgroundImage && backgroundGridPresets.length > 0 && (
                                                    <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cantidad de Casillas</span>
                                                            <span className="text-[10px] font-mono text-[#c8aa6e]">
                                                                {gridConfig.columns}x{gridConfig.rows} · {gridConfig.cellWidth}px
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={Math.max(backgroundGridPresets.length - 1, 0)}
                                                            step="1"
                                                            value={currentBackgroundGridPresetIndex}
                                                            onChange={(e) => applyBackgroundGridPreset(Number(e.target.value))}
                                                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                        />
                                                        <div className="flex items-center justify-between gap-4 text-[9px] font-bold uppercase tracking-[0.16em]">
                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                <span className="w-5 h-px bg-slate-700/80 rounded-full"></span>
                                                                <span className="text-left leading-tight">
                                                                    <span className="block text-slate-400">Menos Casillas</span>
                                                                    <span className="block text-[8px] tracking-[0.14em] text-slate-600">Más grandes</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                <span className="text-right leading-tight">
                                                                    <span className="block text-slate-400">Más Casillas</span>
                                                                    <span className="block text-[8px] tracking-[0.14em] text-slate-600">Más pequeñas</span>
                                                                </span>
                                                                <span className="w-5 h-px bg-slate-700/80 rounded-full"></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="text-[9px] text-slate-600 text-right font-mono flex items-center justify-end gap-2 uppercase">
                                                    <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                                                    TOTAL: {finiteGridWidth}x{finiteGridHeight}PX
                                                </div>

                                                <div className="w-full h-px bg-slate-800/50"></div>
                                            </div>
                                        )}

                                        {/* 4. Tamaño de Celda */}
                                        <div className="space-y-4">
                                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <Ruler className="w-3 h-3" />
                                                Escala de Rejilla
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors font-sans">Ancho (PX)</span>
                                                    <div className="flex items-center justify-between">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={gridInputDrafts.cellWidth}
                                                            onChange={(e) => handleGridDraftChange('cellWidth', e.target.value)}
                                                            onBlur={() => commitGridDraft('cellWidth')}
                                                            onKeyDown={(e) => handleGridDraftKeyDown('cellWidth', e)}
                                                            className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <div className="flex flex-col gap-0.5 ml-2">
                                                            <button onClick={() => handleConfigChange('cellWidth', Math.min(500, gridConfig.cellWidth + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                                            <button onClick={() => handleConfigChange('cellWidth', Math.max(10, gridConfig.cellWidth - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors font-sans">Alto (PX)</span>
                                                    <div className="flex items-center justify-between">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={gridInputDrafts.cellHeight}
                                                            onChange={(e) => handleGridDraftChange('cellHeight', e.target.value)}
                                                            onBlur={() => commitGridDraft('cellHeight')}
                                                            onKeyDown={(e) => handleGridDraftKeyDown('cellHeight', e)}
                                                            className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <div className="flex flex-col gap-0.5 ml-2">
                                                            <button onClick={() => handleConfigChange('cellHeight', Math.min(500, gridConfig.cellHeight + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                                            <button onClick={() => handleConfigChange('cellHeight', Math.max(10, gridConfig.cellHeight - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
);
