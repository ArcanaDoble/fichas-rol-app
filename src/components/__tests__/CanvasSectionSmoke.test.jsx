import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CanvasSection from '../CanvasSection';
import BoardSection from '../BoardSection';
import { createCanvasCombatState, markParticipantActed, submitActionDice } from '../../features/canvas/combat/canvasCombatState';

const originalCrypto = global.crypto;
const originalWidth = window.innerWidth;
beforeAll(() => { global.crypto = { randomUUID: require('crypto').randomUUID }; });
afterAll(() => { global.crypto = originalCrypto; });
afterEach(() => { window.innerWidth = originalWidth; });

jest.mock('../../firebase', () => ({ db: {}, storage: {} }));

// Color reservations are exercised by the shared-pointer tests; keep this
// smoke test's transaction checks focused on creating the token and its run.
jest.mock('../../features/canvas/sharedPointerColors', () => ({
    reserveCanvasPointerColor: () => Promise.resolve('#d8b968'),
}));

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

const installCampaignStore = (mode = 'campaign') => {
    const firestore = require('firebase/firestore');
    const scene = { ...makeScenario('canvas'), rulesSystem: mode, config: { ...makeScenario('canvas').config, gameSystem: mode }, allowedPlayers: ['Ada'], items: [] };
    const data = {
        'canvas_scenarios/smoke-canvas': scene,
        'gameSettings/canvasVisibility': { activeScenarioId: scene.id },
        'characters/yerma': { id: 'yerma', name: 'Yerma', owner: 'Ada', avatar: '/yerma/Yerma.webp', equipment: {}, equippedItems: {} },
        'campaignCharacterSheets/yerma': { vida: { current: 53, max: 60 }, mente: { current: 8, max: 12 }, movilidad: 3, actionDice: ['d10', 'd4', 'd4'], armaduraRd: 1, yermo: '53' },
    };
    const listeners = new Map();
    const snapshot = path => ({ id: path.split('/').pop(), exists: () => Boolean(data[path]), data: () => data[path] });
    const publish = path => listeners.get(path)?.forEach(callback => callback(snapshot(path)));
    firestore.updateDoc.mockImplementation(async (ref, patch) => {
        data[ref.path] = { ...data[ref.path], ...patch };
        publish(ref.path);
    });
    firestore.getDoc.mockImplementation(ref => Promise.resolve(snapshot(ref.path)));
    firestore.onSnapshot.mockImplementation((ref, callback) => {
        if (ref.path.split('/').length % 2 === 0) {
            if (!listeners.has(ref.path)) listeners.set(ref.path, new Set());
            listeners.get(ref.path).add(callback);
            callback(snapshot(ref.path));
        } else {
            callback({ docs: Object.keys(data).filter(key => key.startsWith(`${ref.path}/`) && key.split('/').length === ref.path.split('/').length + 1).map(snapshot), docChanges: () => [], forEach: () => {} });
        }
        return () => listeners.get(ref.path)?.delete(callback);
    });
    firestore.runTransaction.mockImplementation(async (_db, callback) => {
        const writes = [];
        const result = await callback({
            get: ref => Promise.resolve(snapshot(ref.path)),
            set: (ref, value, options) => writes.push([ref.path, options?.merge ? { ...data[ref.path], ...value } : value]),
            update: (ref, value) => writes.push([ref.path, { ...data[ref.path], ...value }]),
        });
        writes.forEach(([path, value]) => { data[path] = value; });
        writes.forEach(([path]) => publish(path));
        return result;
    });
    return data;
};

