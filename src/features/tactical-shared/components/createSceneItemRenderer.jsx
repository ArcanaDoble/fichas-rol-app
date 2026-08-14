import React from 'react';
import {
    DoorClosed, DoorOpen, EyeOff, Hand, HandGrab, LayoutGrid, Lock, RotateCw,
    Sparkles, Square, Trash2, Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import TokenHUD from '../../../components/TokenHUD';
import { DEFAULT_STATUS_EFFECTS, ICON_MAP } from '../../../utils/statusEffects';
import { DEFAULT_CARD_BACK_URL, getCardDisplayImage } from '../../../utils/cardImages';
import {
    getCardContainerItems, getCardStackIds, isCardContainerItem,
    isCardHiddenByContainerForPlayer, isCardItem, isContainerCardsHiddenForPlayers,
    isHandCardItem, isStackedCardItem,
} from '../../../utils/cardBoard';
import {
    getCardCenter, getCombatRenderPlacement, getCombatRenderPlacementAtPosition,
    getGridCellWorldRect, getItemOverlapRatio, isBoardDieItem, isBoardMarkerItem,
    isPointInsideExpandedItem, normalizeTokenStatusIds,
} from '../legacyCombatRules';
import { CardImageWithLoader, TokenImageWithLoader } from './TacticalAssetImage';
import { normalizeGeometryKind } from '../geometry';

export { normalizeGeometryKind } from '../geometry';

export const renderGeometryVisual = (item = {}) => {
    const kind = normalizeGeometryKind(item);
    const color = item.backgroundColor || (kind === 'hazard' ? '#ef4444' : kind === 'stairs' ? '#c8aa6e' : '#22c55e');
    const opacity = Number.isFinite(Number(item.opacity)) ? Number(item.opacity) : (kind === 'hazard' ? 0.1 : 0.28);
    const safeId = `${item.id || 'geometry'}-${kind}`.replace(/[^a-zA-Z0-9_-]/g, '');
    if (kind === 'hazard') {
        const baseOpacity = Math.max(0.3, opacity + 0.1);
        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <defs>
                    <pattern id={`hazard-stripes-${safeId}`} width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="28" height="56" fill={color} opacity="0.8" />
                        <rect x="28" width="28" height="56" fill="transparent" />
                    </pattern>
                    <radialGradient id={`hazard-glow-${safeId}`} cx="50%" cy="50%" r="75%">
                        <stop offset="0%" stopColor={color} stopOpacity={Math.min(opacity, 0.2)} />
                        <stop offset="100%" stopColor={color} stopOpacity={Math.min(opacity + 0.2, 0.5)} />
                    </radialGradient>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill={`url(#hazard-glow-${safeId})`} />
                <rect x="0" y="0" width="100%" height="100%" fill={`url(#hazard-stripes-${safeId})`} opacity={baseOpacity} />
                <rect x="0" y="0" width="100%" height="100%" fill="none" stroke={color} strokeWidth="8" opacity="0.9" />
            </svg>
        );
    }

    if (kind === 'stairs') {
        const stepOpacity = Math.max(0.3, opacity + 0.1);
        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <defs>
                    <linearGradient id={`stairs-step-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                        <stop offset="20%" stopColor="#ffffff" stopOpacity="0.05" />
                        <stop offset="80%" stopColor="#000000" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
                    </linearGradient>
                    <pattern id={`stairs-pattern-${safeId}`} width="48" height="48" patternUnits="userSpaceOnUse">
                        <rect x="0" y="0" width="48" height="48" fill={color} opacity={stepOpacity} />
                        <rect x="0" y="0" width="48" height="48" fill={`url(#stairs-step-${safeId})`} />
                        <line x1="0" y1="1" x2="48" y2="1" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
                        <line x1="0" y1="47" x2="48" y2="47" stroke="#000000" strokeWidth="2" opacity="0.5" />
                    </pattern>
                    <radialGradient id={`stairs-shadow-${safeId}`} cx="50%" cy="50%" r="75%">
                        <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
                    </radialGradient>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill={`url(#stairs-pattern-${safeId})`} />
                <rect x="0" y="0" width="100%" height="100%" fill={`url(#stairs-shadow-${safeId})`} />

            </svg>
        );
    }

    return null;
};

/** Creates the item renderer while keeping scene mutations in the workspace controller. */
export const createSceneItemRenderer = ({
    BoardDieVisual,
    BoardMarkerVisual,
    ScenePickupVisual,
    activeLayer,
    activeScenario,
    boardCardHandTransferRef,
    combatOccupancyFeedback,
    consumeCardStackQuickActionEvent,
    currentDieRollSpeed,
    currentUserId,
    deleteItem,
    dragDirection,
    dragVisualOrigin,
    draggedTokenId,
    glossary = [],
    gridConfig,
    handleResizeMouseDown,
    handleRotationMouseDown,
    handleTokenMouseDown,
    instantBoardDieMoveIdsRef,
    isBoardMode,
    isPlayerView,
    isScenePickupItem,
    getScenePickupRenderPlacement,
    resolveScenePickupRecipient,
    isUsablePendingTurnState,
    lastFlipTimesRef,
    lastSelectedIdRef,
    pendingTurnState,
    playerName,
    rarityColorMap = {},
    removeCardFromContainer,
    resizingTokenId,
    rotateItem,
    rotatingTokenId,
    selectedTokenIds,
    setActiveTab,
    setSelectedTokenIds,
    setShowSettings,
    startWallHandleDrag,
    targetingState,
    toggleDoorOpen,
    toggleSecretWall,
    toggleWallType,
    tokenOriginalPos,
    unstackSpecificCard,
    updateItem,
    zoom,
}) => {
const renderItemJSX = (item) => {
        if (boardCardHandTransferRef.current === item.id && !isHandCardItem(item)) return null;
        if (isHandCardItem(item)) return null;
        if (isStackedCardItem(item)) return null;
        if (isCardHiddenByContainerForPlayer(item, activeScenario?.items || [], isPlayerView)) return null;

        const original = tokenOriginalPos[item.id];
        const dragOrigin = dragVisualOrigin[item.id];
        const occupancyFeedbackForItem = combatOccupancyFeedback?.tokenId === item.id ? combatOccupancyFeedback : null;
        const pendingStateForItem = isUsablePendingTurnState(pendingTurnState) && pendingTurnState.tokenId === item.id
            ? pendingTurnState
            : null;
        const isSelected = selectedTokenIds.includes(item.id);
        const isLight = item.type === 'light';
        const isWall = item.type === 'wall';
        const isGeometry = item.type === 'geometry';
        const isCard = isCardItem(item);
        const isCardContainer = isCardContainerItem(item);
        const isBoardMarker = isBoardMarkerItem(item);
        const isBoardDie = isBoardDieItem(item);
        const isScenePickup = Boolean(isScenePickupItem?.(item));
        const selectedLootItems = isScenePickup && selectedTokenIds.length > 1
            ? (activeScenario?.items || []).filter(candidate => isScenePickupItem?.(candidate) && selectedTokenIds.includes(candidate.id))
            : (isSelected && isScenePickup ? [item] : []);
        const isToken = !isLight && !isWall && !isGeometry && !isCard && !isCardContainer && !isBoardMarker && !isBoardDie && !isScenePickup;
        const draggedLootItem = (draggedTokenId && isScenePickupItem?.(activeScenario?.items?.find((i) => i.id === draggedTokenId)))
            ? activeScenario?.items?.find((i) => i.id === draggedTokenId)
            : null;
        const targetedRecipient = draggedLootItem && resolveScenePickupRecipient
            ? resolveScenePickupRecipient({
                loot: draggedLootItem,
                items: activeScenario?.items || [],
                isPlayerView,
                playerName,
                gridConfig,
            })?.recipient
            : null;
        const isPrimarySelectedLoot = selectedLootItems.length > 0 && selectedLootItems[0].id === item.id;
        const itemOrderIndex = Math.max(0, (activeScenario?.items || []).findIndex(candidate => candidate.id === item.id));
        const boardMarkerStackIndex = isBoardMarker
            ? (activeScenario?.items || [])
                .filter(isBoardMarkerItem)
                .reduce((count, marker) => {
                    if (marker.id === item.id) return count;

                    // Orden virtual: la ficha arrastrada se sitúa siempre al tope de la pila
                    const isItemDragged = draggedTokenId === item.id;
                    const isMarkerDragged = draggedTokenId === marker.id;

                    let isAbove = false;
                    if (isItemDragged) {
                        isAbove = true;
                    } else if (isMarkerDragged) {
                        isAbove = false;
                    } else {
                        const markerOrder = (activeScenario?.items || []).findIndex(candidate => candidate.id === marker.id);
                        const itemOrder = (activeScenario?.items || []).findIndex(candidate => candidate.id === item.id);
                        if (markerOrder < 0 || itemOrder < 0 || markerOrder >= itemOrder) return count;
                        isAbove = true;
                    }

                    if (!isAbove) return count;

                    const itemCenterX = item.x + (item.width / 2);
                    const itemCenterY = item.y + (item.height / 2);
                    const markerCenterX = marker.x + (marker.width / 2);
                    const markerCenterY = marker.y + (marker.height / 2);
                    const distance = Math.hypot(itemCenterX - markerCenterX, itemCenterY - markerCenterY);
                    const threshold = Math.min(item.width, item.height, marker.width, marker.height) * 0.55;
                    return distance <= threshold || getItemOverlapRatio(item, marker) >= 0.18 ? count + 1 : count;
                }, 0)
            : 0;
        const containerCardsAreHidden = isCardContainer && isContainerCardsHiddenForPlayers(item);
        const containerCardsHiddenForViewer = isPlayerView && containerCardsAreHidden;
        const containerCardItems = isCardContainer && !containerCardsHiddenForViewer
            ? getCardContainerItems(item.id, activeScenario?.items || [])
            : [];
        const containerMarkerItems = isCardContainer
            ? (activeScenario?.items || []).filter(candidate => (
                isBoardMarkerItem(candidate) &&
                candidate.zone === 'board' &&
                isPointInsideExpandedItem(getCardCenter(candidate), item, 0)
            ))
            : [];
        const containerMarkerValueTotal = containerMarkerItems.reduce((total, marker) => {
            const value = Number(marker?.markerValue);
            return total + (Number.isFinite(value) ? value : 0);
        }, 0);
        const containerItemCount = containerCardsHiddenForViewer
            ? null
            : containerCardItems.length + containerMarkerValueTotal;
        const cardStackCount = isCard ? getCardStackIds(item).length : 0;
        const cardStackItems = isCard && cardStackCount > 0
            ? getCardStackIds(item)
                .map(cardId => (activeScenario?.items || []).find(stackItem => stackItem.id === cardId))
                .filter(Boolean)
            : [];
        const isLootDropTarget = isToken && targetedRecipient?.id === item.id;
        const isLocallyInteracting =
            !!(draggedTokenId || rotatingTokenId || resizingTokenId) &&
            selectedTokenIds.includes(item.id);
        const shouldPromoteItemLayer = isLocallyInteracting || draggedTokenId === item.id;
        const isInstantBoardDieMove = isBoardDie && instantBoardDieMoveIdsRef.current.has(item.id);
        const canShowResizeHandle = isSelected && !rotatingTokenId && !isBoardDie && !isCard && !isScenePickup;
        const itemMotionTransition = isBoardMarker || isBoardDie
            ? (isLocallyInteracting || isInstantBoardDieMove ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 28, mass: 0.55 })
            : (isToken || isCard || isCardContainer || isScenePickup) && !isLocallyInteracting
                ? { type: 'tween', duration: 0.42, ease: [0.22, 1, 0.36, 1] }
                : { duration: 0 };
        const combatPlacementItems = combatOccupancyFeedback?.tokenId && tokenOriginalPos[combatOccupancyFeedback.tokenId]
            ? (activeScenario?.items || []).map((placementItem) => (
                placementItem.id === combatOccupancyFeedback.tokenId
                    ? { ...placementItem, ...tokenOriginalPos[combatOccupancyFeedback.tokenId] }
                    : placementItem
            ))
            : (activeScenario?.items || []);
        const renderPlacementToken = occupancyFeedbackForItem && original
            ? { ...item, x: original.x, y: original.y }
            : item;
        const renderPlacement = isToken && gridConfig.isCombatActive
            ? getCombatRenderPlacement(renderPlacementToken, combatPlacementItems, gridConfig)
            : isScenePickup
                ? (getScenePickupRenderPlacement?.(item, activeScenario?.items || [], gridConfig) || { x: item.x, y: item.y })
                : { x: item.x, y: item.y };

        // Lógica de visibilidad y bloqueo por capas
        const isLightingLayer = activeLayer === 'LIGHTING';
        const isMapLayer = activeLayer === 'MAP';

        let canInteract = false;
        if (isLightingLayer) canInteract = (isLight || isWall);
        else if (isMapLayer) canInteract = isGeometry;
        else canInteract = (isToken || isCard || isCardContainer || isBoardMarker || isBoardDie || isScenePickup);

        // Si estamos en targeting (apuntando o eligiendo arma), TODOS los tokens son interactuables como objetivos.
        // Importante: Esto previene que el click en un enemigo "atraviese" la ficha hacia el fondo y cancele la acción en móvil.
        const isTargetingActive = targetingState && (targetingState.phase === 'targeting' || targetingState.phase === 'weapon_selection');
        if (isTargetingActive && isToken) {
            canInteract = true;
        } else if (isPlayerView && isScenePickup) {
            canInteract = true;
        } else if (isPlayerView && isToken) {
            const hasPermission = (Array.isArray(item.controlledBy) ? item.controlledBy.includes(playerName) : item.controlledBy === playerName) || item.ownerName === playerName;
            if (!hasPermission) {
                canInteract = false;
            }
        } else if (isPlayerView && (isBoardMarker || isBoardDie)) {
            canInteract = isBoardMode;
        } else if (isPlayerView && (isCard || isCardContainer)) {
            canInteract = isBoardMode && (
                !item.ownerName ||
                item.ownerName === playerName ||
                item.ownerId === currentUserId ||
                item.handSeatId === playerName ||
                item.handSeatName === playerName
            );
        } else if (isPlayerView && (isLight || isWall || isGeometry)) {
            // Jugadores no pueden tocar luces, muros ni áreas
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
        const isBeingDragged = draggedTokenId === item.id;
        const motionOpacity = occupancyFeedbackForItem && isBeingDragged ? 0 : (isBeingDragged ? 0.72 : opacity);

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
                                            startWallHandleDrag(item, 1);
                                        }}
                                        onTouchStart={(e) => {
                                            if (!canInteract) return;
                                            handleTokenMouseDown(e, item);
                                            startWallHandleDrag(item, 1);
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
                                        startWallHandleDrag(item, 1);
                                    }}
                                    onTouchStart={(e) => {
                                        if (!canInteract) return;
                                        handleTokenMouseDown(e, item);
                                        startWallHandleDrag(item, 1);
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
                                            startWallHandleDrag(item, 2);
                                        }}
                                        onTouchStart={(e) => {
                                            if (!canInteract) return;
                                            handleTokenMouseDown(e, item);
                                            startWallHandleDrag(item, 2);
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
                                        startWallHandleDrag(item, 2);
                                    }}
                                    onTouchStart={(e) => {
                                        if (!canInteract) return;
                                        handleTokenMouseDown(e, item);
                                        startWallHandleDrag(item, 2);
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
                {/* GHOST TOKEN & LINE (DRAG O TURNO PENDIENTE) */}
                {(dragOrigin || original || occupancyFeedbackForItem || (isPlayerView && pendingStateForItem)) && canInteract && (
                    <>
                        {(() => {
                            // PRIORIDAD: Si hay un estado pendiente, el inicio del turno es SIEMPRE startX del estado pendiente.
                            // Si estamos arrastrando por primera vez (sin estado pendiente previo), usamos original.x
                            let logicalStartX, logicalStartY;
                            const isDraggingThisToken = draggedTokenId === item.id;

                            if (isDraggingThisToken && dragOrigin) {
                                logicalStartX = dragOrigin.x;
                                logicalStartY = dragOrigin.y;
                            } else if (isDraggingThisToken && original) {
                                logicalStartX = original.x;
                                logicalStartY = original.y;
                            } else if (pendingStateForItem) {
                                logicalStartX = pendingStateForItem.startX;
                                logicalStartY = pendingStateForItem.startY;
                            } else if (original) {
                                logicalStartX = original.x;
                                logicalStartY = original.y;
                            }

                            const feedbackCellRect = occupancyFeedbackForItem?.cell
                                ? getGridCellWorldRect(occupancyFeedbackForItem.cell, gridConfig)
                                : null;
                            const startPlacement = dragOrigin || (
                                Number.isFinite(Number(logicalStartX)) && Number.isFinite(Number(logicalStartY))
                                    ? (
                                        isToken && gridConfig.isCombatActive
                                            ? getCombatRenderPlacementAtPosition(
                                                item,
                                                { x: logicalStartX, y: logicalStartY },
                                                activeScenario?.items || [],
                                                gridConfig
                                            )
                                            : { x: logicalStartX, y: logicalStartY }
                                    )
                                    : null
                            );
                            const targetPlacement = occupancyFeedbackForItem
                                ? { x: occupancyFeedbackForItem.targetX, y: occupancyFeedbackForItem.targetY }
                                : pendingStateForItem && !isDraggingThisToken
                                    ? (
                                        isToken && gridConfig.isCombatActive
                                            ? getCombatRenderPlacementAtPosition(
                                                item,
                                                { x: pendingStateForItem.x, y: pendingStateForItem.y },
                                                activeScenario?.items || [],
                                                gridConfig
                                            )
                                            : { x: pendingStateForItem.x, y: pendingStateForItem.y }
                                    )
                                    : renderPlacement;
                            const hasGhostPreview = !!(
                                startPlacement &&
                                targetPlacement &&
                                (isToken || isGeometry) &&
                                (
                                    Math.abs((targetPlacement.x || 0) - (startPlacement.x || 0)) > 0.5 ||
                                    Math.abs((targetPlacement.y || 0) - (startPlacement.y || 0)) > 0.5
                                )
                            );
                            const ghostPreview = hasGhostPreview
                                ? (() => {
                                    const startCenterX = startPlacement.x + ((item.width || 0) / 2);
                                    const startCenterY = startPlacement.y + ((item.height || 0) / 2);
                                    const targetCenterX = targetPlacement.x + ((item.width || 0) / 2);
                                    const targetCenterY = targetPlacement.y + ((item.height || 0) / 2);

                                    return (
                                        <>
                                            <svg
                                                className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0"
                                            >
                                                <line
                                                    x1={startCenterX}
                                                    y1={startCenterY}
                                                    x2={targetCenterX}
                                                    y2={targetCenterY}
                                                    stroke="#c8aa6e"
                                                    strokeWidth="1.5"
                                                    strokeDasharray="6 4"
                                                    opacity="0.6"
                                                />
                                                <circle cx={startCenterX} cy={startCenterY} r="3" fill="#c8aa6e" opacity="0.5" />
                                            </svg>
                                            <div
                                                className={`absolute top-0 left-0 z-10 pointer-events-none grayscale opacity-40 border-2 border-dashed border-[#c8aa6e]/50 ${item.isCircular ? 'rounded-full' : 'rounded-sm'} overflow-hidden`}
                                                style={{
                                                    transform: `translate(${startPlacement.x}px, ${startPlacement.y}px) rotate(${item.rotation}deg)`,
                                                    width: `${item.width}px`,
                                                    height: `${item.height}px`,
                                                }}
                                            >
                                                {isToken && (
                                                    <div
                                                        className="w-full h-full"
                                                        style={{
                                                            backgroundImage: item.img ? `url("${item.img}")` : 'none',
                                                            backgroundPosition: 'center',
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundSize: item.isCircular ? 'cover' : 'contain'
                                                        }}
                                                    />
                                                )}
                                                {isGeometry && (
                                                    <div
                                                        className={`w-full h-full flex items-center justify-center font-bold text-white shadow-inner uppercase text-[10px] tracking-widest break-words overflow-hidden p-2 text-center`}
                                                        style={{
                                                            backgroundColor: item.backgroundColor || '#22c55e',
                                                            opacity: item.opacity || 0.4,
                                                            borderRadius: item.isCircular ? '50%' : '4px',
                                                            border: `2px solid ${item.backgroundColor || '#22c55e'}`,
                                                            pointerEvents: 'none'
                                                        }}
                                                    >
                                                        <span style={{ opacity: 1, textShadow: '0px 0px 4px black', pointerEvents: 'none' }}>{item.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()
                                : null;
                            const blockedPlacement = (occupancyFeedbackForItem && feedbackCellRect)
                                ? (
                                    <>
                                        <div
                                            className="absolute top-0 left-0 z-[58] pointer-events-none rounded-md border-2 border-red-400/90 bg-red-500/15 shadow-[0_0_24px_rgba(239,68,68,0.45)]"
                                            style={{
                                                transform: `translate(${feedbackCellRect.x}px, ${feedbackCellRect.y}px)`,
                                                width: `${feedbackCellRect.width}px`,
                                                height: `${feedbackCellRect.height}px`,
                                            }}
                                        >
                                            <div
                                                className="absolute left-1/2 top-1/2 h-1 w-[58%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-red-100 shadow-[0_0_8px_rgba(248,113,113,0.9)]"
                                            />
                                            <div
                                                className="absolute left-1/2 top-1/2 h-1 w-[58%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-red-100 shadow-[0_0_8px_rgba(248,113,113,0.9)]"
                                            />
                                            {occupancyFeedbackForItem.reason && (
                                                <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-red-400/50 bg-black/85 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-red-200 shadow-xl">
                                                    {occupancyFeedbackForItem.reason}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className={`absolute top-0 left-0 z-[57] pointer-events-none grayscale opacity-40 border-2 border-dashed border-red-300/70 ${item.isCircular ? 'rounded-full' : 'rounded-sm'} overflow-hidden`}
                                            style={{
                                                transform: `translate(${occupancyFeedbackForItem.targetX}px, ${occupancyFeedbackForItem.targetY}px) rotate(${item.rotation}deg)`,
                                                width: `${item.width}px`,
                                                height: `${item.height}px`,
                                            }}
                                        >
                                            {isToken && (
                                                <div
                                                    className="w-full h-full"
                                                    style={{
                                                        backgroundImage: item.img ? `url("${item.img}")` : 'none',
                                                        backgroundPosition: 'center',
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundSize: item.isCircular ? 'cover' : 'contain'
                                                    }}
                                                />
                                            )}
                                            {isGeometry && (
                                                <div
                                                    className={`w-full h-full flex items-center justify-center font-bold text-white shadow-inner uppercase text-[10px] tracking-widest break-words overflow-hidden p-2 text-center`}
                                                    style={{
                                                        backgroundColor: item.backgroundColor || '#22c55e',
                                                        opacity: item.opacity || 0.4,
                                                        borderRadius: item.isCircular ? '50%' : '4px',
                                                        border: `2px solid ${item.backgroundColor || '#22c55e'}`,
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    <span style={{ opacity: 1, textShadow: '0px 0px 4px black', pointerEvents: 'none' }}>{item.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )
                                : null;

                            return (
                                <>
                                    {ghostPreview}
                                    {blockedPlacement}
                                </>
                            );
                        })()}
                    </>
                )}

                <motion.div
                    data-board-item-id={item.id}
                    onMouseDown={(e) => {
                        if (e.button === 2) return; // Ignorar clic derecho para evitar conflictos de arrastre
                        if (isScenePickup) setShowSettings(false);
                        if (canInteract) handleTokenMouseDown(e, item);
                    }}
                    onTouchStart={(e) => {
                        if (!canInteract) return;
                        if (isScenePickup) setShowSettings(false);

                        const now = Date.now();
                        const lastTap = lastTokenTapTimesRef?.current?.[item.id] || 0;
                        if (lastTokenTapTimesRef?.current) {
                            lastTokenTapTimesRef.current[item.id] = now;
                        }

                        if (now - lastTap < 350 && !isScenePickup) {
                            const hasPermission = !isPlayerView || isCard || isCardContainer || isBoardMarker || isBoardDie ||
                                (Array.isArray(item.controlledBy) ? item.controlledBy.includes(playerName) : item.controlledBy === playerName) ||
                                item.ownerName === playerName;
                            if (hasPermission) {
                                e.stopPropagation();
                                setSelectedTokenIds([item.id]);
                                lastSelectedIdRef.current = item.id;
                                setActiveTab('INSPECTOR');
                                setShowSettings(true);
                                return;
                            }
                        }

                        handleTokenMouseDown(e, item);
                    }}
                    onContextMenu={(e) => {
                        if (isCard && canInteract) {
                            e.preventDefault();
                            e.stopPropagation();
                            const now = Date.now();
                            const lastFlip = lastFlipTimesRef.current[item.id] || 0;
                            if (now - lastFlip < 350) return;
                            lastFlipTimesRef.current[item.id] = now;
                            updateItem(item.id, { faceDown: !item.faceDown }, true);
                        }
                    }}
                    onDoubleClick={(e) => {
                        if (!canInteract) return;
                        if (isScenePickup) return;

                        // RESTRICCIÓN: Solo abrir inspector si el jugador es dueño del token (o es Master)
                        const hasPermission = !isPlayerView || isScenePickup || isCard || isCardContainer || isBoardMarker || isBoardDie ||
                            (Array.isArray(item.controlledBy) ? item.controlledBy.includes(playerName) : item.controlledBy === playerName) ||
                            item.ownerName === playerName;
                        if (!hasPermission) return;

                        e.stopPropagation();
                        setSelectedTokenIds([item.id]);
                        lastSelectedIdRef.current = item.id;
                        setActiveTab('INSPECTOR');
                        setShowSettings(true);
                    }}
                    initial={false}
                    animate={{
                        x: renderPlacement.x,
                        y: isLootDropTarget ? (renderPlacement.y - 8) : renderPlacement.y,
                        scale: isLootDropTarget ? 1.06 : (isBeingDragged ? 1.15 : 1),
                        rotate: item.rotation || 0,
                        opacity: motionOpacity,
                    }}
                    transition={isLootDropTarget ? { type: 'spring', stiffness: 480, damping: 24 } : itemMotionTransition}
                    style={{
                        width: `${item.width}px`,
                        height: `${item.height}px`,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        pointerEvents: canInteract ? 'auto' : 'none',
                        cursor: (targetingState && isToken) ? 'crosshair' : (canInteract ? 'grab' : 'default'),
                        touchAction: (isBoardMode && isCard) || isScenePickup ? 'none' : undefined,
                        zIndex: isBeingDragged
                            ? 1000
                            : isLootDropTarget
                                ? 50
                                : isBoardDie
                                    ? 80
                                    : isBoardMarker
                                        ? 30 + itemOrderIndex
                                        : isScenePickup
                                            ? 34
                                        : isLight
                                            ? 10
                                            : isGeometry
                                                ? 15
                                                : isCardContainer
                                                    ? 17
                                                    : isCard
                                                        ? 18
                                                        : 20,
                        transformOrigin: 'center center',
                        willChange: shouldPromoteItemLayer || isLootDropTarget || isBeingDragged ? 'transform, opacity' : 'auto'
                    }}
                    className="group"
                >
                    <div id={`token-inner-wrapper-${item.id}`} className={`w-full h-full relative ${item.isCircular ? 'rounded-full' : 'rounded-sm'} ${isLootDropTarget ? 'ring-2 ring-[#c8aa6e]/80 shadow-[0_12px_24px_rgba(0,0,0,0.85)]' : ''} ${draggedTokenId === item.id ? (isBoardDie ? 'scale-105' : 'scale-105 shadow-2xl') : ''} ${isBoardDie ? '' : 'transition-transform'}`}>
                        <div className={`absolute -inset-1 z-50 pointer-events-none ${isBoardDie || isScenePickup ? 'opacity-0' : 'border-2 border-[#c8aa6e]'} ${item.isCircular ? 'rounded-full' : 'rounded-sm'} transition-opacity ${isScenePickup ? '' : (isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')}`}>
                            {/* Indicador de Compartido (Izquierda) */}
                            {isToken && item.controlledBy?.length > 0 && (
                                <div className="absolute -top-[1px] -left-[1px] -translate-x-1/2 -translate-y-1/2 bg-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.4)] text-[#0b1120] rounded-full p-0.5 border border-white/20 flex items-center justify-center z-40 pointer-events-none">
                                    <Users size={8} />
                                </div>
                            )}

                            {/* Indicador de Velocidad (Derecha) */}
                            {isToken && (() => {
                                const currentVel = item.velocidad || 0;
                                const pendingVel = (isPlayerView && pendingStateForItem)
                                    ? (pendingStateForItem.moveCost + pendingStateForItem.actionCost)
                                    : 0;
                                const totalVel = currentVel + pendingVel;

                                if (totalVel <= 0) return null;

                                return (
                                    <div className={`absolute -top-[1px] -right-[1px] translate-x-1/2 -translate-y-1/2 w-[16px] h-[16px] flex flex-col items-center justify-center rounded-full shadow-[0_0_10px_rgba(200,170,110,0.4)] border border-white/20 z-40 pointer-events-none ${pendingVel > 0 ? 'bg-[#ef4444]' : 'bg-[#c8aa6e]'} transition-colors`}>
                                        <span className={`text-[8px] font-black leading-none font-mono ${pendingVel > 0 ? 'text-white' : 'text-[#0b1120]'}`}>
                                            {totalVel}
                                        </span>
                                    </div>
                                );
                            })()}

                            {/* Estados (Sidebar Izquierda - Distribuidos verticalmente) */}
                            {/* Estados (Sidebar Izquierda - Distribuidos verticalmente) */}
                            {(() => {
                                const visibleStatusIds = normalizeTokenStatusIds(item.status || [])
                                    .filter((statusId) => DEFAULT_STATUS_EFFECTS[statusId]);
                                if (visibleStatusIds.length === 0) return null;

                                const isLargeToken = item.width > gridConfig.cellWidth || item.height > gridConfig.cellHeight;
                                const maxStatuses = isLargeToken ? 6 : 3;
                                const hasSharedIcon = item.controlledBy?.length > 0;

                                // Apilados siempre de arriba a abajo (justify-start)
                                // Tokens grandes (2x2+): Muestran hasta 6 gap-1
                                // Tokens pequeños (1x1): Muestran hasta 3 gap-1 (para que quepan bien sin justify-between forzado)
                                const statusCount = Math.min(visibleStatusIds.length, maxStatuses);
                                const isFull = statusCount === maxStatuses;

                                let layoutClasses = '';
                                if (isLargeToken) {
                                    layoutClasses = isFull
                                        ? (hasSharedIcon ? '-top-[1px] h-[calc(100%+6px)] pt-2.5 justify-between' : '-top-2 h-[calc(100%+8px)] justify-between')
                                        : (hasSharedIcon ? '-top-[1px] pt-2.5 justify-start gap-1' : '-top-2 justify-start gap-1');
                                } else {
                                    layoutClasses = isFull
                                        ? (hasSharedIcon ? '-top-[1px] h-[calc(100%+6px)] pt-2.5 justify-between' : '-top-3.5 h-[calc(100%+12px)] justify-between')
                                        : (hasSharedIcon ? '-top-[1px] pt-2.5 justify-start gap-[5px]' : '-top-3.5 justify-start gap-[5px]');
                                }

                                return (
                                    <div className={`absolute -left-[1px] -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none ${layoutClasses}`}>
                                        {visibleStatusIds.slice(0, maxStatuses).map(statusId => {
                                            const effect = DEFAULT_STATUS_EFFECTS[statusId];
                                            if (!effect) return null;
                                            const Icon = ICON_MAP[effect.iconName] || ICON_MAP.AlertCircle;
                                            return (
                                                <div key={statusId} className="relative w-3 h-3 shrink-0 aspect-square bg-[#0b1120] rounded-full border border-white/20 shadow-sm" style={{ borderColor: effect.hex || '#c8aa6e', color: effect.hex || '#c8aa6e' }}>
                                                    <Icon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[7px] h-[7px]" strokeWidth={2.5} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {isCard && cardStackCount > 0 && (
                            <div className="absolute -right-3 -top-3 z-[70] rounded-full border border-[#c8aa6e]/70 bg-black/90 px-2.5 py-1 text-[10px] font-black text-[#f8e7b9] shadow-[0_0_16px_rgba(200,170,110,0.28)] pointer-events-none">
                                x{cardStackCount + 1}
                            </div>
                        )}

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

                        {isScenePickup ? (
                            <ScenePickupVisual
                                item={item}
                                isSelected={isSelected}
                                isDragging={draggedTokenId === item.id}
                                selectedLootItems={selectedLootItems}
                                isPrimarySelectedLoot={isPrimarySelectedLoot}
                                glossary={glossary}
                                rarityColorMap={rarityColorMap}
                            />
                        ) : isLight ? (
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
                        ) : isGeometry ? (
                            <div
                                className={`relative w-full h-full flex items-center justify-center font-bold text-white uppercase text-[10px] tracking-widest break-words overflow-hidden p-2 text-center`}
                                style={{
                                    borderRadius: item.shapeType === 'circle' ? '50%' : '4px',
                                    border: normalizeGeometryKind(item) === 'rect' || normalizeGeometryKind(item) === 'circle'
                                        ? `2px solid ${item.backgroundColor || '#22c55e'}`
                                        : 'none',
                                    backgroundColor: normalizeGeometryKind(item) === 'rect' || normalizeGeometryKind(item) === 'circle'
                                        ? item.backgroundColor || '#22c55e'
                                        : 'transparent',
                                    opacity: normalizeGeometryKind(item) === 'rect' || normalizeGeometryKind(item) === 'circle'
                                        ? item.opacity || 0.4
                                        : 1,
                                    pointerEvents: 'none'
                                }}
                            >
                                {renderGeometryVisual(item)}
                                {(normalizeGeometryKind(item) === 'rect' || normalizeGeometryKind(item) === 'circle') && (
                                    <span style={{ opacity: 1, textShadow: '0px 0px 4px black', pointerEvents: 'none' }}>{item.name}</span>
                                )}
                            </div>
                        ) : isBoardMarker ? (
                            <BoardMarkerVisual
                                marker={item}
                                stackIndex={boardMarkerStackIndex}
                                isDragging={draggedTokenId === item.id}
                            />
                        ) : isBoardDie ? (
                            <BoardDieVisual
                                die={item}
                                isDragging={draggedTokenId === item.id}
                                currentDieRollSpeed={item.dieLaunchMode ? currentDieRollSpeed : 0}
                                dragDirection={dragDirection}
                            />
                        ) : isCardContainer ? (
                            <div
                                className={`relative w-full h-full overflow-visible rounded-md border border-dashed bg-transparent ${containerCardsAreHidden ? 'border-violet-400/70 shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_0_24px_rgba(167,139,250,0.16)]' : 'border-[#c8aa6e]/55 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]'}`}
                            >
                                <div className={`absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 rounded-tl-md pointer-events-none ${containerCardsAreHidden ? 'border-violet-300/85' : 'border-[#c8aa6e]/80'}`} />
                                <div className={`absolute -right-px -top-px h-5 w-5 border-r-2 border-t-2 rounded-tr-md pointer-events-none ${containerCardsAreHidden ? 'border-violet-300/85' : 'border-[#c8aa6e]/80'}`} />
                                <div className={`absolute -bottom-px -left-px h-5 w-5 border-b-2 border-l-2 rounded-bl-md pointer-events-none ${containerCardsAreHidden ? 'border-violet-300/85' : 'border-[#c8aa6e]/80'}`} />
                                <div className={`absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 rounded-br-md pointer-events-none ${containerCardsAreHidden ? 'border-violet-300/85' : 'border-[#c8aa6e]/80'}`} />
                                <div className="absolute left-2 top-2 flex items-center gap-2 pointer-events-none">
                                    <span className={`rounded px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] shadow ${containerCardsAreHidden ? 'bg-violet-950/80 text-violet-100' : 'bg-black/70 text-[#f8e7b9]'}`}>
                                        {item.name || 'Tablero'}
                                    </span>
                                    {containerItemCount !== null && (
                                        <span className="rounded-full border border-[#c8aa6e]/45 bg-black/75 px-2 py-0.5 text-[9px] font-black text-[#f8e7b9] shadow">
                                            {containerItemCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : isCard ? (
                            <div className="w-full h-full relative" style={{ perspective: 900 }}>
                                <div
                                    className="absolute inset-0 rounded-md transition-transform duration-500 ease-out"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: item.faceDown ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 rounded-md overflow-hidden border border-[#c8aa6e]/70 bg-[#050810] shadow-[0_10px_30px_rgba(0,0,0,0.55)] ring-1 ring-black/60"
                                        style={{ backfaceVisibility: 'hidden' }}
                                    >
                                        {(item.frontImage || item.img) ? (
                                            <CardImageWithLoader
                                                src={item.frontImage || item.img}
                                                label={item.name || 'Carta'}
                                                className="absolute inset-0 w-full h-full"
                                                imageClassName="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-slate-500" />
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-5 pointer-events-none">
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-[#f8e7b9] truncate text-center drop-shadow">
                                                {item.name}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="absolute inset-0 rounded-md overflow-hidden border border-[#c8aa6e]/70 bg-[#050810] shadow-[0_10px_30px_rgba(0,0,0,0.55)] ring-1 ring-black/60"
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            transform: 'rotateY(180deg)'
                                        }}
                                    >
                                        <CardImageWithLoader
                                            src={item.backImage || DEFAULT_CARD_BACK_URL}
                                            label={`${item.name || 'Carta'} reverso`}
                                            className="absolute inset-0 w-full h-full"
                                            imageClassName="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-5 pointer-events-none">
                                            <div className="text-[7px] font-black uppercase tracking-[0.18em] text-[#f8e7b9] truncate text-center drop-shadow">
                                                Carta oculta
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            item.isCircular ? (
                                <TokenImageWithLoader
                                    src={item.img}
                                    label={item.name || 'Token'}
                                    className="w-full h-full rounded-full border-2 border-[#c8aa6e] shadow-[0_0_12px_rgba(200,170,110,0.4)]"
                                    imageClassName="w-full h-full object-cover"
                                />
                            ) : (
                                <TokenImageWithLoader
                                    src={item.img}
                                    label={item.name || 'Token'}
                                    className="w-full h-full"
                                    imageClassName="w-full h-full object-contain drop-shadow-lg"
                                />
                            )
                        )}

                        {/* Recursos (HUD) - Solo para tokens, no luces ni geometria */}
                        {isToken && canInteract && (
                            <TokenHUD
                                stats={item.stats}
                                width={item.width}
                                height={item.height}
                                isSelected={isSelected}
                            />
                        )}


                        {/* MOVEMENT DISTANCE INDICATOR (Solo para tokens al arrastrar) */}
                        {isToken && canInteract && tokenOriginalPos[item.id] && (
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

                        {/* Nombre / Pila */}
                        {isCardContainer && containerCardItems.length > 0 ? (
                            <div className={`absolute top-[calc(100%+0.75rem)] left-1/2 -translate-x-1/2 z-[70] w-[calc((22px*6)+(0.375rem*5))] max-w-[calc(100vw-2rem)] transition-opacity ${isSelected || 'group-hover:opacity-100 opacity-0'}`}>
                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                    {containerCardItems.map((containedCard) => {
                                        const cardImage = getCardDisplayImage(containedCard);
                                        return (
                                            <button
                                                key={containedCard.id}
                                                onMouseDown={(event) => {
                                                    consumeCardStackQuickActionEvent(event);
                                                    removeCardFromContainer(item.id, containedCard.id);
                                                }}
                                                onTouchStart={(event) => {
                                                    consumeCardStackQuickActionEvent(event);
                                                    removeCardFromContainer(item.id, containedCard.id);
                                                }}
                                                onClick={consumeCardStackQuickActionEvent}
                                                className="relative h-8 w-[22px] overflow-hidden rounded-sm border border-[#c8aa6e]/55 bg-slate-600 shadow-[0_5px_14px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-1 hover:border-[#f8e7b9] active:scale-95"
                                                title={`Sacar ${containedCard.name || 'carta'}`}
                                            >
                                                {cardImage ? (
                                                    <CardImageWithLoader
                                                        src={cardImage}
                                                        label={containedCard.name || 'Carta en contenedor'}
                                                        className="absolute inset-0 h-full w-full"
                                                        imageClassName="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full bg-slate-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : !isCard && !isCardContainer && !isBoardMarker && !isBoardDie && !isScenePickup ? (
                            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 transition-opacity ${isSelected || 'group-hover:opacity-100 opacity-0'}`}>
                                <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full border border-slate-600 block shadow-sm backdrop-blur-sm">
                                    {item.name}
                                </span>
                            </div>
                        ) : cardStackItems.length > 0 ? (
                            <div className={`absolute top-[calc(100%+0.75rem)] left-1/2 -translate-x-1/2 z-[70] w-[calc((22px*6)+(0.375rem*5))] max-w-[calc(100vw-2rem)] transition-opacity ${isSelected || 'group-hover:opacity-100 opacity-0'}`}>
                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                    {cardStackItems.map((stackCard) => {
                                        const stackImage = getCardDisplayImage(stackCard);
                                        return (
                                            <button
                                                key={stackCard.id}
                                                onMouseDown={(event) => {
                                                    consumeCardStackQuickActionEvent(event);
                                                    unstackSpecificCard(item.id, stackCard.id);
                                                }}
                                                onTouchStart={(event) => {
                                                    consumeCardStackQuickActionEvent(event);
                                                    unstackSpecificCard(item.id, stackCard.id);
                                                }}
                                                onClick={consumeCardStackQuickActionEvent}
                                                className="relative h-8 w-[22px] overflow-hidden rounded-sm border border-[#c8aa6e]/55 bg-slate-600 shadow-[0_5px_14px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-1 hover:border-[#f8e7b9] active:scale-95"
                                                title={`Sacar ${stackCard.name || 'carta'}`}
                                            >
                                                {stackImage ? (
                                                    <CardImageWithLoader
                                                        src={stackImage}
                                                        label={stackCard.name || 'Carta en pila'}
                                                        className="absolute inset-0 h-full w-full"
                                                        imageClassName="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full bg-slate-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}

                        {/* Controles de Acción */}
                        {(!isPlayerView || ((isCard || isCardContainer || isBoardMarker || isBoardDie) && canInteract) || (item.controlledBy && Array.isArray(item.controlledBy) && item.controlledBy.includes(playerName))) && (
                            <div className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/90 rounded-full px-2 py-1 transition-opacity z-50 shadow-xl border border-[#c8aa6e]/30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto'}`}>
                                {!isScenePickup && <button
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        if (isBoardDie) {
                                            updateItem(item.id, { dieLaunchMode: !item.dieLaunchMode }, true);
                                        } else if (isCard) {
                                            const now = Date.now();
                                            const lastFlip = lastFlipTimesRef.current[item.id] || 0;
                                            if (now - lastFlip < 350) return;
                                            lastFlipTimesRef.current[item.id] = now;
                                            updateItem(item.id, { faceDown: !item.faceDown }, true);
                                        } else {
                                            rotateItem(item.id, 45);
                                        }
                                    }}
                                    onTouchStart={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (isBoardDie) {
                                            updateItem(item.id, { dieLaunchMode: !item.dieLaunchMode }, true);
                                        } else if (isCard) {
                                            const now = Date.now();
                                            const lastFlip = lastFlipTimesRef.current[item.id] || 0;
                                            if (now - lastFlip < 350) return;
                                            lastFlipTimesRef.current[item.id] = now;
                                            updateItem(item.id, { faceDown: !item.faceDown }, true);
                                        } else {
                                            rotateItem(item.id, 45);
                                        }
                                    }}
                                    className={`p-1 rounded-full transition-colors ${isBoardDie && item.dieLaunchMode ? 'text-[#facc15] hover:text-[#ffe66d]' : 'text-[#c8aa6e] hover:text-[#f0e6d2] hover:bg-[#c8aa6e]/10'}`}
                                    title={isBoardDie ? (item.dieLaunchMode ? 'Modo lanzamiento activo' : 'Modo mover dado') : isCard ? 'Voltear carta' : 'Rotar 45°'}
                                >
                                    {isBoardDie ? (item.dieLaunchMode ? <HandGrab size={12} fill="currentColor" strokeWidth={2.2} /> : <Hand size={12} />) : <RotateCw size={12} />}
                                </button>}
                                {!isScenePickup && <div className="w-3 h-3 bg-[#c8aa6e] rounded-full mx-1 cursor-grab active:cursor-grabbing hover:scale-125 transition-transform border border-[#0b1120]" onMouseDown={(e) => handleRotationMouseDown(e, item)} onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleRotationMouseDown(e, item); }} />}
                                <button
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteItem(item.id);
                                    }}
                                    className="text-red-400 hover:text-red-200 p-1 hover:bg-red-900/30 rounded-full transition-colors"
                                    aria-label="Eliminar token"
                                    title="Eliminar token"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        )}

                        {/* Resize Handle */}
                        {canShowResizeHandle && (
                            <>
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, item)}
                                    className="absolute -bottom-1 -right-1 hidden h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-[#c8aa6e] shadow-sm transition-transform hover:scale-125 md:block z-50"
                                />
                                <div
                                    onTouchStart={(e) => handleResizeMouseDown(e, item)}
                                    className="absolute -bottom-3 -right-3 flex h-8 w-8 items-end justify-end cursor-nwse-resize z-50 touch-none select-none md:hidden"
                                    style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                                >
                                    <span className="block h-3 w-3 rounded-sm border border-white bg-[#c8aa6e] shadow-sm" />
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </React.Fragment>
        );
    };

    return renderItemJSX;
};
