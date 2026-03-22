import { buildCombatEffectVisuals } from '../FloatingCombatEffects';

describe('buildCombatEffectVisuals', () => {
  it('escalona multiples bloques perdidos en flyoffs separados', () => {
    const visuals = buildCombatEffectVisuals({
      effect: {
        sourceEventId: 'combat-event-1',
        attackerId: 'attacker-1',
        targetId: 'target-1',
        reactionType: 'recibir',
        finalDamage: 7,
        counterDamage: 0,
        blocksLost: {
          postura: 1,
          armadura: 0,
          vida: 1,
        },
      },
      targetPos: {
        x: 120,
        y: 220,
        width: 80,
        height: 80,
      },
      attackerPos: null,
    });

    expect(visuals.highlights).toHaveLength(1);
    expect(visuals.flyoffs).toHaveLength(2);
    expect(visuals.flyoffs[0]).toMatchObject({
      type: 'damage',
      text: '-1',
      label: 'Postura',
      color: '#34d399',
      x: 146,
      y: 210,
      delay: 0,
    });
    expect(visuals.flyoffs[1]).toMatchObject({
      type: 'damage',
      text: '-1',
      label: 'Vida',
      color: '#f87171',
      x: 174,
      y: 204,
      delay: 1.5,
    });
  });
});
