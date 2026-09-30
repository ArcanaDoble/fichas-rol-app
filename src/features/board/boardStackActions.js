import { getCardStackIds, isCardItem } from '../../utils/cardBoard';

export const MAX_STACK_COPIES = 500;
export const MAX_STACK_DRAW = 100;

const quantity = (value, max) => {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 1 || count > max) {
        throw new Error(`Elige una cantidad entre 1 y ${max}.`);
    }
    return count;
};

// A stack is still a set of ordinary scene cards. Its key follows the remaining
// pile when its visible card is drawn, including requests from another player.
export const applyBoardStackAction = (items, command, { isPlayerView = false, random = Math.random, now = Date.now() } = {}) => {
    const parent = command.stackKey
        ? items.find(item => isCardItem(item) && !item.stackParentId && item.stackKey === command.stackKey)
        : items.find(item => item.id === command.cardId && isCardItem(item) && !item.stackParentId);
    if (!parent || parent.zone === 'hand') throw new Error('Ese montón ya no está en la mesa.');
    const byId = new Map(items.filter(isCardItem).map(item => [item.id, item]));
    const pile = [...getCardStackIds(parent).map(id => byId.get(id)).filter(Boolean), parent];
    if (isPlayerView && command.action !== 'draw' && !(command.action === 'extract' && !parent.hideStackContentsForPlayers)) {
        throw new Error('Solo el máster puede preparar el montón.');
    }
    let remaining = [...pile];
    let drawn = [];
    let added = [];
    let hidden = parent.hideStackContentsForPlayers === true;

    switch (command.action) {
        case 'copies': {
            const count = quantity(command.count, MAX_STACK_COPIES);
            if (!Array.isArray(command.newIds) || command.newIds.length !== count
                || new Set(command.newIds).size !== count || command.newIds.some(id => !id || items.some(item => item.id === id))) {
                throw new Error('No se pudieron crear identificadores únicos para las copias.');
            }
            added = command.newIds.map(id => ({ ...parent, id, stackIds: [], stackKey: null,
                hideStackContentsForPlayers: false, stackParentId: parent.id }));
            remaining = [...pile.slice(0, -1), ...added, parent];
            break;
        }
        case 'shuffle':
            if (pile.length < 2) throw new Error('Añade al menos dos cartas para barajar.');
            for (let index = remaining.length - 1; index > 0; index -= 1) {
                const target = Math.floor(random() * (index + 1));
                [remaining[index], remaining[target]] = [remaining[target], remaining[index]];
            }
            hidden = true;
            break;
        case 'privacy':
            hidden = !hidden;
            break;
        case 'reorder': {
            const ordered = [...remaining].reverse();
            const moved = ordered.find(card => card.id === command.movedCardId);
            if (!moved || (command.beforeCardId && !ordered.some(card => card.id === command.beforeCardId))) {
                throw new Error('El montón ha cambiado. Vuelve a elegir la posición.');
            }
            if (command.movedCardId === command.beforeCardId) break;
            const rest = ordered.filter(card => card.id !== moved.id);
            const target = command.beforeCardId ? rest.findIndex(card => card.id === command.beforeCardId) : rest.length;
            rest.splice(target, 0, moved);
            remaining = rest.reverse();
            break;
        }
        case 'extract': {
            const card = remaining.find(candidate => candidate.id === command.movedCardId);
            if (!card) throw new Error('Esa carta ya no está en el montón.');
            drawn = [card];
            remaining = remaining.filter(candidate => candidate.id !== card.id);
            break;
        }
        case 'draw': {
            const count = quantity(command.count, MAX_STACK_DRAW);
            if (pile.length === 1 && !parent.stackKey) throw new Error('Ese montón ya se ha agotado.');
            if (count > pile.length) throw new Error(`Solo quedan ${pile.length} cartas en el montón.`);
            drawn = remaining.splice(-count).reverse();
            break;
        }
        default:
            throw new Error('Acción de cartas desconocida.');
    }

    const nextParent = remaining[remaining.length - 1];
    const stackKey = parent.stackKey || command.newStackKey;
    if (nextParent && (!stackKey || items.some(item => item.id !== parent.id && item.stackKey === stackKey))) {
        throw new Error('No se pudo identificar el montón. Vuelve a abrir su menú.');
    }
    const changes = new Map();
    remaining.forEach(card => changes.set(card.id, {
        ...card, x: parent.x, y: parent.y, rotation: parent.rotation || 0,
        boardDraw: null,
        containerId: parent.containerId || null, containerOrder: parent.containerOrder || null,
        stackParentId: card.id === nextParent.id ? null : nextParent.id,
        stackIds: card.id === nextParent.id ? remaining.slice(0, -1).map(child => child.id) : [],
        stackKey: card.id === nextParent.id ? stackKey : null,
        hideStackContentsForPlayers: card.id === nextParent.id && hidden,
        faceDown: hidden ? true : card.faceDown === true,
    }));
    const width = Number(parent.width) || 120;
    const height = Number(parent.height) || 168;
    drawn.forEach((card, index) => changes.set(card.id, {
        ...card, zone: 'board', stackParentId: null, stackIds: [], stackKey: null,
        hideStackContentsForPlayers: false, containerId: null, containerOrder: null,
        faceDown: command.action === 'extract' ? card.faceDown === true : false,
        boardDraw: {
            id: command.presentationId || command.newStackKey || `draw-${now}-${parent.id}`, index, count: drawn.length, at: now,
            x: Number(parent.x) || 0, y: Number(parent.y) || 0, rotation: parent.rotation || 0,
            faceDown: card.faceDown === true,
        },
        ownerId: null, ownerName: null, handSeatId: null, handSeatName: null,
        x: Number(parent.x) + width + 24 + (index % 5) * (width + 12),
        y: Number(parent.y) + Math.floor(index / 5) * (height + 12), rotation: parent.rotation || 0,
    }));
    // Drawn cards render last so that they stay above earlier draws on the table.
    const drawnIds = new Set(drawn.map(card => card.id));
    return {
        items: [...items.filter(card => !drawnIds.has(card.id)), ...added, ...drawn].map(card => changes.get(card.id) || card),
        changedIds: [...changes.keys()],
        selectedId: nextParent?.id || drawn[0]?.id || parent.id,
        drawnIds: [...drawnIds],
        remainingCount: remaining.length,
    };
};
