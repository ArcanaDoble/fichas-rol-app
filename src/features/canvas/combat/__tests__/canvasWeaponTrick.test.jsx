import React, { useRef, useState } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { doc, runTransaction } from 'firebase/firestore';
import { applyCanvasWeaponTrick, createCanvasWeaponTrickDraft } from '../canvasWeaponTrick';
import { useCanvasWeaponTrick } from '../useCanvasWeaponTrick';
import { getCanvasEquippedWeapons, getCanvasWeaponTraits, parseWeaponDiceProfile } from '../canvasAttackRules';
import { getCampaignParryOptions } from '../campaignAttackRules';
import { resolveWeaponForm } from '../../../roguelite/weaponForms';
import CanvasWeaponTrickPanel from '../../components/CanvasWeaponTrickPanel';

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ runTransaction: jest.fn(), doc: jest.fn((_db, ...path) => path.join('/')), serverTimestamp: () => 42 }));
const cane = resolveWeaponForm({ id: 'cane', instanceId: 'copy-one', name: 'Bastón enroscado', type: 'weapon', rasgos: ['Truco'],
  trickForms: [
    { id: 'primary', label: 'Estoque', dano: '1d12', alcance: 'Cercano', rasgos: ['Perforante', 'Torso'], image: '/cane.png' },
    { id: 'secondary', label: 'Látigo', dano: '2d4', alcance: 'Intermedio', rasgos: ['Crítico', 'Sangrado', 'Sin guardia'], image: '/whip.png' },
  ] });
const viewer = { isPlayerView: true, playerName: 'rai' };
beforeEach(() => doc.mockImplementation((_db, ...path) => path.join('/')));
const scene = () => ({ id: 'scene', rulesSystem: 'campaign', items: [{ id: 'yuuzu', name: 'Yuuzu', profileType: 'campaignCharacter', controlledBy: ['rai'],
  stats: { vida: { current: 25 }, mente: { current: 8 } }, status: [], inventory: [cane], equipmentLoadout: { mainHand: cane },
  equippedItems: [{ ...cane, canvasSlot: 'mainHand' }] }], canvasCombat: { status: 'active', startedAt: 10, round: 1, roundPhase: 'turns', activeBlockIndex: 0,
  blocks: [{ memberIds: ['yuuzu'], actedIds: [] }], participants: { yuuzu: { tokenId: 'yuuzu', side: 'players', awaitingRoll: false,
    actionDice: [{ id: 'high', value: 6, die: 'd6', status: 'available' }, { id: 'low', value: 1, die: 'd6', status: 'available' }], movementRuntime: { spent: 1 } } } } });

test('spends the selected die, updates all references, and feeds damage, range and parry from the active form', () => {
  const before = scene(), draft = createCanvasWeaponTrickDraft(before, 'yuuzu', viewer);
  const { patch, token } = applyCanvasWeaponTrick(before, draft, 'low', viewer);
  expect(patch.canvasCombat.participants.yuuzu.actionDice.map(die => die.status)).toEqual(['available', 'spent']);
  expect(patch.canvasCombat.participants.yuuzu.movementRuntime).toEqual({ spent: 1 });
  expect(token.stats).toEqual(before.items[0].stats);
  expect(token.equipmentLoadout.mainHand).toMatchObject({ instanceId: 'copy-one', activeFormId: 'secondary', dano: '2d4', image: '/whip.png' });
  expect(token.inventory[0].activeFormId).toBe('secondary');
  const weapon = getCanvasEquippedWeapons(token)[0];
  expect(weapon.alcance).toBe('Intermedio');
  expect(parseWeaponDiceProfile(weapon).map(die => die.sides)).toEqual([4, 4]);
  expect(getCanvasWeaponTraits(weapon)).not.toContain('perforante');
  expect(getCampaignParryOptions(token, { melee: true })).toEqual([]);
  expect(before.items[0].inventory[0].activeFormId).toBe('primary');
});

