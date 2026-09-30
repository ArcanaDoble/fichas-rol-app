import { combineCanvasWeapons, resolveCanvasAttackSelection } from '../canvasAttackSelection';
import {
  calculateCanvasAttackPressure,
  getCanvasWeaponActionCost,
  getCriticalDieSides,
  resolveCanvasAttackDamage,
  rollCriticalWeaponDice,
} from '../canvasAttackRules';

const dagger = { id: 'dagger', name: 'Daga', type: 'weapon', dano: 'd4', alcance: 'Cercano', handsRequired: 1, canvasSlot: 'mainHand' };
const rapier = { id: 'rapier', name: 'Estoque', type: 'weapon', dano: 'd6', alcance: 'Cercano', handsRequired: 1, canvasSlot: 'offHand' };
const target = { id: 'target', controlledBy: ['Other'], x: 50, y: 0, width: 20, height: 20, stats: { cd: { current: 6 }, vida: { current: 8 } } };
const gridConfig = { cellWidth: 50, cellHeight: 50 };
const createAttack = (profileType = 'rogueliteClass', weapons = [dagger, rapier], defender = target, modifiers = {}) => {
  const attacker = {
    id: 'attacker', profileType, controlledBy: ['Ada'], x: 0, y: 0, width: 20, height: 20,
    equippedItems: weapons, inventory: weapons, offenseBase: 3,
  };
  const selection = {
    ...(weapons.length === 1 ? weapons[0] : combineCanvasWeapons(weapons, profileType === 'rogueliteEnemy' ? 'multiweapon' : 'dual')),
    ...modifiers,
  };
  return { attacker, selection, result: resolveCanvasAttackSelection({ attacker, target: defender, selection, gridConfig, items: [attacker, defender] }) };
};

test.each([
  ['rogueliteClass', [dagger]], ['rogueliteClass', [dagger, rapier]],
  ['rogueliteEnemy', [dagger]], ['rogueliteEnemy', [dagger, rapier]],
])('manual modifiers are applied once and survive resolving again for %s with %j', (profileType, weapons) => {
  const modifiers = { extraDamageString: '2d6', manualCombatTraits: ['Crítico', 'CRITICO', 'Perforación', 'Perforante'] };
  const { attacker, result } = createAttack(profileType, weapons, target, modifiers);
  expect(result.legal).toBe(true);
  expect(result.weapon.manualCombatTraits).toEqual(['critico', 'perforante']);
  expect(result.weapon.rasgos).toEqual(['critico', 'perforante']);
  expect(result.parts.map(part => part.profile.length)).toEqual(weapons.map(() => 1));
  expect(result.parts.every(part => part.traits.includes('critico') && part.traits.includes('perforante'))).toBe(true);
  const extraDice = result.profile.filter(die => die.source === 'Modificador');
  expect(extraDice).toEqual([
    expect.objectContaining({ id: 'modifier-0', sides: 6, noCritical: true }),
    expect.objectContaining({ id: 'modifier-1', sides: 6, noCritical: true }),
  ]);
  expect(new Set(result.profile.map(die => die.id)).size).toBe(result.profile.length);
  const again = resolveCanvasAttackSelection({ attacker, target, selection: result.weapon, gridConfig, items: [attacker, target] });
  expect(again.profile).toEqual(result.profile);
  expect(again.parts).toEqual(result.parts);
  expect(getCanvasWeaponActionCost(result.weapon, attacker)).toBe(profileType === 'rogueliteEnemy' ? 0 : weapons.length);
  expect(dagger).not.toHaveProperty('manualCombatTraits');
  expect(dagger).not.toHaveProperty('extraDamageString');
});

test('manual selection only allows Critical and Perforation, while native equipment traits remain', () => {
  const native = { ...dagger, rasgos: ['Crítico', 'Empuje'] };
  const { result } = createAttack('rogueliteClass', [native], target, {
    manualCombatTraits: ['Empuje', 'Pesada', 'Perforación', 'penetrante', 'Crítico'],
  });
  expect(result.weapon.manualCombatTraits).toEqual(['perforante', 'critico']);
  expect(result.weapon.rasgos).toEqual(['critico', 'empuje', 'perforante']);
  const cleared = createAttack('rogueliteClass', [native], target, { manualCombatTraits: [] }).result;
  expect(cleared.weapon.rasgos).toEqual(['critico', 'empuje']);
});

