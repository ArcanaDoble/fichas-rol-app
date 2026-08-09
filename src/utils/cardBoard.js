export const MASTER_HAND_SEAT_ID = '__master__';

export const isCardItem = (item) => item?.type === 'card';

export const isCardContainerItem = (item) => item?.type === 'cardContainer';

export const isHandCardItem = (item) => isCardItem(item) && item.zone === 'hand';

export const isStackedCardItem = (item) => isCardItem(item) && !!item.stackParentId;

export const isContainedCardItem = (item) => isCardItem(item) && !!item.containerId;

export const preservePendingHandTransferState = (
    remoteItem,
    localItem,
    lockExpiresAt = 0,
    now = Date.now()
) => {
    if (
        !isCardItem(remoteItem)
        || !isHandCardItem(localItem)
        || isHandCardItem(remoteItem)
        || now >= Number(lockExpiresAt || 0)
    ) {
        return remoteItem;
    }

    return localItem;
};

export const normalizeCardGroupName = (card = {}) => (card.name || card.nombre || 'Carta')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const getCardStackIds = (item) => (
    Array.isArray(item?.stackIds)
        ? [...new globalThis.Set(item.stackIds.filter(Boolean))]
        : []
);

export const isDiscardContainer = (item = {}) => {
    if (!isCardContainerItem(item)) return false;
    const name = (item.name || '').toString().toLowerCase();
    return item.containerKind === 'discard' || name.includes('cementerio') || name.includes('descarte');
};

export const getCardContainerItems = (containerId, items = []) => items
    .filter(item => isCardItem(item) && item.containerId === containerId)
    .sort((a, b) => (Number(a.containerOrder) || 0) - (Number(b.containerOrder) || 0));

export const isContainerCardsHiddenForPlayers = (container = {}) => (
    isCardContainerItem(container) && container.hideContainedCardsForPlayers === true
);

export const isCardHiddenByContainerForPlayer = (item, items = [], isPlayerView = false) => {
    if (!isPlayerView || !isCardItem(item) || !item.containerId) return false;
    const parentContainer = items.find(candidate => (
        candidate?.id === item.containerId && isCardContainerItem(candidate)
    ));
    return isContainerCardsHiddenForPlayers(parentContainer);
};

export const isMasterLibraryDeck = (deck) => deck?.isMasterLibrary === true;

export const normalizeHandSeatId = (value) => (value || '').toString().trim();

export const getCardHandTokenId = (item = {}) => item.handTokenId || item.ownerId;

export const getCardHandSeatId = (item = {}) => {
    if (item.handSeatId) return normalizeHandSeatId(item.handSeatId);
    if (item.handSeatName) return normalizeHandSeatId(item.handSeatName);
    if (item.ownerName === 'Master') return MASTER_HAND_SEAT_ID;
    return normalizeHandSeatId(item.ownerName || item.ownerId);
};

export const isLegacyTokenHandCard = (item = {}, tokenId) => (
    !item.handSeatId &&
    !item.handSeatName &&
    getCardHandTokenId(item) === tokenId
);

export const sanitizeCardStacks = (items = []) => {
    const cardIds = new globalThis.Set(items.filter(isCardItem).map(item => item.id));
    const parentByChild = new globalThis.Map();
    const parentZoneByChild = new globalThis.Map();

    const cleanedParents = items.map(item => {
        if (!isCardItem(item)) return item;

        const cleanStackIds = getCardStackIds(item).filter(childId => {
            if (!cardIds.has(childId) || childId === item.id || parentByChild.has(childId)) return false;
            parentByChild.set(childId, item.id);
            parentZoneByChild.set(childId, item.zone || 'board');
            return true;
        });

        return cleanStackIds.length > 0 || Array.isArray(item.stackIds)
            ? { ...item, stackIds: cleanStackIds }
            : item;
    });

    return cleanedParents.map(item => {
        if (!isCardItem(item)) return item;

        const parentId = parentByChild.get(item.id);
        if (parentId) {
            return {
                ...item,
                zone: parentZoneByChild.get(item.id) || item.zone || 'board',
                stackParentId: parentId,
                stackIds: [],
            };
        }

        return item.stackParentId
            ? { ...item, stackParentId: null }
            : item;
    });
};

