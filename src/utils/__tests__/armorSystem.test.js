import {
  applyNegatedTraitsToItem,
  getArmorProtection,
  normalizeCombatTrait,
} from '../armorSystem';

describe('armor trait protection', () => {
  it('normalizes common combat trait aliases for armor protection', () => {
    expect(normalizeCombatTrait('Derribado')).toBe('derribo');
    expect(normalizeCombatTrait('Perforante')).toBe('perforante');
    expect(normalizeCombatTrait('Penetrante')).toBe('perforante');
    expect(normalizeCombatTrait('Ralentizar')).toBe('ralentizado');
    expect(normalizeCombatTrait('Empujar')).toBe('empuje');
    expect(normalizeCombatTrait('Sin_guardia')).toBe('sin guardia');
  });

  it('negates matching incoming traits while armor has blocks', () => {
    const defender = {
      stats: {
        armadura: { current: 2, max: 2 },
      },
      equippedItems: [
        {
          nombre: 'Cota ritual',
          type: 'armor',
          rasgos: ['Derribado', 'Ralentizado', 'Empuje', 'Crítico'],
        },
      ],
    };
    const weapon = {
      nombre: 'Martillo',
      rasgos: ['Derribo', 'Ralentizar', 'Empujar', 'Crítico', 'Sangrado'],
    };

    const protection = getArmorProtection(defender, weapon);
    const effectiveWeapon = applyNegatedTraitsToItem(weapon, protection.negatedTraits);

    expect(protection.negatedTraits).toEqual(['Derribo', 'Ralentizar', 'Empujar', 'Crítico']);
    expect(effectiveWeapon.rasgos).toEqual(['Sangrado']);
  });

  it('does not negate traits once armor has no blocks', () => {
    const defender = {
      stats: {
        armadura: { current: 0, max: 2 },
      },
      equippedItems: [
        {
          nombre: 'Cota rota',
          type: 'armor',
          rasgos: ['Ralentizado'],
        },
      ],
    };
    const weapon = {
      nombre: 'Maza',
      rasgos: ['Ralentizado'],
    };

    expect(getArmorProtection(defender, weapon).negatedTraits).toEqual([]);
  });
});
