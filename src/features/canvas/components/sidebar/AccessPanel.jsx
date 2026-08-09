import React from 'react';
import { Eye, Lock, ShieldCheck, Users } from 'lucide-react';

export const AccessPanel = ({
    activeScenario,
    activeTab,
    existingPlayers,
    globalActiveId,
    isPlayerView,
    registerLocalScenarioDraft,
    setActiveScenario,
    setGlobalActiveScenario,
}) => (
    activeTab === 'ACCESS' && !isPlayerView && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="space-y-2">
                                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <Users className="w-3 h-3" />
                                                Jugadores Autorizados
                                            </h4>
                                            <p className="text-[10px] text-slate-500 italic">Marca qué jugadores pueden ver este mapa.</p>
                                        </div>

                                        <div className="space-y-2">
                                            {existingPlayers.map(player => {
                                                const hasAccess = activeScenario?.allowedPlayers?.includes(player);
                                                return (
                                                    <div
                                                        key={player}
                                                        onClick={() => {
                                                            const currentAllowed = activeScenario.allowedPlayers || [];
                                                            const nextAllowed = hasAccess
                                                                ? currentAllowed.filter(p => p !== player)
                                                                : [...currentAllowed, player];
                                                            registerLocalScenarioDraft({ allowedPlayers: nextAllowed });
                                                            setActiveScenario(prev => ({ ...prev, allowedPlayers: nextAllowed }));
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded border cursor-pointer transition-all ${hasAccess ? 'bg-[#c8aa6e]/10 border-[#c8aa6e]/50 text-[#f0e6d2]' : 'bg-slate-900/50 border-slate-800 text-slate-500'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-[#c8aa6e] shadow-[0_0_8px_#c8aa6e]' : 'bg-slate-700'}`} />
                                                            <span className="font-fantasy tracking-widest text-sm uppercase">{player}</span>
                                                        </div>
                                                        {hasAccess ? (
                                                            <ShieldCheck className="w-4 h-4 text-[#c8aa6e]" />
                                                        ) : (
                                                            <Lock className="w-4 h-4 opacity-30" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {existingPlayers.length === 0 && (
                                                <div className="p-10 text-center border-2 border-dashed border-slate-800 rounded text-slate-600 text-[10px] uppercase font-bold tracking-widest">
                                                    No hay jugadores detectados
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 rounded border border-[#c8aa6e]/20 bg-[#c8aa6e]/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-3 h-3 text-[#c8aa6e]" />
                                                    <span className="text-[10px] font-bold uppercase text-[#c8aa6e]">Estado Global</span>
                                                </div>
                                                <button
                                                    onClick={() => setGlobalActiveScenario(globalActiveId === activeScenario?.id ? null : activeScenario?.id)}
                                                    className={`px-3 py-1 rounded text-[8px] font-bold uppercase tracking-widest transition-all ${globalActiveId === activeScenario?.id ? 'bg-red-900/20 text-red-500 border border-red-500/30' : 'bg-[#c8aa6e] text-[#0b1120] shadow-lg'}`}
                                                >
                                                    {globalActiveId === activeScenario?.id ? 'Dejar de Emitir' : 'Transmitir Ahora'}
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-slate-400 leading-relaxed uppercase font-bold">
                                                {globalActiveId === activeScenario?.id ? (
                                                    <span className="text-green-500 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                        En transmisión actual
                                                    </span>
                                                ) : (
                                                    <span>Este encuentro está oculto para los jugadores.</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-[8px] text-slate-500 italic text-center uppercase tracking-widest px-4">
                                            Recuerda guardar los cambios para actualizar los permisos de acceso.
                                        </div>
                                    </div>
                                )
);
