import { useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { runTransaction, addDoc, doc } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState } from '../canvasCombatState';
import { combineCanvasWeapons } from '../canvasAttackSelection';
import { applyModifiersToWeapon, CANVAS_ATTACK_MODIFIER_TRAITS } from '../../../../components/CombatModifiersPanel';
import { buildCanvasCombatLog } from '../canvasCombatLog';
import { resolveCanvasAttackDamage } from '../canvasAttackRules';

let mockRemote;
jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  runTransaction: jest.fn(async (_, callback) => callback({
    get: async () => ({ exists: () => true, data: () => mockRemote }),
    update: (_, value) => { mockRemote = { ...mockRemote, ...value }; },
  })),
  addDoc: jest.fn(async () => ({ id: 'log' })), collection: jest.fn(() => ({})), doc: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => 1), setDoc: jest.fn(async () => {}), updateDoc: jest.fn(async () => {}), deleteDoc: jest.fn(async () => {}),
}));

const weapons = [
  { id: 'a', name: 'Daga', type: 'weapon', dano: '1d4', alcance: 'Cercano', canvasSlot: 'mainHand' },
  { id: 'b', name: 'Estoque', type: 'weapon', dano: '1d6', alcance: 'Cercano', canvasSlot: 'offHand', rasgos: ['Perforación'] },
];
const dice = [{ id: 'one', value: 5, sides: 6, status: 'available' }, { id: 'two', value: 2, sides: 4, status: 'available' }, { id: 'three', value: 6, sides: 8, status: 'available' }];
const setup = ({ enemy = false, practice = false, adjustment = false, targetOverrides = {}, attackerOverrides = {}, weaponOptions = weapons } = {}) => {
  const attacker = { id: 'hero', name: 'Actor', profileType: enemy ? 'rogueliteEnemy' : 'rogueliteClass', controlledBy: ['Ada'], equippedItems: enemy ? [] : weaponOptions, inventory: enemy ? weaponOptions : [], canAdjustAttack: adjustment, x: 0, y: 0, width: 25, height: 25, ...attackerOverrides };
  const target = { id: 'target', name: 'Objetivo', profileType: 'rogueliteEnemy', controlledBy: ['master'], x: 50, y: 0, width: 25, height: 25, stats: { cd: { current: 6 }, vida: { current: 5 } }, ...targetOverrides };
  const combat = createCanvasCombatState([attacker, target]);
  combat.status = practice ? 'inactive' : 'active'; combat.participants.hero.actionDice = dice;
  mockRemote = { id: 'scene', items: [attacker, target], canvasCombat: combat };
  const initial = mockRemote;
  const toast = jest.fn();
  const persistItems = jest.fn(async () => {});
  const hook = renderHook(() => {
    const [scenario, setScenario] = useState(initial);
    const ref = useRef(scenario); ref.current = scenario;
    return useCanvasCombatRuntime({ activeScenario: scenario, activeScenarioRef: ref, isPlayerView: !enemy, playerName: 'Ada', gridConfig: { cellWidth: 50, cellHeight: 50 }, scenarioCollectionName: 'canvas_scenarios', setActiveScenario: setScenario, safePersistItems: persistItems, triggerToast: toast });
  });
  return { ...hook, toast, attacker, persistItems };
};

beforeEach(() => {
  jest.clearAllMocks();
  runTransaction.mockImplementation(async (_, callback) => callback({
    get: async () => ({ exists: () => true, data: () => mockRemote }),
    update: (_, value) => { mockRemote = { ...mockRemote, ...value }; },
  }));
});

const furyToken = { classIdentity: 'Bárbaro', stats: { recurso: { current: 3, max: 3, label: 'Furia' } } };
const manaToken = { classIdentity: 'Mago', actionDice: ['d6', 'd6', 'd4'], stats: { recurso: { current: 1, max: 3, label: 'Maná' } } };
const catalyst = { ...weapons[0], id: 'catalyst', name: 'Varita', dano: 'd4', alcance: 'Intermedio', rasgos: ['Catalizador'] };
const rogueToken = { classIdentity: 'Pícaro', actionDice: ['d8', 'd6', 'd4'], stats: { recurso: { current: 2, max: 3, label: 'Astucia' } } };
const touchWeapon = { ...weapons[0], alcance: 'Toque' };

