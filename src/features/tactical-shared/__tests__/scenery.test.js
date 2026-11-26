import { TREE_CATALOG, createTreeScenery, getTreeImageBox, getTreeWorldPolygon, getTreeResizePatch, getSceneBlockingSegments, isTokenUnderTreeCanopy, isPointInsidePolygon } from '../scenery';
import { canTokenSeeCanvasTarget, isCanvasTreeOccludedToken, getCanvasTreeView } from '../canvasVision';
import { isCombatMoveBlockedByWall, isCombatTokenItem } from '../legacyCombatRules';
import { createCanvasTokenController } from '../createTacticalTokenController';

const config = { cellWidth: 50, cellHeight: 50, isInfinite: true, snapToGrid: false };
const makeTree = fields => ({ ...createTreeScenery(TREE_CATALOG[0], { x: 100, y: 100 }, config), ...fields });
const token = (x, cy) => ({ id: String(x), type: 'token', x, y: cy - 5, width: 10, height: 10, hasVision: true, visionRadius: 1000 });
const sees = (tree, cy) => canTokenSeeCanvasTarget({ observer: token(0, cy), target: token(300, cy), items: [tree], gridConfig: config });

test('all fifteen imported trees have bounded contours and portable asset paths', () => {
    expect(TREE_CATALOG).toHaveLength(15);
    TREE_CATALOG.forEach(asset => {
        expect(asset.image).toMatch(/^\/scenery\/trees\/.+\.webp$/);
        expect(asset.canopy.length).toBeGreaterThan(8);
        asset.canopy.flat().forEach(value => expect(value).toBeGreaterThanOrEqual(0));
        asset.canopy.flat().forEach(value => expect(value).toBeLessThanOrEqual(1));
    });
});

test('movement, rotation, fitting and resizing transform the contour with the visible image', () => {
    const tree = makeTree({ treeAssetId: TREE_CATALOG[1].id, width: 180, height: 100 });
    const box = getTreeImageBox(tree);
    expect(box.width / box.height).toBeCloseTo(TREE_CATALOG[1].imageWidth / TREE_CATALOG[1].imageHeight);
    const points = getTreeWorldPolygon(tree);
    const shifted = getTreeWorldPolygon({ ...tree, x: 120, y: 70 });
    points.forEach((point, i) => {
        expect(shifted[i].x).toBeCloseTo(point.x + 20);
        expect(shifted[i].y).toBeCloseTo(point.y - 30);
    });
    const rotated = getTreeWorldPolygon({ ...tree, rotation: 90 });
    const cx = tree.x + tree.width / 2, cy = tree.y + tree.height / 2;
    expect(rotated[0].x).toBeCloseTo(cx - (points[0].y - cy));
    expect(rotated[0].y).toBeCloseTo(cy + points[0].x - cx);
    const scaled = getTreeWorldPolygon({ ...tree, width: 360, height: 200 });
    expect(scaled[0].x - tree.x).toBeCloseTo((points[0].x - tree.x) * 2);
    expect(scaled[0].y - tree.y).toBeCloseTo((points[0].y - tree.y) * 2);
});

test('canopy mode blocks a ray under the foliage that passes beside the trunk', () => {
    expect(sees(makeTree({ treeVisionMode: 'canopy' }), 120)).toBe(false);
    expect(sees(makeTree({ treeVisionMode: 'trunk' }), 120)).toBe(true);
    expect(sees(makeTree({ treeVisionMode: 'trunk' }), 150)).toBe(false);
    expect(sees(makeTree({ y: 350 }), 150)).toBe(true);
});

