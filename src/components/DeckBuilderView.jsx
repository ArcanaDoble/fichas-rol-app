import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiPlus, 
    FiTrash2, 
    FiEdit2, 
    FiArrowLeft, 
    FiX, 
    FiSearch, 
    FiCheck, 
    FiLayers
} from 'react-icons/fi';
import { 
    Sword, 
    Shield, 
    Sparkles, 
    Skull, 
    Heart,
    Flame,
    RefreshCw,
    Trash2,
    Database,
    Eye,
    EyeOff,
    LockKeyhole,
    Users,
    Download,
    FolderOpen,
    FolderOutput,
    FolderPlus,
    FolderX,
    ArrowLeftRight,
    ScanEye
} from 'lucide-react';
import { db } from '../firebase';
import Boton from './Boton';
import { uploadFile } from '../utils/storage';
import sanitize from '../utils/sanitize';
import {
    ATTRIBUTE_CARD_TYPES,
    UNCLASSIFIED_ATTRIBUTE_TYPE,
    groupAttributeCards as buildAttributeCardGroups,
    getGroupedCardIds,
    moveCardToGroup,
    normalizeAttributeCardType,
    normalizeCardGroups,
    removeCardGroup,
    resolveAttributeCardType,
    swapCardGroupsById
} from '../utils/deckCardGrouping';
import { filterCardTemplates } from '../utils/cardTemplateSearch';

// Card categories mapping
const CARD_TYPES = [
    { id: 'general', label: 'General', color: 'text-[#c8aa6e]', accent: '#c8aa6e', icon: FiLayers },
    { id: 'action', label: 'Acción', color: 'text-red-400', accent: '#b8534f', icon: Sword },
    { id: 'attribute', label: 'Atributo', color: 'text-amber-400', accent: '#c78a3b', icon: Heart },
    { id: 'trap', label: 'Trampa', color: 'text-purple-400', accent: '#80638e', icon: Skull },
    { id: 'weapon', label: 'Arma', color: 'text-blue-400', accent: '#587c9f', icon: Sword },
    { id: 'armor', label: 'Armadura', color: 'text-emerald-400', accent: '#59806f', icon: Shield },
    { id: 'minion', label: 'Minion', color: 'text-violet-400', accent: '#77658d', icon: Users },
    { id: 'skill', label: 'Habilidad', color: 'text-cyan-400', accent: '#56858b', icon: Sparkles },
    { id: 'status', label: 'Estado', color: 'text-orange-400', accent: '#a66b42', icon: Flame }
];

const FILTER_PLAQUE_CLIP = 'polygon(7px 0, calc(100% - 7px) 0, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0 calc(100% - 7px), 0 7px)';
const ARCHIVE_PANEL_CLIP = 'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)';

const AvailableCardsTexture = () => (
    <svg
        aria-hidden="true"
        viewBox="0 0 360 620"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
    >
        <defs>
            <filter id="available-cards-paper" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" seed="47" />
                <feColorMatrix type="saturate" values="0" />
            </filter>
            <pattern id="available-cards-hatch" width="18" height="18" patternUnits="userSpaceOnUse">
                <path d="M-4 18L18-4M5 22L22 5" fill="none" stroke="#c8aa6e" strokeWidth="0.35" opacity="0.09" />
            </pattern>
        </defs>
        <rect width="360" height="620" fill="url(#available-cards-hatch)" opacity="0.42" />
        <rect width="360" height="620" fill="#e8d8b6" filter="url(#available-cards-paper)" opacity="0.025" />
        <path d="M1 30V10L10 1H72M288 1H359V72M359 548V610L350 619H288M72 619H1V548" fill="none" stroke="#c8aa6e" strokeWidth="0.8" opacity="0.24" />
        <path d="M15 1H116M244 619H345" fill="none" stroke="#ead7a8" strokeWidth="0.65" opacity="0.24" />
    </svg>
);

const CardTypePlaqueTexture = ({ typeId, accent, isActive, isDisabled }) => {
    const noiseId = `card-type-noise-${typeId}`;
    const weaveId = `card-type-weave-${typeId}`;
    const colorOpacity = isDisabled ? 0.045 : isActive ? 0.3 : 0.16;
    const detailOpacity = isDisabled ? 0.08 : isActive ? 0.28 : 0.2;

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 120 52"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-90 transition-opacity duration-200 group-hover:opacity-100"
        >
            <defs>
                <filter id={noiseId} x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.72"
                        numOctaves="3"
                        seed={typeId.length * 13}
                    />
                    <feColorMatrix type="saturate" values="0" />
                </filter>
                <pattern id={weaveId} width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M-2 8L8-2M2 12L12 2" fill="none" stroke={accent} strokeWidth="0.45" opacity={detailOpacity} />
                </pattern>
            </defs>

            <rect width="120" height="52" fill={accent} opacity={colorOpacity} />
            <rect width="120" height="52" fill={`url(#${weaveId})`} opacity={isDisabled ? 0.35 : 0.75} />
            <rect width="120" height="52" fill="#f1e4c7" filter={`url(#${noiseId})`} opacity={isDisabled ? 0.025 : 0.075} className="mix-blend-soft-light" />

            <path
                d="M1 11V7L7 1H15M105 1H113L119 7V11M119 41V45L113 51H105M15 51H7L1 45V41"
                fill="none"
                stroke={isActive ? '#211b10' : accent}
                strokeWidth="0.8"
                opacity={isDisabled ? 0.16 : isActive ? 0.58 : 0.36}
            />
            <path
                d="M7 5H34M86 5H113M7 47H34M86 47H113"
                fill="none"
                stroke={isActive ? '#211b10' : accent}
                strokeWidth="0.45"
                opacity={isDisabled ? 0.12 : 0.32}
            />
        </svg>
    );
};

CardTypePlaqueTexture.propTypes = {
    typeId: PropTypes.string.isRequired,
    accent: PropTypes.string.isRequired,
    isActive: PropTypes.bool,
    isDisabled: PropTypes.bool
};