test.each([false, true])('Golpe sucio pauses before defense, spends once and resumes after choosing (practice: %s)', async practice => {
  const hook = setup({ practice, attackerOverrides: rogueToken, weaponOptions: [touchWeapon] });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: touchWeapon }));
  const dieId = hook.result.current.combatState.participants.hero.actionDice[0].id;
  await act(async () => { expect(await hook.result.current.confirmAttack({ actionDieIds: [dieId] })).toBe(true); });
  const field = practice ? 'canvasPracticeCombat' : 'canvasCombat';
  expect(mockRemote[field].pendingAttack.status).toBe('awaiting-cunning');
  await act(async () => { expect(await hook.result.current.resolvePendingAttack([])).toBe(false); });
  expect(hook.result.current.rollEnemyDefense()).toBe(false);
  const before = mockRemote[field].pendingAttack.weaponResults;
  await act(async () => {
    const first = hook.result.current.resolveCunning({ dieIndex: 0 });
    expect(await hook.result.current.resolveCunning({ dieIndex: 0 })).toBe(false);
    expect(await first).toBe(true);
  });
  expect(mockRemote.items[0].stats.recurso.current).toBe(1);
  expect(mockRemote[field].pendingAttack.status).toBe('awaiting-cunning-choice');
  expect(mockRemote[field].pendingAttack.weaponResults).toEqual(before);
  await act(async () => { expect(await hook.result.current.resolvePendingAttack([])).toBe(false); });
  await act(async () => { expect(await hook.result.current.resolveCunning({ choice: 'original' })).toBe(true); });
  expect(mockRemote[field].pendingAttack.status).toBe('awaiting-defense');
  expect(mockRemote[field].pendingAttack.weaponResults).toEqual(before);
  expect(mockRemote.items[0].stats.recurso.current).toBe(1);
  expect(mockRemote[field].participants.hero.actionDice.find(die => die.id === dieId).status).toBe('spent');
  await act(async () => { expect(await hook.result.current.resolveCunning({ dieIndex: 0 })).toBe(false); });
  const log = buildCanvasCombatLog({ pending: mockRemote[field].pendingAttack, attacker: mockRemote.items[0], target: mockRemote.items[1], defenseDice: [], resolution: { lifeLost: 0 } });
  expect(log.resourcesSpent).toContainEqual(expect.objectContaining({ label: '1 de Astucia' }));
  expect(log.cunning.choice).toBe('original');
});

test('declining Golpe sucio costs nothing and no Astucia means no extra step', async () => {
  const hook = setup({ attackerOverrides: rogueToken, weaponOptions: [touchWeapon] });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: touchWeapon }));
  await act(async () => { await hook.result.current.confirmAttack({ actionDieIds: ['one'] }); });
  await act(async () => { expect(await hook.result.current.resolveCunning({ choice: 'skip' })).toBe(true); });
  expect(mockRemote.items[0].stats.recurso.current).toBe(2);
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-defense');
  hook.unmount();
  const empty = setup({ attackerOverrides: { ...rogueToken, stats: { recurso: { current: 0, label: 'Astucia' } } }, weaponOptions: [touchWeapon] });
  act(() => empty.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: touchWeapon }));
  await act(async () => { await empty.result.current.confirmAttack({ actionDieIds: ['one'] }); });
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-defense');
});

test.each(['reserve', 'control', 'die'])('Golpe sucio rejects stale/invalid %s without spending', async reason => {
  const hook = setup({ attackerOverrides: rogueToken, weaponOptions: [touchWeapon] });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: touchWeapon }));
  await act(async () => { await hook.result.current.confirmAttack({ actionDieIds: ['one'] }); });
  if (reason === 'reserve') mockRemote.items[0] = { ...mockRemote.items[0], stats: { recurso: { current: 0, label: 'Astucia' } } };
  if (reason === 'control') mockRemote.items[0] = { ...mockRemote.items[0], controlledBy: ['Other'] };
  await act(async () => { expect(await hook.result.current.resolveCunning({ dieIndex: reason === 'die' ? 10 : 0 })).toBe(false); });
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-cunning');
  expect(mockRemote.items[0].stats.recurso.current).toBe(reason === 'reserve' ? 0 : 2);
});

