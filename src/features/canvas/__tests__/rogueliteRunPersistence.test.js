import {
  mergeCanvasRogueliteRuntimeSheet,
  resolveChangedRogueliteRunTokens,
} from '../rogueliteRunPersistence';

const makeToken = (overrides = {}) => ({
  id: 'token-1',
  layer: 'TOKEN',
  profileType: 'rogueliteClass',
  linkedClassId: 'barbarian',
  linkedClassOwner: 'Ada',
  runId: 'run-1',
  stats: { vida: { current: 8, max: 8 } },
  ...overrides,
});

describe('Canvas run persistence selection', () => {
  test('selects only changed Roguelite class tokens', () => {
    const original = [makeToken(), { id: 'wall-1', layer: 'WALL' }];
    const changed = makeToken({ stats: { vida: { current: 6, max: 8 } } });

    expect(resolveChangedRogueliteRunTokens([changed, original[1]], original))
      .toEqual([changed]);
  });

  test('honors explicit scenario item ids and ignores traditional character tokens', () => {
    const classToken = makeToken();
    const characterToken = {
      ...makeToken({ id: 'token-2' }),
      profileType: 'character',
      linkedClassId: null,
      linkedCharacterId: 'character-1',
    };

    expect(resolveChangedRogueliteRunTokens(
      [classToken, characterToken],
      [],
      ['token-1', 'token-2'],
    )).toEqual([classToken]);
  });

  test('keeps resolved master/profile statistics while loading only the stored run state', () => {
    const activeRun = { id: 'run-1', stats: { vida: { current: 5, max: 10 } } };
    const merged = mergeCanvasRogueliteRuntimeSheet({
      id: 'barbarian',
      owner: 'Ada',
      profileType: 'rogueliteClass',
      maxLife: 12,
      equipment: { weapons: [{ name: 'Mandoble actual' }] },
    }, {
      maxLife: 7,
      equipment: { weapons: [] },
      activeRun,
    });

    expect(merged.maxLife).toBe(12);
    expect(merged.equipment.weapons).toEqual([{ name: 'Mandoble actual' }]);
    expect(merged.activeRun).toBe(activeRun);
  });
});