const CardTypeIndex = ({ counts, activeTypeId, onSelect }) => (
    <section aria-label="Índice de tipos de carta" className="relative border-y border-[#8e784b]/25 py-2.5 sm:py-3">
        <span className="pointer-events-none absolute left-0 top-0 h-px w-24 bg-gradient-to-r from-[#c8aa6e]/70 to-transparent" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-px w-24 bg-gradient-to-l from-[#c8aa6e]/55 to-transparent" />

        <div className="mb-2.5 flex items-center gap-2.5 px-0.5">
            <span className="h-1.5 w-1.5 rotate-45 border border-[#c8aa6e]/65 bg-[#09090b]" />
            <span className="font-cinzel text-[8px] font-bold uppercase tracking-[0.22em] text-[#a99368]">
                Índice de la baraja
            </span>
            <span className="h-px min-w-4 flex-1 bg-gradient-to-r from-[#8e784b]/30 to-transparent" />
            {activeTypeId && (
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className="font-cinzel text-[7px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-[#d9c89f]"
                >
                    Mostrar todo
                </button>
            )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 xl:grid-cols-9">
            {CARD_TYPES.map((type) => {
                const count = counts[type.id] || 0;
                const Icon = type.icon;
                const isActive = activeTypeId === type.id;
                const isDisabled = count === 0;

                return (
                    <button
                        key={type.id}
                        type="button"
                        onClick={() => onSelect(isActive ? null : type.id)}
                        disabled={isDisabled}
                        aria-pressed={isActive}
                        title={count > 0 ? `Filtrar por ${type.label}` : `Sin cartas de ${type.label}`}
                        className={`group relative isolate min-w-0 overflow-hidden border px-2.5 py-1.5 text-left transition-[color,background-color,border-color,transform,box-shadow] duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#ead9aa] disabled:cursor-default ${isActive
                            ? 'border-[#d7bd7a]/80 text-[#080a0e] shadow-[0_7px_18px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,244,207,0.35)]'
                            : isDisabled
                                ? 'border-slate-800/55 text-slate-700'
                                : 'border-[#66583d]/45 text-[#c8bdab] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] hover:-translate-y-0.5 hover:border-[#a68d59]/65 hover:text-[#eee3cc]'}`}
                        style={{
                            clipPath: FILTER_PLAQUE_CLIP,
                            backgroundColor: isActive ? '#b79a60' : isDisabled ? '#0a0c11' : '#0e1118'
                        }}
                    >
                        <CardTypePlaqueTexture
                            typeId={type.id}
                            accent={type.accent}
                            isActive={isActive}
                            isDisabled={isDisabled}
                        />
                        <span
                            aria-hidden="true"
                            className={`absolute inset-x-2 top-0 h-px transition-opacity ${isDisabled ? 'opacity-15' : isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'}`}
                            style={{ backgroundColor: type.accent }}
                        />
                        <span className="relative block">
                            <span className="flex items-center justify-between gap-2">
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#17130c]' : isDisabled ? 'text-slate-700' : 'text-[#a99878]'}`} />
                                <span className={`font-fantasy text-sm leading-none tabular-nums ${isActive ? 'text-[#17130c]' : 'text-[#dfcfaa]'}`}>
                                    {count}
                                </span>
                            </span>
                            <span className={`mt-1 block truncate border-t pt-1 font-cinzel text-[7px] font-bold uppercase tracking-[0.12em] ${isActive ? 'border-black/15' : 'border-[#8e784b]/20'}`}>
                                {type.label}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    </section>
);

CardTypeIndex.propTypes = {
    counts: PropTypes.objectOf(PropTypes.number).isRequired,
    activeTypeId: PropTypes.string,
    onSelect: PropTypes.func.isRequired
};

const ATTRIBUTE_STACKS = [
    {
        id: 'Cuerpo',
        label: 'Cuerpo'
    },
    {
        id: 'Mente',
        label: 'Mente'
    },
    {
        id: 'Hambre',
        label: 'Hambre'
    },
    {
        id: UNCLASSIFIED_ATTRIBUTE_TYPE,
        label: 'Sin clasificar'
    }
];

const DECK_COLOR_THEMES = [
    { id: 'gold', label: 'Dorado', color: '#c8aa6e', back: 'rgba(18, 22, 32, 0.55)', tab: 'rgba(28, 31, 41, 0.72)', front: 'rgba(30, 35, 48, 0.92)', border: 'rgba(200, 170, 110, 0.34)', glow: 'rgba(200, 170, 110, 0.2)' },
    { id: 'emerald', label: 'Esmeralda', color: '#34d399', back: 'rgba(6, 28, 22, 0.56)', tab: 'rgba(6, 45, 35, 0.7)', front: 'rgba(8, 42, 32, 0.9)', border: 'rgba(52, 211, 153, 0.34)', glow: 'rgba(52, 211, 153, 0.2)' },
    { id: 'ruby', label: 'Rubí', color: '#fb7185', back: 'rgba(40, 10, 16, 0.56)', tab: 'rgba(58, 13, 22, 0.72)', front: 'rgba(54, 14, 22, 0.9)', border: 'rgba(251, 113, 133, 0.35)', glow: 'rgba(251, 113, 133, 0.22)' },
    { id: 'azure', label: 'Zafiro', color: '#60a5fa', back: 'rgba(10, 22, 44, 0.56)', tab: 'rgba(12, 32, 62, 0.72)', front: 'rgba(15, 35, 60, 0.9)', border: 'rgba(96, 165, 250, 0.35)', glow: 'rgba(96, 165, 250, 0.22)' },
    { id: 'violet', label: 'Violeta', color: '#a78bfa', back: 'rgba(28, 18, 48, 0.56)', tab: 'rgba(40, 25, 68, 0.72)', front: 'rgba(38, 27, 62, 0.9)', border: 'rgba(167, 139, 250, 0.35)', glow: 'rgba(167, 139, 250, 0.2)' },
    { id: 'slate', label: 'Ceniza', color: '#cbd5e1', back: 'rgba(20, 24, 32, 0.58)', tab: 'rgba(31, 36, 46, 0.72)', front: 'rgba(35, 41, 52, 0.9)', border: 'rgba(203, 213, 225, 0.28)', glow: 'rgba(203, 213, 225, 0.14)' }
];

const getDeckColorTheme = (colorId, isLibrary = false) => (
    DECK_COLOR_THEMES.find(theme => theme.id === colorId)
    || DECK_COLOR_THEMES.find(theme => theme.id === (colorId === 'crimson' ? 'ruby' : colorId))
    || DECK_COLOR_THEMES.find(theme => theme.id === (isLibrary ? 'emerald' : 'gold'))
    || DECK_COLOR_THEMES[0]
);

const hexToRgba = (hex, alpha = 1) => {
    const normalized = hex.replace('#', '');
    const value = parseInt(normalized.length === 3
        ? normalized.split('').map(char => char + char).join('')
        : normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const COLLECTION_ACCESS = {
    HIDDEN: 'hidden',
    READ: 'read',
    EDIT: 'edit'
};

const isMasterLibraryDeck = (deck) => deck?.isMasterLibrary === true;

const getDeckAccessForViewer = (deck, viewerId) => {
    if (!isMasterLibraryDeck(deck)) return COLLECTION_ACCESS.EDIT;
    return deck.permissions?.[viewerId] || COLLECTION_ACCESS.HIDDEN;
};

// 3D Tilt Card Wrapper Component
const TiltCard = ({ children, frontUrl, name, active = true }) => {
    const containerRef = useRef(null);
    const [style, setStyle] = useState({});
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!active) {
            setIsHovered(false);
            setStyle({
                transform: 'none',
                transition: 'transform 0.5s ease-out, box-shadow 0.5s ease-out'
            });
        }
    }, [active]);

    const handleMouseMove = (e) => {
        if (!active || !containerRef.current) return;
        if (!isHovered) setIsHovered(true);

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const rotateX = (y - 50) / 4; 
        const rotateY = (x - 50) / -4; 

        setStyle({
            '--mouse-x': `${x}%`,
            '--mouse-y': `${y}%`,
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.025)`,
            boxShadow: `0 18px 28px rgba(0, 0, 0, 0.62), 0 0 16px rgba(200, 170, 110, ${Math.max(0.06, (50 - Math.abs(x - 50)) / 260)})`
        });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setStyle({
            transform: 'none',
            transition: 'transform 0.5s ease-out, box-shadow 0.5s ease-out'
        });
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-[3/4.2] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-100 ease-out select-none border border-slate-800/50"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={style}
        >
            <div className="absolute inset-0 z-0">
                {frontUrl ? (
                    <img 
                        src={frontUrl} 
                        alt={name} 
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full bg-[#161a23] flex flex-col items-center justify-center p-4 border border-dashed border-[#c8aa6e]/30">
                        <FiLayers className="w-12 h-12 text-[#c8aa6e]/40 mb-2" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center">{name}</span>
                    </div>
                )}
            </div>

            {/* Custom Interactive Glossy Glare */}
            {isHovered && (
                <div 
                    className="absolute inset-0 pointer-events-none z-10 mix-blend-screen transition-opacity duration-500"
                    style={{
                        opacity: 0.44,
                        filter: 'blur(1.1px)',
                        backgroundImage: `
                            radial-gradient(circle at var(--mouse-x) var(--mouse-y),
                                rgba(255,255,255,0.46) 0%,
                                rgba(255,255,255,0.22) 14%,
                                rgba(255,255,255,0.10) 30%,
                                rgba(255,255,255,0.04) 48%,
                                rgba(255,255,255,0) 72%
                            ),
                            radial-gradient(circle at var(--mouse-x) var(--mouse-y),
                                rgba(240,230,210,0.18) 0%,
                                rgba(240,230,210,0.07) 22%,
                                rgba(240,230,210,0) 54%
                            )
                        `,
                        backgroundSize: '100% 100%, 100% 100%'
                    }}
                />
            )}
            
            {/* Inner Border highlight */}
            <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-lg z-20" />
            {children}
        </div>
    );
};

TiltCard.propTypes = {
    children: PropTypes.node,
    frontUrl: PropTypes.string,
    name: PropTypes.string,
    active: PropTypes.bool
};

const CardGroupStack = ({
    group,
    cards,
    onOpen,
    onDelete,
    onReorderPointerDown,
    canEdit,
    isDropTarget,
    isDragging,
    isOrderTarget,
    isPreview = false
}) => {
    const previewCards = cards.slice(0, 3);
    const behindCards = previewCards.slice(1);
    const isStackTarget = isDropTarget || isOrderTarget;

    return (
        <motion.div
            data-card-group-id={group.id}
            onPointerDown={(event) => canEdit && onReorderPointerDown(event, group)}
            title={canEdit ? 'Haz clic para abrir o arrastra para cambiar la posición' : undefined}
            layout={isPreview ? false : 'position'}
            initial={isPreview ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                layout: { type: 'spring', stiffness: 420, damping: 34 },
                opacity: { duration: 0.16 },
                y: { duration: 0.18 }
            }}
            className={`relative isolate mx-auto flex w-full max-w-[280px] touch-none flex-col gap-3 px-5 pb-2 pt-9 transition-all ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''} ${isStackTarget ? 'z-20' : 'z-0'} ${isDragging ? 'opacity-40' : 'opacity-100'}`}
        >
            <button
                type="button"
                onClick={() => onOpen(group.id)}
                aria-label={`Abrir agrupación ${group.name}, ${cards.length} cartas`}
                className="group relative w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f0e6d2]/70"
            >
                <span
                    className={`relative block aspect-[3/4.2] transition-transform duration-200 ease-out ${isStackTarget ? '-translate-y-1 scale-[1.01]' : 'group-hover:-translate-y-1'}`}
                >
                    {behindCards.map((card, index) => {
                        const singleCardPosition = { x: 11, y: -20, rotation: 3, scale: 0.95 };
                        const fanPositions = [
                            { x: -14, y: -30, rotation: -3.5, scale: 0.92 },
                            { x: 14, y: -19, rotation: 3.5, scale: 0.95 }
                        ];
                        const position = behindCards.length === 1 ? singleCardPosition : fanPositions[index];
                        return (
                            <span
                                key={card.id || index}
                                className={`pointer-events-none absolute inset-0 overflow-hidden rounded-lg border border-slate-500/55 bg-[#10141d] shadow-[0_14px_28px_rgba(0,0,0,0.56)] transition-[filter,opacity,box-shadow] duration-200 ${isStackTarget ? 'brightness-[0.38] saturate-[0.72]' : ''}`}
                                style={{
                                    zIndex: index + 1,
                                    transform: `translate(${position.x}px, ${position.y}px) rotate(${position.rotation}deg) scale(${position.scale})`,
                                    opacity: 0.9 + index * 0.05
                                }}
                            >
                                {card?.frontUrl && (
                                    <img src={card.frontUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                                )}
                            </span>
                        );
                    })}

                    <span className={`absolute inset-0 z-10 overflow-hidden rounded-lg border border-slate-500/65 bg-[#0d1017] shadow-[0_18px_30px_rgba(0,0,0,0.5)] transition-[filter,box-shadow] duration-200 group-hover:shadow-[0_24px_40px_rgba(0,0,0,0.65)] ${isStackTarget ? 'brightness-[0.38] saturate-[0.72]' : ''}`}>
                        {previewCards[0]?.frontUrl ? (
                            <img
                                src={previewCards[0].frontUrl}
                                alt={previewCards[0].name || ''}
                                className="absolute inset-0 h-full w-full object-cover"
                                draggable={false}
                            />
                        ) : (
                            <span className="absolute inset-0 flex items-center justify-center bg-[#111722]">
                                <FolderOpen className="h-14 w-14 text-slate-600" />
                            </span>
                        )}
                    </span>
                    {isDropTarget && (
                        <span className="absolute inset-0 z-20 flex items-center justify-center">
                            <span className="rounded-full border border-[#f0e6d2]/60 bg-[#05070b]/85 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#f0e6d2]">
                                Soltar dentro
                            </span>
                        </span>
                    )}
                    {isOrderTarget && (
                        <span className="absolute inset-0 z-20 flex items-center justify-center">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0e6d2]/65 bg-[#05070b]/90 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#f0e6d2] shadow-[0_0_24px_rgba(240,230,210,0.14)]">
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                Intercambiar posición
                            </span>
                        </span>
                    )}
                </span>
            </button>

            <div className="relative z-10 flex items-center justify-between gap-2 pl-1">
                <button
                    type="button"
                    onClick={() => onOpen(group.id)}
                    className="min-w-0 text-left"
                >
                    <span className="block truncate font-cinzel text-[11px] font-bold uppercase tracking-[0.14em] text-[#f0e6d2]">
                        {group.name}
                    </span>
                    <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {cards.length} {cards.length === 1 ? 'carta' : 'cartas'} · abrir
                    </span>
                </button>
                {canEdit && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete(group.id);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700/60 bg-slate-950/70 text-slate-500 transition-colors hover:border-rose-400/60 hover:text-rose-300"
                        title="Eliminar agrupación sin borrar sus cartas"
                        aria-label={`Eliminar agrupación ${group.name}`}
                    >
                        <FolderX className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

CardGroupStack.propTypes = {
    group: PropTypes.object.isRequired,
    cards: PropTypes.arrayOf(PropTypes.object).isRequired,
    onOpen: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onReorderPointerDown: PropTypes.func.isRequired,
    canEdit: PropTypes.bool,
    isDropTarget: PropTypes.bool,
    isDragging: PropTypes.bool,
    isOrderTarget: PropTypes.bool,
    isPreview: PropTypes.bool
};

const DeckCardItem = ({
    card,
    cardGroup,
    resolvedAttributeType,
    draggedCardId,
    dropTargetCardId,
    canEdit = true,
    canManageVisibility = false,
    isMasterLibrary = false,
    handleCycleCardType,
    handleCycleAttributeType,
    handleRemoveCardFromGroup,
    handleRemoveCardFromDeck,
    handleToggleCardVisibility,
    handleCardPointerDown,
    handlePreviewCard
}) => {
    const category = CARD_TYPES.find(t => t.id === card.type) || CARD_TYPES[0];
    const CategoryIcon = category.icon;
    const isDragging = draggedCardId === card.id;
    const isDropTarget = dropTargetCardId === card.id;
    const isHiddenForPlayers = isMasterLibrary && card.visibleToPlayers === false;
    const isAttributeCard = (card.type || 'action') === 'attribute';
    const [isInspectExpanded, setIsInspectExpanded] = useState(false);

    return (
        <motion.div 
            data-deck-card-id={card.id}
            onPointerDown={(event) => handleCardPointerDown(event, card)}
            layout="position"
            initial={false}
            transition={{
                layout: { type: 'spring', stiffness: 420, damping: 34 }
            }}
            className={`flex touch-none flex-col gap-2.5 z-10 w-full max-w-[240px] mx-auto relative transition-all duration-200 ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isDragging ? 'opacity-35 scale-[0.985]' : 'opacity-100'} ${isDropTarget ? 'scale-[1.02]' : ''} ${isHiddenForPlayers ? 'opacity-75' : ''}`}
        >
            <TiltCard frontUrl={card.frontUrl} name={card.name} active={!isDragging && !isDropTarget}>
                {isMasterLibrary && (
                    <div className={`absolute bottom-2.5 left-2.5 z-30 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest backdrop-blur-md ${isHiddenForPlayers ? 'border-slate-600/50 bg-slate-950/80 text-slate-400' : 'border-emerald-400/40 bg-emerald-950/60 text-emerald-200'}`}>
                        {isHiddenForPlayers ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {isHiddenForPlayers ? 'Oculta' : 'Publicada'}
                    </div>
                )}

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        handlePreviewCard(card);
                    }}
                    onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') setIsInspectExpanded(true);
                    }}
                    onPointerLeave={() => setIsInspectExpanded(false)}
                    onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.pointerType !== 'mouse') setIsInspectExpanded(false);
                    }}
                    className={`group/inspect absolute flex h-10 w-10 touch-manipulation cursor-pointer items-center justify-center overflow-hidden border border-[#d9ae54] bg-[#07141b] text-[#f5d98d] shadow-[0_0_0_1px_rgba(0,0,0,0.86),0_8px_22px_rgba(0,0,0,0.72),0_0_13px_rgba(217,174,84,0.18),inset_0_1px_0_rgba(255,244,203,0.14)] transition-[width,border-color,background-color,color,transform,box-shadow] duration-200 [clip-path:polygon(7px_0,100%_0,100%_calc(100%_-_7px),calc(100%_-_7px)_100%,0_100%,0_7px)] hover:border-[#f0cb72] hover:bg-[#102832] hover:text-[#fff1bd] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.9),0_10px_26px_rgba(0,0,0,0.78),0_0_17px_rgba(240,203,114,0.28),inset_0_1px_0_rgba(255,244,203,0.18)] active:scale-95 active:bg-[#173746] sm:h-9 ${isAttributeCard ? 'bottom-[9px] right-[6px]' : 'bottom-2 right-2 sm:bottom-2.5 sm:right-2.5'} ${isInspectExpanded ? 'z-[35] sm:w-[112px]' : 'z-30 sm:w-9'}`}
                    title={`Inspeccionar ${card.name || 'carta'} (mantén pulsado en móvil)`}
                    aria-label={`Inspeccionar ${card.name || 'carta'}`}
                >
                    <span className="pointer-events-none absolute inset-[3px] border border-[#f5d98d]/25 [clip-path:polygon(5px_0,100%_0,100%_calc(100%_-_5px),calc(100%_-_5px)_100%,0_100%,0_5px)]" />
                    <span className="pointer-events-none absolute inset-y-[5px] left-[3px] w-px bg-[#f0cb72]/75" />
                    <ScanEye className="relative h-[19px] w-[19px] shrink-0 stroke-[2.15] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] sm:h-4 sm:w-4" />
                    <span className="pointer-events-none absolute bottom-[4px] left-1/2 h-px w-3 -translate-x-1/2 bg-[#f0cb72]/65 sm:hidden" />
                    <span className={`relative hidden overflow-hidden whitespace-nowrap font-cinzel text-[7px] font-bold uppercase tracking-[0.16em] transition-[max-width,margin,opacity] duration-200 sm:block ${isInspectExpanded ? 'sm:ml-2 sm:max-w-[70px] sm:opacity-100' : 'sm:ml-0 sm:max-w-0 sm:opacity-0'}`}>
                        Inspeccionar
                    </span>
                </button>

                {/* Card type control (top-left) */}
                {canEdit && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCycleCardType(card.id);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        className={`absolute z-30 flex h-10 w-10 touch-manipulation cursor-pointer items-center justify-center overflow-hidden border bg-[#07141b] shadow-[0_0_0_1px_rgba(0,0,0,0.86),0_8px_20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,244,203,0.12)] transition-[background-color,transform,box-shadow] duration-200 hover:bg-[#102832] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.9),0_10px_24px_rgba(0,0,0,0.76),inset_0_1px_0_rgba(255,244,203,0.16)] active:scale-95 sm:h-9 sm:w-9 ${isAttributeCard ? 'left-[4px] top-[9px] [clip-path:polygon(8px_0,100%_0,100%_calc(100%_-_8px),calc(100%_-_8px)_100%,0_100%,0_8px)]' : 'left-[9px] top-[10px] [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_8px),calc(100%_-_8px)_100%,0_100%)]'} ${category.color.split(' ')[0]}`}
                        style={{ borderColor: category.accent }}
                        title={`Tipo actual: ${category.label}. Clic para cambiar.`}
                        aria-label={`Tipo actual: ${category.label}. Cambiar tipo de carta`}
                    >
                        <span className={`pointer-events-none absolute inset-[3px] border border-white/10 ${isAttributeCard ? '[clip-path:polygon(5px_0,100%_0,100%_calc(100%_-_5px),calc(100%_-_5px)_100%,0_100%,0_5px)]' : '[clip-path:polygon(0_0,100%_0,100%_calc(100%_-_5px),calc(100%_-_5px)_100%,0_100%)]'}`} />
                        <span className="relative shrink-0">
                            <CategoryIcon className="h-[18px] w-[18px] stroke-[2.1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] sm:h-4 sm:w-4" />
                            <RefreshCw className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#07141b] p-[1px] text-[#e0bb68]" />
                        </span>
                        <span className="pointer-events-none absolute bottom-[4px] left-1/2 h-px w-3 -translate-x-1/2 sm:hidden" style={{ backgroundColor: category.accent }} />
                    </button>
                )}

                {canManageVisibility && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCardVisibility(card.id);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        className={`absolute left-1/2 top-2 z-30 flex h-10 w-10 -translate-x-1/2 touch-manipulation cursor-pointer items-center justify-center overflow-hidden border shadow-[0_0_0_1px_rgba(0,0,0,0.86),0_8px_20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] transition-[border-color,background-color,color,transform,box-shadow] duration-200 [clip-path:polygon(7px_0,100%_0,100%_calc(100%_-_7px),calc(100%_-_7px)_100%,0_100%,0_7px)] hover:-translate-y-0.5 active:scale-95 sm:top-2.5 sm:h-9 sm:w-9 ${isHiddenForPlayers ? 'border-[#66717e] bg-[#10161d] text-[#a9b5c2] hover:border-[#8da0b3] hover:bg-[#18232d] hover:text-[#dce6ef]' : 'border-[#56ae86] bg-[#071a16] text-[#8ee0b6] hover:border-[#7ed2a8] hover:bg-[#0d2b22] hover:text-[#c2f6d8]'}`}
                        title={isHiddenForPlayers ? 'Hacer visible para jugadores con lectura' : 'Ocultar para jugadores con lectura'}
                        aria-label={isHiddenForPlayers ? 'Carta oculta. Hacer visible para jugadores' : 'Carta publicada. Ocultar para jugadores'}
                    >
                        <span className="pointer-events-none absolute inset-[3px] border border-white/10 [clip-path:polygon(5px_0,100%_0,100%_calc(100%_-_5px),calc(100%_-_5px)_100%,0_100%,0_5px)]" />
                        {isHiddenForPlayers ? <EyeOff className="h-[18px] w-[18px] stroke-[2.1] sm:h-4 sm:w-4" /> : <Eye className="h-[18px] w-[18px] stroke-[2.1] sm:h-4 sm:w-4" />}
                        <span className={`pointer-events-none absolute bottom-[4px] left-1/2 h-px w-3 -translate-x-1/2 ${isHiddenForPlayers ? 'bg-[#8492a1]' : 'bg-[#7ed2a8]'}`} />
                    </button>
                )}

                <AnimatePresence>
                    {isDropTarget && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#05070b]/68 backdrop-blur-[1.5px]"
                        >
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0e6d2]/65 bg-[#05070b]/90 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#f0e6d2] shadow-[0_0_24px_rgba(240,230,210,0.14)]">
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                Intercambiar posición
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Remove card control (top-right) */}
                {canEdit && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCardFromDeck(card.id);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        className={`absolute z-30 flex h-10 w-10 touch-manipulation cursor-pointer items-center justify-center overflow-hidden border border-[#a94b59] bg-[#1b0c12] text-[#ef9ca8] shadow-[0_0_0_1px_rgba(0,0,0,0.88),0_8px_21px_rgba(0,0,0,0.72),0_0_12px_rgba(169,75,89,0.15),inset_0_1px_0_rgba(255,220,224,0.1)] transition-[border-color,background-color,color,transform,box-shadow] duration-200 hover:border-[#dc7180] hover:bg-[#32121c] hover:text-[#ffd1d6] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.9),0_10px_25px_rgba(0,0,0,0.78),0_0_16px_rgba(220,113,128,0.24)] active:scale-95 active:bg-[#471824] sm:h-9 sm:w-9 ${isAttributeCard ? 'right-[6.5px] top-[9px] [clip-path:polygon(0_0,calc(100%_-_8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%_-_8px))]' : 'right-2.5 top-2.5 [clip-path:polygon(0_0,100%_0,100%_100%,8px_100%,0_calc(100%_-_8px))]'}`}
                        title="Quitar de la baraja"
                        aria-label={`Quitar ${card.name || 'carta'} de la baraja`}
                    >
                        <span className={`pointer-events-none absolute inset-[3px] border border-[#ffd1d6]/15 ${isAttributeCard ? '[clip-path:polygon(0_0,calc(100%_-_5px)_0,100%_5px,100%_100%,5px_100%,0_calc(100%_-_5px))]' : '[clip-path:polygon(0_0,100%_0,100%_100%,5px_100%,0_calc(100%_-_5px))]'}`} />
                        <Trash2 className="relative h-[18px] w-[18px] shrink-0 stroke-[2.1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] sm:h-4 sm:w-4" />
                        <span className="pointer-events-none absolute bottom-[4px] left-1/2 h-px w-3 -translate-x-1/2 bg-[#dc7180]/75 sm:hidden" />
                    </button>
                )}
            </TiltCard>
            {canEdit && isAttributeCard && !cardGroup && (
                <div className="mx-auto flex max-w-full items-center justify-center px-1">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleCycleAttributeType(card.id, resolvedAttributeType);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="group/attribute relative inline-flex h-7 touch-manipulation items-center gap-2 overflow-hidden border border-[#b98a3d]/75 bg-[#181208] px-2.5 text-[#efcf86] shadow-[0_0_0_1px_rgba(0,0,0,0.72),0_4px_11px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,231,174,0.08)] transition-[border-color,background-color,color,transform] duration-200 [clip-path:polygon(6px_0,100%_0,100%_calc(100%_-_6px),calc(100%_-_6px)_100%,0_100%,0_6px)] hover:border-[#dfb45c] hover:bg-[#271d0c] hover:text-[#ffe5a8] active:scale-[0.97]"
                        title="Cambiar entre Cuerpo, Mente y Hambre"
                        aria-label={`Atributo actual: ${resolvedAttributeType === UNCLASSIFIED_ATTRIBUTE_TYPE ? 'Sin clasificar' : resolvedAttributeType}. Cambiar atributo`}
                    >
                        <span className="relative font-cinzel text-[7px] font-bold uppercase tracking-[0.15em]">
                            {resolvedAttributeType === UNCLASSIFIED_ATTRIBUTE_TYPE ? 'Asignar' : resolvedAttributeType}
                        </span>
                        <RefreshCw className="relative h-3 w-3 shrink-0 opacity-75 transition-transform duration-300 group-hover/attribute:rotate-90" />
                    </button>
                </div>
            )}
            {canEdit && cardGroup && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveCardFromGroup(card.id);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="group/remove flex w-full touch-manipulation items-center justify-between gap-2 px-1 pt-0.5 text-left transition-transform duration-200 active:scale-[0.985]"
                    title={`Sacar de ${cardGroup.name}`}
                    aria-label={`Sacar ${card.name || 'carta'} de la agrupación ${cardGroup.name}`}
                >
                    <span className="min-w-0">
                        <span className="block font-cinzel text-[9px] font-bold uppercase tracking-[0.14em] text-[#f0e6d2] transition-colors group-hover/remove:text-white">
                            Sacar carta
                        </span>
                        <span className="mt-0.5 block truncate text-[7px] font-bold uppercase tracking-[0.16em] text-slate-500 transition-colors group-hover/remove:text-[#8ba8b6]">
                            de {cardGroup.name}
                        </span>
                    </span>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700/60 bg-slate-950/70 text-slate-500 transition-[border-color,background-color,color] duration-200 group-hover/remove:border-[#79a1b3]/70 group-hover/remove:bg-[#0b1a22] group-hover/remove:text-[#bdd4df]">
                        <FolderOutput className="h-3.5 w-3.5 transition-transform duration-200 group-hover/remove:-translate-x-0.5" />
                    </span>
                </button>
            )}
        </motion.div>
    );
};

