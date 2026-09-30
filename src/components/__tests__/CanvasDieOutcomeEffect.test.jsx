import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useReducedMotion } from 'framer-motion';
import CanvasDieOutcomeEffect, { getCanvasDieOutcomeOffset } from '../CanvasDieOutcomeEffect';
import { getCombatEffectLifetimeMs } from '../FloatingCombatEffects';

jest.mock('framer-motion', () => ({ ...jest.requireActual('framer-motion'), useReducedMotion: jest.fn(() => false) }));
const effect = { eventType: 'item-use', effect: 'heal', sourceEventId: 'potion-1', dice: [{ faces: 4, value: 4 }], healed: 2 };
const position = { x: 100, y: 100, width: 60, height: 60 };
beforeEach(() => { jest.useFakeTimers(); useReducedMotion.mockReturnValue(false); });
afterEach(() => jest.useRealTimers());

test('animates only presentation numerals then reveals the saved die and effective healing', () => {
    const random = jest.spyOn(Math, 'random');
    const { container } = render(<CanvasDieOutcomeEffect effect={effect} targetPos={position} />);
    expect(screen.getByRole('status')).toHaveTextContent('Tirada de curación.');
    const firstValue = container.querySelector('svg text').textContent;
    act(() => jest.advanceTimersByTime(65));
    expect(container.querySelector('svg text').textContent).not.toBe(firstValue);
    act(() => jest.advanceTimersByTime(1235));
    expect(container.querySelector('svg text')).toHaveTextContent('4');
    expect(screen.getByRole('status')).toHaveTextContent('D4: 4. Recupera 2 de Vida.');
    expect(random).not.toHaveBeenCalled();
    expect(getCombatEffectLifetimeMs(effect)).toBe(3200);
    random.mockRestore();
});

test('reduced motion shows the real result immediately and uses no rolling timers', () => {
    useReducedMotion.mockReturnValue(true);
    render(<CanvasDieOutcomeEffect effect={effect} targetPos={position} />);
    expect(screen.getByRole('status')).toHaveTextContent('D4: 4. Recupera 2 de Vida.');
    expect(jest.getTimerCount()).toBe(0);
});

test('no hidden token coordinates means no visible or accessible outcome', () => {
    const { container } = render(<CanvasDieOutcomeEffect effect={effect} targetPos={null} />);
    expect(container).toBeEmptyDOMElement();
});

test('two clients reveal the same result, zero healing stays zero, and unmount clears timers', () => {
    const zero = { ...effect, healed: 0 };
    const first = render(<CanvasDieOutcomeEffect effect={zero} targetPos={position} />);
    const second = render(<CanvasDieOutcomeEffect effect={zero} targetPos={position} />);
    act(() => jest.advanceTimersByTime(1300));
    expect(screen.getAllByRole('status')).toHaveLength(2);
    screen.getAllByRole('status').forEach(status => expect(status).toHaveTextContent('D4: 4. Sin Vida recuperada.'));
    expect(first.container.querySelector('.canvas-die-outcome-pulse')).toBeNull();
    first.unmount(); second.unmount();
    expect(jest.getTimerCount()).toBe(0);
});

test('placement flips at the screen edge and leaves the token toolbar untouched at zoom', () => {
    const viewport = { width: 390, height: 844 };
    const tokenRect = { left: 270, top: 300, width: 80, height: 80 };
    const offset = getCanvasDieOutcomeOffset({ tokenRect, viewport, zoom: 2 });
    expect(offset.x).toBeLessThan(0);
    const x = tokenRect.left + 40 + offset.x, y = tokenRect.top + 40 + offset.y;
    expect(x - 48).toBeGreaterThanOrEqual(8);
    expect(x + 48).toBeLessThanOrEqual(382);
    expect(y - 56).toBeGreaterThanOrEqual(8);
    expect(x + 48).toBeLessThan(tokenRect.left + 40 - 104);
});

test('near the top edge the outcome clears the toolbar and stays inside the viewport', () => {
    const offset = getCanvasDieOutcomeOffset({ tokenRect: { left: 155, top: 4, width: 80, height: 80 },
        viewport: { width: 390, height: 844 }, zoom: 1 });
    expect(44 + offset.y - 56).toBeGreaterThanOrEqual(8);
    expect(Math.abs(offset.x) > 80 || 44 + offset.y - 56 > 84).toBe(true);
});

test('a magnified token on mobile leaves its top controls clear without pushing the die off-screen', () => {
    const offset = getCanvasDieOutcomeOffset({ tokenRect: { left: 140, top: 190, width: 110, height: 110 },
        viewport: { width: 390, height: 844 }, zoom: 2.2 });
    const x = 195 + offset.x, y = 245 + offset.y;
    expect(x + 48).toBeLessThanOrEqual(382);
    expect(y - 56).toBeGreaterThan(190 - 8 * 2.2);
    expect(x - 48).toBeGreaterThan(250);
});
