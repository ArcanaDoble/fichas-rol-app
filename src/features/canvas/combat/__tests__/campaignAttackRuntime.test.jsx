import { useRef, useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { doc, runTransaction } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState, submitActionDice, startNextRound } from '../canvasCombatState';
import { getCanvasWeaponIdentity } from '../canvasAttackRules';
import { readCampaignChoice, verifyCampaignReveal } from '../campaignAttackCommitment';
import { getCampaignEvasionDestinations, getCampaignResources, spendCampaignResources, restoreCampaignResources,
  resolveCampaignAttack, resolveCampaignAttackSelection, validateCampaignDefense, validateCampaignZones } from '../campaignAttackRules';

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ runTransaction: jest.fn(), updateDoc: jest.fn(),
  doc: jest.fn((_db, ...parts) => parts.join('/')), addDoc: jest.fn(), collection: jest.fn(), setDoc: jest.fn(), deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 123) }));
const weapon = { id: 'sword', name: 'Espada', type: 'weapon', canvasSlot: 'mainHand', dano: '1d6', alcance: 'Toque', hands: 1, rasgos: [] };
const actor = (id, profileType = 'campaignCharacter') => ({ id, name: id, type: 'token', profileType, rulesSystem: 'campaign',
  teamId: 'aliados', controlledBy: [id], hasVision: true, actionDice: ['d6', 'd6', 'd6'], offenseBase: 4,
  x: 0, y: 0, width: 50, height: 50, equippedItems: [weapon], status: [],
  stats: { vida: { current: 28, max: 28 }, armadura: { current: 2 }, movimiento: { current: 2 } } });
const gridConfig = { cellWidth: 50, cellHeight: 50, isInfinite: true };
let remote, records, writes;
const scenePath = 'canvas_scenarios/scene';
const scene = () => {
  const items = [actor('a'), actor('b')];
  let combat = createCanvasCombatState(items, { rulesSystem: 'campaign', now: 1 });
  combat = submitActionDice(combat, 'a', [6, 4, 2]);
  combat = submitActionDice(combat, 'b', [6, 3, 1]);
  return { id: 'scene', rulesSystem: 'campaign', items, canvasCombat: { ...combat, roundPhase: 'turns' } };
};
function mount(name, player = false) {
  const hook = renderHook(() => {
    const [current, setCurrent] = useState(remote);
    const ref = useRef(current); ref.current = current;
    const runtime = useCanvasCombatRuntime({ activeScenario: current, activeScenarioRef: ref, isPlayerView: player, playerName: name,
      scenarioCollectionName: 'canvas_scenarios', gridConfig, setActiveScenario: setCurrent,
      safePersistItems: jest.fn(), triggerToast: jest.fn() });
    return { runtime, sync: () => setCurrent(remote), current };
  });
  return hook;
}
beforeAll(() => { Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true }); globalThis.TextEncoder = TextEncoder; });
beforeEach(() => {
  localStorage.clear(); remote = scene(); records = {}; writes = [];
  doc.mockImplementation((_db, ...parts) => parts.join('/'));
  runTransaction.mockImplementation(async (_db, callback) => {
    const queued = [];
    const result = await callback({
      get: async ref => ({ exists: () => ref === scenePath || Boolean(records[ref]), data: () => ref === scenePath ? remote : records[ref] }),
      update: (ref, patch) => queued.push([ref, patch]), set: (ref, patch) => queued.push([ref, patch]),
    });
    queued.forEach(([ref, patch]) => { writes.push(ref); if (ref === scenePath) remote = { ...remote, ...patch }; else records[ref] = { ...records[ref], ...patch }; });
    return result;
  });
});
async function attack(hook, value = 6, zone = 'arriba') {
  act(() => expect(hook.result.current.runtime.beginAttackDraft({ attackerId: 'a', targetId: 'b', weapon })).toBe(true));
  const die = hook.result.current.runtime.campaignAttackResources.find(r => r.value === value);
  await act(async () => expect(await hook.result.current.runtime.prepareCampaignAttack([die.id])).toBe(true));
  act(() => hook.result.current.runtime.updateCampaignDraft({ zones: [zone] }));
  await act(async () => expect(await hook.result.current.runtime.commitCampaignAttack()).toBe(true));
  return remote.canvasCombat.pendingAttack;
}
async function defend(hook, mode = 'receive', zone = 'arriba', value = 6) {
  const die = remote.canvasCombat.participants.b.actionDice.find(r => r.value === value);
  await act(async () => expect(await hook.result.current.runtime.commitCampaignDefense({ defense: mode,
    ids: mode === 'receive' ? [] : [die.id], zones: mode === 'parry' ? [zone] : [], equipmentIds: [getCanvasWeaponIdentity(weapon)] })).toBe(true));
}

