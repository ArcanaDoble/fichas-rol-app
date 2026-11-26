import { act, renderHook } from '@testing-library/react';
import { createCanvasTokenController } from '../createTacticalTokenController';
import { useCanvasInteractionController } from '../useTacticalInteractionController';
import { buildScenarioItemChanges, mergeScenarioItemsForPersist, reconcileScenarioItemSnapshot } from '../../../utils/scenarioSync';

const wall = { id: 'wall', type: 'wall', layer: 'LIGHTING', x: 100, y: 100, x1: 100, y1: 100, x2: 200, y2: 100,
    width: 100, height: 5, snapToGrid: true, wallType: 'solid' };
const event = (x, y, touch = false) => touch
    ? { type: 'touchend', changedTouches: [{ identifier: 7, clientX: x, clientY: y }], stopPropagation() {} }
    : { type: 'mousedown', button: 0, clientX: x, clientY: y, stopPropagation() {} };

function setup(items = [wall], { touch = false, zoom = 2 } = {}) {
    let scene = { id: 'scene', items };
    let remoteItems = items;
    let original = {}, dragged = null, start = {};
    const sceneRef = { current: scene }, recent = { current: {} }, selected = items.map(item => item.id);
    const noop = jest.fn();
    const persist = jest.fn((id, final, before, ids) => {
        const changes = buildScenarioItemChanges(final, before, ids);
        remoteItems = mergeScenarioItemsForPersist(remoteItems, changes.modifiedOrAdded, changes.deletedIds, before);
        return true;
    });
    const props = () => ({ activeScenario: scene, activeScenarioRef: sceneRef, activeLayer: 'LIGHTING',
        isBoardMode: false, isPlayerView: false, currentDieRollSpeed: 0, resetDieLaunchFeedback: noop,
        gridConfig: { isInfinite: true, cellWidth: 50, cellHeight: 50, snapToGrid: true }, zoom,
        draggedTokenId: dragged, selectedTokenIds: selected, selectedTokenIdsRef: { current: selected }, tokenOriginalPos: original,
        tokenOriginalPosRef: { current: original }, tokenDragStart: start,
        getEventCoords: e => { const pointer = e.changedTouches?.[0] || e.touches?.[0] || e; return { x: pointer.clientX, y: pointer.clientY }; },
        setActiveScenario: update => { scene = typeof update === 'function' ? update(scene) : update; sceneRef.current = scene; },
        setDraggedTokenId: value => { dragged = value; }, setTokenOriginalPos: value => { original = value; },
        setTokenDragStart: value => { start = value; }, setSelectedTokenIds: noop, setDragVisualOrigin: noop,
        setCombatOccupancyFeedback: noop, setRotatingTokenId: noop, setResizingTokenId: noop, setPendingTurnState: noop,
        setDraggingWallHandle: noop, setIsDragging: noop, safePersistItems: persist, recentLocalWritesRef: recent,
        cardPreviewSuppressTouchEndRef: { current: false }, cardStackQuickActionBlockUntilRef: { current: 0 },
        boardCardHandTransferRef: { current: null }, lastTouchTokenInteractionRef: { current: {} },
        clearBoardHandHoverSuppression: noop, pendingTurnStateRef: { current: null }, triggerToast: noop,
    });
    const hook = renderHook(useCanvasInteractionController, { initialProps: props() });
    return {
        start() {
            const controller = createCanvasTokenController({ ...props(), getItemInteractionSnapshot: hook.result.current.getItemInteractionSnapshot });
            const down = touch ? { ...event(300, 300, true), type: 'touchstart', touches: [{ identifier: 7, clientX: 300, clientY: 300 }] } : event(300, 300);
            act(() => controller.handleTokenMouseDown(down, scene.items[0]));
            hook.rerender(props());
        },
        move(x, y) { act(() => hook.result.current.handleMouseMove(event(x, y, touch))); hook.rerender(props()); },
        async release(x, y) { await act(async () => hook.result.current.handleMouseUp(event(x, y, touch))); hook.rerender(props()); },
        get local() { return scene.items; }, get remote() { return remoteItems; }, persist,
    };
}

test.each([false, true])('a whole wall drag persists its actual line across server synchronization (touch=%s)', async touch => {
    const drag = setup([wall], { touch });
    drag.start();
    drag.move(300, 400);
    expect(drag.local[0]).toMatchObject({ x: 100, y: 150, x1: 100, y1: 150, x2: 200, y2: 150 });
    await drag.release(300, 400);
    expect(drag.remote[0]).toMatchObject({ x: 100, y: 150, x1: 100, y1: 150, x2: 200, y2: 150 });
    const reloaded = reconcileScenarioItemSnapshot(drag.remote[0], drag.local[0], { now: Date.now() + 20000 });
    expect(reloaded.item).toEqual(drag.local[0]);
});

test('release uses the final pointer position even if the last move event has not rendered', async () => {
    const drag = setup();
    drag.start();
    drag.move(300, 400);
    await drag.release(400, 500);
    expect(drag.remote[0]).toMatchObject({ x: 150, y: 200, x1: 150, y1: 200, x2: 250, y2: 200 });
});

test('release can move a wall without an intermediate move event', async () => {
    const drag = setup();
    drag.start();
    await drag.release(300, 500);
    expect(drag.remote[0]).toMatchObject({ y: 200, y1: 200, y2: 200 });
});

test('moving selected reversed and diagonal walls preserves their shape and endpoint ordering', async () => {
    const diagonal = { ...wall, id: 'diagonal', x1: 200, y1: 200, x2: 100, y2: 100, height: 100 };
    const drag = setup([wall, diagonal]);
    drag.start();
    drag.move(400, 400);
    await drag.release(400, 400);
    expect(drag.remote[0]).toMatchObject({ x1: 150, y1: 150, x2: 250, y2: 150 });
    expect(drag.remote[1]).toMatchObject({ x: 150, y: 150, x1: 250, y1: 250, x2: 150, y2: 150, width: 100, height: 100 });
});

test('returning to the start before releasing does not save an intermediate wall position', async () => {
    const drag = setup();
    drag.start();
    drag.move(300, 400);
    await drag.release(300, 300);
    expect(drag.local[0]).toEqual(wall);
    expect(drag.persist).not.toHaveBeenCalled();
});

test('moving a wall affected by the old bug realigns its saved bounds with the visible line', async () => {
    const drag = setup([{ ...wall, x: 250, y: 300 }]);
    drag.start();
    drag.move(300, 400);
    await drag.release(300, 400);
    expect(drag.remote[0]).toMatchObject({ x: 100, y: 150, x1: 100, y1: 150, x2: 200, y2: 150 });
});
