import { getCombatCellOccupancyIssue, getTokenOccupiedGridCells, isCombatTokenItem, isGridCellInsideBounds } from './legacyCombatRules';
import { getEffectiveItemSnap, lineRectIntersect, linesIntersect, snapWorldPositionToGrid, WORLD_SIZE } from './spatial';
import { getSceneBlockingSegments, isPointInsideTreeTrunk, isTreeScenery } from './scenery';

export const canForceMoveToken = token => Boolean(token && isCombatTokenItem(token) && !isTreeScenery(token));

// A forced move changes position only. Turn order, statuses and every resource
// remain owned by their normal combat flows, including when the token is prone.
export const getForcedMovementDestination = ({ token, point, items = [], config = {} }) => {
    if (!canForceMoveToken(token) || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
    const width = Number(token.width) || Number(config.cellWidth) || 50;
    const height = Number(token.height) || Number(config.cellHeight) || 50;
    const centered = { x: point.x - width / 2, y: point.y - height / 2 };
    const position = getEffectiveItemSnap(token, config)
        ? snapWorldPositionToGrid(centered, config, { width, height }, { centerInCell: true })
        : centered;
    const moved = { ...token, ...position };
    let reason = null;
    if (position.x < 0 || position.y < 0 || position.x + width > WORLD_SIZE || position.y + height > WORLD_SIZE
        || getTokenOccupiedGridCells(moved, config).some(cell => !isGridCellInsideBounds(cell, config))) {
        reason = 'Fuera del mapa';
    }
    const occupancy = getCombatCellOccupancyIssue({ movingToken: token, nextX: position.x, nextY: position.y, items, config });
    if (!reason && occupancy) reason = 'La ficha no cabe en esa casilla';
    const walls = getSceneBlockingSegments(items, { kind: 'movement' });
    const pathBlocked = walls.some(wall => linesIntersect(token.x + width / 2, token.y + height / 2,
        position.x + width / 2, position.y + height / 2, wall.x1, wall.y1, wall.x2, wall.y2));
    const overlapBlocked = walls.some(wall => lineRectIntersect(wall.x1, wall.y1, wall.x2, wall.y2,
        position.x + 2, position.y + 2, Math.max(1, width - 4), Math.max(1, height - 4)));
    if (!reason && (pathBlocked || overlapBlocked || isPointInsideTreeTrunk({ x: position.x + width / 2, y: position.y + height / 2 }, items))) {
        reason = 'Un muro o un tronco bloquea el paso';
    }
    return { ...position, width, height, valid: !reason, reason };
};

export const rebasePendingAfterForcedMovement = (pending, remoteToken, localToken) => {
    const move = remoteToken?.forcedMovement;
    if (!pending || pending.tokenId !== remoteToken?.id || !move?.id || move.id === localToken?.forcedMovement?.id) return pending;
    // Discard an unconfirmed destination, keeping any pending actions. No
    // committed movement or turn is refunded, spent, reopened or completed.
    return { ...pending, startX: remoteToken.x, startY: remoteToken.y,
        x: remoteToken.x, y: remoteToken.y, moveCost: 0 };
};
