import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createSceneItemRenderer } from '../components/createSceneItemRenderer';

jest.mock('framer-motion', () => ({
    motion: { div: ({ children, initial, animate, transition, ...props }) => <div {...props}>{children}</div> },
    useReducedMotion: () => false,
}));
jest.mock('../components/FogShaderEffect', () => () => null);
jest.mock('../components/TacticalAssetImage', () => ({
    TokenImageWithLoader: ({ label }) => <img alt={label} />,
    CardImageWithLoader: () => null,
}));
jest.mock('../components/TokenInventoryReceipt', () => () => null);

const enemy = {
    id: 'enemy', name: 'Duende', type: 'token', profileType: 'rogueliteEnemy',
    x: 110, y: 10, width: 30, height: 30, isCircular: true, img: '/enemy.png',
    controlledBy: [], hasVision: true, stats: { vida: { current: 3, max: 7 } },
};

const setup = (item = enemy, overrides = {}) => {
    const handleTokenMouseDown = jest.fn();
    const renderer = createSceneItemRenderer({
        activeScenario: { items: [item] }, activeLayer: 'TOKENS',
        isPlayerView: true, isBoardMode: false, playerName: 'Ada', selectedTokenIds: [],
        allowPlayerTokenHoverInspection: true,
        gridConfig: { cellWidth: 50, cellHeight: 50 }, zoom: 1,
        boardCardHandTransferRef: { current: null }, tokenOriginalPos: {}, dragVisualOrigin: {},
        isUsablePendingTurnState: () => false, handleTokenMouseDown,
        lastSelectedIdRef: { current: null }, lastTokenTapTimesRef: { current: {} },
        ...overrides,
    });
    return { ...render(renderer(item)), handleTokenMouseDown };
};

test('passive inspection of an unowned enemy exposes only its name, without granting control', () => {
    const { container, handleTokenMouseDown } = setup();
    const token = container.querySelector('[data-board-item-id="enemy"]');
    expect(token.style.pointerEvents).toBe('auto');
    expect(screen.getByText('Duende')).toHaveClass('noma-token-life-name');
    expect(container.querySelectorAll('.noma-token-life-readout')).toHaveLength(1);
    expect(container.querySelector('.noma-token-name-only')).toHaveAttribute('data-selected', 'false');
    expect(container.querySelector('[data-life-block]')).not.toBeInTheDocument();
    expect(container.querySelector('.noma-token-life-count')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Vida:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    fireEvent.mouseDown(token, { button: 0 });
    fireEvent.touchStart(token);
    expect(handleTokenMouseDown).not.toHaveBeenCalled();
});

test('targeting can select an enemy without revealing its private Life or edit controls', () => {
    const { container, handleTokenMouseDown } = setup(enemy, { targetingState: { phase: 'targeting' } });
    const token = container.querySelector('[data-board-item-id="enemy"]');
    fireEvent.mouseDown(token, { button: 0 });
    expect(handleTokenMouseDown).toHaveBeenCalledWith(expect.anything(), enemy);
    expect(container.querySelector('.noma-token-name-only')).toBeInTheDocument();
    expect(container.querySelector('[data-life-block]')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Vida:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test.each([
    ['owner', { controlledBy: ['Ada'] }, {}],
    ['master', {}, { isPlayerView: false }],
])('%s retains the approved Life crown, one name and editing controls', (_, itemOverrides, viewerOverrides) => {
    const { container } = setup({ ...enemy, ...itemOverrides }, { selectedTokenIds: ['enemy'], ...viewerOverrides });
    expect(screen.getByLabelText('Duende · Vida: 3 de 7')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-life-block]')).toHaveLength(7);
    expect(container.querySelectorAll('.noma-token-life-name')).toHaveLength(1);
    expect(container.querySelector('.noma-token-name-only')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar token' })).toBeInTheDocument();
});

test('hidden enemies do not mount a name or private resources', () => {
    const { container } = setup({ ...enemy, status: ['oculto'] });
    expect(container).toBeEmptyDOMElement();
});

test('a long enemy name is preserved at distant zoom without requiring visible Life data', () => {
    const name = 'Gran custodio de las ruinas del antiguo reino del norte';
    const { container } = setup({ ...enemy, name, stats: undefined, rotation: 90 }, { zoom: .25 });
    expect(screen.getByText(name)).toHaveClass('noma-token-life-name');
    const label = container.querySelector('.noma-token-name-only');
    expect(label).toHaveAttribute('aria-label', name);
    expect(label.style.transform).toBe('rotate(-90deg)');
    expect(label.querySelector('.noma-token-life-readout').style.transform).toBe('translateX(-50%) scale(4)');
    expect(label.textContent).toBe(name);
    expect(label.querySelector('[data-life-block]')).not.toBeInTheDocument();
});
