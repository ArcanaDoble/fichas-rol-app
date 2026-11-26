import { useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState } from '../canvasCombatState';
import * as attackRules from '../canvasAttackRules';
import { applyArcaneBarrier } from '../../spells/arcaneBarrierState';

let documents, failTransaction, transactionRetries;
jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  runTransaction: jest.fn(), doc: jest.fn(), collection: jest.fn(() => 'combat_log'),
  addDoc: jest.fn(async () => ({})), serverTimestamp: jest.fn(() => 100),
  updateDoc: jest.fn(), setDoc: jest.fn(), deleteDoc: jest.fn(),
}));

const path = 'canvas_scenarios/scene';
const profilePath = 'players/Ada/rogueliteClasses/mage';
const scene = () => documents.get(path);
const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
const fireball = { id: 'fireball', name: 'Bola de fuego', type: 'ability', isPrepared: true };
const projectile = { id: 'projectile', name: 'Proyectil arcano', type: 'ability', isPrepared: true };
const mist = { id: 'mist', name: 'Niebla arcana', type: 'ability', isPrepared: true };
const barrier = { id: 'barrier', name: 'Barrera arcana', type: 'ability', isPrepared: true };
const staff = { id: 'staff', name: 'Bastón arcano', type: 'weapon', dano: 'd8', alcance: 'Lejano', rasgos: ['Catalizador'] };

function setup({ linked = false, level = 1, mana = 1, practice = false, spell = fireball, isPlayerView = false, showHiddenTokens = false } = {}) {
  const mage = { id: 'mage', name: 'Mago', layer: 'TOKEN', profileType: 'rogueliteClass', classIdentity: 'Mago', level,
    controlledBy: ['Ada'], x: 0, y: 0, width: 50, height: 50, actionDice: ['d6'],
    inventory: [staff, spell], equippedItems: [staff], equippedSkillSlots: [spell, spell, null],
    equippedSkillIds: [spell.id, spell.id, null],
    stats: { vida: { current: 5, max: 5 }, cd: { current: 5, max: 5 }, recurso: { label: 'Maná', current: mana, max: 3 } },
    ...(linked ? { runId: 'run', runRevision: 0, linkedClassId: 'mage', linkedClassOwner: 'Ada' } : {}) };
  const ally = { ...mage, id: 'ally', name: 'Aliada', classIdentity: 'Guerrero', x: 50, equippedItems: [],
    stats: { vida: { current: 8, max: 8 }, cd: { current: 4, max: 4 } } };
  const enemy = { id: 'enemy', name: 'Ogro', layer: 'TOKEN', profileType: 'rogueliteEnemy',
    x: 100, y: 0, width: 100, height: 100, stats: { vida: { current: 8, max: 8 }, cd: { current: 8, max: 8 } } };
  const outside = { ...enemy, id: 'outside', x: 200, width: 50, height: 50 };
  const items = [mage, ally, enemy, outside];
  const combat = createCanvasCombatState(items, { now: 123 });
  Object.assign(combat, { status: 'active', roundPhase: 'turns', blocks: [{ memberIds: ['mage'], actedIds: [] }], activeBlockIndex: 0 });
  Object.assign(combat.participants.mage, { actionDice: [{ id: 'die', die: 'd6', sides: 6, value: 4, status: 'available' }], awaitingRoll: false });
  Object.assign(combat.participants.ally, { actionDice: [{ id: 'defense', die: 'd6', sides: 6, value: 3, status: 'committed' }], awaitingRoll: false });
  const initial = { id: 'scene', items, canvasCombat: practice ? null : combat };
  documents.set(path, initial);
  if (linked) documents.set(profilePath, { activeRun: { id: 'run', revision: 0, currentScenarioId: 'scene' } });
  const persistItems = jest.fn(async (_id, nextItems) => documents.set(path, { ...scene(), items: nextItems }));
  const toast = jest.fn();
  const hook = renderHook(() => {
    const [current, setCurrent] = useState(initial);
    const ref = useRef(current); ref.current = current;
    return { current, setCurrent, runtime: useCanvasCombatRuntime({ activeScenario: current, activeScenarioRef: ref,
      gridConfig, isPlayerView, showHiddenTokens, playerName: 'Ada', scenarioCollectionName: 'canvas_scenarios',
      safePersistItems: persistItems, triggerToast: toast, setActiveScenario: setCurrent }) };
  });
  const cast = (patch = {}) => hook.result.current.runtime[spell === barrier ? 'castArcaneBarrier' : spell === mist ? 'castArcaneMist' : spell === fireball ? 'castFireball' : 'castArcaneProjectile']({ castId: 'cast', tokenId: 'mage', slotIndex: 0,
    catalystId: 'staff', actionDieId: 'die', manaSpend: 0, conserve: false, point: { x: 50, y: 0 },
    combatStartedAt: 123, combatRound: 1, ...(spell === barrier ? { targetId: 'ally' } : spell === projectile ? { targetId: 'enemy' } : {}), ...patch });
  const sync = patch => { const fresh = { ...scene(), ...patch }; documents.set(path, fresh); hook.result.current.setCurrent(fresh); };
  return { ...hook, cast, sync, toast };
}

