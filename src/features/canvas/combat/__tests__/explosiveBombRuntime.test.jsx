import { useRef, useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { addDoc, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState } from '../canvasCombatState';

let documents;
let transactionRetries;
let failTransaction;

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  runTransaction: jest.fn(), doc: jest.fn((_db, ...parts) => parts.join('/')),
  addDoc: jest.fn(async () => ({ id: 'log' })), collection: jest.fn(() => 'combat_log'),
  serverTimestamp: jest.fn(() => 100), updateDoc: jest.fn(), setDoc: jest.fn(), deleteDoc: jest.fn(),
}));

const scenePath = 'canvas_scenarios/scene';
const bomb = { instanceId: 'bomb-1', name: 'Bomba explosiva', type: 'object' };
const secondBomb = { ...bomb, instanceId: 'bomb-2' };
const dagger = { instanceId: 'dagger-1', name: 'Daga', type: 'weapon', dano: '1d4', handsRequired: 1 };
const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
const scene = () => documents.get(scenePath);

function setup() {
  const hero = { id: 'hero', layer: 'TOKEN', name: 'Exploradora', profileType: 'rogueliteClass',
    controlledBy: ['Ada'], x: 0, y: 0, width: 50, height: 50, actionDice: ['d6'],
    inventory: [bomb, secondBomb], equippedItems: [bomb, secondBomb],
    equipmentLoadout: { belt_0: bomb, belt_1: secondBomb },
    stats: { vida: { current: 8, max: 8 }, cd: { current: 4, max: 4 } } };
  const ally = { id: 'ally', layer: 'TOKEN', name: 'Aliada', profileType: 'rogueliteClass',
    controlledBy: ['Ada'], x: 50, y: 0, width: 50, height: 50, actionDice: ['d6'],
    stats: { vida: { current: 8, max: 8 }, cd: { current: 4, max: 4 } } };
  const enemy = { id: 'enemy', layer: 'TOKEN', name: 'Ogro', profileType: 'rogueliteEnemy',
    x: 100, y: 0, width: 100, height: 100, inventory: [dagger], equippedItems: [dagger],
    stats: { vida: { current: 8, max: 8 }, cd: { current: 8, max: 8 } } };
  const outside = { id: 'outside', layer: 'TOKEN', name: 'Fuera', profileType: 'rogueliteEnemy',
    x: 200, y: 0, width: 50, height: 50,
    stats: { vida: { current: 8, max: 8 }, cd: { current: 4, max: 4 } } };
  const combat = createCanvasCombatState([hero, ally, enemy, outside], { now: 123 });
  Object.assign(combat, { status: 'active', roundPhase: 'turns',
    blocks: [{ memberIds: ['hero'], actedIds: [] }], activeBlockIndex: 0 });
  Object.assign(combat.participants.hero, { actionDice: [{ id: 'hero-d6', die: 'd6', sides: 6, value: 4, status: 'available' }], awaitingRoll: false });
  Object.assign(combat.participants.ally, { actionDice: [{ id: 'ally-reserve', die: 'd6', sides: 6, value: 3, status: 'committed' }], awaitingRoll: false });
  const initial = { id: 'scene', items: [hero, ally, enemy, outside], canvasCombat: combat };
  documents.set(scenePath, initial);
  const persistItems = jest.fn(async (_id, nextItems) => {
    documents.set(scenePath, { ...scene(), items: nextItems });
  });
  const toast = jest.fn();
  const hook = renderHook(() => {
    const [current, setCurrent] = useState(initial);
    const ref = useRef(current); ref.current = current;
    return {
      runtime: useCanvasCombatRuntime({ activeScenario: current, activeScenarioRef: ref,
        isPlayerView: false, playerName: 'Ada', gridConfig, scenarioCollectionName: 'canvas_scenarios',
        setActiveScenario: setCurrent, safePersistItems: persistItems, triggerToast: toast }),
      current, setCurrent, ref,
    };
  });
  const resource = () => hook.result.current.runtime.prepareItemUseResources('hero', bomb)[0];
  const impact = (useId = 'blast-1', selected = resource()) => hook.result.current.runtime.commitExplosiveBombImpact({
    useId, tokenId: 'hero', item: bomb, resource: selected, impactCell: { column: 2, row: 1 },
  });
  const confirm = (useId = 'blast-1', orientation = 'nw') => hook.result.current.runtime.commitExplosiveBombUse({
    useId, tokenId: 'hero', impactCell: { column: 2, row: 1 },
    placement: { orientation, x: orientation === 'nw' || orientation === 'sw' ? 50 : 100,
      y: orientation === 'nw' || orientation === 'ne' ? 0 : 50 },
  });
  return { ...hook, resource, impact, confirm, persistItems, toast };
}

