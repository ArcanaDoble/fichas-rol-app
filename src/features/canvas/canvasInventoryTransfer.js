import { resolveRogueliteEquippedItems } from './rogueliteTokenSheetSync';

export const CANVAS_INVENTORY_DROP_EVENT = 'noma:canvas-inventory-drop';
export const CANVAS_INVENTORY_DRAG_PREVIEW_EVENT = 'noma:canvas-inventory-drag-preview';
export const CANVAS_INVENTORY_DRAG_END_EVENT = 'noma:canvas-inventory-drag-end';

export const isCanvasLootItem = (item) => item?.sceneItemKind === 'canvasLoot';

export const resolveCanvasInventoryItemIdentity = (item) => (
    item?.runItemId || item?.instanceId || item?.templateId || item?.id || item?.name || item?.nombre || null
);

export const canvasInventoryItemsMatch = (left, right) => {
    const leftIdentity = resolveCanvasInventoryItemIdentity(left);
    const rightIdentity = resolveCanvasInventoryItemIdentity(right);
    return Boolean(leftIdentity && rightIdentity && leftIdentity === rightIdentity);
};

export const reorderCanvasInventory = (inventory = [], fromIndex, toIndex) => {
    if (!Array.isArray(inventory)) return [];
    if (fromIndex === toIndex) return inventory;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= inventory.length || toIndex >= inventory.length) {
        return inventory;
    }

    const reordered = [...inventory];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);
    return reordered;
};

export const removeCanvasItemFromLoadout = (loadout = {}, removedItem) => {
    const clearIfMatch = (item) => (canvasInventoryItemsMatch(item, removedItem) ? null : item);
    const weaponSets = Array.isArray(loadout.weaponSets)
        ? loadout.weaponSets.map((weaponSet) => ({
            ...weaponSet,
            mainHand: clearIfMatch(weaponSet?.mainHand),
            offHand: clearIfMatch(weaponSet?.offHand),
        }))
        : loadout.weaponSets;
    const nextLoadout = {
        ...loadout,
        ...(weaponSets ? { weaponSets } : {}),
    };

    Object.keys(nextLoadout).forEach((slot) => {
        if (slot === 'weaponSets') return;
        if (nextLoadout[slot] && typeof nextLoadout[slot] === 'object') {
            nextLoadout[slot] = clearIfMatch(nextLoadout[slot]);
        }
    });

    return nextLoadout;
};

export const detachCanvasInventoryItem = (token, itemIndex) => {
    const inventory = Array.isArray(token?.inventory) ? token.inventory : [];
    const removedItem = inventory[itemIndex];
    if (!removedItem) return null;

    const nextInventory = inventory.filter((_, index) => index !== itemIndex);
    if (token.profileType === 'rogueliteEnemy') {
        return {
            item: removedItem,
            updates: {
                inventory: nextInventory,
                equippedItems: (token.equippedItems || []).filter((item) => !canvasInventoryItemsMatch(item, removedItem)),
                enemyAbilities: (token.enemyAbilities || []).filter((item) => !canvasInventoryItemsMatch(item, removedItem)),
            },
        };
    }

    const wasPrepared = removedItem.isEquipped || removedItem.isPrepared;
    const nextLoadout = wasPrepared
        ? removeCanvasItemFromLoadout(token.equipmentLoadout || {}, removedItem)
        : (token.equipmentLoadout || {});
    const nextEquipped = resolveRogueliteEquippedItems(nextLoadout);
    const equippedIdentities = new Set(nextEquipped.items.map(resolveCanvasInventoryItemIdentity).filter(Boolean));
    const removedIdentity = resolveCanvasInventoryItemIdentity(removedItem);
    const isAbility = removedItem.type === 'ability'
        || removedItem.itemType === 'ability'
        || removedItem._category === 'abilities';

    return {
        item: removedItem,
        updates: {
            inventory: nextInventory.map((item) => ({
                ...item,
                isEquipped: equippedIdentities.has(resolveCanvasInventoryItemIdentity(item)),
            })),
            equipmentLoadout: nextEquipped.loadout,
            equippedItems: nextEquipped.items,
            activeWeaponSet: nextEquipped.activeWeaponSet,
            equippedSkillIds: isAbility && wasPrepared
                ? (token.equippedSkillIds || []).map((skillId) => (skillId === removedIdentity ? null : skillId))
                : token.equippedSkillIds,
            runtimeDirty: true,
        },
    };
};

const getCell = (x, y, gridConfig = {}) => ({
    x: Math.floor(Number(x || 0) / Math.max(1, Number(gridConfig.cellWidth) || 50)),
    y: Math.floor(Number(y || 0) / Math.max(1, Number(gridConfig.cellHeight) || 50)),
});

const getOccupiedCells = (items = [], gridConfig = {}) => {
    const occupied = new Set();
    items.forEach((item) => {
        if (!item || isCanvasLootItem(item) || item.layer !== 'TOKEN') return;
        const cell = getCell(
            Number(item.x || 0) + (Number(item.width || 0) / 2),
            Number(item.y || 0) + (Number(item.height || 0) / 2),
            gridConfig,
        );
        occupied.add(`${cell.x}:${cell.y}`);
    });
    return occupied;
};

