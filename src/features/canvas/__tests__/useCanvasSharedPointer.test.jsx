import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    runTransaction,
    setDoc,
} from 'firebase/firestore';
import { useCanvasSharedPointer } from '../useCanvasSharedPointer';

const mockDocuments = new Map();
const mockSubscriptions = new Map();

const notifyCollection = (collectionPath) => {
    const callbacks = mockSubscriptions.get(collectionPath) || [];
    const docs = [...mockDocuments.entries()]
        .filter(([path]) => path.slice(0, path.lastIndexOf('/')) === collectionPath)
        .map(([path, data]) => ({
            id: path.slice(path.lastIndexOf('/') + 1),
            data: () => data,
        }));
    callbacks.forEach((callback) => callback({ docs }));
};

jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    collection: jest.fn((...parts) => ({ path: parts.slice(1).join('/') })),
    deleteDoc: jest.fn(() => Promise.resolve()),
    doc: jest.fn((...parts) => ({ path: parts.slice(1).join('/') })),
    onSnapshot: jest.fn((_reference, onValue) => {
        onValue({ docs: [] });
        return jest.fn();
    }),
    setDoc: jest.fn(() => Promise.resolve()),
    runTransaction: jest.fn(),
}));

const createPointerEvent = (overrides = {}) => ({
    button: 0,
    clientX: 80,
    clientY: 90,
    ctrlKey: true,
    nativeEvent: { stopImmediatePropagation: jest.fn() },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...overrides,
});

beforeEach(() => {
    let transactionQueue = Promise.resolve();
    mockDocuments.clear();
    mockSubscriptions.clear();
    runTransaction.mockImplementation((_db, callback) => {
        const result = transactionQueue.then(() => callback({
            get: async reference => ({ exists: () => mockDocuments.has(reference.path), data: () => mockDocuments.get(reference.path) }),
            set: (reference, data) => mockDocuments.set(reference.path, data),
        }));
        transactionQueue = result.catch(() => {});
        return result;
    });
    collection.mockImplementation((...parts) => ({ path: parts.slice(1).join('/') }));
    doc.mockImplementation((...parts) => ({ path: parts.slice(1).join('/') }));
    deleteDoc.mockImplementation((reference) => {
        mockDocuments.delete(reference.path);
        notifyCollection(reference.path.slice(0, reference.path.lastIndexOf('/')));
        return Promise.resolve();
    });
    setDoc.mockImplementation((reference, payload, options = {}) => {
        const previous = mockDocuments.get(reference.path) || {};
        mockDocuments.set(reference.path, options.merge ? { ...previous, ...payload } : payload);
        notifyCollection(reference.path.slice(0, reference.path.lastIndexOf('/')));
        return Promise.resolve();
    });
    onSnapshot.mockImplementation((reference, onValue) => {
        const callbacks = mockSubscriptions.get(reference.path) || [];
        callbacks.push(onValue);
        mockSubscriptions.set(reference.path, callbacks);
        notifyCollection(reference.path);
        return () => {
            mockSubscriptions.set(
                reference.path,
                (mockSubscriptions.get(reference.path) || []).filter((callback) => callback !== onValue),
            );
        };
    });
});

const renderSharedPointer = (playerName) => renderHook(() => useCanvasSharedPointer({
    activeScenario: { id: 'scenario-1' },
    currentUserId: `user-${playerName}`,
    divToWorld: (x, y) => ({ x, y }),
    isPlayerView: true,
    playerName,
    scenarioCollectionName: 'canvas_scenarios',
}));

test('removes the shared cursor but retains its independent ping until the waves finish', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);

    const { result, unmount } = renderHook(
        () => useCanvasSharedPointer({
            activeScenario: { id: 'scenario-1' },
            currentUserId: 'user-1',
            divToWorld: (x, y) => ({ x, y }),
            isPlayerView: true,
            playerName: 'Ada',
            scenarioCollectionName: 'canvas_scenarios',
        }),
        { wrapper: StrictMode },
    );
    await act(async () => {});
    deleteDoc.mockClear();
    setDoc.mockClear();

    act(() => {
        result.current.handleSharedPointerDown(createPointerEvent());
    });
    act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    });

    expect(result.current.isCanvasPointerActive).toBe(false);
    expect(result.current.canvasPointers).toEqual([
        expect.objectContaining({ visible: false, pings: [expect.objectContaining({ x: 80, y: 90 })] }),
    ]);
    expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.stringContaining('/sharedPings/') }),
        expect.objectContaining({ x: 80, y: 90 }),
    );
    expect(deleteDoc).toHaveBeenCalledTimes(1);
    expect(deleteDoc).toHaveBeenLastCalledWith(
        expect.objectContaining({ path: expect.stringContaining('/sharedPointers/') }),
    );

    act(() => {
        jest.advanceTimersByTime(2_100);
    });
    expect(deleteDoc).toHaveBeenCalledTimes(1);

    act(() => {
        jest.advanceTimersByTime(150);
    });
    expect(deleteDoc).toHaveBeenCalledTimes(2);
    expect(deleteDoc).toHaveBeenLastCalledWith(
        expect.objectContaining({ path: expect.stringContaining('/sharedPings/') }),
    );
    expect(result.current.canvasPointers).toEqual([]);

    unmount();
    jest.useRealTimers();
});

