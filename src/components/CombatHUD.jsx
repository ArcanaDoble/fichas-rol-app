import React, { useState } from 'react';
import { Sword, Footprints, Shield, Hand, Hourglass, Backpack, Sparkles, ChevronUp, ChevronDown, Lock } from 'lucide-react';

const CombatHUD = ({
    token,
    onAction,
    onEndTurn,
    onPortraitClick,
    canOpenSheet = true,
    isActive = true // Si es el turno del jugador o no (visual)
}) => {
    const [activeCategory, setActiveCategory] = useState('ACCIONES'); // ACCIONES | CLASE | OBJETOS
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);

    if (!token) return null;

    const categories = [
        { id: 'ACCIONES', label: 'Acciones' },
        { id: 'CLASE', label: 'Clase' },
        { id: 'OBJETOS', label: 'Objetos' }
    ];

    const actions = [
        { id: 'attack', label: 'Atacar', icon: Sword, description: 'Realizar un ataque con tu arma principal.' },
        { id: 'dash', label: 'Correr', icon: Footprints, description: 'Dobla tu movimiento por este turno.' },
        { id: 'dodge', label: 'Esquivar', icon: Shield, description: 'Impón desventaja en ataques contra ti.' },
        { id: 'help', label: 'Ayudar', icon: Hand, description: 'Otorga ventaja a un aliado.' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">

            {/* --- PANEL PRINCIPAL --- */}
            <div className="w-full max-w-5xl mx-auto flex items-end justify-between px-2 md:px-8 pb-2 md:pb-6 pointer-events-auto relative">

                {/* 1. RETRATO (Izquierda - Desktop Only) */}
                <div
                    className={`relative z-20 hidden md:flex flex-col items-center justify-end h-32 w-32 group ${canOpenSheet ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => onPortraitClick && onPortraitClick(token.name)}
                >
                    <div className={`w-32 h-32 rounded-full border-4 bg-[#0b1120] overflow-hidden relative shrink-0 transition-all duration-300 ${canOpenSheet
                        ? 'border-[#c8aa6e] shadow-[0_0_20px_rgba(200,170,110,0.3)] group-hover:shadow-[0_0_30px_rgba(200,170,110,0.5)] group-hover:border-[#f0e6d2] group-active:scale-95'
                        : 'border-slate-700 opacity-60 grayscale'
                        }`}>
                        <img src={token.portrait || token.img} alt={token.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 ring-inset ring-2 ring-black/20 rounded-full"></div>
                        {canOpenSheet && <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 rounded-full"></div>}

                        {/* Indicador de "No vinculado" */}
                        {!canOpenSheet && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Lock className="w-8 h-8 text-slate-500 opacity-50" />
                            </div>
                        )}
                    </div>
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 border text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg whitespace-nowrap z-30 transition-colors ${canOpenSheet ? 'bg-[#0b1120] border-[#c8aa6e] text-[#c8aa6e]' : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}>
                        {token.name}
                    </div>

                    {!canOpenSheet && (
                        <div className="absolute bottom-full mb-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-slate-400 text-[9px] px-2 py-1 rounded uppercase tracking-tighter whitespace-nowrap pointer-events-none">
                            Ficha no vinculada
                        </div>
                    )}
                </div>

                {/* 2. BARRA DE ACCIONES (Centro) */}
                <div className="flex-1 mx-2 md:mx-4 flex flex-col justify-end w-full">

                    {/* Pestañas (Desktop) / Toggle (Mobile) */}
                    <div className="flex justify-center mb-0 relative z-10">
                        <div className="flex items-center bg-[#0b1120]/90 backdrop-blur-md border border-[#c8aa6e]/30 rounded-t-xl overflow-hidden shadow-lg transform translate-y-[1px]">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3 md:px-8 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeCategory === cat.id
                                        ? 'bg-[#c8aa6e] text-[#0b1120]'
                                        : 'text-[#c8aa6e] hover:bg-[#c8aa6e]/10'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contenedor de Botones */}
                    <div className="w-full bg-[#0b1120]/95 backdrop-blur-xl border border-[#c8aa6e]/50 rounded-xl md:rounded-2xl p-1.5 md:p-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden min-h-[76px] md:min-h-[128px] flex flex-col justify-center">
                        {/* Decoración de fondo */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#c8aa6e]/5 to-transparent pointer-events-none"></div>

                        <div
                            className="flex items-stretch gap-1.5 md:gap-4 md:justify-center overflow-x-auto scrollbar-hide h-16 md:h-24 w-full"
                            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                        >
                            <style>{`
                                .scrollbar-hide::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>
                            {activeCategory === 'ACCIONES' && actions.map(action => (
                                <button
                                    key={action.id}
                                    onClick={() => onAction && onAction(action.id)}
                                    className="group relative flex flex-col items-center justify-center flex-1 h-16 md:flex-none md:w-32 md:h-24 bg-[#161f32] border border-slate-700/50 hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 rounded-lg transition-all active:scale-95"
                                >
                                    <action.icon className="w-[18px] h-[18px] md:w-8 md:h-8 text-slate-400 group-hover:text-[#c8aa6e] mb-1 md:mb-2 transition-colors" />
                                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 group-hover:text-[#f0e6d2] uppercase tracking-wider transition-colors">
                                        {action.label}
                                    </span>

                                    {/* Tooltip Hover Effect (Solo MD+) */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:group-hover:block w-48 bg-black/90 text-[#f0e6d2] text-xs p-2 rounded border border-[#c8aa6e]/30 pointer-events-none z-50 text-center">
                                        {action.description}
                                    </div>
                                </button>
                            ))}

                            {activeCategory !== 'ACCIONES' && (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px] md:text-xs italic px-8 uppercase tracking-widest">
                                    {activeCategory} próximamente...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. BOTÓN FIN TURNO (Derecha - Desktop) */}
                <div className="hidden md:flex flex-col items-center justify-end relative z-20 shrink-0 h-32 w-32 group">
                    <button
                        onClick={onEndTurn}
                        className="w-32 h-32 rounded-full bg-[#0b1120] border-4 border-[#c8aa6e] hover:border-[#f0e6d2] hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(200,170,110,0.2)] flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden group/btn"
                    >
                        {/* Fondo con textura y brillo rojo central sutil */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1b26] to-[#0b1120] pointer-events-none"></div>
                        <div className="absolute inset-0 bg-radial-gradient from-red-600/10 via-transparent to-transparent group-hover:from-red-600/30 transition-all duration-500"></div>

                        {/* Anillo de profundidad igual al retrato */}
                        <div className="absolute inset-0 ring-inset ring-2 ring-black/40 rounded-full pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <Hourglass className="w-12 h-12 text-[#c8aa6e] group-hover:text-red-400 mb-1 transition-all duration-700 ease-in-out group-hover:rotate-[180deg]" />
                            <span className="text-[10px] md:text-xs font-black text-[#c8aa6e] group-hover:text-[#f0e6d2] uppercase tracking-[0.2em] leading-none text-center transition-colors">
                                Fin<br />Turno
                            </span>
                        </div>

                        {/* Reflejo metálico suave mejorado */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                            <div className="absolute top-0 -left-[150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-[35deg] group-hover:left-[150%] transition-all duration-1000 ease-in-out"></div>
                        </div>
                    </button>

                    {/* Tag inferior simétrico al del nombre en el retrato */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0b1120] border border-[#c8aa6e] text-[#c8aa6e] text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg whitespace-nowrap z-30 transition-all group-hover:bg-red-950 group-hover:text-red-400 group-hover:border-red-500 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        Pasar Turno
                    </div>
                </div>

            </div>

            {/* --- MOBILE OVERLAYS (Flotantes sobre el HUD) --- */}

            {/* 1. Retrato Móvil (Izquierda) */}
            <div
                className={`md:hidden absolute bottom-32 left-4 pointer-events-auto ${canOpenSheet ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => onPortraitClick && onPortraitClick(token.name)}
            >
                <div className={`w-12 h-12 rounded-full border-2 bg-[#0b1120] overflow-hidden shadow-lg transition-all duration-200 ${canOpenSheet
                    ? 'border-[#c8aa6e] active:scale-90 hover:border-[#f0e6d2] hover:shadow-[0_0_15px_rgba(200,170,110,0.4)]'
                    : 'border-slate-700 grayscale opacity-60'
                    }`}>
                    <img src={token.portrait || token.img} alt={token.name} className="w-full h-full object-cover" />
                    {!canOpenSheet && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Lock className="w-3 h-3 text-slate-500" />
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Botón Fin Turno Móvil (Derecha - Simétrico al retrato) */}
            <div className="md:hidden absolute bottom-32 right-4 pointer-events-auto">
                <button
                    onClick={onEndTurn}
                    className="group w-12 h-12 rounded-full border-2 border-[#c8aa6e] bg-[#7f1d1d] flex items-center justify-center shadow-lg active:scale-90 transition-all overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                    <Hourglass className="w-5 h-5 text-[#fca5a5] transition-transform duration-700 ease-in-out group-active:rotate-[180deg]" />
                </button>
            </div>

        </div>
    );
};

export default CombatHUD;
