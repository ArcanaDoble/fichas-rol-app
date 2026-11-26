import {
  buildScenarioItemChanges,
  createSerialPersistQueue,
  getChangedItemFields,
  mergeScenarioItemsForPersist,
  normalizeRecentLocalWrite,
  shouldTreatRemotePositionAsConflict,
  reconcileScenarioItemSnapshot,
  isStaleScenarioSnapshot,
} from '../scenarioSync';
import { hasArcaneBarrier, reconcileArcaneBarrierUpdate } from '../arcaneBarrierStatus';

test('saving a removed Barrera advances the runtime and clears stale state locks on both clients', () => {
  const before = { id: 'hero', profileType: 'rogueliteClass', canvasRuntimeRevision: 4,
    x: 10, status: ['oculto', 'barrera'], stats: { cd: { current: 4, max: 4 }, vida: { current: 7, max: 8 } },
    arcaneBarrier: { id: 'cast', spellId: 'runic-barrier', expires: 'combat-end', negatedTraits: ['critico'] } };
  const edits = reconcileArcaneBarrierUpdate(before, { status: ['oculto'] }, 100);
  const edited = { ...before, ...edits };
  const concurrent = { ...before, x: 95, stats: { ...before.stats, vida: { current: 6, max: 8 } } };
  const [saved] = mergeScenarioItemsForPersist([concurrent], [edited], [], [before]);
  expect(saved.canvasRuntimeRevision).toBe(5);
  expect(saved.status).toEqual(['oculto']);
  expect(saved.arcaneBarrier).toBeNull();
  expect(saved.stats.cd).toEqual(before.stats.cd);
  expect(saved.stats.vida.current).toBe(6);
  expect(saved.x).toBe(95);
  const locks = {
    draft: { status: before.status, arcaneBarrier: before.arcaneBarrier, rotation: 45 },
    recentWrite: { time: 100, baseRuntimeRevision: 4,
      fields: { status: before.status, arcaneBarrier: before.arcaneBarrier, name: 'Guerrero' } },
    now: 101,
  };
  for (const local of [before, saved]) {
    const result = reconcileScenarioItemSnapshot(saved, local, locks);
    expect(result.item.status).toEqual(['oculto']);
    expect(result.item.arcaneBarrier).toBeNull();
    expect(hasArcaneBarrier(result.item)).toBe(false);
    expect(result.item.stats.cd).toEqual(before.stats.cd);
    expect(result.item.rotation).toBe(45);
    expect(result.item.name).toBe('Guerrero');
    expect(result.draft).toEqual({ rotation: 45 });
    expect(result.recentWrite.fields).toEqual({ name: 'Guerrero' });
  }
});

test('an unrelated inspector save captured before removal cannot restore the old Barrera', () => {
  const before = { id: 'hero', profileType: 'rogueliteClass', canvasRuntimeRevision: 4,
    name: 'Guerrero', status: ['barrera'], stats: { cd: { current: 4, max: 4 } },
    arcaneBarrier: { id: 'cast', spellId: 'runic-barrier', expires: 'combat-end', negatedTraits: [] } };
  const unrelatedDraft = { ...before, name: 'Guerrero de Ada' };
  const removed = { ...before, ...reconcileArcaneBarrierUpdate(before, { status: [] }, 100), canvasRuntimeRevision: 5 };
  const [saved] = mergeScenarioItemsForPersist([removed], [unrelatedDraft], [], [before]);
  expect(saved.name).toBe('Guerrero de Ada');
  expect(saved.status).toEqual([]);
  expect(saved.arcaneBarrier).toBeNull();
  expect(hasArcaneBarrier(saved)).toBe(false);
  expect(saved.canvasRuntimeRevision).toBe(5);
  expect(saved.stats.cd).toEqual(before.stats.cd);
});

test('a committed potion supersedes stale health/inventory locks on both clients', () => {
  const before = { id: 'hero', stats: { vida: { current: 3, max: 8 } }, inventory: ['potion'] };
  const healed = { ...before, canvasRuntimeRevision: 1, stats: { vida: { current: 7, max: 8 } }, inventory: [] };
  const locks = { draft: { stats: before.stats }, recentWrite: { time: 100, fields: { inventory: before.inventory, stats: before.stats, x: 42 } }, now: 101 };
  for (const local of [before, healed]) {
    const result = reconcileScenarioItemSnapshot(healed, local, locks);
    expect(result.item.stats.vida.current).toBe(7);
    expect(result.item.inventory).toEqual([]);
    expect(result.item.x).toBe(42);
    expect(result.draft).toBeNull();
    expect(result.recentWrite.fields).toEqual({ x: 42 });
  }
});

test('a delayed snapshot cannot undo the second potion', () => {
  expect(isStaleScenarioSnapshot({ lastModified: 103 }, { lastModified: 102 })).toBe(true);
  expect(isStaleScenarioSnapshot({ lastModified: 103 }, { lastModified: 103 })).toBe(false);
});

test('editing another stat after a potion preserves the newly healed health', () => {
  const original = { id: 'hero', stats: { vida: { current: 3, max: 8 }, iniciativa: { current: 2 } } };
  const edited = { ...original, stats: { ...original.stats, iniciativa: { current: 4 } } };
  const remote = { ...original, stats: { ...original.stats, vida: { current: 7, max: 8 } } };
  expect(mergeScenarioItemsForPersist([remote], [edited], [], [original])[0].stats).toEqual({
    vida: { current: 7, max: 8 }, iniciativa: { current: 4 },
  });
});

test('a pickup queued before a potion commit cannot resurrect the consumed copy', () => {
  const oldPotion = { instanceId: 'old', name: 'Poción' };
  const newPotion = { instanceId: 'new', name: 'Poción' };
  const otherPickup = { instanceId: 'other', name: 'Bomba' };
  const original = { id: 'hero', inventory: [oldPotion], equippedItems: [oldPotion] };
  const edited = { ...original, inventory: [oldPotion, newPotion], equippedItems: [oldPotion, newPotion] };
  const remote = { ...original, inventory: [otherPickup], equippedItems: [otherPickup] };
  const [saved] = mergeScenarioItemsForPersist([remote], [edited], [], [original]);
  expect(saved.inventory).toEqual([otherPickup, newPotion]);
  expect(saved.equippedItems).toEqual([otherPickup, newPotion]);
});

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