beforeEach(() => {
  documents = new Map(); failTransaction = false; transactionRetries = 1; jest.clearAllMocks();
  doc.mockImplementation((_db, ...parts) => parts.join('/'));
  runTransaction.mockImplementation(async (_db, callback) => {
    let result, writes;
    for (let index = 0; index < transactionRetries; index += 1) {
      writes = [];
      result = await callback({ get: async key => {
        if (writes.length) throw new Error('All reads must precede writes');
        return { exists: () => documents.has(key), data: () => documents.get(key) };
      }, update: (key, patch) => writes.push({ key, patch, merge: true }),
      set: (key, patch, options) => writes.push({ key, patch, merge: options?.merge }) });
    }
    if (failTransaction) throw new Error('Offline');
    writes.forEach(({ key, patch, merge }) => documents.set(key, merge ? { ...documents.get(key), ...patch } : patch));
    return result;
  });
  updateDoc.mockImplementation(async (key, patch) => documents.set(key, { ...documents.get(key), ...patch }));
  jest.spyOn(Math, 'random').mockReturnValue(.4);
});
afterEach(() => jest.restoreAllMocks());

test('barrier commits the copy/action and ally protection once, synchronizes costs and preserves base CD/Oculto', async () => {
  const h = setup({ spell: barrier, linked: true });
  act(() => h.sync({ items: scene().items.map(item => item.id === 'mage' ? { ...item, status: [{ id: 'oculto' }],
    equippedItems: [{ ...staff, rasgos: ['Catalizador', 'Crítico', 'Venenosa'] }] } : item) }));
  transactionRetries = 3;
  const roll = jest.spyOn(attackRules, 'rollWeaponDice');
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(roll).not.toHaveBeenCalled();
  expect(scene().canvasCombat.pendingAttack).toBeFalsy();
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('spent');
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [true, false, false], status: [{ id: 'oculto' }], stats: { recurso: { current: 1 } } });
  expect(scene().items[1]).toMatchObject({ status: ['barrera'], stats: { cd: { current: 4, max: 4 } },
    arcaneBarrier: { id: 'cast', expires: 'combat-end', negatedTraits: ['critico', 'venenosa'] } });
  expect(documents.get(profilePath).activeRun.usedSkillSlots).toEqual([true, false, false]);
  expect(documents.get(profilePath).activeRun.arcaneBarrier).toBeUndefined();
  expect(documents.get(profilePath).activeRun.statusEffects || []).not.toContain('barrera');
  expect(documents.get('combat_log/barrier-scene-cast')).toMatchObject({ eventType: 'spell-use', cdBonus: 1, targetId: 'ally' });
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(scene().items[1].arcaneBarrier.id).toBe('cast');
  expect(scene().items[1].status.filter(id => id === 'barrera')).toHaveLength(1);
});

test('barrier self, Adaptation and Conservation consume two Mana; finishing combat removes the temporary seal', async () => {
  const h = setup({ spell: barrier, linked: true, level: 2, mana: 2 });
  act(() => h.sync({ items: scene().items.map(item => item.id === 'mage'
    ? { ...item, status: [{ id: 'oculto' }] } : item) }));
  await act(async () => expect((await h.cast({ targetId: 'mage', manaSpend: 1, conserve: true })).ok).toBe(true));
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [false, false, false], status: [{ id: 'oculto' }, 'barrera'],
    stats: { cd: { current: 5, max: 5 }, recurso: { current: 0 } },
    arcaneBarrier: { negatedTraits: ['conmocion'] } });
  expect(documents.get(profilePath).activeRun).toMatchObject({ stats: { cd: { current: 5 } } });
  expect(documents.get(profilePath).activeRun.arcaneBarrier).toBeUndefined();
  expect(documents.get(profilePath).activeRun.statusEffects || []).not.toContain('barrera');
  await act(async () => expect(await h.result.current.runtime.finishCombat()).toBeTruthy());
  expect(scene().items[0].arcaneBarrier).toBeUndefined();
  expect(scene().items[0].status).toEqual([{ id: 'oculto' }]);
  expect(scene().items[0].stats.cd).toEqual({ current: 5, max: 5 });
  expect(documents.get(profilePath).activeRun.arcaneBarrier).toBeUndefined();
  expect(documents.get(profilePath).activeRun.statusEffects || []).not.toContain('barrera');
});

