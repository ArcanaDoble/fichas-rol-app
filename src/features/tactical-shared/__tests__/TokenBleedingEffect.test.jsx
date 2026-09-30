import React from 'react';
import { act, render } from '@testing-library/react';
import TokenBleedingEffect from '../components/TokenBleedingEffect';

afterEach(() => jest.useRealTimers());
test('bleeding follows the cutout mask and waits for the dressing before fading away', () => {
    jest.useFakeTimers();
    const { container, rerender } = render(<TokenBleedingEffect active circular={false} source="/figure.png" />);
    const node = container.firstChild;
    expect(node.style.maskImage).toBe('url("/figure.png")');
    const remedy = { effect: 'remove-bleeding', startedAt: Date.now() };
    rerender(<TokenBleedingEffect active={false} circular={false} source="/figure.png" remedyEffect={remedy} />);
    expect(node).toHaveAttribute('data-active', 'true');
    act(() => jest.advanceTimersByTime(1051));
    expect(node).toHaveAttribute('data-active', 'false');
    act(() => jest.advanceTimersByTime(1700));
    expect(container).toBeEmptyDOMElement();
});
test('a new application interrupts removal; inactive tokens never start an effect', () => {
    jest.useFakeTimers();
    const { container, rerender } = render(<TokenBleedingEffect active={false} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<TokenBleedingEffect active />);
    expect(container.firstChild.style.borderRadius).toBe('50%');
    rerender(<TokenBleedingEffect active={false} />);
    act(() => jest.advanceTimersByTime(500));
    rerender(<TokenBleedingEffect active />);
    act(() => jest.advanceTimersByTime(2000));
    expect(container.firstChild).toHaveAttribute('data-active', 'true');
});
