import { act, renderHook } from '@testing-library/react';
import { useBoardDrawPresentation } from '../useBoardDrawPresentation';

const drawn = (id, index = 0, extra = {}) => ({ id, type: 'card', x: 200, y: 100,
    boardDraw: { id: 'draw-1', index, count: 3, at: Date.now(), x: 20, y: 100, faceDown: true }, ...extra });
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('presents each newly received card progressively and does not replay on ordinary updates', () => {
    const { result, rerender } = renderHook(scenario => useBoardDrawPresentation(scenario), { initialProps: { id: 'scene', items: [] } });
    const items = [drawn('a'), drawn('b', 1), drawn('c', 2)];
    rerender({ id: 'scene', items });
    expect(Object.values(result.current).map(entry => entry.delay)).toEqual([0, 0.18, 0.36]);
    act(() => jest.advanceTimersByTime(450));
    expect(Object.keys(result.current)).toEqual(['b', 'c']);
    rerender({ id: 'scene', items: items.map(item => ({ ...item, name: 'Updated' })) });
    expect(Object.keys(result.current)).toEqual(['b', 'c']);
    act(() => jest.advanceTimersByTime(200));
    expect(Object.keys(result.current)).toEqual(['c']);
    act(() => jest.advanceTimersByTime(300));
    expect(result.current).toEqual({});
    rerender({ id: 'scene', items: [...items] });
    expect(result.current).toEqual({});
});

test('loading or switching scenes never replays old draws', () => {
    const { result, rerender } = renderHook(scenario => useBoardDrawPresentation(scenario), { initialProps: { id: 'scene', items: [drawn('a')] } });
    expect(result.current).toEqual({});
    rerender({ id: 'other', items: [drawn('b')] });
    expect(result.current).toEqual({});
});

test('moving, collecting or restacking an animating card cancels its presentation', () => {
    const { result, rerender } = renderHook(scenario => useBoardDrawPresentation(scenario), { initialProps: { id: 'scene', items: [] } });
    const items = [drawn('a'), drawn('b', 1), drawn('c', 2)];
    rerender({ id: 'scene', items });
    expect(Object.keys(result.current)).toHaveLength(3);
    rerender({ id: 'scene', items: [{ ...items[0], x: 300 }, { ...items[1], zone: 'hand' }, { ...items[2], stackParentId: 'other' }] });
    expect(result.current).toEqual({});
});

test('ignores stale metadata and remains disabled outside the card board', () => {
    const { result, rerender } = renderHook(({ scene, enabled }) => useBoardDrawPresentation(scene, enabled),
        { initialProps: { scene: { id: 'scene', items: [] }, enabled: true } });
    const stale = drawn('a'); stale.boardDraw.at -= 60000;
    rerender({ scene: { id: 'scene', items: [stale] }, enabled: true });
    expect(result.current).toEqual({});
    rerender({ scene: { id: 'scene', items: [drawn('b')] }, enabled: false });
    expect(result.current).toEqual({});
});
