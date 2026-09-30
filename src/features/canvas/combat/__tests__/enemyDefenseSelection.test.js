import {
  getCanvasCounterattackWeapons, getCanvasDefensiveEquipment, getDefaultCanvasEnemyDefenseSelection,
  getEnemyActiveDefenseEligibility, isCanvasShield, resolveCanvasAttackDamage,
  resolveCanvasEnemyDefenseSelection, rollCanvasEnemyDefense, toggleCanvasEnemyDefenseEquipment,
} from '../canvasAttackRules';
import { getCanvasAttackOptions, resolveCanvasAttackSelection } from '../canvasAttackSelection';

const dagger = { id: 'dagger', runItemId: 'dagger-a', name: 'Daga', type: 'weapon', dano: '1d4', handsRequired: 1, alcance: 'Cercano' };
const otherDagger = { ...dagger, runItemId: 'dagger-b' };
const rapier = { id: 'rapier', name: 'Estoque', type: 'weapon', dano: '1d6', handsRequired: 1, alcance: 'Cercano' };
const greatsword = { id: 'greatsword', name: 'Mandoble', type: 'weapon', dano: '2d8', handsRequired: 2, alcance: 'Cercano' };
const shield = { id: 'sheet-weapon-granescudo', name: 'Escudo', type: 'weapon', dano: '', handsRequired: '1', rasgos: ['Bloqueo', 'Guardia'] };
const damagedShield = { id: 'tower-shield', name: 'Escudo de torre', type: 'weapon', dano: '2d8', defenseDiceProfile: '2d20' };
const enemy = (inventory = [dagger, otherDagger, rapier, greatsword, shield, damagedShield]) => ({
  id: 'enemy', name: 'Duende', profileType: 'rogueliteEnemy', controlledBy: ['master'], inventory,
  offenseBase: 99, x: 0, y: 0, width: 25, height: 25, stats: { cd: { current: 5 }, vida: { current: 5 } },
});
const select = equipmentIds => resolveCanvasEnemyDefenseSelection({ token: enemy(), equipmentIds });
const participant = { side: 'enemies', enemyActions: [{ id: 'attack', status: 'available' }] };

test.each([
  { type: 'shield' }, { category: 'Escudos' }, { itemType: 'shield' }, { nombre: 'Escudo de torre', dano: '2d8' },
  { rasgos: ['Escudo'] }, { id: 'sheet-weapon-escudo', name: 'Rodela', dano: '1d4' }, { payload: { type: 'shield' } },
])('recognizes passive shields in scattered catalog fields: %j', item => {
  expect(isCanvasShield(item)).toBe(true);
});

test('shield detection does not classify ordinary Guardia weapons or similarly named creatures as shields', () => {
  expect(isCanvasShield({ ...dagger, rasgos: ['Guardia', 'Bloqueo'] })).toBe(false);
  expect(isCanvasShield({ name: 'Escudero', type: 'weapon', dano: 'd4' })).toBe(false);
});

test('default defense uses shield plus first one-handed weapon, otherwise shield alone or first weapon', () => {
  expect(getDefaultCanvasEnemyDefenseSelection(enemy())).toEqual([shield.id, dagger.runItemId]);
  expect(getDefaultCanvasEnemyDefenseSelection(enemy([greatsword, shield]))).toEqual([shield.id]);
  expect(getDefaultCanvasEnemyDefenseSelection(enemy([greatsword, dagger]))).toEqual([greatsword.id]);
  expect(getDefaultCanvasEnemyDefenseSelection(enemy([]))).toEqual([]);
  expect(getCanvasDefensiveEquipment(enemy([shield]))).toEqual([shield]);
});

test.each([
  ['dagger-a', 'dagger-b'], ['dagger-a', 'rapier'], ['greatsword'], ['dagger-a', shield.id], [shield.id], [],
])('validates a complete legal selection without depending on equipped slots: %j', (...ids) => {
  // test.each spreads row values; each row is the selected identity list.
  const result = select(ids);
  expect(result.legal).toBe(true);
  expect(result.items).toHaveLength(ids.length);
  expect(result.cdBonus).toBe(ids.includes(shield.id) ? 1 : 0);
});

test.each([
  ['dagger-a', 'dagger-a'], ['missing-copy'], ['greatsword', 'dagger-a'], ['greatsword', shield.id],
  [shield.id, damagedShield.id], ['dagger-a', 'dagger-b', 'rapier'],
])('rejects duplicate copies, missing equipment and more than two hands: %j', (...ids) => {
  expect(select(ids)).toMatchObject({ legal: false, items: [], weapons: [], shield: null, cdBonus: 0 });
});

test('two one-handed weapons roll both complete profiles, never half profiles or offensive Base', () => {
  const doubleDagger = rollCanvasEnemyDefense({ equipments: select(['dagger-a', 'dagger-b']).weapons, random: () => 0.5 });
  expect(doubleDagger.defenseDice.map(die => [die.weaponId, die.sides, die.value])).toEqual([
    ['dagger-a', 4, 3], ['dagger-b', 4, 3],
  ]);
  expect(doubleDagger.totalDefense).toBe(6);
  expect(new Set(doubleDagger.defenseDice.map(die => die.id)).size).toBe(2);
  const mixed = rollCanvasEnemyDefense({ equipment: [dagger, rapier], random: () => 0.5 });
  expect(mixed.defenseDice.map(die => die.sides)).toEqual([4, 6]);
  expect(mixed.totalDefense).toBe(7);
  const full = rollCanvasEnemyDefense({ equipment: { ...greatsword, offenseBase: 99 }, random: () => 0.5 });
  expect(full.defenseDice.map(die => die.value)).toEqual([5, 5]);
  expect(full.totalDefense).toBe(10);
  const fullOneHanded = { ...greatsword, handsRequired: 1 };
  const fullSelection = resolveCanvasEnemyDefenseSelection({ token: enemy([fullOneHanded, dagger]), equipmentIds: [greatsword.id, dagger.runItemId] });
  expect(fullSelection.legal).toBe(true);
  expect(rollCanvasEnemyDefense({ equipments: fullSelection.weapons, random: () => 0.5 }).totalDefense).toBe(13);
});

