import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, ArrowUp, Shield, Hourglass, Backpack, Sparkles, ChevronUp, ChevronDown, Lock, X, Zap, RotateCw } from 'lucide-react';
import { parseAttrBonuses, getSpeedConsumption } from '../utils/combatSystem';
import CombatModifiersPanel, { applyModifiersToWeapon } from './CombatModifiersPanel';
import { getCustomImage, useCustomEquipmentImages } from '../hooks/useCustomEquipmentImages';
import { PRONE_STATUS_IDS } from '../utils/statusEffects';

const RANGE_MAP = {
    toque: 0,
    cercano: 1,
    intermedio: 2,
    lejano: 3,
    extremo: 999
};

const getLoadedImageUrlCache = () => {
    if (!globalThis.__fichasRolLoadedImageUrls) {
        globalThis.__fichasRolLoadedImageUrls = new globalThis.Set();
    }
    return globalThis.__fichasRolLoadedImageUrls;
};

const isImageUrlLoaded = (src) => Boolean(src && getLoadedImageUrlCache().has(src));
const markImageUrlLoaded = (src) => {
    if (src) getLoadedImageUrlCache().add(src);
};

const getRangeValue = (item) => {
    const alcRaw = item?.alc || item?.alcance || item?.range || item?.Alcance || item?.Range || item?.payload?.range || item?.payload?.alcance || item?.payload?.alc;
    if (alcRaw === undefined || alcRaw === null || alcRaw === '') return RANGE_MAP.toque;

    const alcValue = alcRaw.toString().toLowerCase().trim();
    if (alcValue.includes('toque')) return RANGE_MAP.toque;
    if (alcValue.includes('cercano')) return RANGE_MAP.cercano;
    if (alcValue.includes('intermedio')) return RANGE_MAP.intermedio;
    if (alcValue.includes('lejano')) return RANGE_MAP.lejano;
    if (alcValue.includes('extremo')) return RANGE_MAP.extremo;

    const digitMatch = alcValue.match(/\d+/);
    if (digitMatch) {
        return parseInt(digitMatch[0], 10);
    }

    return RANGE_MAP.toque;
};

const isSweepEligibleWeapon = (item) => {
    if (!item || item.type !== 'weapon') return false;
    return getRangeValue(item) <= 1 && getSpeedConsumption(item) >= 2;
};

const resolveCombatItemImage = (item, customEquipmentImages) => {
    if (item?.img && (item.img.startsWith('data:') || item.img.startsWith('http') || item.img.startsWith('/'))) return item.img;
    if (item?.icon && (item.icon.startsWith('data:') || item.icon.startsWith('http') || item.icon.startsWith('/'))) return item.icon;

    if (customEquipmentImages && customEquipmentImages.size > 0) {
        const custom = getCustomImage(item, customEquipmentImages);
        if (custom) return custom;
    }

    const name = (item?.name || item?.nombre || '').toLowerCase();

    if (name.includes('llave inglesa')) return '/armas/llave_inglesa.png';
    if (name.includes('gancho de alcantarilla')) return '/armas/gancho_de_alcantarilla.png';
    if (name.includes('antorcha')) return '/armas/antorcha.png';
    if (name.includes('porra de jade')) return '/armas/Porra de jade.png';
    if (name.includes('sanguinaria')) return '/armas/la_sanguinaria.png';
    if (name.includes('mazo glacial')) return '/armas/mazo_glacial.png';
    if (name.includes('mordisco') || name.includes('fauces')) return '/armas/fauces.png';
    if (name.includes('garras')) return '/armas/garras.png';
    if (name.includes('cuchillo')) return '/armas/cuchillo.png';
    if (name.includes('tuberia') || name.includes('tubería')) return '/armas/tuberia.png';
    if (name.includes('revolver') || name.includes('revólver')) return '/armas/revolver.png';
    if (name.includes('pistola')) return '/armas/pistola.png';
    if (name.includes('rifle')) return '/armas/rifle.png';
    if (name.includes('escopeta')) return '/armas/escopeta.png';
    if (name.includes('granarco')) return '/armas/arco_largo.png';
    if (name.includes('arco')) return '/armas/arco_corto.png';
    if (name.includes('gran clava') || name.includes('granclava')) return '/armas/gran_clava.png';
    if (name.includes('clava')) return '/armas/clava.png';
    if (name.includes('jabalina')) return '/armas/jabalina.png';
    if (name.includes('lanza')) return '/armas/lanza.png';
    if (name.includes('daga')) return '/armas/daga.png';
    if (name.includes('hacha de mano')) return '/armas/hacha_de_mano.png';
    if (name.includes('hacha')) return '/armas/hacha_de_mano.png';
    if (name.includes('honda')) return '/armas/honda.png';
    if (name.includes('tirachinas')) return '/armas/tirachinas.png';
    if (name.includes('estoque')) return '/armas/estoque.png';
    if (name.includes('alabarda')) return '/armas/alabarda.png';
    if (name.includes('ballesta pesada') || name.includes('granballesta')) return '/armas/ballesta_pesada.png';
    if (name.includes('ultraballesta')) return '/armas/ultraballesta.jpg';
    if (name.includes('ballesta de mano')) return '/armas/ballesta_de_mano.png';
    if (name.includes('ballesta')) return '/armas/ballesta_ligera.png';
    if (name.includes('martillo de mano')) return '/armas/martillo_de_mano.png';
    if (name.includes('martillo de guerra')) return '/armas/martillo_de_guerra.png';
    if (name.includes('gran martillo')) return '/armas/gran_martillo.png';
    if (name.includes('ultramartillo')) return '/armas/ultramartillo.png';
    if (name.includes('espada bastarda')) return '/armas/espada_bastarda.png';
    if (name.includes('espada larga')) return '/armas/espada_larga.png';
    if (name.includes('espada corta')) return '/armas/espada_corta.png';
    if (name.includes('mandoble')) return '/armas/mandoble.png';
    if (name.includes('cimitarra')) return '/armas/cimitarra.png';
    if (name.includes('espada')) return '/armas/espada_de_acero.png';

    return null;
};

