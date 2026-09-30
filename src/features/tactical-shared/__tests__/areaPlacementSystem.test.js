import { createAreaSceneItem, resolveAreaPlacement } from '../areaPlacementSystem';

const gridConfig = {
    isInfinite: true,
    cellWidth: 50,
    cellHeight: 50,
};

describe('AreaPlacementSystem', () => {
    it('snaps a rectangular 2x2 template to the grid', () => {
        const placement = resolveAreaPlacement({
            point: { x: 6011, y: 6068 },
            source: { x: 6000, y: 6000, width: 50, height: 50 },
            gridConfig,
            size: { columns: 2, rows: 2 },
            range: 3,
        });

        expect(placement).toMatchObject({
            x: 6000,
            y: 6050,
            width: 100,
            height: 100,
            columns: 2,
            rows: 2,
            distance: 1,
            valid: true,
        });
        expect(placement.cells).toHaveLength(4);
    });

    it('allows placing an area over the source at melee range', () => {
        const placement = resolveAreaPlacement({
            point: { x: 6001, y: 6001 },
            source: { x: 6000, y: 6000, width: 50, height: 50 },
            gridConfig,
            size: { columns: 2, rows: 2 },
            range: 0,
        });
        expect(placement.distance).toBe(0);
        expect(placement.valid).toBe(true);
    });

    it('rejects templates beyond range or outside a finite grid', () => {
        const ranged = resolveAreaPlacement({
            point: { x: 6201, y: 6001 },
            source: { x: 6000, y: 6000, width: 50, height: 50 },
            gridConfig,
            size: { columns: 2, rows: 2 },
            range: 2,
        });
        expect(ranged).toMatchObject({ distance: 4, valid: false, reason: 'out-of-range' });

        const finite = resolveAreaPlacement({
            point: { x: 6020, y: 6020 },
            gridConfig: { ...gridConfig, isInfinite: false, columns: 2, rows: 2, width: 2, height: 2 },
            size: { columns: 2, rows: 2 },
            range: 4,
        });
        expect(finite.valid).toBe(false);
        expect(finite.reason).toBe('outside-grid');
    });

    it('creates a persistent scene area from any valid placement', () => {
        const placement = resolveAreaPlacement({
            point: { x: 6001, y: 6001 },
            gridConfig,
            size: { columns: 2, rows: 2 },
        });
        expect(createAreaSceneItem({
            id: 'smoke-1',
            placement,
            name: 'Humo',
            geometryKind: 'smoke',
            areaEffect: { type: 'smoke' },
        })).toMatchObject({
            id: 'smoke-1',
            type: 'geometry',
            geometryKind: 'smoke',
            width: 100,
            height: 100,
            controlledBy: ['master'],
            areaEffect: { type: 'smoke' },
        });
    });
});
