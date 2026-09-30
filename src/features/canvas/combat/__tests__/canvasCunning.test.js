import { getCanvasCunningOption, rollCanvasCunningDie, finishCanvasCunning } from '../canvasCunning';
import { resolveCanvasAttackSelection, combineCanvasWeapons } from '../canvasAttackSelection';

const dagger = { id: 'dagger', type: 'weapon', name: 'Daga', canvasSlot: 'mainHand', alcance: 'Toque', dano: 'd4' };
const rapier = { ...dagger, id: 'rapier', name: 'Estoque', canvasSlot: 'offHand', alcance: 'Cercano', dano: 'd6', rasgos: ['Duelista', 'Crítico'] };
const rogue = { id: 'rogue', classIdentity: 'Pícaro', profileType: 'rogueliteClass', controlledBy: ['Ada'], x: 0, y: 0, width: 25, height: 25, stats: { recurso: { current: 2, label: 'Astucia' } } };
const target = { id: 'enemy', x: 50, y: 0, width: 25, height: 25, controlledBy: ['master'] };
const attack = (weapons = [dagger, rapier]) => {
  const attacker = { ...rogue, equippedItems: weapons };
  const resolved = resolveCanvasAttackSelection({ attacker, target, selection: weapons.length === 1 ? weapons[0] : combineCanvasWeapons(weapons, 'dual'), items: [attacker, target], gridConfig: { cellWidth: 50, cellHeight: 50 } });
  return { ...resolved, attackParts: resolved.parts, weaponDiceProfile: resolved.profile, weaponResults: resolved.profile.map(() => 2), actionDice: [{ value: 4 }], status: 'awaiting-cunning', criticalResults: [] };
};

test('Golpe sucio offers base weapon dice for Toque, Duelista and Arrojadiza only', () => {
  expect(getCanvasCunningOption(rogue, attack()).dice.map(die => die.index)).toEqual([0, 1]);
  expect(getCanvasCunningOption(rogue, attack([{ ...dagger, alcance: 'Cercano', rasgos: ['Arrojadiza'] }])).eligible).toBe(true);
  expect(getCanvasCunningOption(rogue, attack([{ ...dagger, alcance: 'Cercano' }])).eligible).toBe(false);
  expect(getCanvasCunningOption({ ...rogue, classIdentity: 'Mago', stats: {} }, attack()).eligible).toBe(false);
});

test('extra dice cannot masquerade as eligible weapon dice and one use exhausts this capacity', () => {
  const pending = attack();
  pending.weaponDiceProfile.push(...['Furtivo', 'Modificador', 'Furia', 'Maná'].map(source => ({ ...pending.weaponDiceProfile[0], source })));
  pending.weaponDiceProfile.push({ ...pending.weaponDiceProfile[0], id: 'extra-unlabelled' });
  expect(getCanvasCunningOption(rogue, pending).dice).toHaveLength(2);
  expect(getCanvasCunningOption(rogue, { ...pending, cunningSpent: 1 }).eligible).toBe(false);
});

test('dual eligibility belongs to each hand, never inherited from the other weapon', () => {
  const pending = attack([{ ...dagger, alcance: 'Cercano' }, rapier]);
  expect(getCanvasCunningOption(rogue, pending).dice.map(die => die.index)).toEqual([1]);
});

test('keeping the original preserves it and its critical chain; new roll replaces only its own chain', () => {
  const pending = attack();
  pending.weaponResults = [2, 6];
  pending.criticalResults = [{ sides: 4, value: 3, sourceIndex: 0 }, { sides: 6, value: 5, sourceIndex: 1 }];
  const reroll = rollCanvasCunningDie(pending, 1, () => 0);
  expect(reroll.value).toBe(1);
  const choosing = { ...pending, status: 'awaiting-cunning-choice', cunningSpent: 1, cunning: reroll };
  const original = finishCanvasCunning(choosing, rogue, 'original');
  expect(original.weaponResults).toEqual([2, 6]);
  expect(original.criticalResults).toEqual(pending.criticalResults);
  expect(original.cunningSpent).toBe(1);
  const changed = finishCanvasCunning(choosing, rogue, 'rerolled');
  expect(changed.weaponResults).toEqual([2, 1]);
  expect(changed.criticalResults).toEqual([pending.criticalResults[0]]);
  expect(changed.pressure.total).toBe(10);
  expect(changed.status).toBe('awaiting-defense');
  expect(finishCanvasCunning(changed, rogue, 'rerolled')).toBeNull();
});

test('new maxima generate only their own Critical chain and Toque does not gain Critical', () => {
  const pending = attack();
  const rolls = [0.999, 0];
  expect(rollCanvasCunningDie(pending, 1, () => rolls.shift()).criticalResults).toEqual([{ sides: 6, value: 1, sourceIndex: 1 }]);
  expect(rollCanvasCunningDie(pending, 0, () => .999).criticalResults).toEqual([]);
});

test('declining leaves dice untouched and preserves a later Adjustment; no skipping after payment', () => {
  const pending = { ...attack(), needsAdjustment: true };
  expect(finishCanvasCunning(pending, rogue, 'skip')).toMatchObject({ status: 'awaiting-adjustment', weaponResults: pending.weaponResults });
  expect(finishCanvasCunning({ ...pending, status: 'awaiting-cunning-choice' }, rogue, 'skip')).toBeNull();
});