test('Astucia reroll is stable across transaction retries and the linked run is updated atomically', async () => {
  doc.mockImplementation((...path) => ({ path }));
  const hook = setup({ attackerOverrides: { ...rogueToken, linkedClassOwner: 'Ada', linkedClassId: 'rogue', runId: 'run', runRevision: 2 }, weaponOptions: [touchWeapon] });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: touchWeapon }));
  await act(async () => { await hook.result.current.confirmAttack({ actionDieIds: ['one'] }); });
  const writeProfile = jest.fn();
  const run = { id: 'run', status: 'active', revision: 2, currentScenarioId: 'scene' };
  runTransaction.mockImplementation(async (_, callback) => {
    for (const retry of [true, false]) {
      let reads = 0;
      const result = await callback({
        get: async () => ({ exists: () => true, data: () => ++reads === 1 ? mockRemote : { activeRun: run } }),
        set: (...args) => { if (!retry) writeProfile(...args); },
        update: (_, value) => { if (!retry) mockRemote = { ...mockRemote, ...value }; },
      });
      if (!retry) return result;
    }
  });
  const random = jest.spyOn(Math, 'random').mockReturnValue(.2);
  await act(async () => { expect(await hook.result.current.resolveCunning({ dieIndex: 0 })).toBe(true); });
  expect(random).toHaveBeenCalledTimes(1);
  random.mockRestore();
  expect(mockRemote.items[0]).toMatchObject({ runRevision: 3, canvasRuntimeRevision: 1, stats: { recurso: { current: 1 } } });
  expect(writeProfile).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ activeRun: expect.objectContaining({ revision: 3, stats: expect.objectContaining({ recurso: expect.objectContaining({ current: 1 }) }) }) }), { merge: true });
});
test.each([false, true])('mana confirmation spends once and records its source (practice: %s)', async practice => {
  const hook = setup({ practice, attackerOverrides: manaToken, weaponOptions: [catalyst] });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: catalyst }));
  const dieId = hook.result.current.combatState.participants.hero.actionDice[0].id;
  let accepted, duplicate;
  await act(async () => {
    const first = hook.result.current.confirmAttack({ actionDieIds: [dieId], manaSpend: 1 });
    duplicate = hook.result.current.confirmAttack({ actionDieIds: [dieId], manaSpend: 1 });
    accepted = await first;
  });
  expect(accepted).toBe(true);
  expect(duplicate).toBe(false);
  expect(mockRemote.items[0].stats.recurso.current).toBe(0);
  const pending = mockRemote[practice ? 'canvasPracticeCombat' : 'canvasCombat'].pendingAttack;
  expect(pending.manaSpent).toBe(1);
  expect(pending.weaponDiceProfile.filter(die => die.source === 'Maná')).toHaveLength(1);
  const log = buildCanvasCombatLog({ pending, attacker: mockRemote.items[0], target: mockRemote.items[1], resolution: { lifeLost: 0 }, defenseDice: [] });
  expect(log.resourcesSpent).toContainEqual(expect.objectContaining({ label: '1 de Maná' }));
  expect(log.attackerDice.filter(die => die.source === 'Maná')).toHaveLength(1);
});
test('mana spending revalidates the remote reserve before committing any action die', async () => {
  const hook = setup({ attackerOverrides: manaToken, weaponOptions: [catalyst] });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: catalyst }));
  mockRemote = { ...mockRemote, items: mockRemote.items.map(item => item.id === 'hero' ? { ...item, stats: { recurso: { current: 0, label: 'Maná' } } } : item) };
  let accepted;
  await act(async () => { accepted = await hook.result.current.confirmAttack({ actionDieIds: ['one'], manaSpend: 1 }); });
  expect(accepted).toBe(false);
  expect(mockRemote.canvasCombat.pendingAttack).toBeNull();
  expect(mockRemote.canvasCombat.participants.hero.actionDice).toEqual(dice);
});
test('mana is not spent by preparing and cancelling', () => {
  const hook = setup({ attackerOverrides: manaToken, weaponOptions: [catalyst] });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: catalyst }));
  act(() => hook.result.current.cancelAttackDraft());
  expect(mockRemote.items[0].stats.recurso.current).toBe(1);
  expect(runTransaction).not.toHaveBeenCalled();
});
test('practice combat spends the actual Fury reserve too', async () => {
  const hook = setup({ practice: true, attackerOverrides: { ...furyToken, actionDice: ['d8', 'd6', 'd4'] } });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: weapons[0] }));
  const actionDie = hook.result.current.combatState.participants.hero.actionDice[0];
  let accepted;
  await act(async () => { accepted = await hook.result.current.confirmAttack({ actionDieIds: [actionDie.id], furySpend: 1 }); });
  expect(accepted).toBe(true);
  expect(mockRemote.items[0].stats.recurso.current).toBe(2);
  expect(mockRemote.canvasPracticeCombat.pendingAttack.furySpent).toBe(1);
  expect(mockRemote.canvasCombat.pendingAttack).toBeNull();
});
test('Fury commits once with action dice, updates the local token and labels the log', async () => {
  const hook = setup({ attackerOverrides: furyToken, weaponOptions: [weapons[0]] });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: weapons[0] }));
  let first, second;
  await act(async () => {
    first = hook.result.current.confirmAttack({ actionDieIds: ['one'], furySpend: 2 });
    second = hook.result.current.confirmAttack({ actionDieIds: ['one'], furySpend: 2 });
    await first;
  });
  expect(await first).toBe(true);
  expect(second).toBe(false);
  expect(mockRemote.items[0].stats.recurso.current).toBe(1);
  expect(mockRemote.items[0].canvasRuntimeRevision).toBe(1);
  const pending = mockRemote.canvasCombat.pendingAttack;
  expect(pending.furySpent).toBe(2);
  expect(pending.weaponDiceProfile.filter(die => die.source === 'Furia')).toHaveLength(2);
  const log = buildCanvasCombatLog({ pending, attacker: mockRemote.items[0], target: mockRemote.items[1], resolution: { lifeLost: 0 }, defenseDice: [] });
  expect(log.resourcesSpent).toContainEqual(expect.objectContaining({ label: '2 de Furia' }));
  expect(log.attackerDice.filter(die => die.source === 'Furia')).toHaveLength(2);
});
test('cancelling a prepared barbarian attack leaves Fury untouched', () => {
  const hook = setup({ attackerOverrides: furyToken });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: weapons[0] }));
  act(() => hook.result.current.cancelAttackDraft());
  expect(mockRemote.items[0].stats.recurso.current).toBe(3);
  expect(runTransaction).not.toHaveBeenCalled();
});
test('fresh transaction rejects depleted Fury without spending action dice', async () => {
  const hook = setup({ attackerOverrides: furyToken });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: weapons[0] }));
  mockRemote = { ...mockRemote, items: mockRemote.items.map(item => item.id === 'hero' ? { ...item, stats: { ...item.stats, recurso: { ...item.stats.recurso, current: 0 } } } : item) };
  let accepted;
  await act(async () => { accepted = await hook.result.current.confirmAttack({ actionDieIds: ['one'], furySpend: 2 }); });
  expect(accepted).toBe(false);
  expect(mockRemote.canvasCombat.pendingAttack).toBeNull();
  expect(mockRemote.canvasCombat.participants.hero.actionDice).toEqual(dice);
  expect(mockRemote.items[0].stats.recurso.current).toBe(0);
});

