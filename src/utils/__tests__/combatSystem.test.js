import { normalizeCombatTraitId, rollAttack } from '../combatSystem';

describe('rollAttack damage sources', () => {
  it('marks only base weapon dice as ballistic eligible', () => {
    const result = rollAttack(
      {
        nombre: 'Arcabuz',
        dano: '1d8',
        extraDamageString: '1d6',
        rasgos: ['Destreza'],
      },
      { destreza: 'd4' }
    );

    const weaponDetail = result.details.find((detail) => detail.damageSource === 'weapon');
    const modifierDetail = result.details.find((detail) => detail.damageSource === 'modifier');
    const attributeDetail = result.details.find((detail) => detail.matchedAttr === 'destreza');

    expect(weaponDetail?.ballisticEligible).toBe(true);
    expect(modifierDetail?.ballisticEligible).toBe(false);
    expect(attributeDetail?.ballisticEligible).toBeUndefined();
  });
});

describe('normalizeCombatTraitId', () => {
  it('normalizes Bloquear into Bloqueo', () => {
    expect(normalizeCombatTraitId('Bloquear')).toBe('bloqueo');
  });
});
