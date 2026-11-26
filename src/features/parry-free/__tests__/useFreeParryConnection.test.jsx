import { act, renderHook, waitFor } from '@testing-library/react';
import useFreeParryConnection from '../useFreeParryConnection';
import { emptyRoom } from '../freeParryRoom';

test('a cached room cannot replace the live one, and a late presence reply cannot undo a newer round', async () => {
  const initial = { ...emptyRoom(), sequence:2, members:{ master:{ controllerId:'master', lastSeen:Date.now() } } };
  let listen, finishHeartbeat;
  const service = {
    listenRoom:jest.fn(changed => {
      listen = changed;
      changed(emptyRoom(), true);
      return jest.fn();
    }),
    roomCommand:jest.fn(() => new Promise(resolve => { finishHeartbeat = resolve; })),
  };
  const { result } = renderHook(() => useFreeParryConnection('master', service));
  act(() => listen(initial, false));
  await act(async () => finishHeartbeat(initial));

  act(() => window.dispatchEvent(new Event('offline')));
  expect(result.current.syncing).toBe(true);
  act(() => window.dispatchEvent(new Event('online')));
  expect(service.listenRoom).toHaveBeenCalledTimes(2);
  expect(result.current.room).toEqual(initial);
  expect(result.current.syncing).toBe(true);
  const resumed = { ...initial, sequence:3 };
  await act(async () => finishHeartbeat(resumed));
  expect(result.current.room).toEqual(resumed);
  expect(result.current.syncing).toBe(false);

  act(() => result.current.reconnect());
  const nextRound = { ...resumed, sequence:4 };
  act(() => listen(nextRound, false));
  await act(async () => finishHeartbeat(resumed));
  expect(result.current.room).toEqual(nextRound);
});

test('restoring a page observes a deliberate exit on another device and disposes its listeners', async () => {
  const joined = { ...emptyRoom(), members:{ master:{ controllerId:'master', lastSeen:Date.now() } } };
  let live = joined;
  const detach = jest.fn();
  const service = {
    listenRoom:jest.fn(changed => { changed(live); return detach; }),
    roomCommand:jest.fn(async () => live),
  };
  const { result, unmount } = renderHook(() => useFreeParryConnection('master', service));
  await waitFor(() => expect(result.current.joined).toBe(true));
  live = emptyRoom();
  act(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true })));
  await waitFor(() => expect(result.current.joined).toBe(false));
  expect(service.roomCommand.mock.calls.every(([, event]) => event.type === 'heartbeat')).toBe(true);
  expect(detach).toHaveBeenCalledTimes(1);
  unmount();
  expect(detach).toHaveBeenCalledTimes(2);
  act(() => window.dispatchEvent(new Event('online')));
  expect(service.listenRoom).toHaveBeenCalledTimes(2);
});
