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
const bomb = { instanceId: 'bomb-1', name: 'Bomba de brea', type: 'object' };
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

const throwTar = (h, useId = 'tar-use') => h.result.current.runtime.commitItemUse({ useId,
  tokenId: 'hero', item: bomb, resource: h.resource(), impactCell: { column: 2, row: 1 }, placement: { orientation: 'nw' } });

test('tar consumes exactly one copy and die atomically, without pressure or damage', async () => {
  const h = setup();
  await act(async () => expect((await throwTar(h)).ok).toBe(true));
  expect(scene().items.find(item => item.id === 'hero').inventory.map(item => item.instanceId)).toEqual(['bomb-2']);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).not.toBe('available');
  expect(scene().items.find(item => item.geometryKind === 'tar')).toMatchObject({ x: 50, y: 0, width: 100, height: 100, areaEffect: { difficultTerrain: true, expires: 'combat-end' } });
  expect(scene().canvasCombat.pendingAttack).toBeFalsy();
  expect(scene().items.find(item => item.id === 'enemy').stats.vida.current).toBe(8);
});

test('out of range and failed transactions do not lose a bomb or die', async () => {
  const h = setup();
  await act(async () => expect((await h.result.current.runtime.commitItemUse({ useId: 'bad', tokenId: 'hero', item: bomb,
    resource: h.resource(), impactCell: { column: 9, row: 0 }, placement: { orientation: 'nw' } })).ok).toBe(false));
  failTransaction = true;
  await act(async () => expect((await throwTar(h)).ok).toBe(false));
  expect(scene().items.find(item => item.id === 'hero').inventory).toHaveLength(2);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('available');
});

test('fire without pressure consumes linked tar and end combat cleans remaining tar', async () => {
  const h = setup();
  await act(async () => throwTar(h));
  const zone = scene().items.find(item => item.geometryKind === 'tar');
  const linked = { ...zone, id: 'linked', x: zone.x + 100 };
  const isolated = { ...zone, id: 'isolated', x: zone.x + 350 };
  const fresh = { ...scene(), items: [...scene().items, linked, isolated] };
  documents.set(scenePath, fresh);
  act(() => h.result.current.setCurrent(fresh));
  await act(async () => expect(await h.result.current.runtime.igniteTarZone(zone.id)).toBe(true));
  expect(scene().items.filter(item => item.geometryKind === 'tar').map(item => item.id)).toEqual(['isolated']);
  const flames = scene().items.filter(item => item.geometryKind === 'tar-ignition');
  expect(flames).toHaveLength(2);
  expect(flames[0].areaEffect).toEqual(flames[1].areaEffect);
  expect(flames[0].areaEffect.startedAt).toEqual(expect.any(Number));
  await act(async () => h.result.current.runtime.finishCombat());
  expect(h.result.current.current.items.some(item => item.geometryKind === 'tar')).toBe(false);
});

test('practice outside combat deploys tar without creating a combat or losing other items', async () => {
  const h = setup();
  const fresh = { ...scene(), canvasCombat: null };
  documents.set(scenePath, fresh);
  act(() => h.result.current.setCurrent(fresh));
  let resource;
  act(() => { resource = h.resource(); });
  await act(async () => expect((await h.result.current.runtime.commitItemUse({ useId: 'practice', tokenId: 'hero', item: bomb,
    resource, impactCell: { column: 0, row: 0 }, placement: { orientation: 'se' } })).ok).toBe(true));
  expect(scene().canvasCombat).toBeNull();
  expect(scene().canvasPracticeCombat).toBeUndefined();
  expect(scene().items.filter(item => item.geometryKind === 'tar')).toHaveLength(1);
  expect(scene().items[0].inventory).toHaveLength(1);
});

test('cannot deploy tar outside the active turn', async () => {
  const h = setup();
  const fresh = { ...scene(), canvasCombat: { ...scene().canvasCombat, blocks: [{ memberIds: ['enemy'], actedIds: [] }] } };
  documents.set(scenePath, fresh);
  act(() => h.result.current.setCurrent(fresh));
  await act(async () => expect((await throwTar(h)).ok).toBe(false));
  expect(scene().items[0].inventory).toHaveLength(2);
});


test('tar survives a new round', async () => {
  const h = setup();
  await act(async () => throwTar(h));
  const id = scene().items.find(item => item.geometryKind === 'tar').id;
  await act(async () => h.result.current.runtime.nextRound());
  expect(h.result.current.current.items.find(item => item.id === id)?.geometryKind).toBe('tar');
});


test('the master removes only expired ignition presentations after the visible sequence', async () => {
  jest.useFakeTimers();
  try {
    const h = setup();
    await act(async () => throwTar(h));
    const zone = scene().items.find(item => item.geometryKind === 'tar');
    await act(async () => h.result.current.runtime.igniteTarZone(zone.id));
    expect(scene().items.some(item => item.geometryKind === 'tar-ignition')).toBe(true);
    await act(async () => { jest.advanceTimersByTime(5400); });
    expect(scene().items.some(item => item.geometryKind === 'tar-ignition')).toBe(false);
    expect(scene().items.find(item => item.id === 'hero').stats.vida.current).toBe(8);
    h.unmount();
  } finally { jest.useRealTimers(); }
});
