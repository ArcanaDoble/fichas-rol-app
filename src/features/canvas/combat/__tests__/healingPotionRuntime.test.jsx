import { useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState, getAvailableMovement, undoParticipantMovement } from '../canvasCombatState';
import { getHealingPotionBlockReason } from '../../item-use/healingPotionRules';

let mockDocuments, mockRetries, mockFailAfterCallback;
jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  runTransaction: jest.fn(), doc: jest.fn((_db, ...parts) => parts.join('/')),
  addDoc: jest.fn(), collection: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp', isEqual: () => true })),
}));

const scenePath = 'canvas_scenarios/scene';
const potion = { instanceId: 'potion-1', name: 'Poción de curación', type: 'object' };
const dice = [{ id: 'hero-r1-a1', die: 'd20', sides: 20, value: 20, status: 'available' }];
const scene = () => mockDocuments.get(scenePath);
const logEntries = () => [...mockDocuments.entries()].filter(([path]) => path.startsWith('combat_log/')).map(([, value]) => value);

function setup({ enemy = false, combat = true, quantity = 1, life = 2, maxLife = 5, linked = false, beltOnly = false, antidote = false, bandage = false, potionType = null } = {}) {
  const item = { ...potion, ...(antidote ? { name: 'Antídoto' } : {}),
    ...(bandage ? { name: 'Vendaje' } : {}),
    ...(potionType ? { name: `Poción de ${potionType === 'haste-potion' ? 'presteza' : 'vitalidad'}`, itemUseId: potionType } : {}), quantity };
  const token = { id: 'hero', layer: 'TOKEN', name: enemy ? 'Duende' : 'Exploradora', profileType: enemy ? 'rogueliteEnemy' : 'rogueliteClass',
    controlledBy: ['Ada'], status: bandage ? ['sangrado'] : antidote ? ['envenenado'] : [], actionDice: ['d20'], threatDie: 'd8',
    inventory: beltOnly ? [] : [item], equippedItems: beltOnly ? [] : [item], equipmentLoadout: { belt_0: item },
    stats: { vida: { current: life, max: maxLife }, cd: { current: 7, max: 7 }, movimiento: { current: 4, max: 4 } },
    ...(linked ? { linkedClassOwner: 'Ada', linkedClassId: 'class', runId: 'run', runRevision: 3 } : {}) };
  const initial = { id: 'scene', items: [token] };
  if (combat) {
    initial.canvasCombat = createCanvasCombatState([token], { now: 123 });
    Object.assign(initial.canvasCombat, { status: 'active', roundPhase: 'turns', blocks: [{ memberIds: ['hero'], actedIds: [] }], activeBlockIndex: 0 });
    Object.assign(initial.canvasCombat.participants.hero, { actionDice: dice, awaitingRoll: false, threatValue: 5 });
  }
  mockDocuments.set(scenePath, initial);
  if (linked) mockDocuments.set('players/Ada/rogueliteClasses/class', { activeRun: { id: 'run', revision: 3, currentScenarioId: 'scene' } });
  const toast = jest.fn();
  const hook = renderHook(() => {
    const [current, setCurrent] = useState(initial);
    const ref = useRef(current); ref.current = current;
    const runtime = useCanvasCombatRuntime({ activeScenario: current, activeScenarioRef: ref, isPlayerView: !enemy, playerName: 'Ada',
      scenarioCollectionName: 'canvas_scenarios', gridConfig: {}, setActiveScenario: setCurrent,
      safePersistItems: jest.fn(), triggerToast: toast });
    return { runtime, current, setCurrent };
  });
  const prepare = () => hook.result.current.runtime.prepareItemUseResources('hero', item)[0];
  const commit = (resource, useId = 'use-1') => hook.result.current.runtime.commitItemUse({ useId, tokenId: 'hero', item, resource });
  return { ...hook, item, prepare, commit, toast };
}