test.each([
  ['Furia', furyToken, weapons[0], { furySpend: 2 }, 1],
  ['Maná', manaToken, catalyst, { manaSpend: 1 }, 0],
])('%s and linked active-run resource advance in the same transaction', async (label, resourceToken, weapon, spending, remaining) => {
  doc.mockReturnValue({ path: 'profile' });
  const hook = setup({ attackerOverrides: { ...resourceToken, linkedClassOwner: 'Ada', linkedClassId: 'class', runId: 'run', runRevision: 2 }, weaponOptions: [weapon] });
  const run = { id: 'run', revision: 2, currentScenarioId: 'scene', stats: resourceToken.stats };
  const writeProfile = jest.fn();
  runTransaction.mockImplementation(async (_, callback) => {
    let reads = 0;
    return callback({
      get: async () => ({ exists: () => true, data: () => ++reads === 1 ? mockRemote : { activeRun: run } }),
      update: (_, value) => { mockRemote = { ...mockRemote, ...value }; },
      set: writeProfile,
    });
  });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon }));
  let accepted;
  await act(async () => { accepted = await hook.result.current.confirmAttack({ actionDieIds: ['one'], ...spending }); });
  expect(accepted).toBe(true);
  expect(mockRemote.items[0].runRevision).toBe(3);
  expect(writeProfile).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ activeRun: expect.objectContaining({
    revision: 3, sourceCanvasRuntimeRevision: 1, stats: expect.objectContaining({ recurso: expect.objectContaining({ current: remaining }) }),
  }) }), { merge: true });
});

