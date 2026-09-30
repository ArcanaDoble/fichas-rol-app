import { presentTarIgnition, ignitionHasExpired, TAR_IGNITION_DURATION } from '../tarIgnitionPresentation';
import { getTokenTarCoverage, getTerrainMovementCost } from '../tarTerrain';

const zone = { id: 'a', type: 'geometry', geometryKind: 'tar', x: 0, y: 0, width: 100, height: 100,
    areaEffect: { type: 'tar', difficultTerrain: true } };
const grid = { isInfinite: true, cellWidth: 50, cellHeight: 50 };

test('connected flames share one start, origin and duration without remaining difficult terrain', () => {
    const items = presentTarIgnition([zone, { ...zone, id: 'b', x: 100 }], ['a', 'b'], 10000);
    expect(items[0].areaEffect).toEqual(items[1].areaEffect);
    expect(items[0].areaEffect.startedAt).toBe(10000);
    expect(getTokenTarCoverage({ x: 0, y: 0, width: 50, height: 50 }, items, grid)).toBe(0);
    expect(getTerrainMovementCost({ token: { width: 50, height: 50 }, from: { x: 0, y: 0 },
        to: { x: 50, y: 0 }, items, config: grid })).toBe(1);
    expect(ignitionHasExpired(items[0], 10000 + TAR_IGNITION_DURATION - 1)).toBe(false);
    expect(ignitionHasExpired(items[0], 10000 + TAR_IGNITION_DURATION)).toBe(true);
});

test('repeated ignition cannot restart consumed terrain or ignite an unrelated zone', () => {
    const items = presentTarIgnition([zone, { ...zone, id: 'outside', x: 400 }], ['a'], 10000);
    expect(presentTarIgnition(items, ['a'], 11000)).toBe(items);
    expect(items[1].geometryKind).toBe('tar');
    expect(ignitionHasExpired(items[0], 20000)).toBe(true);
});
