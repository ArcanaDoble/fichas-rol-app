import { createCanvasScenarioController } from '../createTacticalScenarioController';

jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('../../../utils/storage', () => ({
  getOrUploadFile: jest.fn(),
  releaseFile: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn((...args) => ({ path: args.filter((value) => typeof value === 'string').join('/') })),
  runTransaction: jest.fn(),
  updateDoc: jest.fn(),
}));

test('Confirmar cambios saves the encounter and the pending Roguelite class runtime together', async () => {
  const firestore = require('firebase/firestore');
  firestore.doc.mockImplementation((...args) => ({
    path: args.filter((value) => typeof value === 'string').join('/'),
  }));
  const persistedScenario = jest.fn();
  firestore.runTransaction.mockImplementation(async (_db, callback) => callback({
    get: jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        items: [{
          id: 'token-1',
          layer: 'TOKEN',
          profileType: 'rogueliteClass',
          linkedClassId: 'barbarian',
          linkedClassOwner: 'Ada',
          runId: 'run-1',
          runtimeDirty: false,
          stats: { vida: { current: 8, max: 8 } },
        }],
      }),
    }),
    update: persistedScenario,
  }));

  const dirtyToken = {
    id: 'token-1',
    layer: 'TOKEN',
    profileType: 'rogueliteClass',
    linkedClassId: 'barbarian',
    linkedClassOwner: 'Ada',
    runId: 'run-1',
    runtimeDirty: true,
    stats: { vida: { current: 4, max: 8 } },
  };
  const baselineToken = {
    ...dirtyToken,
    runtimeDirty: false,
    stats: { vida: { current: 8, max: 8 } },
  };
  const persistRuntimeItems = jest.fn().mockResolvedValue([]);
  const triggerToast = jest.fn();
  const activeScenarioRef = { id: 'room-1', name: 'Sala', items: [dirtyToken] };

  const controller = createCanvasScenarioController({
    activeScenario: activeScenarioRef,
    availableCharacters: [],
    characterData: null,
    currentUserId: 'Ada',
    getLocalSyncActorId: () => 'Ada',
    gridConfig: {},
    isPlayerView: true,
    itemToDelete: null,
    lastRemoteScenarioItemsRef: { current: [baselineToken] },
    localUnsavedConfigEditsRef: { current: {} },
    localUnsavedEditsRef: { current: { 'token-1': { stats: dirtyToken.stats, runtimeDirty: true } } },
    localUnsavedScenarioEditsRef: { current: {} },
    offset: { x: 0, y: 0 },
    pendingBoardHandTransferLocksRef: { current: new Set() },
    pendingImageFile: null,
    persistQueueRef: { current: (task) => task() },
    persistRuntimeItems,
    playerName: 'Ada',
    recentLocalWritesRef: { current: {} },
    registerLocalConfigDraft: jest.fn(),
    scenarioCollectionName: 'canvas_scenarios',
    setActiveScenario: jest.fn((updater) => updater(activeScenarioRef)),
    setGridConfig: jest.fn(),
    setIsSaving: jest.fn(),
    setItemToDelete: jest.fn(),
    setOffset: jest.fn(),
    setPendingImageFile: jest.fn(),
    setShowToast: jest.fn(),
    setToastType: jest.fn(),
    setUploadingCard: jest.fn(),
    setUploadingToken: jest.fn(),
    setViewMode: jest.fn(),
    setZoom: jest.fn(),
    triggerToast,
    zoom: 1,
  });

  await controller.saveCurrentScenario();

  expect(persistRuntimeItems).toHaveBeenCalledWith(expect.objectContaining({
    scenarioId: 'room-1',
    explicitModifiedIds: ['token-1'],
    finalItems: [expect.objectContaining({
      runtimeDirty: false,
      stats: { vida: { current: 4, max: 8 } },
    })],
  }));
  expect(persistedScenario).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'canvas_scenarios/room-1' }),
    expect.objectContaining({
      items: [expect.objectContaining({ runtimeDirty: false })],
    }),
  );
  expect(triggerToast).toHaveBeenCalledWith(
    'FICHA ACTUALIZADA',
    'Los cambios del inspector se han sincronizado con tu clase',
    'success',
  );
});

