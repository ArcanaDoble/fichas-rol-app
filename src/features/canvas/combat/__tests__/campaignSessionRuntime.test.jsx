import { useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { runTransaction, updateDoc } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState, getAvailableMovement, markParticipantActed, submitActionDice } from '../canvasCombatState';
import { canCombatTokenActNow } from '../../../tactical-shared/legacyCombatRules';

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ runTransaction: jest.fn(), updateDoc: jest.fn(),
  doc: jest.fn((_db, ...parts) => parts.join('/')), addDoc: jest.fn(), collection: jest.fn(), setDoc: jest.fn(), deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 123) }));

let remote;
const hero = { id: 'yuuzu', name: 'Yuuzu', profileType: 'campaignCharacter', rulesSystem: 'campaign', layer: 'TOKEN',
  controlledBy: ['Rai'], teamId: 'aliados', actionDice: ['d6', 'd6', 'd6'], x: 0, y: 0, width: 50, height: 50,
  stats: { vida: { current: 28, max: 28 }, movimiento: { current: 2, max: 2 } } };
const enemy = { id: 'enemy', profileType: 'rogueliteEnemy', rulesSystem: 'campaign', teamId: 'enemies', fixedInitiative: 4 };
const yerma = { ...hero, id: 'yerma', name: 'Yerma', controlledBy: ['Alvaro'] };

function mount(initial, isPlayerView) {
  const toast = jest.fn();
  const hook = renderHook(() => {
    const [current, setCurrent] = useState(initial);
    const ref = useRef(current); ref.current = current;
    const runtime = useCanvasCombatRuntime({ activeScenario: current, activeScenarioRef: ref, isPlayerView, playerName: 'Rai',
      scenarioCollectionName: 'canvas_scenarios', gridConfig: { cellWidth: 50, cellHeight: 50 },
      setActiveScenario: setCurrent, safePersistItems: jest.fn(), triggerToast: toast });
    return { runtime, current, setCurrent };
  });
  return { ...hook, toast };
}

beforeEach(() => {
  jest.clearAllMocks();
  let combat = createCanvasCombatState([hero, enemy, yerma], { rulesSystem: 'campaign' });
  combat = submitActionDice(combat, 'yuuzu', [6, 2, 1]);
  combat = submitActionDice(combat, 'yerma', [2, 1, 1]);
  combat = markParticipantActed(combat, 'yuuzu');
  combat = markParticipantActed(combat, 'enemy');
  remote = { id: 'scene', rulesSystem: 'campaign', items: [hero, enemy, yerma], canvasCombat: combat };
  updateDoc.mockImplementation(async (_ref, data) => { remote = { ...remote, ...data }; });
  runTransaction.mockImplementation(async (_db, callback) => callback({
    get: async () => ({ exists: () => true, data: () => remote }),
    update: (_ref, data) => { remote = { ...remote, ...data }; },
  }));
});

test.each([false, true])('reopen synchronizes fresh combat and permits sprint + movement as player=%s', async isPlayerView => {
  const master = mount(remote, false);
  // A newer completed turn exists on the server, absent from the master's snapshot.
  remote = { ...remote, canvasCombat: markParticipantActed(remote.canvasCombat, 'yerma') };
  await act(async () => { expect(await master.result.current.runtime.undoActivation('yuuzu')).toBe(true); });
  expect(remote.canvasCombat.blocks[2].actedIds).toEqual(['yerma']);
  const h = isPlayerView ? mount(remote, true) : master;
  expect(canCombatTokenActNow(hero, remote.items, h.result.current.current)).toBe(true);
  const dieId = h.result.current.runtime.combatState.participants.yuuzu.actionDice[0].id;
  await act(async () => { h.result.current.runtime.activateSprint('yuuzu', dieId); });
  expect(getAvailableMovement(remote.canvasCombat.participants.yuuzu)).toBe(8);
  await act(async () => {
    expect(await h.result.current.runtime.confirmMovement('yuuzu', { from: { x: 0, y: 0 }, to: { x: 250, y: 0 }, cost: 5 })).toBe(true);
  });
  expect(remote.items.find(t => t.id === 'yuuzu')).toMatchObject({ x: 250, stats: { movimiento: { current: 3 } } });
  expect(getAvailableMovement(remote.canvasCombat.participants.yuuzu)).toBe(3);
  await act(async () => { h.result.current.runtime.completeActivation('yuuzu'); });
  expect(remote.canvasCombat.activeBlockIndex).toBe(remote.canvasCombat.blocks.length);
  expect(h.toast.mock.calls.some(([title]) => /No se pudo|Fuera de turno|Movimiento agotado/.test(title))).toBe(false);
});