test.each([false, true])('master drags a prone spent token with the compact toggle without changing its turn (touch=%s)', async touch => {
    const store = installCampaignStore();
    const path = 'canvas_scenarios/smoke-canvas';
    const token = { id: 'hero', name: 'Yerma de prueba', type: 'token', layer: 'TOKEN', profileType: 'campaignCharacter',
        rulesSystem: 'campaign', controlledBy: ['Otro jugador'], x: 5960, y: 5960, width: 40, height: 40,
        status: ['derribado'], stats: { vida: { current: 10, max: 28 }, movimiento: { current: 0, max: 2 } },
        actionDice: ['d6', 'd6', 'd6'] };
    let combat = createCanvasCombatState([token], { rulesSystem: 'campaign' });
    combat = submitActionDice(combat, token.id, [6, 4, 2]);
    combat = markParticipantActed(combat, token.id);
    store[path] = { ...store[path], items: [token], canvasCombat: combat };
    const { container } = render(<CanvasSection onBack={jest.fn()} isMaster isPlayerView={false} />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    fireEvent.mouseDown(container.querySelector('[data-board-item-id="hero"]'), { button: 0, clientX: 0, clientY: 0 });
    expect(screen.queryByText(/No puedes desplazar una ficha/)).not.toBeInTheDocument();
    const button = await screen.findByRole('button', { name: 'Desplazamiento sin coste de Yerma de prueba' });
    expect(screen.queryByTitle('Rotar 45°')).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    const element = container.querySelector('[data-board-item-id="hero"]');
    const viewport = container.querySelector('[data-tactical-viewport]');
    if (touch) {
        fireEvent.touchStart(element, { touches: [{ clientX: 0, clientY: 0, identifier: 1 }] });
        fireEvent.touchMove(viewport, { touches: [{ clientX: 100, clientY: 100, identifier: 1 }] });
        fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 100, clientY: 100, identifier: 1 }], touches: [] });
    } else {
        fireEvent.mouseDown(element, { button: 0, clientX: 0, clientY: 0 });
        fireEvent.mouseMove(viewport, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(viewport, { clientX: 100, clientY: 100 });
    }
    await waitFor(() => expect(store[path].items[0].forcedMovement).toBeDefined());
    expect(store[path].items[0]).toMatchObject({ x: 6060, y: 6060, status: token.status, stats: token.stats });
    expect(store[path].canvasCombat).toEqual(combat);
    expect(screen.queryByText(/Movimiento agotado|No es tu turno/)).not.toBeInTheDocument();
    expect(container.querySelector('[data-movement-preview], [data-forced-movement-preview]')).toBeNull();
    expect(container.querySelector('[data-token-movement-ghost]')).toBeNull();
    expect(button).toHaveAttribute('aria-pressed', 'true');
});

test.each([false, true])('paste puts a copied token under the current cursor inside closed walls (pan and zoom=%s)', async transform => {
    const store = installCampaignStore();
    const path = 'canvas_scenarios/smoke-canvas';
    const token = { id: 'original', type: 'token', name: 'Enemigo copiado', profileType: 'rogueliteEnemy',
        x: 5800, y: 5800, width: 40, height: 40, status: ['derribado'],
        stats: { vida: { current: 7, max: 20 } }, inventory: [{ name: 'Lengua', type: 'ability', image: '/lengua.webp' }] };
    const walls = [[6000, 6000, 6240, 6000], [6240, 6000, 6240, 6240], [6240, 6240, 6000, 6240], [6000, 6240, 6000, 6000]]
        .map(([x1, y1, x2, y2], index) => ({ id: `wall-${index}`, type: 'wall', x1, y1, x2, y2,
            x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.max(5, Math.abs(x2 - x1)), height: Math.max(5, Math.abs(y2 - y1)) }));
    store[path] = { ...store[path], config: { ...store[path].config, snapToGrid: false }, items: [token, ...walls] };
    const { container } = render(<CanvasSection onBack={jest.fn()} isMaster />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    const viewport = container.querySelector('[data-tactical-viewport]');
    viewport.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 800, right: 1100, bottom: 850 });
    const element = container.querySelector('[data-board-item-id="original"]');
    fireEvent.mouseDown(element, { button: 0, clientX: 250, clientY: 250 });
    fireEvent.mouseUp(viewport, { clientX: 250, clientY: 250 });
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    if (transform) {
        fireEvent.wheel(viewport, { deltaY: -100 });
        fireEvent.mouseDown(viewport, { button: 1, clientX: 400, clientY: 300 });
        fireEvent.mouseMove(viewport, { clientX: 510, clientY: 355 });
        fireEvent.mouseUp(viewport, { clientX: 510, clientY: 355 });
    }
    const zoom = transform ? 1.1 : 1;
    const pan = transform ? { x: 110, y: 55 } : { x: 0, y: 0 };
    const pointer = { x: 600 + pan.x + 120 * zoom, y: 450 + pan.y + 120 * zoom };
    fireEvent.mouseMove(viewport, { clientX: pointer.x, clientY: pointer.y });
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
    await waitFor(() => expect(store[path].items).toHaveLength(6));
    const pasted = store[path].items.find(item => item.type === 'token' && item.id !== 'original');
    expect(pasted.x).toBeCloseTo(6100);
    expect(pasted.y).toBeCloseTo(6100);
    expect(pasted.stats).toEqual(token.stats);
    expect(pasted.inventory).toEqual(token.inventory);
    expect(store[path].items.find(item => item.id === token.id)).toMatchObject({ x: 5800, y: 5800 });
    expect(store[path].items.filter(item => item.type === 'wall')).toEqual(walls);
    expect(screen.queryByText(/Movimiento bloqueado|No puedes atravesar/)).not.toBeInTheDocument();
});

