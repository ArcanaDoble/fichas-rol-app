import { getCanvasAttackOptions, combineCanvasWeapons, resolveCanvasAttackSelection } from '../canvasAttackSelection';
import { evaluateCanvasAttackRange, getCanvasWeaponActionCost, rollCriticalWeaponDice, resolveCanvasAttackDamage } from '../canvasAttackRules';
import { getCanvasArmorProtection } from '../canvasArmorRules';
import { standUpCanvasToken } from '../canvasStandUp';

const sword = { id: 'sword', name: 'Mandoble', type: 'weapon', dano: '2d8', alcance: 'Cercano', rasgos: ['Pesada', 'Crítico'], handsRequired: 2 };
const hero = { id: 'hero', type: 'token', profileType: 'rogueliteClass', controlledBy: ['Ada'], x: 0, y: 0, width: 20, height: 20, equippedItems: [sword] };
const enemy = { ...hero, id: 'enemy', controlledBy: ['master'], profileType: 'rogueliteEnemy', x: 50, equippedItems: [], stats: { cd: { current: 7 }, vida: { current: 5 } } };
const gridConfig = { cellWidth: 50, cellHeight: 50 };
const resolve = (attacker = hero, target = enemy, selection = sword) => resolveCanvasAttackSelection({ attacker, target, selection, gridConfig, items: [attacker, target] });

test('Pesada costs two even after suppression, missing proficiency or armor neutralization', () => {
  expect(getCanvasWeaponActionCost(resolve().weapon, hero)).toBe(2);
  expect(getCanvasWeaponActionCost(resolve(hero, { ...enemy, x: 0 }).weapon, hero)).toBe(2);
  const untrained = { ...hero, proficiencies: { weapons: { martial: false } }, equippedItems: [{ ...sword, competence: 'Marcial' }] };
  expect(getCanvasWeaponActionCost(resolve(untrained).weapon, hero)).toBe(2);
  expect(getCanvasWeaponActionCost(resolve({ ...hero, profileType: 'rogueliteEnemy', inventory: [sword] }).weapon, enemy)).toBe(0);
});

test('two wands offer a choice of catalyst, never a combined profile, including enemies', () => {
  const wands = ['mainHand', 'offHand'].map((canvasSlot, i) => ({ id: `wand${i}`, type: 'weapon', name: 'Varita', dano: 'd4', alcance: 'Intermedio', handsRequired: 1, canvasSlot, rasgos: ['Catalizador', 'Crítico'] }));
  const caster = { ...hero, equippedItems: wands };
  expect(getCanvasAttackOptions({ attacker: caster, target: enemy, items: [caster, enemy], gridConfig })).toHaveLength(2);
  expect(resolve(caster, enemy, combineCanvasWeapons(wands, 'dual')).legal).toBe(false);
  expect(resolve({ ...caster, profileType: 'rogueliteEnemy', inventory: wands }, enemy, combineCanvasWeapons(wands, 'multiweapon')).legal).toBe(false);
});

test('mail stops cutting Critical continuously without old armor blocks, but not a wand Critical', () => {
  const protectedEnemy = { ...enemy, equippedItems: [{ type: 'armor', name: 'Armadura de mallas', rasgos: ['Crítico'] }] };
  const attack = resolve(hero, protectedEnemy);
  expect(attack.weapon.rasgos).not.toContain('critico');
  expect(rollCriticalWeaponDice(attack.profile, [8, 8], attack.weapon)).toEqual([]);
  expect(getCanvasArmorProtection(protectedEnemy, { name: 'Varita', rasgos: ['Crítico', 'Catalizador'] }).negatedTraits).toEqual([]);
  expect(getCanvasArmorProtection({ ...protectedEnemy, stats: { armadura: { current: 0 } } }, sword).negatedTraits).toEqual(['critico']);
});