test('partially entering the canopy does not enclose vision, while the trunk and other trees still block', () => {
    const tree = makeTree({ id: 'occupied' });
    const edge = getTreeWorldPolygon(tree, 'canopy').reduce((left, point) => point.x < left.x ? point : left);
    const observer = { ...token(edge.x - 12, edge.y), width: 20, height: 20, y: edge.y - 10, isCircular: true };
    const center = { x: observer.x + 10, y: edge.y };
    expect(isPointInsidePolygon(center, getTreeWorldPolygon(tree, 'canopy'))).toBe(false);
    expect(isTokenUnderTreeCanopy(observer, tree)).toBe(true);
    const source = { ...token(140, 120), isCircular: true };
    expect(isTokenUnderTreeCanopy(source, tree)).toBe(true);
    const check = (from, target, items = [tree]) => canTokenSeeCanvasTarget({ observer: from, target, items, gridConfig: config });
    expect(check(observer, token(0, edge.y))).toBe(true);
    expect(check(source, token(300, 120))).toBe(true);
    expect(check(source, token(145, 220))).toBe(false);
    expect(check(source, token(400, 120), [tree, makeTree({ id: 'other', x: 250 })])).toBe(false);
    expect(check(source, token(0, 120), [tree, { id: 'wall', type: 'wall', x1: 80, y1: 0, x2: 80, y2: 400 }])).toBe(false);
    expect(getSceneBlockingSegments([tree], { observer }).map(segment => [segment.x1, segment.y1]))
        .toEqual(getTreeWorldPolygon(tree, 'trunk').map(point => [point.x, point.y]));
});

test('overlap follows rotation, scaling and contain fitting, excludes trunk and empty image margins', () => {
    const tree = makeTree({ width: 300, height: 200, rotation: 67 });
    const edge = getTreeWorldPolygon(tree, 'canopy')[0];
    const actor = { ...token(edge.x - 10, edge.y), width: 20, height: 20, y: edge.y - 10, isCircular: true };
    expect(isTokenUnderTreeCanopy(actor, tree)).toBe(true);
    expect(isTokenUnderTreeCanopy({ ...actor, x: actor.x + 800 }, tree)).toBe(false);
    expect(isTokenUnderTreeCanopy(token(245, 200), tree)).toBe(false);
    expect(isTokenUnderTreeCanopy(token(102, 150), { ...tree, rotation: 0, width: 400, height: 100 })).toBe(false);
    const moved = { ...tree, x: tree.x + 800, y: tree.y - 200, width: 600, height: 400 };
    expect(isTokenUnderTreeCanopy({ ...actor, x: moved.x + (actor.x - tree.x) * 2,
        y: moved.y + (actor.y - tree.y) * 2, width: 40, height: 40 }, moved)).toBe(true);
});

test('canopy fading uses visible allies or enemies, independent of selection, without leaking hidden actors', () => {
    const tree = makeTree({ treeVisionMode: 'trunk' });
    const source = { ...token(0, 120), id: 'source', controlledBy: ['Ada'] };
    const enemy = { ...token(145, 120), id: 'enemy', hasVision: false, controlledBy: ['master'] };
    const viewer = { gridConfig: { fogOfWar: true }, isPlayerView: true, playerName: 'Ada' };
    const faded = (actors, options = viewer) => getCanvasTreeView([tree, source, ...actors], options).fadedTreeIds.has(tree.id);
    expect(faded([enemy])).toBe(true);
    expect(faded([enemy], { ...viewer, selectedTokenIds: ['source'] })).toBe(true);
    expect(faded([{ ...enemy, controlledBy: ['Ada'] }])).toBe(true);
    expect(faded([{ ...enemy, status: ['Oculto'] }])).toBe(false);
    expect(faded([{ ...enemy, y: 145 }])).toBe(false);
    expect(faded([enemy, { id: 'wall', type: 'wall', x1: 80, y1: 0, x2: 80, y2: 300 }])).toBe(false);
    expect(faded([{ ...enemy, x: 300 }])).toBe(false);
    expect(faded([], viewer)).toBe(false);
});

test('a rotated tree resizes in its local axes and keeps the opposite corner anchored', () => {
    const tree = makeTree({ rotation: 90, snapToGrid: false });
    const patch = getTreeResizePatch(tree, { x: -20, y: 40 }, config);
    expect(patch.width).toBeCloseTo(140);
    expect(patch.height).toBeCloseTo(120);
    expect(patch.x).toBeCloseTo(70);
    expect(patch.y).toBeCloseTo(110);
    const topLeft = item => ({ x: item.x + item.width / 2 + item.height / 2,
        y: item.y + item.height / 2 - item.width / 2 });
    expect(topLeft({ ...tree, ...patch })).toEqual(topLeft(tree));
});

