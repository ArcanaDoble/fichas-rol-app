import {
  activateWeaponSet,
  createEquipmentTemplateId,
  equipItemInSlot,
  equipItemInWeaponSet,
  normalizeRogueliteEquipmentPool,
  normalizeEquippedHandSlots,
  normalizeEquippedWeaponSets,
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

  test('normalizes each pool category and avoids duplicate master options', () => {
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
        name: 'Gran hacha',
        handsRequired: 2,
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
