import { calculateShadowPoints } from './spatial';
import { isPointVisible } from '../../utils/visibility';
import { getCombatRenderPlacement, isCombatTokenItem } from './legacyCombatRules';
import { canTokenSeeThroughSmoke, getPlayerCanvasVisionTokens, isCanvasTokenHiddenFromViewer } from './tokenVisibilityAccess';
import { getSceneBlockingSegments, isTreeScenery, isTokenUnderTreeCanopy } from './scenery';
import { canControlToken } from './tokenControlUtils';
import { getTokenVisionWorldPolygons } from './tokenVisionShape';

const center = token => ({ x: Number(token.x || 0) + Number(token.width || 0) / 2,
    y: Number(token.y || 0) + Number(token.height || 0) / 2 });

export const isCanvasTokenVisionBlocker = item => item?.blocksVision === true && isCombatTokenItem(item);

const blockerCache = new WeakMap();
const defaultGrid = {};

export const getCanvasTokenVisionBlockers = (items, gridConfig = defaultGrid) => {
    if (!blockerCache.has(items)) blockerCache.set(items, new WeakMap());
    const cache = blockerCache.get(items);
    if (cache.has(gridConfig)) return cache.get(gridConfig);
    const blockers = items.filter(isCanvasTokenVisionBlocker).map(token => {
        const placement = getCombatRenderPlacement(token, items, gridConfig);
        const polygons = getTokenVisionWorldPolygons(token, placement);
        const segments = polygons.flatMap((polygon, ring) => polygon.map((a, index) => {
            const b = polygon[(index + 1) % polygon.length];
            return { id: `${token.id}-vision-${ring}-${index}`, ownerId: token.id, type: 'wall',
                tokenVisionBlocker: true, x: token.x, y: token.y, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
        }));
        return { token, placement, segments };
    });
    cache.set(gridConfig, blockers);
    return blockers;
};

export const getCanvasVisionBlockingSegments = (items, { observer, gridConfig, excludeTreeId, excludeTokenId } = {}) => {
    const walls = getSceneBlockingSegments(items, { observer, excludeTreeId });
    const blockers = getCanvasTokenVisionBlockers(items, gridConfig);
    if (!blockers.length) return walls;
    return [...walls, ...blockers.flatMap(({ token, segments }) => (
        token.id === observer?.id || token.id === excludeTokenId ? [] : segments
    ))];
};

export const getCanvasShadowPoints = (origin, wall, interaction = {}, selected = []) => {
    let { x1, y1, x2, y2 } = wall;
    const id = wall.tokenVisionBlocker ? wall.ownerId : wall.id;
    const original = interaction.active && selected.includes(id) && interaction.originalPositions?.[id];
    if (original) {
        const dx = wall.x - original.x, dy = wall.y - original.y;
        x1 -= dx; x2 -= dx; y1 -= dy; y2 -= dy;
    }
    // Small silhouette edges need less overlap than hand-drawn walls.
    return calculateShadowPoints(origin.x, origin.y, x1, y1, x2, y2, undefined, wall.tokenVisionBlocker ? 0.12 : 1.5);
};

// A character's sight is independent of the master's unrestricted overview.
// Lights and darkvision cannot reveal targets outside the fog-of-war circle.
export const canTokenSeeCanvasTarget = ({ observer, target, items = [], renderItems = items,
    gridConfig = {}, interaction = {}, selectedTokenIds = [] }) => {
    if (!observer || !target || observer.hasVision === false) return false;
    const original = interaction.active && selectedTokenIds.includes(observer.id)
        && interaction.originalPositions?.[observer.id];
    const source = original ? { ...observer, x: original.x, y: original.y } : observer;
    if (!canTokenSeeThroughSmoke(source, target, items)) return false;
    const origin = center(source);
    if (gridConfig.fogOfWar && !observer.hasVision) return false;
    const placement = getCombatRenderPlacement(target, renderItems, gridConfig);
    const polygons = isCanvasTokenVisionBlocker(target) ? getTokenVisionWorldPolygons(target, placement) : [];
    // The exposed side of a large creature can be visible even if its centre
    // is beyond a corner or outside the observer's sight radius.
    const points = polygons.length ? polygons.flatMap(polygon => polygon.flatMap((point, index) => {
        const next = polygon[(index + 1) % polygon.length];
        return [point, { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }];
    })) : [center({ ...target, ...placement })];
    const candidates = gridConfig.fogOfWar ? points.filter(point => Math.hypot(point.x - origin.x, point.y - origin.y)
        < (Number(observer.visionRadius) || 300)) : points;
    if (!candidates.length) return false;
    const walls = getCanvasVisionBlockingSegments(items, { observer: source, gridConfig, excludeTokenId: target.id });
    const shadows = new Map();
    return candidates.some(point => !walls.some(wall => {
        if (!shadows.has(wall)) shadows.set(wall, getCanvasShadowPoints(origin, wall, interaction, selectedTokenIds)
            .split(' ').map(pair => { const [x, y] = pair.split(',').map(Number); return { x, y }; }));
        return isPointVisible(point, shadows.get(wall));
    }));
};

const treeViewCache = new WeakMap();
export const getCanvasVisionObservers = (items, viewer) => {
    const { isPlayerView, playerName, selectedTokenIds } = viewer;
    const perspectives = isPlayerView ? getPlayerCanvasVisionTokens(items, playerName) : items.filter(item => (
        item.hasVision && !isCanvasTokenHiddenFromViewer(item, items, viewer)
    ));
    const selected = perspectives.filter(item => selectedTokenIds.includes(item.id));
    return { observers: selected.length ? selected : perspectives, masterOverview: !isPlayerView && !selected.length };
};

export const getCanvasTreeView = (items, { gridConfig = {}, isPlayerView = false, playerName = '', selectedTokenIds = [] } = {}) => {
    if (!treeViewCache.has(items)) treeViewCache.set(items, new Map());
    const cache = treeViewCache.get(items);
    const key = JSON.stringify([Boolean(gridConfig.fogOfWar), isPlayerView, playerName, selectedTokenIds]);
    if (cache.has(key)) return cache.get(key);
    const viewer = { isPlayerView, playerName, selectedTokenIds };
    const { observers, masterOverview } = getCanvasVisionObservers(items, viewer);
    const visibleActors = items.filter(item => isCombatTokenItem(item)
        && !isCanvasTokenHiddenFromViewer(item, items, viewer)
        && (masterOverview || !gridConfig.fogOfWar
            || observers.some(observer => observer.id === item.id
                || canTokenSeeCanvasTarget({ observer, target: item, items, gridConfig }))));
    const fadedTreeIds = new Set(items.filter(item => isTreeScenery(item)
        && visibleActors.some(actor => isTokenUnderTreeCanopy(actor, item))).map(tree => tree.id));
    const view = { observers, masterOverview, visibleActors, fadedTreeIds };
    if (cache.size >= 32) cache.clear();
    cache.set(key, view);
    return view;
};

export const TREE_OCCUPIED_OPACITY = 0.38;

export const isCanvasOccludedToken = ({ target, items, gridConfig, isPlayerView, playerName, selectedTokenIds = [] }) => {
    if (!isPlayerView || !gridConfig.fogOfWar || !isCombatTokenItem(target)
        || canControlToken(target, true, playerName)
        || !items.some(item => isTreeScenery(item) || isCanvasTokenVisionBlocker(item))) return false;
    const observers = getPlayerCanvasVisionTokens(items, playerName);
    const selected = observers.filter(observer => selectedTokenIds.includes(observer.id));
    return !(selected.length ? selected : observers).some(observer => (
        canTokenSeeCanvasTarget({ observer, target, items, gridConfig })
    ));
};

export const isCanvasTreeOccludedToken = isCanvasOccludedToken;
