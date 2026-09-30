import {
    EXPLOSIVE_BOMB_ITEM_USE_ID,
    explosiveBombItemUseDefinition,
    getItemUseDefinition,
} from '../item-use/itemUseDefinitions';
import {
    calculateExplosiveBombPressure,
    getExplosiveBombDistance,
    getExplosiveBombMaxRange,
    getExplosiveBombTargets,
    resolveExplosiveBombAreaPlacements,
} from '../item-use/explosiveBombRules';

const infiniteGrid = { isInfinite: true, cellWidth: 100, cellHeight: 100 };
const finiteGrid = { isInfinite: false, columns: 3, rows: 3, cellWidth: 100, cellHeight: 100 };

describe('Bomba explosiva', () => {
    it('recognizes the consumable and uses the committed value for launch range', () => {
        expect(getItemUseDefinition({ name: 'Bomba explosiva' })).toBe(explosiveBombItemUseDefinition);
        expect(getItemUseDefinition({ nombre: 'BOMBA EXPLOSIVA' })).toBe(explosiveBombItemUseDefinition);
        expect(getItemUseDefinition({ itemUseId: EXPLOSIVE_BOMB_ITEM_USE_ID })).toBe(explosiveBombItemUseDefinition);
        expect(getItemUseDefinition({ name: 'Bomba explosiva', itemUseId: 'another-effect' })).toBeNull();
        expect(explosiveBombItemUseDefinition.area).toMatchObject({
            size: { columns: 2, rows: 2 },
            rangeFrom: 'resource.value',
            orientAroundImpact: true,
        });
    });

    it('measures throwing distance from the nearest occupied cell to the impact cell', () => {
        const largeThrower = { id: 'large', type: 'token', x: 100, y: 100, width: 200, height: 200 };
        expect(getExplosiveBombDistance({ source: largeThrower, impactCell: { column: 5, row: 2 }, gridConfig: infiniteGrid })).toBe(3);
        expect(getExplosiveBombDistance({ source: largeThrower, impactCell: { column: 2, row: 2 }, gridConfig: infiniteGrid })).toBe(0);
        expect(getExplosiveBombDistance({ source: largeThrower, impactCell: { column: 2, row: 5 }, gridConfig: infiniteGrid })).toBe(3);
    });

    it('offers 2x2 orientations only when the impact cell is within the launch range', () => {
        const source = { id: 'hero', type: 'token', x: 0, y: 0, width: 100, height: 100 };
        const impactCell = { column: 4, row: 2 };
        const placements = resolveExplosiveBombAreaPlacements({ impactCell, source, maxRange: 4, gridConfig: infiniteGrid });
        expect(placements.map((placement) => placement.orientation)).toEqual(['nw', 'ne', 'sw', 'se']);
        expect(placements.every((placement) => placement.valid && placement.distance === 4)).toBe(true);
        expect(placements.every((placement) => placement.cells.some(
            (cell) => cell.column === impactCell.column && cell.row === impactCell.row,
        ))).toBe(true);
        expect(new Set(placements.map(({ x, y }) => `${x}:${y}`)).size).toBe(4);
        expect(resolveExplosiveBombAreaPlacements({ impactCell, source, maxRange: 3, gridConfig: infiniteGrid })).toEqual([]);
        expect(getExplosiveBombMaxRange({ source, resourceValue: 4 })).toBe(4);
        expect(getExplosiveBombMaxRange({ source: { ...source, profileType: 'rogueliteEnemy', offenseBase: 3 }, resourceValue: 6 })).toBe(3);
    });

    it('excludes orientations outside a finite board but keeps the impact cell valid', () => {
        expect(resolveExplosiveBombAreaPlacements({ impactCell: { column: 1, row: 1 }, gridConfig: finiteGrid })).toHaveLength(4);
        expect(resolveExplosiveBombAreaPlacements({ impactCell: { column: 0, row: 0 }, gridConfig: finiteGrid })
            .map(({ orientation }) => orientation)).toEqual(['se']);
        expect(resolveExplosiveBombAreaPlacements({ impactCell: { column: 2, row: 2 }, gridConfig: finiteGrid })
            .map(({ orientation }) => orientation)).toEqual(['nw']);
        expect(resolveExplosiveBombAreaPlacements({ impactCell: { column: -1, row: 1 }, gridConfig: finiteGrid })).toEqual([]);
    });

    it('hits each overlapping creature once, including the thrower and allies', () => {
        const placement = resolveExplosiveBombAreaPlacements({ impactCell: { column: 2, row: 2 }, gridConfig: infiniteGrid })[0];
        const thrower = { id: 'thrower', type: 'token', profileType: 'rogueliteClass', x: 200, y: 200, width: 100, height: 100, side: 'player' };
        const ally = { id: 'ally', type: 'token', profileType: 'rogueliteClass', x: 100, y: 100, width: 200, height: 200, side: 'player' };
        const enemy = { id: 'enemy', type: 'token', profileType: 'rogueliteEnemy', x: 200, y: 100, width: 100, height: 100, side: 'enemy' };
        const outside = { id: 'outside', type: 'token', profileType: 'rogueliteEnemy', x: 300, y: 100, width: 100, height: 100, side: 'enemy' };
        const scenery = { id: 'scenery', type: 'geometry', x: 100, y: 100, width: 200, height: 200 };
        expect(getExplosiveBombTargets({
            items: [thrower, ally, enemy, enemy, outside, scenery], placement, gridConfig: infiniteGrid,
        }).map(({ id }) => id)).toEqual(['thrower', 'ally', 'enemy']);
    });

    it('ignores decorative board tokens but hits class and enemy creatures, including partial overlap of a large token', () => {
        const placement = resolveExplosiveBombAreaPlacements({
            impactCell: { column: 2, row: 2 }, gridConfig: infiniteGrid,
        })[0];
        const decorative = { id: 'decoration', layer: 'TOKEN', x: 100, y: 100, width: 100, height: 100 };
        const classToken = { id: 'class', layer: 'TOKEN', profileType: 'rogueliteClass',
            x: 100, y: 200, width: 100, height: 100, stats: { vida: { current: 3 } } };
        const largeEnemy = { id: 'large-enemy', layer: 'TOKEN', profileType: 'rogueliteEnemy',
            x: 200, y: 200, width: 200, height: 200, stats: { vida: { current: 5 } } };

        expect(getExplosiveBombTargets({
            items: [decorative, classToken, largeEnemy], placement, gridConfig: infiniteGrid,
        }).map(({ id }) => id)).toEqual(['class', 'large-enemy']);
    });

    it('rolls one shared pressure only after a legal launch and subtracts the distance', () => {
        expect(calculateExplosiveBombPressure({ resourceValue: 3, rolls: [2, 7], distance: 3 })).toBe(9);
        expect(() => calculateExplosiveBombPressure({ resourceValue: 3, rolls: [1, 1], distance: 4 })).toThrow(RangeError);
        expect(calculateExplosiveBombPressure({ resourceValue: 1, rolls: [1, 1], distance: 3, maxRange: 3 })).toBe(0);
        expect(() => calculateExplosiveBombPressure({ resourceValue: 3, rolls: [1], distance: 0 })).toThrow(RangeError);
        expect(() => calculateExplosiveBombPressure({ resourceValue: 3, rolls: [0, 8], distance: 0 })).toThrow(RangeError);
    });
});
