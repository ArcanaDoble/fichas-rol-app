import React from 'react';
import { Activity, Palette } from 'lucide-react';

export const AppearancePanel = ({
    GRID_LINE_COLOR_PRESETS,
    activeTab,
    gridConfig,
    handleConfigChange,
    isPlayerView,
}) => (
    activeTab === 'CONFIG' && !isPlayerView && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                            <Palette className="w-3 h-3" />
                                            Apariencia Visual
                                        </h4>

                                        <div className="space-y-6">
                                            {/* Color y Grosor */}
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="bg-[#111827]/50 p-4 rounded border border-slate-800 flex flex-col gap-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Color de Línea</span>
                                                        <span className="text-[10px] font-mono text-[#c8aa6e] uppercase tracking-widest">{gridConfig.color}</span>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        {/* Custom Picker */}
                                                        <div className="h-10 w-10 relative rounded overflow-hidden border border-slate-700/50 shrink-0 cursor-pointer hover:border-[#c8aa6e]/50 transition-all shadow-inner">
                                                            <input
                                                                type="color"
                                                                value={gridConfig.color}
                                                                onChange={(e) => handleConfigChange('color', e.target.value)}
                                                                className="absolute -top-2 -left-2 w-14 h-14 border-none cursor-pointer p-0 opacity-0"
                                                            />
                                                            <div className="w-full h-full" style={{ backgroundColor: gridConfig.color }}></div>
                                                        </div>
                                                        {/* Presets */}
                                                        <div className="flex-1 grid grid-cols-4 gap-2">
                                                            {GRID_LINE_COLOR_PRESETS.map(c => (
                                                                <button
                                                                    key={c}
                                                                    onClick={() => handleConfigChange('color', c)}
                                                                    className={`h-full w-full rounded-sm transition-all ${gridConfig.color === c ? 'ring-2 ring-offset-2 ring-offset-[#0b1120] ring-[#c8aa6e] scale-105' : 'hover:opacity-80 hover:scale-105'}`}
                                                                    style={{ backgroundColor: c }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-[#0b1120] p-4 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Grosor (PX)</span>
                                                        <span className="text-[10px] font-mono text-[#c8aa6e]">{gridConfig.lineWidth}PX</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0.5" max="10" step="0.5"
                                                        value={gridConfig.lineWidth}
                                                        onChange={(e) => handleConfigChange('lineWidth', Number(e.target.value))}
                                                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Opacidad */}
                                            <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                                    <span>Opacidad de Rejilla</span>
                                                    <span className="font-mono text-[#c8aa6e]">{Math.round(gridConfig.opacity * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0" max="1" step="0.05"
                                                    value={gridConfig.opacity}
                                                    onChange={(e) => handleConfigChange('opacity', parseFloat(e.target.value))}
                                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                />
                                            </div>

                                            {/* Tipo de Línea */}
                                            <div className="space-y-3">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] block pl-1">Estilo de Trazo</span>
                                                <div className="bg-[#111827] p-1 rounded border border-slate-800 flex text-[9px] font-bold font-fantasy shadow-inner">
                                                    {['solid', 'dashed', 'dotted'].map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => handleConfigChange('lineType', type)}
                                                            className={`flex-1 py-2.5 rounded transition-all uppercase tracking-widest ${gridConfig.lineType === type ? 'bg-[#c8aa6e] text-[#0b1120] shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                        >
                                                            {type === 'solid' ? 'Sólido' : type === 'dashed' ? 'Guiones' : 'Puntos'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-slate-800/50"></div>

                                        {/* 6. Iluminación / Atmósfera */}
                                        <div className="space-y-4">
                                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-slate-600 shadow-[0_0_10px_currentColor] flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                </div>
                                                Iluminación Global
                                            </h4>

                                            <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Oscuridad Ambiental</span>
                                                    <span className="text-[10px] font-mono text-[#c8aa6e]">{Math.round((gridConfig.ambientDarkness || 0) * 100)}%</span>
                                                </div>

                                                {/* Slider Personalizado */}
                                                <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer group">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1"
                                                        step="0.05"
                                                        value={gridConfig.ambientDarkness || 0}
                                                        onChange={(e) => handleConfigChange('ambientDarkness', parseFloat(e.target.value))}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    {/* Barra de progreso visual */}
                                                    <div
                                                        className="h-full bg-gradient-to-r from-slate-600 to-black transition-all duration-100 ease-out"
                                                        style={{ width: `${(gridConfig.ambientDarkness || 0) * 100}%` }}
                                                    ></div>

                                                    {/* Indicador de posición (Thumb) visual */}
                                                    <div
                                                        className="absolute top-0 h-full w-1 bg-[#c8aa6e] pointer-events-none transition-all duration-100 ease-out shadow-[0_0_10px_#c8aa6e]"
                                                        style={{ left: `${(gridConfig.ambientDarkness || 0) * 100}%`, transform: 'translateX(-50%)' }}
                                                    ></div>
                                                </div>

                                                <p className="text-[9px] text-slate-600 mt-2 leading-relaxed">
                                                    Ajusta la opacidad de la capa de oscuridad ambiental.
                                                </p>
                                            </div>

                                            {/* NIEBLA DE GUERRA (Fog of War) */}
                                            <div className={`bg-[#0b1120] p-4 rounded border transition-all ${gridConfig.fogOfWar ? 'border-[#c8aa6e]/50 shadow-[0_0_20px_rgba(200,170,110,0.1)]' : 'border-slate-800'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                            <Activity size={12} className={gridConfig.fogOfWar ? 'text-[#c8aa6e]' : 'text-slate-500'} />
                                                            Niebla de Guerra
                                                        </span>
                                                        <span className="text-[9px] text-slate-600">Oculta el mapa basado en la visión de los tokens</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleConfigChange('fogOfWar', !gridConfig.fogOfWar)}
                                                        className={`w-12 h-6 rounded-full transition-all relative ${gridConfig.fogOfWar ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gridConfig.fogOfWar ? 'left-7' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
);