test('separate clients commit a secret, pay defense, reveal, resolve and reconnect without duplicate damage', async () => {
  const attacker = mount('a', true);
  const pending = await attack(attacker);
  expect(pending.reveal).toBeUndefined();
  expect(JSON.stringify(remote)).not.toContain('arriba');
  expect(readCampaignChoice('scene', pending.id).payload.zones).toEqual(['arriba']);
  expect(remote.canvasCombat.participants.a.actionDice[0].status).toBe('spent');
  const defender = mount('b', true);
  expect(defender.result.current.runtime.campaignVisible).toBe(true);
  await defend(defender);
  expect(remote.canvasCombat.pendingAttack.status).toBe('awaiting-reveal');
  expect(remote.items[1].stats.vida.current).toBe(28);
  act(() => attacker.result.current.sync());
  await waitFor(() => expect(remote.canvasCombat.pendingAttack.status).toBe('resolved'));
  expect(await verifyCampaignReveal(remote.canvasCombat.pendingAttack)).toBe(true);
  const hp = remote.items[1].stats.vida.current;
  expect(hp).toBeLessThan(28);
  expect(remote.items[1].runtimeDirty).toBe(true);
  const reconnect = mount('a', true);
  act(() => reconnect.result.current.runtime.retryCampaignAttack());
  await act(async () => {});
  expect(remote.items[1].stats.vida.current).toBe(hp);
  expect(writes.filter(path => path.startsWith('combat_log/'))).toHaveLength(1);
});

test('a lower parry cancels completely; an equal parry offers one response, reusing its defense', async () => {
  const master = mount('master');
  await attack(master, 2);
  await defend(master, 'parry', 'arriba', 6);
  await waitFor(() => expect(remote.canvasCombat.pendingAttack.status).toBe('resolved'));
  expect(remote.canvasCombat.pendingAttack.result).toMatchObject({ parried: true, damage: 0, counter: true });
  const resources = remote.canvasCombat.participants.b.actionDice;
  act(() => expect(master.result.current.runtime.beginCampaignCounter(weapon)).toBe(true));
  const response = master.result.current.runtime.campaignDraft;
  await act(async () => expect(await master.result.current.runtime.prepareCampaignAttack(response.reusedResources.map(r => r.id))).toBe(true));
  act(() => master.result.current.runtime.updateCampaignDraft({ zones: ['centro'] }));
  await act(async () => expect(await master.result.current.runtime.commitCampaignAttack()).toBe(true));
  expect(remote.canvasCombat.pendingAttack.response).toBe(true);
  expect(remote.canvasCombat.participants.b.actionDice).toEqual(resources);
  const die = remote.canvasCombat.participants.a.actionDice.find(r => r.status === 'available');
  await act(async () => expect(await master.result.current.runtime.commitCampaignDefense({ defense: 'parry', ids: [die.id], zones: ['centro'], equipmentIds: ['sword'] })).toBe(true));
  await waitFor(() => expect(remote.canvasCombat.pendingAttack.status).toBe('resolved'));
  expect(remote.canvasCombat.pendingAttack.result.counter).toBe(false);
});

test('fresh transaction rejects a spent resource', async () => {
  const master = mount('master');
  act(() => master.result.current.runtime.beginAttackDraft({ attackerId: 'a', targetId: 'b', weapon }));
  const id = master.result.current.runtime.campaignAttackResources[0].id;
  await act(async () => master.result.current.runtime.prepareCampaignAttack([id]));
  act(() => master.result.current.runtime.updateCampaignDraft({ zones: ['centro'] }));
  remote.canvasCombat.participants.a.actionDice[0].status = 'spent';
  await act(async () => expect(await master.result.current.runtime.commitCampaignAttack()).toBe(false));
  expect(remote.canvasCombat.pendingAttack).toBeFalsy();
  expect(master.result.current.runtime.campaignError).toMatch(/gastado/);
});