export const findCanvasLootPosition = ({ worldPoint, sourceToken, items = [], gridConfig = {} }) => {
    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const tokenCenter = sourceToken
        ? {
            x: Number(sourceToken.x || 0) + (Number(sourceToken.width || cellWidth) / 2),
            y: Number(sourceToken.y || 0) + (Number(sourceToken.height || cellHeight) / 2),
        }
        : { x: 0, y: 0 };
    const start = getCell(worldPoint?.x ?? tokenCenter.x, worldPoint?.y ?? tokenCenter.y, gridConfig);
    const occupied = getOccupiedCells(items, gridConfig);
    const candidates = [start];

    for (let radius = 1; radius <= 4; radius += 1) {
        for (let y = -radius; y <= radius; y += 1) {
            for (let x = -radius; x <= radius; x += 1) {
                if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
                candidates.push({ x: start.x + x, y: start.y + y });
            }
        }
    }

    const target = candidates.find((cell) => !occupied.has(`${cell.x}:${cell.y}`)) || start;
    const size = Math.max(18, Math.min(cellWidth, cellHeight) * 0.5);
    return {
        x: (target.x * cellWidth) + ((cellWidth - size) / 2),
        y: (target.y * cellHeight) + ((cellHeight - size) / 2),
        width: size,
        height: size,
        gridCell: target,
        cellRect: {
            x: target.x * cellWidth,
            y: target.y * cellHeight,
            width: cellWidth,
            height: cellHeight,
        },
    };
};

export const centerCanvasLootInGridCell = (loot, gridConfig = {}) => {
    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const width = Math.max(1, Number(loot?.width) || Math.min(cellWidth, cellHeight) * 0.5);
    const height = Math.max(1, Number(loot?.height) || width);
    const centerX = Number(loot?.x || 0) + (width / 2);
    const centerY = Number(loot?.y || 0) + (height / 2);
    const cell = getCell(centerX, centerY, gridConfig);

    return {
        ...loot,
        x: (cell.x * cellWidth) + ((cellWidth - width) / 2),
        y: (cell.y * cellHeight) + ((cellHeight - height) / 2),
    };
};

const isCanvasLootRecipient = (item) => (
    Boolean(item)
    && !isCanvasLootItem(item)
    && (!item.layer || item.layer === 'TOKEN')
    && !['light', 'wall', 'geometry', 'card', 'card_container', 'boardMarker', 'boardDie'].includes(item.type)
);

const getOverlapArea = (left, right) => {
    const overlapWidth = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
    const overlapHeight = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
    return overlapWidth * overlapHeight;
};

export const resolveCanvasLootRecipient = ({
    loot,
    items = [],
    isPlayerView = false,
    playerName = '',
}) => {
    if (!loot) return { recipient: null, blockedRecipient: null };
    const lootRect = {
        x: Number(loot.x || 0),
        y: Number(loot.y || 0),
        width: Math.max(1, Number(loot.width) || 1),
        height: Math.max(1, Number(loot.height) || 1),
    };
    const lootCenter = {
        x: lootRect.x + (lootRect.width / 2),
        y: lootRect.y + (lootRect.height / 2),
    };
    const candidates = items
        .filter((item) => item.id !== loot.id && isCanvasLootRecipient(item))
        .map((item) => {
            const rect = {
                x: Number(item.x || 0),
                y: Number(item.y || 0),
                width: Math.max(1, Number(item.width) || 1),
                height: Math.max(1, Number(item.height) || 1),
            };
            const containsCenter = (
                lootCenter.x >= rect.x
                && lootCenter.x <= rect.x + rect.width
                && lootCenter.y >= rect.y
                && lootCenter.y <= rect.y + rect.height
            );
            return {
                item,
                overlap: getOverlapArea(lootRect, rect),
                containsCenter,
            };
        })
        .filter(({ overlap, containsCenter }) => overlap > 0 || containsCenter)
        .sort((left, right) => (
            Number(right.containsCenter) - Number(left.containsCenter)
            || right.overlap - left.overlap
        ));

    const target = candidates[0]?.item || null;
    if (!target) return { recipient: null, blockedRecipient: null };
    const canControlTarget = !isPlayerView
        || (Array.isArray(target.controlledBy) && target.controlledBy.includes(playerName));

    return canControlTarget
        ? { recipient: target, blockedRecipient: null }
        : { recipient: null, blockedRecipient: target };
};

const createLootId = () => (
    globalThis.crypto?.randomUUID?.() || `canvas-loot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

export const createCanvasLootSceneItem = ({ item, image, sourceToken, position }) => ({
    id: createLootId(),
    type: 'scenePickup',
    sceneItemKind: 'canvasLoot',
    layer: 'TOKEN',
    name: item?.name || item?.nombre || 'Objeto',
    img: image || item?.image || item?.img || item?.imageUrl || null,
    x: position.x,
    y: position.y,
    width: position.width,
    height: position.height,
    rotation: 0,
    snapToGrid: false,
    isCircular: false,
    lootItem: {
        ...item,
        isEquipped: false,
        isPrepared: false,
    },
    droppedByTokenId: sourceToken?.id || null,
    droppedByName: sourceToken?.name || null,
    droppedAt: Date.now(),
});

export const addCanvasLootToInventory = (token, lootItem) => ({
    ...token,
    inventory: [
        ...(Array.isArray(token?.inventory) ? token.inventory : []),
        {
            ...lootItem,
            isEquipped: false,
            isPrepared: false,
        },
    ],
    runtimeDirty: true,
});
