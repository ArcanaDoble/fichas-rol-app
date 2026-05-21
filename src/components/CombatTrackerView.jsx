import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiPlus, FiMinus, FiTrash2, FiChevronLeft } from 'react-icons/fi';
import {
    Swords, Skull, Heart, Shield, Brain, Zap, Ghost,
    EyeOff, VolumeX, Hand, XCircle, Eye, Pause, Box, Droplet,
    ArrowDown, Anchor, AlertCircle, Snowflake, Flame
} from 'lucide-react';
import { EnemyDetailView } from './EnemyDetailView';

// Configuration for Status Effects
// Configuration for Status Effects with desaturated campaign-aligned gothic color tokens
const CONDITIONS = [
    {
        id: 'Cegado',
        icon: EyeOff,
        label: 'Cegado',
        colorClass: 'text-slate-350',
        bgClass: 'bg-slate-950/30',
        borderClass: 'border-slate-800/40',
        hoverBgClass: 'hover:bg-slate-900/30',
        hoverBorderClass: 'hover:border-slate-700/50',
        activeBgClass: 'bg-slate-900/40',
        activeBorderClass: 'border-slate-500/60',
        activeIconClass: 'text-slate-200 drop-shadow-[0_0_6px_rgba(148,163,184,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(148,163,184,0.15)]',
    },
    {
        id: 'Hechizado',
        icon: Heart,
        label: 'Hechizado',
        colorClass: 'text-rose-450',
        bgClass: 'bg-rose-950/20',
        borderClass: 'border-rose-900/30',
        hoverBgClass: 'hover:bg-rose-900/30',
        hoverBorderClass: 'hover:border-rose-800/50',
        activeBgClass: 'bg-rose-950/50',
        activeBorderClass: 'border-rose-500/60',
        activeIconClass: 'text-rose-350 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    },
    {
        id: 'Ensordecido',
        icon: VolumeX,
        label: 'Ensordecido',
        colorClass: 'text-teal-400',
        bgClass: 'bg-teal-950/20',
        borderClass: 'border-teal-900/30',
        hoverBgClass: 'hover:bg-teal-900/30',
        hoverBorderClass: 'hover:border-teal-800/50',
        activeBgClass: 'bg-teal-950/50',
        activeBorderClass: 'border-teal-500/60',
        activeIconClass: 'text-teal-350 drop-shadow-[0_0_6px_rgba(20,184,166,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(20,184,166,0.2)]',
    },
    {
        id: 'Asustado',
        icon: Ghost,
        label: 'Asustado',
        colorClass: 'text-indigo-400',
        bgClass: 'bg-indigo-950/20',
        borderClass: 'border-indigo-900/30',
        hoverBgClass: 'hover:bg-indigo-900/30',
        hoverBorderClass: 'hover:border-indigo-800/50',
        activeBgClass: 'bg-indigo-950/50',
        activeBorderClass: 'border-indigo-500/60',
        activeIconClass: 'text-indigo-350 drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]',
    },
    {
        id: 'Agarrado',
        icon: Hand,
        label: 'Agarrado',
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-950/20',
        borderClass: 'border-amber-900/30',
        hoverBgClass: 'hover:bg-amber-900/30',
        hoverBorderClass: 'hover:border-amber-800/50',
        activeBgClass: 'bg-amber-950/50',
        activeBorderClass: 'border-amber-500/60',
        activeIconClass: 'text-amber-350 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    },
    {
        id: 'Incapacitado',
        icon: XCircle,
        label: 'Incapacitado',
        colorClass: 'text-red-400',
        bgClass: 'bg-red-950/20',
        borderClass: 'border-red-900/30',
        hoverBgClass: 'hover:bg-red-900/30',
        hoverBorderClass: 'hover:border-red-800/50',
        activeBgClass: 'bg-red-950/45',
        activeBorderClass: 'border-red-500/60',
        activeIconClass: 'text-red-350 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    },
    {
        id: 'Invisible',
        icon: Eye,
        label: 'Invisible',
        colorClass: 'text-cyan-400',
        bgClass: 'bg-cyan-950/20',
        borderClass: 'border-cyan-900/30',
        hoverBgClass: 'hover:bg-cyan-900/30',
        hoverBorderClass: 'hover:border-cyan-800/50',
        activeBgClass: 'bg-cyan-950/50',
        activeBorderClass: 'border-cyan-500/60',
        activeIconClass: 'text-cyan-350 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    },
    {
        id: 'Paralizado',
        icon: Pause,
        label: 'Paralizado',
        colorClass: 'text-yellow-400',
        bgClass: 'bg-yellow-950/20',
        borderClass: 'border-yellow-900/30',
        hoverBgClass: 'hover:bg-yellow-900/30',
        hoverBorderClass: 'hover:border-yellow-800/50',
        activeBgClass: 'bg-yellow-950/50',
        activeBorderClass: 'border-yellow-500/60',
        activeIconClass: 'text-yellow-350 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]',
    },
    {
        id: 'Petrificado',
        icon: Box,
        label: 'Petrificado',
        colorClass: 'text-stone-400',
        bgClass: 'bg-stone-950/30',
        borderClass: 'border-stone-850/40',
        hoverBgClass: 'hover:bg-stone-900/30',
        hoverBorderClass: 'hover:border-stone-700/50',
        activeBgClass: 'bg-stone-900/40',
        activeBorderClass: 'border-stone-500/60',
        activeIconClass: 'text-stone-300 drop-shadow-[0_0_6px_rgba(120,113,108,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(120,113,108,0.15)]',
    },
    {
        id: 'Envenenado',
        icon: Droplet,
        label: 'Envenenado',
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-950/20',
        borderClass: 'border-emerald-900/30',
        hoverBgClass: 'hover:bg-emerald-900/30',
        hoverBorderClass: 'hover:border-emerald-800/50',
        activeBgClass: 'bg-emerald-950/50',
        activeBorderClass: 'border-emerald-500/60',
        activeIconClass: 'text-emerald-350 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    },
    {
        id: 'Derribado',
        icon: ArrowDown,
        label: 'Derribado',
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-950/20',
        borderClass: 'border-orange-900/30',
        hoverBgClass: 'hover:bg-orange-900/30',
        hoverBorderClass: 'hover:border-orange-850/50',
        activeBgClass: 'bg-orange-950/50',
        activeBorderClass: 'border-orange-500/60',
        activeIconClass: 'text-orange-350 drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
    },
    {
        id: 'Apresado',
        icon: Anchor,
        label: 'Apresado',
        colorClass: 'text-blue-400',
        bgClass: 'bg-blue-950/20',
        borderClass: 'border-blue-900/30',
        hoverBgClass: 'hover:bg-blue-900/30',
        hoverBorderClass: 'hover:border-blue-800/50',
        activeBgClass: 'bg-blue-950/50',
        activeBorderClass: 'border-blue-500/60',
        activeIconClass: 'text-blue-350 drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    },
    {
        id: 'Aturdido',
        icon: Zap,
        label: 'Aturdido',
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-950/20',
        borderClass: 'border-amber-900/30',
        hoverBgClass: 'hover:bg-amber-900/30',
        hoverBorderClass: 'hover:border-amber-800/50',
        activeBgClass: 'bg-amber-950/50',
        activeBorderClass: 'border-amber-500/60',
        activeIconClass: 'text-amber-350 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    },
    {
        id: 'Inconsciente',
        icon: Skull,
        label: 'Inconsciente',
        colorClass: 'text-violet-400',
        bgClass: 'bg-violet-950/20',
        borderClass: 'border-violet-900/30',
        hoverBgClass: 'hover:bg-violet-900/30',
        hoverBorderClass: 'hover:border-violet-850/50',
        activeBgClass: 'bg-violet-950/50',
        activeBorderClass: 'border-violet-500/60',
        activeIconClass: 'text-violet-350 drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(139,92,246,0.2)]',
    },
    {
        id: 'Exhausto',
        icon: AlertCircle,
        label: 'Exhausto',
        colorClass: 'text-yellow-500',
        bgClass: 'bg-yellow-950/20',
        borderClass: 'border-yellow-900/30',
        hoverBgClass: 'hover:bg-yellow-900/30',
        hoverBorderClass: 'hover:border-yellow-850/50',
        activeBgClass: 'bg-yellow-950/50',
        activeBorderClass: 'border-yellow-600/60',
        activeIconClass: 'text-yellow-400 drop-shadow-[0_0_6px_rgba(202,138,4,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(202,138,4,0.2)]',
    },
    {
        id: 'Congelado',
        icon: Snowflake,
        label: 'Congelado',
        colorClass: 'text-sky-400',
        bgClass: 'bg-sky-950/20',
        borderClass: 'border-sky-900/30',
        hoverBgClass: 'hover:bg-sky-900/30',
        hoverBorderClass: 'hover:border-sky-850/50',
        activeBgClass: 'bg-sky-950/50',
        activeBorderClass: 'border-sky-500/60',
        activeIconClass: 'text-sky-350 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(56,189,248,0.2)]',
    },
    {
        id: 'Ardiendo',
        icon: Flame,
        label: 'Ardiendo',
        colorClass: 'text-red-500',
        bgClass: 'bg-red-950/20',
        borderClass: 'border-red-900/30',
        hoverBgClass: 'hover:bg-red-900/30',
        hoverBorderClass: 'hover:border-red-850/50',
        activeBgClass: 'bg-red-950/50',
        activeBorderClass: 'border-red-500/60',
        activeIconClass: 'text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]',
        shadowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    },
];

const STAT_THEME = {
    postura: {
        icon: Shield,
        label: 'POSTURA',
        colorClass: 'text-green-500',
        bgClass: 'bg-[#a3c9a8]',
        borderClass: 'border-green-900',
    },
    vida: {
        icon: Heart,
        label: 'VIDA',
        colorClass: 'text-red-500',
        bgClass: 'bg-[#c9a3a3]',
        borderClass: 'border-red-900',
    },
    ingenio: {
        icon: Zap,
        label: 'INGENIO',
        colorClass: 'text-blue-500',
        bgClass: 'bg-[#a3b1c9]',
        borderClass: 'border-blue-900',
    },
    cordura: {
        icon: Brain,
        label: 'CORDURA',
        colorClass: 'text-purple-500',
        bgClass: 'bg-[#bda3c9]',
        borderClass: 'border-purple-900',
    },
    armadura: {
        icon: Shield,
        label: 'ARMADURA',
        colorClass: 'text-slate-500',
        bgClass: 'bg-slate-400',
        borderClass: 'border-slate-700',
    },
};

const COLOR_TAGS = {
    carmesi: {
        id: 'carmesi',
        name: 'Carmesí',
        colorClass: 'text-red-400',
        bgClass: 'bg-red-950/40',
        borderClass: 'border-red-900/60',
        glowClass: 'shadow-[0_0_12px_rgba(239,68,68,0.25)] border-red-500/40',
        pillarClass: 'border-l-4 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
        badgeClass: 'bg-red-950/50 text-red-450 border-red-900/50 hover:bg-red-900/20 shadow-[0_0_8px_rgba(239,68,68,0.15)] hover:border-red-500/40'
    },
    ambar: {
        id: 'ambar',
        name: 'Ámbar',
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-950/40',
        borderClass: 'border-amber-900/60',
        glowClass: 'shadow-[0_0_12px_rgba(245,158,11,0.25)] border-amber-500/40',
        pillarClass: 'border-l-4 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        badgeClass: 'bg-amber-950/50 text-amber-450 border-amber-900/50 hover:bg-amber-900/20 shadow-[0_0_8px_rgba(245,158,11,0.15)] hover:border-amber-500/40'
    },
    esmeralda: {
        id: 'esmeralda',
        name: 'Esmeralda',
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-950/40',
        borderClass: 'border-emerald-900/60',
        glowClass: 'shadow-[0_0_12px_rgba(16,185,129,0.25)] border-emerald-500/40',
        pillarClass: 'border-l-4 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        badgeClass: 'bg-emerald-950/50 text-emerald-450 border-emerald-900/50 hover:bg-emerald-900/20 shadow-[0_0_8px_rgba(16,185,129,0.15)] hover:border-emerald-500/40'
    },
    zafiro: {
        id: 'zafiro',
        name: 'Zafiro',
        colorClass: 'text-blue-400',
        bgClass: 'bg-blue-950/40',
        borderClass: 'border-blue-900/60',
        glowClass: 'shadow-[0_0_12px_rgba(59,130,246,0.25)] border-blue-500/40',
        pillarClass: 'border-l-4 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
        badgeClass: 'bg-blue-950/50 text-blue-450 border-blue-900/50 hover:bg-blue-900/20 shadow-[0_0_8px_rgba(59,130,246,0.15)] hover:border-blue-500/40'
    },
    amatista: {
        id: 'amatista',
        name: 'Amatista',
        colorClass: 'text-purple-400',
        bgClass: 'bg-purple-950/40',
        borderClass: 'border-purple-900/60',
        glowClass: 'shadow-[0_0_12px_rgba(168,85,247,0.25)] border-purple-500/40',
        pillarClass: 'border-l-4 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
        badgeClass: 'bg-purple-950/50 text-purple-450 border-purple-900/50 hover:bg-purple-900/20 shadow-[0_0_8px_rgba(168,85,247,0.15)] hover:border-purple-500/40'
    },
    ceniza: {
        id: 'ceniza',
        name: 'Ceniza',
        colorClass: 'text-slate-400',
        bgClass: 'bg-slate-900/40',
        borderClass: 'border-slate-800/60',
        glowClass: 'shadow-[0_0_12px_rgba(148,163,184,0.15)] border-slate-700/40',
        pillarClass: 'border-l-4 border-slate-500/45 shadow-[0_0_15px_rgba(148,163,184,0.1)]',
        badgeClass: 'bg-slate-900/50 text-slate-450 border-slate-800/50 hover:bg-slate-850/30'
    }
};

const romanize = (num) => {
    const lookup = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 
        6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
        11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV'
    };
    return lookup[num] || String(num);
};

const STAT_ORDER = ['postura', 'vida', 'ingenio', 'cordura', 'armadura'];

const getStatValue = (combatant, key) => combatant.stats?.[key] || { current: 0, max: 0 };

const SegmentedStatControl = ({ icon: Icon, value, max, theme, onChange, label }) => {
    if (max <= 0) return null;
    
    const handleSegmentClick = (index) => {
        onChange(index + 1);
    };

    return (
        <div className="flex flex-col w-full bg-black/30 border border-slate-900/60 p-3.5 rounded-sm hover:border-red-900/40 hover:bg-[#1a0505]/15 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-red-200 font-['Cinzel'] font-bold tracking-wider text-[11px] uppercase flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-red-600 rotate-45"></span>
                    {label}
                </span>
                
                {/* Numeric Controls */}
                <div className="flex h-7 shrink-0 items-center overflow-hidden rounded-sm border border-red-900/30 bg-black/40">
                    <button
                        onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, value - 1)); }}
                        className="flex h-full w-7 items-center justify-center text-slate-500 transition-colors hover:bg-red-900/20 hover:text-red-450"
                        aria-label={`Reducir ${label}`}
                    >
                        <FiMinus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[2.25rem] border-x border-red-900/30 px-1 text-center font-mono text-xs font-bold text-red-200">{value}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + 1)); }}
                        className="flex h-full w-7 items-center justify-center text-slate-500 transition-colors hover:bg-red-900/20 hover:text-red-450"
                        aria-label={`Aumentar ${label}`}
                    >
                        <FiPlus className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Segmented Bar - Matches EnemyDetailView style but interactive */}
            <div className="flex h-4 w-full relative pl-1">
                {Array.from({ length: max }).map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSegmentClick(i); }}
                        className={`flex-1 h-full transition-all duration-300 relative min-w-[12px] hover:brightness-110 focus:outline-none ${i < value ? theme.bgClass + ' ' + theme.borderClass : theme.bgClass + '/10 ' + theme.borderClass + '/20'}`}
                        style={{
                            clipPath: i === 0
                                ? 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)'
                                : 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%, 8px 50%)',
                            marginLeft: i === 0 ? '0' : '-5px',
                            zIndex: max - i,
                            filter: 'drop-shadow(1px 0 0 rgba(0,0,0,0.5))'
                        }}
                        aria-label={`Ajustar ${label} a ${i + 1}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                        <div className="absolute top-0 left-0 right-0 h-[0.5px] bg-white/15"></div>
                    </button>
                ))}
            </div>
            <div className="mt-1.5 flex justify-end font-mono text-[9px] font-bold tracking-wider text-slate-500">
                {value} / {max}
            </div>
        </div>
    );
};

const smoothTransition = { type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.3 };

const CombatantCard = ({ combatant, onUpdate, onRemove, onViewDetails, onOpenconditions, onCycleColorTag, onOpenStatAdjuster }) => {
    const updateStat = (stat, newValue) => {
        onUpdate(combatant.instanceId, {
            stats: {
                ...combatant.stats,
                [stat]: { ...combatant.stats[stat], current: newValue }
            }
        });
    };

    const removeCondition = (conditionId) => {
        const current = combatant.conditions || [];
        onUpdate(combatant.instanceId, { conditions: current.filter(c => c !== conditionId) });
    };

    const activeConditions = (combatant.conditions || []).filter(
        c => c && c !== 'SIN ALTERACIONES' && c !== 'sin_alteraciones' && c.toLowerCase() !== 'sin alteraciones'
    );
    const activeConditionCount = activeConditions.length;

    // Height measurement for smooth resizes
    const [height, setHeight] = useState('auto');
    const contentRef = useRef(null);

    useEffect(() => {
        if (!contentRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                setHeight(rect.height);
            }
        });
        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, []);

    const colorTagKey = combatant.colorTag || 'ceniza';
    const colorTheme = COLOR_TAGS[colorTagKey] || COLOR_TAGS.ceniza;

    const getPillarStyles = () => {
        if (colorTagKey === 'ceniza') {
            return 'md:border-l-2 md:border-red-500/40 group-hover:md:border-red-500/70';
        }
        const borderColors = {
            carmesi: 'md:border-l-2 md:border-red-500/50 group-hover:md:border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
            ambar: 'md:border-l-2 md:border-amber-500/50 group-hover:md:border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
            esmeralda: 'md:border-l-2 md:border-emerald-500/50 group-hover:md:border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
            zafiro: 'md:border-l-2 md:border-blue-500/50 group-hover:md:border-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
            amatista: 'md:border-l-2 md:border-purple-500/50 group-hover:md:border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
        };
        return borderColors[colorTagKey] || borderColors.carmesi;
    };

    const getMobilePortraitBorder = () => {
        const borders = {
            carmesi: 'border-slate-900 border-l-[3px] border-l-red-500 shadow-[0_0_8px_rgba(239,68,68,0.25)]',
            ambar: 'border-slate-900 border-l-[3px] border-l-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.25)]',
            esmeralda: 'border-slate-900 border-l-[3px] border-l-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
            zafiro: 'border-slate-900 border-l-[3px] border-l-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.25)]',
            amatista: 'border-slate-900 border-l-[3px] border-l-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.25)]',
            ceniza: 'border-slate-900 border-l-[3px] border-l-slate-500 shadow-[0_0_6px_rgba(148,163,184,0.15)]'
        };
        return borders[colorTagKey] || borders.ceniza;
    };

    const PeanaBadge = () => (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onCycleColorTag(combatant.instanceId);
            }}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all duration-300 select-none ${colorTheme.badgeClass}`}
            title="Cambiar color de peana (miniatura)"
        >
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            <span>{romanize(combatant.sequenceNumber || 1)}</span>
        </button>
    );

    const MobileStatBadge = ({ statKey }) => {
        const theme = STAT_THEME[statKey];
        const stat = getStatValue(combatant, statKey);
        const Icon = theme.icon;
        if (stat.max <= 0) return null;
        
        const percent = Math.min(100, Math.max(0, (stat.current / stat.max) * 100));
        
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenStatAdjuster(combatant, statKey);
                }}
                className="flex flex-col w-full bg-black/40 border border-slate-900/80 p-2 rounded-sm text-left active:scale-[0.98] transition-all hover:bg-slate-950/20"
            >
                <div className="flex items-center justify-between gap-1 w-full mb-1">
                    <span className="text-slate-450 font-['Cinzel'] font-bold text-[8px] sm:text-[9px] tracking-wider truncate flex items-center gap-1">
                        <Icon className={`w-2.5 h-2.5 ${theme.colorClass}`} />
                        {theme.label.substring(0, 4)}
                    </span>
                    <span className="font-mono text-[9px] font-bold text-red-200">{stat.current}/{stat.max}</span>
                </div>
                
                {/* Micro progress bar */}
                <div className="h-[3px] w-full bg-slate-950/50 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-300 ${theme.bgClass}`} 
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </button>
        );
    };

    return (
        <motion.div
            layout="position"
            transition={{
                layout: smoothTransition,
                opacity: { duration: 0.2 },
                height: { duration: 0 }
            }}
            initial={{ opacity: 0, y: 20, height: 'auto' }}
            animate={{ opacity: 1, y: 0, height }}
            exit={{ 
                opacity: 0, 
                scale: 0.9, 
                height: 0,
                transition: {
                    height: smoothTransition,
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 }
                }
            }}
            className={`group relative overflow-hidden rounded-sm border bg-[#0a0f1d] shadow-[0_12px_40px_rgba(0,0,0,0.65)] transition-[border-color,box-shadow] duration-300 border-slate-900/80 hover:border-slate-800 ${colorTheme.glowClass}`}
        >
            {/* Corner Accents on Hover */}
            <div className="pointer-events-none absolute inset-0 border border-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/80"></div>
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/80"></div>
                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/80"></div>
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/80"></div>
            </div>

            <div ref={contentRef} className="relative">
                
                {/* ======================================================== */}
                {/* 1. DESKTOP VIEW (hidden md:grid)                        */}
                {/* ======================================================== */}
                <div className="hidden md:grid md:grid-cols-[18rem_minmax(0,1fr)]">
                    {/* Left Column: Portrait & Basic Info */}
                    <div
                        className="relative overflow-hidden bg-black/20 cursor-pointer h-full min-h-[14rem] flex flex-col justify-end group/portrait"
                        onClick={() => onViewDetails(combatant)}
                        title="Ver ficha completa"
                    >
                        <div className="absolute inset-0 overflow-hidden bg-black/60 z-0">
                            {combatant.image ? (
                                <img
                                    src={combatant.image}
                                    alt={combatant.name}
                                    className="h-full w-full object-cover object-top opacity-70 grayscale-[0.1] transition-all duration-500 group-hover:scale-105 group-hover:opacity-90 group-hover:grayscale-0"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-red-950/5">
                                    <Skull className="h-8 w-8 text-red-900/20" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/40 to-transparent" />
                        </div>
                        
                        <div className={`relative flex min-w-0 flex-col justify-end p-5 z-10 w-full transition-all duration-300 pl-4 bg-gradient-to-r from-[#0c0202]/85 via-[#0c0202]/40 to-transparent ${getPillarStyles()}`}>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <PeanaBadge />
                            </div>
                            <h3 className="break-words font-['Cinzel'] text-xl font-bold uppercase leading-tight text-red-100 drop-shadow-md group-hover:text-red-400 transition-colors">
                                {combatant.name}
                            </h3>
                            <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.22em] text-red-400/80">
                                {combatant.type}
                            </p>
                            <button
                                type="button"
                                className="mt-4 w-fit text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-red-300"
                            >
                                Ver ficha
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Stats & Alterations */}
                    <div className="relative p-4 md:p-5 bg-[#050b14]/20">
                        <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-900/60 pb-3">
                            <div>
                                <div className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.25em] text-red-400/90">Estadísticas de Combate</div>
                                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Haz clic en los bloques para ajustar rápidamente</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:flex">
                                    <span className="h-1.5 w-1.5 rotate-45 bg-red-800" />
                                    {activeConditionCount} {activeConditionCount === 1 ? 'alteración' : 'alteraciones'}
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(combatant.instanceId);
                                    }}
                                    className="rounded-sm border border-red-900/35 bg-[#1a0505]/60 hover:bg-red-950/80 hover:border-red-500/50 p-2 text-red-500 hover:text-red-400 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.5)] cursor-pointer flex items-center justify-center active:scale-95"
                                    title={`Eliminar ${combatant.name} del encuentro`}
                                >
                                    <FiTrash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                            {STAT_ORDER.map((statKey) => {
                                const theme = STAT_THEME[statKey];
                                const stat = getStatValue(combatant, statKey);
                                return (
                                    <SegmentedStatControl
                                        key={statKey}
                                        icon={theme.icon}
                                        label={theme.label}
                                        value={stat.current}
                                        max={stat.max}
                                        theme={theme}
                                        onChange={(v) => updateStat(statKey, v)}
                                    />
                                );
                            })}
                        </div>
                        <div className="mt-5 border-t border-slate-900/60 pt-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] w-6 bg-slate-800/60" />
                                    <div>
                                        <div className="font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.25em] text-red-400/85">Alteraciones de Estado</div>
                                        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                            {activeConditionCount ? `${activeConditionCount} efectos activos` : 'Estado estable y libre de alteraciones'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center">
                                    <AnimatePresence initial={false}>
                                        {activeConditions.map(conditionId => {
                                            const def = CONDITIONS.find(c => c.id === conditionId) || { 
                                                id: conditionId, 
                                                icon: AlertCircle, 
                                                label: conditionId, 
                                                colorClass: 'text-red-400', 
                                                activeBgClass: 'bg-red-950/20', 
                                                activeBorderClass: 'border-red-900/30' 
                                            };
                                            const Icon = def.icon;
                                            return (
                                                <motion.div
                                                    key={conditionId}
                                                    layout="position"
                                                    initial={{ opacity: 0, width: 0, height: 0, marginRight: 0, marginBottom: 0 }}
                                                    animate={{ opacity: 1, width: "auto", height: "auto", marginRight: 8, marginBottom: 8 }}
                                                    exit={{ opacity: 0, width: 0, height: 0, marginRight: 0, marginBottom: 0 }}
                                                    transition={smoothTransition}
                                                    className="inline-block overflow-hidden align-middle"
                                                >
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeCondition(conditionId); }}
                                                        className={`flex min-h-8 min-w-0 items-center gap-1.5 rounded-sm border ${def.activeBorderClass || 'border-red-900/30'} ${def.activeBgClass || 'bg-red-950/20'} px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider ${def.colorClass || 'text-red-450'} hover:brightness-125 transition-[background-color,border-color,filter,color] duration-200 whitespace-nowrap`}
                                                        title="Quitar alteración"
                                                    >
                                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                                        <span>{def.label}</span>
                                                        <FiX className="ml-1 h-3 w-3 shrink-0 opacity-60 hover:opacity-100" />
                                                    </button>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                    <motion.button
                                        layout="position"
                                        onClick={(e) => { e.stopPropagation(); onOpenconditions(combatant); }}
                                        className="flex min-h-8 items-center gap-1.5 rounded-sm border border-red-500/50 bg-red-900/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-900/30 hover:text-red-200 transition-[background-color,border-color,color] duration-300 cursor-pointer mb-2"
                                        aria-label={`Añadir alteración a ${combatant.name}`}
                                    >
                                        <FiPlus className="h-3.5 w-3.5" /> Añadir
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 2. MOBILE VIEW (grid md:hidden)                         */}
                {/* ======================================================== */}
                <div className="grid md:hidden p-3 bg-[#050b14]/25 gap-3 relative">
                    
                    {/* Compact Header row */}
                    <div className="flex items-center gap-3 w-full">
                        
                        {/* Mini Portrait with left colored border accent and gradient overlay */}
                        <div 
                            onClick={() => onViewDetails(combatant)}
                            className={`w-12 h-12 rounded-sm overflow-hidden shrink-0 bg-black/60 border cursor-pointer relative ${getMobilePortraitBorder()}`}
                        >
                            {combatant.image ? (
                                <>
                                    <img src={combatant.image} alt={combatant.name} className="w-full h-full object-cover object-top opacity-85 hover:opacity-100 transition-opacity duration-300" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0a0f1d]/30 to-[#0a0f1d]/90 pointer-events-none" />
                                </>
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Skull className="h-5 w-5 text-red-900/40" />
                                </div>
                            )}
                        </div>

                        {/* Title block */}
                        <div 
                            onClick={() => onViewDetails(combatant)}
                            className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer"
                        >
                            <div className="flex items-center justify-between gap-2 w-full">
                                <h3 className="font-['Cinzel'] text-[15px] font-bold uppercase leading-tight text-red-100 truncate flex-1">{combatant.name}</h3>
                                <PeanaBadge />
                            </div>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-red-400/60 truncate mt-0.5">{combatant.type}</p>
                        </div>

                        {/* Trash button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(combatant.instanceId); }}
                            className="rounded-sm border border-red-900/35 bg-black/50 p-2 text-red-500 transition-colors active:bg-red-900/30 cursor-pointer shrink-0"
                            aria-label={`Eliminar ${combatant.name}`}
                        >
                            <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Compact Stat Badge Grid (3 columns) */}
                    <div className="grid grid-cols-3 gap-2">
                        {STAT_ORDER.map((statKey) => (
                            <MobileStatBadge key={statKey} statKey={statKey} />
                        ))}
                    </div>

                    {/* Alterations row */}
                    <div className="border-t border-slate-900/65 pt-2 flex flex-wrap items-center gap-1.5">
                        <AnimatePresence initial={false}>
                            {activeConditions.map(conditionId => {
                                const def = CONDITIONS.find(c => c.id === conditionId) || { 
                                    id: conditionId, 
                                    icon: AlertCircle, 
                                    label: conditionId, 
                                    colorClass: 'text-red-400', 
                                    activeBgClass: 'bg-red-950/20', 
                                    activeBorderClass: 'border-red-900/30' 
                                };
                                const Icon = def.icon;
                                return (
                                    <motion.div
                                        key={conditionId}
                                        layout="position"
                                        initial={{ opacity: 0, width: 0, height: 0, marginRight: 0 }}
                                        animate={{ opacity: 1, width: "auto", height: "auto", marginRight: 4 }}
                                        exit={{ opacity: 0, width: 0, height: 0, marginRight: 0 }}
                                        transition={smoothTransition}
                                        className="inline-block overflow-hidden align-middle"
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeCondition(conditionId); }}
                                            className={`flex min-h-7 items-center gap-1 rounded-sm border ${def.activeBorderClass || 'border-red-900/30'} ${def.activeBgClass || 'bg-red-950/20'} px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${def.colorClass || 'text-red-450'} active:scale-95 transition-all whitespace-nowrap`}
                                            title="Quitar alteración"
                                        >
                                            <Icon className="h-3 w-3 shrink-0" />
                                            <span>{def.label}</span>
                                            <FiX className="h-2.5 w-2.5 shrink-0 opacity-60" />
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        
                        <motion.button
                            layout="position"
                            onClick={(e) => { e.stopPropagation(); onOpenconditions(combatant); }}
                            className="flex min-h-7 items-center gap-1 rounded-sm border border-red-500/50 bg-red-900/10 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-red-400 active:bg-red-900/30 hover:text-red-200 transition-colors cursor-pointer"
                            aria-label={`Añadir alteración a ${combatant.name}`}
                        >
                            <FiPlus className="h-3 w-3" /> Añadir
                        </motion.button>
                    </div>

                </div>

            </div>
        </motion.div>
    );
};

const modalVariants = {
    initial: { opacity: 0, scale: 0.98, y: 15 },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.25, ease: "easeOut" }
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        y: 10,
        transition: { duration: 0.15 }
    }
};

