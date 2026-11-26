import {
  mergeCanvasRogueliteRuntimeSheet,
  resolveChangedRogueliteRunTokens,
  syncCanvasTokenWithRuntimeProfile,
} from '../rogueliteRunPersistence';
import { addCanvasLootToInventory } from '../canvasInventoryTransfer';
import { consumeHealingPotionItem, resolveHealingPotionItem } from '../item-use/healingPotionRules';

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

  test.each([false, true])('newer personal stats preserve the same-encounter Barrera (metadata-only legacy: %s)', legacy => {
    const barrier = { id: 'barrier-1', spellId: 'runic-barrier', expires: 'combat-end', negatedTraits: ['critico'] };
    const token = makeToken({ runRevision: 2, runScenarioId: 'room-1',
      stats: { vida: { current: 3, max: 8 }, cd: { current: 2, max: 4 } },
      status: legacy ? ['envenenado'] : ['envenenado', 'barrera'], arcaneBarrier: barrier,
      inventory: [], equipmentLoadout: {} });
    const sword = { name: 'Espada nueva', templateId: 'sword', instanceId: 'sword-1', itemType: 'weapon' };
    const profile = { id: 'barbarian', owner: 'Ada', profileType: 'rogueliteClass', activeRun: {
      id: 'run-1', version: 2, revision: 3, currentScenarioId: 'room-1',
      stats: { vida: { current: 7, max: 8 }, cd: { current: 3, max: 4 } },
      statusEffects: ['sangrado'], inventory: { weapons: [sword] }, equippedItems: { mainHand: sword },
    } };
    const synced = syncCanvasTokenWithRuntimeProfile(token, profile, 'room-1');

    expect(synced.runRevision).toBe(3);
    expect(synced.stats.vida.current).toBe(7);
    expect(synced.stats.cd).toEqual({ current: 3, max: 4 });
    expect(synced.status).toEqual(['sangrado', 'barrera']);
    expect(synced.arcaneBarrier).toBe(barrier);
    expect(synced.equippedItems[0]).toMatchObject({ name: 'Espada nueva', canvasSlot: 'mainHand' });
    expect(profile.activeRun.statusEffects).toEqual(['sangrado']);
    expect(token.stats.cd.current).toBe(2);
  });

  test('profile refresh does not retain Barrera from a different scene and supports an explicit encounter reset', () => {
    const token = makeToken({ runRevision: 2, runScenarioId: 'room-1', status: ['barrera'],
      arcaneBarrier: { id: 'barrier-1', spellId: 'runic-barrier', expires: 'combat-end' } });
    const activeRun = { id: 'run-1', version: 2, revision: 3, currentScenarioId: 'room-2',
      stats: token.stats, statusEffects: [], inventory: {}, equippedItems: {} };

    const nextScene = syncCanvasTokenWithRuntimeProfile(token, { activeRun }, 'room-2');
    expect(nextScene.status).not.toContain('barrera');
    expect(nextScene.arcaneBarrier).toBeNull();
    const reset = syncCanvasTokenWithRuntimeProfile(token, { activeRun: { ...activeRun, currentScenarioId: 'room-1' } },
      'room-1', { preserveEncounterBarrier: false });
    expect(reset.status).not.toContain('barrera');
    expect(reset.arcaneBarrier).toBeNull();
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

  test('delayed metadata refresh cannot resurrect a consumed belt item or hide a fresh pickup', () => {
    const bomb = { instanceId: 'bomb', name: 'Bomba de humo', type: 'object' };
    const first = { instanceId: 'potion-a', id: 'potion', name: 'Poción de curación', type: 'object' };
    const second = { ...first, instanceId: 'potion-b' };
    const original = makeToken({ runRevision: 6, inventory: [bomb, first, second],
      equippedItems: [bomb, first, second], equipmentLoadout: { beltSlotCount: 3, belt_0: bomb, belt_1: first, belt_2: second } });
    const profile = { id: 'barbarian', owner: 'Ada', profileType: 'rogueliteClass', activeRun: {
      id: 'run-1', revision: 5, currentScenarioId: 'room-1', stats: { vida: { current: 3, max: 8 } },
      inventory: { objects: [bomb, first, second] }, equippedItems: original.equipmentLoadout,
    } };
    const consumed = consumeHealingPotionItem(resolveHealingPotionItem(original, first));
    const metadata = syncCanvasTokenWithRuntimeProfile(consumed, profile, 'room-1', { forceMetadataSync: true });
    expect(metadata.runRevision).toBe(6);
    expect(metadata.stats.vida.current).toBe(8);
    expect(metadata.equipmentLoadout.belt_1).toBeNull();
    expect(metadata.inventory.map(item => item.instanceId)).toEqual(['bomb', 'potion-b']);
    const picked = addCanvasLootToInventory(metadata, { ...first, instanceId: 'potion-c' });
    const updated = syncCanvasTokenWithRuntimeProfile(picked, profile, 'room-1', { forceMetadataSync: true });
    expect(updated.equipmentLoadout.belt_1.instanceId).toBe('potion-c');
    expect(updated.equippedItems.map(item => item.instanceId)).toEqual(['bomb', 'potion-c', 'potion-b']);
    expect(updated.inventory.find(item => item.instanceId === 'potion-c').equippedSlots).toEqual(['belt_1']);
    expect(updated.inventory.find(item => item.instanceId === 'potion-b').equippedSlots).toEqual(['belt_2']);
  });

  test('a potion profile arriving before its scene waits for the matching runtime and healing effect', () => {
    const potion = { instanceId: 'potion', name: 'Poción de curación', type: 'object' };
    const token = makeToken({ runRevision: 4, canvasRuntimeRevision: 1, stats: { vida: { current: 3, max: 8 } },
      inventory: [potion], equippedItems: [potion], equipmentLoadout: { belt_0: potion } });
    const profile = { id: 'barbarian', owner: 'Ada', profileType: 'rogueliteClass', name: 'Nombre actualizado', activeRun: {
      id: 'run-1', revision: 5, currentScenarioId: 'room-1', sourceCanvasRuntimeRevision: 2,
      stats: { vida: { current: 7, max: 8 } }, inventory: { objects: [] }, equippedItems: { belt_0: null },
    } };
    const beforeScene = syncCanvasTokenWithRuntimeProfile(token, profile, 'room-1', { forceMetadataSync: true });
    expect(beforeScene.name).toBe('Nombre actualizado');
    expect(beforeScene.stats.vida.current).toBe(3);
    expect(beforeScene.inventory).toHaveLength(1);
    expect(beforeScene.equipmentLoadout.belt_0.instanceId).toBe('potion');
    expect(beforeScene.runRevision).toBe(4);
    const sceneToken = { ...beforeScene, canvasRuntimeRevision: 2, runRevision: 5, stats: profile.activeRun.stats,
      inventory: [], equipmentLoadout: { belt_0: null }, canvasHealingEffect: { id: 'healing-1', previousLife: 3, nextLife: 7 } };
    const afterScene = syncCanvasTokenWithRuntimeProfile(sceneToken, profile, 'room-1', { forceMetadataSync: true });
    expect(afterScene.stats.vida.current).toBe(7);
    expect(afterScene.inventory).toEqual([]);
    expect(afterScene.runRevision).toBe(5);
    expect(afterScene.canvasHealingEffect).toEqual(sceneToken.canvasHealingEffect);
  });
});