test('fresh visibility, allied membership and duplicate protection reject before spending; a failed write safely retries', async () => {
  const h = setup({ spell: barrier, isPlayerView: true });
  const initial = scene();
  documents.set(path, { ...initial, config: { fogOfWar: true }, items: initial.items.map(item => item.id === 'mage'
    ? { ...item, hasVision: true, visionRadius: 30 } : item) });
  await act(async () => expect((await h.cast()).ok).toBe(false));
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('available');
  documents.set(path, initial);
  await act(async () => expect((await h.cast({ castId: 'enemy-cast', targetId: 'enemy' })).ok).toBe(false));
  failTransaction = true;
  await act(async () => expect((await h.cast()).ok).toBe(false));
  expect(scene().items[1].arcaneBarrier).toBeUndefined();
  failTransaction = false;
  await act(async () => expect((await h.cast()).ok).toBe(true));
  act(() => h.sync({ canvasCombat: { ...scene().canvasCombat, participants: { ...scene().canvasCombat.participants,
    mage: { ...scene().canvasCombat.participants.mage, actionDice: [{ id: 'second', sides: 6, value: 2, status: 'available' }] } } } }));
  await act(async () => expect((await h.cast({ castId: 'duplicate', slotIndex: 1, actionDieId: 'second' })).ok).toBe(false));
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('available');
  expect(scene().items[0].usedSkillSlots).toEqual([true, false, false]);
});

test('barrier works in practice with no defense rolls or Pressure', async () => {
  const h = setup({ spell: barrier, practice: true });
  let resources;
  act(() => { resources = h.result.current.runtime.prepareSpellUseResources('mage'); });
  await act(async () => expect((await h.cast({ practice: true, practiceId: resources.id,
    actionDieId: resources.resources[0].id, combatStartedAt: undefined, combatRound: undefined })).ok).toBe(true));
  expect(scene().canvasPracticeCombat.pendingAttack).toBeFalsy();
  expect(scene().canvasPracticeCombat.participants.ally.actionDice).toHaveLength(0);
  expect(scene().items[1].arcaneBarrier).toBeTruthy();
  expect(scene().items[1].status).toContain('barrera');
});

test('a received barrier hides its target effect from other players while the Master can inspect it', () => {
  const h = setup({ spell: barrier, isPlayerView: true });
  act(() => h.sync({ items: scene().items.map(item => item.id === 'ally' ? { ...item, controlledBy: ['Bruno'], status: [{ id: 'oculto' }] } : item),
    canvasSpellEffect: { id: 'received-barrier', spellId: 'runic-barrier', sourceTokenId: 'mage', targetId: 'ally', startedAt: Date.now(),
      placement: { x: 50, y: 0, width: 50, height: 50 } } }));
  expect(h.result.current.runtime.spellPresentation.targetVisible).toBe(false);
});

test('barrier reacts to a blocked attack and follows the protected token without restarting the cast', async () => {
  const h = setup({ spell: projectile });
  act(() => h.sync({ items: scene().items.map(item => item.id === 'enemy'
    ? applyArcaneBarrier(item, { castId: 'protection', now: 1, protections: ['critico', 'venenosa'] }) : item) }));
  await act(async () => expect((await h.cast()).ok).toBe(true));
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  const enemy = scene().items.find(item => item.id === 'enemy');
  expect(enemy.stats.vida.current).toBe(8); // 8 Pressure < protected CD 9.
  expect(enemy.arcaneBarrier.lastImpactId).toBeTruthy();
  expect(enemy.canvasDamageEffect).toBeUndefined();
  act(() => h.sync({ canvasSpellEffect: { id: 'protection', spellId: 'runic-barrier', sourceTokenId: 'mage', targetId: 'enemy', startedAt: Date.now(),
    placement: { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height } } }));
  const start = h.result.current.runtime.spellPresentation.effect.presentationStartedAt;
  act(() => h.sync({ items: scene().items.map(item => item.id === 'enemy' ? { ...item, x: 200 } : item) }));
  expect(h.result.current.runtime.spellPresentation.effect).toMatchObject({ presentationStartedAt: start, placement: { x: 200 } });
});

test('barrier resonance neutralizes incoming Catalyst Critical/Poison', async () => {
  const h = setup({ spell: projectile });
  act(() => h.sync({ items: scene().items.map(item => item.id === 'mage'
    ? { ...item, equippedItems: [{ ...staff, rasgos: ['Catalizador', 'Crítico', 'Venenosa'] }] }
    : item.id === 'enemy' ? applyArcaneBarrier(item, { castId: 'protection', now: 1, protections: ['critico', 'venenosa'] }) : item) }));
  Math.random.mockReturnValueOnce(.999).mockReturnValue(.4);
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(scene().canvasCombat.pendingAttack.criticalResults).toEqual([]);
  expect(scene().canvasCombat.pendingAttack.weapon.rasgos).not.toContain('venenosa');
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  expect(scene().items.find(item => item.id === 'enemy').status || []).not.toContainEqual(expect.objectContaining({ id: 'poison' }));
});

