import React from 'react';
import { Footprints, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import FloatingCombatEffects from '../../../components/FloatingCombatEffects';
import { getBoardLightFlickerStyle, getBoardLightVisualProfile } from '../../../utils/boardLighting';
import {
    getCombatRenderPlacement, getGridCellWorldRect, getMobileTacticalMoveOptions,
    getSweepAreaCells, getSweepTargetsForCells, getTokenGridBounds,
} from '../legacyCombatRules';
import { WORLD_SIZE, calculateShadowPoints } from '../spatial';

/** Visual surface for map layers, tactical overlays and scene items. */
export const CanvasViewport = ({
    activeCombatAnimations,
    activeScenario,
    animatedBoardLightIds,
    bleed,
    boardLights,
    canUseBoardMobileTacticalMove,
    canvasRenderItemGroups,
    consumeMobileMoveTemplateEvent,
    consumeSweepTemplateEvent,
    containerRef,
    draggedTokenId,
    finiteGridHeight,
    finiteGridWidth,
    finiteMapHeight,
    finiteMapWidth,
    focusedTargetId,
    getBoardMobileTacticalMoveOptions,
    gridConfig,
    handleBoardMobileTacticalMoveCell,
    handleCancelMobileTacticalMove,
    handleCanvasBackgroundMouseDown,
    handleMobileTacticalMoveCell,
    handleMouseMove,
    handleMouseUp,
    handleSweepTemplateCancel,
    handleSweepTemplateClick,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    isDrawingWall,
    isPlayerView,
    isUsablePendingTurnState,
    lastSelectionTimeRef,
    mapBounds,
    mapLayerBounds,
    mapLayerStyle,
    mapLayerViewBox,
    mapX,
    mapY,
    maskVersion,
    mobileMoveHoverCellKey,
    mobileMoveTouchStartRef,
    observerIds,
    offset,
    pendingTurnState,
    playerName,
    renderItemJSX,
    resizingTokenId,
    rotatingTokenId,
    selectedTokenIds,
    selectionBoxOverlayRect,
    setMobileMoveHoverCellKey,
    setSweepHoverSide,
    shouldUseMobileTacticalMove,
    sweepHoverSide,
    targetingState,
    tokenOriginalPos,
    wallDrawingCurrent,
    wallDrawingStart,
    zoom,
}) => (
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
                            {selectionBoxOverlayRect && (
                                <div
                                    className="absolute border border-[#c8aa6e] bg-[#c8aa6e]/10 pointer-events-none z-50"
                                    style={selectionBoxOverlayRect}
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
                                    style={!gridConfig.isInfinite ? { width: finiteMapWidth, height: finiteMapHeight } : {}}
                                >
                                    <svg
                                        width="100%"
                                        height="100%"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="overflow-visible pointer-events-none relative"
                                    >
                                        {/* IMAGEN DE FONDO (Solo si es finito y existe) */}
                                        {!gridConfig.isInfinite && gridConfig.backgroundImage && (
                                            <foreignObject width="100%" height="100%" x="0" y="0">
                                                <img
                                                    src={gridConfig.backgroundImage}
                                                    alt="Map Background"
                                                    className="w-full h-full"
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
                                        <rect width={finiteGridWidth} height={finiteGridHeight} fill="url(#grid-pattern)" />

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
                                    {canvasRenderItemGroups.lights.map(item => renderItemJSX(item))}
                                    {canvasRenderItemGroups.others.map(item => renderItemJSX(item))}
                                </div>

                                {!targetingState && (() => {
                                    const items = activeScenario?.items || [];
                                    const selectedTokenId = selectedTokenIds.length === 1 ? selectedTokenIds[0] : null;
                                    const token = selectedTokenId
                                        ? items.find(item => item.id === selectedTokenId)
                                        : null;
                                    const isCanvasMobileMove = shouldUseMobileTacticalMove(token, items);
                                    const isBoardMobileMove = canUseBoardMobileTacticalMove(token);
                                    if (!isCanvasMobileMove && !isBoardMobileMove) return null;

                                    const pendingMove = isUsablePendingTurnState(pendingTurnState) && pendingTurnState.tokenId === token.id
                                        ? pendingTurnState
                                        : null;
                                    const hasPendingMovement = isCanvasMobileMove && Math.max(0, Number(pendingMove?.moveCost) || 0) > 0;
                                    const moveOptions = isBoardMobileMove
                                        ? getBoardMobileTacticalMoveOptions(token, items)
                                        : getMobileTacticalMoveOptions(token, items, gridConfig);
                                    if (moveOptions.length === 0 && !hasPendingMovement) return null;

                                    const tokenCenterX = token.x + ((Number(token.width) || gridConfig.cellWidth || 50) / 2);

                                     // Calcular las celdas individuales alcanzables para pintar el fondo de forma uniforme (sin solapamiento de color)
                                     const tokenBounds = getTokenGridBounds(token, gridConfig);
                                     const reachableCells = new Map();
                                     moveOptions.forEach((option) => {
                                         for (let dx = 0; dx < Math.max(1, tokenBounds.w); dx++) {
                                             for (let dy = 0; dy < Math.max(1, tokenBounds.h); dy++) {
                                                 const cx = option.cell.x + dx;
                                                 const cy = option.cell.y + dy;
                                                 const cellKey = `${cx}:${cy}`;
                                                 reachableCells.set(cellKey, { x: cx, y: cy });
                                             }
                                         }
                                     });
                                    const tokenCenterY = token.y + ((Number(token.height) || gridConfig.cellHeight || 50) / 2);

                                    return (
                                        <div className="absolute inset-0 z-[15] pointer-events-none" style={{ width: WORLD_SIZE, height: WORLD_SIZE }}>
                                             {/* Capa de Fondos de Celda Uniformes (Sin solapamientos de color) */}
                                             {Array.from(reachableCells.values()).map((cell) => {
                                                 const rect = getGridCellWorldRect(cell, gridConfig);
                                                 return (
                                                     <div
                                                         key={`reachable-cell-${cell.x}-${cell.y}`}
                                                         className="absolute border border-rose-500/10 bg-rose-500/10 rounded-sm pointer-events-none"
                                                         style={{
                                                             left: rect.x + 1,
                                                             top: rect.y + 1,
                                                             width: rect.width - 2,
                                                             height: rect.height - 2,
                                                         }}
                                                     />
                                                 );
                                             })}
                                            {/* Se eliminó la insignia de movimiento con icono de huellas sobre el token */}

                                            {isPlayerView && hasPendingMovement && (
                                                <button
                                                     type="button"
                                                     onMouseDown={consumeMobileMoveTemplateEvent}
                                                     onTouchStart={(event) => {
                                                         const touch = event.touches[0];
                                                         mobileMoveTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
                                                     }}
                                                     onTouchEnd={(event) => {
                                                         if (Date.now() - lastSelectionTimeRef.current < 350) return;
                                                         if (mobileMoveTouchStartRef.current) {
                                                             const touch = event.changedTouches?.[0] || event;
                                                             const dragDist = Math.hypot(
                                                                 touch.clientX - mobileMoveTouchStartRef.current.x,
                                                                 touch.clientY - mobileMoveTouchStartRef.current.y
                                                             );
                                                             if (dragDist < 10) {
                                                                 event.preventDefault();
                                                                 event.stopPropagation();
                                                                 handleCancelMobileTacticalMove(event, token.id);
                                                             }
                                                         }
                                                     }}
                                                     onClick={(event) => {
                                                         if (Date.now() - lastSelectionTimeRef.current < 350) return;
                                                         handleCancelMobileTacticalMove(event, token.id);
                                                     }}
                                                     className="absolute z-[18] pointer-events-auto touch-none flex h-8 w-8 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] items-center justify-center rounded-full border border-slate-200/35 bg-black/90 text-slate-100 shadow-[0_0_16px_rgba(15,23,42,0.5)] transition-colors hover:border-red-200/70 hover:text-red-100 focus:outline-none"
                                                     style={{ left: tokenCenterX, top: token.y }}
                                                     title="Cancelar movimiento"
                                                 >
                                                     <X size={14} strokeWidth={2.5} />
                                                 </button>
                                            )}

                                            {moveOptions.map((option) => {
                                                 const rect = getGridCellWorldRect(option.cell, gridConfig);
                                                 const footprintWidth = Math.max(1, tokenBounds.w) * rect.width;
                                                 const footprintHeight = Math.max(1, tokenBounds.h) * rect.height;
                                                 const cellKey = `${option.cell.x}:${option.cell.y}`;
                                                 const isHovered = mobileMoveHoverCellKey === cellKey;

                                                 return (
                                                     <button
                                                         key={`mobile-move-cell-${token.id}-${cellKey}`}
                                                         type="button"
                                                         onMouseEnter={() => {
                                                             if (!window.matchMedia('(pointer: coarse)').matches) {
                                                                 setMobileMoveHoverCellKey(cellKey);
                                                             }
                                                         }}
                                                         onMouseLeave={() => {
                                                             if (!window.matchMedia('(pointer: coarse)').matches) {
                                                                 setMobileMoveHoverCellKey(prev => prev === cellKey ? null : prev);
                                                             }
                                                         }}
                                                         onMouseDown={consumeMobileMoveTemplateEvent}
                                                         onTouchStart={(event) => {
                                                             const touch = event.touches[0];
                                                             mobileMoveTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
                                                         }}
                                                         onTouchEnd={(event) => {
                                                             if (Date.now() - lastSelectionTimeRef.current < 350) return;
                                                             if (mobileMoveTouchStartRef.current) {
                                                                 const touch = event.changedTouches?.[0] || event;
                                                                 const dragDist = Math.hypot(
                                                                     touch.clientX - mobileMoveTouchStartRef.current.x,
                                                                     touch.clientY - mobileMoveTouchStartRef.current.y
                                                                 );
                                                                 if (dragDist < 10) {
                                                                     event.preventDefault();
                                                                     event.stopPropagation();
                                                                     if (isBoardMobileMove) {
                                                                         handleBoardMobileTacticalMoveCell(event, token.id, option.cell);
                                                                     } else {
                                                                         handleMobileTacticalMoveCell(event, token.id, option.cell);
                                                                     }
                                                                 }
                                                             }
                                                         }}
                                                         onClick={(event) => {
                                                             if (Date.now() - lastSelectionTimeRef.current < 350) return;
                                                             if (isBoardMobileMove) {
                                                                 handleBoardMobileTacticalMoveCell(event, token.id, option.cell);
                                                             } else {
                                                                 handleMobileTacticalMoveCell(event, token.id, option.cell);
                                                             }
                                                         }}
                                                         className={`absolute z-[16] overflow-hidden rounded-lg border transition-all duration-300 pointer-events-auto touch-none focus:outline-none ${
                                                             isHovered
                                                                 ? 'border-rose-400 bg-gradient-to-br from-rose-500/20 via-red-500/10 to-rose-600/25 shadow-[0_0_20px_rgba(244,63,94,0.4),inset_0_0_10px_rgba(244,63,94,0.15)] scale-[1.02]'
                                                                 : 'border-transparent bg-rose-500/[0.001]'
                                                         }`}
                                                         style={{
                                                             left: rect.x + 3,
                                                             top: rect.y + 3,
                                                             width: Math.max(10, footprintWidth - 6),
                                                             height: Math.max(10, footprintHeight - 6),
                                                         }}
                                                         title="Mover"
                                                     >
                                                         {/* Borde punteado técnico interno (solo en hover) */}
                                                         {isHovered && <span className="absolute inset-1 rounded-md border border-dashed border-rose-300/30" />}

                                                         {/* Corchetes/Esquinas Tácticas (siempre visibles, se agrandan en hover) */}
                                                         <span className={`absolute left-1 top-1 w-2 h-2 border-t border-l transition-all duration-300 ${isHovered ? 'border-rose-200 w-3 h-3' : 'border-rose-500/30'}`} />
                                                         <span className={`absolute right-1 top-1 w-2 h-2 border-t border-r transition-all duration-300 ${isHovered ? 'border-rose-200 w-3 h-3' : 'border-rose-500/30'}`} />
                                                         <span className={`absolute left-1 bottom-1 w-2 h-2 border-b border-l transition-all duration-300 ${isHovered ? 'border-rose-200 w-3 h-3' : 'border-rose-500/30'}`} />
                                                         <span className={`absolute right-1 bottom-1 w-2 h-2 border-b border-r transition-all duration-300 ${isHovered ? 'border-rose-200 w-3 h-3' : 'border-rose-500/30'}`} />

                                                         {/* Retículas horizontales y verticales (solo en hover) */}
                                                         {isHovered && Array.from({ length: Math.max(0, tokenBounds.w - 1) }).map((_, index) => (
                                                             <span
                                                                 key={`move-footprint-v-${index}`}
                                                                 className="absolute top-1 bottom-1 border-l border-rose-400/20"
                                                                 style={{ left: `${((index + 1) / Math.max(1, tokenBounds.w)) * 100}%` }}
                                                             />
                                                         ))}
                                                         {isHovered && Array.from({ length: Math.max(0, tokenBounds.h - 1) }).map((_, index) => (
                                                             <span
                                                                 key={`move-footprint-h-${index}`}
                                                                 className="absolute left-1 right-1 border-t border-rose-400/20"
                                                                 style={{ top: `${((index + 1) / Math.max(1, tokenBounds.h)) * 100}%` }}
                                                             />
                                                         ))}

                                                         {/* Icono de Huellas de Movimiento Centrado */}
                                                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                             <Footprints
                                                                 size={Math.min(28, Math.min(footprintWidth, footprintHeight) * 0.4)}
                                                                 className={`transition-all duration-300 ${
                                                                     isHovered
                                                                         ? 'text-rose-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.85)] scale-110 opacity-100'
                                                                         : 'text-rose-400/70 drop-shadow-[0_0_2px_rgba(244,63,94,0.35)] opacity-80'
                                                                 }`}
                                                                 strokeWidth={1.8}
                                                             />
                                                         </div>

                                                         {/* Efecto Sonar (solo en hover) */}
                                                         {isHovered && (
                                                             <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-400/35 w-10 h-10 opacity-0 scale-150 animate-ping pointer-events-none" />
                                                         )}
                                                     </button>
                                                 );
                                             })}</div>
                                    );
                                })()}

                                {targetingState?.phase === 'sweep_selection' && (() => {
                                    const items = activeScenario?.items || [];
                                    const attacker = items.find((item) => item.id === targetingState.attackerId);
                                    if (!attacker) return null;

                                    const sideDefs = [
                                        { id: 'north', label: 'Arriba' },
                                        { id: 'east', label: 'Derecha' },
                                        { id: 'south', label: 'Abajo' },
                                        { id: 'west', label: 'Izquierda' },
                                    ].map((side) => {
                                        const cells = getSweepAreaCells(attacker, side.id, gridConfig);
                                        const targets = getSweepTargetsForCells(items, attacker.id, cells, gridConfig).slice(0, 3);
                                        return { ...side, cells, targets };
                                    });

                                    const attackerCenterX = attacker.x + (attacker.width / 2);
                                    const attackerCenterY = attacker.y + (attacker.height / 2);

                                    return (
                                        <div className="absolute inset-0 z-[15] pointer-events-none">
                                            <div
                                                className="absolute pointer-events-auto z-[16] -translate-x-1/2 -translate-y-1/2"
                                                style={{ left: attackerCenterX, top: attackerCenterY }}
                                            >
                                                <div className="flex items-center gap-1 bg-black/90 rounded-full px-2 py-1 shadow-xl border border-[#c8aa6e]/30">
                                                    <button
                                                        onMouseDown={consumeSweepTemplateEvent}
                                                        onPointerDown={consumeSweepTemplateEvent}
                                                        onTouchStart={consumeSweepTemplateEvent}
                                                        onClick={handleSweepTemplateCancel}
                                                        className="text-red-400 hover:text-red-200 p-1 hover:bg-red-900/30 rounded-full transition-colors"
                                                        title="Cancelar Barrido"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            {sideDefs.map((side) => (
                                                <React.Fragment key={`sweep-side-${side.id}`}>
                                                    {side.cells.map((cell, index) => {
                                                        const rect = getGridCellWorldRect(cell, gridConfig);
                                                        const isHovered = sweepHoverSide === side.id;
                                                        const showTargets = isHovered || (!sweepHoverSide && side.targets.length > 0);
                                                        const isMiddleCell = index === Math.floor(side.cells.length / 2);

                                                        return (
                                                            <button
                                                                key={`sweep-cell-${side.id}-${cell.x}-${cell.y}`}
                                                                type="button"
                                                                onMouseEnter={() => setSweepHoverSide(side.id)}
                                                                onMouseLeave={() => setSweepHoverSide((prev) => prev === side.id ? null : prev)}
                                                                onMouseDown={consumeSweepTemplateEvent}
                                                                onPointerDown={consumeSweepTemplateEvent}
                                                                onTouchStart={consumeSweepTemplateEvent}
                                                                onClick={(event) => handleSweepTemplateClick(event, attacker.id, side.id)}
                                                                className={`absolute z-[15] overflow-hidden rounded-md border-2 border-dashed transition-all duration-150 pointer-events-auto focus:outline-none ${
                                                                    isHovered
                                                                        ? 'border-red-300/90 bg-red-500/20 shadow-[0_0_18px_rgba(239,68,68,0.45)]'
                                                                        : showTargets
                                                                            ? 'border-red-500/60 bg-red-500/10'
                                                                            : 'border-red-500/30 bg-red-500/10 hover:border-red-400/70 hover:bg-red-500/20'
                                                                }`}
                                                                style={{
                                                                    left: rect.x,
                                                                    top: rect.y,
                                                                    width: rect.width,
                                                                    height: rect.height,
                                                                }}
                                                                title={`Barrido ${side.label.toLowerCase()}${side.targets.length > 0 ? ` · ${side.targets.length} objetivo${side.targets.length !== 1 ? 's' : ''}` : ''}`}
                                                            >
                                                                <span
                                                                    className={`absolute left-1/2 top-1/2 h-[2px] w-[30%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-red-100 transition-opacity ${
                                                                        isHovered ? 'opacity-90' : 'opacity-40'
                                                                    }`}
                                                                />
                                                                <span
                                                                    className={`absolute left-1/2 top-1/2 h-[2px] w-[30%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-red-100 transition-opacity ${
                                                                        isHovered ? 'opacity-90' : 'opacity-40'
                                                                    }`}
                                                                />
                                                                {isMiddleCell && side.targets.length > 0 && (
                                                                    <span className={`absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-300/30 bg-black/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.35)] ${isHovered ? 'text-red-100' : 'text-red-100/80'}`}>
                                                                        {side.targets.length}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                    {(sweepHoverSide === side.id ? side.targets : []).map((target) => (
                                                        <div
                                                            key={`sweep-target-${side.id}-${target.id}`}
                                                            className={`absolute pointer-events-none z-[14] rounded-full border-2 border-red-400/80 shadow-[0_0_18px_rgba(239,68,68,0.3)] ${target.isCircular ? 'rounded-full' : 'rounded-sm'}`}
                                                            style={{
                                                                left: target.x,
                                                                top: target.y,
                                                                width: target.width,
                                                                height: target.height,
                                                            }}
                                                        />
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {/* --- CAPA SUPERIOR: NIEBLA Y OSCURIDAD (SVG) --- */}
                                {/* Movemos la niebla aquí para que tape a los tokens y muros también */}
                                <div className="absolute z-20 pointer-events-none" style={mapLayerStyle}>
                                    <svg width="100%" height="100%" viewBox={mapLayerViewBox} className="overflow-visible pointer-events-none relative">
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
                                <div className="absolute pointer-events-none z-30" style={mapLayerStyle}>
                                    <svg width="100%" height="100%" viewBox={mapLayerViewBox} className="overflow-visible">
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
                                                        const visibleLights = boardLights.filter(i => {
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

                                                                    // Usamos su propia máscara de sombra para que la luz respete paredes
                                                                    return (
                                                                        <g key={`light-hole-ambient-${light.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                            <circle
                                                                                cx={lx + (light.width / 2)}
                                                                                cy={ly + (light.height / 2)}
                                                                                r={lRadius}
                                                                                fill={`url(#grad-light-${light.id})`} // Usamos el gradiente, que tiene alfa, para crear luz suave
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

                                                        const allLights = boardLights;

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

                                                                        return (
                                                                            <g key={`light-hole-ambient-${light.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                                <circle
                                                                                    cx={lx + (light.width / 2)}
                                                                                    cy={ly + (light.height / 2)}
                                                                                    r={lRadius}
                                                                                    fill={`url(#grad-light-${light.id})`}
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

                                                                        return (
                                                                            <g key={`light-hole-ambient-${light.id}-${token.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                                <circle
                                                                                    cx={lx + (light.width / 2)}
                                                                                    cy={ly + (light.height / 2)}
                                                                                    r={lRadius}
                                                                                    fill={`url(#grad-light-${light.id})`}
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
                                                {/* Visión de los Tokens: Filtrado por selección para el Master */}
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
                                                    const visibleLights = boardLights.filter(i => {
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
                                                    const maskVer = activeScenario?.lastModified || maskVersion;
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

                                                    const allLights = boardLights;

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

                                                                    return (
                                                                        <g key={`light-hole-fog-${light.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                            <circle
                                                                                cx={lx + (light.width / 2)}
                                                                                cy={ly + (light.height / 2)}
                                                                                r={lRadius}
                                                                                fill={`url(#grad-light-${light.id})`}
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

                                                                    return (
                                                                        <g key={`light-hole-fog-${light.id}-${token.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                            <circle
                                                                                cx={lx + (light.width / 2)}
                                                                                cy={ly + (light.height / 2)}
                                                                                r={lRadius}
                                                                                fill={`url(#grad-light-${light.id})`}
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
                                            {boardLights.map(light => {
                                                const profile = getBoardLightVisualProfile(light);
                                                return (
                                                    <radialGradient id={`grad-light-${light.id}`} key={`grad-light-${light.id}`}>
                                                        <stop offset="0%" stopColor="black" stopOpacity={profile.maskCoreOpacity} />
                                                        <stop offset="18%" stopColor="black" stopOpacity={profile.maskCoreOpacity} />
                                                        <stop offset="48%" stopColor="black" stopOpacity={profile.maskMidOpacity} />
                                                        <stop offset="72%" stopColor="black" stopOpacity={profile.maskOuterOpacity} />
                                                        <stop offset="90%" stopColor="black" stopOpacity={profile.maskOuterOpacity * 0.28} />
                                                        <stop offset="100%" stopColor="black" stopOpacity="0" />
                                                    </radialGradient>
                                                );
                                            })}

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
                                <div className="absolute pointer-events-none z-[45] overflow-visible" style={mapLayerStyle}>
                                    <svg width="100%" height="100%" viewBox={mapLayerViewBox} className="overflow-visible">
                                        <defs>
                                            {boardLights.map(light => {
                                                const profile = getBoardLightVisualProfile(light);
                                                return (
                                                    <radialGradient id={`visual-grad-${light.id}`} key={`visual-grad-${light.id}`}>
                                                        <stop offset="0%" stopColor={profile.color} stopOpacity={profile.glowCoreOpacity} />
                                                        <stop offset="16%" stopColor={profile.color} stopOpacity={profile.glowCoreOpacity * 0.88} />
                                                        <stop offset="42%" stopColor={profile.color} stopOpacity={profile.glowMidOpacity} />
                                                        <stop offset="72%" stopColor={profile.color} stopOpacity={profile.glowOuterOpacity} />
                                                        <stop offset="100%" stopColor={profile.color} stopOpacity="0" />
                                                    </radialGradient>
                                                );
                                            })}
                                        </defs>
                                        {isPlayerView && selectedTokenIds.length === 0 && (
                                            <defs>
                                                <mask id="player-global-perspective-mask">
                                                    <rect x={mapLayerBounds.x} y={mapLayerBounds.y} width={mapLayerBounds.width} height={mapLayerBounds.height} fill="black" />
                                                    {(activeScenario?.items || []).filter(t => t && t.controlledBy?.includes(playerName) && t.hasVision).map(token => (
                                                        <g key={`global-p-mask-${token.id}`} mask={`url(#shadow-mask-${token.id}-${maskVersion})`}>
                                                            <rect x={mapLayerBounds.x} y={mapLayerBounds.y} width={mapLayerBounds.width} height={mapLayerBounds.height} fill="white" />
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
                                                const visibleLights = boardLights.filter(i => {
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
                                                                <rect x={mapLayerBounds.x} y={mapLayerBounds.y} width={mapLayerBounds.width} height={mapLayerBounds.height} fill="black" />
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
                                                                    const profile = getBoardLightVisualProfile(light);
                                                                    const lFlicker = animatedBoardLightIds.has(light.id);
                                                                    const flickerStyle = lFlicker ? getBoardLightFlickerStyle(light.id) : {};

                                                                    return (
                                                                        <motion.g
                                                                            key={`glow-group-${light.id}`}
                                                                            initial={{ opacity: 0 }}
                                                                            animate={{ opacity: 1 }}
                                                                            exit={{ opacity: 0 }}
                                                                            transition={{ duration: 0.3 }}
                                                                            mask={`url(#shadow-mask-${light.id}-${maskVersion})`}
                                                                        >
                                                                            <circle
                                                                                cx={lx + light.width / 2}
                                                                                cy={ly + light.height / 2}
                                                                                r={profile.glowRadius}
                                                                                fill={`url(#visual-grad-${light.id})`}
                                                                                style={{ mixBlendMode: 'screen', ...flickerStyle }}
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

                                                const allLights = boardLights;

                                                if (selectedVisionTokens.length === 0) {
                                                    // Sin token seleccionado: master ve todos los glows sin recorte
                                                    return allLights.map(light => {
                                                        const isInteracting = (draggedTokenId || rotatingTokenId || resizingTokenId) && selectedTokenIds.includes(light.id);
                                                        const original = tokenOriginalPos[light.id];
                                                        const lx = (isInteracting && original) ? original.x : light.x;
                                                        const ly = (isInteracting && original) ? original.y : light.y;
                                                        const profile = getBoardLightVisualProfile(light);
                                                        const lFlicker = animatedBoardLightIds.has(light.id);
                                                        const flickerStyle = lFlicker ? getBoardLightFlickerStyle(light.id) : {};

                                                        return (
                                                            <g key={`glow-group-${light.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                <circle
                                                                    cx={lx + light.width / 2}
                                                                    cy={ly + light.height / 2}
                                                                    r={profile.glowRadius}
                                                                    fill={`url(#visual-grad-${light.id})`}
                                                                    style={{ mixBlendMode: 'screen', ...flickerStyle }}
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
                                                                <rect x={mapLayerBounds.x} y={mapLayerBounds.y} width={mapLayerBounds.width} height={mapLayerBounds.height} fill="black" />
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
                                                                const profile = getBoardLightVisualProfile(light);
                                                                const lFlicker = animatedBoardLightIds.has(light.id);
                                                                const flickerStyle = lFlicker ? getBoardLightFlickerStyle(light.id) : {};

                                                                return (
                                                                    <g key={`glow-group-${light.id}-${token.id}`} mask={`url(#shadow-mask-${light.id}-${maskVersion})`}>
                                                                        <circle
                                                                            cx={lx + light.width / 2}
                                                                            cy={ly + light.height / 2}
                                                                            r={profile.glowRadius}
                                                                            fill={`url(#visual-grad-${light.id})`}
                                                                            style={{ mixBlendMode: 'screen', ...flickerStyle }}
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

                                {/* --- CAPA GLOBAL DE TARGETING (Fuera de Niebla de Guerra y de Permisos) --- */}
                                <div className="absolute inset-0 z-[100] pointer-events-none">
                                    {/* --- LNEAS TCTICAS DE ATAQUE --- */}
                                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                                        {(() => {
                                            const items = activeScenario?.items || [];
                                            const attackPairs = [];

                                            // 1. Objetivo enfocado actualmente (Targeting Phase)
                                            if (targetingState && focusedTargetId) {
                                                const attacker = items.find(i => i.id === targetingState.attackerId);
                                                const target = items.find(i => i.id === focusedTargetId);
                                                if (attacker && target) attackPairs.push({ attacker, target, isFocused: true });
                                            }

                                            // 2. Objetivos en acciones pendientes (Turn Phase)
                                            if (pendingTurnState?.actions) {
                                                const attacker = items.find(i => i.id === pendingTurnState.tokenId);
                                                if (attacker) {
                                                    const uniqueTargetIds = new Set();
                                                    pendingTurnState.actions.forEach(a => {
                                                        const actionTargetIds = a.targetId
                                                            ? [a.targetId]
                                                            : Array.isArray(a.targetIds)
                                                                ? a.targetIds
                                                                : [];

                                                        actionTargetIds.forEach((targetId) => {
                                                            if (!targetId || uniqueTargetIds.has(targetId)) return;
                                                            const target = items.find(i => i.id === targetId);
                                                            if (target) {
                                                                attackPairs.push({ attacker, target, isFocused: false });
                                                                uniqueTargetIds.add(targetId);
                                                            }
                                                        });
                                                    });
                                                }
                                            }

                                            return attackPairs.map((pair, idx) => {
                                                const { attacker, target, isFocused } = pair;
                                                const attackerPlacement = !attacker.type || (attacker.type !== 'light' && attacker.type !== 'wall' && attacker.type !== 'geometry')
                                                    ? getCombatRenderPlacement(attacker, items, gridConfig)
                                                    : { x: attacker.x, y: attacker.y };
                                                const targetPlacement = !target.type || (target.type !== 'light' && target.type !== 'wall' && target.type !== 'geometry')
                                                    ? getCombatRenderPlacement(target, items, gridConfig)
                                                    : { x: target.x, y: target.y };

                                                const x1 = attackerPlacement.x + attacker.width / 2;
                                                const y1 = attackerPlacement.y + attacker.height / 2;
                                                const x2 = targetPlacement.x + target.width / 2;
                                                const y2 = targetPlacement.y + target.height / 2;

                                                const cellW = gridConfig.cellWidth || 50;
                                                const cellH = gridConfig.cellHeight || 50;

                                                const ax = Math.round(attacker.x / cellW);
                                                const ay = Math.round(attacker.y / cellH);
                                                const aw = Math.max(1, Math.round((attacker.width || cellW) / cellW));
                                                const ah = Math.max(1, Math.round((attacker.height || cellH) / cellH));

                                                const tx = Math.round(target.x / cellW);
                                                const ty = Math.round(target.y / cellH);
                                                const tw = Math.max(1, Math.round((target.width || cellW) / cellW));
                                                const th = Math.max(1, Math.round((target.height || cellH) / cellH));

                                                const distX = Math.max(0, tx - (ax + aw - 1), ax - (tx + tw - 1));
                                                const distY = Math.max(0, ty - (ay + ah - 1), ay - (ty + th - 1));
                                                const distance = Math.max(distX, distY);

                                                return (
                                                    <g key={`attack-path-${idx}`}>
                                                        {/* Línea de trayectoria */}
                                                        <line
                                                            x1={x1} y1={y1} x2={x2} y2={y2}
                                                            stroke="#ef4444"
                                                            strokeWidth={isFocused ? "2" : "1.5"}
                                                            strokeDasharray="10 6"
                                                            className={isFocused ? "animate-pulse" : "opacity-50"}
                                                        />
                                                        {/* Círculos en los extremos para rematar la línea */}
                                                        <circle cx={x1} cy={y1} r="3" fill="#ef4444" className={isFocused ? "animate-pulse" : "opacity-50"} />
                                                        <circle cx={x2} cy={y2} r="3" fill="#ef4444" className={isFocused ? "animate-pulse" : "opacity-50"} />

                                                        {/* Etiqueta de Distancia en el punto medio */}
                                                        {distance > 0 && (
                                                            <foreignObject
                                                                x={(x1 * 0.4 + x2 * 0.6) - 15}
                                                                y={(y1 * 0.4 + y2 * 0.6) - 10}
                                                                width="30" height="20"
                                                                className="overflow-visible"
                                                            >
                                                                <div className="flex items-center justify-center w-full h-full">
                                                                    <div className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded border border-red-400/50 shadow-[0_0_10px_rgba(239,68,68,0.4)] flex items-center gap-0.5">
                                                                        {distance}
                                                                        <span className="text-[6px] opacity-70">C</span>
                                                                    </div>
                                                                </div>
                                                            </foreignObject>
                                                        )}
                                                    </g>
                                                );
                                            });
                                        })()}
                                    </svg>
                                    {(activeScenario?.items || []).filter(i => i && i.type !== 'light' && i.type !== 'wall').map(item => {
                                        // Caso A: Estamos en fase de elegir objetivo (targeting)
                                        const isFocused = focusedTargetId === item.id;
                                        // Caso B: El objetivo ya está fijado en una acción pendiente de este turno
                                        const isPendingTarget = pendingTurnState?.actions?.some(a => a.targetId === item.id);

                                        if (!isFocused && !isPendingTarget) return null;

                                        const itemPlacement = gridConfig.isCombatActive
                                            ? getCombatRenderPlacement(item, activeScenario?.items || [], gridConfig)
                                            : { x: item.x, y: item.y };

                                        return (
                                            <motion.div
                                                key={`global-targeting-${item.id}`}
                                                className={`absolute pointer-events-none transition-all duration-300
                                                    ${isFocused
                                                        ? 'border-4 border-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.8)] z-[101]'
                                                        : 'border-[3px] border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.4)] z-[100]'
                                                    }
                                                    ${item.isCircular ? 'rounded-full' : 'rounded-sm'}
                                                `}
                                                initial={false}
                                                animate={{
                                                    x: itemPlacement.x,
                                                    y: itemPlacement.y,
                                                    rotate: item.rotation || 0,
                                                }}
                                                transition={{ type: 'tween', duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                                                style={{
                                                    width: `${item.width}px`,
                                                    height: `${item.height}px`,
                                                    left: 0,
                                                    top: 0,
                                                    transformOrigin: 'center center',
                                                    willChange: 'transform'
                                                }}
                                            >
                                                {/* Etiqueta superior */}
                                                <div className={`
                                                    absolute left-1/2 -translate-x-1/2 rounded-full font-bold uppercase tracking-widest shadow-lg whitespace-nowrap
                                                    ${isFocused
                                                        ? '-top-8 bg-red-600 text-white text-[9px] px-3 py-1 scale-110'
                                                        : '-top-6 bg-red-500/90 text-white text-[7px] px-2 py-0.5 opacity-80'
                                                    }
                                                `}>
                                                    {isFocused ? 'Objetivo fijado' : 'Objetivo'}
                                                </div>

                                                {/* Efecto de mira/crosshair adicional para selección activa */}
                                                {isFocused && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                                        <div className="absolute h-[150%] w-[1px] bg-red-500"></div>
                                                        <div className="absolute w-[150%] h-[1px] bg-red-500"></div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}

                                    {/* --- FLOATING COMBAT EFFECTS --- */}
                                    {activeCombatAnimations.map(({ id, effect }) => {
                                        const items = activeScenario?.items || [];
                                        const targetToken = items.find(i => i.id === effect.targetId);
                                        const attackerToken = items.find(i => i.id === effect.attackerId);
                                        const targetPlacement = targetToken && gridConfig.isCombatActive
                                            ? getCombatRenderPlacement(targetToken, items, gridConfig)
                                            : targetToken
                                                ? { x: targetToken.x, y: targetToken.y }
                                                : null;
                                        const attackerPlacement = attackerToken && gridConfig.isCombatActive
                                            ? getCombatRenderPlacement(attackerToken, items, gridConfig)
                                            : attackerToken
                                                ? { x: attackerToken.x, y: attackerToken.y }
                                                : null;
                                        return (
                                            <FloatingCombatEffects
                                                key={id}
                                                effect={effect}
                                                targetPos={targetToken && targetPlacement ? {
                                                    x: targetPlacement.x,
                                                    y: targetPlacement.y,
                                                    width: targetToken.width,
                                                    height: targetToken.height
                                                } : null}
                                                attackerPos={attackerToken && attackerPlacement ? {
                                                    x: attackerPlacement.x,
                                                    y: attackerPlacement.y,
                                                    width: attackerToken.width,
                                                    height: attackerToken.height
                                                } : null}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
);
