import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Gem, Package, Plus, Search, Shield, Sword, X, Zap } from 'lucide-react';
import { useCustomEquipmentImages } from '../../../hooks/useCustomEquipmentImages';
import { CanvasAssetImage } from './CanvasAssetImage';
import { getObjectImage } from './CanvasAssetImage';
import { getRarityInfo, normalizeGlossaryWord } from '../tokenSheetSync';

export const EquipmentSection = ({ equippedItems = [], categories = [], rarityColorMap = {}, glossary = [], highlightText = (t) => t, onAddItem, onRemoveItem, isPlayerView = false }) => {
    const customEquipmentImages = useCustomEquipmentImages();
    const [addCat, setAddCat] = useState('weapons');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const searchInputRef = useRef(null);

    const getEquipmentPriority = useCallback((item) => {
        const rawType = (item?.type || item?._category || item?.category || '').toString().toLowerCase();
        const rawName = `${item?.nombre || item?.name || ''} ${rawType}`.toLowerCase().replace(/[_-]/g, ' ');

        if (rawType === 'armor' || rawType === 'armors' || rawName.includes('armadura')) return 1;
        if (rawType === 'weapon' || rawType === 'weapons' || (rawName.includes('arma') && !rawName.includes('armadura'))) return 0;
        if (rawType === 'ability' || rawType === 'abilities' || rawType === 'power' || rawType === 'powers' || rawName.includes('habilidad')) return 2;
        if (rawType === 'access' || rawType === 'accessory' || rawType === 'accessories' || rawName.includes('accesorio')) return 3;
        return 4;
    }, []);

    const isArmorLikeItem = useCallback((item) => {
        const rawType = (item?.type || item?._category || item?.category || '').toString().toLowerCase();
        const rawName = `${item?.nombre || item?.name || ''} ${rawType}`.toLowerCase().replace(/[_-]/g, ' ');
        return rawType === 'armor' || rawType === 'armors' || rawName.includes('armadura');
    }, []);

    // Find current category config
    const currentCat = categories.find(c => c.id === addCat) || categories[0];
    const filteredItems = useMemo(() => {
        const list = currentCat?.items || [];
        // Limit results to prevent spoilers for players when not searching
        if (!searchTerm) {
            const limit = isPlayerView ? 4 : 50;
            return list.slice(0, limit);
        }
        const q = searchTerm.toLowerCase();
        // Even with search, limit to 50 for performance and cleanliness
        return list.filter(i => (i.nombre || i.name || '').toLowerCase().includes(q)).slice(0, 50);
    }, [currentCat, searchTerm, isPlayerView]);

    const orderedEquippedItems = useMemo(() => {
        return equippedItems
            .map((item, originalIndex) => ({ item, originalIndex }))
            .sort((a, b) => {
                const priorityDiff = getEquipmentPriority(a.item) - getEquipmentPriority(b.item);
                if (priorityDiff !== 0) return priorityDiff;
                return a.originalIndex - b.originalIndex;
            });
    }, [equippedItems, getEquipmentPriority]);

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
            {/* Section Header  standardized with other sections */}
            <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                <Sword size={12} /> Equipamiento
                {equippedItems.length > 0 && (
                    <span className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#c8aa6e]/10 text-[#c8aa6e] border border-[#c8aa6e]/20">
                        {equippedItems.length}
                    </span>
                )}
            </h4>

            {/* Equipped Items  Inventory card style */}
            {equippedItems.length > 0 ? (
                <div className="space-y-2">
                    {orderedEquippedItems.map(({ item, originalIndex }) => {
                        const rarity = getRarityInfo(item.rareza);
                        const rarityColor = rarityColorMap[item.rareza] || '#94a3b8';
                        const itemImage = getObjectImage(item, customEquipmentImages);
                        const TypeIcon = typeIcons[item.type] || Package;
                        const traits = item.rasgos ? (Array.isArray(item.rasgos) ? item.rasgos : item.rasgos.toString().split(',')) : (item.traits ? item.traits.toString().split(',') : []);

                        return (
                            <div
                                key={`${originalIndex}-${item.nombre || item.name || item.type || 'item'}`}
                                className={`relative bg-[#161f32] border ${rarity.border} rounded-lg overflow-hidden group hover:border-[#c8aa6e]/60 transition-all duration-300`}
                            >
                                {/* Dynamic Background Gradient (Hover Effect)  mirrors LoadoutView */}
                                <div className={`absolute inset-0 bg-gradient-to-r ${rarity.glow} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>

                                {/* Stardust/Noise Texture Overlay */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700 z-0 pointer-events-none"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
                                        backgroundSize: '100px 100px'
                                    }}
                                ></div>

                                {/* Rarity stripe (left edge) */}
                                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${rarity.stripe} z-10`} />

                                <div className="flex">
                                    {/* Left Column  Image or Icon (mirrors LoadoutView style) */}
                                    <div className="w-16 bg-black/50 relative shrink-0 ml-[3px] flex flex-col z-10 overflow-hidden">
                                        {itemImage && (
                                            <CanvasAssetImage
                                                src={itemImage}
                                                label={item.nombre || item.name || item.type || 'equipamiento'}
                                                imageClassName="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90"
                                                overlayClassName="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
                                                fallback={
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b1120]/95 via-black/75 to-[#161f32]/90">
                                                        <TypeIcon className={`w-7 h-7 ${rarity.text} opacity-60 drop-shadow-[0_0_10px_rgba(255,255,255,0.18)]`} />
                                                    </div>
                                                }
                                            />
                                        )}
                                        <div className="w-full h-full flex flex-col items-center justify-center relative z-20 py-2">
                                            {!itemImage && (
                                                <div className="mb-1">
                                                    <TypeIcon className={`w-7 h-7 ${rarity.text} opacity-60 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`} />
                                                </div>
                                            )}
                                            {/* Rarity Label  clean text style like LoadoutView */}
                                            {item.rareza && item.rareza.toLowerCase() !== 'común' ? (
                                                <span className={`text-[8px] uppercase font-bold ${rarity.text} text-center leading-tight px-1 drop-shadow-md`}>
                                                    {item.rareza}
                                                </span>
                                            ) : (
                                                !itemImage && <div className="w-6 h-[1px] bg-slate-700/50 mt-1"></div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column  Content */}
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
                                            {(item.consumo || item.consumption) && !isArmorLikeItem(item) && (
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
                                        onRemoveItem && onRemoveItem(originalIndex);
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

            {/* Add Item Panel  mirroring LoadoutView "Agregar al inventario" */}
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
                                    const itemImage = getObjectImage(item, customEquipmentImages);
                                    const TypeIcon = typeIcons[item.type || currentCat?.type] || Package;
                                    return (
                                        <div
                                            key={item.id || idx}
                                            className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-800/30 last:border-b-0 hover:bg-white/[0.03] transition-all group"
                                        >
                                            <div
                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{ backgroundColor: rarityColor, boxShadow: `0 0 6px ${rarityColor}60` }}
                                            />
                                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-slate-800 bg-black/45">
                                                {itemImage ? (
                                                    <CanvasAssetImage
                                                        src={itemImage}
                                                        label={item.nombre || item.name || item.type || 'equipamiento'}
                                                        imageClassName="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100"
                                                        overlayClassName="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
                                                        fallback={
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b1120]/95 via-black/75 to-[#161f32]/90">
                                                                <TypeIcon className="h-4 w-4 text-[#c8aa6e]/60" />
                                                            </div>
                                                        }
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <TypeIcon className="h-4 w-4 text-slate-600" />
                                                    </div>
                                                )}
                                            </div>
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

                            {/* Spoiler prevention hint for players */}
                            {isPlayerView && !searchTerm && (currentCat?.items?.length || 0) > 4 && (
                                <div className="py-2.5 px-4 flex flex-col items-center bg-slate-900/40 border-t border-slate-800/30">
                                    <div className="flex items-center gap-1.5 text-slate-500 opacity-60">
                                        <Search size={10} />
                                        <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Búsqueda requerida</span>
                                    </div>
                                </div>
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