test('mist atomically spends its copy/action, syncs the adventure and creates neutral smoke without rolls or attacks', async () => {
  const h = setup({ spell: mist, linked: true });
  act(() => h.sync({ items: scene().items.map(item => item.id === 'mage' ? { ...item, status: [{ id: 'oculto' }] } : item) }));
  const roll = jest.spyOn(attackRules, 'rollWeaponDice');
  transactionRetries = 3;
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(roll).not.toHaveBeenCalled();
  expect(scene().canvasCombat.pendingAttack).toBeFalsy();
  expect(scene().canvasCombat.explosiveBlast).toBeFalsy();
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('spent');
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [true, false, false], status: [{ id: 'oculto' }], stats: { recurso: { current: 1 } } });
  expect(documents.get(profilePath).activeRun.usedSkillSlots).toEqual([true, false, false]);
  expect(scene().items.filter(item => item.geometryKind === 'smoke')).toMatchObject([{ id: 'mist-cast-0', width: 100, height: 100,
    areaEffect: { spellId: 'arcane-mist', expires: 'combat-end' } }]);
  const log = documents.get('combat_log/mist-scene-cast');
  expect(log).toMatchObject({ eventType: 'spell-use', spellId: 'arcane-mist', cells: expect.arrayContaining([{ column: 1, row: 0 }, { column: 2, row: 1 }]) });
  expect(log.cells).toHaveLength(4);
  expect(log.attackPressure).toBeUndefined();
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(scene().items.filter(item => item.geometryKind === 'smoke')).toHaveLength(1);
});

test('mist extension and conservation pay two Mana and retain the copy; only the spell expires at encounter end', async () => {
  const h = setup({ spell: mist, level: 2, mana: 2 });
  const manual = { id: 'manual', type: 'geometry', geometryKind: 'smoke', x: 400, y: 0, width: 50, height: 50 };
  const bomb = { ...manual, id: 'bomb', x: 500, areaEffect: { type: 'smoke', expiresOnTurn: 'mage' } };
  act(() => h.sync({ items: [...scene().items, manual, bomb] }));
  await act(async () => expect((await h.cast({ manaSpend: 1, conserve: true })).ok).toBe(true));
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [false, false, false], stats: { recurso: { current: 0 } } });
  expect(scene().canvasCombat.participants.mage.arcaneConservationUsed).toBe(true);
  expect(scene().items.filter(item => item.areaEffect?.spellId === 'arcane-mist')).toMatchObject([{ width: 150, height: 150 }]);
  expect(documents.get('combat_log/mist-scene-cast').cells).toHaveLength(9);
  await act(async () => expect(await h.result.current.runtime.finishCombat()).toBeTruthy());
  expect(scene().items.filter(item => item.geometryKind === 'smoke').map(item => item.id)).toEqual(['manual', 'bomb']);
});

test.each([
  { isPlayerView: true, showHiddenTokens: false, sourceVisible: false },
  { isPlayerView: true, showHiddenTokens: true, sourceVisible: false },
  { isPlayerView: false, showHiddenTokens: true, sourceVisible: true },
])('mist source visibility follows the viewer: %j', ({ sourceVisible, ...viewer }) => {
  const h = setup({ spell: mist, ...viewer });
  const effect = { id: 'received-mist', spellId: 'arcane-mist', sourceTokenId: 'mage', startedAt: Date.now(),
    sourcePosition: { x: 0, y: 0, width: 50, height: 50 }, placement: { x: 50, y: 0, width: 100, height: 100 } };
  act(() => h.sync({ canvasSpellEffect: effect, items: scene().items.map(item => item.id === 'mage'
    ? { ...item, controlledBy: ['Bruno'], status: [{ id: 'oculto' }] } : item) }));
  expect(h.result.current.runtime.spellPresentation).toMatchObject({ effect: { id: effect.id }, sourceVisible });
  act(() => h.sync({ items: scene().items.map(item => item.id === 'mage' ? { ...item, status: [] } : item) }));
  expect(h.result.current.runtime.spellPresentation.sourceVisible).toBe(true);
});

test('mist rejects fresh fog changes and partially out-of-range areas before any spend, then safely retries a failed write', async () => {
  const h = setup({ spell: mist, isPlayerView: true });
  const initial = scene();
  documents.set(path, { ...initial, config: { fogOfWar: true }, items: initial.items.map(item => item.id === 'mage'
    ? { ...item, hasVision: true, visionRadius: 30 } : item) });
  await act(async () => expect((await h.cast()).ok).toBe(false));
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('available');
  documents.set(path, initial);
  await act(async () => expect((await h.cast({ manaSpend: 1, point: { x: 100, y: 0 } })).ok).toBe(false));
  failTransaction = true;
  await act(async () => expect((await h.cast()).ok).toBe(false));
  expect(scene().items[0].usedSkillSlots).toBeUndefined();
  failTransaction = false;
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(scene().items.filter(item => item.geometryKind === 'smoke')).toHaveLength(1);
});

