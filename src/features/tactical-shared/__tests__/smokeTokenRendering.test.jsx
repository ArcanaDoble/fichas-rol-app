import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { createSceneItemRenderer } from '../components/createSceneItemRenderer';
import { getCanvasCommittedVisionItems } from '../tokenVisibilityAccess';

jest.mock('framer-motion', () => ({
    useReducedMotion: () => false,
    motion: { div: ({ children, initial, animate, transition, ...props }) => <div {...props}>{children}</div> },
}));
jest.mock('../components/FogShaderEffect', () => ({
    __esModule: true,
    default: ({ density, maskSource }) => <canvas data-testid="fog" data-density={density} data-mask={String(maskSource)} />,
}));
jest.mock('../components/TacticalAssetImage', () => ({
    TokenImageWithLoader: ({ imageStyle, label }) => <img alt={label} style={imageStyle} />,
    CardImageWithLoader: () => null,
}));
jest.mock('../../../components/TokenHUD', () => ({ smokeVeil = 0 }) => <div data-testid="token-life" data-smoke-veil={smokeVeil} />);
jest.mock('../components/TokenInventoryReceipt', () => () => null);

const smoke = { id: 'smoke', type: 'geometry', geometryKind: 'smoke', x: 100, y: 0, width: 100, height: 100 };
const enemy = { id: 'enemy', name: 'Enemy', type: 'token', x: 110, y: 10, width: 30, height: 30, isCircular: true, img: '/enemy.png', controlledBy: [], hasVision: true };
const playerToken = { ...enemy, id: 'player', name: 'Player', controlledBy: ['Ada'] };

const setup = (item, overrides = {}) => {
    const handleTokenMouseDown = jest.fn();
    const renderer = createSceneItemRenderer({
        activeScenario: { items: [item, smoke] }, activeLayer: 'TOKENS',
        isPlayerView: false, isBoardMode: false, playerName: 'Ada', selectedTokenIds: [item.id],
        showHiddenTokens: true, gridConfig: { cellWidth: 50, cellHeight: 50 }, zoom: 1,
        boardCardHandTransferRef: { current: null }, tokenOriginalPos: {}, dragVisualOrigin: {},
        isUsablePendingTurnState: () => false, handleTokenMouseDown,
        lastSelectedIdRef: { current: null }, lastTokenTapTimesRef: { current: {} },
        ...overrides,
    });
    return { ...render(renderer(item)), handleTokenMouseDown };
};

test.each([enemy, playerToken])('master can grab $name inside smoke even with Mostrar ocultos enabled', item => {
    const { container, handleTokenMouseDown } = setup(item);
    const node = container.querySelector(`[data-board-item-id="${item.id}"]`);
    expect(node.style.pointerEvents).toBe('auto');
    fireEvent.mouseDown(node, { button: 0 });
    expect(handleTokenMouseDown).toHaveBeenCalledWith(expect.anything(), item);
    fireEvent.touchStart(node);
    expect(handleTokenMouseDown).toHaveBeenCalledTimes(2);
});

test('focused smoke residents show clear portraits and subtle fog without image transition or circular mask loading', () => {
    const { getByAltText, getAllByTestId, getByTestId } = setup(enemy);
    expect(getByAltText('Enemy').style.filter).toBe('');
    expect(getByAltText('Enemy').style.opacity).toBe('');
    expect(getByAltText('Enemy').style.transition).toBe('none');
    expect(getByTestId('fog')).toHaveAttribute('data-density', '0.2');
    expect(getByTestId('fog')).toHaveAttribute('data-mask', 'false');
    expect(getAllByTestId('token-life')[0]).toHaveAttribute('data-smoke-veil', '0.2');
});

