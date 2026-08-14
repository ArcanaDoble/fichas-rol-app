import {
  applyRogueliteActiveRunToProfile,
  canRogueliteTokenClaimRun,
  createRogueliteActiveRun,
  createPreparedRogueliteRunInventory,
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
  test('materializes only prepared equipment and skills when the run starts', () => {
    const sheet = {
      ...makeSheet(),
      equipment: {
        weapons: [
          { name: 'Mandoble', templateId: 'weapon:mandoble' },
          { name: 'Daga', templateId: 'weapon:daga' },
        ],
        armor: [{ name: 'Mallas', templateId: 'armor:mallas' }],
        abilities: [
          { name: 'Bola de fuego', templateId: 'ability:fireball' },
          { name: 'Barrera', templateId: 'ability:barrier' },
        ],
        objects: [{ name: 'Poción', templateId: 'object:potion' }],
      },
      equippedItems: {
        weaponSets: [
          { mainHand: { name: 'Mandoble', templateId: 'weapon:mandoble' }, offHand: null },
          { mainHand: null, offHand: null },
        ],
        body: { name: 'Mallas', templateId: 'armor:mallas' },
      },
      equippedSkillIds: ['ability:fireball', 'ability:fireball', null],
    };

    expect(flattenRogueliteRunInventory(createPreparedRogueliteRunInventory(sheet)).map((item) => item.name))
      .toEqual(['Mandoble', 'Mallas', 'Bola de fuego']);
    expect(flattenRogueliteRunInventory(createRogueliteActiveRun(sheet, { now: 100 }).inventory).map((item) => item.name))
      .toEqual(['Mandoble', 'Mallas', 'Bola de fuego']);
  });

  test('keeps a prepared legacy ability whose catalog identity is nested in payload', () => {
    const run = createRogueliteActiveRun({
      ...makeSheet(),
      classEquipmentPool: {
        abilities: [{
          name: 'Bola de fuego',
          itemType: 'ability',
          payload: { id: 'firebase-ability-id' },
        }],
      },
      equipment: { abilities: [] },
      equippedItems: {},
      equippedSkillIds: ['firebase-ability-id', null, null],
    }, { now: 100 });

    expect(flattenRogueliteRunInventory(run.inventory)).toEqual([
      expect.objectContaining({ name: 'Bola de fuego', itemType: 'ability' }),
    ]);
  });

  test('keeps equipped abilities when a stale class pool does not contain them', () => {
    const run = createRogueliteActiveRun({
      ...makeSheet(),
      classEquipmentPool: {
        weapons: [{ name: 'Mandoble', templateId: 'weapon:mandoble' }],
        abilities: [],
      },
      equipment: {
        abilities: [
          { name: 'Proyectil arcano', templateId: 'z4uoPSftKvQoRGLGneZY8', itemType: 'ability' },
          { name: 'Onda de fuerza', templateId: 'pJ2400KBtdSH7IqfZ5fE0', itemType: 'ability' },
          { name: 'Barrera arcana', templateId: 'PArxBqScw6OZDAqRRoR5H', itemType: 'ability' },
        ],
      },
      equippedItems: {},
      equippedSkillIds: [
        'z4uoPSftKvQoRGLGneZY8',
        'pJ2400KBtdSH7IqfZ5fE0',
        'PArxBqScw6OZDAqRRoR5H',
      ],
    }, { now: 100 });

    expect(flattenRogueliteRunInventory(run.inventory).map((item) => item.name)).toEqual([
      'Proyectil arcano',
      'Onda de fuerza',
      'Barrera arcana',
    ]);
  });

  test('refreshes the equipped skill slots when an existing run is launched again', () => {
    const sheet = {
      ...makeSheet(),
      classEquipmentPool: {
        abilities: [{
          name: 'Barrera arcana',
          templateId: 'PArxBqScw6OZDAqRRoR5H',
          itemType: 'ability',
        }],
      },
      equipment: { abilities: [] },
      equippedItems: {},
      equippedSkillIds: ['PArxBqScw6OZDAqRRoR5H', null, null],
      activeRun: {
        id: 'run-existing',
        status: 'active',
        classId: 'barbarian',
        owner: 'Ada',
        inventory: { abilities: [] },
        baseInventoryTemplateIds: ['PArxBqScw6OZDAqRRoR5H'],
        equippedSkillIds: [null, null, null],
      },
    };

    const run = createRogueliteActiveRun(sheet, { now: 100 });

    expect(run.equippedSkillIds).toEqual(['PArxBqScw6OZDAqRRoR5H', null, null]);
    expect(flattenRogueliteRunInventory(run.inventory)).toEqual([
      expect.objectContaining({ name: 'Barrera arcana', itemType: 'ability' }),
    ]);
  });

  test('repairs a run created with the full pool without deleting runtime loot', () => {
    const sheet = {
      ...makeSheet(),
      equipment: {
        weapons: [
          { name: 'Mandoble', templateId: 'weapon:mandoble' },
          { name: 'Daga', templateId: 'weapon:daga' },
        ],
        objects: [{ name: 'Botín', templateId: 'object:loot' }],
      },
      classEquipmentPool: {
        weapons: [
          { name: 'Mandoble', templateId: 'weapon:mandoble' },
          { name: 'Daga', templateId: 'weapon:daga' },
        ],
      },
      activeRun: {
        id: 'run-broken',
        status: 'active',
        classId: 'barbarian',
        owner: 'Ada',
        inventory: {
          weapons: [
            { name: 'Mandoble', templateId: 'weapon:mandoble' },
            { name: 'Daga', templateId: 'weapon:daga' },
          ],
          objects: [{ name: 'Botín', templateId: 'object:loot' }],
        },
        baseInventoryTemplateIds: ['weapon:mandoble', 'weapon:daga'],
      },
    };

    const repaired = createRogueliteActiveRun(sheet, { now: 200 });
    expect(flattenRogueliteRunInventory(repaired.inventory).map((item) => item.name))
      .toEqual(['Mandoble', 'Botín']);
  });

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
      .toEqual(['Mandoble']);
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

  test('keeps a token inventory authoritative after dropping an equipped base item', () => {
    const sheet = makeSheet();
    const previousRun = createRogueliteActiveRun(sheet, {
      runId: 'run-1',
      scenarioId: 'room-1',
      now: 100,
    });
    const persistedRun = createRogueliteActiveRunFromToken({
      id: 'token-1',
      runId: 'run-1',
      linkedClassId: 'barbarian',
      linkedClassOwner: 'Ada',
      stats: previousRun.stats,
      inventory: [],
      equipmentLoadout: { mainHand: null, offHand: null },
    }, previousRun, {
      scenarioId: 'room-1',
      revision: 1,
      now: 200,
    });

    const projected = applyRogueliteActiveRunToProfile({
      ...sheet,
      // La configuración personal de antes de la run aún puede conservar el
      // arma. No debe imponerse a la instantánea guardada desde el Canvas.
      equippedItems: sheet.equippedItems,
      // Compatibilidad con intercambios ya escritos por la versión anterior.
      activeRun: { ...persistedRun, version: 1 },
    });

    expect(flattenRogueliteRunInventory(projected.equipment)).toEqual([]);
    expect(projected.equippedItems.mainHand).toBeNull();
  });

  test('repairs a stale equipped slot when its item no longer exists in the run inventory', () => {
    const sheet = makeSheet();
    const staleWeapon = {
      name: 'Mandoble',
      templateId: 'weapon:mandoble',
      itemType: 'weapon',
    };
    const projected = applyRogueliteActiveRunToProfile({
      ...sheet,
      activeRun: {
        ...createRogueliteActiveRun(sheet, { runId: 'run-1', now: 100 }),
        version: 2,
        lastTokenId: 'token-1',
        inventory: {},
        equippedItems: {
          activeWeaponSet: 0,
          weaponSets: [
            { mainHand: staleWeapon, offHand: null },
            { mainHand: null, offHand: null },
          ],
          mainHand: staleWeapon,
          offHand: null,
        },
      },
    });

    expect(flattenRogueliteRunInventory(projected.equipment)).toEqual([]);
    expect(projected.equippedItems.mainHand).toBeNull();
    expect(projected.equippedItems.weaponSets[0].mainHand).toBeNull();
  });

  test('keeps newly collected loot even when its template belongs to the class pool', () => {
    const sheet = {
      ...makeSheet(),
      equipment: {
        weapons: [
          { name: 'Mandoble', templateId: 'weapon:mandoble' },
          { name: 'Daga', templateId: 'weapon:daga' },
        ],
      },
    };
    const previousRun = createRogueliteActiveRun(sheet, {
      runId: 'run-1',
      scenarioId: 'room-1',
      now: 100,
    });
    const persistedRun = createRogueliteActiveRunFromToken({
      id: 'token-1',
      runId: 'run-1',
      linkedClassId: 'barbarian',
      linkedClassOwner: 'Ada',
      stats: previousRun.stats,
      inventory: [{
        name: 'Daga',
        templateId: 'weapon:daga',
        runItemId: 'loot-daga-1',
        _category: 'weapons',
      }],
      equipmentLoadout: { mainHand: null, offHand: null },
    }, previousRun, {
      scenarioId: 'room-1',
      revision: 1,
      now: 200,
    });

    const projected = applyRogueliteActiveRunToProfile({
      ...sheet,
      activeRun: persistedRun,
    });

    expect(flattenRogueliteRunInventory(projected.equipment)).toEqual([
      expect.objectContaining({ name: 'Daga', runItemId: 'loot-daga-1' }),
    ]);
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
        version: 1,
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
      .toEqual(['Botín']);
  });
});
