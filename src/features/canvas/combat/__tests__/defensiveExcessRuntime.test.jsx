import { act, renderHook } from '@testing-library/react';
import { addDoc } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState } from '../canvasCombatState';

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(async () => ({ id: 'log' })), collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})), serverTimestamp: jest.fn(() => 100),
  setDoc: jest.fn(async () => {}), updateDoc: jest.fn(async () => {}), deleteDoc: jest.fn(async () => {}),
}));

const weapon = { id: 'blade', name: 'Estilete', type: 'weapon', alcance: 'Cercano', dano: '1d4' };
function setup({ value = 8, pressure = 2, far = false, enemy = false, masterView = false, practice = false, attackerHidden = false, targetHidden = false, noPendingAttack = false, equippedWeapons = [weapon], lastAttackWeaponIds, defenseItem, attackWeapon = {} } = {}) {
  const attacker = { id: 'enemy', name: 'Duende', profileType: 'rogueliteEnemy', x: far ? 500 : 50, y: 0, width: 25, height: 25, status: attackerHidden ? ['oculto'] : [], stats: { cd: { current: 3 }, vida: { current: 5 } } };
  const target = { id: 'hero', name: 'Pícaro', profileType: enemy ? 'rogueliteEnemy' : 'rogueliteClass', controlledBy: ['Ada'], x: 0, y: 0, width: 25, height: 25, status: targetHidden ? ['oculto'] : [], equippedItems: equippedWeapons, stats: { vida: { current: 5 }, cd: { current: 6 } } };
  // Explicit opposing factions also allow master-controlled defenders in this test.
  attacker.controlledBy = ['enemy'];
  let combat = createCanvasCombatState([attacker, target]);
  combat.participants.hero.actionDice = [{ id: 'def', die: 'd8', sides: 8, value, status: 'committed' }];
  if (lastAttackWeaponIds) combat.participants.hero.lastAttackWeaponIds = lastAttackWeaponIds;
  combat.pendingAttack = noPendingAttack
    ? null
    : { id: 'attack', attackerId: 'enemy', targetId: 'hero', weaponName: 'Garrote', weapon: attackWeapon, pressure: { total: pressure }, ...(defenseItem ? { defenseItem } : {}), ...(enemy ? { status: 'defense-rolled', defenseDice: [{ value }] } : {}) };
  let scenario = { id: 'scene', items: [attacker, target], [practice ? 'canvasPracticeCombat' : 'canvasCombat']: combat };
  const ref = { current: scenario };
  const persist = jest.fn(async () => {});
  const toast = jest.fn();
  const setActiveScenario = fn => { scenario = typeof fn === 'function' ? fn(scenario) : fn; ref.current = scenario; };
  const hook = renderHook(() => useCanvasCombatRuntime({ activeScenario: scenario, activeScenarioRef: ref, scenarioCollectionName: 'canvas_scenarios', gridConfig: { cellWidth: 50, cellHeight: 50 }, isPlayerView: !(enemy || masterView), playerName: 'Ada', safePersistItems: persist, setActiveScenario, triggerToast: toast }));
  return { ...hook, persist, toast, state: () => scenario, ids: enemy ? [] : ['def'] };
}

beforeEach(() => jest.clearAllMocks());

test('surplus cannot disappear without a valid choice', async () => {
  const h = setup(); let accepted;
  await act(async () => { accepted = await h.result.current.resolvePendingAttack(h.ids); });
  expect(accepted).toBe(false);
  expect(h.persist).not.toHaveBeenCalled();
  expect(h.state().canvasCombat.pendingAttack).not.toBeNull();
});

test('counterattack applies all surplus, spends only defense dice and cannot repeat', async () => {
  const h = setup();
  await act(async () => { await h.result.current.resolvePendingAttack(h.ids, { excessChoice: 'counterattack', counterWeapon: weapon }); });
  expect(h.state().items.find(item => item.id === 'enemy').stats.vida.current).toBe(3);
  expect(h.state().items.find(item => item.id === 'enemy').canvasDamageEffect)
    .toEqual({ id: 'attack', previousLife: 5, nextLife: 3, poisonApplied: false, bleedingApplied: false });
  expect(h.state().items.find(item => item.id === 'hero').stats.vida.current).toBe(5);
  expect(h.state().canvasCombat.pendingAttack).toBeNull();
  expect(h.state().canvasCombat.participants.hero.actionDice[0].status).toBe('spent');
  expect(h.state().canvasCombat.participants.hero.lastAttackWeaponIds).toEqual(['blade']);
  expect(addDoc.mock.calls[0][1]).toMatchObject({ counterDamage: 6, attackerBlocksLost: { vida: 2, armadura: 0, postura: 0 } });
  await act(async () => { await h.result.current.resolvePendingAttack(h.ids, { excessChoice: 'counterattack' }); });
  expect(h.persist).toHaveBeenCalledTimes(1);
});

test('counterattack defaults to the defender last used weapon and respects an explicit legal alternative', async () => {
  const sword = { ...weapon, id: 'sword', runItemId: 'sword-copy', name: 'Espada' };
  const h = setup({ equippedWeapons: [weapon, sword], lastAttackWeaponIds: ['sword-copy'] });
  expect(h.result.current.getPreferredCounterattackWeapon()).toMatchObject({ runItemId: 'sword-copy' });
  await act(async () => { await h.result.current.resolvePendingAttack(h.ids, { excessChoice: 'counterattack' }); });
  expect(h.state().canvasCombat.participants.hero.lastAttackWeaponIds).toEqual(['sword-copy']);
  h.unmount();
  const manual = setup({ equippedWeapons: [weapon, sword], lastAttackWeaponIds: ['sword-copy'] });
  await act(async () => { await manual.result.current.resolvePendingAttack(manual.ids, { excessChoice: 'counterattack', counterWeapon: weapon }); });
  expect(manual.state().canvasCombat.participants.hero.lastAttackWeaponIds).toEqual(['blade']);
});