test('equipped scales neutralize Perforation; unequipped inventory does not protect', () => {
  const armor = { type: 'armor', name: 'Escamas' };
  const spear = { ...sword, rasgos: ['Perforación'] };
  const attacker = { ...hero, equippedItems: [spear] };
  const target = { ...enemy, equipmentLoadout: { body: armor } };
  const attack = resolve(attacker, target, spear);
  expect(resolveCanvasAttackDamage({ attackPressure: 13, defenseDice: [], target, weapon: attack.weapon })).toMatchObject({ effectiveCd: 7, lifeLost: 1 });
  expect(getCanvasArmorProtection({ ...enemy, inventory: [armor] }, spear).negatedTraits).toEqual([]);
  expect(getCanvasArmorProtection({ ...enemy, equippedItems: [armor], equipmentLoadout: { body: null } }, spear).negatedTraits).toEqual([]);
});

test('mutable armor requires a declared choice; acid suppression does not remove CD', () => {
  const target = { ...enemy, equippedItems: [{ type: 'armor', name: 'Túnica arcana' }] };
  expect(resolve(hero, target).legal).toBe(false);
  expect(resolve(hero, { ...target, armorProtectionChoice: 'critico' }).weapon.rasgos).not.toContain('critico');
  expect(resolve(hero, { ...target, armorProtectionChoice: 'critico', suppressedArmorTraits: ['Crítico'] }).weapon.rasgos).toContain('critico');
});

test('Cegado permits same-cell attacks and blocks farther targets for both sides; Derribado permits attacks', () => {
  for (const profileType of ['rogueliteClass', 'rogueliteEnemy']) {
    const blind = { ...hero, profileType, status: [{ id: 'cegado' }] };
    expect(resolve(blind).legal).toBe(false);
    expect(resolve(blind, { ...enemy, x: 0 }).legal).toBe(true);
    expect(resolve({ ...hero, profileType, status: ['derribado'] }).legal).toBe(true);
  }
});

test('smoke blocks outside-to-outside declaration even with sufficient weapon range', () => {
  const smoke = { id: 'smoke', type: 'geometry', geometryKind: 'smoke', x: 25, y: -25, width: 20, height: 100 };
  expect(evaluateCanvasAttackRange({ attacker: hero, target: enemy, weapon: sword, gridConfig, items: [hero, enemy, smoke] })).toMatchObject({ legal: false });
});

test('a large target partially in smoke can be attacked through its exposed footprint', () => {
  const smoke = { id: 'smoke', type: 'geometry', geometryKind: 'smoke', x: 50, y: 50, width: 100, height: 100 };
  const largeTarget = { ...enemy, x: 50, y: 0, width: 100, height: 100 };
  const attacker = { ...hero, x: 75, y: -50 };
  expect(evaluateCanvasAttackRange({
    attacker, target: largeTarget, weapon: sword, gridConfig, items: [attacker, largeTarget, smoke],
  })).toMatchObject({ legal: true });
});

test('standing spends either the full unused basic movement or one die, never its visible value', () => {
  const token = { ...hero, status: ['derribado', 'cegado'] };
  const participant = { movementRuntime: { base: 3, spent: 0 }, actionDice: [{ id: 'die', value: 6, status: 'available' }] };
  const combat = { status: 'active', roundPhase: 'turns', activeBlockIndex: 0, blocks: [{ memberIds: ['hero'], actedIds: [] }], participants: { hero: participant } };
  const movement = standUpCanvasToken(combat, token);
  expect(movement.token.status).toEqual(['cegado']);
  expect(movement.combat.participants.hero.movementRuntime.spent).toBe(3);
  expect(movement.combat.participants.hero.actionDice[0].status).toBe('available');
  const die = standUpCanvasToken(combat, token, 'die');
  expect(die.combat.participants.hero.actionDice[0].status).toBe('spent');
  expect(die.combat.participants.hero.movementRuntime.spent).toBe(0);
  expect(standUpCanvasToken({ ...combat, blocks: [{ memberIds: ['enemy'] }] }, token)).toBeNull();
});