test.each(['ctrlKey', 'metaKey'])('clipboard recovers after editing and closing the inspector, including quick uppercase shortcuts (%s)', async modifier => {
    const store = installCampaignStore();
    const path = 'canvas_scenarios/smoke-canvas';
    const zone = { id: 'zone', type: 'geometry', geometryKind: 'circle', shapeType: 'circle', isCircular: true,
        name: 'Zona persistente', x: 5900, y: 5900, width: 160, height: 160, rotation: 0,
        backgroundColor: '#60a5fa', opacity: 0.3, snapToGrid: false };
    store[path] = { ...store[path], items: [zone] };
    const { container } = render(<CanvasSection onBack={jest.fn()} isMaster />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    const sidebar = container.querySelector('[data-tactical-sidebar]');
    expect(sidebar).toHaveAttribute('inert');
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(screen.getByTitle('Capa de Tapete / Áreas'));
    fireEvent.doubleClick(container.querySelector('[data-board-item-id="zone"]'));
    expect(sidebar).not.toHaveAttribute('inert');
    const name = screen.getByDisplayValue(zone.name);
    name.focus();
    expect(name).toHaveFocus();
    expect(fireEvent.keyDown(name, { key: 'v', [modifier]: true })).toBe(true);
    expect(store[path].items).toHaveLength(1);
    fireEvent.click(sidebar.querySelector('button'));
    expect(name).not.toHaveFocus();
    expect(sidebar).toHaveAttribute('inert');
    const viewport = container.querySelector('[data-tactical-viewport]');
    viewport.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 800 });
    fireEvent.mouseDown(container.querySelector('[data-board-item-id="zone"]'), { button: 0, clientX: 200, clientY: 200 });
    fireEvent.mouseUp(viewport, { clientX: 200, clientY: 200 });
    expect(viewport).toHaveFocus();
    fireEvent.mouseMove(viewport, { clientX: 720, clientY: 600 });
    // Both native events arrive before React needs to render a clipboard state update.
    act(() => {
        fireEvent.keyDown(viewport, { key: 'C', [modifier]: true });
        fireEvent.keyDown(viewport, { key: 'V', [modifier]: true });
    });
    await waitFor(() => expect(store[path].items).toHaveLength(2));
    expect(store[path].items[1]).toMatchObject({ geometryKind: 'circle', isCircular: true, width: 160, height: 160 });
    fireEvent.mouseMove(viewport, { clientX: 800, clientY: 650 });
    fireEvent.keyDown(viewport, { key: 'v', [modifier]: true });
    await waitFor(() => expect(store[path].items).toHaveLength(3));
});

