import React, { useRef, useState } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { canForceMoveToken, getForcedMovementDestination, rebasePendingAfterForcedMovement } from '../../tactical-shared/forcedMovement';
import { useCanvasForcedMovement } from '../useCanvasForcedMovement';
import { ForcedMovementButton } from '../components/CanvasForcedMovement';

const token = { id: 'hero', name: 'Yerma', profileType: 'campaignCharacter', layer: 'TOKEN',
    x: 0, y: 0, width: 50, height: 50, status: ['derribado', 'sangrado'], controlledBy: ['Alvaro'],
    stats: { vida: { current: 10, max: 28 }, movimiento: { current: 0, max: 2 } } };
const config = { isInfinite: true, cellWidth: 50, cellHeight: 50, snapToGrid: true };
const scene = { id: 'scene', rulesSystem: 'campaign', items: [token], canvasCombat: {
    status: 'active', roundPhase: 'turns', activeBlockIndex: 2,
    blocks: [{ actedIds: ['hero'] }, {}, { tokenIds: ['enemy'] }],
    participants: { hero: { movementRuntime: { spent: 2 }, actionDice: [{ id: 'die', status: 'spent', value: 6 }] } },
    pendingAttack: { id: 'attack', attackerId: 'enemy', targetId: 'hero' },
} };
const move = { from: { x: 0, y: 0 }, to: { x: 150, y: 50 } };
function setup(options = {}) {
    const persist = jest.fn(async () => true), toast = jest.fn();
    const hook = renderHook(props => {
        const [current, setCurrent] = useState(scene);
        const ref = useRef(current); ref.current = current;
        const controller = useCanvasForcedMovement({ activeScenario: current, activeScenarioRef: ref,
            activeLayer: 'TABLETOP', isPlayerView: false, gridConfig: config,
            safePersistItems: persist, triggerToast: toast, setActiveScenario: setCurrent, ...props });
        return { controller, current, setCurrent };
    }, { initialProps: options });
    return { ...hook, persist, toast };
}

test.each(['campaignCharacter', 'campaignNpc', 'rogueliteEnemy', 'rogueliteClass'])('master can drag a prone %s with zero mobility without changing combat', async profileType => {
    const h = setup();
    act(() => h.result.current.setCurrent({ ...scene, items: [{ ...token, profileType }] }));
    act(() => expect(h.result.current.controller.begin('hero')).toBe(true));
    await act(async () => expect(await h.result.current.controller.commitDrag('hero', move)).toBe(true));
    expect(h.result.current.current.items[0]).toMatchObject({ x: 150, y: 50, status: token.status, stats: token.stats });
    expect(h.result.current.current.canvasCombat).toBe(scene.canvasCombat);
    expect(h.persist).toHaveBeenCalledWith('scene', expect.any(Array), expect.any(Array), ['hero'], { persistRuntime: false });
    expect(h.toast).not.toHaveBeenCalled();
    expect(h.result.current.controller.isActive('hero')).toBe(true);
});

test('players cannot enable or commit, including when the role changes during a drag', async () => {
    const h = setup({ isPlayerView: true });
    act(() => expect(h.result.current.controller.begin('hero')).toBe(false));
    h.rerender({ isPlayerView: false });
    act(() => h.result.current.controller.begin('hero'));
    h.rerender({ isPlayerView: true });
    await act(async () => expect(await h.result.current.controller.commitDrag('hero', move)).toBe(false));
    expect(h.persist).not.toHaveBeenCalled();
    expect(h.result.current.controller.session).toBeNull();
});

test('the mode stays on for repeated drags and does not apply to another token', async () => {
    const h = setup();
    act(() => h.result.current.controller.begin('hero'));
    expect(h.result.current.controller.isActive('other')).toBe(false);
    await act(async () => h.result.current.controller.commitDrag('hero', move));
    await act(async () => h.result.current.controller.commitDrag('hero', { from: move.to, to: { x: 250, y: 50 } }));
    expect(h.persist).toHaveBeenCalledTimes(2);
    expect(h.result.current.current.items[0]).toMatchObject({ x: 250, y: 50 });
    act(() => h.result.current.controller.cancel());
    await act(async () => expect(await h.result.current.controller.commitDrag('hero', move)).toBe(false));
    expect(h.persist).toHaveBeenCalledTimes(2);
});

test('walls and occupied destinations remain blocked', async () => {
    const wall = { id: 'wall', type: 'wall', x1: 100, y1: -50, x2: 100, y2: 200 };
    const h = setup();
    act(() => h.result.current.setCurrent({ ...scene, items: [token, wall] }));
    act(() => h.result.current.controller.begin('hero'));
    await act(async () => expect(await h.result.current.controller.commitDrag('hero', move)).toBe(false));
    expect(h.persist).not.toHaveBeenCalled();
    expect(h.result.current.controller.isActive('hero')).toBe(true);
    const occupied = getForcedMovementDestination({ token, point: { x: 175, y: 75 },
        items: [token, { ...token, id: 'other', x: 150, y: 50 }], config });
    expect(occupied.valid).toBe(false);
    expect(canForceMoveToken(wall)).toBe(false);
});

test('failed persistence restores the position without restoring stale resources', async () => {
    const h = setup();
    h.persist.mockImplementation(async () => {
        h.result.current.setCurrent(current => ({ ...current, items: current.items.map(item => ({ ...item, name: 'Nombre nuevo' })) }));
        return false;
    });
    act(() => h.result.current.controller.begin('hero'));
    await act(async () => h.result.current.controller.commitDrag('hero', move));
    expect(h.result.current.current.items[0]).toMatchObject({ x: 0, y: 0, name: 'Nombre nuevo' });
    expect(h.result.current.current.canvasCombat).toBe(scene.canvasCombat);
    expect(h.toast).toHaveBeenCalledWith('No se pudo desplazar', expect.any(String), 'error');
});

test('an external forced move only rebases unconfirmed movement, retaining pending actions', () => {
    const pending = { tokenId: 'hero', startX: 0, startY: 0, x: 50, y: 0, moveCost: 1, actionCost: 2, actions: ['attack'] };
    const remote = { ...token, x: 150, y: 50, forcedMovement: { id: 'move' } };
    expect(rebasePendingAfterForcedMovement(pending, remote, token)).toEqual({ ...pending, startX: 150, startY: 50, x: 150, y: 50, moveCost: 0 });
    expect(rebasePendingAfterForcedMovement(pending, remote, remote)).toBe(pending);
});

test('one compact icon toggles the mode without adding visible text or controls', () => {
    const h = setup();
    const { rerender } = render(<ForcedMovementButton controller={h.result.current.controller} token={token} />);
    const button = screen.getByRole('button', { name: /Desplazamiento sin coste/ });
    expect(button).toHaveTextContent('');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    rerender(<ForcedMovementButton controller={h.result.current.controller} token={token} />);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(h.result.current.controller.isActive('hero')).toBe(false);
    h.rerender({ isPlayerView: true });
    rerender(<ForcedMovementButton controller={h.result.current.controller} token={token} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
