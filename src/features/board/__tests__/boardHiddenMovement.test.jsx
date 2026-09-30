import { act, renderHook } from '@testing-library/react';
import { createCanvasTokenController } from '../../tactical-shared/createTacticalTokenController';
import { useCanvasInteractionController } from '../../tactical-shared/useTacticalInteractionController';

const gridConfig = { cellWidth: 50, cellHeight: 50, offsetX: 0, offsetY: 0, isInfinite: true };
const mover = { id: 'hero', type: 'token', x: 0, y: 0, width: 25, height: 25, controlledBy: ['Ada'], teamId: 'heroes', status: [], stats: { vida: { current: 5, max: 5 } } };
const hidden = { ...mover, id: 'enemy', x: 50, controlledBy: [], teamId: 'enemies', status: ['oculto', 'envenenado'] };
const setters = Object.fromEntries([
    'setSelectedTokenIds', 'setActiveBoardHandTokenId', 'setMobileMoveHoverCellKey', 'setIsDragging',
    'setDraggedTokenId', 'setRotatingTokenId', 'setResizingTokenId', 'setTokenOriginalPos', 'setDragVisualOrigin',
    'setCombatOccupancyFeedback', 'setPendingTurnState',
].map(name => [name, jest.fn()]));

test.each([false, true])('mobile reveals first contact and saves every affected token (blocked: %s)', blocked => {
    const enemy = { ...hidden, ...(blocked ? { width: 50, height: 50 } : {}) };
    let scene = { id: 'board', items: [mover, enemy] };
    const persist = jest.fn();
    const controller = createCanvasTokenController({ ...setters, activeScenario: scene, activeScenarioRef: { current: scene },
        isBoardMode: true, isMobile: true, activeLayer: 'TABLETOP', isPlayerView: true, playerName: 'Ada', gridConfig,
        setActiveScenario: update => { scene = update(scene); }, safePersistItems: persist,
        lastSelectedIdRef: { current: null }, triggerToast: jest.fn() });
    // Previews must not expose a hidden occupant by suppressing a destination.
    const options = controller.getBoardMobileTacticalMoveOptions(mover, scene.items);
    expect(options.some(option => option.cell.x === 1 && option.cell.y === 0)).toBe(true);
    controller.handleBoardMobileTacticalMoveCell({}, 'hero', { x: 2, y: 0 });
    expect(scene.items.find(item => item.id === 'enemy').status).toEqual(['envenenado']);
    expect(scene.items.find(item => item.id === 'hero').x).toBe(blocked ? 0 : 62.5);
    expect(persist).toHaveBeenCalledWith('board', scene.items, [mover, enemy], ['hero', 'enemy']);
});

test('desktop drag detects contact before the destination and persists the revealed status', async () => {
    let scene = { id: 'board', items: [{ ...mover, x: 100 }, hidden] };
    const persist = jest.fn();
    const { result } = renderHook(() => useCanvasInteractionController({ ...setters,
        activeScenario: scene, activeScenarioRef: { current: scene }, isBoardMode: true, isPlayerView: true,
        playerName: 'Ada', activeLayer: 'TABLETOP', gridConfig, draggedTokenId: 'hero', selectedTokenIds: ['hero'],
        selectedTokenIdsRef: { current: ['hero'] }, tokenOriginalPos: { hero: { x: 0, y: 0 } },
        tokenDragStart: { x: 0, y: 0 }, getEventCoords: () => ({ x: 100, y: 0 }), zoom: 1,
        setActiveScenario: update => { scene = update(scene); }, safePersistItems: persist,
        recentLocalWritesRef: { current: {} }, triggerToast: jest.fn(),
        cardPreviewSuppressTouchEndRef: { current: false }, cardStackQuickActionBlockUntilRef: { current: 0 },
    }));
    await act(async () => result.current.handleMouseUp({}));
    expect(scene.items.find(item => item.id === 'hero').x).toBe(62.5);
    expect(scene.items.find(item => item.id === 'enemy').status).toEqual(['envenenado']);
    expect(persist.mock.calls.some(([, items, , ids]) => ids.includes('enemy')
        && !items.find(item => item.id === 'enemy').status.includes('oculto'))).toBe(true);
});
