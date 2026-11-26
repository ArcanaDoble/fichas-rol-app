import { act, renderHook } from '@testing-library/react';
import { useCanvasTurnConfirmation } from '../useCanvasTurnConfirmation';

const pending = { tokenId: 'hero', startX: 0, startY: 0, x: 50, y: 0, moveCost: 1 };
test('first finish confirms movement only; the following finish completes the activation', async () => {
    const confirm = jest.fn(async () => true), complete = jest.fn(async () => true);
    const h = renderHook(props => useCanvasTurnConfirmation({ confirmPendingMovement: confirm, completeActivation: complete, ...props }),
        { initialProps: { pendingTurnState: pending } });
    await act(async () => h.result.current('hero'));
    expect(confirm).toHaveBeenCalledWith(null, 'hero');
    expect(complete).not.toHaveBeenCalled();
    h.rerender({ pendingTurnState: null });
    await act(async () => h.result.current('hero'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith('hero');
});

test('an invalid movement or a second press while saving cannot finish the turn', async () => {
    let finish;
    const confirm = jest.fn(() => new Promise(resolve => { finish = resolve; }));
    const complete = jest.fn();
    const h = renderHook(() => useCanvasTurnConfirmation({ pendingTurnState: pending,
        confirmPendingMovement: confirm, completeActivation: complete }));
    let first;
    act(() => { first = h.result.current('hero'); });
    await act(async () => expect(await h.result.current('hero')).toBe(false));
    await act(async () => { finish(false); expect(await first).toBe(false); });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
});
