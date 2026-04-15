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

  it('muestra Penetrante como flyoff propio sobre la capa de armadura afectada', () => {
    const visuals = buildCombatEffectVisuals({
      effect: {
        sourceEventId: 'combat-event-penetrante-armadura',
        attackerId: 'attacker-1',
        targetId: 'target-1',
        reactionType: 'recibir',
        finalDamage: 7,
        counterDamage: 0,
        blocksLost: {
          postura: 1,
          armadura: 1,
          vida: 0,
        },
        traitEffectsApplied: {
          target: [
            {
              id: 'penetrante',
              label: 'Penetrante',
              layer: 'armadura',
              blocks: 1,
            },
          ],
          attacker: [],
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

    const damageFlyoffs = visuals.flyoffs.filter((flyoff) => flyoff.type === 'damage');
    const penetranteFlyoff = visuals.flyoffs.find((flyoff) => flyoff.type === 'trait');

    expect(damageFlyoffs).toHaveLength(1);
    expect(damageFlyoffs[0]).toMatchObject({
      text: '-1',
      label: 'Postura',
      color: '#34d399',
    });
    expect(penetranteFlyoff).toMatchObject({
      text: '-1',
      label: 'Penetrante · Armadura',
      color: '#f59e0b',
      x: expect.any(Number),
      y: 192,
      delay: 1.6,
    });
  });

  it('muestra Hendir como flyoff propio cuando postura abre daño automatico a armadura', () => {
    const visuals = buildCombatEffectVisuals({
      effect: {
        sourceEventId: 'combat-event-hendir-postura',
        attackerId: 'attacker-1',
        targetId: 'target-1',
        reactionType: 'recibir',
        finalDamage: 5,
        counterDamage: 0,
        blocksLost: {
          postura: 1,
          armadura: 1,
          vida: 0,
        },
        traitEffectsApplied: {
          target: [
            {
              id: 'hendir',
              label: 'Hendir',
              layer: 'armadura',
              blocks: 1,
            },
          ],
          attacker: [],
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

    const damageFlyoffs = visuals.flyoffs.filter((flyoff) => flyoff.type === 'damage');
    const hendirFlyoff = visuals.flyoffs.find((flyoff) => flyoff.type === 'trait');

    expect(damageFlyoffs).toHaveLength(1);
    expect(damageFlyoffs[0]).toMatchObject({
      text: '-1',
      label: 'Postura',
      color: '#34d399',
    });
    expect(hendirFlyoff).toMatchObject({
      text: '-1',
      label: 'Hendir · Armadura',
      color: '#cbd5e1',
      y: 192,
      delay: 1.6,
    });
  });

  it('muestra Penetrante de contraataque sobre el atacante y distingue vida', () => {
    const visuals = buildCombatEffectVisuals({
      effect: {
        sourceEventId: 'combat-event-penetrante-vida-counter',
        attackerId: 'attacker-1',
        targetId: 'target-1',
        reactionType: 'parar',
        finalDamage: 0,
        counterDamage: 6,
        blocksLost: {
          postura: 0,
          armadura: 0,
          vida: 2,
        },
        traitEffectsApplied: {
          target: [],
          attacker: [
            {
              id: 'penetrante',
              label: 'Penetrante',
              layer: 'vida',
              blocks: 1,
            },
          ],
        },
      },
      targetPos: {
        x: 120,
        y: 220,
        width: 80,
        height: 80,
      },
      attackerPos: {
        x: 300,
        y: 180,
        width: 100,
        height: 100,
      },
    });

    const damageFlyoffs = visuals.flyoffs.filter((flyoff) => flyoff.type === 'damage');
    const penetranteFlyoff = visuals.flyoffs.find((flyoff) => flyoff.type === 'trait');

    expect(damageFlyoffs).toHaveLength(1);
    expect(damageFlyoffs[0]).toMatchObject({
      text: '-1',
      label: 'Vida',
      color: '#f87171',
      x: 350,
      y: 170,
      delay: 1.5,
    });
    expect(penetranteFlyoff).toMatchObject({
      text: '-1',
      label: 'Penetrante · Vida',
      color: '#fb7185',
      y: 152,
      delay: 3.1,
    });
    expect(penetranteFlyoff.x).toBeGreaterThanOrEqual(334);
    expect(penetranteFlyoff.x).toBeLessThanOrEqual(366);
  });

  it('muestra Ralentizado solo como aumento de velocidad, sin estado final', () => {
    const visuals = buildCombatEffectVisuals({
      effect: {
        sourceEventId: 'combat-event-ralentizado',
        attackerId: 'attacker-1',
        targetId: 'target-1',
        reactionType: 'recibir',
        finalDamage: 5,
        counterDamage: 0,
        blocksLost: {
          postura: 1,
          armadura: 0,
          vida: 0,
        },
        speedEffectsApplied: {
          target: [
            {
              id: 'ralentizado',
              label: 'Ralentizado',
              delta: 1,
            },
          ],
          attacker: [],
        },
        statusEffectsApplied: {
          target: [
            {
              id: 'ralentizado',
              label: 'Ralentizado',
              hex: '#fcd34d',
            },
          ],
          attacker: [],
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

    const speedFlyoff = visuals.flyoffs.find((flyoff) => flyoff.type === 'speed');
    const stateFlyoff = visuals.flyoffs.find((flyoff) => flyoff.type === 'state');

    expect(speedFlyoff).toMatchObject({
      text: '+1 Velocidad',
      label: 'Ralentizado',
      color: '#fcd34d',
      y: 166,
      delay: 1.6,
    });
    expect(stateFlyoff).toBeUndefined();
  });

  it('muestra Empuje como flyoff propio sin estado final', () => {
    const visuals = buildCombatEffectVisuals({
      effect: {
        sourceEventId: 'combat-event-empuje',
        attackerId: 'attacker-1',
        targetId: 'target-1',
        reactionType: 'recibir',
        finalDamage: 5,
        counterDamage: 0,
        blocksLost: {
          postura: 1,
          armadura: 0,
          vida: 0,
        },
        pushEffectsApplied: {
          target: [
            {
              id: 'empuje',
              label: 'Empuje',
              applied: true,
              sharedMode: 'duelo',
              hex: '#38bdf8',
            },
          ],
          attacker: [],
        },
        statusEffectsApplied: {
          target: [
            {
              id: 'empuje',
              label: 'Empuje',
              hex: '#38bdf8',
            },
          ],
          attacker: [],
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

    const pushFlyoff = visuals.flyoffs.find((flyoff) => flyoff.type === 'push');
    const stateFlyoff = visuals.flyoffs.find((flyoff) => flyoff.type === 'state');

    expect(pushFlyoff).toMatchObject({
      text: '¡Empuje!',
      label: 'Duelo',
      color: '#38bdf8',
      y: 154,
      delay: 1.6,
    });
    expect(stateFlyoff).toBeUndefined();
  });

  it('muestra el aumento de velocidad por Ralentizado sobre el atacante si viene de contraataque', () => {
    const visuals = buildCombatEffectVisuals({
      effect: {
        sourceEventId: 'combat-event-ralentizado-counter',
        attackerId: 'attacker-1',
        targetId: 'target-1',
        reactionType: 'parar',
        finalDamage: 0,
        counterDamage: 6,
        blocksLost: {
          postura: 0,
          armadura: 0,
          vida: 1,
        },
        speedEffectsApplied: {
          target: [],
          attacker: [
            {
              id: 'ralentizado',
              label: 'Ralentizado',
              delta: 1,
            },
          ],
        },
      },
      targetPos: {
        x: 120,
        y: 220,
        width: 80,
        height: 80,
      },
      attackerPos: {
        x: 300,
        y: 180,
        width: 100,
        height: 100,
      },
    });

    const speedFlyoff = visuals.flyoffs.find((flyoff) => flyoff.type === 'speed');

    expect(speedFlyoff).toMatchObject({
      text: '+1 Velocidad',
      label: 'Ralentizado',
      color: '#fcd34d',
      y: 126,
      delay: 3.1,
    });
    expect(speedFlyoff.x).toBeGreaterThanOrEqual(336);
    expect(speedFlyoff.x).toBeLessThanOrEqual(364);
  });
});
