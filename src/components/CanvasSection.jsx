import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FiArrowLeft, FiMinus, FiPlus, FiMove, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { BsDice6 } from 'react-icons/bs';
import { LayoutGrid, Maximize, Ruler, Palette, Settings, Image, Upload, Trash2, Home, Plus, Save, FolderOpen, ChevronLeft, ChevronRight, ChevronDown, Check, X, Sparkles, Activity, RotateCw, Edit2, Lightbulb, PenTool, Square, DoorOpen, DoorClosed, EyeOff, Lock, Eye, Users, ShieldCheck, ShieldOff, Shield, AlertTriangle, Sword, Zap, Gem, Search, Package } from 'lucide-react';
import EstadoSelector from './EstadoSelector';
import TokenResources from './TokenResources';
import TokenHUD from './TokenHUD';
import CombatHUD from './CombatHUD';
import { DEFAULT_STATUS_EFFECTS, ICON_MAP } from '../utils/statusEffects';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getOrUploadFile, releaseFile } from '../utils/storage'; // Importamos releaseFile para limpiar
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_COLORS = [
    '#334155', '#94a3b8', // Slates
    '#c8aa6e', '#785a28', // Golds
    '#ef4444', '#22c55e', // Red, Green
    '#3b82f6', '#a855f7'  // Blue, Purple
];

const GRID_SIZE = 50; // Tamaño de la celda en px
const WORLD_SIZE = 12000; // Tamaño del mundo canvas en px (Aumentado para mapas 4k)

// Helpers matemáticos para Muros y Colisiones
const linesIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (det === 0) return false;
    const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
    const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
    return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
};

// Genera los puntos de un polígono de sombra proyectado
const calculateShadowPoints = (lx, ly, x1, y1, x2, y2, projection = 10000) => {
    // Protección contra valores no numéricos que romperían el SVG en móvil
    if (!Number.isFinite(lx) || !Number.isFinite(ly) || !Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
        return "0,0 0,0 0,0 0,0";
    }

    // Calculamos la dirección del muro para extenderlo un poco (1px) y evitar fugas en las esquinas
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nudge = 1.5; // Pequeño margen para solapar sombras en las uniones

    const nx1 = x1 - (dx / len) * nudge;
    const ny1 = y1 - (dy / len) * nudge;
    const nx2 = x2 + (dx / len) * nudge;
    const ny2 = y2 + (dy / len) * nudge;

    const angle1 = Math.atan2(ny1 - ly, nx1 - lx);
    const angle2 = Math.atan2(ny2 - ly, nx2 - lx);

    const px1 = nx1 + Math.cos(angle1) * projection;
    const py1 = ny1 + Math.sin(angle1) * projection;
    const px2 = nx2 + Math.cos(angle2) * projection;
    const py2 = ny2 + Math.sin(angle2) * projection;

    return `${nx1},${ny1} ${nx2},${ny2} ${px2},${py2} ${px1},${py1}`;
};

const lineRectIntersect = (x1, y1, x2, y2, rx, ry, rw, rh) => {
    // 1. Verificar si alguno de los puntos finales está dentro del rectángulo
    const isInside = (px, py) => px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    if (isInside(x1, y1) || isInside(x2, y2)) return true;

    // 2. Verificar intersección con los 4 lados del rectángulo
    const sides = [
        [rx, ry, rx + rw, ry], // Top
        [rx + rw, ry, rx + rw, ry + rh], // Right
        [rx + rw, ry + rh, rx, ry + rh], // Bottom
        [rx, ry + rh, rx, ry] // Left
    ];

    return sides.some(side => linesIntersect(x1, y1, x2, y2, side[0], side[1], side[2], side[3]));
};

