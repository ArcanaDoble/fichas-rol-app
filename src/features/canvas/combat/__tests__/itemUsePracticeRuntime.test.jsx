import { act, renderHook } from '@testing-library/react';
import { updateDoc } from 'firebase/firestore';
import { useCanvasCombatRuntime } from '../useCanvasCombatRuntime';
import { createCanvasCombatState, rollParticipantActionDice } from '../canvasCombatState';
import { useCanvasItemUseSystem } from '../../item-use/useCanvasItemUseSystem';

jest.mock('../../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(async () => ({ id: 'log' })), collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})), serverTimestamp: jest.fn(() => 100),
  setDoc: jest.fn(async () => {}), updateDoc: jest.fn(async () => {}), deleteDoc: jest.fn(async () => {}),
}));

const bomb = { instanceId: 'bomb-1', name: 'Bomba de humo', type: 'object' };
const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
function setup({ enemy = false, combat = false, profile = ['d8', 'd6', 'd4'], controlled = true } = {}) {
  const token = { id: 'hero', name: 'Exploradora', profileType: enemy ? 'rogueliteEnemy' : 'rogueliteClass',
    controlledBy: controlled ? ['Ada'] : ['Otro'], x: 0, y: 0, width: 50, height: 50,
    actionDice: profile, threatDie: 'd10', inventory: [bomb], equipmentLoadout: { belt_0: bomb }, equippedItems: [bomb] };
  let state = { id: 'scene', items: [token] };
  if (combat) state.canvasCombat = rollParticipantActionDice(createCanvasCombatState([token]), token.id);
  const ref = { current: state };
  const persist = jest.fn(async () => {});
  const toast = jest.fn();
  const setActiveScenario = fn => { state = typeof fn === 'function' ? fn(state) : fn; ref.current = state; };
  const hook = renderHook(() => {
    const runtime = useCanvasCombatRuntime({ activeScenario: state, activeScenarioRef: ref,
      scenarioCollectionName: 'canvas_scenarios', gridConfig, isPlayerView: !enemy,
      playerName: 'Ada', safePersistItems: persist, setActiveScenario, triggerToast: toast });
    const system = useCanvasItemUseSystem({ activeScenario: state, activeScenarioRef: ref, combatRuntime: runtime,
      gridConfig, isPlayerView: !enemy, playerName: 'Ada', triggerToast: toast, divToWorld: (x, y) => ({ x, y }) });
    return { runtime, system };
  });
  return { ...hook, state: () => state, setActiveScenario, persist, toast };
}

beforeEach(() => jest.clearAllMocks());

test.each([false, true])('outside combat creates stable rolled resources for enemy=%s', enemy => {
  const h = setup({ enemy });
  act(() => expect(h.result.current.system.begin('hero', bomb)).toBe(true));
  const resources = h.result.current.system.resources;
  expect(resources.map(die => die.die)).toEqual(enemy ? ['d10'] : ['d8', 'd6', 'd4']);
  resources.forEach(die => {
    expect(die).toMatchObject({ practice: true, status: 'available' });
    expect(die.value).toBeGreaterThanOrEqual(1);
    expect(die.value).toBeLessThanOrEqual(die.sides);
  });
  h.rerender();
  expect(h.result.current.system.resources).toEqual(resources);
  act(() => h.result.current.system.cancel());
  expect(h.state().items[0].inventory).toHaveLength(1);
  expect(h.persist).not.toHaveBeenCalled();
  act(() => h.result.current.system.begin('hero', bomb));
  expect(h.result.current.system.resources[0].id).not.toBe(resources[0].id);
  expect(h.state().canvasCombat).toBeUndefined();
});

test('tokens without configured dice receive three d6 for testing', () => {
  const h = setup({ profile: [] });
  act(() => h.result.current.system.begin('hero', bomb));
  expect(h.result.current.system.resources.map(die => die.die)).toEqual(['d6', 'd6', 'd6']);
});

test('full smoke flow validates range, consumes the bomb once and persists the area without starting combat', async () => {
  const h = setup();
  act(() => h.result.current.system.begin('hero', bomb));
  const resource = h.result.current.system.resources[0];
  act(() => h.result.current.system.selectResource(resource));
  act(() => h.result.current.system.handlePointerDown({ clientX: 5000, clientY: 5000 }));
  expect(h.result.current.system.isPlacing).toBe(true);
  expect(h.persist).not.toHaveBeenCalled();
  act(() => h.result.current.system.handlePointerDown({ clientX: 25, clientY: 25 }));
  expect(h.result.current.system.isConfirming).toBe(true);
  await act(async () => expect(h.result.current.system.confirm()).toBe(true));
  const token = h.state().items.find(item => item.id === 'hero');
  const smoke = h.state().items.find(item => item.geometryKind === 'smoke');
  expect(token.inventory).toEqual([]);
  expect(token.equipmentLoadout.belt_0).toBeNull();
  expect(smoke).toMatchObject({ width: 100, height: 100, areaEffect: { type: 'smoke' } });
  expect(h.state().canvasCombat).toBeUndefined();
  expect(h.state().canvasPracticeCombat).toBeUndefined();
  expect(h.persist).toHaveBeenCalledWith('scene', h.state().items, expect.any(Array), ['hero', smoke.id], { persistRuntime: true });
  expect(updateDoc).not.toHaveBeenCalled();
  act(() => expect(h.result.current.runtime.commitItemUse({ tokenId: 'hero', item: bomb, resource, resolvedItems: [smoke] })).toBe(false));
  expect(h.state().items.filter(item => item.geometryKind === 'smoke')).toHaveLength(1);
});

