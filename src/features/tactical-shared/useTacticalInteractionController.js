import { useRef } from 'react';
import { getBoardDieLaunchGesture } from '../../utils/boardDicePhysics';
import {
    detachCardFromContainer, getCardStackIds, isCardContainerItem,
    isCardHiddenByContainerForPlayer, isCardItem, isStackedCardItem,
    moveCardIntoContainer, snapCardRotationAngle, stackCardOnTarget,
} from '../../utils/cardBoard';
import {
    areCombatOccupancyFeedbacksEqual, canOccupyCombatCell, getCardCenter,
    getCombatOccupancyFeedbackForMove, getCombatRenderPlacement, getItemOverlapRatio, isBoardDieItem,
    isBoardMarkerItem, isCombatTokenItem, isPointInsideExpandedItem,
    isValidSelectionBox,
} from './legacyCombatRules';
import { WORLD_SIZE, lineRectIntersect, linesIntersect, snapWorldPositionToGrid } from './spatial';
import { canControlToken, isCanvasCombatRoundActive } from './tokenControlUtils';

/** Handles rule-neutral pointer, touch, selection and drag transactions. */
export const useCanvasInteractionController = ({
    activeLayer,
    activeScenario,
    activeScenarioRef,
    applySangradoSpeedPenalty,
    boardCardHandTransferRef,
    cardPreviewSuppressTouchEndRef,
    cardStackQuickActionBlockUntilRef,
    combatRuntime,
    containerRef,
    currentDieRollSpeed,
    divToWorld,
    dragStartRef,
    draggedTokenId,
    draggedTokenIdRef,
    draggingWallHandle,
    findCardContainerDropTarget,
    findCardStackDropTarget,
    getBoardDieRollBounds,
    getEventCoords,
    getScenePickupRenderPlacement,
    gridConfig,
    handleModeItemDrop,
    isBoardMode,
    isDragging,
    isDrawingWall,
    isPlayerView,
    isPointInsideBoardHand,
    isScenePickupItem,
    lastSelectedIdRef,
    moveBoardCardToHand,
    offset,
    pendingTurnState,
    playerName,
    queueDieLaunchFeedback,
    queueSangradoSpeedAnimation,
    recentLocalWritesRef,
    resetDieLaunchFeedback,
    resizeStartRef,
    resizingTokenId,
    rollBoardDie,
    rotatingTokenId,
    safePersistItems,
    selectedTokenIds,
    selectedTokenIdsRef,
    selectionBox,
    setActiveScenario,
    setCombatOccupancyFeedback,
    setDragVisualOrigin,
    setDraggedTokenId,
    setDraggingWallHandle,
    setIsDragging,
    setLoadingRotation,
    setOffset,
    setPendingTurnState,
    setResizingTokenId,
    setRotatingTokenId,
    setSelectedTokenIds,
    setSelectionBox,
    setTokenOriginalPos,
    setWallDrawingCurrent,
    setWallDrawingStart,
    setZoom,
    snapToWallEndpoints,
    suppressBoardHandHoverAfterTransfer,
    tokenDragStart,
    tokenOriginalPos,
    tokenOriginalPosRef,
    wallDrawingCurrent,
    wallDrawingStart,
    zoom,
}) => {
const lastPinchDist = useRef(null);
    const lastTouchPos = useRef({ x: 0, y: 0 });
    const isCanvasCombatActive = !isBoardMode && isCanvasCombatRoundActive(activeScenario);

    const getTouchDistance = (touches) => {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    };

    const handleTouchStart = (e) => {
        if (e.target?.closest?.('[data-board-item-id], [data-board-hand-card-slot="true"]')) {
            return;
        }

        if (e.touches.length === 2) {
            if (e.cancelable) e.preventDefault();
            // Start Pinch
            setIsDragging(false);
            lastPinchDist.current = getTouchDistance(e.touches);
        } else if (e.touches.length === 1) {
            if (e.cancelable) e.preventDefault();
            // Start Pan
            const touch = e.touches[0];
            setIsDragging(true);
            dragStartRef.current = { x: touch.clientX, y: touch.clientY };
            lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        }
    };

    const handleTouchMove = (e) => {
        if (e.target?.closest?.('[data-board-item-id], [data-board-hand-card-slot="true"]')) {
            return;
        }

        if (draggedTokenId || rotatingTokenId || resizingTokenId || draggingWallHandle || selectionBox || isDrawingWall) {
            if (e.cancelable) e.preventDefault();
            handleMouseMove(e);
            return;
        }

        if (e.touches.length === 2 && lastPinchDist.current !== null) {
            if (e.cancelable) e.preventDefault();
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
            if (e.cancelable) e.preventDefault();
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

    const handleTouchEnd = (e) => {
        if (draggedTokenId || rotatingTokenId || resizingTokenId || draggingWallHandle || selectionBox || isDrawingWall) {
            handleMouseUp(e);
            return;
        }

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

const handleMouseMove = (e) => {
        const { x: curX, y: curY } = getEventCoords(e, tokenDragStart.identifier);

        // --- SELECTION BOX ---
        if (selectionBox) {
            setSelectionBox(prev => (
                isValidSelectionBox(prev)
                    ? { ...prev, current: { x: curX, y: curY } }
                    : null
            ));
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
            if (
                wall &&
                ((draggingWallHandle.handleIndex === 1 && wall.x1 === snappedPos.x && wall.y1 === snappedPos.y) ||
                    (draggingWallHandle.handleIndex !== 1 && wall.x2 === snappedPos.x && wall.y2 === snappedPos.y))
            ) {
                return;
            }

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

            // 4. Calcular ngulo
            const deltaX = curX - tokenScreenX;
            const deltaY = curY - tokenScreenY;

            let angleDeg = (Math.atan2(deltaY, deltaX) * 180 / Math.PI) + 90;
            if (isCardItem(token) || token.type === 'geometry') {
                angleDeg = snapCardRotationAngle(angleDeg);
            }

            setLoadingRotation(angleDeg); // Update Rotation
            if (token.rotation === angleDeg) return;

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
            const draggedItem = currentScenario.items.find(item => item.id === draggedTokenId);
            if (isBoardMode && isBoardDieItem(draggedItem) && draggedItem.dieLaunchMode) {
                if (e.cancelable) e.preventDefault();
                const gesture = getBoardDieLaunchGesture({
                    deltaX: curX - tokenDragStart.x,
                    deltaY: curY - tokenDragStart.y,
                    dieWidth: (draggedItem.width || 48) * zoom,
                    dieHeight: (draggedItem.height || 48) * zoom,
                });
                queueDieLaunchFeedback(gesture.tension, gesture.directionDegrees);
                return;
            }
        }

        if (draggedTokenId && activeScenarioRef.current) {
            const currentScenario = activeScenarioRef.current;
            // Lógica de arrastre de TOKENS (Multiples)
            const deltaX = (curX - tokenDragStart.x) / zoom;
            const deltaY = (curY - tokenDragStart.y) / zoom;
            const selectedContainerIds = new globalThis.Set(
                currentScenario.items
                    .filter(item => selectedTokenIds.includes(item.id) && isCardContainerItem(item))
                    .map(item => item.id)
            );
            const selectedContainers = currentScenario.items
                .filter(item => selectedContainerIds.has(item.id) && isCardContainerItem(item));
            const draggedItemForMove = currentScenario.items.find(item => item.id === draggedTokenId);
            const isLaunchingBoardDieDrag = isBoardMode && isBoardDieItem(draggedItemForMove) && draggedItemForMove.dieLaunchMode;

            let nextCombatOccupancyFeedback = null;
            let hasDragPositionChange = false;
            const newItems = currentScenario.items.map(item => {
                const movesWithSelectedContainer = isCardItem(item) && selectedContainerIds.has(item.containerId);
                const markerMovesWithSelectedContainer = isBoardMarkerItem(item) && selectedContainers.some(container => (
                    item.zone === 'board' &&
                    isPointInsideExpandedItem(getCardCenter(item), container, 0)
                ));
                const movesInDragGroup = Object.prototype.hasOwnProperty.call(tokenOriginalPos, item.id);
                if (selectedTokenIds.includes(item.id) || movesWithSelectedContainer || markerMovesWithSelectedContainer || movesInDragGroup) {
                    const original = tokenOriginalPos[item.id] || { x: item.x, y: item.y };
                    let newX, newY;

                    if (isLaunchingBoardDieDrag) {
                        // Mecánica de tirachinas: el dado queda fijo mientras se carga tensión.
                        newX = original.x;
                        newY = original.y;
                    } else {
                        newX = original.x + deltaX;
                        newY = original.y + deltaY;
                    }

                    // Protección contra NaN/Infinity en móvil (Evita que las luces se 'apaguen' al salir del mundo)
                    if (!Number.isFinite(newX) || !Number.isFinite(newY)) return item;

                    // El item puede tener su propia configuración de snap, si no, usa la global
                    const shouldSnap = item.snapToGrid !== undefined ? item.snapToGrid : gridConfig.snapToGrid;

                    if (shouldSnap) {
                        const snappedPosition = snapWorldPositionToGrid(
                            { x: newX, y: newY },
                            gridConfig,
                            { width: item.width, height: item.height },
                            { centerInCell: isCombatTokenItem(item) }
                        );
                        newX = snappedPosition.x;
                        newY = snappedPosition.y;
                    }

                    if (
                        activeLayer === 'TABLETOP' &&
                        isCombatTokenItem(item)
                    ) {
                        const occupancyFeedback = getCombatOccupancyFeedbackForMove({
                            tokenId: item.id,
                            movingToken: item,
                            nextX: newX,
                            nextY: newY,
                            items: currentScenario.items,
                            config: gridConfig,
                            excludeIds: selectedTokenIds.filter((id) => id !== item.id),
                        });

                        if (occupancyFeedback) {
                            if (!nextCombatOccupancyFeedback || item.id === draggedTokenId) {
                                nextCombatOccupancyFeedback = occupancyFeedback;
                            }
                            if (item.x !== newX || item.y !== newY) hasDragPositionChange = true;
                            return { ...item, x: newX, y: newY };
                        }
                    }

                    // Si es un muro, desplazamos sus puntos
                    if (item.type === 'wall') {
                        const dx = newX - item.x;
                        const dy = newY - item.y;
                        if (dx !== 0 || dy !== 0) hasDragPositionChange = true;
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

                    if (item.x !== newX || item.y !== newY) hasDragPositionChange = true;
                    return { ...item, x: newX, y: newY };
                }
                return item;
            });
            setCombatOccupancyFeedback(prev => (
                areCombatOccupancyFeedbacksEqual(prev, nextCombatOccupancyFeedback) ? prev : nextCombatOccupancyFeedback
            ));

            // LOGIC ADDED: Update pending cost LIVE while dragging (ONLY for players)
            if (isCanvasCombatActive && isPlayerView && draggedTokenId) {
                const draggedItem = newItems.find(i => i.id === draggedTokenId);
                const original = tokenOriginalPos[draggedTokenId];
                const isBlockedCombatDestination = nextCombatOccupancyFeedback?.tokenId === draggedTokenId;

                if (draggedItem && original && !isBlockedCombatDestination) {
                    setPendingTurnState(prev => {
                        const isSameToken = prev && prev.tokenId === draggedTokenId;
                        const turnStartX = isSameToken
                            ? prev.startX
                            : (Number.isFinite(Number(original.turnStartX)) ? Number(original.turnStartX) : original.x);
                        const turnStartY = isSameToken
                            ? prev.startY
                            : (Number.isFinite(Number(original.turnStartY)) ? Number(original.turnStartY) : original.y);

                        const dx = Math.abs(draggedItem.x - turnStartX);
                        const dy = Math.abs(draggedItem.y - turnStartY);
                        const cellW = gridConfig.cellWidth || 50;
                        const cellH = gridConfig.cellHeight || 50;
                        const distance = Math.max(Math.round(dx / cellW), Math.round(dy / cellH));
                        const actionCost = isSameToken ? (Number(prev.actionCost) || 0) : 0;
                        const hasActions = isSameToken && Array.isArray(prev.actions) && prev.actions.length > 0;

                        if (distance <= 0 && actionCost <= 0 && !hasActions) return null;

                        const base = isSameToken ? prev : {
                            tokenId: draggedTokenId,
                            startX: turnStartX,
                            startY: turnStartY,
                            x: original.x,
                            y: original.y,
                            actionCost,
                            actions: []
                        };

                        // Avoid update if cost hasn't changed to key performance reasonable
                        if (isSameToken && prev.moveCost === distance && prev.x === draggedItem.x && prev.y === draggedItem.y) return prev;

                        return {
                            ...base,
                            x: draggedItem.x,
                            y: draggedItem.y,
                            moveCost: distance
                        };
                    });
                }
            }

            // --- ACTUALIZAR FUERZA DE LANZAMIENTO (DADOS) ---
            if (isBoardMode && draggedTokenId) {
                const draggedItem = newItems.find(i => i.id === draggedTokenId);
                if (isBoardDieItem(draggedItem) && draggedItem.dieLaunchMode) {
                    const gesture = getBoardDieLaunchGesture({
                        deltaX: curX - tokenDragStart.x,
                        deltaY: curY - tokenDragStart.y,
                        dieWidth: (draggedItem.width || 48) * zoom,
                        dieHeight: (draggedItem.height || 48) * zoom,
                    });
                    queueDieLaunchFeedback(
                        gesture.tension,
                        gesture.directionDegrees
                    );
                } else if (currentDieRollSpeed !== 0) {
                    resetDieLaunchFeedback();
                }
            } else if (currentDieRollSpeed !== 0) {
                resetDieLaunchFeedback();
            }

            if (hasDragPositionChange) {
                setActiveScenario(prev => ({ ...prev, items: newItems }));
            }
            return;
        }

        // --- Lógica de REDIMENSIÓN ---
        if (resizingTokenId && activeScenarioRef.current && resizeStartRef.current) {
            if (e.cancelable) e.preventDefault();
            const currentScenario = activeScenarioRef.current;
            const { startX, startY, startWidth, startHeight } = resizeStartRef.current;
            const resizePoint = getEventCoords(e, resizeStartRef.current.identifier ?? null);
            const deltaX = (resizePoint.x - startX) / zoom;
            const deltaY = (resizePoint.y - startY) / zoom; // Asumiendo aspect ratio libre o control

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

            if (item && item.width === newWidth && item.height === newHeight) return;

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

        // Lógica de paneo de CMARA
        const deltaX = curX - dragStartRef.current.x;
        const deltaY = curY - dragStartRef.current.y;

        setOffset(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
        }));

        dragStartRef.current = { x: curX, y: curY };
    };

    const getItemInteractionSnapshot = (item, extraFields = []) => {
        const snapshot = {};
        ['x', 'y', 'rotation', 'width', 'height', ...extraFields].forEach(field => {
            if (Object.prototype.hasOwnProperty.call(item, field)) {
                snapshot[field] = item[field];
            }
        });
        return snapshot;
    };

    const applyItemInteractionSnapshot = (item, original) => {
        if (!original) return item;

        return {
            ...item,
            ...Object.keys(original).reduce((fields, field) => {
                fields[field] = original[field];
                return fields;
            }, {})
        };
    };

    const startWallHandleDrag = (item, handleIndex) => {
        setTokenOriginalPos({
            [item.id]: getItemInteractionSnapshot(item, ['x1', 'y1', 'x2', 'y2'])
        });
        setDraggingWallHandle({ id: item.id, handleIndex });
    };

    const handleMouseUp = async (e) => {
        if (cardPreviewSuppressTouchEndRef.current) {
            setDraggedTokenId(null);
            setRotatingTokenId(null);
            setResizingTokenId(null);
            setDraggingWallHandle(null);
            setTokenOriginalPos({});
            setDragVisualOrigin({});
            setCombatOccupancyFeedback(null);
            document.body.style.cursor = 'default';
            return;
        }

        if (cardStackQuickActionBlockUntilRef.current > Date.now()) {
            setDraggedTokenId(null);
            setRotatingTokenId(null);
            setResizingTokenId(null);
            setDraggingWallHandle(null);
            setTokenOriginalPos({});
            setDragVisualOrigin({});
            setCombatOccupancyFeedback(null);
            document.body.style.cursor = 'default';
            return;
        }

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
                safePersistItems(activeScenario.id, updatedItems, activeScenario.items);
            }

            setWallDrawingStart(null);
            setWallDrawingCurrent(null);
            return;
        }

        // --- FINALIZAR SELECCIÓN BOX ---
        if (selectionBox && activeScenario) {
            if (!isValidSelectionBox(selectionBox)) {
                setSelectionBox(null);
                return;
            }

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
                    if (isStackedCardItem(item)) return false;
                    if (isCardHiddenByContainerForPlayer(item, activeScenario.items, isPlayerView)) return false;

                    const isLight = item.type === 'light';
                    const isWall = item.type === 'wall';
                    const isGeometry = item.type === 'geometry';
                    const isScenePickup = Boolean(isScenePickupItem?.(item));
                    const isCorrectLayer = activeLayer === 'LIGHTING' ? (isLight || isWall) : activeLayer === 'MAP' ? isGeometry : (!isLight && !isWall && !isGeometry);

                    if (!isCorrectLayer) return false;

                    // Restricción de Jugador: No permitir seleccionar tokens ajenos
                    if (isPlayerView && !isLight && !isWall && !isGeometry) {
                        const isSandboxItem = item.type === 'card' || item.type === 'card_container' || item.type === 'board_marker' || item.type === 'board_die' || isScenePickup;
                        const hasPermission = isSandboxItem || canControlToken(item, isPlayerView, playerName);
                        if (!hasPermission) return false;
                    } else if (isPlayerView && (isLight || isWall || isGeometry)) {
                        return false;
                    }

                    // Precise visual placement AABB intersection (matches exact screen slot for loot / duel tokens)
                    const placement = isScenePickup
                        ? (getScenePickupRenderPlacement?.(item, activeScenario.items, gridConfig) || { x: item.x, y: item.y })
                        : (isCombatTokenItem(item)
                            ? getCombatRenderPlacement(item, activeScenario.items, gridConfig)
                            : { x: item.x, y: item.y });

                    const itemW = Number(item.width) || gridConfig?.cellWidth || 50;
                    const itemH = Number(item.height) || gridConfig?.cellHeight || 50;
                    const itemX = Number(placement.x ?? item.x ?? 0);
                    const itemY = Number(placement.y ?? item.y ?? 0);

                    return (
                        itemX < selX + selW &&
                        itemX + itemW > selX &&
                        itemY < selY + selH &&
                        itemY + itemH > selY
                    );
                }).map(i => i.id);

                const isMultiSelectModifier = Boolean(e && (e.shiftKey || e.ctrlKey || e.metaKey));
                if (isMultiSelectModifier) {
                    setSelectedTokenIds(prev => [...new Set([...prev, ...newSelected])]);
                } else {
                    setSelectedTokenIds(newSelected);
                }
            }
            setSelectionBox(null);
            return;
        }

        if (draggingWallHandle && activeScenario) {
            const currentScenario = activeScenarioRef.current || activeScenario;
            const originalItems = currentScenario.items.map(item => {
                const original = tokenOriginalPos[item.id];
                return applyItemInteractionSnapshot(item, original);
            });
            safePersistItems(currentScenario.id, currentScenario.items, originalItems, [draggingWallHandle.id]);
            setDraggedTokenId(null);
            setRotatingTokenId(null);
            setResizingTokenId(null);
            setDraggingWallHandle(null);
            setTokenOriginalPos({});
            setDragVisualOrigin({});
            setCombatOccupancyFeedback(null);
            document.body.style.cursor = 'default';
            return;
        }

        // --- FINALIZAR ARRASTRE / ROTACIÓN / REDIMENSIÓN DE TOKENS ---
        if ((draggedTokenId || rotatingTokenId || resizingTokenId) && activeScenarioRef.current) {
            const currentScenario = activeScenarioRef.current;
            let finalItems = currentScenario.items;
            let didReorderBoardMarkerStack = false;
            const interactionOriginalItems = currentScenario.items.map(item => {
                const original = tokenOriginalPos[item.id];
                return applyItemInteractionSnapshot(item, original);
            });

            if (draggedTokenId) {
                const { x: releaseX, y: releaseY } = getEventCoords(e, tokenDragStart.identifier);
                const deltaX = (releaseX - tokenDragStart.x) / zoom;
                const deltaY = (releaseY - tokenDragStart.y) / zoom;
                const draggedItem = currentScenario.items.find(item => item.id === draggedTokenId);

                // --- NUEVO: Físicas de dados ---
                if (isBoardMode && isBoardDieItem(draggedItem) && draggedItem.dieLaunchMode) {
                    const screenDeltaX = releaseX - tokenDragStart.x;
                    const screenDeltaY = releaseY - tokenDragStart.y;
                    const gesture = getBoardDieLaunchGesture({
                        deltaX: screenDeltaX,
                        deltaY: screenDeltaY,
                        dieWidth: (draggedItem.width || 48) * zoom,
                        dieHeight: (draggedItem.height || 48) * zoom,
                    });
                    if (gesture.cancelled) {
                        setActiveScenario(prev => ({
                            ...prev,
                            items: prev.items.map(item => (
                                item.id === draggedTokenId && tokenOriginalPos[item.id]
                                    ? { ...item, x: tokenOriginalPos[item.id].x, y: tokenOriginalPos[item.id].y }
                                    : item
                            ))
                        }));
                        setDraggedTokenId(null);
                        setRotatingTokenId(null);
                        setResizingTokenId(null);
                        setTokenOriginalPos({});
                        setDragVisualOrigin({});
                        setCombatOccupancyFeedback(null);
                        resetDieLaunchFeedback();
                        document.body.style.cursor = 'default';
                        return;
                    }

                    rollBoardDie(draggedItem, {
                        velocity: gesture.velocity,
                        settleInPlace: false,
                        bounds: getBoardDieRollBounds(draggedItem),
                    });

                    setDraggedTokenId(null);
                    setRotatingTokenId(null);
                    setResizingTokenId(null);
                    setTokenOriginalPos({});
                    setDragVisualOrigin({});
                    setCombatOccupancyFeedback(null);
                    resetDieLaunchFeedback();
                    document.body.style.cursor = 'default';
                    return;
                }

                const selectedContainerIds = new globalThis.Set(
                    currentScenario.items
                        .filter(item => selectedTokenIds.includes(item.id) && isCardContainerItem(item))
                        .map(item => item.id)
                );
                const selectedContainers = currentScenario.items
                    .filter(item => selectedContainerIds.has(item.id) && isCardContainerItem(item));

                if (isBoardMode && isCardItem(draggedItem) && isPointInsideBoardHand({ x: releaseX, y: releaseY })) {
                    if (boardCardHandTransferRef.current !== draggedTokenId) {
                        boardCardHandTransferRef.current = draggedTokenId;
                        draggedTokenIdRef.current = null;
                        tokenOriginalPosRef.current = {};
                        suppressBoardHandHoverAfterTransfer({ x: releaseX, y: releaseY });
                        moveBoardCardToHand(draggedTokenId);
                    }
                    setDraggedTokenId(null);
                    setRotatingTokenId(null);
                    setResizingTokenId(null);
                    setTokenOriginalPos({});
                    setDragVisualOrigin({});
                    setCombatOccupancyFeedback(null);
                    document.body.style.cursor = 'default';
                    return;
                }

                finalItems = currentScenario.items.map(item => {
                    const movesWithSelectedContainer = isCardItem(item) && selectedContainerIds.has(item.containerId);
                    const markerMovesWithSelectedContainer = isBoardMarkerItem(item) && selectedContainers.some(container => (
                        item.zone === 'board' &&
                        isPointInsideExpandedItem(getCardCenter(item), container, 0)
                    ));
                    const movesInDragGroup = Object.prototype.hasOwnProperty.call(tokenOriginalPos, item.id);
                    if (!selectedTokenIds.includes(item.id) && !movesWithSelectedContainer && !markerMovesWithSelectedContainer && !movesInDragGroup) return item;

                    if (item.type === 'wall') {
                        return item;
                    }

                    const original = tokenOriginalPos[item.id] || { x: item.x, y: item.y };
                    let newX, newY;

                    newX = original.x + deltaX;
                    newY = original.y + deltaY;

                    if (!Number.isFinite(newX) || !Number.isFinite(newY)) return item;

                    const shouldSnap = item.snapToGrid !== undefined ? item.snapToGrid : gridConfig.snapToGrid;
                    if (shouldSnap) {
                        const snappedPosition = snapWorldPositionToGrid(
                            { x: newX, y: newY },
                            gridConfig,
                            { width: item.width, height: item.height },
                            { centerInCell: isCombatTokenItem(item) }
                        );
                        newX = snappedPosition.x;
                        newY = snappedPosition.y;
                    }

                    return { ...item, x: newX, y: newY };
                });

                if (handleModeItemDrop?.({
                    draggedItemId: draggedTokenId,
                    finalItems,
                    interactionOriginalItems,
                    scenarioId: currentScenario.id,
                })) {
                    setDraggedTokenId(null);
                    setRotatingTokenId(null);
                    setResizingTokenId(null);
                    setTokenOriginalPos({});
                    setDragVisualOrigin({});
                    setCombatOccupancyFeedback(null);
                    document.body.style.cursor = 'default';
                    return;
                }

                if (isBoardMode && isCardItem(draggedItem) && activeLayer === 'TABLETOP') {
                    const movedCard = finalItems.find(item => item.id === draggedTokenId);
                    const stackTarget = findCardStackDropTarget(movedCard, finalItems);

                    if (stackTarget) {
                        const sourceStackIds = getCardStackIds(movedCard);
                        const targetStackIds = getCardStackIds(stackTarget);
                        const stackModifiedIds = [
                            draggedTokenId,
                            stackTarget.id,
                            ...sourceStackIds,
                            ...targetStackIds
                        ];
                        finalItems = stackCardOnTarget(finalItems, draggedTokenId, stackTarget.id);
                        setActiveScenario(prev => prev ? { ...prev, items: finalItems } : prev);
                        setSelectedTokenIds([draggedTokenId]);
                        lastSelectedIdRef.current = draggedTokenId;

                        safePersistItems(currentScenario.id, finalItems, interactionOriginalItems, stackModifiedIds);

                        setDraggedTokenId(null);
                        setRotatingTokenId(null);
                        setResizingTokenId(null);
                        setTokenOriginalPos({});
                        setDragVisualOrigin({});
                        setCombatOccupancyFeedback(null);
                        document.body.style.cursor = 'default';
                        return;
                    }

                    const containerTarget = findCardContainerDropTarget(movedCard, finalItems);

                    if (containerTarget) {
                        const containerModifiedIds = [
                            draggedTokenId,
                            ...getCardStackIds(movedCard)
                        ];
                        finalItems = moveCardIntoContainer(finalItems, draggedTokenId, containerTarget.id);
                        setActiveScenario(prev => prev ? { ...prev, items: finalItems } : prev);
                        setSelectedTokenIds([containerTarget.id]);
                        lastSelectedIdRef.current = containerTarget.id;

                        safePersistItems(currentScenario.id, finalItems, interactionOriginalItems, containerModifiedIds);

                        setDraggedTokenId(null);
                        setRotatingTokenId(null);
                        setResizingTokenId(null);
                        setTokenOriginalPos({});
                        setDragVisualOrigin({});
                        setCombatOccupancyFeedback(null);
                        document.body.style.cursor = 'default';
                        return;
                    }

                    if (movedCard?.containerId) {
                        const currentContainer = finalItems.find(item => item.id === movedCard.containerId && isCardContainerItem(item));
                        if (!currentContainer || !isPointInsideExpandedItem(getCardCenter(movedCard), currentContainer, 0.02)) {
                            finalItems = detachCardFromContainer(finalItems, draggedTokenId);
                        }
                    }
                }

                if (isBoardMode && isBoardMarkerItem(draggedItem) && activeLayer === 'TABLETOP') {
                    const movedMarker = finalItems.find(item => item.id === draggedTokenId);
                    const markerCenter = movedMarker
                        ? {
                            x: movedMarker.x + (movedMarker.width / 2),
                            y: movedMarker.y + (movedMarker.height / 2)
                        }
                        : null;
                    const markerStackTarget = movedMarker
                        ? finalItems
                            .filter(item => {
                            if (item.id === draggedTokenId || !isBoardMarkerItem(item)) return false;
                            const itemCenterX = item.x + (item.width / 2);
                            const itemCenterY = item.y + (item.height / 2);
                            const distance = Math.hypot(markerCenter.x - itemCenterX, markerCenter.y - itemCenterY);
                            const threshold = Math.min(
                                movedMarker.width,
                                movedMarker.height,
                                item.width,
                                item.height
                            ) * 0.55;
                            return distance <= threshold || getItemOverlapRatio(movedMarker, item) >= 0.18;
                        })
                            .sort((a, b) => getItemOverlapRatio(movedMarker, b) - getItemOverlapRatio(movedMarker, a))[0]
                        : null;

                    if (movedMarker && markerStackTarget) {
                        finalItems = [
                            ...finalItems.filter(item => item.id !== draggedTokenId),
                            movedMarker,
                        ];
                        didReorderBoardMarkerStack = true;
                    }
                }
            }

            // Si estábamos arrastrando tokens en la capa de mesa, comprobar colisiones
            if (draggedTokenId && activeLayer === 'TABLETOP') {
                const walls = currentScenario.items.filter(i =>
                    i.type === 'wall' && !(i.wallType === 'door' && i.isOpen)
                );
                let hasCollision = false;

                finalItems = finalItems.map(item => {
                    // Solo chequear colisión para tokens (no muros) que estaban seleccionados
                    if (selectedTokenIds.includes(item.id) && item.type !== 'wall') {
                        const original = tokenOriginalPos[item.id];
                        if (original) {
                            const occupancyBlocked = activeLayer === 'TABLETOP' &&
                                isCombatTokenItem(item) &&
                                !canOccupyCombatCell({
                                    movingToken: item,
                                    nextX: item.x,
                                    nextY: item.y,
                                    items: currentScenario.items,
                                    config: gridConfig,
                                    excludeIds: selectedTokenIds.filter((id) => id !== item.id),
                                });

                            if (occupancyBlocked) {
                                hasCollision = true;
                                return { ...item, x: original.x, y: original.y };
                            }

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

                    if (isCanvasCombatActive && isPlayerView) {
                        const original = tokenOriginalPos[draggedTokenId];
                        const token = finalItems.find(i => i.id === draggedTokenId);
                        if (original && token && token.x === original.x && token.y === original.y) {
                            setPendingTurnState(prev => {
                                if (!prev || prev.tokenId !== draggedTokenId) return prev;

                                const cellW = gridConfig.cellWidth || 50;
                                const cellH = gridConfig.cellHeight || 50;
                                const turnStartX = Number.isFinite(Number(prev.startX))
                                    ? Number(prev.startX)
                                    : (Number.isFinite(Number(original.turnStartX)) ? Number(original.turnStartX) : original.x);
                                const turnStartY = Number.isFinite(Number(prev.startY))
                                    ? Number(prev.startY)
                                    : (Number.isFinite(Number(original.turnStartY)) ? Number(original.turnStartY) : original.y);
                                const distance = Math.max(
                                    Math.round(Math.abs(original.x - turnStartX) / cellW),
                                    Math.round(Math.abs(original.y - turnStartY) / cellH)
                                );
                                const hasActions = Array.isArray(prev.actions) && prev.actions.length > 0;
                                const actionCost = Number(prev.actionCost) || 0;

                                if (distance <= 0 && actionCost <= 0 && !hasActions) return null;

                                return {
                                    ...prev,
                                    x: original.x,
                                    y: original.y,
                                    moveCost: distance
                                };
                            });
                        }
                    }
                }
                else {
                    setActiveScenario(prev => ({ ...prev, items: finalItems }));
                }

                // --- GESTIÓN DE MOVIMIENTO EN MODO COMBATE (PENDIENTE) ---
                if (isCanvasCombatActive && isPlayerView) {
                    const token = finalItems.find(i => i.id === draggedTokenId);
                    const original = tokenOriginalPos[draggedTokenId];
                    if (token && isCombatTokenItem(token) && original && (token.x !== original.x || token.y !== original.y)) {
                        setPendingTurnState(prev => {
                            // Si ya hay un movimiento pendiente, el inicio real del turno se conserva aunque este drag empiece desde la previsualización.
                            const isSameToken = prev && prev.tokenId === draggedTokenId;
                            const turnStartX = isSameToken
                                ? prev.startX
                                : (Number.isFinite(Number(original.turnStartX)) ? Number(original.turnStartX) : original.x);
                            const turnStartY = isSameToken
                                ? prev.startY
                                : (Number.isFinite(Number(original.turnStartY)) ? Number(original.turnStartY) : original.y);

                            const dx = Math.abs(token.x - turnStartX);
                            const dy = Math.abs(token.y - turnStartY);
                            const cellW = gridConfig.cellWidth || 50;
                            const cellH = gridConfig.cellHeight || 50;
                            const distance = Math.max(Math.round(dx / cellW), Math.round(dy / cellH));
                            const actionCost = isSameToken ? (Number(prev.actionCost) || 0) : 0;
                            const hasActions = isSameToken && Array.isArray(prev.actions) && prev.actions.length > 0;

                            if (distance <= 0 && actionCost <= 0 && !hasActions) return null;

                            const base = prev && prev.tokenId === draggedTokenId ? prev : {
                                tokenId: draggedTokenId,
                                startX: turnStartX,
                                startY: turnStartY,
                                actionCost,
                                actions: []
                            };
                            return {
                                ...base,
                                x: token.x,
                                y: token.y,
                                moveCost: distance
                            };
                        });

                        setDraggedTokenId(null);
                        setTokenOriginalPos({});
                        setDragVisualOrigin({});
                        setCombatOccupancyFeedback(null);
                        document.body.style.cursor = 'default';
                        return; // No persistimos a Firebase aún
                    }
                }

                if (
                    isCanvasCombatActive
                    && !isPlayerView
                    && selectedTokenIds.length === 1
                    && draggedTokenId
                    && combatRuntime?.combatState?.participants?.[draggedTokenId]
                ) {
                    const movedToken = finalItems.find((item) => item.id === draggedTokenId);
                    const original = tokenOriginalPos[draggedTokenId];
                    if (movedToken && original && (movedToken.x !== original.x || movedToken.y !== original.y)) {
                        const cellW = gridConfig.cellWidth || 50;
                        const cellH = gridConfig.cellHeight || 50;
                        const cost = Math.max(
                            Math.round(Math.abs(movedToken.x - original.x) / cellW),
                            Math.round(Math.abs(movedToken.y - original.y) / cellH),
                        );
                        const confirmed = await combatRuntime.confirmMovement(draggedTokenId, {
                            from: { x: original.x, y: original.y },
                            to: { x: movedToken.x, y: movedToken.y },
                            cost,
                        });

                        if (!confirmed) {
                            setActiveScenario((current) => current ? {
                                ...current,
                                items: current.items.map((item) => (
                                    item.id === draggedTokenId
                                        ? { ...item, x: original.x, y: original.y }
                                        : item
                                )),
                            } : current);
                        }

                        setDraggedTokenId(null);
                        setTokenOriginalPos({});
                        setDragVisualOrigin({});
                        setCombatOccupancyFeedback(null);
                        document.body.style.cursor = 'default';
                        return;
                    }
                }

                // El Canvas sin ronda activa es una fase de preparación: mover fichas
                // solo cambia su posición, sin consumir velocidad ni recursos.
                const sangradoMovementAnimations = [];
                finalItems = finalItems.map(item => {
                    if (isBoardMode && gridConfig.isCombatActive && selectedTokenIds.includes(item.id) && isCombatTokenItem(item)) {
                        const original = tokenOriginalPos[item.id];
                        if (original) {
                            if (item.x !== original.x || item.y !== original.y) {
                                const dx = Math.abs(item.x - original.x);
                                const dy = Math.abs(item.y - original.y);
                                const cellW = gridConfig.cellWidth || 50;
                                const cellH = gridConfig.cellHeight || 50;
                                const distance = Math.max(Math.round(dx / cellW), Math.round(dy / cellH));

                                if (distance > 0) {
                                    const movedItem = { ...item, velocidad: (item.velocidad || 0) + distance };
                                    const sangradoPenalty = applySangradoSpeedPenalty(movedItem, distance);
                                    if (sangradoPenalty.lostVida > 0) {
                                        sangradoMovementAnimations.push({
                                            token: sangradoPenalty.token,
                                            lostVida: sangradoPenalty.lostVida
                                        });
                                    }
                                    return sangradoPenalty.token;
                                }
                            }
                        }
                    }
                    return item;
                });

                sangradoMovementAnimations.forEach(({ token, lostVida }) => {
                    queueSangradoSpeedAnimation(token, lostVida, { shared: true });
                });
            }

            // Evaluar si hubo cambios reales respecto al inicio del drag para evitar writes innecesarios que rompen previsiones de movimiento
            let shouldSaveToFirebase = false;
            if (rotatingTokenId || resizingTokenId) {
                shouldSaveToFirebase = true;
            } else if (didReorderBoardMarkerStack) {
                shouldSaveToFirebase = true;
            } else if (draggedTokenId) {
                const draggedItemIds = new globalThis.Set([draggedTokenId, ...Object.keys(tokenOriginalPos || {})]);
                shouldSaveToFirebase = Array.from(draggedItemIds).some(id => {
                    const original = tokenOriginalPos[id];
                    const current = finalItems.find(i => i.id === id);
                    return original && current && (original.x !== current.x || original.y !== current.y);
                });
            }

            // Guardar el estado final en Firebase (Solo si no es movimiento pendiente de combate y si de verdad se movió algo)
            if (shouldSaveToFirebase) {
                // Registrar los cambios en recentLocalWritesRef antes de escribir para prevenir snapbacks
                finalItems.forEach(item => {
                    const original = tokenOriginalPos[item.id];
                    if (original && (item.x !== original.x || item.y !== original.y || item.rotation !== original.rotation)) {
                        recentLocalWritesRef.current[item.id] = {
                            time: Date.now(),
                            fields: {
                                x: item.x,
                                y: item.y,
                                rotation: item.rotation
                            }
                        };
                    }
                });

                const draggedItemIds = Array.from(new globalThis.Set([
                    draggedTokenId,
                    rotatingTokenId,
                    resizingTokenId,
                    ...(selectedTokenIdsRef.current || []),
                    ...Object.keys(tokenOriginalPos || {})
                ].filter(Boolean)));

                safePersistItems(currentScenario.id, finalItems, interactionOriginalItems, draggedItemIds);
            }

            setDraggedTokenId(null);
            setRotatingTokenId(null);
            setResizingTokenId(null);
            setTokenOriginalPos({});
            setDragVisualOrigin({});
            setCombatOccupancyFeedback(null);

            // Si el master mueve un token que tenía un estado de turno pendiente, lo limpiamos
            if (!isPlayerView && pendingTurnState) {
                setPendingTurnState(null);
            }

            document.body.style.cursor = 'default';
            return;
        }

        setIsDragging(false);
        setDraggedTokenId(null);
        setRotatingTokenId(null);
        setResizingTokenId(null);
        setDraggingWallHandle(null);
        setTokenOriginalPos({});
        setDragVisualOrigin({});
        setCombatOccupancyFeedback(null);
        document.body.style.cursor = 'default';
    };

    return {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleMouseDown,
        handleMouseMove,
        getItemInteractionSnapshot,
        startWallHandleDrag,
        handleMouseUp,
    };
};
