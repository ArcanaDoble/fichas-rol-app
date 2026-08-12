import React from 'react';
import { FiArrowLeft, FiMinus, FiMove, FiPlus } from 'react-icons/fi';
import { BsDice6 } from 'react-icons/bs';
import {
    AlertTriangle, ChevronDown, ChevronUp, Circle, Eye, EyeOff, FolderOpen,
    Footprints, LayoutGrid, Lightbulb, Map as MapIcon, Package, PenTool, Plus, ShieldCheck,
    Square, Swords, Trash2, X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CombatHUD from '../../../components/CombatHUD';
import CombatReactionModal from '../../../components/CombatReactionModal';
import { getCardDisplayImage } from '../../../utils/cardImages';
import {
    canCombatTokenActNow, canUseTouchAgainstAdjacentLockedTarget,
    getTokenDistanceInCells, getTokenDuelContextAgainstAttacker,
    isCombatTokenItem, isSmallCombatToken,
} from '../legacyCombatRules';
import { GRID_LINE_COLOR_PRESETS, PRESET_COLORS } from '../constants';
import { CardImageWithLoader } from './TacticalAssetImage';
import { CanvasThumbnail, SaveToast, SpeedTimeline } from './TacticalFeedback';
import { CanvasSidebar } from './TacticalSidebar';
import { CanvasViewport } from './TacticalViewport';

/** Stateless composition layer for the canvas workspace and its HUD overlays. */
export const TacticalWorkspaceShell = ({
    BOARD_DICE_ROLL_SIDES,
    BOARD_DIE_SIDES,
    BoardDieVisual,
    BoardMarkerVisual,
    EquipmentSectionComponent,
    TokenResourcesComponent,
    accesorios,
    activeBoardHandTokenId,
    activeCombatAnimations,
    activeCombatQueueEntry,
    activeLayer,
    activeScenario,
    activeTab,
    addAreaToCanvas,
    addBoardDieToBoard,
    addBoardMarkerToBoard,
    addCardContainerToBoard,
    addCardToBoard,
    addCardToHand,
    addDeckToBoard,
    addLightToCanvas,
    addTokenToCanvas,
    adjustBoardDiceCount,
    animatedBoardLightIds,
    applyBackgroundGridPreset,
    armaduras,
    armas,
    availableCharacters,
    backgroundGridPresets,
    bleed,
    boardDecks,
    boardDiceExplosive,
    boardDicePool,
    boardDiceRollLog,
    boardLights,
    canUseBoardMobileTacticalMove,
    canvasRenderItemGroups,
    cards,
    clearBackgroundImage,
    clearBoardDicePool,
    closeBoardCardPreview,
    combatLog,
    combatQueueDisplay,
    commitGridDraft,
    consumeMobileMoveTemplateEvent,
    consumeSweepTemplateEvent,
    containerRef,
    createNewScenario,
    currentBackgroundGridPresetIndex,
    deleteCard,
    deleteItem,
    deleteScenario,
    deleteToken,
    dragOverLibraryItemId,
    draggedLibraryItemId,
    draggedLibraryItemType,
    draggedTokenId,
    draggingHandCard,
    enrichTokenWithCharacterData,
    existingPlayers,
    fileInputRef,
    finiteGridHeight,
    finiteGridWidth,
    finiteMapHeight,
    finiteMapWidth,
    focusedTargetId,
    getBoardMobileTacticalMoveOptions,
    getHandCardsForToken,
    globalActiveId,
    glossary,
    gridConfig,
    gridInputDrafts,
    habilidades,
    handDragGhostRef,
    handleBoardCardBackUpload,
    handleBoardMobileTacticalMoveCell,
    handleCancelAction,
    handleCancelMobileTacticalMove,
    handleCanvasBackgroundMouseDown,
    handleCardUpload,
    handleCombatAction,
    handleConfigChange,
    handleEndTurn,
    handleGridDraftChange,
    handleGridDraftKeyDown,
    handleHandCardDragStart,
    handleImageUpload,
    handleMobileTacticalMoveCell,
    handleMouseMove,
    handleMouseUp,
    handleReaction,
    handleReorderLibraryItem,
    handleSelectCombatQueueIndex,
    handleSweepTemplateCancel,
    handleSweepTemplateClick,
    handleTokenUpload,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    highlightText,
    isBoardHandHoverSuppressed,
    isBoardMode,
    isDrawingWall,
    isMaster,
    isPlayerView,
    isRollingBoardDice,
    isSaving,
    isUsablePendingTurnState,
    itemToDelete,
    lastFlipTimesRef,
    lastMasterHudTokenIdRef,
    lastSelectionTimeRef,
    linkCharacter,
    loadScenario,
    mapBounds,
    mapLayerBounds,
    mapLayerStyle,
    mapLayerViewBox,
    mapX,
    mapY,
    maskVersion,
    mobileMoveHoverCellKey,
    mobileMoveTouchStartRef,
    mode,
    observerIds,
    offset,
    onBack,
    onOpenCharacterSheet,
    pendingTurnState,
    playHandCardToBoard,
    playerName,
    previewedBoardCard,
    rarityColorMap,
    registerLocalScenarioDraft,
    renderItemJSX,
    resetAllSpeed,
    resizingTokenId,
    rollBoardDicePool,
    rollBoardDie,
    rotatingTokenId,
    saveCurrentScenario,
    scenarios,
    sectionTitle,
    selectedTokenIds,
    selectionBoxOverlayRect,
    setActiveLayer,
    setActiveScenario,
    setActiveTab,
    setDragOverLibraryItemId,
    setDraggedLibraryItemId,
    setDraggedLibraryItemType,
    setGlobalActiveScenario,
    setIsDrawingWall,
    setItemToDelete,
    setMobileMoveHoverCellKey,
    setSelectedTokenIds,
    setShowMasterCombatHUD,
    setShowSettings,
    setSweepHoverSide,
    setViewMode,
    setZoom,
    shouldUseMobileTacticalMove,
    showMasterCombatHUD,
    showSettings,
    showToast,
    sweepHoverSide,
    targetingState,
    timelineTokens,
    toastMessage,
    toastSubMessage,
    toastType,
    toggleBoardDiceExplosive,
    toggleBoardDiceRollDie,
    toggleHandCardFace,
    tokenOriginalPos,
    tokens,
    triggerToast,
    unlinkCharacter,
    unstackSpecificCard,
    updateItem,
    uploadingCard,
    uploadingToken,
    viewMode,
    wallDrawingCurrent,
    wallDrawingStart,
    zoom,
}) => (
<div className={`h-screen w-screen overflow-hidden bg-[#09090b] relative font-['Lato'] select-none ${targetingState ? 'cursor-crosshair' : ''}`}>
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
                                        <p className="text-slate-500 uppercase text-xs tracking-[0.3em] font-bold mt-2"><b>Gestión de escenarios para {sectionTitle}</b></p>
                                    </div>
                                    <button onClick={createNewScenario} className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#0b1120] font-fantasy font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(200,170,110,0.3)] hover:scale-105 transition-all">
                                        <Plus className="w-6 h-6" /> Nuevo Encuentro
                                    </button>
                                </header>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                                    {scenarios.map(s => (
                                        <motion.div
                                            layoutId={`scenario-card-${s.id}`}
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
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                console.log("Transmit button clicked for scenario:", s.id);
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
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center opacity-30 width-full">
                            <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.15em] md:tracking-[0.3em] text-[#c8aa6e] whitespace-nowrap">
                                <span className="h-px w-4 md:w-8 bg-gradient-to-r from-transparent to-[#c8aa6e]"></span>
                                <span>{sectionTitle}</span>
                                <span className="h-px w-4 md:w-8 bg-gradient-to-l from-transparent to-[#c8aa6e]"></span>
                            </div>
                        </div>

                        {/* --- SPEED TIMELINE --- */}
                        <SpeedTimeline
                            tokens={timelineTokens}
                            selectedId={selectedTokenIds[0]}
                            onSelect={(id) => setSelectedTokenIds([id])}
                            isPlayerView={isPlayerView}
                            onReset={resetAllSpeed}
                            mode={isBoardMode ? 'initiative' : 'speed'}
                        />

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
                        <CanvasSidebar
                    BOARD_DICE_ROLL_SIDES={BOARD_DICE_ROLL_SIDES}
                    BOARD_DIE_SIDES={BOARD_DIE_SIDES}
                    BoardDieVisual={BoardDieVisual}
                    BoardMarkerVisual={BoardMarkerVisual}
                    EquipmentSectionComponent={EquipmentSectionComponent}
                    TokenResourcesComponent={TokenResourcesComponent}
                    GRID_LINE_COLOR_PRESETS={GRID_LINE_COLOR_PRESETS}
                    PRESET_COLORS={PRESET_COLORS}
                    accesorios={accesorios}
                    activeScenario={activeScenario}
                    activeTab={activeTab}
                    addCardToBoard={addCardToBoard}
                    addCardToHand={addCardToHand}
                    addDeckToBoard={addDeckToBoard}
                    addTokenToCanvas={addTokenToCanvas}
                    adjustBoardDiceCount={adjustBoardDiceCount}
                    applyBackgroundGridPreset={applyBackgroundGridPreset}
                    armaduras={armaduras}
                    armas={armas}
                    availableCharacters={availableCharacters}
                    backgroundGridPresets={backgroundGridPresets}
                    boardDecks={boardDecks}
                    boardDiceExplosive={boardDiceExplosive}
                    boardDicePool={boardDicePool}
                    boardDiceRollLog={boardDiceRollLog}
                    cards={cards}
                    clearBackgroundImage={clearBackgroundImage}
                    clearBoardDicePool={clearBoardDicePool}
                    combatLog={combatLog}
                    commitGridDraft={commitGridDraft}
                    currentBackgroundGridPresetIndex={currentBackgroundGridPresetIndex}
                    deleteCard={deleteCard}
                    deleteItem={deleteItem}
                    deleteToken={deleteToken}
                    dragOverLibraryItemId={dragOverLibraryItemId}
                    draggedLibraryItemId={draggedLibraryItemId}
                    draggedLibraryItemType={draggedLibraryItemType}
                    existingPlayers={existingPlayers}
                    fileInputRef={fileInputRef}
                    finiteGridHeight={finiteGridHeight}
                    finiteGridWidth={finiteGridWidth}
                    globalActiveId={globalActiveId}
                    glossary={glossary}
                    gridConfig={gridConfig}
                    gridInputDrafts={gridInputDrafts}
                    habilidades={habilidades}
                    handleBoardCardBackUpload={handleBoardCardBackUpload}
                    handleCardUpload={handleCardUpload}
                    handleConfigChange={handleConfigChange}
                    handleGridDraftChange={handleGridDraftChange}
                    handleGridDraftKeyDown={handleGridDraftKeyDown}
                    handleImageUpload={handleImageUpload}
                    handleReorderLibraryItem={handleReorderLibraryItem}
                    handleTokenUpload={handleTokenUpload}
                    highlightText={highlightText}
                    isBoardMode={isBoardMode}
                    isMaster={isMaster}
                    isPlayerView={isPlayerView}
                    isRollingBoardDice={isRollingBoardDice}
                    isSaving={isSaving}
                    lastFlipTimesRef={lastFlipTimesRef}
                    linkCharacter={linkCharacter}
                    playerName={playerName}
                    rarityColorMap={rarityColorMap}
                    registerLocalScenarioDraft={registerLocalScenarioDraft}
                    resetAllSpeed={resetAllSpeed}
                    rollBoardDicePool={rollBoardDicePool}
                    rollBoardDie={rollBoardDie}
                    saveCurrentScenario={saveCurrentScenario}
                    selectedTokenIds={selectedTokenIds}
                    setActiveScenario={setActiveScenario}
                    setActiveTab={setActiveTab}
                    setDragOverLibraryItemId={setDragOverLibraryItemId}
                    setDraggedLibraryItemId={setDraggedLibraryItemId}
                    setDraggedLibraryItemType={setDraggedLibraryItemType}
                    setGlobalActiveScenario={setGlobalActiveScenario}
                    setSelectedTokenIds={setSelectedTokenIds}
                    setShowSettings={setShowSettings}
                    showSettings={showSettings}
                    toggleBoardDiceExplosive={toggleBoardDiceExplosive}
                    toggleBoardDiceRollDie={toggleBoardDiceRollDie}
                    tokens={tokens}
                    unlinkCharacter={unlinkCharacter}
                    unstackSpecificCard={unstackSpecificCard}
                    updateItem={updateItem}
                    uploadingCard={uploadingCard}
                    uploadingToken={uploadingToken}
                />

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

                            {/* Herramientas de Edición (Solo visibles en capa MAP y para Master) */}
                            {!isPlayerView && (
                                <div className={`transition-all duration-300 transform flex flex-col gap-2 md:gap-3 ${activeLayer === 'MAP' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 h-0 overflow-hidden'}`}>
                                    {/* Botón para añadir Área Rectangular */}
                                    <button
                                        onClick={() => addAreaToCanvas('rect')}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] rounded-lg shadow-2xl flex items-center justify-center hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e] transition-all group active:scale-95"
                                        title="Añadir Zona Rectangular"
                                    >
                                        <Square className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
                                    </button>

                                    {/* Botón para añadir Área Circular */}
                                    <button
                                        onClick={() => addAreaToCanvas('circle')}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] rounded-lg shadow-2xl flex items-center justify-center hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e] transition-all group active:scale-95"
                                        title="Añadir Zona Circular"
                                    >
                                        <Circle className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
                                    </button>

                                    <button
                                        onClick={() => addAreaToCanvas('hazard')}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] rounded-lg shadow-2xl flex items-center justify-center hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e] transition-all group active:scale-95"
                                        title="Añadir Terreno Peligroso"
                                    >
                                        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
                                    </button>

                                    <button
                                        onClick={() => addAreaToCanvas('stairs')}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] rounded-lg shadow-2xl flex items-center justify-center hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e] transition-all group active:scale-95"
                                        title="Añadir Escalera o Desnivel"
                                    >
                                        <Footprints className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
                                    </button>
                                </div>
                            )}

                            {isBoardMode && (
                                <div className={`transition-all duration-300 transform flex flex-col gap-2 md:gap-3 ${activeLayer === 'TABLETOP' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 h-0 overflow-hidden'}`}>
                                    <button
                                        onClick={() => addBoardDieToBoard()}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] rounded-lg shadow-2xl flex items-center justify-center hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e] transition-all group active:scale-95"
                                        title="Añadir dado 3D"
                                    >
                                        <BsDice6 className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
                                    </button>
                                    <button
                                        onClick={() => addBoardMarkerToBoard()}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] rounded-lg shadow-2xl flex items-center justify-center hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e] transition-all group active:scale-95"
                                        title="Añadir ficha de recurso"
                                    >
                                        <Circle className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
                                    </button>
                                    <button
                                        onClick={() => addCardContainerToBoard()}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-[#1a1b26] border border-[#c8aa6e]/30 text-[#c8aa6e] rounded-lg shadow-2xl flex items-center justify-center hover:bg-[#c8aa6e]/10 hover:border-[#c8aa6e] transition-all group active:scale-95"
                                        title="Añadir contenedor de cartas"
                                    >
                                        <Package className="w-5 h-5 md:w-6 md:h-6 group-hover:drop-shadow-[0_0_8px_#c8aa6e]" />
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
                                    <button
                                        onClick={() => {
                                            setActiveLayer('MAP');
                                            setSelectedTokenIds([]);
                                            setIsDrawingWall(false);
                                        }}
                                        className={`w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center transition-all ${activeLayer === 'MAP' ? 'bg-[#c8aa6e] text-[#0b1120] shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                        title="Capa de Tapete / Áreas"
                                    >
                                        <MapIcon size={16} className="md:hidden" />
                                        <MapIcon size={20} className="hidden md:block" />
                                    </button>
                                </div>
                            )}

                            {/*  ZOOM: Versión Desktop  Botones Verticales Clásicos  */}
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

                        {/*  ZOOM RULER: Versión Móvil  Regla Vertical Derecha  */}
                        {
                            (() => {
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
                            })()
                        }

                        {/* --- Instrucciones Rápidas --- */}
                        <div className="absolute bottom-8 left-8 z-50 hidden pointer-events-none opacity-50 md:block">
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                <FiMove />
                                <span>Click Central + Arrastrar para Mover</span>
                            </div>
                        </div>

                        {/* --- VIEWPORT (Área visible) --- */}
                        <CanvasViewport
                    activeCombatAnimations={activeCombatAnimations}
                    activeScenario={activeScenario}
                    animatedBoardLightIds={animatedBoardLightIds}
                    bleed={bleed}
                    boardLights={boardLights}
                    canUseBoardMobileTacticalMove={canUseBoardMobileTacticalMove}
                    canvasRenderItemGroups={canvasRenderItemGroups}
                    consumeMobileMoveTemplateEvent={consumeMobileMoveTemplateEvent}
                    consumeSweepTemplateEvent={consumeSweepTemplateEvent}
                    containerRef={containerRef}
                    draggedTokenId={draggedTokenId}
                    finiteGridHeight={finiteGridHeight}
                    finiteGridWidth={finiteGridWidth}
                    finiteMapHeight={finiteMapHeight}
                    finiteMapWidth={finiteMapWidth}
                    focusedTargetId={focusedTargetId}
                    getBoardMobileTacticalMoveOptions={getBoardMobileTacticalMoveOptions}
                    gridConfig={gridConfig}
                    handleBoardMobileTacticalMoveCell={handleBoardMobileTacticalMoveCell}
                    handleCancelMobileTacticalMove={handleCancelMobileTacticalMove}
                    handleCanvasBackgroundMouseDown={handleCanvasBackgroundMouseDown}
                    handleMobileTacticalMoveCell={handleMobileTacticalMoveCell}
                    handleMouseMove={handleMouseMove}
                    handleMouseUp={handleMouseUp}
                    handleSweepTemplateCancel={handleSweepTemplateCancel}
                    handleSweepTemplateClick={handleSweepTemplateClick}
                    handleTouchEnd={handleTouchEnd}
                    handleTouchMove={handleTouchMove}
                    handleTouchStart={handleTouchStart}
                    isDrawingWall={isDrawingWall}
                    isPlayerView={isPlayerView}
                    isUsablePendingTurnState={isUsablePendingTurnState}
                    lastSelectionTimeRef={lastSelectionTimeRef}
                    mapBounds={mapBounds}
                    mapLayerBounds={mapLayerBounds}
                    mapLayerStyle={mapLayerStyle}
                    mapLayerViewBox={mapLayerViewBox}
                    mapX={mapX}
                    mapY={mapY}
                    maskVersion={maskVersion}
                    mobileMoveHoverCellKey={mobileMoveHoverCellKey}
                    mobileMoveTouchStartRef={mobileMoveTouchStartRef}
                    observerIds={observerIds}
                    offset={offset}
                    pendingTurnState={pendingTurnState}
                    playerName={playerName}
                    renderItemJSX={renderItemJSX}
                    resizingTokenId={resizingTokenId}
                    rotatingTokenId={rotatingTokenId}
                    selectedTokenIds={selectedTokenIds}
                    selectionBoxOverlayRect={selectionBoxOverlayRect}
                    setMobileMoveHoverCellKey={setMobileMoveHoverCellKey}
                    setSweepHoverSide={setSweepHoverSide}
                    shouldUseMobileTacticalMove={shouldUseMobileTacticalMove}
                    sweepHoverSide={sweepHoverSide}
                    targetingState={targetingState}
                    tokenOriginalPos={tokenOriginalPos}
                    wallDrawingCurrent={wallDrawingCurrent}
                    wallDrawingStart={wallDrawingStart}
                    zoom={zoom}
                />
                    </>
                )
            }




            {draggingHandCard && (
                <div
                    ref={handDragGhostRef}
                    data-board-hand-drag-ghost="true"
                    className="fixed left-0 top-0 z-[110] pointer-events-none rounded-md border border-[#c8aa6e]/50 bg-[#111827] shadow-[0_14px_28px_rgba(0,0,0,0.58)] will-change-transform"
                    style={{
                        width: 72,
                        height: 104,
                        '--hand-drag-x': `${draggingHandCard.initialX - 36}px`,
                        '--hand-drag-y': `${draggingHandCard.initialY - 52}px`,
                        transform: 'translate3d(var(--hand-drag-x), var(--hand-drag-y), 0) rotate(-2deg)',
                    }}
                >
                    <div className="h-full w-full overflow-hidden rounded-[5px]">
                        {getCardDisplayImage(draggingHandCard.card) ? (
                            <CardImageWithLoader
                                src={getCardDisplayImage(draggingHandCard.card)}
                                label={draggingHandCard.card.name || 'Carta'}
                                className="w-full h-full"
                                imageClassName="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-500" />
                        )}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {previewedBoardCard && (
                    <motion.div
                        key="board-card-preview"
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/72 backdrop-blur-sm px-4 py-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14 }}
                        onMouseDown={(event) => {
                            event.stopPropagation();
                            closeBoardCardPreview();
                        }}
                        onTouchStart={(event) => {
                            event.stopPropagation();
                            closeBoardCardPreview();
                        }}
                    >
                        <motion.div
                            className="relative max-h-[86vh] w-[min(82vw,420px)] aspect-[5/7] overflow-hidden rounded-lg border border-[#c8aa6e]/75 bg-[#111827] shadow-[0_22px_80px_rgba(0,0,0,0.85),0_0_42px_rgba(200,170,110,0.22)]"
                            initial={{ scale: 0.92, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.96, y: 6 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                            onMouseDown={(event) => event.stopPropagation()}
                            onTouchStart={(event) => event.stopPropagation()}
                        >
                            {previewedBoardCard.image ? (
                                <CardImageWithLoader
                                    src={previewedBoardCard.image}
                                    label={previewedBoardCard.name}
                                    className="w-full h-full"
                                    imageClassName="w-full h-full object-contain bg-[#050810]"
                                />
                            ) : (
                                <div className="h-full w-full bg-slate-500" />
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- COMBAT HUD (PLAYER VIEW) --- */}
            {isPlayerView && activeScenario && (() => {
                const myTokens = activeScenario.items?.filter(i =>
                    i.controlledBy?.includes(playerName) && isCombatTokenItem(i)
                ) || [];

                // En Tablero, la mano solo debe ocupar pantalla cuando hay token seleccionado.
                // En el canvas clásico mantenemos el fallback al primer token controlado.
                const selectedControlled = myTokens.find(t => selectedTokenIds.includes(t.id));
                const activeBoardHandToken = isBoardMode
                    ? myTokens.find(t => t.id === activeBoardHandTokenId)
                    : null;
                const rawHudToken = isBoardMode
                    ? (selectedControlled || activeBoardHandToken)
                    : (selectedControlled || myTokens[0]);

                if (rawHudToken) {
                    const hudToken = enrichTokenWithCharacterData(rawHudToken);
                    const canOpenSheet = !!(hudToken.linkedCharacterId || hudToken.linkedClassId);

                    const handlePortraitClick = (charName) => {
                        if (canOpenSheet && onOpenCharacterSheet) {
                            onOpenCharacterSheet(hudToken.linkedClassId ? {
                                name: hudToken.name || charName,
                                profileType: 'rogueliteClass',
                                classId: hudToken.linkedClassId,
                            } : charName);
                        } else {
                            // Feedback visual de advertencia
                            triggerToast(
                                "Token sin ficha vinculada",
                                "Esta entidad no tiene archivo de personaje",
                                'warning'
                            );
                        }
                    };

                    // Calculamos la distancia al objetivo fijado para validar el alcance de las armas
                    const targetDistance = (targetingState?.phase === 'weapon_selection' && focusedTargetId)
                        ? (() => {
                            const items = activeScenario?.items || [];
                            const attacker = items.find(i => i.id === targetingState.attackerId);
                            const target = items.find(i => i.id === focusedTargetId);
                            if (!attacker || !target) return null;
                            return getTokenDistanceInCells(attacker, target, gridConfig);
                        })()
                        : null;
                    const allowAdjacentTouchTargeting = (targetingState?.phase === 'weapon_selection' && focusedTargetId)
                        ? (() => {
                            const items = activeScenario?.items || [];
                            const attacker = items.find(i => i.id === targetingState.attackerId);
                            const target = items.find(i => i.id === focusedTargetId);
                            if (!attacker || !target) return false;
                            return canUseTouchAgainstAdjacentLockedTarget(attacker, target, gridConfig);
                        })()
                        : false;

                    return (
                        <CombatHUD
                            token={hudToken}
                            onAction={(actionId, data) => handleCombatAction(hudToken.id, actionId, data)}
                            onEndTurn={() => handleEndTurn(hudToken.id)}
                            onPortraitClick={handlePortraitClick}
                            canOpenSheet={canOpenSheet}
                            pendingCost={pendingTurnState?.tokenId === hudToken.id ? (pendingTurnState.moveCost + pendingTurnState.actionCost) : 0}
                            pendingActions={pendingTurnState?.tokenId === hudToken.id ? (pendingTurnState.actions || []) : []}
                            onCancelAction={(idx) => handleCancelAction(hudToken.id, idx)}
                            forceWeaponMenu={targetingState?.phase === 'weapon_selection' && targetingState.attackerId === hudToken.id}
                            targetDistance={targetDistance}
                            allowAdjacentTouchTargeting={allowAdjacentTouchTargeting}
                            mode={mode}
                            handCards={getHandCardsForToken(rawHudToken, activeScenario.items || [])}
                            onPlayCard={playHandCardToBoard}
                            onFlipHandCard={toggleHandCardFace}
                            onHandCardDragStart={handleHandCardDragStart}
                            onCardPreviewStart={handleHandCardDragStart}
                            handDragPreview={draggingHandCard ? {
                                cardId: draggingHandCard.card.id,
                                overHand: draggingHandCard.overHand,
                                dropIndex: draggingHandCard.dropIndex,
                            } : null}
                            suppressHandHover={isBoardHandHoverSuppressed}
                            isActive={(() => {
                                if (!gridConfig.isCombatActive) return true;
                                return canCombatTokenActNow(hudToken, activeScenario.items || []);
                            })()}
                        />
                    );
                }
                return null;
            })()}

            {/* --- MASTER COMBAT HUD (Optional Toggle) --- */}
            {!isPlayerView && activeScenario && (() => {
                // Determinar el token a mostrar: seleccionado actual O último seleccionado (como jugadores)
                const allCombatTokens = (activeScenario.items || []).filter(i =>
                    isCombatTokenItem(i) && (i.isCircular || i.stats || i.name)
                );
                const selectedControlled = allCombatTokens.find(t => selectedTokenIds.includes(t.id));

                // Si hay token seleccionado, actualizamos la referencia
                if (selectedControlled) {
                    lastMasterHudTokenIdRef.current = selectedControlled.id;
                }

                // Prioridad: 1. Token seleccionado actual, 2. Último token seleccionado
                const activeBoardHandToken = isBoardMode
                    ? allCombatTokens.find(t => t.id === activeBoardHandTokenId)
                    : null;
                const rawHudToken = selectedControlled || allCombatTokens.find(t => t.id === lastMasterHudTokenIdRef.current) || null;

                if (isBoardMode) {
                    const boardHudToken = selectedControlled || activeBoardHandToken;
                    if (!boardHudToken) return null;
                    const hudToken = enrichTokenWithCharacterData(boardHudToken);
                    return (
                        <CombatHUD
                            token={hudToken}
                            mode={mode}
                            handCards={getHandCardsForToken(boardHudToken, activeScenario.items || [])}
                            onPlayCard={playHandCardToBoard}
                            onFlipHandCard={toggleHandCardFace}
                            onHandCardDragStart={handleHandCardDragStart}
                            onCardPreviewStart={handleHandCardDragStart}
                            handDragPreview={draggingHandCard ? {
                                cardId: draggingHandCard.card.id,
                                overHand: draggingHandCard.overHand,
                                dropIndex: draggingHandCard.dropIndex,
                            } : null}
                            suppressHandHover={isBoardHandHoverSuppressed}
                            isActive={true}
                        />
                    );
                }

                return (
                    <>
                        {/* Toggle Button  solo flecha, centro inferior */}
                        <AnimatePresence mode="wait">
                            {!showMasterCombatHUD && (
                                <motion.div
                                    key="master-hud-fab"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none"
                                >
                                    <button
                                        onClick={() => setShowMasterCombatHUD(true)}
                                        className="pointer-events-auto px-5 py-1.5 rounded-xl bg-[#0b1120]/90 backdrop-blur-md border border-[#c8aa6e]/30 hover:border-[#c8aa6e]/70 shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all duration-200 active:scale-95 group"
                                        title="Abrir HUD de Combate"
                                    >
                                        <ChevronUp className="w-4 h-4 text-[#c8aa6e]/60 group-hover:text-[#f0e6d2] transition-all duration-200 group-hover:-translate-y-0.5" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* CombatHUD del master */}
                        <AnimatePresence mode="wait">
                            {showMasterCombatHUD && (() => {
                                if (!rawHudToken) {
                                    // Sin token seleccionado ni recordado
                                    return (
                                        <motion.div
                                            key="master-hud-empty"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            transition={{ duration: 0.15 }}
                                            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none pb-6"
                                        >
                                            <div className="pointer-events-auto bg-[#0b1120]/95 backdrop-blur-xl border border-[#c8aa6e]/30 rounded-2xl px-8 py-5 shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-3 max-w-sm mx-auto relative">
                                                <button
                                                    onClick={() => setShowMasterCombatHUD(false)}
                                                    className="absolute top-2 right-2 text-slate-500 hover:text-[#c8aa6e] transition-colors p-1"
                                                >
                                                    <X size={16} />
                                                </button>
                                                <Swords className="w-8 h-8 text-[#c8aa6e]/50" />
                                                <span className="text-slate-400 text-xs text-center uppercase tracking-widest">
                                                    Selecciona un token en el mapa<br />para usar el HUD de combate
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                }

                                // Fusionamos datos de la ficha vinculada
                                const hudToken = enrichTokenWithCharacterData(rawHudToken);

                                const canOpenSheet = !!(hudToken.linkedCharacterId || hudToken.linkedClassId);
                                const handlePortraitClick = (charName) => {
                                    if (canOpenSheet && onOpenCharacterSheet) {
                                        onOpenCharacterSheet(hudToken.linkedClassId ? {
                                            name: hudToken.name || charName,
                                            profileType: 'rogueliteClass',
                                            classId: hudToken.linkedClassId,
                                        } : charName);
                                    } else {
                                        triggerToast(
                                            "Token sin ficha vinculada",
                                            "Esta entidad no tiene archivo de personaje",
                                            'warning'
                                        );
                                    }
                                };

                                // Calculamos la distancia al objetivo fijado para validar el alcance de las armas también para el máster
                                const targetDistance = (targetingState?.phase === 'weapon_selection' && focusedTargetId)
                                    ? (() => {
                                        const items = activeScenario?.items || [];
                                        const attacker = items.find(i => i.id === targetingState.attackerId);
                                        const target = items.find(i => i.id === focusedTargetId);
                                        if (!attacker || !target) return null;
                                        return getTokenDistanceInCells(attacker, target, gridConfig);
                                    })()
                                    : null;
                                const allowAdjacentTouchTargeting = (targetingState?.phase === 'weapon_selection' && focusedTargetId)
                                    ? (() => {
                                        const items = activeScenario?.items || [];
                                        const attacker = items.find(i => i.id === targetingState.attackerId);
                                        const target = items.find(i => i.id === focusedTargetId);
                                        if (!attacker || !target) return false;
                                        return canUseTouchAgainstAdjacentLockedTarget(attacker, target, gridConfig);
                                    })()
                                    : false;

                                return (
                                    <motion.div
                                        key="master-hud-active"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ duration: 0.15 }}
                                        className="relative"
                                    >
                                        {/* Botón de plegar HUD  solo flecha */}
                                        <div className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pb-0.5">
                                            <button
                                                onClick={() => setShowMasterCombatHUD(false)}
                                                className="pointer-events-auto px-4 py-0.5 rounded-t-lg bg-[#0b1120]/80 border-x border-t border-[#c8aa6e]/15 hover:border-[#c8aa6e]/40 transition-all duration-200 active:scale-95 group"
                                                title="Cerrar HUD de Combate"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5 text-[#c8aa6e]/40 group-hover:text-[#c8aa6e] transition-all duration-200 group-hover:translate-y-0.5" />
                                            </button>
                                        </div>
                                        <CombatHUD
                                            token={hudToken}
                                            onAction={(actionId, data) => handleCombatAction(hudToken.id, actionId, data)}
                                            onEndTurn={() => handleEndTurn(hudToken.id)}
                                            onPortraitClick={handlePortraitClick}
                                            canOpenSheet={canOpenSheet}
                                            pendingCost={pendingTurnState && pendingTurnState.tokenId === hudToken.id ? (pendingTurnState.moveCost + pendingTurnState.actionCost) : 0}
                                            pendingActions={pendingTurnState && pendingTurnState.tokenId === hudToken.id ? (pendingTurnState.actions || []) : []}
                                            onCancelAction={(index) => handleCancelAction(hudToken.id, index)}
                                            forceWeaponMenu={targetingState?.phase === 'weapon_selection' && targetingState.attackerId === hudToken.id}
                                            targetDistance={targetDistance}
                                            allowAdjacentTouchTargeting={allowAdjacentTouchTargeting}
                                            mode={mode}
                                            handCards={getHandCardsForToken(rawHudToken, activeScenario.items || [])}
                                            onPlayCard={playHandCardToBoard}
                                            onFlipHandCard={toggleHandCardFace}
                                            onHandCardDragStart={handleHandCardDragStart}
                                            onCardPreviewStart={handleHandCardDragStart}
                                            isActive={(() => {
                                                if (!gridConfig.isCombatActive) return true;
                                                return canCombatTokenActNow(hudToken, activeScenario.items || []);
                                            })()}
                                        />
                                    </motion.div>
                                );
                            })()}
                        </AnimatePresence>
                    </>
                );
            })()}

            <AnimatePresence>
                {activeCombatQueueEntry && (
                    (() => {
                        const scenarioItems = activeScenario?.items || [];
                        const liveTargetToken = scenarioItems.find((item) => item.id === activeCombatQueueEntry.event.targetId)
                            || activeCombatQueueEntry.targetToken;
                        const liveAttackerToken = scenarioItems.find((item) => item.id === activeCombatQueueEntry.event.attackerId);
                        const targetCombatContext = getTokenDuelContextAgainstAttacker(
                            liveTargetToken,
                            liveAttackerToken,
                            scenarioItems,
                            gridConfig
                        );
                        const targetCanEvadeInDuel = isSmallCombatToken(liveTargetToken, gridConfig);
                        return (
                            <CombatReactionModal
                                key={activeCombatQueueEntry.event.id}
                                event={activeCombatQueueEntry.event}
                                targetToken={enrichTokenWithCharacterData(liveTargetToken)}
                                targetCombatMode={targetCombatContext.mode}
                                targetCanEvadeInDuel={targetCanEvadeInDuel}
                                onReact={handleReaction}
                                onSelectQueueIndex={handleSelectCombatQueueIndex}
                                queueTotal={combatQueueDisplay.queueTotal}
                                queueResolved={combatQueueDisplay.queueResolved}
                                queueCurrent={combatQueueDisplay.queueCurrent}
                            />
                        );
                    })()
                )}
            </AnimatePresence>



            {/* Mensaje de Guardado (Toast) - Al final para estar siempre en el z-index superior */}
            <SaveToast
                show={showToast}
                type={toastType}
                message={toastMessage}
                subMessage={toastSubMessage}
            />
        </div >
);
