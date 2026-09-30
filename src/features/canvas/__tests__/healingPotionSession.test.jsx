import { act, renderHook } from '@testing-library/react';
import { useCanvasItemUseSystem } from '../item-use/useCanvasItemUseSystem';

const item = { instanceId: 'potion', name: 'Poción de curación' };
const token = { id: 'hero', controlledBy: ['Ada'], stats: { vida: { current: 3, max: 8 } } };
const resource = { id: 'die-1', kind: 'action-die', status: 'available', value: 3, sides: 6 };

function setup() {
    const sceneRef = { current: { id: 'scene-a', items: [token] } };
    let finish;
    const runtime = { prepareItemUseResources: () => [resource], getItemUseResources: () => [resource],
        commitItemUse: jest.fn(() => new Promise(resolve => { finish = resolve; })) };
    const hook = renderHook(({ scene }) => useCanvasItemUseSystem({ activeScenario: scene,
        activeScenarioRef: sceneRef, combatRuntime: runtime, isPlayerView: true,
        playerName: 'Ada', triggerToast: jest.fn() }), { initialProps: { scene: sceneRef.current } });
    act(() => hook.result.current.begin('hero', item));
    return { ...hook, runtime, sceneRef, finish: value => finish(value) };
}

test('a potion requires choosing a cost, consumes once and returns to the board without a result modal', async () => {
    const h = setup();
    expect(h.result.current.isConfirming).toBe(false);
    act(() => h.result.current.selectResource(resource));
    expect(h.result.current.isConfirming).toBe(true);
    expect(h.result.current.isPlacing).toBe(false);
    let pending;
    await act(async () => {
        pending = h.result.current.confirm();
        expect(h.result.current.confirm()).toBe(false);
        await Promise.resolve();
    });
    expect(h.runtime.commitItemUse).toHaveBeenCalledTimes(1);
    act(() => h.result.current.cancel());
    expect(h.result.current.session).not.toBeNull();
    await act(async () => {
        h.finish({ ok: true, effect: 'heal', roll: 4, healed: 4, previousLife: 3, nextLife: 7, maxLife: 8 });
        await pending;
    });
    expect(h.result.current.isShowingResult).toBe(false);
    expect(h.result.current.session).toBeNull();
    expect(h.result.current.confirm()).toBe(false);
    act(() => h.result.current.cancel());
    expect(h.result.current.session).toBeNull();
});

test('a failed confirmation releases a stale session after changing scenes', async () => {
    const h = setup();
    act(() => h.result.current.selectResource(resource));
    let pending;
    await act(async () => { pending = h.result.current.confirm(); await Promise.resolve(); });
    h.sceneRef.current = { id: 'scene-b', items: [token] };
    h.rerender({ scene: h.sceneRef.current });
    await act(async () => { h.finish(false); await pending; });
    expect(h.result.current.session).toBeNull();
    expect(h.result.current.result).toBeNull();
    expect(h.result.current.isCommitting).toBe(false);
});

test('cost can be replaced or deselected before confirmation without any consumption', () => {
    const h = setup();
    act(() => h.result.current.selectResource(resource));
    const other = { ...resource, id: 'other', value: 1 };
    act(() => h.result.current.selectResource(other));
    expect(h.result.current.session.context.resource.id).toBe('other');
    act(() => h.result.current.selectResource(other));
    expect(h.result.current.isConfirming).toBe(false);
    expect(h.result.current.session.context.resource).toBeUndefined();
    act(() => h.result.current.cancel());
    expect(h.runtime.commitItemUse).not.toHaveBeenCalled();
});


test.each([false, true])('antidote retains self and independently controlled ally selection after choosing a cost, enemy=%s', async enemy => {
    const source = { ...token, profileType: enemy ? 'rogueliteEnemy' : 'rogueliteClass',
        teamId: 'party', status: ['envenenado'], x: 0, y: 0, width: 25, height: 25 };
    const ally = { ...source, id: 'ally', controlledBy: ['Bea'], name: 'Companion' };
    const scene = { id: 'scene', items: [source, ally] };
    const cost = enemy ? { id: 'main', kind: 'enemy-action', status: 'available' } : resource;
    const runtime = { prepareItemUseResources: () => [cost], getItemUseResources: () => [cost],
        commitItemUse: jest.fn(async () => ({ ok: true, effect: 'remove-poison' })) };
    const { result } = renderHook(() => useCanvasItemUseSystem({ activeScenario: scene,
        activeScenarioRef: { current: scene }, combatRuntime: runtime, isPlayerView: !enemy,
        playerName: 'Ada', gridConfig: { cellWidth: 50, cellHeight: 50 }, triggerToast: jest.fn() }));
    act(() => result.current.begin('hero', { instanceId: 'antidote', itemUseId: 'antidote' }));
    act(() => result.current.selectResource(cost));
    expect(result.current.isConfirming).toBe(true);
    expect(result.current.isPlacing).toBe(false);
    expect(result.current.antidoteTargets.map(target => target.id)).toEqual(['hero', 'ally']);
    act(() => result.current.selectTarget('ally'));
    expect(result.current.session.context.targetId).toBe('ally');
    if (enemy) act(() => result.current.selectTarget('hero'));
    await act(async () => { await result.current.confirm(); });
    expect(runtime.commitItemUse).toHaveBeenCalledWith(expect.objectContaining({
        tokenId: 'hero', targetId: enemy ? 'hero' : 'ally', resource: cost,
    }));
});
