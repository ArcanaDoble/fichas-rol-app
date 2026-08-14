import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import { Gem, Package, Shield, Sword, Zap } from 'lucide-react';
import RogueliteInventoryCard from '../../../components/RogueliteInventoryCard';
import { useCustomEquipmentImages } from '../../../hooks/useCustomEquipmentImages';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import { getObjectImage } from '../../tactical-shared/components/TacticalAssetImage';

const FALLBACK_RARITY_COLORS = {
    común: '#8d9aab',
    comun: '#8d9aab',
    common: '#8d9aab',
    'poco común': '#75a986',
    'poco comun': '#75a986',
    uncommon: '#75a986',
    rara: '#6f9fc7',
    raro: '#6f9fc7',
    rare: '#6f9fc7',
    épica: '#b47bd0',
    epica: '#b47bd0',
    épico: '#b47bd0',
    epico: '#b47bd0',
    epic: '#b47bd0',
    legendaria: '#c89f62',
    legendario: '#c89f62',
    legendary: '#c89f62',
    mítica: '#d97706',
    mitica: '#d97706',
    mítico: '#d97706',
    mitico: '#d97706',
    mythic: '#d97706',
};

const resolveRarityAccent = (item = {}, rarityColorMap = {}) => {
    const rawRarity = String(item.rareza || item.rarity || 'común').trim();
    const normalized = rawRarity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (rarityColorMap && typeof rarityColorMap === 'object') {
        if (rarityColorMap[item.rareza]) return rarityColorMap[item.rareza];
        if (rarityColorMap[item.rarity]) return rarityColorMap[item.rarity];
        if (rarityColorMap[rawRarity.toLowerCase()]) return rarityColorMap[rawRarity.toLowerCase()];
        if (rarityColorMap[normalized]) return rarityColorMap[normalized];
    }

    if (FALLBACK_RARITY_COLORS[rawRarity.toLowerCase()]) return FALLBACK_RARITY_COLORS[rawRarity.toLowerCase()];
    if (FALLBACK_RARITY_COLORS[normalized]) return FALLBACK_RARITY_COLORS[normalized];

    if (normalized.includes('poco') || normalized.includes('uncom')) return FALLBACK_RARITY_COLORS['poco común'];
    if (normalized.includes('rar')) return FALLBACK_RARITY_COLORS.rara;
    if (normalized.includes('epic')) return FALLBACK_RARITY_COLORS.épica;
    if (normalized.includes('legen')) return FALLBACK_RARITY_COLORS.legendaria;
    if (normalized.includes('mitic') || normalized.includes('myth')) return '#d97706';

    return FALLBACK_RARITY_COLORS.común;
};

const hexToRgba = (hex, alpha) => {
    const cleaned = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(cleaned)) return `rgba(141, 154, 171, ${alpha})`;
    const value = Number.parseInt(cleaned, 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

const resolveActionCost = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const marks = raw.match(/🟡/g);
    if (marks?.length) return Math.min(3, marks.length);
    const numeric = raw.match(/\d+/);
    return numeric ? Math.min(3, Math.max(0, Number(numeric[0]))) : raw;
};

const resolvePresentation = (item) => {
    const type = String(item?.type || item?.itemType || item?._category || '').toLowerCase();
    if (type.includes('weapon') || type.includes('arma')) {
        return { label: 'Arma', Icon: Sword, hands: resolveEquipmentHandsRequired(item) };
    }
    if (type.includes('armor') || type.includes('armadura')) return { label: 'Armadura', Icon: Shield, hands: null };
    if (type.includes('abil') || type.includes('habil') || type.includes('power')) return { label: 'Habilidad', Icon: Zap, hands: null };
    if (type.includes('access')) return { label: 'Accesorio', Icon: Gem, hands: null };
    return { label: 'Objeto', Icon: Package, hands: null };
};

