import { resolveRogueliteEquippedItems } from './rogueliteTokenSheetSync';
import { getGridWorldRect } from '../tactical-shared/spatial';
import { getCombatRenderPlacement } from '../tactical-shared/legacyCombatRules';

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

const getCell = (x, y, gridConfig = {}) => {
    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const gridRect = getGridWorldRect(gridConfig);
    return {
        x: Math.floor((Number(x || 0) - gridRect.x) / cellWidth),
        y: Math.floor((Number(y || 0) - gridRect.y) / cellHeight),
    };
};

export const getGridCellWorldRect = (cell = { x: 0, y: 0 }, gridConfig = {}) => {
    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const gridRect = getGridWorldRect(gridConfig);
    return {
        x: gridRect.x + (Number(cell.x || 0) * cellWidth),
        y: gridRect.y + (Number(cell.y || 0) * cellHeight),
        width: cellWidth,
        height: cellHeight,
    };
};

const getTokenBounds = (token, gridConfig = {}) => {
    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const gridRect = getGridWorldRect(gridConfig);
    return {
        x: Math.round(((Number(token?.x || 0)) - gridRect.x) / cellWidth),
        y: Math.round(((Number(token?.y || 0)) - gridRect.y) / cellHeight),
        w: Math.max(1, Math.round((Number(token?.width || cellWidth)) / cellWidth)),
        h: Math.max(1, Math.round((Number(token?.height || cellHeight)) / cellHeight)),
    };
};

const getOccupiedCells = (items = [], gridConfig = {}) => {
    const occupied = new Set();
    items.forEach((item) => {
        if (!item || isCanvasLootItem(item) || item.layer !== 'TOKEN') return;
        const bounds = getTokenBounds(item, gridConfig);
        for (let x = bounds.x; x < bounds.x + bounds.w; x += 1) {
            for (let y = bounds.y; y < bounds.y + bounds.h; y += 1) {
                occupied.add(`${x}:${y}`);
            }
        }
    });
    return occupied;
};

export const CANVAS_LOOT_SIZE_RATIO = 0.32;
export const MAX_CANVAS_LOOT_PER_CELL = 4;

export const getCanvasLootSlotOffset = (index, count, cellWidth, cellHeight, lootWidth, lootHeight) => {
    if (count <= 1) {
        return {
            x: (cellWidth - lootWidth) / 2,
            y: (cellHeight - lootHeight) / 2,
        };
    }
    if (count === 2) {
        const slots = [
            { x: cellWidth * 0.26 - lootWidth / 2, y: (cellHeight - lootHeight) / 2 },
            { x: cellWidth * 0.74 - lootWidth / 2, y: (cellHeight - lootHeight) / 2 },
        ];
        return slots[index] || slots[0];
    }
    if (count === 3) {
        const slots = [
            { x: cellWidth * 0.50 - lootWidth / 2, y: cellHeight * 0.26 - lootHeight / 2 },
            { x: cellWidth * 0.26 - lootWidth / 2, y: cellHeight * 0.74 - lootHeight / 2 },
            { x: cellWidth * 0.74 - lootWidth / 2, y: cellHeight * 0.74 - lootHeight / 2 },
        ];
        return slots[index] || slots[0];
    }
    if (count === 4) {
        const slots = [
            { x: cellWidth * 0.26 - lootWidth / 2, y: cellHeight * 0.26 - lootHeight / 2 },
            { x: cellWidth * 0.74 - lootWidth / 2, y: cellHeight * 0.26 - lootHeight / 2 },
            { x: cellWidth * 0.26 - lootWidth / 2, y: cellHeight * 0.74 - lootHeight / 2 },
            { x: cellWidth * 0.74 - lootWidth / 2, y: cellHeight * 0.74 - lootHeight / 2 },
        ];
        return slots[index] || slots[0];
    }
    if (count === 5) {
        const slots = [
            { x: cellWidth * 0.22 - lootWidth / 2, y: cellHeight * 0.22 - lootHeight / 2 },
            { x: cellWidth * 0.78 - lootWidth / 2, y: cellHeight * 0.22 - lootHeight / 2 },
            { x: cellWidth * 0.50 - lootWidth / 2, y: cellHeight * 0.50 - lootHeight / 2 },
            { x: cellWidth * 0.22 - lootWidth / 2, y: cellHeight * 0.78 - lootHeight / 2 },
            { x: cellWidth * 0.78 - lootWidth / 2, y: cellHeight * 0.78 - lootHeight / 2 },
        ];
        return slots[index] || slots[0];
    }
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
        x: cellWidth * ((col + 0.5) / cols) - lootWidth / 2,
        y: cellHeight * ((row + 0.5) / rows) - lootHeight / 2,
    };
};

