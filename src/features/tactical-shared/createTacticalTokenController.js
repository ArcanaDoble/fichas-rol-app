import { nanoid } from 'nanoid';
import { getCardStackIds, isCardContainerItem, isCardItem } from '../../utils/cardBoard';
import { syncTokenWithSheet } from './tokenSheetSync';
import {
    MOBILE_TACTICAL_MOVE_RANGE, canCombatTokenActNow, getCardCenter,
    getCombatRenderPlacementAtPosition, getDefaultTokenDimensions,
    getMobileTacticalMoveOptions, getTokenProneStatusMeta, isBoardDieItem,
    isBoardMarkerItem, isCombatTokenItem, isMobileTacticalMoveToken,
    isPointInsideExpandedItem, isTokenDerribado,
} from './legacyCombatRules';
import { WORLD_SIZE, snapWorldPositionToGrid } from './spatial';
import { ACTIVE_BOARD_DIE_ROLL_IDS } from '../../utils/boardDiceRuntime';

/** Frozen token and item commands shared by the legacy tactical host. */
export const createCanvasTokenController = ({
    accesorios,
    activeLayer,
    activeScenario,
    activeScenarioRef,
    applySangradoSpeedPenalty,
    armaduras,
    armas,
    boardCardHandTransferRef,
    cardStackQuickActionBlockUntilRef,
    clearBoardHandHoverSuppression,
    containerRef,
    currentUserId,
    focusedTargetId,
    getEventCoords,
    getItemInteractionSnapshot,
    gridConfig,
    habilidades,
    handleModeItemDrop,
    isBoardMode,
    isScenePickupItem,
    isMobile,
    isPlayerView,
    isUsablePendingTurnState,
    lastActionTimeRef,
    lastSelectedIdRef,
    lastTouchTokenInteractionRef,
    offset,
    openBoardCardPreview,
    pendingTurnState,
    pendingTurnStateRef,
    playerName,
    queueSangradoSpeedAnimation,
    resizingTokenId,
    safePersistItems,
    selectedTokenIds,
    setActiveBoardHandTokenId,
    setActiveScenario,
    setCombatOccupancyFeedback,
    setDragVisualOrigin,
    setDraggedTokenId,
    setFocusedTargetId,
    setMobileMoveHoverCellKey,
    setPendingTurnState,
    setResizingTokenId,
    setRotatingTokenId,
    setSelectedTokenIds,
    setTargetingState,
    setTokenDragStart,
    setTokenOriginalPos,
    startBoardCardLongPressPreview,
    targetingState,
    triggerToast,
    updateItem,
    zoom,
    syncTokenWithSheet: syncModeTokenWithSheet = syncTokenWithSheet,
}) => {
const addTokenToCanvas = (tokenUrl) => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!currentScenario) return;

        // Calcular posición central basada en el offset actual y zoom para que aparezca en el centro de la pantalla visible
        // Calcular posición central basada en el offset actual y zoom para que aparezca en el centro de la pantalla visible
        // P_mundo = CentroMundo - (Offset / Zoom)
        // El centro del div WORLD está en (WORLD_SIZE/2, WORLD_SIZE/2)

        const centerX = (WORLD_SIZE / 2) - (offset.x / zoom);
        const centerY = (WORLD_SIZE / 2) - (offset.y / zoom);

        // Centrar el token en ese punto (restando la mitad de su tamaño)
        const defaultTokenDimensions = getDefaultTokenDimensions(gridConfig);
        const w = defaultTokenDimensions.width;
        const h = defaultTokenDimensions.height;

        const centeredSpawn = { x: centerX - (w / 2), y: centerY - (h / 2) };
        const spawnPosition = gridConfig.snapToGrid
            ? snapWorldPositionToGrid(centeredSpawn, gridConfig, { width: w, height: h }, { centerInCell: true })
            : centeredSpawn;

        const newToken = {
            id: `token-${nanoid()}`,
            x: spawnPosition.x,
            y: spawnPosition.y,
            width: w,
            height: h,
            img: tokenUrl,
            rotation: 0,
            layer: 'TOKEN',
            name: 'Token', // Nombre por defecto
            status: [], // Array de IDs de estados
            hasVision: true,
            visionRadius: 300,
        };

        const nextItems = [...(currentScenario.items || []), newToken];
        setActiveScenario(prev => (
            prev?.id === currentScenario.id
                ? { ...prev, items: nextItems }
                : prev
        ));
        safePersistItems(currentScenario.id, nextItems, currentScenario.items, [newToken.id]);
    };

    const consumeMobileMoveTemplateEvent = (event, options = {}) => {
        event?.stopPropagation?.();
        if (options.preventDefault !== false) {
            event?.preventDefault?.();
        }
        event?.nativeEvent?.stopImmediatePropagation?.();
    };

    const shouldUseMobileTacticalMove = (token, items = []) => (
        isMobile &&
        !isBoardMode &&
        gridConfig.isCombatActive &&
        activeLayer === 'TABLETOP' &&
        isMobileTacticalMoveToken(token) &&
        !isTokenDerribado(token) &&
        canCombatTokenActNow(token, items)
    );

    const canUseBoardMobileTacticalMove = (token) => (
        isMobile &&
        isBoardMode &&
        activeLayer === 'TABLETOP' &&
        isMobileTacticalMoveToken(token) &&
        (
            !isPlayerView ||
            (Array.isArray(token?.controlledBy) && token.controlledBy.includes(playerName))
        )
    );

    const getBoardMobileTacticalMoveOptions = (token, items = []) => (
        getMobileTacticalMoveOptions(token, items, gridConfig, MOBILE_TACTICAL_MOVE_RANGE, {
            requireCombatActive: false,
            validateOccupancy: true,
            validateWalls: true,
            allowInactiveOccupancy: true,
        })
    );

    const handleMobileTacticalMoveCell = (event, tokenId, targetCell) => {
        consumeMobileMoveTemplateEvent(event);

        const scenario = activeScenarioRef.current || activeScenario;
        if (!scenario || !tokenId || !targetCell) return;

        const token = scenario.items.find(item => item.id === tokenId);
        if (!shouldUseMobileTacticalMove(token, scenario.items)) {
            triggerToast("Movimiento no disponible", "Este token no puede desplazarse ahora", 'warning');
            return;
        }

        const option = getMobileTacticalMoveOptions(token, scenario.items, gridConfig)
            .find(candidate => candidate.cell.x === targetCell.x && candidate.cell.y === targetCell.y);
        if (!option) return;

        const nextPosition = option.nextPosition;

        if (isPlayerView) {
            const pending = isUsablePendingTurnState(pendingTurnStateRef.current) && pendingTurnStateRef.current.tokenId === tokenId
                ? pendingTurnStateRef.current
                : null;
            const turnStartX = pending ? pending.startX : token.x;
            const turnStartY = pending ? pending.startY : token.y;
            const cellW = gridConfig.cellWidth || 50;
            const cellH = gridConfig.cellHeight || 50;
            const moveCost = Math.max(
                Math.round(Math.abs(nextPosition.x - turnStartX) / cellW),
                Math.round(Math.abs(nextPosition.y - turnStartY) / cellH)
            );

            const nextItems = scenario.items.map(item => (
                item.id === tokenId
                    ? { ...item, x: nextPosition.x, y: nextPosition.y }
                    : item
            ));

            setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
            setSelectedTokenIds([tokenId]);
            lastSelectedIdRef.current = tokenId;
            setMobileMoveHoverCellKey(null);
            setPendingTurnState(prev => {
                const isSameToken = prev && prev.tokenId === tokenId;
                const actionCost = isSameToken ? (Number(prev.actionCost) || 0) : 0;
                const hasActions = isSameToken && Array.isArray(prev.actions) && prev.actions.length > 0;

                if (moveCost <= 0 && actionCost <= 0 && !hasActions) return null;

                return {
                    ...(isSameToken ? prev : {
                        tokenId,
                        startX: token.x,
                        startY: token.y,
                        actionCost: 0,
                        actions: []
                    }),
                    tokenId,
                    x: nextPosition.x,
                    y: nextPosition.y,
                    moveCost
                };
            });
            return;
        }

        const stepCost = Math.max(1, option.cost || 1);
        let movedToken = {
            ...token,
            x: nextPosition.x,
            y: nextPosition.y,
            velocidad: (Number(token.velocidad) || 0) + stepCost
        };
        let sangradoAnimation = null;

        if (gridConfig.isCombatActive) {
            const sangradoPenalty = applySangradoSpeedPenalty(movedToken, stepCost);
            movedToken = sangradoPenalty.token;
            if (sangradoPenalty.lostVida > 0) {
                sangradoAnimation = {
                    token: movedToken,
                    lostVida: sangradoPenalty.lostVida
                };
            }
        }

        const nextItems = scenario.items.map(item => (
            item.id === tokenId ? movedToken : item
        ));

        if (handleModeItemDrop?.({
            draggedItemId: tokenId,
            finalItems: nextItems,
            interactionOriginalItems: scenario.items,
            scenarioId: scenario.id,
        })) {
            setSelectedTokenIds([tokenId]);
            lastSelectedIdRef.current = tokenId;
            setPendingTurnState(null);
            setMobileMoveHoverCellKey(null);
            if (sangradoAnimation) {
                queueSangradoSpeedAnimation(sangradoAnimation.token, sangradoAnimation.lostVida, { shared: true });
            }
            return;
        }

        setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
        setSelectedTokenIds([tokenId]);
        lastSelectedIdRef.current = tokenId;
        setPendingTurnState(null);
        setMobileMoveHoverCellKey(null);
        safePersistItems(scenario.id, nextItems, scenario.items, [tokenId]);

        if (sangradoAnimation) {
            queueSangradoSpeedAnimation(sangradoAnimation.token, sangradoAnimation.lostVida, { shared: true });
        }
    };

    const handleBoardMobileTacticalMoveCell = (event, tokenId, targetCell) => {
        consumeMobileMoveTemplateEvent(event);

        const scenario = activeScenarioRef.current || activeScenario;
        if (!scenario || !tokenId || !targetCell) return;

        const token = scenario.items.find(item => item.id === tokenId);
        if (!canUseBoardMobileTacticalMove(token)) {
            triggerToast("Movimiento no disponible", "No puedes desplazar este token", 'warning');
            return;
        }

        const option = getBoardMobileTacticalMoveOptions(token, scenario.items)
            .find(candidate => candidate.cell.x === targetCell.x && candidate.cell.y === targetCell.y);
        if (!option) return;

        const nextItems = scenario.items.map(item => (
            item.id === tokenId
                ? { ...item, x: option.nextPosition.x, y: option.nextPosition.y }
                : item
        ));

        setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
        setSelectedTokenIds([tokenId]);
        setActiveBoardHandTokenId(tokenId);
        lastSelectedIdRef.current = tokenId;
        setMobileMoveHoverCellKey(null);
        safePersistItems(scenario.id, nextItems, scenario.items, [tokenId]);
    };

    const handleCancelMobileTacticalMove = (event, tokenId) => {
        consumeMobileMoveTemplateEvent(event);

        const scenario = activeScenarioRef.current || activeScenario;
        const pending = isUsablePendingTurnState(pendingTurnStateRef.current) && pendingTurnStateRef.current.tokenId === tokenId
            ? pendingTurnStateRef.current
            : null;
        if (!scenario || !pending) return;

        const startX = Number.isFinite(Number(pending.startX)) ? Number(pending.startX) : pending.x;
        const startY = Number.isFinite(Number(pending.startY)) ? Number(pending.startY) : pending.y;
        const nextItems = scenario.items.map(item => (
            item.id === tokenId ? { ...item, x: startX, y: startY } : item
        ));

        setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
        setSelectedTokenIds([tokenId]);
        lastSelectedIdRef.current = tokenId;
        setMobileMoveHoverCellKey(null);
        setPendingTurnState(prev => {
            if (!prev || prev.tokenId !== tokenId) return prev;

            const actionCost = Number(prev.actionCost) || 0;
            const hasActions = Array.isArray(prev.actions) && prev.actions.length > 0;
            if (actionCost <= 0 && !hasActions) return null;

            return {
                ...prev,
                x: startX,
                y: startY,
                moveCost: 0
            };
        });
        triggerToast("Movimiento cancelado", "La previsualización vuelve al inicio del turno", 'info');
    };

    const handleTokenMouseDown = (e, token) => {
        const { x: curX, y: curY } = getEventCoords(e);
        const isTouch = e.type.startsWith('touch');
        const interactionTime = Date.now();

        if (
            !isTouch &&
            lastTouchTokenInteractionRef.current.id === token.id &&
            interactionTime - lastTouchTokenInteractionRef.current.time < 500
        ) {
            return;
        }

        if (isTouch) {
            lastTouchTokenInteractionRef.current = { id: token.id, time: interactionTime };
        }

        e.stopPropagation(); // Evitar que el canvas inicie pan
        const isScenePickup = Boolean(isScenePickupItem?.(token));

        if (isBoardDieItem(token) && ACTIVE_BOARD_DIE_ROLL_IDS.has(token.id)) {
            return;
        }

        if (isCardItem(token) && cardStackQuickActionBlockUntilRef.current > Date.now()) {
            e.nativeEvent?.stopImmediatePropagation?.();
            return;
        }

        boardCardHandTransferRef.current = null;
        clearBoardHandHoverSuppression();

        // --- PREVISUALIZACIÓN DE CARTA CON BOTÓN CENTRAL ---
        if (!isTouch && e.button === 1) {
            if (isBoardMode && isCardItem(token)) {
                e.preventDefault();
                openBoardCardPreview(token);
                return;
            }
        }

        // --- LÓGICA DE TARGETING (ATAQUE) ---
        // Mantenemos la lógica activa tanto en fase 'targeting' como 'weapon_selection' para evitar clicks accidentales al fondo
        if (targetingState && (targetingState.phase === 'targeting' || targetingState.phase === 'weapon_selection')) {
            if (token.id === targetingState.attackerId) {
                triggerToast("Objetivo no válido", "No puedes atacarte a ti mismo", 'warning');
                setTargetingState(null);
                setFocusedTargetId(null);
                return;
            }

            // Si ya estamos en weapon_selection y pinchamos en OTRA ficha, permitimos cambiar el objetivo
            if (token.id !== focusedTargetId) {
                setFocusedTargetId(token.id);
                setTargetingState(prev => ({ ...prev, phase: 'weapon_selection', targetId: token.id }));
                triggerToast("Objetivo Fijado", "Elige un arma para realizar el ataque", 'success');
            }

            // Siempre retornamos aquí para evitar que el evento active la selección normal o el drag del token
            return;
        }

        if (targetingState?.phase === 'sweep_selection') {
            return;
        }

        // Si click izquierdo o touch, seleccionamos y preparamos arrastre
        if (isTouch || e.button === 0) {
            // Restricción de Jugador: No permitir interactuar con tokens ajenos
            const isOwner = !isPlayerView ||
                (isCardItem(token) && isBoardMode && (
                    !token.ownerName ||
                    token.ownerName === playerName ||
                    token.ownerId === currentUserId ||
                    token.handSeatId === playerName ||
                    token.handSeatName === playerName
                )) ||
                (isBoardMarkerItem(token) && isBoardMode) ||
                (isBoardDieItem(token) && isBoardMode) ||
                (isCardContainerItem(token) && isBoardMode) ||
                isScenePickup ||
                (Array.isArray(token.controlledBy) ? token.controlledBy.includes(playerName) : token.controlledBy === playerName) ||
                token.ownerName === playerName;
            if (!isOwner) return;

            if (isBoardMode && isCombatTokenItem(token)) {
                setActiveBoardHandTokenId(token.id);
            }
            if (isBoardMode && isCardItem(token) && isTouch) {
                startBoardCardLongPressPreview(token, e, { cancelBoardDrag: true });
            }

            // Restricción de Turno: Si tienes un turno pendiente con otro token, debes terminarlo primero
            if (!isScenePickup && !isBoardMode && isPlayerView && gridConfig.isCombatActive && pendingTurnState && pendingTurnState.tokenId !== token.id) {
                const totalPendingCost = (pendingTurnState.moveCost || 0) + (pendingTurnState.actionCost || 0);
                if (totalPendingCost > 0) {
                    triggerToast("Turno en progreso", "Termina las acciones de tu otro token antes de cambiar", 'warning');
                    return;
                } else {
                    // El jugador canceló el movimiento regresando la ficha a su origen y no hizo acciones.
                    // Limpiamos el estado pendiente fantasma y permitimos seleccionar al otro token.
                    setPendingTurnState(null);
                }
            }

            // RESTRICCIÓN DE MODO COMBATE: Solo mover si es tu turno (velocidad mínima)
            if (!isBoardMode && gridConfig.isCombatActive && activeLayer === 'TABLETOP' && isCombatTokenItem(token)) {
                const currentItems = (activeScenarioRef.current || activeScenario)?.items || [];

                if (!canCombatTokenActNow(token, currentItems)) {
                    // No es tu turno, pero el Master puede mover cualquier cosa
                    if (isPlayerView) {
                        triggerToast("No es tu turno", "Debes esperar a que tu velocidad sea la más baja", 'warning');
                        return;
                    }
                }
            }

            // Si estamos redimensionando, no iniciar arrastre
            if (resizingTokenId) return;

            const currentScenario = activeScenarioRef.current || activeScenario;
            const isMultiSelectModifier = Boolean(e.shiftKey || e.ctrlKey || e.metaKey);
            let newSelection = [...selectedTokenIds];

            // Si el token NO está ya seleccionado, lo añadimos (si Shift/Ctrl) o lo seleccionamos en exclusiva
            if (!selectedTokenIds.includes(token.id)) {
                if (isMultiSelectModifier) {
                    newSelection.push(token.id);
                } else {
                    newSelection = [token.id];
                }
                setSelectedTokenIds(newSelection);
            }
            // Si YA está seleccionado y pulsamos modificador (Shift/Ctrl/Cmd), lo deseleccionamos
            else if (isMultiSelectModifier) {
                newSelection = newSelection.filter(id => id !== token.id);
                setSelectedTokenIds(newSelection);
                return; // No iniciamos drag si estamos deseleccionando
            }

            if (gridConfig.isCombatActive && activeLayer === 'TABLETOP' && currentScenario) {
                const hasProneTokenInSelection = currentScenario.items.some(item =>
                    newSelection.includes(item.id) && isTokenDerribado(item)
                );
                if (hasProneTokenInSelection) {
                    const selectedProneToken = currentScenario.items.find(item =>
                        newSelection.includes(item.id) && isTokenDerribado(item)
                    );
                    const proneStatusMeta = getTokenProneStatusMeta(selectedProneToken);
                    triggerToast(
                        proneStatusMeta?.label || "Derribado",
                        `No puedes desplazar una ficha con el estado ${proneStatusMeta?.label?.toLowerCase() || 'derribado'} mientras el combate está activo`,
                        'warning'
                    );
                    return;
                }
            }

            if (
                isTouch &&
                isBoardMode &&
                isMobileTacticalMoveToken(token) &&
                canUseBoardMobileTacticalMove(token)
            ) {
                setDraggedTokenId(null);
                setRotatingTokenId(null);
                setResizingTokenId(null);
                setTokenOriginalPos({});
                setDragVisualOrigin({});
                setCombatOccupancyFeedback(null);
                return;
            }

            if (
                isTouch &&
                isMobile &&
                !isBoardMode &&
                gridConfig.isCombatActive &&
                activeLayer === 'TABLETOP' &&
                isMobileTacticalMoveToken(token)
            ) {
                setDraggedTokenId(null);
                setRotatingTokenId(null);
                setResizingTokenId(null);
                setTokenOriginalPos({});
                setDragVisualOrigin({});
                setCombatOccupancyFeedback(null);

                if (!shouldUseMobileTacticalMove(token, currentScenario?.items || [])) {
                    triggerToast("Movimiento no disponible", "Este token no puede desplazarse ahora", 'warning');
                }
                return;
            }

            setDraggedTokenId(token.id);
            const touchId = (isTouch && e.touches && e.touches[0]) ? e.touches[0].identifier : null;
            setTokenDragStart({ x: curX, y: curY, identifier: touchId, startTime: Date.now() });

            const pendingForToken = (
                isPlayerView &&
                isUsablePendingTurnState(pendingTurnStateRef.current) &&
                pendingTurnStateRef.current.tokenId === token.id
            ) ? pendingTurnStateRef.current : null;

            // Guardar posiciones originales de TODOS los seleccionados
            const originals = {};
            const visualOrigins = {};
            if (currentScenario) {
                const selectedContainerIds = new globalThis.Set(
                    currentScenario.items
                        .filter(item => newSelection.includes(item.id) && isCardContainerItem(item))
                        .map(item => item.id)
                );
                const selectedContainers = currentScenario.items
                    .filter(item => selectedContainerIds.has(item.id) && isCardContainerItem(item));
                currentScenario.items.forEach(i => {
                    const movesWithSelectedContainer = isCardItem(i) && selectedContainerIds.has(i.containerId);
                    const markerMovesWithSelectedContainer = isBoardMarkerItem(i) && selectedContainers.some(container => (
                        i.zone === 'board' &&
                        isPointInsideExpandedItem(getCardCenter(i), container, 0)
                    ));
                    if (newSelection.includes(i.id) || movesWithSelectedContainer || markerMovesWithSelectedContainer) {
                        if (pendingForToken && i.id === token.id) {
                            const startPosition = {
                                x: pendingForToken.startX ?? pendingForToken.x ?? i.x,
                                y: pendingForToken.startY ?? pendingForToken.y ?? i.y
                            };
                            originals[i.id] = {
                                x: pendingForToken.x ?? i.x,
                                y: pendingForToken.y ?? i.y,
                                turnStartX: startPosition.x,
                                turnStartY: startPosition.y
                            };
                            visualOrigins[i.id] = getCombatRenderPlacementAtPosition(
                                i,
                                startPosition,
                                currentScenario.items,
                                gridConfig
                            );
                        } else {
                            originals[i.id] = { x: i.x, y: i.y };
                            visualOrigins[i.id] = getCombatRenderPlacementAtPosition(
                                i,
                                { x: i.x, y: i.y },
                                currentScenario.items,
                                gridConfig
                            );
                        }
                    }
                });
            }
            setTokenOriginalPos(originals);
            setDragVisualOrigin(visualOrigins);
            setCombatOccupancyFeedback(null);
        }
    };

    const handleRotationMouseDown = (e, token) => {
        const isTouch = e.type.startsWith('touch');
        e.stopPropagation();
        if (isTouch || e.button === 0) {
            setRotatingTokenId(token.id);
            // Para rotación, forzamos selección única del token rotado para evitar confusiones visuales
            setSelectedTokenIds([token.id]);
            setTokenOriginalPos({
                [token.id]: getItemInteractionSnapshot(token)
            });
        }
    };

    const linkCharacter = (tokenId, charData) => {
        const token = activeScenario.items.find(i => i.id === tokenId);
        if (!token || !charData) return;

        // Perform synchronization
        const syncedToken = syncModeTokenWithSheet(token, charData, {
            armas,
            armaduras,
            habilidades,
            accesorios,
        });

        // Add owner to controlledBy if not present
        let newControlledBy = [...(token.controlledBy || [])];
        if (charData.owner && !newControlledBy.includes(charData.owner)) {
            newControlledBy.push(charData.owner);
        }

        const finalToken = {
            ...syncedToken,
            linkedCharacterId: charData.id,
            controlledBy: newControlledBy,
            isCircular: true // Forzar circular si se vincula a ficha para consistencia visual por defecto
        };

        const updatedItems = activeScenario.items.map(i => i.id === tokenId ? finalToken : i);
        setActiveScenario(prev => ({ ...prev, items: updatedItems }));
        safePersistItems(activeScenario.id, updatedItems, activeScenario.items);
        triggerToast(
            "Vínculo establecido",
            `Token vinculado a ${charData.name}`,
            'success'
        );
    };

    const unlinkCharacter = (tokenId) => {
        const token = activeScenario.items.find(i => i.id === tokenId);
        if (!token) return;

        const finalToken = {
            ...token,
            linkedCharacterId: null
        };

        const updatedItems = activeScenario.items.map(i => i.id === tokenId ? finalToken : i);
        setActiveScenario(prev => ({ ...prev, items: updatedItems }));
        safePersistItems(activeScenario.id, updatedItems, activeScenario.items);
        triggerToast(
            "Vínculo eliminado",
            "El token ya no está vinculado a una ficha",
            'info'
        );
    };

    const deleteItem = async (itemId) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        if (!activeScenario) return;

        const itemToDelete = (activeScenario.items || []).find(i => i.id === itemId);
        const idsToDelete = new globalThis.Set([
            itemId,
            ...(isCardItem(itemToDelete) ? getCardStackIds(itemToDelete) : [])
        ]);
        const updatedItems = (activeScenario.items || [])
            .filter(i => !idsToDelete.has(i.id))
            .map(i => {
                if (isCardContainerItem(itemToDelete) && isCardItem(i) && i.containerId === itemToDelete.id) {
                    return {
                        ...i,
                        containerId: null,
                        containerOrder: null,
                        x: i.x,
                        y: i.y,
                        rotation: i.rotation || 0,
                    };
                }

                return Array.isArray(i.stackIds)
                    ? { ...i, stackIds: i.stackIds.filter(id => !idsToDelete.has(id)) }
                    : i;
            });

        setActiveScenario(prev => ({
            ...prev,
            items: updatedItems
        }));
        setSelectedTokenIds(prev => prev.filter(id => !idsToDelete.has(id)));
        safePersistItems(activeScenario.id, updatedItems, activeScenario.items);
        triggerToast("Elemento Eliminado", "El cambio se ha sincronizado", 'info');
    };

    const rotateItem = (itemId, angle) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        const item = activeScenarioRef.current?.items?.find(candidate => candidate.id === itemId);
        if (!item) return;
        updateItem(itemId, { rotation: (item.rotation || 0) + angle }, true);
    };

    const toggleWallType = (wallId) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        const wall = activeScenarioRef.current?.items?.find(item => item.id === wallId);
        if (!wall) return;

        let nextType = 'door';
        if (wall.wallType === 'door') nextType = 'window';
        else if (wall.wallType === 'window') nextType = 'solid';

        updateItem(wallId, { wallType: nextType, isOpen: false, isSecret: false });
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

            // Actualizar Firebase (Sincronizamos la puerta, pero limpiamos posiciones provisionales de tokens)
            const firebaseItems = newItems.map(item => {
                if (isPlayerView && pendingTurnStateRef.current && item.id === pendingTurnStateRef.current.tokenId) {
                    return {
                        ...item,
                        x: pendingTurnStateRef.current.startX,
                        y: pendingTurnStateRef.current.startY
                    };
                }
                return item;
            });

            safePersistItems(prev.id, firebaseItems, prev.items);

            return { ...prev, items: newItems };
        });
    };

    const toggleSecretWall = (wallId) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        const wall = activeScenarioRef.current?.items?.find(item => item.id === wallId);
        if (!wall) return;
        updateItem(wallId, { isSecret: !wall.isSecret });
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

        safePersistItems(activeScenario.id, updatedItems, activeScenario.items);
    };

    const addAreaToCanvas = async (shape = 'rect') => {
        if (!activeScenario) return;

        const spawnX = WORLD_SIZE / 2;
        const spawnY = WORLD_SIZE / 2;
        const side = gridConfig.cellWidth * 2 || 100;
        const isHazard = shape === 'hazard';
        const isStairs = shape === 'stairs';

        const newArea = {
            id: crypto.randomUUID(),
            type: 'geometry',
            shapeType: shape, // 'rect' | 'circle' | 'hazard' | 'stairs'
            geometryKind: shape,
            name: isHazard ? 'Terreno Peligroso' : isStairs ? 'Escalera' : shape === 'rect' ? 'Zona Rectangular' : 'Zona Circular',
            x: spawnX - side / 2,
            y: spawnY - side / 2,
            width: isStairs ? side * 2 : side,
            height: isStairs ? side : side,
            backgroundColor: isHazard ? '#ef4444' : isStairs ? '#c8aa6e' : shape === 'rect' ? '#22c55e' : '#60a5fa',
            opacity: isHazard ? 0.1 : 0.3,
            rotation: 0,
            snapToGrid: true,
            controlledBy: ['master'],
            isCircular: shape === 'circle'
        };

        const updatedItems = [...(activeScenario.items || []), newArea];
        setActiveScenario(prev => ({ ...prev, items: updatedItems }));
        setSelectedTokenIds([newArea.id]);

        safePersistItems(activeScenario.id, updatedItems, activeScenario.items);
    };

    return {
        addTokenToCanvas,
        consumeMobileMoveTemplateEvent,
        shouldUseMobileTacticalMove,
        canUseBoardMobileTacticalMove,
        getBoardMobileTacticalMoveOptions,
        handleMobileTacticalMoveCell,
        handleBoardMobileTacticalMoveCell,
        handleCancelMobileTacticalMove,
        handleTokenMouseDown,
        handleRotationMouseDown,
        linkCharacter,
        unlinkCharacter,
        deleteItem,
        rotateItem,
        toggleWallType,
        toggleDoorOpen,
        toggleSecretWall,
        addLightToCanvas,
        addAreaToCanvas,
    };
};
