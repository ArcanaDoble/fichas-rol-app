import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CanvasSection from '../CanvasSection';
import BoardSection from '../BoardSection';

jest.mock('../../firebase', () => ({ db: {}, storage: {} }));

jest.mock('../../utils/storage', () => ({
    getOrUploadFile: jest.fn(),
    releaseFile: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
    addDoc: jest.fn(),
    collection: jest.fn(),
    deleteDoc: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
    orderBy: jest.fn(),
    query: jest.fn(),
    runTransaction: jest.fn(),
    serverTimestamp: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    where: jest.fn(),
}));

const makeScenario = (mode) => ({
    id: `smoke-${mode}`,
    name: `Smoke ${mode}`,
    lastModified: 1,
    allowedPlayers: [],
    camera: { zoom: 1, offset: { x: 0, y: 0 } },
    config: {
        isInfinite: false,
        columns: 8,
        rows: 6,
        cellWidth: 80,
        cellHeight: 80,
        showGrid: true,
    },
    items: [
        {
            id: `${mode}-token`,
            type: 'token',
            name: 'Token de prueba',
            x: 4960,
            y: 4960,
            width: 80,
            height: 80,
            rotation: 0,
            isCircular: true,
            controlledBy: [],
            status: ['sangrado'],
            velocidad: 3,
            stats: {
                Vida: { current: 3, max: 3 },
                Postura: { current: 2, max: 2 },
            },
        },
        {
            id: `${mode}-area`,
            type: 'geometry',
            geometryKind: 'rect',
            name: 'Zona de prueba',
            x: 5100,
            y: 5000,
            width: 160,
            height: 80,
            rotation: 0,
            backgroundColor: '#22c55e',
            opacity: 0.4,
        },
        ...(mode === 'board' ? [
            {
                id: 'board-card',
                type: 'card',
                name: 'Carta de prueba',
                x: 4900,
                y: 5100,
                width: 96,
                height: 136,
                rotation: 0,
                zone: 'board',
                faceDown: false,
            },
        ] : []),
    ],
});

beforeEach(() => {
    const firestore = require('firebase/firestore');
    const storage = require('../../utils/storage');
    const emptySnapshot = { docs: [], forEach: () => {}, docChanges: () => [] };
    const reference = (...args) => ({
        path: args.filter((arg) => typeof arg === 'string').join('/'),
    });

    firestore.addDoc.mockResolvedValue({ id: 'mock-id' });
    firestore.collection.mockImplementation(reference);
    firestore.deleteDoc.mockResolvedValue(undefined);
    firestore.doc.mockImplementation(reference);
    firestore.getDoc.mockResolvedValue({ exists: () => false });
    firestore.getDocs.mockResolvedValue(emptySnapshot);
    firestore.limit.mockReturnValue({});
    firestore.orderBy.mockReturnValue({});
    firestore.query.mockImplementation((ref) => ref);
    firestore.runTransaction.mockResolvedValue(undefined);
    firestore.serverTimestamp.mockReturnValue(0);
    firestore.setDoc.mockResolvedValue(undefined);
    firestore.updateDoc.mockResolvedValue(undefined);
    firestore.where.mockReturnValue({});
    firestore.onSnapshot.mockImplementation((ref, onNext) => {
        if (ref?.path === 'canvas_scenarios' || ref?.path === 'board_scenarios') {
            const mode = ref.path.startsWith('board') ? 'board' : 'canvas';
            const scenario = makeScenario(mode);
            onNext({
                ...emptySnapshot,
                docs: [{ id: scenario.id, data: () => scenario }],
            });
        } else if (ref?.path === 'canvas_scenarios/smoke-canvas') {
            const scenario = makeScenario('canvas');
            onNext({ id: scenario.id, exists: () => true, data: () => scenario });
        } else if (ref?.path === 'board_scenarios/smoke-board') {
            const scenario = makeScenario('board');
            onNext({ id: scenario.id, exists: () => true, data: () => scenario });
        } else if (ref?.path?.startsWith('gameSettings/')) {
            onNext({ exists: () => false, data: () => ({}) });
        } else {
            onNext(emptySnapshot);
        }
        return () => {};
    });

    storage.getOrUploadFile.mockResolvedValue({ url: 'mock-url', hash: 'mock-hash' });
    storage.releaseFile.mockResolvedValue(undefined);
});

test.each([
    ['canvas', CanvasSection],
    ['board', BoardSection],
])('mounts the %s library and a representative active scenario', async (mode, SectionComponent) => {
    const { container, unmount } = render(<SectionComponent onBack={jest.fn()} />);

    expect(container.firstChild).toBeInTheDocument();
    fireEvent.click(await screen.findByText(`Smoke ${mode}`));
    await waitFor(() => {
        expect(screen.getByTitle('Capa de Mesa (Tokens)')).toBeInTheDocument();
        expect(screen.getByText('Token de prueba')).toBeInTheDocument();
    });
    const tokenElement = container.querySelector(`[data-board-item-id="${mode}-token"]`);
    expect(tokenElement).not.toBeNull();
    expect(() => fireEvent.touchStart(tokenElement, {
        touches: [{ clientX: 100, clientY: 100, identifier: 1 }],
    })).not.toThrow();
    try {
        unmount();
    } catch (error) {
        // Keep nested React cleanup failures visible instead of collapsing them into AggregateError.
        throw error.errors?.[0] || error;
    }
});