test('cannot switch without control, out of turn, during an exchange, or with a stale round/resource', () => {
  const before = scene(), draft = createCanvasWeaponTrickDraft(before, 'yuuzu', viewer);
  expect(() => applyCanvasWeaponTrick(before, draft, 'low', { ...viewer, playerName: 'otro' })).toThrow('No controlas');
  expect(() => applyCanvasWeaponTrick({ ...before, canvasCombat: { ...before.canvasCombat, pendingAttack: {} } }, draft, 'low', viewer)).toThrow('intercambio');
  expect(() => applyCanvasWeaponTrick({ ...before, canvasCombat: { ...before.canvasCombat, round: 2 } }, draft, 'low', viewer)).toThrow('ronda');
  expect(() => applyCanvasWeaponTrick({ ...before, canvasCombat: { ...before.canvasCombat, blocks: [{ memberIds: ['otro'] }] } }, draft, 'low', viewer)).toThrow('turno');
  const spent = JSON.parse(JSON.stringify(before)); spent.canvasCombat.participants.yuuzu.actionDice[1].status = 'spent';
  expect(() => applyCanvasWeaponTrick(spent, draft, 'low', viewer)).toThrow('gastado');
});

test('a second owned copy and other equipment are not transformed', () => {
  const before = scene(); before.items[0].inventory.push({ ...cane, instanceId: 'copy-two' });
  const draft = createCanvasWeaponTrickDraft(before, 'yuuzu', viewer);
  const result = applyCanvasWeaponTrick(before, draft, 'low', viewer);
  expect(result.token.inventory.map(item => item.activeFormId)).toEqual(['secondary', 'primary']);
});

test('NPCs pay their main action or one available Threat, retaining defense and movement', () => {
  const before = scene(); before.items[0].profileType = 'rogueliteEnemy';
  before.canvasCombat.participants.yuuzu = { side: 'enemies', awaitingRoll: false, enemyActions: ['attack', 'defense', 'movement'].map(id => ({ id, status: 'available' })),
    campaignThreatDice: [{ id: 'threat-1', value: 3, die: 'd6', status: 'available' }], threatValue: 3 };
  const draft = createCanvasWeaponTrickDraft(before, 'yuuzu', viewer);
  expect(draft.resources.map(resource => resource.id)).toEqual(['attack', 'threat-1']);
  const attack = applyCanvasWeaponTrick(before, draft, 'attack', viewer).patch.canvasCombat.participants.yuuzu;
  expect(attack.enemyActions.map(action => action.status)).toEqual(['spent', 'available', 'available']);
  const threat = applyCanvasWeaponTrick(before, draft, 'threat-1', viewer).patch.canvasCombat.participants.yuuzu;
  expect(threat.enemyActions.every(action => action.status === 'available')).toBe(true);
  expect(threat.campaignThreatDice[0].status).toBe('spent');
});