test('Critical is per weapon, and extra modifier dice keep their existing exclusion', () => {
  const natural = createAttack('rogueliteClass', [{ ...dagger, rasgos: ['Crítico'] }, rapier], target, { extraDamageString: '2d6' }).result;
  expect(natural.profile.map(die => die.noCritical)).toEqual([false, true, true, true]);
  expect(rollCriticalWeaponDice(natural.profile, [4, 6, 6, 6], natural.weapon, false, () => 0))
    .toEqual([{ sides: 4, value: 1, sourceIndex: 0 }]);
  expect(getCriticalDieSides(natural.profile, [3, 6, 6, 6], natural.weapon)).toBeNull();

  const { attacker, result } = createAttack('rogueliteClass', [dagger, rapier], target, { extraDamageString: '2d6', manualCombatTraits: ['Crítico'] });
  const criticalResults = rollCriticalWeaponDice(result.profile, [4, 6, 6, 6], result.weapon, false, () => 0);
  expect(criticalResults).toEqual([{ sides: 4, value: 1, sourceIndex: 0 }, { sides: 6, value: 1, sourceIndex: 1 }]);
  expect(calculateCanvasAttackPressure({ attacker, weapon: result.weapon, actionDice: [{ value: 3 }, { value: 2 }], weaponResults: [4, 6, 6, 6], criticalResults }))
    .toMatchObject({ actionPressure: 5, weaponPressure: 24, total: 29 });
});

test('manual traits obey range suppression and proficiency instead of bypassing them', () => {
  const modifiers = { manualCombatTraits: ['Crítico', 'Perforante'] };
  const sameCell = createAttack('rogueliteClass', [dagger], { ...target, x: 0 }, modifiers).result;
  expect(sameCell.legal).toBe(true);
  expect(sameCell.weapon.manualCombatTraits).toEqual(['critico', 'perforante']);
  expect(sameCell.weapon.rasgos).toEqual([]);
  expect(sameCell.profile[0].noCritical).toBe(true);
  const { attacker, selection } = createAttack('rogueliteClass', [{ ...dagger, competence: 'Marcial' }], target, modifiers);
  const untrained = { ...attacker, proficiencies: { weapons: { martial: false } } };
  const result = resolveCanvasAttackSelection({ attacker: untrained, target, selection, gridConfig, items: [untrained, target] });
  expect(result.legal).toBe(true);
  expect(result.parts[0].traits).toEqual([]);
  expect(result.weapon.rasgos).toEqual([]);
});

test('armor neutralizes manual Perforation and it otherwise lowers CD only once across both weapons', () => {
  const modifiers = { manualCombatTraits: ['Perforante', 'Perforación'] };
  const result = createAttack('rogueliteClass', [dagger, { ...rapier, rasgos: ['Perforante'] }], target, modifiers).result;
  expect(resolveCanvasAttackDamage({ attackPressure: 10, target, weapon: result.weapon }))
    .toMatchObject({ baseCd: 6, effectiveCd: 5, lifeLost: 2 });
  const protectedTarget = { ...target, equipmentLoadout: { body: { type: 'armor', name: 'Escamas' } } };
  const protectedAttack = createAttack('rogueliteClass', [dagger, rapier], protectedTarget, modifiers).result;
  expect(protectedAttack.weapon.manualCombatTraits).toEqual(['perforante']);
  expect(protectedAttack.weapon.rasgos).toEqual([]);
  expect(resolveCanvasAttackDamage({ attackPressure: 10, target: protectedTarget, weapon: protectedAttack.weapon }))
    .toMatchObject({ effectiveCd: 6, lifeLost: 1 });
});

test('armor can suppress Critical for one weapon without removing it from the other weapon', () => {
  const hammer = { ...rapier, name: 'Martillo', damageFamily: 'contundente' };
  const protectedTarget = { ...target, equipmentLoadout: { body: { type: 'armor', name: 'Armadura de mallas' } } };
  const result = createAttack('rogueliteClass', [dagger, hammer], protectedTarget, { manualCombatTraits: ['Crítico'] }).result;
  expect(result.parts.map(part => part.traits)).toEqual([[], ['critico']]);
  expect(result.weapon.rasgos).toEqual(['critico']);
  expect(result.profile.map(die => die.noCritical)).toEqual([true, false]);
  expect(rollCriticalWeaponDice(result.profile, [4, 6], result.weapon, false, () => 0))
    .toEqual([{ sides: 6, value: 1, sourceIndex: 1 }]);
});
