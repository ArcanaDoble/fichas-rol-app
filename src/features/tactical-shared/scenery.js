import treeCatalog from './treeCatalog.json';
import { nanoid } from 'nanoid';

export const TREE_CATALOG = treeCatalog;
const assetsById = new Map(treeCatalog.map(asset => [asset.id, asset]));
export const isTreeScenery = item => item?.type === 'geometry' && item.geometryKind === 'tree';
export const getTreeAsset = item => assetsById.get(typeof item === 'string' ? item : item?.treeAssetId);
export const getTreeTrunkRatio = item => Math.max(0.1, Math.min(1, Number(item.treeTrunkRatio) || 0.35));

export const createTreeScenery = (asset, position, gridConfig, visionMode = 'canopy') => ({
    id: `tree-${nanoid()}`,
    type: 'geometry', geometryKind: 'tree', shapeType: 'tree', layer: 'MAP',
    treeAssetId: asset.id, img: asset.image, name: asset.name,
    treeVisionMode: visionMode === 'trunk' ? 'trunk' : 'canopy', treeTrunkRatio: 0.35,
    x: position.x, y: position.y,
    width: (Number(gridConfig.cellWidth) || 50) * 2,
    height: (Number(gridConfig.cellHeight) || 50) * 2,
    rotation: 0, snapToGrid: Boolean(gridConfig.snapToGrid), controlledBy: ['master'],
});

// Match the image's object-fit: contain before applying the item's rotation.
export const getTreeImageBox = item => {
    const asset = getTreeAsset(item);
    const width = Math.max(1, Number(item.width) || 1), height = Math.max(1, Number(item.height) || 1);
    const ratio = (asset?.imageWidth || 1) / (asset?.imageHeight || 1);
    const imageWidth = Math.min(width, height * ratio);
    const imageHeight = imageWidth / ratio;
    return { x: (width - imageWidth) / 2, y: (height - imageHeight) / 2, width: imageWidth, height: imageHeight };
};

export const getTreeLocalPolygon = (item, part = item.treeVisionMode) => {
    const box = getTreeImageBox(item);
    if (part === 'trunk') {
        const radius = Math.min(box.width, box.height) * getTreeTrunkRatio(item) / 2;
        return Array.from({ length: 16 }, (_, index) => {
            const angle = index * Math.PI * 2 / 16;
            return { x: Number(item.width) / 2 + Math.cos(angle) * radius,
                y: Number(item.height) / 2 + Math.sin(angle) * radius };
        });
    }
    return (getTreeAsset(item)?.canopy || [[0, 0], [1, 0], [1, 1], [0, 1]])
        .map(([x, y]) => ({ x: box.x + x * box.width, y: box.y + y * box.height }));
};