test('a rejected queued write keeps local edits pending instead of marking them as synchronized', async () => {
  const baselineToken = {
    id: 'token-1',
    stats: { vida: { current: 8, max: 8 } },
  };
  const changedToken = {
    ...baselineToken,
    stats: { vida: { current: 4, max: 8 } },
  };
  const localUnsavedEditsRef = {
    current: { 'token-1': { stats: changedToken.stats } },
  };
  const recentLocalWritesRef = { current: {} };
  const persistQueueRef = {
    current: jest.fn().mockResolvedValue(false),
  };
  const controller = createCanvasScenarioController({
    localUnsavedEditsRef,
    persistQueueRef,
    recentLocalWritesRef,
  });

  const didPersist = await controller.safePersistItems(
    'room-1',
    [changedToken],
    [baselineToken],
    ['token-1'],
  );

  expect(didPersist).toBe(false);
  expect(localUnsavedEditsRef.current).toEqual({
    'token-1': { stats: changedToken.stats },
  });
  expect(recentLocalWritesRef.current).toEqual({});
});

test('a confirmed queued write clears only the fields Firebase accepted', async () => {
  const baselineToken = {
    id: 'token-1',
    x: 10,
    y: 20,
  };
  const changedToken = {
    ...baselineToken,
    x: 30,
  };
  const localUnsavedEditsRef = {
    current: { 'token-1': { x: 30, y: 25 } },
  };
  const recentLocalWritesRef = { current: {} };
  const controller = createCanvasScenarioController({
    localUnsavedEditsRef,
    persistQueueRef: { current: jest.fn().mockResolvedValue(true) },
    recentLocalWritesRef,
  });

  const didPersist = await controller.safePersistItems(
    'room-1',
    [changedToken],
    [baselineToken],
    ['token-1'],
  );

  expect(didPersist).toBe(true);
  expect(localUnsavedEditsRef.current).toEqual({
    'token-1': { y: 25 },
  });
  expect(recentLocalWritesRef.current['token-1']).toEqual(expect.objectContaining({
    fields: { x: 30 },
  }));
});

test('confirms a new Canvas token even when the secondary run update is rejected', async () => {
  const firestore = require('firebase/firestore');
  const transactionUpdate = jest.fn();
  firestore.runTransaction.mockImplementation(async (_db, callback) => callback({
    get: jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ items: [] }),
    }),
    update: transactionUpdate,
  }));

  const newToken = {
    id: 'token-new',
    layer: 'TOKEN',
    profileType: 'rogueliteClass',
    linkedClassId: 'barbarian',
    linkedClassOwner: 'Ada',
    runId: 'run-1',
    portrait: undefined,
    inventory: [{ name: 'Antorcha', optionalNote: undefined }],
  };
  const persistRuntimeItems = jest.fn().mockResolvedValue([
    { persisted: false, reason: 'stale-scenario' },
  ]);
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const controller = createCanvasScenarioController({
    activeScenario: { id: 'room-1', items: [] },
    getLocalSyncActorId: () => 'Ada',
    isPlayerView: true,
    localUnsavedEditsRef: { current: {} },
    persistQueueRef: { current: (task) => task() },
    persistRuntimeItems,
    recentLocalWritesRef: { current: {} },
    scenarioCollectionName: 'canvas_scenarios',
    setActiveScenario: jest.fn(),
  });

  const didPersist = await controller.safePersistItems(
    'room-1',
    [newToken],
    [],
    ['token-new'],
    { persistRuntime: true },
  );

  expect(didPersist).toBe(true);
  expect(firestore.runTransaction).toHaveBeenCalledTimes(1);
  expect(transactionUpdate.mock.calls[0][1]).toEqual(
    expect.objectContaining({
      items: [expect.objectContaining({
        id: 'token-new',
        portrait: null,
        inventory: [expect.objectContaining({ optionalNote: null })],
      })],
    }),
  );
  expect(persistRuntimeItems).toHaveBeenCalledTimes(1);
  consoleError.mockRestore();
});
