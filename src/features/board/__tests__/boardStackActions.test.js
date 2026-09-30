import { applyBoardStackAction } from '../boardStackActions';
import { isCardInPrivateStack, stackCardOnTarget } from '../../../utils/cardBoard';

const card = (id, extra = {}) => ({ id, type: 'card', zone: 'board', name: id,
    x: 100, y: 200, width: 100, height: 140, rotation: 25,
    frontImage: `/${id}.png`, backImage: '/back.png', ...extra });
const pile = () => [card('bottom', { stackParentId: 'top' }), card('middle', { stackParentId: 'top' }),
    card('top', { stackIds: ['bottom', 'middle'], ownerName: 'Master' })];
const act = (items, action, options = {}, viewer = {}) => applyBoardStackAction(items, { cardId: 'top', newStackKey: 'pile-top', action, ...options }, viewer);

test('creates hundreds of real copies without copying links or changing existing images and game fields', () => {
    const original = card('top', { customEffect: 'En la imagen', faceDown: false });
    const unrelated = { id: 'token', stats: { vida: 4 } };
    const result = act([original, unrelated], 'copies', { count: 300, newIds: Array.from({ length: 300 }, (_, i) => `copy-${i}`) });
    expect(result.items).toHaveLength(302);
    expect(new Set(result.items.map(item => item.id)).size).toBe(302);
    expect(result.items.find(item => item.id === 'token')).toBe(unrelated);
    expect(result.items.find(item => item.id === 'top').stackIds).toHaveLength(300);
    expect(result.items.find(item => item.id === 'copy-299')).toMatchObject({ frontImage: '/top.png', backImage: '/back.png', customEffect: 'En la imagen', stackParentId: 'top', stackIds: [] });
    expect(original.stackIds).toBeUndefined();
});

test('shuffles all cards, including the displayed card, without changing the pile position', () => {
    const result = act(pile(), 'shuffle', {}, { random: () => 0 });
    const root = result.items.find(item => !item.stackParentId);
    expect(root.id).toBe('bottom');
    expect(root).toMatchObject({ stackKey: 'pile-top', x: 100, y: 200, rotation: 25, hideStackContentsForPlayers: true });
    expect(new Set([root.id, ...root.stackIds])).toEqual(new Set(['top', 'middle', 'bottom']));
    expect(result.items.every(item => item.faceDown)).toBe(true);
    expect(result.items.every(item => isCardInPrivateStack(item, result.items))).toBe(true);
});

test('draws the actual top card and promotes the next one, preserving the private pile', () => {
    const items = pile().map(item => ({ ...item, faceDown: true, hideStackContentsForPlayers: item.id === 'top', stackKey: item.id === 'top' ? 'pile-1' : null }));
    const result = act(items, 'draw', { count: 1, stackKey: 'pile-1' }, { isPlayerView: true });
    expect(result.drawnIds).toEqual(['top']);
    expect(result.remainingCount).toBe(2);
    expect(result.items.find(item => item.id === 'top')).toMatchObject({ faceDown: false, stackKey: null, stackIds: [], stackParentId: null, containerId: null, ownerName: null });
    expect(result.items.find(item => item.id === 'middle')).toMatchObject({ x: 100, y: 200, stackKey: 'pile-1', stackIds: ['bottom'], hideStackContentsForPlayers: true });
    expect(result.items.at(-1).id).toBe('top');
});

test('stale requests draw distinct cards and consume the last card without recreating the pile', () => {
    let items = pile().map(item => item.id === 'top' ? { ...item, stackKey: 'pile-top' } : item);
    const drawn = [];
    for (let i = 0; i < 3; i += 1) {
        const result = act(items, 'draw', { count: 1, stackKey: 'pile-top' }, { isPlayerView: true });
        drawn.push(...result.drawnIds);
        items = result.items;
    }
    expect(drawn).toEqual(['top', 'middle', 'bottom']);
    expect(items).toHaveLength(3);
    expect(items.every(item => !item.stackParentId && !item.stackKey && item.faceDown === false)).toBe(true);
    expect(() => act(items, 'draw', { count: 1, stackKey: 'pile-top' }, { isPlayerView: true })).toThrow('ya no está');
});

test('a multi-card draw preserves every card exactly once and spaces them on the table', () => {
    const result = act(pile(), 'draw', { count: 3 });
    expect(result.drawnIds).toEqual(['top', 'middle', 'bottom']);
    expect(result.remainingCount).toBe(0);
    expect(new Set(result.items.map(item => `${item.x},${item.y}`)).size).toBe(3);
});

test('putting another card on a private pile preserves its key, privacy and draw order', () => {
    const privatePile = act(pile(), 'shuffle', {}, { random: () => 0.99 });
    const items = stackCardOnTarget([...privatePile.items, card('ally')], 'ally', privatePile.selectedId);
    const ally = items.find(item => item.id === 'ally');
    expect(ally).toMatchObject({ stackKey: 'pile-top', hideStackContentsForPlayers: true, faceDown: true });
    const draw = act(items, 'draw', { count: 1, stackKey: 'pile-top' }, { isPlayerView: true });
    expect(draw.drawnIds).toEqual(['ally']);
    expect(draw.remainingCount).toBe(3);
});