beforeEach(() => {
  jest.clearAllMocks(); mockDocuments = new Map(); mockRetries = 1; mockFailAfterCallback = false;
  doc.mockImplementation((_db, ...parts) => parts.join('/'));
  serverTimestamp.mockImplementation(() => ({ _methodName: 'serverTimestamp', isEqual: () => true }));
  runTransaction.mockImplementation(async (_db, callback) => {
    let result, writes;
    for (let index = 0; index < mockRetries; index += 1) {
      writes = [];
      result = await callback({
        get: async path => {
          if (writes.length) throw new Error('Firestore reads must precede writes');
          return { exists: () => mockDocuments.has(path), data: () => mockDocuments.get(path) };
        },
        update: (path, data) => writes.push({ path, data, merge: true }),
        set: (path, data, options) => writes.push({ path, data, merge: options?.merge }),
      });
    }
    if (mockFailAfterCallback) throw new Error('Sin conexión');
    writes.forEach(({ path, data, merge }) => mockDocuments.set(path, merge ? { ...mockDocuments.get(path), ...data } : data));
    return result;
  });
});

afterEach(() => jest.restoreAllMocks());

test('player spends one action ignoring its value, caps 1d4 healing and atomically updates the linked adventure', async () => {
  const h = setup({ linked: true });
  const resource = h.prepare();
  jest.spyOn(Math, 'random').mockReturnValue(0.999);
  let result;
  await act(async () => { result = await h.commit(resource); });
  expect(h.toast.mock.calls.filter(([title]) => title.startsWith('No '))).toEqual([]);
  expect(result).toEqual({ ok: true, effect: 'heal', useId: 'use-1', roll: 4, healed: 3, previousLife: 2, nextLife: 5, maxLife: 5 });
  expect(scene().items[0].inventory).toEqual([]);
  expect(scene().items[0].equipmentLoadout.belt_0).toBeNull();
  expect(scene().items[0].stats.vida.current).toBe(5);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('spent');
  expect(mockDocuments.get('players/Ada/rogueliteClasses/class').activeRun).toMatchObject({ revision: 4, stats: { vida: { current: 5 } } });
  expect(logEntries()).toHaveLength(1);
  expect(logEntries()[0]).toMatchObject({ healed: 3, dice: [{ faces: 4, value: 4 }], resourcesSpent: [{ label: '1 consumible' }, { label: '1 dado de acción' }] });
  expect(logEntries()[0].timestamp).toBe(serverTimestamp.mock.results[0].value);
  expect(JSON.stringify(logEntries()[0])).not.toMatch(/previousLife|nextLife|maxLife|"cd"|"stats"/);
});

test('enemy uses its main action, keeps Threat, and cannot recreate a consumed legacy belt potion', async () => {
  const h = setup({ enemy: true, beltOnly: true });
  const resource = h.prepare();
  expect(resource.kind).toBe('enemy-action');
  await act(async () => { expect((await h.commit(resource)).ok).toBe(true); });
  expect(scene().canvasCombat.participants.hero.enemyActions.find(action => action.id === 'attack').status).toBe('spent');
  expect(scene().canvasCombat.participants.hero.threatValue).toBe(5);
  expect(scene().items[0].equipmentLoadout.belt_0).toBeNull();
  expect(scene().items[0].inventory).toEqual([]);
  const refreshed = { ...scene().canvasCombat, participants: { hero: { ...scene().canvasCombat.participants.hero,
    enemyActions: scene().canvasCombat.participants.hero.enemyActions.map(action => ({ ...action, status: 'available' })) } } };
  act(() => h.result.current.setCurrent(current => ({ ...current, canvasCombat: refreshed })));
  await act(async () => { expect(await h.commit(h.prepare(), 'another-use')).toBe(false); });
  expect(logEntries()).toHaveLength(1);
});

test.each([false, true])('outside combat enemy=%s pays a stable practice resource without creating combat', async enemy => {
  const h = setup({ enemy, combat: false });
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  const resource = h.prepare();
  expect(resource.kind).toBe(enemy ? 'enemy-action' : 'action-die');
  expect(resource.practice).toBe(true);
  expect(h.result.current.runtime.getItemUseResources('hero', h.item)[0]).toEqual(resource);
  expect(random).toHaveBeenCalledTimes(1);
  await act(async () => { expect((await h.commit(resource)).roll).toBe(3); });
  expect(random).toHaveBeenCalledTimes(2);
  expect(scene()).not.toHaveProperty('canvasCombat');
  expect(scene()).not.toHaveProperty('canvasPracticeCombat');
  expect(logEntries()[0].resourcesSpent).toEqual([{ label: '1 consumible' }, { label: enemy ? 'Acción principal' : '1 dado de acción' }]);
  expect(h.result.current.runtime.getItemUseResources('hero', h.item).find(candidate => candidate.id === resource.id).status).toBe('spent');
});