test('mist works in practice with the same cost and without rolling defense dice', async () => {
  const h = setup({ spell: mist, practice: true });
  let resources;
  act(() => { resources = h.result.current.runtime.prepareSpellUseResources('mage'); });
  const roll = jest.spyOn(attackRules, 'rollWeaponDice');
  await act(async () => expect((await h.cast({ practice: true, practiceId: resources.id,
    actionDieId: resources.resources[0].id, combatStartedAt: undefined, combatRound: undefined })).ok).toBe(true));
  expect(roll).not.toHaveBeenCalled();
  expect(scene().canvasPracticeCombat.participants.ally.actionDice).toHaveLength(0);
  expect(scene().canvasPracticeCombat.pendingAttack).toBeFalsy();
  expect(scene().items[0].usedSkillSlots).toEqual([true, false, false]);
});

test('mist practice cannot reuse Conservation by reopening preparation', async () => {
  const h = setup({ spell: mist, practice: true, level: 2, mana: 3 });
  let resources;
  act(() => { resources = h.result.current.runtime.prepareSpellUseResources('mage'); });
  await act(async () => expect((await h.cast({ practice: true, practiceId: resources.id, conserve: true,
    actionDieId: resources.resources[0].id, combatStartedAt: undefined, combatRound: undefined })).ok).toBe(true));
  act(() => { resources = h.result.current.runtime.prepareSpellUseResources('mage'); });
  await act(async () => expect((await h.cast({ castId: 'repeat-conserve', practice: true, practiceId: resources.id, conserve: true,
    point: { x: 0, y: 0 }, actionDieId: resources.resources[0].id, combatStartedAt: undefined, combatRound: undefined })).ok).toBe(false));
  expect(scene().items[0].stats.recurso.current).toBe(2);
  expect(scene().items.filter(item => item.geometryKind === 'smoke')).toHaveLength(1);
});

test('projectile spends one copy and action, rolls only the catalyst and prevents active enemy defense', async () => {
  const h = setup({ spell: projectile, linked: true });
  const club = { id: 'club', type: 'weapon', name: 'Maza', dano: 'd6', alcance: 'Toque' };
  act(() => h.sync({ items: scene().items.map(item => item.id === 'enemy' ? { ...item, equippedItems: [club] } : item) }));
  const roll = jest.spyOn(attackRules, 'rollWeaponDice');
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(scene().canvasCombat.explosiveBlast.targetIds).toEqual(['enemy']);
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ spellId: 'arcane-projectile', weaponResults: [4],
    pressure: { total: 8 }, weapon: { preventsActiveDefense: true, ignoresCover: true } });
  expect(documents.get(profilePath).activeRun).toMatchObject({ usedSkillSlots: [true, false, false], stats: { recurso: { current: 1 } } });
  await act(async () => expect(await h.result.current.runtime.rollEnemyDefense({ equipmentIds: ['club'] })).toBe(false));
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack(['defense'])).toBe(false));
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  expect(scene().items.find(item => item.id === 'enemy').stats.vida.current).toBe(7);
  expect(scene().canvasCombat.participants.enemy.enemyActions.find(action => action.id === 'attack').status).toBe('available');
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(roll).toHaveBeenCalledTimes(1);
});

test('chain is selected after the first resolution, measures range from that target and rerolls without repaying', async () => {
  const h = setup({ spell: projectile });
  transactionRetries = 3;
  const roll = jest.spyOn(attackRules, 'rollWeaponDice');
  await act(async () => expect((await h.cast({ manaSpend: 1 })).ok).toBe(true));
  expect(scene().canvasCombat.arcaneChain.phase).toBe('awaiting-impact');
  const next = () => h.result.current.runtime.castArcaneProjectile({ castId: 'cast-chain', chainId: 'cast',
    tokenId: 'mage', targetId: 'outside', combatStartedAt: 123, combatRound: 1 });
  await act(async () => expect((await next()).ok).toBe(false));
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  expect(scene().canvasCombat.arcaneChain.phase).toBe('choose-target');
  await act(async () => expect(await h.result.current.runtime.nextRound()).toBe(false));
  Math.random.mockReturnValue(.7);
  await act(async () => expect((await next()).ok).toBe(true));
  expect(scene().canvasCombat.arcaneChain).toBeNull();
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ targetId: 'outside', weaponResults: [6],
    actionDice: [{ id: 'die', value: 4 }], pressure: { total: 10 }, spellCostPaid: true });
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [true, false, false], stats: { recurso: { current: 0 } } });
  expect(roll).toHaveBeenCalledTimes(2);
  await act(async () => expect((await next()).ok).toBe(true));
  expect(roll).toHaveBeenCalledTimes(2);
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  expect(h.result.current.runtime.pendingAttack).toBeNull();
});

