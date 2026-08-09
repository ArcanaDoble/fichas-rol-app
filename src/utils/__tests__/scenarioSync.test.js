import {
  buildScenarioItemChanges,
  createSerialPersistQueue,
  getChangedItemFields,
  mergeScenarioItemsForPersist,
  normalizeRecentLocalWrite,
  shouldTreatRemotePositionAsConflict,
} from '../scenarioSync';

test('serial persist queue keeps every rapid request in order', async () => {
  const enqueuePersist = createSerialPersistQueue();
  const started = [];
  let releaseFirst;
  const firstGate = new Promise(resolve => {
    releaseFirst = resolve;
  });

  const first = enqueuePersist(async () => {
    started.push('first');
    await firstGate;
  });
  const second = enqueuePersist(async () => {
    started.push('second');
  });
  const third = enqueuePersist(async () => {
    started.push('third');
  });

  await Promise.resolve();
  await Promise.resolve();
  expect(started).toEqual(['first']);

  releaseFirst();
  await Promise.all([first, second, third]);

  expect(started).toEqual(['first', 'second', 'third']);
});

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

test('mergeScenarioItemsForPersist preserves concurrent structural card fields', () => {
  const originalItems = [
    {
      id: 'card-1',
      type: 'card',
      x: 10,
      y: 10,
      zone: 'board',
      containerId: null,
      containerOrder: null,
    },
  ];
  const staleMoveWrite = [
    {
      id: 'card-1',
      type: 'card',
      x: 80,
      y: 90,
      zone: 'board',
      containerId: null,
      containerOrder: null,
    },
  ];
  const latestRemoteItems = [
    {
      id: 'card-1',
      type: 'card',
      x: 22,
      y: 24,
      zone: 'board',
      containerId: 'board-1',
      containerOrder: 100,
    },
  ];

  const { modifiedOrAdded, deletedIds } = buildScenarioItemChanges(staleMoveWrite, originalItems);
  const merged = mergeScenarioItemsForPersist(
    latestRemoteItems,
    modifiedOrAdded,
    deletedIds,
    originalItems
  );

  expect(merged).toEqual([
    {
      id: 'card-1',
      type: 'card',
      x: 80,
      y: 90,
      zone: 'board',
      containerId: 'board-1',
      containerOrder: 100,
    },
  ]);
});

test('mergeScenarioItemsForPersist preserves concurrent card movement during structural updates', () => {
  const originalItems = [
    {
      id: 'card-1',
      type: 'card',
      x: 80,
      y: 90,
      zone: 'board',
      containerId: null,
      containerOrder: null,
    },
  ];
  const containerDropWrite = [
    {
      id: 'card-1',
      type: 'card',
      x: 80,
      y: 90,
      zone: 'board',
      containerId: 'board-1',
      containerOrder: 100,
    },
  ];
  const latestRemoteItems = [
    {
      id: 'card-1',
      type: 'card',
      x: 120,
      y: 135,
      zone: 'board',
      containerId: null,
      containerOrder: null,
    },
  ];

  const { modifiedOrAdded, deletedIds } = buildScenarioItemChanges(containerDropWrite, originalItems);
  const merged = mergeScenarioItemsForPersist(
    latestRemoteItems,
    modifiedOrAdded,
    deletedIds,
    originalItems
  );

  expect(merged).toEqual([
    {
      id: 'card-1',
      type: 'card',
      x: 120,
      y: 135,
      zone: 'board',
      containerId: 'board-1',
      containerOrder: 100,
    },
  ]);
});

test('mergeScenarioItemsForPersist persists card drop position from the drag-start baseline', () => {
  const dragStartItems = [
    {
      id: 'card-1',
      type: 'card',
      x: 10,
      y: 10,
      zone: 'board',
      containerId: null,
      containerOrder: null,
    },
  ];
  const containerDropWrite = [
    {
      id: 'card-1',
      type: 'card',
      x: 80,
      y: 90,
      zone: 'board',
      containerId: 'board-1',
      containerOrder: 100,
    },
  ];
  const latestRemoteItems = [
    {
      id: 'card-1',
      type: 'card',
      x: 10,
      y: 10,
      zone: 'board',
      containerId: null,
      containerOrder: null,
    },
  ];

  const { modifiedOrAdded, deletedIds } = buildScenarioItemChanges(
    containerDropWrite,
    dragStartItems,
    ['card-1']
  );
  const merged = mergeScenarioItemsForPersist(
    latestRemoteItems,
    modifiedOrAdded,
    deletedIds,
    dragStartItems
  );

  expect(merged).toEqual([
    {
      id: 'card-1',
      type: 'card',
      x: 80,
      y: 90,
      zone: 'board',
      containerId: 'board-1',
      containerOrder: 100,
    },
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
