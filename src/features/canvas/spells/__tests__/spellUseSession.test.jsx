import { act, renderHook } from '@testing-library/react';
import { useCanvasSpellUseSystem } from '../useCanvasSpellUseSystem';

const staff = { id: 'staff', type: 'weapon', dano: 'd8', alcance: 'Lejano', rasgos: ['Catalizador'] };
const spell = { id: 'fireball', name: 'Bola de fuego' };
const mage = { id: 'mage', layer: 'TOKEN', controlledBy: ['Ada'], profileType: 'rogueliteClass', classIdentity: 'Mago', equippedItems: [staff],
  equippedSkillSlots: [spell], x: 0, y: 0, width: 50, height: 50, stats: { recurso: { current: 1 } } };
const die = { id: 'die', sides: 6, value: 4, status: 'available' };
const scenario = { id: 'scene', items: [mage], canvasCombat: { startedAt: 123, round: 1, status: 'active',
  roundPhase: 'turns', activeBlockIndex: 0, blocks: [{ memberIds: ['mage'], actedIds: [] }],
  participants: { mage: { actionDice: [die] } } } };
const event = patch => ({ stopPropagation: jest.fn(), preventDefault: jest.fn(), ...patch });
function setup() {
  const castFireball = jest.fn(async () => ({ ok: true }));
  const hook = renderHook(() => useCanvasSpellUseSystem({ activeScenario: scenario, activeScenarioRef: { current: scenario },
    combatRuntime: { castFireball }, divToWorld: (x, y) => ({ x, y }), gridConfig: { isInfinite: true, cellWidth: 50, cellHeight: 50 },
    isPlayerView: false, playerName: 'Ada', triggerToast: jest.fn() }));
  act(() => hook.result.current.begin('mage', 0));
  act(() => hook.result.current.configure({ actionDieId: 'die' }));
  act(() => hook.result.current.prepareArea());
  return { ...hook, castFireball };
}

test('mist touch fixes the whole 3×3 area in one step and spends only on confirmation', async () => {
  const mist = { id: 'mist', name: 'Niebla arcana' };
  const current = { ...scenario, items: [{ ...mage, equippedSkillSlots: [mist] }] };
  const castArcaneMist = jest.fn(async () => ({ ok: true }));
  const h = renderHook(({ scene }) => useCanvasSpellUseSystem({ activeScenario: scene, activeScenarioRef: { current: scene },
    combatRuntime: { castArcaneMist }, divToWorld: (x, y) => ({ x, y }),
    gridConfig: { isInfinite: true, cellWidth: 50, cellHeight: 50 }, isPlayerView: false, triggerToast: jest.fn() }),
    { initialProps: { scene: current } });
  act(() => h.result.current.begin('mage', 0));
  act(() => h.result.current.configure({ actionDieId: 'die', manaSpend: 1 }));
  act(() => h.result.current.prepareArea());
  act(() => h.result.current.handleTouchStart(event({ touches: [{ clientX: 60, clientY: 10 }] })));
  act(() => h.result.current.handleTouchEnd(event({ touches: [], changedTouches: [{ clientX: 60, clientY: 10 }] })));
  expect(h.result.current.isConfirming).toBe(true);
  expect(h.result.current.placement.cells).toHaveLength(9);
  expect(h.result.current.placement).toMatchObject({ x: 50, y: 0, width: 150, height: 150 });
  expect(castArcaneMist).not.toHaveBeenCalled();
  await act(async () => expect(await h.result.current.confirm()).toBe(true));
  expect(castArcaneMist).toHaveBeenCalledWith(expect.objectContaining({ point: { x: 51, y: 1 }, manaSpend: 1 }));
  expect(castArcaneMist.mock.calls[0][0].extensionPoint).toBeUndefined();
});

test('mist can reposition/cancel for free and loses selection if the Mage loses vision', () => {
  const current = { ...scenario, items: [{ ...mage, equippedSkillSlots: [{ id: 'mist', name: 'Niebla arcana' }],
    hasVision: true, visionRadius: 300 }] };
  const castArcaneMist = jest.fn();
  const h = renderHook(({ scene }) => useCanvasSpellUseSystem({ activeScenario: scene, activeScenarioRef: { current: scene },
    combatRuntime: { castArcaneMist }, divToWorld: (x, y) => ({ x, y }),
    gridConfig: { isInfinite: true, cellWidth: 50, cellHeight: 50, fogOfWar: true },
    isPlayerView: true, playerName: 'Ada', triggerToast: jest.fn() }), { initialProps: { scene: current } });
  act(() => h.result.current.begin('mage', 0));
  act(() => h.result.current.configure({ actionDieId: 'die', manaSpend: 1 }));
  act(() => h.result.current.prepareArea());
  act(() => h.result.current.handlePointerDown(event({ button: 0, clientX: 60, clientY: 10 })));
  act(() => h.result.current.reposition());
  expect(h.result.current.placement).toBeNull();
  act(() => h.result.current.handlePointerDown(event({ button: 0, clientX: 60, clientY: 10 })));
  h.rerender({ scene: { ...current, items: [{ ...current.items[0], visionRadius: 30 }] } });
  expect(h.result.current.placement).toBeNull();
  expect(h.result.current.session.phase).toBe('place-area');
  act(() => h.result.current.cancel());
  expect(h.result.current.session).toBeNull();
  expect(castArcaneMist).not.toHaveBeenCalled();
});