test('shield never rolls configured damage or defensive dice, while Threat remains separate from weapon profiles', () => {
  const random = jest.fn(() => 0.5);
  expect(rollCanvasEnemyDefense({ equipment: damagedShield, random })).toMatchObject({ defenseDice: [], totalDefense: 0 });
  expect(random).not.toHaveBeenCalled();
  const rolled = rollCanvasEnemyDefense({ equipments: [damagedShield, dagger],
    threatSelection: { useStored: true, customDice: [6, 6] }, storedThreatDie: 'd8', storedThreatValue: 2, random });
  expect(rolled.defenseDice).toHaveLength(1);
  expect(rolled.defenseDice[0].weaponId).toBe(dagger.runItemId);
  expect(rolled.defenseThreatDice.map(die => die.value)).toEqual([2, 4, 4]);
  expect(rolled.totalDefense).toBe(13);
});

test('shield is passive equipment when action is spent or no active weapon is available', () => {
  expect(getEnemyActiveDefenseEligibility({ token: enemy([shield]), participant }))
    .toMatchObject({ eligible: false, equipment: [shield] });
  expect(getEnemyActiveDefenseEligibility({ token: enemy([shield, dagger]), participant }))
    .toMatchObject({ eligible: true });
  expect(getEnemyActiveDefenseEligibility({ token: enemy([shield, dagger]),
    participant: { ...participant, enemyActions: [{ id: 'attack', status: 'spent' }] } }))
    .toMatchObject({ eligible: false, equipment: [shield, dagger] });
});

test('one passive shield adds exactly one CD for enemies and combines with Perforante without altering base CD', () => {
  const resolve = (extra = {}) => resolveCanvasAttackDamage({ target: enemy(), attackPressure: 10, defenseDice: [], weapon: {}, ...extra });
  expect(resolve()).toMatchObject({ baseCd: 5, shieldBonus: 0, effectiveCd: 5, lifeLost: 2 });
  expect(resolve({ defenseCdBonus: 1 })).toMatchObject({ baseCd: 5, shieldBonus: 1, effectiveCd: 6, lifeLost: 1, defense: 0 });
  expect(resolve({ defenseCdBonus: 99 })).toMatchObject({ shieldBonus: 1, effectiveCd: 6 });
  expect(resolve({ defenseCdBonus: -1 })).toMatchObject({ shieldBonus: 0, effectiveCd: 5 });
  expect(resolve({ defenseCdBonus: 1, weapon: { rasgos: ['Perforante'] } })).toMatchObject({ baseCd: 5, shieldBonus: 1, effectiveCd: 5 });
  expect(resolve({ defenseCdBonus: 1, weapon: { rasgos: ['Perforante'] }, suppressTraits: true })).toMatchObject({ effectiveCd: 6 });
  expect(resolve({ defenseCdBonus: 1, target: { ...enemy(), profileType: 'rogueliteClass' } })).toMatchObject({ shieldBonus: 0, effectiveCd: 5 });
});

test('enemy attack and counterattack never offer a shield even when it has a damage profile', () => {
  const attacker = enemy([dagger, damagedShield]);
  const target = { ...enemy([]), id: 'hero', profileType: 'rogueliteClass', controlledBy: ['Ada'], x: 50 };
  const context = { attacker, target, items: [attacker, target], gridConfig: { cellWidth: 50, cellHeight: 50 } };
  expect(getCanvasAttackOptions(context).map(item => item.runItemId || item.id)).toEqual([dagger.runItemId]);
  expect(resolveCanvasAttackSelection({ ...context, selection: damagedShield }).legal).toBe(false);
  expect(getCanvasCounterattackWeapons({ defender: attacker, attacker: target, items: context.items, gridConfig: context.gridConfig }))
    .toEqual([dagger]);
});

test('toggle transitions replace conflicting hands directly and preserve unique copies', () => {
  const token = enemy();
  const toggle = (equipmentIds, itemId) => toggleCanvasEnemyDefenseEquipment({ token, equipmentIds, itemId });
  expect(toggle([shield.id, 'dagger-a'], 'dagger-b')).toEqual(['dagger-a', 'dagger-b']);
  expect(toggle(['dagger-a', 'dagger-b'], 'rapier')).toEqual(['dagger-b', 'rapier']);
  expect(toggle(['dagger-a', 'dagger-b'], shield.id)).toEqual([shield.id, 'dagger-a']);
  expect(toggle([shield.id, 'dagger-a'], 'greatsword')).toEqual(['greatsword']);
  expect(toggle(['greatsword'], shield.id)).toEqual([shield.id]);
  expect(toggle([shield.id], 'dagger-a')).toEqual([shield.id, 'dagger-a']);
  expect(toggle(['greatsword'], 'dagger-a')).toEqual(['dagger-a']);
  expect(toggle([shield.id, 'dagger-a'], 'dagger-a')).toEqual([shield.id]);
  expect(toggle([shield.id], shield.id)).toEqual([]);
});