test.each(['copies', 'shuffle', 'privacy', 'reorder'])('players cannot run preparation action %s', action => {
    expect(() => act(pile(), action, { count: 30 }, { isPlayerView: true })).toThrow('máster');
});
test.each([0, -1, 1.2, NaN, Infinity, 501])('rejects invalid copy count %s', count => {
    expect(() => act(pile(), 'copies', { count })).toThrow();
});
test('overdraw does not partially consume the pile', () => {
    const items = pile();
    expect(() => act(items, 'draw', { count: 4 })).toThrow('Solo quedan 3');
    expect(items[2].stackIds).toEqual(['bottom', 'middle']);
});
test('master can reopen contents without changing the existing card illustrations', () => {
    const hidden = act(pile(), 'privacy');
    const visible = act(hidden.items, 'privacy');
    expect(visible.items.some(item => isCardInPrivateStack(item, visible.items))).toBe(false);
    expect(visible.items.map(item => item.frontImage)).toEqual(pile().map(item => item.frontImage));
});

test('copying a drawn card creates a separate pile and leaves the original pile intact', () => {
    const prepared = act(pile(), 'privacy');
    const drawn = act(prepared.items, 'draw', { count: 1, stackKey: 'pile-top' });
    const originalPile = drawn.items.filter(item => item.id !== 'top');
    const copied = act(drawn.items, 'copies', { count: 1, newIds: ['new-copy'], newStackKey: 'another-pile' });
    expect(copied.items.find(item => item.id === 'new-copy').frontImage).toBe('/top.png');
    expect(copied.items.find(item => item.id === 'top').stackKey).toBe('another-pile');
    originalPile.forEach(item => expect(copied.items.find(candidate => candidate.id === item.id)).toEqual(item));
});

test('a stale unprepared pile cannot draw the same loose card twice', () => {
    const drawn = act(pile(), 'draw', { count: 1 });
    expect(() => act(drawn.items, 'draw', { count: 1 })).toThrow('agotado');
});

test('reordering promotes a child to the top and changes actual draw order without losing cards', () => {
    const result = act(pile(), 'reorder', { movedCardId: 'bottom', beforeCardId: 'top' });
    expect(result.selectedId).toBe('bottom');
    expect(result.items.find(item => item.id === 'bottom')).toMatchObject({ stackIds: ['middle', 'top'], x: 100, y: 200, stackKey: 'pile-top' });
    const draw = act(result.items, 'draw', { stackKey: 'pile-top', count: 3 });
    expect(draw.drawnIds).toEqual(['bottom', 'top', 'middle']);
    expect(new Set(draw.items.map(item => item.id)).size).toBe(3);
});

test('reordering the top to the bottom preserves privacy, position and images', () => {
    const hidden = act(pile(), 'privacy');
    const result = act(hidden.items, 'reorder', { stackKey: 'pile-top', movedCardId: 'top', beforeCardId: null });
    expect(result.selectedId).toBe('middle');
    expect(result.items.find(item => item.id === 'middle')).toMatchObject({ stackIds: ['top', 'bottom'], hideStackContentsForPlayers: true });
    expect(result.items.every(item => item.faceDown && item.x === 100 && item.y === 200)).toBe(true);
    expect(result.items.map(item => item.frontImage)).toEqual(pile().map(item => item.frontImage));
});

test('a concurrent draw invalidates a reorder whose target has left the pile', () => {
    const drawn = act(pile(), 'draw', { count: 1 });
    expect(() => act(drawn.items, 'reorder', { stackKey: 'pile-top', movedCardId: 'bottom', beforeCardId: 'top' })).toThrow('ha cambiado');
});

test('extracting a chosen card keeps its face and promotes the remaining pile when necessary', () => {
    const result = act(pile().map(item => ({ ...item, faceDown: true })), 'extract', { movedCardId: 'top' });
    expect(result.drawnIds).toEqual(['top']);
    expect(result.selectedId).toBe('middle');
    expect(result.items.find(item => item.id === 'top')).toMatchObject({ faceDown: true, stackParentId: null, stackKey: null });
    expect(result.items.find(item => item.id === 'middle').stackIds).toEqual(['bottom']);
});

test('players can select from a public pile but cannot extract a known private card', () => {
    expect(act(pile(), 'extract', { movedCardId: 'bottom' }, { isPlayerView: true }).drawnIds).toEqual(['bottom']);
    const hidden = act(pile(), 'privacy');
    expect(() => act(hidden.items, 'extract', { movedCardId: 'bottom' }, { isPlayerView: true })).toThrow('máster');
});

test('a batch draw stores a shared presentation in top-first order; restacking cancels it', () => {
    const result = act(pile(), 'draw', { count: 3, presentationId: 'presentation' }, { now: 12345 });
    result.drawnIds.forEach((id, index) => expect(result.items.find(item => item.id === id).boardDraw).toMatchObject({ id: 'presentation', index, count: 3, at: 12345, x: 100, y: 200 }));
    const stacked = stackCardOnTarget(result.items, 'top', 'middle');
    expect(stacked.find(item => item.id === 'top').boardDraw).toBeNull();
    expect(stacked.find(item => item.id === 'middle').boardDraw).toBeNull();
});