test('projectile practice conserves its copy, pays mana once and keeps the chain until it is finished', async () => {
  const h = setup({ spell: projectile, practice: true, level: 2, mana: 2 });
  let resources;
  act(() => { resources = h.result.current.runtime.prepareSpellUseResources('mage'); });
  await act(async () => expect((await h.cast({ practice: true, practiceId: resources.id,
    actionDieId: resources.resources[0].id, combatStartedAt: undefined, combatRound: undefined,
    manaSpend: 1, conserve: true })).ok).toBe(true));
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [false, false, false], stats: { recurso: { current: 0 } } });
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  expect(scene().canvasPracticeCombat.arcaneChain.phase).toBe('choose-target');
  await act(async () => expect((await h.result.current.runtime.castArcaneProjectile({ castId: 'finish', chainId: 'cast',
    tokenId: 'mage', practice: true, finishChain: true })).ok).toBe(true));
  expect(scene().canvasPracticeCombat.arcaneChain).toBeNull();
  expect(scene().items[0].stats.recurso.current).toBe(0);
});

test('a failed projectile transaction retains the roll, consumes nothing, and reuses it on retry', async () => {
  const h = setup({ spell: projectile });
  const roll = jest.spyOn(attackRules, 'rollWeaponDice');
  failTransaction = true;
  await act(async () => expect((await h.cast()).ok).toBe(false));
  expect(scene().items[0].usedSkillSlots).toBeUndefined();
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('available');
  failTransaction = false;
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(roll).toHaveBeenCalledTimes(1);
});

test('a fresh fog change rejects a hidden projectile target before any roll or resource spend', async () => {
  const h = setup({ spell: projectile, isPlayerView: true });
  const roll = jest.spyOn(attackRules, 'rollWeaponDice');
  // The caster still has the old local grid when the transaction reads the scene.
  const visionItems = radius => scene().items.map(item => item.id === 'mage'
    ? { ...item, hasVision: true, visionRadius: radius } : item);
  documents.set(path, { ...scene(), config: { fogOfWar: true }, items: visionItems(60) });
  await act(async () => expect((await h.cast({ manaSpend: 1 })).ok).toBe(false));
  expect(roll).not.toHaveBeenCalled();
  expect(scene().canvasCombat.pendingAttack).toBeNull();
  expect(scene().items[0].usedSkillSlots).toBeUndefined();
  expect(scene().items[0].stats.recurso.current).toBe(1);
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('available');
  documents.set(path, { ...scene(), items: visionItems(300) });
  await act(async () => expect((await h.cast({ manaSpend: 1 })).ok).toBe(true));
  expect(roll).toHaveBeenCalledTimes(1);
});

test('a chain cannot use the first enemy as a source of vision', async () => {
  const h = setup({ spell: projectile });
  await act(async () => expect((await h.cast({ manaSpend: 1 })).ok).toBe(true));
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  documents.set(path, { ...scene(), config: { fogOfWar: true }, items: scene().items.map(item =>
    item.id === 'mage' ? { ...item, hasVision: true, visionRadius: 80 }
      : item.id === 'enemy' ? { ...item, hasVision: true, visionRadius: 1000 } : item) });
  const roll = jest.spyOn(attackRules, 'rollWeaponDice');
  await act(async () => expect((await h.result.current.runtime.castArcaneProjectile({ castId: 'next-hidden',
    chainId: 'cast', tokenId: 'mage', targetId: 'outside', combatStartedAt: 123, combatRound: 1 })).ok).toBe(false));
  expect(roll).not.toHaveBeenCalled();
  expect(scene().canvasCombat.arcaneChain.phase).toBe('choose-target');
  expect(scene().canvasCombat.pendingAttack).toBeNull();
  expect(scene().items[0].stats.recurso.current).toBe(0);
});

test('one shared roll, one spent die and one prepared copy; allies and large enemies defend separately', async () => {
  const h = setup();
  const weaponRoll = jest.spyOn(attackRules, 'rollWeaponDice');
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [true, false, false], stats: { recurso: { current: 1 } } });
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('spent');
  expect(scene().canvasCombat.explosiveBlast.targetIds).toEqual(['ally', 'enemy']);
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ targetId: 'ally', pressure: { total: 8 }, weaponResults: [4] });
  expect(weaponRoll).toHaveBeenCalledTimes(1);
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack(['defense'])).toBe(true));
  expect(scene().items.find(item => item.id === 'ally').stats.vida.current).toBe(7);
  expect(h.result.current.runtime.pendingAttack).toMatchObject({ targetId: 'enemy', pressure: { total: 8 }, weaponResults: [4] });
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  expect(scene().items.find(item => item.id === 'enemy').stats.vida.current).toBe(7);
  expect(scene().items.find(item => item.id === 'outside').stats.vida.current).toBe(8);
  expect(h.result.current.runtime.pendingAttack).toBeNull();
  expect(weaponRoll).toHaveBeenCalledTimes(1);
});

