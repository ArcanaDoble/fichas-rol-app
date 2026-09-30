import {
  activateWeaponSet,
  createEquipmentTemplateId,
  equipItemInSlot,
  equipItemInWeaponSet,
  materializeEquipmentInstances,
  normalizeRogueliteEquipmentPool,
  normalizeEquippedHandSlots,
  normalizeEquippedWeaponSets,
  reconcileEquippedItemsWithInventory,
  resolveEquippedItemUsages,
  resolveEquippedWeaponSet,
  resolveEquippedHandOccupancy,
  resolveEquipmentHandsRequired,
} from '../equipmentPool';

describe('roguelite starting equipment pool', () => {
  test('creates a stable catalog identity when an old item has no id', () => {
    expect(createEquipmentTemplateId({ name: 'Hacha de Batalla' }, 'weapons'))
      .toBe('weapons:hacha-de-batalla');
  });

  test('prefers explicit hand requirements and migrates the legacy two-handed trait', () => {
    expect(resolveEquipmentHandsRequired({ handsRequired: 2 })).toBe(2);
    expect(resolveEquipmentHandsRequired({ traits: 'Marcial, Dos manos' })).toBe(2);
    expect(resolveEquipmentHandsRequired({ traits: 'Ligera, Ágil' })).toBe(1);
    expect(resolveEquipmentHandsRequired(null)).toBe(1);
  });

  test('normalizes each pool category and preserves duplicate physical copies', () => {
    const pool = normalizeRogueliteEquipmentPool({
      weapons: [
        { id: 'great-axe', name: 'Gran hacha', traits: 'Dos manos' },
        { id: 'great-axe', name: 'Gran hacha duplicada' },
      ],
      armor: [{ name: 'Cuero', consumption: '🔷🔷🔷🔷🔷🔷', actionCost: 6 }],
    });

    expect(pool.weapons).toEqual([
      expect.objectContaining({
        templateId: 'great-axe',
        instanceId: 'great-axe::1',
        name: 'Gran hacha',
        handsRequired: 2,
      }),
      expect.objectContaining({
        templateId: 'great-axe',
        instanceId: 'great-axe::2',
        name: 'Gran hacha duplicada',
      }),
    ]);
    expect(pool.armor[0]).toMatchObject({
      templateId: 'armor:cuero',
      name: 'Cuero',
    });
    expect(pool.armor[0]).not.toHaveProperty('consumption');
    expect(pool.armor[0]).not.toHaveProperty('actionCost');
    expect(pool.objects).toEqual([]);
  });

  test('canonicalizes collected legacy items so inventory cards keep their identity and art', () => {
    const pool = normalizeRogueliteEquipmentPool({
      armor: [{
        type: 'armor',
        payload: {
          id: 'mail-armor',
          nombre: 'Armadura de mallas',
          rareza: 'Poco común',
          imagen: '/armaduras/mallas.webp',
          descripcion: 'Neutraliza ataques cortantes.',
        },
        defensa: 7,
      }],
    });

    expect(pool.armor[0]).toEqual(expect.objectContaining({
      templateId: 'mail-armor',
      name: 'Armadura de mallas',
      rareza: 'Poco común',
      rarity: 'Poco común',
      image: '/armaduras/mallas.webp',
      description: 'Neutraliza ataques cortantes.',
      defensa: 7,
    }));
  });

  test('equipping a two-handed weapon clears and occupies the opposite hand', () => {
    const shield = { name: 'Escudo' };
    const greatSword = { name: 'Mandoble', handsRequired: 2 };
    const equipped = equipItemInSlot(
      { mainHand: null, offHand: shield, body: null },
      'mainHand',
      greatSword,
    );

    expect(equipped.mainHand).toBe(greatSword);
    expect(equipped.offHand).toBeNull();
    expect(resolveEquippedHandOccupancy(equipped)).toEqual({
      sourceSlot: 'mainHand',
      blockedSlot: 'offHand',
      item: greatSword,
    });
  });

  test('equipping in a blocked hand replaces the two-handed weapon safely', () => {
    const greatSword = { name: 'Mandoble', handsRequired: 2 };
    const dagger = { name: 'Daga', handsRequired: 1 };
    const equipped = equipItemInSlot(
      { mainHand: greatSword, offHand: null },
      'offHand',
      dagger,
    );

    expect(equipped.mainHand).toBeNull();
    expect(equipped.offHand).toBe(dagger);
  });

  test('equips a one-handed weapon while the opposite hand is empty', () => {
    const dagger = { name: 'Daga', handsRequired: 1 };

    expect(equipItemInSlot(
      { mainHand: null, offHand: null, body: null },
      'mainHand',
      dagger,
    )).toEqual({
      mainHand: dagger,
      offHand: null,
      body: null,
    });
  });

  test('does not equip the same physical weapon copy in two hands or weapon sets', () => {
    const dagger = {
      name: 'Daga',
      templateId: 'weapon:daga',
      instanceId: 'weapon:daga::1',
      handsRequired: 1,
    };
    const firstHand = equipItemInWeaponSet({}, 0, 'mainHand', dagger);
    const duplicateHand = equipItemInWeaponSet(firstHand, 0, 'offHand', dagger);
    const duplicateSet = equipItemInWeaponSet(firstHand, 1, 'mainHand', dagger);

    expect(resolveEquippedWeaponSet(duplicateHand, 0)).toEqual({
      mainHand: dagger,
      offHand: null,
    });
    expect(resolveEquippedWeaponSet(duplicateSet, 1)).toEqual({
      mainHand: null,
      offHand: null,
    });
  });

  test('equips two distinct copies of the same weapon template', () => {
    const [daggerOne, daggerTwo] = materializeEquipmentInstances([
      { name: 'Daga', templateId: 'weapon:daga', handsRequired: 1 },
      { name: 'Daga', templateId: 'weapon:daga', handsRequired: 1 },
    ], 'weapons');
    const firstHand = equipItemInWeaponSet({}, 0, 'mainHand', daggerOne);
    const dualWield = equipItemInWeaponSet(firstHand, 0, 'offHand', daggerTwo);

    expect(resolveEquippedWeaponSet(dualWield, 0)).toEqual({
      mainHand: daggerOne,
      offHand: daggerTwo,
    });
    expect(resolveEquippedItemUsages(dualWield, daggerOne)).toEqual([
      expect.objectContaining({ weaponSetIndex: 0, slot: 'mainHand' }),
    ]);
    expect(resolveEquippedItemUsages(dualWield, daggerTwo)).toEqual([
      expect.objectContaining({ weaponSetIndex: 0, slot: 'offHand' }),
    ]);
  });

  test('migrates legacy loadouts by assigning each slot to an owned copy', () => {
    const legacyDagger = { name: 'Daga', templateId: 'weapon:daga', handsRequired: 1 };
    const oneCopy = reconcileEquippedItemsWithInventory({
      mainHand: legacyDagger,
      offHand: legacyDagger,
    }, {
      weapons: [legacyDagger],
    });
    const twoCopies = reconcileEquippedItemsWithInventory({
      mainHand: legacyDagger,
      offHand: legacyDagger,
    }, {
      weapons: [legacyDagger, legacyDagger],
    });

    expect(resolveEquippedWeaponSet(oneCopy, 0).mainHand).toMatchObject({
      instanceId: 'weapon:daga::1',
    });
    expect(resolveEquippedWeaponSet(oneCopy, 0).offHand).toBeNull();
    expect(resolveEquippedWeaponSet(twoCopies, 0).mainHand.instanceId)
      .not.toBe(resolveEquippedWeaponSet(twoCopies, 0).offHand.instanceId);
  });

  test('migrates an old invalid combination by keeping the two-handed weapon', () => {
    const equipped = normalizeEquippedHandSlots({
      mainHand: { name: 'Mandoble', traits: 'Marcial, Dos manos' },
      offHand: { name: 'Daga' },
      body: { name: 'Cuero' },
    });

    expect(equipped.mainHand.name).toBe('Mandoble');
    expect(equipped.offHand).toBeNull();
    expect(equipped.body.name).toBe('Cuero');
  });

  test('migrates the legacy hands into set one and creates an empty set two', () => {
    const dagger = { name: 'Daga', handsRequired: 1 };
    const equipped = normalizeEquippedWeaponSets({
      mainHand: dagger,
      offHand: null,
      body: { name: 'Cuero' },
    });

    expect(equipped.weaponSets).toEqual([
      { mainHand: dagger, offHand: null },
      { mainHand: null, offHand: null },
    ]);
    expect(equipped.activeWeaponSet).toBe(0);
    expect(equipped.mainHand).toBe(dagger);
    expect(equipped.body.name).toBe('Cuero');
  });

  test('edits the inactive set without changing the compatibility aliases', () => {
    const dagger = { name: 'Daga', handsRequired: 1 };
    const bow = { name: 'Arco', handsRequired: 2 };
    const initial = normalizeEquippedWeaponSets({ mainHand: dagger, offHand: null });
    const equipped = equipItemInWeaponSet(initial, 1, 'mainHand', bow);

    expect(resolveEquippedWeaponSet(equipped, 1)).toEqual({
      mainHand: bow,
      offHand: null,
    });
    expect(equipped.activeWeaponSet).toBe(0);
    expect(equipped.mainHand).toBe(dagger);
    expect(equipped.offHand).toBeNull();
  });

  test('activating set two exposes its hands to existing consumers', () => {
    const dagger = { name: 'Daga', handsRequired: 1 };
    const bow = { name: 'Arco', handsRequired: 2 };
    const withSecondSet = equipItemInWeaponSet(
      normalizeEquippedWeaponSets({ mainHand: dagger, offHand: null }),
      1,
      'mainHand',
      bow,
    );
    const equipped = activateWeaponSet(withSecondSet, 1);

    expect(equipped.activeWeaponSet).toBe(1);
    expect(equipped.mainHand).toBe(bow);
    expect(equipped.offHand).toBeNull();
    expect(resolveEquippedHandOccupancy(equipped)).toMatchObject({
      sourceSlot: 'mainHand',
      blockedSlot: 'offHand',
      item: bow,
    });
  });
});