test('one dual confirmation spends exactly two visible dice and is idempotent under a double click', async () => {
  const hook = setup();
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: combineCanvasWeapons(weapons, 'dual') }));
  let first, second;
  await act(async () => {
    first = hook.result.current.confirmAttack({ actionDieIds: ['one', 'two'] });
    second = hook.result.current.confirmAttack({ actionDieIds: ['one', 'two'] });
    await first;
  });
  expect(second).toBe(false);
  expect(await first).toBe(true);
  expect(runTransaction).toHaveBeenCalledTimes(1);
  const combat = mockRemote.canvasCombat;
  expect(combat.pendingAttack.actionDice.map(die => die.value)).toEqual([5, 2]);
  expect(combat.pendingAttack.weaponResults).toHaveLength(2);
  expect(combat.pendingAttack.attackParts.map(part => part.weaponId)).toEqual(['a', 'b']);
  expect(combat.participants.hero.lastAttackWeaponIds).toEqual(['a', 'b']);
  expect(combat.participants.hero.actionDice.map(die => die.status)).toEqual(['spent', 'spent', 'available']);
  expect(combat.pendingAttack.status).toBe('awaiting-defense');
});

test('cancel before confirming leaves the resources intact', () => {
  const hook = setup();
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: combineCanvasWeapons(weapons, 'dual') }));
  act(() => hook.result.current.cancelAttackDraft());
  expect(runTransaction).not.toHaveBeenCalled();
  expect(mockRemote.canvasCombat.participants.hero.actionDice).toEqual(dice);
});

test.each(['equipment', 'dice', 'control'])('transaction rejects a stale %s snapshot without spending', async change => {
  const hook = setup();
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: combineCanvasWeapons(weapons, 'dual') }));
  if (change === 'equipment') mockRemote = { ...mockRemote, items: [{ ...mockRemote.items[0], equippedItems: [weapons[0]] }, mockRemote.items[1]] };
  if (change === 'control') mockRemote = { ...mockRemote, items: [{ ...mockRemote.items[0], controlledBy: ['Other'] }, mockRemote.items[1]] };
  if (change === 'dice') mockRemote = { ...mockRemote, canvasCombat: { ...mockRemote.canvasCombat, participants: { ...mockRemote.canvasCombat.participants, hero: { ...mockRemote.canvasCombat.participants.hero, actionDice: dice.map(die => ({ ...die, status: 'spent' })) } } } };
  let accepted;
  await act(async () => { accepted = await hook.result.current.confirmAttack({ actionDieIds: ['one', 'two'] }); });
  expect(accepted).toBe(false);
  expect(mockRemote.canvasCombat.pendingAttack).toBeNull();
  expect(mockRemote.canvasCombat.participants.hero.lastAttackWeaponIds).toBeUndefined();
});

