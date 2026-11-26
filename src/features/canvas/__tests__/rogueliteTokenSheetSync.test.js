import {
  createRogueliteTokenStats,
  resolveRogueliteEquippedItems,
  syncCanvasTokenWithSheet,
} from '../rogueliteTokenSheetSync';
import { syncTokenWithSheet as syncLegacyTokenWithSheet } from '../../tactical-shared/tokenSheetSync';
import {
  createRogueliteActiveRun,
  updateRogueliteActiveRunFromProfile,
} from '../../roguelite/activeRun';
import { equipItemInSlot } from '../../roguelite/equipmentPool';

const createClassSheet = (overrides = {}) => ({
  id: 'barbarian',
  owner: 'jugador-1',
  profileType: 'rogueliteClass',
  name: 'Bárbaro',
  avatar: 'barbarian.webp',
  level: 4,
  actionDice: ['d8', 'd6', 'd4'],
  lifeInitial: 8,
  maxLife: 10,
  defenseClass: 3,
  maxDefenseClass: 4,
  movement: 2,
  maxMovement: 3,
  initiativeBase: 2,
  maxInitiative: 3,
  resource: {
    name: 'Furia',
    color: '#aa1515',
    initial: 1,
    current: 2,
    maximum: 4,
  },
  personalStatusTags: ['Sangrado'],
  equipment: {
    weapons: [
      { name: 'Hacha vieja', templateId: 'weapon:hacha' },
      { name: 'Mandoble', templateId: 'weapon:mandoble', handsRequired: 2 },
    ],
    armor: [{ name: 'Mallas', templateId: 'armor:mallas', itemType: 'armor' }],
    accessories: [{ name: 'Amuleto', templateId: 'accessory:amuleto', itemType: 'accessory' }],
    objects: [{ name: 'Poción', templateId: 'object:pocion', itemType: 'object' }],
  },
  equippedItems: {
    activeWeaponSet: 1,
    weaponSets: [
      { mainHand: { name: 'Hacha vieja' }, offHand: null },
      { mainHand: { name: 'Mandoble', templateId: 'weapon:mandoble', handsRequired: 2 }, offHand: null },
    ],
    body: { name: 'Mallas', itemType: 'armor' },
    accessory_1: { name: 'Amuleto', itemType: 'accessory' },
    belt_0: { name: 'Poción', itemType: 'object' },
    beltSlotCount: 3,
  },
  ...overrides,
});

const createBarrier = () => ({
  id: 'scene-barrier', spellId: 'runic-barrier', expires: 'combat-end', negatedTraits: ['critico'],
});