test.each([
  ['enemy-action', false], ['enemy-movement', false], ['threat-die', false], ['manual-threat', false],
  ['enemy-action', true], ['enemy-movement', true], ['threat-die', true], ['manual-threat', true],
])('%s alone pays the potion; practice=%s, its value never increases healing', async (kind, practice) => {
  const h = setup({ enemy: true, combat: !practice });
  if (!practice) {
    const participant = scene().canvasCombat.participants.hero;
    participant.movementRuntime.sprintBonus = 3;
    participant.movementRuntime.history = [{ cost: 2, from: { x: 0, y: 0 } }];
  }
  h.prepare();
  const before = h.result.current.runtime.getItemUseResources('hero', h.item);
  const resource = before.find(candidate => candidate.kind === kind);
  expect(resource.status).toBe('available');
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  await act(async () => { expect(await h.commit(resource)).toMatchObject({ roll: 1, healed: 1 }); });
  expect(random).toHaveBeenCalledTimes(1);
  const after = h.result.current.runtime.getItemUseResources('hero', h.item);
  before.forEach(candidate => {
    const next = after.find(value => value.id === candidate.id);
    if (candidate.id !== resource.id || kind === 'manual-threat') expect(next).toEqual(candidate);
    else expect(next.status).toBe('spent');
  });
  if (kind === 'enemy-movement') {
    expect(scene().items[0].stats.movimiento.current).toBe(0);
    if (!practice) {
      expect(getAvailableMovement(scene().canvasCombat.participants.hero)).toBe(0);
      expect(undoParticipantMovement(scene().canvasCombat, 'hero').undoneEntry).toBeNull();
    }
  } else expect(scene().items[0].stats.movimiento.current).toBe(4);
  expect(logEntries()[0].dice).toHaveLength(1);
  expect(logEntries()[0]).toMatchObject({ targetId: 'hero', effect: 'heal', healed: 1 });
  if (practice) expect(scene()).not.toHaveProperty('canvasCombat');
});

test('manual Threat can pay without reserve or actions but cannot bypass turn eligibility', async () => {
  const h = setup({ enemy: true });
  const participant = scene().canvasCombat.participants.hero;
  participant.enemyActions = participant.enemyActions.map(action => ({ ...action, status: 'spent' }));
  participant.threatValue = null;
  h.prepare();
  const resources = h.result.current.runtime.getItemUseResources('hero', h.item);
  expect(resources.filter(resource => resource.status === 'available').every(resource => resource.kind === 'manual-threat')).toBe(true);
  const manual = resources.find(resource => resource.kind === 'manual-threat' && resource.sides === 20);
  const remote = { ...scene(), canvasCombat: { ...scene().canvasCombat, blocks: [{ memberIds: ['other'], actedIds: [] }] } };
  mockDocuments.set(scenePath, remote);
  await act(async () => { expect(await h.commit(manual)).toBe(false); });
  expect(logEntries()).toHaveLength(0);
  mockDocuments.set(scenePath, { ...remote, canvasCombat: { ...remote.canvasCombat, blocks: [{ memberIds: ['hero'], actedIds: [] }] } });
  await act(async () => { expect((await h.commit(manual)).ok).toBe(true); });
  expect(scene().canvasCombat.participants.hero.threatValue).toBeNull();
  expect(scene().canvasCombat.participants.hero.enemyActions.every(action => action.status === 'spent')).toBe(true);
  expect(logEntries()[0].resourcesSpent[1].label).toBe('Amenaza puntual d20');
});

test('a fresh practice preparation invalidates the preceding session resource', async () => {
  const h = setup({ combat: false });
  const old = h.prepare(), current = h.prepare();
  expect(current.practiceId).not.toBe(old.practiceId);
  await act(async () => { expect(await h.commit(old)).toBe(false); });
  expect(runTransaction).not.toHaveBeenCalled();
});

test('enemy practice without configured Threat offers actions and manual dice without inventing a reserve', async () => {
  const h = setup({ enemy: true, combat: false });
  delete scene().items[0].threatDie;
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  h.prepare();
  const resources = h.result.current.runtime.getItemUseResources('hero', h.item);
  expect(resources.some(resource => resource.kind === 'threat-die')).toBe(false);
  expect(new Set(resources.map(resource => resource.kind))).toEqual(new Set(['enemy-action', 'enemy-movement', 'manual-threat']));
  expect(random).not.toHaveBeenCalled();
  await act(async () => { expect((await h.commit(resources[0])).ok).toBe(true); });
  expect(h.toast).not.toHaveBeenCalled();
});

