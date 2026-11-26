import { canTokenSeeCanvasTarget, getCanvasVisionBlockingSegments, isCanvasOccludedToken } from '../canvasVision';
import { getSceneBlockingSegments, isPointInsidePolygon } from '../scenery';
import { getTokenVisionWorldPolygons, traceTokenVisionContours } from '../tokenVisionShape';

const gridConfig = { fogOfWar: true, cellWidth: 50, cellHeight: 50, isInfinite: true };
const actor = (id, x, y, fields) => ({
    id, x, y, type: 'token', width: 20, height: 20, hasVision: true, visionRadius: 500, ...fields,
});
const creature = actor('creature', 100, 75, { width: 20, height: 70, blocksVision: true });
const observer = actor('viewer', 25, 100, { controlledBy: ['Ada'] });
const target = actor('target', 180, 100);
const sees = (source, destination, items) => canTokenSeeCanvasTarget({
    observer: source, target: destination, items, gridConfig,
});

test('traces opaque pieces and leaves concave gaps and transparent margins open', () => {
    const side = 16;
    const rgba = new Uint8ClampedArray(side * side * 4);
    for (let y = 0; y < side; y += 1) for (let x = 0; x < side; x += 1) {
        if ((x >= 2 && x < 5 && y >= 2 && y < 12) || (x >= 2 && x < 10 && y >= 9 && y < 12)
            || (x >= 12 && x < 15 && y >= 3 && y < 6)) rgba[(y * side + x) * 4 + 3] = 255;
    }
    const rings = traceTokenVisionContours(rgba, side, side);
    const covers = (x, y) => rings.some(ring => isPointInsidePolygon({ x: x / side, y: y / side }, ring));
    expect(rings).toHaveLength(2);
    expect(covers(3, 6)).toBe(true);
    expect(covers(13, 4)).toBe(true);
    expect(covers(8, 6)).toBe(false);
    expect(covers(1, 10)).toBe(false);
});

test('the visible creature hides the target behind it and does not become a movement wall', () => {
    const items = [observer, creature, target];
    const playerView = { items, gridConfig, isPlayerView: true, playerName: 'Ada', selectedTokenIds: [observer.id] };
    expect(sees(observer, creature, items)).toBe(true);
    expect(sees(observer, target, items)).toBe(false);
    expect(isCanvasOccludedToken({ ...playerView, target: creature })).toBe(false);
    expect(isCanvasOccludedToken({ ...playerView, target })).toBe(true);
    expect(getSceneBlockingSegments(items, { kind: 'movement' })).toEqual([]);
    expect(sees(observer, target, [observer, { ...creature, blocksVision: false }, target])).toBe(true);
});

test('a token can look out of its own blocker and a different wall can hide the creature', () => {
    const wall = { id: 'wall', type: 'wall', x1: 70, y1: 50, x2: 70, y2: 170 };
    expect(sees(creature, target, [creature, target])).toBe(true);
    expect(sees(observer, creature, [observer, creature, wall])).toBe(false);
    expect(sees(target, creature, [target, creature, wall])).toBe(true);
    expect(sees({ ...observer, visionRadius: 70 }, creature, [observer, creature])).toBe(true);
    expect(sees({ ...observer, visionRadius: 50 }, creature, [observer, creature])).toBe(false);
});

test('the shadow follows the token position, size, and rotation', () => {
    const geometry = actor('horizontal', 75, 75, { width: 60, height: 12, blocksVision: true });
    const behind = actor('behind', 180, 83);
    expect(sees(observer, behind, [geometry])).toBe(true);
    expect(sees(observer, behind, [{ ...geometry, height: 34 }])).toBe(false);
    const rotated = { ...geometry, rotation: 90 };
    expect(sees(observer, behind, [rotated])).toBe(false);
    expect(sees(observer, behind, [{ ...rotated, y: 175 }])).toBe(true);
});

test('circular portrait tokens leave transparent corners outside the blocking outline', () => {
    const round = actor('portrait', 50, 50, { width: 80, height: 80, isCircular: true, blocksVision: true });
    const [polygon] = getTokenVisionWorldPolygons(round);
    expect(isPointInsidePolygon({ x: 51, y: 51 }, polygon)).toBe(false);
    expect(isPointInsidePolygon({ x: 90, y: 90 }, polygon)).toBe(true);
    expect(getCanvasVisionBlockingSegments([round], { gridConfig })).toHaveLength(32);
});