const ItemImage = ({ src, type, name }) => {
    const [status, setStatus] = React.useState(src ? (isImageUrlLoaded(src) ? 'loaded' : 'loading') : 'idle');

    React.useEffect(() => {
        setStatus(src ? (isImageUrlLoaded(src) ? 'loaded' : 'loading') : 'idle');
    }, [src]);

    if (!src || status === 'error') {
        return type === 'ability'
            ? <Sparkles size={16} className="text-purple-400 md:w-5 md:h-5" />
            : <Sword size={16} className="text-slate-600 md:w-5 md:h-5" />;
    }

    return (
        <>
            <img
                src={src}
                alt=""
                aria-label={name || undefined}
                draggable={false}
                onLoad={() => {
                    markImageUrlLoaded(src);
                    setStatus('loaded');
                }}
                onError={() => setStatus('error')}
                className={`w-full h-full object-cover group-hover/item:scale-110 transition-transform transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
            />
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b1120]/95 via-black/70 to-[#161f32]/90">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-[-7px] rounded-full border border-[#c8aa6e]/15 animate-pulse" />
                        <RotateCw className="w-4 h-4 text-[#c8aa6e]/80 animate-spin drop-shadow-[0_0_8px_rgba(200,170,110,0.35)]" />
                    </div>
                </div>
            )}
        </>
    );
};

const HudCardImage = ({ card }) => {
    const image = card?.faceDown ? (card?.backImage || card?.frontImage) : card?.frontImage;
    const [status, setStatus] = React.useState(image ? (isImageUrlLoaded(image) ? 'loaded' : 'loading') : 'idle');

    React.useEffect(() => {
        let isCurrent = true;

        if (!image) {
            setStatus('idle');
            return () => {
                isCurrent = false;
            };
        }

        if (isImageUrlLoaded(image)) {
            setStatus('loaded');
            return () => {
                isCurrent = false;
            };
        }

        setStatus('loading');
        if (image) {
            const preload = new globalThis.Image();
            preload.onload = () => {
                markImageUrlLoaded(image);
                if (isCurrent) setStatus('loaded');
            };
            preload.onerror = () => {
                if (isCurrent) setStatus('error');
            };
            preload.src = image;
        }

        return () => {
            isCurrent = false;
        };
    }, [image]);

    const cardBackFace = (
        <div className="absolute inset-0 overflow-hidden bg-[#111827]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(200,170,110,0.18),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(35,43,58,0.96),rgba(8,13,22,0.98))]" />
            <div className="absolute inset-[7%] rounded border border-[#c8aa6e]/25 shadow-[inset_0_0_20px_rgba(0,0,0,0.45)]" />
            <div className="absolute inset-x-[12%] top-[12%] h-px bg-[#c8aa6e]/30" />
            <div className="absolute inset-x-[12%] bottom-[12%] h-px bg-[#c8aa6e]/30" />
        </div>
    );

    const loadingFace = (
        <div className="absolute inset-0 overflow-hidden bg-[#0b1120]/90 backdrop-blur-sm flex items-center justify-center">
            <RotateCw className="h-5 w-5 animate-spin text-[#c8aa6e]/60 drop-shadow-md" />
        </div>
    );

    if (!image || status === 'error') {
        return cardBackFace;
    }

    return (
        <>
            {status !== 'loaded' && loadingFace}
            <img
                src={image}
                alt={card?.name || 'Carta'}
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                onLoad={() => {
                    markImageUrlLoaded(image);
                    setStatus('loaded');
                }}
                onError={() => setStatus('error')}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            />
        </>
    );
};

const CombatHUD = ({
    token,
    onAction,
    onEndTurn,
    onPortraitClick,
    canOpenSheet = true,
    isActive = true, // Si es el turno del jugador o no (visual)
    pendingCost = 0, // Coste acumulado en este turno no confirmado
    pendingActions = [], // Array de nombres de acciones pendientes
    onCancelAction, // Función para cancelar una acción pendiente
    forceWeaponMenu = false, // Nueva prop para forzar la apertura del menú de armas
    targetDistance = null, // Distancia al objetivo actual (en casillas)
    allowAdjacentTouchTargeting = false,
    mode = 'canvas',
    handCards = [],
    onPlayCard = null,
    onFlipHandCard = null,
    onHandCardDragStart = null,
    onCardPreviewStart = null
}) => {
    const customEquipmentImages = useCustomEquipmentImages();
    const isBoardMode = mode === 'board';
    const [activeCategory, setActiveCategory] = useState('ACCIONES'); // ACCIONES | CLASE | OBJETOS
    const [selectedActionId, setSelectedActionId] = useState(null); // Para submenús (ej: elegir arma)
    const [isEndingTurn, setIsEndingTurn] = useState(false);
    const endTurnTimerRef = useRef(null);

    // States for Attack Weapon Modifiers
    const [selectedAttackItemIdx, setSelectedAttackItemIdx] = useState(null);
    const [customAttackModifiers, setCustomAttackModifiers] = useState({ extraDice: {}, activeTraits: [] });
    const [attackModifiersExpanded, setAttackModifiersExpanded] = useState(false);
    const [selectedSweepWeaponIdx, setSelectedSweepWeaponIdx] = useState(null);
    const [handViewportWidth, setHandViewportWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1200
    );
    const [handViewportHeight, setHandViewportHeight] = useState(
        typeof window !== 'undefined' ? window.innerHeight : 900
    );

    // Efecto para forzar la apertura del menú de armas si se solicita externamente (ej: tras seleccionar objetivo)
    React.useEffect(() => {
        if (forceWeaponMenu) {
            setSelectedActionId('attack');
            setActiveCategory('ACCIONES');
        }
    }, [forceWeaponMenu]);

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

    const tokenStatus = Array.isArray(token?.status) ? token.status : [];
    const hasControllableStatus = tokenStatus.includes('sangrado');
    const isProne = PRONE_STATUS_IDS.some((statusId) => tokenStatus.includes(statusId));
    const cardsInHand = Array.isArray(handCards) ? handCards : [];

    React.useEffect(() => {
        if (!isProne) return;
        setActiveCategory('ACCIONES');
        setSelectedActionId(null);
        setSelectedAttackItemIdx(null);
        setAttackModifiersExpanded(false);
    }, [isProne]);

    React.useEffect(() => {
        if (!isBoardMode) return;
        const updateViewport = () => {
            setHandViewportWidth(window.innerWidth);
            setHandViewportHeight(window.innerHeight);
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, [isBoardMode]);

    if (!token && !isBoardMode) return null;

    // Obtener opciones de ataque (Armas + Habilidades Ofensivas)
    const items = Array.isArray(token?.equippedItems) ? token.equippedItems : [];
    let attackOptions = items.filter(i =>
        i.type === 'weapon' ||
        i.type === 'ability' ||
        (i._category === 'abilities' && (i.damage || i.dano))
    );
    const sweepWeapons = items.filter((item) => isSweepEligibleWeapon(item));

    if (targetDistance !== null) {
        attackOptions = attackOptions.filter(item => {
            const alcRaw = item.alc || item.alcance || item.range || item.Alcance || item.Range || item.payload?.range || item.payload?.alcance || item.payload?.alc;
            if (!alcRaw) {
                return item.type === 'ability'
                    ? true
                    : (RANGE_MAP.toque >= targetDistance || (targetDistance === 1 && allowAdjacentTouchTargeting));
            }

            const alcValue = alcRaw.toString().toLowerCase().trim();

            let mappedRange = undefined;
            if (alcValue.includes('toque')) mappedRange = RANGE_MAP['toque'];
            else if (alcValue.includes('cercano')) mappedRange = RANGE_MAP['cercano'];
            else if (alcValue.includes('intermedio')) mappedRange = RANGE_MAP['intermedio'];
            else if (alcValue.includes('lejano')) mappedRange = RANGE_MAP['lejano'];
            else if (alcValue.includes('extremo')) mappedRange = RANGE_MAP['extremo'];

            // Check if string contains one of the keywords
            if (mappedRange !== undefined) {
                return mappedRange >= targetDistance || (
                    mappedRange === RANGE_MAP.toque &&
                    targetDistance === 1 &&
                    allowAdjacentTouchTargeting
                );
            }

            // 1. Si es un número directo o lo contiene
            const digitMatch = alcValue.match(/\d+/);
            if (digitMatch) {
                return parseInt(digitMatch[0], 10) >= targetDistance;
            }

            // Fallback: si no se reconoce, una habilidad sigue disponible y un arma se trata como Toque.
            return item.type === 'ability'
                ? true
                : (RANGE_MAP.toque >= targetDistance || (targetDistance === 1 && allowAdjacentTouchTargeting));
        });
    }

    const handleActionClick = (actionId) => {
        if (!isActive || !onAction) return;
        if (isProne && actionId !== 'stand_up') return;
        if (!isProne && actionId === 'stand_up') return;

        if (actionId === 'attack') {
            // Si ya está seleccionado (menú abierto), lo cerramos y notificamos cancelación
            if (selectedActionId === 'attack') {
                setSelectedActionId(null);
                onAction('cancel_targeting');
                return;
            }
            // Primer paso: informar al canvas que queremos iniciar un ataque (apuntar)
            onAction('attack');
        } else {
            // Otras acciones directas
            onAction(actionId);
            setSelectedActionId(null);
        }
    };

    const categories = [
        { id: 'ACCIONES', label: 'Acciones' },
        { id: 'CLASE', label: 'Clase' },
        { id: 'OBJETOS', label: 'Objetos' }
    ];

    const classActions = [
        {
            id: 'sweep',
            label: 'Barrido',
            icon: Zap,
            disabled: !isActive || isProne
        }
    ];

    const actions = [
        { id: 'attack', label: 'Atacar', icon: Sword },
        { id: 'stand_up', label: 'Levantarse', icon: ArrowUp },
        { id: 'control_status', label: 'Controlar', icon: Shield },
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

    const renderBoardHand = () => {
        const isCompactHandViewport = handViewportWidth < 768;
        const desktopHandScale = isCompactHandViewport
            ? 1
            : Math.max(0.78, Math.min(1, handViewportWidth / 1880, handViewportHeight / 1030));
        const desktopHandHeight = Math.round(300 * desktopHandScale);
        const desktopHoverLift = Math.round(44 * desktopHandScale);

        return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none px-3 pb-3 md:pb-5">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .board-hand-card {
                    transform: rotate(var(--card-tilt));
                    transform-origin: 50% 130%;
                    transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
                    touch-action: none;
                }
                .board-hand-card:hover {
                    transform: translateY(-22px) scale(1.12) rotate(0deg);
                    filter: brightness(1.08);
                    z-index: 40;
                }
                .board-hand-card:active {
                    transform: translateY(-12px) scale(1.04) rotate(0deg);
                }
                @media (min-width: 768px) {
                    .board-hand-card:hover {
                        transform: translateY(var(--board-hand-hover-lift, -44px)) scale(1.16) rotate(0deg);
                    }
                }
            `}</style>

            <div
                data-board-hand-drop-zone="true"
                className="pointer-events-auto w-full max-w-full md:max-w-6xl bg-transparent border-0 shadow-none relative min-h-[172px] overflow-visible"
                style={{
                    '--board-hand-hover-lift': `-${desktopHoverLift}px`,
                    minHeight: isCompactHandViewport ? undefined : `${desktopHandHeight}px`,
                }}
            >
                <div className="absolute left-1/2 bottom-2 z-0 -translate-x-1/2 px-3 py-1 rounded-full bg-[#0b1120]/70 border border-[#c8aa6e]/15 text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] text-[#c8aa6e]/70 pointer-events-none md:bottom-3">
                    Mano · {cardsInHand.length}
                </div>

                {cardsInHand.length === 0 ? (
                    <div className="relative z-10 mx-auto mt-12 h-16 max-w-[240px] rounded-full border-0 bg-[#0b1120]/35 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center px-4 md:mt-14 md:max-w-sm md:border md:border-dashed md:border-[#c8aa6e]/10 md:bg-transparent md:backdrop-blur-0 md:text-slate-700">
                        Arrastra cartas aquí
                    </div>
                ) : (
                    <div
                        className="relative z-10 h-[162px] overflow-visible"
                        style={{
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none',
                            height: isCompactHandViewport ? undefined : `${desktopHandHeight}px`,
                        }}
                    >
                        {cardsInHand.map((card, index) => {
                            const count = Math.max(cardsInHand.length, 1);
                            const isCompactHand = handViewportWidth < 768;
                            const handScale = isCompactHand ? 1 : desktopHandScale;
                            const availableWidth = Math.max(
                                isCompactHand ? 280 : 720,
                                Math.min(handViewportWidth * (isCompactHand ? 0.92 : 0.78), isCompactHand ? handViewportWidth - 18 : Math.round(1160 * handScale))
                            );
                            const maxCardWidth = isCompactHand ? 86 : Math.round(156 * handScale);
                            const minCardWidth = isCompactHand ? 54 : Math.max(82, Math.round(104 * handScale));
                            const naturalStep = isCompactHand ? 48 : Math.round(96 * handScale);
                            const idealWidth = count <= 1 ? maxCardWidth : (availableWidth - (naturalStep * (count - 1))) / 1.05;
                            const cardWidth = Math.max(minCardWidth, Math.min(maxCardWidth, idealWidth > 0 ? idealWidth : minCardWidth));
                            const cardHeight = Math.round(cardWidth * 1.44);
                            const maxSpread = Math.max(0, availableWidth - cardWidth);
                            const step = count <= 1
                                ? 0
                                : Math.min(naturalStep, maxSpread / (count - 1));
                            const middle = (cardsInHand.length - 1) / 2;
                            const relativeIndex = index - middle;
                            const xOffset = relativeIndex * step;
                            const normalizedDistance = middle > 0 ? Math.abs(relativeIndex) / middle : 0;
                            const tiltStep = isCompactHand
                                ? Math.min(8, Math.max(2.4, 26 / count))
                                : Math.min(7, Math.max(2.2, 34 / count));
                            const tilt = Math.max(-24, Math.min(24, relativeIndex * tiltStep));
                            const distanceFromCenter = Math.abs(index - middle);
                            const arcLimit = isCompactHand ? 22 : Math.round(34 * handScale);
                            const arc = Math.min(arcLimit, normalizedDistance * normalizedDistance * arcLimit);
                            const baseBottom = isCompactHand ? 40 : Math.round(48 * handScale);
                            const bottomOffset = baseBottom - arc;
                            const zIndex = 100 - Math.round(distanceFromCenter * 10);

                            return (
                                <div
                                    key={card.id}
                                    className="absolute left-1/2 bottom-8 md:bottom-12 group"
                                    style={{
                                        width: cardWidth,
                                        height: cardHeight,
                                        left: `calc(50% + ${xOffset}px)`,
                                        bottom: bottomOffset,
                                        marginLeft: -(cardWidth / 2),
                                        '--card-tilt': `${tilt}deg`,
                                        zIndex
                                    }}
                                >
                                    <button
                                        type="button"
                                        onMouseDown={(event) => onHandCardDragStart && onHandCardDragStart(card, event)}
                                        onTouchStart={(event) => (
                                            onCardPreviewStart || onHandCardDragStart
                                        ) && (onCardPreviewStart || onHandCardDragStart)(card, event)}
                                        onClick={(event) => event.preventDefault()}
                                        onContextMenu={(event) => event.preventDefault()}
                                        className="board-hand-card relative w-full h-full rounded-md overflow-hidden bg-[#111827] border border-[#c8aa6e]/35 hover:border-[#f0e6d2] shadow-xl hover:shadow-[0_0_28px_rgba(200,170,110,0.36)]"
                                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                                        title="Arrastrar al tablero"
                                    >
                                        <HudCardImage card={card} />
                                        <div className="absolute inset-0 ring-inset ring-1 ring-black/45 pointer-events-none" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
        );
    };

    if (isBoardMode) {
        return renderBoardHand();
    }

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
                .scrollbar-hide::-webkit-scrollbar { display: none; }
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
                    {isBoardMode ? (
                        <div className="w-full bg-[#0b1120]/95 backdrop-blur-xl border border-[#c8aa6e]/50 rounded-xl md:rounded-2xl p-2 md:p-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative min-h-[92px] md:min-h-[142px] flex flex-col justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-[#c8aa6e]/5 to-transparent pointer-events-none rounded-xl md:rounded-2xl" />
                            <div className="relative z-10 flex items-center justify-between px-1 md:px-2 mb-2">
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.22em] text-[#c8aa6e]">Mano</span>
                                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-500">{cardsInHand.length} cartas</span>
                            </div>

                            {cardsInHand.length === 0 ? (
                                <div className="relative z-10 h-16 md:h-24 rounded-lg border border-dashed border-slate-800/80 flex items-center justify-center text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-600">
                                    Sin cartas en mano
                                </div>
                            ) : (
                                <div
                                    className="relative z-10 flex items-center gap-2 md:gap-3 overflow-x-auto overflow-y-visible scrollbar-hide h-[78px] md:h-[112px] px-1 pb-1"
                                    style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                                >
                                    {cardsInHand.map((card) => (
                                        <div key={card.id} className="relative shrink-0 group">
                                            <button
                                                type="button"
                                                onClick={() => onPlayCard && onPlayCard(card)}
                                                className="relative w-12 h-[68px] md:w-16 md:h-[92px] rounded-md overflow-hidden bg-slate-500 border border-[#c8aa6e]/35 hover:border-[#f0e6d2] shadow-lg hover:shadow-[0_0_16px_rgba(200,170,110,0.28)] active:scale-95 transition-all"
                                                title="Jugar carta en mesa"
                                            >
                                                <HudCardImage card={card} />
                                                <div className="absolute inset-0 ring-inset ring-1 ring-black/40 pointer-events-none" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onFlipHandCard && onFlipHandCard(card);
                                                }}
                                                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#0b1120] border border-[#c8aa6e]/60 text-[#c8aa6e] flex items-center justify-center shadow-lg hover:bg-[#c8aa6e] hover:text-[#0b1120] transition-colors"
                                                title="Voltear carta"
                                            >
                                                <RotateCw size={12} />
                                            </button>
                                            <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 max-w-[76px] px-1.5 py-0.5 rounded bg-black/80 border border-[#c8aa6e]/20 text-[7px] md:text-[8px] font-bold uppercase tracking-wider text-[#f8e7b9] truncate pointer-events-none">
                                                {card.name || 'Carta'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                    <>

                    {/* Pestañas (Desktop) / Toggle (Mobile) */}
                    <div className="flex justify-center mb-0 relative z-10 w-full">

                        {/* ---------------------------------------------------------- */}
                        {/*                     VERSIÓN UNIFICADA                      */}
                        {/* ---------------------------------------------------------- */}
                        <div className="absolute bottom-[calc(100%-4px)] md:bottom-full flex flex-col-reverse items-center w-full pointer-events-none gap-2 md:gap-[10px] z-0">

                            {/* 1. Selector de Ataque (Unificado) */}
                            <AnimatePresence>
                                {selectedActionId === 'attack' && (
                                    <motion.div
                                        key="attack-selector"
                                        variants={panelVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="relative pointer-events-auto translate-y-[12px] md:translate-y-[1px] focus:outline-none overflow-hidden"
                                    >
                                        <div className="w-[200px] md:w-80 bg-[#0b1120]/98 border-t-2 border-x-2 border-[#c8aa6e] border-b-0 rounded-t-2xl overflow-hidden flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
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
                                                {attackOptions.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center p-6 text-center text-[#c8aa6e]/60 italic gap-3 mt-4 mb-4">
                                                        <Sword size={32} className="opacity-30" />
                                                        <span className="text-xs">Ningún arma o habilidad tiene alcance suficiente.</span>
                                                    </div>
                                                ) : attackOptions.map((item, idx) => {
                                                    const getRarityHeaderColor = (rareza = '') => {
                                                        const r = rareza.toLowerCase();
                                                        if (r.includes('legendari')) return 'text-orange-400';
                                                        if (r.includes('épic') || r.includes('epic')) return 'text-purple-400';
                                                        if (r.includes('rar')) return 'text-blue-400';
                                                        if (r.includes('poco com')) return 'text-green-400';
                                                        return 'text-[#f0e6d2]';
                                                    };
                                                    const itemImg = resolveCombatItemImage(item, customEquipmentImages);
                                                    const nameColorClass = getRarityHeaderColor(item.rareza || '');

                                                    // Parse traits for attribute dice visualization
                                                    const traits = item.rasgos || item.traits || item.properties || [];
                                                    const attrBonuses = parseAttrBonuses(traits);

                                                    const attrColorMap = {
                                                        destreza: '#4ade80',
                                                        intelecto: '#60a5fa',
                                                        voluntad: '#c084fc',
                                                        vigor: '#f87171'
                                                    };

                                                    return (
                                                        <div key={idx} className="flex flex-col mb-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (selectedAttackItemIdx === idx) {
                                                                        setSelectedAttackItemIdx(null);
                                                                    } else {
                                                                        setSelectedAttackItemIdx(idx);
                                                                        setCustomAttackModifiers({ extraDice: {}, activeTraits: [] });
                                                                        setAttackModifiersExpanded(false);
                                                                    }
                                                                }}
                                                                className={`flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl hover:bg-[#c8aa6e]/10 transition-all text-left group/item border shadow-lg ${selectedAttackItemIdx === idx ? 'border-[#c8aa6e] bg-[#c8aa6e]/10' : 'border-white/5 hover:border-[#c8aa6e]/30'
                                                                    }`}
                                                            >
                                                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg border ${item.type === 'ability' ? 'border-purple-500/50 bg-purple-900/40' : 'border-slate-700 bg-black/60'} flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner`}>
                                                                    <ItemImage src={itemImg} type={item.type} name={item.name || item.nombre} />
                                                                </div>
                                                                <div className="flex flex-col flex-1 min-w-0">
                                                                    <span className={`text-xs md:text-[13px] font-bold truncate mb-0.5 md:mb-1 ${nameColorClass}`}>
                                                                        {item.name || item.nombre}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                                        <span className="text-[8px] whitespace-nowrap md:text-[10px] text-yellow-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 font-bold">
                                                                            {getSpeedConsumption(item)}🟡
                                                                        </span>
                                                                        {(item.damage || item.dano) && (
                                                                            <span className="text-[8px] whitespace-nowrap md:text-[10px] text-red-400 font-bold bg-red-950/30 px-1.5 py-0.5 rounded border border-red-500/10">
                                                                                {item.damage || item.dano}
                                                                            </span>
                                                                        )}

                                                                        {/* Attribute Dice Icons */}
                                                                        <div className="flex gap-1 ml-1 overflow-x-auto scrollbar-hide">
                                                                            {attrBonuses.map((bonus, bIdx) => (
                                                                                <div
                                                                                    key={bIdx}
                                                                                    className="flex items-center gap-0.5"
                                                                                >
                                                                                    {Array.from({ length: bonus.mult }).map((_, mIdx) => (
                                                                                        <div
                                                                                            key={mIdx}
                                                                                            className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-[1px] border flex items-center justify-center shrink-0 overflow-visible"
                                                                                            style={{
                                                                                                borderColor: attrColorMap[bonus.attr] || '#94a3b8',
                                                                                                color: attrColorMap[bonus.attr] || '#94a3b8',
                                                                                                backgroundColor: `${attrColorMap[bonus.attr]}10` || 'transparent'
                                                                                            }}
                                                                                        >
                                                                                            <span
                                                                                                className="block text-[6px] md:text-[7px] font-black leading-none select-none"
                                                                                                style={{ lineHeight: 1, transform: 'translateY(0.25px)' }}
                                                                                            >
                                                                                                {bonus.attr.charAt(0).toUpperCase()}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <ChevronUp className={`text-[#c8aa6e]/40 group-hover/item:text-[#c8aa6e] transition-all w-3 h-3 md:w-4 md:h-4 ${selectedAttackItemIdx === idx ? 'rotate-180' : 'rotate-90'}`} />
                                                            </button>

                                                            {/* Panel Expandible de Modificadores para el arma seleccionada */}
                                                            <AnimatePresence>
                                                                {selectedAttackItemIdx === idx && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2 }}
                                                                        className="overflow-hidden px-1"
                                                                    >
                                                                        <div className="pt-2 pb-1 space-y-3">
                                                                            <CombatModifiersPanel
                                                                                modifiers={customAttackModifiers}
                                                                                onChange={setCustomAttackModifiers}
                                                                                isExpanded={attackModifiersExpanded}
                                                                                onToggleExpand={() => setAttackModifiersExpanded(!attackModifiersExpanded)}
                                                                                currentWeapon={item}
                                                                                disabledTraitIds={['guardia']}
                                                                                disabledTraitReasons={{
                                                                                    guardia: 'Guardia solo se aplica al realizar paradas.',
                                                                                }}
                                                                            />

                                                                            <button
                                                                                onClick={() => {
                                                                                    const modifiedItem = applyModifiersToWeapon(item, customAttackModifiers);
                                                                                    onAction('attack', modifiedItem);
                                                                                    setSelectedActionId(null);
                                                                                    setSelectedAttackItemIdx(null);
                                                                                }}
                                                                                className="w-full py-2 md:py-2.5 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white text-[10px] md:text-xs font-fantasy uppercase tracking-[0.1em] md:tracking-[0.2em] font-bold rounded shadow-lg transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                                                                            >
                                                                                <Sword size={14} className="hidden md:block" /> Confirmar Ataque
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {selectedActionId === 'sweep' && (
                                    <motion.div
                                        key="sweep-selector"
                                        variants={panelVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="relative pointer-events-auto translate-y-[12px] md:translate-y-[1px] focus:outline-none overflow-hidden"
                                    >
                                        <div className="w-[220px] md:w-[360px] bg-[#0b1120]/98 border-t-2 border-x-2 border-[#c8aa6e] border-b-0 rounded-t-2xl overflow-hidden flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                                            <div className="bg-[#c8aa6e] px-3 py-2 md:px-4 md:py-3 flex justify-between items-center shrink-0 shadow-lg">
                                                <div className="flex items-center gap-2">
                                                    <Zap size={14} className="text-[#0b1120]" />
                                                    <span className="text-[#0b1120] text-[10px] md:text-[11px] font-black uppercase tracking-widest">
                                                        Barrido
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedActionId(null);
                                                        setSelectedSweepWeaponIdx(null);
                                                    }}
                                                    className="text-[#0b1120]/60 hover:text-[#0b1120] p-1 transition-colors"
                                                >
                                                    <X size={16} className="md:w-[18px] md:h-[18px]" />
                                                </button>
                                            </div>
                                            <div className="px-3 pt-3 pb-2 border-b border-[#c8aa6e]/15 bg-black/30">
                                                <p className="text-[10px] text-[#f0e6d2] font-bold uppercase tracking-[0.18em] text-center">
                                                    Requisito
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed text-center">
                                                    Requiere un arma cuerpo a cuerpo de coste 2 o m&aacute;s. Cuesta el arma + 1{' '}
                                                    <span className="inline-flex align-middle translate-y-[-1px]">
                                                        <span className="w-2 h-2 rounded-full bg-[#facc15] shadow-[0_0_6px_rgba(250,204,21,0.65)]" />
                                                    </span>
                                                    {' '}y usa una sola tirada compartida.
                                                </p>
                                            </div>
                                            <div className="p-1.5 md:p-2 pb-3 md:pb-4 flex flex-col gap-1.5 md:gap-2 max-h-[280px] md:max-h-[420px] overflow-y-auto custom-scrollbar bg-black/40 border-b border-[#c8aa6e]/20">
                                                {sweepWeapons.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center p-6 text-center text-[#c8aa6e]/60 italic gap-3 mt-4 mb-4">
                                                        <Zap size={32} className="opacity-30" />
                                                        <span className="text-xs">Necesitas un arma a toque de coste 2 o m&aacute;s para usar Barrido.</span>
                                                    </div>
                                                ) : sweepWeapons.map((item, idx) => {
                                                    const itemImg = resolveCombatItemImage(item, customEquipmentImages);
                                                    const isSelected = selectedSweepWeaponIdx === idx;
                                                    return (
                                                        <button
                                                            key={`${item.nombre || item.name || 'barrido'}-${idx}`}
                                                            onClick={() => setSelectedSweepWeaponIdx(idx)}
                                                            className={`flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl transition-all text-left group/item border shadow-lg ${
                                                                isSelected
                                                                    ? 'border-[#c8aa6e] bg-[#c8aa6e]/10'
                                                                    : 'border-white/5 hover:border-[#c8aa6e]/30 hover:bg-[#c8aa6e]/5'
                                                            }`}
                                                        >
                                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg border border-slate-700 bg-black/60 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                                                                <ItemImage src={itemImg} type={item.type} name={item.name || item.nombre} />
                                                            </div>
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <span className="text-xs md:text-[13px] font-bold truncate mb-0.5 md:mb-1 text-[#f0e6d2]">
                                                                    {item.name || item.nombre}
                                                                </span>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-[8px] md:text-[10px] text-yellow-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 font-bold whitespace-nowrap">
                                                                        {getSpeedConsumption(item)} + 1🟡
                                                                    </span>
                                                                    {(item.damage || item.dano) && (
                                                                        <span className="text-[8px] md:text-[10px] text-red-400 font-bold bg-red-950/30 px-1.5 py-0.5 rounded border border-red-500/10 whitespace-nowrap">
                                                                            {item.damage || item.dano}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[8px] md:text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/40 whitespace-nowrap">
                                                                        Sin rasgos del arma
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {sweepWeapons.length > 0 && (
                                                <div className="p-3 bg-black/40">
                                                    <button
                                                        onClick={() => {
                                                            const weapon = sweepWeapons[selectedSweepWeaponIdx ?? 0];
                                                            if (!weapon) return;
                                                            onAction('sweep', weapon);
                                                            setSelectedActionId(null);
                                                            setSelectedSweepWeaponIdx(null);
                                                        }}
                                                        className="w-full py-2 md:py-2.5 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white text-[10px] md:text-xs font-fantasy uppercase tracking-[0.1em] md:tracking-[0.2em] font-bold rounded shadow-lg transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                                                    >
                                                        <Zap size={14} className="hidden md:block" /> Elegir Frente del Barrido
                                                    </button>
                                                </div>
                                            )}
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
                                    disabled={isProne && cat.id !== 'ACCIONES'}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3 md:px-8 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeCategory === cat.id
                                        ? 'bg-[#c8aa6e] text-[#0b1120]'
                                        : 'text-[#c8aa6e] hover:bg-[#c8aa6e]/10'
                                        } ${(isProne && cat.id !== 'ACCIONES') ? 'opacity-35 cursor-not-allowed hover:bg-transparent' : ''}`}
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

                            {activeCategory === 'ACCIONES' && actions.map(action => {
                                const actionDisabled = !isActive ||
                                    (isProne ? action.id !== 'stand_up' : action.id === 'stand_up') ||
                                    (action.id === 'control_status' && !hasControllableStatus);
                                const iconClass = actionDisabled
                                    ? 'text-slate-600'
                                    : action.id === 'stand_up'
                                        ? 'text-indigo-300 group-hover:text-indigo-200'
                                        : 'text-slate-400 group-hover:text-[#c8aa6e]';
                                const labelClass = actionDisabled
                                    ? 'text-slate-600'
                                    : action.id === 'stand_up'
                                        ? 'text-indigo-200 group-hover:text-white'
                                        : 'text-slate-400 group-hover:text-[#f0e6d2]';

                                return (
                                    <div key={action.id} className="relative group flex-1 min-w-0">
                                        <button
                                            onClick={() => handleActionClick(action.id)}
                                            disabled={actionDisabled}
                                            className={`relative flex w-full flex-col items-center justify-center h-16 md:h-24 bg-[#161f32] border rounded-lg transition-all ${
                                                actionDisabled
                                                    ? 'cursor-not-allowed opacity-50 border-slate-800'
                                                    : selectedActionId === action.id
                                                        ? 'border-[#c8aa6e] bg-[#c8aa6e]/20 shadow-[0_0_15px_rgba(200,170,110,0.3)]'
                                                        : action.id === 'stand_up'
                                                            ? 'border-indigo-500/40 hover:border-indigo-300 hover:bg-indigo-500/10 active:scale-95'
                                                            : 'border-slate-700/50 hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 active:scale-95'
                                            }`}
                                        >
                                            <action.icon className={`w-[18px] h-[18px] md:w-8 md:h-8 mb-1 md:mb-2 transition-colors ${iconClass}`} />
                                            <div className="flex flex-col items-center">
                                                <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors ${labelClass}`}>
                                                    {action.label}
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}

                            {activeCategory === 'CLASE' && (() => {
                                const classSlots = [
                                    { id: 'placeholder-left', label: 'Habilidad 1', icon: Sparkles, disabled: true },
                                    { id: 'sweep', label: 'Barrido', icon: Zap, disabled: !isActive || isProne, interactive: true },
                                    { id: 'placeholder-right', label: 'Habilidad 3', icon: Sparkles, disabled: true }
                                ];

                                return (
                                    <>
                                        {classSlots.map((slot) => {
                                            const SlotIcon = slot.icon;
                                            const slotDisabled = slot.disabled;
                                            const isSelected = slot.id === 'sweep' && selectedActionId === 'sweep';
                                            const iconClass = slot.interactive
                                                ? (slotDisabled ? 'text-slate-600' : 'text-slate-400 group-hover:text-[#c8aa6e]')
                                                : 'text-slate-600';
                                            const labelClass = slot.interactive
                                                ? (slotDisabled ? 'text-slate-600' : 'text-slate-400 group-hover:text-[#f0e6d2]')
                                                : 'text-slate-600';

                                            return (
                                                <div key={slot.id} className="relative group flex-1 min-w-0">
                                                    <button
                                                        onClick={() => {
                                                            if (!slot.interactive || slotDisabled) return;
                                                            setSelectedActionId((prev) => prev === slot.id ? null : slot.id);
                                                        }}
                                                        disabled={slotDisabled}
                                                        className={`relative flex w-full flex-col items-center justify-center h-16 md:h-24 bg-[#161f32] border rounded-lg transition-all ${
                                                            slot.interactive
                                                                ? slotDisabled
                                                                    ? 'cursor-not-allowed opacity-50 border-slate-800'
                                                                    : isSelected
                                                                        ? 'border-[#c8aa6e] bg-[#c8aa6e]/20 shadow-[0_0_15px_rgba(200,170,110,0.3)]'
                                                                        : 'border-slate-700/50 hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 active:scale-95'
                                                                : 'cursor-not-allowed opacity-45 border-slate-800'
                                                        }`}
                                                    >
                                                        <SlotIcon className={`w-[18px] h-[18px] md:w-8 md:h-8 mb-1 md:mb-2 transition-colors ${iconClass}`} />
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors text-center px-1 ${labelClass}`}>
                                                                {slot.label}
                                                            </span>
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}

                            {activeCategory === 'OBJETOS' && (() => {
                                const objectItems = items.filter(i =>
                                    (i.type === 'item' || i.type === 'consumable' || i.type === 'backpack' || i._category === 'consumables') &&
                                    i.type !== 'weapon'
                                );

                                if (objectItems.length === 0) {
                                    return (
                                        <div className="w-full flex flex-col items-center justify-center text-slate-500 py-4">
                                            <span className="text-[10px] uppercase tracking-widest italic">Mochila vacía</span>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="flex gap-3 overflow-x-auto pb-2 px-2 scrollbar-hide w-full">
                                        {objectItems.map((obj, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => onAction('use_item', obj)}
                                                disabled={isProne}
                                                className={`flex flex-col items-center justify-center min-w-[80px] md:min-w-[100px] h-16 md:h-20 bg-[#161f32] border rounded-lg transition-all shrink-0 group ${isProne ? 'border-slate-800 opacity-40 cursor-not-allowed' : 'border-blue-500/30 hover:bg-blue-900/20 active:scale-95'}`}
                                            >
                                                <span className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase tracking-tighter truncate w-full px-2 text-center">
                                                    {obj.name || obj.nombre}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    </>
                    )}
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
