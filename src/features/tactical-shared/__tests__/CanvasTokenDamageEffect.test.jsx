import React from 'react';
import { act, render } from '@testing-library/react';
import CanvasTokenDamageEffect from '../components/CanvasTokenDamageEffect';

test('responds only to new Life loss and restarts for a second hit', () => {
    jest.useFakeTimers();
    const { container, rerender } = render(<CanvasTokenDamageEffect life={8} />);
    expect(container.firstChild).toBeNull();

    rerender(<CanvasTokenDamageEffect life={6} />);
    const first = container.firstChild;
    expect(first).toHaveClass('noma-token-damage-effect--round');
    rerender(<CanvasTokenDamageEffect life={5} />);
    expect(container.firstChild).not.toBe(first);

    act(() => jest.advanceTimersByTime(900));
    expect(container.firstChild).toBeNull();
    rerender(<CanvasTokenDamageEffect life={7} />);
    expect(container.firstChild).toBeNull();
    rerender(<CanvasTokenDamageEffect life={6} isCircular={false} />);
    expect(container.firstChild).toHaveClass('noma-token-damage-effect');
    expect(container.firstChild).not.toHaveClass('noma-token-damage-effect--round');
    jest.useRealTimers();
});

test('keeps a slow review impact visible for its chosen duration', () => {
    jest.useFakeTimers();
    const { container, rerender } = render(<CanvasTokenDamageEffect life={8} durationMs={3000} />);
    rerender(<CanvasTokenDamageEffect life={6} durationMs={3000} />);
    expect(container.firstChild.style.getPropertyValue('--token-impact-duration')).toBe('2970ms');
    act(() => jest.advanceTimersByTime(900));
    expect(container.firstChild).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(2200));
    expect(container.firstChild).toBeNull();
    jest.useRealTimers();
});

test('combat impact waits for the same reveal as the damage number', () => {
    jest.useFakeTimers();
    const now = Date.now();
    const damageEffect = { id: 'attack-1', previousLife: 8, nextLife: 6, revealAt: now + 1500, deadlineAt: now + 4000 };
    const { container, rerender } = render(<CanvasTokenDamageEffect life={8} />);
    rerender(<CanvasTokenDamageEffect life={6} damageEffect={damageEffect} />);
    expect(container.firstChild).toBeNull();
    act(() => jest.advanceTimersByTime(1499));
    expect(container.firstChild).toBeNull();
    act(() => jest.advanceTimersByTime(2));
    expect(container.firstChild).toHaveClass('noma-token-damage-effect');
    act(() => jest.advanceTimersByTime(1500));
    expect(container.firstChild).toBeNull();
    jest.useRealTimers();
});
