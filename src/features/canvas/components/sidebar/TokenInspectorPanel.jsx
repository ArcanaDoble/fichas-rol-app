import React from 'react';
import { Check, ChevronDown, Circle, Eye, EyeOff, Flame, Lightbulb, Link, Lock, Map as MapIcon, Maximize, Package, PenTool, RotateCw, Settings, Sparkles, Square, Trash2, Upload, Users, X } from 'lucide-react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import EstadoSelector from '../../../../components/EstadoSelector';
import TokenResources from '../../../../components/TokenResources';
import { syncArmorState } from '../../../../utils/armorSystem';
import { getCardDisplayImage } from '../../../../utils/cardImages';
import { getCardStackIds, isCardContainerItem, isCardItem, isContainerCardsHiddenForPlayers } from '../../../../utils/cardBoard';
import { isCombatTokenItem, normalizeTokenStatusIds } from '../../combatRules';
import { CardImageWithLoader, TokenImageWithLoader } from '.././CanvasAssetImage';
import { EquipmentSection } from '.././EquipmentSection';
import { normalizeGeometryKind } from '../../../tactical-shared/geometry';

export const TokenInspectorPanel = ({
    BOARD_DIE_SIDES,
    BoardDieVisual,
    BoardMarkerVisual,
    PRESET_COLORS,
    accesorios,
    activeScenario,
    activeTab,
    armaduras,
    armas,
    availableCharacters,
    deleteItem,
    existingPlayers,
    glossary,
    gridConfig,
    habilidades,
    handleBoardCardBackUpload,
    highlightText,
    isBoardMode,
    isMaster,
    isPlayerView,
    lastFlipTimesRef,
    linkCharacter,
    playerName,
    rarityColorMap,
    rollBoardDie,
    selectedTokenIds,
    unlinkCharacter,
    unstackSpecificCard,
    updateItem,
}) => (
    activeTab === 'INSPECTOR' && selectedTokenIds.length === 1 && (() => {
                                    const token = activeScenario.items.find(i => i.id === selectedTokenIds[0]);
                                    if (!token) return null;
                                    const tokenStackItems = isCardItem(token)
                                        ? getCardStackIds(token)
                                            .map(cardId => (activeScenario.items || []).find(stackItem => stackItem.id === cardId))
                                            .filter(Boolean)
                                        : [];

                                    return (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                            {/* Header Inspector */}
                                            {/* Header Inspector - Centered between lines (using tab border as top) */}
                                            <div className="flex flex-col items-center text-center gap-4 border-b border-slate-800/50 py-10 -mt-6 -mx-6 bg-gradient-to-b from-slate-900/20 to-transparent">
                                                <div className={`${token.type === 'card' ? 'w-20 h-28 rounded-lg' : token.type === 'boardMarker' ? 'w-20 h-20 rounded-full' : 'w-20 h-20 rounded-xl'} bg-[#0b1120] border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-[#c8aa6e] shadow-2xl relative group ring-1 ring-slate-800/40`}>
                                                    {token.type === 'light' ? (
                                                        <Sparkles className="w-10 h-10 drop-shadow-[0_0_12px_currentColor]" />
                                                    ) : token.type === 'wall' ? (
                                                        <PenTool className="w-10 h-10 drop-shadow-[0_0_12px_currentColor]" />
                                                    ) : token.type === 'geometry' ? (
                                                        token.shapeType === 'circle' ? <Circle className="w-10 h-10 drop-shadow-[0_0_12px_currentColor]" /> : <Square className="w-10 h-10 drop-shadow-[0_0_12px_currentColor]" />
                                                    ) : token.type === 'card' ? (
                                                        <CardImageWithLoader
                                                            src={getCardDisplayImage(token)}
                                                            label={token.name || 'Carta'}
                                                            className="w-full h-full"
                                                            imageClassName="w-full h-full object-contain p-1"
                                                        />
                                                    ) : token.type === 'boardMarker' ? (
                                                        <BoardMarkerVisual marker={{ ...token, width: 80, height: 80 }} />
                                                    ) : token.type === 'boardDie' ? (
                                                        <BoardDieVisual die={{ ...token, width: 80, height: 80 }} enableRollPhysics={false} />
                                                    ) : (
                                                        <TokenImageWithLoader
                                                            src={token.portrait || token.img}
                                                            label={token.name || 'Token'}
                                                            className="w-full h-full"
                                                            imageClassName="w-full h-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <h4 className="text-[#f0e6d2] font-fantasy text-2xl tracking-widest uppercase drop-shadow-lg leading-none">
                                                        {token.name}
                                                    </h4>
                                                    <div className="flex items-center justify-center gap-3">
                                                        <div className="h-[1px] w-4 bg-gradient-to-r from-transparent to-[#c8aa6e]/40" />
                                                        <span className="text-[10px] text-[#c8aa6e]/60 uppercase font-black tracking-[0.25em]">
                                                            {token.layer} Layer
                                                        </span>
                                                        <div className="h-[1px] w-4 bg-gradient-to-l from-transparent to-[#c8aa6e]/40" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Properties Form */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                                                    <Settings size={12} /> Propiedades
                                                </h4>

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

                                                {isBoardMode && isCardContainerItem(token) && !isPlayerView && (
                                                    <div className={`rounded-lg border p-3 transition-colors ${isContainerCardsHiddenForPlayers(token) ? 'border-[#c8aa6e]/45 bg-[#c8aa6e]/10' : 'border-slate-800 bg-[#0b1120]'}`}>
                                                        <div className="flex items-start gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateItem(token.id, { hideContainedCardsForPlayers: !isContainerCardsHiddenForPlayers(token) })}
                                                                aria-pressed={isContainerCardsHiddenForPlayers(token)}
                                                                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors ${isContainerCardsHiddenForPlayers(token) ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f8e7b9]' : 'border-slate-700 bg-[#111827] text-slate-400 hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]'}`}
                                                                title={isContainerCardsHiddenForPlayers(token) ? 'Cartas ocultas para jugadores' : 'Cartas visibles para jugadores'}
                                                            >
                                                                {isContainerCardsHiddenForPlayers(token) ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                            <div className="min-w-0 flex-1 space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <Lock size={12} className={isContainerCardsHiddenForPlayers(token) ? 'text-[#c8aa6e]' : 'text-slate-500'} />
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0e6d2]">
                                                                        Ocultar cartas internas
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] leading-relaxed text-slate-500">
                                                                    Los jugadores verán el tablero, pero no las cartas que contiene ni su posición. Al sacarlas del tablero o eliminarlo, volverán a mostrarse.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {token.type === 'boardMarker' && (
                                                    <div className="bg-[#0b1120] border border-[#c8aa6e]/20 rounded-lg p-3 space-y-4">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Valor</label>
                                                                <div className="grid grid-cols-[44px_1fr_44px] overflow-hidden rounded border border-slate-800 bg-[#111827] focus-within:border-[#c8aa6e] md:grid-cols-[36px_1fr_36px]">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateItem(token.id, { markerValue: Math.max(0, (Number.isFinite(Number(token.markerValue)) ? Number(token.markerValue) : 1) - 1) })}
                                                                        className="flex min-h-11 items-center justify-center border-r border-slate-800 text-xl font-black text-[#c8aa6e] transition-colors hover:bg-[#c8aa6e] hover:text-[#111827] active:bg-[#c8aa6e]/80 md:min-h-10 md:text-lg"
                                                                        aria-label="Bajar valor"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        inputMode="numeric"
                                                                        value={Number.isFinite(Number(token.markerValue)) ? Number(token.markerValue) : 1}
                                                                        onChange={(e) => updateItem(token.id, { markerValue: Math.max(0, Number(e.target.value) || 0) })}
                                                                        className="w-full border-0 bg-transparent px-2 text-center text-base font-bold text-slate-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateItem(token.id, { markerValue: (Number.isFinite(Number(token.markerValue)) ? Number(token.markerValue) : 1) + 1 })}
                                                                        className="flex min-h-11 items-center justify-center border-l border-slate-800 text-xl font-black text-[#c8aa6e] transition-colors hover:bg-[#c8aa6e] hover:text-[#111827] active:bg-[#c8aa6e]/80 md:min-h-10 md:text-lg"
                                                                        aria-label="Subir valor"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Color</label>
                                                                <input
                                                                    type="color"
                                                                    value={token.markerColor || '#c8aa6e'}
                                                                    onChange={(e) => updateItem(token.id, { markerColor: e.target.value })}
                                                                    className="h-10 w-full cursor-pointer rounded border border-slate-800 bg-[#111827] p-1"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-5 gap-2">
                                                            {PRESET_COLORS.map(color => (
                                                                <button
                                                                    key={color}
                                                                    type="button"
                                                                    onClick={() => updateItem(token.id, { markerColor: color })}
                                                                    className={`h-8 rounded border transition-transform hover:scale-105 ${token.markerColor === color ? 'border-white' : 'border-slate-800'}`}
                                                                    style={{ backgroundColor: color }}
                                                                    title={color}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {token.type === 'boardDie' && (
                                                    <div className="bg-[#0b1120] border border-[#c8aa6e]/20 rounded-lg p-3 space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tipo de dado</label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {BOARD_DIE_SIDES.map((sides) => (
                                                                    <button
                                                                        key={sides}
                                                                        type="button"
                                                                        onClick={() => updateItem(token.id, {
                                                                            dieSides: sides,
                                                                            dieValue: Math.min(Math.max(sides === 10 ? 0 : 1, Number.isFinite(Number(token.dieValue)) ? Number(token.dieValue) : 1), sides === 10 ? 9 : sides),
                                                                            name: `Dado D${sides}`,
                                                                            dieRotation3d: { x: 0, y: 0.25, z: 0 },
                                                                        })}
                                                                        className={`rounded border px-2 py-2 text-xs font-black uppercase tracking-widest transition-colors ${Number(token.dieSides) === sides ? 'border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f8e7b9]' : 'border-slate-800 bg-[#111827] text-slate-500 hover:border-[#c8aa6e]/45 hover:text-slate-300'}`}
                                                                    >
                                                                        D{sides}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Resultado</label>
                                                                <input
                                                                    type="number"
                                                                    min={Number(token.dieSides) === 10 ? 0 : 1}
                                                                    max={Number(token.dieSides) === 10 ? 9 : Number(token.dieSides) || 20}
                                                                    value={Math.min(Math.max(Number(token.dieSides) === 10 ? 0 : 1, Number.isFinite(Number(token.dieValue)) ? Number(token.dieValue) : 1), Number(token.dieSides) === 10 ? 9 : Number(token.dieSides) || 20)}
                                                                    onChange={(e) => {
                                                                        const sides = Number(token.dieSides) || 20;
                                                                        const minValue = sides === 10 ? 0 : 1;
                                                                        const maxValue = sides === 10 ? 9 : sides;
                                                                        const value = Math.min(Math.max(minValue, Number(e.target.value) || minValue), maxValue);
                                                                        updateItem(token.id, { dieValue: value });
                                                                    }}
                                                                    className="w-full bg-[#111827] border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-[#c8aa6e] outline-none transition-colors"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Color</label>
                                                                <input
                                                                    type="color"
                                                                    value={token.dieColor || '#c8aa6e'}
                                                                    onChange={(e) => updateItem(token.id, { dieColor: e.target.value })}
                                                                    className="h-10 w-full cursor-pointer rounded border border-slate-800 bg-[#111827] p-1"
                                                                />
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => rollBoardDie(token)}
                                                            className="w-full rounded border border-[#c8aa6e]/50 bg-[#c8aa6e]/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-[#f8e7b9] transition-colors hover:bg-[#c8aa6e]/20"
                                                        >
                                                            Tirar dado
                                                        </button>

                                                        <div className="grid grid-cols-5 gap-2">
                                                            {PRESET_COLORS.map(color => (
                                                                <button
                                                                    key={color}
                                                                    type="button"
                                                                    onClick={() => updateItem(token.id, { dieColor: color })}
                                                                    className={`h-8 rounded border transition-transform hover:scale-105 ${token.dieColor === color ? 'border-white' : 'border-slate-800'}`}
                                                                    style={{ backgroundColor: color }}
                                                                    title={color}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {token.type === 'card' && (
                                                    <div className="bg-[#0b1120] border border-[#c8aa6e]/20 rounded-lg p-3 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const now = Date.now();
                                                                    const lastFlip = lastFlipTimesRef.current[token.id] || 0;
                                                                    if (now - lastFlip < 350) return;
                                                                    lastFlipTimesRef.current[token.id] = now;
                                                                    updateItem(token.id, { faceDown: !token.faceDown }, true);
                                                                }}
                                                                className="shrink-0 px-3 py-2 rounded border border-[#c8aa6e]/40 bg-[#c8aa6e]/10 text-[#f8e7b9] hover:bg-[#c8aa6e]/20 text-[10px] font-bold uppercase tracking-widest transition-colors"
                                                            >
                                                                Voltear
                                                            </button>
                                                            <label className="min-w-0 flex-1 h-9 px-3 rounded border border-slate-800 bg-[#111827] hover:border-[#c8aa6e]/40 text-slate-400 hover:text-[#f8e7b9] transition-colors cursor-pointer flex items-center justify-between gap-2">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleBoardCardBackUpload(token.id, file);
                                                                        e.target.value = '';
                                                                    }}
                                                                />
                                                                <span className="truncate text-[10px] font-bold uppercase tracking-widest">
                                                                    {token.backImage ? 'Cambiar reverso' : 'Añadir reverso'}
                                                                </span>
                                                                <Upload size={12} className="shrink-0 text-[#c8aa6e]" />
                                                            </label>
                                                            {token.backImage && (
                                                                <div className="w-7 h-9 rounded border border-[#c8aa6e]/30 overflow-hidden bg-black/40 shrink-0">
                                                                    <CardImageWithLoader
                                                                        src={token.backImage}
                                                                        label={`${token.name || 'Carta'} reverso`}
                                                                        className="w-full h-full"
                                                                        imageClassName="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        {tokenStackItems.length > 0 && (
                                                            <div className="border-t border-[#c8aa6e]/10 pt-3 space-y-2">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-2 text-[#f8e7b9]">
                                                                        <Package size={12} className="text-[#c8aa6e]" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                                                            Pila x{tokenStackItems.length + 1}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[8px] uppercase tracking-[0.18em] text-slate-500">
                                                                        Pulsa una carta para sacarla
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    {tokenStackItems.map((stackCard) => {
                                                                        const stackImage = getCardDisplayImage(stackCard);
                                                                        return (
                                                                            <button
                                                                                key={stackCard.id}
                                                                                onClick={() => unstackSpecificCard(token.id, stackCard.id)}
                                                                                className="group min-w-0 rounded border border-slate-800 bg-[#111827] p-1.5 hover:border-[#c8aa6e]/60 hover:bg-[#c8aa6e]/10 transition-colors"
                                                                                title={`Sacar ${stackCard.name || 'carta'}`}
                                                                            >
                                                                                <div className="mx-auto h-16 w-11 overflow-hidden rounded-sm border border-[#c8aa6e]/35 bg-slate-600 shadow-sm transition-transform group-hover:-translate-y-0.5">
                                                                                    {stackImage ? (
                                                                                        <CardImageWithLoader
                                                                                            src={stackImage}
                                                                                            label={stackCard.name || 'Carta en pila'}
                                                                                            className="h-full w-full"
                                                                                            imageClassName="h-full w-full object-cover"
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="h-full w-full bg-slate-500" />
                                                                                    )}
                                                                                </div>
                                                                                <span className="mt-1 block truncate text-[8px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-[#f8e7b9]">
                                                                                    {stackCard.name || 'Carta'}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2 flex flex-col justify-end">
                                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 h-4 mb-1">
                                                            <RotateCw size={10} className="text-[#c8aa6e]" /> Rotación (°)
                                                        </label>
                                                        <div className="flex items-center bg-[#111827] border border-slate-800 rounded h-10">
                                                            <input
                                                                type="number"
                                                                value={Math.round(token.rotation || 0)}
                                                                onChange={(e) => updateItem(token.id, { rotation: Number(e.target.value) }, true)}
                                                                className="w-full h-full py-0 min-h-0 bg-transparent border-none px-3 text-sm text-slate-200 outline-none"
                                                                style={{ minHeight: 'unset' }}
                                                            />
                                                            <span className="pr-3 text-slate-600 text-xs">°</span>
                                                        </div>
                                                    </div>
                                                    {/* Placeholder for Size/Scale - podría ser complejo por ahora simplemente mostramos */}
                                                    <div className="space-y-2 flex flex-col justify-end">
                                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 h-4 mb-1">
                                                            <Maximize size={10} className="text-[#c8aa6e]" /> Tamaño
                                                        </label>
                                                        <div className="flex items-center justify-between bg-[#111827] border border-slate-800 rounded overflow-hidden h-10">
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
                                                {isCombatTokenItem(token) && (
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
                                                {isCombatTokenItem(token) && (
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

                                                        {isMaster && (
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                                    Team ID
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={token.teamId || ''}
                                                                    onChange={(e) => updateItem(token.id, { teamId: e.target.value.trim() || null })}
                                                                    placeholder="Opcional para alianzas y excepciones"
                                                                    className="w-full bg-[#111827] border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-[#c8aa6e] outline-none transition-colors"
                                                                />
                                                                <p className="text-[8px] text-slate-600 italic">
                                                                    Si defines Team ID, prevalece sobre controlledBy. Sin Team ID, compartir jugador en controlledBy cuenta como alianza.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Vínculo de Entidad / Vinculación */}
                                                        {(isMaster || (token.controlledBy?.includes(playerName) && playerName)) && (
                                                            <div className="space-y-3 p-3 bg-slate-800/20 rounded border border-slate-800/40">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Link size={10} className="text-[#c8aa6e]/70" />
                                                                    <span className="text-[9px] text-[#c8aa6e] font-bold uppercase tracking-widest">Vinculación de Ficha</span>
                                                                </div>
                                                                {token.linkedCharacterId ? (
                                                                    <div className="flex items-center justify-between gap-3 bg-[#0b1120] p-2.5 rounded border border-[#c8aa6e]/30 shadow-inner">
                                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                                            <TokenImageWithLoader
                                                                                src={availableCharacters?.find(c => c.id === token.linkedCharacterId)?.avatar || token.img}
                                                                                label={availableCharacters?.find(c => c.id === token.linkedCharacterId)?.name || token.name || 'Token vinculado'}
                                                                                className="w-7 h-7 rounded bg-slate-900 border border-slate-800 shrink-0"
                                                                                imageClassName="w-full h-full object-contain p-0.5"
                                                                            />
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="text-[11px] text-[#f0e6d2] truncate font-bold uppercase tracking-wider">
                                                                                    {availableCharacters?.find(c => c.id === token.linkedCharacterId)?.name || 'Archivo Vinculado'}
                                                                                </span>
                                                                                <span className="text-[8px] text-slate-500 font-bold uppercase">Sincronizado</span>
                                                                            </div>
                                                                        </div>
                                                                        {/* Solo permitir desvincular si eres el Master o el dueño de esa ficha específica */}
                                                                        {(isMaster || availableCharacters.some(c => c.id === token.linkedCharacterId)) && (
                                                                            <button
                                                                                onClick={() => unlinkCharacter(token.id)}
                                                                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500/10 hover:text-red-400 text-slate-600 transition-all"
                                                                                title="Desvincular Personaje"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    availableCharacters.length > 0 ? (
                                                                        <div className="relative group">
                                                                            <select
                                                                                onChange={(e) => {
                                                                                    const char = availableCharacters.find(c => c.id === e.target.value);
                                                                                    if (char) linkCharacter(token.id, char);
                                                                                }}
                                                                                className="w-full bg-[#0b1120] border border-slate-800 rounded pl-3 pr-10 py-2 text-[10px] text-slate-400 focus:border-[#c8aa6e] outline-none transition-all cursor-pointer hover:bg-slate-900 appearance-none font-bold uppercase tracking-wider"
                                                                                value=""
                                                                            >
                                                                                <option value="" disabled>Seleccionar personaje...</option>
                                                                                {availableCharacters.map(char => (
                                                                                    <option key={char.id} value={char.id} className="bg-[#0b1120] text-slate-200">
                                                                                        {(char.name || 'Sin nombre').toUpperCase()}
                                                                                        {isMaster && ` (${char._isTemplate ? 'NPC' : (char.owner || 'JUGADOR')})`}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none group-hover:text-[#c8aa6e] transition-colors" />
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-[8px] text-slate-600 italic text-center uppercase tracking-tighter">No tienes fichas compatibles para este token</p>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* VISIÓN Y SENTIDOS (Solo para tokens reales) */}
                                                {isCombatTokenItem(token) && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <Eye size={12} /> Visión y Niebla
                                                        </h4>

                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-4">
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
                                                                <div className="space-y-4 pt-2 border-t border-slate-800/50 mt-2">
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



                                                {/* RECURSOS Y ATRIBUTOS (Solo si NO es una luz ni un muro ni geometria) */}
                                                {isCombatTokenItem(token) && (
                                                    <div className="pt-4 border-t border-slate-800/50">
                                                        <TokenResources
                                                            token={token}
                                                            onUpdate={(updates) => updateItem(token.id, updates)}
                                                        />
                                                    </div>
                                                )}



                                                {/* CONFIGURACIÓN DE LUZ (Solo si ES una luz) */}
                                                {token.type === 'light' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <Sparkles size={12} /> Propiedades del Foco
                                                        </h4>

                                                        {/* Radio de Luz */}
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-4">
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
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 flex items-center justify-between">
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
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 flex items-center justify-between">
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
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-4">
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
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <PenTool size={12} /> Propiedades del Muro
                                                        </h4>

                                                        {/* Snap Toggle para Muro */}
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 flex items-center justify-between">
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
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-4">
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

                                                {/* CONFIGURACIÓN DE GEOMETRÍA (Solo si ES geometry) */}
                                                {token.type === 'geometry' && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <MapIcon size={12} /> Propiedades del Tapete
                                                        </h4>

                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-3">
                                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tipo visual</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {[
                                                                    { id: 'rect', label: 'Zona', color: '#22c55e' },
                                                                    { id: 'circle', label: 'Círculo', color: '#60a5fa' },
                                                                    { id: 'hazard', label: 'Peligro', color: '#ef4444' },
                                                                    { id: 'stairs', label: 'Escalera', color: '#c8aa6e' }
                                                                ].map(option => {
                                                                    const active = normalizeGeometryKind(token) === option.id;
                                                                    return (
                                                                        <button
                                                                            key={option.id}
                                                                            onClick={() => updateItem(token.id, {
                                                                                geometryKind: option.id,
                                                                                shapeType: option.id === 'circle' ? 'circle' : option.id,
                                                                                isCircular: option.id === 'circle',
                                                                                name: option.id === 'hazard' ? 'Terreno Peligroso' : option.id === 'stairs' ? 'Escalera' : option.id === 'circle' ? 'Zona Circular' : 'Zona Rectangular',
                                                                                backgroundColor: option.color,
                                                                                opacity: option.id === 'hazard' ? 0.1 : (token.opacity || 0.3)
                                                                            })}
                                                                            className={`px-2 py-2 rounded border text-[10px] font-bold uppercase tracking-wider transition-all ${active ? 'border-[#c8aa6e] text-[#f8e7b9] bg-[#c8aa6e]/15' : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}
                                                                        >
                                                                            {option.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Opacidad del bloque */}
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                <span className="text-slate-500">Transparencia</span>
                                                                <span className="text-[#c8aa6e] font-mono">{Math.round((token.opacity || 0.4) * 100)}%</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0.05" max="1" step="0.05"
                                                                value={token.opacity || 0.4}
                                                                onChange={(e) => updateItem(token.id, { opacity: Number(e.target.value) })}
                                                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#c8aa6e]"
                                                            />
                                                        </div>

                                                        {/* Snap Toggle para Tapete */}
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 flex items-center justify-between">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Snap a Rejilla</span>
                                                                <span className="text-[9px] text-slate-600">Ajustar bloque a las celdas al moverse</span>
                                                            </div>
                                                            <button
                                                                onClick={() => updateItem(token.id, { snapToGrid: token.snapToGrid === false ? true : false })}
                                                                className={`w-12 h-6 rounded-full transition-all relative ${token.snapToGrid !== false ? 'bg-[#c8aa6e]' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${token.snapToGrid !== false ? 'left-7' : 'left-1'}`} />
                                                            </button>
                                                        </div>

                                                        {/* Color de Fondo */}
                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                                <span className="text-slate-500">Tono del Área</span>
                                                                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: token.backgroundColor }}></div>
                                                            </div>
                                                            <div className="grid grid-cols-5 gap-2">
                                                                {['#22c55e', '#ef4444', '#3b82f6', '#eab308', '#a855f7', '#64748b', '#000000', '#ffffff', '#f97316', '#14b8a6'].map(c => (
                                                                    <button
                                                                        key={c}
                                                                        onClick={() => updateItem(token.id, { backgroundColor: c })}
                                                                        className={`w-full aspect-square rounded border transition-all ${token.backgroundColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/30'}`}
                                                                        style={{ backgroundColor: c }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Estados Alterados (Solo para tokens reales) */}
                                                {isCombatTokenItem(token) && (
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-3">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <Flame size={12} /> Estados Alterados
                                                        </h4>
                                                        <EstadoSelector
                                                            selected={normalizeTokenStatusIds(token.status || [])}
                                                            onToggle={(statusId) => {
                                                                const currentStatus = normalizeTokenStatusIds(token.status || []);
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
                                                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                                                        <h4 className="text-[10px] text-[#c8aa6e] font-bold uppercase tracking-widest flex items-center gap-2">
                                                            <Sparkles size={12} /> Aura de Estado
                                                        </h4>

                                                        <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-4">
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
                                                {(isCombatTokenItem(token)) && (() => {
                                                    const equippedItems = token.equippedItems || [];

                                                    // Category tabs for adding items - mirrors LoadoutView
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
                                                            isPlayerView={isPlayerView}
                                                            onAddItem={(item, type) => {
                                                                const newItems = [...equippedItems, { ...item, type }];
                                                                const updatedToken =
                                                                    token.linkedCharacterId
                                                                        ? { ...token, equippedItems: newItems }
                                                                        : syncArmorState(
                                                                            { ...token, equippedItems: newItems },
                                                                            { armaduras, mode: 'token' }
                                                                        );
                                                                updateItem(
                                                                    token.id,
                                                                    {
                                                                        equippedItems: updatedToken.equippedItems,
                                                                        stats: updatedToken.stats,
                                                                        armorSync: updatedToken.armorSync,
                                                                    },
                                                                    true
                                                                );
                                                            }}
                                                            onRemoveItem={(idx) => {
                                                                const newItems = [...equippedItems];
                                                                newItems.splice(idx, 1);
                                                                const updatedToken =
                                                                    token.linkedCharacterId
                                                                        ? { ...token, equippedItems: newItems }
                                                                        : syncArmorState(
                                                                            { ...token, equippedItems: newItems },
                                                                            { armaduras, mode: 'token' }
                                                                        );
                                                                updateItem(
                                                                    token.id,
                                                                    {
                                                                        equippedItems: updatedToken.equippedItems,
                                                                        stats: updatedToken.stats,
                                                                        armorSync: updatedToken.armorSync,
                                                                    },
                                                                    true
                                                                );
                                                            }}
                                                        />
                                                    );
                                                })()}

                                                {/* BOTÓN ELIMINAR TOKEN DEL CANVAS */}
                                                {!isPlayerView && (
                                                    <div className="pt-8 pb-4 border-t border-slate-800/50">
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`¿Eliminar "${token.name}" de este encuentro?`)) {
                                                                    deleteItem(token.id);
                                                                }
                                                            }}
                                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-300 group"
                                                        >
                                                            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Eliminar del Escenario</span>
                                                        </button>
                                                        <p className="text-[8px] text-slate-600 text-center mt-3 uppercase tracking-tighter">
                                                            Esta acción quitará el token del mapa y sincronizará con todos los jugadores.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()
);