const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

export const CombatTrackerView = ({ onBack, onUpdateEnemy }) => {
    const [combatants, setCombatants] = useState([]);
    const [allEnemies, setAllEnemies] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailEnemy, setDetailEnemy] = useState(null);
    const [conditionPickerTarget, setConditionPickerTarget] = useState(null);
    const [statAdjusterTarget, setStatAdjusterTarget] = useState(null); // { combatant, statKey }

    // Load definitions and active session
    useEffect(() => {
        // Load enemy definitions
        const fetchEnemies = async () => {
            const querySnapshot = await getDocs(collection(db, 'enemies'));
            const loaded = [];
            querySnapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() }));
            setAllEnemies(loaded);
        };
        fetchEnemies();

        // Listen for active combat state
        const unsubscribe = onSnapshot(doc(db, 'combat_sessions', 'active_session'), (doc) => {
            if (doc.exists()) {
                setCombatants(doc.data().combatants || []);
            }
        });
        return () => unsubscribe();
    }, []);

    const saveCombatState = async (newCombatants) => {
        // Optimistic update
        setCombatants(newCombatants);
        try {
            await setDoc(doc(db, 'combat_sessions', 'active_session'), {
                combatants: newCombatants,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error("Error saving combat state:", error);
        }
    };

    const addCombatant = (enemyTemplate) => {
        // Find existing combatants with the same template id to compute unique sequence number
        const sameTemplate = combatants.filter(c => c.id === enemyTemplate.id);
        const existingNums = sameTemplate.map(c => c.sequenceNumber || 1);
        let sequenceNumber = 1;
        while (existingNums.includes(sequenceNumber)) {
            sequenceNumber++;
        }
        
        // Map sequence number to initial color tag
        const colors = Object.keys(COLOR_TAGS);
        const colorTag = colors[(sequenceNumber - 1) % colors.length];

        const newInstance = {
            ...enemyTemplate,
            instanceId: `${enemyTemplate.id}_${Date.now()}`,
            sequenceNumber,
            colorTag,
            stats: JSON.parse(JSON.stringify(enemyTemplate.stats || {
                vida: { current: enemyTemplate.hp || 10, max: enemyTemplate.hp || 10 },
                postura: { current: 3, max: 4 },
                ingenio: { current: 2, max: 3 },
                cordura: { current: 3, max: 3 },
                armadura: { current: 1, max: 1 }
            })),
            conditions: []
        };
        saveCombatState([...combatants, newInstance]);
        setShowAddModal(false);
    };

    const removeCombatant = (instanceId) => {
        saveCombatState(combatants.filter(c => c.instanceId !== instanceId));
    };

    const updateCombatant = (instanceId, updates) => {
        const updated = combatants.map(c =>
            c.instanceId === instanceId ? { ...c, ...updates } : c
        );
        saveCombatState(updated);
    };

    const cycleColorTag = (instanceId) => {
        const combatant = combatants.find(c => c.instanceId === instanceId);
        if (!combatant) return;
        const colors = Object.keys(COLOR_TAGS);
        const currentIndex = colors.indexOf(combatant.colorTag || 'ceniza');
        const nextColor = colors[(currentIndex + 1) % colors.length];
        updateCombatant(instanceId, { colorTag: nextColor });
    };

    const toggleConditionForTarget = (conditionId) => {
        if (!conditionPickerTarget) return;
        const current = conditionPickerTarget.conditions || [];
        const newConditions = current.includes(conditionId)
            ? current.filter(c => c !== conditionId)
            : [...current, conditionId];

        updateCombatant(conditionPickerTarget.instanceId, { conditions: newConditions });

        // Update local reference to keep modal in sync visually
        setConditionPickerTarget(prev => ({ ...prev, conditions: newConditions }));
    };

    const clearCombat = () => {
        if (window.confirm('¿Limpiar todo el combate?')) {
            saveCombatState([]);
        }
    };

    const statColors = {
        postura: 'border-green-600/70 text-green-400',
        vida: 'border-red-600/70 text-red-400',
        ingenio: 'border-blue-600/70 text-blue-400',
        cordura: 'border-purple-600/70 text-purple-400',
        armadura: 'border-slate-600/70 text-slate-400',
    };

    const activeCombatant = combatants.find(c => c.instanceId === statAdjusterTarget?.combatant?.instanceId);

    const updateTargetStat = (newValue) => {
        if (!activeCombatant || !statAdjusterTarget) return;
        const { statKey } = statAdjusterTarget;
        const statVal = activeCombatant.stats?.[statKey] || { current: 0, max: 0 };
        const boundedValue = Math.min(statVal.max, Math.max(0, newValue));
        
        updateCombatant(activeCombatant.instanceId, {
            stats: {
                ...activeCombatant.stats,
                [statKey]: { ...statVal, current: boundedValue }
            }
        });
    };

    const filteredEnemies = allEnemies.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalActiveConditions = combatants.reduce((total, combatant) => total + (combatant.conditions || []).length, 0);
    const woundedCombatants = combatants.filter((combatant) => {
        const vida = getStatValue(combatant, 'vida');
        return vida.max > 0 && vida.current < vida.max;
    }).length;

    const handleOpenDetails = (combatant) => {
        // Find the original template to show the "general" sheet
        const original = allEnemies.find(e => e.id === combatant.id);
        setDetailEnemy(original || combatant);
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#050b14] text-slate-200 selection:bg-red-500/30">
            {/* Toolbar */}
            <div className="shrink-0 bg-[#050b14]/95 backdrop-blur-md border-b border-red-900/30 shadow-2xl">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 md:py-0 md:h-20 flex flex-col gap-4 md:flex-row md:items-center justify-between">
                    <div className="flex items-center justify-between md:justify-start gap-4 sm:gap-6 w-full md:w-auto">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <button 
                                onClick={onBack} 
                                className="w-10 h-10 shrink-0 rounded-full border border-red-900/50 flex items-center justify-center text-red-500 hover:bg-red-900/20 hover:border-red-500 hover:scale-105 transition-all group"
                                aria-label="Cerrar Gestor de Combate"
                            >
                                <FiChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                            <div className="min-w-0">
                                <h2 className="text-xl sm:text-2xl font-['Cinzel'] font-bold text-red-50 tracking-[0.15em] flex items-center gap-2">
                                    <Swords className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-red-500" /> COMBATE
                                </h2>
                                <div className="text-[9px] sm:text-[10px] text-red-400/60 font-bold tracking-[0.3em] uppercase truncate">
                                    Gestor de Encuentros
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-stretch md:justify-end">
                        {combatants.length > 0 && (
                            <button
                                onClick={clearCombat}
                                className="flex-1 md:flex-initial flex items-center justify-center h-11 md:h-10 px-4 border border-red-900/30 bg-transparent rounded-sm text-red-400 hover:bg-red-950/20 hover:border-red-500 transition-colors cursor-pointer"
                            >
                                <span className="font-['Cinzel'] font-bold text-[10px] sm:text-xs uppercase tracking-wider">Limpiar Encuentro</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 h-11 md:h-10 px-4 border border-red-900/50 rounded-sm text-red-500 hover:bg-red-900/20 hover:text-red-400 transition-colors group cursor-pointer"
                        >
                            <FiPlus className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-90" />
                            <span className="font-['Cinzel'] font-bold text-[10px] sm:text-xs uppercase tracking-wider">Añadir Enemigo</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Combatants List */}
            <div className="relative flex-1 overflow-y-auto p-4 custom-scrollbar md:p-8 bg-[#050b14]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_50%_0%,rgba(127,29,29,0.06),transparent_55%)]" />
                <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-20">
                    
                    {/* Resumen Lineal Elegante */}
                    <div className="grid gap-4 border-b border-red-900/20 pb-5 items-center justify-between md:flex md:flex-row">
                        <div>
                            <div className="mb-1 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rotate-45 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.65)]" />
                                <h3 className="font-['Cinzel'] text-sm font-bold uppercase tracking-[0.28em] text-red-400">Encuentro Activo</h3>
                            </div>
                            <p className="max-w-2xl text-xs text-slate-400">
                                Sincronización en tiempo real. Ajusta recursos, revisa alteraciones y abre fichas detalladas de los contendientes.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 divide-x divide-red-900/20 md:flex md:divide-x-0 md:gap-6 py-2.5 px-2 md:px-4 w-full md:w-auto border border-red-900/20 bg-[#1a0505]/20 rounded-sm">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1">
                                <span className="font-['Cinzel'] text-[9px] sm:text-[10px] font-bold tracking-widest text-red-500">ENEMIGOS</span>
                                <span className="font-mono text-xs sm:text-sm text-slate-100 font-bold">{combatants.length}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1">
                                <span className="font-['Cinzel'] text-[9px] sm:text-[10px] font-bold tracking-widest text-red-500">HERIDOS</span>
                                <span className="font-mono text-xs sm:text-sm text-slate-100 font-bold">{woundedCombatants}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1">
                                <span className="font-['Cinzel'] text-[9px] sm:text-[10px] font-bold tracking-widest text-red-500">ALTERACIONES</span>
                                <span className="font-mono text-xs sm:text-sm text-slate-100 font-bold">{totalActiveConditions}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-2">
                        <AnimatePresence>
                            {combatants.map(combatant => (
                                <CombatantCard
                                    key={combatant.instanceId}
                                    combatant={combatant}
                                    onUpdate={updateCombatant}
                                    onRemove={removeCombatant}
                                    onViewDetails={handleOpenDetails}
                                    onOpenconditions={setConditionPickerTarget}
                                    onCycleColorTag={cycleColorTag}
                                    onOpenStatAdjuster={(c, k) => setStatAdjusterTarget({ combatant: c, statKey: k })}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {combatants.length === 0 && (
                        <div className="flex min-h-[42vh] flex-col items-center justify-center rounded-sm border border-dashed border-red-900/30 bg-[#1a0505]/5 px-6 py-16 text-center shadow-md">
                            <Swords className="mb-4 h-12 w-12 text-red-900/30" />
                            <p className="font-['Cinzel'] text-lg font-bold uppercase tracking-[0.2em] text-red-500/80">El Campo de Batalla está Vacío</p>
                            <p className="mt-2 max-w-md text-xs text-slate-500">Añade enemigos para comenzar el encuentro y controlar sus recursos en tiempo real de forma sincronizada.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-6 flex items-center gap-2 rounded-sm border border-red-900/50 bg-red-950/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                            >
                                <FiPlus className="h-4 w-4" /> Añadir Enemigo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Condition Picker Modal */}
            <AnimatePresence>
                {conditionPickerTarget && (
                    <motion.div
                        variants={overlayVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 bg-black/80 z-[70] backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setConditionPickerTarget(null)}
                    >
                        <motion.div
                            variants={modalVariants}
                            className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-sm border-2 border-red-900/60 bg-[#050b14] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] custom-scrollbar sm:p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-8 pb-3 border-b border-red-900/20">
                                <h3 className="font-['Cinzel'] font-bold text-lg text-red-200 uppercase tracking-widest">Alteraciones de Estado</h3>
                                <button 
                                    onClick={() => setConditionPickerTarget(null)} 
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-red-900/50 text-red-500 hover:text-red-400 hover:border-red-500 transition-colors"
                                >
                                    <FiX size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {CONDITIONS.map((def) => {
                                    const { id, icon: Icon, label } = def;
                                    const isActive = (conditionPickerTarget.conditions || []).includes(id);
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => toggleConditionForTarget(id)}
                                            className={`
                                                relative flex flex-col items-center justify-center p-4 rounded-sm border transition-all duration-300 gap-3 overflow-hidden group active:scale-95
                                                ${isActive
                                                    ? `${def.activeBgClass || 'bg-red-950/30'} ${def.activeBorderClass || 'border-red-500/50'} ${def.shadowClass || 'shadow-[0_0_15px_rgba(220,38,38,0.15)]'}`
                                                    : `${def.bgClass || 'bg-[#1a0505]/40'} ${def.borderClass || 'border-red-900/20'} ${def.hoverBgClass || 'hover:bg-[#1a0505]/80'} ${def.hoverBorderClass || 'hover:border-red-900/50'}`}
                                            `}
                                        >
                                            <Icon className={`w-8 h-8 transition-all duration-300 ${isActive ? (def.activeIconClass || 'text-red-400 drop-shadow-[0_0_6px_rgba(220,38,38,0.6)] scale-110') : `text-slate-600 opacity-60 group-hover:opacity-100 group-hover:scale-105 group-hover:${def.colorClass || 'text-red-500/70'}`}`} />
                                            
                                            <span className={`text-[9px] font-bold uppercase tracking-[0.18em] transition-colors ${isActive ? 'text-red-200' : 'text-slate-500 group-hover:text-slate-350'}`}>
                                                {label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail View Modal */}
            <AnimatePresence>
                {detailEnemy && (
                    <motion.div
                        variants={overlayVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            variants={modalVariants}
                            className="relative w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden rounded-sm shadow-2xl border-2 border-red-900/60 flex flex-col bg-[#050b14]"
                        >
                            <EnemyDetailView
                                enemy={detailEnemy}
                                onClose={() => setDetailEnemy(null)}
                                onUpdate={(updated) => {
                                    onUpdateEnemy && onUpdateEnemy(updated);
                                    setAllEnemies(prev => prev.map(e => e.id === updated.id ? updated : e));
                                }}
                                onDelete={() => { }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Enemy Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        variants={overlayVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 bg-black/80 z-[70] backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            variants={modalVariants}
                            className="relative flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm border-2 border-red-900/60 bg-[#050b14] shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Search Header */}
                            <div className="flex items-center gap-4 border-b border-red-900/20 bg-black/20 p-5 sm:p-6">
                                <div className="relative flex-1 flex items-center gap-3 bg-transparent border-b border-red-900/30 transition-all duration-300 focus-within:border-red-500 py-2">
                                    <FiSearch className="h-4 w-4 text-red-800" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="BUSCAR ENEMIGO..."
                                        className="w-full border-none bg-transparent font-['Cinzel'] text-xs font-bold text-red-100 outline-none placeholder:text-red-900/40 tracking-widest uppercase"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowAddModal(false)} 
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-red-900/50 text-red-500 hover:bg-red-900/20 hover:border-red-500 transition-all duration-300 active:scale-95"
                                >
                                    <FiX size={16} />
                                </button>
                            </div>

                            {/* Grid List */}
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 custom-scrollbar">
                                {filteredEnemies.map(enemy => (
                                    <div
                                        key={enemy.id}
                                        onClick={() => addCombatant(enemy)}
                                        className="group relative flex cursor-pointer items-center rounded-sm border border-red-900/20 bg-[#0a0505] min-h-[5.5rem] overflow-hidden transition-all duration-300 hover:border-red-500/50 hover:scale-[1.01]"
                                    >
                                        {/* Left-side Portrait block, flush to the borders */}
                                        <div className="w-20 sm:w-24 self-stretch shrink-0 relative overflow-hidden bg-black/60">
                                            {enemy.image ? (
                                                <img 
                                                    src={enemy.image} 
                                                    className="w-full h-full object-cover object-center opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                                                    alt="" 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-[#100303] flex items-center justify-center">
                                                    <Skull className="h-8 w-8 text-red-950/20" />
                                                </div>
                                            )}
                                            {/* Horizontal gradient overlay to blend image into the dark card content */}
                                            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-[#0a0505] pointer-events-none" />
                                            {/* Left red gothic accent pillar on hover */}
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500/30 group-hover:bg-red-500/80 transition-colors shadow-[0_0_8px_rgba(239,68,68,0.3)] pointer-events-none" />
                                        </div>

                                        {/* Foreground text content */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center py-3 pl-4 pr-2">
                                            <h4 className="font-['Cinzel'] font-bold text-sm text-red-100 truncate group-hover:text-red-400 transition-colors">{enemy.name}</h4>
                                            <p className="mt-1 text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] group-hover:text-slate-200 transition-colors">{enemy.type}</p>
                                        </div>

                                        {/* Action Add button */}
                                        <div className="pr-4 py-3 shrink-0">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-red-900/50 text-red-500 transition-all duration-300 group-hover:border-red-500 group-hover:bg-red-900/30 group-hover:text-red-200 active:scale-90">
                                                <FiPlus size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ajustador Táctil (Tactile Bottom Sheet Drawer) */}
            <AnimatePresence>
                {statAdjusterTarget && activeCombatant && (() => {
                    const { statKey } = statAdjusterTarget;
                    const theme = STAT_THEME[statKey];
                    const stat = getStatValue(activeCombatant, statKey);
                    const Icon = theme.icon;
                    const colors = statColors[statKey] || 'border-red-600/70 text-red-400';
                    const isVida = statKey === 'vida';
                    const isPostura = statKey === 'postura';
                    
                    return (
                        <>
                            {/* Backdrop overlay */}
                            <motion.div
                                variants={overlayVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="fixed inset-0 bg-black/75 z-[70] backdrop-blur-sm md:hidden"
                                onClick={() => setStatAdjusterTarget(null)}
                            />

                            {/* Sliding panel */}
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={smoothTransition}
                                className={`fixed bottom-0 inset-x-0 bg-[#070d19] border-t-2 ${colors.split(' ')[0]} z-[80] shadow-[0_-15px_40px_rgba(0,0,0,0.85)] rounded-t-xl overflow-hidden p-5 flex flex-col gap-6 pb-9 md:hidden max-h-[85vh]`}
                            >
                                {/* Grabber */}
                                <div className="w-12 h-1.5 bg-slate-800/80 rounded-full mx-auto shrink-0 mb-1" />

                                {/* Header */}
                                <div className="flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2 bg-black/45 rounded-sm border border-slate-900 ${colors.split(' ')[1]}`}>
                                            <Icon className="w-6 h-6 shrink-0" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className={`font-['Cinzel'] font-bold text-base uppercase tracking-widest truncate ${colors.split(' ')[1]}`}>
                                                Ajustar {theme.label}
                                            </h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-450 truncate mt-0.5">
                                                {activeCombatant.name} {romanize(activeCombatant.sequenceNumber || 1)}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setStatAdjusterTarget(null)} 
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-red-900/40 text-red-500 bg-black/30 active:scale-90 transition-all shrink-0"
                                    >
                                        <FiX size={16} />
                                    </button>
                                </div>

                                {/* Touch Target Controllers */}
                                <div className="flex items-center justify-center gap-8 py-2">
                                    <button
                                        type="button"
                                        onClick={() => updateTargetStat(stat.current - 1)}
                                        disabled={stat.current <= 0}
                                        className="w-16 h-16 rounded-full border border-red-900/40 bg-black/60 text-red-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                                        aria-label={`Reducir ${theme.label}`}
                                    >
                                        <FiMinus className="h-6 w-6" />
                                    </button>

                                    <div className="flex flex-col items-center select-none">
                                        <span className="font-mono text-5xl font-bold text-slate-100 leading-none">
                                            {stat.current}
                                        </span>
                                        <span className="font-mono text-xs font-bold text-slate-500 tracking-wider mt-2.5">
                                            LÍMITE MÁXIMO: {stat.max}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => updateTargetStat(stat.current + 1)}
                                        disabled={stat.current >= stat.max}
                                        className="w-16 h-16 rounded-full border border-red-900/40 bg-black/60 text-red-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                                        aria-label={`Aumentar ${theme.label}`}
                                    >
                                        <FiPlus className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Segmented Bar */}
                                {stat.max > 0 && (
                                    <div className="flex flex-col gap-2.5">
                                        <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Selección Rápida de Segmento</div>
                                        <div className="flex h-9 w-full relative pl-1 select-none">
                                            {Array.from({ length: stat.max }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => updateTargetStat(i + 1)}
                                                    className={`flex-1 h-full transition-all duration-300 relative min-w-[14px] focus:outline-none ${i < stat.current ? theme.bgClass + ' ' + theme.borderClass : theme.bgClass + '/10 ' + theme.borderClass + '/20'}`}
                                                    style={{
                                                        clipPath: i === 0
                                                            ? 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
                                                            : 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)',
                                                        marginLeft: i === 0 ? '0' : '-7px',
                                                        zIndex: stat.max - i,
                                                        filter: 'drop-shadow(1px 0 0 rgba(0,0,0,0.6))'
                                                    }}
                                                    aria-label={`Ajustar a ${i + 1}`}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                                    <div className="absolute top-0 left-0 right-0 h-[0.5px] bg-white/15 pointer-events-none"></div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tactical Shortcuts */}
                                <div className="flex gap-4 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => updateTargetStat(stat.max)}
                                        className="flex-1 py-3 px-4 border border-emerald-950/80 bg-emerald-950/25 text-emerald-400 rounded-sm flex items-center justify-center gap-2 hover:bg-emerald-950/45 active:scale-98 transition-all"
                                    >
                                        <Heart className="w-4 h-4 shrink-0" />
                                        <span className="font-['Cinzel'] font-bold text-[10px] tracking-wider">
                                            {isVida ? 'CURAR MÁXIMO' : isPostura ? 'RESTAURAR TOTAL' : 'MÁXIMO'}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => updateTargetStat(0)}
                                        className="flex-1 py-3 px-4 border border-red-950/80 bg-red-950/25 text-red-400 rounded-sm flex items-center justify-center gap-2 hover:bg-red-950/45 active:scale-98 transition-all"
                                    >
                                        <Skull className="w-4 h-4 shrink-0" />
                                        <span className="font-['Cinzel'] font-bold text-[10px] tracking-wider">
                                            {isVida ? 'DERROTAR' : 'REDUCIR A 0'}
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};
