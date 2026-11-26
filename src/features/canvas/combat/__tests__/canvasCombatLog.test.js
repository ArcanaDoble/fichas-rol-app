import { buildCanvasCombatLog } from '../canvasCombatLog';

const args = {
  pending: {
    id: 'attack', attackerId: 'hero', targetId: 'enemy', weaponName: 'Mandoble',
    actionDieIds: ['action'], actionDice: [{ id: 'action', die: 'd8', value: 6 }],
    weaponResults: [5, 1], weaponDiceProfile: [{ sides: 8 }, { sides: 8 }],
    criticalResults: [{ sides: 8, value: 2 }],
    pressure: { total: 14 }, weapon: { traits: ['Crítico'] },
    status: 'defense-rolled', defenseItem: { name: 'Estilete', traits: ['Agudeza'] },
  },
  attacker: { name: 'Bárbaro', status: ['oculto'] },
  target: { name: 'Duende', stats: { cd: { current: 5 } } },
  updatedAttacker: { status: [] },
  defenseDice: [{ id: 'defense', sides: 4, value: 3 }],
  resolution: { defense: 3, finalPressure: 11, lifeLost: 2, surplus: 0, effectiveCd: 5 },
  scenarioId: 'scene', now: 123,
};

test('temporary Life is recorded separately for the target and the counterattack', () => {
  const entry = buildCanvasCombatLog({ ...args,
    resolution: { ...args.resolution, lifeLost: 3, temporaryLifeLost: 2, normalLifeLost: 1 },
    counterResolution: { lifeLost: 1, temporaryLifeLost: 1, normalLifeLost: 0, finalPressure: 5 },
  });
  expect(entry.blocksLost).toMatchObject({ vida: 1, vidaTemporal: 2 });
  expect(entry.attackerBlocksLost).toMatchObject({ vida: 0, vidaTemporal: 1 });
});

test('records real rolls, equipment, spending and life loss in the original log format without CD', () => {
  const entry = buildCanvasCombatLog(args);
  expect(entry.attackerDice.map(die => [die.faces, die.value])).toEqual([[8, 6], [8, 5], [8, 1], [8, 2]]);
  expect(entry.attackerDice[3].critical).toBe(true);
  expect(entry.defenderWeapon).toBe('Estilete');
  expect(entry.defenderTotal).toBe(3);
  expect(entry.blocksLost.vida).toBe(2);
  expect(entry.attackTotal).toBe(14);
  expect(entry.resourcesSpent).toHaveLength(2);
  expect(entry.statusEffectsRemoved.attacker).toEqual(['oculto']);
  expect(entry).not.toHaveProperty('effectiveCd');
  expect(entry).not.toHaveProperty('target');
  expect(JSON.stringify(entry)).not.toContain('undefined');
});

test('an area spell records its shared casting costs once while every target keeps its own defense', () => {
  const pending = { ...args.pending, spellId: 'fireball', blastId: 'cast', manaSpent: 1 };
  const first = buildCanvasCombatLog({ ...args, pending: { ...pending, blastIndex: 0 } });
  const second = buildCanvasCombatLog({ ...args, pending: { ...pending, blastIndex: 1 } });
  expect(first.resourcesSpent.filter(resource => resource.side === 'attacker').map(resource => resource.label))
    .toEqual(['1 copia preparada', '1 de Maná', '1 dado(s) de acción']);
  expect(second.resourcesSpent.filter(resource => resource.side === 'attacker')).toEqual([]);
  expect(second.resourcesSpent.filter(resource => resource.side === 'target')).toEqual([{ side: 'target', label: 'Acción principal' }]);
  expect(second.attackerDice).toEqual(first.attackerDice);
});

test('keeps attacker and defender threat rolls separate after enemy defense', () => {
  const entry = buildCanvasCombatLog({ ...args, pending: { ...args.pending,
    attackThreatUsed: { value: 6, sides: 8, source: 'stored' }, usedThreat: true,
    threatUsed: { id: 'threat-defense', value: 2, sides: 4, source: 'stored' },
  }, defenseDice: [{ id: 'threat-defense', value: 2, sides: 4 }] });
  expect(entry.attackerDice.at(-1)).toMatchObject({ value: 6, faces: 8, source: 'Amenaza' });
  expect(entry.defenderDice[0]).toMatchObject({ value: 2, faces: 4, source: 'Amenaza' });
  expect(entry.resourcesSpent.filter(resource => resource.label === 'Reserva de Amenaza')).toHaveLength(2);
});

test('records counterattack weapon and actual attacker life loss without inventing weapon rolls', () => {
  const entry = buildCanvasCombatLog({ ...args,
    resolution: { defense: 18, finalPressure: 0, lifeLost: 0, surplus: 4 },
    counterResolution: { finalPressure: 4, lifeLost: 1 },
    counterWeapon: { name: 'Lanza' }, excessChoice: 'counterattack',
  });
  expect(entry.counterWeaponName).toBe('Lanza');
  expect(entry.counterDamage).toBe(4);
  expect(entry.attackerBlocksLost.vida).toBe(1);
  expect(entry.excessChoice).toBe('counterattack');
});