test('partial smoke overlap does not fog or dim the whole large portrait or its Life crown', () => {
    const partial = { ...enemy, id: 'partial', name: 'Partial', x: 100, y: -50, width: 100, height: 100 };
    const { queryByTestId, getByAltText, getByTestId } = setup(partial);
    expect(queryByTestId('fog')).toBeNull();
    expect(getByAltText('Partial').style.filter).toBe('');
    expect(getByAltText('Partial').style.opacity).toBe('');
    expect(getByTestId('token-life')).toHaveAttribute('data-smoke-veil', '0');
});

test('genuinely hidden master inspection ghosts remain passive', () => {
    const { container, handleTokenMouseDown } = setup(playerToken, { selectedTokenIds: [] });
    const node = container.querySelector('[data-board-item-id="player"]');
    expect(node.style.pointerEvents).toBe('none');
    fireEvent.mouseDown(node, { button: 0 });
    expect(handleTokenMouseDown).not.toHaveBeenCalled();
});

test('player control remains usable inside smoke', () => {
    const { container, handleTokenMouseDown } = setup(playerToken, { isPlayerView: true, showHiddenTokens: false });
    fireEvent.mouseDown(container.querySelector('[data-board-item-id="player"]'), { button: 0 });
    expect(handleTokenMouseDown).toHaveBeenCalledTimes(1);
});

test.each([false, true])('drag preview preserves the old smoke perspective while the player portrait moves (board: %s)', isBoardMode => {
    const preview = { ...playerToken, x: 210 };
    const outside = { ...enemy, x: 250 };
    const scene = [preview, outside, smoke];
    const visionItems = getCanvasCommittedVisionItems(scene, {
        draggedTokenId: 'player', tokenOriginalPos: { player: { x: 110, y: 10 } }, isPlayerView: true,
    });
    const renderer = createSceneItemRenderer({
        activeScenario: { items: scene }, visionItems, activeLayer: 'TOKENS',
        isPlayerView: true, isBoardMode, playerName: 'Ada', selectedTokenIds: ['player'],
        showHiddenTokens: false, gridConfig: { cellWidth: 50, cellHeight: 50 }, zoom: 1,
        boardCardHandTransferRef: { current: null }, tokenOriginalPos: { player: { x: 110, y: 10 } },
        dragVisualOrigin: {}, isUsablePendingTurnState: () => false,
        lastSelectedIdRef: { current: null }, lastTokenTapTimesRef: { current: {} },
    });
    const { container } = render(<>{scene.map(item => <React.Fragment key={item.id}>{renderer(item)}</React.Fragment>)}</>);
    expect(container.querySelector('[data-board-item-id="player"]')).toBeInTheDocument();
    expect(container.querySelector('[data-board-item-id="enemy"]')).toBeNull();
});


const tar = { ...smoke, id: 'tar', geometryKind: 'tar' };

test('board player cannot see an enemy through smoke, even with fog of war disabled', () => {
    const outside = { ...playerToken, x: 10 };
    const { container } = setup(enemy, { isBoardMode: true, isPlayerView: true,
        showHiddenTokens: false, selectedTokenIds: [outside.id], activeScenario: { items: [outside, enemy, smoke] },
        gridConfig: { cellWidth: 50, cellHeight: 50, fogOfWar: false } });
    expect(container.querySelector('[data-board-item-id="enemy"]')).toBeNull();
});

test('board residents keep both crowns veiled and tar stains beneath the smoke', () => {
    const { container, getByTestId } = setup(playerToken, { isBoardMode: true, isPlayerView: true,
        showHiddenTokens: false, activeScenario: { items: [playerToken, tar, smoke] } });
    expect(container.querySelector('[data-board-item-id="player"]')).not.toBeNull();
    expect(Number(container.querySelector('.canvas-token-tar').style.opacity)).toBeGreaterThan(0);
    expect(getByTestId('fog')).toHaveAttribute('data-density', '0.2');
    expect(getByTestId('token-life')).toHaveAttribute('data-smoke-veil', '0.2');
});

