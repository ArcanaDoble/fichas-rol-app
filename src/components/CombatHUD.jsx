import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Footprints, Shield, Hand, Hourglass, Backpack, Sparkles, ChevronUp, ChevronDown, Lock, X } from 'lucide-react';

const CombatHUD = ({
    token,
    onAction,
    onEndTurn,
    onPortraitClick,
    canOpenSheet = true,
    isActive = true, // Si es el turno del jugador o no (visual)
    pendingCost = 0, // Coste acumulado en este turno no confirmado
    pendingActions = [], // Array de nombres de acciones pendientes
    onCancelAction // Función para cancelar una acción pendiente
}) => {
    const [activeCategory, setActiveCategory] = useState('ACCIONES'); // ACCIONES | CLASE | OBJETOS
    const [selectedActionId, setSelectedActionId] = useState(null); // Para submenús (ej: elegir arma)
    const [isEndingTurn, setIsEndingTurn] = useState(false);
    const endTurnTimerRef = useRef(null);

    // Mobile end-turn: hold-to-confirm pattern
    // Press down → animation starts + timer begins
    // Release before timer → cancel (player changed their mind)
    // Hold until timer fires → vibrate + end turn
    const handleEndTurnPressStart = useCallback(() => {
        if (isEndingTurn || !onEndTurn) return;
        setIsEndingTurn(true);

        endTurnTimerRef.current = setTimeout(() => {
            // Haptic feedback on supported mobile devices
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            onEndTurn();
            endTurnTimerRef.current = null;
            setIsEndingTurn(false);
        }, 600); // 600ms — synced with the 700ms CSS rotation
    }, [isEndingTurn, onEndTurn]);

    const handleEndTurnPressEnd = useCallback(() => {
        // If timer hasn't fired yet, cancel everything
        if (endTurnTimerRef.current) {
            clearTimeout(endTurnTimerRef.current);
            endTurnTimerRef.current = null;
        }
        setIsEndingTurn(false);
    }, []);

    if (!token) return null;

    // Obtener opciones de ataque (Armas + Habilidades Ofensivas)
    const items = Array.isArray(token.equippedItems) ? token.equippedItems : [];
    const attackOptions = items.filter(i =>
        i.type === 'weapon' ||
        i.type === 'ability' ||
        (i._category === 'abilities' && (i.damage || i.dano))
    );

    const handleActionClick = (actionId) => {
        if (!isActive || !onAction) return;

        if (actionId === 'attack') {
            // Lógica de selección de arma/habilidad
            if (attackOptions.length > 1) {
                // Si hay más de 1 opción, abrimos selector
                if (selectedActionId === 'attack') {
                    setSelectedActionId(null); // Toggle off
                } else {
                    setSelectedActionId('attack');
                }
            } else if (attackOptions.length === 1) {
                // Solo 1 opción, acción directa
                onAction('attack', attackOptions[0]);
                setSelectedActionId(null);
            } else {
                // Sin armas (desarmado o genérico)
                onAction('attack', null);
                setSelectedActionId(null);
            }
        } else {
            if (actionId === 'dash') return; // Temporarily disable Dash
            // Otras acciones (Dodge, Help) son directas
            onAction(actionId);
            setSelectedActionId(null);
        }
    };

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

    const panelVariants = {
        initial: {
            opacity: 0,
            y: 30,
            scale: 0.98,
            filter: 'blur(8px)',
            height: 0
        },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            height: 'auto',
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 1
            }
        },
        exit: {
            opacity: 0,
            y: -5,
            scale: 0.96,
            filter: 'blur(3px)',
            height: 0,
            transition: {
                duration: 0.25,
                ease: [0.4, 0, 0.2, 1]
            }
        }
    };

    // Animación ultra-suave para acciones pendientes: solo opacidad y escala, sin desplazamiento vertical
    const pendingActionVariants = {
        initial: { opacity: 0, scale: 0.92 },
        animate: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.25, ease: [0.4, 0, 1, 1] }
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
            <style>{`
                @keyframes menuReveal {
                    0% { 
                        opacity: 0; 
                        transform: translateY(30px) scale(0.98);
                        filter: blur(8px);
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateY(8px) scale(1);
                        filter: blur(0);
                    }
                }
                @media (min-width: 768px) {
                    @keyframes menuReveal {
                        0% { 
                            opacity: 0; 
                            transform: translateY(30px) scale(0.98);
                            filter: blur(8px);
                        }
                        100% { 
                            opacity: 1; 
                            transform: translateY(1px) scale(1);
                            filter: blur(0);
                        }
                    }
                }
                .animate-menu-reveal {
                    animation: menuReveal 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
            `}</style>



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
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 border text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg whitespace-nowrap z-30 transition-all flex items-center gap-2 ${canOpenSheet ? 'bg-[#0b1120] border-[#c8aa6e] text-[#c8aa6e]' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                        <span>{token.name}</span>
                        {pendingCost > 0 && (
                            <span className="text-red-500 animate-pulse">
                                +{pendingCost}🟡
                            </span>
                        )}
                    </div>

                    {!canOpenSheet && (
                        <div className="absolute bottom-full mb-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-slate-400 text-[9px] px-2 py-1 rounded uppercase tracking-tighter whitespace-nowrap pointer-events-none">
                            Ficha no vinculada
                        </div>
                    )}
                </div>

                {/* 2. BARRA DE ACCIONES (Centro) */}
                <div className={`flex-1 mx-2 md:mx-4 flex flex-col justify-end w-full transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40 grayscale-[0.5] pointer-events-none md:pointer-events-auto'}`}>

                    {/* Pestañas (Desktop) / Toggle (Mobile) */}
                    <div className="flex justify-center mb-0 relative z-10 w-full">

                        {/* ---------------------------------------------------------- */}
                        {/*                     VERSIÓN UNIFICADA                      */}
                        {/* ---------------------------------------------------------- */}
                        <div className="absolute bottom-[calc(100%-4px)] md:bottom-full flex flex-col-reverse items-center w-full pointer-events-none gap-2 md:gap-[10px] z-0">

                            {/* 1. Selector de Ataque (Unificado) */}
                            <AnimatePresence>
                                {selectedActionId === 'attack' && attackOptions.length > 1 && (
                                    <motion.div
                                        key="attack-selector"
                                        variants={panelVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="relative pointer-events-auto translate-y-[12px] md:translate-y-[1px] focus:outline-none overflow-hidden"
                                    >
                                        <div className="w-[200px] md:w-80 bg-[#0b1120]/98 backdrop-blur-3xl border-t-2 border-x-2 border-[#c8aa6e] border-b-0 rounded-t-2xl overflow-hidden flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                                            <div className="bg-[#c8aa6e] px-3 py-2 md:px-4 md:py-3 flex justify-between items-center shrink-0 shadow-lg">
                                                <div className="flex items-center gap-2">
                                                    <Sword size={14} className="text-[#0b1120]" />
                                                    <span className="text-[#0b1120] text-[10px] md:text-[11px] font-black uppercase tracking-widest">
                                                        Selecciona Ataque
                                                    </span>
                                                </div>
                                                <button onClick={() => setSelectedActionId(null)} className="text-[#0b1120]/60 hover:text-[#0b1120] p-1 transition-colors">
                                                    <X size={16} className="md:w-[18px] md:h-[18px]" />
                                                </button>
                                            </div>
                                            <div className="p-1.5 md:p-2 pb-3 md:pb-4 flex flex-col gap-1.5 md:gap-2 max-h-[300px] md:max-h-[460px] overflow-y-auto custom-scrollbar bg-black/40 border-b border-[#c8aa6e]/20">
                                                {attackOptions.map((item, idx) => {
                                                    const getRarityHeaderColor = (rareza = '') => {
                                                        const r = rareza.toLowerCase();
                                                        if (r.includes('legendari')) return 'text-orange-400';
                                                        if (r.includes('épic') || r.includes('epic')) return 'text-purple-400';
                                                        if (r.includes('rar')) return 'text-blue-400';
                                                        if (r.includes('poco com')) return 'text-green-400';
                                                        return 'text-[#f0e6d2]';
                                                    };
                                                    const getItemImage = (i) => {
                                                        if (i.img || i.icon) return i.img || i.icon;
                                                        const name = (i.name || i.nombre || '').toLowerCase();
                                                        if (name.includes('fauces')) return '/armas/fauces.png';
                                                        if (name.includes('garras')) return '/armas/garras.png';
                                                        if (name.includes('hacha')) return '/armas/hacha_de_guerra.png';
                                                        if (name.includes('alabarda')) return '/armas/alabarda.png';
                                                        if (name.includes('espada')) return '/armas/espada_de_acero.png';
                                                        if (name.includes('daga')) return '/armas/daga.png';
                                                        if (name.includes('arco')) return '/armas/arco_corto.png';
                                                        return null;
                                                    };
                                                    const itemImg = getItemImage(item);
                                                    const nameColorClass = getRarityHeaderColor(item.rareza || '');
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                onAction('attack', item);
                                                                setSelectedActionId(null);
                                                            }}
                                                            className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl hover:bg-[#c8aa6e]/10 transition-all text-left group/item border border-white/5 hover:border-[#c8aa6e]/30 shadow-lg"
                                                        >
                                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg border ${item.type === 'ability' ? 'border-purple-500/50 bg-purple-900/40' : 'border-slate-700 bg-black/60'} flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner`}>
                                                                {itemImg ? (
                                                                    <img src={itemImg} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" />
                                                                ) : (
                                                                    item.type === 'ability' ? <Sparkles size={16} className="text-purple-400 md:w-5 md:h-5" /> : <Sword size={16} className="text-slate-600 md:w-5 md:h-5" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <span className={`text-xs md:text-[13px] font-bold truncate mb-0.5 md:mb-1 ${nameColorClass}`}>
                                                                    {item.name || item.nombre}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 md:gap-2">
                                                                    <span className="text-[8px] whitespace-nowrap md:text-[10px] text-yellow-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 font-bold">
                                                                        {item.velocidad || item.vel || 2}🟡
                                                                    </span>
                                                                    {(item.damage || item.dano) && (
                                                                        <span className="text-[8px] whitespace-nowrap md:text-[10px] text-red-400 font-bold bg-red-950/30 px-1.5 py-0.5 rounded border border-red-500/10">
                                                                            {item.damage || item.dano}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ChevronUp className="rotate-90 text-[#c8aa6e]/40 group-hover/item:text-[#c8aa6e] transition-colors w-3 h-3 md:w-4 md:h-4" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* 2. Notificaciones Pendientes (Unificado) */}
                            <div
                                className={`flex flex-col-reverse items-center gap-2 pointer-events-auto w-[200px] md:w-full max-w-sm px-0 md:px-4 transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${selectedActionId === 'attack' ? 'mb-0' : 'mb-2.5 md:mb-4'}`}
                            >
                                <AnimatePresence>
                                    {pendingActions.map((action, index) => (
                                        <motion.div
                                            key={action.id || index}
                                            variants={pendingActionVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            className="flex items-center justify-between gap-3 bg-black/80 backdrop-blur-md border border-red-500/50 text-red-100 px-4 py-3 rounded-xl shadow-2xl w-full origin-bottom"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-red-50">{action.name || action}</span>
                                                <span className="text-xs text-red-300">Coste: +{action.cost || '?'} 🟡</span>
                                            </div>
                                            <button
                                                onClick={() => onCancelAction && onCancelAction(index)}
                                                className="bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white rounded-full p-2 transition-all active:scale-95"
                                                title="Cancelar Acción"
                                            >
                                                <X size={16} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>



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

                    {/* Contenedor de Botones - Sin overflow-hidden para evitar recortes */}
                    <div className={`w-full bg-[#0b1120]/95 backdrop-blur-xl border rounded-xl md:rounded-2xl p-1.5 md:p-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative min-h-[76px] md:min-h-[128px] flex flex-col justify-center transition-colors duration-500 ${isActive ? 'border-[#c8aa6e]/50' : 'border-slate-800'}`}>
                        {/* Decoración de fondo */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#c8aa6e]/5 to-transparent pointer-events-none rounded-xl md:rounded-2xl"></div>

                        <div
                            className="flex items-stretch gap-1.5 md:gap-4 md:justify-center overflow-x-auto overflow-y-visible scrollbar-hide h-16 md:h-24 max-w-0 min-w-full"
                            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                        >
                            <style>{`
                                .scrollbar-hide::-webkit-scrollbar { display: none; }
                                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                                .custom-scrollbar::-webkit-scrollbar-thumb { background: #c8aa6e; border-radius: 10px; }
                            `}</style>

                            {activeCategory === 'ACCIONES' && actions.map(action => (
                                <div key={action.id} className="relative group shrink-0">
                                    <button
                                        onClick={() => handleActionClick(action.id)}
                                        className={`relative flex flex-col items-center justify-center h-16 w-24 md:w-32 md:h-24 bg-[#161f32] border rounded-lg transition-all ${action.id === 'dash'
                                            ? 'opacity-40 grayscale cursor-not-allowed border-slate-800' // Style for disabled Dash
                                            : isActive
                                                ? (selectedActionId === action.id ? 'border-[#c8aa6e] bg-[#c8aa6e]/20 shadow-[0_0_15px_rgba(200,170,110,0.3)]' : 'border-slate-700/50 hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 active:scale-95')
                                                : 'cursor-not-allowed opacity-50 border-slate-700/50'
                                            }`}
                                    >
                                        <action.icon className={`w-[18px] h-[18px] md:w-8 md:h-8 mb-1 md:mb-2 transition-colors ${isActive ? 'text-slate-400 group-hover:text-[#c8aa6e]' : 'text-slate-600'}`} />
                                        <div className="flex flex-col items-center">
                                            <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-slate-400 group-hover:text-[#f0e6d2]' : 'text-slate-600'}`}>
                                                {action.label}
                                            </span>
                                            {/* Indicador de armas múltiples */}

                                        </div>

                                        {/* Tooltip Hover Effect */}
                                        {isActive && !selectedActionId && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:group-hover:block w-48 bg-black/90 text-[#f0e6d2] text-[10px] p-2 rounded border border-[#c8aa6e]/30 shadow-2xl z-50 text-center pointer-events-none uppercase">
                                                {action.description}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            ))}

                            {activeCategory !== 'ACCIONES' && (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px] md:text-xs italic px-8 uppercase tracking-widest">
                                    Módulo de {activeCategory} próximamente...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. BOTÓN FIN TURNO (Derecha - Desktop) */}
                <div className={`hidden md:flex flex-col items-center justify-end relative z-20 shrink-0 h-32 w-32 group transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-20 scale-90 pointer-events-none'}`}>
                    <button
                        onClick={onEndTurn}
                        className="w-32 h-32 rounded-full bg-[#0b1120] border-4 border-[#c8aa6e] hover:border-[#f0e6d2] hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(200,170,110,0.2)] flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden group/btn"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1b26] to-[#0b1120] pointer-events-none"></div>
                        <div className="absolute inset-0 bg-radial-gradient from-red-600/10 via-transparent to-transparent group-hover:from-red-600/30 transition-all duration-500"></div>
                        <div className="absolute inset-0 ring-inset ring-2 ring-black/40 rounded-full pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <Hourglass className="w-12 h-12 text-[#c8aa6e] group-hover:text-red-400 mb-1 transition-all duration-700 ease-in-out group-hover:rotate-[180deg]" />
                            <span className="text-[10px] md:text-xs font-black text-[#c8aa6e] group-hover:text-[#f0e6d2] uppercase tracking-[0.2em] leading-none text-center transition-colors">
                                Fin<br />Turno
                            </span>
                        </div>

                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                            <div className="absolute top-0 -left-[150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-[35deg] group-hover:left-[150%] transition-all duration-1000 ease-in-out"></div>
                        </div>
                    </button>

                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0b1120] border border-[#c8aa6e] text-[#c8aa6e] text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg whitespace-nowrap z-30 transition-all group-hover:bg-red-950 group-hover:text-red-400 group-hover:border-red-500 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        Pasar Turno
                    </div>
                </div>
            </div>

            {/* --- MOBILE OVERLAYS --- */}
            <div
                className={`md:hidden absolute bottom-32 left-4 pointer-events-auto ${canOpenSheet ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => onPortraitClick && onPortraitClick(token.name)}
            >
                <div className={`w-14 h-14 rounded-full border-2 bg-[#0b1120] overflow-hidden shadow-lg transition-all duration-200 ${canOpenSheet
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
                {pendingCost > 0 && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 border border-white/20 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg animate-pulse whitespace-nowrap">
                        +{pendingCost}🟡
                    </div>
                )}
            </div>

            <div className={`md:hidden absolute bottom-32 right-4 pointer-events-auto transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
                <button
                    onTouchStart={handleEndTurnPressStart}
                    onTouchEnd={handleEndTurnPressEnd}
                    onTouchCancel={handleEndTurnPressEnd}
                    onPointerDown={handleEndTurnPressStart}
                    onPointerUp={handleEndTurnPressEnd}
                    onPointerLeave={handleEndTurnPressEnd}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`group w-14 h-14 rounded-full border-2 bg-[#7f1d1d] flex items-center justify-center transition-all overflow-hidden relative touch-manipulation select-none ${isEndingTurn
                        ? 'border-red-400 scale-95 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
                        : 'border-[#c8aa6e] shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        }`}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                    <Hourglass className={`w-6 h-6 text-[#fca5a5] transition-transform duration-700 ease-in-out ${isEndingTurn ? 'rotate-[180deg]' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export default CombatHUD;
