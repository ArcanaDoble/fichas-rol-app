import { useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { runTransaction } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState } from '../canvasCombatState';

let mockRemote;
jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  runTransaction: jest.fn(),
  addDoc: jest.fn(async () => ({ id: 'log' })), collection: jest.fn(() => ({})), doc: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => 1), setDoc: jest.fn(async () => {}), updateDoc: jest.fn(async () => {}), deleteDoc: jest.fn(async () => {}),
}));

const transaction = (write = true) => ({
  get: async () => ({ exists: () => true, data: () => mockRemote }),
  update: (_, value) => { if (write) mockRemote = { ...mockRemote, ...value }; },
});
const weapon = { id: 'blade', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano', canvasSlot: 'mainHand' };
const mixed = { useStored: true, customDice: [6, 6, 12] };

const setup = ({ player = false, defense = false, reserve = 6, practice = false, controlled = true } = {}) => {
  const attacker = { id: 'attacker', name: 'Atacante', profileType: player ? 'rogueliteClass' : 'rogueliteEnemy',
    controlledBy: ['Ada'], offenseBase: 3, equippedItems: [weapon], threatDie: 'd8', x: 0, y: 0, width: 25, height: 25 };
  const target = { id: 'target', name: 'Objetivo', profileType: 'rogueliteEnemy', controlledBy: ['master'],
    equippedItems: [weapon], threatDie: 'd8', x: 50, y: 0, width: 25, height: 25, stats: { cd: { current: 4 }, vida: { current: 5 } } };
  const combat = createCanvasCombatState([attacker, target]);
  combat.status = 'active';
  combat.participants.attacker.actionDice = [{ id: 'action', sides: 6, value: 5, status: 'available' }];
  combat.participants[defense ? 'target' : 'attacker'].threatValue = reserve;
  if (defense) combat.pendingAttack = { id: 'pending', attackerId: attacker.id, targetId: target.id,
    weapon, weaponName: weapon.name, status: 'awaiting-defense', pressure: { total: 30 },
    attackThreatDice: [{ id: 'attack-threat', die: 'd4', sides: 4, value: 3, source: 'custom' }],
    attackThreatUsed: { id: 'attack-threat', die: 'd4', sides: 4, value: 3, source: 'custom' } };
  const field = practice ? 'canvasPracticeCombat' : 'canvasCombat';
  mockRemote = { id: 'scene', items: [attacker, target], [field]: combat };
  const initial = mockRemote;
  const toast = jest.fn();
  let currentScenario = initial;
  const hook = renderHook(() => {
    const [scenario, setScenario] = useState(initial);
    currentScenario = scenario;
    const ref = useRef(scenario); ref.current = scenario;
    return useCanvasCombatRuntime({ activeScenario: scenario, activeScenarioRef: ref,
      isPlayerView: player || !controlled, playerName: 'Ada', gridConfig: { cellWidth: 50, cellHeight: 50 },
      scenarioCollectionName: 'canvas_scenarios', setActiveScenario: setScenario,
      safePersistItems: jest.fn(async () => {}), triggerToast: toast });
  });
  return { ...hook, toast, field, state: () => currentScenario };
};

beforeEach(() => {
  jest.clearAllMocks();
  runTransaction.mockImplementation(async (_, callback) => callback(transaction()));
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => jest.restoreAllMocks());

const begin = hook => act(() => hook.result.current.beginAttackDraft({ attackerId: 'attacker', targetId: 'target', weapon }));

test('enemy attack persists repeated Threat dice and reserve once while spending one main action', async () => {
  const hook = setup(); begin(hook);
  await act(async () => { await hook.result.current.confirmAttack({ threatSelection: mixed }); });
  const combat = mockRemote.canvasCombat;
  expect(combat.pendingAttack.attackThreatDice.map(die => die.value)).toEqual([6, 4, 4, 7]);
  expect(new Set(combat.pendingAttack.attackThreatDice.map(die => die.id)).size).toBe(4);
  expect(combat.pendingAttack).toMatchObject({ usedThreat: true, threatUsed: null, attackThreatUsed: null,
    actionDice: [], pressure: { actionPressure: 3, threatPressure: 21, total: 27 } });
  expect(combat.participants.attacker.threatValue).toBeNull();
  expect(combat.participants.attacker.enemyActions.find(action => action.id === 'attack').status).toBe('spent');
  expect(combat.participants.attacker.actionDice[0].status).toBe('available');
});

test.each([0, 6])('a selected reserve of %s is consumed; custom-only dice leave it intact', async reserve => {
  const hook = setup({ reserve }); begin(hook);
  await act(async () => { await hook.result.current.confirmAttack({ threatSelection: { useStored: false, customDice: [6, 6] } }); });
  expect(mockRemote.canvasCombat.participants.attacker.threatValue).toBe(reserve);
  expect(mockRemote.canvasCombat.pendingAttack.pressure.threatPressure).toBe(8);
  hook.unmount();
  const stored = setup({ reserve }); begin(stored);
  await act(async () => { await stored.result.current.confirmAttack({ useThreat: true }); });
  expect(mockRemote.canvasCombat.participants.attacker.threatValue).toBeNull();
  expect(mockRemote.canvasCombat.pendingAttack.attackThreatUsed).toMatchObject({ value: reserve, source: 'stored' });
});

test('player attacks ignore all Threat requests and keep normal action dice', async () => {
  const hook = setup({ player: true }); begin(hook);
  await act(async () => { await hook.result.current.confirmAttack({ actionDieIds: ['action'], threatSelection: mixed }); });
  expect(mockRemote.canvasCombat.pendingAttack.attackThreatDice).toEqual([]);
  expect(mockRemote.canvasCombat.pendingAttack.pressure).toMatchObject({ actionPressure: 5, threatPressure: 0, total: 8 });
  expect(mockRemote.canvasCombat.participants.attacker.threatValue).toBe(6);
});

test.each(['threatValue', 'threatDie'])('attack rejects a stale stored %s without spending', async field => {
  const hook = setup(); begin(hook);
  mockRemote = { ...mockRemote, canvasCombat: { ...mockRemote.canvasCombat, participants: { ...mockRemote.canvasCombat.participants,
    attacker: { ...mockRemote.canvasCombat.participants.attacker, [field]: field === 'threatValue' ? null : 'd12' } } } };
  let accepted;
  await act(async () => { accepted = await hook.result.current.confirmAttack({ threatSelection: mixed }); });
  expect(accepted).toBe(false);
  expect(mockRemote.canvasCombat.pendingAttack).toBeNull();
  expect(mockRemote.canvasCombat.participants.attacker.enemyActions.find(action => action.id === 'attack').status).toBe('available');
});

test('transaction retries and a failed-write retry reuse attack results rather than rolling again', async () => {
  const hook = setup(); begin(hook);
  const rolls = Math.random.mock.calls.length;
  runTransaction.mockImplementationOnce(async (_, callback) => {
    await callback(transaction(false));
    throw new Error('Connection interrupted');
  });
  await act(async () => { expect(await hook.result.current.confirmAttack({ threatSelection: mixed })).toBe(false); });
  expect(Math.random).toHaveBeenCalledTimes(rolls + 4);
  runTransaction.mockImplementationOnce(async (_, callback) => {
    await callback(transaction(false));
    return callback(transaction());
  });
  await act(async () => { expect(await hook.result.current.confirmAttack({ threatSelection: mixed })).toBe(true); });
  expect(Math.random).toHaveBeenCalledTimes(rolls + 4);
  expect(mockRemote.canvasCombat.pendingAttack.attackThreatDice.map(die => die.value)).toEqual([6, 4, 4, 7]);
});

test.each([false, true])('enemy defense persists all Threat dice and resolves them exactly once (practice=%s)', async practice => {
  const hook = setup({ defense: true, practice });
  let second;
  await act(async () => {
    const first = hook.result.current.rollEnemyDefense({ equipmentId: 'blade', threatSelection: mixed });
    second = hook.result.current.rollEnemyDefense({ equipmentId: 'blade', threatSelection: mixed });
    expect(await first).toBe(true);
  });
  expect(second).toBe(false);
  const combat = hook.state()[hook.field];
  expect(combat.pendingAttack.defenseThreatDice.map(die => die.value)).toEqual([6, 4, 4, 7]);
  expect(combat.pendingAttack).toMatchObject({ status: 'defense-rolled', totalDefense: 24, remainingPressure: 6, threatUsed: null });
  expect(combat.pendingAttack.attackThreatDice[0].value).toBe(3);
  expect(combat.participants.target.threatValue).toBeNull();
  expect(combat.participants.target.enemyActions.find(action => action.id === 'attack').status).toBe('spent');
  await act(async () => { expect(await hook.result.current.resolvePendingAttack([])).toBe(true); });
  expect(hook.state().items.find(item => item.id === 'target').stats.vida.current).toBe(4);
  expect(hook.state()[hook.field]?.pendingAttack).toBeFalsy();
});

test('defense verifies a fresh reserve and control before spending anything', async () => {
  const hook = setup({ defense: true });
  mockRemote = { ...mockRemote, canvasCombat: { ...mockRemote.canvasCombat, participants: { ...mockRemote.canvasCombat.participants,
    target: { ...mockRemote.canvasCombat.participants.target, threatValue: null } } } };
  await act(async () => { expect(await hook.result.current.rollEnemyDefense({ equipmentId: 'blade', threatSelection: mixed })).toBe(false); });
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-defense');
  expect(mockRemote.canvasCombat.participants.target.enemyActions.find(action => action.id === 'attack').status).toBe('available');
  hook.unmount();
  const uncontrolled = setup({ defense: true, controlled: false });
  const calls = runTransaction.mock.calls.length;
  act(() => { expect(uncontrolled.result.current.rollEnemyDefense({ equipmentId: 'blade', threatSelection: mixed })).toBe(false); });
  expect(runTransaction).toHaveBeenCalledTimes(calls);
});

test('defense retry preserves rolls and a custom-only selection preserves the current reserve', async () => {
  const hook = setup({ defense: true });
  const rolls = Math.random.mock.calls.length;
  runTransaction.mockRejectedValueOnce(new Error('Offline'));
  const choice = { equipmentId: 'blade', threatSelection: { useStored: false, customDice: [6, 6] } };
  await act(async () => { expect(await hook.result.current.rollEnemyDefense(choice)).toBe(false); });
  expect(Math.random).toHaveBeenCalledTimes(rolls + 3);
  mockRemote = { ...mockRemote, canvasCombat: { ...mockRemote.canvasCombat, participants: { ...mockRemote.canvasCombat.participants,
    target: { ...mockRemote.canvasCombat.participants.target, threatValue: 8 } } } };
  await act(async () => { expect(await hook.result.current.rollEnemyDefense(choice)).toBe(true); });
  expect(Math.random).toHaveBeenCalledTimes(rolls + 3);
  expect(mockRemote.canvasCombat.participants.target.threatValue).toBe(8);
  expect(mockRemote.canvasCombat.pendingAttack.totalDefense).toBe(11);
});