test('placing and cancelling are free and confirmation launches exactly once', async () => {
  const h = setup();
  act(() => h.result.current.handlePointerDown(event({ button: 0, clientX: 60, clientY: 10 })));
  expect(h.result.current.isConfirming).toBe(true);
  expect(h.castFireball).not.toHaveBeenCalled();
  await act(async () => { const first = h.result.current.confirm(); expect(await h.result.current.confirm()).toBe(false); await first; });
  expect(h.castFireball).toHaveBeenCalledTimes(1);
  expect(h.result.current.session).toBeNull();
});

test('projectile selects one enemy by touch and keeps preparation free until confirmation', async () => {
  const enemy = { id: 'enemy', layer: 'TOKEN', profileType: 'rogueliteEnemy', x: 100, y: 0, width: 50, height: 50,
    stats: { vida: { current: 5 } } };
  const projectile = { id: 'projectile', name: 'Proyectil arcano' };
  const current = { ...scenario, items: [{ ...mage, equippedSkillSlots: [projectile] }, enemy] };
  const castArcaneProjectile = jest.fn(async () => ({ ok: true }));
  const h = renderHook(({ scene }) => useCanvasSpellUseSystem({ activeScenario: scene, activeScenarioRef: { current: scene },
    combatRuntime: { castArcaneProjectile }, divToWorld: (x, y) => ({ x, y }),
    gridConfig: { isInfinite: true, cellWidth: 50, cellHeight: 50 }, isPlayerView: false, triggerToast: jest.fn() }), { initialProps: { scene: current } });
  act(() => { h.result.current.begin('mage', 0); });
  act(() => h.result.current.configure({ actionDieId: 'die' }));
  act(() => h.result.current.prepareArea());
  expect(h.result.current.targetOptions.map(option => option.targetId)).toEqual(['enemy']);
  act(() => h.result.current.handleTouchStart(event({ touches: [{ clientX: 120, clientY: 20 }] })));
  act(() => h.result.current.handleTouchEnd(event({ touches: [], changedTouches: [{ clientX: 120, clientY: 20 }] })));
  expect(h.result.current.placement.targetId).toBe('enemy');
  expect(castArcaneProjectile).not.toHaveBeenCalled();
  h.rerender({ scene: { ...current, items: [current.items[0], { ...enemy, x: 500 }] } });
  expect(h.result.current.placement).toBeNull();
  expect(h.result.current.isPlacing).toBe(true);
  await act(async () => expect(await h.result.current.confirm()).toBe(false));
  expect(castArcaneProjectile).not.toHaveBeenCalled();
  h.rerender({ scene: current });
  act(() => h.result.current.selectTarget('enemy'));
  await act(async () => expect(await h.result.current.confirm()).toBe(true));
  expect(castArcaneProjectile).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'enemy', slotIndex: 0, actionDieId: 'die' }));
});

test('a persisted chain resumes for its caster, can be cancelled, and stays hidden from other players', async () => {
  const first = { id: 'first', layer: 'TOKEN', profileType: 'rogueliteEnemy', x: 100, y: 0, width: 50, height: 50, stats: { vida: { current: 5 } } };
  const second = { ...first, id: 'second', x: 150 };
  const chain = { id: 'cast', phase: 'choose-target', sourceTokenId: 'mage', firstTargetId: 'first', origin: first,
    catalyst: staff, weapon: { name: 'Proyectil arcano' }, combatStartedAt: 123, combatRound: 1 };
  const current = { ...scenario, items: [{ ...mage, controlledBy: ['Ada'] }, first, second],
    canvasCombat: { ...scenario.canvasCombat, arcaneChain: chain } };
  const castArcaneProjectile = jest.fn(async () => ({ ok: true }));
  const h = renderHook(() => useCanvasSpellUseSystem({ activeScenario: current, activeScenarioRef: { current },
    combatRuntime: { castArcaneProjectile }, divToWorld: (x, y) => ({ x, y }),
    gridConfig: { isInfinite: true, cellWidth: 50, cellHeight: 50 }, isPlayerView: true, playerName: 'Ada', triggerToast: jest.fn() }));
  expect(h.result.current.session).toMatchObject({ chainId: 'cast', phase: 'place-area' });
  expect(h.result.current.targetOptions.map(option => option.targetId)).toEqual(['second']);
  await act(async () => { await h.result.current.cancel(); });
  expect(castArcaneProjectile).toHaveBeenCalledWith(expect.objectContaining({ chainId: 'cast', finishChain: true }));
  const other = renderHook(() => useCanvasSpellUseSystem({ activeScenario: current, activeScenarioRef: { current },
    combatRuntime: {}, gridConfig: {}, isPlayerView: true, playerName: 'Bea', triggerToast: jest.fn() }));
  expect(other.result.current.session).toBeNull();
});

