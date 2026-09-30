import { getCanvasCounterattackWeapons, getPreferredCanvasCounterattackWeapon } from '../canvasAttackRules';

const first = { id: 'dagger-catalog', runItemId: 'dagger-one', name: 'Daga', type: 'weapon', alcance: 'Cercano' };
const second = { ...first, runItemId: 'dagger-two' };
const third = { id: 'sword', runItemId: 'sword-one', name: 'Espada', type: 'weapon', alcance: 'Cercano' };
const weapons = [first, second, third];

test('the defensive weapon takes priority over the defender previous attack and preserves copy identity', () => {
  expect(getPreferredCanvasCounterattackWeapon({
    pending: { defenseItem: { ...second }, weapon: third },
    participant: { lastAttackWeaponIds: [third.runItemId] }, weapons,
  })).toBe(second);
});

test('future multiple defense items pick the first legal participant without combining counterattacks', () => {
  expect(getPreferredCanvasCounterattackWeapon({
    pending: { defenseItems: [{ ...second }, { ...third }] },
    participant: { lastAttackWeaponIds: [first.runItemId] }, weapons: [first, third],
  })).toBe(third);
});

test('the incoming attacker weapon is never used as the defender attack history', () => {
  expect(getPreferredCanvasCounterattackWeapon({
    pending: { weapon: first, attackParts: [{ weaponId: first.runItemId, weapon: first }] },
    participant: { lastAttackWeaponIds: [second.runItemId] }, weapons,
  })).toBe(second);
  expect(getPreferredCanvasCounterattackWeapon({ pending: { weapon: third }, weapons })).toBe(first);
});

test('an unavailable former weapon falls back to the first current legal option', () => {
  expect(getPreferredCanvasCounterattackWeapon({
    pending: { defenseItem: second }, participant: { lastAttackWeaponIds: [second.runItemId, 'removed-copy'] }, weapons: [third, first],
  })).toBe(third);
  expect(getPreferredCanvasCounterattackWeapon({ pending: { defenseItem: second }, weapons: [] })).toBeNull();
});

test('the same catalog id cannot substitute for a missing preferred copy', () => {
  expect(getPreferredCanvasCounterattackWeapon({
    pending: { defenseItem: second }, participant: { lastAttackWeaponIds: [third.runItemId] }, weapons: [first, third],
  })).toBe(third);
});

test('preference respects live reach and enemy inventory through the existing legal list', () => {
  const short = { ...second, alcance: 'Toque', handsRequired: 2 };
  const defender = { id: 'defender', profileType: 'rogueliteEnemy', controlledBy: ['enemy'], inventory: [short, third], x: 0, y: 0, width: 25, height: 25 };
  const attacker = { id: 'attacker', profileType: 'rogueliteClass', controlledBy: ['Ada'], x: 50, y: 0, width: 25, height: 25 };
  const legal = getCanvasCounterattackWeapons({ defender, attacker, items: [defender, attacker], gridConfig: { cellWidth: 50, cellHeight: 50 } });
  expect(legal).toHaveLength(1);
  expect(getPreferredCanvasCounterattackWeapon({ pending: { defenseItem: short }, weapons: legal })).toMatchObject({ runItemId: third.runItemId });
});
