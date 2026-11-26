import { runTransaction } from 'firebase/firestore';
import { CANVAS_MASTER_POINTER_COLOR, chooseCanvasPointerColor, reserveCanvasPointerColor } from '../sharedPointerColors';

jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    doc: (_db, ...parts) => parts.join('/'),
    runTransaction: jest.fn(),
}));

test('randomly chooses separated player hues and reserves gold for the master', () => {
    expect(chooseCanvasPointerColor({}, false, 0)).not.toBe(chooseCanvasPointerColor({}, false, .99));
    const colors = {};
    for (let index = 0; index < 100; index += 1) colors[`player-${index}`] = chooseCanvasPointerColor(colors, false, 0);
    expect(new Set(Object.values(colors)).size).toBe(100);
    expect(Object.values(colors)).not.toContain(CANVAS_MASTER_POINTER_COLOR);
    colors.master = chooseCanvasPointerColor(colors, true);
    expect(colors.master).toBe(CANVAS_MASTER_POINTER_COLOR);
    expect(chooseCanvasPointerColor(colors, true)).not.toBe(colors.master);
});

test('transaction retries use the latest reservations and one random choice', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(.4);
    const writes = [];
    runTransaction.mockImplementation(async (_db, callback) => {
        await callback({ get: async () => ({ exists: () => false }), set: (_ref, data) => writes.push(data) });
        return callback({
            get: async () => ({ exists: () => true, data: () => ({ colors: { other: writes[0].colors.ada } }) }),
            set: (_ref, data) => writes.push(data),
        });
    });
    const color = await reserveCanvasPointerColor({ scenarioCollectionName: 'canvas_scenarios', scenarioId: 'room', actorId: 'ada' });
    expect(color).not.toBe(writes[0].colors.ada);
    expect(writes[1].colors).toEqual({ other: writes[0].colors.ada, ada: color });
    expect(random).toHaveBeenCalledTimes(1);
    random.mockRestore();
});

test('reuses the participant reservation without a write and isolates rooms', async () => {
    const set = jest.fn();
    const get = jest.fn(async () => ({ exists: () => true, data: () => ({ colors: { ada: '#60d5ef' } }) }));
    runTransaction.mockImplementation((_db, callback) => callback({ get, set }));
    const color = await reserveCanvasPointerColor({ scenarioCollectionName: 'canvas_scenarios', scenarioId: 'room-2', actorId: 'ada' });
    expect(color).toBe('#60d5ef');
    expect(set).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith('canvas_scenarios/room-2/sharedPointerPalette/assignments');
});
