import { resolveCanvasAttackSelection, combineCanvasWeapons } from '../canvasAttackSelection';
import { rollCriticalWeaponDice } from '../canvasAttackRules';

const sword = { id: 'sword', name: 'Mandoble', type: 'weapon', dano: '2d8', alcance: 'Cercano', canvasSlot: 'mainHand' };
const token = { id: 'a', profileType: 'rogueliteClass', classIdentity: 'Bárbaro', stats: { recurso: { current: 3, max: 3, label: 'Furia' } }, x: 0, y: 0, width: 25, height: 25, controlledBy: ['Ada'], equippedItems: [sword] };
const target = { id: 'b', x: 50, y: 0, width: 25, height: 25, controlledBy: ['enemy'] };
const resolve = (amount, attacker = token, selection = sword, defender = target) => resolveCanvasAttackSelection({ attacker, target: defender, selection: { ...selection, furySpend: amount }, items: [attacker, defender], gridConfig: { cellWidth: 50, cellHeight: 50 } });

test('each Fury adds one profile die, grants Critical and remains stable on revalidation', () => {
  const attack = resolve(2);
  expect(attack.legal).toBe(true);
  expect(attack.profile.map(die => die.sides)).toEqual([8, 8, 8, 8]);
  expect(attack.profile.slice(2).every(die => die.source === 'Furia' && !die.noCritical)).toBe(true);
  expect(attack.weapon.rasgos).toContain('critico');
  expect(resolve(2, token, attack.weapon).profile).toEqual(attack.profile);
  const values = [1, 1, 8, 1];
  const random = jest.fn().mockReturnValueOnce(.999).mockReturnValueOnce(0);
  expect(rollCriticalWeaponDice(attack.profile, values, attack.weapon, false, random)).toEqual([
    { sides: 8, value: 8, sourceIndex: 2 }, { sides: 8, value: 1, sourceIndex: 2 },
  ]);
});

test.each([-1, 1.5, 4, NaN, '2'])('rejects invalid or unavailable spending %s', amount => expect(resolve(amount).legal).toBe(false));
test('zero Fury preserves a normal attack', () => {
  const attack = resolve(0);
  expect(attack.profile).toHaveLength(2);
  expect(attack.weapon.rasgos).not.toContain('critico');
});
test('cannot buy Fury with another class resource', () => expect(resolve(1, { ...token, classIdentity: 'Mago', stats: { recurso: { current: 3, label: 'Maná' } } }).legal).toBe(false));
test.each([
  { ...sword, rasgos: ['Catalizador'] },
  { ...sword, alcance: 'Lejano', rasgos: ['A distancia'] },
])('rejects ineligible weapons', weapon => expect(resolve(1, { ...token, equippedItems: [weapon] }, weapon).legal).toBe(false));
test('allows thrown weapon and blocks mixed dual dice without guessing', () => {
  const thrown = { ...sword, alcance: 'Toque', rasgos: ['Arrojadiza'] };
  expect(resolve(1, { ...token, equippedItems: [thrown] }, thrown).legal).toBe(true);
  const pair = [{ ...sword, dano: 'd8', handsRequired: 1 }, { ...sword, id: 'off', dano: 'd6', handsRequired: 1, canvasSlot: 'offHand' }];
  expect(resolve(1, { ...token, equippedItems: pair }, combineCanvasWeapons(pair, 'dual')).reason).toMatch(/distintos/);
});
test('suppressed traits still suppress Fury Critical but not its extra dice', () => {
  const weapon = { ...sword, alcance: 'Toque', handsRequired: 1 };
  const attack = resolve(1, { ...token, equippedItems: [weapon] }, weapon);
  expect(attack.legal).toBe(true);
  expect(attack.profile).toHaveLength(3);
  expect(attack.profile.every(die => die.noCritical)).toBe(true);
});