test('fog filters the roster and map clicks, and lost sight clears an already selected enemy', async () => {
  const source = { ...mage, hasVision: true, visionRadius: 60,
    equippedSkillSlots: [{ id: 'projectile', name: 'Proyectil arcano' }] };
  const enemy = { id: 'enemy', layer: 'TOKEN', profileType: 'rogueliteEnemy', x: 100, y: 0,
    width: 50, height: 50, stats: { vida: { current: 5 } } };
  const current = { ...scenario, items: [source, enemy] };
  const castArcaneProjectile = jest.fn();
  const h = renderHook(({ scene }) => useCanvasSpellUseSystem({ activeScenario: scene, activeScenarioRef: { current: scene },
    combatRuntime: { castArcaneProjectile }, divToWorld: (x, y) => ({ x, y }),
    gridConfig: { isInfinite: true, cellWidth: 50, cellHeight: 50, fogOfWar: true },
    isPlayerView: true, playerName: 'Ada', triggerToast: jest.fn() }), { initialProps: { scene: current } });
  act(() => h.result.current.begin('mage', 0));
  act(() => h.result.current.configure({ actionDieId: 'die' }));
  act(() => h.result.current.prepareArea());
  expect(h.result.current.targetOptions).toEqual([]);
  act(() => h.result.current.handlePointerDown(event({ button: 0, clientX: 120, clientY: 20 })));
  expect(h.result.current.isConfirming).toBe(false);
  expect(h.result.current.placement?.targetId).toBeUndefined();
  await act(async () => expect(await h.result.current.confirm()).toBe(false));
  h.rerender({ scene: { ...current, items: [{ ...source, visionRadius: 150 }, enemy] } });
  act(() => h.result.current.selectTarget('enemy'));
  expect(h.result.current.isConfirming).toBe(true);
  h.rerender({ scene: current });
  expect(h.result.current.targetOptions).toEqual([]);
  expect(h.result.current.placement).toBeNull();
  expect(h.result.current.isPlacing).toBe(true);
  expect(castArcaneProjectile).not.toHaveBeenCalled();
});

test('two-finger pinch does not select an area and a single touch fixes the template on release', () => {
  const h = setup();
  const first = { clientX: 60, clientY: 10 }, second = { clientX: 90, clientY: 20 };
  act(() => h.result.current.handleTouchStart(event({ touches: [first] })));
  act(() => h.result.current.handleTouchMove(event({ touches: [first, second] })));
  act(() => h.result.current.handleTouchEnd(event({ touches: [], changedTouches: [first] })));
  expect(h.result.current.isPlacing).toBe(true);
  act(() => h.result.current.handleTouchStart(event({ touches: [first] })));
  act(() => h.result.current.handleTouchEnd(event({ touches: [], changedTouches: [first] })));
  expect(h.result.current.isConfirming).toBe(true);
  expect(h.result.current.placement).toMatchObject({ x: 50, y: 0, width: 100, height: 100 });
});

test('invalid far-side range remains in placement and Escape cancels without costs', () => {
  const h = setup();
  act(() => h.result.current.handlePointerDown(event({ button: 0, clientX: 160, clientY: 10 })));
  expect(h.result.current.isPlacing).toBe(true);
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(h.result.current.session).toBeNull();
  expect(h.castFireball).not.toHaveBeenCalled();
});

test('practice opens with rolled resources, stays open without combat and cancels freely', () => {
  const practiceScenario = { ...scenario, canvasCombat: null };
  const castFireball = jest.fn(), prepareSpellUseResources = jest.fn(() => ({ id: 'practice', resources: [die] }));
  const hook = renderHook(({ current }) => useCanvasSpellUseSystem({ activeScenario: current, activeScenarioRef: { current },
    combatRuntime: { castFireball, prepareSpellUseResources }, divToWorld: (x, y) => ({ x, y }),
    gridConfig: { isInfinite: true, cellWidth: 50, cellHeight: 50 }, isPlayerView: false, triggerToast: jest.fn() }),
    { initialProps: { current: practiceScenario } });
  act(() => expect(hook.result.current.begin('mage', 0)).toBe(true));
  expect(hook.result.current.session).toMatchObject({ phase: 'prepare', practice: true, practiceId: 'practice' });
  expect(hook.result.current.resources).toEqual([die]);
  act(() => hook.result.current.configure({ actionDieId: 'die' }));
  act(() => expect(hook.result.current.prepareArea()).toBe(true));
  act(() => hook.result.current.cancel());
  expect(castFireball).not.toHaveBeenCalled();
  expect(mage.stats.recurso.current).toBe(1);
  act(() => hook.result.current.begin('mage', 0));
  hook.rerender({ current: scenario });
  expect(hook.result.current.session).toBeNull();
});