test('intensification adds one catalyst die and the linked run commits mana and exact copy atomically', async () => {
  const h = setup({ linked: true });
  transactionRetries = 3;
  await act(async () => expect((await h.cast({ manaSpend: 1 })).ok).toBe(true));
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ weaponResults: [4, 4], pressure: { total: 12 } });
  expect(documents.get(profilePath).activeRun).toMatchObject({ usedSkillSlots: [true, false, false], stats: { recurso: { current: 0 } } });
  expect(Math.random).toHaveBeenCalledTimes(2);
  await act(async () => expect((await h.cast({ manaSpend: 1 })).ok).toBe(true));
  expect(Math.random).toHaveBeenCalledTimes(2);
  expect(scene().items[0].stats.recurso.current).toBe(0);
});

test('failure and retry retain the roll without spending a copy, mana or die prematurely', async () => {
  const h = setup(); failTransaction = true;
  await act(async () => expect((await h.cast()).ok).toBe(false));
  expect(scene().items[0].usedSkillSlots).toBeUndefined();
  expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('available');
  failTransaction = false;
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(Math.random).toHaveBeenCalledTimes(1);
});

test.each([{ point: { x: 150, y: 0 } }, { actionDieId: 'missing' }, { slotIndex: 2 }, { combatRound: 2 }, { manaSpend: 2 }])(
  'rejects invalid or stale casts before rolling or spending: %o', async patch => {
    const h = setup();
    await act(async () => expect((await h.cast(patch)).ok).toBe(false));
    expect(Math.random).not.toHaveBeenCalled();
    expect(scene().canvasCombat.participants.mage.actionDice[0].status).toBe('available');
  });

test('conservation protects only the chosen prepared copy and spends its own mana', async () => {
  const h = setup({ level: 2, mana: 2 });
  await act(async () => expect((await h.cast({ conserve: true, manaSpend: 1 })).ok).toBe(true));
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [false, false, false], stats: { recurso: { current: 0 } } });
  expect(scene().canvasCombat.participants.mage.arcaneConservationUsed).toBe(true);
});

test('catalyst and intensification dice share critical chains while each target keeps its armor protection', async () => {
  const h = setup();
  act(() => h.sync({ items: scene().items.map(item => item.id === 'mage'
    ? { ...item, equippedItems: [{ ...staff, rasgos: ['Catalizador', 'Crítico'] }] }
    : item.id === 'ally' ? { ...item, equipmentLoadout: { body: { name: 'Cota de malla', type: 'armor' } } }
      : item.id === 'enemy' ? { ...item, equipmentLoadout: { body: { name: 'Túnica arcana', type: 'armor' } }, armorProtectionChoice: 'critico' }
        : item) }));
  Math.random.mockReturnValueOnce(.999).mockReturnValueOnce(.999)
    .mockReturnValueOnce(.999).mockReturnValueOnce(.125).mockReturnValueOnce(.25);
  await act(async () => expect((await h.cast({ manaSpend: 1 })).ok).toBe(true));
  const shared = scene().canvasCombat.explosiveBlast.attackTemplate;
  expect(shared.weaponResults).toEqual([8, 8]);
  expect(shared.criticalResults.map(die => [die.sourceIndex, die.value])).toEqual([[0, 8], [0, 2], [1, 3]]);
  expect(scene().canvasCombat.pendingAttack.pressure.total).toBe(33);
  await act(async () => h.result.current.runtime.resolvePendingAttack());
  expect(scene().canvasCombat.pendingAttack).toMatchObject({ targetId: 'enemy', weaponResults: [8, 8],
    criticalResults: [], pressure: { total: 20 } });
  expect(Math.random).toHaveBeenCalledTimes(5);
});

test('fire expands along connected tar using the shared pressure and burns it after all defenses', async () => {
  const h = setup();
  const tar = { id: 'tar', type: 'geometry', geometryKind: 'tar', x: 150, y: 0, width: 100, height: 100,
    areaEffect: { type: 'tar', inflammable: true } };
  act(() => h.sync({ items: [...scene().items, tar] }));
  await act(async () => expect((await h.cast()).ok).toBe(true));
  expect(scene().canvasCombat.explosiveBlast.targetIds).toEqual(['ally', 'enemy', 'outside']);
  for (let index = 0; index < 3; index += 1) await act(async () => h.result.current.runtime.resolvePendingAttack());
  expect(scene().items.some(item => item.geometryKind === 'tar')).toBe(false);
  expect(scene().items.some(item => item.geometryKind === 'tar-ignition')).toBe(true);
});