export const getVisibleHandCards = (items = [], predicate = () => true) => items
    .filter(item => isHandCardItem(item) && predicate(item))
    .sort((a, b) => (Number(a.handOrder) || 0) - (Number(b.handOrder) || 0));

export const reorderCardIds = (cardIds = [], movedCardId, targetIndex = 0) => {
    const uniqueIds = [...new globalThis.Set(cardIds.filter(Boolean))];
    const sourceIndex = uniqueIds.indexOf(movedCardId);
    if (sourceIndex === -1) return uniqueIds;

    const remainingIds = uniqueIds.filter(id => id !== movedCardId);
    const numericTarget = Number(targetIndex);
    const safeTarget = Number.isFinite(numericTarget) ? Math.trunc(numericTarget) : sourceIndex;
    const insertionIndex = Math.max(0, Math.min(remainingIds.length, safeTarget));
    remainingIds.splice(insertionIndex, 0, movedCardId);
    return remainingIds;
};

export const reorderCardItems = (cards = [], movedCardId, targetIndex = 0) => {
    const cardById = new globalThis.Map(cards.filter(card => card?.id).map(card => [card.id, card]));
    return reorderCardIds(cards.map(card => card?.id), movedCardId, targetIndex)
        .map(id => cardById.get(id))
        .filter(Boolean);
};

export const reorderHandCards = (items = [], handCardIds = [], movedCardId, targetIndex = 0) => {
    const liveHandIds = [...new globalThis.Set(handCardIds.filter(Boolean))]
        .filter(id => items.some(item => item.id === id && isHandCardItem(item)));
    const orderedCardIds = reorderCardIds(liveHandIds, movedCardId, targetIndex);
    if (!liveHandIds.includes(movedCardId)) {
        return { items, orderedCardIds: liveHandIds, changedIds: [], moved: false };
    }

    const moved = orderedCardIds.some((id, index) => id !== liveHandIds[index]);
    if (!moved) {
        return { items, orderedCardIds, changedIds: [], moved: false };
    }

    const handOrderById = new globalThis.Map(orderedCardIds.map((id, index) => [id, index + 1]));
    const changedIds = [];
    const nextItems = items.map(item => {
        const nextHandOrder = handOrderById.get(item.id);
        if (nextHandOrder === undefined || Number(item.handOrder) === nextHandOrder) return item;
        changedIds.push(item.id);
        return { ...item, handOrder: nextHandOrder };
    });

    return { items: nextItems, orderedCardIds, changedIds, moved: true };
};

export const moveBoardCardPileToHand = (
    items = [],
    cardId,
    handOwner = {},
    orderSeed = Date.now()
) => {
    const card = items.find(item => item.id === cardId);
    if (!isCardItem(card)) return { items, changedIds: [], moved: false };

    const movingIds = [card.id, ...getCardStackIds(card)].filter(Boolean);
    const movingIdSet = new globalThis.Set(movingIds);
    const changedIdSet = new globalThis.Set(movingIds);
    const orderById = new globalThis.Map(movingIds.map((id, index) => [id, orderSeed + index]));

    const nextItems = sanitizeCardStacks(items.map(item => {
        if (movingIdSet.has(item.id) && isCardItem(item)) {
            return {
                ...item,
                x: 0,
                y: 0,
                zone: 'hand',
                containerId: null,
                containerOrder: null,
                stackParentId: null,
                stackIds: [],
                ownerId: handOwner.ownerId,
                ownerName: handOwner.ownerName,
                handTokenId: handOwner.handTokenId || handOwner.ownerId,
                handTokenName: handOwner.handTokenName || handOwner.ownerName,
                handSeatId: handOwner.handSeatId,
                handSeatName: handOwner.handSeatName,
                handOrder: orderById.get(item.id),
            };
        }

        if (Array.isArray(item.stackIds)) {
            const nextStackIds = item.stackIds.filter(id => !movingIdSet.has(id));
            if (nextStackIds.length !== item.stackIds.length) {
                changedIdSet.add(item.id);
                return { ...item, stackIds: nextStackIds };
            }
        }

        return item;
    }));

    return {
        items: nextItems,
        changedIds: [...changedIdSet],
        moved: true,
    };
};

