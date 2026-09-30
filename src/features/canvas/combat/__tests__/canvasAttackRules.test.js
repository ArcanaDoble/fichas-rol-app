import {
  calculateCanvasAttackPressure,
  evaluateCanvasAttackRange,
  evaluateCanvasThrownRange,
  getCanvasDefensiveEquipment,
  getEnemyActiveDefenseEligibility,
  getUsableDefenseDice,
  getCanvasWeaponActionCost,
  parseWeaponDiceProfile,
  resolveCanvasAttackDamage,
  rollCanvasEnemyDefense,
  rollCanvasThreatDie,
  rollCanvasThreatDice,
  normalizeCanvasThreatSelection,
  getCanvasAttackThreatDice,
  getCanvasDefenseThreatDice,
  rollCriticalWeaponDice,
} from '../canvasAttackRules';

const gridConfig = { x: 0, y: 0, cellWidth: 50, cellHeight: 50 };
const token = (id, x, y, extra = {}) => ({
  id,
  x,
  y,
  width: 25,
  height: 25,
  profileType: 'rogueliteClass',
  controlledBy: [id],
  ...extra,
});

describe('Canvas Roguelite attack rules', () => {
  test('enemy active defense requires an available main action and defensive equipment', () => {
    const club = { id: 'club', type: 'weapon', dano: '2d8' };
    const enemy = { profileType: 'rogueliteEnemy', equippedItems: [club] };
    const participant = { side: 'enemies', enemyActions: [{ id: 'attack', status: 'available' }] };

    expect(getCanvasDefensiveEquipment(enemy)).toEqual([club]);
    expect(getEnemyActiveDefenseEligibility({ token: enemy, participant })).toMatchObject({ eligible: true });
    expect(getEnemyActiveDefenseEligibility({
      token: enemy,
      participant: { ...participant, enemyActions: [{ id: 'attack', status: 'spent' }] },
    })).toMatchObject({ eligible: false });
  });

  test('enemy defense preserves the legacy single custom Threat call', () => {
    const rolls = [0, 0.99, 0.5];
    const result = rollCanvasEnemyDefense({
      equipment: { dano: '2d8', offenseBase: 99 },
      threatMode: 'custom',
      customThreatSides: 6,
      random: () => rolls.shift(),
    });

    expect(result.defenseDice.map((die) => die.value)).toEqual([1, 8]);
    expect(result.threatUsed).toMatchObject({ die: 'd6', value: 4, source: 'custom' });
    expect(result.totalDefense).toBe(13);
  });

  test('Threat selection preserves repeated valid dice and explicit none overrides legacy options', () => {
    expect(normalizeCanvasThreatSelection({ threatSelection: { useStored: true, customDice: [6, 6, '12', 7, null] } }))
      .toEqual({ useStored: true, customDice: [6, 6, 12] });
    expect(normalizeCanvasThreatSelection({ threatSelection: { useStored: false, customDice: [] }, threatMode: 'custom', useThreat: true }))
      .toEqual({ useStored: false, customDice: [] });
    expect(normalizeCanvasThreatSelection({ useThreat: true })).toEqual({ useStored: true, customDice: [] });
    expect(normalizeCanvasThreatSelection({ threatMode: 'custom', customThreatSides: 7 })).toEqual({ useStored: false, customDice: [6] });
  });

  test('multiple Threat rolls preserve the reserve once, including zero, and distinguish repeated dice', () => {
    const random = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.99).mockReturnValueOnce(0.5);
    const dice = rollCanvasThreatDice({
      threatSelection: { useStored: true, customDice: [6, 6, 12] },
      storedThreatValue: 0, storedThreatDie: 'd8', random,
    });
    expect(dice.map(({ sides, value, source }) => ({ sides, value, source }))).toEqual([
      { sides: 8, value: 0, source: 'stored' },
      { sides: 6, value: 1, source: 'custom' },
      { sides: 6, value: 6, source: 'custom' },
      { sides: 12, value: 7, source: 'custom' },
    ]);
    expect(new Set(dice.map(die => die.id)).size).toBe(4);
    expect(random).toHaveBeenCalledTimes(3);
    expect(rollCanvasThreatDice({ threatSelection: { useStored: true, customDice: [] }, storedThreatValue: null })).toEqual([]);
  });

  test('enemy defense sums every Threat die separately from equipment and consumes only selected reserve', () => {
    const result = rollCanvasEnemyDefense({ equipment: { dano: '1d4' },
      threatSelection: { useStored: true, customDice: [6, 6] }, storedThreatValue: 0, storedThreatDie: 'd8', random: () => 0.5 });
    expect(result.defenseDice.map(die => die.value)).toEqual([3]);
    expect(result.defenseThreatDice.map(die => die.value)).toEqual([0, 4, 4]);
    expect(result).toMatchObject({ totalDefense: 11, consumedStoredThreat: true, threatUsed: null });
    expect(rollCanvasEnemyDefense({ equipment: { dano: '1d4' },
      threatSelection: { useStored: false, customDice: [6, 6] }, storedThreatValue: 6, random: () => 0.5 }))
      .toMatchObject({ totalDefense: 11, consumedStoredThreat: false });
    expect(calculateCanvasAttackPressure({ attacker: { profileType: 'rogueliteEnemy', offenseBase: 3 },
      weaponResults: [3], threatDice: result.defenseThreatDice, threatValue: 99 }).total).toBe(14);
    expect(calculateCanvasAttackPressure({ attacker: { profileType: 'rogueliteClass' },
      weaponResults: [3], threatDice: result.defenseThreatDice }).threatPressure).toBe(0);
  });

  test('Threat readers preserve authoritative arrays and separate both legacy single dice without inventing aggregate rolls', () => {
    const attack = { die: 'd8', value: 6, source: 'stored' };
    const defense = { die: 'd6', value: 4, source: 'custom' };
    expect(getCanvasAttackThreatDice({ id: 'old', threatUsed: attack })).toEqual([{ ...attack, id: 'attack-threat-old' }]);
    const legacy = { id: 'old', status: 'defense-rolled', attackThreatUsed: attack, threatUsed: defense };
    expect(getCanvasAttackThreatDice(legacy)).toEqual([{ ...attack, id: 'attack-threat-old' }]);
    expect(getCanvasDefenseThreatDice(legacy)).toEqual([{ ...defense, id: 'defense-threat-old' }]);
    expect(getCanvasAttackThreatDice({ ...legacy, attackThreatDice: [] })).toEqual([]);
    expect(getCanvasDefenseThreatDice({ ...legacy, defenseThreatDice: [] })).toEqual([]);
    expect(getCanvasAttackThreatDice({ pressure: { threatPressure: 12 } })).toEqual([]);
    expect(getCanvasDefenseThreatDice({ threatUsed: attack, status: 'awaiting-defense' })).toEqual([]);
  });

  test('resolves stored or custom Threat without treating an empty reserve as zero', () => {
    expect(rollCanvasThreatDie({
      threatMode: 'stored',
      storedThreatValue: null,
      storedThreatDie: 'd8',
    })).toBeNull();
    expect(rollCanvasThreatDie({
      threatMode: 'stored',
      storedThreatValue: 6,
      storedThreatDie: 'd8',
    })).toEqual({ die: 'd8', sides: 8, value: 6, source: 'stored' });
    expect(rollCanvasThreatDie({
      threatMode: 'custom',
      customThreatSides: 12,
      random: () => 0.5,
    })).toEqual({ die: 'd12', sides: 12, value: 7, source: 'custom' });
  });

  test('reads the complete weapon profile and Heavy requires two action dice', () => {
    const weapon = { dano: '2d8 Físico', actionCost: 1, rasgos: ['Pesada'] };
    expect(parseWeaponDiceProfile(weapon).map((die) => die.sides)).toEqual([8, 8]);
    expect(getCanvasWeaponActionCost(weapon, token('a', 0, 0))).toBe(2);
  });

  test('one-handed Touch can reach one cell but suppresses weapon traits', () => {
    const attacker = token('a', 0, 0);
    const target = token('b', 50, 0, { controlledBy: ['b'] });
    const result = evaluateCanvasAttackRange({
      attacker,
      target,
      weapon: { alcance: 'Toque', handsRequired: 1 },
      items: [attacker, target],
      gridConfig,
    });
    expect(result).toEqual(expect.objectContaining({ legal: true, distance: 1, suppressTraits: true }));
  });

  test('a two-handed Touch weapon cannot attack from one cell away', () => {
    const attacker = token('a', 0, 0);
    const target = token('b', 50, 0, { controlledBy: ['b'] });
    expect(evaluateCanvasAttackRange({
      attacker,
      target,
      weapon: { alcance: 'Toque', handsRequired: 2 },
      items: [attacker, target],
      gridConfig,
    }).legal).toBe(false);
  });

  test('an attacker in a Duel cannot use Intermedio', () => {
    const attacker = token('a', 0, 0);
    const duelist = token('duelist', 0, 0, { controlledBy: ['enemy'] });
    const target = token('b', 100, 0, { controlledBy: ['enemy'] });
    const result = evaluateCanvasAttackRange({
      attacker,
      target,
      weapon: { alcance: 'Intermedio' },
      items: [attacker, duelist, target],
      gridConfig,
    });
    expect(result.legal).toBe(false);
    expect(result.reason).toMatch(/Duelo/);
  });

  test('an allied token is not a legal attack target', () => {
    const attacker = token('a', 0, 0, { teamId: 'heroes' });
    const target = token('b', 50, 0, { teamId: 'heroes' });
    expect(evaluateCanvasAttackRange({
      attacker,
      target,
      weapon: { alcance: 'Cercano' },
      items: [attacker, target],
      gridConfig,
    })).toEqual(expect.objectContaining({ legal: false, reason: expect.stringMatching(/enemiga/) }));
  });

  test('Arrojadiza reaches by the highest committed die or enemy Base ofensiva, then subtracts distance once', () => {
    const attacker = token('a', 0, 0);
    const target = token('b', 150, 0, { controlledBy: ['b'] });
    const thrownWeapon = { alcance: 'Cercano', rasgos: ['Arrojadiza'], dano: 'd4' };
    expect(evaluateCanvasAttackRange({ attacker, target, weapon: thrownWeapon, items: [attacker, target], gridConfig }))
      .toMatchObject({ legal: true, distance: 3 });
    expect(evaluateCanvasThrownRange({ attacker, weapon: thrownWeapon, actionDice: [{ value: 2 }, { value: 3 }], distance: 3 }))
      .toMatchObject({ legal: true, maxRange: 3 });
    expect(evaluateCanvasThrownRange({ attacker, weapon: thrownWeapon, actionDice: [{ value: 1 }, { value: 2 }], distance: 3 }))
      .toMatchObject({ legal: false, maxRange: 2 });
    expect(evaluateCanvasThrownRange({ attacker: { profileType: 'rogueliteEnemy', offenseBase: 4 },
      weapon: thrownWeapon, distance: 5 })).toMatchObject({ legal: false, maxRange: 4 });
    expect(calculateCanvasAttackPressure({ attacker, actionDice: [{ value: 2 }, { value: 3 }],
      weaponResults: [4], distance: 3, weapon: thrownWeapon }).total).toBe(6);
  });

  test('each natural maximum starts its own chained critical roll', () => {
    const profile = parseWeaponDiceProfile({ dano: '2d8' });
    const rolls = [0.999, 0.25, 0.5];
    expect(rollCriticalWeaponDice(
      profile,
      [8, 8],
      { rasgos: ['Crítico'] },
      false,
      () => rolls.shift(),
    )).toEqual([
      { sides: 8, value: 8, sourceIndex: 0 },
      { sides: 8, value: 3, sourceIndex: 0 },
      { sides: 8, value: 5, sourceIndex: 1 },
    ]);
    expect(rollCriticalWeaponDice(profile, [8, 8], { rasgos: ['Crítico'] }, true)).toEqual([]);
  });

  test('only reserved action dice can be spent on active defense', () => {
    expect(getUsableDefenseDice({ actionDice: [
      { id: 'a', status: 'available' },
      { id: 'b', status: 'committed' },
      { id: 'c', status: 'spent' },
    ] })).toEqual([{ id: 'b', status: 'committed' }]);
  });

  test('action dice, weapon dice and defense resolve exact CD multiples', () => {
    const pressure = calculateCanvasAttackPressure({
      attacker: token('a', 0, 0),
      actionDice: [{ value: 5 }],
      weaponResults: [7],
      weapon: {},
    });
    expect(pressure.total).toBe(12);
    expect(resolveCanvasAttackDamage({
      attackPressure: pressure.total,
      defenseDice: [],
      target: { stats: { vida: { current: 5 }, cd: { current: 6 } } },
      weapon: {},
    })).toEqual(expect.objectContaining({ lifeLost: 2, nextLife: 3 }));
  });

  test('enemy pressure uses its offensive base and current threat die', () => {
    expect(calculateCanvasAttackPressure({
      attacker: { profileType: 'rogueliteEnemy', offenseBase: 4 },
      threatValue: 3,
      weaponResults: [5],
      weapon: {},
    })).toEqual(expect.objectContaining({ actionPressure: 4, threatPressure: 3, total: 12 }));
  });

  test('defense can nullify pressure and creates surplus', () => {
    expect(resolveCanvasAttackDamage({
      attackPressure: 7,
      defenseDice: [{ value: 4 }, { value: 6 }],
      target: { stats: { vida: { current: 4 }, cd: { current: 5 } } },
      weapon: {},
    })).toEqual(expect.objectContaining({ finalPressure: 0, surplus: 3, lifeLost: 0 }));
  });
});