test('the actual defensive copy takes precedence over previous offense even when catalog ids match', async () => {
  const first = { ...weapon, runItemId: 'copy-one' };
  const second = { ...weapon, runItemId: 'copy-two', rasgos: ['Perforante'] };
  const h = setup({ enemy: true, equippedWeapons: [first, second], lastAttackWeaponIds: ['copy-one'], defenseItem: second });
  expect(h.result.current.getPreferredCounterattackWeapon()).toMatchObject({ runItemId: 'copy-two' });
  await act(async () => { await h.result.current.resolvePendingAttack([], { excessChoice: 'counterattack' }); });
  expect(h.state().canvasCombat.participants.hero.lastAttackWeaponIds).toEqual(['copy-two']);
  expect(h.state().items.find(item => item.id === 'enemy').stats.vida.current).toBe(2);
});

test('an out-of-reach weapon cannot spend the attack or surplus', async () => {
  const h = setup({ far: true });
  await act(async () => { await h.result.current.resolvePendingAttack(h.ids, { excessChoice: 'counterattack', counterWeapon: weapon }); });
  expect(h.persist).not.toHaveBeenCalled();
  expect(h.state().canvasCombat.pendingAttack).not.toBeNull();
});

test.each([false, true])('reposition grants and consumes surplus for enemy=%s', async enemy => {
  const h = setup({ enemy });
  await act(async () => { await h.result.current.resolvePendingAttack(h.ids, { excessChoice: 'reposition' }); });
  expect(h.state().canvasCombat.participants.hero.defensiveReposition).toEqual({ remaining: 6, ignoresDuelExit: true });
  await act(async () => { await h.result.current.confirmMovement('hero', { from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, cost: 2 }); });
  expect(h.state().canvasCombat.participants.hero.defensiveReposition.remaining).toBe(4);
  expect(h.state().canvasCombat.participants.hero.movementRuntime.spent).toBe(0);
});

test('equal defense cancels without a surplus choice', async () => {
  const h = setup({ value: 2 });
  await act(async () => { await h.result.current.resolvePendingAttack(h.ids); });
  expect(h.state().canvasCombat.pendingAttack).toBeNull();
  expect(addDoc.mock.calls[0][1]).toMatchObject({ finalDamage: 0, surplus: 0, excessChoice: null });
});

test('practice reposition survives closing the attack and can be consumed', async () => {
  const h = setup({ practice: true });
  await act(async () => { await h.result.current.resolvePendingAttack(h.ids, { excessChoice: 'reposition' }); });
  expect(h.state().canvasPracticeCombat.participants.hero.defensiveReposition.remaining).toBe(6);
  await act(async () => { await h.result.current.confirmMovement('hero', { from: { x: 0, y: 0 }, to: { x: 50, y: 0 }, cost: 1 }); });
  expect(h.state().canvasPracticeCombat.participants.hero.defensiveReposition.remaining).toBe(5);
});

test('an attacker loses Oculto only after its attack resolves', async () => {
  const h = setup({ attackerHidden: true, value: 2 });
  expect(h.state().items.find(item => item.id === 'enemy').status).toContain('oculto');
  await act(async () => { await h.result.current.resolvePendingAttack(h.ids); });
  expect(h.state().items.find(item => item.id === 'enemy').status).not.toContain('oculto');
});

test('a hostile hidden target cannot be selected directly', () => {
  const h = setup({ targetHidden: true, noPendingAttack: true, masterView: true });
  let accepted;
  act(() => {
    accepted = h.result.current.beginAttackDraft({ attackerId: 'enemy', targetId: 'hero', weapon });
  });
  expect(accepted).toBe(false);
  expect(h.toast).toHaveBeenCalledWith(
    'Objetivo no detectado',
    expect.stringContaining('Oculto'),
    'warning',
  );
});


test.each([0, 20])('a poisonous attack applies poison only when Life is lost, pressure=%s', async pressure => {
  const h = setup({ pressure, value: 0, attackWeapon: { rasgos: ['venenosa'] } });
  await act(async () => h.result.current.resolvePendingAttack([], { excessChoice: 'skip' }));
  const target = h.state().items.find(item => item.id === 'hero');
  expect(target.status.includes('envenenado')).toBe(pressure > 0);
  if (pressure > 0) {
    expect(addDoc.mock.calls[0][1].statusEffectsApplied.target).toContain('envenenado');
    expect(target.canvasDamageEffect.poisonApplied).toBe(true);
  }
});

test('a poisonous counterattack applies poison without rerolling its weapon', async () => {
  const poisonous = { ...weapon, rasgos: ['venenosa'] };
  const h = setup({ equippedWeapons: [poisonous] });
  await act(async () => h.result.current.resolvePendingAttack(h.ids, { excessChoice: 'counterattack', counterWeapon: poisonous }));
  expect(h.state().items.find(item => item.id === 'enemy').status).toContain('envenenado');
});
