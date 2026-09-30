import { persistCanvasRogueliteRuns } from '../rogueliteRunPersistence';
import { runTransaction } from 'firebase/firestore';

jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: (_db, ...parts) => ({ path: parts.join('/') }), getDoc: jest.fn(), runTransaction: jest.fn(),
}));

test('a delayed pickup run save reads the healed scene instead of restoring its captured health', async () => {
  const captured = { id: 'hero', layer: 'TOKEN', profileType: 'rogueliteClass', linkedClassOwner: 'Ada',
    linkedClassId: 'barbarian', runId: 'run-1', runRevision: 2,
    stats: { vida: { current: 3, max: 8 } }, inventory: [{ instanceId: 'old-potion', itemType: 'object' }] };
  const current = { ...captured, runRevision: 4, canvasRuntimeRevision: 3,
    stats: { vida: { current: 8, max: 8 } }, inventory: [] };
  const scene = { lastModified: 100, items: [current] };
  const writes = new Map();
  runTransaction.mockImplementation(async (_db, callback) => callback({
    get: async ref => ({ exists: () => true, data: () => ref.path.startsWith('canvas_scenarios/')
      ? scene : { activeRun: { id: 'run-1', revision: 4, currentScenarioId: 'room' } } }),
    set: (ref, value) => writes.set(ref.path, value),
    update: (ref, value) => writes.set(ref.path, value),
  }));
  const results = await persistCanvasRogueliteRuns({ scenarioId: 'room', finalItems: [captured], originalItems: [], explicitModifiedIds: ['hero'] });
  expect(results[0].persisted).toBe(true);
  const profile = writes.get('players/Ada/rogueliteClasses/barbarian').activeRun;
  expect(profile.stats.vida.current).toBe(8);
  expect(profile.inventory.objects).toEqual([]);
  expect(profile.sourceCanvasRuntimeRevision).toBe(3);
  expect(writes.get('canvas_scenarios/room').items[0]).toMatchObject({
    runRevision: profile.revision, stats: { vida: { current: 8 } }, inventory: [],
  });
});