test.each(['mouse', 'touch', 'phone'])('one normal master drop with %s commits one enemy movement to the encounter', async input => {
    if (input === 'phone') window.innerWidth = 412;
    const store = installCampaignStore();
    const path = 'canvas_scenarios/smoke-canvas';
    const enemy = { id: 'enemy', type: 'token', name: 'Guardián', layer: 'TOKEN', profileType: 'rogueliteEnemy',
        rulesSystem: 'campaign', teamId: 'enemies', fixedInitiative: 8, x: 5960, y: 5960, width: 40, height: 40,
        stats: { vida: { current: 12, max: 12 }, movimiento: { current: 2, max: 2 } } };
    const combat = createCanvasCombatState([enemy], { rulesSystem: 'campaign' });
    store[path] = { ...store[path], items: [enemy], canvasCombat: combat };
    const { container } = render(<CanvasSection onBack={jest.fn()} isMaster />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    const element = container.querySelector('[data-board-item-id="enemy"]');
    const viewport = container.querySelector('[data-tactical-viewport]');
    const { runTransaction } = require('firebase/firestore');
    runTransaction.mockClear();
    if (input !== 'mouse') {
        fireEvent.touchStart(element, { touches: [{ clientX: 10, clientY: 10, identifier: 1 }] });
        fireEvent.touchMove(viewport, { touches: [{ clientX: 90, clientY: 10, identifier: 1 }] });
        fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 90, clientY: 10, identifier: 1 }], touches: [] });
    } else {
        fireEvent.mouseDown(element, { button: 0, clientX: 10, clientY: 10 });
        fireEvent.mouseMove(viewport, { clientX: 90, clientY: 10 });
        fireEvent.mouseUp(viewport, { clientX: 90, clientY: 10 });
    }
    await act(async () => {});
    expect(store[path].items[0]).toMatchObject({ x: 6040, y: 5960, stats: { movimiento: { current: 1 } } });
    expect(store[path].canvasCombat.participants.enemy.movementRuntime).toMatchObject({
        spent: 1, history: [expect.objectContaining({ from: { x: 5960, y: 5960 }, to: { x: 6040, y: 5960 } })],
    });
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Error al confirmar movimiento')).not.toBeInTheDocument();
    expect(container.querySelector('[data-token-movement-ghost]')).toBeNull();
});

test('player confirms a dragged movement with the first Fin turno and ends the turn with the next press', async () => {
    const store = installCampaignStore();
    const path = 'canvas_scenarios/smoke-canvas';
    const token = { id: 'hero', name: 'Yerma de prueba', type: 'token', layer: 'TOKEN', profileType: 'campaignCharacter',
        rulesSystem: 'campaign', controlledBy: ['Ada'], hasVision: true, x: 5960, y: 5960, width: 40, height: 40,
        status: [], stats: { vida: { current: 10, max: 28 }, movimiento: { current: 2, max: 2 } }, actionDice: ['d6', 'd6', 'd6'] };
    let combat = createCanvasCombatState([token], { rulesSystem: 'campaign' });
    combat = submitActionDice(combat, token.id, [6, 4, 2]);
    store[path] = { ...store[path], items: [token], canvasCombat: combat };
    const { container } = render(<CanvasSection onBack={jest.fn()} isPlayerView playerName="Ada" currentUserId="Ada" />);
    const element = await waitFor(() => {
        const item = container.querySelector('[data-board-item-id="hero"]');
        expect(item).not.toBeNull(); return item;
    });
    const viewport = container.querySelector('[data-tactical-viewport]');
    fireEvent.mouseDown(element, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(viewport, { clientX: 80, clientY: 0 });
    fireEvent.mouseUp(viewport, { clientX: 80, clientY: 0 });
    expect(store[path].items[0].x).toBe(5960);
    expect(container.querySelector('[data-token-movement-ghost="hero"]')).toBeInTheDocument();
    expect(container.querySelector('line[stroke-dasharray="6 4"]')).toBeInTheDocument();
    expect(screen.getByTitle('1 casillas · base 2')).toBeInTheDocument();
    const finish = await screen.findByTitle('Finalizar turno y confirmar el movimiento');
    fireEvent.click(finish);
    await waitFor(() => expect(store[path].items[0].x).toBeGreaterThan(5960));
    expect(store[path].canvasCombat.blocks[0].actedIds).not.toContain('hero');
    expect(store[path].canvasCombat.participants.hero.movementRuntime.spent).toBe(1);
    fireEvent.click(finish);
    await waitFor(() => expect(store[path].canvasCombat.blocks[0].actedIds).toContain('hero'));
    expect(store[path].canvasCombat.participants.hero.movementRuntime.spent).toBe(1);
});

test('the master places and edits a tree from the Canvas library with persisted geometry', async () => {
    const store = installCampaignStore();
    const { container } = render(<CanvasSection onBack={jest.fn()} />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir panel del encuentro' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tokens', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Solo tronco' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Árbol verde A1' }));
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].items).toHaveLength(1));
    const tree = store['canvas_scenarios/smoke-canvas'].items[0];
    expect(tree).toMatchObject({ type: 'geometry', geometryKind: 'tree', treeVisionMode: 'trunk' });
    expect(container.querySelector('[data-tree-scenery]')).not.toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Copa completa' }));
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].items[0].treeVisionMode).toBe('canopy'));
    fireEvent.change(screen.getByLabelText('Giro · grados'), { target: { value: '90' } });
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].items[0].rotation).toBe(90));
    fireEvent.change(screen.getByLabelText('Ancho · casillas'), { target: { value: '3' } });
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].items[0].width).toBe(240));
});