test('enemy combines inventory weapons with one main action and no action-die spending', async () => {
  const hook = setup({ enemy: true });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: weapons[0] }));
  act(() => hook.result.current.setAttackWeapons(weapons));
  await act(async () => { await hook.result.current.confirmAttack({ actionDieIds: ['one'] }); });
  expect(mockRemote.canvasCombat.pendingAttack.attackParts).toHaveLength(2);
  expect(mockRemote.canvasCombat.pendingAttack.actionDice).toEqual([]);
  expect(mockRemote.canvasCombat.participants.hero.actionDice).toEqual(dice);
  expect(mockRemote.canvasCombat.participants.hero.enemyActions.find(action => action.id === 'attack').status).toBe('spent');
});

test('Ajuste precedes defense, changes one action die and never rerolls the weapon profiles', async () => {
  const hook = setup({ adjustment: true });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: combineCanvasWeapons(weapons, 'dual') }));
  await act(async () => { await hook.result.current.confirmAttack({ actionDieIds: ['one', 'two'] }); });
  const rolls = mockRemote.canvasCombat.pendingAttack.weaponResults;
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-adjustment');
  await act(async () => { await hook.result.current.finishAttackAdjustment({ replaceDieId: 'two', withDieId: 'three' }); });
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-defense');
  expect(mockRemote.canvasCombat.pendingAttack.actionDieIds).toEqual(['one', 'three']);
  expect(mockRemote.canvasCombat.pendingAttack.weaponResults).toEqual(rolls);
});


test('remote blindness added after opening the attack prevents spending resources', async () => {
  const hook = setup();
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: weapons[0] }));
  mockRemote = { ...mockRemote, items: mockRemote.items.map(item => item.id === 'hero' ? { ...item, status: ['cegado'] } : item) };
  let accepted;
  await act(async () => { accepted = await hook.result.current.confirmAttack({ actionDieIds: ['one'] }); });
  expect(accepted).toBe(false);
  expect(mockRemote.canvasCombat.pendingAttack).toBeNull();
  expect(mockRemote.canvasCombat.participants.hero.actionDice).toEqual(dice);
});

test('mutable protection is chosen by its controller and cannot be changed again', async () => {
  const hook = setup({ enemy: true, targetOverrides: { equippedItems: [{ type: 'armor', name: 'Túnica arcana' }] } });
  let accepted;
  await act(async () => { accepted = await hook.result.current.chooseArmorProtection('target', 'critico'); });
  expect(accepted).toBe(true);
  expect(mockRemote.items.find(item => item.id === 'target').armorProtectionChoice).toBe('critico');
  await act(async () => { accepted = await hook.result.current.chooseArmorProtection('target', 'empuje'); });
  expect(accepted).toBe(false);
  expect(mockRemote.items.find(item => item.id === 'target').armorProtectionChoice).toBe('critico');
});

test('a thrown attack cannot confirm beyond its selected die and spends only after a legal selection', async () => {
  const dagger = { ...weapons[0], rasgos: ['Arrojadiza'] };
  const hook = setup({ weaponOptions: [dagger], targetOverrides: { x: 150 } });
  act(() => expect(hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: dagger })).toBe(true));
  expect(hook.result.current.attackDraft.range.distance).toBe(3);
  expect(hook.result.current.confirmAttack({ actionDieIds: ['two'] })).toBe(false);
  expect(runTransaction).not.toHaveBeenCalled();
  await act(async () => { expect(await hook.result.current.confirmAttack({ actionDieIds: ['one'] })).toBe(true); });
  expect(mockRemote.canvasCombat.pendingAttack.pressure.thrownPenalty).toBe(3);
  expect(mockRemote.canvasCombat.pendingAttack.actionDice.map(die => die.value)).toEqual([5]);
});

test('an enemy throwing weapon uses Base ofensiva for reach', async () => {
  const dagger = { ...weapons[0], rasgos: ['Arrojadiza'] };
  const hook = setup({ enemy: true, weaponOptions: [dagger], attackerOverrides: { offenseBase: 2 }, targetOverrides: { x: 150 } });
  act(() => expect(hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: dagger })).toBe(true));
  expect(hook.result.current.confirmAttack()).toBe(false);
  expect(runTransaction).not.toHaveBeenCalled();

  const inRange = setup({ enemy: true, weaponOptions: [dagger], attackerOverrides: { offenseBase: 3 }, targetOverrides: { x: 150 } });
  act(() => expect(inRange.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: dagger })).toBe(true));
  await act(async () => { expect(await inRange.result.current.confirmAttack()).toBe(true); });
  expect(mockRemote.canvasCombat.pendingAttack.pressure).toMatchObject({ actionPressure: 3, thrownPenalty: 3 });
});