describe('encounter-local Barrera on sheet synchronization', () => {
  it('can replace portable stats without resetting encounter protection', () => {
    const sheet = createClassSheet();
    sheet.activeRun = createRogueliteActiveRun(sheet, { runId: 'run-1', scenarioId: 'room-1', now: 100 });
    const token = { ...syncCanvasTokenWithSheet({ id: 'hero' }, sheet, {}, { scenarioId: 'room-1' }),
      status: ['envenenado', 'barrera'], arcaneBarrier: createBarrier(),
      stats: { vida: { current: 1, max: 10 }, cd: { current: 1, max: 4 } } };
    const synced = syncCanvasTokenWithSheet(token, sheet, {}, {
      scenarioId: 'room-1', preserveTokenState: false, preserveEncounterBarrier: true,
    });

    expect(synced.stats.vida).toEqual(expect.objectContaining({ current: 8, max: 10 }));
    expect(synced.stats.cd).toEqual(expect.objectContaining({ current: 3, max: 4 }));
    expect(synced.status).toContain('barrera');
    expect(synced.arcaneBarrier).toBe(token.arcaneBarrier);
  });

  it.each(['new-run', 'new-scene', 'relink', 'explicit-reset'])('cannot keep encounter protection through %s when replacing stats', change => {
    const sheet = createClassSheet();
    sheet.activeRun = createRogueliteActiveRun(sheet, { runId: 'run-1', scenarioId: 'room-1', now: 100 });
    const token = { ...syncCanvasTokenWithSheet({ id: 'hero' }, sheet, {}, { scenarioId: 'room-1' }),
      status: ['barrera'], arcaneBarrier: createBarrier() };
    const nextSheet = { ...sheet, activeRun: { ...sheet.activeRun } };
    const options = { scenarioId: 'room-1', preserveTokenState: false, preserveEncounterBarrier: true };
    if (change === 'new-run') nextSheet.activeRun.id = 'run-2';
    if (change === 'new-scene') options.scenarioId = 'room-2';
    if (change === 'relink') nextSheet.id = 'mage';
    if (change === 'explicit-reset') options.preserveEncounterBarrier = false;
    const synced = syncCanvasTokenWithSheet(token, nextSheet, {}, options);

    expect(synced.status).not.toContain('barrera');
    expect(synced.arcaneBarrier).toBeNull();
    expect(synced.stats.cd).toEqual(token.stats.cd);
  });

  it.each([false, true])('keeps protection during a live same-scene refresh (legacy metadata only: %s)', legacy => {
    const sheet = createClassSheet();
    sheet.activeRun = createRogueliteActiveRun(sheet, { runId: 'run-1', scenarioId: 'room-1', now: 100 });
    const token = { ...syncCanvasTokenWithSheet({ id: 'hero' }, sheet, {}, { scenarioId: 'room-1' }),
      status: legacy ? ['envenenado'] : ['envenenado', 'barrera'], arcaneBarrier: createBarrier() };
    const synced = syncCanvasTokenWithSheet(token, sheet, {}, { scenarioId: 'room-1' });

    expect(synced.status).toEqual(['envenenado', 'barrera']);
    expect(synced.arcaneBarrier).toBe(token.arcaneBarrier);
    expect(synced.stats.cd).toBe(token.stats.cd);
    expect(sheet.activeRun.statusEffects).not.toContain('barrera');
  });

  it('keeps a legacy same-scene token protected when run identifiers are unavailable', () => {
    const token = { id: 'hero', profileType: 'rogueliteClass', linkedClassId: 'barbarian',
      status: ['barrera'], arcaneBarrier: createBarrier() };
    const synced = syncCanvasTokenWithSheet(token, createClassSheet());

    expect(synced.status).toEqual(['barrera']);
    expect(synced.arcaneBarrier).toBe(token.arcaneBarrier);
  });

  it.each(['new-run', 'new-scene', 'moved-run', 'finished-run', 'reset'])('drops protection during %s without making it permanent CD', change => {
    const sheet = createClassSheet();
    sheet.activeRun = createRogueliteActiveRun(sheet, { runId: 'run-1', scenarioId: 'room-1', now: 100 });
    const token = { ...syncCanvasTokenWithSheet({ id: 'hero' }, sheet, {}, { scenarioId: 'room-1' }),
      status: ['envenenado', 'barrera'], arcaneBarrier: createBarrier() };
    const nextSheet = { ...sheet, activeRun: { ...sheet.activeRun } };
    const options = {};
    if (change === 'new-run') nextSheet.activeRun.id = 'run-2';
    if (change === 'new-scene') options.scenarioId = 'room-2';
    if (change === 'moved-run') nextSheet.activeRun.currentScenarioId = 'room-2';
    if (change === 'finished-run') nextSheet.activeRun.status = 'finished';
    if (change === 'reset') options.preserveTokenState = false;
    const synced = syncCanvasTokenWithSheet(token, nextSheet, {}, options);

    expect(synced.status).not.toContain('barrera');
    expect(synced.arcaneBarrier).toBeNull();
    expect(synced.stats.cd).toEqual(token.stats.cd);
    if (change !== 'reset') expect(synced.status).toContain('envenenado');
  });

  it('does not import protection saved accidentally in a class sheet or portable run', () => {
    const sheet = createClassSheet({ personalStatusTags: ['Sangrado', 'Barrera|Temporal'], arcaneBarrier: createBarrier() });
    sheet.activeRun = { ...createRogueliteActiveRun(sheet, { runId: 'run-1', scenarioId: 'room-1', now: 100 }),
      statusEffects: ['sangrado', 'barrera'], arcaneBarrier: createBarrier() };
    const synced = syncCanvasTokenWithSheet({ id: 'new-hero' }, sheet, {}, { scenarioId: 'room-1' });

    expect(synced.status).toEqual(['sangrado']);
    expect(synced.arcaneBarrier).toBeNull();
    expect(synced.stats.cd).toEqual(expect.objectContaining({ current: 3, max: 4 }));
  });

  it('preserves an enemy protection in its scene but never imports it from the enemy card', () => {
    const sheet = { id: 'enemy-1', profileType: 'rogueliteEnemy', stats: { cd: { current: 2, max: 2 } },
      status: ['envenenado', 'barrera'], arcaneBarrier: createBarrier() };
    const unprotected = syncCanvasTokenWithSheet({ id: 'new-enemy' }, sheet, {}, { scenarioId: 'room-1' });
    expect(unprotected.status).toEqual(['envenenado']);
    expect(unprotected.arcaneBarrier).toBeNull();
    const token = { ...unprotected, status: ['envenenado'], arcaneBarrier: createBarrier() };
    const synced = syncCanvasTokenWithSheet(token, { ...sheet, status: ['aturdido'] }, {}, { scenarioId: 'room-1' });

    expect(synced.status).toEqual(['aturdido', 'barrera']);
    expect(synced.arcaneBarrier).toBe(token.arcaneBarrier);
    expect(synced.stats.cd).toEqual({ current: 2, max: 2 });
    expect(syncCanvasTokenWithSheet(token, sheet, {}, { scenarioId: 'room-2' }).arcaneBarrier).toBeNull();
    expect(syncCanvasTokenWithSheet(token, sheet, {}, { scenarioId: 'room-1', preserveTokenState: false }).arcaneBarrier).toBeNull();
  });
});