test('only the target controller may commit defense; the attacker cannot reveal it early', async () => {
  const attacker = mount('a', true);
  await attack(attacker);
  await act(async () => expect(await attacker.result.current.runtime.commitCampaignDefense({ defense: 'receive' })).toBe(false));
  expect(remote.canvasCombat.pendingAttack).toMatchObject({ status: 'awaiting-defense' });
  expect(remote.canvasCombat.pendingAttack.reveal).toBeUndefined();
  const stranger = mount('outsider', true);
  expect(stranger.result.current.runtime.campaignVisible).toBe(false);
  await act(async () => expect(await stranger.result.current.runtime.cancelPendingAttack()).toBe(false));
  expect(remote.canvasCombat.pendingAttack.status).toBe('awaiting-defense');
});

test('heavy distribution pays once before rolling and reopens persisted dice after remount', async () => {
  const heavy = { ...weapon, name: 'Mandoble', dano: '2d8', rasgos: ['Pesada'], hands: 2 };
  remote.items[0].equippedItems = [heavy];
  const master = mount('master');
  act(() => expect(master.result.current.runtime.beginAttackDraft({ attackerId: 'a', targetId: 'b', weapon: heavy })).toBe(true));
  const ids = master.result.current.runtime.campaignAttackResources.slice(0, 2).map(r => r.id);
  await act(async () => expect(await master.result.current.runtime.prepareCampaignAttack(ids)).toBe(true));
  const dice = remote.canvasCombat.pendingAttack.heavyDice;
  expect(dice).toHaveLength(4);
  expect(remote.canvasCombat.participants.a.actionDice.slice(0, 2).map(r => r.status)).toEqual(['spent', 'spent']);
  master.unmount();
  const reopened = mount('master');
  expect(reopened.result.current.runtime.campaignDraft.heavyDice).toEqual(dice);
  act(() => reopened.result.current.runtime.updateCampaignDraft({ zones: ['arriba', 'derecha'], assignments: [0, 1, 0, 1] }));
  await act(async () => expect(await reopened.result.current.runtime.commitCampaignAttack()).toBe(true));
  expect(remote.canvasCombat.pendingAttack.heavyDice).toEqual(dice);
  expect(remote.canvasCombat.pendingAttack.reveal).toBeUndefined();
  await defend(reopened);
  await waitFor(() => expect(remote.canvasCombat.pendingAttack.status).toBe('resolved'));
  expect(remote.canvasCombat.pendingAttack.result.hits[0].impact).toBe(dice.reduce((sum, die) => sum + die.value, 0));
});

test('master cancellation refunds the exact original resources and applies no damage', async () => {
  const master = mount('master');
  await attack(master);
  await act(async () => expect(await master.result.current.runtime.cancelPendingAttack()).toBe(true));
  expect(remote.canvasCombat.pendingAttack).toBeNull();
  expect(remote.canvasCombat.participants.a.actionDice[0].status).toBe('available');
  expect(remote.items[1].stats.vida.current).toBe(28);
});

test('dual attacks apply armor separately; heavy attacks require adjacent zones and whole-die distribution', () => {
  const target = actor('b');
  const part = { weapon, profile: [{ sides: 6, die: 'd6' }], traits: [] };
  const pending = { campaignMode: 'dual', attackParts: [part, part], resources: [{ value: 2 }, { value: 3 }],
    reveal: { zones: ['arriba', 'abajo'] }, defense: { mode: 'parry', zones: ['arriba'], value: 1 } };
  expect(resolveCampaignAttack({ pending, target, random: () => 0 }).hits.map(hit => hit.damage)).toEqual([0, 2]);
  const heavy = { ...weapon, name: 'Mandoble', dano: '2d8', rasgos: ['Pesada'], hands: 2 };
  const selection = resolveCampaignAttackSelection({ attacker: { ...actor('a'), equippedItems: [heavy] }, target, selection: heavy, items: [], gridConfig });
  expect(selection).toMatchObject({ legal: true, campaignMode: 'heavy', actionCost: 2 });
  const hit = resolveCampaignAttack({ pending: { ...pending, campaignMode: 'heavy', reveal: { zones: ['arriba', 'derecha'], assignments: [0, 1, 0, 1] } },
    target, heavyDice: [{ value: 6, kind: 'action' }, { value: 2, kind: 'action' }, { value: 3 }, { value: 5 }], random: () => 0 });
  expect(hit.damage).toBe(5); // One zone parried; (2+5)-2 RD once.
  const incomplete = []; incomplete[1] = 'derecha';
  expect(() => validateCampaignZones({ campaignMode: 'dual' }, incomplete)).toThrow(/todas las zonas/);
});