test('Ajuste cannot replace the launch die with one too small to reach the target', async () => {
  const dagger = { ...weapons[0], rasgos: ['Arrojadiza'] };
  const hook = setup({ adjustment: true, weaponOptions: [dagger], targetOverrides: { x: 150 } });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: dagger }));
  await act(async () => { expect(await hook.result.current.confirmAttack({ actionDieIds: ['one'] })).toBe(true); });
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-adjustment');
  await act(async () => { expect(await hook.result.current.finishAttackAdjustment({ replaceDieId: 'one', withDieId: 'two' })).toBe(false); });
  expect(mockRemote.canvasCombat.pendingAttack.actionDieIds).toEqual(['one']);
  expect(mockRemote.canvasCombat.pendingAttack.status).toBe('awaiting-adjustment');
});

test('practice mode cannot prepare a new attack while an explosive area is awaiting orientation', () => {
  const attacker = { id: 'hero', name: 'Actor', profileType: 'rogueliteClass', controlledBy: ['Ada'],
    equippedItems: weapons, x: 0, y: 0, width: 25, height: 25 };
  const target = { id: 'target', name: 'Objetivo', profileType: 'rogueliteEnemy',
    x: 50, y: 0, width: 25, height: 25 };
  const scene = { id: 'scene', items: [attacker, target],
    canvasPracticeCombat: { explosiveBlast: { id: 'blast-1', phase: 'choose-area', sourceTokenId: 'hero' } } };
  const ref = { current: scene };
  const toast = jest.fn();
  const hook = renderHook(() => useCanvasCombatRuntime({
    activeScenario: scene, activeScenarioRef: ref, isPlayerView: true, playerName: 'Ada',
    gridConfig: { cellWidth: 50, cellHeight: 50 }, scenarioCollectionName: 'canvas_scenarios',
    setActiveScenario: jest.fn(), safePersistItems: jest.fn(), triggerToast: toast,
  }));
  let accepted;
  act(() => { accepted = hook.result.current.beginAttackDraft({
    attackerId: 'hero', targetId: 'target', weapon: weapons[0],
  }); });
  expect(accepted).toBe(false);
  expect(hook.result.current.attackDraft).toBeNull();
  expect(toast).toHaveBeenCalledWith('Resolución pendiente', expect.any(String), 'warning');
});

test.each([false, true])('HUD modifiers survive %s enemy draft changes, roll once and retain their source in the log', async enemy => {
  const hook = setup({ enemy });
  const selected = enemy ? weapons[0] : combineCanvasWeapons(weapons, 'dual');
  const weapon = applyModifiersToWeapon(selected, {
    extraDice: { d6: 2, d4: 1 }, activeTraits: ['crítico', 'perforante'],
  }, { allowedTraitIds: CANVAS_ATTACK_MODIFIER_TRAITS });
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon }));
  if (enemy) {
    act(() => hook.result.current.setAttackWeapons(weapons));
    act(() => hook.result.current.setAttackWeapons([weapons[1]]));
    act(() => hook.result.current.setAttackWeapons(weapons));
  }
  const draft = hook.result.current.attackDraft;
  expect(draft.weaponDiceProfile.map(die => die.sides)).toEqual([4, 6, 6, 6, 4]);
  expect(draft.weapon.manualCombatTraits).toEqual(['critico', 'perforante']);
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  for (let index = 0; index < 5; index += 1) random.mockReturnValueOnce(0.999);
  try {
    await act(async () => { expect(await hook.result.current.confirmAttack({ actionDieIds: ['one', 'two'] })).toBe(true); });
    const pending = mockRemote.canvasCombat.pendingAttack;
    expect(pending.weaponResults).toEqual([4, 6, 6, 6, 4]);
    expect(pending.criticalResults.map(die => die.sourceIndex)).toEqual([0, 1]);
    expect(pending.pressure.total).toBe(enemy ? 28 : 35);
    expect(random).toHaveBeenCalledTimes(7);
    const target = mockRemote.items[1];
    const resolution = resolveCanvasAttackDamage({ pressure: pending.pressure.total, target, weapon: pending.weapon });
    expect(resolution.effectiveCd).toBe(5);
    const log = buildCanvasCombatLog({ pending, attacker: mockRemote.items[0], target, defenseDice: [], resolution });
    expect(log.attackerDice.filter(die => die.source === 'Modificador').map(die => [die.faces, die.value])).toEqual([[6, 6], [6, 6], [4, 4]]);
    expect(log.attackTraits).toEqual(expect.arrayContaining(['critico', 'perforante']));
    expect(log.attackWeapons.map(part => part.diceIds.length)).toEqual([2, 2]);
    expect(new Set(log.attackerDice.map(die => die.id)).size).toBe(log.attackerDice.length);
    expect(log.resourcesSpent.filter(resource => resource.side === 'attacker')).toHaveLength(1);
  } finally { random.mockRestore(); }
});


