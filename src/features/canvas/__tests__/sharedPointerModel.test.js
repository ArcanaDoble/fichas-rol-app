import {
    CANVAS_POINTER_STALE_MS,
    getActiveCanvasPings,
    getCanvasPointerActorId,
    getCanvasPointerColor,
    normalizeCanvasPointers,
} from '../sharedPointerModel';

test('keeps every recent Canvas ping and drops only expired ones', () => {
    const now = 10_000;
    expect(getActiveCanvasPings({
        pings: [
            { id: 'first', x: 10, y: 20, createdAt: now - 100 },
            { id: 'second', x: 30, y: 40, createdAt: now - 200 },
            { id: 'expired', x: 50, y: 60, createdAt: 0 },
        ],
    }, now)).toEqual([
        expect.objectContaining({ id: 'first' }),
        expect.objectContaining({ id: 'second' }),
    ]);
});

test('accepts an empty local Canvas pointer before its first ping', () => {
    expect(getActiveCanvasPings(null, 10_000)).toEqual([]);
});

test('creates stable and role-specific Canvas pointer identities', () => {
    expect(getCanvasPointerActorId({ isPlayerView: true, playerName: 'Ada' })).toBe('player%3AAda');
    expect(getCanvasPointerActorId({ isPlayerView: false, currentUserId: 'dm' })).toBe('master%3Adm');
    expect(getCanvasPointerColor('same-player')).toBe(getCanvasPointerColor('same-player'));
    expect(getCanvasPointerColor('master', true)).toBe('#d8b968');
});

test('removes stale and local pointer documents', () => {
    const now = 10_000;
    expect(normalizeCanvasPointers([
        { id: 'remote', data: { x: 10, y: 20, updatedAt: now - 100 } },
        { id: 'local', data: { x: 30, y: 40, updatedAt: now - 100 } },
        { id: 'stale', data: { x: 50, y: 60, updatedAt: now - CANVAS_POINTER_STALE_MS } },
    ], { now, localActorId: 'local' })).toEqual([
        expect.objectContaining({ id: 'remote', x: 10, y: 20 }),
    ]);
});