beforeEach(() => {
  jest.clearAllMocks();
  documents = new Map(); transactionRetries = 1; failTransaction = false;
  doc.mockImplementation((_db, ...parts) => parts.join('/'));
  runTransaction.mockImplementation(async (_db, callback) => {
    let result; let writes;
    for (let attempt = 0; attempt < transactionRetries; attempt += 1) {
      writes = [];
      result = await callback({
        get: async path => {
          if (writes.length) throw new Error('Firestore reads must precede writes');
          return { exists: () => documents.has(path), data: () => documents.get(path) };
        },
        update: (path, patch) => writes.push({ path, patch, merge: true }),
        set: (path, patch, options) => writes.push({ path, patch, merge: options?.merge }),
      });
    }
    if (failTransaction) throw new Error('Sin conexión');
    writes.forEach(({ path, patch, merge }) => documents.set(path,
      merge ? { ...documents.get(path), ...patch } : patch));
    return result;
  });
  updateDoc.mockImplementation(async (path, patch) => {
    documents.set(path, { ...documents.get(path), ...patch });
  });
});
afterEach(() => jest.restoreAllMocks());

test('impact atomically spends one bomb and action die, preserving one 2d8 roll across transaction retries and duplicate clicks', async () => {
  const h = setup();
  const selected = h.resource();
  transactionRetries = 2;
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  let first; let duplicate;
  await act(async () => {
    first = h.impact('blast-1', selected);
    duplicate = h.impact('blast-1', selected);
    expect(await first).toMatchObject({ ok: true, rolls: [5, 5], pressure: 12, distance: 2 });
  });
  expect(duplicate).toBe(first);
  expect(random).toHaveBeenCalledTimes(3);
  expect(runTransaction).toHaveBeenCalledTimes(1);
  expect(scene().items[0].inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
  expect(scene().items[0].equipmentLoadout.belt_0).toBeNull();
  expect(scene().items[0].equipmentLoadout.belt_1.instanceId).toBe('bomb-2');
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('spent');
  expect(scene().canvasCombat.explosiveBlast).toMatchObject({ phase: 'choose-area', pressure: 12, rolls: [5, 5], targetIds: [] });
  expect(documents.get('canvas_scenarios/scene/itemUses/blast-1')).toMatchObject({ effect: 'explosive-impact', result: { pressure: 12 } });
  await act(async () => expect(await h.impact('blast-1', selected)).toMatchObject({ pressure: 12, rolls: [5, 5] }));
  expect(runTransaction).toHaveBeenCalledTimes(1);
});

test('an impact beyond the committed die cannot roll or consume the bomb', async () => {
  const h = setup();
  const random = jest.spyOn(Math, 'random');
  let outcome;
  await act(async () => {
    outcome = h.result.current.runtime.commitExplosiveBombImpact({ useId: 'too-far', tokenId: 'hero',
      item: bomb, resource: h.resource(), impactCell: { column: 5, row: 0 } });
  });
  expect(outcome).toBe(false);
  expect(random).not.toHaveBeenCalled();
  expect(runTransaction).not.toHaveBeenCalled();
  expect(scene().items[0].inventory).toHaveLength(2);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('available');
});

test('a moved thrower makes a formerly legal impact fail before the transactional roll or cost', async () => {
  const h = setup();
  documents.set(scenePath, { ...scene(), items: scene().items.map(item => item.id === 'hero' ? { ...item, x: -50 } : item) });
  const random = jest.spyOn(Math, 'random');
  let outcome;
  await act(async () => {
    outcome = await h.result.current.runtime.commitExplosiveBombImpact({ useId: 'moved', tokenId: 'hero',
      item: bomb, resource: h.resource(), impactCell: { column: 4, row: 0 } });
  });
  expect(outcome).toBe(false);
  expect(random).not.toHaveBeenCalled();
  expect(scene().items[0].inventory).toHaveLength(2);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('available');
});

test('failed impact leaves the bomb and die intact; retry keeps the original 2d8 results', async () => {
  const h = setup(); const selected = h.resource();
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  failTransaction = true;
  await act(async () => expect(await h.impact('blast-1', selected)).toBe(false));
  expect(scene().items[0].inventory).toHaveLength(2);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('available');
  expect(scene().canvasCombat.explosiveBlast).toBeUndefined();
  failTransaction = false;
  await act(async () => expect(await h.impact('blast-1', selected)).toMatchObject({ rolls: [1, 1], pressure: 4 }));
  expect(random).toHaveBeenCalledTimes(2);
  expect(scene().items[0].inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
});

test('the selected orientation creates one shared-pressure attack for the ally and one for the overlapping 2x2 enemy', async () => {
  const h = setup();
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  await act(async () => expect((await h.impact()).ok).toBe(true));
  await act(async () => expect((await h.confirm()).ok).toBe(true));
  expect(scene().canvasCombat.explosiveBlast).toMatchObject({ phase: 'resolving',
    placement: { orientation: 'nw' }, targetIds: ['ally', 'enemy'], nextTargetIndex: 1 });
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ targetId: 'ally', blastIndex: 0,
    blastCount: 2, pressure: { total: 12, thrownPenalty: 2 }, weaponResults: [5, 5] });
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('spent');
  expect(scene().items[0].inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
  expect(scene().items.find(item => item.id === 'outside').stats.vida.current).toBe(8);
  await act(async () => expect(await h.confirm()).toBe(false));
  expect(scene().canvasCombat.pendingAttack.targetId).toBe('ally');
  expect(scene().items[0].inventory).toHaveLength(1);
});

test('changing the 2x2 orientation changes who is hit without rolling or spending again', async () => {
  const h = setup();
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  await act(async () => expect((await h.impact()).ok).toBe(true));
  const rollsAfterImpact = random.mock.calls.length;
  await act(async () => expect((await h.confirm('blast-1', 'ne')).ok).toBe(true));
  expect(scene().canvasCombat.explosiveBlast).toMatchObject({ placement: { orientation: 'ne' }, targetIds: ['enemy'] });
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ targetId: 'enemy', blastCount: 1,
    pressure: { total: 12 }, weaponResults: [5, 5] });
  expect(random).toHaveBeenCalledTimes(rollsAfterImpact);
  expect(scene().items[0].inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
});

