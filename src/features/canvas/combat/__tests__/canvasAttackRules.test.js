import {
  calculateCanvasAttackPressure,
  evaluateCanvasAttackRange,
  getCanvasWeaponActionCost,
  getCriticalDieSides,
  parseWeaponDiceProfile,
  resolveCanvasAttackDamage,
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

  test('critical only adds one extra die when the trait is active', () => {
    const profile = parseWeaponDiceProfile({ dano: '2d8' });
    expect(getCriticalDieSides(profile, [8, 8], { rasgos: ['Crítico'] }, false)).toBe(8);
    expect(getCriticalDieSides(profile, [8, 8], { rasgos: ['Crítico'] }, true)).toBeNull();
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
