import {
  mergeCanvasRogueliteRuntimeSheet,
  resolveChangedRogueliteRunTokens,
  syncCanvasTokenWithRuntimeProfile,
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
      talentCatalog: [{ id: 'guardian', name: 'Guardián' }],
      equippedTalentIds: [null, null, null],
    }, {
      maxLife: 7,
      equipment: { weapons: [] },
      equippedTalentIds: ['guardian', null, null],
      equippedSkillIds: ['ability:fireball', null, null],
      activeRun,
    });

    expect(merged.maxLife).toBe(12);
    expect(merged.equipment.weapons).toEqual([{ name: 'Mandoble actual' }]);
    expect(merged.activeRun).toBe(activeRun);
    expect(merged.equippedTalentIds).toEqual(['guardian', null, null]);
    expect(merged.equippedSkillIds).toEqual(['ability:fireball', null, null]);
  });

  test('applies a newer personal run snapshot to the encounter token', () => {
    const token = makeToken({
      runRevision: 2,
      inventory: [],
      equipmentLoadout: { mainHand: null, offHand: null },
      equippedItems: [],
      runtimeDirty: true,
    });
    const collectedSword = {
      name: 'Espada encontrada',
      templateId: 'weapon:loot-sword',
      runItemId: 'loot-sword-1',
      itemType: 'weapon',
    };
    const activeRun = {
      id: 'run-1',
      revision: 3,
      currentScenarioId: 'room-1',
      inventory: {
        weapons: [collectedSword],
        armor: [],
        abilities: [],
        objects: [],
        accessories: [],
      },
      equippedItems: {
        activeWeaponSet: 0,
        weaponSets: [
          { mainHand: collectedSword, offHand: null },
          { mainHand: null, offHand: null },
        ],
        mainHand: collectedSword,
        offHand: null,
      },
      stats: token.stats,
    };

    const synced = syncCanvasTokenWithRuntimeProfile(token, {
      id: 'barbarian',
      owner: 'Ada',
      profileType: 'rogueliteClass',
      activeRun,
    }, 'room-1');

    expect(synced.runRevision).toBe(3);
    expect(synced.runtimeDirty).toBe(false);
    expect(synced.inventory).toEqual([
      expect.objectContaining({ name: 'Espada encontrada', isEquipped: true }),
    ]);
    expect(synced.equippedItems).toEqual([
      expect.objectContaining({ name: 'Espada encontrada', canvasSlot: 'mainHand' }),
    ]);
  });

  test('ignores stale or unrelated personal run snapshots', () => {
    const token = makeToken({ runRevision: 4 });

    expect(syncCanvasTokenWithRuntimeProfile(token, {
      activeRun: { id: 'run-1', revision: 4, currentScenarioId: 'room-1' },
    }, 'room-1')).toBe(token);
    expect(syncCanvasTokenWithRuntimeProfile(token, {
      activeRun: { id: 'another-run', revision: 8, currentScenarioId: 'room-1' },
    }, 'room-1')).toBe(token);
    expect(syncCanvasTokenWithRuntimeProfile(token, {
      activeRun: { id: 'run-1', revision: 8, currentScenarioId: 'room-2' },
    }, 'room-1')).toBe(token);
  });

  test('can enrich talent slots from the master definition without changing the run revision', () => {
    const token = makeToken({ runRevision: 3 });
    const synced = syncCanvasTokenWithRuntimeProfile(token, {
      id: 'barbarian',
      owner: 'Ada',
      profileType: 'rogueliteClass',
      talentCatalog: [{ id: 'guardian', name: 'Guardián', description: 'Protege a un aliado.' }],
      equippedTalentIds: ['guardian', null, null],
      activeRun: {
        id: 'run-1',
        revision: 3,
        currentScenarioId: 'room-1',
        stats: token.stats,
        inventory: { weapons: [], armor: [], abilities: [], objects: [], accessories: [] },
        equippedItems: {},
      },
    }, 'room-1', { forceMetadataSync: true });

    expect(synced.runRevision).toBe(3);
    expect(synced.stats).toEqual(token.stats);
    expect(synced.equippedTalentSlots).toEqual([
      expect.objectContaining({ id: 'guardian', name: 'Guardián' }),
      null,
      null,
    ]);
  });
});