const resolveTraits = (item, handsRequired) => {
    const raw = item?.traits || item?.rasgos || item?.trait || '';
    const traits = (Array.isArray(raw) ? raw : String(raw).split(','))
        .map((trait) => String(trait).trim())
        .filter((trait) => Boolean(trait) && trait !== '-' && trait !== '—');
    return handsRequired === 2
        ? traits.filter((trait) => !/(^|\W)(dos manos|2 manos|a dos manos|two handed|two-handed)(\W|$)/i.test(trait))
        : traits;
};

const resolveTooltipPosition = (rect) => {
    if (!rect) return null;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    if (isMobile) {
        return {
            isMobile: true,
            style: {
                left: 12,
                right: 12,
                bottom: 16,
                maxHeight: 'calc(100vh - 120px)',
            },
        };
    }

    const width = Math.min(372, Math.max(280, window.innerWidth - 32));
    const gap = 14;
    const left = rect.right + gap + width <= window.innerWidth
        ? rect.right + gap
        : Math.max(16, rect.left - width - gap);
    return {
        isMobile: false,
        style: {
            left,
            top: Math.max(16, Math.min(rect.top - 72, window.innerHeight - 520)),
            width,
        },
    };
};

const CanvasLootVisual = ({
    item,
    isSelected = false,
    isDragging = false,
    selectedLootItems = [],
    isPrimarySelectedLoot = false,
    glossary = [],
    rarityColorMap = {},
}) => {
    const rootRef = useRef(null);
    const lastTouchTimeRef = useRef(0);
    const [isHovered, setIsHovered] = useState(false);
    const [mobileDismissed, setMobileDismissed] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState(null);
    const [activeMultiIndex, setActiveMultiIndex] = useState(0);

    const customEquipmentImages = useCustomEquipmentImages();

    const isMultiSelection = selectedLootItems.length > 1;
    const currentMultiItem = (isMultiSelection && selectedLootItems[activeMultiIndex])
        ? selectedLootItems[activeMultiIndex]
        : item;

    const displayItem = isMultiSelection && isSelected ? currentMultiItem : item;
    const lootItem = { ...(displayItem.lootItem || {}), name: displayItem.lootItem?.name || displayItem.lootItem?.nombre || displayItem.name };
    const accent = resolveRarityAccent(lootItem, rarityColorMap);
    const { label, Icon, hands } = resolvePresentation(lootItem);
    const supportsCost = label === 'Arma' || label === 'Habilidad';
    const itemImage = getObjectImage(lootItem, customEquipmentImages) || displayItem.img;

    // Reset multi index and mobile dismissal whenever selection changes
    useEffect(() => {
        setMobileDismissed(false);
        setActiveMultiIndex(0);
    }, [isSelected, selectedLootItems.length]);

    const updateTooltipPosition = () => {
        if (!rootRef.current || typeof document === 'undefined') return;
        const rect = rootRef.current.getBoundingClientRect();
        setTooltipPosition(resolveTooltipPosition(rect));
    };

    // If multi-selection is active, only the primary selected loot renders the grouped portal (unless individually hovered)
    const shouldShow = (isHovered || (isSelected && (!isMultiSelection || isPrimarySelectedLoot)))
        && !isDragging
        && !mobileDismissed;

    useEffect(() => {
        if (shouldShow) {
            updateTooltipPosition();
        } else {
            setTooltipPosition(null);
        }
    }, [shouldShow, isSelected, isHovered, isDragging, isMultiSelection, isPrimarySelectedLoot]);

    const handleTouchStart = () => {
        lastTouchTimeRef.current = Date.now();
    };

    const handlePointerEnter = (e) => {
        if (Date.now() - lastTouchTimeRef.current < 600) return;
        if (e && e.pointerType === 'touch') return;
        setIsHovered(true);
        updateTooltipPosition();
    };

    const handlePointerMove = (e) => {
        if (Date.now() - lastTouchTimeRef.current < 600) return;
        if (e && e.pointerType === 'touch') return;
        if (!isHovered) {
            setIsHovered(true);
        }
        if (!tooltipPosition && !isDragging) {
            updateTooltipPosition();
        }
    };

    const handlePointerLeave = () => {
        setIsHovered(false);
        setTooltipPosition(null);
    };

    const currentItemAccent = resolveRarityAccent(item.lootItem || item, rarityColorMap);
    const { Icon: CurrentItemIcon } = resolvePresentation(item.lootItem || {});

    return (
        <>
            <motion.div
                ref={rootRef}
                initial={{ opacity: 0, scale: 0.55, y: -8 }}
                animate={{
                    opacity: isDragging ? 0.76 : 1,
                    scale: isDragging ? 1.12 : (isSelected ? 1.08 : (isHovered ? 1.05 : 1)),
                    y: 0,
                }}
                transition={{ type: 'spring', stiffness: 430, damping: 24 }}
                className="relative h-full w-full select-none"
                onTouchStart={handleTouchStart}
                onMouseEnter={handlePointerEnter}
                onMouseMove={handlePointerMove}
                onMouseLeave={handlePointerLeave}
                aria-label={item.name || 'Objeto en el suelo'}
            >
                {/* Hit area expander: ensures frictionless hover/touch detection around the item */}
                <div className="absolute -inset-3.5 z-0 pointer-events-auto" aria-hidden="true" />

                {/* Visual selection indicator (Golden frame and glowing corners) */}
                {isSelected && (
                    <div className="absolute -inset-2 rounded-md border-2 border-[#c8aa6e] bg-[#c8aa6e]/15 shadow-[0_0_14px_rgba(200,170,110,0.65)] pointer-events-none z-20">
                        <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#fff] pointer-events-none" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#fff] pointer-events-none" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#fff] pointer-events-none" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#fff] pointer-events-none" />
                    </div>
                )}

                <div
                    className="absolute left-1/2 top-[68%] h-[44%] w-[92%] -translate-x-1/2 rounded-full blur-md pointer-events-none"
                    style={{ backgroundColor: `${currentItemAccent}48` }}
                    aria-hidden="true"
                />
                <div
                    className={`relative h-full w-full overflow-hidden border bg-[#080d18] shadow-[0_7px_18px_rgba(0,0,0,0.66)] transition-all duration-150 ${isSelected ? 'ring-2 ring-[#c8aa6e] ring-offset-2 ring-offset-black' : ''}`}
                    style={{
                        borderColor: currentItemAccent,
                        clipPath: 'polygon(14% 0, 86% 0, 100% 14%, 100% 86%, 86% 100%, 14% 100%, 0 86%, 0 14%)',
                    }}
                >
                    {item.img ? (
                        <img src={item.img} alt="" className="h-full w-full object-cover pointer-events-none" draggable="false" />
                    ) : (
                        <CurrentItemIcon className="m-[24%] h-[52%] w-[52%] pointer-events-none" style={{ color: currentItemAccent }} aria-hidden="true" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" aria-hidden="true" />
                    <div className="absolute inset-[8%] border border-white/15 pointer-events-none" aria-hidden="true" />
                </div>
            </motion.div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {shouldShow && tooltipPosition && (
                        <motion.div
                            key={`loot-tooltip-${item.id}`}
                            initial={tooltipPosition.isMobile ? { opacity: 0, y: 16 } : { opacity: 0, x: -8, scale: 0.97 }}
                            animate={tooltipPosition.isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0, scale: 1 }}
                            exit={tooltipPosition.isMobile ? { opacity: 0, y: 12 } : { opacity: 0, x: -5, scale: 0.98 }}
                            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                            className={`noma-canvas-loot-tooltip fixed z-[10000] pointer-events-auto select-none ${tooltipPosition.isMobile ? 'shadow-2xl' : ''}`}
                            style={tooltipPosition.style}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                        >
                            <div className="relative pointer-events-auto">
                                {tooltipPosition.isMobile && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMobileDismissed(true);
                                        }}
                                        className="absolute -top-3 -right-2 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-slate-300 shadow-md active:scale-95 text-xs font-bold"
                                        aria-label="Cerrar vista previa"
                                    >
                                        ✕
                                    </button>
                                )}

                                {/* Multi-Selection Header & Tabs */}
                                {isMultiSelection && isSelected && (
                                    <div className="mb-2 overflow-hidden rounded border border-[#c8aa6e]/40 bg-[#080d18]/95 p-2 shadow-2xl backdrop-blur-md">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#c8aa6e] text-[9px] font-black text-black">
                                                    {selectedLootItems.length}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c8aa6e]">
                                                    Objetos Seleccionados
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMultiIndex((prev) => (prev > 0 ? prev - 1 : selectedLootItems.length - 1));
                                                    }}
                                                    className="flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition-transform font-bold"
                                                    title="Objeto anterior"
                                                >
                                                    ‹
                                                </button>
                                                <span className="px-1 text-slate-200">
                                                    {activeMultiIndex + 1} / {selectedLootItems.length}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMultiIndex((prev) => (prev < selectedLootItems.length - 1 ? prev + 1 : 0));
                                                    }}
                                                    className="flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition-transform font-bold"
                                                    title="Siguiente objeto"
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        </div>

                                        {/* Multi-Item Quick Selector Pills */}
                                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-0.5">
                                            {selectedLootItems.map((selItem, idx) => {
                                                const selLoot = selItem.lootItem || {};
                                                const selAccent = resolveRarityAccent(selLoot, rarityColorMap);
                                                const isCurrent = idx === activeMultiIndex;

                                                return (
                                                    <button
                                                        key={selItem.id || idx}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMultiIndex(idx);
                                                        }}
                                                        className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-semibold transition-all ${
                                                            isCurrent
                                                                ? 'border-[#c8aa6e] bg-[#c8aa6e]/25 text-[#f0e6d2] shadow-[0_0_8px_rgba(200,170,110,0.5)] scale-[1.03]'
                                                                : 'border-white/10 bg-slate-900/90 text-slate-400 hover:border-white/25 hover:text-slate-200'
                                                        }`}
                                                        style={isCurrent ? { borderColor: selAccent } : undefined}
                                                    >
                                                        <span
                                                            className="h-1.5 w-1.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: selAccent }}
                                                        />
                                                        <span className="max-w-[100px] truncate">
                                                            {selLoot.nombre || selLoot.name || selItem.name || 'Objeto'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <RogueliteInventoryCard
                                    item={lootItem}
                                    image={itemImage}
                                    fallbackIcon={<Icon />}
                                    categoryLabel={label}
                                    rarityAccent={accent}
                                    raritySoft={hexToRgba(accent, 0.34)}
                                    rarityFaint={hexToRgba(accent, 0.12)}
                                    actionCost={supportsCost
                                        ? resolveActionCost(lootItem.actionCost ?? lootItem.consumption ?? lootItem.consumo)
                                        : null}
                                    handsRequired={hands}
                                    visibleTraits={resolveTraits(lootItem, hands)}
                                    glossary={glossary}
                                />
                                <div className="mt-1.5 border-l border-[#c8aa6e]/60 bg-[#050810]/95 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 shadow-xl">
                                    {tooltipPosition.isMobile
                                        ? (isMultiSelection ? 'Arrastra para recoger los objetos seleccionados' : 'Arrastra la ficha sobre tu personaje para recoger')
                                        : (isMultiSelection ? 'Arrastra sobre una ficha controlada para recoger los objetos seleccionados' : 'Arrastra sobre una ficha controlada para recoger')}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </>
    );
};

CanvasLootVisual.propTypes = {
    item: PropTypes.object.isRequired,
    isSelected: PropTypes.bool,
    isDragging: PropTypes.bool,
    selectedLootItems: PropTypes.array,
    isPrimarySelectedLoot: PropTypes.bool,
    glossary: PropTypes.array,
    rarityColorMap: PropTypes.object,
};

CanvasLootVisual.defaultProps = {
    isSelected: false,
    isDragging: false,
    selectedLootItems: [],
    isPrimarySelectedLoot: false,
    glossary: [],
    rarityColorMap: {},
};

export default CanvasLootVisual;
