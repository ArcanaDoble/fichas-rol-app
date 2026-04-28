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

test('serializes Perforante as a manual combat trait', () => {
  const weapon = { type: 'weapon', nombre: 'Lanza', dano: '1d8', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: {},
    activeTraits: ['perforante'],
  });

  expect(modifiedWeapon.rasgos).toContain('Perforante');
  expect(modifiedWeapon.manualCombatTraits).toEqual(['perforante']);
});

test('serializes Elusión as a manual combat trait', () => {
  const weapon = { type: 'weapon', nombre: 'Estoque', dano: '1d8', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: {},
    activeTraits: ['elusion'],
  });

  expect(modifiedWeapon.rasgos).toContain('Elusión');
  expect(modifiedWeapon.manualCombatTraits).toEqual(['elusion']);
});

test('serializes Balístico as a manual combat trait', () => {
  const weapon = { type: 'weapon', nombre: 'Arcabuz', dano: '1d8', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: {},
    activeTraits: ['balistico'],
  });

  expect(modifiedWeapon.rasgos).toContain('Balístico');
  expect(modifiedWeapon.manualCombatTraits).toEqual(['balistico']);
});

test('serializes Distancia as a manual combat trait', () => {
  const weapon = { type: 'weapon', nombre: 'Pistola', dano: '1d8', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: {},
    activeTraits: ['distancia'],
  });

  expect(modifiedWeapon.rasgos).toContain('Distancia');
  expect(modifiedWeapon.manualCombatTraits).toEqual(['distancia']);
});

test('serializes Bloqueo as a manual combat trait', () => {
  const weapon = { type: 'weapon', nombre: 'Escudo', dano: '1d6', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: {},
    activeTraits: ['bloqueo'],
  });

  expect(modifiedWeapon.rasgos).toContain('Bloqueo');
  expect(modifiedWeapon.manualCombatTraits).toEqual(['bloqueo']);
});

test('serializes Guardia as a manual combat trait', () => {
  const weapon = { type: 'weapon', nombre: 'Espada', dano: '1d8', rasgos: [] };

  const modifiedWeapon = applyModifiersToWeapon(weapon, {
    extraDice: {},
    activeTraits: ['guardia'],
  });

  expect(modifiedWeapon.rasgos).toContain('Guardia');
  expect(modifiedWeapon.manualCombatTraits).toEqual(['guardia']);
});