DeckCardItem.propTypes = {
    card: PropTypes.object.isRequired,
    cardGroup: PropTypes.object,
    resolvedAttributeType: PropTypes.string,
    draggedCardId: PropTypes.string,
    dropTargetCardId: PropTypes.string,
    canEdit: PropTypes.bool,
    canManageVisibility: PropTypes.bool,
    isMasterLibrary: PropTypes.bool,
    handleCycleCardType: PropTypes.func.isRequired,
    handleCycleAttributeType: PropTypes.func.isRequired,
    handleRemoveCardFromGroup: PropTypes.func.isRequired,
    handleRemoveCardFromDeck: PropTypes.func.isRequired,
    handleToggleCardVisibility: PropTypes.func.isRequired,
    handleCardPointerDown: PropTypes.func.isRequired,
    handlePreviewCard: PropTypes.func.isRequired
};

export const DeckBuilderView = ({ ownerId, ownerName, currentUserId, knownPlayers = [], isPlayer = true, onBack }) => {
    const [decks, setDecks] = useState([]);
    const [masterLibraryDecks, setMasterLibraryDecks] = useState([]);
    const [activeDeck, setActiveDeck] = useState(null);
    const [searchTemplate, setSearchTemplate] = useState('');
    const [newDeckModal, setNewDeckModal] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [newDeckIsMasterLibrary, setNewDeckIsMasterLibrary] = useState(false);
    const [editingDeckName, setEditingDeckName] = useState(null);
    const [editDeckNameText, setEditDeckNameText] = useState('');
    const [draggedCardId, setDraggedCardId] = useState(null);
    const [dropTargetCardId, setDropTargetCardId] = useState(null);
    const [dropTargetGroupId, setDropTargetGroupId] = useState(null);
    const [draggedCardGroupId, setDraggedCardGroupId] = useState(null);
    const [cardGroupOrderTargetId, setCardGroupOrderTargetId] = useState(null);
    const [draggedNormalDeckId, setDraggedNormalDeckId] = useState(null);
    const [normalDeckDropTargetId, setNormalDeckDropTargetId] = useState(null);
    const [draggedLibraryDeckId, setDraggedLibraryDeckId] = useState(null);
    const [libraryDropTargetId, setLibraryDropTargetId] = useState(null);
    const [dragPreview, setDragPreview] = useState(null);
    const [cardGroupDragPreview, setCardGroupDragPreview] = useState(null);
    const [isUploadingLibraryCard, setIsUploadingLibraryCard] = useState(false);
    const [libraryCardToDelete, setLibraryCardToDelete] = useState(null);
    const [deckToDelete, setDeckToDelete] = useState(null);
    const [localCards, setLocalCards] = useState([]);
    const [localCardGroups, setLocalCardGroups] = useState([]);
    const [activeCardTypeFilter, setActiveCardTypeFilter] = useState(null);
    const [cardGroupViewMode, setCardGroupViewMode] = useState('grouped');
    const [expandedCardGroupId, setExpandedCardGroupId] = useState(null);
    const [isCreatingCardGroup, setIsCreatingCardGroup] = useState(false);
    const [newCardGroupName, setNewCardGroupName] = useState('');
    const [previewCard, setPreviewCard] = useState(null);
    const [cardPreviewScale, setCardPreviewScale] = useState(1);
    const dragStateRef = useRef(null);
    const cardGroupDragStateRef = useRef(null);
    const cardGroupDragClickBlockedUntilRef = useRef(0);
    const pendingCardsSignatureRef = useRef(null);
    const pendingCardGroupsSignatureRef = useRef(null);
    const activeDeckSyncIdRef = useRef(null);
    const newCardGroupInputRef = useRef(null);
    const cardPreviewSurfaceRef = useRef(null);
    const cardPreviewHoldRef = useRef(null);
    const normalDeckDragStateRef = useRef(null);
    const normalDeckDragClickBlockedRef = useRef(false);
    const libraryDragStateRef = useRef(null);
    const libraryDragClickBlockedRef = useRef(false);
    const libraryCardFileInputRef = useRef(null);
    const viewerId = currentUserId || ownerId;

    useEffect(() => {
        if (!previewCard) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handlePreviewKeyDown = (event) => {
            if (event.key === 'Escape') {
                setPreviewCard(null);
                setCardPreviewScale(1);
            }
        };

        const previewSurface = cardPreviewSurfaceRef.current;
        const handlePreviewWheel = (event) => {
            event.preventDefault();
            const direction = event.deltaY < 0 ? 1 : -1;
            setCardPreviewScale((current) => (
                Math.min(2.35, Math.max(0.72, Number((current + direction * 0.12).toFixed(2))))
            ));
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handlePreviewKeyDown);
        previewSurface?.addEventListener('wheel', handlePreviewWheel, { passive: false });

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handlePreviewKeyDown);
            previewSurface?.removeEventListener('wheel', handlePreviewWheel);
        };
    }, [previewCard]);

    useEffect(() => {
        if (!isCreatingCardGroup) return undefined;

        const focusFrame = window.requestAnimationFrame(() => {
            newCardGroupInputRef.current?.focus();
        });

        return () => window.cancelAnimationFrame(focusFrame);
    }, [isCreatingCardGroup]);

    useEffect(() => () => {
        const hold = cardPreviewHoldRef.current;
        if (!hold) return;
        window.clearTimeout(hold.timer);
        hold.cleanup?.();
        cardPreviewHoldRef.current = null;
    }, []);

    const handleOpenCardPreview = (card) => {
        setCardPreviewScale(1);
        setPreviewCard(card);
    };

    const handleCloseCardPreview = () => {
        setPreviewCard(null);
        setCardPreviewScale(1);
    };

    const visibleDecks = useMemo(() => {
        const merged = [...decks, ...masterLibraryDecks];
        return merged;
    }, [decks, masterLibraryDecks]);

    const sortNormalDecks = (items) => {
        const hasManualOrder = items.some(deck => typeof deck.sortOrder === 'number');
        if (!hasManualOrder) {
            return [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        return [...items].sort((a, b) => {
            const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
            const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    };

    const sortLibraryDecks = (items) => {
        const hasManualOrder = items.some(deck => typeof deck.sortOrder === 'number');
        if (!hasManualOrder) {
            return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
        }
        return [...items].sort((a, b) => {
            const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
            const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
        });
    };

    const normalDecks = useMemo(
        () => sortNormalDecks(visibleDecks.filter(deck => !isMasterLibraryDeck(deck))),
        [visibleDecks]
    );

    const libraryDecks = useMemo(
        () => sortLibraryDecks(visibleDecks.filter(deck => isMasterLibraryDeck(deck))),
        [visibleDecks]
    );

    const catalogDeckItems = useMemo(() => [
        ...normalDecks,
        ...(libraryDecks.length > 0 ? [{ id: '__library_separator__', isSeparator: true }] : []),
        ...libraryDecks
    ], [normalDecks, libraryDecks]);

    const canReorderNormalDecks = normalDecks.length > 1;
    const canReorderLibraryDecks = !isPlayer && libraryDecks.length > 1;

    const activeDeckAccess = activeDeck
        ? getDeckAccessForViewer(activeDeck, viewerId)
        : COLLECTION_ACCESS.HIDDEN;
    const activeDeckIsMasterLibrary = isMasterLibraryDeck(activeDeck);
    const activeDeckTheme = getDeckColorTheme(activeDeck?.color, activeDeckIsMasterLibrary);
    const canEditActiveDeck = !!activeDeck && (!isPlayer || activeDeck.ownerId === ownerId || activeDeckAccess === COLLECTION_ACCESS.EDIT);
    const canManageActiveLibraryPermissions = !!activeDeck && !isPlayer && activeDeckIsMasterLibrary;
    const canManageActiveCardVisibility = canManageActiveLibraryPermissions || (isPlayer && activeDeckAccess === COLLECTION_ACCESS.EDIT && activeDeckIsMasterLibrary);

    // Sync localCards with activeDeck when not dragging
    useEffect(() => {
        if (activeDeck) {
            if (activeDeckSyncIdRef.current !== activeDeck.id) {
                activeDeckSyncIdRef.current = activeDeck.id;
                pendingCardsSignatureRef.current = null;
                pendingCardGroupsSignatureRef.current = null;
            }
            if (draggedCardId === null && draggedCardGroupId === null) {
                const nextCards = activeDeck.cards || [];
                const nextCardGroups = normalizeCardGroups(activeDeck.cardGroups || [], nextCards);
                const remoteCardsSignature = JSON.stringify(nextCards.map((card) => card.id));
                const remoteGroupsSignature = JSON.stringify(nextCardGroups);
                if (!pendingCardsSignatureRef.current || pendingCardsSignatureRef.current === remoteCardsSignature) {
                    if (pendingCardsSignatureRef.current === remoteCardsSignature) {
                        pendingCardsSignatureRef.current = null;
                    }
                    setLocalCards(nextCards);
                }
                if (!pendingCardGroupsSignatureRef.current || pendingCardGroupsSignatureRef.current === remoteGroupsSignature) {
                    if (pendingCardGroupsSignatureRef.current === remoteGroupsSignature) {
                        pendingCardGroupsSignatureRef.current = null;
                    }
                    setLocalCardGroups(nextCardGroups);
                }
            }
        } else {
            activeDeckSyncIdRef.current = null;
            pendingCardsSignatureRef.current = null;
            pendingCardGroupsSignatureRef.current = null;
            setLocalCards([]);
            setLocalCardGroups([]);
            setActiveCardTypeFilter(null);
            setExpandedCardGroupId(null);
            setIsCreatingCardGroup(false);
            setNewCardGroupName('');
        }
    }, [activeDeck, draggedCardId, draggedCardGroupId]);

    useEffect(() => {
        if (!activeCardTypeFilter) return;
        const hasFilteredType = localCards.some(card => (card.type || 'action') === activeCardTypeFilter);
        if (!hasFilteredType) {
            setActiveCardTypeFilter(null);
        }
    }, [activeCardTypeFilter, localCards]);

    useEffect(() => {
        if (activeCardTypeFilter) setExpandedCardGroupId(null);
    }, [activeCardTypeFilter]);

    useEffect(() => () => {
        clearDragListeners();
        clearCardGroupDragListeners();
        clearNormalDeckDragListeners();
        clearLibraryDragListeners();
    }, []);

    useEffect(() => {
        if (!activeDeck) return;
        const updatedActive = visibleDecks.find(d => d.id === activeDeck.id);
        if (updatedActive) {
            setActiveDeck(updatedActive);
        } else {
            setActiveDeck(null);
        }
    }, [visibleDecks, activeDeck?.id]);

    // Real-time listener for decks
    useEffect(() => {
        const qDecks = query(collection(db, 'card_decks'), where('ownerId', '==', ownerId));
        const unsubDecks = onSnapshot(qDecks, (snap) => {
            const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDecks(loaded);
        });

        let unsubMasterLibraries = null;
        if (isPlayer) {
            unsubMasterLibraries = onSnapshot(collection(db, 'card_decks'), (snap) => {
                const loaded = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(deck => (
                        deck.ownerId === 'master' &&
                        isMasterLibraryDeck(deck) &&
                        getDeckAccessForViewer(deck, viewerId) !== COLLECTION_ACCESS.HIDDEN
                    ));
                setMasterLibraryDecks(loaded);
            });
        } else {
            setMasterLibraryDecks([]);
        }

        return () => {
            unsubDecks();
            if (unsubMasterLibraries) unsubMasterLibraries();
        };
    }, [ownerId, isPlayer, viewerId]);

    // Handle Create Deck
    const handleCreateDeck = async () => {
        if (!newDeckName.trim()) return;
        try {
            const payload = {
                name: newDeckName.trim(),
                ownerId,
                createdAt: Date.now(),
                cards: [],
                isMasterLibrary: !isPlayer && newDeckIsMasterLibrary
            };
            if (payload.isMasterLibrary) {
                payload.permissions = {};
            }
            await addDoc(collection(db, 'card_decks'), payload);
            setNewDeckName('');
            setNewDeckIsMasterLibrary(false);
            setNewDeckModal(false);
        } catch (err) {
            console.error("Error creating deck:", err);
        }
    };

    // Handle Delete Deck
    const handleDeleteDeck = async (deckId, e) => {
        e.stopPropagation();
        const deck = visibleDecks.find(d => d.id === deckId);
        if (deck && isPlayer && (deck.ownerId !== ownerId || isMasterLibraryDeck(deck))) return;
        if (!deck) return;
        setDeckToDelete(deck);
    };

    const confirmDeleteDeck = async () => {
        if (!deckToDelete) return;
        try {
            await deleteDoc(doc(db, 'card_decks', deckToDelete.id));
            if (activeDeck?.id === deckToDelete.id) setActiveDeck(null);
            setDeckToDelete(null);
        } catch (err) {
            console.error("Error deleting deck:", err);
        }
    };

    // Handle Rename Deck
    const handleRenameDeck = async (deckId, e) => {
        e.stopPropagation();
        if (!editDeckNameText.trim()) return;
        const deck = visibleDecks.find(d => d.id === deckId);
        if (deck && isPlayer && (deck.ownerId !== ownerId || isMasterLibraryDeck(deck))) return;
        try {
            await updateDoc(doc(db, 'card_decks', deckId), {
                name: editDeckNameText.trim()
            });
            setEditingDeckName(null);
        } catch (err) {
            console.error("Error renaming deck:", err);
        }
    };

    const handleUpdateDeckColor = async (deckId, colorId, e) => {
        e.stopPropagation();
        const deck = visibleDecks.find(d => d.id === deckId);
        if (!deck) return;

        const isLibrary = isMasterLibraryDeck(deck);
        const access = getDeckAccessForViewer(deck, viewerId);
        const canChangeDeckColor = !isPlayer || (deck.ownerId === ownerId && !isLibrary) || (isLibrary && access === COLLECTION_ACCESS.EDIT);
        if (!canChangeDeckColor) return;

        try {
            await updateDoc(doc(db, 'card_decks', deckId), {
                color: colorId
            });
        } catch (err) {
            console.error("Error updating deck color:", err);
        }
    };

    // Add Card from templates to current deck
    const handleAddCardToDeck = async (template) => {
        if (!activeDeck || !canEditActiveDeck) return;
        const copiedAttributeType = normalizeAttributeCardType(template.attributeType);
        const newCard = {
            id: Math.random().toString(36).substr(2, 9),
            templateId: template.id,
            name: template.name || 'Carta sin nombre',
            frontUrl: template.frontUrl || '',
            type: template.type || 'action',
            ...((template.type || 'action') === 'attribute' && copiedAttributeType
                ? { attributeType: copiedAttributeType }
                : {}),
            visibleToPlayers: activeDeckIsMasterLibrary ? true : undefined
        };
        if (!activeDeckIsMasterLibrary) {
            delete newCard.visibleToPlayers;
        }

        const updatedCards = [...localCards, newCard];
        setLocalCards(updatedCards);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: sanitize(updatedCards)
            });
        } catch (err) {
            console.error("Error adding card:", err);
        }
    };

    const removeCardFromActiveDeck = async (cardId) => {
        if (!activeDeck || !canEditActiveDeck) return;
        const updatedCards = localCards.filter(c => c.id !== cardId);
        const updatedGroups = moveCardToGroup(localCardGroups, cardId, null);
        setLocalCards(updatedCards);
        setLocalCardGroups(updatedGroups);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: sanitize(updatedCards),
                cardGroups: sanitize(updatedGroups)
            });
        } catch (err) {
            console.error("Error removing card:", err);
        }
    };

    // Remove card from current deck
    const handleRemoveCardFromDeck = async (cardId) => {
        if (!activeDeck || !canEditActiveDeck) return;
        if (activeDeckIsMasterLibrary) {
            const card = localCards.find(c => c.id === cardId);
            if (card) {
                setLibraryCardToDelete(card);
            }
            return;
        }

        await removeCardFromActiveDeck(cardId);
    };

    const confirmRemoveLibraryCard = async () => {
        if (!libraryCardToDelete) return;
        await removeCardFromActiveDeck(libraryCardToDelete.id);
        setLibraryCardToDelete(null);
    };

    // Cycle card type category
    const handleCycleCardType = async (cardId) => {
        if (!activeDeck || !canEditActiveDeck) return;
        const updatedCards = localCards.map(card => {
            if (card.id === cardId) {
                const currentIndex = CARD_TYPES.findIndex(t => t.id === card.type);
                const nextIndex = (currentIndex + 1) % CARD_TYPES.length;
                const nextType = CARD_TYPES[nextIndex].id;
                return {
                    ...card,
                    type: nextType,
                    ...(nextType === 'attribute' && !normalizeAttributeCardType(card.attributeType)
                        ? { attributeType: 'Cuerpo' }
                        : {})
                };
            }
            return card;
        });

        setLocalCards(updatedCards);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: sanitize(updatedCards)
            });
        } catch (err) {
            console.error("Error updating card type:", err);
        }
    };

    const handleCycleAttributeType = async (cardId, currentType) => {
        if (!activeDeck || !canEditActiveDeck) return;
        const currentIndex = ATTRIBUTE_CARD_TYPES.indexOf(currentType);
        const nextType = ATTRIBUTE_CARD_TYPES[(currentIndex + 1) % ATTRIBUTE_CARD_TYPES.length];
        const updatedCards = localCards.map((card) => (
            card.id === cardId ? { ...card, type: 'attribute', attributeType: nextType } : card
        ));

        setLocalCards(updatedCards);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: sanitize(updatedCards)
            });
        } catch (err) {
            console.error('Error updating card attribute type:', err);
        }
    };

    const persistCardGroups = async (groups) => {
        if (!activeDeck || !canEditActiveDeck) return;
        const normalizedGroups = normalizeCardGroups(groups, localCards);
        pendingCardGroupsSignatureRef.current = JSON.stringify(normalizedGroups);
        setLocalCardGroups(normalizedGroups);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cardGroups: sanitize(normalizedGroups)
            });
        } catch (err) {
            pendingCardGroupsSignatureRef.current = null;
            setLocalCardGroups(normalizeCardGroups(activeDeck.cardGroups || [], localCards));
            console.error('Error saving card groups:', err);
        }
    };

    const handleCreateCardGroup = async (event) => {
        event?.preventDefault?.();
        const name = newCardGroupName.trim();
        if (!name || !activeDeck || !canEditActiveDeck) return;
        const nextGroup = {
            id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: name.slice(0, 40),
            cardIds: [],
            createdAt: Date.now()
        };
        await persistCardGroups([...localCardGroups, nextGroup]);
        setNewCardGroupName('');
        setIsCreatingCardGroup(false);
        setCardGroupViewMode('grouped');
        setActiveCardTypeFilter(null);
    };

    const handleDeleteCardGroup = async (groupId) => {
        await persistCardGroups(removeCardGroup(localCardGroups, groupId));
        if (expandedCardGroupId === groupId) setExpandedCardGroupId(null);
    };

    const handleRemoveCardFromGroup = async (cardId) => {
        await persistCardGroups(moveCardToGroup(localCardGroups, cardId, null));
    };

    const handleCreateAttributeGroups = async () => {
        if (!activeDeck || !canEditActiveDeck) return;
        const alreadyGrouped = getGroupedCardIds(localCardGroups);
        const attributeGroups = buildAttributeCardGroups(localCards, masterLibraryTemplates);
        let nextGroups = [...localCardGroups];

        ATTRIBUTE_STACKS.filter((stack) => stack.id !== UNCLASSIFIED_ATTRIBUTE_TYPE).forEach((stack) => {
            const cardIds = (attributeGroups[stack.id] || [])
                .map((card) => card.id)
                .filter((cardId) => !alreadyGrouped.has(cardId));
            if (cardIds.length === 0) return;

            const existingIndex = nextGroups.findIndex((group) => group.name.toLowerCase() === stack.label.toLowerCase());
            if (existingIndex >= 0) {
                nextGroups[existingIndex] = {
                    ...nextGroups[existingIndex],
                    cardIds: [...nextGroups[existingIndex].cardIds, ...cardIds]
                };
            } else {
                nextGroups.push({
                    id: `group-${stack.id.toLowerCase()}-${Date.now()}`,
                    name: stack.label,
                    cardIds,
                    createdAt: Date.now()
                });
            }
        });

        await persistCardGroups(nextGroups);
        setCardGroupViewMode('grouped');
        setActiveCardTypeFilter(null);
    };

    const handleToggleCardVisibility = async (cardId) => {
        if (!activeDeck || !canManageActiveCardVisibility) return;
        const updatedCards = localCards.map(card => (
            card.id === cardId
                ? { ...card, visibleToPlayers: card.visibleToPlayers === false }
                : card
        ));

        setLocalCards(updatedCards);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: sanitize(updatedCards)
            });
        } catch (err) {
            console.error("Error updating card visibility:", err);
        }
    };

    const handleUpdateLibraryPermission = async (playerName, access) => {
        if (!activeDeck || !canManageActiveLibraryPermissions || !playerName) return;
        const permissions = { ...(activeDeck.permissions || {}) };
        if (access === COLLECTION_ACCESS.HIDDEN) {
            delete permissions[playerName];
        } else {
            permissions[playerName] = access;
        }

        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), { permissions });
        } catch (err) {
            console.error("Error updating library permissions:", err);
        }
    };

    const getCardNameFromFile = (fileName = '') => {
        const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        return cleanName || 'Carta sin nombre';
    };

    const handleUploadLibraryCard = async (event) => {
        const file = event.target.files?.[0];
        if (event.target) {
            event.target.value = '';
        }
        if (!file || !activeDeck || !activeDeckIsMasterLibrary || !canEditActiveDeck) return;
        if (!file.type?.startsWith('image/')) {
            alert('Selecciona una imagen para subir la carta.');
            return;
        }

        setIsUploadingLibraryCard(true);
        try {
            const cardId = Math.random().toString(36).substr(2, 9);
            const extension = file.name.split('.').pop() || 'png';
            const frontUrl = await uploadFile(
                file,
                `deck-library-cards/${activeDeck.id}/${Date.now()}-${cardId}.${extension}`
            );
            const newCard = {
                id: cardId,
                templateId: cardId,
                name: getCardNameFromFile(file.name),
                frontUrl,
                type: 'action',
                visibleToPlayers: true
            };
            const updatedCards = [...localCards, newCard];
            setLocalCards(updatedCards);
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: sanitize(updatedCards)
            });
        } catch (err) {
            console.error("Error uploading library card:", err);
            alert('No se pudo subir la carta a la colección.');
        } finally {
            setIsUploadingLibraryCard(false);
        }
    };

    const handleDownloadTemplateCard = async (template, event) => {
        event.stopPropagation();
        if (!template?.frontUrl) return;
        const safeName = (template.name || 'carta')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'carta';

        try {
            const response = await fetch(template.frontUrl);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${safeName}.png`;
            link.click();
            URL.revokeObjectURL(objectUrl);
        } catch (err) {
            console.error('Error downloading template card:', err);
            const link = document.createElement('a');
            link.href = template.frontUrl;
            link.download = `${safeName}.png`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
        }
    };

    const getDropTargetCardId = (clientX, clientY, excludedCardId) => {
        if (typeof document === 'undefined') return null;
        const element = document.elementFromPoint(clientX, clientY);
        const cardElement = element?.closest?.('[data-deck-card-id]');
        const targetId = cardElement?.getAttribute('data-deck-card-id');
        return targetId && targetId !== excludedCardId ? targetId : null;
    };

    const getDropTargetGroupId = (clientX, clientY, excludedGroupId = null) => {
        if (typeof document === 'undefined') return null;
        const element = document.elementFromPoint(clientX, clientY);
        const targetId = element?.closest?.('[data-card-group-id]')?.getAttribute('data-card-group-id');
        return targetId && targetId !== excludedGroupId ? targetId : null;
    };

    const swapCardsById = (cards, draggedId, targetId) => {
        const draggedIdx = cards.findIndex(card => card.id === draggedId);
        const targetIdx = cards.findIndex(card => card.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return cards;

        const updatedCards = [...cards];
        [updatedCards[draggedIdx], updatedCards[targetIdx]] = [updatedCards[targetIdx], updatedCards[draggedIdx]];
        return updatedCards;
    };

    const getDropTargetLibraryDeckId = (clientX, clientY, excludedDeckId) => {
        if (typeof document === 'undefined') return null;
        const element = document.elementFromPoint(clientX, clientY);
        const deckElement = element?.closest?.('[data-library-deck-id]');
        const targetId = deckElement?.getAttribute('data-library-deck-id');
        return targetId && targetId !== excludedDeckId ? targetId : null;
    };

    const getDropTargetNormalDeckId = (clientX, clientY, excludedDeckId) => {
        if (typeof document === 'undefined') return null;
        const element = document.elementFromPoint(clientX, clientY);
        const deckElement = element?.closest?.('[data-normal-deck-id]');
        const targetId = deckElement?.getAttribute('data-normal-deck-id');
        return targetId && targetId !== excludedDeckId ? targetId : null;
    };

    const swapDecksById = (items, draggedId, targetId) => {
        const draggedIdx = items.findIndex(deck => deck.id === draggedId);
        const targetIdx = items.findIndex(deck => deck.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return items;

        const updatedItems = [...items];
        [updatedItems[draggedIdx], updatedItems[targetIdx]] = [updatedItems[targetIdx], updatedItems[draggedIdx]];
        return updatedItems;
    };

    const clearDragListeners = () => {
        const state = dragStateRef.current;
        if (!state) return;
        window.removeEventListener('pointermove', state.handlePointerMove);
        window.removeEventListener('pointerup', state.handlePointerUp);
        window.removeEventListener('pointercancel', state.handlePointerUp);
    };

    const clearCardGroupDragListeners = () => {
        const state = cardGroupDragStateRef.current;
        if (!state) return;
        window.removeEventListener('pointermove', state.handlePointerMove);
        window.removeEventListener('pointerup', state.handlePointerUp);
        window.removeEventListener('pointercancel', state.handlePointerUp);
    };

    const clearNormalDeckDragListeners = () => {
        const state = normalDeckDragStateRef.current;
        if (!state) return;
        window.removeEventListener('pointermove', state.handlePointerMove);
        window.removeEventListener('pointerup', state.handlePointerUp);
        window.removeEventListener('pointercancel', state.handlePointerUp);
    };

    const clearLibraryDragListeners = () => {
        const state = libraryDragStateRef.current;
        if (!state) return;
        window.removeEventListener('pointermove', state.handlePointerMove);
        window.removeEventListener('pointerup', state.handlePointerUp);
        window.removeEventListener('pointercancel', state.handlePointerUp);
    };

    const finishNormalDeckDrag = async (clientX, clientY) => {
        const state = normalDeckDragStateRef.current;
        if (!state) return;

        clearNormalDeckDragListeners();
        normalDeckDragStateRef.current = null;

        const targetId = getDropTargetNormalDeckId(clientX, clientY, state.deck.id);
        const updatedDecks = targetId ? swapDecksById(normalDecks, state.deck.id, targetId) : normalDecks;
        const hasSwapped = updatedDecks !== normalDecks;
        normalDeckDragClickBlockedRef.current = state.hasMoved || hasSwapped;

        setDraggedNormalDeckId(null);
        setNormalDeckDropTargetId(null);

        if (!hasSwapped) return;

        try {
            await Promise.all(updatedDecks.map((deck, index) => (
                updateDoc(doc(db, 'card_decks', deck.id), { sortOrder: index })
            )));
        } catch (err) {
            console.error("Error saving deck order:", err);
        }
    };

    const handleNormalDeckPointerDown = (event, deck) => {
        if (!canReorderNormalDecks) return;
        if (event.button !== undefined && event.button !== 0) return;

        event.preventDefault();

        const handlePointerMove = (moveEvent) => {
            if (normalDeckDragStateRef.current) {
                normalDeckDragStateRef.current.hasMoved = true;
            }
            const targetId = getDropTargetNormalDeckId(moveEvent.clientX, moveEvent.clientY, deck.id);
            setNormalDeckDropTargetId(targetId);
        };

        const handlePointerUp = (upEvent) => {
            finishNormalDeckDrag(upEvent.clientX, upEvent.clientY);
        };

        normalDeckDragStateRef.current = {
            deck,
            handlePointerMove,
            handlePointerUp,
            hasMoved: false
        };

        setDraggedNormalDeckId(deck.id);
        setNormalDeckDropTargetId(null);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    const finishLibraryDeckDrag = async (clientX, clientY) => {
        const state = libraryDragStateRef.current;
        if (!state) return;

        clearLibraryDragListeners();
        libraryDragStateRef.current = null;

        const targetId = getDropTargetLibraryDeckId(clientX, clientY, state.deck.id);
        const updatedDecks = targetId ? swapDecksById(libraryDecks, state.deck.id, targetId) : libraryDecks;
        const hasSwapped = updatedDecks !== libraryDecks;
        libraryDragClickBlockedRef.current = state.hasMoved || hasSwapped;

        setDraggedLibraryDeckId(null);
        setLibraryDropTargetId(null);

        if (!hasSwapped) return;

        try {
            await Promise.all(updatedDecks.map((deck, index) => (
                updateDoc(doc(db, 'card_decks', deck.id), { sortOrder: index })
            )));
        } catch (err) {
            console.error("Error saving library deck order:", err);
        }
    };

    const handleLibraryDeckPointerDown = (event, deck) => {
        if (!canReorderLibraryDecks) return;
        if (event.button !== undefined && event.button !== 0) return;

        event.preventDefault();

        const handlePointerMove = (moveEvent) => {
            if (libraryDragStateRef.current) {
                libraryDragStateRef.current.hasMoved = true;
            }
            const targetId = getDropTargetLibraryDeckId(moveEvent.clientX, moveEvent.clientY, deck.id);
            setLibraryDropTargetId(targetId);
        };

        const handlePointerUp = (upEvent) => {
            finishLibraryDeckDrag(upEvent.clientX, upEvent.clientY);
        };

        libraryDragStateRef.current = {
            deck,
            handlePointerMove,
            handlePointerUp,
            hasMoved: false
        };

        setDraggedLibraryDeckId(deck.id);
        setLibraryDropTargetId(null);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    const finishCardGroupDrag = async (clientX, clientY) => {
        const state = cardGroupDragStateRef.current;
        if (!state) return;

        clearCardGroupDragListeners();
        cardGroupDragStateRef.current = null;

        const targetId = state.hasMoved
            ? getDropTargetGroupId(clientX, clientY, state.group.id)
            : null;
        const reorderedGroups = targetId
            ? swapCardGroupsById(localCardGroups, state.group.id, targetId)
            : localCardGroups;
        const hasSwapped = reorderedGroups !== localCardGroups;

        if (state.hasMoved || hasSwapped) {
            cardGroupDragClickBlockedUntilRef.current = Date.now() + 350;
        }

        setDraggedCardGroupId(null);
        setCardGroupOrderTargetId(null);
        setCardGroupDragPreview(null);

        if (hasSwapped) await persistCardGroups(reorderedGroups);
    };

    const handleCardGroupPointerDown = (event, group) => {
        if (!activeDeck || !canEditActiveDeck) return;
        if (event.button !== undefined && event.button !== 0) return;

        event.stopPropagation();

        const startX = event.clientX;
        const startY = event.clientY;
        const groupRect = event.currentTarget.getBoundingClientRect();
        const initialPreview = {
            group,
            cards: group.cards || [],
            width: groupRect.width,
            offsetX: event.clientX - groupRect.left,
            offsetY: event.clientY - groupRect.top,
            x: event.clientX,
            y: event.clientY
        };

        const handlePointerMove = (moveEvent) => {
            const state = cardGroupDragStateRef.current;
            if (!state) return;
            if (!state.hasMoved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 6) {
                return;
            }

            moveEvent.preventDefault();
            if (!state.hasMoved) {
                state.hasMoved = true;
                setDraggedCardGroupId(group.id);
                setCardGroupDragPreview({
                    ...initialPreview,
                    x: moveEvent.clientX,
                    y: moveEvent.clientY
                });
            } else {
                setCardGroupDragPreview((current) => current ? {
                    ...current,
                    x: moveEvent.clientX,
                    y: moveEvent.clientY
                } : current);
            }
            const targetId = getDropTargetGroupId(moveEvent.clientX, moveEvent.clientY, group.id);
            setCardGroupOrderTargetId(targetId);
        };

        const handlePointerUp = (upEvent) => {
            finishCardGroupDrag(upEvent.clientX, upEvent.clientY);
        };

        cardGroupDragStateRef.current = {
            group,
            handlePointerMove,
            handlePointerUp,
            hasMoved: false
        };

        setCardGroupOrderTargetId(null);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    const handleOpenCardGroup = (groupId) => {
        if (Date.now() < cardGroupDragClickBlockedUntilRef.current) return;
        setExpandedCardGroupId(groupId);
    };

    const finishDrag = async (clientX, clientY) => {
        const state = dragStateRef.current;
        if (!state) return;

        clearDragListeners();
        dragStateRef.current = null;

        const targetGroupId = getDropTargetGroupId(clientX, clientY);
        const targetId = targetGroupId ? null : getDropTargetCardId(clientX, clientY, state.card.id);
        const updatedCards = targetId ? swapCardsById(localCards, state.card.id, targetId) : localCards;
        const hasSwapped = updatedCards !== localCards;
        const currentGroup = localCardGroups.find((group) => group.cardIds.includes(state.card.id));
        const hasChangedGroup = Boolean(targetGroupId && currentGroup?.id !== targetGroupId);

        setDraggedCardId(null);
        setDropTargetCardId(null);
        setDropTargetGroupId(null);
        setDragPreview(null);

        if (!activeDeck || !canEditActiveDeck || (!hasSwapped && !hasChangedGroup)) return;

        if (hasChangedGroup) {
            await persistCardGroups(moveCardToGroup(localCardGroups, state.card.id, targetGroupId));
            return;
        }

        pendingCardsSignatureRef.current = JSON.stringify(updatedCards.map((card) => card.id));
        setLocalCards(updatedCards);

        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: sanitize(updatedCards)
            });
        } catch (err) {
            pendingCardsSignatureRef.current = null;
            setLocalCards(activeDeck.cards || []);
            console.error("Error saving card order:", err);
        }
    };

    const handleCardPointerDown = (event, card) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (!activeDeck) return;

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const initialPreview = {
            card,
            width: rect.width,
            height: rect.height,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            x: event.clientX,
            y: event.clientY
        };

        const isTouchLikePointer = event.pointerType === 'touch' || event.pointerType === 'pen';
        const canDragCard = canEditActiveDeck;
        const pointerId = event.pointerId;
        const startX = event.clientX;
        const startY = event.clientY;
        let previewOpenedByHold = false;
        let dragStarted = false;

        const cleanupTouchHold = () => {
            window.removeEventListener('pointermove', handleTouchPointerMove);
            window.removeEventListener('pointerup', handleTouchPointerUp);
            window.removeEventListener('pointercancel', handleTouchPointerUp);
        };

        const updateDragFromPointer = (moveEvent) => {
            const targetGroupId = getDropTargetGroupId(moveEvent.clientX, moveEvent.clientY);
            const targetId = targetGroupId
                ? null
                : getDropTargetCardId(moveEvent.clientX, moveEvent.clientY, card.id);
            setDropTargetGroupId(targetGroupId);
            setDropTargetCardId(targetId);
            setDragPreview(prev => prev ? {
                ...prev,
                x: moveEvent.clientX,
                y: moveEvent.clientY
            } : prev);
        };

        function beginTouchDrag(moveEvent) {
            if (dragStarted || !canDragCard) return;
            dragStarted = true;
            dragStateRef.current = {
                card,
                handlePointerMove: handleTouchPointerMove,
                handlePointerUp: handleTouchPointerUp
            };
            setDraggedCardId(card.id);
            setDropTargetCardId(null);
            setDropTargetGroupId(null);
            setDragPreview({
                ...initialPreview,
                x: moveEvent.clientX,
                y: moveEvent.clientY
            });
        }

        function handleTouchPointerMove(moveEvent) {
            if (moveEvent.pointerId !== pointerId) return;
            if (previewOpenedByHold) {
                moveEvent.preventDefault();
                return;
            }

            const moved = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (!dragStarted && moved > 12) {
                window.clearTimeout(cardPreviewHoldRef.current?.timer);
                if (!canDragCard) {
                    cleanupTouchHold();
                    cardPreviewHoldRef.current = null;
                    return;
                }
                beginTouchDrag(moveEvent);
            }

            if (dragStarted) {
                moveEvent.preventDefault();
                updateDragFromPointer(moveEvent);
            }
        }

        function handleTouchPointerUp(upEvent) {
            if (upEvent.pointerId !== pointerId) return;
            window.clearTimeout(cardPreviewHoldRef.current?.timer);
            if (dragStarted) {
                finishDrag(upEvent.clientX, upEvent.clientY);
            } else if (previewOpenedByHold) {
                handleCloseCardPreview();
            }
            cleanupTouchHold();
            cardPreviewHoldRef.current = null;
        }

        if (isTouchLikePointer) {
            const previousHold = cardPreviewHoldRef.current;
            if (previousHold) {
                window.clearTimeout(previousHold.timer);
                previousHold.cleanup?.();
            }

            const timer = window.setTimeout(() => {
                previewOpenedByHold = true;
                handleOpenCardPreview(card);
            }, 480);

            window.addEventListener('pointermove', handleTouchPointerMove, { passive: false });
            window.addEventListener('pointerup', handleTouchPointerUp);
            window.addEventListener('pointercancel', handleTouchPointerUp);
            cardPreviewHoldRef.current = { timer, cleanup: cleanupTouchHold };
            return;
        }

        if (!canDragCard) return;

        const handlePointerMove = (moveEvent) => {
            updateDragFromPointer(moveEvent);
        };

        const handlePointerUp = (upEvent) => {
            finishDrag(upEvent.clientX, upEvent.clientY);
        };

        dragStateRef.current = {
            card,
            handlePointerMove,
            handlePointerUp
        };

        setDraggedCardId(card.id);
        setDropTargetCardId(null);
        setDropTargetGroupId(null);
        setDragPreview(initialPreview);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    // Stats counter helper
    const getCardCounts = (deck) => {
        const counts = CARD_TYPES.reduce((acc, type) => {
            acc[type.id] = 0;
            return acc;
        }, {});
        (deck.cards || []).forEach(c => {
            if (counts[c.type] !== undefined) {
                counts[c.type]++;
            } else {
                counts.action++; // Fallback
            }
        });
        return counts;
    };

    const masterLibraryTemplates = visibleDecks
        .filter(deck => isMasterLibraryDeck(deck) && deck.id !== activeDeck?.id)
        .flatMap(deck => {
            const access = getDeckAccessForViewer(deck, viewerId);
            const canSeeHiddenCards = !isPlayer || access === COLLECTION_ACCESS.EDIT;
            return (deck.cards || [])
                .filter(card => canSeeHiddenCards || card.visibleToPlayers !== false)
                .map(card => ({
                    ...card,
                    id: `library:${deck.id}:${card.id}`,
                    templateId: card.templateId || card.id,
                    sourceDeckId: deck.id,
                    sourceDeckName: deck.name,
                    sourceType: 'master_library'
                }));
        });

    const filteredTemplates = filterCardTemplates(masterLibraryTemplates, searchTemplate);
    const hasTemplateSearch = searchTemplate.trim().length > 0;

    const visibleActiveCards = activeDeckIsMasterLibrary && isPlayer && activeDeckAccess === COLLECTION_ACCESS.READ
        ? localCards.filter(card => card.visibleToPlayers !== false)
        : localCards;
    const displayedCards = activeCardTypeFilter
        ? visibleActiveCards.filter(card => (card.type || 'action') === activeCardTypeFilter)
        : visibleActiveCards;
    const activeCardType = CARD_TYPES.find(type => type.id === activeCardTypeFilter);
    const activeDeckCardCounts = getCardCounts({ cards: visibleActiveCards });
    const visibleCardsById = new Map(visibleActiveCards.map((card) => [card.id, card]));
    const visibleCardGroups = localCardGroups
        .map((group) => ({
            ...group,
            cards: group.cardIds.map((cardId) => visibleCardsById.get(cardId)).filter(Boolean)
        }))
        .filter((group) => canEditActiveDeck || group.cards.length > 0);
    const groupedCardIds = getGroupedCardIds(localCardGroups);
    const canShowCardGroups = visibleCardGroups.length > 0 && !activeCardTypeFilter;
    const isCardGroupingActive = canShowCardGroups && cardGroupViewMode === 'grouped';
    const expandedCardGroup = visibleCardGroups.find((group) => group.id === expandedCardGroupId);
    const cardGroupOrderTarget = localCardGroups.find((group) => group.id === cardGroupOrderTargetId);
    const cardDropTarget = localCards.find((card) => card.id === dropTargetCardId);
    const cardDropGroup = localCardGroups.find((group) => group.id === dropTargetGroupId);
    const flatCardsForCurrentView = isCardGroupingActive
        ? (expandedCardGroup
            ? expandedCardGroup.cards
            : displayedCards.filter((card) => !groupedCardIds.has(card.id)))
        : displayedCards;
    const ungroupedAttributeCount = visibleActiveCards.filter((card) => (
        (card.type || 'action') === 'attribute' && !groupedCardIds.has(card.id)
    )).length;

    useEffect(() => {
        if (!expandedCardGroupId) return;
        const groupStillExists = visibleCardGroups.some((group) => group.id === expandedCardGroupId);
        if (!isCardGroupingActive || !groupStillExists) {
            setExpandedCardGroupId(null);
        }
    }, [expandedCardGroupId, isCardGroupingActive, visibleCardGroups]);

    const setCardGroupDisplayMode = (mode) => {
        setCardGroupViewMode(mode);
        setExpandedCardGroupId(null);
    };

    return (
        <div className="w-full h-screen max-h-screen overflow-y-auto custom-scrollbar bg-[#09090b] pb-20 md:pb-0">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Lato:wght@300;400;700&display=swap');
                
                .font-cinzel {
                    font-family: 'Cinzel', serif;
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.3);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(200, 170, 110, 0.2);
                    border-radius: 9999px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(200, 170, 110, 0.4);
                }

                .archive-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #8f7848 #080b10;
                    scrollbar-gutter: stable;
                }
                .archive-scrollbar::-webkit-scrollbar {
                    width: 9px;
                    height: 9px;
                }
                .archive-scrollbar::-webkit-scrollbar-track {
                    background: #080b10;
                    border-left: 1px solid rgba(117, 99, 63, 0.28);
                    box-shadow: inset 2px 0 4px rgba(0, 0, 0, 0.35);
                }
                .archive-scrollbar::-webkit-scrollbar-thumb {
                    min-height: 38px;
                    border: 2px solid #080b10;
                    border-radius: 2px;
                    background: linear-gradient(
                        90deg,
                        #5f4d2d 0%,
                        #a98b50 48%,
                        #715b34 100%
                    );
                    box-shadow: inset 0 0 0 1px rgba(238, 215, 163, 0.2);
                }
                .archive-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(
                        90deg,
                        #79623a 0%,
                        #c3a461 48%,
                        #8b7040 100%
                    );
                }
                .archive-scrollbar::-webkit-scrollbar-button,
                .archive-scrollbar::-webkit-scrollbar-corner {
                    display: none;
                    width: 0;
                    height: 0;
                    background: transparent;
                }
                `}
            </style>

            <div className="max-w-7xl mx-auto p-4 pt-12 md:p-8 lg:p-12">
                <AnimatePresence mode="wait">
                    {/* 1. VIEW MODE: CATALOG OF FOLDERS / DECKS */}
                    {!activeDeck ? (
                        <motion.div 
                            key="catalog"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full flex flex-col"
                        >
                            {/* Header Panel matching CardBuilder */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 border-b border-[#c8aa6e]/20 pb-4 md:pb-6 gap-4">
                                <div>
                                    <h1 className="text-3xl font-fantasy text-[#f0e6d2] mb-2 uppercase tracking-wider drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)] md:text-4xl">
                                        Colección de Barajas
                                    </h1>
                                    <p className="text-slate-400 text-xs uppercase tracking-widest">
                                        Gestor de baraja y cartas del sistema — {ownerName}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onBack && (
                                        <button
                                            type="button"
                                            onClick={onBack}
                                            className="group inline-flex items-center justify-center gap-2 border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 px-4 py-2.5 font-fantasy text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e] transition-all hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 mr-2 rounded"
                                        >
                                            <FiArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                                            Volver
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setNewDeckModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#785a28] to-[#c8aa6e] text-[#09090b] font-bold text-xs uppercase tracking-widest rounded transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(200,170,110,0.3)]"
                                    >
                                        <FiPlus className="stroke-[3]" /> {isPlayer ? 'Crear Baraja' : 'Crear Baraja / Colección'}
                                    </button>
                                </div>
                            </div>

                            {/* Decks Grid */}
                            {normalDecks.length === 0 && libraryDecks.length === 0 ? (
                                <div className="w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 bg-slate-950/20">
                                    <FiLayers className="w-16 h-16 text-[#c8aa6e]/30 mb-4 stroke-[1]" />
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sin barajas disponibles</h4>
                                    <p className="text-xs text-slate-500 mt-2 text-center max-w-sm">
                                        Haz clic en el botón superior para crear tu primer mazo y empezar a coleccionar tus cartas tácticas.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                                    {catalogDeckItems.map((deck) => {
                                        if (deck.isSeparator) {
                                            return (
                                                <div key={deck.id} className="col-span-full mt-4 flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                                                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-950/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                                                        <Database className="h-3.5 w-3.5" />
                                                        Colecciones base
                                                    </div>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                                                </div>
                                            );
                                        }
                                        const counts = getCardCounts(deck);
                                        const totalCards = (deck.cards || []).length;
                                        const isEditingName = editingDeckName === deck.id;
                                        const isLibrary = isMasterLibraryDeck(deck);
                                        const deckAccess = getDeckAccessForViewer(deck, viewerId);
                                        const canEditDeckCards = !isPlayer || deck.ownerId === ownerId || deckAccess === COLLECTION_ACCESS.EDIT;
                                        const canManageDeckActions = !isPlayer || (deck.ownerId === ownerId && !isLibrary);
                                        const canChangeDeckColor = !isPlayer || (deck.ownerId === ownerId && !isLibrary) || (isLibrary && deckAccess === COLLECTION_ACCESS.EDIT);
                                        const deckTheme = getDeckColorTheme(deck.color, isLibrary);
                                        const isDraggingNormalDeck = draggedNormalDeckId === deck.id;
                                        const isNormalDropTarget = normalDeckDropTargetId === deck.id;
                                        const isDraggingLibraryDeck = draggedLibraryDeckId === deck.id;
                                        const isLibraryDropTarget = libraryDropTargetId === deck.id;
                                        const isDropTargetDeck = isLibraryDropTarget || isNormalDropTarget;

                                        return (
                                            <motion.div
                                                key={deck.id}
                                                data-normal-deck-id={!isLibrary ? deck.id : undefined}
                                                data-library-deck-id={isLibrary ? deck.id : undefined}
                                                onPointerDown={(event) => {
                                                    if (isLibrary) {
                                                        handleLibraryDeckPointerDown(event, deck);
                                                    } else {
                                                        handleNormalDeckPointerDown(event, deck);
                                                    }
                                                }}
                                                onClick={() => {
                                                    if (normalDeckDragClickBlockedRef.current) {
                                                        normalDeckDragClickBlockedRef.current = false;
                                                        return;
                                                    }
                                                    if (libraryDragClickBlockedRef.current) {
                                                        libraryDragClickBlockedRef.current = false;
                                                        return;
                                                    }
                                                    if (!isEditingName) setActiveDeck(deck);
                                                }}
                                                className={`group relative flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${(canReorderLibraryDecks && isLibrary) || (canReorderNormalDecks && !isLibrary) ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDraggingLibraryDeck || isDraggingNormalDeck ? 'opacity-45 scale-[0.985]' : ''} ${isDropTargetDeck ? 'scale-[1.02]' : ''}`}
                                            >
                                                <AnimatePresence>
                                                    {isDropTargetDeck && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.97 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.98 }}
                                                            className={`pointer-events-none absolute -inset-3 z-0 rounded-xl border shadow-[0_0_30px_rgba(16,185,129,0.20)] ${isLibrary ? 'border-emerald-300/55 bg-emerald-400/10' : 'border-[#c8aa6e]/60 bg-[#c8aa6e]/10'}`}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                                {/* Visual Folder Container */}
                                                <div className="w-full relative aspect-[4/3] flex flex-col items-center justify-end group/folder mb-3 overflow-visible">
                                                    {/* Folder Back */}
                                                    <div
                                                        className="absolute inset-0 rounded-lg border transition-all duration-300 group-hover/folder:brightness-110"
                                                        style={{
                                                            backgroundColor: deckTheme.back,
                                                            borderColor: deckTheme.border,
                                                            boxShadow: `inset 0 1px 0 ${deckTheme.glow}`
                                                        }}
                                                    >
                                                        {/* Folder Tab */}
                                                        <div
                                                            className="absolute -top-3 left-3 h-3 w-20 rounded-t-md border-x border-t transition-all duration-300"
                                                            style={{
                                                                backgroundColor: deckTheme.tab,
                                                                borderColor: deckTheme.border
                                                            }}
                                                        ></div>
                                                    </div>

                                                    {isLibrary && (
                                                        <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-950/70 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.14)] backdrop-blur-md">
                                                            <Database className="h-3 w-3" />
                                                            Colección base
                                                        </div>
                                                    )}

                                                    {/* 3 stacked cards peeking out of folder */}
                                                    <div className="absolute inset-x-0 bottom-2 top-2 flex items-center justify-center overflow-visible">
                                                        {deck.cards && deck.cards.length > 0 ? (
                                                            deck.cards.slice(0, 3).map((card, idx) => {
                                                                const rot = (idx - 1) * 8; // -8, 0, 8
                                                                const shiftX = (idx - 1) * 16; // -16px, 0, 16px
                                                                const shiftY = idx === 1 ? -6 : 0;
                                                                return (
                                                                    <div
                                                                        key={card.id}
                                                                        className="absolute aspect-[3/4.2] h-[85%] rounded border border-slate-700/50 shadow-lg overflow-hidden bg-[#161a23] transition-transform duration-300 group-hover/folder:scale-105"
                                                                        style={{
                                                                            transform: `translate(${shiftX}px, ${shiftY}px) rotate(${rot}deg)`,
                                                                            zIndex: idx + 2,
                                                                            opacity: 1 - (2 - idx) * 0.15
                                                                        }}
                                                                    >
                                                                        {card.frontUrl ? (
                                                                            <img 
                                                                                src={card.frontUrl} 
                                                                                alt="" 
                                                                                className="w-full h-full object-cover select-none pointer-events-none"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full bg-[#161a23] flex items-center justify-center p-1 border border-dashed border-[#c8aa6e]/20">
                                                                                <span className="text-[6px] text-slate-500 uppercase tracking-widest text-center truncate">{card.name}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="opacity-15 group-hover/folder:opacity-30 transition-opacity flex items-center justify-center h-full z-10">
                                                                <FiLayers className="w-8 h-8 stroke-[1.5]" style={{ color: deckTheme.color }} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Folder Front Cover/Flap */}
                                                    <div
                                                        className="absolute bottom-0 inset-x-0 h-[48%] rounded-b-lg border-t transition-all duration-300 flex items-center justify-center z-10"
                                                        style={{
                                                            backgroundColor: deckTheme.front,
                                                            borderColor: deckTheme.border,
                                                            boxShadow: `0 -5px 15px rgba(0,0,0,0.5), inset 0 1px 0 ${deckTheme.glow}`
                                                        }}
                                                    >
                                                        <span
                                                            className="text-[9px] font-bold uppercase tracking-wider bg-black/45 px-2 py-0.5 rounded border"
                                                            style={{
                                                                color: deckTheme.color,
                                                                borderColor: deckTheme.border
                                                            }}
                                                        >
                                                            {totalCards} {totalCards === 1 ? 'Carta' : 'Cartas'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Text and stats below the folder */}
                                                <div className="px-1 flex flex-col gap-1.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            {isEditingName ? (
                                                                <div className="flex items-center gap-1 onClick-stopPropagation" onClick={e => e.stopPropagation()}>
                                                                    <input
                                                                        type="text"
                                                                        value={editDeckNameText}
                                                                        onChange={(e) => setEditDeckNameText(e.target.value)}
                                                                        className="w-full bg-[#1b2130] border border-[#c8aa6e] text-xs text-[#f0e6d2] font-bold p-1 px-2 rounded outline-none"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleRenameDeck(deck.id, e);
                                                                            if (e.key === 'Escape') setEditingDeckName(null);
                                                                        }}
                                                                    />
                                                                    <button 
                                                                        onClick={(e) => handleRenameDeck(deck.id, e)}
                                                                        className="p-1.5 bg-[#c8aa6e] text-slate-950 rounded hover:bg-white"
                                                                    >
                                                                        <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <h4 className="font-cinzel text-base font-bold text-[#f0e6d2] uppercase tracking-wide group-hover:text-[#c8aa6e] transition-colors leading-tight truncate">
                                                                        {deck.name}
                                                                    </h4>
                                                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1 inline-block">
                                                                        {isLibrary ? (canEditDeckCards ? 'base editable' : 'base lectura') : 'cartas'}: {totalCards}
                                                                    </span>
                                                                    {canChangeDeckColor && (
                                                                        <div
                                                                            className="mt-2 flex flex-wrap items-center gap-1.5"
                                                                            onClick={e => e.stopPropagation()}
                                                                            onPointerDown={e => e.stopPropagation()}
                                                                            aria-label="Color de baraja"
                                                                        >
                                                                            {DECK_COLOR_THEMES.map(theme => {
                                                                                const isSelectedColor = deckTheme.id === theme.id;
                                                                                return (
                                                                                    <button
                                                                                        key={theme.id}
                                                                                        type="button"
                                                                                        title={`Color ${theme.label}`}
                                                                                        aria-label={`Color ${theme.label}`}
                                                                                        aria-pressed={isSelectedColor}
                                                                                        onClick={(e) => handleUpdateDeckColor(deck.id, theme.id, e)}
                                                                                        className={`relative h-3.5 w-3.5 rounded-full border transition-all duration-150 hover:border-[#f0e6d2]/70 ${isSelectedColor ? 'border-[#f0e6d2]/85' : 'border-slate-600/70'}`}
                                                                                        style={{
                                                                                            backgroundColor: theme.color,
                                                                                            boxShadow: isSelectedColor ? `0 0 0 2px #080b10, 0 0 0 3px ${theme.border}` : 'none'
                                                                                        }}
                                                                                    >
                                                                                        {isSelectedColor && (
                                                                                            <span className="absolute inset-[3px] rounded-full bg-[#080b10]/75" />
                                                                                        )}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        {canManageDeckActions && (
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        setEditingDeckName(deck.id);
                                                                        setEditDeckNameText(deck.name);
                                                                    }}
                                                                    className="p-1 text-slate-500 hover:text-[#c8aa6e] rounded hover:bg-slate-800/50"
                                                                >
                                                                    <FiEdit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => handleDeleteDeck(deck.id, e)}
                                                                    className="p-1 text-slate-500 hover:text-red-500 rounded hover:bg-slate-800/50"
                                                                >
                                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* 2. VIEW MODE: DETAILED DECK INTERIOR */
                        <motion.div 
                            key="deck-detail"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="w-full flex flex-col"
                        >
                            {/* Header Panel matching ProgressionView */}
                            <div
                                className="relative mb-5 flex flex-col gap-3 overflow-hidden sm:mb-8 sm:border-b sm:pb-4 md:mb-12 md:pb-6 xl:flex-row xl:items-center xl:justify-between"
                                style={{ borderColor: activeDeckTheme.border }}
                            >
                                <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 sm:flex sm:gap-4">
                                    <button 
                                        onClick={() => setActiveDeck(null)}
                                        className="flex h-11 w-11 items-center justify-center rounded bg-slate-800 text-slate-400 transition-all hover:bg-[#c8aa6e] hover:text-slate-950"
                                        title="Volver a barajas"
                                        aria-label="Volver a barajas"
                                    >
                                        <FiArrowLeft className="w-5 h-5 stroke-[2.5]" />
                                    </button>
                                    <div className="relative z-10 flex min-w-0 items-center justify-between gap-3 sm:block">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:mb-2">
                                            <h2 className="truncate font-fantasy text-2xl uppercase text-[#f0e6d2] sm:text-3xl">{activeDeck.name}</h2>
                                            {activeDeckIsMasterLibrary && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-950/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-200">
                                                    <Database className="h-3 w-3" />
                                                    Colección base
                                                </span>
                                            )}
                                            {!canEditActiveDeck && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/45 bg-slate-950/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                                    <LockKeyhole className="h-3 w-3" />
                                                    Solo lectura
                                                </span>
                                            )}
                                        </div>
                                        <p className="flex shrink-0 flex-col items-end text-right uppercase leading-none sm:hidden">
                                            <span className="text-[7px] font-bold tracking-[0.2em] text-slate-600">Propietario</span>
                                            <span className="mt-1 text-[10px] font-bold tracking-[0.16em]" style={{ color: activeDeckTheme.color }}>
                                                {activeDeck.ownerId === 'master' ? 'Master' : ownerName}
                                            </span>
                                        </p>
                                        <p className="hidden text-xs uppercase tracking-widest text-slate-400 sm:block">
                                            Propietario: <span className="font-bold" style={{ color: activeDeckTheme.color }}>{activeDeck.ownerId === 'master' ? 'Master' : ownerName}</span>
                                        </p>
                                    </div>
                                </div>

                                <CardTypeIndex
                                    counts={activeDeckCardCounts}
                                    activeTypeId={activeCardTypeFilter}
                                    onSelect={setActiveCardTypeFilter}
                                />
                            </div>

                            {/* Main Grid + Sidebar templates within max-w-5xl layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-12">
                                
                                {/* Left Section: Grid of Cards in Active Deck */}
                                <div
                                    className="flex min-w-0 flex-col gap-4 lg:col-span-3"
                                >
                                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                                        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="truncate text-[9px] font-bold uppercase tracking-widest text-[#c8aa6e] sm:text-[10px]">
                                                    {activeDeckIsMasterLibrary ? 'Colección Base' : 'Mi Baraja'} ({displayedCards.length}{activeCardType ? `/${visibleActiveCards.length}` : ''}<span className="hidden sm:inline"> cartas</span>)
                                                </span>
                                                {activeCardType && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveCardTypeFilter(null)}
                                                        className="inline-flex max-w-[90px] shrink-0 items-center gap-1 rounded border border-slate-700/70 bg-slate-950/45 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:border-[#c8aa6e]/50 hover:text-[#f0e6d2]"
                                                    >
                                                        <span className="truncate">{activeCardType.label}</span>
                                                        <FiX className="h-3 w-3 shrink-0" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5 sm:flex-wrap sm:gap-2">
                                            {canShowCardGroups && (
                                                <div
                                                    role="group"
                                                    aria-label="Presentación de las agrupaciones de cartas"
                                                    className="inline-flex overflow-hidden rounded border border-slate-700/70 bg-slate-950/55 p-0.5"
                                                >
                                                    {[
                                                        { id: 'grouped', label: 'Agrupadas' },
                                                        { id: 'all', label: 'Todas' }
                                                    ].map((mode) => (
                                                        <button
                                                            key={mode.id}
                                                            type="button"
                                                            onClick={() => setCardGroupDisplayMode(mode.id)}
                                                            aria-pressed={cardGroupViewMode === mode.id}
                                                            className={`px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] transition-colors sm:px-2.5 sm:tracking-[0.14em] ${cardGroupViewMode === mode.id
                                                                ? 'bg-[#c8aa6e]/18 text-[#f0e6d2]'
                                                                : 'text-slate-500 hover:text-slate-300'}`}
                                                        >
                                                            {mode.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {canEditActiveDeck && !activeCardTypeFilter && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCreatingCardGroup((current) => !current)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#c8aa6e] transition-colors hover:border-[#c8aa6e]/65 hover:bg-[#c8aa6e]/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5"
                                                    title="Nueva agrupación"
                                                    aria-label="Nueva agrupación"
                                                >
                                                    <FolderPlus className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Nueva agrupación</span>
                                                </button>
                                            )}
                                            {canEditActiveDeck && !activeCardTypeFilter && ungroupedAttributeCount > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={handleCreateAttributeGroups}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-amber-700/35 bg-amber-950/20 text-[8px] font-bold uppercase tracking-[0.14em] text-amber-200 transition-colors hover:border-amber-400/55 hover:bg-amber-950/40 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5"
                                                    title="Crear o completar las agrupaciones Cuerpo, Mente y Hambre"
                                                    aria-label="Agrupar atributos"
                                                >
                                                    <FiLayers className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Agrupar atributos</span>
                                                </button>
                                            )}
                                            </div>
                                        </div>
                                        {canEditActiveDeck ? (
                                            <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                            <RefreshCw className="h-3 w-3 text-[#c8aa6e]/60" />
                                            {isCardGroupingActive && !expandedCardGroup
                                                ? 'Arrastra cartas para guardarlas · arrastra agrupaciones para ordenarlas'
                                                : 'Arrastra una carta sobre otra para intercambiarlas'}
                                            </span>
                                        ) : (
                                            <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                                <Eye className="h-3 w-3 text-slate-500" />
                                                Puedes importar estas cartas, pero no modificar la colección
                                            </span>
                                        )}
                                    </div>

                                    <div
                                        aria-hidden={!isCreatingCardGroup}
                                        className={`-my-2 grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCreatingCardGroup
                                            ? 'grid-rows-[1fr] opacity-100'
                                            : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}
                                    >
                                        <div className="min-h-0 overflow-hidden">
                                            <form
                                                onSubmit={handleCreateCardGroup}
                                                className={`flex flex-col gap-2 border border-[#c8aa6e]/20 bg-[#c8aa6e]/5 p-3 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:flex-row sm:items-center ${isCreatingCardGroup ? 'translate-y-0' : '-translate-y-2'}`}
                                            >
                                                    <FolderPlus className="hidden h-4 w-4 shrink-0 text-[#c8aa6e] sm:block" />
                                                    <input
                                                        ref={newCardGroupInputRef}
                                                        type="text"
                                                        value={newCardGroupName}
                                                        onChange={(event) => setNewCardGroupName(event.target.value)}
                                                        maxLength={40}
                                                        tabIndex={isCreatingCardGroup ? 0 : -1}
                                                        placeholder="Nombre de la agrupación"
                                                        aria-label="Nombre de la nueva agrupación"
                                                        className="h-9 min-w-0 flex-1 border border-slate-700 bg-[#07090e] px-3 text-xs text-[#f0e6d2] outline-none transition-colors placeholder:text-slate-600 focus:border-[#c8aa6e]/70"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="submit"
                                                            disabled={!isCreatingCardGroup || !newCardGroupName.trim()}
                                                            tabIndex={isCreatingCardGroup ? 0 : -1}
                                                            className="h-9 flex-1 border border-[#c8aa6e]/45 bg-[#c8aa6e]/12 px-3 text-[8px] font-bold uppercase tracking-[0.15em] text-[#f0e6d2] disabled:opacity-35 sm:flex-none"
                                                        >
                                                            Crear
                                                        </button>
                                                        <button
                                                            type="button"
                                                            tabIndex={isCreatingCardGroup ? 0 : -1}
                                                            onClick={() => {
                                                                setIsCreatingCardGroup(false);
                                                                setNewCardGroupName('');
                                                            }}
                                                            className="h-9 flex-1 border border-slate-700 bg-slate-950/50 px-3 text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400 sm:flex-none"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                            </form>
                                        </div>
                                    </div>

                                    {expandedCardGroup && (
                                        <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-700/65 bg-slate-950/35 px-3 py-2">
                                            <div className="flex items-center gap-2.5">
                                                <FolderOpen className="h-4 w-4 text-slate-400" />
                                                <span className="font-cinzel text-xs font-bold uppercase tracking-[0.16em] text-[#f0e6d2]">
                                                    {expandedCardGroup.name}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                                    {expandedCardGroup.cards.length} cartas
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedCardGroupId(null)}
                                                className="inline-flex items-center gap-1.5 rounded border border-slate-600/55 bg-[#05070b]/45 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-[#c8aa6e]/60 hover:text-[#f0e6d2]"
                                            >
                                                <FiArrowLeft className="h-3 w-3" />
                                                Volver a agrupaciones
                                            </button>
                                        </div>
                                    )}

                                    {expandedCardGroup && expandedCardGroup.cards.length === 0 ? (
                                        <div className="flex min-h-64 w-full flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-950/10 p-8 text-center">
                                            <FolderOpen className="mb-3 h-10 w-10 text-slate-700" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Agrupación vacía</h4>
                                            <p className="mt-1 max-w-xs text-[10px] text-slate-600">Vuelve atrás y arrastra cualquier carta sobre esta agrupación.</p>
                                        </div>
                                    ) : displayedCards.length === 0 && !(isCardGroupingActive && visibleCardGroups.length > 0) ? (
                                        <div className="w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 bg-slate-950/10">
                                            <FiLayers className="w-12 h-12 text-[#c8aa6e]/20 mb-3" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Mazo vacío</h4>
                                            <p className="text-[10px] text-slate-600 mt-1 max-w-xs text-center">
                                                Usa las cartas disponibles a la derecha y haz clic para agregarlas a esta baraja.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid w-full min-w-0 select-none grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                                            {isCardGroupingActive && !expandedCardGroup && visibleCardGroups.map((group) => (
                                                <CardGroupStack
                                                    key={group.id}
                                                    group={group}
                                                    cards={group.cards}
                                                    onOpen={handleOpenCardGroup}
                                                    onDelete={handleDeleteCardGroup}
                                                    onReorderPointerDown={handleCardGroupPointerDown}
                                                    canEdit={canEditActiveDeck}
                                                    isDropTarget={dropTargetGroupId === group.id}
                                                    isDragging={draggedCardGroupId === group.id}
                                                    isOrderTarget={cardGroupOrderTargetId === group.id}
                                                />
                                            ))}
                                            {flatCardsForCurrentView.map((card) => {
                                                const cardGroup = localCardGroups.find((group) => group.cardIds.includes(card.id));
                                                return (
                                                    <DeckCardItem 
                                                        key={card.id}
                                                        card={card}
                                                        cardGroup={cardGroup}
                                                        resolvedAttributeType={resolveAttributeCardType(card, masterLibraryTemplates)}
                                                        draggedCardId={draggedCardId}
                                                        dropTargetCardId={dropTargetCardId}
                                                        canEdit={canEditActiveDeck}
                                                        canManageVisibility={canManageActiveCardVisibility}
                                                        isMasterLibrary={activeDeckIsMasterLibrary}
                                                        handleCycleCardType={handleCycleCardType}
                                                        handleCycleAttributeType={handleCycleAttributeType}
                                                        handleRemoveCardFromGroup={handleRemoveCardFromGroup}
                                                        handleRemoveCardFromDeck={handleRemoveCardFromDeck}
                                                        handleToggleCardVisibility={handleToggleCardVisibility}
                                                        handleCardPointerDown={handleCardPointerDown}
                                                        handlePreviewCard={handleOpenCardPreview}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Right Section: Templates Library (Sticky narrow box sidebar) */}
                                <aside
                                    aria-label="Archivo de cartas disponibles"
                                    className="relative isolate flex h-fit max-h-[75vh] flex-col overflow-hidden border border-[#75633f]/50 bg-[#090c12] shadow-[0_22px_55px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(236,215,169,0.035)] lg:sticky lg:top-4 lg:col-span-1"
                                    style={{ clipPath: ARCHIVE_PANEL_CLIP }}
                                >
                                    <AvailableCardsTexture />
                                    {canManageActiveLibraryPermissions && (
                                        <div className="relative z-10 flex-none border-b border-emerald-500/20 bg-emerald-950/10 p-4">
                                            <span className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                                                <Users className="h-3.5 w-3.5" />
                                                Permisos
                                            </span>
                                            <div className="flex max-h-44 flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
                                                {knownPlayers.length === 0 ? (
                                                    <div className="text-[10px] italic text-slate-600">No hay jugadores registrados.</div>
                                                ) : (
                                                    knownPlayers.map(player => {
                                                        const access = activeDeck.permissions?.[player] || COLLECTION_ACCESS.HIDDEN;
                                                        return (
                                                            <div key={player} className="rounded border border-slate-800/80 bg-slate-950/35 p-2">
                                                                <div className="mb-2 truncate text-[11px] font-bold uppercase tracking-wider text-slate-200">{player}</div>
                                                                <div className="grid grid-cols-3 gap-1">
                                                                    {[
                                                                        { value: COLLECTION_ACCESS.HIDDEN, label: 'Oculto' },
                                                                        { value: COLLECTION_ACCESS.READ, label: 'Ver' },
                                                                        { value: COLLECTION_ACCESS.EDIT, label: 'Editar' }
                                                                    ].map(option => (
                                                                        <button
                                                                            key={option.value}
                                                                            type="button"
                                                                            onClick={() => handleUpdateLibraryPermission(player, option.value)}
                                                                            className={`rounded border px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider transition-colors ${access === option.value ? 'border-[#c8aa6e]/70 bg-[#c8aa6e]/15 text-[#f0e6d2]' : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                                                        >
                                                                            {option.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <header className="relative z-10 flex-none border-b border-[#766440]/35 bg-[#080a0f]/80 px-4 pb-4 pt-3.5">
                                        <div className="mb-3 flex items-center gap-2.5">
                                            <span className="h-1.5 w-1.5 rotate-45 border border-[#d0b36d]/75 bg-[#090c12]" />
                                            <div className="min-w-0">
                                                <h3 className="font-cinzel text-[10px] font-bold uppercase tracking-[0.19em] text-[#dfc781]">
                                                    Cartas disponibles
                                                </h3>
                                                <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.18em] text-slate-600">
                                                    {hasTemplateSearch
                                                        ? `${filteredTemplates.length} ${filteredTemplates.length === 1 ? 'coincidencia' : 'coincidencias'}`
                                                        : `${masterLibraryTemplates.length} en el archivo`}
                                                </p>
                                            </div>
                                            <span className="h-px min-w-5 flex-1 bg-gradient-to-r from-[#8f7747]/55 to-transparent" />
                                        </div>
                                        <div className="group/search relative" role="search">
                                            <label htmlFor="available-card-search" className="sr-only">
                                                Buscar por nombre, tipo o colección
                                            </label>
                                            <input
                                                id="available-card-search"
                                                type="text"
                                                value={searchTemplate}
                                                onChange={(e) => setSearchTemplate(e.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Escape') {
                                                        setSearchTemplate('');
                                                        event.currentTarget.blur();
                                                    }
                                                }}
                                                placeholder="Nombre, tipo o colección..."
                                                autoComplete="off"
                                                className="h-10 w-full border border-[#465064]/65 bg-[#0d121c]/95 py-2 pl-9 pr-9 text-[11px] text-[#eee5d4] caret-[#d5b86e] outline-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-600 focus:border-[#caae68]/75 focus:bg-[#101621] focus:shadow-[0_0_0_1px_rgba(202,174,104,0.12),0_7px_18px_rgba(0,0,0,0.22)]"
                                                style={{ clipPath: ARCHIVE_PANEL_CLIP }}
                                            />
                                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within/search:text-[#d2b66f]" />
                                            {searchTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchTemplate('')}
                                                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-600 transition-colors hover:text-[#ead7aa]"
                                                    title="Limpiar búsqueda"
                                                    aria-label="Limpiar búsqueda"
                                                >
                                                    <FiX className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        {activeDeckIsMasterLibrary && canEditActiveDeck && (
                                            <div className="mt-3">
                                                <input
                                                    ref={libraryCardFileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleUploadLibraryCard}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => libraryCardFileInputRef.current?.click()}
                                                    disabled={isUploadingLibraryCard}
                                                    className="flex w-full items-center justify-center gap-2 rounded border border-emerald-400/35 bg-emerald-950/30 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-200 transition-all hover:border-emerald-300/70 hover:bg-emerald-900/35 disabled:cursor-wait disabled:opacity-60"
                                                >
                                                    <FiPlus className="h-3.5 w-3.5 stroke-[3]" />
                                                    {isUploadingLibraryCard ? 'Subiendo...' : 'Subir carta'}
                                                </button>
                                            </div>
                                        )}
                                    </header>

                                    {/* Templates list scroll area */}
                                    <div className="archive-scrollbar relative z-10 flex max-h-[55vh] min-h-0 flex-col gap-2 overflow-y-auto bg-[#07090d]/45 p-3">
                                        {filteredTemplates.length === 0 ? (
                                            <div className="flex min-h-36 flex-col items-center justify-center border border-dashed border-[#61563f]/40 bg-[#0b0e14]/65 p-5 text-center">
                                                <FiSearch className="mb-2.5 h-5 w-5 text-[#9b8454]/45" />
                                                <span className="font-cinzel text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                                    {hasTemplateSearch ? 'Sin coincidencias' : 'Archivo vacío'}
                                                </span>
                                                <span className="mt-1.5 max-w-48 text-[8px] leading-relaxed text-slate-600">
                                                    {hasTemplateSearch
                                                        ? 'Busca por nombre, tipo de carta o colección.'
                                                        : 'Las cartas de las colecciones base aparecerán aquí.'}
                                                </span>
                                                {hasTemplateSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearchTemplate('')}
                                                        className="mt-3 font-cinzel text-[8px] font-bold uppercase tracking-[0.15em] text-[#bba66f] transition-colors hover:text-[#ead7aa]"
                                                    >
                                                        Limpiar búsqueda
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            filteredTemplates.map((template) => {
                                                const templateCategory = CARD_TYPES.find((type) => type.id === template.type) || CARD_TYPES[0];
                                                return (
                                                    <article
                                                        key={template.id}
                                                        className={`group relative isolate grid min-h-[76px] grid-cols-[44px_minmax(0,1fr)_34px] items-center gap-3 overflow-hidden border border-[#394254]/65 bg-[#0e131c]/90 px-2.5 py-2 transition-[border-color,background-color,transform,box-shadow] duration-200 [clip-path:polygon(7px_0,100%_0,100%_calc(100%_-_7px),calc(100%_-_7px)_100%,0_100%,0_7px)] ${canEditActiveDeck ? 'hover:-translate-y-px hover:border-[#8f7a50]/70 hover:bg-[#121923] hover:shadow-[0_9px_22px_rgba(0,0,0,0.28)]' : 'opacity-75'}`}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className="pointer-events-none absolute bottom-2 left-0 top-2 w-px opacity-65 transition-opacity group-hover:opacity-100"
                                                            style={{ backgroundColor: templateCategory.accent }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddCardToDeck(template)}
                                                            disabled={!canEditActiveDeck}
                                                            className="absolute inset-0 z-10 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#dec57e] disabled:cursor-default"
                                                            aria-label={`Añadir ${template.name || 'carta'} a la baraja`}
                                                        />

                                                        <div className="pointer-events-none relative z-0 aspect-[3/4.2] w-11 overflow-hidden border border-[#796943]/70 bg-slate-950 shadow-[0_5px_13px_rgba(0,0,0,0.42),inset_0_0_0_1px_rgba(236,215,169,0.05)] [clip-path:polygon(4px_0,100%_0,100%_calc(100%_-_4px),calc(100%_-_4px)_100%,0_100%,0_4px)]">
                                                            {template.frontUrl ? (
                                                                <img
                                                                    src={template.frontUrl}
                                                                    alt=""
                                                                    className="h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-[1.035]"
                                                                />
                                                            ) : (
                                                                <FiLayers className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-slate-700" />
                                                            )}
                                                            <span className="absolute inset-[2px] border border-[#f0dfb7]/10" />
                                                        </div>

                                                        <div className="pointer-events-none z-0 min-w-0 self-center">
                                                            <span className="block truncate font-cinzel text-[10px] font-bold uppercase tracking-[0.045em] text-[#ede3d0] transition-colors group-hover:text-[#e2c982]">
                                                                {template.name || 'Carta'}
                                                            </span>
                                                            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                                                <span style={{ color: templateCategory.accent }}>{templateCategory.label}</span>
                                                                <span className="text-[#635a49]">·</span>
                                                                <span className="truncate">{template.sourceDeckName || 'Colección base'}</span>
                                                            </span>
                                                            <span className={`mt-1.5 inline-flex items-center gap-1 font-cinzel text-[7px] font-bold uppercase tracking-[0.15em] transition-colors ${canEditActiveDeck ? 'text-[#91805d] group-hover:text-[#d1b874]' : 'text-slate-600'}`}>
                                                                {canEditActiveDeck && <FiPlus className="h-2.5 w-2.5 stroke-[2.5]" />}
                                                                {canEditActiveDeck ? 'Añadir a la baraja' : 'Solo lectura'}
                                                            </span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(event) => handleDownloadTemplateCard(template, event)}
                                                            disabled={!template.frontUrl}
                                                            className="relative z-20 flex h-8 w-8 items-center justify-center border border-[#3d485c]/75 bg-[#090d14]/90 text-slate-500 transition-[border-color,background-color,color,transform] hover:border-[#b69b5e]/65 hover:bg-[#15170f] hover:text-[#d7bb72] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 [clip-path:polygon(5px_0,100%_0,100%_calc(100%_-_5px),calc(100%_-_5px)_100%,0_100%,0_5px)]"
                                                            title="Descargar PNG"
                                                            aria-label={`Descargar ${template.name || 'carta'} en PNG`}
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                        </button>
                                                    </article>
                                                );
                                            })
                                        )}
                                    </div>
                                </aside>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* LOOSE CARD INSPECTION */}
            <AnimatePresence>
                {previewCard && (
                    <motion.div
                        key={`card-preview-${previewCard.id || previewCard.name}`}
                        ref={cardPreviewSurfaceRef}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Inspección de ${previewCard.name || 'carta'}`}
                        tabIndex={-1}
                        onClick={handleCloseCardPreview}
                        className="custom-scrollbar fixed inset-0 z-[10020] overflow-auto overscroll-contain bg-[#020305]/78 backdrop-blur-[9px]"
                    >
                        <div className="inline-flex min-h-full min-w-full items-center justify-center p-4 sm:p-7">
                            {previewCard.frontUrl ? (
                                <motion.img
                                    src={previewCard.frontUrl}
                                    alt={previewCard.name || 'Carta'}
                                    draggable={false}
                                    initial={{ opacity: 0, scale: 0.92, y: 12 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: 7 }}
                                    transition={{ type: 'spring', stiffness: 370, damping: 31 }}
                                    onClick={(event) => event.stopPropagation()}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    className="block h-auto max-w-none select-none rounded-[5px] object-contain shadow-[0_30px_88px_rgba(0,0,0,0.86),0_0_45px_rgba(200,170,110,0.16)]"
                                    style={{
                                        width: `${Number((61 * cardPreviewScale).toFixed(2))}dvh`,
                                        maxWidth: `${Number((88 * cardPreviewScale).toFixed(2))}vw`
                                    }}
                                />
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.94 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.97 }}
                                    onClick={(event) => event.stopPropagation()}
                                    className="flex aspect-[3/4.2] w-[min(82vw,390px)] flex-col items-center justify-center bg-[#0d1017] p-8 text-center shadow-[0_30px_88px_rgba(0,0,0,0.86)]"
                                >
                                    <FiLayers className="mb-3 h-14 w-14 text-[#c8aa6e]/35" />
                                    <span className="font-cinzel text-xs font-bold uppercase tracking-widest text-slate-500">
                                        {previewCard.name || 'Carta sin imagen'}
                                    </span>
                                </motion.div>
                            )}
                            <span className="sr-only">
                                Usa la rueda del ratón para ajustar el tamaño. Pulsa fuera de la carta o Escape para cerrar.
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL: CREATE DECK */}
            <AnimatePresence>
                {newDeckModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0f1219] border border-[#c8aa6e]/30 p-6 rounded-lg w-full max-w-md shadow-2xl relative"
                        >
                            <button
                                onClick={() => {
                                    setNewDeckIsMasterLibrary(false);
                                    setNewDeckModal(false);
                                }}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white rounded"
                            >
                                <FiX className="w-5 h-5" />
                            </button>

                            <h3 className="font-cinzel text-lg font-bold text-[#f0e6d2] uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-[#c8aa6e]/10 pb-2">
                                <FiPlus className="text-[#c8aa6e] stroke-[2.5]" /> Crear Nueva {newDeckIsMasterLibrary ? 'Colección Base' : 'Baraja'}
                            </h3>

                            <div className="space-y-4">
                                {!isPlayer && (
                                    <button
                                        type="button"
                                        onClick={() => setNewDeckIsMasterLibrary(prev => !prev)}
                                        className={`flex w-full items-start gap-3 rounded border p-3 text-left transition-colors ${newDeckIsMasterLibrary ? 'border-emerald-400/45 bg-emerald-950/25' : 'border-slate-800 bg-[#161a23]/50 hover:border-[#c8aa6e]/35'}`}
                                    >
                                        <Database className={`mt-0.5 h-5 w-5 flex-none ${newDeckIsMasterLibrary ? 'text-emerald-300' : 'text-slate-500'}`} />
                                        <span className="flex flex-col gap-1">
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-[#f0e6d2]">Colección base del Master</span>
                                            <span className="text-[10px] leading-relaxed text-slate-500">
                                                Actúa como base de datos de cartas universales. El Master decide qué jugadores pueden verla o editarla y qué cartas concretas quedan publicadas.
                                            </span>
                                        </span>
                                    </button>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                        Nombre de la {newDeckIsMasterLibrary ? 'Colección' : 'Baraja'}
                                    </label>
                                    <input
                                        type="text"
                                        value={newDeckName}
                                        onChange={(e) => setNewDeckName(e.target.value)}
                                        placeholder={newDeckIsMasterLibrary ? 'Ej: Cartas Universales de Acción' : 'Ej: Mazo de Combate Aéreo'}
                                        className="w-full bg-[#161a23] border border-slate-800 text-xs text-[#e2e8f0] p-3 rounded outline-none focus:border-[#c8aa6e] transition-colors"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateDeck();
                                        }}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Boton color="gray" onClick={() => {
                                        setNewDeckIsMasterLibrary(false);
                                        setNewDeckModal(false);
                                    }}>
                                        Cancelar
                                    </Boton>
                                    <button
                                        onClick={handleCreateDeck}
                                        className="px-4 py-2 bg-[#c8aa6e] text-slate-950 font-bold text-xs uppercase tracking-widest rounded hover:bg-white active:scale-95 transition-all shadow"
                                    >
                                        Crear Baraja
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deckToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/82 p-3 backdrop-blur-sm sm:p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                            className="relative grid w-full max-w-2xl grid-cols-1 gap-4 overflow-hidden rounded-xl border border-red-900/45 bg-[#0b1120] p-4 shadow-[0_0_50px_rgba(220,38,38,0.18)] sm:grid-cols-[120px_1fr] sm:p-6"
                        >
                            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-55" />
                            <div className="mx-auto flex w-24 items-center justify-center sm:mx-0 sm:w-full">
                                <div className="flex aspect-[3/4.2] w-full items-center justify-center rounded-lg border border-red-900/35 bg-[#05070b] shadow-[0_18px_30px_rgba(0,0,0,0.45)]">
                                    {isMasterLibraryDeck(deckToDelete) ? (
                                        <Database className="h-12 w-12 text-red-400/80" />
                                    ) : (
                                        <FiLayers className="h-12 w-12 text-red-400/80" />
                                    )}
                                </div>
                            </div>

                            <div className="flex min-w-0 flex-col justify-center">
                                <h3 className="mb-2 flex items-center gap-2 font-cinzel text-lg font-bold uppercase tracking-wide text-red-500 sm:text-xl">
                                    <Trash2 className="h-5 w-5 flex-none" />
                                    Eliminar {isMasterLibraryDeck(deckToDelete) ? 'colección base' : 'baraja'}
                                </h3>
                                <p className="text-sm leading-relaxed text-slate-400">
                                    ¿Estás seguro de que deseas eliminar <span className="font-bold text-[#f0e6d2]">"{deckToDelete.name || 'Baraja sin nombre'}"</span>?
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-red-400/75">
                                    Esta acción eliminará permanentemente la {isMasterLibraryDeck(deckToDelete) ? 'colección y sus cartas compartidas' : 'baraja y todas sus cartas'}. No afectará a otras colecciones.
                                </p>

                                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDeckToDelete(null)}
                                        className="rounded px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-[#f0e6d2]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDeleteDeck}
                                        className="rounded border border-red-900/55 bg-red-950/30 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-red-400 shadow-[0_0_20px_rgba(220,38,38,0.10)] transition-all hover:border-red-500/70 hover:bg-red-900/40 hover:text-red-200"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {libraryCardToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/82 p-3 backdrop-blur-sm sm:p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                            className="relative grid w-full max-w-2xl grid-cols-1 gap-4 overflow-hidden rounded-xl border border-red-900/45 bg-[#0b1120] p-4 shadow-[0_0_50px_rgba(220,38,38,0.18)] sm:grid-cols-[120px_1fr] sm:p-6"
                        >
                            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-55" />
                            <div className="mx-auto w-24 sm:mx-0 sm:w-full">
                                <div className="aspect-[3/4.2] overflow-hidden rounded-lg border border-red-900/35 bg-[#05070b] shadow-[0_18px_30px_rgba(0,0,0,0.45)]">
                                    {libraryCardToDelete.frontUrl ? (
                                        <img
                                            src={libraryCardToDelete.frontUrl}
                                            alt={libraryCardToDelete.name || 'Carta'}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center p-3 text-center text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                            {libraryCardToDelete.name || 'Carta'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex min-w-0 flex-col justify-center">
                                <h3 className="mb-2 flex items-center gap-2 font-cinzel text-lg font-bold uppercase tracking-wide text-red-500 sm:text-xl">
                                    <Trash2 className="h-5 w-5 flex-none" />
                                    Eliminar carta base
                                </h3>
                                <p className="text-sm leading-relaxed text-slate-400">
                                    ¿Estás seguro de que deseas eliminar <span className="font-bold text-[#f0e6d2]">"{libraryCardToDelete.name || 'Carta sin nombre'}"</span> de la colección base?
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-red-400/75">
                                    Esta acción eliminará permanentemente esta carta de la base de datos compartida. Los jugadores con acceso dejarán de verla como plantilla.
                                </p>

                                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setLibraryCardToDelete(null)}
                                        className="rounded px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-[#f0e6d2]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmRemoveLibraryCard}
                                        className="rounded border border-red-900/55 bg-red-950/30 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-red-400 shadow-[0_0_20px_rgba(220,38,38,0.10)] transition-all hover:border-red-500/70 hover:bg-red-900/40 hover:text-red-200"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {cardGroupDragPreview && (
                    <motion.div
                        key="card-group-drag-preview"
                        initial={{ opacity: 0, scale: 0.93, rotate: 0 }}
                        animate={{ opacity: 0.84, scale: 0.97, rotate: -1.2 }}
                        exit={{ opacity: 0, scale: 0.94, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                        className="pointer-events-none fixed z-[9998]"
                        style={{
                            left: cardGroupDragPreview.x - cardGroupDragPreview.offsetX,
                            top: cardGroupDragPreview.y - cardGroupDragPreview.offsetY,
                            width: cardGroupDragPreview.width,
                            filter: 'drop-shadow(0 28px 34px rgba(0,0,0,0.78)) drop-shadow(0 0 24px rgba(240,230,210,0.18))'
                        }}
                    >
                        <span className="absolute left-1/2 top-1 z-30 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#f0e6d2]/55 bg-[#05070b]/95 px-3 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[#f0e6d2] shadow-lg">
                            {cardGroupOrderTarget ? <ArrowLeftRight className="h-3 w-3" /> : <FolderOpen className="h-3 w-3" />}
                            {cardGroupOrderTarget
                                ? `Soltar: cambiar con ${cardGroupOrderTarget.name}`
                                : `Moviendo ${cardGroupDragPreview.group.name}`}
                        </span>
                        <CardGroupStack
                            group={cardGroupDragPreview.group}
                            cards={cardGroupDragPreview.cards}
                            onOpen={() => {}}
                            onDelete={() => {}}
                            onReorderPointerDown={() => {}}
                            canEdit={false}
                            isDropTarget={false}
                            isDragging={false}
                            isOrderTarget={false}
                            isPreview
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {dragPreview && (
                    <motion.div
                        key="deck-card-drag-preview"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 0.78, scale: 0.99, rotate: -1.2 }}
                        exit={{ opacity: 0, scale: 0.98, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        className="pointer-events-none fixed z-[9999]"
                        style={{
                            left: dragPreview.x - dragPreview.offsetX,
                            top: dragPreview.y - dragPreview.offsetY,
                            width: dragPreview.width,
                            height: dragPreview.height,
                            filter: 'drop-shadow(0 24px 28px rgba(0,0,0,0.72)) drop-shadow(0 0 22px rgba(200,170,110,0.28))'
                        }}
                    >
                        <TiltCard frontUrl={dragPreview.card.frontUrl} name={dragPreview.card.name} active={false} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

DeckBuilderView.propTypes = {
    ownerId: PropTypes.string.isRequired,
    ownerName: PropTypes.string.isRequired,
    currentUserId: PropTypes.string,
    knownPlayers: PropTypes.arrayOf(PropTypes.string),
    isPlayer: PropTypes.bool,
    onBack: PropTypes.func
};

export default DeckBuilderView;