test('the trunk blocks passage in both vision modes while the canopy remains traversable', () => {
    ['canopy', 'trunk'].forEach(treeVisionMode => {
        const tree = makeTree({ treeVisionMode });
        expect(isCombatMoveBlockedByWall(token(0, 150), token(300, 150), [tree], config)).toBe(true);
        expect(isCombatMoveBlockedByWall(token(0, 115), token(300, 115), [tree], config)).toBe(false);
        expect(isCombatMoveBlockedByWall(token(0, 150), token(145, 150), [tree], config)).toBe(true);
    });
});

test('players cannot inspect or click an enemy occluded by a tree', () => {
    const observer = { ...token(0, 120), controlledBy: ['Ada'] };
    const target = token(300, 120);
    const tree = makeTree({ treeVisionMode: 'canopy' });
    const options = { target, items: [observer, target, tree], gridConfig: { ...config, fogOfWar: true },
        isPlayerView: true, playerName: 'Ada' };
    expect(isCanvasTreeOccludedToken(options)).toBe(true);
    expect(isCanvasTreeOccludedToken({ ...options, items: [observer, target, { ...tree, treeVisionMode: 'trunk' }] })).toBe(false);
    expect(isCanvasTreeOccludedToken({ ...options, target: observer })).toBe(false);
});

test('tree surfaces may ignore their own occluder but retain other trees and closed walls', () => {
    const tree = makeTree({ id: 'first' }), other = makeTree({ id: 'second', x: 300 });
    const wall = { id: 'wall', type: 'wall', x1: 50, y1: 0, x2: 50, y2: 200 };
    const window = { ...wall, id: 'window', wallType: 'window' };
    const items = [tree, other, wall, window];
    const segments = getSceneBlockingSegments(items, { excludeTreeId: tree.id });
    expect(segments.some(segment => segment.ownerId === tree.id)).toBe(false);
    expect(segments.some(segment => segment.ownerId === other.id)).toBe(true);
    expect(segments.some(segment => segment.id === 'wall')).toBe(true);
    expect(segments.some(segment => segment.id === 'window')).toBe(false);
    expect(getSceneBlockingSegments(items, { kind: 'movement' }).some(segment => segment.id === 'window')).toBe(true);
});

test('serialized scenery retains its appearance and blockers without becoming a combatant', () => {
    const tree = makeTree({ treeVisionMode: 'trunk', rotation: 135, width: 280, treeTrunkRatio: .5 });
    const restored = JSON.parse(JSON.stringify(tree));
    expect(getTreeWorldPolygon(restored)).toEqual(getTreeWorldPolygon(tree));
    expect(isCombatTokenItem(restored)).toBe(false);
});

test('adding a tree persists one scenery item and selects the Map inspector', () => {
    const scene = { id: 'scene', rulesSystem: 'campaign', items: [] };
    const options = { activeScenario: scene, activeScenarioRef: { current: scene }, gridConfig: config,
        offset: { x: 0, y: 0 }, zoom: 1, setActiveScenario: jest.fn(), safePersistItems: jest.fn(),
        setSelectedTokenIds: jest.fn(), setActiveLayer: jest.fn(), setActiveTab: jest.fn() };
    createCanvasTokenController(options).addTreeToCanvas(TREE_CATALOG[0].id, 'trunk');
    const created = options.safePersistItems.mock.calls[0][1][0];
    expect(created).toMatchObject({ type: 'geometry', geometryKind: 'tree', treeVisionMode: 'trunk', width: 100, height: 100 });
    expect(options.setActiveLayer).toHaveBeenCalledWith('MAP');
    expect(options.setActiveTab).toHaveBeenCalledWith('INSPECTOR');
    expect(options.setSelectedTokenIds).toHaveBeenCalledWith([created.id]);
    expect(scene.items).toEqual([]);
    expect(TREE_CATALOG[0].treeVisionMode).toBeUndefined();
    options.safePersistItems.mockClear();
    createCanvasTokenController({ ...options, isPlayerView: true }).addTreeToCanvas(TREE_CATALOG[0].id);
    createCanvasTokenController({ ...options, isBoardMode: true }).addTreeToCanvas(TREE_CATALOG[0].id);
    expect(options.safePersistItems).not.toHaveBeenCalled();
});
