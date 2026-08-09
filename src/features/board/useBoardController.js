import { useEffect } from 'react';
import { nanoid } from 'nanoid';
import {
    addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query,
    serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getCardDisplayImage } from '../../utils/cardImages';
import { markImageUrlLoaded } from '../../utils/imageLoadCache';
import {
    MASTER_HAND_SEAT_ID, getCardHandSeatId, getCardHandTokenId, getCardStackIds,
    getVisibleHandCards, isCardContainerItem, isCardItem, isHandCardItem,
    isLegacyTokenHandCard, moveBoardCardPileToHand, normalizeHandSeatId,
    reorderHandCards, sanitizeCardStacks, spreadCardStack, takeCardFromStack,
    takeTopCardFromStack,
} from '../../utils/cardBoard';
import { RECENT_LOCAL_WRITE_PROTECTION_MS } from '../../utils/scenarioSync';
import { getOrUploadFile } from '../../utils/storage';
import { isCombatTokenItem } from '../canvas/combatRules';
import { WORLD_SIZE } from '../canvas/spatial';
import {
    BOARD_DICE_ROLL_SIDES, MAX_BOARD_DICE_EXPLOSIONS, MAX_BOARD_DICE_ROLL,
} from './components/BoardObjects';

/** Encapsulates cards, hands, physical dice and markers exclusive to board mode. */
export const useBoardController = ({
    activeBoardHandTokenId,
    activeScenario,
    activeScenarioRef,
    boardCardHandTransferRef,
    boardDiceExplosive,
    boardDicePool,
    boardHandHoverSuppressionCleanupRef,
    captureBoardHandDragGeometry,
    cardPreviewHoldRef,
    cardPreviewSuppressTouchEndRef,
    cardStackQuickActionBlockUntilRef,
    characterData,
    clearBoardHandHoverSuppression,
    currentUserId,
    divToWorld,
    draggingHandCard,
    getBoardHandReorderTarget,
    getEventCoords,
    gridConfig,
    handDragFrameRef,
    handDragGeometryRef,
    handDragGhostRef,
    handDragPointRef,
    isBoardMode,
    isPlayerView,
    isRollingBoardDice,
    lastMasterHudTokenIdRef,
    lastSelectedIdRef,
    offset,
    pendingBoardHandTransferLocksRef,
    playerName,
    safePersistItems,
    scenarioCollectionName,
    selectedTokenIds,
    setActiveScenario,
    setBoardDiceExplosive,
    setBoardDicePool,
    setCombatOccupancyFeedback,
    setDragVisualOrigin,
    setDraggedTokenId,
    setDraggingHandCard,
    setDraggingWallHandle,
    setIsRollingBoardDice,
    setPreviewedBoardCard,
    setResizingTokenId,
    setRotatingTokenId,
    setSelectedTokenIds,
    setTokenOriginalPos,
    triggerToast,
    updateItem,
    zoom,
}) => {
const handleBoardCardBackUpload = async (cardId, file) => {
        if (!cardId || !file) return;

        try {
            const { url, hash } = await getOrUploadFile(file, 'CanvasCards');
            updateItem(cardId, { backImage: url, backImageHash: hash }, true);
        } catch (error) {
            console.error("Error uploading card back:", error);
        }
    };

    const addCardToBoard = (card) => {
        if (!activeScenario || !card?.frontUrl) return;

        const centerX = (WORLD_SIZE / 2) - (offset.x / zoom);
        const centerY = (WORLD_SIZE / 2) - (offset.y / zoom);
        const cardWidth = Math.max(90, (gridConfig.cellWidth || 120) * 0.72);
        const cardHeight = Math.round(cardWidth * 1.4);

        const newCard = {
            id: `card-${Date.now()}`,
            type: 'card',
            x: centerX - (cardWidth / 2),
            y: centerY - (cardHeight / 2),
            width: cardWidth,
            height: cardHeight,
            frontImage: card.frontUrl,
            backImage: card.backUrl || null,
            faceDown: false,
            rotation: 0,
            layer: 'CARD',
            name: card.name || 'Carta',
            ownerId: currentUserId,
            ownerName: playerName || null,
            zone: 'board',
            snapToGrid: false,
        };

        const nextItems = [...(activeScenario.items || []), newCard];
        setActiveScenario(prev => ({
            ...prev,
            items: nextItems
        }));
        safePersistItems(activeScenario.id, nextItems, activeScenario.items);
    };

    const getBoardHandOwner = () => {
        const items = activeScenarioRef.current?.items || activeScenario?.items || [];
        const selectedCombatToken = items.find(item => selectedTokenIds.includes(item.id) && isCombatTokenItem(item));
        const selectedControlledToken = isPlayerView
            ? items.find(item => selectedTokenIds.includes(item.id) && isCombatTokenItem(item) && item.controlledBy?.includes(playerName))
            : null;
        const activeBoardHandToken = activeBoardHandTokenId
            ? items.find(item => item.id === activeBoardHandTokenId && isCombatTokenItem(item))
            : null;
        const activeControlledBoardHandToken = isPlayerView && activeBoardHandToken?.controlledBy?.includes(playerName)
            ? activeBoardHandToken
            : null;
        const fallbackControlledToken = isPlayerView
            ? items.find(item => isCombatTokenItem(item) && item.controlledBy?.includes(playerName))
            : null;
        const rememberedCombatToken = items.find(item => item.id === lastMasterHudTokenIdRef.current && isCombatTokenItem(item));
        const fallbackCombatToken = items.find(item => isCombatTokenItem(item));
        if (isPlayerView) {
            return selectedControlledToken || activeControlledBoardHandToken || fallbackControlledToken || null;
        }

        return selectedCombatToken || activeBoardHandToken || rememberedCombatToken || fallbackCombatToken || null;
    };

    const getHandSeatForToken = (token) => {
        if (isPlayerView) {
            return token?.controlledBy?.includes(playerName) ? normalizeHandSeatId(playerName) : null;
        }

        const controlledBy = Array.isArray(token?.controlledBy)
            ? token.controlledBy.filter(Boolean)
            : [];
        return controlledBy[0] ? normalizeHandSeatId(controlledBy[0]) : MASTER_HAND_SEAT_ID;
    };

    const getHandCardsForToken = (token, items = activeScenario?.items || []) => {
        if (!token) return [];
        const handSeatId = getHandSeatForToken(token);
        if (!handSeatId) return [];

        const handCards = getVisibleHandCards(items, item => getCardHandTokenId(item) === token.id);
        const explicitSeatCards = handCards.filter(item => item.handSeatId && getCardHandSeatId(item) === handSeatId);

        if (explicitSeatCards.length > 0) return explicitSeatCards;

        return handCards.filter(item => {
            if (getCardHandSeatId(item) === handSeatId && !isLegacyTokenHandCard(item, token.id)) return true;

            return (
                !isPlayerView &&
                handSeatId === MASTER_HAND_SEAT_ID &&
                (!Array.isArray(token.controlledBy) || token.controlledBy.length === 0) &&
                isLegacyTokenHandCard(item, token.id)
            );
        });
    };

    const addCardToHand = (card) => {
        if (!activeScenario || !card?.frontUrl) return;

        const handOwner = getBoardHandOwner();
        const handOwnerId = handOwner?.id || currentUserId;
        const handOwnerName = handOwner?.name || playerName || 'Master';
        const handSeatId = getHandSeatForToken(handOwner) || (isPlayerView ? normalizeHandSeatId(playerName) : MASTER_HAND_SEAT_ID);
        const handSeatName = handSeatId === MASTER_HAND_SEAT_ID ? 'Master' : handSeatId;
        const cardWidth = Math.max(90, (gridConfig.cellWidth || 120) * 0.72);
        const cardHeight = Math.round(cardWidth * 1.4);
        const handOrder = Date.now();

        const newCard = {
            id: `card-${handOrder}`,
            type: 'card',
            x: 0,
            y: 0,
            width: cardWidth,
            height: cardHeight,
            frontImage: card.frontUrl,
            backImage: card.backUrl || null,
            faceDown: false,
            rotation: 0,
            layer: 'CARD',
            name: card.name || 'Carta',
            ownerId: handOwnerId,
            ownerName: handOwnerName,
            handTokenId: handOwnerId,
            handTokenName: handOwnerName,
            handSeatId,
            handSeatName,
            zone: 'hand',
            handOrder,
            snapToGrid: false,
        };

        const nextItems = [...(activeScenario.items || []), newCard];
        setActiveScenario(prev => ({
            ...prev,
            items: nextItems
        }));
        safePersistItems(activeScenario.id, nextItems, activeScenario.items);
    };

    const addCardContainerToBoard = () => {
        if (!activeScenario || !isBoardMode) return;

        const name = 'Tablero';
        const centerX = (WORLD_SIZE / 2) - (offset.x / zoom);
        const centerY = (WORLD_SIZE / 2) - (offset.y / zoom);
        const cardWidth = Math.max(90, (gridConfig.cellWidth || 120) * 0.72);
        const cardHeight = Math.round(cardWidth * 1.4);
        const baseWidth = Math.round((cardWidth * 3) + 48);
        const baseHeight = Math.round(cardHeight + 36);
        const newContainer = {
            id: `card-container-${Date.now()}`,
            type: 'cardContainer',
            x: centerX - (baseWidth / 2),
            y: centerY - (baseHeight / 2),
            width: baseWidth,
            height: baseHeight,
            rotation: 0,
            layer: 'CARD',
            zone: 'board',
            name,
            containerKind: 'board',
            hideContainedCardsForPlayers: !isPlayerView,
            snapToGrid: false,
        };

        const nextItems = [...(activeScenario.items || []), newContainer];
        setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
        setSelectedTokenIds([newContainer.id]);
        lastSelectedIdRef.current = newContainer.id;
        safePersistItems(activeScenario.id, nextItems, activeScenario.items);
    };

    const addDeckToBoard = (deck) => {
        if (!activeScenario || !isBoardMode || !deck) return;

        const deckCards = (deck.cards || []).filter(card => card?.frontUrl);
        if (deckCards.length === 0) {
            triggerToast('Baraja vacía', 'No hay cartas para colocar en el tablero', 'info');
            return;
        }

        const centerX = (WORLD_SIZE / 2) - (offset.x / zoom);
        const centerY = (WORLD_SIZE / 2) - (offset.y / zoom);
        const cardWidth = Math.max(90, (gridConfig.cellWidth || 120) * 0.72);
        const cardHeight = Math.round(cardWidth * 1.4);
        const gapX = Math.round(cardWidth * 0.22);
        const gapY = Math.round(cardHeight * 0.16);
        const paddingX = Math.round(cardWidth * 0.28);
        const paddingTop = Math.round(cardHeight * 0.32);
        const paddingBottom = Math.round(cardHeight * 0.24);
        const maxColumns = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(deckCards.length * 1.35))));
        const columns = Math.min(deckCards.length, maxColumns);
        const rows = Math.ceil(deckCards.length / columns);
        const boardWidth = Math.round((columns * cardWidth) + ((columns - 1) * gapX) + (paddingX * 2));
        const boardHeight = Math.round((rows * cardHeight) + ((rows - 1) * gapY) + paddingTop + paddingBottom);
        const boardX = centerX - (boardWidth / 2);
        const boardY = centerY - (boardHeight / 2);
        const timestamp = Date.now();
        const containerId = `card-container-${timestamp}`;

        const container = {
            id: containerId,
            type: 'cardContainer',
            x: boardX,
            y: boardY,
            width: boardWidth,
            height: boardHeight,
            rotation: 0,
            layer: 'CARD',
            zone: 'board',
            name: deck.name || 'Baraja',
            containerKind: 'deck',
            sourceDeckId: deck.id,
            ownerId: currentUserId,
            ownerName: playerName || (isPlayerView ? currentUserId : 'Master'),
            hideContainedCardsForPlayers: !isPlayerView,
            snapToGrid: false,
        };

        const deckItems = deckCards.map((card, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            return {
                id: `card-${timestamp}-${index}`,
                type: 'card',
                x: boardX + paddingX + (col * (cardWidth + gapX)),
                y: boardY + paddingTop + (row * (cardHeight + gapY)),
                width: cardWidth,
                height: cardHeight,
                frontImage: card.frontUrl,
                backImage: card.backUrl || null,
                faceDown: false,
                rotation: 0,
                layer: 'CARD',
                name: card.name || `Carta ${index + 1}`,
                ownerId: currentUserId,
                ownerName: playerName || (isPlayerView ? currentUserId : 'Master'),
                zone: 'board',
                containerId,
                containerOrder: timestamp + index,
                stackParentId: null,
                stackIds: [],
                sourceDeckId: deck.id,
                sourceCardId: card.id || card.templateId || null,
                snapToGrid: false,
            };
        });

        const nextItems = [...(activeScenario.items || []), container, ...deckItems];
        setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
        setSelectedTokenIds([containerId]);
        lastSelectedIdRef.current = containerId;
        safePersistItems(activeScenario.id, nextItems, activeScenario.items);
    };

    const addBoardMarkerToBoard = () => {
        if (!activeScenario || !isBoardMode) return;

        const centerX = (WORLD_SIZE / 2) - (offset.x / zoom);
        const centerY = (WORLD_SIZE / 2) - (offset.y / zoom);
        const markerWidth = Math.max(14, Math.round((gridConfig.cellWidth || 120) * 0.25));
        const markerHeight = Math.max(14, Math.round((gridConfig.cellHeight || gridConfig.cellWidth || 120) * 0.25));
        const marker = {
            id: `board-marker-${Date.now()}`,
            type: 'boardMarker',
            x: centerX - (markerWidth / 2),
            y: centerY - (markerHeight / 2),
            width: markerWidth,
            height: markerHeight,
            rotation: 0,
            layer: 'MARKER',
            zone: 'board',
            name: 'Velocidad',
            markerValue: 1,
            markerColor: '#c8aa6e',
            isCircular: true,
            snapToGrid: false,
        };

        const nextItems = [...(activeScenario.items || []), marker];
        setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
        setSelectedTokenIds([marker.id]);
        lastSelectedIdRef.current = marker.id;
        safePersistItems(activeScenario.id, nextItems, activeScenario.items);
    };

    const addBoardDieToBoard = () => {
        if (!activeScenario || !isBoardMode) return;

        const centerX = (WORLD_SIZE / 2) - (offset.x / zoom);
        const centerY = (WORLD_SIZE / 2) - (offset.y / zoom);
        const dieWidth = Math.max(36, Math.round((gridConfig.cellWidth || 120) * 0.75));
        const dieHeight = Math.max(36, Math.round((gridConfig.cellHeight || gridConfig.cellWidth || 120) * 0.75));
        const die = {
            id: `board-die-${Date.now()}`,
            type: 'boardDie',
            x: centerX - (dieWidth / 2),
            y: centerY - (dieHeight / 2),
            width: dieWidth,
            height: dieHeight,
            rotation: 0,
            layer: 'DICE',
            zone: 'board',
            name: 'Dado D6',
            dieSides: 6,
            dieValue: 1,
            dieColor: '#c8aa6e',
            dieRotation3d: { x: 0, y: 0.25, z: 0 },
            dieLaunchMode: false,
            snapToGrid: false,
        };

        const nextItems = [...(activeScenario.items || []), die];
        setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
        setSelectedTokenIds([die.id]);
        lastSelectedIdRef.current = die.id;
        safePersistItems(activeScenario.id, nextItems, activeScenario.items);
    };

    const adjustBoardDiceCount = (sides, delta) => {
        setBoardDicePool(prev => {
            const safeSides = Number(sides);
            const current = Math.max(0, Number(prev[safeSides]) || 0);
            return {
                ...prev,
                [safeSides]: Math.max(0, Math.min(MAX_BOARD_DICE_ROLL, current + delta))
            };
        });
    };

    const toggleBoardDiceExplosive = (sides) => {
        const safeSides = Number(sides);
        setBoardDiceExplosive(prev => ({ ...prev, [safeSides]: !prev[safeSides] }));
    };

    const clearBoardDicePool = () => {
        setBoardDicePool(BOARD_DICE_ROLL_SIDES.reduce((acc, sides) => ({ ...acc, [sides]: 0 }), {}));
    };

    const rollBoardDiceValue = (sides) => {
        const safeSides = Number(sides) || 20;
        if (safeSides === 10) {
            const rawValue = Math.floor(Math.random() * 10);
            return {
                value: rawValue === 0 ? 10 : rawValue,
                displayValue: rawValue === 0 ? 0 : rawValue,
                isMaximum: rawValue === 0,
            };
        }

        const value = Math.floor(Math.random() * safeSides) + 1;
        return {
            value,
            displayValue: value,
            isMaximum: value === safeSides,
        };
    };

    const rollBoardDicePool = async () => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!isBoardMode || !currentScenario?.id || isRollingBoardDice) return;

        const poolEntries = BOARD_DICE_ROLL_SIDES
            .map(sides => ({
                sides,
                count: Math.max(0, Math.floor(Number(boardDicePool[sides]) || 0)),
                explosive: !!boardDiceExplosive[sides],
            }))
            .filter(entry => entry.count > 0);
        const totalDice = poolEntries.reduce((sum, entry) => sum + entry.count, 0);

        if (totalDice <= 0) {
            triggerToast('Sin dados', 'Añade al menos un dado a la reserva.', 'warning');
            return;
        }

        if (totalDice > MAX_BOARD_DICE_ROLL) {
            triggerToast('Demasiados dados', `Máximo ${MAX_BOARD_DICE_ROLL} dados por tirada.`, 'warning');
            return;
        }

        const rolls = [];
        let explosionCount = 0;
        poolEntries.forEach(({ sides, count, explosive }) => {
            Array.from({ length: count }).forEach((_, baseIndex) => {
                const chainId = `${sides}-${baseIndex}-${nanoid(5)}`;
                let rollData = rollBoardDiceValue(sides);
                let chainIndex = 0;
                rolls.push({
                    sides,
                    value: rollData.value,
                    displayValue: rollData.displayValue,
                    explosive,
                    chainId,
                    chainIndex,
                });

                while (explosive && rollData.isMaximum && explosionCount < MAX_BOARD_DICE_EXPLOSIONS) {
                    explosionCount += 1;
                    chainIndex += 1;
                    rollData = rollBoardDiceValue(sides);
                    rolls.push({
                        sides,
                        value: rollData.value,
                        displayValue: rollData.displayValue,
                        explosive,
                        exploded: true,
                        chainId,
                        chainIndex,
                    });
                }
            });
        });
        const total = rolls.reduce((sum, roll) => sum + Number(roll.value || 0), 0);
        const rollerName = isPlayerView
            ? (playerName || characterData?.name || 'Jugador')
            : 'Master';

        setIsRollingBoardDice(true);
        try {
            await addDoc(collection(db, scenarioCollectionName, currentScenario.id, 'dice_rolls'), {
                scenarioId: currentScenario.id,
                rollerId: currentUserId || null,
                rollerName,
                pool: poolEntries,
                rolls,
                total,
                timestamp: serverTimestamp(),
                clientTimestamp: Date.now(),
            });
            const cleanupQuery = query(
                collection(db, scenarioCollectionName, currentScenario.id, 'dice_rolls'),
                orderBy('clientTimestamp', 'desc'),
                limit(12)
            );
            const cleanupSnap = await getDocs(cleanupQuery);
            await Promise.all(
                cleanupSnap.docs.slice(3).map((oldDoc) => deleteDoc(oldDoc.ref))
            );
            triggerToast('Tirada registrada', `${totalDice} dado${totalDice === 1 ? '' : 's'} · Total ${total}`, 'success');
        } catch (error) {
            console.error('Error saving board dice roll:', error);
            triggerToast('Error', 'No se pudo registrar la tirada.', 'error');
        } finally {
            setIsRollingBoardDice(false);
        }
    };

    const toggleBoardDiceRollDie = async (roll, dieIndex) => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!isBoardMode || !currentScenario?.id || !roll?.id || !Number.isInteger(dieIndex)) return;

        const rolls = Array.isArray(roll.rolls) ? roll.rolls : [];
        if (dieIndex < 0 || dieIndex >= rolls.length) return;

        const currentExcluded = Array.isArray(roll.excludedRollIndexes)
            ? roll.excludedRollIndexes.filter(index => Number.isInteger(index))
            : [];
        const excludedSet = new globalThis.Set(currentExcluded);

        if (excludedSet.has(dieIndex)) {
            excludedSet.delete(dieIndex);
        } else {
            excludedSet.add(dieIndex);
        }

        const excludedRollIndexes = Array.from(excludedSet).sort((a, b) => a - b);
        const effectiveTotal = rolls.reduce((sum, die, index) => (
            excludedSet.has(index) ? sum : sum + (Number(die.value) || 0)
        ), 0);

        try {
            await updateDoc(doc(db, scenarioCollectionName, currentScenario.id, 'dice_rolls', roll.id), {
                excludedRollIndexes,
                effectiveTotal,
                lastModified: Date.now(),
            });
        } catch (error) {
            console.error('Error toggling board dice roll die:', error);
            triggerToast('Error', 'No se pudo modificar la tirada.', 'error');
        }
    };

    const removeCardFromContainer = (containerId, cardId) => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!currentScenario || !containerId || !cardId) return;

        const container = (currentScenario.items || []).find(item => item.id === containerId);
        const card = (currentScenario.items || []).find(item => item.id === cardId);
        if (!isCardContainerItem(container) || !isCardItem(card)) return;

        // Determinar si es una carta con pila debajo (padre) o individual
        const isParent = getCardStackIds(card).length > 0;

        // Si es padre, sacamos todo su montón junto para mantener el apilado y no dejar cartas huérfanas/invisibles
        // Si es hijo, solo sacamos esa carta individual
        const movingIds = new globalThis.Set(isParent
            ? [card.id, ...getCardStackIds(card)].filter(Boolean)
            : [card.id]
        );

        const nextItems = (currentScenario.items || []).map(item => {
            if (movingIds.has(item.id) && isCardItem(item)) {
                return {
                    ...item,
                    zone: 'board',
                    containerId: null,
                    containerOrder: null,
                    // Si es hijo individual que sacamos, se desvincula de la pila
                    stackParentId: isParent ? item.stackParentId : null,
                    stackIds: isParent ? item.stackIds : [],
                    x: container.x + container.width + 18,
                    y: container.y + Math.max(0, (container.height - (item.height || container.height)) / 2),
                    rotation: 0,
                };
            }

            // Si una carta de la mesa contenía la carta sacada en su stack, la filtramos (desapilado de hija)
            if (Array.isArray(item.stackIds) && item.stackIds.includes(cardId) && !isParent) {
                return {
                    ...item,
                    stackIds: item.stackIds.filter(id => id !== cardId),
                };
            }

            return item;
        });

        // Saneamos relaciones de pilas
        const finalItems = sanitizeCardStacks(nextItems);

        setActiveScenario(prev => prev ? { ...prev, items: finalItems } : prev);
        setSelectedTokenIds([cardId]);
        lastSelectedIdRef.current = cardId;
        cardStackQuickActionBlockUntilRef.current = Date.now() + 220;
        safePersistItems(currentScenario.id, finalItems, currentScenario.items, Array.from(movingIds));
    };

    const moveBoardCardToHand = (cardId) => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!currentScenario || !cardId) return;

        const handOwner = getBoardHandOwner();
        const handOwnerId = handOwner?.id || currentUserId;
        const handOwnerName = handOwner?.name || playerName || 'Master';
        const handSeatId = getHandSeatForToken(handOwner) || (isPlayerView ? normalizeHandSeatId(playerName) : MASTER_HAND_SEAT_ID);
        const handSeatName = handSeatId === MASTER_HAND_SEAT_ID ? 'Master' : handSeatId;
        const handOrder = Date.now();
        const result = moveBoardCardPileToHand(currentScenario.items || [], cardId, {
            ownerId: handOwnerId,
            ownerName: handOwnerName,
            handTokenId: handOwnerId,
            handTokenName: handOwnerName,
            handSeatId,
            handSeatName,
        }, handOrder);
        if (!result.moved) return;

        const transferLockExpiresAt = Date.now() + RECENT_LOCAL_WRITE_PROTECTION_MS;
        const changedIdSet = new globalThis.Set(result.changedIds);
        result.items.forEach(item => {
            if (changedIdSet.has(item.id) && isHandCardItem(item)) {
                pendingBoardHandTransferLocksRef.current.set(item.id, transferLockExpiresAt);
            }
        });
        const optimisticScenario = { ...currentScenario, items: result.items };
        activeScenarioRef.current = optimisticScenario;
        setActiveScenario(prev => prev ? { ...prev, items: result.items } : prev);
        setSelectedTokenIds(prev => prev.filter(id => !result.changedIds.includes(id)));
        safePersistItems(currentScenario.id, result.items, currentScenario.items, result.changedIds);
    };

    const playHandCardToBoard = (card, clientPoint = null) => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!currentScenario || !card?.id) return;

        if (boardCardHandTransferRef.current === card.id) {
            boardCardHandTransferRef.current = null;
        }
        pendingBoardHandTransferLocksRef.current.delete(card.id);
        clearBoardHandHoverSuppression();

        const cardWidth = card.width || Math.max(90, (gridConfig.cellWidth || 120) * 0.72);
        const cardHeight = card.height || Math.round(cardWidth * 1.4);
        const worldPoint = clientPoint
            ? divToWorld(clientPoint.x, clientPoint.y)
            : {
                x: (WORLD_SIZE / 2) - (offset.x / zoom),
                y: (WORLD_SIZE / 2) - (offset.y / zoom)
            };

        const stackIds = getCardStackIds(card);
        const promotedId = stackIds[0] || null;
        const remainingStackIds = stackIds.slice(1);

        const nextItems = sanitizeCardStacks((currentScenario.items || []).map(item => {
            if (item.id === card.id) {
                return {
                    ...item,
                    zone: 'board',
                    containerId: null,
                    containerOrder: null,
                    stackParentId: null,
                    stackIds: [],
                    x: worldPoint.x - (cardWidth / 2),
                    y: worldPoint.y - (cardHeight / 2),
                    width: cardWidth,
                    height: cardHeight,
                };
            }

            if (promotedId && item.id === promotedId) {
                return {
                    ...item,
                    zone: 'hand',
                    stackParentId: null,
                    stackIds: remainingStackIds,
                    handOrder: card.handOrder || item.handOrder || Date.now(),
                };
            }

            if (remainingStackIds.includes(item.id)) {
                return {
                    ...item,
                    zone: 'hand',
                    stackParentId: promotedId,
                    stackIds: [],
                };
            }

            return item;
        }));

        setActiveScenario(prev => prev ? { ...prev, items: nextItems } : prev);
        safePersistItems(
            currentScenario.id,
            nextItems,
            currentScenario.items,
            [card.id, promotedId, ...remainingStackIds].filter(Boolean)
        );
    };

    const getBoardCardPreviewImage = (card) => getCardDisplayImage(card);

    const clearCardPreviewHold = () => {
        const hold = cardPreviewHoldRef.current;
        if (!hold) return;
        if (hold.timer) clearTimeout(hold.timer);
        hold.cleanup?.();
        cardPreviewHoldRef.current = null;
    };

    const closeBoardCardPreview = () => {
        setPreviewedBoardCard(null);
        window.setTimeout(() => {
            cardPreviewSuppressTouchEndRef.current = false;
        }, 0);
    };

    const openBoardCardPreview = (card) => {
        const image = getBoardCardPreviewImage(card);
        if (image) {
            const preload = new globalThis.Image();
            preload.onload = () => markImageUrlLoaded(image);
            preload.src = image;
        }
        setPreviewedBoardCard({
            id: card.id,
            name: card.name || 'Carta',
            image,
            faceDown: !!card.faceDown,
        });
    };

    const scheduleHandDragVisual = (point) => {
        if (!point) return;
        handDragPointRef.current = point;
        if (handDragFrameRef.current !== null) return;

        handDragFrameRef.current = window.requestAnimationFrame(() => {
            handDragFrameRef.current = null;
            const nextPoint = handDragPointRef.current;
            const ghost = handDragGhostRef.current;
            if (!nextPoint || !ghost) return;
            ghost.style.setProperty('--hand-drag-x', `${nextPoint.x - 36}px`);
            ghost.style.setProperty('--hand-drag-y', `${nextPoint.y - 52}px`);
        });
    };

    const updateHandDragTarget = (point) => {
        const target = getBoardHandReorderTarget(point);
        setDraggingHandCard(prev => {
            if (!prev) return prev;
            if (prev.overHand === target.overHand && prev.dropIndex === target.dropIndex) return prev;
            return { ...prev, ...target };
        });
        return target;
    };

    const beginHandCardDrag = (card, point, { managedTouch = false } = {}) => {
        if (boardCardHandTransferRef.current === card.id) {
            boardCardHandTransferRef.current = null;
        }
        clearBoardHandHoverSuppression();
        const geometry = captureBoardHandDragGeometry(card.id);
        const originIndex = Math.max(0, geometry.orderedCardIds.indexOf(card.id));
        const target = getBoardHandReorderTarget(point, geometry);
        handDragPointRef.current = point;
        document.body.style.cursor = 'grabbing';
        setDraggingHandCard({
            card,
            managedTouch,
            originIndex,
            initialX: point.x,
            initialY: point.y,
            overHand: target.overHand,
            dropIndex: target.overHand ? target.dropIndex : originIndex,
        });
    };

    const clearHandCardDrag = () => {
        if (handDragFrameRef.current !== null) {
            window.cancelAnimationFrame(handDragFrameRef.current);
            handDragFrameRef.current = null;
        }
        handDragGeometryRef.current = null;
        handDragPointRef.current = null;
        document.body.style.cursor = 'default';
        setDraggingHandCard(null);
    };

    const finishHandCardDrag = (card, point, { cancelled = false } = {}) => {
        if (!card?.id || cancelled) {
            clearHandCardDrag();
            return;
        }

        const target = getBoardHandReorderTarget(point);
        if (target.overHand) {
            const currentScenario = activeScenarioRef.current || activeScenario;
            const handCardIds = handDragGeometryRef.current?.orderedCardIds || [];
            const result = reorderHandCards(
                currentScenario?.items || [],
                handCardIds,
                card.id,
                target.dropIndex
            );

            if (currentScenario && result.moved) {
                setActiveScenario(prev => prev ? { ...prev, items: result.items } : prev);
                safePersistItems(currentScenario.id, result.items, currentScenario.items, result.changedIds);
            }
        } else {
            playHandCardToBoard(card, point);
        }

        clearHandCardDrag();
    };

    const startBoardCardLongPressPreview = (card, event, { cancelBoardDrag = false, allowTouchDragToBoard = false } = {}) => {
        if (!isBoardMode || !isCardItem(card) || !event?.type?.startsWith('touch')) return false;
        const startPoint = getEventCoords(event);
        const touchId = event.touches?.[0]?.identifier ?? null;
        const moveThreshold = 12;
        const longPressMs = 480;
        let openedPreview = false;
        let startedHandDrag = false;

        clearCardPreviewHold();
        event.stopPropagation();

        const cleanup = () => {
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('touchcancel', handleEnd);
        };

        const startHandDragFromPoint = (point) => {
            if (startedHandDrag) return;
            startedHandDrag = true;
            beginHandCardDrag(card, point, { managedTouch: true });
        };

        const timer = window.setTimeout(() => {
            if (startedHandDrag) return;
            openedPreview = true;
            cardPreviewSuppressTouchEndRef.current = true;
            if (cancelBoardDrag) {
                setDraggedTokenId(null);
                setRotatingTokenId(null);
                setResizingTokenId(null);
                setTokenOriginalPos({});
                setDragVisualOrigin({});
                setCombatOccupancyFeedback(null);
                document.body.style.cursor = 'default';
            }
            openBoardCardPreview(card);
        }, longPressMs);

        function handleMove(moveEvent) {
            const point = getEventCoords(moveEvent, touchId);
            const moved = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
            if (openedPreview) {
                if (moveEvent.cancelable) moveEvent.preventDefault();
                return;
            }
            if (moved > moveThreshold) {
                clearTimeout(timer);
                if (allowTouchDragToBoard) {
                    startHandDragFromPoint(point);
                    scheduleHandDragVisual(point);
                    updateHandDragTarget(point);
                    if (moveEvent.cancelable) moveEvent.preventDefault();
                } else {
                    cleanup();
                    cardPreviewHoldRef.current = null;
                }
            }
        }

        function handleEnd(endEvent) {
            clearTimeout(timer);
            const point = getEventCoords(endEvent, touchId);
            if (startedHandDrag) {
                finishHandCardDrag(card, point, { cancelled: endEvent.type === 'touchcancel' });
            }
            if (openedPreview) {
                closeBoardCardPreview();
            }
            cleanup();
            cardPreviewHoldRef.current = null;
        }

        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('touchcancel', handleEnd);
        cardPreviewHoldRef.current = { timer, cleanup };
        return true;
    };

    useEffect(() => () => clearCardPreviewHold(), []);

    const handleHandCardDragStart = (card, event) => {
        if (!isBoardMode || !card?.id) return;
        const point = getEventCoords(event);
        event.stopPropagation();
        if (!event.type?.startsWith('touch') && event.cancelable) event.preventDefault();
        const previewSrc = getCardDisplayImage(card);
        if (previewSrc) {
            const preload = new globalThis.Image();
            preload.onload = () => markImageUrlLoaded(previewSrc);
            preload.src = previewSrc;
        }
        if (event.type?.startsWith('touch')) {
            startBoardCardLongPressPreview(card, event, { allowTouchDragToBoard: true });
            return;
        }
        beginHandCardDrag(card, point);
    };

    useEffect(() => {
        if (!draggingHandCard || draggingHandCard.managedTouch) return;

        const handleMove = (event) => {
            const point = getEventCoords(event);
            scheduleHandDragVisual(point);
            updateHandDragTarget(point);
        };

        const handleUp = (event) => {
            const point = getEventCoords(event);
            finishHandCardDrag(draggingHandCard.card, point);
        };

        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            clearHandCardDrag();
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [draggingHandCard?.card?.id, draggingHandCard?.managedTouch, isBoardMode]);

    useEffect(() => () => {
        if (handDragFrameRef.current !== null) {
            window.cancelAnimationFrame(handDragFrameRef.current);
        }
        boardHandHoverSuppressionCleanupRef.current?.();
        document.body.style.cursor = 'default';
    }, []);

    const toggleHandCardFace = (card) => {
        if (!card?.id) return;
        updateItem(card.id, { faceDown: !card.faceDown }, true);
    };

    const unstackTopCard = (stackParentId) => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!currentScenario || !stackParentId) return;

        const result = takeTopCardFromStack(currentScenario.items || [], stackParentId);
        if (!result.releasedCardId) return;

        setActiveScenario(prev => prev ? { ...prev, items: result.items } : prev);
        setSelectedTokenIds([result.releasedCardId]);
        lastSelectedIdRef.current = result.releasedCardId;
        safePersistItems(currentScenario.id, result.items, currentScenario.items, result.changedIds);
    };

    const unstackAllCards = (stackParentId) => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!currentScenario || !stackParentId) return;

        const result = spreadCardStack(currentScenario.items || [], stackParentId);
        if (result.releasedCardIds.length === 0) return;

        setActiveScenario(prev => prev ? { ...prev, items: result.items } : prev);
        safePersistItems(currentScenario.id, result.items, currentScenario.items, result.changedIds);
    };

    const consumeCardStackQuickActionEvent = (event) => {
        event.stopPropagation();
        event.preventDefault();
        event.nativeEvent?.stopImmediatePropagation?.();
        cardStackQuickActionBlockUntilRef.current = Date.now() + 450;
        setDraggedTokenId(null);
        setRotatingTokenId(null);
        setResizingTokenId(null);
        setDraggingWallHandle(null);
        setTokenOriginalPos({});
        setDragVisualOrigin({});
        setCombatOccupancyFeedback(null);
        document.body.style.cursor = 'default';
    };

    const unstackSpecificCard = (stackParentId, cardId) => {
        const currentScenario = activeScenarioRef.current || activeScenario;
        if (!currentScenario || !stackParentId || !cardId) return;

        const result = takeCardFromStack(currentScenario.items || [], stackParentId, cardId);
        if (!result.releasedCardId) return;

        setActiveScenario(prev => prev ? { ...prev, items: result.items } : prev);
        setSelectedTokenIds([cardId]);
        lastSelectedIdRef.current = cardId;
        safePersistItems(currentScenario.id, result.items, currentScenario.items, result.changedIds);
    };

    return {
        handleBoardCardBackUpload,
        addCardToBoard,
        getHandCardsForToken,
        addCardToHand,
        addCardContainerToBoard,
        addDeckToBoard,
        addBoardMarkerToBoard,
        addBoardDieToBoard,
        adjustBoardDiceCount,
        toggleBoardDiceExplosive,
        clearBoardDicePool,
        rollBoardDicePool,
        toggleBoardDiceRollDie,
        removeCardFromContainer,
        moveBoardCardToHand,
        playHandCardToBoard,
        closeBoardCardPreview,
        openBoardCardPreview,
        startBoardCardLongPressPreview,
        handleHandCardDragStart,
        toggleHandCardFace,
        consumeCardStackQuickActionEvent,
        unstackSpecificCard,
    };
};