test('does not render its own Firestore echo while pointer deletion is pending', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(15_000);
    const sender = renderSharedPointer('Ada');
    await act(async () => {});

    act(() => {
        sender.result.current.handleSharedPointerDown(createPointerEvent({ clientX: 160, clientY: 180 }));
    });

    // Simulate the real network window in which the last sharedPointers document
    // is still present in the subscription after the local cursor has been cleared.
    deleteDoc.mockImplementationOnce(() => Promise.resolve());
    act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    });

    expect(sender.result.current.isCanvasPointerActive).toBe(false);
    expect(sender.result.current.canvasPointers).toEqual([
        expect.objectContaining({
            visible: false,
            pings: [expect.objectContaining({ x: 160, y: 180 })],
        }),
    ]);
    expect(sender.result.current.canvasPointers).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ visible: true, x: 160, y: 180 }),
    ]));

    sender.unmount();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
});

test('synchronizes the live cursor and independent pings with another client', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(20_000);
    const sender = renderSharedPointer('Ada');
    const receiver = renderSharedPointer('Bruno');
    await act(async () => {});

    act(() => {
        sender.result.current.handleSharedPointerMove(createPointerEvent({ clientX: 120, clientY: 140 }));
    });
    expect(receiver.result.current.canvasPointers).toEqual([
        expect.objectContaining({ name: 'Ada', visible: true, x: 120, y: 140 }),
    ]);

    act(() => {
        sender.result.current.handleSharedPointerDown(createPointerEvent({ clientX: 160, clientY: 180 }));
    });
    expect(receiver.result.current.canvasPointers).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'Ada', visible: true }),
        expect.objectContaining({
            name: 'Ada',
            visible: false,
            pings: [expect.objectContaining({ x: 160, y: 180 })],
        }),
    ]));

    act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    });
    expect(receiver.result.current.canvasPointers).toEqual([
        expect.objectContaining({
            name: 'Ada',
            visible: false,
            pings: [expect.objectContaining({ x: 160, y: 180 })],
        }),
    ]);

    sender.unmount();
    receiver.unmount();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
});

test('simultaneous participants publish different colors, retained after remount', async () => {
    const ada = renderSharedPointer('Ada');
    const bruno = renderSharedPointer('Bruno');
    await act(async () => {});
    act(() => {
        ada.result.current.handleSharedPointerDown(createPointerEvent());
        bruno.result.current.handleSharedPointerDown(createPointerEvent({ clientX: 150 }));
    });
    const adaColor = ada.result.current.canvasPointers.find(pointer => pointer.isLocal).color;
    const brunoColor = bruno.result.current.canvasPointers.find(pointer => pointer.isLocal).color;
    expect(adaColor).not.toBe(brunoColor);
    expect(bruno.result.current.canvasPointers.find(pointer => pointer.name === 'Ada' && pointer.visible).color).toBe(adaColor);
    expect(bruno.result.current.canvasPointers.find(pointer => pointer.name === 'Ada' && pointer.pings?.length).pings[0].color).toBe(adaColor);
    ada.unmount();
    const returningAda = renderSharedPointer('Ada');
    await act(async () => {});
    act(() => returningAda.result.current.handleSharedPointerMove(createPointerEvent()));
    expect(returningAda.result.current.canvasPointers.find(pointer => pointer.isLocal).color).toBe(adaColor);
    returningAda.unmount();
    bruno.unmount();
});

test('a delayed reservation cannot restore a released cursor or publish an expired ping', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(30_000);
    let resolveColor;
    runTransaction.mockImplementationOnce(() => new Promise(resolve => { resolveColor = resolve; }));
    const sender = renderSharedPointer('Ada');
    setDoc.mockClear();
    act(() => sender.result.current.handleSharedPointerDown(createPointerEvent()));
    act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
        jest.advanceTimersByTime(2_300);
    });
    await act(async () => resolveColor('#60d5ef'));
    expect(setDoc).not.toHaveBeenCalled();
    expect(sender.result.current.canvasPointers).toEqual([]);
    sender.unmount();
    jest.useRealTimers();
});
