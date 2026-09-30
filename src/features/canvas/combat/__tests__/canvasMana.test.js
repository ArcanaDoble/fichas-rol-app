import { resolveCanvasAttackSelection } from '../canvasAttackSelection';
import { rollCriticalWeaponDice } from '../canvasAttackRules';

const catalyst = { id: 'wand', name: 'Vara', type: 'weapon', dano: '2d6', alcance: 'Intermedio', rasgos: ['Catalizador'], canvasSlot: 'mainHand' };
const mage = { id: 'mage', profileType: 'rogueliteClass', classIdentity: 'Mago', stats: { recurso: { current: 1, max: 3, label: 'Maná' } },
  x: 0, y: 0, width: 25, height: 25, controlledBy: ['Ada'], equippedItems: [catalyst] };
const target = { id: 'target', x: 50, y: 0, width: 25, height: 25, controlledBy: ['enemy'] };
const resolve = (amount, token = mage, weapon = catalyst, modifiers = {}) => resolveCanvasAttackSelection({ attacker: { ...token, equippedItems: [weapon] }, target,
  selection: { ...weapon, manaSpend: amount, ...modifiers }, items: [token, target], gridConfig: { cellWidth: 50, cellHeight: 50 } });

test('one mana adds one catalyst die, never the whole multi-die profile', () => {
  const attack = resolve(1);
  expect(attack.legal).toBe(true);
  expect(attack.profile.map(die => die.sides)).toEqual([6, 6, 6]);
  expect(attack.profile[2]).toEqual(expect.objectContaining({ source: 'Maná', noCritical: true }));
  expect(attack.weapon.rasgos).not.toContain('critico');
  expect(resolve(1, mage, catalyst, attack.weapon).profile).toEqual(attack.profile);
});
test('mana enhancement inherits native or manual Critical and chains normally', () => {
  const attack = resolve(1, mage, catalyst, { manualCombatTraits: ['critico'] });
  const random = jest.fn().mockReturnValueOnce(.999).mockReturnValueOnce(0);
  expect(rollCriticalWeaponDice(attack.profile, [1, 1, 6], attack.weapon, false, random)).toEqual([
    { sides: 6, value: 6, sourceIndex: 2 }, { sides: 6, value: 1, sourceIndex: 2 },
  ]);
});
test('zero mana still allows the base discharge, but cannot pay for enhancement', () => {
  const empty = { ...mage, stats: { recurso: { current: 0, label: 'Maná' } } };
  expect(resolve(0, empty).legal).toBe(true);
  expect(resolve(1, empty).legal).toBe(false);
});
test.each([-1, 2, 1.5, '1', NaN])('rejects invalid enhancement %s', amount => expect(resolve(amount).legal).toBe(false));
test('does not spend another class resource or apply a discharge bonus to prepared spells', () => {
  expect(resolve(1, { ...mage, classIdentity: 'Pícaro', stats: { recurso: { current: 3, label: 'Astucia' } } }).legal).toBe(false);
  expect(resolve(1, mage, { ...catalyst, type: 'ability' }).legal).toBe(false);
  expect(resolve(1, mage, { ...catalyst, rasgos: [] }).legal).toBe(false);
});
test('does not silently choose the largest die from a mixed catalyst profile', () => {
  expect(resolve(1, mage, { ...catalyst, dano: 'd4 + d8' }).reason).toMatch(/dado base/);
});