test.each(['campaign', 'roguelite'])('a %s hazard keeps its default stripes and saves its appearance immediately', async system => {
    const store = installCampaignStore(system);
    const path = 'canvas_scenarios/smoke-canvas';
    store[path].config.cellHeight = 64;
    const { container } = render(<CanvasSection onBack={jest.fn()} isMaster />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    fireEvent.click(screen.getByTitle('Capa de Tapete / Áreas'));
    fireEvent.click(screen.getByTitle('Añadir Terreno Peligroso'));
    await waitFor(() => expect(store[path].items).toHaveLength(1));

    const hazard = store[path].items[0];
    expect(hazard).toMatchObject({ geometryKind: 'hazard', width: 160, height: 128 });
    expect(hazard.hazardArtId).toBeUndefined();
    const zone = container.querySelector(`[data-board-item-id="${hazard.id}"]`);
    expect(zone.querySelector('pattern[id^="hazard-stripes-"]')).toBeInTheDocument();
    fireEvent.doubleClick(zone);

    const stripes = await screen.findByRole('button', { name: 'Rayado' });
    const caltrops = screen.getByRole('button', { name: 'Abrojos' });
    expect(stripes).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(caltrops);
    await waitFor(() => expect(store[path].items[0]).toMatchObject({ ...hazard, hazardArtId: 'caltrops' }));
    expect(caltrops).toHaveAttribute('aria-pressed', 'true');
    expect(zone.querySelector('[data-hazard-art="caltrops"]')).toBeInTheDocument();
    expect(zone.querySelector('pattern[id^="hazard-stripes-"]')).not.toBeInTheDocument();

    fireEvent.click(stripes);
    await waitFor(() => expect(store[path].items[0].hazardArtId).toBeNull());
    expect(zone.querySelector('pattern[id^="hazard-stripes-"]')).toBeInTheDocument();
});

test('campaign entry spawns from saved campaign stats and shows a continuous point crown', async () => {
    const store = installCampaignStore();
    const { container, unmount } = render(<CanvasSection onBack={jest.fn()} playerName="Ada" currentUserId="Ada"
        isPlayerView isMaster={false} characterData={{ id: 'yerma', owner: 'Ada', name: 'Yerma', profileType: 'campaignCharacter' }} />);
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].items).toHaveLength(1));
    const token = store['canvas_scenarios/smoke-canvas'].items[0];
    expect(token).toMatchObject({ profileType: 'campaignCharacter', linkedCharacterId: 'yerma', actionDice: ['d10', 'd4', 'd4'], stats: { vida: { current: 53, max: 60 } } });
    await waitFor(() => expect(container.querySelector('[data-life-continuous]')).not.toBeNull());
    expect(container.querySelector('[data-life-block]')).toBeNull();
    fireEvent.doubleClick(container.querySelector(`[data-board-item-id="${token.id}"]`));
    expect(await screen.findByRole('textbox', { name: 'Vida actual' })).toHaveValue('53');
    fireEvent.change(screen.getByRole('textbox', { name: /Impacto/ }), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar daño' }));
    expect(screen.getByRole('textbox', { name: 'Vida actual' })).toHaveValue('42');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Cambios' }));
    await waitFor(() => expect(store['campaignCharacterSheets/yerma'].vida.current).toBe(42));
    expect(store['campaignCharacterSheets/yerma'].personalities.yerma.vida.current).toBe(42);
    expect(store['campaignCharacterSheets/yerma'].yermo).toBe('53');
    expect(store['characters/yerma'].stats).toBeUndefined();
    unmount();
});

