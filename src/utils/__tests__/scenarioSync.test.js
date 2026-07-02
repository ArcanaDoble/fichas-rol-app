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

test('inspector drafts are detected against the last remote baseline', () => {
  const remoteBaselineItems = [
    { id: 'token-1', x: 10, y: 20, controlledBy: ['Alice'], hidden: false },
  ];
  const localDraftItems = [
    { id: 'token-1', x: 10, y: 20, controlledBy: ['Bob'], hidden: true },
  ];

  const comparingAgainstLocalState = buildScenarioItemChanges(
    localDraftItems,
    localDraftItems,
    ['token-1']
  );
  const comparingAgainstRemoteBaseline = buildScenarioItemChanges(
    localDraftItems,
    remoteBaselineItems,
    ['token-1']
  );

  expect(getChangedItemFields(
    localDraftItems[0],
    comparingAgainstLocalState.originalMap.get('token-1')
  )).toEqual({});
  expect(getChangedItemFields(
    localDraftItems[0],
    comparingAgainstRemoteBaseline.originalMap.get('token-1')
  )).toEqual({
    controlledBy: ['Bob'],
    hidden: true,
  });
});

test('inspector save merge preserves concurrent remote items', () => {
  const remoteBaselineItems = [
    { id: 'token-1', x: 10, y: 20, controlledBy: ['Alice'] },
  ];
  const localDraftItems = [
    { id: 'token-1', x: 10, y: 20, controlledBy: ['Bob'] },
  ];
  const latestRemoteItems = [
    { id: 'token-1', x: 10, y: 20, controlledBy: ['Alice'] },
    { id: 'token-2', x: 80, y: 90, controlledBy: ['Clara'] },
  ];

  const { modifiedOrAdded, deletedIds } = buildScenarioItemChanges(
    localDraftItems,
    remoteBaselineItems,
    ['token-1']
  );
  const merged = mergeScenarioItemsForPersist(
    latestRemoteItems,
    modifiedOrAdded,
    deletedIds,
    remoteBaselineItems
  );

  expect(merged).toEqual([
    { id: 'token-1', x: 10, y: 20, controlledBy: ['Bob'] },
    { id: 'token-2', x: 80, y: 90, controlledBy: ['Clara'] },
  ]);
});
