import { act, renderHook } from '@testing-library/react';
import { useCanvasInteractionController } from '../../tactical-shared/useTacticalInteractionController';
import { useCanvasForcedMovement } from '../useCanvasForcedMovement';

test.each([false, true])('a repeated release keeps the master token at its destination while saving (touch=%s)', async touch => {
    const origin = { x: 0, y: 0 };
    const token = { id: 'hero', type: 'token', profileType: 'campaignCharacter', width: 50, height: 50,
        x: 100, y: 50, status: ['derribado'], stats: { movimiento: { current: 0, max: 2 } } };
    const combat = { status: 'active', roundPhase: 'turns', participants: {}, round: 3 };
    let scene = { id: 'scene', items: [token], canvasCombat: combat };
    const ref = { current: scene }, positions = [];
    const setScene = update => {
        scene = typeof update === 'function' ? update(scene) : update;
        ref.current = scene;
        positions.push({ x: scene.items[0].x, y: scene.items[0].y });
    };
    let resolveSave;
    const persist = jest.fn(() => new Promise(resolve => { resolveSave = resolve; }));
    const noop = jest.fn();
    const config = { isInfinite: true, cellWidth: 50, cellHeight: 50, snapToGrid: true };
    const hook = renderHook(() => {
        const forced = useCanvasForcedMovement({ activeScenario: scene, activeScenarioRef: ref,
            activeLayer: 'TABLETOP', isPlayerView: false, gridConfig: config,
            setActiveScenario: setScene, safePersistItems: persist, triggerToast: noop });
        const interaction = useCanvasInteractionController({ activeScenario: scene, activeScenarioRef: ref,
            activeLayer: 'TABLETOP', isBoardMode: false, isPlayerView: false, zoom: 1, gridConfig: config,
            combatRuntime: { forcedMovement: forced }, draggedTokenId: 'hero', selectedTokenIds: ['hero'],
            tokenOriginalPos: { hero: origin }, tokenDragStart: { x: 0, y: 0, identifier: 7 },
            getEventCoords: event => {
                const pointer = event.changedTouches?.[0] || event;
                return { x: pointer.clientX, y: pointer.clientY };
            },
            cardPreviewSuppressTouchEndRef: { current: false }, cardStackQuickActionBlockUntilRef: { current: 0 },
            setActiveScenario: setScene, setDraggedTokenId: noop, setRotatingTokenId: noop,
            setResizingTokenId: noop, setTokenOriginalPos: noop, setDragVisualOrigin: noop,
            setCombatOccupancyFeedback: noop,
        });
        return { forced, interaction };
    });
    act(() => hook.result.current.forced.begin('hero'));
    // The viewport and window listeners can both see the same release before React rerenders.
    const release = hook.result.current.interaction.handleMouseUp;
    const event = touch
        ? { type: 'touchend', changedTouches: [{ identifier: 7, clientX: 150, clientY: 100 }] }
        : { type: 'mouseup', clientX: 150, clientY: 100 };
    let first, duplicate;
    act(() => { first = release(event); duplicate = release(event); });
    await act(async () => { await duplicate; });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(positions).not.toContainEqual(origin);
    expect(scene.items[0]).toMatchObject({ x: 150, y: 100 });
    await act(async () => { resolveSave(true); await first; });
    expect(scene.items[0]).toMatchObject({ x: 150, y: 100, status: token.status, stats: token.stats });
    expect(scene.canvasCombat).toBe(combat);
    await act(async () => { await release(event); });
    expect(persist).toHaveBeenCalledTimes(1);
});