test('master changes the saved encounter system from configuration and can switch back', async () => {
    const store = installCampaignStore('roguelite');
    render(<CanvasSection onBack={jest.fn()} />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir panel del encuentro' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Configuración' }));
    fireEvent.click(screen.getByRole('button', { name: 'Campaña', exact: true }));
    expect(store['canvas_scenarios/smoke-canvas'].rulesSystem).toBe('roguelite');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Cambios' }));
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].rulesSystem).toBe('campaign'));
    await screen.findByText('Canvas · Campaña');
    fireEvent.click(screen.getByRole('button', { name: 'Roguelite', exact: true }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar Cambios' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Cambios' }));
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].rulesSystem).toBe('roguelite'));
});

test('master reopens a saved Campaign encounter and prepares initiative for its character tokens', async () => {
    const store = installCampaignStore('campaign');
    const { syncCampaignToken } = require('../../features/canvas/campaignSystem');
    store['canvas_scenarios/smoke-canvas'].items = [syncCampaignToken({ id: 'yerma-token', layer: 'TOKEN', x: 4960, y: 4960, width: 80, height: 80 }, {
        ...store['characters/yerma'], campaignSheet: store['campaignCharacterSheets/yerma'],
    })];
    render(<CanvasSection onBack={jest.fn()} />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    await screen.findByText('Canvas · Campaña');
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir panel del encuentro' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ronda', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar combate' }));
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].canvasCombat?.participants?.['yerma-token'])
        .toMatchObject({ name: 'Yerma', side: 'players', actionDiceProfile: ['d10', 'd4', 'd4'], awaitingRoll: true }));
    expect(await screen.findByRole('button', { name: 'Tirar aquí' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tirar aquí' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Empezar combate' })).toBeEnabled());
    expect(store['canvas_scenarios/smoke-canvas'].canvasCombat.roundPhase).toBe('rolling');
    fireEvent.click(screen.getByRole('button', { name: 'Empezar combate' }));
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].canvasCombat?.roundPhase).toBe('turns'));
    expect(store['canvas_scenarios/smoke-canvas'].canvasCombat.participants['yerma-token'].initiative).toBeGreaterThan(0);
});