export const getCanvasLootRenderPlacement = (lootItem, items = [], gridConfig = {}) => {
    if (!lootItem || !isCanvasLootItem(lootItem)) {
        return { x: Number(lootItem?.x || 0), y: Number(lootItem?.y || 0) };
    }

    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const width = Math.max(1, Number(lootItem.width) || Math.min(cellWidth, cellHeight) * CANVAS_LOOT_SIZE_RATIO);
    const height = Math.max(1, Number(lootItem.height) || width);

    const centerX = Number(lootItem.x || 0) + (width / 2);
    const centerY = Number(lootItem.y || 0) + (height / 2);
    const cell = getCell(centerX, centerY, gridConfig);
    const cellRect = getGridCellWorldRect(cell, gridConfig);

    // Find all loot items sharing this same cell
    const cellLoots = (items || []).filter((item) => {
        if (!item || !isCanvasLootItem(item)) return false;
        const itemW = Math.max(1, Number(item.width) || width);
        const itemH = Math.max(1, Number(item.height) || itemW);
        const itemCenterX = Number(item.x || 0) + (itemW / 2);
        const itemCenterY = Number(item.y || 0) + (itemH / 2);
        const itemCell = getCell(itemCenterX, itemCenterY, gridConfig);
        return itemCell.x === cell.x && itemCell.y === cell.y;
    }).sort((a, b) => (Number(a.droppedAt || 0) - Number(b.droppedAt || 0)) || String(a.id).localeCompare(String(b.id)));

    const count = cellLoots.length;
    const index = cellLoots.findIndex((l) => l.id === lootItem.id);
    const slotIndex = index >= 0 ? index : 0;
    const offset = getCanvasLootSlotOffset(slotIndex, count, cellWidth, cellHeight, width, height);

    return {
        x: cellRect.x + offset.x,
        y: cellRect.y + offset.y,
    };
};

export const findCanvasLootPosition = ({ worldPoint, sourceToken, items = [], gridConfig = {} }) => {
    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const gridRect = getGridWorldRect(gridConfig);
    const tokenCenter = sourceToken
        ? {
            x: Number(sourceToken.x || 0) + (Number(sourceToken.width || cellWidth) / 2),
            y: Number(sourceToken.y || 0) + (Number(sourceToken.height || cellHeight) / 2),
        }
        : { x: gridRect.x + (cellWidth / 2), y: gridRect.y + (cellHeight / 2) };
    const start = getCell(worldPoint?.x ?? tokenCenter.x, worldPoint?.y ?? tokenCenter.y, gridConfig);

    // Count loot items currently in each cell
    const lootCounts = new Map();
    (items || []).forEach((item) => {
        if (!item || !isCanvasLootItem(item)) return;
        const itemW = Math.max(1, Number(item.width) || cellWidth * CANVAS_LOOT_SIZE_RATIO);
        const itemH = Math.max(1, Number(item.height) || itemW);
        const cX = Number(item.x || 0) + (itemW / 2);
        const cY = Number(item.y || 0) + (itemH / 2);
        const c = getCell(cX, cY, gridConfig);
        const key = `${c.x}:${c.y}`;
        lootCounts.set(key, (lootCounts.get(key) || 0) + 1);
    });

    const candidates = [start];
    for (let radius = 1; radius <= 4; radius += 1) {
        for (let y = -radius; y <= radius; y += 1) {
            for (let x = -radius; x <= radius; x += 1) {
                if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
                candidates.push({ x: start.x + x, y: start.y + y });
            }
        }
    }

    const target = candidates.find((cell) => {
        const key = `${cell.x}:${cell.y}`;
        const count = lootCounts.get(key) || 0;
        return count < MAX_CANVAS_LOOT_PER_CELL;
    }) || start;

    const size = Math.max(10, Math.min(cellWidth, cellHeight) * CANVAS_LOOT_SIZE_RATIO);
    const currentCountInTarget = lootCounts.get(`${target.x}:${target.y}`) || 0;
    const newCount = currentCountInTarget + 1;
    const offset = getCanvasLootSlotOffset(currentCountInTarget, newCount, cellWidth, cellHeight, size, size);
    const cellRect = getGridCellWorldRect(target, gridConfig);

    return {
        x: cellRect.x + offset.x,
        y: cellRect.y + offset.y,
        width: size,
        height: size,
        gridCell: target,
        cellRect,
    };
};