test('double confirmation and Firestore retries share one roll, one unit and one log', async () => {
  const h = setup({ quantity: 2, combat: false });
  const resource = h.prepare();
  mockRetries = 2;
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  let first, second;
  await act(async () => { first = h.commit(resource); second = h.commit(resource); await first; });
  expect(second).toBe(first);
  expect(scene().items[0].inventory[0].quantity).toBe(1);
  expect(scene().items[0].equipmentLoadout.belt_0.quantity).toBe(1);
  expect(scene().items[0].stats.vida.current).toBe(3);
  expect(logEntries()).toHaveLength(1);
  expect(random).toHaveBeenCalledTimes(1);
  await act(async () => { expect(await h.commit(resource)).toEqual(await first); });
  expect(runTransaction).toHaveBeenCalledTimes(1);
});

test('failed persistence leaves health, item and action intact; retry preserves the original roll', async () => {
  const h = setup(); const resource = h.prepare();
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  mockFailAfterCallback = true;
  await act(async () => { expect(await h.commit(resource)).toBe(false); });
  expect(scene().items[0].stats.vida.current).toBe(2);
  expect(scene().items[0].inventory).toHaveLength(1);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('available');
  expect(logEntries()).toHaveLength(0);
  mockFailAfterCallback = false;
  await act(async () => { expect((await h.commit(resource)).roll).toBe(3); });
  expect(random).toHaveBeenCalledTimes(1);
});

test.each(['poison', 'dead', 'control', 'item', 'resource', 'turn', 'pending', 'new-combat'])('fresh %s invalidation rejects without spending or rolling', async change => {
  const h = setup(); const resource = h.prepare();
  const remote = { ...scene(), items: scene().items.map(token => ({ ...token })), canvasCombat: { ...scene().canvasCombat } };
  if (change === 'poison') remote.items[0].statusEffects = [{ label: 'Envenenado' }];
  if (change === 'dead') remote.items[0].stats = { ...remote.items[0].stats, vida: { current: 0, max: 5 } };
  if (change === 'control') remote.items[0].controlledBy = ['Otro'];
  if (change === 'item') Object.assign(remote.items[0], { inventory: [], equippedItems: [], equipmentLoadout: {} });
  if (change === 'resource') remote.canvasCombat.participants = { hero: { ...remote.canvasCombat.participants.hero, actionDice: [{ ...dice[0], status: 'spent' }] } };
  if (change === 'turn') remote.canvasCombat.blocks = [{ memberIds: ['other'], actedIds: [] }];
  if (change === 'pending') remote.canvasCombat.pendingAttack = { id: 'pending' };
  if (change === 'new-combat') remote.canvasCombat.startedAt = 999;
  mockDocuments.set(scenePath, remote);
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  await act(async () => { expect(await h.commit(resource)).toBe(false); });
  expect(scene()).toBe(remote);
  expect(logEntries()).toHaveLength(0);
  expect(random).not.toHaveBeenCalled();
});

test('same die id/value in a newly opened combat cannot validate an old modal resource', async () => {
  const h = setup(); const oldResource = h.prepare();
  const next = { ...scene(), canvasCombat: { ...scene().canvasCombat, startedAt: 456 } };
  mockDocuments.set(scenePath, next);
  act(() => h.result.current.setCurrent(next));
  await act(async () => { expect(await h.commit(oldResource)).toBe(false); });
  expect(runTransaction).not.toHaveBeenCalled();
  expect(h.prepare()).toMatchObject({ id: oldResource.id, value: oldResource.value, combatStartedAt: 456 });
});

test('a newer linked adventure revision cannot be overwritten by a stale scene token', async () => {
  const h = setup({ linked: true }); const resource = h.prepare();
  const profilePath = 'players/Ada/rogueliteClasses/class';
  const newer = { activeRun: { id: 'run', revision: 4, currentScenarioId: 'scene', stats: { vida: { current: 4, max: 5 } } } };
  mockDocuments.set(profilePath, newer);
  const random = jest.spyOn(Math, 'random');
  await act(async () => { expect(await h.commit(resource)).toBe(false); });
  expect(mockDocuments.get(profilePath)).toBe(newer);
  expect(scene().items[0].inventory).toHaveLength(1);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('available');
  expect(random).not.toHaveBeenCalled();
});

