import {
  MASTER_HAND_SEAT_ID,
  detachCardFromContainer,
  getCardContainerItems,
  getCardHandSeatId,
  getCardStackIds,
  getVisibleHandCards,
  isCardHiddenByContainerForPlayer,
  isDiscardContainer,
  moveBoardCardPileToHand,
  moveCardIntoContainer,
  preservePendingHandTransferState,
  reorderCardIds,
  reorderCardItems,
  reorderHandCards,
  sanitizeCardStacks,
  snapCardRotationAngle,
  spreadCardStack,
  stackCardOnTarget,
  takeCardFromStack,
  takeTopCardFromStack,
} from '../cardBoard';

const card = (id, overrides = {}) => ({
  id,
  type: 'card',
  zone: 'board',
  x: 100,
  y: 200,
  width: 100,
  height: 140,
  rotation: 0,
  ...overrides,
});

describe('card board domain', () => {
  test('normalizes stack ids and repairs invalid stack relationships', () => {
    const items = [
      card('parent-a', { zone: 'hand', stackIds: ['child', 'missing', 'child'] }),
      card('parent-b', { stackIds: ['child'] }),
      card('child'),
      card('orphan', { stackParentId: 'missing-parent' }),
      { id: 'token', type: 'token' },
    ];

    const result = sanitizeCardStacks(items);

    expect(getCardStackIds(result[0])).toEqual(['child']);
    expect(getCardStackIds(result[1])).toEqual([]);
    expect(result[2]).toMatchObject({ zone: 'hand', stackParentId: 'parent-a', stackIds: [] });
    expect(result[3].stackParentId).toBeNull();
    expect(result[4]).toBe(items[4]);
  });

  test('moves a complete pile into a container without breaking its hierarchy', () => {
    const items = [
      card('source', { stackIds: ['child'] }),
      card('child', { stackParentId: 'source' }),
      card('old-parent', { stackIds: ['source'] }),
      { id: 'board', type: 'cardContainer', zone: 'board' },
    ];

    const result = moveCardIntoContainer(items, 'source', 'board', 1000);
    const source = result.find(item => item.id === 'source');
    const child = result.find(item => item.id === 'child');
    const oldParent = result.find(item => item.id === 'old-parent');

    expect(source).toMatchObject({ containerId: 'board', containerOrder: 1001, stackParentId: null });
    expect(child).toMatchObject({ containerId: 'board', containerOrder: 1002, stackParentId: 'source' });
    expect(oldParent.stackIds).toEqual([]);
  });

  test('detaches the parent and children of a pile from their container', () => {
    const items = [
      card('source', { containerId: 'board', containerOrder: 1, stackIds: ['child'] }),
      card('child', { containerId: 'board', containerOrder: 2, stackParentId: 'source' }),
      card('other', { containerId: 'board', containerOrder: 3 }),
    ];

    const result = detachCardFromContainer(items, 'source');

    expect(result[0]).toMatchObject({ containerId: null, containerOrder: null });
    expect(result[1]).toMatchObject({ containerId: null, containerOrder: null });
    expect(result[2]).toBe(items[2]);
  });

  test('combines two piles with the dragged source card on top', () => {
    const items = [
      card('source', { x: 300, y: 400, rotation: 15, stackIds: ['source-child'] }),
      card('source-child', { stackParentId: 'source' }),
      card('target', { containerId: 'board', stackIds: ['target-child'] }),
      card('target-child', { containerId: 'board', stackParentId: 'target' }),
      { id: 'board', type: 'cardContainer' },
    ];

    const result = stackCardOnTarget(items, 'source', 'target');
    const source = result.find(item => item.id === 'source');

    expect(source.stackIds).toEqual(['target-child', 'target', 'source-child']);
    expect(source.containerId).toBe('board');
    source.stackIds.forEach(id => {
      expect(result.find(item => item.id === id)).toMatchObject({
        containerId: 'board',
        stackParentId: 'source',
        x: 300,
        y: 400,
        rotation: 15,
      });
    });
  });

  test('takes the top card from a pile and returns persistence metadata', () => {
    const items = [
      card('parent', { containerId: 'board', containerOrder: 7, stackIds: ['first', 'top'] }),
      card('first', { stackParentId: 'parent' }),
      card('top', { stackParentId: 'parent' }),
    ];

    const result = takeTopCardFromStack(items, 'parent');
    const released = result.items.find(item => item.id === 'top');

    expect(result.releasedCardId).toBe('top');
    expect(result.changedIds).toEqual(['parent', 'top']);
    expect(getCardStackIds(result.items[0])).toEqual(['first']);
    expect(released).toMatchObject({
      containerId: 'board',
      containerOrder: 7,
      stackParentId: null,
      x: 124,
      y: 218,
    });
  });

  test('spreads every child card while preserving its container', () => {
    const items = [
      card('parent', { containerId: 'board', containerOrder: 7, stackIds: ['first', 'second'] }),
      card('first', { stackParentId: 'parent' }),
      card('second', { stackParentId: 'parent' }),
    ];

    const result = spreadCardStack(items, 'parent');

    expect(result.releasedCardIds).toEqual(['first', 'second']);
    expect(getCardStackIds(result.items[0])).toEqual([]);
    expect(result.items[1]).toMatchObject({ stackParentId: null, containerId: 'board', x: 126, y: 214 });
    expect(result.items[2]).toMatchObject({ stackParentId: null, containerId: 'board', x: 152, y: 228 });
  });

  test('takes a specific card from the pile', () => {
    const items = [
      card('parent', { stackIds: ['first', 'second'] }),
      card('first', { stackParentId: 'parent' }),
      card('second', { stackParentId: 'parent' }),
    ];

    const result = takeCardFromStack(items, 'parent', 'first');

    expect(result.releasedCardId).toBe('first');
    expect(getCardStackIds(result.items[0])).toEqual(['second']);
    expect(result.items[1]).toMatchObject({ stackParentId: null, x: 70, y: 218 });
  });

  test('orders hand and container cards without exposing unrelated cards', () => {
    const items = [
      card('late', { zone: 'hand', handOrder: 20 }),
      card('board-card', { containerId: 'board', containerOrder: 30 }),
      card('early', { zone: 'hand', handOrder: 10 }),
      card('container-first', { containerId: 'board', containerOrder: 5 }),
    ];

    expect(getVisibleHandCards(items).map(item => item.id)).toEqual(['early', 'late']);
    expect(getCardContainerItems('board', items).map(item => item.id)).toEqual(['container-first', 'board-card']);
  });

  test('previews insertion at the beginning, middle and end without mutating cards', () => {
    const cards = [card('a'), card('b'), card('c'), card('d')];

    expect(reorderCardIds(cards.map(item => item.id), 'c', 0)).toEqual(['c', 'a', 'b', 'd']);
    expect(reorderCardIds(cards.map(item => item.id), 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(reorderCardItems(cards, 'b', 3).map(item => item.id)).toEqual(['a', 'c', 'd', 'b']);
    expect(cards.map(item => item.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  test('persists order only for cards belonging to the active hand', () => {
    const items = [
      card('a', { zone: 'hand', handOrder: 100, handSeatId: 'player' }),
      card('b', { zone: 'hand', handOrder: 200, handSeatId: 'player' }),
      card('c', { zone: 'hand', handOrder: 300, handSeatId: 'player' }),
      card('other-hand', { zone: 'hand', handOrder: 150, handSeatId: 'other' }),
      card('board-card', { zone: 'board', handOrder: 175 }),
    ];

    const result = reorderHandCards(items, ['a', 'b', 'c'], 'c', 0);

    expect(result.moved).toBe(true);
    expect(result.orderedCardIds).toEqual(['c', 'a', 'b']);
    expect(result.changedIds).toEqual(['a', 'b', 'c']);
    expect(result.items.slice(0, 3).map(item => item.handOrder)).toEqual([2, 3, 1]);
    expect(result.items[3]).toBe(items[3]);
    expect(result.items[4]).toBe(items[4]);
  });

  test('does not write when the card remains in the same hand position', () => {
    const items = [
      card('a', { zone: 'hand', handOrder: 1 }),
      card('b', { zone: 'hand', handOrder: 2 }),
      card('c', { zone: 'hand', handOrder: 3 }),
    ];

    const result = reorderHandCards(items, ['a', 'b', 'c'], 'b', 1);

    expect(result).toMatchObject({ moved: false, changedIds: [], orderedCardIds: ['a', 'b', 'c'] });
    expect(result.items).toBe(items);
  });

  test('moves a board pile into the hand in one optimistic update', () => {
    const items = [
      card('source', { stackIds: ['child'], containerId: 'board', containerOrder: 4 }),
      card('child', { stackParentId: 'source', containerId: 'board', containerOrder: 5 }),
      card('old-parent', { stackIds: ['source'] }),
      { id: 'token', type: 'token' },
    ];

    const result = moveBoardCardPileToHand(items, 'source', {
      ownerId: 'token-1',
      ownerName: 'Alice',
      handSeatId: 'alice-seat',
      handSeatName: 'Alice',
    }, 1000);

    expect(result.moved).toBe(true);
    expect(result.changedIds).toEqual(['source', 'child', 'old-parent']);
    expect(result.items[0]).toMatchObject({
      zone: 'hand',
      x: 0,
      y: 0,
      containerId: null,
      stackParentId: null,
      stackIds: [],
      handTokenId: 'token-1',
      handSeatId: 'alice-seat',
      handOrder: 1000,
    });
    expect(result.items[1]).toMatchObject({ zone: 'hand', stackParentId: null, handOrder: 1001 });
    expect(result.items[2].stackIds).toEqual([]);
    expect(result.items[3]).toBe(items[3]);
  });

  test('keeps a pending hand transfer out of a delayed board snapshot', () => {
    const remoteBoardCard = card('source', {
      zone: 'board',
      x: 450,
      y: 320,
      faceDown: true,
    });
    const localHandCard = card('source', {
      zone: 'hand',
      x: 0,
      y: 0,
      containerId: null,
      handSeatId: 'alice-seat',
      handOrder: 4,
      faceDown: false,
    });

    const protectedCard = preservePendingHandTransferState(
      remoteBoardCard,
      localHandCard,
      5000,
      2500
    );

    expect(protectedCard).toBe(localHandCard);
    expect(protectedCard).toMatchObject({
      zone: 'hand',
      x: 0,
      y: 0,
      containerId: null,
      handSeatId: 'alice-seat',
      handOrder: 4,
      faceDown: false,
    });
  });

  test('accepts confirmed hand state and expired transfer locks', () => {
    const localHandCard = card('source', {
      zone: 'hand',
      handSeatId: 'alice-seat',
      handOrder: 4,
    });
    const confirmedHandCard = {
      ...localHandCard,
      handOrder: 8,
    };
    const delayedBoardCard = card('source', { x: 450, y: 320 });

    expect(preservePendingHandTransferState(
      confirmedHandCard,
      localHandCard,
      5000,
      2500
    )).toBe(confirmedHandCard);
    expect(preservePendingHandTransferState(
      delayedBoardCard,
      localHandCard,
      5000,
      5000
    )).toBe(delayedBoardCard);
  });

  test('resolves hand seats and hidden containers consistently', () => {
    const container = {
      id: 'secret-board',
      type: 'cardContainer',
      name: 'Cementerio',
      hideContainedCardsForPlayers: true,
    };
    const hiddenCard = card('hidden', { containerId: container.id });

    expect(getCardHandSeatId({ ownerName: 'Master' })).toBe(MASTER_HAND_SEAT_ID);
    expect(getCardHandSeatId({ handSeatId: ' Jugador 1 ' })).toBe('Jugador 1');
    expect(isCardHiddenByContainerForPlayer(hiddenCard, [container, hiddenCard], true)).toBe(true);
    expect(isCardHiddenByContainerForPlayer(hiddenCard, [container, hiddenCard], false)).toBe(false);
    expect(isDiscardContainer(container)).toBe(true);
  });

  test('snaps card rotations only when they are close to right angles', () => {
    expect(snapCardRotationAngle(88)).toBe(90);
    expect(snapCardRotationAngle(-2)).toBe(0);
    expect(snapCardRotationAngle(47)).toBe(47);
    expect(snapCardRotationAngle(Number.NaN)).toBeNaN();
  });
});