test('round recharge preserves spent copies; final encounter restores them and removes mana once', async () => {
  const h = setup();
  await act(async () => h.cast());
  await act(async () => h.result.current.runtime.resolvePendingAttack());
  await act(async () => h.result.current.runtime.resolvePendingAttack());
  await act(async () => h.result.current.runtime.nextRound());
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [true, false, false], stats: { recurso: { current: 2 } } });
  await act(async () => h.result.current.runtime.finishCombat());
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [false, false, false], stats: { recurso: { current: 0 } } });
  act(() => expect(h.result.current.runtime.finishCombat()).toBe(false));
});

const practiceCast = (h, prepared, patch = {}) => h.cast({ practice: true, practiceId: prepared.id,
  actionDieId: prepared.resources[0].id, combatStartedAt: undefined, combatRound: undefined, ...patch });

test('practice pays an action die, the selected copy and mana without starting combat or recharging on reopening', async () => {
  const h = setup({ practice: true, linked: true });
  let prepared;
  act(() => { prepared = h.result.current.runtime.prepareSpellUseResources('mage'); });
  expect(prepared.resources).toHaveLength(1);
  expect(scene().canvasPracticeCombat).toBeUndefined();
  expect(scene().items[0].usedSkillSlots).toBeUndefined();
  await act(async () => expect((await practiceCast(h, prepared, { manaSpend: 1, slotIndex: 1 })).ok).toBe(true));
  expect(scene().canvasCombat).toBeNull();
  expect(scene().canvasPracticeCombat.participants.mage.actionDice[0]).toMatchObject({ id: prepared.resources[0].id, status: 'spent' });
  expect(scene().canvasPracticeCombat.pendingAttack).toMatchObject({ targetId: 'ally', weaponResults: [4, 4], pressure: { total: 11 } });
  expect(documents.get(profilePath).activeRun).toMatchObject({ usedSkillSlots: [false, true, false], stats: { recurso: { current: 0 } } });
  act(() => expect(h.result.current.runtime.prepareSpellUseResources('mage')).toBeNull());
  const defenseId = scene().canvasPracticeCombat.participants.ally.actionDice[0].id;
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack([defenseId])).toBe(true));
  await act(async () => expect(await h.result.current.runtime.resolvePendingAttack()).toBe(true));
  expect(h.result.current.runtime.pendingAttack).toBeNull();
  expect(scene().canvasPracticeCombat).toBeNull();
  expect(scene().canvasCombat).toBeNull();
  act(() => { prepared = h.result.current.runtime.prepareSpellUseResources('mage'); });
  expect(prepared.resources[0].status).toBe('available');
  expect(scene().items[0]).toMatchObject({ usedSkillSlots: [false, true, false], stats: { recurso: { current: 0 } } });
});

test('practice retains action, defense and catalyst rolls on transaction retries and failure', async () => {
  const h = setup({ practice: true });
  let prepared;
  act(() => { prepared = h.result.current.runtime.prepareSpellUseResources('mage'); });
  failTransaction = true; transactionRetries = 3;
  await act(async () => expect((await practiceCast(h, prepared)).ok).toBe(false));
  expect(scene().canvasPracticeCombat).toBeUndefined();
  expect(scene().items[0].usedSkillSlots).toBeUndefined();
  expect(Math.random).toHaveBeenCalledTimes(3);
  failTransaction = false;
  await act(async () => expect((await practiceCast(h, prepared)).ok).toBe(true));
  await act(async () => expect((await practiceCast(h, prepared)).ok).toBe(true));
  expect(Math.random).toHaveBeenCalledTimes(3);
  expect(scene().items[0].usedSkillSlots).toEqual([true, false, false]);
});

test.each([{ practiceId: 'stale' }, { actionDieId: 'missing' }, { point: { x: 150, y: 0 } }, { manaSpend: 2 }])(
  'practice rejects invalid selections before rolling defenses or spending: %o', async patch => {
    const h = setup({ practice: true });
    let prepared;
    act(() => { prepared = h.result.current.runtime.prepareSpellUseResources('mage'); });
    Math.random.mockClear();
    await act(async () => expect((await practiceCast(h, prepared, patch)).ok).toBe(false));
    expect(Math.random).not.toHaveBeenCalled();
    expect(scene().items[0].usedSkillSlots).toBeUndefined();
    expect(scene().canvasPracticeCombat).toBeUndefined();
  });

test('practice cannot confirm after a combat starts', async () => {
  const h = setup({ practice: true });
  let prepared;
  act(() => { prepared = h.result.current.runtime.prepareSpellUseResources('mage'); });
  act(() => h.sync({ canvasCombat: createCanvasCombatState(scene().items, { now: 123 }) }));
  Math.random.mockClear();
  await act(async () => expect((await practiceCast(h, prepared)).ok).toBe(false));
  expect(Math.random).not.toHaveBeenCalled();
  expect(scene().canvasPracticeCombat).toBeUndefined();
});