test('two distinct master moves queued before the first acknowledgement use the saved position and remaining allowance', async () => {
  const master = mount(remote, false);
  const confirm = master.result.current.runtime.confirmMovement;
  const a = { x: 0, y: 0 }, b = { x: 50, y: 0 }, c = { x: 100, y: 0 };
  await act(async () => {
    const first = confirm('yuuzu', { from: a, to: b, cost: 1 });
    const second = confirm('yuuzu', { from: b, to: c, cost: 1 });
    expect(await Promise.all([first, second])).toEqual([true, true]);
  });
  expect(remote.canvasCombat.participants.yuuzu.movementRuntime).toMatchObject({
    spent: 2, history: [expect.objectContaining({ from: a, to: b }), expect.objectContaining({ from: b, to: c })],
  });
  expect(remote.items.find(t => t.id === 'yuuzu')).toMatchObject({ ...c, stats: { movimiento: { current: 0 } } });
});

test('a master cannot charge a move against a token another client has already repositioned', async () => {
  const master = mount(remote, false);
  const originalCombat = remote.canvasCombat;
  remote = { ...remote, items: remote.items.map(token => token.id === 'yuuzu' ? { ...token, x: 150 } : token) };
  await act(async () => {
    expect(await master.result.current.runtime.confirmMovement('yuuzu', {
      from: { x: 0, y: 0 }, to: { x: 50, y: 0 }, cost: 1,
    })).toBe(false);
  });
  expect(remote.canvasCombat).toEqual(originalCombat);
  expect(remote.items.find(t => t.id === 'yuuzu')).toMatchObject({ x: 150, stats: { movimiento: { current: 2 } } });
});

test.each(['allowance', 'turn', 'connection'])('a rejected master move leaves the saved position and movement intact (%s)', async cause => {
  const master = mount(remote, false);
  if (cause === 'allowance') {
    const { participants } = remote.canvasCombat;
    remote = { ...remote, canvasCombat: { ...remote.canvasCombat, participants: {
      ...participants, yuuzu: { ...participants.yuuzu, movementRuntime: { ...participants.yuuzu.movementRuntime, spent: 2 } },
    } } };
  } else if (cause === 'turn') {
    remote = { ...remote, canvasCombat: { ...remote.canvasCombat, round: remote.canvasCombat.round + 1 } };
  } else {
    runTransaction.mockRejectedValueOnce(new Error('Conexión interrumpida'));
  }
  const before = remote;
  await act(async () => {
    expect(await master.result.current.runtime.confirmMovement('yuuzu', {
      from: { x: 0, y: 0 }, to: { x: 50, y: 0 }, cost: 1,
    })).toBe(false);
  });
  expect(remote).toBe(before);
  expect(master.toast).toHaveBeenCalledWith('Error al confirmar movimiento', expect.any(String), 'warning');
});

test('players cannot reopen a completed turn and an unresolved attack blocks reopening', async () => {
  const player = mount(remote, true);
  await act(async () => { expect(await player.result.current.runtime.undoActivation('yuuzu')).toBe(false); });
  expect(runTransaction).not.toHaveBeenCalled();
  const master = mount(remote, false);
  remote = { ...remote, canvasCombat: { ...remote.canvasCombat, pendingAttack: { attackerId: 'enemy', targetId: 'yuuzu' } } };
  await act(async () => { expect(await master.result.current.runtime.undoActivation('yuuzu')).toBe(false); });
  expect(remote.canvasCombat.blocks[0].actedIds).toEqual(['yuuzu']);
});

