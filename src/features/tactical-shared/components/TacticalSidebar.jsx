import React from 'react';
import { Dices, Edit2, RotateCw, Settings, ShieldCheck, Sparkles, Swords } from 'lucide-react';

import { FiX } from 'react-icons/fi';










import { CombatLogPanel } from './sidebar/CombatLogPanel';
import { AccessPanel } from './sidebar/AccessPanel';
import { GridConfigPanel } from './sidebar/GridConfigPanel';
import { TokenLibraryPanel } from './sidebar/TokenLibraryPanel';
import { AppearancePanel } from './sidebar/AppearancePanel';
import { PlayerTokensPanel } from './sidebar/PlayerTokensPanel';
import { TokenInspectorPanel } from './sidebar/TokenInspectorPanel';

/** Tool library, inspector and configuration panel for the canvas workspace. */
// Legacy tactical sidebar shared by the current hosts. Canvas-specific UI should wrap or replace it.
export const CanvasSidebar = ({
    CombatPanelComponent,
    BOARD_DICE_ROLL_SIDES,
    BOARD_DIE_SIDES,
    BoardDieVisual,
    BoardMarkerVisual,
    EquipmentSectionComponent,
    TokenResourcesComponent,
    GRID_LINE_COLOR_PRESETS,
    PRESET_COLORS,
    accesorios,
    activeScenario,
    activeTab,
    addCardToBoard,
    addCardToHand,
    addDeckToBoard,
    addTokenToCanvas,
    adjustBoardDiceCount,
    applyBackgroundGridPreset,
    armaduras,
    armas,
    availableCharacters,
    backgroundGridPresets,
    boardDecks,
    boardDiceExplosive,
    boardDicePool,
    boardDiceRollLog,
    cards,
    clearBackgroundImage,
    clearBoardDicePool,
    combatLog,
    combatRuntime,
    commitGridDraft,
    currentBackgroundGridPresetIndex,
    deleteCard,
    deleteItem,
    deleteToken,
    dragOverLibraryItemId,
    draggedLibraryItemId,
    draggedLibraryItemType,
    existingPlayers,
    fileInputRef,
    finiteGridHeight,
    finiteGridWidth,
    globalActiveId,
    glossary,
    gridConfig,
    gridInputDrafts,
    habilidades,
    handleBoardCardBackUpload,
    handleCardUpload,
    handleConfigChange,
    handleGridDraftChange,
    handleGridDraftKeyDown,
    handleImageUpload,
    handleReorderLibraryItem,
    handleTokenUpload,
    highlightText,
    isBoardMode,
    isMaster,
    isPlayerView,
    isScenePickupItem,
    isRollingBoardDice,
    isSaving,
    lastFlipTimesRef,
    linkCharacter,
    playerName,
    rarityColorMap,
    registerLocalScenarioDraft,
    resetAllSpeed,
    rollBoardDicePool,
    rollBoardDie,
    saveCurrentScenario,
    selectedTokenIds,
    setActiveScenario,
    setActiveTab,
    setDragOverLibraryItemId,
    setDraggedLibraryItemId,
    setDraggedLibraryItemType,
    setGlobalActiveScenario,
    setSelectedTokenIds,
    setShowSettings,
    showSettings,
    toggleBoardDiceExplosive,
    toggleBoardDiceRollDie,
    tokens,
    unlinkCharacter,
    unstackSpecificCard,
    updateItem,
    uploadingCard,
    uploadingToken,
}) => (
<div data-tactical-sidebar="true" className={`
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
                                                onChange={(e) => {
                                                    const name = e.target.value;
                                                    registerLocalScenarioDraft({ name });
                                                    setActiveScenario(prev => ({ ...prev, name }));
                                                }}
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
                                {CombatPanelComponent && (
                                    <button
                                        onClick={() => setActiveTab('ROUND')}
                                        className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'ROUND' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <Dices className="w-4 h-4" />
                                        <span className="text-[8px] font-bold uppercase">Ronda</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab('COMBAT_LOG')}
                                    className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'COMBAT_LOG' ? 'bg-[#c8aa6e]/10 text-[#c8aa6e] border-b-2 border-[#c8aa6e]' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Swords className="w-4 h-4" />
                                    <span className="text-[8px] font-bold uppercase">Logs</span>
                                </button>
                            </div>

                            {/* Sidebar Content Wrapper */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
                                {CombatPanelComponent && (
                                    <CombatPanelComponent {...{
                                        activeScenario, activeTab, combatRuntime, isPlayerView, playerName,
                                    }} />
                                )}
                                {/* --- TAB: COMBAT LOG (EVERYONE) --- */}
                                <CombatLogPanel {...{
                        BOARD_DICE_ROLL_SIDES, activeTab, adjustBoardDiceCount, boardDiceExplosive, boardDicePool, boardDiceRollLog,
                        clearBoardDicePool, combatLog, isBoardMode, isRollingBoardDice, rollBoardDicePool, toggleBoardDiceExplosive,
                        toggleBoardDiceRollDie,
                    }} />
                                {/* --- TAB: ACCESO (MASTER ONLY) --- */}
                                <AccessPanel {...{
                        activeScenario, activeTab, existingPlayers, globalActiveId, isPlayerView, registerLocalScenarioDraft,
                        setActiveScenario, setGlobalActiveScenario,
                    }} />

                                {/* --- TAB: CONFIGURACIÓN (MASTER ONLY) --- */}
                                <GridConfigPanel {...{
                        activeTab, applyBackgroundGridPreset, backgroundGridPresets, clearBackgroundImage, commitGridDraft, currentBackgroundGridPresetIndex,
                        fileInputRef, finiteGridHeight, finiteGridWidth, gridConfig, gridInputDrafts, handleConfigChange,
                        handleGridDraftChange, handleGridDraftKeyDown, handleImageUpload, isPlayerView, resetAllSpeed,
                    }} />

                                {/* --- TAB: TOKENS (MASTER ONLY) --- */}
                                <TokenLibraryPanel {...{
                        activeTab, addCardToBoard, addCardToHand, addDeckToBoard, addTokenToCanvas, boardDecks,
                        cards, deleteCard, deleteToken, dragOverLibraryItemId, draggedLibraryItemId, draggedLibraryItemType,
                        handleCardUpload, handleReorderLibraryItem, handleTokenUpload, isBoardMode, isPlayerView, setDragOverLibraryItemId,
                        setDraggedLibraryItemId, setDraggedLibraryItemType, tokens, uploadingCard, uploadingToken,
                    }} />



                                <div className="w-full h-px bg-slate-800/50"></div>

                                {/* 5. Estilo Visual (MASTER ONLY) --- */}
                                <AppearancePanel {...{
                        GRID_LINE_COLOR_PRESETS, activeTab, gridConfig, handleConfigChange, isPlayerView,
                    }} />


                                {/* --- TAB: TOKENS (PLAYER ONLY: List of controlled tokens) --- */}
                                <PlayerTokensPanel {...{
                        activeScenario, activeTab, addCardToBoard, addCardToHand, addDeckToBoard, boardDecks,
                        cards, dragOverLibraryItemId, draggedLibraryItemId, draggedLibraryItemType, handleCardUpload, handleReorderLibraryItem,
                        isBoardMode, isPlayerView, playerName, selectedTokenIds, setActiveTab, setDragOverLibraryItemId,
                        setDraggedLibraryItemId, setDraggedLibraryItemType, setSelectedTokenIds, uploadingCard,
                    }} />

                                {/* --- TAB: INSPECTOR --- */}
                                <TokenInspectorPanel {...{
                        BOARD_DIE_SIDES, BoardDieVisual, BoardMarkerVisual, PRESET_COLORS, accesorios, activeScenario,
                        activeTab, armaduras, armas, availableCharacters, combatRuntime, deleteItem, existingPlayers,
                        glossary, gridConfig, habilidades, handleBoardCardBackUpload, highlightText, isBoardMode,
                        isMaster, isPlayerView, lastFlipTimesRef, linkCharacter, playerName, rarityColorMap,
                        rollBoardDie, selectedTokenIds, unlinkCharacter, unstackSpecificCard, updateItem,
                        EquipmentSectionComponent, TokenResourcesComponent, isScenePickupItem,
                    }} />
                            </div>


                            {activeScenario && (
                                <div className="p-6 bg-[#09090b] border-t border-[#c8aa6e]/20 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-20">
                                    <button
                                        onClick={saveCurrentScenario}
                                        disabled={isSaving}
                                        className={`group relative w-full py-5 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-[0.2em] rounded-sm shadow-xl hover:shadow-[0_0_25px_rgba(200,170,110,0.5)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {/* EFECTO DE BRILLO (Shine effect) - Solo si no está guardando */}
                                        {!isSaving && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>}

                                        <span className="relative z-10 flex items-center justify-center gap-3 whitespace-nowrap drop-shadow-md">
                                            {isSaving ? (
                                                <>
                                                    <RotateCw className="h-5 w-5 shrink-0 animate-spin" />
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
);
