import { useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { addDoc, runTransaction } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState } from '../canvasCombatState';

let mockRemote;
jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  runTransaction: jest.fn(), addDoc: jest.fn(async () => ({ id: 'log' })),
  collection: jest.fn(() => ({})), doc: jest.fn(() => ({})), serverTimestamp: jest.fn(() => 1),
  setDoc: jest.fn(async () => {}), updateDoc: jest.fn(async () => {}), deleteDoc: jest.fn(async () => {}),
}));

const dagger = { id: 'dagger', runItemId: 'dagger-one', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano', handsRequired: 1 };
const second = { ...dagger, runItemId: 'dagger-two', dano: '2d6' };
const shield = { id: 'shield', runItemId: 'shield-one', name: 'Escudo', type: 'weapon', dano: '1d4', handsRequired: 1 };
const heavy = { id: 'heavy', runItemId: 'heavy-one', name: 'Mandoble', type: 'weapon', dano: '2d8', alcance: 'Cercano', handsRequired: 2 };
const transaction = (write = true) => ({
  get: async () => ({ exists: () => true, data: () => mockRemote }),
  update: (_, patch) => { if (write) mockRemote = { ...mockRemote, ...patch }; },
});

const setup = ({ inventory = [dagger, second, shield, heavy], pressure = 20, spent = false, playerDefense = false, attackWeapon = dagger } = {}) => {
  const attacker = { id: 'attacker', name: 'Atacante', profileType: playerDefense ? 'rogueliteEnemy' : 'rogueliteClass',
    inventory: playerDefense ? [attackWeapon, shield] : [], equippedItems: [], controlledBy: ['enemy'],
    x: 0, y: 0, width: 25, height: 25, stats: { cd: { current: 4, max: 4 }, vida: { current: 5 } } };
  const target = { id: 'target', name: 'Objetivo', profileType: playerDefense ? 'rogueliteClass' : 'rogueliteEnemy',
    inventory, equippedItems: playerDefense ? [dagger] : [], controlledBy: ['master'], offenseBase: 99,
    x: 50, y: 0, width: 25, height: 25, stats: { cd: { current: 4, max: 4 }, vida: { current: 8 } } };
  const combat = createCanvasCombatState([attacker, target]);
  combat.status = 'active';
  combat.participants.target.threatValue = 4;
  combat.participants.target.threatDie = 'd6';
  if (spent) combat.participants.target.enemyActions = combat.participants.target.enemyActions.map(action => ({ ...action, status: 'spent' }));
  if (playerDefense) combat.participants.target.actionDice = [{ id: 'defense-player', sides: 8, value: 7, status: 'committed' }];
  combat.pendingAttack = { id: 'pending', attackerId: 'attacker', targetId: 'target', weapon: attackWeapon, weaponName: attackWeapon.name,
    attackParts: [{ weapon: attackWeapon, weaponId: attackWeapon.runItemId }], status: 'awaiting-defense', pressure: { total: pressure } };
  mockRemote = { id: 'scene', items: [attacker, target], canvasCombat: combat };
  const initial = mockRemote;
  let currentScenario, setCurrent;
  const toast = jest.fn();
  const hook = renderHook(() => {
    const [scenario, setScenario] = useState(initial);
    currentScenario = scenario; setCurrent = setScenario;
    const ref = useRef(scenario); ref.current = scenario;
    return useCanvasCombatRuntime({ activeScenario: scenario, activeScenarioRef: ref,
      isPlayerView: false, playerName: 'master', gridConfig: { cellWidth: 50, cellHeight: 50 },
      scenarioCollectionName: 'canvas_scenarios', setActiveScenario: setScenario,
      safePersistItems: jest.fn(async () => {}), triggerToast: toast });
  });
  return { ...hook, toast, state: () => currentScenario, update: patch => setCurrent(patch) };
};

beforeEach(() => {
  jest.clearAllMocks();
  runTransaction.mockImplementation(async (_, callback) => callback(transaction()));
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => jest.restoreAllMocks());

test('two weapon copies roll their full profiles plus Threat once and spend one main action', async () => {
  const hook = setup();
  let duplicate;
  await act(async () => {
    const first = hook.result.current.rollEnemyDefense({ equipmentIds: ['dagger-one', 'dagger-two'], threatSelection: { useStored: true, customDice: [8] } });
    duplicate = hook.result.current.rollEnemyDefense({ equipmentIds: ['dagger-one', 'dagger-two'] });
    expect(await first).toBe(true);
  });
  expect(duplicate).toBe(false);
  const pending = hook.state().canvasCombat.pendingAttack;
  expect(pending.defenseItems.map(item => item.runItemId)).toEqual(['dagger-one', 'dagger-two']);
  expect(pending.defenseDice.map(die => [die.weaponId, die.sides, die.value])).toEqual([
    ['dagger-one', 4, 3], ['dagger-two', 6, 4], ['dagger-two', 6, 4],
  ]);
  expect(pending).toMatchObject({ totalDefense: 20, defenseShield: null, defenseCdBonus: 0 });
  expect(pending.defenseThreatDice.map(die => [die.sides, die.value])).toEqual([[6, 4], [8, 5]]);
  expect(runTransaction).toHaveBeenCalledTimes(1);
  const participant = hook.state().canvasCombat.participants.target;
  expect(participant.threatValue).toBeNull();
  expect(participant.enemyActions.find(action => action.id === 'attack').status).toBe('spent');
  await act(async () => { expect(await hook.result.current.resolvePendingAttack([])).toBe(true); });
  expect(hook.state().items[1].stats.vida.current).toBe(8);
  const entry = addDoc.mock.calls.at(-1)[1];
  expect(entry.defenderWeapon).toBe('Daga + Daga');
  expect(entry.resourcesSpent.filter(resource => resource.side === 'target' && resource.label === 'Acción principal')).toHaveLength(1);
});

test('weapon plus shield rolls only the weapon and freezes passive CD without mutating base stats', async () => {
  const hook = setup({ pressure: 12 });
  const rolls = Math.random.mock.calls.length;
  await act(async () => { expect(await hook.result.current.rollEnemyDefense({ equipmentIds: ['dagger-one', 'shield-one'] })).toBe(true); });
  const pending = hook.state().canvasCombat.pendingAttack;
  expect(pending).toMatchObject({ defenseCdBonus: 1, defenseShield: { runItemId: 'shield-one' }, totalDefense: 3 });
  expect(pending.defenseItems).toHaveLength(1);
  expect(pending.defenseDice).toHaveLength(1);
  expect(Math.random).toHaveBeenCalledTimes(rolls + 1);
  // The resolved selection belongs to this roll even if the inventory changes later.
  act(() => hook.update(scenario => ({ ...scenario, items: scenario.items.map(item => item.id === 'target' ? { ...item, inventory: [] } : item) })));
  await act(async () => { expect(await hook.result.current.resolvePendingAttack([], { equipmentIds: [] })).toBe(true); });
  expect(hook.state().items[1].stats).toMatchObject({ cd: { current: 4, max: 4 }, vida: { current: 7 } });
  expect(addDoc.mock.calls.at(-1)[1]).toMatchObject({ defenderShield: { name: 'Escudo' }, blocksLost: { vida: 1 } });
  expect(JSON.stringify(addDoc.mock.calls.at(-1)[1])).not.toMatch(/defenseCdBonus|effectiveCd|"cd"/);
});

test.each([['explicit shield', ['shield-one'], 6], ['no equipment', [], 5], ['default shield', undefined, 6]])(
  'receiving with %s keeps a spent action and Threat untouched', async (_, equipmentIds, expectedLife) => {
    const hook = setup({ pressure: 14, spent: true });
    const rolls = Math.random.mock.calls.length;
    await act(async () => { expect(await hook.result.current.resolvePendingAttack([], equipmentIds ? { equipmentIds } : {})).toBe(true); });
    expect(hook.state().items[1].stats.vida.current).toBe(expectedLife);
    expect(hook.state().items[1].stats.cd.current).toBe(4);
    expect(hook.state().canvasCombat.participants.target.threatValue).toBe(4);
    expect(Math.random).toHaveBeenCalledTimes(rolls);
    expect(addDoc.mock.calls.at(-1)[1].resourcesSpent.filter(resource => resource.side === 'target')).toEqual([]);
  },
);

test.each([
  ['dagger-one', 'dagger-two', 'shield-one'], ['heavy-one', 'shield-one'], ['dagger-one', 'dagger-one'], ['shield-one'],
].map(ids => [ids]))('rejects invalid active selection %j before rolling or spending', async equipmentIds => {
  const hook = setup();
  const rolls = Math.random.mock.calls.length;
  await act(async () => { expect(await hook.result.current.rollEnemyDefense({ equipmentIds })).toBe(false); });
  expect(Math.random).toHaveBeenCalledTimes(rolls);
  expect(runTransaction).not.toHaveBeenCalled();
  expect(hook.state().canvasCombat.participants.target.threatValue).toBe(4);
});

test('a spent main action prevents weapon defense but a shield alone cannot consume Threat', async () => {
  const hook = setup({ spent: true });
  await act(async () => { expect(await hook.result.current.rollEnemyDefense({ equipmentIds: ['dagger-one', 'shield-one'], threatSelection: { useStored: true, customDice: [20] } })).toBe(false); });
  expect(runTransaction).not.toHaveBeenCalled();
  expect(hook.state().canvasCombat.participants.target.threatValue).toBe(4);
  hook.unmount();
  const passive = setup();
  await act(async () => { expect(await passive.result.current.rollEnemyDefense({ equipmentIds: ['shield-one'], threatSelection: { useStored: true, customDice: [20] } })).toBe(false); });
  expect(passive.state().canvasCombat.participants.target.threatValue).toBe(4);
  expect(passive.state().canvasCombat.participants.target.enemyActions.find(action => action.id === 'attack').status).toBe('available');
});

test('a two-handed weapon is a legal full-profile defense, but receiving with an unrolled weapon is rejected', async () => {
  const hook = setup();
  await act(async () => { expect(await hook.result.current.resolvePendingAttack([], { equipmentIds: ['dagger-one'] })).toBe(false); });
  await act(async () => { expect(await hook.result.current.rollEnemyDefense({ equipmentIds: ['heavy-one'] })).toBe(true); });
  expect(hook.state().canvasCombat.pendingAttack.defenseDice.map(die => die.sides)).toEqual([8, 8]);
  expect(hook.state().canvasCombat.pendingAttack.defenseCdBonus).toBe(0);
});

test.each(['removed shield', 'changed hands', 'changed profile'])('rejects fresh transaction state with %s', async change => {
  const hook = setup();
  mockRemote = { ...mockRemote, items: mockRemote.items.map(item => item.id !== 'target' ? item : {
    ...item,
    inventory: change === 'removed shield' ? item.inventory.filter(gear => gear.runItemId !== 'shield-one')
      : item.inventory.map(gear => gear.runItemId !== 'dagger-one' ? gear : { ...gear,
        ...(change === 'changed hands' ? { handsRequired: 2 } : { dano: '2d4' }),
      }),
  }) };
  await act(async () => { expect(await hook.result.current.rollEnemyDefense({ equipmentIds: ['dagger-one', 'shield-one'] })).toBe(false); });
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-defense');
  expect(mockRemote.canvasCombat.participants.target.enemyActions.find(action => action.id === 'attack').status).toBe('available');
  expect(mockRemote.canvasCombat.participants.target.threatValue).toBe(4);
});

test('dual defense retry reuses results and resolution cannot race the in-flight roll', async () => {
  const hook = setup();
  const selection = { equipmentIds: ['dagger-one', 'dagger-two'] };
  const rolls = Math.random.mock.calls.length;
  runTransaction.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => { expect(await hook.result.current.rollEnemyDefense(selection)).toBe(false); });
  let release;
  runTransaction.mockImplementationOnce(async (_, callback) => {
    await new Promise(resolve => { release = resolve; });
    return callback(transaction());
  });
  let confirmation;
  await act(async () => {
    confirmation = hook.result.current.rollEnemyDefense(selection);
    await Promise.resolve();
    expect(await hook.result.current.resolvePendingAttack([], { equipmentIds: [] })).toBe(false);
    release();
    expect(await confirmation).toBe(true);
  });
  expect(Math.random).toHaveBeenCalledTimes(rolls + 3);
});

test.each([[dagger, 5], [heavy, 4]])('counterattack respects a passive shield only when the enemy attack left a free hand', async (attackWeapon, expectedLife) => {
  const hook = setup({ playerDefense: true, pressure: 3, attackWeapon });
  const rolls = Math.random.mock.calls.length;
  await act(async () => { expect(await hook.result.current.resolvePendingAttack(['defense-player'], { excessChoice: 'counterattack', counterWeapon: dagger })).toBe(true); });
  expect(hook.state().items[0].stats.vida.current).toBe(expectedLife);
  expect(hook.state().items[0].stats.cd.current).toBe(4);
  expect(Math.random).toHaveBeenCalledTimes(rolls);
});
