import { snapWorldPositionToWallEndpoints } from '../spatial';

const wall = { id: 'edited', type: 'wall', x1: 100, y1: 100, x2: 200, y2: 100 };
const config = { isInfinite: true, cellWidth: 50, cellHeight: 50, snapToGrid: false };

test('a wall endpoint follows small pointer movements instead of snapping to itself', () => {
    expect(snapWorldPositionToWallEndpoints({ x: 105, y: 104 }, [wall], config, {
        excludeWallId: wall.id,
    })).toEqual({ x: 105, y: 104 });
});

test('editing still joins another wall endpoint, with priority over grid snapping', () => {
    const neighbor = { id: 'neighbor', type: 'wall', x1: 108, y1: 103, x2: 250, y2: 150 };
    expect(snapWorldPositionToWallEndpoints({ x: 105, y: 104 }, [wall, neighbor], config, {
        excludeWallId: wall.id,
        snapToGrid: true,
    })).toEqual({ x: 108, y: 103 });
});

test('drawing a new wall can still join an existing endpoint', () => {
    expect(snapWorldPositionToWallEndpoints({ x: 105, y: 104 }, [wall], config))
        .toEqual({ x: 100, y: 100 });
});

test('grid snapping remains available when the edited wall is the only nearby wall', () => {
    expect(snapWorldPositionToWallEndpoints({ x: 105, y: 104 }, [wall], config, {
        excludeWallId: wall.id,
        snapToGrid: true,
    })).toEqual({ x: 100, y: 100 });
});

test('endpoint attraction keeps the same screen distance at different zoom levels', () => {
    const pointer = { x: 110, y: 100 };
    expect(snapWorldPositionToWallEndpoints(pointer, [wall], config, { zoom: 1 }))
        .toEqual({ x: 100, y: 100 });
    expect(snapWorldPositionToWallEndpoints(pointer, [wall], config, { zoom: 2 }))
        .toEqual(pointer);
});
