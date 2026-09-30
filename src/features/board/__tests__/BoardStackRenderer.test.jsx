import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { createSceneItemRenderer } from '../../tactical-shared/components/createSceneItemRenderer';
import { TokenInspectorPanel } from '../../tactical-shared/components/sidebar/TokenInspectorPanel';

jest.mock('framer-motion', () => ({ motion: { div: ({ children, initial, animate, transition, ...props }) => <div {...props}>{children}</div> } }));
jest.mock('../../tactical-shared/components/TacticalAssetImage', () => ({
    CardImageWithLoader: ({ src, label }) => <img src={src} alt={label} />,
    TokenImageWithLoader: () => null,
}));
const parent = { id: 'top', type: 'card', zone: 'board', name: 'Aliado secreto', frontImage: '/secret-ally.png',
    x: 100, y: 100, width: 100, height: 140, stackKey: 'pile', stackIds: ['child'], hideStackContentsForPlayers: true,
    faceDown: true, ownerName: 'Master' };
const child = { ...parent, id: 'child', name: 'Enemigo secreto', frontImage: '/secret-enemy.png', stackParentId: 'top', stackIds: [], stackKey: null };
const setup = (isPlayerView) => {
    const openBoardCardMenu = jest.fn();
    const updateItem = jest.fn();
    const handleTokenMouseDown = jest.fn();
    const renderer = createSceneItemRenderer({
        activeScenario: { items: [parent, child] }, activeLayer: 'TABLETOP', isBoardMode: true, isPlayerView,
        playerName: 'Ada', currentUserId: 'ada', selectedTokenIds: ['top'], gridConfig: { cellWidth: 50, cellHeight: 50 }, zoom: 1,
        boardCardHandTransferRef: { current: null }, tokenOriginalPos: {}, dragVisualOrigin: {},
        isUsablePendingTurnState: () => false, lastSelectedIdRef: { current: null }, lastTokenTapTimesRef: { current: {} },
        lastFlipTimesRef: { current: {} }, openBoardCardMenu, updateItem, handleTokenMouseDown,
    });
    return { openBoardCardMenu, updateItem, handleTokenMouseDown, ...render(<>{renderer(parent)}{renderer(child)}</>) };
};

test('right click opens card actions and leaves the old movement and flip button available', () => {
    const { container, openBoardCardMenu, updateItem, handleTokenMouseDown, getByTitle } = setup(false);
    const node = container.querySelector('[data-board-item-id="top"]');
    fireEvent.contextMenu(node, { clientX: 120, clientY: 150 });
    expect(openBoardCardMenu).toHaveBeenCalledWith(parent, expect.anything());
    expect(updateItem).not.toHaveBeenCalled();
    fireEvent.mouseDown(node, { button: 0 });
    expect(handleTokenMouseDown).toHaveBeenCalledWith(expect.anything(), parent);
    fireEvent.mouseDown(getByTitle('Voltear carta'));
    expect(updateItem).toHaveBeenCalledWith('top', { faceDown: false }, true);
});

test('player sees only a usable pile back and can open actions by touch button', () => {
    const { container, getByRole, queryByTitle, openBoardCardMenu } = setup(true);
    expect(container.querySelector('[data-board-item-id="top"]').style.pointerEvents).toBe('auto');
    expect(container.querySelector('[data-board-item-id="child"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/secret-ally|secret-enemy|Aliado secreto|Enemigo secreto/);
    expect(queryByTitle('Voltear carta')).toBeNull();
    fireEvent.click(getByRole('button', { name: 'Acciones de cartas' }));
    expect(openBoardCardMenu).toHaveBeenCalled();
});

test('right mouse down on a card does not start a table drag', () => {
    const backgroundDown = jest.fn();
    const { container, handleTokenMouseDown } = setup(false);
    document.body.addEventListener('mousedown', backgroundDown);
    fireEvent.mouseDown(container.querySelector('[data-board-item-id="top"]'), { button: 2 });
    document.body.removeEventListener('mousedown', backgroundDown);
    expect(handleTokenMouseDown).not.toHaveBeenCalled();
    expect(backgroundDown).not.toHaveBeenCalled();
});

test('player inspector does not expose pile identities or offer edits', () => {
    const { container, getByText, queryByRole } = render(<TokenInspectorPanel
        activeTab="INSPECTOR" selectedTokenIds={['top']} activeScenario={{ items: [parent, child] }}
        isBoardMode isPlayerView />);
    expect(getByText('Montón boca abajo')).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/secret-ally|secret-enemy|Aliado secreto|Enemigo secreto/);
    expect(queryByRole('textbox')).toBeNull();
});
