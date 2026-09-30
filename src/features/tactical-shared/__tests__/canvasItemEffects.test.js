import { canShowCanvasItemEffect, createLiveItemEffectGate } from '../canvasItemEffects';

const entry = (id, time) => ({ sourceEventId: id, clientTimestamp: time });
test('history never replays on initial load or re-entering, but a new committed use does', () => {
    const gate = createLiveItemEffectGate({ now: 100 });
    expect(gate.accept(entry('old', 99), { now: 101 })).toBe(false);
    gate.finishSnapshot();
    expect(gate.accept(entry('new', 120), { now: 121 })).toBe(true);
    expect(gate.accept(entry('new', 120), { now: 122 })).toBe(false);
    const remounted = createLiveItemEffectGate({ now: 130 });
    expect(remounted.accept(entry('new', 120), { now: 131 })).toBe(false);
    remounted.finishSnapshot();
    expect(remounted.accept(entry('uncached-history', 110), { now: 132 })).toBe(false);
});

test('returning online ignores missed events but immediately accepts the next live use', () => {
    const gate = createLiveItemEffectGate({ now: 100 });
    gate.finishSnapshot();
    gate.reset(300);
    expect(gate.accept(entry('missed', 299), { now: 301 })).toBe(false);
    expect(gate.accept(entry('live', 302), { now: 303 })).toBe(true);
});

test('old, future and background-tab events do not animate later', () => {
    const gate = createLiveItemEffectGate({ now: 100 });
    gate.finishSnapshot();
    expect(gate.accept(entry('stale', 101), { now: 6000 })).toBe(false);
    expect(gate.accept(entry('future', 10000), { now: 200 })).toBe(false);
    expect(gate.accept(entry('hidden', 150), { now: 160, visible: false })).toBe(false);
    expect(gate.accept(entry('hidden', 150), { now: 170 })).toBe(false);
});

test('a pending local write or unresolved timestamp never consumes the committed animation id', () => {
    const gate = createLiveItemEffectGate({ now: 100 });
    gate.finishSnapshot();
    expect(gate.accept(entry('local', 120), { now: 121, pending: true })).toBe(false);
    expect(gate.accept(entry('local', 0), { now: 122 })).toBe(false);
    expect(gate.accept({ ...entry('local', 120), timestamp: { toMillis: () => 125 } }, { now: 126 })).toBe(true);
    expect(gate.accept(entry('local', 120), { now: 127 })).toBe(false);
});

const token = (id, x, overrides = {}) => ({ id, type: 'token', x, y: 0, width: 40, height: 40,
    hasVision: true, visionRadius: 300, ...overrides });
const hero = token('hero', 0, { controlledBy: ['Ada'], teamId: 'party' });
const enemy = token('enemy', 150, { controlledBy: ['master'] });
const viewer = { isPlayerView: true, playerName: 'Ada' };
const visible = (target, extras = [], overrides = {}) => canShowCanvasItemEffect({ token: target,
    items: [hero, target, ...extras], viewer, gridConfig: { fogOfWar: true }, ...overrides });

test('effects are visible only inside the actual vision radius while fog is enabled', () => {
    expect(visible(enemy)).toBe(true);
    expect(visible({ ...enemy, x: 400 })).toBe(false);
    expect(visible({ ...enemy, x: 400 }, [], { gridConfig: { fogOfWar: false } })).toBe(true);
    expect(visible(enemy, [], { viewer: { isPlayerView: true, playerName: 'Nobody' } })).toBe(false);
});

test.each([
    [{ wallType: 'solid' }, false],
    [{ wallType: 'door', isOpen: false }, false],
    [{ wallType: 'door', isOpen: true }, true],
    [{ wallType: 'window' }, true],
])('wall visibility respects %j', (properties, expected) => {
    const wall = { id: 'wall', type: 'wall', x1: 100, y1: -100, x2: 100, y2: 100, ...properties };
    expect(visible(enemy, [wall])).toBe(expected);
});

test('a hidden or smoke-isolated token never emits a revealing effect, including fog disabled', () => {
    const smoke = { id: 'cloud', type: 'geometry', geometryKind: 'smoke', x: 120, y: -50, width: 100, height: 150 };
    expect(visible(enemy, [smoke])).toBe(false);
    expect(visible(enemy, [smoke], { gridConfig: { fogOfWar: false } })).toBe(false);
    expect(visible({ ...enemy, status: ['oculto'] })).toBe(false);
    expect(visible(null)).toBe(false);
});

test('shared vision works in overview; focused vision and master overview retain their rules', () => {
    const ally = token('ally', 500, { controlledBy: ['Ben'], teamId: 'party' });
    const distant = { ...enemy, x: 600 };
    expect(visible(distant, [ally])).toBe(true);
    expect(visible(distant, [ally], { viewer: { ...viewer, selectedTokenIds: ['hero'] } })).toBe(false);
    expect(visible(distant, [], { viewer: { isPlayerView: false } })).toBe(true);
    expect(visible(distant, [], { viewer: { isPlayerView: false, selectedTokenIds: ['hero'] } })).toBe(false);
});

test('uses the renderer shadow polygon including its extended wall corners', () => {
    const wall = { type: 'wall', x1: 100, y1: 21, x2: 100, y2: 100 };
    // The ray at y20 misses the raw segment, but the actual rendered shadow extends1.5px.
    expect(visible(enemy, [wall])).toBe(false);
});

test('during a drag the effect uses the same original observer/wall positions as the fog mask', () => {
    const wall = { id: 'wall', type: 'wall', x: 200, y: 0, x1: 200, y1: -100, x2: 200, y2: 100 };
    expect(visible(enemy, [wall])).toBe(true);
    expect(visible(enemy, [wall], { viewer: { ...viewer, selectedTokenIds: ['hero', 'wall'] },
        interaction: { active: true, originalPositions: { wall: { x: 100, y: 0 } } } })).toBe(false);
    const far = { ...enemy, x: 400 };
    expect(visible(far, [], { viewer: { ...viewer, selectedTokenIds: ['hero'] },
        interaction: { active: true, originalPositions: { hero: { x: 250, y: 0 } } } })).toBe(true);
});

test('lights and darkvision do not grant sight beyond the current fog-of-war circle', () => {
    const darkHero = { ...hero, hasDarkvision: true, darkvisionRadius: 1000 };
    const far = { ...enemy, x: 400 };
    const lamp = { type: 'light', x: 400, y: 0, width: 10, height: 10, radius: 300 };
    expect(visible(far, [], { items: [darkHero, far, lamp] })).toBe(false);
});