test('automatic attack persists temporary Life consumption and logs the real-Life overflow', async () => {
  const hook = setup({ enemy: true, attackerOverrides: { offenseBase: 7 },
    targetOverrides: { stats: { cd: { current: 3 }, vida: { current: 5, max: 5 }, vidaTemporal: { current: 2, max: 2 } } } });
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon: weapons[0] }));
  await act(async () => { expect(await hook.result.current.confirmAttack()).toBe(true); });
  const pressure = mockRemote.canvasCombat.pendingAttack.pressure.total;
  await act(async () => { expect(await hook.result.current.resolvePendingAttack()).toBe(true); });
  const entry = addDoc.mock.calls.map(call => call[1]).find(value => value.canvasRoguelite);
  expect(entry.blocksLost.vidaTemporal).toBe(Math.min(2, Math.floor(pressure / 3)));
  expect(entry.blocksLost.vida).toBe(Math.max(0, Math.floor(pressure / 3) - 2));
  const saved = hook.persistItems.mock.calls.at(-1)[1].find(item => item.id === 'target');
  expect(saved.stats.vidaTemporal.current).toBe(2 - entry.blocksLost.vidaTemporal);
  expect(saved.stats.vida.current).toBe(5 - entry.blocksLost.vida);
  expect(hook.toast.mock.calls.at(-1)[1]).toContain('Vida temporal');
  random.mockRestore();
});

test.each([false, true])('Sangrado from an effective attack trait applies only after Life damage (modifier: %s)', async modifier => {
  const base = { ...weapons[0], rasgos: modifier ? [] : ['Sangrado'] };
  const weapon = modifier ? applyModifiersToWeapon(base, { extraDice: {}, activeTraits: ['sangrado'] }, { allowedTraitIds: CANVAS_ATTACK_MODIFIER_TRAITS }) : base;
  const hook = setup({ enemy: true, attackerOverrides: { offenseBase: 7 }, weaponOptions: [base],
    targetOverrides: { stats: { cd: { current: 3 }, vida: { current: 5, max: 5 } } } });
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  try {
    act(() => hook.result.current.beginAttackDraft({ attackerId: 'hero', targetId: 'target', weapon }));
    await act(async () => { expect(await hook.result.current.confirmAttack()).toBe(true); });
    await act(async () => { expect(await hook.result.current.resolvePendingAttack()).toBe(true); });
    const saved = hook.persistItems.mock.calls.at(-1)[1].find(item => item.id === 'target');
    expect(saved.status).toContain('sangrado');
    expect(saved.canvasDamageEffect.bleedingApplied).toBe(true);
    const log = addDoc.mock.calls.map(call => call[1]).find(value => value.canvasRoguelite);
    expect(log.blocksLost.vida).toBeGreaterThan(0);
    expect(log.statusEffectsApplied.target).toContain('sangrado');
  } finally { random.mockRestore(); }
});