test('Forge rapier changes refresh equipped and inventory copies without resetting runtime resources or restoring dropped items', () => {
  const rapier = { id: 'Estoque', templateId: 'Estoque', instanceId: 'copy-rapier', name: 'Estoque', dano: 'd6', rasgos: ['Crítico'], quantity: 1 };
  const sheet = createClassSheet({ equipment: { weapons: [rapier] }, equippedItems: { mainHand: rapier } });
  const token = syncCanvasTokenWithSheet({ id: 'rogue' }, sheet);
  token.stats.vida.current = 3;
  token.stats.recurso.current = 1;
  const catalogs = { armas: [{ id: 'Estoque', nombre: 'Estoque', dano: '1d6 Físico', alcance: 'Cercano', competence: 'Marcial', handsRequired: 1, rasgos: ['Perforante', 'Duelista'] }] };
  const synced = syncCanvasTokenWithSheet(token, sheet, catalogs);
  expect(synced.equippedItems[0]).toMatchObject({ instanceId: 'copy-rapier', rasgos: ['Perforante', 'Duelista'], competence: 'Marcial', canvasSlot: 'mainHand' });
  expect(synced.inventory[0]).toMatchObject({ instanceId: 'copy-rapier', rasgos: ['Perforante', 'Duelista'], quantity: 1 });
  expect(synced.stats).toEqual(token.stats);
  expect(synced.runRevision).toBe(token.runRevision);
  const dropped = syncCanvasTokenWithSheet({ ...token, inventory: [], equipmentLoadout: { mainHand: null, weaponSets: [{ mainHand: null, offHand: null }] } }, sheet, catalogs);
  expect(dropped.inventory).toEqual([]);
  expect(dropped.equippedItems).toEqual([]);
});