export const moveCardIntoContainer = (items = [], sourceId, containerId, orderSeed = Date.now()) => {
    const source = items.find(item => item.id === sourceId);
    const container = items.find(item => item.id === containerId);
    if (!isCardItem(source) || !isCardContainerItem(container)) return items;

    const movingIds = new globalThis.Set([source.id, ...getCardStackIds(source)].filter(Boolean));
    const currentMaxOrder = items.reduce((maxOrder, item) => (
        item.containerId === containerId
            ? Math.max(maxOrder, Number(item.containerOrder) || 0)
            : maxOrder
    ), orderSeed);
    let orderOffset = 0;

    const nextItems = items.map(item => {
        if (movingIds.has(item.id) && isCardItem(item)) {
            orderOffset += 1;
            const isSource = item.id === sourceId;
            return {
                ...item,
                zone: 'board',
                containerId,
                containerOrder: currentMaxOrder + orderOffset,
                stackParentId: isSource ? null : sourceId,
                stackIds: isSource ? source.stackIds : [],
                x: item.x,
                y: item.y,
                rotation: item.rotation || 0,
            };
        }

        if (Array.isArray(item.stackIds)) {
            return {
                ...item,
                stackIds: item.stackIds.filter(id => !movingIds.has(id)),
            };
        }

        return item;
    });

    return sanitizeCardStacks(nextItems);
};

export const detachCardFromContainer = (items = [], sourceId) => {
    const source = items.find(item => item.id === sourceId);
    if (!isCardItem(source)) return items;

    const movingIds = new globalThis.Set([source.id, ...getCardStackIds(source)].filter(Boolean));
    return items.map(item => (
        movingIds.has(item.id) && isCardItem(item)
            ? { ...item, containerId: null, containerOrder: null }
            : item
    ));
};

export const stackCardOnTarget = (items = [], sourceId, targetId) => {
    const source = items.find(item => item.id === sourceId);
    const target = items.find(item => item.id === targetId);
    if (!isCardItem(source) || !isCardItem(target) || source.id === target.id) return items;

    const nextContainerId = target.containerId || source.containerId || null;
    const sourceStackIds = getCardStackIds(source);
    const targetStackIds = getCardStackIds(target);
    const sourcePileIds = [source.id, ...sourceStackIds].filter(Boolean);
    const targetPileIds = [target.id, ...targetStackIds].filter(Boolean);
    if (sourcePileIds.includes(target.id) || targetPileIds.includes(source.id)) return items;

    const nextSourceStackIds = [...targetStackIds, target.id, ...sourceStackIds].filter(Boolean);
    const stackedIds = new globalThis.Set(nextSourceStackIds);

    const nextItems = items.map(item => {
        if (item.id === source.id) {
            return {
                ...item,
                zone: 'board',
                containerId: nextContainerId,
                stackParentId: null,
                stackIds: nextSourceStackIds,
            };
        }

        if (stackedIds.has(item.id)) {
            return {
                ...item,
                zone: 'board',
                containerId: nextContainerId,
                stackParentId: source.id,
                stackIds: [],
                x: source.x,
                y: source.y,
                rotation: source.rotation || 0,
            };
        }

        if (Array.isArray(item.stackIds)) {
            return {
                ...item,
                stackIds: item.stackIds.filter(id => !sourcePileIds.includes(id) && !targetPileIds.includes(id)),
            };
        }

        return item;
    });

    return sanitizeCardStacks(nextItems);
};

