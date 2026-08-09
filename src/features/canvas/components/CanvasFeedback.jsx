import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, LayoutGrid, RotateCw, Shield, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CanvasAssetImage, TokenImageWithLoader } from './CanvasAssetImage';

export const CanvasThumbnail = ({ scenario }) => {
    const config = scenario.config || {};
    return (
        <div className="w-32 h-32 bg-[#050810] rounded-lg border border-slate-800 overflow-hidden relative flex items-center justify-center shrink-0 shadow-inner">
            {config.backgroundImage ? (
                <CanvasAssetImage
                    src={config.backgroundImage}
                    label={`${scenario.name || 'Encuentro'} preview`}
                    imageClassName="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80"
                    fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center opacity-20 bg-[#050810]">
                            <LayoutGrid size={40} className="text-[#c8aa6e]" />
                            <span className="text-[8px] font-bold uppercase mt-1 text-[#c8aa6e]">
                                Mapa
                            </span>
                        </div>
                    }
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                    <LayoutGrid size={40} className="text-[#c8aa6e]" />
                    <span className="text-[8px] font-bold uppercase mt-1 text-[#c8aa6e]">
                        {config.isInfinite ? 'INFINITO' : `${config.columns}x${config.rows}`}
                    </span>
                </div>
            )}
        </div>
    );
};

export const panelVariants = {
    initial: { opacity: 0, y: -40, scale: 0.9, filter: 'blur(10px)' },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 30
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.9,
        filter: 'blur(8px)',
        transition: { duration: 0.3 }
    }
};