describe('Canvas Roguelite class adapter', () => {
  it('creates the five editable Canvas statistics from the class profile', () => {
    expect(createRogueliteTokenStats(createClassSheet())).toEqual({
      vida: expect.objectContaining({ current: 8, max: 10 }),
      cd: expect.objectContaining({ current: 3, max: 4 }),
      movimiento: expect.objectContaining({ current: 2, max: 3 }),
      iniciativa: expect.objectContaining({ current: 2, max: 3 }),
      recurso: expect.objectContaining({ current: 2, max: 4, label: 'Furia', color: '#aa1515' }),
    });
  });

  it('loads only the active weapon set and the other equipped slots', () => {
    const equipped = resolveRogueliteEquippedItems(createClassSheet().equippedItems);

    expect(equipped.activeWeaponSet).toBe(1);
    expect(equipped.items.map((item) => item.name)).toEqual([
      'Mandoble',
      'Mallas',
      'Amuleto',
      'Poción',
    ]);
    expect(equipped.items[0]).toEqual(expect.objectContaining({
      type: 'weapon',
      canvasSlot: 'mainHand',
      handsRequired: 2,
    }));
  });

  it('creates an explicit class-linked token and keeps runtime stats on a later sync', () => {
    const sheet = createClassSheet({
      talentCatalog: [{ id: 'guardian', name: 'Guardián', description: 'Protege a un aliado.' }],
      equippedTalentIds: ['guardian', null, null],
      equippedSkillIds: ['ability:fireball', null, null],
      equipment: {
        ...createClassSheet().equipment,
        abilities: [{ name: 'Bola de fuego', templateId: 'ability:fireball', description: 'Inflige daño de fuego.' }],
      },
    });
    const created = syncCanvasTokenWithSheet({ id: 'token-1' }, sheet);

    expect(created).toEqual(expect.objectContaining({
      profileType: 'rogueliteClass',
      canvasRuntime: 'roguelite',
      linkedClassId: 'barbarian',
      linkedClassOwner: 'jugador-1',
      linkedCharacterId: null,
      runId: expect.stringContaining('run-jugador-1-barbarian-'),
      portrait: 'barbarian.webp',
      actionDice: ['d8', 'd6', 'd4'],
      equippedTalentIds: ['guardian', null, null],
    }));
    expect(created.equippedTalents).toEqual([
      expect.objectContaining({ id: 'guardian', name: 'Guardián' }),
    ]);
    expect(created.equippedTalentSlots).toEqual([
      expect.objectContaining({ id: 'guardian', name: 'Guardián' }),
      null,
      null,
    ]);
    expect(created.equippedSkills).toEqual([
      expect.objectContaining({ templateId: 'ability:fireball', name: 'Bola de fuego' }),
    ]);
    expect(created.equippedSkillSlots).toEqual([
      expect.objectContaining({ templateId: 'ability:fireball', name: 'Bola de fuego' }),
      null,
      null,
    ]);
    expect(created.equippedItems).toHaveLength(4);
    expect(created.inventory.map((item) => item.name)).toEqual([
      'Hacha vieja',
      'Mandoble',
      'Mallas',
      'Bola de fuego',
      'Poción',
      'Amuleto',
    ]);
    expect(created.inventory.find((item) => item.name === 'Mandoble').isEquipped).toBe(true);
    expect(created.inventory.find((item) => item.name === 'Hacha vieja').isEquipped).toBe(false);

    const editedInCanvas = {
      ...created,
      usedTalentSlots: [true, false, false],
      usedTalentSlotIds: ['guardian', null, null],
      usedSkillSlots: [true, false, false],
      usedSkillSlotIds: ['ability:fireball', null, null],
      stats: {
        ...created.stats,
        vida: { ...created.stats.vida, current: 3, max: 12 },
      },
    };
    const resynced = syncCanvasTokenWithSheet(editedInCanvas, sheet);
    expect(resynced.stats.vida).toEqual(expect.objectContaining({ current: 3, max: 12 }));
    expect(resynced.usedTalentSlots).toEqual([true, false, false]);
    expect(resynced.usedSkillSlots).toEqual([true, false, false]);
  });

  it('keeps resolving personal talent ids with the master catalog already carried by the token', () => {
    const masterSheet = createClassSheet({
      talentCatalog: [{ id: 'guardian', name: 'Guardián', description: 'Protege a un aliado.' }],
      equippedTalentIds: ['guardian', null, null],
    });
    const token = syncCanvasTokenWithSheet({ id: 'token-1' }, masterSheet);

    const synced = syncCanvasTokenWithSheet(token, {
      id: 'barbarian',
      owner: 'jugador-1',
      profileType: 'rogueliteClass',
      equippedTalentIds: ['guardian', null, null],
    });

    expect(synced.equippedTalentSlots).toEqual([
      expect.objectContaining({ id: 'guardian', name: 'Guardián' }),
      null,
      null,
    ]);
  });

  it('delegates legacy character sheets to the existing adapter', () => {
    const token = { id: 'legacy-token' };
    const sheet = { id: 'character-1', name: 'Aina', stats: { vida: { current: 4, max: 5 } } };
    expect(syncCanvasTokenWithSheet(token, sheet)).toEqual(syncLegacyTokenWithSheet(token, sheet));
  });

  it('keeps the enemy card portrait separate from the complete Canvas token image', () => {
    const synced = syncCanvasTokenWithSheet(
      { id: 'enemy-token' },
      {
        id: 'enemy-1',
        profileType: 'rogueliteEnemy',
        image: 'enemy-portrait.webp',
        imageSource: 'enemy-original.webp',
        stats: { iniciativa: { current: 2 }, ofensiva: { current: 3 } },
      },
    );

    expect(synced).toEqual(expect.objectContaining({
      img: 'enemy-original.webp',
      portrait: 'enemy-portrait.webp',
      tokenImageSource: 'enemy-original.webp',
      tokenImageFit: 'contain',
    }));
  });

  it('applies the statistics saved in the personal class during an explicit sync', () => {
    const sheet = createClassSheet();
    const activeRun = createRogueliteActiveRun(sheet, { runId: 'run-1', now: 100 });
    const savedSheet = {
      ...sheet,
      lifeCurrent: 5,
      maxLife: 12,
      resource: { ...sheet.resource, current: 3, maximum: 6 },
      activeRun,
    };
    savedSheet.activeRun = updateRogueliteActiveRunFromProfile(savedSheet, { now: 200 });

    const token = syncCanvasTokenWithSheet({
      id: 'token-1',
      profileType: 'rogueliteClass',
      linkedClassId: 'barbarian',
      stats: { vida: { current: 1, max: 1 } },
    }, savedSheet, {}, { preserveTokenState: false });

    expect(token.stats.vida).toEqual(expect.objectContaining({ current: 5, max: 12 }));
    expect(token.stats.recurso).toEqual(expect.objectContaining({ current: 3, max: 6 }));
  });

  it('updates isEquipped flags and loadout on existing inventory items when equipped in class sheet', () => {
    const sheet = createClassSheet();
    const token = {
      id: 'token-1',
      profileType: 'rogueliteClass',
      linkedClassId: 'barbarian',
      inventory: [
        { id: 'loot-sword-1', name: 'Espada de Acero', type: 'weapon', isEquipped: false },
        { id: 'potion-1', name: 'Poción', type: 'object', isEquipped: false },
      ],
      equippedItems: [],
    };

    const sheetWithEquippedSword = {
      ...sheet,
      equippedItems: equipItemInSlot(sheet.equippedItems, 'mainHand', {
        id: 'loot-sword-1',
        name: 'Espada de Acero',
        type: 'weapon',
      }),
    };

    const synced = syncCanvasTokenWithSheet(token, sheetWithEquippedSword);
    const sword = synced.inventory.find((item) => item.name === 'Espada de Acero');
    expect(sword.isEquipped).toBe(true);
    expect(sword.equippedSlots).toContain('mainHand');
    expect(synced.equippedItems.some((item) => item.name === 'Espada de Acero')).toBe(true);
  });

  it('uses the active run loadout instead of stale profile equipment after dropping an item', () => {
    const sheet = createClassSheet();
    const activeRun = createRogueliteActiveRun(sheet, {
      runId: 'run-1',
      scenarioId: 'room-1',
      now: 100,
    });
    activeRun.revision = 2;
    activeRun.inventory = { weapons: [], armor: [], abilities: [], objects: [], accessories: [] };
    activeRun.equippedItems = {
      activeWeaponSet: 0,
      weaponSets: [
        { mainHand: null, offHand: null },
        { mainHand: null, offHand: null },
      ],
      mainHand: null,
      offHand: null,
      body: null,
      accessory_1: null,
      accessory_2: null,
    };

    const synced = syncCanvasTokenWithSheet({
      id: 'token-1',
      profileType: 'rogueliteClass',
      linkedClassId: 'barbarian',
      linkedClassOwner: 'jugador-1',
      runId: 'run-1',
      inventory: [],
    }, {
      ...sheet,
      // La copia superior sigue teniendo el equipamiento anterior.
      activeRun,
    }, {}, { scenarioId: 'room-1', preserveTokenState: false });

    expect(synced.inventory).toEqual([]);
    expect(synced.equippedItems).toEqual([]);
    expect(synced.equipmentLoadout.mainHand).toBeNull();
  });

  it('keeps an explicitly emptied runtime inventory empty while a Canvas transfer is pending', () => {
    const sheet = createClassSheet();
    const synced = syncCanvasTokenWithSheet({
      id: 'token-1',
      profileType: 'rogueliteClass',
      linkedClassId: 'barbarian',
      inventory: [],
      equipmentLoadout: {
        activeWeaponSet: 0,
        weaponSets: [{ mainHand: null, offHand: null }],
        belt_0: null,
      },
      runtimeDirty: true,
    }, sheet, {}, { preserveTokenState: true });

    expect(synced.inventory).toEqual([]);
    expect(synced.runtimeDirty).toBe(true);
  });
});


describe('legacy weapon set synchronization', () => {
  const axe = { name: 'Hacha', damage: '1d8', consumption: '🟡', type: 'weapon' };
  const bow = { name: 'Arco', damage: '1d6', consumption: '🟡', type: 'weapon' };
  test.each([0, 1])('only flattens weapons from active set %i, never loadout metadata', (activeWeaponSet) => {
    const synced = syncLegacyTokenWithSheet({}, { equippedItems: {
      mainHand: axe, offHand: null, activeWeaponSet, beltSlotCount: 2,
      weaponSets: [{ mainHand: axe, offHand: null }, { mainHand: bow, offHand: null }],
    } }, {}, { skipArmorSync: true });
    expect(synced.equippedItems).toEqual([activeWeaponSet === 0 ? axe : bow]);
  });
});


test('class mechanics retain the class name instead of an opaque template identifier', () => {
  const token = syncCanvasTokenWithSheet({ id: 'hero' }, createClassSheet({ name: 'Guerrero', templateId: 'opaque-template-id' }));
  expect(token.classIdentity).toBe('Guerrero');
});