test('a delayed snapshot cannot replace the sprint state waiting in the write queue', async () => {
  const master = mount(remote, false);
  await act(async () => { await master.result.current.runtime.undoActivation('yuuzu'); });
  const snapshotBeforeSprint = remote;
  const dieId = snapshotBeforeSprint.canvasCombat.participants.yuuzu.actionDice[0].id;
  act(() => {
    master.result.current.runtime.activateSprint('yuuzu', dieId);
    master.result.current.setCurrent({ ...snapshotBeforeSprint, canvasCombat: { ...snapshotBeforeSprint.canvasCombat } });
  });
  await act(async () => {});
  expect(remote.canvasCombat.participants.yuuzu.movementRuntime.sprintBonus).toBe(6);
  expect(remote.items.find(t => t.id === 'yuuzu').stats.movimiento.current).toBe(8);
  act(() => master.result.current.setCurrent(remote));
  expect(master.result.current.runtime.getAvailableMovement('yuuzu')).toBe(8);
});

test('a late player rolls from a stale snapshot while the master adds another participant', async () => {
  const late = { ...hero, id: 'late', name: 'Refuerzo PJ' };
  const npc = { ...enemy, id: 'late-npc', name: 'Refuerzo PNJ', fixedInitiative: 8, threatDice: ['d4', 'd8'] };
  const master = mount(remote, false);
  remote = { ...remote, items: [...remote.items, late, npc] };
  await act(async () => expect(await master.result.current.runtime.setCombatParticipation(late.id, true, { joinNow: true })).toBe(true));
  const player = mount(remote, true);
  const completed = remote.canvasCombat.blocks.flatMap(block => block.actedIds);
  await act(async () => expect(await master.result.current.runtime.setCombatParticipation(npc.id, true, { joinNow: true })).toBe(true));
  await act(async () => expect(await player.result.current.runtime.submitRoll(late.id, [6, 3, 2])).toBe(true));
  const { canvasCombat } = remote;
  expect(canvasCombat.blocks[canvasCombat.activeBlockIndex].memberIds).toEqual(['yerma']);
  expect(canvasCombat.blocks.flatMap(block => block.actedIds)).toEqual(completed);
  expect(canvasCombat.blocks.slice(canvasCombat.activeBlockIndex + 1).map(block => block.memberIds)).toEqual([[npc.id], [late.id]]);
  expect(canvasCombat.participants[npc.id].campaignThreatDice.map(die => die.die)).toEqual(['d4', 'd8']);
  expect(canvasCombat.participants[late.id].actionDice.map(die => die.value)).toEqual([6, 3, 2]);
  await act(async () => expect(await player.result.current.runtime.setCombatParticipation(npc.id, false)).toBe(false));
  expect(remote.items.find(item => item.id === npc.id).participatesInCombat).toBeUndefined();
});

test('advances from the latest encounter roster without losing new tokens or including opted-out ones', async () => {
  remote = { ...remote, canvasCombat: markParticipantActed(remote.canvasCombat, 'yerma') };
  const master = mount(remote, false);
  const queued = { ...enemy, id: 'queued', name: 'Refuerzo de la segunda ronda' };
  const disabled = { ...enemy, id: 'disabled', participatesInCombat: false };
  remote = { ...remote, items: [...remote.items.map(item => item.id === enemy.id ? { ...item, participatesInCombat: false } : item), queued, disabled] };

  await act(async () => expect(await master.result.current.runtime.nextRound()).toBe(true));
  expect(remote.canvasCombat.round).toBe(2);
  expect(Object.keys(remote.canvasCombat.participants).sort()).toEqual(['queued', 'yerma', 'yuuzu']);
  expect(remote.items.map(item => item.id)).toContain(disabled.id);
  expect(remote.canvasCombat.participants.queued).toMatchObject({ initiative: 4, awaitingRoll: false });
});