test('a wrapped loadout reference switches too, and the other hand can still parry', () => {
  const before = scene();
  before.items[0].equipmentLoadout.mainHand = { id: 'wrapped-cane', payload: cane };
  before.items[0].equipmentLoadout.offHand = { id: 'dagger', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Toque' };
  const draft = createCanvasWeaponTrickDraft(before, 'yuuzu', viewer);
  const { token } = applyCanvasWeaponTrick(before, draft, 'low', viewer);
  expect(token.equipmentLoadout.mainHand.payload.activeFormId).toBe('secondary');
  expect(getCampaignParryOptions(token, { melee: true }).map(option => option.id)).toEqual(['dagger']);
});

test('preparation is free outside combat and a shield prevents equipping a two-hand form', () => {
  const before = scene(); before.canvasCombat = null;
  const draft = createCanvasWeaponTrickDraft(before, 'yuuzu', viewer);
  expect(applyCanvasWeaponTrick(before, draft, null, viewer).token.inventory[0].activeFormId).toBe('secondary');
  before.items[0].equipmentLoadout.mainHand = { ...cane, trickForms: cane.trickForms.map((form, i) => i === 1 ? { ...form, handsRequired: 2 } : form) };
  before.items[0].equipmentLoadout.offHand = { id: 'shield', name: 'Escudo', type: 'armor', isShield: true };
  const twoHands = createCanvasWeaponTrickDraft(before, 'yuuzu', viewer);
  expect(() => applyCanvasWeaponTrick(before, twoHands, null, viewer)).toThrow('manos');
});

test('the panel requires choosing a die and passes exactly that selection to the runtime', () => {
  const before = scene(), runtime = { trickDraft: { ...createCanvasWeaponTrickDraft(before, 'yuuzu', viewer), operationId: 'op' },
    confirmWeaponTrick: jest.fn(), closeWeaponTrick: jest.fn() };
  render(<CanvasWeaponTrickPanel scene={before} runtime={runtime} />);
  expect(screen.getByRole('button', { name: /Transformar · 1 DA/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Gastar d6 de valor 1' }));
  fireEvent.click(screen.getByRole('button', { name: /Transformar · 1 DA/ }));
  expect(runtime.confirmWeaponTrick).toHaveBeenCalledWith('low');
});

test('a committed operation retried after a lost acknowledgement is not charged twice and persists linked gear', async () => {
  let remote = scene(); remote.items[0].linkedCharacterId = 'character-one';
  const records = { 'characters/character-one': { equipment: { weapons: [cane] }, equippedItems: { mainHand: cane } } };
  let loseAcknowledgement = true;
  runTransaction.mockImplementation(async (_db, callback) => {
    const queued = [];
    const result = await callback({
      get: async ref => ({ exists: () => ref === 'canvas_scenarios/scene' || Boolean(records[ref]), data: () => ref === 'canvas_scenarios/scene' ? remote : records[ref] }),
      update: (ref, patch) => queued.push([ref, patch, true]), set: (ref, patch) => queued.push([ref, patch, false]),
    });
    queued.forEach(([ref, patch, merge]) => { if (ref === 'canvas_scenarios/scene') remote = { ...remote, ...patch }; else records[ref] = merge ? { ...records[ref], ...patch } : patch; });
    if (loseAcknowledgement) { loseAcknowledgement = false; throw new Error('Conexión interrumpida'); }
    return result;
  });
  const hook = renderHook(() => {
    const [current, setCurrent] = useState(remote); const ref = useRef(current); ref.current = current;
    return useCanvasWeaponTrick({ ...viewer, activeScenario: current, activeScenarioRef: ref, setActiveScenario: setCurrent });
  });
  act(() => expect(hook.result.current.beginWeaponTrick('yuuzu')).toBe(true));
  await act(async () => expect(await hook.result.current.confirmWeaponTrick('low')).toBe(false));
  expect(remote.canvasCombat.participants.yuuzu.actionDice.map(die => die.status)).toEqual(['available', 'spent']);
  await act(async () => expect(await hook.result.current.confirmWeaponTrick('low')).toBe(true));
  expect(remote.canvasCombat.participants.yuuzu.actionDice.map(die => die.status)).toEqual(['available', 'spent']);
  expect(records['characters/character-one'].equippedItems.mainHand.activeFormId).toBe('secondary');
  expect(records['characters/character-one'].equipment.weapons[0].activeFormId).toBe('secondary');
  expect(hook.result.current.trickDraft).toBeNull();
});

test('a roguelite run receives the same transformed copy and a matching scene revision', async () => {
  let remote = scene(); remote.rulesSystem = 'roguelite';
  Object.assign(remote.items[0], { profileType: 'rogueliteClass', runId: 'run-one', linkedClassId: 'duelist', linkedClassOwner: 'rai' });
  const records = {};
  runTransaction.mockImplementation(async (_db, callback) => callback({
    get: async ref => ({ exists: () => ref === 'canvas_scenarios/scene' || Boolean(records[ref]), data: () => ref === 'canvas_scenarios/scene' ? remote : records[ref] }),
    update: (ref, patch) => { if (ref === 'canvas_scenarios/scene') remote = { ...remote, ...patch }; },
    set: (ref, value) => { records[ref] = value; },
  }));
  const hook = renderHook(() => {
    const [current, setCurrent] = useState(remote); const ref = useRef(current); ref.current = current;
    return useCanvasWeaponTrick({ ...viewer, activeScenario: current, activeScenarioRef: ref, setActiveScenario: setCurrent });
  });
  act(() => expect(hook.result.current.beginWeaponTrick('yuuzu')).toBe(true));
  await act(async () => expect(await hook.result.current.confirmWeaponTrick('low')).toBe(true));
  const run = records['players/rai/rogueliteClasses/duelist'].activeRun;
  expect(run.inventory.weapons[0].activeFormId).toBe('secondary');
  expect(run.equippedItems.mainHand.activeFormId).toBe('secondary');
  expect(run.sourceCanvasRuntimeRevision).toBe(remote.items[0].canvasRuntimeRevision);
  expect(run.revision).toBe(remote.items[0].runRevision);
});