test('evasion respects bounds and walls and ranged parry requires explicit projectile equipment', () => {
  const target = actor('b');
  const moves = getCampaignEvasionDestinations(target, [target], { ...gridConfig, isInfinite: false, columns: 1, rows: 1 });
  expect(moves.every(move => move.blocked)).toBe(true);
  const pending = { melee: false, actionValue: 6 };
  expect(() => validateCampaignDefense({ pending, target, combat: remote.canvasCombat, defense: 'parry',
    ids: [remote.canvasCombat.participants.b.actionDice[0].id], zones: ['arriba'], equipmentIds: ['sword'], items: remote.items, gridConfig })).toThrow(/equipo apto/);
});

const npcScene = (threatDice = []) => {
  const a = { ...actor('a', 'rogueliteEnemy'), threatDice, offenseBase: 5, fixedInitiative: 20 };
  const b = { ...actor('b'), x: 50 };
  const items = [a, b];
  const combat = submitActionDice(createCanvasCombatState(items, { rulesSystem: 'campaign', now: 1 }), 'b', [6, 3, 1]);
  return { id: 'scene', rulesSystem: 'campaign', items, canvasCombat: combat };
};

test('a delegated allied NPC sees only its own resources; opposing actions stay hidden through resolution', async () => {
  remote = npcScene();
  const master = mount('master');
  act(() => expect(master.result.current.runtime.beginAttackDraft({ attackerId: 'a', targetId: 'b', weapon })).toBe(true));
  await act(async () => expect(await master.result.current.runtime.prepareCampaignAttack(['attack'])).toBe(true));
  act(() => master.result.current.runtime.updateCampaignDraft({ zones: ['arriba'] }));
  await act(async () => master.result.current.runtime.commitCampaignAttack());
  const owner = mount('a', true);
  expect(owner.result.current.runtime.campaignPending.actionValue).toBe(5);
  expect(owner.result.current.runtime.combatState.participants.b.actionDice).toEqual([]);
  const defender = mount('b', true);
  expect(defender.result.current.runtime.campaignPending.actionValue).toBeUndefined();
  expect(defender.result.current.runtime.pendingAttack.resources).toEqual([]);
  expect(defender.result.current.runtime.combatState.pendingAttack.actionValue).toBeUndefined();
  expect(defender.result.current.runtime.combatState.participants.a.campaignHiddenResources).toBe(true);
  const die = remote.canvasCombat.participants.b.actionDice.find(r => r.value === 1);
  const destination = getCampaignEvasionDestinations(remote.items[1], remote.items, gridConfig).find(d => d.label === 'Sur');
  await act(async () => expect(await defender.result.current.runtime.commitCampaignDefense({ defense: 'evade', ids: [die.id], destination })).toBe(true));
  // A low attempt is paid before its failure is revealed, never rejected as a
  // live threshold probe. Failure leaves the token where it was.
  expect(remote.canvasCombat.participants.b.actionDice.find(r => r.id === die.id).status).toBe('spent');
  act(() => master.result.current.sync());
  await waitFor(() => expect(remote.canvasCombat.pendingAttack.status).toBe('resolved'));
  expect(remote.canvasCombat.pendingAttack.result.evaded).toBe(false);
  expect(remote.items[1]).toMatchObject({ x: 50, y: 0 });
  expect(remote.canvasCombat.pendingAttack.result.damage).toBeGreaterThan(0);
  act(() => defender.result.current.sync());
  expect(defender.result.current.runtime.campaignPending.actionValue).toBeUndefined();
  expect(defender.result.current.runtime.campaignPending.result.hits[0].impact).toBeUndefined();
  expect(master.result.current.runtime.campaignPending.actionValue).toBe(5);
});

