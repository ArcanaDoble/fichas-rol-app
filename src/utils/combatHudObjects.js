import { resolveRogueliteEquippedItems } from '../features/canvas/rogueliteTokenSheetSync';

const getCombatHudItemIdentityKeys = (item) => {
    if (!item || typeof item !== 'object') return [];
    return [
        item.runItemId,
        item.instanceId,
        item.templateId,
        item.catalogId,
        item.id,
        item.name,
        item.nombre,
        item.payload?.runItemId,
        item.payload?.instanceId,
        item.payload?.templateId,
        item.payload?.catalogId,
        item.payload?.id,
        item.payload?.name,
        item.payload?.nombre,
    ]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
};

const combatHudItemsMatch = (left, right) => {
    const leftInstance = left?.runItemId || left?.instanceId || left?.payload?.runItemId || left?.payload?.instanceId;
    const rightInstance = right?.runItemId || right?.instanceId || right?.payload?.runItemId || right?.payload?.instanceId;
    if (leftInstance && rightInstance) return String(leftInstance) === String(rightInstance);
    const rightKeys = new Set(getCombatHudItemIdentityKeys(right));
    return getCombatHudItemIdentityKeys(left).some((key) => rightKeys.has(key));
};

const isCombatHudObject = (item) => {
    const type = [
        item?.type,
        item?.tipo,
        item?.itemType,
        item?._category,
        item?.category,
        item?.payload?.type,
        item?.payload?.itemType,
    ].map((value) => String(value || '').toLowerCase()).join(' ');

    return type.includes('object')
        || type.includes('objeto')
        || type.includes('consum')
        || type.includes('pocion')
        || type.includes('poción');
};

export const resolveCombatHudObjects = (token = {}) => {
    const sourceToken = token || {};
    const inventoryObjects = (Array.isArray(sourceToken.inventory) ? sourceToken.inventory : [])
        .filter(isCombatHudObject);
    const equippedArray = Array.isArray(sourceToken.equippedItems) ? sourceToken.equippedItems : [];
    const loadoutEquipment = resolveRogueliteEquippedItems(
        sourceToken.equipmentLoadout
        || (sourceToken.equippedItems && !Array.isArray(sourceToken.equippedItems) ? sourceToken.equippedItems : {})
    ).items;
    const loadoutBeltObjects = loadoutEquipment.filter((item) => String(item?.canvasSlot || '').startsWith('belt_'));
    const beltObjects = [
        ...loadoutBeltObjects,
        ...equippedArray.filter((item) => (
            String(item?.canvasSlot || '').startsWith('belt_')
            && !loadoutBeltObjects.some((loadoutItem) => (
                loadoutItem.canvasSlot === item.canvasSlot || combatHudItemsMatch(loadoutItem, item)
            ))
        )),
    ]
        .sort((left, right) => String(left.canvasSlot).localeCompare(String(right.canvasSlot), undefined, { numeric: true }));
    const usedInventoryIndexes = new Set();
    const mergedBeltObjects = beltObjects.map((beltItem) => {
        const inventoryIndex = inventoryObjects.findIndex((inventoryItem, index) => (
            !usedInventoryIndexes.has(index) && combatHudItemsMatch(beltItem, inventoryItem)
        ));
        if (inventoryIndex < 0) return beltItem;
        usedInventoryIndexes.add(inventoryIndex);
        return { ...inventoryObjects[inventoryIndex], ...beltItem };
    });

    return [
        ...mergedBeltObjects,
        ...inventoryObjects.filter((_, index) => !usedInventoryIndexes.has(index)),
    ];
};