test('combined logs distinguish each weapon copy, chained criticals and additional modifiers', () => {
  const entry = buildCanvasCombatLog({ ...args, pending: { ...args.pending,
    attackMode: 'dual',
    attackParts: ['left', 'right'].map(weaponId => ({ weaponId, weapon: { name: 'Daga' }, traits: ['critico'] })),
    weaponDiceProfile: [{ id: 'left:0', sides: 4, weaponId: 'left' }, { id: 'right:0', sides: 4, weaponId: 'right' }, { id: 'modifier-0', sides: 6, source: 'Modificador' }],
    weaponResults: [4, 3, 2], criticalResults: [{ sourceIndex: 0, sides: 4, value: 4 }, { sourceIndex: 0, sides: 4, value: 1 }],
  } });
  expect(new Set(entry.attackerDice.map(die => die.id)).size).toBe(entry.attackerDice.length);
  expect(entry.attackWeapons[0].diceIds).toEqual(['left:0', 'critical-0', 'critical-1']);
  expect(entry.attackWeapons[1].diceIds).toEqual(['right:0']);
  expect(entry.attackerDice.find(die => die.id === 'modifier-0').source).toBe('Modificador');
});

test('records every repeated Threat die and spends each side reserve only once', () => {
  const attackThreatDice = [
    { id: 'attack-reserve', sides: 8, value: 0, source: 'stored' },
    { id: 'attack-threat-1', sides: 4, value: 3, source: 'custom' },
    { id: 'attack-threat-2', sides: 4, value: 3, source: 'custom' },
  ];
  const defenseThreatDice = [
    { id: 'defense-reserve', sides: 6, value: 0, source: 'stored' },
    { id: 'defense-threat-1', sides: 8, value: 7, source: 'custom' },
    { id: 'defense-threat-2', sides: 8, value: 7, source: 'custom' },
  ];
  const entry = buildCanvasCombatLog({ ...args,
    pending: { ...args.pending, attackThreatDice, defenseThreatDice,
      attackThreatUsed: { sides: 4, value: 6, source: 'custom' },
      threatUsed: { id: 'old-summary', sides: 8, value: 14, source: 'stored' },
    },
    defenseDice: [...args.defenseDice, ...defenseThreatDice],
  });
  expect(entry.attackerDice.filter(die => die.source === 'Amenaza').map(die => [die.id, die.faces, die.value])).toEqual([
    ['attack-reserve', 8, 0], ['attack-threat-1', 4, 3], ['attack-threat-2', 4, 3],
  ]);
  expect(entry.defenderDice.filter(die => die.source === 'Amenaza').map(die => [die.id, die.faces, die.value])).toEqual([
    ['defense-reserve', 6, 0], ['defense-threat-1', 8, 7], ['defense-threat-2', 8, 7],
  ]);
  expect(entry.defenderDice).toHaveLength(4);
  expect(entry.resourcesSpent.filter(resource => resource.label === 'Reserva de Amenaza')).toEqual([
    { side: 'attacker', label: 'Reserva de Amenaza' },
    { side: 'target', label: 'Reserva de Amenaza' },
  ]);
  expect(JSON.stringify(entry)).not.toMatch(/effectiveCd|"cd"|old-summary/);
});

test('authoritative empty Threat lists do not revive legacy rolls or reserve spending', () => {
  const entry = buildCanvasCombatLog({ ...args, pending: { ...args.pending,
    attackThreatDice: [], defenseThreatDice: [], usedThreat: true,
    attackThreatUsed: { sides: 8, value: 6, source: 'stored' },
    threatUsed: { sides: 4, value: 2, source: 'stored' },
  } });
  expect(entry.attackerDice.some(die => die.source === 'Amenaza')).toBe(false);
  expect(entry.defenderDice.some(die => die.source === 'Amenaza')).toBe(false);
  expect(entry.resourcesSpent.some(resource => resource.label === 'Reserva de Amenaza')).toBe(false);
});

test('dual defense records each weapon copy and spends a single main action', () => {
  const weapons = [
    { id: 'same-catalog', runItemId: 'first-copy', name: 'Daga', traits: ['Agudeza'] },
    { id: 'same-catalog', runItemId: 'second-copy', name: 'Daga', traits: ['Agudeza', 'Destreza'] },
  ];
  const entry = buildCanvasCombatLog({ ...args,
    pending: { ...args.pending, defenseItems: weapons, defenseItem: weapons[0] },
    defenseDice: [
      { id: 'defense-one', weaponId: 'first-copy', sides: 4, value: 2 },
      { id: 'defense-two', weaponId: 'second-copy', sides: 4, value: 2 },
    ],
  });
  expect(entry.defenderWeapon).toBe('Daga + Daga');
  expect(entry.defenderWeapons.map(item => [item.id, item.diceIds])).toEqual([
    ['first-copy', ['defense-one']], ['second-copy', ['defense-two']],
  ]);
  expect(entry.defenderTraits).toEqual(['Agudeza', 'Destreza']);
  expect(entry.resourcesSpent.filter(resource => resource.side === 'target')).toEqual([{ side: 'target', label: 'Acción principal' }]);
});

test('shield-only protection is public as a name without spending, dice or secret CD', () => {
  const entry = buildCanvasCombatLog({ ...args,
    pending: { ...args.pending, status: 'awaiting-defense', defenseItems: [], defenseItem: null,
      defenseShield: { id: 'shield', runItemId: 'shield-copy', name: 'Escudo', dano: '1d4', defenseClass: 1, secret: 'hidden' },
      defenseCdBonus: 1,
    },
    defenseDice: [], resolution: { defense: 0, finalPressure: 11, lifeLost: 1, effectiveCd: 6, baseCd: 5, shieldBonus: 1 },
  });
  expect(entry.defenderShield).toEqual({ id: 'shield-copy', name: 'Escudo' });
  expect(entry.defenderDice).toEqual([]);
  expect(entry.defenderWeapon).toBeNull();
  expect(entry.reactionType).toBe('recibir');
  expect(entry.resourcesSpent.filter(resource => resource.side === 'target')).toEqual([]);
  expect(JSON.stringify(entry)).not.toMatch(/defenseCdBonus|defenseClass|baseCd|effectiveCd|shieldBonus|hidden/);
});