test('fresh health is used, and knowingly drinking at full health consumes the potion with zero healing', async () => {
  const h = setup(); const resource = h.prepare();
  mockDocuments.set(scenePath, { ...scene(), items: [{ ...scene().items[0], stats: { vida: { current: 5, max: 5 } } }] });
  jest.spyOn(Math, 'random').mockReturnValue(0.999);
  await act(async () => { expect(await h.commit(resource)).toMatchObject({ roll: 4, healed: 0, previousLife: 5, nextLife: 5 }); });
  expect(scene().items[0].inventory).toEqual([]);
  expect(logEntries()[0].healed).toBe(0);
  expect(logEntries()[0].dice[0].value).toBe(4);
});

test('two potion uses read authoritative Life even if a delayed local snapshot still shows the original 3', async () => {
  const h = setup({ combat: false, quantity: 2, life: 3, maxLife: 8, linked: true });
  const delayed = h.result.current.current;
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.999);
  const first = h.prepare();
  await act(async () => { expect(await h.commit(first, 'first')).toMatchObject({ previousLife: 3, nextLife: 7, roll: 4 }); });
  expect(scene().items[0]).toMatchObject({ canvasRuntimeRevision: 1,
    canvasHealingEffect: { useId: 'first', previousLife: 3, nextLife: 7, roll: 4 } });
  const firstModified = scene().lastModified;
  act(() => h.result.current.setCurrent(delayed));
  random.mockReturnValue(0);
  const second = h.prepare();
  await act(async () => { expect(await h.commit(second, 'second')).toMatchObject({ previousLife: 7, nextLife: 8, roll: 1 }); });
  expect(scene().items[0].stats.vida.current).toBe(8);
  expect(h.result.current.current.items[0].stats.vida.current).toBe(8);
  expect(scene().items[0].inventory).toEqual([]);
  expect(scene().items[0].canvasRuntimeRevision).toBe(2);
  expect(scene().items[0].canvasHealingEffect).toMatchObject({ previousLife: 7, nextLife: 8, roll: 1, healed: 1 });
  expect(scene().lastModified).toBeGreaterThan(firstModified);
  expect(logEntries().map(entry => entry.dice[0].value)).toEqual([4, 1]);
});

test('a potion acknowledgement does not replace a newer scene snapshot that arrived while saving', async () => {
  const h = setup({ combat: false });
  const resource = h.prepare();
  const transact = runTransaction.getMockImplementation();
  runTransaction.mockImplementation(async (...args) => {
    const result = await transact(...args);
    const newer = { ...scene(), lastModified: scene().lastModified + 1, items: scene().items.map(token => ({ ...token,
      canvasRuntimeRevision: token.canvasRuntimeRevision + 1, name: 'Cambio posterior',
    })) };
    act(() => h.result.current.setCurrent(newer));
    return result;
  });
  await act(async () => { expect((await h.commit(resource)).ok).toBe(true); });
  expect(h.result.current.current.items[0].name).toBe('Cambio posterior');
  expect(h.result.current.current.items[0].canvasRuntimeRevision).toBe(2);
});

test('pure availability checks poison formats, invalid health and zero Life without blocking full Life', () => {
  const token = { stats: { vida: { current: 5, max: 5 } } };
  expect(getHealingPotionBlockReason(token)).toBeNull();
  expect(getHealingPotionBlockReason({ ...token, status: ['Envenenado'] })).toMatch(/Envenenado/);
  expect(getHealingPotionBlockReason({ ...token, statusEffects: [{ name: 'envenenado' }] })).toMatch(/Envenenado/);
  expect(getHealingPotionBlockReason({ stats: { vida: { current: 0, max: 5 } } })).toMatch(/0 de Vida/);
  expect(getHealingPotionBlockReason({})).toMatch(/válidas/);
});


