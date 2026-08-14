import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import { Gem, Package, Shield, Sword, Zap } from 'lucide-react';
import RogueliteInventoryCard from '../../../components/RogueliteInventoryCard';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';

const RARITY_COLORS = {
    común: '#8d9aab',
    comun: '#8d9aab',
    'poco común': '#75a986',
    rara: '#6f9fc7',
    épica: '#b47bd0',
    epica: '#b47bd0',
    legendaria: '#c89f62',
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
        .filter(Boolean);
    return handsRequired === 2
        ? traits.filter((trait) => !/(^|\W)(dos manos|2 manos|a dos manos|two handed|two-handed)(\W|$)/i.test(trait))
        : traits;
};

const resolveTooltipPosition = (rect) => {
    const width = Math.min(372, Math.max(280, window.innerWidth - 32));
    const gap = 14;
    const left = rect.right + gap + width <= window.innerWidth
        ? rect.right + gap
        : Math.max(16, rect.left - width - gap);
    return {
        left,
        top: Math.max(16, Math.min(rect.top - 72, window.innerHeight - 520)),
        width,
    };
};

const CanvasLootVisual = ({ item, isSelected, isDragging }) => {
    const rootRef = useRef(null);
    const [tooltipPosition, setTooltipPosition] = useState(null);
    const lootItem = { ...(item.lootItem || {}), name: item.lootItem?.name || item.lootItem?.nombre || item.name };
    const rarity = String(lootItem.rareza || lootItem.rarity || 'común').toLowerCase();
    const accent = RARITY_COLORS[rarity] || RARITY_COLORS.común;
    const { label, Icon, hands } = resolvePresentation(lootItem);
    const supportsCost = label === 'Arma' || label === 'Habilidad';

    useEffect(() => {
        if (isDragging) setTooltipPosition(null);
    }, [isDragging]);

    const showTooltip = () => {
        if (isDragging || !rootRef.current || typeof document === 'undefined') return;
        setTooltipPosition(resolveTooltipPosition(rootRef.current.getBoundingClientRect()));
    };

    return (
        <>
            <motion.div
                ref={rootRef}
                initial={{ opacity: 0, scale: 0.55, y: -8 }}
                animate={{ opacity: isDragging ? 0.76 : 1, scale: isDragging ? 1.08 : 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 430, damping: 24 }}
                className="relative h-full w-full"
                onMouseEnter={showTooltip}
                onMouseLeave={() => setTooltipPosition(null)}
                aria-label={item.name || 'Objeto en el suelo'}
            >
                <div
                    className="absolute left-1/2 top-[68%] h-[44%] w-[92%] -translate-x-1/2 rounded-full blur-md"
                    style={{ backgroundColor: `${accent}48` }}
                    aria-hidden="true"
                />
                <div
                    className={`relative h-full w-full overflow-hidden border bg-[#080d18] shadow-[0_7px_18px_rgba(0,0,0,0.66)] transition-transform duration-150 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                    style={{
                        borderColor: accent,
                        clipPath: 'polygon(14% 0, 86% 0, 100% 14%, 100% 86%, 86% 100%, 14% 100%, 0 86%, 0 14%)',
                    }}
                >
                    {item.img ? (
                        <img src={item.img} alt="" className="h-full w-full object-cover" draggable="false" />
                    ) : (
                        <Icon className="m-[24%] h-[52%] w-[52%]" style={{ color: accent }} aria-hidden="true" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10" aria-hidden="true" />
                    <div className="absolute inset-[8%] border border-white/15" aria-hidden="true" />
                </div>
            </motion.div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {tooltipPosition && !isDragging && (
                        <motion.div
                            key={`loot-tooltip-${item.id}`}
                            initial={{ opacity: 0, x: -8, scale: 0.97 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -5, scale: 0.98 }}
                            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                            className="noma-canvas-loot-tooltip fixed z-[10000] pointer-events-none"
                            style={tooltipPosition}
                        >
                            <RogueliteInventoryCard
                                item={lootItem}
                                image={item.img}
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
                                glossary={[]}
                            />
                            <div className="mt-1.5 border-l border-[#c8aa6e]/60 bg-[#050810]/95 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 shadow-xl">
                                Arrastra sobre una ficha controlada para recoger
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
};

CanvasLootVisual.defaultProps = {
    isSelected: false,
    isDragging: false,
};

export default CanvasLootVisual;
