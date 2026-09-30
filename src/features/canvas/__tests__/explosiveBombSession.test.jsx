import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { useCanvasItemUseSystem } from '../item-use/useCanvasItemUseSystem';
import { AreaPlacementControls, AreaPlacementOverlay, getThrowTrajectory } from '../../tactical-shared/components/AreaPlacementOverlay';

const bomb = { instanceId: 'explosive-1', name: 'Bomba explosiva' };
const token = { id: 'hero', type: 'token', x: 0, y: 0, width: 50, height: 50, controlledBy: ['Ada'] };
const resource = { id: 'action-die-1', status: 'available', value: 4, sides: 6, die: 'd6' };
const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };

function createBlast({ impactCell = { column: 3, row: 1 }, distance = 3 } = {}) {
    return { id: 'blast-1', useId: 'blast-1', phase: 'choose-area', sourceTokenId: 'hero',
        tokenId: 'hero', item: bomb, resource, impactCell, rolls: [3, 7], pressure: Math.max(0, 14 - distance),
        distance, sourcePosition: { x: 0, y: 0, width: 50, height: 50 } };
}

function setup({ initialBlast = null } = {}) {
    let scene = { id: 'scene-a', items: [token] };
    const activeScenarioRef = { current: scene };
    const combatRuntime = {
        explosiveBlast: initialBlast,
        getItemUseResources: () => [resource], prepareItemUseResources: () => [resource],
    };
    const commitExplosiveBombImpact = jest.fn(async ({ useId, impactCell }) => {
        const distance = Math.max(Math.abs(impactCell.column), Math.abs(impactCell.row));
        const blast = { ...createBlast({ impactCell, distance }), id: useId, useId };
        combatRuntime.explosiveBlast = blast;
        return { ok: true, blast, rolls: blast.rolls, pressure: blast.pressure, distance };
    });
    const commitExplosiveBombUse = jest.fn(async () => {
        combatRuntime.explosiveBlast = null;
        return { ok: true };
    });
    Object.assign(combatRuntime, { commitExplosiveBombImpact, commitExplosiveBombUse });
    const triggerToast = jest.fn();
    const hook = renderHook(() => useCanvasItemUseSystem({
        activeScenario: scene, activeScenarioRef, combatRuntime, gridConfig,
        divToWorld: (x, y) => ({ x, y }), isPlayerView: true,
        playerName: 'Ada', triggerToast,
    }));
    const moveToken = (x, y) => {
        scene = { ...scene, items: [{ ...token, x, y }] };
        activeScenarioRef.current = scene;
        hook.rerender();
    };
    return { ...hook, combatRuntime, commitExplosiveBombImpact, commitExplosiveBombUse, triggerToast, moveToken };
}

async function lockImpact(h, x = 175, y = 75) {
    await act(async () => {
        expect(h.result.current.handlePointerDown({ clientX: x, clientY: y })).toBe(true);
        await Promise.resolve();
    });
}

test('impact spends once and rolls once before choosing an orientation within the visible die range', async () => {
    const h = setup();
    act(() => expect(h.result.current.begin('hero', bomb)).toBe(true));
    act(() => h.result.current.selectResource(resource));
    await lockImpact(h);

    expect(h.commitExplosiveBombImpact).toHaveBeenCalledTimes(1);
    expect(h.commitExplosiveBombImpact).toHaveBeenCalledWith(expect.objectContaining({
        tokenId: 'hero', item: bomb, resource, impactCell: { column: 3, row: 1 },
    }));
    expect(h.result.current.isConfirming).toBe(true);
    expect(h.result.current.session.context.explosiveRolls).toEqual([3, 7]);
    expect(h.result.current.explosivePressure).toBe(11);
    expect(h.result.current.explosiveOrientations.map(option => option.orientation)).toEqual(['nw', 'ne', 'sw', 'se']);

    act(() => h.result.current.chooseExplosiveOrientation('se'));
    expect(h.result.current.placement).toMatchObject({ x: 150, y: 50, width: 100, height: 100, distance: 3 });
    expect(h.result.current.explosivePressure).toBe(11);
    expect(h.commitExplosiveBombImpact).toHaveBeenCalledTimes(1);

    await act(async () => expect(await h.result.current.confirm()).toBe(true));
    expect(h.commitExplosiveBombUse).toHaveBeenCalledWith({
        useId: expect.any(String), tokenId: 'hero', impactCell: { column: 3, row: 1 },
        placement: expect.objectContaining({ orientation: 'se', distance: 3 }),
    });
    expect(h.result.current.session).toBeNull();
});

test('a distant impact is marked out of range and cannot be fixed or rolled', async () => {
    const h = setup();
    act(() => h.result.current.begin('hero', bomb));
    act(() => h.result.current.selectResource(resource));
    act(() => h.result.current.handlePointerMove({ clientX: 1525, clientY: 25 }));
    expect(h.result.current.placement).toMatchObject({ distance: 30, range: 4, valid: false, reason: 'out-of-range' });
    const { container } = render(<AreaPlacementOverlay system={h.result.current} />);
    expect(container.querySelector('.noma-area-overlay')).toHaveAttribute('data-valid', 'false');
    expect(container.querySelector('.noma-area-trajectory__line')).toBeInTheDocument();
    await lockImpact(h, 1525, 25);
    expect(h.result.current.isConfirming).toBe(false);
    expect(h.commitExplosiveBombImpact).not.toHaveBeenCalled();
    expect(h.triggerToast).toHaveBeenCalledWith('Plantilla no válida', 'Está a 30 casillas y el dado alcanza 4.', 'warning');
});