test.each([false, true])('Antidote removes poison atomically without rolling or healing; enemy=%s', async enemy => {
  const h = setup({ antidote: true, enemy, linked: !enemy });
  const resource = h.prepare();
  const random = jest.spyOn(Math, 'random');
  let result;
  await act(async () => { result = await h.commit(resource); });
  expect(result).toMatchObject({ ok: true, effect: 'remove-poison', targetId: 'hero' });
  expect(scene().items[0].status).not.toContain('envenenado');
  expect(scene().items[0].stats.vida.current).toBe(2);
  expect(scene().items[0].inventory).toHaveLength(0);
  expect(logEntries()[0]).toMatchObject({ effect: 'remove-poison', dice: [] });
  expect(random).not.toHaveBeenCalled();
  if (!enemy) expect(mockDocuments.get('players/Ada/rogueliteClasses/class').activeRun.statusEffects).toEqual([]);
  await act(async () => { expect(await h.commit(resource)).toEqual(result); });
  expect(logEntries()).toHaveLength(1);
});

test.each(['moved', 'cleaned', 'missing', 'failed'])('Antidote freshly validates %s target and consumes nothing on failure', async change => {
  const h = setup({ antidote: true });
  const ally = { ...scene().items[0], id: 'ally', name: 'Aliada', x: 0, y: 0, width: 25, height: 25, inventory: [] };
  const before = { ...scene(), items: [...scene().items, ally] };
  mockDocuments.set(scenePath, before);
  act(() => h.result.current.setCurrent(before));
  const resource = h.prepare();
  const fresh = { ...before, items: before.items.map(item => item.id !== 'ally' ? item
    : change === 'moved' ? { ...item, x: 100 } : change === 'cleaned' ? { ...item, status: [] } : item) };
  if (change === 'missing') fresh.items = fresh.items.filter(item => item.id !== 'ally');
  if (change === 'failed') mockFailAfterCallback = true;
  mockDocuments.set(scenePath, fresh);
  await act(async () => { expect(await h.result.current.runtime.commitItemUse({ useId: 'antidote', tokenId: 'hero', targetId: 'ally', item: h.item, resource })).toBe(false); });
  expect(scene().items[0].inventory).toHaveLength(1);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('available');
});

test('Antidote cures another linked creature at Toque and preserves both adventures', async () => {
  const h = setup({ antidote: true, linked: true });
  const ally = { ...scene().items[0], id: 'ally', name: 'Aliada', linkedClassOwner: 'Bea', linkedClassId: 'other', runId: 'other-run',
    controlledBy: ['Bea'], status: ['derribado'], statusEffects: [{ label: 'Envenenado' }], x: 0, y: 0, width: 25, height: 25, inventory: [] };
  const before = { ...scene(), items: [...scene().items, ally] };
  mockDocuments.set('players/Bea/rogueliteClasses/other', { activeRun: { id: 'other-run', revision: 3, currentScenarioId: 'scene' } });
  mockDocuments.set(scenePath, before);
  act(() => h.result.current.setCurrent(before));
  const resource = h.prepare();
  await act(async () => { expect(await h.result.current.runtime.commitItemUse({ useId: 'antidote', tokenId: 'hero', targetId: 'ally', item: h.item, resource })).toMatchObject({ ok: true, targetId: 'ally' }); });
  expect(scene().items[0].status).toContain('envenenado');
  expect(scene().items[1].status).toEqual(['derribado']);
  expect(scene().items[1].statusEffects).toEqual([]);
  expect(mockDocuments.get('players/Bea/rogueliteClasses/other').activeRun.statusEffects).toEqual(['derribado']);
  expect(mockDocuments.get('players/Ada/rogueliteClasses/class').activeRun.inventory.objects).toEqual([]);
});


test('Envenenado survives rounds and is cleared by the master at combat end', async () => {
  const h = setup({ antidote: true, enemy: true });
  await act(async () => h.result.current.runtime.nextRound());
  expect(h.result.current.current.items[0].status).toContain('envenenado');
  await act(async () => h.result.current.runtime.finishCombat());
  expect(h.result.current.current.items[0].status).not.toContain('envenenado');
});


