import { combineCanvasWeapons, getCanvasAttackOptions, getCanvasDualWeapons, resolveCanvasAttackSelection } from '../canvasAttackSelection';
import { getCanvasEquippedWeapons, getCanvasDefensiveEquipment, getCanvasWeaponActionCost, resolveCanvasAttackDamage, rollCriticalWeaponDice } from '../canvasAttackRules';
import { adjustCanvasPendingAttack } from '../canvasAttackAdjustment';

const a = { id: 'a', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano', canvasSlot: 'mainHand', handsRequired: 1 };
const b = { ...a, id: 'b', canvasSlot: 'offHand' };
const hero = { id: 'hero', profileType: 'rogueliteClass', controlledBy: ['Ada'], x: 0, y: 0, width: 25, height: 25, equippedItems: [a, b] };
const target = { id: 'enemy', controlledBy: ['master'], x: 50, y: 0, width: 25, height: 25, stats: { cd: { current: 6 }, vida: { current: 5 } } };
const gridConfig = { cellWidth: 50, cellHeight: 50 };
const resolve = (attacker = hero, defender = target, selection = combineCanvasWeapons(attacker.equippedItems, 'dual')) => resolveCanvasAttackSelection({ attacker, target: defender, selection, items: [attacker, defender], gridConfig });

test('two physical daggers offer individual attacks and one dual for exactly two action dice', () => {
  const options = getCanvasAttackOptions({ attacker: hero, target, items: [hero, target], gridConfig });
  expect(options).toHaveLength(3);
  expect(getCanvasWeaponActionCost(options[2], hero)).toBe(2);
  expect(resolve().profile.map(die => die.sides)).toEqual([4, 4]);
  expect(resolve().parts.map(part => part.weaponId)).toEqual(['a', 'b']);
});

test.each([
  [{ ...b, id: 'a' }], [{ ...b, name: 'Escudo' }], [{ ...b, handsRequired: 2 }], [{ ...b, canvasSlot: 'belt_1' }],
])('invalid second hand never offers a dual: %j', (other) => {
  expect(getCanvasDualWeapons({ ...hero, equippedItems: [a, other] })).toEqual([]);
  expect(resolve({ ...hero, equippedItems: [a, other] }).legal).toBe(false);
});

test('active weapon set is authoritative and stored inventory cannot join a player attack', () => {
  const token = { ...hero, equippedItems: [a, b], equipmentLoadout: { activeWeaponSet: 1, weaponSets: [{ mainHand: a, offHand: b }, { mainHand: { ...a, id: 'c' } }] }, inventory: [a, b] };
  expect(getCanvasDualWeapons(token)).toEqual([]);
});

test('one illegal weapon leaves only the legal individual option', () => {
  const token = { ...hero, equippedItems: [{ ...a, alcance: 'Intermedio' }, b] };
  const far = { ...target, x: 100 };
  expect(getCanvasAttackOptions({ attacker: token, target: far, items: [token, far], gridConfig })).toHaveLength(1);
});

test('Duelista preserves only its own weapon traits; repeated Perforation applies once', () => {
  const sword = { ...a, name: 'Espada', rasgos: ['Crítico'] };
  const rapier = { ...b, name: 'Estoque', rasgos: ['Duelista', 'Perforación'] };
  const token = { ...hero, equippedItems: [sword, rapier] };
  expect(resolve(token).weapon.rasgos).toEqual(expect.arrayContaining(['critico', 'perforante']));
  const duel = resolve(token, { ...target, x: 0 });
  expect(duel.weapon.rasgos).toEqual(['perforante']);
  const doubleRapier = resolve({ ...hero, equippedItems: [{ ...rapier, id: 'a', canvasSlot: 'mainHand' }, rapier] });
  expect(doubleRapier.weapon.rasgos).toEqual(['perforante']);
  expect(resolveCanvasAttackDamage({ attackPressure: 14, defenseDice: [{ value: 4 }], target, weapon: doubleRapier.weapon })).toMatchObject({ effectiveCd: 5, lifeLost: 2, finalPressure: 10 });
});

test('Critical can chain on either weapon but never on explicitly excluded modifier dice', () => {
  const randomValues = [0.99, 0, 0.5];
  const result = rollCriticalWeaponDice([{ sides: 4 }, { sides: 6 }, { sides: 8, noCritical: true }], [4, 6, 8], { rasgos: ['Crítico'] }, false, () => randomValues.shift());
  expect(result.map(die => [die.sourceIndex, die.value])).toEqual([[0, 4], [0, 1], [1, 4]]);
});

test('enemy inventory weapons need no hand slots and duplicate equipped snapshots do not create extra copies', () => {
  const enemy = { ...hero, profileType: 'rogueliteEnemy', inventory: [a, b], equippedItems: [a] };
  expect(getCanvasEquippedWeapons(enemy)).toHaveLength(2);
  expect(getCanvasDefensiveEquipment(enemy)).toHaveLength(2);
  const selected = resolve(enemy, target, combineCanvasWeapons([a, b], 'multiweapon'));
  expect(selected.legal).toBe(true);
  expect(getCanvasWeaponActionCost(selected.weapon, enemy)).toBe(0);
});

test('lost proficiency suppresses traits without banning the weapon, and neutralization wins', () => {
  const token = { ...hero, proficiencies: { weapons: { martial: false } }, equippedItems: [{ ...a, competence: 'Marcial', rasgos: ['Crítico'] }, { ...b, rasgos: ['Perforación'] }] };
  expect(resolve(token).weapon.rasgos).toEqual(['perforante']);
  expect(resolve(token, { ...target, negatedTraits: ['Perforación'] }).weapon.rasgos).toEqual([]);
});

test.each(['weapon', 'weapons', 'arma', 'armas'])('inventory category %s is not a missing proficiency', category => {
  const rapier = { ...a, category, rasgos: ['Perforante', 'Duelista'] };
  const token = { ...hero, proficiencies: { weapons: { simple: true, martial: true } }, equippedItems: [rapier] };
  expect(resolve(token, target, rapier).weapon.rasgos).toEqual(['perforante']);
});

test.each(['Marcial', 'Marciales', 'martial'])('recognizes the explicit %s proficiency and still respects losing it', competence => {
  const rapier = { ...a, competence, rasgos: ['Perforante', 'Duelista'] };
  const token = { ...hero, proficiencies: { weapons: { martial: true } }, equippedItems: [rapier] };
  expect(resolve(token, target, rapier).weapon.rasgos).toEqual(['perforante']);
  expect(resolve({ ...token, proficiencies: { weapons: { martial: false } } }, target, rapier).weapon.rasgos).toEqual([]);
});

test('a rogue outside the target duel keeps Perforante at Cercano; Duelista preserves it after entering', () => {
  const rapier = { ...a, name: 'Estoque', competence: 'Marcial', rasgos: ['Perforante', 'Duelista'] };
  const rogue = { ...hero, classIdentity: 'Pícaro', proficiencies: { weapons: { martial: true } }, equippedItems: [rapier] };
  const ally = { ...hero, id: 'barbarian', x: 50, teamId: 'party' };
  const run = (attacker, weapon = rapier) => resolveCanvasAttackSelection({ attacker: { ...attacker, teamId: 'party', equippedItems: [weapon] }, target, selection: weapon, items: [{ ...attacker, teamId: 'party' }, ally, target], gridConfig });
  const adjacent = run(rogue);
  expect(adjacent).toMatchObject({ legal: true, parts: [{ range: { distance: 1, suppressTraits: false } }] });
  expect(adjacent.weapon.rasgos).toEqual(['perforante']);
  expect(run(rogue, { ...rapier, rasgos: ['Perforante'] }).weapon.rasgos).toEqual(['perforante']);
  const inside = { ...rogue, x: 50 };
  expect(run(inside).weapon.rasgos).toEqual(['perforante']);
  expect(run(inside, { ...rapier, rasgos: ['Perforante'] }).weapon.rasgos).toEqual([]);
  const options = getCanvasAttackOptions({ attacker: rogue, target, items: [rogue, ally, target], gridConfig });
  expect(options[0].displayTraits).toEqual(['perforante', 'duelista']);
  expect(options[0].rasgos).toEqual(['perforante']);
  expect(resolveCanvasAttackDamage({ attackPressure: 8, defenseDice: [], target, weapon: adjacent.weapon })).toMatchObject({ effectiveCd: 5, lifeLost: 1 });
});

test('Ajuste returns the original die, preserves both weapon rolls and changes only one of two action dice', () => {
  const dice = [{ id: 'one', value: 5, status: 'spent' }, { id: 'two', value: 2, status: 'spent' }, { id: 'three', value: 6, status: 'available' }];
  const combat = { participants: { hero: { actionDice: dice } }, pendingAttack: { status: 'awaiting-adjustment', attackerId: 'hero', actionDice: dice.slice(0, 2), actionDieIds: ['one', 'two'], weaponResults: [4, 3], pressure: { total: 14, actionPressure: 7 } } };
  const result = adjustCanvasPendingAttack(combat, { replaceDieId: 'two', withDieId: 'three' });
  expect(result.pendingAttack.actionDieIds).toEqual(['one', 'three']);
  expect(result.pendingAttack.weaponResults).toEqual([4, 3]);
  expect(result.pendingAttack.pressure.total).toBe(18);
  expect(result.participants.hero.actionDice[1]).toMatchObject({ value: 2, status: 'available' });
  expect(adjustCanvasPendingAttack(result, { replaceDieId: 'one', withDieId: 'two' })).toBe(result);
});


test('enemy weapon combinations cannot absorb a separate spell profile', () => {
  const spell = { id: 'spell', type: 'ability', name: 'Descarga', dano: '1d8', alcance: 'Cercano' };
  const enemy = { ...hero, profileType: 'rogueliteEnemy', inventory: [a, spell], equippedItems: [] };
  expect(resolve(enemy, target, spell).legal).toBe(true);
  expect(resolve(enemy, target, combineCanvasWeapons([a, spell], 'multiweapon')).legal).toBe(false);
});
