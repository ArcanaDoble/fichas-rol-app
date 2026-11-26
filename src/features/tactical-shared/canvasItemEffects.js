import { getPlayerCanvasVisionTokens, isCanvasTokenHiddenFromViewer, getCanvasRenderItemsForViewer } from './tokenVisibilityAccess';
import { canTokenSeeCanvasTarget } from './canvasVision';

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
    const renderItems = getCanvasRenderItemsForViewer(items, viewer);
    return observers.some(observer => canTokenSeeCanvasTarget({ observer, target: token,
        items, renderItems, gridConfig, interaction, selectedTokenIds: selected }));
};