test.each(['haste-potion', 'vitality-potion'])('%s spends exactly one resource without rolling and persists the linked buff', async potionType => {
  const h = setup({ potionType, linked: true, life: 5 });
  const resource = h.prepare();
  const random = jest.spyOn(Math, 'random');
  let result;
  await act(async () => { result = await h.commit(resource); });
  expect(result.ok).toBe(true);
  expect(random).not.toHaveBeenCalled();
  expect(scene().items[0].stats.vida.current).toBe(5);
  expect(scene().items[0].inventory).toEqual([]);
  expect(scene().canvasCombat.participants.hero.actionDice[0].status).toBe('spent');
  const expected = potionType === 'haste-potion' ? { movimiento: { current: 9, potionBonus: 1 } }
    : { vidaTemporal: { current: 2, max: 2 } };
  expect(scene().items[0].stats).toMatchObject(expected);
  expect(mockDocuments.get('players/Ada/rogueliteClasses/class').activeRun.stats).toMatchObject(expected);
  expect(logEntries()).toHaveLength(1);
  expect(logEntries()[0].dice).toEqual([]);
  await act(async () => { expect(await h.commit(resource)).toEqual(result); });
  expect(logEntries()).toHaveLength(1);
});

test.each(['enemy-action', 'enemy-movement', 'threat-die', 'manual-threat'])('Presteza paid with %s grants movement even after spending movement', async kind => {
  const h = setup({ potionType: 'haste-potion', enemy: true });
  h.prepare();
  const resource = h.result.current.runtime.getItemUseResources('hero', h.item).find(value => value.kind === kind);
  await act(async () => { expect((await h.commit(resource)).ok).toBe(true); });
  expect(getAvailableMovement(scene().canvasCombat.participants.hero)).toBe(kind === 'enemy-movement' ? 5 : 9);
  expect(scene().items[0].stats.movimiento.current).toBe(kind === 'enemy-movement' ? 5 : 9);
});

test('Presteza expires its four cells on closing the turn, keeps its base bonus next round and clears at combat end', async () => {
  const h = setup({ potionType: 'haste-potion', enemy: true });
  await act(async () => { expect((await h.commit(h.prepare())).ok).toBe(true); });
  await act(async () => h.result.current.runtime.completeActivation('hero'));
  expect(h.result.current.current.items[0].stats.movimiento.current).toBe(5);
  await act(async () => h.result.current.runtime.nextRound());
  expect(h.result.current.current.items[0].stats.movimiento).toMatchObject({ current: 5, max: 5, potionBonus: 1 });
  await act(async () => h.result.current.runtime.finishCombat());
  expect(h.result.current.current.items[0].stats.movimiento).toMatchObject({ current: 4, max: 4 });
  expect(h.result.current.current.items[0].stats.movimiento).not.toHaveProperty('potionBonus');
});

test('Vitalidad survives rounds and disappears only at combat end', async () => {
  const h = setup({ potionType: 'vitality-potion', enemy: true });
  await act(async () => h.commit(h.prepare()));
  await act(async () => h.result.current.runtime.nextRound());
  expect(h.result.current.current.items[0].stats.vidaTemporal.current).toBe(2);
  await act(async () => h.result.current.runtime.finishCombat());
  expect(h.result.current.current.items[0].stats).not.toHaveProperty('vidaTemporal');
});

test.each(['haste-potion', 'vitality-potion'])('%s works in practice and rejects use at zero Life', async potionType => {
  const h = setup({ potionType, combat: false });
  await act(async () => { expect((await h.commit(h.prepare())).ok).toBe(true); });
  expect(scene()).not.toHaveProperty('canvasCombat');
  h.unmount();
  const down = setup({ potionType, life: 0 });
  await act(async () => { expect(await down.commit(down.prepare())).toBe(false); });
  expect(scene().items[0].inventory).toHaveLength(1);
});


test('ordinary healing restores only real Life and never replenishes vitality blocks', async () => {
  const h = setup();
  const token = scene().items[0];
  token.stats.vidaTemporal = { current: 0, max: 2, source: 'vitality-potion' };
  await act(async () => { expect((await h.commit(h.prepare())).ok).toBe(true); });
  expect(scene().items[0].stats.vida.current).toBeGreaterThan(2);
  expect(scene().items[0].stats.vidaTemporal.current).toBe(0);
});

