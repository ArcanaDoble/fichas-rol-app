import { doc, runTransaction } from 'firebase/firestore';
import { persistBoardStackAction } from '../persistBoardStackAction';

jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn((db, collection, id) => `${collection}/${id}`), runTransaction: jest.fn() }));
beforeEach(() => doc.mockImplementation((db, collection, id) => `${collection}/${id}`));

test('two pending players resolve against fresh state and never draw the same card', async () => {
    let state = { lastModified: 10, items: [
        { id: 'first', type: 'card', x: 20, y: 30, zone: 'board', stackIds: ['second'], stackKey: 'pile', hideStackContentsForPlayers: true },
        { id: 'second', type: 'card', x: 20, y: 30, stackParentId: 'first' },
        { id: 'unrelated', type: 'token', x: 99 },
    ] };
    let queue = Promise.resolve();
    runTransaction.mockImplementation((db, work) => {
        const next = queue.then(() => work({
            get: async () => ({ exists: () => true, data: () => state }),
            update: (ref, patch) => { expect(ref).toBe('board_scenarios/scene'); state = { ...state, ...patch }; },
        }));
        queue = next.catch(() => {});
        return next;
    });
    const command = { cardId: 'first', stackKey: 'pile', action: 'draw', count: 1 };
    const results = await Promise.all([
        persistBoardStackAction('scene', command, { isPlayerView: true }),
        persistBoardStackAction('scene', command, { isPlayerView: true }),
    ]);
    expect(results.map(result => result.drawnIds[0])).toEqual(['first', 'second']);
    expect(state.items).toHaveLength(3);
    expect(state.items.find(item => item.id === 'unrelated').x).toBe(99);
    await expect(persistBoardStackAction('scene', command, { isPlayerView: true })).rejects.toThrow('ya no está');
});

test('a failed transaction does not report a completed draw', async () => {
    runTransaction.mockRejectedValueOnce(new Error('Sin conexión'));
    await expect(persistBoardStackAction('scene', { action: 'draw' }, { isPlayerView: true })).rejects.toThrow('Sin conexión');
});