test('initial Threat copies spend independently, refund exactly and regenerate at the next round', () => {
  const token = { ...actor('npc', 'rogueliteEnemy'), threatDice: ['d4', 'd8', 'd8', ...Array(8).fill('d20')] };
  let combat = createCanvasCombatState([token], { rulesSystem: 'campaign', random: () => .5 });
  const resources = getCampaignResources(token, combat).filter(r => r.kind === 'threat');
  expect(resources).toHaveLength(11);
  expect(new Set(resources.map(r => r.id)).size).toBe(11);
  combat = spendCampaignResources(combat, token.id, [resources[1]]);
  expect(getCampaignResources(token, combat).filter(r => r.kind === 'threat' && !r.spent)).toHaveLength(10);
  combat = restoreCampaignResources(combat, token.id, [resources[1]]);
  expect(getCampaignResources(token, combat).find(r => r.id === resources[1].id)).toMatchObject({ value: 5, spent: false });
  combat = spendCampaignResources(combat, token.id, resources);
  combat = startNextRound(combat, { random: () => 0 });
  const refreshed = getCampaignResources(token, combat).filter(r => r.kind === 'threat');
  expect(refreshed).toHaveLength(11);
  expect(refreshed.every(r => r.value === 1 && !r.spent)).toBe(true);
});

test('the master adds multiple Threat grades at confirmation; a delegated player cannot create extra dice', async () => {
  remote = npcScene(['d8', 'd8']);
  const master = mount('master');
  act(() => master.result.current.runtime.beginAttackDraft({ attackerId: 'a', targetId: 'b', weapon }));
  await act(async () => expect(await master.result.current.runtime.prepareCampaignAttack(['attack'], { customDice: [4, 8, 8, 20, ...Array(8).fill(6)] })).toBe(true));
  act(() => master.result.current.runtime.updateCampaignDraft({ zones: ['arriba'] }));
  await act(async () => expect(await master.result.current.runtime.commitCampaignAttack()).toBe(true));
  const pending = remote.canvasCombat.pendingAttack;
  expect(pending.resources.filter(r => r.source === 'custom')).toHaveLength(12);
  expect(pending.actionValue).toBe(pending.resources.reduce((sum, r) => sum + r.value, 0));
  expect(getCampaignResources(remote.items[0], remote.canvasCombat).filter(r => r.kind === 'threat' && !r.spent)).toHaveLength(2);
  await act(async () => master.result.current.runtime.cancelPendingAttack());
  const delegated = mount('a', true);
  act(() => expect(delegated.result.current.runtime.beginAttackDraft({ attackerId: 'a', targetId: 'b', weapon })).toBe(true));
  await act(async () => expect(await delegated.result.current.runtime.prepareCampaignAttack(['attack'], { customDice: [20] })).toBe(false));
  expect(delegated.result.current.runtime.campaignDraft.phase).toBe('prepare');
  expect(remote.canvasCombat.pendingAttack).toBeNull();
  expect(remote.canvasCombat.participants.a.enemyActions.find(r => r.id === 'attack').status).toBe('available');
});

test('NPC defense can add several punctual Threat dice without consuming unselected reserves', async () => {
  remote = npcScene();
  remote.items[1] = { ...actor('b', 'rogueliteEnemy'), x: 50, fixedInitiative: 10, threatDice: ['d10', 'd20'] };
  remote.canvasCombat = createCanvasCombatState(remote.items, { rulesSystem: 'campaign', random: () => .5 });
  const master = mount('master');
  act(() => master.result.current.runtime.beginAttackDraft({ attackerId: 'a', targetId: 'b', weapon }));
  await act(async () => master.result.current.runtime.prepareCampaignAttack(['attack']));
  act(() => master.result.current.runtime.updateCampaignDraft({ zones: ['arriba'] }));
  await act(async () => master.result.current.runtime.commitCampaignAttack());
  await act(async () => expect(await master.result.current.runtime.commitCampaignDefense({ defense: 'parry', ids: ['defense'],
    zones: ['arriba'], equipmentIds: ['sword'], customDice: [4, 6, 8, 8] })).toBe(true));
  await waitFor(() => expect(remote.canvasCombat.pendingAttack.status).toBe('resolved'));
  const defense = remote.canvasCombat.pendingAttack.defense;
  expect(defense.resources.filter(r => r.source === 'custom')).toHaveLength(4);
  expect(defense.value).toBe(defense.resources.reduce((sum, r) => sum + r.value, 0));
  expect(remote.canvasCombat.participants.b.enemyActions.find(r => r.id === 'defense').status).toBe('spent');
  expect(getCampaignResources(remote.items[1], remote.canvasCombat, true).filter(r => r.kind === 'threat' && !r.spent)).toHaveLength(2);
  expect(remote.canvasCombat.pendingAttack.result).toMatchObject({ parried: true, damage: 0, counter: true });
});
