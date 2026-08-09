import {
    DEFAULT_GRID_CONFIG,
    MAX_GRID_CELL_SIZE,
    MAX_GRID_COUNT,
    MIN_GRID_CELL_SIZE,
    MIN_GRID_COUNT,
    clampCellSize,
    clampGridCount,
    normalizeGridConfig,
    resolveBackgroundGridChange,
} from '../grid';
import { getGridWorldRect, snapWorldPositionToGrid } from '../spatial';

describe('canvas grid domain', () => {
    test('normalizes invalid and out-of-range grid values', () => {
        expect(clampGridCount(0)).toBe(MIN_GRID_COUNT);
        expect(clampGridCount(999)).toBe(MAX_GRID_COUNT);
        expect(clampCellSize(1)).toBe(MIN_GRID_CELL_SIZE);
        expect(clampCellSize(9999)).toBe(MAX_GRID_CELL_SIZE);

        expect(normalizeGridConfig({ columns: '5.6', rows: 'bad', cellWidth: 64 })).toMatchObject({
            columns: 6,
            rows: DEFAULT_GRID_CONFIG.rows,
            cellWidth: 64,
            cellHeight: DEFAULT_GRID_CONFIG.cellHeight,
        });
    });

    test('keeps background grid cells square when recalibrating columns', () => {
        const next = resolveBackgroundGridChange({
            imageWidth: 1600,
            imageHeight: 900,
            columns: 16,
            rows: 9,
            cellWidth: 100,
            cellHeight: 100,
        }, 'columns', 20);

        expect(next.columns).toBe(20);
        expect(next.rows).toBe(11);
        expect(next.cellWidth).toBe(next.cellHeight);
    });

    test('snaps finite-map items relative to the centered grid origin', () => {
        const config = {
            ...DEFAULT_GRID_CONFIG,
            isInfinite: false,
            columns: 4,
            rows: 4,
            cellWidth: 50,
            cellHeight: 50,
        };
        const rect = getGridWorldRect(config);

        expect(snapWorldPositionToGrid(
            { x: rect.x + 62, y: rect.y + 88 },
            config,
            { width: 25, height: 25 },
            { centerInCell: true },
        )).toEqual({ x: rect.x + 62.5, y: rect.y + 112.5 });
    });
});