test('closing after impact never refunds or rerolls; the pending blast can be resumed', async () => {
    const h = setup();
    act(() => h.result.current.begin('hero', bomb));
    act(() => h.result.current.selectResource(resource));
    await lockImpact(h);
    act(() => h.result.current.reposition());
    expect(h.result.current.isConfirming).toBe(true);
    act(() => h.result.current.cancel());
    expect(h.result.current.session).toBeNull();
    expect(h.result.current.canResumeExplosiveBlast).toBe(true);
    act(() => expect(h.result.current.begin('hero', bomb)).toBe(false));
    act(() => expect(h.result.current.resumeExplosiveBlast()).toBe(true));
    expect(h.result.current.session.context.explosiveRolls).toEqual([3, 7]);
    expect(h.result.current.explosivePressure).toBe(11);
    expect(h.commitExplosiveBombImpact).toHaveBeenCalledTimes(1);
});

test('an existing blast is restored on mount without rerolling or consuming again', () => {
    const h = setup({ initialBlast: createBlast() });
    expect(h.result.current.isConfirming).toBe(true);
    expect(h.result.current.explosivePressure).toBe(11);
    expect(h.commitExplosiveBombImpact).not.toHaveBeenCalled();
});

test('saved impact distance and launch origin stay fixed when the token moves before area selection', async () => {
    const h = setup();
    act(() => h.result.current.begin('hero', bomb));
    act(() => h.result.current.selectResource(resource));
    await lockImpact(h);
    const originalPath = getThrowTrajectory(h.result.current.trajectorySource, h.result.current.placement).path;

    act(() => h.moveToken(450, 450));
    expect(h.result.current.sourceToken).toMatchObject({ x: 450, y: 450 });
    expect(h.result.current.trajectorySource).toMatchObject({ x: 0, y: 0, width: 50, height: 50 });
    expect(h.result.current.placement.distance).toBe(3);
    expect(h.result.current.explosiveOrientations.every(option => option.distance === 3)).toBe(true);
    expect(h.result.current.explosivePressure).toBe(11);

    act(() => h.result.current.chooseExplosiveOrientation('se'));
    expect(h.result.current.placement.distance).toBe(3);
    const trajectory = getThrowTrajectory(h.result.current.trajectorySource, h.result.current.placement);
    expect(trajectory.path).toBe(originalPath);
    expect(trajectory.start.x).toBeLessThan(100);
    expect(getThrowTrajectory(h.result.current.sourceToken, h.result.current.placement).start.x).toBeGreaterThan(400);
    const { container } = render(<>
        <AreaPlacementOverlay system={h.result.current} source={h.result.current.trajectorySource} />
        <AreaPlacementControls system={h.result.current} />
    </>);
    expect(container.querySelector('.noma-area-trajectory__line')).toHaveAttribute('d', trajectory.path);
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByText('casillas · −3 Presión')).toBeInTheDocument();
    expect(screen.getByText('−3 Presión')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
});

test('impact cannot be sent twice or cancelled while its cost is being committed', async () => {
    const h = setup();
    let finish;
    h.commitExplosiveBombImpact.mockImplementationOnce(({ useId, impactCell }) => new Promise(resolve => {
        finish = () => {
            const blast = { ...createBlast({ impactCell }), id: useId, useId };
            h.combatRuntime.explosiveBlast = blast;
            resolve({ ok: true, blast, rolls: blast.rolls, pressure: blast.pressure });
        };
    }));
    act(() => h.result.current.begin('hero', bomb));
    act(() => h.result.current.selectResource(resource));
    await act(async () => {
        expect(h.result.current.handlePointerDown({ clientX: 175, clientY: 75 })).toBe(true);
        expect(h.result.current.handlePointerDown({ clientX: 225, clientY: 75 })).toBe(true);
        h.result.current.cancel();
        await Promise.resolve();
    });
    expect(h.commitExplosiveBombImpact).toHaveBeenCalledTimes(1);
    expect(h.result.current.isCommitting).toBe(true);
    expect(h.result.current.session).not.toBeNull();
    await act(async () => { finish(); await Promise.resolve(); });
    expect(h.result.current.isConfirming).toBe(true);
});

test('confirmation cannot be sent twice while resolving orientation', async () => {
    const h = setup();
    let finish;
    h.commitExplosiveBombUse.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    act(() => h.result.current.begin('hero', bomb));
    act(() => h.result.current.selectResource(resource));
    await lockImpact(h);
    let pending;
    await act(async () => {
        pending = h.result.current.confirm();
        expect(h.result.current.confirm()).toBe(false);
        await Promise.resolve();
    });
    expect(h.commitExplosiveBombUse).toHaveBeenCalledTimes(1);
    expect(h.result.current.isCommitting).toBe(true);
    await act(async () => {
        h.combatRuntime.explosiveBlast = null;
        finish({ ok: true });
        await pending;
    });
    expect(h.result.current.session).toBeNull();
});
