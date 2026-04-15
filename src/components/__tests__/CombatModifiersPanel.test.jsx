import { applyModifiersToWeapon } from '../CombatModifiersPanel';

test('serializes manual extra dice as individual dice terms', () => {
  const weapon = { type: 'weapon', nombre: 'Estoque', dano: '1d8', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: { d10: 2, d12: 2 },
    activeTraits: [],
  });

  expect(modifiedWeapon.extraDamageString).toBe('1d10 + 1d10 + 1d12 + 1d12');
});

test('serializes Ralentizado as a manual combat trait', () => {
  const weapon = { type: 'weapon', nombre: 'Maza', dano: '1d8', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: {},
    activeTraits: ['ralentizado'],
  });

  expect(modifiedWeapon.rasgos).toContain('Ralentizado');
  expect(modifiedWeapon.manualCombatTraits).toEqual(['ralentizado']);
});

test('serializes Empuje as a manual combat trait', () => {
  const weapon = { type: 'weapon', nombre: 'Martillo', dano: '1d8', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: {},
    activeTraits: ['empuje'],
  });

  expect(modifiedWeapon.rasgos).toContain('Empuje');
  expect(modifiedWeapon.manualCombatTraits).toEqual(['empuje']);
});
