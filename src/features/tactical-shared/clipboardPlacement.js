import { isCombatTokenItem } from './legacyCombatRules';
import { getEffectiveItemSnap, snapWorldPositionToGrid } from './spatial';

// Pasting creates items at a destination; it is not a movement through the map.
export const placeClipboardItems = (items, point, gridConfig) => {
    if (!items.length) return [];
    const left = Math.min(...items.map(item => Number(item.x) || 0));
    const top = Math.min(...items.map(item => Number(item.y) || 0));
    const right = Math.max(...items.map(item => (Number(item.x) || 0) + (Number(item.width) || 0)));
    const bottom = Math.max(...items.map(item => (Number(item.y) || 0) + (Number(item.height) || 0)));
    const first = items[0];
    const firstX = Number(first.x) || 0;
    const firstY = Number(first.y) || 0;
    let dx = point.x - (left + right) / 2;
    let dy = point.y - (top + bottom) / 2;
    if (getEffectiveItemSnap(first, gridConfig)) {
        const snapped = snapWorldPositionToGrid({ x: firstX + dx, y: firstY + dy }, gridConfig, first,
            { centerInCell: isCombatTokenItem(first) });
        dx = snapped.x - firstX;
        dy = snapped.y - firstY;
    }
    return items.map(item => ({
        ...item,
        x: (Number(item.x) || 0) + dx,
        y: (Number(item.y) || 0) + dy,
        ...(item.type === 'wall' ? { x1: item.x1 + dx, y1: item.y1 + dy, x2: item.x2 + dx, y2: item.y2 + dy } : {}),
    }));
};