const CanvasThumbnail = ({ scenario }) => {
    const config = scenario.config || {};
    return (
        <div className="w-32 h-32 bg-[#050810] rounded-lg border border-slate-800 overflow-hidden relative flex items-center justify-center shrink-0 shadow-inner">
            {config.backgroundImage ? (
                <img src={config.backgroundImage} className="w-full h-full object-cover opacity-60" alt="Preview" />
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

const SaveToast = ({ show, exiting, type = 'success', message, subMessage }) => {
    if (!show) return null;

    // Configuración según el tipo
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isInfo = type === 'info';
    const isWarning = type === 'warning';

    const mainText = message || (isSuccess ? "PROGRESO\nGUARDADO" : isError ? "ERROR AL\nGUARDAR" : "INFORMACIÓN");
    const subText = subMessage || (isSuccess ? "Encuentro Sincronizado" : isError ? "Error de Conexión" : isWarning ? "Acción No Disponible" : "Aviso del Sistema");

    // Clases dinámicas
    const borderColor = isError ? "border-red-500" : isWarning ? "border-amber-500" : isInfo ? "border-sky-500" : "border-[#c8aa6e]";
    const titleColor = isError ? "text-red-500" : isWarning ? "text-amber-100" : isInfo ? "text-sky-100" : "text-[#f0e6d2]";
    const subtextColor = isError ? "text-red-400" : isWarning ? "text-amber-500" : isInfo ? "text-sky-400" : "text-[#c8aa6e]";
    const iconContainer = isError
        ? "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
        : isWarning
            ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            : isInfo
                ? "border-sky-500 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.2)]"
                : "border-[#c8aa6e] bg-[#c8aa6e]/10 shadow-[0_0_15px_rgba(200,170,110,0.2)]";
    const barColor = isError ? "bg-red-500/50" : isWarning ? "bg-amber-500/50" : isInfo ? "bg-sky-500/50" : "bg-[#c8aa6e]/50";

    return (
        <div className={`fixed top-12 left-1/2 z-[999] origin-top -translate-x-1/2 ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}>
            <div className={`relative bg-[#0b1120] border ${borderColor} px-8 py-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-w-[380px] flex items-center gap-5 rounded-lg`}>
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${iconContainer}`}>
                    {isError ? <X className="w-5 h-5 text-red-500" /> : isWarning ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : isInfo ? <Shield className="w-5 h-5 text-sky-500" /> : <Check className="w-5 h-5 text-[#c8aa6e]" />}
                </div>

                {/* Text */}
                <div className="flex flex-col">
                    <h3 className={`${titleColor} font-fantasy text-xl leading-none tracking-widest text-left mb-1 whitespace-pre-line uppercase`}>
                        {mainText}
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className={`h-[1px] w-6 ${barColor}`}></div>
                        <span className={`${subtextColor} text-[9px] font-bold uppercase tracking-[0.2em]`}>{subText}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Helper: Resolve item image (mirrors LoadoutView getObjectImage) ---
const getObjectImage = (item) => {
    if (item.icon && (item.icon.startsWith('data:') || item.icon.startsWith('http'))) return item.icon;
    const name = (item.name || item.nombre || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    const target = `${name} ${type} ${category}`;
    // Weapons
    if (name.includes('llave inglesa')) return '/armas/llave_inglesa.png';
    if (name.includes('gancho de alcantarilla')) return '/armas/gancho_de_alcantarilla.png';
    if (target.includes('antorcha')) return '/armas/antorcha.png';
    if (name.includes('porra de jade')) return '/armas/Porra de jade.png';
    if (name.includes('sanguinaria')) return '/armas/la_sanguinaria.png';
    if (name.includes('mazo glacial')) return '/armas/mazo_glacial.png';
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
    if (name.includes('honda')) return '/armas/honda.png';
    if (name.includes('tirachinas')) return '/armas/tirachinas.png';
    if (name.includes('estoque')) return '/armas/estoque.png';
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
    if (name.includes('fauces')) return '/armas/fauces.png';
    if (name.includes('garras')) return '/armas/garras.png';
    // Objects
    if (target.includes('chatarra')) return '/objetos/chatarra.jpg';
    if (target.includes('comida')) return '/objetos/comida.png';
    if (target.includes('remedio') || target.includes('vendaje')) return '/objetos/vendaje.png';
    if (target.includes('dinero') || target.includes('moneda')) return '/objetos/dinero.png';
    if (target.includes('elixir') || target.includes('poción') || target.includes('pocion')) return '/objetos/elixir.png';
    if (target.includes('libro')) return '/objetos/libro.png';
    if (target.includes('llave')) return '/objetos/llave.png';
    if (target.includes('municion') || target.includes('munición')) return '/objetos/municion.png';
    if (target.includes('pergamino')) return '/objetos/pergamino.png';
    if (target.includes('polvora') || target.includes('pólvora')) return '/objetos/polvora.png';
    if (target.includes('coctel molotov') || target.includes('cóctel molotov')) return '/objetos/coctel_molotov.png';
    if (target.includes('herramientas') || target.includes('herramienta')) return '/objetos/herramientas.png';
    if (target.includes('recurso')) return '/objetos/recurso.jpg';
    if (target.includes('accesorio')) return '/objetos/accesorio.png';
    if (target.includes('arma') && !target.includes('armadura')) return '/objetos/arma.png';
    // Armor
    if (target.includes('ultraarmadura de hierro')) return '/armaduras/armadura_de_coloso.png';
    if (target.includes('armadura de placas')) return '/armaduras/armadura_de_placas.png';
    if (target.includes('armadura de hierro')) return '/armaduras/armadura_de_hierro.png';
    if (target.includes('armadura de acero reforzado')) return '/armaduras/armadura_de_acero_reforzado.png';
    if (target.includes('armadura de acero')) return '/armaduras/armadura_de_acero.png';
    if (target.includes('armadura de coloso')) return '/armaduras/armadura_de_coloso.png';
    if (target.includes('armadura de escamas')) return '/armaduras/armadura_de_escamas.png';
    if (target.includes('armadura bandeada')) return '/armaduras/armadura bandeada.png';
    if (target.includes('armadura acolchada')) return '/armaduras/armadura_acolchada.png';
    if (target.includes('armadura de piel') || target.includes('armadura de pieles')) return '/armaduras/armadura_de_piel.png';
    if (target.includes('armadura de cuero tachonado')) return '/armaduras/armadura_de_cuero_tachonado.png';
    if (target.includes('armadura de cuero')) return '/armaduras/armadura_de_cuero.png';
    if (target.includes('camisote de mallas')) return '/armaduras/cota_de_malla.png';
    if (target.includes('armadura')) return '/objetos/armadura.png';
    // Accessories
    if (name.includes('casco de minero')) return '/accesorios/casco_de_minero.png';
    return null;
};

// --- Helper: Get rarity visual info ---
const getRarityInfo = (rareza) => {
    const r = (rareza || '').toLowerCase();
    if (r.includes('legendari')) return { border: 'border-orange-500/50', text: 'text-orange-400', glow: 'from-orange-900/80', stripe: 'bg-orange-500' };
    if (r.includes('épic') || r.includes('epic')) return { border: 'border-purple-500/50', text: 'text-purple-400', glow: 'from-purple-900/80', stripe: 'bg-purple-500' };
    if (r.includes('rar')) return { border: 'border-blue-500/50', text: 'text-blue-400', glow: 'from-blue-900/80', stripe: 'bg-blue-500' };
    if (r.includes('poco com')) return { border: 'border-green-500/50', text: 'text-green-400', glow: 'from-green-900/80', stripe: 'bg-green-500' };
    return { border: 'border-slate-700', text: 'text-slate-500', glow: 'from-slate-800', stripe: 'bg-slate-600' };
};

// --- Normalize glossary word (mirrors LoadoutView) ---
const normalizeGlossaryWord = (word) => (word || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// =============================================================================
// EquipmentSection — Inventory-style equipment panel for canvas inspector
// Mirrors the aesthetic of LoadoutView / Mazo Inicial / Inventario
// =============================================================================
const EquipmentSection = ({ equippedItems = [], categories = [], rarityColorMap = {}, glossary = [], highlightText = (t) => t, onAddItem, onRemoveItem }) => {
    const [addCat, setAddCat] = useState('weapons');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const searchInputRef = useRef(null);

    // Find current category config
    const currentCat = categories.find(c => c.id === addCat) || categories[0];
    const filteredItems = useMemo(() => {
        const list = currentCat?.items || [];
        if (!searchTerm) return list.slice(0, 50);
        const q = searchTerm.toLowerCase();
        return list.filter(i => (i.nombre || i.name || '').toLowerCase().includes(q)).slice(0, 50);
    }, [currentCat, searchTerm]);

    useEffect(() => {
        if (isAddOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 80);
        }
    }, [isAddOpen, addCat]);

    // Render a trait pill with optional glossary tooltip
    const renderTrait = (t, i) => {
        const traitName = (typeof t === 'string' ? t : String(t)).trim();
        if (!traitName) return null;
        const normalizedTrait = normalizeGlossaryWord(traitName);
        const glossaryEntry = (glossary || []).find(g => normalizeGlossaryWord(g.word) === normalizedTrait);
        if (glossaryEntry) {
            return (
                <span
                    key={i}
                    className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/90 text-[#f0e6d2] border border-slate-700 uppercase cursor-help hover:border-[#c8aa6e] transition-colors shadow-sm"
                    data-tooltip-id="trait-tooltip"
                    data-tooltip-content={glossaryEntry.info}
                    style={glossaryEntry.color ? { color: glossaryEntry.color } : {}}
                >
                    {traitName}
                </span>
            );
        }
        return (
            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 uppercase">
                {traitName}
            </span>
        );
    };

    // Type icon map
    const typeIcons = { weapon: Sword, armor: Shield, access: Gem, power: Zap, ability: Zap };

    return (
        <div className="pt-4 border-t border-slate-800/50 space-y-4">
            {/* Section Header — matches LoadoutView title style */}
            <div className="flex items-center gap-3">
                <Sword className="w-4 h-4 text-[#c8aa6e]" />
                <h3 className="text-[#c8aa6e] font-['Cinzel'] text-xs tracking-[0.15em] uppercase">
                    Equipamiento
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-[#c8aa6e]/30 to-transparent" />
                {equippedItems.length > 0 && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#c8aa6e]/10 text-[#c8aa6e] border border-[#c8aa6e]/20">
                        {equippedItems.length}
                    </span>
                )}
            </div>

            {/* Equipped Items — Inventory card style */}
            {equippedItems.length > 0 ? (
                <div className="space-y-2">
                    {equippedItems.map((item, idx) => {
                        const rarity = getRarityInfo(item.rareza);
                        const rarityColor = rarityColorMap[item.rareza] || '#94a3b8';
                        const itemImage = getObjectImage(item);
                        const TypeIcon = typeIcons[item.type] || Package;
                        const traits = item.rasgos ? (Array.isArray(item.rasgos) ? item.rasgos : item.rasgos.toString().split(',')) : (item.traits ? item.traits.toString().split(',') : []);

                        return (
                            <div
                                key={idx}
                                className={`relative bg-[#161f32] border ${rarity.border} rounded-lg overflow-hidden group hover:border-[#c8aa6e]/60 transition-all duration-300`}
                            >
                                {/* Rarity stripe (left edge) */}
                                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${rarity.stripe}`} />

                                <div className="flex">
                                    {/* Left Column — Image or Icon */}
                                    <div className="w-16 shrink-0 relative overflow-hidden">
                                        {itemImage ? (
                                            <>
                                                <img
                                                    src={itemImage}
                                                    alt={item.nombre || item.name}
                                                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#161f32]" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                                            </>
                                        ) : (
                                            <div className={`absolute inset-0 bg-gradient-to-br ${rarity.glow} via-[#161f32] to-[#161f32] flex items-center justify-center`}>
                                                <TypeIcon className={`w-7 h-7 ${rarity.text} opacity-60`} />
                                            </div>
                                        )}
                                        {/* Rarity badge overlay */}
                                        {item.rareza && item.rareza.toLowerCase() !== 'común' && (
                                            <div className="absolute bottom-1 left-1 z-10">
                                                <span className={`text-[7px] uppercase font-bold ${rarity.text} bg-black/60 px-1 py-0.5 rounded`}>
                                                    {item.rareza}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column — Content */}
                                    <div className="flex-1 min-w-0 p-2 pl-2.5 flex flex-col">
                                        {/* Name */}
                                        <span
                                            className="text-[11px] font-['Cinzel'] uppercase tracking-wider font-bold truncate leading-tight"
                                            style={{ color: rarityColor }}
                                        >
                                            {item.nombre || item.name}
                                        </span>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-[9px]">
                                            {(item.dano || item.damage) && (
                                                <div>
                                                    <span className="text-slate-500 uppercase font-bold">Daño:</span>{' '}
                                                    <span className="text-red-300 font-mono">{item.dano || item.damage}</span>
                                                </div>
                                            )}
                                            {(item.defensa || item.defense) && (
                                                <div>
                                                    <span className="text-slate-500 uppercase font-bold">Defensa:</span>{' '}
                                                    <span className="text-blue-300 font-mono">{item.defensa || item.defense}</span>
                                                </div>
                                            )}
                                            {(item.alcance || item.range) && (
                                                <div>
                                                    <span className="text-slate-500 uppercase font-bold mr-1">Alc:</span>
                                                    <span className="text-slate-300">{item.alcance || item.range}</span>
                                                </div>
                                            )}
                                            {(item.consumo || item.consumption) && (
                                                <div>
                                                    <span className="text-slate-500 uppercase font-bold mr-1">Coste:</span>
                                                    <span>{item.consumo || item.consumption}</span>
                                                </div>
                                            )}
                                            {item.poder && (
                                                <div>
                                                    <span className="text-slate-500 uppercase font-bold">Poder:</span>{' '}
                                                    <span className="text-purple-300 font-mono">{item.poder}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Traits */}
                                        {traits.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {traits.map((t, i) => renderTrait(t, i))}
                                            </div>
                                        )}

                                        {/* Description */}
                                        {(item.detail || item.description || item.descripcion) && (
                                            <div className="mt-auto pt-1">
                                                <p className="text-[9px] text-emerald-100/50 italic leading-relaxed font-serif border-l-2 border-emerald-500/20 pl-1.5 line-clamp-2">
                                                    "{item.detail || item.description || item.descripcion}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveItem && onRemoveItem(idx);
                                    }}
                                    className="absolute top-1.5 right-1.5 p-1 bg-red-500/10 hover:bg-red-500/30 text-red-400/70 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all z-20"
                                    title="Eliminar"
                                >
                                    <X className="w-3 h-3" />
                                </button>

                                {/* Hover Glow Sweep */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 py-5 px-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/30">
                    <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
                        <Package size={18} className="text-slate-600" />
                    </div>
                    <p className="text-[10px] text-slate-600 text-center leading-relaxed">
                        Sin equipamiento.<br />
                        <span className="text-slate-500">Usa el panel de abajo para añadir.</span>
                    </p>
                </div>
            )}

            {/* Add Item Panel — mirroring LoadoutView "Agregar al inventario" */}
            <div className="rounded-lg border border-slate-700/60 overflow-hidden bg-[#0f172a]">
                {/* Toggle header */}
                <button
                    onClick={() => { setIsAddOpen(!isAddOpen); setSearchTerm(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/30 transition-all"
                >
                    <Plus size={14} className={`text-[#c8aa6e] transition-transform duration-200 ${isAddOpen ? 'rotate-45' : ''}`} />
                    <span className="text-[10px] text-[#c8aa6e] font-['Cinzel'] uppercase tracking-[0.15em] flex-1">
                        Agregar al equipamiento
                    </span>
                    <ChevronDown size={12} className={`text-slate-500 transition-transform duration-200 ${isAddOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAddOpen && (
                    <div className="border-t border-slate-800/80">
                        {/* Category tabs */}
                        <div className="flex gap-1 p-2 border-b border-slate-800/50 overflow-x-auto">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => { setAddCat(cat.id); setSearchTerm(''); }}
                                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${addCat === cat.id
                                        ? 'bg-[#c8aa6e]/20 text-[#c8aa6e] border border-[#c8aa6e]/40'
                                        : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Search input */}
                        <div className="p-2 border-b border-slate-800/50">
                            <div className="flex items-center gap-2 bg-black/40 rounded-md px-3 py-1.5 border border-slate-700/50 focus-within:border-[#c8aa6e]/40 transition-colors">
                                <Search size={13} className="text-slate-500 shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder={`Buscar ${currentCat?.label || ''}...`}
                                    className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600 min-w-0"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="text-slate-600 hover:text-slate-300 transition-colors">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredItems.length === 0 ? (
                                <div className="py-6 flex flex-col items-center gap-2 text-slate-600">
                                    <Search size={20} className="opacity-30" />
                                    <p className="text-[10px] italic">Sin resultados</p>
                                </div>
                            ) : (
                                filteredItems.map((item, idx) => {
                                    const rarityColor = rarityColorMap[item.rareza] || '#94a3b8';
                                    const subInfo = item.dano || item.defensa || item.poder || item.alcance || '';
                                    return (
                                        <div
                                            key={item.id || idx}
                                            className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-800/30 last:border-b-0 hover:bg-white/[0.03] transition-all group"
                                        >
                                            <div
                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{ backgroundColor: rarityColor, boxShadow: `0 0 6px ${rarityColor}60` }}
                                            />
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[11px] font-semibold truncate" style={{ color: rarityColor }}>
                                                    {item.nombre || item.name}
                                                </span>
                                                {subInfo && <span className="text-[9px] text-slate-600 truncate">{subInfo}</span>}
                                            </div>
                                            <button
                                                onClick={() => { onAddItem && onAddItem(item, currentCat.type); }}
                                                className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded bg-[#c8aa6e]/15 text-[#c8aa6e] border border-[#c8aa6e]/30 hover:bg-[#c8aa6e]/30 hover:border-[#c8aa6e]/60 transition-all active:scale-95 shrink-0"
                                            >
                                                Agregar
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-1.5 border-t border-slate-800/50 flex justify-between items-center">
                            <span className="text-[9px] text-slate-600 font-mono">{filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''}</span>
                            <button
                                onClick={() => { setIsAddOpen(false); setSearchTerm(''); }}
                                className="text-[9px] text-slate-500 hover:text-slate-300 uppercase font-bold tracking-wider transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const CanvasSection = ({ onBack, currentUserId = 'user-dm', isMaster = true, playerName = '', isPlayerView = false, existingPlayers = [], characterData = null, onOpenCharacterSheet = null, armas = [], armaduras = [], habilidades = [], accesorios = [], glossary = [], rarityColorMap = {}, highlightText = (t) => t }) => {
    // Estado de la cámara (separado en zoom y offset como en MinimapV2)
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Estado para la Biblioteca de Escenarios
    const [scenarios, setScenarios] = useState([]);
    const [activeScenario, setActiveScenario] = useState(null);
    const [globalActiveId, setGlobalActiveId] = useState(null);
    const activeScenarioRef = useRef(null);
    useEffect(() => { activeScenarioRef.current = activeScenario; }, [activeScenario]);

    const [viewMode, setViewMode] = useState('LIBRARY'); // 'LIBRARY' | 'EDIT'
    const lastActionTimeRef = useRef(0);
    const [showToast, setShowToast] = useState(false);
    const [toastExiting, setToastExiting] = useState(false);
    const [toastType, setToastType] = useState('success');
    const [toastMessage, setToastMessage] = useState('');
    const [toastSubMessage, setToastSubMessage] = useState('');

    const triggerToast = useCallback((message = '', subMessage = '', type = 'success') => {
        setToastType(type);
        setToastMessage(message);
        setToastSubMessage(subMessage);
        setShowToast(true);
        setToastExiting(false);
    }, []);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [pendingImageFile, setPendingImageFile] = useState(null); // Archivo real para subir a Storage
    const [isSaving, setIsSaving] = useState(false); // Estado de guardado en progreso
    const [clipboard, setClipboard] = useState([]); // Portapapeles para copiar/pegar tokens

    // Helper para normalizar coordenadas de eventos (Mouse vs Touch)
    const getEventCoords = (e, identifier = null) => {
        if (e.touches && e.touches.length > 0) {
            if (identifier !== null) {
                const touch = Array.from(e.touches).find(t => t.identifier === identifier);
                if (touch) return { x: touch.clientX, y: touch.clientY };
                // Si el toque específico ya no está, usamos el primero como fallback razonable
            }
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    // Tabs del Sidebar
    const [activeTab, setActiveTab] = useState(isPlayerView ? 'TOKENS' : 'CONFIG'); // 'CONFIG' | 'TOKENS' | 'ACCESS' | 'INSPECTOR'
    const [activeLayer, setActiveLayer] = useState('TABLETOP'); // 'TABLETOP' | 'LIGHTING'
    const [tokens, setTokens] = useState([]);
    const [uploadingToken, setUploadingToken] = useState(false);

    // Estado para Drag & Drop de Tokens en el Canvas
    const [draggedTokenId, setDraggedTokenId] = useState(null); // ID del token principal being dragged (para referencia visual inmediata)
    const [tokenDragStart, setTokenDragStart] = useState({ x: 0, y: 0, identifier: null }); // Posición inicial del mouse/touch
    const [tokenOriginalPos, setTokenOriginalPos] = useState({}); // Mapa de posiciones originales { [id]: {x, y} }
    const [selectedTokenIds, setSelectedTokenIds] = useState([]); // Array de IDs seleccionados
    const [rotatingTokenId, setRotatingTokenId] = useState(null);
    const [resizingTokenId, setResizingTokenId] = useState(null); // Nuevo estado para resize
    const resizeStartRef = useRef(null); // { x, y, width, height }

    // Detección de móvil para deshabilitar ciertas funcionalidades problemáticas
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Estado para Cuadro de Selección
    const [selectionBox, setSelectionBox] = useState(null); // { start: {x,y}, current: {x,y} } (Screen Coords)

    // Estado para Arrastre de Extremos de Muros
    const [draggingWallHandle, setDraggingWallHandle] = useState(null); // { id, handleIndex: 1 | 2 }

    // Estado para Dibujo de Muros
    const [isDrawingWall, setIsDrawingWall] = useState(false);
    const [wallDrawingStart, setWallDrawingStart] = useState(null); // { x, y } en Mundo
    const [wallDrawingCurrent, setWallDrawingCurrent] = useState(null); // { x, y } en Mundo

    // Configuración de movimiento

    // Refs para gestión de eventos directos (performance)
    const containerRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0 });
    // No longer needed: const transformRef = useRef(transform);

    // --- Gestión de Notificaciones (Auto-hide) ---
    useEffect(() => {
        if (showToast) {
            const duration = toastType === 'success' ? 3000 : 4000;
            const timer1 = setTimeout(() => setToastExiting(true), duration);
            const timer2 = setTimeout(() => setShowToast(false), duration + 300);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, [showToast, toastType]);

    const lastSelectedIdRef = useRef(null);

    // Auto-open Inspector on Selection
    useEffect(() => {
        // No hacer nada si estamos rotando
        if (rotatingTokenId) return;

        if (selectedTokenIds.length === 1) {
            // Auto-open deshabilitado a petición del usuario. Solo doble clic abre inspector.
            const currentId = selectedTokenIds[0];
            lastSelectedIdRef.current = currentId;
        } else {
            // Si no hay selección o hay múltiple, reseteamos la referencia
            lastSelectedIdRef.current = null;
            if (selectedTokenIds.length === 0 && activeTab === 'INSPECTOR') {
                setActiveTab(isPlayerView ? 'TOKENS' : 'CONFIG');
            }
        }
    }, [selectedTokenIds, rotatingTokenId, activeTab]);


    // Effect to sync global state and auto-load for players
    useEffect(() => {
        console.log("🕵️ Monitoring global canvas visibility...");
        let activeScenarioUnsub = null;

        const globalUnsub = onSnapshot(doc(db, 'gameSettings', 'canvasVisibility'), (docSnap) => {
            const data = docSnap.exists() ? docSnap.data() : {};
            const activeId = data.activeScenarioId || null;
            setGlobalActiveId(activeId);

            // If no active scenario, clear local state for players
            if (isPlayerView && !activeId) {
                setActiveScenario(null);
                setViewMode('LIBRARY');
                if (activeScenarioUnsub) activeScenarioUnsub();
                return;
            }

            // If activeId changed or we don't have a listener yet
            if (isPlayerView && activeId) {
                if (activeScenarioUnsub) activeScenarioUnsub();

                console.log("📍 Active scenario detected:", activeId);
                const scenarioRef = doc(db, 'canvas_scenarios', activeId);
                activeScenarioUnsub = onSnapshot(scenarioRef, (scenarioDoc) => {
                    if (scenarioDoc.exists()) {
                        const sData = { id: scenarioDoc.id, ...scenarioDoc.data() };
                        const hasPermission = sData.allowedPlayers?.includes(playerName);

                        if (hasPermission) {
                            if (activeScenarioRef.current?.id !== sData.id) {
                                loadScenario(sData);
                            }
                        } else {
                            setActiveScenario(null);
                            setViewMode('LIBRARY');
                        }
                    } else {
                        setActiveScenario(null);
                        setViewMode('LIBRARY');
                    }
                });
            }
        });

        return () => {
            globalUnsub();
            if (activeScenarioUnsub) activeScenarioUnsub();
        };
    }, [isPlayerView, playerName]);

    const setGlobalActiveScenario = async (scenarioId) => {
        try {
            await setDoc(doc(db, 'gameSettings', 'canvasVisibility'), {
                activeScenarioId: scenarioId,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Error toggling active scenario:", e);
        }
    };

    // Listener para Sincronización en Tiempo Real (Multi-navegador)
    useEffect(() => {
        if (!activeScenario?.id) return;

        // Suscribirse a cambios en el documento del escenario activo
        const unsub = onSnapshot(doc(db, 'canvas_scenarios', activeScenario.id), (docSnap) => {
            if (docSnap.exists()) {
                const remoteData = docSnap.data();

                // --- Sincronización de Items (Tokens) ---
                setActiveScenario(current => {
                    if (!current || current.id !== docSnap.id) return current;

                    // Si hay cambios en los items o en lastModified (importante para actualizar máscaras de sombra)
                    const itemsChanged = JSON.stringify(remoteData.items) !== JSON.stringify(current.items);
                    const lastModifiedChanged = remoteData.lastModified !== current.lastModified;

                    if (itemsChanged || lastModifiedChanged) {
                        console.log("🔄 Sincronizando tablero con datos remotos...", { itemsChanged, lastModifiedChanged });
                        return {
                            ...current,
                            items: remoteData.items || [],
                            lastModified: remoteData.lastModified // Crucial para invalidar máscaras de sombra
                        };
                    }
                    return current;
                });

                // --- Sincronización de Configuración (Oscuridad, Grid, Fondo) ---
                if (remoteData.config) {
                    setGridConfig(currentConfig => {
                        // Comprobación profunda simple para evitar re-renders innecesarios
                        if (JSON.stringify(remoteData.config) !== JSON.stringify(currentConfig)) {
                            console.log("🌑 Sincronizando configuración (oscuridad/grid) remota...");
                            return remoteData.config;
                        }
                        return currentConfig;
                    });
                }
            }
        });

        return () => unsub();
    }, [activeScenario?.id]); // Solo se reinicia si cambiamos de escenario base (ID)
    // --- Manejo del Zoom (Rueda del Mouse - Igual que MinimapV2) ---
    // Listener no pasivo para prevenir el scroll por defecto correctamente
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(Math.max(0.1, prev + delta), 5));
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [activeScenario]); // Re-vincular cuando cambia el escenario activo y se monta el viewport

    // Handlers de Touch para Zoom (Pinch) y Pan (Igual que MinimapV2)
    const lastPinchDist = useRef(null);
    const lastTouchPos = useRef({ x: 0, y: 0 });

    const getTouchDistance = (touches) => {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            // Start Pinch
            setIsDragging(false);
            lastPinchDist.current = getTouchDistance(e.touches);
        } else if (e.touches.length === 1) {
            // Start Pan
            const touch = e.touches[0];
            setIsDragging(true);
            dragStartRef.current = { x: touch.clientX, y: touch.clientY };
            lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && lastPinchDist.current !== null) {
            // Pinch Zoom - Zoom focalizado en el punto medio de los dedos
            const newDist = getTouchDistance(e.touches);
            const delta = newDist - lastPinchDist.current;

            // Coordenadas del punto medio en la pantalla
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            // Coordenadas relativas al centro del viewport operativo
            const rect = containerRef.current.getBoundingClientRect();
            const viewCenterX = rect.left + rect.width / 2;
            const viewCenterY = rect.top + rect.height / 2;
            const sx = midX - viewCenterX;
            const sy = midY - viewCenterY;

            // Sensibilidad del pinch
            const zoomDelta = delta * 0.005;

            setZoom(prevZoom => {
                const newZoom = Math.min(Math.max(0.1, prevZoom + zoomDelta), 4);
                if (newZoom === prevZoom) return prevZoom;

                const ratio = newZoom / prevZoom;

                // Ajustar offset para que el punto bajo los dedos se mantenga en su sitio
                setOffset(prevOffset => ({
                    x: sx - (sx - prevOffset.x) * ratio,
                    y: sy - (sy - prevOffset.y) * ratio
                }));

                return newZoom;
            });

            lastPinchDist.current = newDist;
        } else if (e.touches.length === 1 && isDragging) {
            // Pan (con factor de suavizado para móvil)
            const touch = e.touches[0];
            const rawDeltaX = touch.clientX - lastTouchPos.current.x;
            const rawDeltaY = touch.clientY - lastTouchPos.current.y;

            // Factor de amortiguación para que el movimiento en móvil sea más controlado
            const dampingFactor = 0.7;
            const deltaX = rawDeltaX * dampingFactor;
            const deltaY = rawDeltaY * dampingFactor;

            setOffset(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));

            lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        lastPinchDist.current = null;
    };

    // --- Manejo del Paneo (Clic Rueda Central) ---
    const handleMouseDown = (e) => {
        // Permitir arrastre con botón central (Rueda) o si se mantiene pulsada una tecla específica
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            e.preventDefault();
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            document.body.style.cursor = 'grabbing';
        }
    };

    // --- Helper: Screen to World Coords ---
    const divToWorld = (screenX, screenY) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return { x: 0, y: 0 };

        // 1. Convert to simple offset relative to container center
        const startX = screenX - containerRect.left - (containerRect.width / 2);
        const startY = screenY - containerRect.top - (containerRect.height / 2);

        // 2. Adjust for Pan Offset and Zoom
        // Screen = Offset + (World - Center) * Zoom
        // (Screen - Offset) / Zoom = World - Center
        // World = ((Screen - Offset) / Zoom) + Center

        const worldX = ((startX - offset.x) / zoom) + (WORLD_SIZE / 2);
        const worldY = ((startY - offset.y) / zoom) + (WORLD_SIZE / 2);

        return { x: worldX, y: worldY };
    }

    const snapToWallEndpoints = (worldPos, customSnapActive = null) => {
        let snappedPos = { ...worldPos };

        const shouldSnap = customSnapActive !== null ? customSnapActive : gridConfig.snapToGrid;

        // 1. Snap a la rejilla si está activo
        if (shouldSnap) {
            snappedPos.x = Math.round(snappedPos.x / gridConfig.cellWidth) * gridConfig.cellWidth;
            snappedPos.y = Math.round(snappedPos.y / gridConfig.cellHeight) * gridConfig.cellHeight;
        }

        // 2. Snap a otros muros (prioritario sobre la rejilla si está cerca)
        let minDistance = 15 / zoom; // Distancia de magnetismo
        if (activeScenario?.items) {
            activeScenario.items.filter(i => i.type === 'wall').forEach(wall => {
                const d1 = Math.hypot(worldPos.x - wall.x1, worldPos.y - wall.y1);
                const d2 = Math.hypot(worldPos.x - wall.x2, worldPos.y - wall.y2);
                if (d1 < minDistance) {
                    snappedPos = { x: wall.x1, y: wall.y1 };
                    minDistance = d1;
                }
                if (d2 < minDistance) {
                    snappedPos = { x: wall.x2, y: wall.y2 };
                    minDistance = d2;
                }
            });
        }

        return snappedPos;
    }

    const handleMouseMove = (e) => {
        const { x: curX, y: curY } = getEventCoords(e, tokenDragStart.identifier);

        // --- SELECTION BOX ---
        if (selectionBox) {
            setSelectionBox(prev => ({ ...prev, current: { x: curX, y: curY } }));
            return;
        }

        // --- DIBUJO DE MUROS ---
        if (isDrawingWall && wallDrawingStart) {
            const worldPos = divToWorld(curX, curY);
            const snappedPos = snapToWallEndpoints(worldPos);
            setWallDrawingCurrent(snappedPos);
            return;
        }

        // --- ARRASTRE DE EXTREMOS DE MUROS ---
        if (draggingWallHandle && activeScenarioRef.current) {
            const currentScenario = activeScenarioRef.current;
            const worldPos = divToWorld(curX, curY);

            // Buscar el muro para ver si tiene snap individual
            const wall = currentScenario.items.find(i => i.id === draggingWallHandle.id);
            const snappedPos = snapToWallEndpoints(worldPos, wall?.snapToGrid);

            const updatedItems = currentScenario.items.map(item => {
                if (item.id === draggingWallHandle.id) {
                    const newItem = { ...item };
                    if (draggingWallHandle.handleIndex === 1) {
                        newItem.x1 = snappedPos.x;
                        newItem.y1 = snappedPos.y;
                    } else {
                        newItem.x2 = snappedPos.x;
                        newItem.y2 = snappedPos.y;
                    }
                    // Recalcular bounding box para selección y arrastre global del muro
                    newItem.x = Math.min(newItem.x1, newItem.x2);
                    newItem.y = Math.min(newItem.y1, newItem.y2);
                    newItem.width = Math.max(Math.abs(newItem.x2 - newItem.x1), 5);
                    newItem.height = Math.max(Math.abs(newItem.y2 - newItem.y1), 5);
                    return newItem;
                }
                return item;
            });
            setActiveScenario(prev => ({ ...prev, items: updatedItems }));
            return;
        }

        // --- ROTACIÓN LIBRE ---
        if (rotatingTokenId && activeScenarioRef.current) {
            const currentScenario = activeScenarioRef.current;
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            // Encontrar el token
            const token = currentScenario.items.find(t => t.id === rotatingTokenId);
            if (!token) return;

            // 1. Centro del WorldDiv en Pantalla
            const worldDivCenterX = containerRect.width / 2 + offset.x;
            const worldDivCenterY = containerRect.height / 2 + offset.y;

            // 2. Posición del Token respecto al centro del mundo
            const tokenCenterX_World = token.x + token.width / 2;
            const tokenCenterY_World = token.y + token.height / 2;

            // Distancia desde el centro del mundo (WORLD_SIZE/2, WORLD_SIZE/2)
            const distFromCenterWorldX = tokenCenterX_World - (WORLD_SIZE / 2);
            const distFromCenterWorldY = tokenCenterY_World - (WORLD_SIZE / 2);

            // 3. Posición final en pantalla
            const tokenScreenX = worldDivCenterX + (distFromCenterWorldX * zoom);
            const tokenScreenY = worldDivCenterY + (distFromCenterWorldY * zoom);

            // 4. Calcular Ángulo
            const deltaX = curX - tokenScreenX;
            const deltaY = curY - tokenScreenY;

            let angleDeg = (Math.atan2(deltaY, deltaX) * 180 / Math.PI) + 90;

            setLoadingRotation(angleDeg); // Update Rotation

            const newItems = currentScenario.items.map(i => {
                if (i.id === rotatingTokenId) {
                    return { ...i, rotation: angleDeg };
                }
                return i;
            });
            setActiveScenario(prev => ({ ...prev, items: newItems }));
            return;
        }

        if (draggedTokenId && activeScenarioRef.current) {
            const currentScenario = activeScenarioRef.current;
            // Lógica de arrastre de TOKENS (Multiples)
            const deltaX = (curX - tokenDragStart.x) / zoom;
            const deltaY = (curY - tokenDragStart.y) / zoom;

            const newItems = currentScenario.items.map(item => {
                if (selectedTokenIds.includes(item.id)) {
                    const original = tokenOriginalPos[item.id] || { x: item.x, y: item.y };
                    let newX = original.x + deltaX;
                    let newY = original.y + deltaY;

                    // Protección contra NaN/Infinity en móvil (Evita que las luces se 'apaguen' al salir del mundo)
                    if (!Number.isFinite(newX) || !Number.isFinite(newY)) return item;

                    // El item puede tener su propia configuración de snap, si no, usa la global
                    const shouldSnap = item.snapToGrid !== undefined ? item.snapToGrid : gridConfig.snapToGrid;

                    if (shouldSnap) {
                        const cellW = gridConfig.cellWidth;
                        const cellH = gridConfig.cellHeight;
                        newX = Math.round(newX / cellW) * cellW;
                        newY = Math.round(newY / cellH) * cellH;
                    }

                    // Si es un muro, desplazamos sus puntos
                    if (item.type === 'wall') {
                        const dx = newX - item.x;
                        const dy = newY - item.y;
                        return {
                            ...item,
                            x: newX,
                            y: newY,
                            x1: item.x1 + dx,
                            y1: item.y1 + dy,
                            x2: item.x2 + dx,
                            y2: item.y2 + dy
                        };
                    }

                    return { ...item, x: newX, y: newY };
                }
                return item;
            });

            setActiveScenario(prev => ({ ...prev, items: newItems }));
            return;
        }

        // --- Lógica de REDIMENSIÓN ---
        if (resizingTokenId && activeScenarioRef.current && resizeStartRef.current) {
            const currentScenario = activeScenarioRef.current;
            const { startX, startY, startWidth, startHeight } = resizeStartRef.current;
            const deltaX = (curX - startX) / zoom;
            const deltaY = (curY - startY) / zoom; // Asumiendo aspect ratio libre o control

            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;

            const item = currentScenario.items.find(i => i.id === resizingTokenId);
            const shouldSnap = item?.snapToGrid !== undefined ? item.snapToGrid : gridConfig.snapToGrid;

            if (shouldSnap) {
                const cellW = gridConfig.cellWidth;
                const cellH = gridConfig.cellHeight;
                // Snap a cuartos de celda (0.25, 0.5, 0.75, 1, 1.25...)
                // Permitimos un tamaño mínimo de 0.25 (un cuarto de casilla)
                const snapUnitW = cellW * 0.25;
                const snapUnitH = cellH * 0.25;

                newWidth = Math.max(snapUnitW, Math.round(newWidth / snapUnitW) * snapUnitW);
                newHeight = Math.max(snapUnitH, Math.round(newHeight / snapUnitH) * snapUnitH);
            } else {
                // Mínimo 10px si no hay snap
                newWidth = Math.max(10, newWidth);
                newHeight = Math.max(10, newHeight);
            }

            setActiveScenario(prev => ({
                ...prev,
                items: prev.items.map(item =>
                    item.id === resizingTokenId
                        ? { ...item, width: newWidth, height: newHeight }
                        : item
                )
            }));
            return;
        }

        if (!isDragging) return;

        // Lógica de paneo de CÁMARA
        const deltaX = curX - dragStartRef.current.x;
        const deltaY = curY - dragStartRef.current.y;

        setOffset(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
        }));

        dragStartRef.current = { x: curX, y: curY };
    };

    const handleMouseUp = (e) => {
        // --- FINALIZAR DIBUJO DE MURO ---
        if (isDrawingWall && wallDrawingStart && wallDrawingCurrent) {
            const newWall = {
                id: crypto.randomUUID(),
                type: 'wall',
                x1: wallDrawingStart.x,
                y1: wallDrawingStart.y,
                x2: wallDrawingCurrent.x,
                y2: wallDrawingCurrent.y,
                // Calculamos x, y, width, height para que el sistema de selección y arrastre lo reconozca
                x: Math.min(wallDrawingStart.x, wallDrawingCurrent.x),
                y: Math.min(wallDrawingStart.y, wallDrawingCurrent.y),
                width: Math.max(Math.abs(wallDrawingCurrent.x - wallDrawingStart.x), 5),
                height: Math.max(Math.abs(wallDrawingCurrent.y - wallDrawingStart.y), 5),
                color: '#c8aa6e',
                thickness: 4,
                snapToGrid: true, // Por defecto los muros nuevos tienen snap
                name: 'Muro'
            };

            // Solo añadir si tiene longitud mínima
            if (Math.hypot(newWall.x2 - newWall.x1, newWall.y2 - newWall.y1) > 5) {
                const updatedItems = [...(activeScenario.items || []), newWall];
                setActiveScenario(prev => ({ ...prev, items: updatedItems }));
                updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
                    items: updatedItems,
                    lastModified: Date.now()
                });
            }

            setWallDrawingStart(null);
            setWallDrawingCurrent(null);
            return;
        }

        // --- FINALIZAR SELECCIÓN BOX ---
        if (selectionBox && activeScenario) {
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
                // Calcular rectangulo de selección en coordenadas relativas al div contenedor (para simplificar)
                const sbLeft = Math.min(selectionBox.start.x, selectionBox.current.x);
                const sbTop = Math.min(selectionBox.start.y, selectionBox.current.y);
                const sbRight = Math.max(selectionBox.start.x, selectionBox.current.x);
                const sbBottom = Math.max(selectionBox.start.y, selectionBox.current.y);

                // Convertir las 4 esquinas a Mundo para un AABB check aproximado (si no rotamos cámara)
                const tl = divToWorld(sbLeft, sbTop);
                const br = divToWorld(sbRight, sbBottom);

                // Definir caja de selección en Mundo
                const selX = tl.x;
                const selY = tl.y;
                const selW = br.x - tl.x;
                const selH = br.y - tl.y;

                // Seleccionar items que intersecten y pertenezcan a la capa activa
                const newSelected = activeScenario.items.filter(item => {
                    const isLight = item.type === 'light';
                    const isWall = item.type === 'wall';
                    const isCorrectLayer = activeLayer === 'LIGHTING' ? (isLight || isWall) : (!isLight && !isWall);

                    if (!isCorrectLayer) return false;

                    // Restricción de Jugador: No permitir seleccionar tokens ajenos
                    if (isPlayerView && !isLight && !isWall) {
                        const hasPermission = item.controlledBy && Array.isArray(item.controlledBy) && item.controlledBy.includes(playerName);
                        if (!hasPermission) return false;
                    } else if (isPlayerView && (isLight || isWall)) {
                        return false;
                    }

                    // Simple AABB intersection
                    return (
                        item.x < selX + selW &&
                        item.x + item.width > selX &&
                        item.y < selY + selH &&
                        item.y + item.height > selY
                    );
                }).map(i => i.id);

                // Add to existing if Shift used? For now simpler: Replace selection or Add if Shift
                if (e && e.shiftKey) {
                    setSelectedTokenIds(prev => [...new Set([...prev, ...newSelected])]);
                } else {
                    setSelectedTokenIds(newSelected);
                }
            }
            setSelectionBox(null);
            return;
        }

        if (draggingWallHandle && activeScenario) {
            updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
                items: activeScenario.items,
                lastModified: Date.now()
            });
            setDraggingWallHandle(null);
            return;
        }

        // --- FINALIZAR ARRASTRE / ROTACIÓN / REDIMENSIÓN DE TOKENS ---
        if ((draggedTokenId || rotatingTokenId || resizingTokenId) && activeScenarioRef.current) {
            const currentScenario = activeScenarioRef.current;
            let finalItems = currentScenario.items;

            // Si estábamos arrastrando tokens en la capa de mesa, comprobar colisiones
            if (draggedTokenId && activeLayer === 'TABLETOP') {
                const walls = currentScenario.items.filter(i =>
                    i.type === 'wall' && !(i.wallType === 'door' && i.isOpen)
                );
                let hasCollision = false;

                finalItems = currentScenario.items.map(item => {
                    // Solo chequear colisión para tokens (no muros) que estaban seleccionados
                    if (selectedTokenIds.includes(item.id) && item.type !== 'wall') {
                        const original = tokenOriginalPos[item.id];
                        if (original) {
                            const charCenterStart = { x: original.x + item.width / 2, y: original.y + item.height / 2 };
                            const charCenterEnd = { x: item.x + item.width / 2, y: item.y + item.height / 2 };

                            const pathCollision = walls.some(wall =>
                                linesIntersect(charCenterStart.x, charCenterStart.y, charCenterEnd.x, charCenterEnd.y, wall.x1, wall.y1, wall.x2, wall.y2)
                            );
                            const overlapCollision = walls.some(wall =>
                                lineRectIntersect(wall.x1, wall.y1, wall.x2, wall.y2, item.x + 2, item.y + 2, item.width - 4, item.height - 4)
                            );

                            if (pathCollision || overlapCollision) {
                                hasCollision = true;
                                return { ...item, x: original.x, y: original.y };
                            }
                        }
                    }
                    return item;
                });

                if (hasCollision) {
                    setActiveScenario(prev => ({ ...prev, items: finalItems }));
                }
            }

            // Guardar el estado final en Firebase
            try {
                updateDoc(doc(db, 'canvas_scenarios', currentScenario.id), {
                    items: finalItems,
                    lastModified: Date.now()
                });
            } catch (error) {
                console.error("Error saving moved items:", error);
            }

            setDraggedTokenId(null);
            setRotatingTokenId(null);
            setResizingTokenId(null);
            setTokenOriginalPos({});
            document.body.style.cursor = 'default';
            return;
        }

        setIsDragging(false);
        setDraggedTokenId(null);
        setRotatingTokenId(null);
        setResizingTokenId(null);
        setDraggingWallHandle(null);
        setTokenOriginalPos({});
        document.body.style.cursor = 'default';
    };

    // Efecto para listeners globales de mouse/touch up/move para evitar que se pierda el drag al salir del div
    useEffect(() => {
        const handleGlobalUp = (e) => {
            if (isDragging || draggedTokenId || rotatingTokenId || selectionBox || resizingTokenId || draggingWallHandle) {
                handleMouseUp(e);
            }
        };

        const handleGlobalMove = (e) => {
            if (isDragging || draggedTokenId || rotatingTokenId || selectionBox || draggingWallHandle || resizingTokenId) {
                handleMouseMove(e);
            }
        };

        if (isDragging || draggedTokenId || rotatingTokenId || selectionBox || draggingWallHandle || resizingTokenId) {
            window.addEventListener('mouseup', handleGlobalUp);
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('touchend', handleGlobalUp);
            window.addEventListener('touchmove', handleGlobalMove, { passive: false });
        }

        return () => {
            window.removeEventListener('mouseup', handleGlobalUp);
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('touchend', handleGlobalUp);
            window.removeEventListener('touchmove', handleGlobalMove);
        };
    }, [isDragging, draggedTokenId, rotatingTokenId, selectionBox, draggingWallHandle, resizingTokenId, activeLayer]);

    // Dummy state just to make linter happy if needed or unused var
    const [, setLoadingRotation] = useState(0);

    // Estado de configuración del Grid
    const [gridConfig, setGridConfig] = useState({
        cellWidth: 50,
        cellHeight: 50,
        color: '#334155',
        opacity: 0.3,
        lineWidth: 1,
        lineType: 'solid', // 'solid', 'dashed', 'dotted'
        isInfinite: true,
        columns: 20,
        rows: 15,
        backgroundImage: null,
        imageWidth: null,
        imageHeight: null,
        snapToGrid: false,
        ambientDarkness: 0, // 0 = Día (Transparente), 1 = Noche Total (Negro)
        fogOfWar: false, // Control de Niebla de Guerra
    });

    // --- CAMPOS DE MAPA CALCULADOS ---
    // Usamos el tamaño de la rejilla (columnas * ancho) para asegurar que la niebla cubra todo el tablero
    const mapBounds = {
        width: (gridConfig.columns * gridConfig.cellWidth),
        height: (gridConfig.rows * gridConfig.cellHeight),
    };
    // Añadimos un pequeño margen (bleed) de 4px para asegurar que no haya fugas en los bordes por redondeo
    const bleed = 4;
    const mapX = (WORLD_SIZE - mapBounds.width) / 2;
    const mapY = (WORLD_SIZE - mapBounds.height) / 2;

    // Calculamos los "Observadores" activos (tokens seleccionados con visión)
    // Para jugadores: SOLO se activa cuando seleccionan tokens específicos (no hay fallback)
    // Ahora soporta múltiples tokens seleccionados para mostrar la unión de sus visiones
    const observerIds = isPlayerView
        ? (activeScenario?.items || []).filter(s => s && selectedTokenIds.includes(s.id) && s.controlledBy?.includes(playerName) && s.hasVision).map(s => s.id)
        : (activeScenario?.items || []).filter(s =>
            s && selectedTokenIds.includes(s.id) && s.type !== 'light' && s.type !== 'wall' && s.hasVision
        ).map(s => s.id);

    // Para compatibilidad: si hay un solo observer, usamos su ID directamente
    const observerId = observerIds.length === 1 ? observerIds[0] : null;

    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Guardamos el archivo para subirlo luego
        setPendingImageFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target.result;
            img.onload = () => {
                const cols = Math.ceil(img.width / gridConfig.cellWidth);
                const rows = Math.ceil(img.height / gridConfig.cellHeight);

                setGridConfig(prev => ({
                    ...prev,
                    backgroundImage: event.target.result, // Local preview
                    imageWidth: img.width,
                    imageHeight: img.height,
                    isInfinite: false,
                    columns: cols,
                    rows: rows
                }));
            };
        };
        reader.readAsDataURL(file);
    };

    const clearBackgroundImage = () => {
        setGridConfig(prev => ({ ...prev, backgroundImage: null, imageWidth: null, imageHeight: null }));
    };

    // --- LOGICA DE BIBLIOTECA (Firebase) ---
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'canvas_scenarios'), (snap) => {
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setScenarios(loaded.sort((a, b) => b.lastModified - a.lastModified));
        });
        return () => unsub();
    }, []);

    // --- SUSCRIPCIÓN A TOKENS (Firebase) ---
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'canvas_tokens'), (snap) => {
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTokens(loaded.sort((a, b) => b.createdAt - a.createdAt));
        });
        return () => unsub();
    }, []);

    // --- KEYBOARD SHORTCUTS (Copy/Paste) ---
    useEffect(() => {
        const handleKeyDown = async (e) => {
            // Ignorar si estamos escribiendo en un input
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            // COPY (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (selectedTokenIds.length > 0 && activeScenario?.items) {
                    const tokensToCopy = activeScenario.items.filter(item => selectedTokenIds.includes(item.id));
                    if (tokensToCopy.length > 0) {
                        setClipboard(tokensToCopy);
                        console.log("Tokens copiados al portapapeles:", tokensToCopy.length);
                    }
                }
            }

            // PASTE (Ctrl+V)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (clipboard.length > 0 && activeScenario) {
                    e.preventDefault(); // Evitar pegado nativo

                    const newTokens = clipboard.map(originalItem => {
                        // Generar ID única y desplazar ligeramente
                        const newId = crypto.randomUUID();
                        return {
                            ...originalItem,
                            id: newId,
                            x: (originalItem.x || 0) + 40,
                            y: (originalItem.y || 0) + 40,
                            // COPIA PROFUNDA (Deep Copy) para singularidad en BD
                            // Esto asegura que editar stats/status del nuevo no afecte al original
                            stats: JSON.parse(JSON.stringify(originalItem.stats || {})),
                            attributes: JSON.parse(JSON.stringify(originalItem.attributes || {})),
                            status: [...(originalItem.status || [])]
                        };
                    });

                    const updatedItems = [...(activeScenario.items || []), ...newTokens];

                    // Actualización Optimista Local
                    setActiveScenario(prev => ({
                        ...prev,
                        items: updatedItems
                    }));

                    // Guardar en Firebase
                    try {
                        await updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
                            items: updatedItems,
                            lastModified: Date.now()
                        });

                        // Seleccionar los nuevos tokens clonados
                        setSelectedTokenIds(newTokens.map(t => t.id));

                        // Feedback visual reutilizando el Toast existente
                        setToastType('success');
                        setShowToast(true);
                        setTimeout(() => setToastExiting(true), 2000);
                        setTimeout(() => { setShowToast(false); setToastExiting(false); }, 2500);

                    } catch (error) {
                        console.error('Error al pegar tokens:', error);
                    }
                }
            }

            // DELETE / BACKSPACE (Eliminar seleccionados)
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedTokenIds.length > 0 && activeScenario) {
                    const updatedItems = activeScenario.items.filter(item => !selectedTokenIds.includes(item.id));

                    // Actualización Optimista
                    setActiveScenario(prev => ({ ...prev, items: updatedItems }));
                    setSelectedTokenIds([]);

                    try {
                        await updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
                            items: updatedItems,
                            lastModified: Date.now()
                        });
                    } catch (error) {
                        console.error('Error al eliminar items con teclado:', error);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeScenario, selectedTokenIds, clipboard]);

    const createNewScenario = async () => {
        const newScenario = {
            name: 'Nuevo Encuentro',
            lastModified: Date.now(),
            ownerId: currentUserId,
            preview: null,
            config: {
                cellWidth: 50,
                cellHeight: 50,
                color: '#334155',
                opacity: 0.3,
                lineWidth: 1,
                lineType: 'solid',
                isInfinite: true,
                columns: 20,
                rows: 15,
                backgroundImage: null,
                backgroundImageHash: null,
                snapToGrid: false,
                ambientDarkness: 0,
            },
            items: [], // Inicializamos array de tokens
            camera: { zoom: 1, offset: { x: 0, y: 0 } }
        };

        try {
            const docRef = await addDoc(collection(db, 'canvas_scenarios'), newScenario);
            loadScenario({ id: docRef.id, ...newScenario });
        } catch (error) {
            console.error("Error creating scenario:", error);
        }
    };

    const loadScenario = (scenario) => {
        setActiveScenario(scenario);
        if (scenario.config) setGridConfig(scenario.config);

        // Determinar cámara inicial
        let initialCamera = scenario.camera;

        if (isPlayerView) {
            // Prefer the token matching the current character name, fall back to any controlled token
            const charName = characterData?.name;
            const playerToken = charName
                ? (scenario.items?.find(i => i.controlledBy?.includes(playerName) && i.name === charName)
                    || scenario.items?.find(i => i.controlledBy?.includes(playerName)))
                : scenario.items?.find(i => i.controlledBy?.includes(playerName));
            if (playerToken) {
                const playerZoom = 1.2;
                initialCamera = {
                    zoom: playerZoom,
                    offset: {
                        x: - (playerToken.x + playerToken.width / 2 - WORLD_SIZE / 2) * playerZoom,
                        y: - (playerToken.y + playerToken.height / 2 - WORLD_SIZE / 2) * playerZoom
                    }
                };
            }
        }

        if (initialCamera) {
            setZoom(initialCamera.zoom);
            setOffset(initialCamera.offset);
        }
        setViewMode('EDIT');
    };

    // Auto-create player token when entering with character data
    const hasCreatedAutoToken = useRef(false);
    useEffect(() => {
        if (!isPlayerView || !characterData || !activeScenario?.id || hasCreatedAutoToken.current) return;

        const characterName = characterData.name || playerName;

        // Check if this specific character already has a token in this scenario
        // Allows the same player to have multiple tokens from different character sheets
        const existingToken = activeScenario.items?.find(i =>
            i.controlledBy?.includes(playerName) && i.name === characterName
        );
        if (existingToken) {
            hasCreatedAutoToken.current = true;
            return;
        }

        // Map character attributes to token attributes format (e.g. { destreza: 'D8' } -> { destreza: 'd8' })
        const tokenAttributes = {};
        if (characterData.attributes) {
            const attrKeyMap = {
                'Destreza': 'destreza', 'destreza': 'destreza',
                'Vigor': 'vigor', 'vigor': 'vigor',
                'Intelecto': 'intelecto', 'intelecto': 'intelecto',
                'Voluntad': 'voluntad', 'voluntad': 'voluntad',
            };
            Object.entries(characterData.attributes).forEach(([key, value]) => {
                const mappedKey = attrKeyMap[key] || key.toLowerCase();
                if (['destreza', 'vigor', 'intelecto', 'voluntad'].includes(mappedKey)) {
                    // Normalize dice value format (D8 -> d8, etc)
                    const dieValue = typeof value === 'string' ? value.toLowerCase() : value;
                    tokenAttributes[mappedKey] = dieValue;
                }
            });
        }

        // Map character stats to token stats format
        // Character sheet format: { postura: { current: 3, max: 4 }, vida: { current: 4, max: 4 }, ... }
        // Token format: { postura: { current: 3, max: 4 }, ... }
        const tokenStats = {};
        if (characterData.stats) {
            const validStats = ['postura', 'armadura', 'vida', 'ingenio', 'cordura'];
            Object.entries(characterData.stats).forEach(([key, value]) => {
                const mappedKey = key.toLowerCase();
                if (validStats.includes(mappedKey) && value && typeof value === 'object') {
                    const max = value.max ?? 0;
                    const current = value.current ?? max;
                    tokenStats[mappedKey] = {
                        current: Math.min(current, 10),
                        max: Math.min(max, 10),
                    };
                }
            });
        }

        // Extract status effects from character tags
        // Tags can contain special keywords like 'minijuego', 'canvas', etc. — we only want status effect IDs
        const STATUS_EFFECT_IDS = [
            'acido', 'apresado', 'ardiendo', 'asfixiado', 'asustado', 'aturdido',
            'cansado', 'cegado', 'congelado', 'derribado', 'enfermo', 'ensordecido',
            'envenenado', 'herido', 'iluminado', 'regeneracion', 'sangrado', 'silenciado'
        ];
        const tokenStatus = [];
        if (characterData.tags && Array.isArray(characterData.tags)) {
            characterData.tags.forEach(tag => {
                const normalizedTag = tag.toLowerCase().trim();
                if (STATUS_EFFECT_IDS.includes(normalizedTag)) {
                    tokenStatus.push(normalizedTag);
                }
            });
        }

        // Extract equipped items from character sheet slots into token format
        // Character sheet format: { mainHand: item, offHand: item, body: item, belt_0: item, accessory_0: item, ... }
        // Token format: flat array with type on each item
        const tokenEquippedItems = [];
        if (characterData.equippedItems && typeof characterData.equippedItems === 'object') {
            const slotTypeMap = {
                mainHand: 'weapon',
                offHand: 'weapon',
                body: 'armor',
            };
            Object.entries(characterData.equippedItems).forEach(([slot, item]) => {
                if (!item || slot === 'beltSlotCount') return; // skip non-item keys
                let type = slotTypeMap[slot];
                if (!type) {
                    if (slot.startsWith('belt_')) type = 'access';
                    else if (slot.startsWith('accessory_')) type = 'access';
                    else type = 'weapon'; // fallback
                }
                tokenEquippedItems.push({ ...item, type });
            });
        }

        // Also add any inventory items (equipment array) that aren't already equipped
        // This gives the master visibility into what the player carries
        const tokenInventory = Array.isArray(characterData.equipment) ? characterData.equipment : [];

        // Calculate spawn position (center of the map)
        const spawnX = (WORLD_SIZE / 2) - (gridConfig.cellWidth / 2);
        const spawnY = (WORLD_SIZE / 2) - (gridConfig.cellHeight / 2);

        const newToken = {
            id: `token-${Date.now()}-${playerName}`,
            x: spawnX,
            y: spawnY,
            width: gridConfig.cellWidth,
            height: gridConfig.cellHeight,
            img: characterData.avatar || '',
            rotation: 0,
            layer: 'TOKEN',
            name: characterData.name || playerName,
            status: tokenStatus,
            hasVision: true,
            visionRadius: 300,
            controlledBy: [playerName],
            isCircular: true, // Mark as circular for portrait-style rendering
            attributes: tokenAttributes,
            stats: tokenStats,
            equippedItems: tokenEquippedItems,
            inventory: tokenInventory,
        };

        console.log('🎭 Auto-creating player token:', newToken.name, 'for scenario:', activeScenario.name);

        setActiveScenario(prev => ({
            ...prev,
            items: [...(prev.items || []), newToken]
        }));

        // Center camera on the new token
        const playerZoom = 1.2;
        setZoom(playerZoom);
        setOffset({
            x: -(spawnX + gridConfig.cellWidth / 2 - WORLD_SIZE / 2) * playerZoom,
            y: -(spawnY + gridConfig.cellHeight / 2 - WORLD_SIZE / 2) * playerZoom,
        });

        hasCreatedAutoToken.current = true;

        // Save the new token to Firebase
        updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
            items: [...(activeScenario.items || []), newToken]
        }).catch(err => console.error('Error saving auto-created token:', err));

    }, [isPlayerView, characterData, activeScenario?.id, playerName]);

    const saveCurrentScenario = async () => {
        if (!activeScenario) {
            console.warn("⚠️ Intento de guardado sin escenario activo");
            return;
        }

        setIsSaving(true);
        console.log("💾 Iniciando guardado de escenario:", activeScenario.name);

        // Feedback visual inmediato
        triggerToast("PROGRESO\nGUARDADO", "Encuentro Sincronizado", 'success');

        try {
            let finalBackgroundImage = gridConfig.backgroundImage;
            let finalImageHash = gridConfig.backgroundImageHash;

            // Si hay un archivo pendiente, lo subimos a Storage primero
            if (pendingImageFile) {
                console.log("📤 Subiendo imagen pesada a Firebase Storage...");
                const { url, hash } = await getOrUploadFile(pendingImageFile, 'CanvasMaps');

                // Si ya había una imagen diferente antes, liberamos la referencia anterior
                if (gridConfig.backgroundImageHash && gridConfig.backgroundImageHash !== hash) {
                    console.log("♻️ Liberando imagen anterior de Storage...");
                    await releaseFile(gridConfig.backgroundImageHash);
                }

                finalBackgroundImage = url;
                finalImageHash = hash;

                // Actualizamos el estado local
                setGridConfig(prev => ({
                    ...prev,
                    backgroundImage: url,
                    backgroundImageHash: hash
                }));
                setPendingImageFile(null);
            }

            const updatedConfig = {
                ...gridConfig,
                backgroundImage: finalBackgroundImage,
                backgroundImageHash: finalImageHash
            };

            await updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
                name: activeScenario.name,
                config: updatedConfig,
                items: activeScenario.items || [], // Guardamos items
                camera: { zoom, offset },
                allowedPlayers: activeScenario.allowedPlayers || [],
                lastModified: Date.now()
            });

            console.log("✅ Escenario guardado correctamente con imagen persistente");
        } catch (error) {
            console.error("❌ Error al guardar escenario:", error);
            setToastType('error');
            setShowToast(false);
            setTimeout(() => {
                setShowToast(true);
                setToastExiting(false);
            }, 50);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteScenario = async () => {
        if (!itemToDelete) return;
        const idToDelete = itemToDelete.id;

        // Cerramos el modal inmediatamente para feedback visual instantáneo
        setItemToDelete(null);

        try {
            // Si el escenario tenía una imagen en Storage, liberamos la referencia
            if (itemToDelete.config?.backgroundImageHash) {
                console.log("♻️ Eliminando imagen asociada de Storage...");
                await releaseFile(itemToDelete.config.backgroundImageHash);
            }

            await deleteDoc(doc(db, 'canvas_scenarios', idToDelete));

            console.log("🗑️ Encuentro y archivos asociados eliminados correctamente");

            // Si el escenario borrado era el que estábamos editando, volvemos a la biblioteca
            if (activeScenario?.id === idToDelete) {
                setActiveScenario(null);
                setViewMode('LIBRARY');
            }

            // Opcional: Podríamos mostrar un toast específico de "Escenario Eliminado"
            // Pero como la lista se actualiza sola por el onSnapshot, el feedback es el cambio en la lista.
        } catch (error) {
            console.error("Error deleting scenario:", error);
            // Si falla, podríamos informar al usuario
        }
    };

    const handleTokenUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingToken(true);
        try {
            const { url, hash } = await getOrUploadFile(file, 'CanvasTokens');
            await addDoc(collection(db, 'canvas_tokens'), {
                url,
                hash,
                name: file.name,
                createdAt: Date.now(),
                uploadedBy: currentUserId
            });
            console.log("Token uploaded successfully");
        } catch (error) {
            console.error("Error uploading token:", error);
        } finally {
            setUploadingToken(false);
        }
    };

    const deleteToken = async (token) => {
        if (!confirm("¿Eliminar este token?")) return;
        try {
            if (token.hash) await releaseFile(token.hash);
            await deleteDoc(doc(db, 'canvas_tokens', token.id));
        } catch (error) {
            console.error("Error deleting token:", error);
        }
    };

    const addTokenToCanvas = (tokenUrl) => {
        if (!activeScenario) return;

        // Calcular posición central basada en el offset actual y zoom para que aparezca en el centro de la pantalla visible
        // Calcular posición central basada en el offset actual y zoom para que aparezca en el centro de la pantalla visible
        // P_mundo = CentroMundo - (Offset / Zoom)
        // El centro del div WORLD está en (WORLD_SIZE/2, WORLD_SIZE/2)

        const centerX = (WORLD_SIZE / 2) - (offset.x / zoom);
        const centerY = (WORLD_SIZE / 2) - (offset.y / zoom);

        // Centrar el token en ese punto (restando la mitad de su tamaño)
        const w = gridConfig.cellWidth;
        const h = gridConfig.cellHeight;

        const spawnX = centerX - (w / 2);
        const spawnY = centerY - (h / 2);

        const newToken = {
            id: `token-${Date.now()}`,
            x: spawnX,
            y: spawnY,
            width: gridConfig.cellWidth, // Tamaño por defecto: 1 celda
            height: gridConfig.cellHeight,
            img: tokenUrl,
            rotation: 0,
            layer: 'TOKEN',
            name: 'Token', // Nombre por defecto
            status: [], // Array de IDs de estados
            hasVision: true,
            visionRadius: 300,
        };

        setActiveScenario(prev => ({
            ...prev,
            items: [...(prev.items || []), newToken]
        }));
    };

    const handleTokenMouseDown = (e, token) => {
        const { x: curX, y: curY } = getEventCoords(e);
        const isTouch = e.type.startsWith('touch');

        e.stopPropagation(); // Evitar que el canvas inicie pan
        if (isTouch) e.preventDefault(); // Evitar double-firing y emulación de mouse

        // Si click izquierdo o touch, seleccionamos y preparamos arrastre
        if (isTouch || e.button === 0) {
            // Restricción de Jugador: No permitir interactuar con tokens ajenos
            const canMove = !isPlayerView || (token.controlledBy && Array.isArray(token.controlledBy) && token.controlledBy.includes(playerName));
            if (!canMove) {
                return;
            }
            // Si estamos redimensionando, no iniciar arrastre
            if (resizingTokenId) return;

            let newSelection = [...selectedTokenIds];

            // Si el token NO está ya seleccionado, lo añadimos o reemplazamos
            if (!selectedTokenIds.includes(token.id)) {
                if (e.shiftKey) {
                    newSelection.push(token.id);
                } else {
                    newSelection = [token.id];
                }
                setSelectedTokenIds(newSelection);
            }
            // Si YA está seleccionado, si pulsamos Shift podríamos deseleccionarlo?
            else if (e.shiftKey) {
                newSelection = newSelection.filter(id => id !== token.id);
                setSelectedTokenIds(newSelection);
                return; // No iniciamos drag si estamos deseleccionando
            }

            setDraggedTokenId(token.id);
            const touchId = (isTouch && e.touches && e.touches[0]) ? e.touches[0].identifier : null;
            setTokenDragStart({ x: curX, y: curY, identifier: touchId });

            // Guardar posiciones originales de TODOS los seleccionados
            const originals = {};
            const currentScenario = activeScenarioRef.current || activeScenario;
            if (currentScenario) {
                currentScenario.items.forEach(i => {
                    if (newSelection.includes(i.id)) {
                        originals[i.id] = { x: i.x, y: i.y };
                    }
                });
            }
            setTokenOriginalPos(originals);
        }
    };

    const handleRotationMouseDown = (e, token) => {
        const isTouch = e.type.startsWith('touch');
        e.stopPropagation();
        if (isTouch || e.button === 0) {
            setRotatingTokenId(token.id);
            // Para rotación, forzamos selección única del token rotado para evitar confusiones visuales
            setSelectedTokenIds([token.id]);
        }
    };

    const deleteItem = (itemId) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        setActiveScenario(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== itemId)
        }));
        setSelectedTokenIds(prev => prev.filter(id => id !== itemId));
    };

    const rotateItem = (itemId, angle) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        setActiveScenario(prev => ({
            ...prev,
            items: prev.items.map(i => {
                if (i.id === itemId) {
                    return { ...i, rotation: (i.rotation || 0) + angle };
                }
                return i;
            })
        }));
    };

    const toggleWallType = (wallId) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        setActiveScenario(prev => ({
            ...prev,
            items: prev.items.map(i => {
                if (i.id === wallId) {
                    // Ciclo: solid -> door -> window -> solid
                    let nextType = 'door';
                    if (i.wallType === 'door') nextType = 'window';
                    else if (i.wallType === 'window') nextType = 'solid';

                    return { ...i, wallType: nextType, isOpen: false, isSecret: false };
                }
                return i;
            })
        }));
    };

    const toggleDoorOpen = (doorId) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        setActiveScenario(prev => {
            const newItems = prev.items.map(i => {
                if (i.id === doorId) {
                    return { ...i, isOpen: !i.isOpen };
                }
                return i;
            });

            // Actualizar Firebase
            updateDoc(doc(db, 'canvas_scenarios', prev.id), {
                items: newItems,
                lastModified: Date.now()
            });

            return { ...prev, items: newItems };
        });
    };

    const toggleSecretWall = (wallId) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        setActiveScenario(prev => ({
            ...prev,
            items: prev.items.map(i => {
                if (i.id === wallId) {
                    return { ...i, isSecret: !i.isSecret };
                }
                return i;
            })
        }));
    };

    const addLightToCanvas = async (color = '#fff1ae') => {
        if (!activeScenario) return;

        const containerRect = containerRef.current?.getBoundingClientRect();
        const spawnX = WORLD_SIZE / 2 - 25;
        const spawnY = WORLD_SIZE / 2 - 25;

        const newLight = {
            id: crypto.randomUUID(),
            type: 'light',
            name: 'Foco de Luz',
            x: spawnX,
            y: spawnY,
            width: 50,
            height: 50,
            radius: 200, // Área de iluminación
            color: color,
            intensity: 0.8,
            rotation: 0,
            snapToGrid: false, // Por defecto libre para luces
            status: []
        };

        const updatedItems = [...(activeScenario.items || []), newLight];

        setActiveScenario(prev => ({ ...prev, items: updatedItems }));

        try {
            await updateDoc(doc(db, 'canvas_scenarios', activeScenario.id), {
                items: updatedItems,
                lastModified: Date.now()
            });
        } catch (error) {
            console.error("Error adding light:", error);
        }
    };

    // --- HELPER: renderItemJSX ---
    // Usamos una función que devuelve JSX en lugar de un "Componente" de React definido dentro de otro,
    // para evitar que los nodos DOM se destruyan y reconstruyan en cada renderizado (lo cual rompe el double-click).
    const renderItemJSX = (item) => {
        const original = tokenOriginalPos[item.id];
        const isSelected = selectedTokenIds.includes(item.id);
        const isLight = item.type === 'light';
        const isWall = item.type === 'wall';

        // Lógica de visibilidad y bloqueo por capas
        const isLightingLayer = activeLayer === 'LIGHTING';
        let canInteract = isLightingLayer ? (isLight || isWall) : (!isLight && !isWall);

        // Restricciones de Jugador: Solo puede interactuar con lo que controla
        if (isPlayerView && !isLight && !isWall) {
            const hasPermission = item.controlledBy && Array.isArray(item.controlledBy) && item.controlledBy.includes(playerName);
            if (!hasPermission) {
                canInteract = false;
            }
        } else if (isPlayerView && (isLight || isWall)) {
            // Jugadores no pueden tocar luces ni muros
            canInteract = false;
        }

        let opacity = 1;
        if (isLightingLayer) {
            opacity = (isLight || isWall) ? 1 : 0.3;
        } else {
            if (isLight) opacity = 0;
            else if (isWall) {
                // Las puertas normales y VENTANAS son visibles. Las secretas solo si están abiertas.
                const isSecretClosed = item.wallType === 'door' && item.isSecret && !item.isOpen;
                const isVisibleWall = (item.wallType === 'door' && !isSecretClosed) || item.wallType === 'window';
                opacity = isVisibleWall ? 1 : 0;
            }
            else opacity = 1;
        }

        // --- RENDERIZADO DE MURO ---
        if (isWall) {
            const isDoor = item.wallType === 'door';
            const isWindow = item.wallType === 'window';
            const isSecret = item.isSecret;

            // Colores por tipo
            const visualLineColor = isSelected ? '#c8aa6e' : (isDoor ? (isSecret ? '#a855f7' : '#2dd4bf') : (isWindow ? '#60a5fa' : '#475569'));
            const doorBaseColor = isSecret ? '#a855f7' : '#2dd4bf';
            const colliderColor = isDoor ? (item.isOpen ? `${doorBaseColor}22` : doorBaseColor) : (isWindow ? '#60a5fa44' : '#1e293b');

            return (
                <div
                    key={item.id}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate(${item.x}px, ${item.y}px)`,
                        pointerEvents: 'none', // El contenedor ya no captura clicks en su área rectangular
                        zIndex: 15,
                        opacity: opacity,
                        transition: 'opacity 0.3s ease'
                    }}
                >
                    <svg className="overflow-visible pointer-events-none">
                        <line
                            x1={item.x1 - item.x}
                            y1={item.y1 - item.y}
                            x2={item.x2 - item.x}
                            y2={item.y2 - item.y}
                            stroke={colliderColor}
                            strokeWidth={Math.max(12, (item.thickness || 4) + 8)} // Hitbox generosa pero proporcional
                            strokeLinecap="butt"
                            opacity={isDoor ? 0.2 : (isWindow ? 0.3 : 0.4)}
                            className="pointer-events-auto cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => canInteract && handleTokenMouseDown(e, item)}
                        />

                        {/* Línea Visual Secundaría para Ventanas (Efecto doble línea de cristal) */}
                        {isWindow && (
                            <line
                                x1={item.x1 - item.x}
                                y1={item.y1 - item.y}
                                x2={item.x2 - item.x}
                                y2={item.y2 - item.y}
                                stroke="#93c5fd"
                                strokeWidth={Math.max(6, (item.thickness || 4))}
                                strokeLinecap="round"
                                opacity="0.4"
                            />
                        )}

                        {/* Línea Visual Principal */}
                        <line
                            x1={item.x1 - item.x}
                            y1={item.y1 - item.y}
                            x2={item.x2 - item.x}
                            y2={item.y2 - item.y}
                            stroke={visualLineColor}
                            strokeWidth={Math.max(2, (item.thickness || 4) / 2)}
                            strokeLinecap="round"
                            strokeDasharray={isDoor && item.isOpen ? "4 4" : "none"}
                            className="pointer-events-auto cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => canInteract && handleTokenMouseDown(e, item)}
                            onTouchStart={(e) => canInteract && handleTokenMouseDown(e, item)}
                        />

                        {/* Handles (Cuadrados y círculos mejorados para móvil) */}
                        {isLightingLayer && (
                            <>
                                {/* Handle Punto 1 */}
                                {isSelected && (
                                    <circle
                                        cx={item.x1 - item.x} cy={item.y1 - item.y}
                                        r={14} fill="white" fillOpacity="0.05" stroke="white" strokeWidth={1}
                                        className="pointer-events-auto cursor-crosshair"
                                        onMouseDown={(e) => {
                                            if (!canInteract) return;
                                            handleTokenMouseDown(e, item); // Seleccionar el muro al coger el extremo
                                            setDraggingWallHandle({ id: item.id, handleIndex: 1 });
                                        }}
                                        onTouchStart={(e) => {
                                            if (!canInteract) return;
                                            handleTokenMouseDown(e, item);
                                            setDraggingWallHandle({ id: item.id, handleIndex: 1 });
                                        }}
                                    />
                                )}
                                <rect
                                    x={item.x1 - item.x - 7}
                                    y={item.y1 - item.y - 7}
                                    width={14} height={14}
                                    fill={colliderColor}
                                    stroke={isSelected ? "white" : "#475569"}
                                    strokeWidth={1.5}
                                    className="pointer-events-auto cursor-crosshair"
                                    onMouseDown={(e) => {
                                        if (!canInteract) return;
                                        handleTokenMouseDown(e, item); // Seleccionar el muro al coger el extremo
                                        setDraggingWallHandle({ id: item.id, handleIndex: 1 });
                                    }}
                                    onTouchStart={(e) => {
                                        if (!canInteract) return;
                                        handleTokenMouseDown(e, item);
                                        setDraggingWallHandle({ id: item.id, handleIndex: 1 });
                                    }}
                                />

                                {/* Handle Punto 2 */}
                                {isSelected && (
                                    <circle
                                        cx={item.x2 - item.x} cy={item.y2 - item.y}
                                        r={14} fill="white" fillOpacity="0.05" stroke="white" strokeWidth={1}
                                        className="pointer-events-auto cursor-crosshair"
                                        onMouseDown={(e) => {
                                            if (!canInteract) return;
                                            handleTokenMouseDown(e, item); // Seleccionar el muro al coger el extremo
                                            setDraggingWallHandle({ id: item.id, handleIndex: 2 });
                                        }}
                                        onTouchStart={(e) => {
                                            if (!canInteract) return;
                                            handleTokenMouseDown(e, item);
                                            setDraggingWallHandle({ id: item.id, handleIndex: 2 });
                                        }}
                                    />
                                )}
                                <rect
                                    x={item.x2 - item.x - 7}
                                    y={item.y2 - item.y - 7}
                                    width={14} height={14}
                                    fill={colliderColor}
                                    stroke={isSelected ? "white" : "#475569"}
                                    strokeWidth={1.5}
                                    className="pointer-events-auto cursor-crosshair"
                                    onMouseDown={(e) => {
                                        if (!canInteract) return;
                                        handleTokenMouseDown(e, item); // Seleccionar el muro al coger el extremo
                                        setDraggingWallHandle({ id: item.id, handleIndex: 2 });
                                    }}
                                    onTouchStart={(e) => {
                                        if (!canInteract) return;
                                        handleTokenMouseDown(e, item);
                                        setDraggingWallHandle({ id: item.id, handleIndex: 2 });
                                    }}
                                />
                            </>
                        )}
                    </svg>

                    {/* Controles de Acción para Muros (Borrar y Tipo - Posicionado en el centro del segmento) */}
                    {isSelected && isLightingLayer && (
                        <div
                            className="absolute flex items-center gap-2 z-50 pointer-events-auto"
                            style={{
                                left: `${(item.x1 + item.x2) / 2 - item.x}px`,
                                top: `${(item.y1 + item.y2) / 2 - item.y}px`,
                                transform: 'translate(-50%, -150%)'
                            }}
                        >
                            {/* Toggle Puerta/Muro */}
                            <button
                                onMouseDown={(e) => { e.stopPropagation(); toggleWallType(item.id); }}
                                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); toggleWallType(item.id); }}
                                className={`bg-black/90 rounded-full p-2 shadow-xl border transition-all hover:scale-110 active:scale-95 ${item.wallType === 'door' ? 'border-teal-500 text-teal-400' : (item.wallType === 'window' ? 'border-blue-500 text-blue-400' : 'border-slate-500 text-slate-400')}`}
                                title={item.wallType === 'door' ? "Convertir en Ventana" : (item.wallType === 'window' ? "Convertir en Muro Sólido" : "Convertir en Puerta")}
                            >
                                {item.wallType === 'door' ? <DoorOpen size={14} /> : (item.wallType === 'window' ? <LayoutGrid size={14} /> : <Square size={14} />)}
                            </button>

                            {/* Toggle Secreta (Solo si es puerta) */}
                            {item.wallType === 'door' && (
                                <button
                                    onMouseDown={(e) => { e.stopPropagation(); toggleSecretWall(item.id); }}
                                    onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); toggleSecretWall(item.id); }}
                                    className={`bg-black/90 rounded-full p-2 shadow-xl border transition-all hover:scale-110 active:scale-95 ${item.isSecret ? 'border-purple-500 text-purple-400' : 'border-slate-500 text-slate-400'}`}
                                    title={item.isSecret ? "Hacer Puerta Visible" : "Hacer Puerta Secreta"}
                                >
                                    <EyeOff size={14} />
                                </button>
                            )}

                            {/* Borrar */}
                            <button
                                onMouseDown={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); deleteItem(item.id); }}
                                className="bg-black/90 rounded-full p-2 shadow-xl border border-red-500/30 text-red-400 hover:text-red-200 hover:scale-110 active:scale-95 transition-all"
                                title="Borrar Muro"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}

                    {/* ICONO DE INTERACCIÓN DE PUERTA (Visible para el Master siempre, o para tokens si no es secreta/está abierta) */}
                    {item.wallType === 'door' && (
                        <button
                            onMouseDown={(e) => { e.stopPropagation(); toggleDoorOpen(item.id); }}
                            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); toggleDoorOpen(item.id); }}
                            className={`absolute z-[60] p-1.5 rounded-full border shadow-2xl transition-all hover:scale-125 active:scale-90 pointer-events-auto ${item.isOpen ? (isSecret ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-teal-500/20 border-teal-500 text-teal-400') : (isSecret ? 'bg-purple-900/40 border-purple-600 text-purple-500' : 'bg-red-500/20 border-red-500 text-red-400')}`}
                            style={{
                                left: `${(item.x1 + item.x2) / 2 - item.x}px`,
                                top: `${(item.y1 + item.y2) / 2 - item.y}px`,
                                transform: 'translate(-50%, -50%)',
                                opacity: isLightingLayer ? 1 : (item.isSecret && !item.isOpen ? 0.3 : 0.8) // Master las ve tenues si son secretas y cerradas en mesa
                            }}
                            title={item.isOpen ? "Cerrar Puerta" : (item.isSecret ? "Abrir Puerta Secreta" : "Abrir Puerta")}
                        >
                            {item.isOpen ? <DoorOpen size={16} /> : (item.isSecret ? <Lock size={16} /> : <DoorClosed size={16} />)}
                        </button>
                    )}
                </div>
            );
        }

        return (
            <React.Fragment key={item.id}>
                {/* GHOST TOKEN & LINE */}
                {original && canInteract && (
                    <>
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
                            <line
                                x1={original.x + item.width / 2}
                                y1={original.y + item.height / 2}
                                x2={item.x + item.width / 2}
                                y2={item.y + item.height / 2}
                                stroke="#c8aa6e"
                                strokeWidth="1.5"
                                strokeDasharray="6 4"
                                opacity="0.6"
                            />
                            <circle cx={original.x + item.width / 2} cy={original.y + item.height / 2} r="3" fill="#c8aa6e" opacity="0.5" />
                        </svg>
                        <div
                            className={`absolute top-0 left-0 z-10 pointer-events-none grayscale opacity-40 border-2 border-dashed border-[#c8aa6e]/50 ${item.isCircular ? 'rounded-full' : 'rounded-sm'} overflow-hidden`}
                            style={{
                                transform: `translate(${original.x}px, ${original.y}px) rotate(${item.rotation}deg)`,
                                width: `${item.width}px`,
                                height: `${item.height}px`,
                            }}
                        >
                            {!isLight && <img src={item.img} className="w-full h-full object-contain" draggable={false} />}
                        </div>
                    </>
                )}

                <div
                    onMouseDown={(e) => canInteract && handleTokenMouseDown(e, item)}
                    onTouchStart={(e) => canInteract && handleTokenMouseDown(e, item)}
                    onDoubleClick={(e) => {
                        if (!canInteract) return;
                        e.stopPropagation();
                        setSelectedTokenIds([item.id]);
                        lastSelectedIdRef.current = item.id;
                        setActiveTab('INSPECTOR');
                        setShowSettings(true);
                    }}
                    style={{
                        transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
                        width: `${item.width}px`,
                        height: `${item.height}px`,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        pointerEvents: canInteract ? 'auto' : 'none',
                        cursor: canInteract ? 'grab' : 'default',
                        zIndex: isLight ? 10 : 20, // Luces siempre debajo de tokens
                        opacity: opacity,
                        transition: 'opacity 0.3s ease'
                    }}
                    className="group"
                >
                    <div className={`w-full h-full relative ${draggedTokenId === item.id ? 'scale-105 shadow-2xl' : ''} transition-transform`}>
                        <div className={`absolute -inset-1 border-2 border-[#c8aa6e] ${item.isCircular ? 'rounded-full' : 'rounded-sm'} transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                            {isSelected && (
                                <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-[#c8aa6e] -z-10 origin-bottom"></div>
                            )}
                            {item.controlledBy?.length > 0 && (
                                <div className="absolute -top-2 -right-2 bg-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.5)] text-[#0b1120] rounded-full p-0.5 border border-white/20">
                                    <Users size={8} />
                                </div>
                            )}
                        </div>

                        {/* Aura (Underneath the token) */}
                        {!isLight && item.auraEnabled && (
                            <div
                                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none -z-10 ${item.auraStyle === 'pulse' ? 'animate-pulse' : ''}`}
                                style={{
                                    width: `${(item.auraRadius || 1) * gridConfig.cellWidth * 2}px`,
                                    height: `${(item.auraRadius || 1) * gridConfig.cellHeight * 2}px`,
                                    backgroundColor: item.auraColor || '#3b82f6',
                                    opacity: item.auraOpacity || 0.35,
                                    filter: 'blur(10px)',
                                    transition: 'all 0.3s ease-in-out'
                                }}
                            />
                        )}

                        {isLight ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-[0_0_20px_#facc15] border-2 border-white/50">
                                    <Sparkles className="w-4 h-4 text-yellow-900" />
                                </div>
                                {/* El radio de luz NO captura clics (pointer-events-none) */}
                                <div
                                    className="absolute border-2 border-dashed border-yellow-500/20 rounded-full pointer-events-none"
                                    style={{
                                        width: (item.radius || 200) * 2,
                                        height: (item.radius || 200) * 2,
                                        transform: `scale(${1 / zoom})`
                                    }}
                                />
                            </div>
                        ) : (
                            item.isCircular ? (
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#c8aa6e] shadow-[0_0_12px_rgba(200,170,110,0.4)]">
                                    <img src={item.img} className="w-full h-full object-cover" draggable={false} />
                                </div>
                            ) : (
                                <img src={item.img} className="w-full h-full object-contain drop-shadow-lg" draggable={false} />
                            )
                        )}

                        {/* Recursos (HUD) - Solo para tokens, no luces */}
                        {!isLight && canInteract && (
                            <TokenHUD
                                stats={item.stats}
                                width={item.width}
                                height={item.height}
                                isSelected={isSelected}
                            />
                        )}

                        {/* Status Effects */}
                        {item.status && item.status.length > 0 && !isLight && canInteract && (
                            <div className="absolute top-0 -left-3 flex flex-col items-center gap-1 pointer-events-none z-40 transform scale-75 origin-top-right">
                                {item.status.slice(0, 4).map(statusId => {
                                    const effect = DEFAULT_STATUS_EFFECTS[statusId];
                                    if (!effect) return null;
                                    const Icon = ICON_MAP[effect.iconName] || ICON_MAP.AlertCircle;
                                    return (
                                        <div key={statusId} className="w-5 h-5 bg-[#0b1120] rounded-full border flex items-center justify-center shadow-sm" style={{ borderColor: effect.hex || '#c8aa6e', color: effect.hex || '#c8aa6e' }}>
                                            <Icon size={12} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* MOVEMENT DISTANCE INDICATOR (Solo para tokens al arrastrar) */}
                        {!isLight && canInteract && tokenOriginalPos[item.id] && (
                            (() => {
                                const original = tokenOriginalPos[item.id];
                                const dx = Math.abs(item.x - original.x);
                                const dy = Math.abs(item.y - original.y);
                                const cellW = gridConfig.cellWidth || 50;
                                const cellH = gridConfig.cellHeight || 50;

                                // Distancia en casillas (Regla Chebyshev: Diagonal = 1)
                                const moveX = Math.round(dx / cellW);
                                const moveY = Math.round(dy / cellH);
                                const distance = Math.max(moveX, moveY);

                                if (distance === 0) return null;

                                return (
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
                                        <div className="bg-black/80 backdrop-blur-md border border-yellow-500/50 rounded-full px-3 py-1 flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                                            {distance <= 5 ? (
                                                <span className="text-xs leading-none flex gap-0.5">
                                                    {Array(distance).fill('🟡').map((_, i) => (
                                                        <span key={i} className="drop-shadow-md">🟡</span>
                                                    ))}
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs leading-none drop-shadow-md">🟡</span>
                                                    <span className="text-yellow-400 font-bold text-xs font-mono leading-none">x{distance}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()
                        )}

                        {/* Nombre */}
                        <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 transition-opacity ${isSelected || 'group-hover:opacity-100 opacity-0'}`}>
                            <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full border border-slate-600 block shadow-sm backdrop-blur-sm">
                                {item.name}
                            </span>
                        </div>

                        {/* Controles de Acción */}
                        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/90 rounded-full px-2 py-1 transition-opacity z-50 shadow-xl border border-[#c8aa6e]/30 ${isSelected || 'group-hover:opacity-100 opacity-0'}`}>
                            <button onMouseDown={(e) => { e.stopPropagation(); rotateItem(item.id, 45); }} onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); rotateItem(item.id, 45); }} className="text-[#c8aa6e] hover:text-[#f0e6d2] p-1 hover:bg-[#c8aa6e]/10 rounded-full transition-colors"><RotateCw size={12} /></button>
                            <div className="w-3 h-3 bg-[#c8aa6e] rounded-full mx-1 cursor-grab active:cursor-grabbing hover:scale-125 transition-transform border border-[#0b1120]" onMouseDown={(e) => handleRotationMouseDown(e, item)} onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleRotationMouseDown(e, item); }} />
                            <button onMouseDown={(e) => { e.stopPropagation(); deleteItem(item.id); }} onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); deleteItem(item.id); }} className="text-red-400 hover:text-red-200 p-1 hover:bg-red-900/30 rounded-full transition-colors"><Trash2 size={12} /></button>
                        </div>

                        {/* Resize Handle (Deshabilitado en móvil por errores de ux/redimensionado) */}
                        {isSelected && !rotatingTokenId && !isMobile && (
                            <div
                                onMouseDown={(e) => handleResizeMouseDown(e, item)}
                                onTouchStart={(e) => handleResizeMouseDown(e, item)}
                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#c8aa6e] border border-white rounded-sm cursor-nwse-resize z-50 shadow-sm hover:scale-125 transition-transform"
                            />
                        )}
                    </div>
                </div>
            </React.Fragment>
        );
    };

    const updateItem = (itemId, updates, persist = false) => {
        setActiveScenario(prev => {
            const newItems = prev.items.map(i => i.id === itemId ? { ...i, ...updates } : i);

            if (persist && prev.id) {
                updateDoc(doc(db, 'canvas_scenarios', prev.id), {
                    items: newItems,
                    lastModified: Date.now()
                }).catch(err => console.error("Error persisting item update:", err));
            }

            return { ...prev, items: newItems };
        });
    };

    const handleResizeMouseDown = (e, item) => {
        e.stopPropagation();
        if (!e.type.startsWith('touch')) e.preventDefault();

        setResizingTokenId(item.id);
        const { x, y } = getEventCoords(e);

        resizeStartRef.current = {
            startX: x,
            startY: y,
            startWidth: item.width,
            startHeight: item.height
        };
    };

    // Handler para click en el fondo del canvas (Deseleccionar y Selection Box)
    const handleCanvasBackgroundMouseDown = (e) => {
        const { x: curX, y: curY } = getEventCoords(e);
        const isTouch = e.type.startsWith('touch');

        // Solo si click izquierdo directo en el fondo o touch
        if ((isTouch || e.button === 0) && !e.altKey && e.target === containerRef.current) {

            // Si estamos en modo dibujo de muros (Solo en capa Iluminación)
            if (isDrawingWall && activeLayer === 'LIGHTING') {
                const worldPos = divToWorld(curX, curY);
                const snapped = snapToWallEndpoints(worldPos);
                setWallDrawingStart(snapped);
                setWallDrawingCurrent(snapped);
                return;
            }

            if (!e.shiftKey) setSelectedTokenIds([]); // Limpiar selección si no es Shift

            // Verificación de dispositivo móvil (Touch o pantalla pequeña)
            const isMobile = isTouch || window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024;
            if (isMobile) return;

            // Iniciar Selection Box
            setSelectionBox({
                start: { x: curX, y: curY },
                current: { x: curX, y: curY }
            });
        } else {
            handleMouseDown(e); // Mantener lógica de pan (Alt+Click o Middle Click)
        }
    };


    // Calcular dimensiones totales si es finito
    const finiteGridWidth = gridConfig.columns * gridConfig.cellWidth;
    const finiteGridHeight = gridConfig.rows * gridConfig.cellHeight;

    // Estado para mostrar/ocultar panel de configuración
    const [showSettings, setShowSettings] = useState(false);

    // Helpers para inputs con lógica de sincronización si hay imagen
    const handleConfigChange = (key, value) => {
        setGridConfig(prev => {
            const newConfig = { ...prev, [key]: value };

            // Si hay imagen de fondo, sincronizar dimensiones para mantener el tamaño del mapa
            if (prev.backgroundImage && prev.imageWidth && prev.imageHeight) {
                if (key === 'columns') {
                    // Si cambio columnas, ajusto ancho de celda para que quepan en la imagen
                    newConfig.cellWidth = prev.imageWidth / value;
                } else if (key === 'rows') {
                    // Si cambio filas, ajusto alto de celda
                    newConfig.cellHeight = prev.imageHeight / value;
                } else if (key === 'cellWidth') {
                    // Si cambio ancho celda, ajusto número de columnas
                    newConfig.columns = prev.imageWidth / value;
                } else if (key === 'cellHeight') {
                    // Si cambio alto celda, ajusto número de filas
                    newConfig.rows = prev.imageHeight / value;
                }
            }

            return newConfig;
        });
    };

    // Versión dinámica para invalidar caché de máscaras SVG cuando cambian puertas
    // IMPORTANTE: Solo cambia cuando cambia el estado de las puertas (isOpen), no cuando se mueven tokens
    // Esto evita parpadeos durante la selección/movimiento de tokens
    const doorStateHash = useMemo(() => {
        const doors = (activeScenario?.items || [])
            .filter(item => item?.type === 'wall' && item?.wallType === 'door')
            .map(door => `${door.id}:${door.isOpen ? '1' : '0'}`)
            .sort()
            .join('|');
        return doors || '0';
    }, [activeScenario?.items]);

    const maskVersion = doorStateHash;

    return (
        <div className="h-screen w-screen overflow-hidden bg-[#09090b] relative font-['Lato'] select-none">
            {/* --- BIBLIOTECA DE ENCUENTROS --- */}
            {viewMode === 'LIBRARY' && !activeScenario && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[60] bg-[#09090b] flex flex-col p-8 md:p-12 overflow-y-auto custom-scrollbar"
                >
                    <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
                        {isPlayerView ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#c8aa6e]/20 blur-3xl rounded-full scale-150"></div>
                                    <ShieldCheck size={80} className="text-[#c8aa6e] relative z-10 drop-shadow-[0_0_15px_rgba(200,170,110,0.5)]" />
                                </div>
                                <div className="space-y-4 relative z-10">
                                    <h2 className="text-4xl md:text-5xl font-fantasy text-[#f0e6d2] tracking-tighter uppercase whitespace-pre-line">
                                        Esperando {playerName ? `a ${playerName}...` : 'al Master...'}
                                    </h2>
                                    <p className="text-[#c8aa6e] font-bold uppercase tracking-[0.4em] text-xs">
                                        El encuentro aún no ha comenzado o no tienes acceso.
                                    </p>
                                </div>
                                <button
                                    onClick={onBack}
                                    className="px-8 py-3 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] font-fantasy uppercase tracking-widest rounded hover:bg-[#c8aa6e]/10 transition-all"
                                >
                                    Volver a la ficha
                                </button>
                            </div>
                        ) : (
                            <>
                                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                                    <div>
                                        <button onClick={onBack} className="flex items-center gap-2 text-[#c8aa6e] font-bold uppercase tracking-widest text-xs mb-4 hover:translate-x-[-4px] transition-all">
                                            <FiArrowLeft className="w-4 h-4" /> <b>VOLVER</b>
                                        </button>
                                        <h1 className="text-4xl md:text-5xl font-fantasy text-[#f0e6d2] tracking-tighter">BIBLIOTECA DE ENCUENTROS</h1>
                                        <p className="text-slate-500 uppercase text-xs tracking-[0.3em] font-bold mt-2"><b>Gestión de escenarios para el Canvas Beta</b></p>
                                    </div>
                                    <button onClick={createNewScenario} className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(200,170,110,0.3)] hover:scale-105 transition-all">
                                        <Plus className="w-6 h-6" /> Nuevo Encuentro
                                    </button>
                                </header>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                                    {scenarios.map(s => (
                                        <motion.div
                                            layout
                                            key={s.id}
                                            onClick={() => loadScenario(s)}
                                            className={`group relative bg-[#0b1120] border-2 rounded-xl p-6 cursor-pointer transition-all overflow-hidden ${globalActiveId === s.id ? 'border-[#c8aa6e] shadow-[0_0_30px_rgba(200,170,110,0.15)] bg-[#161f32]' : 'border-slate-800 hover:border-[#c8aa6e]/50 hover:bg-[#161f32]'}`}
                                        >
                                            {globalActiveId === s.id && (
                                                <div className="absolute top-0 right-0 bg-[#c8aa6e] text-[#0b1120] text-[8px] font-bold uppercase px-3 py-1 rounded-bl-lg tracking-widest shadow-lg z-30">
                                                    En vivo
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setItemToDelete(s); }}
                                                className="absolute top-4 right-4 p-2 bg-[#0b1120]/80 border border-slate-700/50 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-900/20 hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg backdrop-blur-sm"
                                                title="Eliminar Encuentro"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="flex gap-6 items-start">
                                                <CanvasThumbnail scenario={s} />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-[#f0e6d2] font-fantasy text-xl mb-1 truncate">{s.name}</h3>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">
                                                        {s.config?.isInfinite ? 'Mapa Infinito' : `${Math.round(s.config?.columns)}x${Math.round(s.config?.rows)} Celdas`}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
                                                            <LayoutGrid size={10} className="text-[#c8aa6e]" />
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">Escenario</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-6 flex items-center justify-between border-t border-slate-800/50 pt-4">
                                                <span className="text-[9px] text-slate-600 font-mono">ID: {s.id.slice(-8)}</span>
                                                <div className="flex gap-2">
                                                    {/* Botón de Transmisión (Solo Master) */}
                                                    {!isPlayerView && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setGlobalActiveScenario(globalActiveId === s.id ? null : s.id);
                                                            }}
                                                            className={`p-2 rounded-lg border transition-all ${globalActiveId === s.id ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#0b1120] shadow-[0_0_15px_rgba(200,170,110,0.4)]' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'}`}
                                                            title={globalActiveId === s.id ? "En transmisión - Haz clic para dejar de emitir" : "Transmitir a jugadores"}
                                                        >
                                                            {globalActiveId === s.id ? <Eye size={14} /> : <EyeOff size={14} />}
                                                        </button>
                                                    )}
                                                    <FiArrowLeft className="w-4 h-4 text-slate-500 rotate-180" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {scenarios.length === 0 && (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                                            <FolderOpen size={48} className="mb-4 opacity-20" />
                                            <p className="font-fantasy tracking-widest">No hay escenarios guardados</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* DELETE CONFIRMATION MODAL */}
                    <AnimatePresence>
                        {itemToDelete && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    className="w-full max-w-md bg-[#0b1120] border border-red-900/50 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.2)] p-6 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
                                    <h3 className="text-xl font-fantasy text-red-500 mb-2 flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" /> ELIMINAR ENCUENTRO
                                    </h3>
                                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                        ¿Estás seguro de que deseas eliminar <span className="text-[#f0e6d2] font-bold">"{itemToDelete.name}"</span>?
                                        <br /><span className="text-xs text-red-400/70 mt-1 block">Esta acción eliminará permanentemente la configuración del escenario.</span>
                                    </p>
                                    <div className="flex gap-3 justify-end">
                                        <button onClick={() => setItemToDelete(null)} className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-[#f0e6d2] transition-colors">Cancelar</button>
                                        <button onClick={deleteScenario} className="px-6 py-2 bg-red-900/20 border border-red-900/50 rounded text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-900/40 transition-all shadow-[0_0_20px_rgba(220,38,38,0.1)]">Eliminar</button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* --- EDITOR DE ESCENARIOS --- */}
            {
                activeScenario && (
                    <>
                        {/* --- UI Overlay (Header & Controles) --- */}

                        {/* Gradient Background Header (Restored) */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0b1120] via-[#0b1120]/60 to-transparent z-30 pointer-events-none"></div>

                        {/* 1. Botón Salir (Flotante Arriba Izquierda) */}
                        <button
                            onClick={() => {
                                if (isPlayerView) {
                                    onBack();
                                } else {
                                    setViewMode('LIBRARY');
                                    setActiveScenario(null);
                                }
                            }}
                            className="absolute top-6 left-6 z-50 w-12 h-12 rounded-full bg-[#1a1b26] border border-[#c8aa6e]/40 text-[#c8aa6e] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-110 hover:border-[#c8aa6e] hover:text-[#f0e6d2] hover:shadow-[0_0_20px_rgba(200,170,110,0.3)] transition-all duration-300 group pointer-events-auto"
                            title={isPlayerView ? "Volver a Ficha" : "Salir a la Biblioteca"}
                        >
                            <FiArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform font-bold" />
                        </button>

                        {/* 2. Título (Flotante Arriba Centro - Minimalista) */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center opacity-80 width-full">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.3em] text-[#c8aa6e] whitespace-nowrap">
                                <span className="h-px w-4 md:w-8 bg-gradient-to-r from-transparent to-[#c8aa6e]"></span>
                                <span>Canvas Beta</span>
                                <span className="h-px w-4 md:w-8 bg-gradient-to-l from-transparent to-[#c8aa6e]"></span>
                            </div>
                        </div>

                        {/* --- Botón Flotante Dados (Toggle Sidebar) --- */}
                        <button
                            onClick={() => {
                                if (selectedTokenIds.length === 0) {
                                    setActiveTab(isPlayerView ? 'TOKENS' : 'CONFIG');
                                }
                                setShowSettings(true);
                            }}
                            className="absolute top-6 right-6 z-40 w-12 h-12 rounded-full bg-[#1a1b26] border border-[#c8aa6e]/40 text-[#c8aa6e] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-110 hover:border-[#c8aa6e] hover:text-[#f0e6d2] hover:shadow-[0_0_20px_rgba(200,170,110,0.3)] transition-all duration-300 group pointer-events-auto"
                        >
                            <BsDice6 size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                        </button>

                        {/* --- Sidebar de Configuración --- */}
                        {/* Overlay para cerrar al hacer click fuera */}
                        {showSettings && (
                            <div
                                className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                                onClick={() => setShowSettings(false)}
                            />
                        )}

                        {/* Panel Sidebar */}
                        <div className={`
                    absolute top-0 right-0 h-full w-full sm:w-80 z-[100]
                    bg-[#0b1120] border-l border-[#c8aa6e]/30 shadow-2xl 
                    transform transition-transform duration-300 ease-out 
                    flex flex-col
                    ${showSettings ? 'translate-x-0' : 'translate-x-full'}
                `}>
                            {/* Sidebar Header */}
                            <div className="p-4 border-b border-[#c8aa6e]/20 bg-[#161f32] flex items-center justify-between shadow-xl z-10">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-[#c8aa6e]" />
                                        {isPlayerView ? (
                                            <span className="font-fantasy text-[#f0e6d2] text-lg tracking-widest uppercase w-48 truncate px-1">
                                                {activeScenario?.name || 'Escenario'}
                                            </span>
                                        ) : (
                                            <input
                                                type="text"
                                                value={activeScenario?.name || ''}
                                                onChange={(e) => setActiveScenario(prev => ({ ...prev, name: e.target.value }))}
                                                className="bg-transparent border-none outline-none font-fantasy text-[#f0e6d2] text-lg tracking-widest uppercase w-48 focus:bg-white/5 rounded px-1"
                                            />
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="text-slate-400 hover:text-[#c8aa6e] transition-colors p-1"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>

                            {/* Sidebar Tabs */}
                            <div className="flex bg-[#0b1120] border-b border-slate-800 shrink-0 z-10">
                                {!isPlayerView && (
                                    <button
                                        onClick={() => setActiveTab('CONFIG')}
                                        className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'CONFIG' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <Settings className="w-4 h-4" />
                                        <span className="text-[8px] font-bold uppercase">Configuración</span>
                                    </button>
                                )}
                                {!isPlayerView && (
                                    <button
                                        onClick={() => setActiveTab('TOKENS')}
                                        className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'TOKENS' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-[8px] font-bold uppercase">Tokens</span>
                                    </button>
                                )}
                                {!isPlayerView && (
                                    <button
                                        onClick={() => setActiveTab('ACCESS')}
                                        className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'ACCESS' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-[8px] font-bold uppercase">Acceso</span>
                                    </button>
                                )}
                                {isPlayerView && (
                                    <button
                                        onClick={() => setActiveTab('TOKENS')}
                                        className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'TOKENS' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-[8px] font-bold uppercase">Tokens</span>
                                    </button>
                                )}
                                {selectedTokenIds.length === 1 && (
                                    <button
                                        onClick={() => setActiveTab('INSPECTOR')}
                                        className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'INSPECTOR' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        <span className="text-[8px] font-bold uppercase">Inspector</span>
                                    </button>
                                )}
                            </div>

                            {/* Sidebar Content Wrapper */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
                                {/* --- TAB: ACCESO (MASTER ONLY) --- */}
                                {activeTab === 'ACCESS' && !isPlayerView && (
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
                                )}

                                {/* --- TAB: CONFIGURACIÓN (MASTER ONLY) --- */}
                                {activeTab === 'CONFIG' && !isPlayerView && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {/* 1. Modo de Mapa */}
                                        <div className="space-y-3">
                                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <LayoutGrid className="w-3 h-3" />
                                                Modo de Mapa
                                            </h4>
                                            <div className="bg-[#111827] p-1 rounded border border-slate-800 flex text-[10px] font-bold font-fantasy shadow-inner">
                                                <button
                                                    onClick={() => handleConfigChange('isInfinite', true)}
                                                    className={`flex-1 py-2.5 rounded transition-all uppercase tracking-widest ${gridConfig.isInfinite ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                >
                                                    Infinito
                                                </button>
                                                <button
                                                    onClick={() => handleConfigChange('isInfinite', false)}
                                                    className={`flex-1 py-2.5 rounded transition-all uppercase tracking-widest ${!gridConfig.isInfinite ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                >
                                                    Finito
                                                </button>
                                            </div>
                                        </div>

                                        {/* Control de Snap */}
                                        <div className="flex items-center justify-between bg-[#111827] p-3 rounded border border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <LayoutGrid className="w-4 h-4 text-[#c8aa6e]" />
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Ajustar a Rejilla (Snap)</span>
                                            </div>
                                            <button
                                                onClick={() => handleConfigChange('snapToGrid', !gridConfig.snapToGrid)}
                                                className={`relative w-12 h-6 rounded-full transition-all ${gridConfig.snapToGrid ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gridConfig.snapToGrid ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="w-full h-px bg-slate-800/50"></div>

                                        {/* 2. Fondo de Mapa */}
                                        <div className="space-y-3">
                                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <Image className="w-3 h-3" />
                                                Imagen de Fondo
                                            </h4>

                                            {!gridConfig.backgroundImage ? (
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="border-2 border-dashed border-slate-700/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5 transition-all group"
                                                >
                                                    <Upload className="w-8 h-8 text-slate-600 group-hover:text-[#c8aa6e] mb-2 transition-colors" />
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300 tracking-widest">Subir Mapa</span>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                        accept="image/*"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="relative w-full h-32 bg-[#0b1120] rounded-lg overflow-hidden border border-slate-700/50 group shadow-lg">
                                                        <img src={gridConfig.backgroundImage} alt="Background Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                                                            <span className="text-[10px] font-bold text-[#f0e6d2] uppercase tracking-[0.2em]">Vista Previa</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={clearBackgroundImage}
                                                        className="w-full py-2.5 bg-red-900/10 border border-red-900/30 text-red-500 rounded text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-900/20 transition-all font-sans"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Eliminar Fondo
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full h-px bg-slate-800/50"></div>

                                        {/* 3. Dimensiones (Solo Finito) */}
                                        {!gridConfig.isInfinite && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                                <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                    <Maximize className="w-3 h-3" />
                                                    Dimensiones (Celdas)
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors">Columnas</span>
                                                        <div className="flex items-center justify-between">
                                                            <input
                                                                type="number"
                                                                value={gridConfig.columns}
                                                                onChange={(e) => handleConfigChange('columns', Number(e.target.value))}
                                                                className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                min="1" max="100"
                                                            />
                                                            <div className="flex flex-col gap-0.5 ml-2">
                                                                <button onClick={() => handleConfigChange('columns', Math.min(100, gridConfig.columns + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                                                <button onClick={() => handleConfigChange('columns', Math.max(1, gridConfig.columns - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors">Filas</span>
                                                        <div className="flex items-center justify-between">
                                                            <input
                                                                type="number"
                                                                value={gridConfig.rows}
                                                                onChange={(e) => handleConfigChange('rows', Number(e.target.value))}
                                                                className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                min="1" max="100"
                                                            />
                                                            <div className="flex flex-col gap-0.5 ml-2">
                                                                <button onClick={() => handleConfigChange('rows', Math.min(100, gridConfig.rows + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                                                <button onClick={() => handleConfigChange('rows', Math.max(1, gridConfig.rows - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] text-slate-600 text-right font-mono flex items-center justify-end gap-2 uppercase">
                                                    <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                                                    TOTAL: {finiteGridWidth}x{finiteGridHeight}PX
                                                </div>

                                                <div className="w-full h-px bg-slate-800/50"></div>
                                            </div>
                                        )}

                                        {/* 4. Tamaño de Celda */}
                                        <div className="space-y-4">
                                            <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                <Ruler className="w-3 h-3" />
                                                Escala de Rejilla
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors font-sans">Ancho (PX)</span>
                                                    <div className="flex items-center justify-between">
                                                        <input
                                                            type="number"
                                                            value={gridConfig.cellWidth}
                                                            onChange={(e) => handleConfigChange('cellWidth', Number(e.target.value))}
                                                            className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            min="10" max="500"
                                                        />
                                                        <div className="flex flex-col gap-0.5 ml-2">
                                                            <button onClick={() => handleConfigChange('cellWidth', Math.min(500, gridConfig.cellWidth + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                                            <button onClick={() => handleConfigChange('cellWidth', Math.max(10, gridConfig.cellWidth - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-[#0b1120] p-3 rounded border border-slate-800 hover:border-[#c8aa6e]/30 transition-colors group relative">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 group-hover:text-[#c8aa6e]/60 transition-colors font-sans">Alto (PX)</span>
                                                    <div className="flex items-center justify-between">
                                                        <input
                                                            type="number"
                                                            value={gridConfig.cellHeight}
                                                            onChange={(e) => handleConfigChange('cellHeight', Number(e.target.value))}
                                                            className="w-full bg-transparent text-[#f0e6d2] text-sm font-bold focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            min="10" max="500"
                                                        />
                                                        <div className="flex flex-col gap-0.5 ml-2">
                                                            <button onClick={() => handleConfigChange('cellHeight', Math.min(500, gridConfig.cellHeight + 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronUp size={14} /></button>
                                                            <button onClick={() => handleConfigChange('cellHeight', Math.max(10, gridConfig.cellHeight - 1))} className="text-slate-500 hover:text-[#c8aa6e] transition-colors p-0.5 bg-slate-800/50 rounded-sm hover:bg-[#c8aa6e]/20"><FiChevronDown size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* --- TAB: TOKENS (MASTER ONLY) --- */}
                                {activeTab === 'TOKENS' && !isPlayerView && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                            <Sparkles className="w-3 h-3" />
                                            Biblioteca de Tokens
                                        </h4>

                                        {/* Upload Button */}
                                        <label className={`
                                        flex flex-col items-center justify-center w-full h-32 
                                        border-2 border-dashed border-slate-700/50 rounded-xl 
                                        cursor-pointer hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5 
                                        transition-all group relative overflow-hidden
                                        ${uploadingToken ? 'pointer-events-none opacity-50' : ''}
                                    `}>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleTokenUpload} disabled={uploadingToken} />
                                            {uploadingToken ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <RotateCw className="w-6 h-6 text-[#c8aa6e] animate-spin" />
                                                    <span className="text-[10px] uppercase font-bold text-[#c8aa6e]">Subiendo...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-slate-600 group-hover:text-[#c8aa6e] mb-2 transition-colors" />
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300 tracking-widest">Subir Nuevo Token</span>
                                                </>
                                            )}
                                        </label>

                                        {/* Tokens Grid */}
                                        <div className="grid grid-cols-3 gap-3">


                                            {tokens.map(token => (
                                                <div
                                                    key={token.id}
                                                    className="aspect-square bg-[#0b1120] rounded-lg border border-slate-800 relative group overflow-hidden hover:border-[#c8aa6e]/50 transition-colors cursor-pointer"
                                                    onClick={() => addTokenToCanvas(token.url)} // Click to Add
                                                    title="Click para añadir al mapa"
                                                >
                                                    <img src={token.url} alt={token.name} className="w-full h-full object-contain p-2" />

                                                    {/* Delete Button Overlay */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteToken(token); }}
                                                            className="p-1.5 bg-red-900/50 text-red-400 rounded hover:bg-red-900 hover:text-red-200 transition-colors"
                                                            title="Eliminar Token de Biblioteca"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {tokens.length === 0 && !uploadingToken && (
                                                <div className="col-span-3 py-8 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest border border-dashed border-slate-800 rounded-lg">
                                                    Sin tokens
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}



                                <div className="w-full h-px bg-slate-800/50"></div>

                                {/* 5. Estilo Visual (MASTER ONLY) --- */}
                                {activeTab === 'CONFIG' && !isPlayerView && (
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
                                                            {PRESET_COLORS.map(c => (
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
                                )}


                                {/* --- TAB: TOKENS (PLAYER ONLY: List of controlled tokens) --- */}
                                {activeTab === 'TOKENS' && isPlayerView && (() => {
                                    const controlledTokens = activeScenario?.items?.filter(i =>
                                        i.controlledBy?.includes(playerName) && i.type !== 'light' && i.type !== 'wall'
                                    ) || [];

                                    return (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="space-y-2">
                                                <h4 className="text-[#c8aa6e] font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                    <Activity className="w-3 h-3" />
                                                    Tus Tokens en Juego
                                                </h4>
                                                <p className="text-[10px] text-slate-500 italic">Lista de personajes bajo tu control en este escenario.</p>
                                            </div>

                                            <div className="space-y-3">
                                                {controlledTokens.map(token => (
                                                    <div
                                                        key={token.id}
                                                        onClick={() => {
                                                            setSelectedTokenIds([token.id]);
                                                            setActiveTab('INSPECTOR');
                                                        }}
                                                        className={`group flex items-center gap-4 bg-[#111827] border p-3 rounded-lg transition-all cursor-pointer ${selectedTokenIds.includes(token.id) ? 'border-[#c8aa6e] bg-[#c8aa6e]/5' : 'border-slate-800 hover:border-slate-700'}`}
                                                    >
                                                        <div className="w-10 h-10 bg-[#0b1120] rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                                                            <img src={token.img} className="w-full h-full object-contain p-1" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="text-[#f0e6d2] font-fantasy text-sm truncate uppercase tracking-wider">{token.name}</h5>
                                                            <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500 uppercase">
                                                                {token.hasVision ? 'CON VISIÓN' : 'SIN VISIÓN'}
                                                            </div>
                                                        </div>
                                                        <Edit2 size={12} className="text-slate-600 group-hover:text-[#c8aa6e] transition-colors" />
                                                    </div>
                                                ))}

                                                {controlledTokens.length === 0 && (
                                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                                                        <ShieldOff size={32} className="text-slate-700" />
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sin tokens asignados</p>
                                                            <p className="text-[9px] text-slate-600 italic px-6 leading-relaxed">Pide al Master que te asigne el control de un personaje para poder interactuar.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {controlledTokens.length > 0 && (
                                                <div className="p-4 bg-[#c8aa6e]/5 border border-[#c8aa6e]/20 rounded-lg">
                                                    <p className="text-[9px] text-slate-400 leading-relaxed uppercase font-bold text-center">
                                                        Haz clic en un personaje para abrir su <span className="text-[#c8aa6e]">foco e inspector</span>.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* --- TAB: INSPECTOR --- */}
                                {activeTab === 'INSPECTOR' && selectedTokenIds.length === 1 && (() => {
                                    const token = activeScenario.items.find(i => i.id === selectedTokenIds[0]);
                                    if (!token) return null;

                                    return (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                            {/* Header Inspector */}
                                            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                                                <div className="w-16 h-16 bg-[#0b1120] rounded border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-[#c8aa6e]">
                                                    {token.type === 'light' ? (
                                                        <Sparkles className="w-8 h-8 drop-shadow-[0_0_8px_currentColor]" />
                                                    ) : token.type === 'wall' ? (
                                                        <PenTool className="w-8 h-8 drop-shadow-[0_0_8px_currentColor]" />
                                                    ) : (
                                                        <img src={token.img} className="w-full h-full object-contain p-1" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-[#f0e6d2] font-fantasy text-lg tracking-wide truncate max-w-[150px]">{token.name}</h4>
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{token.layer} LAYER</span>
                                                </div>
                                            </div>

                                            {/* Properties Form */}
                                            <div className="space-y-4">

                                                {/* Name Input */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nombre</label>
                                                    <input
                                                        type="text"
                                                        value={token.name}
                                                        onChange={(e) => updateItem(token.id, { name: e.target.value })}
                                                        className="w-full bg-[#111827] border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-[#c8aa6e] outline-none transition-colors"
                                                    />
                                                </div>

                                                {/* Rotation & Size */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rotación (°)</label>
                                                        <div className="flex items-center bg-[#111827] border border-slate-800 rounded h-9">
                                                            <input
                                                                type="number"
                                                                value={Math.round(token.rotation || 0)}
                                                                onChange={(e) => updateItem(token.id, { rotation: Number(e.target.value) })}
                                                                className="w-full h-full bg-transparent border-none px-3 text-sm text-slate-200 outline-none"
                                                            />
                                                            <span className="pr-3 text-slate-600 text-xs">°</span>
                                                        </div>
                                                    </div>
                                                    {/* Placeholder for Size/Scale - podría ser complejo por ahora simplemente mostramos */}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tamaño</label>
                                                        <div className="flex items-center justify-between bg-[#111827] border border-slate-800 rounded overflow-hidden h-9">
                                                            <button
                                                                onClick={() => {
                                                                    // Lógica inteligente de decremento
                                                                    // Si > 1 celda, baja de 1 en 1. Si <= 1, baja de 0.25 en 0.25. Mínimo 0.25.
                                                                    if (gridConfig.snapToGrid) {
                                                                        const cellW = gridConfig.cellWidth;
                                                                        const cellH = gridConfig.cellHeight;
                                                                        const currentCellsW = token.width / cellW;

                                                                        // Calcular nuevo tamaño en celdas
                                                                        let newCellsW = currentCellsW > 1 ? Math.floor(currentCellsW - 1) : currentCellsW - 0.25;
                                                                        // Corregir si bajó demasiado al redondear o si ya estaba en 1.5 (floor(0.5)=>0 bad)
                                                                        if (currentCellsW > 1 && newCellsW < 1) newCellsW = 1;
                                                                        // Simplicidad: Restar 1 si >= 2, restar 0.25 si < 2.
                                                                        newCellsW = (token.width / cellW) <= 1 ? (token.width / cellW) - 0.25 : (token.width / cellW) - 1;

                                                                        // Asegurar mínimo 0.25
                                                                        if (newCellsW < 0.25) newCellsW = 0.25;

                                                                        updateItem(token.id, {
                                                                            width: newCellsW * cellW,
                                                                            height: newCellsW * cellH // Mantener ratio cuadrado por simplicidad en botón, o usar lógica separada
                                                                        });
                                                                    } else {
                                                                        const step = 20;
                                                                        const newW = Math.max(10, token.width - step);
                                                                        const newH = Math.max(10, token.height - step);
                                                                        updateItem(token.id, { width: newW, height: newH });
                                                                    }
                                                                }}
                                                                className="h-full px-3 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border-r border-slate-800 flex items-center justify-center"
                                                                title="Reducir"
                                                            >
                                                                <FiMinus size={14} />
                                                            </button>
                                                            <span className="flex-1 text-center font-mono text-xs text-[#c8aa6e] flex items-center justify-center h-full">
                                                                {gridConfig.snapToGrid
                                                                    ? `${parseFloat((token.width / gridConfig.cellWidth).toFixed(2))}x${parseFloat((token.height / gridConfig.cellHeight).toFixed(2))}`
                                                                    : `${Math.round(token.width)}px`
                                                                }
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    if (gridConfig.snapToGrid) {
                                                                        const cellW = gridConfig.cellWidth;
                                                                        const cellH = gridConfig.cellHeight;
                                                                        // Incrementar: 0.25 si < 1, 1 si >= 1
                                                                        let newCellsW = (token.width / cellW) < 1 ? (token.width / cellW) + 0.25 : (token.width / cellW) + 1;

                                                                        updateItem(token.id, {
                                                                            width: newCellsW * cellW,
                                                                            height: newCellsW * cellH
                                                                        });
                                                                    } else {
                                                                        const step = 20;
                                                                        updateItem(token.id, { width: token.width + step, height: token.height + step });
                                                                    }
                                                                }}
                                                                className="h-full px-3 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border-l border-slate-800 flex items-center justify-center"
                                                                title="Aumentar"
                                                            >
                                                                <FiPlus size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Future Links (Solo para personas/tokens reales) */}
                                                {/* FORMA CIRCULAR */}
                                                {token.type !== 'light' && token.type !== 'wall' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 flex items-center justify-between">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Forma Circular</span>
                                                                <span className="text-[8px] text-slate-600 italic">Retrato redondo estilo personaje</span>
                                                            </div>
                                                            <button
                                                                onClick={() => updateItem(token.id, { isCircular: !token.isCircular })}
                                                                className={`w-12 h-6 rounded-full transition-all relative ${token.isCircular ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.isCircular ? 'left-7' : 'left-1'}`} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* CONTROL DE JUGADOR (Solo para tokens reales) */}
                                                {token.type !== 'light' && token.type !== 'wall' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <Users size={12} /> Control de Jugador
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {existingPlayers.map(player => {
                                                                const isControlled = token.controlledBy?.includes(player);
                                                                return (
                                                                    <div
                                                                        key={player}
                                                                        onClick={() => {
                                                                            const isSelf = isPlayerView && player === playerName;
                                                                            if (isSelf && isControlled) return;

                                                                            const currentControlled = token.controlledBy || [];
                                                                            const nextControlled = isControlled
                                                                                ? currentControlled.filter(p => p !== player)
                                                                                : [...currentControlled, player];
                                                                            updateItem(token.id, { controlledBy: nextControlled });
                                                                        }}
                                                                        className={`w-full flex items-center justify-between p-2 rounded border transition-all ${isControlled ? (isPlayerView && player === playerName ? 'bg-[#c8aa6e]/20 border-[#c8aa6e]/50 cursor-not-allowed' : 'bg-[#c8aa6e]/10 border-[#c8aa6e]/50') : 'bg-slate-900/50 border-slate-800 cursor-pointer'} ${isControlled ? 'text-[#f0e6d2]' : 'text-slate-500'}`}
                                                                    >
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider">{player}</span>
                                                                        {isControlled ? (
                                                                            <Check className="w-3 h-3 text-[#c8aa6e]" />
                                                                        ) : (
                                                                            <div className="w-3 h-3 rounded-full border border-slate-700" />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {existingPlayers.length === 0 && (
                                                                <p className="text-[8px] text-slate-600 uppercase text-center italic">No hay jugadores disponibles</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* VISIÓN Y SENTIDOS (Solo para tokens reales) */}
                                                {token.type !== 'light' && token.type !== 'wall' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-6">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <Activity size={12} /> Visión y Niebla
                                                        </h4>

                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Emite Visión</span>
                                                                    <span className="text-[8px] text-slate-600 italic">Despeja la niebla alrededor</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => updateItem(token.id, { hasVision: !token.hasVision })}
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${token.hasVision ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.hasVision ? 'left-7' : 'left-1'}`} />
                                                                </button>
                                                            </div>

                                                            {token.hasVision && (
                                                                <div className="space-y-3 pt-2">
                                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                        <span className="text-slate-500">Radio de Visión</span>
                                                                        <span className="text-[#c8aa6e] font-mono">{token.visionRadius || 300}px</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="50" max="1500" step="50"
                                                                        value={token.visionRadius || 300}
                                                                        onChange={(e) => updateItem(token.id, { visionRadius: Number(e.target.value) })}
                                                                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="w-full h-px bg-slate-800/30 my-2"></div>

                                                            {/* VISIÓN EN LA OSCURIDAD */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Visión en Oscuridad</span>
                                                                        <div className="bg-[#c8aa6e]/10 border border-[#c8aa6e]/30 text-[#c8aa6e] text-[7px] px-1 rounded uppercase font-bold tracking-tighter">RACIAL</div>
                                                                    </div>
                                                                    <span className="text-[8px] text-slate-600 italic">Ignora la oscuridad ambiental</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => updateItem(token.id, { hasDarkvision: !token.hasDarkvision })}
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${token.hasDarkvision ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.hasDarkvision ? 'left-7' : 'left-1'}`} />
                                                                </button>
                                                            </div>

                                                            {token.hasDarkvision && (
                                                                <div className="space-y-3 pt-2">
                                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                        <span className="text-slate-500">Alcance Oscuridad</span>
                                                                        <span className="text-[#c8aa6e] font-mono">{token.darkvisionRadius || 300}px</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="50" max="1500" step="50"
                                                                        value={token.darkvisionRadius || 300}
                                                                        onChange={(e) => updateItem(token.id, { darkvisionRadius: Number(e.target.value) })}
                                                                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* LUZ DEL TOKEN */}
                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                                        <Lightbulb size={12} /> Emitir Luz
                                                                    </h4>
                                                                    <span className="text-[8px] text-slate-600 italic">El token actúa como una fuente de luz</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => updateItem(token.id, { emitsLight: !token.emitsLight })}
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${token.emitsLight ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.emitsLight ? 'left-7' : 'left-1'}`} />
                                                                </button>
                                                            </div>

                                                            {token.emitsLight && (
                                                                <div className="space-y-6 pt-2 border-t border-slate-800/50 mt-2">
                                                                    {/* Radio de Luz */}
                                                                    <div className="space-y-3">
                                                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                            <span className="text-slate-500">Alcance de Luz (Px)</span>
                                                                            <span className="text-[#c8aa6e] font-mono">{token.lightRadius || 200}px</span>
                                                                        </div>
                                                                        <input
                                                                            type="range"
                                                                            min="50" max="1000" step="10"
                                                                            value={token.lightRadius || 200}
                                                                            onChange={(e) => updateItem(token.id, { lightRadius: Number(e.target.value) })}
                                                                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                                        />
                                                                    </div>

                                                                    {/* Parpadeo (Flicker) Toggle */}
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Parpadeo</span>
                                                                            <span className="text-[8px] text-slate-600">Simula una antorcha</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => updateItem(token.id, { lightFlicker: !token.lightFlicker })}
                                                                            className={`w-12 h-6 rounded-full transition-all relative ${token.lightFlicker ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                                        >
                                                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.lightFlicker ? 'left-7' : 'left-1'}`} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Color de la Luz */}
                                                                    <div className="space-y-3">
                                                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                            <span className="text-slate-500">Color de Luz</span>
                                                                            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: token.lightColor || '#fff1ae' }}></div>
                                                                        </div>
                                                                        <div className="flex gap-1.5">
                                                                            {['#fff1ae', '#ffafae', '#aebcff', '#ccffae', '#ffffff'].map(c => (
                                                                                <button
                                                                                    key={c}
                                                                                    onClick={() => updateItem(token.id, { lightColor: c })}
                                                                                    className={`flex-1 h-6 rounded border transition-all ${(token.lightColor || '#fff1ae') === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/30'}`}
                                                                                    style={{ backgroundColor: c }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}



                                                {/* RECURSOS Y ATRIBUTOS (Solo si NO es una luz ni un muro) */}
                                                {token.type !== 'light' && token.type !== 'wall' && (
                                                    <div className="pt-4 border-t border-slate-800/50">
                                                        <TokenResources
                                                            token={token}
                                                            onUpdate={(updates) => updateItem(token.id, updates)}
                                                        />
                                                    </div>
                                                )}



                                                {/* CONFIGURACIÓN DE LUZ (Solo si ES una luz) */}
                                                {token.type === 'light' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-6">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <Sparkles size={12} /> Propiedades del Foco
                                                        </h4>

                                                        {/* Radio de Luz */}
                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                <span className="text-slate-500">Alcance (Px)</span>
                                                                <span className="text-[#c8aa6e] font-mono">{token.radius}px</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="50" max="1000" step="10"
                                                                value={token.radius || 200}
                                                                onChange={(e) => updateItem(token.id, { radius: Number(e.target.value) })}
                                                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                            />
                                                        </div>

                                                        {/* Snap Toggle para Luz */}
                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 flex items-center justify-between">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Snap a Rejilla</span>
                                                                <span className="text-[9px] text-slate-600">Ajuste magnético a las celdas</span>
                                                            </div>
                                                            <button
                                                                onClick={() => updateItem(token.id, { snapToGrid: !token.snapToGrid })}
                                                                className={`w-12 h-6 rounded-full transition-all relative ${token.snapToGrid ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.snapToGrid ? 'left-7' : 'left-1'}`} />
                                                            </button>
                                                        </div>

                                                        {/* Parpadeo (Flicker) Toggle */}
                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 flex items-center justify-between">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Animación de Parpadeo</span>
                                                                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[7px] px-1 rounded uppercase font-bold tracking-tighter">BETA</div>
                                                                </div>
                                                                <span className="text-[9px] text-slate-600">Simula el movimiento de una antorcha</span>
                                                            </div>
                                                            <button
                                                                onClick={() => updateItem(token.id, { flicker: !token.flicker })}
                                                                className={`w-12 h-6 rounded-full transition-all relative ${token.flicker ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.flicker ? 'left-7' : 'left-1'}`} />
                                                            </button>
                                                        </div>

                                                        {/* Color de la Luz */}
                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                <span className="text-slate-500">Tono de Iluminación</span>
                                                                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: token.color }}></div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {['#fff1ae', '#ffafae', '#aebcff', '#ccffae', '#ffffff'].map(c => (
                                                                    <button
                                                                        key={c}
                                                                        onClick={() => updateItem(token.id, { color: c })}
                                                                        className={`flex-1 h-8 rounded border transition-all ${token.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/30'}`}
                                                                        style={{ backgroundColor: c }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* CONFIGURACIÓN DE MURO (Solo si ES un muro) */}
                                                {token.type === 'wall' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-6">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <PenTool size={12} /> Propiedades del Muro
                                                        </h4>

                                                        {/* Snap Toggle para Muro */}
                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 flex items-center justify-between">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Snap a Rejilla</span>
                                                                <span className="text-[9px] text-slate-600">Ajuste magnético a las celdas</span>
                                                            </div>
                                                            <button
                                                                onClick={() => updateItem(token.id, { snapToGrid: token.snapToGrid === false ? true : false })}
                                                                className={`w-12 h-6 rounded-full transition-all relative ${token.snapToGrid !== false ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.snapToGrid !== false ? 'left-7' : 'left-1'}`} />
                                                            </button>
                                                        </div>

                                                        {/* Grosor del Muro */}
                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                <span className="text-slate-500">Grosor del Collider</span>
                                                                <span className="text-[#c8aa6e] font-mono">{token.thickness || 4}px</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="1" max="20" step="1"
                                                                value={token.thickness || 4}
                                                                onChange={(e) => updateItem(token.id, { thickness: Number(e.target.value) })}
                                                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Estados Alterados (Solo para tokens reales) */}
                                                {token.type !== 'light' && token.type !== 'wall' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-3">
                                                        <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estados Alterados</h4>
                                                        <EstadoSelector
                                                            selected={token.status || []}
                                                            onToggle={(statusId) => {
                                                                const currentStatus = token.status || [];
                                                                const newStatus = currentStatus.includes(statusId)
                                                                    ? currentStatus.filter(s => s !== statusId)
                                                                    : [...currentStatus, statusId];
                                                                updateItem(token.id, { status: newStatus });
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* AURAS E INDICADORES (Solo para tokens reales) */}
                                                {token.type !== 'light' && token.type !== 'wall' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-6">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <Sparkles size={12} /> Aura de Estado
                                                        </h4>

                                                        <div className="bg-[#0b1120] p-4 rounded border border-slate-800 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Activar Aura</span>
                                                                    <span className="text-[8px] text-slate-600 italic">Efecto visual bajo el token</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => updateItem(token.id, { auraEnabled: !token.auraEnabled })}
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${token.auraEnabled ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.auraEnabled ? 'left-7' : 'left-1'}`} />
                                                                </button>
                                                            </div>

                                                            {token.auraEnabled && (
                                                                <>
                                                                    {/* Color del Aura */}
                                                                    <div className="space-y-3 pt-2">
                                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Color del Aura</span>
                                                                        <div className="flex gap-2">
                                                                            {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#ffffff'].map(c => (
                                                                                <button
                                                                                    key={c}
                                                                                    onClick={() => updateItem(token.id, { auraColor: c })}
                                                                                    className={`w-6 h-6 rounded-full border transition-all ${token.auraColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                                                                                    style={{ backgroundColor: c }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {/* Radio del Aura (en celdas) */}
                                                                    <div className="space-y-3 pt-2">
                                                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                            <span className="text-slate-500">Alcance (Celdas)</span>
                                                                            <span className="text-[#c8aa6e] font-mono">{token.auraRadius || 1}</span>
                                                                        </div>
                                                                        <input
                                                                            type="range"
                                                                            min="0.5" max="5" step="0.5"
                                                                            value={token.auraRadius || 1}
                                                                            onChange={(e) => updateItem(token.id, { auraRadius: Number(e.target.value) })}
                                                                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                                        />
                                                                    </div>

                                                                    {/* Aura Pulsante */}
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Efecto Pulsante</span>
                                                                        <button
                                                                            onClick={() => updateItem(token.id, { auraStyle: token.auraStyle === 'pulse' ? 'solid' : 'pulse' })}
                                                                            className={`w-12 h-6 rounded-full transition-all relative ${token.auraStyle === 'pulse' ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                                        >
                                                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.auraStyle === 'pulse' ? 'left-7' : 'left-1'}`} />
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* SECCIÓN DE EQUIPAMIENTO */}
                                                {(token.type !== 'light' && token.type !== 'wall') && (() => {
                                                    const equippedItems = token.equippedItems || [];

                                                    // Category tabs for adding items — mirrors LoadoutView
                                                    const categories = [
                                                        { id: 'weapons', label: 'Armas', items: armas, type: 'weapon' },
                                                        { id: 'armor', label: 'Armaduras', items: armaduras, type: 'armor' },
                                                        { id: 'abilities', label: 'Habilidades', items: habilidades, type: 'power' },
                                                        { id: 'accessories', label: 'Accesorios', items: accesorios, type: 'access' },
                                                    ];

                                                    return (
                                                        <EquipmentSection
                                                            equippedItems={equippedItems}
                                                            categories={categories}
                                                            rarityColorMap={rarityColorMap}
                                                            glossary={glossary}
                                                            highlightText={highlightText}
                                                            onAddItem={(item, type) => {
                                                                const newItems = [...equippedItems, { ...item, type }];
                                                                updateItem(token.id, { equippedItems: newItems }, true);
                                                            }}
                                                            onRemoveItem={(idx) => {
                                                                const newItems = [...equippedItems];
                                                                newItems.splice(idx, 1);
                                                                updateItem(token.id, { equippedItems: newItems }, true);
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>


                            {!isPlayerView && (
                                <div className="p-6 bg-[#09090b] border-t border-[#c8aa6e]/20 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-20">
                                    <button
                                        onClick={saveCurrentScenario}
                                        disabled={isSaving}
                                        className={`group relative w-full py-5 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-[0.2em] rounded-sm shadow-xl hover:shadow-[0_0_25px_rgba(200,170,110,0.5)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {/* EFECTO DE BRILLO (Shine effect) - Solo si no está guardando */}
                                        {!isSaving && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>}

                                        <span className="relative z-10 drop-shadow-md flex items-center justify-center gap-3">
                                            {isSaving ? (
                                                <>
                                                    <RotateCw className="w-5 h-5 animate-spin" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                'Confirmar Cambios'
                                            )}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* --- Controles de Capas y Zoom Flotantes --- */}
                        <div className="absolute bottom-56 md:bottom-8 right-4 md:right-8 z-50 flex flex-col gap-2 md:gap-3 pointer-events-auto items-end">

                            {/* Herramientas de Edición (Solo visibles en capa iluminación y para Master) */}
                            {!isPlayerView && (
                                <div className={`transition-all duration-300 transform flex flex-col gap-2 md:gap-3 ${activeLayer === 'LIGHTING' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 h-0 overflow-hidden'}`}>
                                    {/* Herramienta Muros */}
                                    <button
                                        onClick={() => setIsDrawingWall(!isDrawingWall)}
                                        className={`w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border rounded-lg shadow-2xl flex items-center justify-center transition-all group active:scale-95 ${isDrawingWall ? 'border-[#c8aa6e] bg-[#c8aa6e]/20 text-[#c8aa6e]' : 'border-[#c8aa6e]/30 text-[#c8aa6e] hover:bg-[#c8aa6e]/10'}`}
                                        title={isDrawingWall ? "Dejar de Dibujar Muros" : "Dibujar Muros"}
                                    >
                                        <PenTool className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
                                    </button>

                                    {/* Botón para añadir LUZ */}
                                    <button
                                        onClick={() => addLightToCanvas()}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] rounded-lg shadow-2xl flex items-center justify-center hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e] transition-all group active:scale-95"
                                        title="Añadir Foco de Luz"
                                    >
                                        <Lightbulb className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
                                    </button>
                                </div>
                            )}

                            {/* Selector de Capas (Sólo Master) */}
                            {!isPlayerView && (
                                <div className="bg-[#1a1b26] border border-[#c8aa6e]/30 rounded-lg p-1 shadow-2xl flex flex-col gap-1 items-center">
                                    <button
                                        onClick={() => {
                                            setActiveLayer('LIGHTING');
                                            setSelectedTokenIds([]);
                                            setIsDrawingWall(false);
                                        }}
                                        className={`w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center transition-all ${activeLayer === 'LIGHTING' ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                        title="Capa de Iluminación"
                                    >
                                        <Lightbulb size={16} className="md:hidden" />
                                        <Lightbulb size={20} className="hidden md:block" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveLayer('TABLETOP');
                                            setSelectedTokenIds([]);
                                            setIsDrawingWall(false);
                                        }}
                                        className={`w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center transition-all ${activeLayer === 'TABLETOP' ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                        title="Capa de Mesa (Tokens)"
                                    >
                                        <LayoutGrid size={16} className="md:hidden" />
                                        <LayoutGrid size={20} className="hidden md:block" />
                                    </button>
                                </div>
                            )}

                            {/* ═══ ZOOM: Versión Desktop — Botones Verticales Clásicos ═══ */}
                            <div className="hidden md:flex flex-col items-center gap-3">
                                <div className="bg-[#1a1b26] border border-slate-700 rounded-lg p-1 shadow-2xl flex flex-col items-center">
                                    <button
                                        onClick={() => setZoom(prev => Math.min(prev + 0.1, 5))}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                        title="Zoom In"
                                    >
                                        <FiPlus size={20} />
                                    </button>
                                    <div className="w-4 h-px bg-slate-700 my-1"></div>
                                    <button
                                        onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.1))}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                        title="Zoom Out"
                                    >
                                        <FiMinus size={20} />
                                    </button>
                                </div>
                                <div className="bg-[#1a1b26]/90 border border-[#c8aa6e]/20 rounded px-3 py-1 text-[10px] text-[#c8aa6e] text-center font-mono">
                                    {Math.round(zoom * 100)}%
                                </div>
                            </div>
                        </div>

                        {/* ═══ ZOOM RULER: Versión Móvil — Regla Vertical Derecha ═══ */}
                        {(() => {
                            const RULER_MIN = 0.2, RULER_MAX = 3.0;
                            const logMin = Math.log(RULER_MIN), logMax = Math.log(RULER_MAX);
                            const getPos = (z) => (1 - (Math.log(Math.max(RULER_MIN, Math.min(RULER_MAX, z))) - logMin) / (logMax - logMin)) * 100;
                            const getZoomFromPos = (pct) => Math.exp(logMax - (pct / 100) * (logMax - logMin));
                            const ticks = [
                                { z: 0.25, label: null },
                                { z: 0.5, label: '50' },
                                { z: 0.75, label: null },
                                { z: 1.0, label: '100' },
                                { z: 1.5, label: null },
                                { z: 2.0, label: '200' },
                                { z: 2.5, label: null },
                                { z: 3.0, label: '300' },
                            ];
                            const currentPos = getPos(zoom);

                            const handleRulerTouch = (e) => {
                                const touch = e.touches?.[0] || e.changedTouches?.[0];
                                if (!touch) return;
                                const ruler = e.currentTarget;
                                const rect = ruler.getBoundingClientRect();
                                const relY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
                                const newZoom = getZoomFromPos(relY * 100);
                                setZoom(Math.round(newZoom * 10) / 10);
                            };

                            return (
                                <div
                                    className="md:hidden absolute right-0 top-20 z-50 pointer-events-auto"
                                    style={{ bottom: '14.5rem' }}
                                >
                                    <div
                                        className="relative h-full w-10 flex items-center justify-end pr-1"
                                        onTouchStart={(e) => { e.stopPropagation(); handleRulerTouch(e); }}
                                        onTouchMove={(e) => { e.stopPropagation(); handleRulerTouch(e); }}
                                    >
                                        {/* Línea central de la regla */}
                                        <div className="absolute right-2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#c8aa6e]/25 to-transparent"></div>

                                        {/* Marcas de la regla */}
                                        {ticks.map(tick => {
                                            const pos = getPos(tick.z);
                                            const isMajor = tick.label !== null;
                                            return (
                                                <div
                                                    key={tick.z}
                                                    className="absolute flex items-center justify-end"
                                                    style={{ top: `${pos}%`, right: '4px', transform: 'translateY(-50%)' }}
                                                >
                                                    {/* Label */}
                                                    {isMajor && (
                                                        <span className="text-[7px] font-mono text-[#c8aa6e]/30 mr-1.5 select-none">
                                                            {tick.label}
                                                        </span>
                                                    )}
                                                    {/* Tick mark */}
                                                    <div
                                                        className={`h-px ${isMajor ? 'w-2.5 bg-[#c8aa6e]/40' : 'w-1.5 bg-[#c8aa6e]/15'}`}
                                                    ></div>
                                                </div>
                                            );
                                        })}

                                        {/* Indicador de zoom actual (diamante dorado) */}
                                        <div
                                            className="absolute flex items-center transition-all duration-150 ease-out"
                                            style={{ top: `${currentPos}%`, right: '0px', transform: 'translateY(-50%)' }}
                                        >
                                            {/* Etiqueta del porcentaje */}
                                            <div className="flex items-center justify-center h-5 bg-[#0b1120]/90 backdrop-blur-sm border border-[#c8aa6e]/40 rounded px-1.5 shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                                                <span className="text-[8px] font-bold font-mono text-[#c8aa6e] tabular-nums select-none leading-none">
                                                    {Math.round(zoom * 100)}%
                                                </span>
                                            </div>
                                            {/* Línea conectora */}
                                            <div className="w-1 h-px bg-[#c8aa6e]/40"></div>
                                            {/* Diamante indicador */}
                                            <div className="w-1.5 h-1.5 bg-[#c8aa6e] rotate-45 shadow-[0_0_4px_rgba(200,170,110,0.6)] shrink-0 translate-y-px"></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* --- Instrucciones Rápidas --- */}
                        <div className="absolute bottom-8 left-8 z-50 pointer-events-none opacity-50">
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                <FiMove />
                                <span>Click Central + Arrastrar para Mover</span>
                            </div>
                        </div>

                        {/* --- VIEWPORT (Área visible) --- */}
                        <div
                            ref={containerRef}
                            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
                            onMouseDown={handleCanvasBackgroundMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            {/* --- SELECTION BOX RENDER (Screen Space Overlay) --- */}
                            {selectionBox && (
                                <div
                                    className="absolute border border-[#c8aa6e] bg-[#c8aa6e]/10 pointer-events-none z-50"
                                    style={{
                                        left: Math.min(selectionBox.start.x, selectionBox.current.x) - (containerRef.current?.getBoundingClientRect().left || 0),
                                        top: Math.min(selectionBox.start.y, selectionBox.current.y) - (containerRef.current?.getBoundingClientRect().top || 0),
                                        width: Math.abs(selectionBox.current.x - selectionBox.start.x),
                                        height: Math.abs(selectionBox.current.y - selectionBox.start.y)
                                    }}
                                />
                            )}

                            {/* --- WORLD (Contenedor Transformado) --- */}
                            <div
                                style={{
                                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                                    width: `${WORLD_SIZE}px`,
                                    height: `${WORLD_SIZE}px`,
                                    transformOrigin: 'center center',
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    marginLeft: `${-WORLD_SIZE / 2}px`,
                                    marginTop: `${-WORLD_SIZE / 2}px`,
                                    pointerEvents: 'none' // Evita interferir con los eventos del viewport
                                }}
                            >

                                {/* --- GRID LAYER (SVG) --- */}
                                {/* Contenedor del SVG: Si es finito, lo centramos en el mundo */}
                                <div className={`absolute ${gridConfig.isInfinite ? 'inset-0' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
                                    style={!gridConfig.isInfinite ? { width: finiteGridWidth, height: finiteGridHeight } : {}}
                                >
                                    <svg
                                        width="100%"
                                        height="100%"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="overflow-visible pointer-events-none transition-all duration-300 relative"
                                    >
                                        {/* IMAGEN DE FONDO (Solo si es finito y existe) */}
                                        {!gridConfig.isInfinite && gridConfig.backgroundImage && (
                                            <foreignObject width="100%" height="100%" x="0" y="0">
                                                <img
                                                    src={gridConfig.backgroundImage}
                                                    alt="Map Background"
                                                    className="w-full h-full object-cover"
                                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                                />
                                            </foreignObject>
                                        )}

                                        <defs>
                                            {/* Patrón de Rejilla Pequeña (La celda base) */}
                                            <pattern
                                                id="grid-pattern"
                                                width={gridConfig.cellWidth}
                                                height={gridConfig.cellHeight}
                                                patternUnits="userSpaceOnUse"
                                            >
                                                {/* Líneas de la rejilla */}
                                                <path
                                                    d={`M ${gridConfig.cellWidth} 0 L 0 0 0 ${gridConfig.cellHeight}`}
                                                    fill="none"
                                                    stroke={gridConfig.color}
                                                    strokeWidth={gridConfig.lineWidth}
                                                    strokeOpacity={gridConfig.opacity}
                                                    strokeDasharray={
                                                        gridConfig.lineType === 'dashed' ? '5,5' :
                                                            gridConfig.lineType === 'dotted' ? '1,3' :
                                                                'none'
                                                    }
                                                />
                                            </pattern>
                                        </defs>

                                        {/* Rectángulo que rellena con el patrón */}
                                        <rect width="100%" height="100%" fill="url(#grid-pattern)" />

                                        {/* Borde del Grid (Visible especialmente si es Finito) */}
                                        <rect
                                            width="100%"
                                            height="100%"
                                            fill="none"
                                            stroke="#c8aa6e"
                                            strokeWidth="2"
                                            strokeOpacity={gridConfig.isInfinite ? "0.1" : "0.5"}
                                        />
                                    </svg>
                                </div>

                                {/* --- CONTENIDO DEL CANVAS (Tokens, Dibujos, etc.) --- */}
                                {/* Los items se renderizan aquí, entre el fondo y la niebla superior */}
                                <div className="absolute inset-0 z-10 pointer-events-none" style={{ width: WORLD_SIZE, height: WORLD_SIZE }}>
                                    {(activeScenario?.items || []).filter(i => i && i.type === 'light').map(item => renderItemJSX(item))}
                                    {(activeScenario?.items || []).filter(i => i && i.type !== 'light').map(item => renderItemJSX(item))}
                                </div>

                                {/* --- CAPA SUPERIOR: NIEBLA Y OSCURIDAD (SVG) --- */}
                                {/* Movemos la niebla aquí para que tape a los tokens y muros también */}
                                <div className="absolute inset-0 z-20 pointer-events-none" style={{ width: WORLD_SIZE, height: WORLD_SIZE }}>
                                    <svg width="100%" height="100%" className="overflow-visible pointer-events-none transition-all duration-300 relative">
                                        {/* CAPA 1: ILUMINACIÓN AMBIENTAL (Atmósfera) */}
                                        <rect
                                            x={mapX - bleed}
                                            y={mapY - bleed}
                                            width={mapBounds.width + bleed * 2}
                                            height={mapBounds.height + bleed * 2}
                                            fill="black"
                                            mask="url(#lighting-mask)"
                                            style={{
                                                opacity: gridConfig.ambientDarkness || 0,
                                                transition: 'opacity 0.3s ease-in-out'
                                            }}
                                        />

                                        {/* CAPA 2: NIEBLA DE GUERRA (Línea de Visión) */}
                                        {gridConfig.fogOfWar && (
                                            <rect
                                                x={mapX - bleed}
                                                y={mapY - bleed}
                                                width={mapBounds.width + bleed * 2}
                                                height={mapBounds.height + bleed * 2}
                                                fill="black"
                                                mask="url(#fog-mask)"
                                                style={{
                                                    opacity: isPlayerView
                                                        ? 1
                                                        : ((activeScenario?.items || []).some(s => s && selectedTokenIds.includes(s.id) && s.type !== 'light' && s.type !== 'wall' && s.hasVision) ? 1 : 0.8),
                                                    transition: 'opacity 0.3s ease-in-out'
                                                }}
                                            />
                                        )}
                                    </svg>
                                </div>

                                {/* PREVISUALIZACIÓN DE MURO (DIBUJO) */}
                                {isDrawingWall && wallDrawingStart && wallDrawingCurrent && (
                                    <div className="absolute inset-0 pointer-events-none z-40">
                                        <svg width="100%" height="100%" className="overflow-visible">
                                            {/* Línea de previsualización (Dorada discontinua) */}
                                            <line
                                                x1={wallDrawingStart.x}
                                                y1={wallDrawingStart.y}
                                                x2={wallDrawingCurrent.x}
                                                y2={wallDrawingCurrent.y}
                                                stroke="#c8aa6e"
                                                strokeWidth="3"
                                                strokeDasharray="6 4"
                                                strokeLinecap="round"
                                            />
                                            {/* Handles de inicio y fin */}
                                            <circle cx={wallDrawingStart.x} cy={wallDrawingStart.y} r={7} fill="none" stroke="white" strokeWidth={1.5} />
                                            <rect x={wallDrawingStart.x - 4} y={wallDrawingStart.y - 4} width={8} height={8} fill="#1e293b" stroke="white" />

                                            <circle cx={wallDrawingCurrent.x} cy={wallDrawingCurrent.y} r={7} fill="none" stroke="white" strokeWidth={1.5} />
                                            <rect x={wallDrawingCurrent.x - 4} y={wallDrawingCurrent.y - 4} width={8} height={8} fill="#1e293b" stroke="white" />
                                        </svg>
                                    </div>
                                )}

                                {/* DARKNESS OVERLAY (SVG Masked) */}
                                <div className="absolute inset-0 pointer-events-none z-30" style={{ width: WORLD_SIZE, height: WORLD_SIZE }}>
                                    <svg width="100%" height="100%" className="overflow-visible">
                                        <defs>
                                            {/* MÁSCARA 1: ILUMINACIÓN (Solo Luces) */}
                                            <mask id="lighting-mask">
                                                <rect x={mapX - bleed} y={mapY - bleed} width={mapBounds.width + bleed * 2} height={mapBounds.height + bleed * 2} fill="white" />
                                                {/* Luces de Ambiente: Solo visibles si están en LoS de la perspectiva actual */}
                                                {(isPlayerView && selectedTokenIds.length === 0) ? (
                                                    // VISTA GLOBAL JUGADOR: Renderizado Simplificado (Estilo Master)
                                                    // Las luces deben "perforar" la oscuridad ambiental si están cerca de mis tokens.
                                                    (() => {
                                                        const myTokens = (activeScenario?.items || []).filter(t => t && t.controlledBy?.includes(playerName) && t.hasVision);

                                                        // Si no tengo tokens, no veo nada (todo oscuro)
                                                        if (myTokens.length === 0) return null;

                                                        // Filtrar luces relevantes: Solo las que están cerca de alguno de mis tokens
                                                        // Esto es una optimización de CPU
                                                        const visibleLights = (activeScenario?.items || []).filter(i => {
                                                            if (!i || (i.type !== 'light' && !i.emitsLight)) return false;
                                                            const lRadius = (i.type === 'light' ? i.radius : i.lightRadius) || 200;

                                                            return myTokens.some(token => {
                                                                // Copiamos lógica de interacción para render suave al arrastrar
                                                                const isInteractingT = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                                const originalT = tokenOriginalPos[token.id];
                                                                const tokenX = (isInteractingT && originalT) ? originalT.x : token.x;
                                                                const tokenY = (isInteractingT && originalT) ? originalT.y : token.y;

                                                                const dist = Math.hypot(tokenX - i.x, tokenY - i.y);
                                                                // Aumentamos margen para evitar que se apaguen antes de salir de pantalla
                                                                const visibleRange = (token.visionRadius || 300) + lRadius + 200;
                                                                return dist < visibleRange;
                                                            });
                                                        });

                                                        return (
                                                            <g>
                                                                {/* Renderizamos cada luz visible para que "agujeree" la oscuridad */}
                                                                {visibleLights.map(light => {
                                                                    const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                                    const original = tokenOriginalPos[light.id];
                                                                    const lx = (isInteracting && original) ? original.x : light.x;
                                                                    const ly = (isInteracting && original) ? original.y : light.y;
                                                                    const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                                    const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                                    // Usamos su propia máscara de sombra para que la luz respete paredes
                                                                    return (
                                                                        <g key={`light-hole-ambient-${light.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                            <circle
                                                                                cx={lx + (light.width / 2)}
                                                                                cy={ly + (light.height / 2)}
                                                                                r={lRadius}
                                                                                fill={`url(#grad-light-${light.id})`} // Usamos el gradiente, que tiene alfa, para crear luz suave
                                                                                className={lFlicker ? 'animate-flicker' : ''}
                                                                            />
                                                                        </g>
                                                                    );
                                                                })}
                                                            </g>
                                                        );
                                                    })()
                                                ) : (
                                                    (() => {
                                                        // Obtener todos los tokens seleccionados con visión
                                                        const selectedVisionTokens = observerIds.length > 0
                                                            ? (activeScenario?.items || []).filter(t => t && observerIds.includes(t.id))
                                                            : [];

                                                        const allLights = (activeScenario?.items || []).filter(i => i && (i.type === 'light' || i.emitsLight));

                                                        if (selectedVisionTokens.length === 0) {
                                                            // Sin token seleccionado: master ve todas las luces sin recorte de visión
                                                            return (
                                                                <g>
                                                                    {allLights.map(light => {
                                                                        const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                                        const original = tokenOriginalPos[light.id];
                                                                        const lx = (isInteracting && original) ? original.x : light.x;
                                                                        const ly = (isInteracting && original) ? original.y : light.y;
                                                                        const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                                        const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                                        return (
                                                                            <g key={`light-hole-ambient-${light.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                                <circle
                                                                                    cx={lx + (light.width / 2)}
                                                                                    cy={ly + (light.height / 2)}
                                                                                    r={lRadius}
                                                                                    fill={`url(#grad-light-${light.id})`}
                                                                                    className={lFlicker ? 'animate-flicker' : ''}
                                                                                />
                                                                            </g>
                                                                        );
                                                                    })}
                                                                </g>
                                                            );
                                                        }

                                                        // Con tokens seleccionados: mostrar UNIÓN de sus visiones
                                                        // Calcular posiciones (usando original durante arrastre)
                                                        const tokenPositions = selectedVisionTokens.map(token => {
                                                            const isInteractingToken = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                            const originalToken = tokenOriginalPos[token.id];
                                                            return {
                                                                token,
                                                                x: (isInteractingToken && originalToken) ? originalToken.x : token.x,
                                                                y: (isInteractingToken && originalToken) ? originalToken.y : token.y,
                                                            };
                                                        });

                                                        // Filtrar luces visibles para CUALQUIERA de los tokens seleccionados
                                                        const visibleLights = allLights.filter(light => {
                                                            if (!light) return false;
                                                            const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                            return tokenPositions.some(({ token, x, y }) => {
                                                                if (!token) return false;
                                                                const dist = Math.hypot(x - light.x, y - light.y);
                                                                const visibleRange = (token.visionRadius || 300) + lRadius;
                                                                return dist < visibleRange;
                                                            });
                                                        });

                                                        // Renderizar la unión de las visiones de todos los tokens seleccionados
                                                        return tokenPositions.map(({ token, x, y }) => (
                                                            <g key={`multi-lighting-pov-${token.id}`} mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                                <defs>
                                                                    <mask id={`multi-vision-mask-ambient-${token.id}`}>
                                                                        <rect x={mapX - bleed} y={mapY - bleed} width={mapBounds.width + bleed * 2} height={mapBounds.height + bleed * 2} fill="black" />
                                                                        <g mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                                            <circle
                                                                                cx={x + (token.width / 2)}
                                                                                cy={y + (token.height / 2)}
                                                                                r={token.visionRadius || 300}
                                                                                fill="white"
                                                                            />
                                                                        </g>
                                                                    </mask>
                                                                </defs>
                                                                <g mask={`url(#multi-vision-mask-ambient-${token.id})`}>
                                                                    {visibleLights.map(light => {
                                                                        const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                                        const original = tokenOriginalPos[light.id];
                                                                        const lx = (isInteracting && original) ? original.x : light.x;
                                                                        const ly = (isInteracting && original) ? original.y : light.y;
                                                                        const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                                        const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                                        return (
                                                                            <g key={`light-hole-ambient-${light.id}-${token.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                                <circle
                                                                                    cx={lx + (light.width / 2)}
                                                                                    cy={ly + (light.height / 2)}
                                                                                    r={lRadius}
                                                                                    fill={`url(#grad-light-${light.id})`}
                                                                                    className={lFlicker ? 'animate-flicker' : ''}
                                                                                />
                                                                            </g>
                                                                        );
                                                                    })}
                                                                </g>
                                                            </g>
                                                        ));
                                                    })()
                                                )}

                                                {/* VISIÓN EN LA OSCURIDAD: Substraemos las áreas que el observador ve en la oscuridad */}
                                                {(activeScenario?.items || []).filter(i => {
                                                    if (!i) return false;
                                                    const isToken = i.type !== 'light' && i.type !== 'wall' && i.hasDarkvision;
                                                    if (!isToken) return false;

                                                    // Restricción de Jugador: Solo ve su propia visión en oscuridad
                                                    const isControlled = !isPlayerView || i.controlledBy?.includes(playerName);
                                                    if (!isControlled) return false;

                                                    // Si hay algo seleccionado (Focus Mode), solo mostramos esa visión
                                                    if (selectedTokenIds.length > 0) {
                                                        return selectedTokenIds.includes(i.id);
                                                    }
                                                    return true;
                                                }).map(token => {
                                                    const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                    const original = tokenOriginalPos[token.id];
                                                    const tx = (isInteracting && original) ? original.x : token.x;
                                                    const ty = (isInteracting && original) ? original.y : token.y;

                                                    return (
                                                        <AnimatePresence key={`darkvision-presence-${token.id}`}>
                                                            <motion.g
                                                                key={`darkvision-hole-ambient-${token.id}`}
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                transition={{ duration: 0.3 }}
                                                                mask={`url(#shadow-mask-${token.id}-${maskVersion})`}
                                                            >
                                                                <circle
                                                                    cx={tx + (token.width / 2)}
                                                                    cy={ty + (token.height / 2)}
                                                                    r={token.darkvisionRadius || 300}
                                                                    fill={`url(#grad-darkvision-${token.id})`}
                                                                />
                                                            </motion.g>
                                                        </AnimatePresence>
                                                    );
                                                })}
                                            </mask>

                                            {/* MÁSCARA 2: NIEBLA DE GUERRA (Visión + Luces) */}
                                            <mask id="fog-mask">
                                                <rect x={mapX - bleed} y={mapY - bleed} width={mapBounds.width + bleed * 2} height={mapBounds.height + bleed * 2} fill="white" />
                                                {/* Vision de los Tokens: Filtrado por selección para el Master */}
                                                {(() => {
                                                    // Determinar qué tokens otorgan visión al rol actual
                                                    const perspectiveTokens = (activeScenario?.items || []).filter(i =>
                                                        i && i.hasVision && i.type !== 'light' && i.type !== 'wall' &&
                                                        (isPlayerView ? i.controlledBy?.includes(playerName) : true)
                                                    );

                                                    // ¿Hay una selección que deba forzar el enfoque (perspective focus)?
                                                    const selectedVisionTokens = perspectiveTokens.filter(i =>
                                                        selectedTokenIds.includes(i.id)
                                                    );

                                                    // Si el jugador selecciona tokens propios con visión, activamos el enfoque exclusivo
                                                    const visibleTokens = selectedVisionTokens.length > 0 ? selectedVisionTokens : perspectiveTokens;

                                                    return (
                                                        <AnimatePresence>
                                                            {visibleTokens.map(token => {
                                                                const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                                const original = tokenOriginalPos[token.id];
                                                                const tx = (isInteracting && original) ? original.x : token.x;
                                                                const ty = (isInteracting && original) ? original.y : token.y;

                                                                return (
                                                                    <motion.g
                                                                        key={`vision-hole-fog-${token.id}`}
                                                                        initial={{ opacity: 0 }}
                                                                        animate={{ opacity: 1 }}
                                                                        exit={{ opacity: 0 }}
                                                                        transition={{ duration: 0.3 }}
                                                                        mask={`url(#shadow-mask-${token.id}-${maskVersion})`}
                                                                    >
                                                                        <circle
                                                                            cx={tx + (token.width / 2)}
                                                                            cy={ty + (token.height / 2)}
                                                                            r={token.visionRadius || 300}
                                                                            fill={`url(#grad-vision-${token.id})`}
                                                                        />
                                                                    </motion.g>
                                                                );
                                                            })}
                                                        </AnimatePresence>
                                                    );
                                                })()}
                                                {/* Luces (también revelan niebla siempre, pero filtradas por el observador) */}
                                                {/* Para jugadores: recortamos las luces al área de visión combinada de sus tokens */}
                                                {isPlayerView && (() => {
                                                    // Calcular los tokens con visión que el jugador está usando actualmente
                                                    const allMyTokens = (activeScenario?.items || []).filter(t =>
                                                        t && t.controlledBy?.includes(playerName) && t.hasVision
                                                    );

                                                    // Priorizar selección si existe
                                                    const selectedMyTokens = allMyTokens.filter(t => selectedTokenIds.includes(t.id));
                                                    const myVisionTokens = selectedMyTokens.length > 0 ? selectedMyTokens : allMyTokens;

                                                    if (myVisionTokens.length === 0) return null;

                                                    // Filtrar luces que estén al alcance de los tokens EN FOCO (usando posición original durante arrastre)
                                                    const visibleLights = (activeScenario?.items || []).filter(i => {
                                                        if (!i || (i.type !== 'light' && !i.emitsLight)) return false;
                                                        const lRadius = (i.type === 'light' ? i.radius : i.lightRadius) || 200;
                                                        return myVisionTokens.some(token => {
                                                            if (!token) return false;
                                                            const isInteractingT = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                            const originalT = tokenOriginalPos[token.id];
                                                            const tokenX = (isInteractingT && originalT) ? originalT.x : token.x;
                                                            const tokenY = (isInteractingT && originalT) ? originalT.y : token.y;
                                                            const dist = Math.hypot(tokenX - i.x, tokenY - i.y);
                                                            const visibleRange = (token.visionRadius || 300) + lRadius;
                                                            return dist < visibleRange;
                                                        });
                                                    });

                                                    // Generar un ID único para la máscara basado en la versión del escenario
                                                    // Esto fuerza al navegador (especialmente en móvil/Chrome) a repintar la máscara cuando cambia algo (ej. abrir puerta)
                                                    const maskVer = activeScenario?.lastModified || Date.now();
                                                    const maskId = `player-vision-mask-lights-${maskVer}`;

                                                    return (
                                                        <g>
                                                            {/* Máscara de revelado progresivo para luces (reemplaza al clipPath para permitir fade) */}
                                                            <defs>
                                                                <mask id={maskId}>
                                                                    <rect x={mapX - bleed} y={mapY - bleed} width={mapBounds.width + bleed * 2} height={mapBounds.height + bleed * 2} fill="black" />
                                                                    <AnimatePresence>
                                                                        {myVisionTokens.map(token => {
                                                                            const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                                            const original = tokenOriginalPos[token.id];
                                                                            const tx = (isInteracting && original) ? original.x : token.x;
                                                                            const ty = (isInteracting && original) ? original.y : token.y;
                                                                            return (
                                                                                <motion.g
                                                                                    key={`vision-mask-light-${token.id}`}
                                                                                    initial={{ opacity: 0 }}
                                                                                    animate={{ opacity: 1 }}
                                                                                    exit={{ opacity: 0 }}
                                                                                    transition={{ duration: 0.3 }}
                                                                                    mask={`url(#shadow-mask-${token.id}-${maskVersion})`}
                                                                                >
                                                                                    <circle
                                                                                        cx={tx + (token.width / 2)}
                                                                                        cy={ty + (token.height / 2)}
                                                                                        r={token.visionRadius || 300}
                                                                                        fill="white"
                                                                                    />
                                                                                </motion.g>
                                                                            );
                                                                        })}
                                                                    </AnimatePresence>
                                                                </mask>
                                                            </defs>

                                                            {/* Luces filtradas y animadas, ahora bajo la máscara de revelado progresivo */}
                                                            <g mask={`url(#${maskId})`}>
                                                                <AnimatePresence>
                                                                    {visibleLights.map(light => {
                                                                        const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                                        const original = tokenOriginalPos[light.id];
                                                                        const lx = (isInteracting && original) ? original.x : light.x;
                                                                        const ly = (isInteracting && original) ? original.y : light.y;
                                                                        const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                                        const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                                        return (
                                                                            <motion.g
                                                                                key={`light-hole-fog-${light.id}`}
                                                                                initial={{ opacity: 0 }}
                                                                                animate={{ opacity: 1 }}
                                                                                exit={{ opacity: 0 }}
                                                                                transition={{ duration: 0.3 }}
                                                                                mask={`url(#shadow-mask-${light.id}-${maskVersion})`}
                                                                            >
                                                                                <circle
                                                                                    cx={lx + (light.width / 2)}
                                                                                    cy={ly + (light.height / 2)}
                                                                                    r={lRadius}
                                                                                    fill={`url(#grad-light-${light.id})`}
                                                                                    className={lFlicker ? 'animate-flicker' : ''}
                                                                                />
                                                                            </motion.g>
                                                                        );
                                                                    })}
                                                                </AnimatePresence>
                                                            </g>
                                                        </g>
                                                    );
                                                })()}
                                                {/* Master: recorta luces al área de visión de los tokens seleccionados (soporta múltiples) */}
                                                {!isPlayerView && (() => {
                                                    // Obtener todos los tokens seleccionados con visión
                                                    const selectedVisionTokens = observerIds.length > 0
                                                        ? (activeScenario?.items || []).filter(t => t && observerIds.includes(t.id))
                                                        : [];

                                                    const allLights = (activeScenario?.items || []).filter(i => i && (i.type === 'light' || i.emitsLight));

                                                    if (selectedVisionTokens.length === 0) {
                                                        // Sin token seleccionado: master ve todas las luces sin recorte de visión
                                                        return (
                                                            <g>
                                                                {allLights.map(light => {
                                                                    const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                                    const original = tokenOriginalPos[light.id];
                                                                    const lx = (isInteracting && original) ? original.x : light.x;
                                                                    const ly = (isInteracting && original) ? original.y : light.y;
                                                                    const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                                    const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                                    return (
                                                                        <g key={`light-hole-fog-${light.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                            <circle
                                                                                cx={lx + (light.width / 2)}
                                                                                cy={ly + (light.height / 2)}
                                                                                r={lRadius}
                                                                                fill={`url(#grad-light-${light.id})`}
                                                                                className={lFlicker ? 'animate-flicker' : ''}
                                                                            />
                                                                        </g>
                                                                    );
                                                                })}
                                                            </g>
                                                        );
                                                    }

                                                    // Con tokens seleccionados: mostrar UNIÓN de sus visiones
                                                    const tokenPositions = selectedVisionTokens.map(token => {
                                                        const isInteractingToken = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                        const originalToken = tokenOriginalPos[token.id];
                                                        return {
                                                            token,
                                                            x: (isInteractingToken && originalToken) ? originalToken.x : token.x,
                                                            y: (isInteractingToken && originalToken) ? originalToken.y : token.y,
                                                        };
                                                    });

                                                    // Filtrar luces visibles para CUALQUIERA de los tokens seleccionados
                                                    const visibleLights = allLights.filter(light => {
                                                        const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                        return tokenPositions.some(({ token, x, y }) => {
                                                            const dist = Math.hypot(x - light.x, y - light.y);
                                                            const visibleRange = (token.visionRadius || 300) + lRadius;
                                                            return dist < visibleRange;
                                                        });
                                                    });

                                                    // Renderizar la unión de las visiones
                                                    return tokenPositions.map(({ token, x, y }) => (
                                                        <g key={`multi-fog-pov-${token.id}`} mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                            <defs>
                                                                <mask id={`multi-vision-mask-lights-${token.id}`}>
                                                                    <rect x={mapX - bleed} y={mapY - bleed} width={mapBounds.width + bleed * 2} height={mapBounds.height + bleed * 2} fill="black" />
                                                                    <g mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                                        <circle
                                                                            cx={x + (token.width / 2)}
                                                                            cy={y + (token.height / 2)}
                                                                            r={token.visionRadius || 300}
                                                                            fill="white"
                                                                        />
                                                                    </g>
                                                                </mask>
                                                            </defs>
                                                            <g mask={`url(#multi-vision-mask-lights-${token.id})`}>
                                                                {visibleLights.map(light => {
                                                                    const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                                    const original = tokenOriginalPos[light.id];
                                                                    const lx = (isInteracting && original) ? original.x : light.x;
                                                                    const ly = (isInteracting && original) ? original.y : light.y;
                                                                    const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                                    const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                                    return (
                                                                        <g key={`light-hole-fog-${light.id}-${token.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                            <circle
                                                                                cx={lx + (light.width / 2)}
                                                                                cy={ly + (light.height / 2)}
                                                                                r={lRadius}
                                                                                fill={`url(#grad-light-${light.id})`}
                                                                                className={lFlicker ? 'animate-flicker' : ''}
                                                                            />
                                                                        </g>
                                                                    );
                                                                })}
                                                            </g>
                                                        </g>
                                                    ));
                                                })()}

                                            </mask>

                                            {/* Gradientes de Luz */}
                                            {(activeScenario?.items || []).filter(i => i && (i.type === 'light' || i.emitsLight)).map(light => (
                                                <radialGradient id={`grad-light-${light.id}`} key={`grad-light-${light.id}`}>
                                                    <stop offset="0%" stopColor="black" stopOpacity="1" />
                                                    <stop offset="80%" stopColor="black" stopOpacity="0.3" />
                                                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                                                </radialGradient>
                                            ))}

                                            {/* Gradientes de Visión */}
                                            {(activeScenario?.items || []).filter(i => i && i.type !== 'light' && i.type !== 'wall' && i.hasVision).map(token => (
                                                <radialGradient id={`grad-vision-${token.id}`} key={`grad-vision-${token.id}`}>
                                                    <stop offset="0%" stopColor="black" stopOpacity="1" />
                                                    <stop offset="85%" stopColor="black" stopOpacity="0.8" />
                                                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                                                </radialGradient>
                                            ))}

                                            {/* Gradientes de Visión en la Oscuridad */}
                                            {(activeScenario?.items || []).filter(i => i && i.type !== 'light' && i.type !== 'wall' && i.hasDarkvision).map(token => (
                                                <radialGradient id={`grad-darkvision-${token.id}`} key={`grad-darkvision-${token.id}`}>
                                                    <stop offset="0%" stopColor="black" stopOpacity="1" />
                                                    <stop offset="80%" stopColor="black" stopOpacity="0.4" />
                                                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                                                </radialGradient>
                                            ))}

                                            {/* Máscaras de Sombra por Luz y por Token (Visión y Visión en Oscuridad) */}
                                            {(activeScenario?.items || []).filter(i => i && (i.type === 'light' || i.emitsLight || ((i.hasVision || i.hasDarkvision) && i.type !== 'wall'))).map(source => {
                                                const isSourceInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(source.id);
                                                const originalSource = tokenOriginalPos[source.id];
                                                const lx = ((isSourceInteracting && originalSource) ? originalSource.x : source.x) + source.width / 2;
                                                const ly = ((isSourceInteracting && originalSource) ? originalSource.y : source.y) + source.height / 2;
                                                const walls = (activeScenario?.items || []).filter(i =>
                                                    i && i.type === 'wall' &&
                                                    !(i.wallType === 'door' && i.isOpen) &&
                                                    i.wallType !== 'window'
                                                );

                                                return (
                                                    <mask id={`shadow-mask-${source.id}-${maskVersion}`} key={`shadow-mask-${source.id}-${maskVersion}`}>
                                                        <rect x={mapX - bleed} y={mapY - bleed} width={mapBounds.width + bleed * 2} height={mapBounds.height + bleed * 2} fill="white" />
                                                        {walls.map(wall => {
                                                            const isWallInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(wall.id);
                                                            const originalWall = tokenOriginalPos[wall.id];

                                                            let x1 = wall.x1, y1 = wall.y1, x2 = wall.x2, y2 = wall.y2;
                                                            if (isWallInteracting && originalWall) {
                                                                const dx = wall.x - originalWall.x;
                                                                const dy = wall.y - originalWall.y;
                                                                x1 -= dx; y1 -= dy;
                                                                x2 -= dx; y2 -= dy;
                                                            }

                                                            return (
                                                                <polygon
                                                                    key={`shadow-${source.id}-${wall.id}`}
                                                                    points={calculateShadowPoints(lx, ly, x1, y1, x2, y2)}
                                                                    fill="black"
                                                                />
                                                            );
                                                        })}
                                                    </mask>
                                                );
                                            })}
                                        </defs>


                                    </svg>
                                </div>

                                {/* LIGHT VISUAL GLOWS (Efecto visual del resplandor en la capa superior) */}
                                <div className="absolute inset-0 pointer-events-none z-[45] overflow-visible" style={{ width: WORLD_SIZE, height: WORLD_SIZE }}>
                                    <svg width="100%" height="100%" className="overflow-visible">
                                        {isPlayerView && selectedTokenIds.length === 0 && (
                                            <defs>
                                                <mask id="player-global-perspective-mask">
                                                    <rect x={0} y={0} width={WORLD_SIZE} height={WORLD_SIZE} fill="black" />
                                                    {(activeScenario?.items || []).filter(t => t && t.controlledBy?.includes(playerName) && t.hasVision).map(token => (
                                                        <g key={`global-p-mask-${token.id}`} mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                            <rect x={0} y={0} width={WORLD_SIZE} height={WORLD_SIZE} fill="white" />
                                                        </g>
                                                    ))}
                                                </mask>
                                            </defs>
                                        )}
                                        <g mask={(isPlayerView && selectedTokenIds.length === 0) ? "url(#player-global-perspective-mask)" : undefined}>
                                            {/* Para jugadores: recortamos los glows a la visión */}
                                            {isPlayerView && (() => {
                                                const allMyTokens = (activeScenario?.items || []).filter(t =>
                                                    t && t.controlledBy?.includes(playerName) && t.hasVision
                                                );

                                                // Priorizar selección si existe
                                                const selectedMyTokens = allMyTokens.filter(t => selectedTokenIds.includes(t.id));
                                                const myVisionTokens = selectedMyTokens.length > 0 ? selectedMyTokens : allMyTokens;

                                                if (myVisionTokens.length === 0) return null;

                                                // Filtrar luces (usando posición original durante arrastre)
                                                const visibleLights = (activeScenario?.items || []).filter(i => {
                                                    if (!i || (i.type !== 'light' && !i.emitsLight)) return false;
                                                    const lRadius = (i.type === 'light' ? i.radius : i.lightRadius) || 200;
                                                    return myVisionTokens.some(token => {
                                                        if (!token) return false;
                                                        const isInteractingT = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                        const originalT = tokenOriginalPos[token.id];
                                                        const tokenX = (isInteractingT && originalT) ? originalT.x : token.x;
                                                        const tokenY = (isInteractingT && originalT) ? originalT.y : token.y;
                                                        const dist = Math.hypot(tokenX - i.x, tokenY - i.y);
                                                        const visibleRange = (token.visionRadius || 300) + lRadius;
                                                        return dist < visibleRange;
                                                    });
                                                });

                                                return (
                                                    <>
                                                        <defs>
                                                            <mask id="player-vision-mask-glows">
                                                                <rect x={0} y={0} width={WORLD_SIZE} height={WORLD_SIZE} fill="black" />
                                                                {myVisionTokens.map(token => {
                                                                    const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                                    const original = tokenOriginalPos[token.id];
                                                                    const tx = (isInteracting && original) ? original.x : token.x;
                                                                    const ty = (isInteracting && original) ? original.y : token.y;
                                                                    return (
                                                                        <g
                                                                            key={`vision-mask-glow-${token.id}`}
                                                                            mask={`url(#shadow-mask-${token.id}-${maskVersion})`}
                                                                        >
                                                                            <circle
                                                                                cx={tx + (token.width / 2)}
                                                                                cy={ty + (token.height / 2)}
                                                                                r={token.visionRadius || 300}
                                                                                fill="white"
                                                                            />
                                                                        </g>
                                                                    );
                                                                })}
                                                            </mask>
                                                        </defs>
                                                        <g mask="url(#player-vision-mask-glows)">
                                                            <AnimatePresence>
                                                                {visibleLights.map(light => {
                                                                    const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                                    const original = tokenOriginalPos[light.id];
                                                                    const lx = (isInteracting && original) ? original.x : light.x;
                                                                    const ly = (isInteracting && original) ? original.y : light.y;
                                                                    const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                                    const lColor = (light.type === 'light' ? light.color : light.lightColor) || '#fff1ae';
                                                                    const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                                    return (
                                                                        <motion.g
                                                                            key={`glow-group-${light.id}`}
                                                                            initial={{ opacity: 0 }}
                                                                            animate={{ opacity: 1 }}
                                                                            exit={{ opacity: 0 }}
                                                                            transition={{ duration: 0.3 }}
                                                                            mask={`url(#shadow-mask-${light.id}-${maskVersion})`}
                                                                        >
                                                                            <defs>
                                                                                <radialGradient id={`visual-grad-${light.id}`}>
                                                                                    <stop offset="0%" stopColor={lColor} stopOpacity="0.4" />
                                                                                    <stop offset="70%" stopColor={lColor} stopOpacity="0" />
                                                                                </radialGradient>
                                                                            </defs>
                                                                            <circle
                                                                                cx={lx + light.width / 2}
                                                                                cy={ly + light.height / 2}
                                                                                r={lRadius * 1.5}
                                                                                fill={`url(#visual-grad-${light.id})`}
                                                                                style={{ mixBlendMode: 'screen' }}
                                                                                className={lFlicker ? 'animate-flicker' : ''}
                                                                            />
                                                                        </motion.g>
                                                                    );
                                                                })}
                                                            </AnimatePresence>
                                                        </g>
                                                    </>
                                                );
                                            })()}
                                            {/* Master: recorta glows a la visión de los tokens seleccionados (soporta múltiples) */}
                                            {!isPlayerView && (() => {
                                                // Obtener todos los tokens seleccionados con visión
                                                const selectedVisionTokens = observerIds.length > 0
                                                    ? activeScenario?.items?.filter(t => observerIds.includes(t.id)) || []
                                                    : [];

                                                const allLights = (activeScenario?.items || []).filter(i => i && (i.type === 'light' || i.emitsLight));

                                                if (selectedVisionTokens.length === 0) {
                                                    // Sin token seleccionado: master ve todos los glows sin recorte
                                                    return allLights.map(light => {
                                                        const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                        const original = tokenOriginalPos[light.id];
                                                        const lx = (isInteracting && original) ? original.x : light.x;
                                                        const ly = (isInteracting && original) ? original.y : light.y;
                                                        const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                        const lColor = (light.type === 'light' ? light.color : light.lightColor) || '#fff1ae';
                                                        const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                        return (
                                                            <g key={`glow-group-${light.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                <defs>
                                                                    <radialGradient id={`visual-grad-${light.id}`}>
                                                                        <stop offset="0%" stopColor={lColor} stopOpacity="0.4" />
                                                                        <stop offset="70%" stopColor={lColor} stopOpacity="0" />
                                                                    </radialGradient>
                                                                </defs>
                                                                <circle
                                                                    cx={lx + light.width / 2}
                                                                    cy={ly + light.height / 2}
                                                                    r={lRadius * 1.5}
                                                                    fill={`url(#visual-grad-${light.id})`}
                                                                    style={{ mixBlendMode: 'screen' }}
                                                                    className={lFlicker ? 'animate-flicker' : ''}
                                                                />
                                                            </g>
                                                        );
                                                    });
                                                }

                                                // Con tokens seleccionados: mostrar UNIÓN de sus visiones
                                                const tokenPositions = selectedVisionTokens.map(token => {
                                                    const isInteractingToken = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                    const originalToken = tokenOriginalPos[token.id];
                                                    return {
                                                        token,
                                                        x: (isInteractingToken && originalToken) ? originalToken.x : token.x,
                                                        y: (isInteractingToken && originalToken) ? originalToken.y : token.y,
                                                    };
                                                });

                                                // Filtrar luces visibles para CUALQUIERA de los tokens seleccionados
                                                const visibleLights = allLights.filter(light => {
                                                    const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                    return tokenPositions.some(({ token, x, y }) => {
                                                        const dist = Math.hypot(x - light.x, y - light.y);
                                                        const visibleRange = (token.visionRadius || 300) + lRadius;
                                                        return dist < visibleRange;
                                                    });
                                                });

                                                // Renderizar la unión de las visiones
                                                return tokenPositions.map(({ token, x, y }) => (
                                                    <g key={`multi-glow-pov-${token.id}`} mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                        <defs>
                                                            <mask id={`multi-vision-mask-glows-${token.id}`}>
                                                                <rect x={0} y={0} width={WORLD_SIZE} height={WORLD_SIZE} fill="black" />
                                                                <g mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                                    <circle
                                                                        cx={x + (token.width / 2)}
                                                                        cy={y + (token.height / 2)}
                                                                        r={token.visionRadius || 300}
                                                                        fill="white"
                                                                    />
                                                                </g>
                                                            </mask>
                                                        </defs>
                                                        <g mask={`url(#multi-vision-mask-glows-${token.id})`}>
                                                            {visibleLights.map(light => {
                                                                const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                                const original = tokenOriginalPos[light.id];
                                                                const lx = (isInteracting && original) ? original.x : light.x;
                                                                const ly = (isInteracting && original) ? original.y : light.y;
                                                                const lRadius = (light.type === 'light' ? light.radius : light.lightRadius) || 200;
                                                                const lColor = (light.type === 'light' ? light.color : light.lightColor) || '#fff1ae';
                                                                const lFlicker = (light.type === 'light' ? light.flicker : light.lightFlicker);

                                                                return (
                                                                    <g key={`glow-group-${light.id}-${token.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                        <defs>
                                                                            <radialGradient id={`visual-grad-${light.id}-${token.id}`}>
                                                                                <stop offset="0%" stopColor={lColor} stopOpacity="0.4" />
                                                                                <stop offset="70%" stopColor={lColor} stopOpacity="0" />
                                                                            </radialGradient>
                                                                        </defs>
                                                                        <circle
                                                                            cx={lx + light.width / 2}
                                                                            cy={ly + light.height / 2}
                                                                            r={lRadius * 1.5}
                                                                            fill={`url(#visual-grad-${light.id}-${token.id})`}
                                                                            style={{ mixBlendMode: 'screen' }}
                                                                            className={lFlicker ? 'animate-flicker' : ''}
                                                                        />
                                                                    </g>
                                                                );
                                                            })}
                                                        </g>
                                                    </g>
                                                ));
                                            })()}


                                            {/* DARKVISION VISUAL TINT (Efecto sutil para diferenciar visión racial) */}
                                            {(activeScenario?.items || []).filter(i => i && i.type !== 'light' && i.type !== 'wall' && i.hasDarkvision).map(token => {
                                                // Solo mostramos el tinte si está seleccionado (perspectiva activa)
                                                if (selectedTokenIds.length > 0 && !selectedTokenIds.includes(token.id)) return null;

                                                const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(token.id);
                                                const original = tokenOriginalPos[token.id];
                                                const tx = (isInteracting && original) ? original.x : token.x;
                                                const ty = (isInteracting && original) ? original.y : token.y;

                                                return (
                                                    <g key={`darkvision-glow-group-${token.id}`} mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                        <defs>
                                                            <radialGradient id={`darkvision-visual-grad-${token.id}`}>
                                                                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
                                                                <stop offset="80%" stopColor="#94a3b8" stopOpacity="0" />
                                                            </radialGradient>
                                                        </defs>
                                                        <circle
                                                            cx={tx + (token.width / 2)}
                                                            cy={ty + (token.height / 2)}
                                                            r={token.darkvisionRadius || 300}
                                                            fill={`url(#darkvision-visual-grad-${token.id})`}
                                                            style={{ mixBlendMode: 'soft-light' }}
                                                        />
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    </svg >
                                </div>

                            </div>
                        </div>
                    </>
                )
            }




            {/* --- COMBAT HUD (PLAYER VIEW) --- */}
            {isPlayerView && activeScenario && (() => {
                const myTokens = activeScenario.items?.filter(i =>
                    i.controlledBy?.includes(playerName) && i.type !== 'light' && i.type !== 'wall'
                ) || [];

                // Prioridad: 1. Seleccionado que controlo, 2. El primero de mi lista
                const selectedControlled = myTokens.find(t => selectedTokenIds.includes(t.id));
                const hudToken = selectedControlled || myTokens[0];

                if (hudToken) {
                    const canOpenSheet = !!hudToken.isCircular;

                    const handlePortraitClick = (charName) => {
                        if (canOpenSheet && onOpenCharacterSheet) {
                            onOpenCharacterSheet(charName);
                        } else {
                            // Feedback visual de advertencia
                            triggerToast(
                                "Token sin ficha vinculada",
                                "Esta entidad no tiene archivo de personaje",
                                'warning'
                            );
                        }
                    };

                    return (
                        <CombatHUD
                            token={hudToken}
                            onAction={(action) => console.log("Action:", action)}
                            onEndTurn={() => console.log("Turn Ended")}
                            onPortraitClick={handlePortraitClick}
                            canOpenSheet={canOpenSheet}
                        />
                    );
                }
                return null;
            })()}

            {/* Mensaje de Guardado (Toast) - Al final para estar siempre en el z-index superior */}
            <SaveToast
                show={showToast}
                exiting={toastExiting}
                type={toastType}
                message={toastMessage}
                subMessage={toastSubMessage}
            />
        </div >
    );
};

CanvasSection.propTypes = {
    onBack: PropTypes.func.isRequired,
};

export default CanvasSection;
