import {
  applyRogueliteActiveRunToProfile,
  canRogueliteTokenClaimRun,
  createRogueliteActiveRun,
  createRogueliteActiveRunFromToken,
  flattenRogueliteRunInventory,
  reconcileRogueliteRunInventory,
  rebaseRogueliteActiveRun,
  resolveRogueliteProfileSyncState,
  updateRogueliteActiveRunFromProfile,
} from '../activeRun';

const makeSheet = () => ({
  id: 'barbarian',
  templateId: 'barbarian',
  owner: 'Ada',
  profileType: 'rogueliteClass',
  lifeInitial: 8,
  maxLife: 10,
  defenseClass: 3,
  maxDefenseClass: 4,
  movement: 2,
  maxMovement: 3,
  initiativeBase: 2,
  maxInitiative: 3,
  resource: { name: 'Furia', initial: 1, maximum: 3, color: '#a11' },
  equipment: {
    weapons: [{ name: 'Mandoble', templateId: 'weapon:mandoble' }],
    armor: [{ name: 'Mallas', templateId: 'armor:mallas' }],
  },
  equippedItems: {
    mainHand: { name: 'Mandoble', templateId: 'weapon:mandoble' },
  },
  personalStatusTags: ['sangrado'],
  money: 12,
});

describe('Roguelite active run', () => {
  test('starts from the personal class without mutating the master definition', () => {
    const sheet = makeSheet();
    const run = createRogueliteActiveRun(sheet, {
      runId: 'run-1',
      scenarioId: 'room-1',
      now: 100,
    });

    expect(run).toEqual(expect.objectContaining({
      id: 'run-1',
      classId: 'barbarian',
      owner: 'Ada',
      currentScenarioId: 'room-1',
      revision: 0,
      money: 12,
      statusEffects: ['sangrado'],
    }));
    expect(run.stats.vida).toEqual(expect.objectContaining({ current: 8, max: 10 }));
    expect(flattenRogueliteRunInventory(run.inventory).map((item) => item.name))
      .toEqual(['Mandoble', 'Mallas']);
    expect(sheet).not.toHaveProperty('activeRun');
  });

  test('builds the next persisted snapshot from the editable Canvas token', () => {
    const previousRun = createRogueliteActiveRun(makeSheet(), {
      runId: 'run-1',
      scenarioId: 'room-1',
      now: 100,
    });
    const nextRun = createRogueliteActiveRunFromToken({
      id: 'token-1',
      runId: 'run-1',
      linkedClassId: 'barbarian',
      linkedClassOwner: 'Ada',
      stats: { vida: { current: 4, max: 11 } },
      status: ['sangrado', 'derribado'],
      inventory: [{ name: 'Mandoble', _category: 'weapons', templateId: 'weapon:mandoble' }],
      equipmentLoadout: { mainHand: null },
      money: 7,
    }, previousRun, {
      scenarioId: 'room-2',
      revision: 4,
      now: 200,
    });

    expect(nextRun).toEqual(expect.objectContaining({
      revision: 4,
      currentScenarioId: 'room-2',
      lastTokenId: 'token-1',
      statusEffects: ['sangrado', 'derribado'],
      money: 7,
    }));
    expect(nextRun.stats.vida).toEqual({ current: 4, max: 11 });
    expect(nextRun.equippedItems.mainHand).toBeNull();
  });

  test('prevents an older encounter snapshot from reclaiming the current run', () => {
    const activeRun = { id: 'run-1', revision: 6, currentScenarioId: 'room-2' };

    expect(canRogueliteTokenClaimRun({ runId: 'run-1', runRevision: 5 }, activeRun, 'room-1'))
      .toBe(false);
    expect(canRogueliteTokenClaimRun({ runId: 'run-1', runRevision: 6 }, activeRun, 'room-3'))
      .toBe(true);
    expect(canRogueliteTokenClaimRun({ runId: 'run-1', runRevision: 1 }, activeRun, 'room-2'))
      .toBe(true);
  });

  test('projects the active run into the player view while preserving a base reference', () => {
    const profile = applyRogueliteActiveRunToProfile({
      ...makeSheet(),
      classTags: ['Brutal|#aa0000'],
      activeRun: {
        ...createRogueliteActiveRun(makeSheet(), { runId: 'run-1', now: 100 }),
        stats: {
          vida: { current: 3, max: 9 },
          cd: { current: 2, max: 5 },
          movimiento: { current: 1, max: 2 },
          iniciativa: { current: 4, max: 4 },
          recurso: { current: 2, max: 4, label: 'Furia', color: '#f00' },
        },
      },
    });

    expect(profile).toEqual(expect.objectContaining({
      lifeInitial: 3,
      maxLife: 9,
      defenseClass: 2,
      maxDefenseClass: 5,
      movement: 1,
      maxMovement: 2,
      initiativeBase: 4,
      maxInitiative: 4,
    }));
    expect(profile.resource).toEqual(expect.objectContaining({ initial: 2, maximum: 4 }));
    expect(profile.runReference.maxLife).toBe(10);
    expect(profile.tags).toEqual(['Brutal|#aa0000', 'sangrado']);
  });

  test('repairs a legacy empty run inventory from the current master pool', () => {
    const sheet = makeSheet();
    const profile = applyRogueliteActiveRunToProfile({
      ...sheet,
      classEquipmentPool: sheet.equipment,
      activeRun: {
        ...createRogueliteActiveRun(sheet, { runId: 'run-legacy', now: 100 }),
        inventory: {},
        baseInventoryTemplateIds: undefined,
      },
    });

    expect(flattenRogueliteRunInventory(profile.equipment).map((item) => item.name))
      .toEqual(['Mandoble', 'Mallas']);
    expect(flattenRogueliteRunInventory(profile.activeRun.inventory).map((item) => item.name))
      .toEqual(['Mandoble', 'Mallas']);
  });

  test('reconciles master pool changes while preserving runtime loot and explicit removals', () => {
    const inventory = reconcileRogueliteRunInventory({
      weapons: [
        { name: 'Mandoble nuevo', templateId: 'weapon:mandoble-nuevo' },
        { name: 'Daga', templateId: 'weapon:daga' },
      ],
    }, {
      inventory: {
        weapons: [{ name: 'Mandoble viejo', templateId: 'weapon:mandoble-viejo' }],
        objects: [{ name: 'Botín', templateId: 'object:botin' }],
      },
      baseInventoryTemplateIds: ['weapon:mandoble-viejo', 'weapon:daga'],
      removedBaseInventoryTemplateIds: ['weapon:daga'],
    });

    expect(flattenRogueliteRunInventory(inventory).map((item) => item.name))
      .toEqual(['Mandoble nuevo', 'Botín']);
  });

  test('copies the edited personal statistics into the active run before synchronizing', () => {
    const sheet = makeSheet();
    const activeRun = createRogueliteActiveRun(sheet, { runId: 'run-1', now: 100 });
    const updated = updateRogueliteActiveRunFromProfile({
      ...sheet,
      activeRun,
      lifeCurrent: 5,
      maxLife: 12,
      defenseClassCurrent: 4,
      maxDefenseClass: 6,
      resource: { ...sheet.resource, current: 2, maximum: 5 },
    }, { now: 200 });

    expect(updated.revision).toBe(1);
    expect(updated.stats.vida).toEqual(expect.objectContaining({ current: 5, max: 12 }));
    expect(updated.stats.cd).toEqual(expect.objectContaining({ current: 4, max: 6 }));
    expect(updated.stats.recurso).toEqual(expect.objectContaining({ current: 2, max: 5 }));
  });

  test('marks an active personal run when its master template has a newer revision', () => {
    const sheet = { ...makeSheet(), templateRevision: 4 };
    const activeRun = {
      ...createRogueliteActiveRun({ ...sheet, templateRevision: 2 }, { runId: 'run-1', now: 100 }),
      templateRevision: 2,
    };

    expect(resolveRogueliteProfileSyncState(sheet, { ...sheet, activeRun })).toEqual(
      expect.objectContaining({
        hasActiveRun: true,
        templateRevision: 4,
        appliedTemplateRevision: 2,
        templateUpdateAvailable: true,
        templateSyncStatus: 'update-available',
      }),
    );
    expect(resolveRogueliteProfileSyncState(sheet, sheet).templateSyncStatus).toBe('synced');
  });

  test('rebases explicitly without losing current damage, loot or status effects', () => {
    const previousSheet = { ...makeSheet(), templateRevision: 1 };
    const previousRun = {
      ...createRogueliteActiveRun(previousSheet, { runId: 'run-1', now: 100 }),
      stats: {
        ...createRogueliteActiveRun(previousSheet, { runId: 'run-2', now: 100 }).stats,
        vida: { current: 3, max: 10, label: 'Vida', color: '#e7a0a8' },
      },
      inventory: {
        ...previousSheet.equipment,
        objects: [{ name: 'Botín', templateId: 'object:loot' }],
      },
      statusEffects: ['sangrado'],
    };
    const nextSheet = {
      ...previousSheet,
      templateRevision: 2,
      maxLife: 12,
      classEquipmentPool: {
        weapons: [{ name: 'Hacha', templateId: 'weapon:hacha' }],
      },
    };

    const rebased = rebaseRogueliteActiveRun(previousRun, nextSheet, { now: 200 });
    expect(rebased.templateRevision).toBe(2);
    expect(rebased.stats.vida).toEqual(expect.objectContaining({ current: 3, max: 12 }));
    expect(rebased.statusEffects).toEqual(['sangrado']);
    expect(flattenRogueliteRunInventory(rebased.inventory).map((item) => item.name))
      .toEqual(['Hacha', 'Botín']);
  });
});