export const centerCanvasLootInGridCell = (loot, gridConfig = {}, items = []) => {
    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const width = Math.max(1, Number(loot?.width) || Math.min(cellWidth, cellHeight) * CANVAS_LOOT_SIZE_RATIO);
    const height = Math.max(1, Number(loot?.height) || width);
    const centerX = Number(loot?.x || 0) + (width / 2);
    const centerY = Number(loot?.y || 0) + (height / 2);
    const cell = getCell(centerX, centerY, gridConfig);
    const cellRect = getGridCellWorldRect(cell, gridConfig);

    const otherCellLoots = (items || []).filter((item) => {
        if (!item || !isCanvasLootItem(item) || item.id === loot?.id) return false;
        const itemW = Math.max(1, Number(item.width) || width);
        const itemH = Math.max(1, Number(item.height) || itemW);
        const itemCenterX = Number(item.x || 0) + (itemW / 2);
        const itemCenterY = Number(item.y || 0) + (itemH / 2);
        const itemCell = getCell(itemCenterX, itemCenterY, gridConfig);
        return itemCell.x === cell.x && itemCell.y === cell.y;
    });

    const count = otherCellLoots.length + 1;
    const offset = getCanvasLootSlotOffset(otherCellLoots.length, count, cellWidth, cellHeight, width, height);

    return {
        ...loot,
        width,
        height,
        x: cellRect.x + offset.x,
        y: cellRect.y + offset.y,
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
    worldPoint,
    items = [],
    isPlayerView = false,
    playerName = '',
    gridConfig = {},
}) => {
    if (!loot && !worldPoint) return { recipient: null, blockedRecipient: null };
    const lootRect = loot
        ? {
            x: Number(loot.x || 0),
            y: Number(loot.y || 0),
            width: Math.max(1, Number(loot.width) || 1),
            height: Math.max(1, Number(loot.height) || 1),
        }
        : {
            x: Number(worldPoint.x || 0) - 10,
            y: Number(worldPoint.y || 0) - 10,
            width: 20,
            height: 20,
        };
    const lootCenter = worldPoint
        ? { x: Number(worldPoint.x || 0), y: Number(worldPoint.y || 0) }
        : {
            x: lootRect.x + (lootRect.width / 2),
            y: lootRect.y + (lootRect.height / 2),
        };

    const candidates = items
        .filter((item) => item.id !== loot?.id && isCanvasLootRecipient(item))
        .map((item) => {
            const placement = (item.isToken !== false && gridConfig?.isCombatActive)
                ? getCombatRenderPlacement(item, items, gridConfig)
                : { x: Number(item.x || 0), y: Number(item.y || 0) };

            const rect = {
                x: Number(placement.x || 0),
                y: Number(placement.y || 0),
                width: Math.max(1, Number(item.width) || 1),
                height: Math.max(1, Number(item.height) || 1),
            };
            const itemCenter = {
                x: rect.x + (rect.width / 2),
                y: rect.y + (rect.height / 2),
            };
            const dist = Math.hypot(lootCenter.x - itemCenter.x, lootCenter.y - itemCenter.y);
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
                dist,
            };
        })
        .filter(({ overlap, containsCenter, dist, item }) => (
            overlap > 0 || containsCenter || dist <= (Math.max(Number(item.width) || 50, Number(item.height) || 50) * 0.65)
        ))
        .sort((left, right) => (
            Number(right.containsCenter) - Number(left.containsCenter)
            || right.overlap - left.overlap
            || left.dist - right.dist
        ));

    const target = candidates[0]?.item || null;
    if (!target) return { recipient: null, blockedRecipient: null };
    const canControlTarget = !isPlayerView
        || (Array.isArray(target.controlledBy) ? target.controlledBy.includes(playerName) : target.controlledBy === playerName)
        || target.ownerName === playerName;

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

