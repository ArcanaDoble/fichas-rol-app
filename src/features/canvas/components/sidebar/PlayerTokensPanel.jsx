import React from 'react';
import { Activity, Edit2, FolderOpen, Image, RotateCw, ShieldOff, Upload } from 'lucide-react';
import { isCombatTokenItem } from '../../combatRules';
import { TokenImageWithLoader } from '.././CanvasAssetImage';

export const PlayerTokensPanel = ({
    activeScenario,
    activeTab,
    addCardToBoard,
    addCardToHand,
    addDeckToBoard,
    boardDecks,
    cards,
    dragOverLibraryItemId,
    draggedLibraryItemId,
    draggedLibraryItemType,
    handleCardUpload,
    handleReorderLibraryItem,
    isBoardMode,
    isPlayerView,
    playerName,
    selectedTokenIds,
    setActiveTab,
    setDragOverLibraryItemId,
    setDraggedLibraryItemId,
    setDraggedLibraryItemType,
    setSelectedTokenIds,
    uploadingCard,
}) => (
    activeTab === 'TOKENS' && isPlayerView && (() => {
                                    const controlledTokens = activeScenario?.items?.filter(i =>
                                        isCombatTokenItem(i) && i.controlledBy?.includes(playerName)
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
                                                        <TokenImageWithLoader
                                                            src={token.portrait || token.img}
                                                            label={token.name || 'Token'}
                                                            className="w-10 h-10 bg-[#0b1120] rounded border border-slate-800 shrink-0"
                                                            imageClassName="w-full h-full object-contain p-1"
                                                        />
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

                                            {isBoardMode && (
                                                <div className="pt-6 mt-6 border-t border-[#c8aa6e]/20 space-y-4">
                                                    <div>
                                                        <h4 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                                                            <Image className="w-3 h-3" />
                                                            Biblioteca de Cartas
                                                        </h4>
                                                        <p className="text-[9px] text-slate-600 mt-1">Añade cartas a mesa o mano. La mano cuenta para la iniciativa del token que controles.</p>
                                                    </div>

                                                    {boardDecks.length > 0 && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#c8aa6e]/75">
                                                                <FolderOpen className="h-3 w-3" />
                                                                Barajas
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {boardDecks.map(deck => {
                                                                    const deckCards = (deck.cards || []).filter(card => card?.frontUrl);
                                                                    return (
                                                                        <button
                                                                            key={deck.id}
                                                                            type="button"
                                                                            onClick={() => addDeckToBoard(deck)}
                                                                            disabled={deckCards.length === 0}
                                                                            className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0b1120]/75 p-2 text-left transition-all hover:border-[#c8aa6e]/45 hover:bg-[#c8aa6e]/5 disabled:cursor-not-allowed disabled:opacity-45"
                                                                            title="Crear tablero con esta baraja"
                                                                        >
                                                                            <div className="relative h-12 w-12 flex-none">
                                                                                {deckCards.slice(0, 3).map((card, index) => (
                                                                                    <img
                                                                                        key={`${deck.id}-${card.id || index}`}
                                                                                        src={card.frontUrl}
                                                                                        alt=""
                                                                                        className="absolute h-11 w-8 rounded border border-black/60 object-cover shadow-lg"
                                                                                        style={{
                                                                                            left: `${index * 8}px`,
                                                                                            top: `${index * 2}px`,
                                                                                            transform: `rotate(${(index - 1) * 5}deg)`,
                                                                                            zIndex: index + 1,
                                                                                        }}
                                                                                    />
                                                                                ))}
                                                                                {deckCards.length === 0 && (
                                                                                    <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-slate-700 text-slate-600">
                                                                                        <FolderOpen className="h-5 w-5" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="truncate font-fantasy text-xs uppercase tracking-wider text-[#f0e6d2] group-hover:text-[#c8aa6e]">
                                                                                    {deck.name || 'Baraja'}
                                                                                </div>
                                                                                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                                                                                    {deckCards.length} cartas - crear tablero
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <label className={`
                                                        flex flex-col items-center justify-center w-full h-28
                                                        border-2 border-dashed border-slate-700/50 rounded-xl
                                                        cursor-pointer hover:border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/5
                                                        transition-all group relative overflow-hidden
                                                        ${uploadingCard ? 'pointer-events-none opacity-50' : ''}
                                                    `}>
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleCardUpload} disabled={uploadingCard} />
                                                        {uploadingCard ? (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <RotateCw className="w-6 h-6 text-[#c8aa6e] animate-spin" />
                                                                <span className="text-[10px] uppercase font-bold text-[#c8aa6e]">Subiendo carta...</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-7 h-7 text-slate-600 group-hover:text-[#c8aa6e] mb-2 transition-colors" />
                                                                <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300 tracking-widest">Subir Carta</span>
                                                            </>
                                                        )}
                                                    </label>

                                                    <div className="grid grid-cols-3 gap-3">
                                                        {cards.map(card => (
                                                            <div
                                                                key={card.id}
                                                                draggable={!isPlayerView}
                                                                onDragStart={(e) => {
                                                                    if (isPlayerView) return;
                                                                    setDraggedLibraryItemId(card.id);
                                                                    setDraggedLibraryItemType('card');
                                                                    e.dataTransfer.effectAllowed = 'move';
                                                                }}
                                                                onDragOver={(e) => {
                                                                    if (draggedLibraryItemType === 'card' && draggedLibraryItemId !== card.id) {
                                                                        e.preventDefault();
                                                                        setDragOverLibraryItemId(card.id);
                                                                    }
                                                                }}
                                                                onDragLeave={() => {
                                                                    if (dragOverLibraryItemId === card.id) {
                                                                        setDragOverLibraryItemId(null);
                                                                    }
                                                                }}
                                                                onDrop={async (e) => {
                                                                    e.preventDefault();
                                                                    if (draggedLibraryItemType === 'card' && draggedLibraryItemId && draggedLibraryItemId !== card.id) {
                                                                        await handleReorderLibraryItem('canvas_cards', cards, draggedLibraryItemId, card.id);
                                                                    }
                                                                    setDraggedLibraryItemId(null);
                                                                    setDraggedLibraryItemType(null);
                                                                    setDragOverLibraryItemId(null);
                                                                }}
                                                                onDragEnd={() => {
                                                                    setDraggedLibraryItemId(null);
                                                                    setDraggedLibraryItemType(null);
                                                                    setDragOverLibraryItemId(null);
                                                                }}
                                                                className={`aspect-[5/7] bg-[#0b1120] rounded-md border relative group overflow-hidden transition-all duration-200 cursor-grab active:cursor-grabbing ${
                                                                    draggedLibraryItemId === card.id ? 'opacity-35 border-dashed border-slate-700 scale-95' :
                                                                    dragOverLibraryItemId === card.id ? 'border-[#c8aa6e] ring-2 ring-[#c8aa6e]/30 scale-105 shadow-[0_0_15px_rgba(200,170,110,0.4)]' :
                                                                    'border-slate-800 hover:border-[#c8aa6e]/50'
                                                                }`}
                                                                title={isPlayerView ? "Carta" : "Arrastra para reordenar"}
                                                            >
                                                                <TokenImageWithLoader
                                                                    src={card.frontUrl}
                                                                    label={card.name || 'Carta'}
                                                                    className="w-full h-full"
                                                                    imageClassName="w-full h-full object-cover"
                                                                />
                                                                <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-1">
                                                                    <div className="text-[7px] text-[#f8e7b9] font-bold uppercase tracking-wider truncate text-center">{card.name || 'Carta'}</div>
                                                                </div>
                                                                <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); addCardToBoard(card); }}
                                                                        className="w-full px-2 py-1.5 bg-[#c8aa6e] text-[#0b1120] rounded text-[8px] font-black uppercase tracking-widest hover:bg-[#f0e6d2] transition-colors"
                                                                        title="Colocar en mesa"
                                                                    >
                                                                        Mesa
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); addCardToHand(card); }}
                                                                        className="w-full px-2 py-1.5 bg-[#111827]/90 border border-[#c8aa6e]/50 text-[#f8e7b9] rounded text-[8px] font-black uppercase tracking-widest hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 transition-colors"
                                                                        title="Añadir a la mano"
                                                                    >
                                                                        Mano
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {cards.length === 0 && !uploadingCard && (
                                                            <div className="col-span-3 py-8 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest border border-dashed border-slate-800 rounded-lg">
                                                                Sin cartas
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
);