export const takeTopCardFromStack = (items = [], stackParentId) => {
    const parent = items.find(item => item.id === stackParentId);
    const stackIds = getCardStackIds(parent);
    const releasedCardId = stackIds[stackIds.length - 1] || null;
    if (!isCardItem(parent) || !releasedCardId) {
        return { items, releasedCardId: null, changedIds: [] };
    }

    const offsetX = Math.min(52, Math.max(24, (Number(parent.width) || 120) * 0.22));
    const offsetY = Math.min(38, Math.max(18, (Number(parent.height) || 168) * 0.12));
    const nextStackIds = stackIds.slice(0, -1);
    const nextItems = sanitizeCardStacks(items.map(item => {
        if (item.id === parent.id) return { ...item, stackIds: nextStackIds };
        if (item.id !== releasedCardId) return item;
        return {
            ...item,
            zone: 'board',
            containerId: parent.containerId || null,
            containerOrder: parent.containerOrder || null,
            stackParentId: null,
            stackIds: [],
            x: parent.x + offsetX,
            y: parent.y + offsetY,
            rotation: parent.rotation || 0,
        };
    }));

    return { items: nextItems, releasedCardId, changedIds: [stackParentId, releasedCardId] };
};

export const spreadCardStack = (items = [], stackParentId) => {
    const parent = items.find(item => item.id === stackParentId);
    const releasedCardIds = getCardStackIds(parent);
    if (!isCardItem(parent) || releasedCardIds.length === 0) {
        return { items, releasedCardIds: [], changedIds: [] };
    }

    const gapX = Math.min(44, Math.max(26, (Number(parent.width) || 120) * 0.2));
    const gapY = Math.min(28, Math.max(14, (Number(parent.height) || 168) * 0.09));
    const nextItems = sanitizeCardStacks(items.map(item => {
        if (item.id === parent.id) return { ...item, stackIds: [] };

        const stackIndex = releasedCardIds.indexOf(item.id);
        if (stackIndex === -1) return item;
        const spreadIndex = stackIndex + 1;
        return {
            ...item,
            zone: 'board',
            containerId: parent.containerId || null,
            containerOrder: parent.containerOrder || null,
            stackParentId: null,
            stackIds: [],
            x: parent.x + (gapX * spreadIndex),
            y: parent.y + (gapY * spreadIndex),
            rotation: parent.rotation || 0,
        };
    }));

    return {
        items: nextItems,
        releasedCardIds,
        changedIds: [stackParentId, ...releasedCardIds],
    };
};

export const takeCardFromStack = (items = [], stackParentId, cardId) => {
    const parent = items.find(item => item.id === stackParentId);
    const stackIds = getCardStackIds(parent);
    const stackIndex = stackIds.indexOf(cardId);
    if (!isCardItem(parent) || stackIndex === -1) {
        return { items, releasedCardId: null, changedIds: [] };
    }

    const offsetX = Math.min(68, Math.max(30, (Number(parent.width) || 120) * 0.28));
    const offsetY = Math.min(48, Math.max(18, (Number(parent.height) || 168) * 0.12));
    const nextStackIds = stackIds.filter(id => id !== cardId);
    const nextItems = sanitizeCardStacks(items.map(item => {
        if (item.id === parent.id) return { ...item, stackIds: nextStackIds };
        if (item.id !== cardId) return item;
        const direction = stackIndex % 2 === 0 ? -1 : 1;
        return {
            ...item,
            zone: 'board',
            containerId: parent.containerId || null,
            containerOrder: parent.containerOrder || null,
            stackParentId: null,
            stackIds: [],
            x: parent.x + (offsetX * direction),
            y: parent.y + offsetY,
            rotation: parent.rotation || 0,
        };
    }));

    return { items: nextItems, releasedCardId: cardId, changedIds: [stackParentId, cardId] };
};

export const snapCardRotationAngle = (angle, threshold = 5) => {
    if (!Number.isFinite(angle)) return angle;
    const normalized = ((angle % 360) + 360) % 360;
    const nearestRightAngle = Math.round(normalized / 90) * 90;
    const wrappedNearest = nearestRightAngle === 360 ? 0 : nearestRightAngle;
    const distance = Math.min(
        Math.abs(normalized - wrappedNearest),
        Math.abs(normalized - wrappedNearest + 360),
        Math.abs(normalized - wrappedNearest - 360)
    );

    if (distance > threshold) return angle;
    const turns = Math.floor(angle / 360);
    return turns * 360 + nearestRightAngle;
};
