import {
    getCombatRangeData,
    getDefaultTokenDimensions,
    getTokenDistanceInCells,
    isValidSelectionBox,
} from '../combatRules';

describe('canvas combat rules', () => {
    test('normalizes named, numeric and missing weapon ranges', () => {
        expect(getCombatRangeData({ alcance: 'Intermedio' })).toEqual({
            value: 2,
            label: 'Intermedio',
        });
        expect(getCombatRangeData({ payload: { range: '4 casillas' } })).toEqual({
            value: 4,
            label: '4 casillas',
        });
        expect(getCombatRangeData({})).toEqual({ value: 0, label: 'Toque' });
    });

    test('calculates token dimensions and Chebyshev distance in grid cells', () => {
        const grid = { isInfinite: true, cellWidth: 100, cellHeight: 100 };
        expect(getDefaultTokenDimensions(grid)).toEqual({ width: 50, height: 50 });
        expect(getTokenDistanceInCells(
            { x: 0, y: 0, width: 100, height: 100 },
            { x: 200, y: 100, width: 100, height: 100 },
            grid,
        )).toBe(2);
    });

    test('rejects incomplete or non-finite selection boxes', () => {
        expect(isValidSelectionBox({ start: { x: 1, y: 2 }, current: { x: 3, y: 4 } })).toBe(true);
        expect(isValidSelectionBox({ start: { x: 1, y: 2 }, current: { x: NaN, y: 4 } })).toBe(false);
        expect(isValidSelectionBox(null)).toBe(false);
    });
});