test.each(['roguelite', 'campaign'])('image selector creates a %s token with resources and round actions', async system => {
    const store = installCampaignStore(system);
    store['canvas_tokens/library-image'] = { url: '/test-token.webp', name: 'Imagen de prueba', createdAt: 1 };
    const { container } = render(<CanvasSection onBack={jest.fn()} />);
    fireEvent.click(await screen.findByText('Smoke canvas'));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir panel del encuentro' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tokens', exact: true }));
    fireEvent.click(await screen.findByTitle('Arrastra para reordenar, click para añadir al mapa'));
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].items).toHaveLength(1));
    const token = store['canvas_scenarios/smoke-canvas'].items[0];
    expect(token).toMatchObject({ profileType: 'rogueliteEnemy', rulesSystem: system, linkedEnemyId: null,
        img: '/test-token.webp', fixedInitiative: 2, stats: { vida: { current: 6, max: 6 } } });
    expect(token.stats[system === 'campaign' ? 'armadura' : 'cd']).toBeDefined();
    expect(token.stats[system === 'campaign' ? 'cd' : 'armadura']).toBeUndefined();
    fireEvent.doubleClick(container.querySelector(`[data-board-item-id="${token.id}"]`));
    if (system === 'campaign') {
        expect(await screen.findByRole('textbox', { name: 'RD actual' })).toHaveValue('0');
        expect(container.querySelector('[data-life-continuous]')).not.toBeNull();
    } else {
        expect(await screen.findByTestId('roguelite-token-resources')).toBeInTheDocument();
        expect(container.querySelector('[data-life-block]')).not.toBeNull();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Ronda', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar combate' }));
    await waitFor(() => expect(store['canvas_scenarios/smoke-canvas'].canvasCombat?.participants?.[token.id])
        .toMatchObject({ side: 'enemies', initiative: 2 }));
    expect(store['canvas_scenarios/smoke-canvas'].canvasCombat.participants[token.id].enemyActions.map(action => action.id))
        .toEqual(system === 'campaign' ? ['movement', 'attack', 'defense'] : ['movement', 'attack']);
});

test('a campaign character cannot enter a roguelite encounter using old statistics', async () => {
    const store = installCampaignStore('roguelite');
    render(<CanvasSection onBack={jest.fn()} playerName="Ada" currentUserId="Ada" isPlayerView isMaster={false}
        characterData={{ id: 'yerma', name: 'Yerma', profileType: 'campaignCharacter' }} />);
    expect(await screen.findByText(/El encuentro está en modo Roguelite/)).toBeInTheDocument();
    expect(store['canvas_scenarios/smoke-canvas'].items).toHaveLength(0);
});

test('creates a Roguelite class token in the active Canvas encounter', async () => {
    const firestore = require('firebase/firestore');
    let scenario = {
        ...makeScenario('canvas'),
        allowedPlayers: ['Ada'],
        items: [],
    };
    let persistedItems = null;
    let persistedRun = null;
    let confirmScenarioWrite;
    let transactionCount = 0;
    const sceneListeners = new Set();
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

        let committedPatch = null;
        const result = await callback({
            get: jest.fn((reference) => Promise.resolve(
                reference?.path === 'players/Ada/rogueliteClasses/barbarian'
                    ? { exists: () => false, data: () => ({}) }
                    : { exists: () => true, data: () => scenario },
            )),
            update: jest.fn((_reference, payload) => {
                persistedItems = payload.items;
                committedPatch = { ...committedPatch, ...payload };
            }),
            set: jest.fn((_reference, payload) => {
                persistedRun = payload.activeRun;
            }),
        });
        if (committedPatch) {
            scenario = { ...scenario, ...committedPatch };
            sceneListeners.forEach(listener => listener({ id: scenario.id, exists: () => true, data: () => scenario }));
        }
        return result;
    });
    firestore.onSnapshot.mockImplementation((ref, onNext) => {
        if (ref?.path === 'gameSettings/canvasVisibility') {
            onNext({ exists: () => true, data: () => ({ activeScenarioId: scenario.id }) });
        } else if (ref?.path === `canvas_scenarios/${scenario.id}`) {
            sceneListeners.add(onNext);
            onNext({ id: scenario.id, exists: () => true, data: () => scenario });
        } else if (ref?.path === 'canvas_scenarios') {
            onNext({ docs: [{ id: scenario.id, data: () => scenario }], forEach: () => {}, docChanges: () => [] });
        } else {
            onNext({ docs: [], forEach: () => {}, docChanges: () => [] });
        }
        return () => sceneListeners.delete(onNext);
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