test('each affected creature spends only its own defense and CD; resolving all targets never spends the bomb twice', async () => {
  const h = setup();
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  await act(async () => expect((await h.impact()).ok).toBe(true));
  await act(async () => expect((await h.confirm()).ok).toBe(true));

  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack(['ally-reserve'])).toBe(true));
  expect(h.result.current.current.items.find(item => item.id === 'ally').stats.vida.current).toBe(6);
  expect(h.result.current.current.canvasCombat.participants.ally.actionDice[0].status).toBe('spent');
  expect(h.result.current.current.canvasCombat.pendingAttack).toMatchObject({ targetId: 'enemy',
    blastIndex: 1, pressure: { total: 12 }, weaponResults: [5, 5] });
  await waitFor(() => expect(scene().canvasCombat.pendingAttack).toMatchObject({ targetId: 'enemy' }));
  expect(h.result.current.current.canvasCombat.participants.enemy.enemyActions.find(action => action.id === 'attack').status).toBe('available');

  await act(async () => expect(await h.result.current.runtime.rollEnemyDefense({ equipmentIds: ['dagger-1'] })).toBe(true));
  expect(h.result.current.current.canvasCombat.pendingAttack.status).toBe('defense-rolled');
  expect(h.result.current.current.canvasCombat.participants.enemy.enemyActions.find(action => action.id === 'attack').status).toBe('spent');
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack([])).toBe(true));
  expect(h.result.current.current.canvasCombat.pendingAttack).toBeNull();
  expect(h.result.current.current.canvasCombat.explosiveBlast).toBeNull();
  expect(h.result.current.current.items.find(item => item.id === 'enemy').stats.vida.current).toBe(7);
  expect(h.result.current.current.items.find(item => item.id === 'outside').stats.vida.current).toBe(8);
  expect(h.result.current.current.items[0].inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
  expect(addDoc).toHaveBeenCalledTimes(2);
});

