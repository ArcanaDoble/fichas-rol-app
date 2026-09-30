import { createCanvasTokenController } from '../../tactical-shared/createTacticalTokenController';
import { getTerrainMovementCost } from '../../tactical-shared/tarTerrain';

const setup = (isPlayerView = false) => {
    let scene = { id: 'board', items: [{ id: 'existing-card', type: 'card' }] };
    const persist = jest.fn();
    const controller = createCanvasTokenController({ activeScenario: scene, isBoardMode: true, isPlayerView,
        gridConfig: { cellWidth: 50, cellHeight: 50 }, safePersistItems: persist,
        setActiveScenario: update => { scene = update(scene); }, setSelectedTokenIds: jest.fn() });
    return { controller, persist, scene: () => scene };
};

test.each(['smoke', 'tar'])('master can create and persist a functional %s zone without changing cards', async kind => {
    const { controller, persist, scene } = setup();
    await controller.addAreaToCanvas(kind);
    const zone = scene().items[1];
    expect(zone).toMatchObject({ type: 'geometry', geometryKind: kind, width: 100, height: 100,
        snapToGrid: true, controlledBy: ['master'], deletableBy: ['master'],
        areaEffect: { type: kind, persistent: true } });
    expect(scene().items[0]).toEqual({ id: 'existing-card', type: 'card' });
    expect(persist).toHaveBeenCalledWith('board', scene().items, [{ id: 'existing-card', type: 'card' }]);
    if (kind === 'tar') {
        const from = { x: zone.x - 50, y: zone.y };
        expect(getTerrainMovementCost({ token: { width: 50, height: 50 }, from,
            to: { x: zone.x, y: zone.y }, items: [zone], config: { cellWidth: 50, cellHeight: 50 } })).toBe(2);
    }
});

test('players cannot create terrain zones through the controller', async () => {
    const { controller, persist, scene } = setup(true);
    await controller.addAreaToCanvas('tar');
    await controller.addAreaToCanvas('smoke');
    expect(scene().items).toHaveLength(1);
    expect(persist).not.toHaveBeenCalled();
});