test('normal combat uses existing dice and spends the selected die without practice replenishment', async () => {
  const h = setup({ combat: true });
  act(() => h.result.current.system.begin('hero', bomb));
  const resource = h.result.current.system.resources[0];
  expect(resource.practice).toBeUndefined();
  await act(async () => expect(h.result.current.runtime.commitItemUse({ tokenId: 'hero', item: bomb, resource })).toBe(true));
  expect(h.state().canvasCombat.participants.hero.actionDice[0].status).toBe('spent');
  expect(h.result.current.runtime.prepareItemUseResources('hero')[0].status).toBe('spent');
  expect(updateDoc).toHaveBeenCalled();
});

test('active combat with no rolled dice does not grant debug dice', () => {
  const h = setup();
  act(() => h.setActiveScenario(state => ({ ...state, canvasCombat: createCanvasCombatState(state.items) })));
  h.rerender();
  act(() => expect(h.result.current.system.begin('hero', bomb)).toBe(false));
  expect(h.result.current.system.session).toBeNull();
});

test('practice dice cannot be used after combat starts or the scene changes', () => {
  const h = setup();
  act(() => h.result.current.system.begin('hero', bomb));
  const resource = h.result.current.system.resources[0];
  act(() => h.setActiveScenario(state => ({ ...state, canvasCombat: createCanvasCombatState(state.items) })));
  h.rerender();
  act(() => expect(h.result.current.runtime.commitItemUse({ tokenId: 'hero', item: bomb, resource })).toBe(false));
  act(() => h.setActiveScenario(state => ({ ...state, id: 'other-scene', canvasCombat: null })));
  h.rerender();
  act(() => expect(h.result.current.runtime.commitItemUse({ tokenId: 'hero', item: bomb, resource })).toBe(false));
  expect(h.persist).not.toHaveBeenCalled();
});

test('players cannot obtain practice dice for another player token', () => {
  const h = setup({ controlled: false });
  act(() => expect(h.result.current.system.begin('hero', bomb)).toBe(false));
  expect(h.result.current.runtime.prepareItemUseResources('hero')).toEqual([]);
  expect(h.persist).not.toHaveBeenCalled();
});

test('a fresh practice roll cannot restore a consumed or missing item', () => {
  const h = setup();
  act(() => h.setActiveScenario(state => ({ ...state, items: state.items.map(token => ({ ...token, inventory: [], equippedItems: [], equipmentLoadout: {} })) })));
  h.rerender();
  const [resource] = h.result.current.runtime.prepareItemUseResources('hero');
  act(() => expect(h.result.current.runtime.commitItemUse({ tokenId: 'hero', item: bomb, resource })).toBe(false));
  expect(h.persist).not.toHaveBeenCalled();
});

const touchEvent = (touches, changedTouches = touches) => ({ touches, changedTouches, stopPropagation: jest.fn(), preventDefault: jest.fn() });

test('one-finger drag previews until release; reposition keeps the die and cancellation spends nothing', () => {
  const h = setup();
  act(() => h.result.current.system.begin('hero', bomb));
  const resource = h.result.current.system.resources[0];
  act(() => h.result.current.system.selectResource(resource));
  act(() => h.result.current.system.handleTouchStart(touchEvent([{ clientX: 10, clientY: 10 }])));
  act(() => h.result.current.system.handleTouchMove(touchEvent([{ clientX: 60, clientY: 10 }])));
  expect(h.result.current.system.isPlacing).toBe(true);
  expect(h.result.current.system.placement.x).toBe(50);
  act(() => h.result.current.system.handleTouchEnd(touchEvent([], [{ clientX: 60, clientY: 10 }])));
  expect(h.result.current.system.isConfirming).toBe(true);
  act(() => h.result.current.system.reposition());
  expect(h.result.current.system.isPlacing).toBe(true);
  expect(h.result.current.system.session.context.resource).toEqual(resource);
  act(() => h.result.current.system.cancel());
  expect(h.state().items[0].inventory).toHaveLength(1);
  expect(h.persist).not.toHaveBeenCalled();
});

test('pinch zoom passes to the viewport and releasing either finger cannot fix or launch a template', () => {
  const h = setup();
  act(() => h.result.current.system.begin('hero', bomb));
  act(() => h.result.current.system.selectResource(h.result.current.system.resources[0]));
  const first = { clientX: 10, clientY: 10 };
  const second = { clientX: 60, clientY: 60 };
  act(() => h.result.current.system.handleTouchStart(touchEvent([first])));
  act(() => expect(h.result.current.system.handleTouchStart(touchEvent([first, second]))).toBe(false));
  act(() => expect(h.result.current.system.handleTouchMove(touchEvent([first, second]))).toBe(false));
  act(() => expect(h.result.current.system.handleTouchEnd(touchEvent([first], [second]))).toBe(false));
  act(() => expect(h.result.current.system.handleTouchEnd(touchEvent([], [first]))).toBe(false));
  act(() => h.result.current.system.handlePointerDown({ ...first, button: 0, stopPropagation: jest.fn() }));
  expect(h.result.current.system.isPlacing).toBe(true);
  expect(h.persist).not.toHaveBeenCalled();
});
