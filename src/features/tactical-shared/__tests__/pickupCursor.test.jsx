import { act, renderHook } from '@testing-library/react';
import { useCanvasInteractionController } from '../useTacticalInteractionController';

test.each([false, true])('preview and release use the same world cursor (touch=%s)', async touch => {
    const loot = { id: 'loot', sceneItemKind: 'canvasLoot', x: 0, y: 0, width: 30, height: 30, snapToGrid: false };
    const scene = { id: 'scene', items: [loot] };
    const handleModeItemDrop = jest.fn(() => true);
    const noop = jest.fn();
    const { result } = renderHook(() => useCanvasInteractionController({
        activeScenario: scene, activeScenarioRef: { current: scene },
        draggedTokenId: 'loot', selectedTokenIds: ['loot'], tokenOriginalPos: { loot },
        tokenDragStart: { x: 100, y: 100, identifier: touch ? 7 : null },
        gridConfig: {}, zoom: 2, currentDieRollSpeed: 0,
        divToWorld: (x, y) => ({ x: (x - 20) / 2, y: (y - 40) / 2 }),
        getEventCoords: e => {
            const source = e.changedTouches?.[0] || e;
            return { x: source.clientX, y: source.clientY };
        },
        isScenePickupItem: item => item?.sceneItemKind === 'canvasLoot',
        handleModeItemDrop,
        cardPreviewSuppressTouchEndRef: { current: false }, cardStackQuickActionBlockUntilRef: { current: 0 },
        setActiveScenario: noop, setCombatOccupancyFeedback: noop, setDraggedTokenId: noop,
        setRotatingTokenId: noop, setResizingTokenId: noop, setTokenOriginalPos: noop, setDragVisualOrigin: noop,
    }));
    const event = touch ? { changedTouches: [{ identifier: 7, clientX: 140, clientY: 180 }] } : { clientX: 140, clientY: 180 };
    act(() => result.current.handleMouseMove(event));
    expect(result.current.pickupPointer).toEqual({ itemId: 'loot', worldPoint: { x: 60, y: 70 } });
    await act(async () => result.current.handleMouseUp(event));
    expect(handleModeItemDrop).toHaveBeenCalledWith(expect.objectContaining({ worldPoint: { x: 60, y: 70 }, draggedItemId: 'loot' }));
    expect(result.current.pickupPointer).toBeNull();
});