export const SaveToast = ({ show, type = 'success', message, subMessage }) => {
    // Configuración según el tipo
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isInfo = type === 'info';
    const isWarning = type === 'warning';

    const mainText = message || (isSuccess ? "PROGRESO\nGUARDADO" : isError ? "ERROR AL\nGUARDAR" : "INFORMACIÓN");
    const subText = subMessage || (isSuccess ? "Encuentro Sincronizado" : isError ? "Error de Conexión" : isWarning ? "Acción No Disponible" : "Aviso del Sistema");

    // Clases dinámicas
    const borderColor = isError ? "border-red-500/50" : isWarning ? "border-amber-500/50" : isInfo ? "border-sky-500/50" : "border-[#c8aa6e]/50";
    const titleColor = isError ? "text-red-400" : isWarning ? "text-amber-100" : isInfo ? "text-sky-100" : "text-[#f0e6d2]";
    const subtextColor = isError ? "text-red-400/70" : isWarning ? "text-amber-500" : isInfo ? "text-sky-400" : "text-[#c8aa6e]";
    const iconContainer = isError
        ? "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
        : isWarning
            ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            : isInfo
                ? "border-sky-500 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.2)]"
                : "border-[#c8aa6e] bg-[#c8aa6e]/10 shadow-[0_0_15px_rgba(200,170,110,0.2)]";
    const barColor = isError ? "bg-red-500/50" : isWarning ? "bg-amber-500/50" : isInfo ? "bg-sky-500/50" : "bg-[#c8aa6e]/50";

    return (
        <div className="fixed top-12 left-1/2 z-[1000] -translate-x-1/2 pointer-events-none">
            <AnimatePresence>
                {show && (
                    <motion.div
                        variants={panelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={`relative bg-[#0b1120]/80 backdrop-blur-xl border ${borderColor} px-10 py-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-w-[400px] flex items-center gap-6 rounded-2xl overflow-hidden`}
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />

                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${iconContainer}`}>
                            {isError ? <X className="w-6 h-6 text-red-500" /> : isWarning ? <AlertTriangle className="w-6 h-6 text-amber-500" /> : isInfo ? <Shield className="w-6 h-6 text-sky-500" /> : <Check className="w-6 h-6 text-[#c8aa6e]" />}
                        </div>

                        {/* Text */}
                        <div className="flex flex-col relative z-10">
                            <h3 className={`${titleColor} font-fantasy text-2xl leading-none tracking-[0.1em] text-left mb-1.5 whitespace-pre-line uppercase drop-shadow-sm`}>
                                {mainText}
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className={`h-[1px] w-8 ${barColor}`}></div>
                                <span className={`${subtextColor} text-[10px] font-bold uppercase tracking-[0.25em]`}>{subText}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// =============================================================================
// SpeedTimeline  Minimal horizontal initiative tracker based on SPEED
// Aesthetic: Matches the dark-fantasy gold/slate palette of the canvas UI
// =============================================================================
export const SpeedTimeline = ({ tokens, selectedId, onSelect, isPlayerView, onReset, mode = 'speed' }) => {
    const isInitiativeMode = mode === 'initiative';
    const scrollRef = useRef(null);
    const dragStateRef = useRef(null);
    const suppressClickRef = useRef(false);
    const [hiddenCount, setHiddenCount] = useState(0);
    const [hasTimelineOverflow, setHasTimelineOverflow] = useState(false);
    const maxTimelineScrollRef = useRef(0);
    const getTimelineValue = (token) => (
        isInitiativeMode
            ? Math.max(0, Number(token.initiative) || 0)
            : Math.max(0, Number(token.velocidad) || 0)
    );
    const getTimelineSideRank = (token) => (
        token.timelineSide === 'master' ? 0 : 1
    );
    const sortedTokens = useMemo(() => {
        return [...tokens].sort((a, b) => {
            const valueDelta = isInitiativeMode
                ? getTimelineValue(b) - getTimelineValue(a)
                : getTimelineValue(a) - getTimelineValue(b);
            if (valueDelta !== 0) return valueDelta;
            return getTimelineSideRank(a) - getTimelineSideRank(b);
        });
    }, [tokens, isInitiativeMode]);

    const updateHiddenCount = useCallback(() => {
        const element = scrollRef.current;
        if (!element) {
            setHiddenCount(0);
            return;
        }

        const tokenEntries = Array.from(element.querySelectorAll('[data-timeline-token="true"]'));
        const lastToken = tokenEntries[tokenEntries.length - 1];
        const lastTokenRight = lastToken ? lastToken.offsetLeft + lastToken.offsetWidth + 4 : 0;
        const maxUsefulScroll = Math.max(0, lastTokenRight - element.clientWidth);
        maxTimelineScrollRef.current = maxUsefulScroll;

        if (element.scrollLeft > maxUsefulScroll + 1) {
            element.scrollLeft = maxUsefulScroll;
        }

        const hasOverflow = maxUsefulScroll > 1;
        setHasTimelineOverflow(hasOverflow);
        if (!hasOverflow) {
            setHiddenCount(0);
            if (element.scrollLeft !== 0) element.scrollLeft = 0;
            return;
        }

        const containerRect = element.getBoundingClientRect();
        const hiddenTokens = tokenEntries.filter((entry) => (
            entry.getBoundingClientRect().left >= containerRect.right - 2
        ));
        setHiddenCount(hiddenTokens.length);
    }, []);

    useEffect(() => {
        updateHiddenCount();
        const element = scrollRef.current;
        if (!element) return undefined;

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(updateHiddenCount)
            : null;
        resizeObserver?.observe(element);

        window.addEventListener('resize', updateHiddenCount);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updateHiddenCount);
        };
    }, [sortedTokens.length, updateHiddenCount]);

    const handleTimelinePointerDown = (event) => {
        const element = scrollRef.current;
        if (!element || !hasTimelineOverflow || maxTimelineScrollRef.current <= 1) return;

        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            scrollLeft: element.scrollLeft,
            moved: false,
        };
        element.setPointerCapture?.(event.pointerId);
    };

    const handleTimelinePointerMove = (event) => {
        const dragState = dragStateRef.current;
        const element = scrollRef.current;
        if (!dragState || !element || dragState.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - dragState.startX;
        if (Math.abs(deltaX) > 4) {
            dragState.moved = true;
            event.preventDefault();
        }

        element.scrollLeft = dragState.scrollLeft - deltaX;
        if (element.scrollLeft > maxTimelineScrollRef.current) {
            element.scrollLeft = maxTimelineScrollRef.current;
        }
        updateHiddenCount();
    };

    const handleTimelinePointerEnd = (event) => {
        const dragState = dragStateRef.current;
        const element = scrollRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        element?.releasePointerCapture?.(event.pointerId);
        if (dragState.moved) {
            suppressClickRef.current = true;
            window.setTimeout(() => {
                suppressClickRef.current = false;
            }, 0);
        }
        dragStateRef.current = null;
        updateHiddenCount();
    };

    const handleTimelineTokenClick = (event, tokenId) => {
        if (suppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        onSelect(tokenId);
    };

    if (sortedTokens.length === 0) return null;

    const activeValue = getTimelineValue(sortedTokens[0]);
    const hasMasterAtActiveValue = sortedTokens.some(token => getTimelineValue(token) === activeValue && token.timelineSide === 'master');
    const activeMasterId = hasMasterAtActiveValue
        ? sortedTokens.find(token => getTimelineValue(token) === activeValue && token.timelineSide === 'master')?.id
        : null;

    return (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[45] pointer-events-none flex flex-col items-center gap-1.5">
            {/* Main pill */}
            <div
                className="relative flex items-center gap-0.5 bg-[#0b1120]/80 backdrop-blur-sm border border-[#c8aa6e]/20 shadow-[0_0_15px_rgba(200,170,110,0.2)] ring-1 ring-[#c8aa6e]/10 rounded-lg px-1.5 py-1 pointer-events-auto"
                style={{ maxWidth: 'min(85vw, 500px, calc(100vw - 9.5rem))' }}
            >
                <div
                    ref={scrollRef}
                    className={`flex min-w-0 max-w-full items-center gap-0.5 px-1 py-1 -mx-1 -my-1 scrollbar-hide select-none ${hasTimelineOverflow ? 'overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing' : 'overflow-visible cursor-default'}`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: hasTimelineOverflow ? 'pan-x' : 'auto' }}
                    onScroll={updateHiddenCount}
                    onPointerDown={handleTimelinePointerDown}
                    onPointerMove={handleTimelinePointerMove}
                    onPointerUp={handleTimelinePointerEnd}
                    onPointerCancel={handleTimelinePointerEnd}
                >
                    <AnimatePresence>
                        {sortedTokens.map((token, idx) => {
                            const value = getTimelineValue(token);
                            const isNext = isInitiativeMode
                                ? (hasMasterAtActiveValue ? token.id === activeMasterId : value === activeValue)
                                : (value === activeValue && (!hasMasterAtActiveValue || token.timelineSide === 'master'));
                            const isSelectedToken = selectedId === token.id;
                            return (
                                <motion.div
                                    layout
                                    key={token.id}
                                    className="flex items-center shrink-0"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 8 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                >
                                    <div
                                        data-timeline-token="true"
                                        onClick={(event) => handleTimelineTokenClick(event, token.id)}
                                        className="relative group cursor-pointer"
                                    >
                                        {/* Portrait ring */}
                                        <TokenImageWithLoader
                                            src={token.portrait || token.img}
                                            label={token.name || 'Token'}
                                            className={`
                                            w-7 h-7 md:w-8 md:h-8 rounded-full transition-all duration-200
                                            ${isNext
                                                ? 'ring-[1.5px] ring-[#c8aa6e] shadow-[0_0_8px_rgba(200,170,110,0.25)]'
                                                : 'ring-1 ring-slate-700/60 opacity-60 grayscale-[30%]'
                                            }
                                            ${isSelectedToken ? 'ring-white/80 opacity-100 grayscale-0 scale-105' : ''}
                                        `}
                                            imageClassName="w-full h-full object-cover"
                                        />

                                        {/* Speed counter  small badge bottom-right */}
                                        <div className={`
                                            absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center
                                            rounded-full text-[7px] font-bold leading-none px-[3px]
                                            ${isNext
                                                ? 'bg-[#c8aa6e] text-[#0b1120] shadow-[0_0_4px_rgba(200,170,110,0.4)]'
                                                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                                            }
                                        `}>
                                            {value}
                                        </div>

                                        {/* Active indicator */}
                                        {isNext && idx === 0 && (
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c8aa6e] shadow-[0_0_4px_#c8aa6e]" />
                                        )}

                                        {/* Tooltip */}
                                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0b1120] border border-slate-800 rounded px-1.5 py-0.5 text-[8px] text-slate-300 whitespace-nowrap z-[110] pointer-events-none font-bold tracking-wider uppercase">
                                            {token.name} · {isInitiativeMode ? `${value} iniciativa` : `${value}🟡`}
                                        </div>
                                    </div>

                                    {/* Connector line */}
                                    {idx < sortedTokens.length - 1 && (
                                        <div className="mx-0.5 w-2 md:w-3 h-px bg-slate-700/20" />
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {hasTimelineOverflow && (
                    <div className={`pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 rounded-full border border-[#c8aa6e]/30 bg-[#0b1120]/95 px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#c8aa6e] shadow-[0_0_8px_rgba(0,0,0,0.45)] transition-opacity duration-200 ${hiddenCount > 0 ? 'opacity-100' : 'opacity-0'}`}>
                        +{hiddenCount}
                    </div>
                )}

                {/* Reset button  inline, icon-only for master */}
                {!isPlayerView && !isInitiativeMode && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onReset(); }}
                        className="ml-1 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        title="Reiniciar Velocidad Global"
                    >
                        <RotateCw size={10} />
                    </button>
                )}
            </div>
        </div>
    );
};