export const pickUpCanvasLootForToken = ({
    token,
    items = [],
    gridConfig = {},
    isPlayerView = false,
    playerName = '',
}) => {
    if (!token || !isCanvasLootRecipient(token)) {
        return { nextToken: token, nextItems: items, pickedLoots: [] };
    }

    const canControl = !isPlayerView
        || (Array.isArray(token.controlledBy) ? token.controlledBy.includes(playerName) : token.controlledBy === playerName)
        || token.ownerName === playerName;

    if (!canControl) {
        return { nextToken: token, nextItems: items, pickedLoots: [] };
    }

    const cellWidth = Math.max(1, Number(gridConfig.cellWidth) || 50);
    const cellHeight = Math.max(1, Number(gridConfig.cellHeight) || 50);
    const tokenBounds = getTokenBounds(token, gridConfig);
    const tokenRect = {
        x: Number(token.x || 0),
        y: Number(token.y || 0),
        width: Math.max(1, Number(token.width) || cellWidth),
        height: Math.max(1, Number(token.height) || cellHeight),
    };

    const pickedLoots = items.filter((item) => {
        if (!item || !isCanvasLootItem(item) || item.id === token.id) return false;
        const itemWidth = Math.max(1, Number(item.width) || cellWidth * 0.20);
        const itemHeight = Math.max(1, Number(item.height) || cellHeight * 0.20);
        const lootCenter = {
            x: Number(item.x || 0) + (itemWidth / 2),
            y: Number(item.y || 0) + (itemHeight / 2),
        };
        const lootCell = getCell(lootCenter.x, lootCenter.y, gridConfig);

        const inTokenCell = (
            lootCell.x >= tokenBounds.x
            && lootCell.x < tokenBounds.x + tokenBounds.w
            && lootCell.y >= tokenBounds.y
            && lootCell.y < tokenBounds.y + tokenBounds.h
        );

        const itemRect = {
            x: Number(item.x || 0),
            y: Number(item.y || 0),
            width: itemWidth,
            height: itemHeight,
        };
        const overlap = getOverlapArea(tokenRect, itemRect);

        return inTokenCell || overlap > 0;
    });

    if (pickedLoots.length === 0) {
        return { nextToken: token, nextItems: items, pickedLoots: [] };
    }

    const pickedIds = new Set(pickedLoots.map((l) => l.id));
    let currentToken = token;
    pickedLoots.forEach((loot) => {
        currentToken = addCanvasLootToInventory(currentToken, loot.lootItem);
    });

    const nextToken = {
        ...currentToken,
        runtimeDirty: false,
    };

    const nextItems = items
        .filter((item) => !pickedIds.has(item.id))
        .map((item) => (item.id === nextToken.id ? nextToken : item));

    return {
        nextToken,
        nextItems,
        pickedLoots,
    };
};
