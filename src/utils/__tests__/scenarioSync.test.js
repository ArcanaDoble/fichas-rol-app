import {
  buildScenarioItemChanges,
  getChangedItemFields,
  mergeScenarioItemsForPersist,
  normalizeRecentLocalWrite,
  shouldTreatRemotePositionAsConflict,
} from '../scenarioSync';

test('mergeScenarioItemsForPersist only replaces locally modified items', () => {
  const originalItems = [
    { id: 'board', x: 0, y: 0 },
    { id: 'player-card', x: 10, y: 10 },
  ];
  const finalItems = [
    { id: 'board', x: 50, y: 0 },
    { id: 'player-card', x: 10, y: 10 },
  ];
  const latestRemoteItems = [
    { id: 'board', x: 0, y: 0 },
    { id: 'player-card', x: 120, y: 10 },
  ];

  const { modifiedOrAdded, deletedIds } = buildScenarioItemChanges(finalItems, originalItems);
  const merged = mergeScenarioItemsForPersist(
    latestRemoteItems,
    modifiedOrAdded,
    deletedIds,
    originalItems
  );

  expect(merged).toEqual([
    { id: 'board', x: 50, y: 0 },
    { id: 'player-card', x: 120, y: 10 },
  ]);
});

test('shouldTreatRemotePositionAsConflict ignores snapshots that did not modify the dragged item', () => {
  const conflict = shouldTreatRemotePositionAsConflict({
    itemId: 'player-card',
    remoteItem: { id: 'player-card', x: 0, y: 0 },
    originalItem: { id: 'player-card', x: 120, y: 0 },
    localItem: { id: 'player-card', x: 140, y: 0 },
    remoteModifiedItemIds: new Set(['board', 'board-card-1']),
    remoteWriterId: 'master:user-dm',
    localWriterId: 'player:Alice',
  });

  expect(conflict).toBe(false);
});

test('shouldTreatRemotePositionAsConflict detects an intentional remote move of the dragged item', () => {
  const conflict = shouldTreatRemotePositionAsConflict({
    itemId: 'player-card',
    remoteItem: { id: 'player-card', x: 180, y: 0 },
    originalItem: { id: 'player-card', x: 120, y: 0 },
    localItem: { id: 'player-card', x: 140, y: 0 },
    remoteModifiedItemIds: new Set(['player-card']),
    remoteWriterId: 'master:user-dm',
    localWriterId: 'player:Alice',
  });

  expect(conflict).toBe(true);
});

test('legacy recent local writes are normalized to fields', () => {
  expect(normalizeRecentLocalWrite({ x: 1, y: 2, time: 100 })).toEqual({
    time: 100,
    fields: { x: 1, y: 2 },
  });
});

test('getChangedItemFields returns only changed fields', () => {
  expect(getChangedItemFields(
    { id: 'card', x: 10, y: 12, faceDown: true },
    { id: 'card', x: 10, y: 8, faceDown: true }
  )).toEqual({ y: 12 });
});
