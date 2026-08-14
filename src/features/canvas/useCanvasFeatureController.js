import { useCallback, useEffect, useState } from 'react';
import {
    CANVAS_INVENTORY_DRAG_END_EVENT,
    CANVAS_INVENTORY_DRAG_PREVIEW_EVENT,
    CANVAS_INVENTORY_DROP_EVENT,
    addCanvasLootToInventory,
    centerCanvasLootInGridCell,
    createCanvasLootSceneItem,
    detachCanvasInventoryItem,
    findCanvasLootPosition,
    isCanvasLootItem,
    resolveCanvasLootRecipient,
    resolveCanvasInventoryItemIdentity,
} from './canvasInventoryTransfer';

const noop = () => undefined;
const emptyList = () => [];

/**
 * Canvas feature boundary for tabletop-only commands.
 * Keeping these inert commands outside the shared core means CanvasSection does
 * not import or initialize the board cards/dice controller.
 */
export const useCanvasFeatureController = ({
    activeScenario,
    activeScenarioRef,
    divToWorld,
    gridConfig,
    isPlayerView,
    playerName,
    safePersistItems,
    setActiveScenario,
    setSelectedTokenIds,
    triggerToast,
}) => {
    const [sceneDropPreview, setSceneDropPreview] = useState(null);

    const handleModeItemDrop = useCallback(({
        draggedItemId,
        finalItems,
        interactionOriginalItems,
        scenarioId,
    }) => {
        const movedLoot = finalItems.find((item) => item.id === draggedItemId && isCanvasLootItem(item));
        if (!movedLoot) return false;

        const { recipient, blockedRecipient } = resolveCanvasLootRecipient({
            loot: movedLoot,
            items: finalItems,
            isPlayerView,
            playerName,
        });

        if (blockedRecipient) {
            setActiveScenario((current) => (
                current?.id === scenarioId ? { ...current, items: interactionOriginalItems } : current
            ));
            setSelectedTokenIds([movedLoot.id]);
            triggerToast(
                'No puedes entregar el objeto',
                `${blockedRecipient.name || 'Esa ficha'} no está bajo tu control`,
                'warning',
            );
            return true;
        }

        if (recipient) {
            const nextRecipient = {
                ...addCanvasLootToInventory(recipient, movedLoot.lootItem),
                runtimeDirty: false,
            };
            const nextItems = finalItems
                .filter((item) => item.id !== movedLoot.id)
                .map((item) => (item.id === recipient.id ? nextRecipient : item));

            setActiveScenario((current) => (
                current?.id === scenarioId ? { ...current, items: nextItems } : current
            ));
            safePersistItems(
                scenarioId,
                nextItems,
                interactionOriginalItems,
                [recipient.id, movedLoot.id],
                { persistRuntime: true },
            );
            setSelectedTokenIds([recipient.id]);
            triggerToast(
                'Objeto recogido',
                `${movedLoot.name} se ha añadido al inventario de ${recipient.name || 'la ficha'}`,
                'success',
            );
            return true;
        }

        const centeredLoot = centerCanvasLootInGridCell(movedLoot, gridConfig);
        const nextItems = finalItems.map((item) => (item.id === movedLoot.id ? centeredLoot : item));
        setActiveScenario((current) => (
            current?.id === scenarioId ? { ...current, items: nextItems } : current
        ));
        safePersistItems(
            scenarioId,
            nextItems,
            interactionOriginalItems,
            [movedLoot.id],
            { persistRuntime: false },
        );
        setSelectedTokenIds([movedLoot.id]);
        return true;
    }, [
        gridConfig,
        isPlayerView,
        playerName,
        safePersistItems,
        setActiveScenario,
        setSelectedTokenIds,
        triggerToast,
    ]);

    useEffect(() => {
        const handleInventoryDragPreview = (event) => {
            const scenario = activeScenarioRef.current || activeScenario;
            const detail = event.detail || {};
            const sourceToken = (scenario?.items || []).find((item) => item.id === detail.sourceTokenId);
            if (!scenario?.id || !sourceToken || !Number.isFinite(detail.clientX) || !Number.isFinite(detail.clientY)) {
                setSceneDropPreview(null);
                return;
            }
            const position = findCanvasLootPosition({
                worldPoint: divToWorld(detail.clientX, detail.clientY),
                sourceToken,
                items: scenario.items,
                gridConfig,
            });
            const nextPreview = {
                ...position.cellRect,
                cellKey: `${position.gridCell.x}:${position.gridCell.y}`,
            };
            setSceneDropPreview((current) => (
                current?.cellKey === nextPreview.cellKey ? current : nextPreview
            ));
        };

        const clearInventoryDragPreview = () => setSceneDropPreview(null);

        const handleInventoryDrop = (event) => {
            const scenario = activeScenarioRef.current || activeScenario;
            const detail = event.detail || {};
            if (!scenario?.id || !detail.sourceTokenId) return;

            const sourceToken = (scenario.items || []).find((item) => item.id === detail.sourceTokenId);
            if (!sourceToken || !['rogueliteClass', 'rogueliteEnemy'].includes(sourceToken.profileType)) return;
            const canManageInventory = !isPlayerView
                || (Array.isArray(sourceToken.controlledBy) && sourceToken.controlledBy.includes(playerName));
            if (!canManageInventory) {
                triggerToast('No puedes soltar este objeto', 'La ficha no está bajo tu control', 'warning');
                return;
            }

            const inventory = Array.isArray(sourceToken.inventory) ? sourceToken.inventory : [];
            let itemIndex = Number(detail.itemIndex);
            if (
                detail.itemIdentity
                && resolveCanvasInventoryItemIdentity(inventory[itemIndex]) !== detail.itemIdentity
            ) {
                itemIndex = inventory.findIndex((item) => (
                    resolveCanvasInventoryItemIdentity(item) === detail.itemIdentity
                ));
            }
            const detached = detachCanvasInventoryItem(sourceToken, itemIndex);
            if (!detached) return;

            const position = findCanvasLootPosition({
                worldPoint: divToWorld(detail.clientX, detail.clientY),
                sourceToken,
                items: scenario.items,
                gridConfig,
            });
            const loot = createCanvasLootSceneItem({
                item: detached.item,
                image: detail.image,
                sourceToken,
                position,
            });
            const nextSourceToken = { ...sourceToken, ...detached.updates, runtimeDirty: false };
            const nextItems = scenario.items
                .map((item) => (item.id === sourceToken.id ? nextSourceToken : item))
                .concat(loot);

            setActiveScenario((current) => (
                current?.id === scenario.id ? { ...current, items: nextItems } : current
            ));
            safePersistItems(
                scenario.id,
                nextItems,
                scenario.items,
                [sourceToken.id, loot.id],
                { persistRuntime: true },
            );
            setSelectedTokenIds([sourceToken.id]);
            triggerToast('Objeto en el suelo', `${loot.name} puede arrastrarse hasta una ficha`, 'success');
        };

        window.addEventListener(CANVAS_INVENTORY_DRAG_PREVIEW_EVENT, handleInventoryDragPreview);
        window.addEventListener(CANVAS_INVENTORY_DRAG_END_EVENT, clearInventoryDragPreview);
        window.addEventListener(CANVAS_INVENTORY_DROP_EVENT, handleInventoryDrop);
        return () => {
            window.removeEventListener(CANVAS_INVENTORY_DRAG_PREVIEW_EVENT, handleInventoryDragPreview);
            window.removeEventListener(CANVAS_INVENTORY_DRAG_END_EVENT, clearInventoryDragPreview);
            window.removeEventListener(CANVAS_INVENTORY_DROP_EVENT, handleInventoryDrop);
        };
    }, [
        activeScenario,
        activeScenarioRef,
        divToWorld,
        gridConfig,
        isPlayerView,
        playerName,
        safePersistItems,
        setActiveScenario,
        setSelectedTokenIds,
        triggerToast,
    ]);

    return {
        handleModeItemDrop,
        sceneDropPreview,
        handleBoardCardBackUpload: noop,
        addCardToBoard: noop,
        getHandCardsForToken: emptyList,
        addCardToHand: noop,
        addCardContainerToBoard: noop,
        addDeckToBoard: noop,
        addBoardMarkerToBoard: noop,
        addBoardDieToBoard: noop,
        adjustBoardDiceCount: noop,
        toggleBoardDiceExplosive: noop,
        clearBoardDicePool: noop,
        rollBoardDicePool: noop,
        toggleBoardDiceRollDie: noop,
        removeCardFromContainer: noop,
        moveBoardCardToHand: noop,
        playHandCardToBoard: noop,
        closeBoardCardPreview: noop,
        openBoardCardPreview: noop,
        startBoardCardLongPressPreview: noop,
        handleHandCardDragStart: noop,
        toggleHandCardFace: noop,
        consumeCardStackQuickActionEvent: noop,
        unstackSpecificCard: noop,
    };
};
