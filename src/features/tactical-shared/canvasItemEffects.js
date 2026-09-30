import { getPlayerCanvasVisionTokens, isCanvasTokenHiddenFromViewer, canTokenSeeThroughSmoke, getCanvasRenderItemsForViewer } from './tokenVisibilityAccess';
import { calculateShadowPoints } from './spatial';
import { isPointVisible } from '../../utils/visibility';
import { getCombatRenderPlacement } from './legacyCombatRules';

export const isCanvasAntidoteEffect = effect => effect?.eventType === 'item-use' && ['remove-poison', 'remove-bleeding'].includes(effect.effect);
export const isCanvasNonHealingPotionEffect = effect => effect?.eventType === 'item-use' && ['remove-poison', 'remove-bleeding', 'haste', 'temporary-life'].includes(effect.effect);
export const isCanvasRestorativeEffect = effect => isCanvasHealingEffect(effect) || isCanvasNonHealingPotionEffect(effect);
export const isCanvasHealingEffect = effect => effect?.eventType === 'item-use' && effect.effect === 'heal';
export const getCanvasEffectTime = entry => entry?.timestamp?.toMillis?.()
    || Number(entry?.timestamp?.seconds) * 1000 || Number(entry?.timestamp || entry?.clientTimestamp) || 0;

// Each subscription starts with history, including after returning to a scene.
// Remember every observed event, even one too old or hidden to animate.
export const createLiveItemEffectGate = ({ now = Date.now() } = {}) => {
    const seen = new Set();
    let baseline = true;
    let resumedAt = now;
    return {
        reset(now = Date.now()) { resumedAt = now; },
        accept(entry, { now = Date.now(), initial = baseline, visible = true, pending = false } = {}) {
            if (pending) return false;
            const id = entry.sourceEventId || entry.id;
            if (!id || seen.has(id)) return false;
            const time = getCanvasEffectTime(entry);
            if (!time) return false;
            seen.add(id);
            if (seen.size > 1000) seen.delete(seen.values().next().value);
            return !initial && visible && time > resumedAt && time <= now + 1000 && now - time < 5000;
        },
        finishSnapshot() { baseline = false; },
    };
};

const center = token => ({ x: Number(token.x || 0) + Number(token.width || 0) / 2,
    y: Number(token.y || 0) + Number(token.height || 0) / 2 });
const isInWallShadow = (origin, point, wall, interaction, selected) => {
    if (wall.type !== 'wall' || wall.wallType === 'window' || (wall.wallType === 'door' && wall.isOpen)) return false;
    let { x1, y1, x2, y2 } = wall;
    const original = interaction.active && selected.includes(wall.id) && interaction.originalPositions?.[wall.id];
    if (original) {
        const dx = wall.x - original.x, dy = wall.y - original.y;
        x1 -= dx; x2 -= dx; y1 -= dy; y2 -= dy;
    }
    // Use the very same polygons (including the corner nudge) as shadow-mask in TacticalViewport.
    const polygon = calculateShadowPoints(origin.x, origin.y, x1, y1, x2, y2)
        .split(' ').map(pair => { const [x, y] = pair.split(',').map(Number); return { x, y }; });
    return isPointVisible(point, polygon);
};

// This overlay sits above fog. Never infer visibility merely from receiving a log.
export const canShowCanvasItemEffect = ({ token, items = [], viewer = {}, gridConfig = {}, interaction = {} }) => {
    if (!token || isCanvasTokenHiddenFromViewer(token, items, viewer)) return false;
    if (!gridConfig.fogOfWar) return true;
    const selected = viewer.selectedTokenIds || [];
    const perspectives = viewer.isPlayerView ? getPlayerCanvasVisionTokens(items, viewer.playerName)
        : items.filter(item => item?.hasVision && !isCanvasTokenHiddenFromViewer(item, items, viewer));
    const focused = perspectives.filter(item => selected.includes(item.id));
    // The master's overview deliberately retains the whole scene under dim fog.
    if (!viewer.isPlayerView && focused.length === 0) return true;
    const observers = focused.length ? focused : perspectives;
    const point = center({ ...token, ...getCombatRenderPlacement(token, getCanvasRenderItemsForViewer(items, viewer), gridConfig) });
    return observers.some(observer => {
        const original = interaction.active && selected.includes(observer.id) && interaction.originalPositions?.[observer.id];
        const source = original ? { ...observer, x: original.x, y: original.y } : observer;
        if (!canTokenSeeThroughSmoke(source, token, items)) return false;
        const origin = center(source), radius = Number(observer.visionRadius) || 300;
        return Math.hypot(point.x - origin.x, point.y - origin.y) < radius
            && !items.some(wall => isInWallShadow(origin, point, wall, interaction, selected));
    });
};