test('creates a Roguelite class token in the active Canvas encounter', async () => {
    const firestore = require('firebase/firestore');
    const scenario = {
        ...makeScenario('canvas'),
        allowedPlayers: ['Ada'],
        items: [],
    };
    let persistedItems = null;
    let persistedRun = null;
    let confirmScenarioWrite;
    let transactionCount = 0;
    const scenarioWriteConfirmation = new Promise((resolve) => {
        confirmScenarioWrite = resolve;
    });

    firestore.getDoc.mockImplementation((reference) => Promise.resolve(
        reference?.path === 'players/Ada/rogueliteClasses/barbarian'
            ? { exists: () => false, data: () => ({}) }
            : { exists: () => true, data: () => scenario },
    ));
    firestore.runTransaction.mockImplementation(async (_database, callback) => {
        transactionCount += 1;
        if (transactionCount === 1) await scenarioWriteConfirmation;

        return callback({
            get: jest.fn((reference) => Promise.resolve(
                reference?.path === 'players/Ada/rogueliteClasses/barbarian'
                    ? { exists: () => false, data: () => ({}) }
                    : { exists: () => true, data: () => scenario },
            )),
            update: jest.fn((_reference, payload) => {
                persistedItems = payload.items;
            }),
            set: jest.fn((_reference, payload) => {
                persistedRun = payload.activeRun;
            }),
        });
    });
    firestore.onSnapshot.mockImplementation((ref, onNext) => {
        if (ref?.path === 'gameSettings/canvasVisibility') {
            onNext({ exists: () => true, data: () => ({ activeScenarioId: scenario.id }) });
        } else if (ref?.path === `canvas_scenarios/${scenario.id}`) {
            onNext({ id: scenario.id, exists: () => true, data: () => scenario });
        } else if (ref?.path === 'canvas_scenarios') {
            onNext({ docs: [{ id: scenario.id, data: () => scenario }], forEach: () => {}, docChanges: () => [] });
        } else {
            onNext({ docs: [], forEach: () => {}, docChanges: () => [] });
        }
        return () => {};
    });

    const { unmount } = render(
        <CanvasSection
            onBack={jest.fn()}
            playerName="Ada"
            currentUserId="Ada"
            isPlayerView
            isMaster={false}
            characterData={{
                id: 'barbarian',
                owner: 'Ada',
                profileType: 'rogueliteClass',
                launchSource: 'rogueliteClass',
                name: 'Bárbaro',
                avatar: 'barbarian.webp',
                lifeInitial: 8,
                maxLife: 10,
                defenseClass: 3,
                maxDefenseClass: 4,
                movement: 2,
                maxMovement: 3,
                initiativeBase: 2,
                maxInitiative: 3,
                resource: { name: 'Furia', current: 1, maximum: 3, color: '#aa1515' },
                equippedItems: {
                    mainHand: { name: 'Mandoble', handsRequired: 2 },
                    body: { name: 'Mallas', itemType: 'armor' },
                },
            }}
        />,
    );

    await waitFor(() => expect(firestore.runTransaction).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Bárbaro')).not.toBeInTheDocument();

    await act(async () => {
        confirmScenarioWrite();
    });

    await waitFor(() => expect(persistedItems).not.toBeNull());
    expect((await screen.findAllByText('Bárbaro')).length).toBeGreaterThan(0);
    expect(firestore.runTransaction).toHaveBeenCalledTimes(2);
    expect(persistedItems).toHaveLength(1);
    expect(persistedItems[0]).toEqual(expect.objectContaining({
        name: 'Bárbaro',
        controlledBy: ['Ada'],
        linkedClassId: 'barbarian',
        profileType: 'rogueliteClass',
        portrait: 'barbarian.webp',
        stats: expect.objectContaining({
            vida: expect.objectContaining({ current: 8, max: 10 }),
            cd: expect.objectContaining({ current: 3, max: 4 }),
            movimiento: expect.objectContaining({ current: 2, max: 3 }),
            iniciativa: expect.objectContaining({ current: 2, max: 3 }),
            recurso: expect.objectContaining({ current: 1, max: 3, label: 'Furia' }),
        }),
    }));
    expect(persistedItems[0].equippedItems.map((item) => item.name)).toEqual(['Mandoble', 'Mallas']);
    expect(persistedRun).toEqual(expect.objectContaining({
        classId: 'barbarian',
        owner: 'Ada',
        currentScenarioId: scenario.id,
        stats: expect.objectContaining({
            vida: expect.objectContaining({ current: 8, max: 10 }),
        }),
    }));
    unmount();
});