test('board large tokens only partly covered by smoke retain their clear portrait', () => {
    const partial = { ...playerToken, x: 80, width: 50 };
    const { queryByTestId, getByTestId } = setup(partial, { isBoardMode: true });
    expect(queryByTestId('fog')).toBeNull();
    expect(getByTestId('token-life')).toHaveAttribute('data-smoke-veil', '0');
});

test.each([false, true])('board hides explicit Oculto from players even with master inspection flag set: %s', showHiddenTokens => {
    const concealed = { ...enemy, status: ['oculto'] };
    const { container } = setup(concealed, { isBoardMode: true, isPlayerView: true, showHiddenTokens,
        activeScenario: { items: [concealed, { ...playerToken, x: 0 }] }, selectedTokenIds: ['player'] });
    expect(container).toBeEmptyDOMElement();
});

test('board owner retains control and fog feedback when explicitly hidden outside smoke', () => {
    const concealed = { ...playerToken, status: ['oculto'] };
    const { container, getByTestId, handleTokenMouseDown } = setup(concealed, { isBoardMode: true,
        isPlayerView: true, activeScenario: { items: [concealed] } });
    expect(getByTestId('fog')).toHaveAttribute('data-density', '0.65');
    expect(getByTestId('token-life')).toBeInTheDocument();
    fireEvent.touchStart(container.querySelector('[data-board-item-id="player"]'));
    expect(handleTokenMouseDown).toHaveBeenCalledTimes(1);
});

test('board ally can see a hidden teammate without gaining control or private resources', () => {
    const ally = { ...enemy, id: 'ally', controlledBy: ['Bruno'], teamId: 'party', status: ['oculto'] };
    const owner = { ...playerToken, teamId: 'party', x: 0 };
    const { container, getByTestId, queryByTestId } = setup(ally, { isBoardMode: true, isPlayerView: true,
        activeScenario: { items: [ally, owner] }, selectedTokenIds: ['player'] });
    expect(container.querySelector('[data-board-item-id="ally"]')).toBeInTheDocument();
    expect(getByTestId('fog')).toHaveAttribute('data-density', '0.65');
    expect(queryByTestId('token-life')).toBeNull();
});

test.each([false, true])('board master inspection of a player hidden token is passive: %s', showHiddenTokens => {
    const concealed = { ...playerToken, status: ['oculto'] };
    const { container, handleTokenMouseDown } = setup(concealed, { isBoardMode: true, showHiddenTokens,
        activeScenario: { items: [concealed] }, selectedTokenIds: [] });
    if (!showHiddenTokens) expect(container).toBeEmptyDOMElement();
    else {
        const node = container.querySelector('[data-board-item-id="player"]');
        expect(node.style.pointerEvents).toBe('none');
        fireEvent.mouseDown(node, { button: 0 });
        expect(handleTokenMouseDown).not.toHaveBeenCalled();
    }
    expect(concealed.status).toEqual(['oculto']);
});
test.each([[tar, smoke], [smoke, tar]])('tar stays above smoke regardless of creation order: %j', (first, second) => {
    const items = [first, second];
    for (const item of items) {
        const { container, unmount } = setup(item, { activeScenario: { items }, draggedTokenId: item.id });
        expect(container.querySelector(`[data-board-item-id="${item.id}"]`).style.zIndex)
            .toBe(item.geometryKind === 'smoke' ? '15' : '16');
        unmount();
    }
});

test('a token in overlapping smoke and tar retains stains underneath the smoke veil', () => {
    const { container, getByTestId } = setup(playerToken, { activeScenario: { items: [playerToken, tar, smoke] } });
    expect(container.querySelector('.canvas-token-tar')).not.toBeNull();
    expect(Number(container.querySelector('.canvas-token-tar').style.opacity)).toBeGreaterThan(0);
    expect(getByTestId('fog').parentElement.className).toContain('z-20');
    expect(getByTestId('token-life')).toHaveAttribute('data-smoke-veil', '0.2');
});