export const getTreeWorldPolygon = (item, part) => {
    const cx = Number(item.width) / 2, cy = Number(item.height) / 2;
    const angle = (Number(item.rotation) || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return getTreeLocalPolygon(item, part).map(point => ({
        x: Number(item.x) + cx + (point.x - cx) * cos - (point.y - cy) * sin,
        y: Number(item.y) + cy + (point.x - cx) * sin + (point.y - cy) * cos,
    }));
};

export const getTreeResizePatch = (original, delta, config = {}) => {
    const angle = (Number(original.rotation) || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const snap = original.snapToGrid ?? config.snapToGrid;
    const unitX = snap ? (Number(config.cellWidth) || 50) / 4 : 1;
    const unitY = snap ? (Number(config.cellHeight) || 50) / 4 : 1;
    const desiredWidth = original.width + cos * delta.x + sin * delta.y;
    const desiredHeight = original.height - sin * delta.x + cos * delta.y;
    const width = snap ? Math.max(unitX, Math.round(desiredWidth / unitX) * unitX) : Math.max(10, desiredWidth);
    const height = snap ? Math.max(unitY, Math.round(desiredHeight / unitY) * unitY) : Math.max(10, desiredHeight);
    const dx = (width - original.width) / 2, dy = (height - original.height) / 2;
    // Anchor the opposite corner in world space even when the image is rotated.
    return { width, height, x: original.x + (cos - 1) * dx - sin * dy,
        y: original.y + sin * dx + (cos - 1) * dy };
};

export const isPointInsidePolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j];
        if ((a.y > point.y) !== (b.y > point.y)
            && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
};

// Test the whole base, not just its centre: a character can straddle the edge
// of the foliage. Normalizing the polygon also handles elliptical token bases.
export const isTokenUnderTreeCanopy = (token, tree) => {
    const width = Number(token.width), height = Number(token.height);
    if (!(width > 0 && height > 0)) return false;
    const center = { x: Number(token.x) + width / 2, y: Number(token.y) + height / 2 };
    if (isPointInsidePolygon(center, getTreeWorldPolygon(tree, 'trunk'))) return false;
    const angle = -(Number(token.rotation) || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const polygon = getTreeWorldPolygon(tree, 'canopy').map(point => ({
        x: ((point.x - center.x) * cos - (point.y - center.y) * sin) / (width / 2),
        y: ((point.x - center.x) * sin + (point.y - center.y) * cos) / (height / 2),
    }));
    if (isPointInsidePolygon({ x: 0, y: 0 }, polygon)) return true;
    return polygon.some((a, index) => {
        const b = polygon[(index + 1) % polygon.length];
        if (token.isCircular) {
            const dx = b.x - a.x, dy = b.y - a.y;
            const length = dx * dx + dy * dy;
            const t = length ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / length)) : 0;
            return (a.x + t * dx) ** 2 + (a.y + t * dy) ** 2 < 1;
        }
        let enter = 0, leave = 1;
        for (const axis of ['x', 'y']) {
            const delta = b[axis] - a[axis];
            if (Math.abs(delta) < 0.000001) {
                if (Math.abs(a[axis]) >= 1) return false;
            } else {
                const first = (-1 - a[axis]) / delta, last = (1 - a[axis]) / delta;
                enter = Math.max(enter, Math.min(first, last));
                leave = Math.min(leave, Math.max(first, last));
            }
        }
        return leave - enter > 0.000001;
    });
};

// Scene geometry is derived, never persisted as independent walls that can drift.
const sceneCache = new WeakMap();
export const getSceneBlockingSegments = (items = [], { kind = 'vision', excludeTreeId = null, observer = null } = {}) => {
    if (!sceneCache.has(items)) sceneCache.set(items, { segments: new Map(), observers: new WeakMap() });
    const scene = sceneCache.get(items);
    const cache = scene.segments;
    // Foliage cannot enclose an observer standing beneath it. Only that
    // observer uses the trunk; distant trees retain their chosen vision mode.
    let occupiedTrees = [];
    if (kind === 'vision' && observer && observer.type !== 'light') {
        if (!scene.observers.has(observer)) scene.observers.set(observer, items.filter(item => (
            isTreeScenery(item) && item.treeVisionMode !== 'trunk' && isTokenUnderTreeCanopy(observer, item)
        )).map(item => item.id));
        occupiedTrees = scene.observers.get(observer);
    }
    const key = JSON.stringify([kind, excludeTreeId, occupiedTrees]);
    if (cache.has(key)) return cache.get(key);
    if (cache.size >= 64) cache.clear();
    if (excludeTreeId) {
        const filtered = getSceneBlockingSegments(items, { kind, observer }).filter(segment => segment.ownerId !== excludeTreeId);
        cache.set(key, filtered);
        return filtered;
    }
    const segments = [];
    items.forEach(item => {
        if (item.type === 'wall') {
            if (!(item.wallType === 'door' && item.isOpen) && !(kind === 'vision' && item.wallType === 'window')) segments.push(item);
        } else if (isTreeScenery(item) && item.id !== excludeTreeId) {
            const polygon = getTreeWorldPolygon(item, kind === 'movement' || occupiedTrees.includes(item.id) ? 'trunk' : item.treeVisionMode);
            polygon.forEach((a, index) => {
                const b = polygon[(index + 1) % polygon.length];
                segments.push({ id: `${item.id}-edge-${index}`, ownerId: item.id, type: 'wall',
                    x1: a.x, y1: a.y, x2: b.x, y2: b.y });
            });
        }
    });
    cache.set(key, segments);
    return segments;
};

export const isPointInsideTreeTrunk = (point, items = []) => items.some(item => (
    isTreeScenery(item) && isPointInsidePolygon(point, getTreeWorldPolygon(item, 'trunk'))
));