test('a target removed before its defense is skipped and the next target keeps the original pressure and paid resources', async () => {
  const h = setup();
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  await act(async () => expect((await h.impact()).ok).toBe(true));
  await act(async () => expect((await h.confirm()).ok).toBe(true));
  const rollsAfterImpact = random.mock.calls.length;
  expect(scene().canvasCombat.pendingAttack.targetId).toBe('ally');

  // The scene changes remotely just before the local defense handler runs.
  // This exercises its missing-target path before a React snapshot can prune it.
  const withoutAlly = { ...scene(), items: scene().items.filter(item => item.id !== 'ally') };
  documents.set(scenePath, withoutAlly);
  h.result.current.ref.current = withoutAlly;
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack([])).toBe(true));
  await waitFor(() => expect(scene().canvasCombat.pendingAttack?.targetId).toBe('enemy'));
  act(() => h.result.current.setCurrent(scene()));

  expect(scene().canvasCombat.explosiveBlast).toMatchObject({ targetIds: ['ally', 'enemy'], nextTargetIndex: 2 });
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ blastIndex: 1, blastCount: 2,
    pressure: { total: 12 }, weaponResults: [5, 5] });
  expect(scene().items[0].inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('spent');
  expect(random).toHaveBeenCalledTimes(rollsAfterImpact);
  expect(addDoc).not.toHaveBeenCalled();

  await act(async () => expect(await h.result.current.runtime.rollEnemyDefense({ equipmentIds: ['dagger-1'] })).toBe(true));
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack([])).toBe(true));
  expect(h.result.current.current.canvasCombat.pendingAttack).toBeNull();
  expect(h.result.current.current.canvasCombat.explosiveBlast).toBeNull();
  expect(h.result.current.current.items.find(item => item.id === 'enemy').stats.vida.current).toBe(7);
  expect(h.result.current.current.items[0].inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
  expect(addDoc).toHaveBeenCalledTimes(1);
});

test('a remote snapshot missing the pending target lets the next target defend against the authoritative scene', async () => {
  const h = setup();
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  await act(async () => expect((await h.impact()).ok).toBe(true));
  await act(async () => expect((await h.confirm()).ok).toBe(true));
  const rollsAfterImpact = random.mock.calls.length;
  expect(scene().canvasCombat.pendingAttack.targetId).toBe('ally');

  const remote = { ...scene(), items: scene().items.filter(item => item.id !== 'ally') };
  documents.set(scenePath, remote);
  act(() => h.result.current.setCurrent(remote));
  expect(h.result.current.runtime.pendingAttack).toMatchObject({ targetId: 'enemy',
    pressure: { total: 12 }, weaponResults: [5, 5] });
  // The remote document is still stale until the next defender commits its choice.
  expect(scene().canvasCombat.pendingAttack.targetId).toBe('ally');

  await act(async () => expect(await h.result.current.runtime.rollEnemyDefense({ equipmentIds: ['dagger-1'] })).toBe(true));
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ targetId: 'enemy', status: 'defense-rolled',
    pressure: { total: 12 }, weaponResults: [5, 5] });
  expect(scene().canvasCombat.participants.enemy.enemyActions.find(action => action.id === 'attack').status).toBe('spent');
  expect(random).toHaveBeenCalledTimes(rollsAfterImpact + 1);
  expect(scene().items[0].inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('spent');

  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack([])).toBe(true));
  expect(h.result.current.current.canvasCombat.pendingAttack).toBeNull();
  expect(h.result.current.current.canvasCombat.explosiveBlast).toBeNull();
  expect(addDoc).toHaveBeenCalledTimes(1);
});
