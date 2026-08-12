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