test.each([false, true])('Bandage pays once and stops bleeding after the activation decision; enemy=%s', async enemy => {
  const h = setup({ bandage: true, enemy, linked: !enemy });
  expect(h.result.current.runtime.pendingBleedingToken?.id).toBe('hero');
  expect(h.result.current.runtime.getItemUseResources('hero', h.item)).toEqual([]);
  act(() => expect(h.result.current.runtime.completeActivation('hero')).toBe(false));
  await act(async () => { expect(await h.result.current.runtime.chooseBleeding('hero', 'movement')).toBe(true); });
  expect(getAvailableMovement(scene().canvasCombat.participants.hero)).toBe(0);
  expect(h.result.current.runtime.pendingBleedingToken).toBeUndefined();
  const resource = h.prepare();
  const random = jest.spyOn(Math, 'random');
  let result;
  mockRetries = 3;
  await act(async () => { result = await h.commit(resource); });
  expect(result).toMatchObject({ ok: true, effect: 'remove-bleeding', targetId: 'hero' });
  expect(random).not.toHaveBeenCalled();
  expect(scene().items[0].status).not.toContain('sangrado');
  expect(scene().items[0].stats.vida.current).toBe(2);
  expect(scene().items[0].inventory).toHaveLength(0);
  expect(scene().items[0].canvasHealingEffect.effect).toBe('remove-bleeding');
  // The paid choice remains in force for this turn even after removing the condition.
  expect(getAvailableMovement(scene().canvasCombat.participants.hero)).toBe(0);
  await act(async () => { expect(await h.commit(resource)).toEqual(result); });
  expect(logEntries().filter(entry => entry.effect === 'remove-bleeding')).toHaveLength(1);
  if (!enemy) expect(mockDocuments.get('players/Ada/rogueliteClasses/class').activeRun.statusEffects).not.toContain('sangrado');
});

test('bleeding Life decision is atomic, idempotent across retries and persists linked Life', async () => {
  const h = setup({ bandage: true, linked: true });
  mockRetries = 3;
  await act(async () => { expect(await h.result.current.runtime.chooseBleeding('hero', 'life')).toBe(true); });
  expect(scene().items[0].stats.vida.current).toBe(1);
  expect(mockDocuments.get('players/Ada/rogueliteClasses/class').activeRun.stats.vida.current).toBe(1);
  expect(logEntries()).toHaveLength(1);
  await act(async () => { expect(await h.result.current.runtime.chooseBleeding('hero', 'life')).toBe(false); });
  expect(scene().items[0].stats.vida.current).toBe(1);
});

test('failed bleeding save leaves the choice and Life intact', async () => {
  const h = setup({ bandage: true, linked: true });
  mockFailAfterCallback = true;
  await act(async () => { expect(await h.result.current.runtime.chooseBleeding('hero', 'life')).toBe(false); });
  expect(scene().items[0].stats.vida.current).toBe(2);
  expect(h.result.current.runtime.pendingBleedingToken.id).toBe('hero');
});

test('Bandage can treat another player at Touch without control over their token', async () => {
  const h = setup({ bandage: true, linked: true });
  const ally = { ...scene().items[0], id: 'ally', name: 'Aliada', controlledBy: ['Bea'],
    linkedClassOwner: 'Bea', linkedClassId: 'other', runId: 'other-run', x: 0, y: 0, width: 25, height: 25,
    status: ['sangrado', 'envenenado'], inventory: [] };
  const before = { ...scene(), items: [{ ...scene().items[0], status: [] }, ally] };
  mockDocuments.set('players/Bea/rogueliteClasses/other', { activeRun: { id: 'other-run', revision: 3, currentScenarioId: 'scene' } });
  mockDocuments.set(scenePath, before);
  act(() => h.result.current.setCurrent(before));
  const resource = h.prepare();
  await act(async () => { expect(await h.result.current.runtime.commitItemUse({ useId: 'bandage-ally', tokenId: 'hero', targetId: 'ally', item: h.item, resource })).toMatchObject({ ok: true, targetId: 'ally' }); });
  expect(scene().items[1].status).toEqual(['envenenado']);
  expect(mockDocuments.get('players/Bea/rogueliteClasses/other').activeRun.statusEffects).toEqual(['envenenado']);
});

test('Sangrado lasts across rounds and disappears at combat end', async () => {
  const h = setup({ bandage: true, enemy: true });
  await act(async () => h.result.current.runtime.chooseBleeding('hero', 'movement'));
  await act(async () => h.result.current.runtime.nextRound());
  expect(h.result.current.current.items[0].status).toContain('sangrado');
  expect(h.result.current.runtime.pendingBleedingToken.id).toBe('hero');
  await act(async () => h.result.current.runtime.finishCombat());
  expect(h.result.current.current.items[0].status).not.toContain('sangrado');
});
