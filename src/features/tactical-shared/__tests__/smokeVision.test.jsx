import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SmokeVisionMask from '../components/SmokeVisionMask';
import {
    canViewerSeeCanvasToken, getCanvasSmokePerspective, getCanvasRenderItemsForViewer,
    isTokenInsideSmokeArea, isTokenFullyInsideSmokeArea, isTokenPartiallyInsideSmokeArea,
    canTokenSeeThroughSmoke, resolveHiddenDetectionAlongMovement,
    getCanvasTokenFogDensity, getCanvasCommittedVisionItems,
} from '../tokenVisibilityAccess';

const token = (id, x, controlledBy = [], teamId = '') => ({
    id, type: 'token', x, y: 10, width: 20, height: 20, hasVision: true, controlledBy, teamId,
});
const smoke = { id: 'smoke', type: 'geometry', geometryKind: 'smoke', x: 100, y: 0, width: 100, height: 100 };
const hero = token('hero', 10, ['Ada'], 'party');
const ally = token('ally', 110, ['Ben'], 'party');
const enemy = token('enemy', 150);
const guard = token('guard', 300);
const stranger = token('stranger', 170, ['Cora'], 'other');
const items = [hero, ally, enemy, guard, stranger, smoke];
const player = { isPlayerView: true, playerName: 'Ada' };
const visible = viewer => getCanvasRenderItemsForViewer(items, viewer).map(item => item.id);

test('overview unions controlled and same-team observers on both sides of smoke', () => {
    expect(visible(player)).toEqual(items.filter(item => item.id !== 'guard').map(item => item.id));
    expect(visible({})).toEqual(items.filter(item => item.id !== 'hero').map(item => item.id));
});

test('a focused player outside cannot see inside even through allied ownership', () => {
    expect(visible({ ...player, selectedTokenIds: ['hero'] })).toEqual(['hero', 'smoke']);
});

test('a focused observer inside sees every faction inside and no outside tokens', () => {
    expect(visible({ ...player, selectedTokenIds: ['ally'] })).toEqual(['ally', 'enemy', 'stranger', 'smoke']);
    expect(visible({ selectedTokenIds: ['enemy'] })).toEqual(['ally', 'enemy', 'stranger', 'smoke']);
    expect(visible({ selectedTokenIds: ['guard'] })).toEqual(['guard', 'smoke']);
});

test('unshared smoke is concealed from both master and players outside', () => {
    const isolated = [hero, stranger, guard, smoke];
    expect(canViewerSeeCanvasToken(stranger, isolated, player)).toBe(false);
    expect(canViewerSeeCanvasToken(stranger, isolated, {})).toBe(false);
    expect(canViewerSeeCanvasToken(stranger, isolated, { showHiddenTokens: true })).toBe(true);
    expect(canViewerSeeCanvasToken(stranger, isolated, { ...player, showHiddenTokens: true })).toBe(false);
});

test('separate smoke areas do not share vision; moving and removing smoke restores vision', () => {
    const second = { ...smoke, id: 'second', x: 300 };
    const scene = [...items, second];
    const viewer = { selectedTokenIds: ['enemy'] };
    expect(canViewerSeeCanvasToken(guard, scene, viewer)).toBe(false);
    expect(canViewerSeeCanvasToken(guard, scene.filter(item => item.id !== 'smoke'), viewer)).toBe(false);
    expect(canViewerSeeCanvasToken(guard, items.filter(item => item.id !== 'smoke'), viewer)).toBe(true);
    expect(isTokenInsideSmokeArea({ ...hero, x: 81 }, items)).toBe(true);
    expect(isTokenInsideSmokeArea({ ...hero, x: 80 }, items)).toBe(false);
    const moved = items.map(item => item.id === 'enemy' ? { ...item, x: 250 } : item);
    expect(canViewerSeeCanvasToken(guard, moved, viewer)).toBe(true);
    expect(canViewerSeeCanvasToken(stranger, moved, viewer)).toBe(false);
});

test('explicit hidden status remains distinct from environmental smoke', () => {
    const hidden = { ...stranger, status: ['oculto'] };
    expect(canViewerSeeCanvasToken(hidden, [...items, hidden], { selectedTokenIds: ['enemy'] })).toBe(false);
});

test('smoke permits targeting inside and blocks both directions across its boundary', () => {
    expect(canTokenSeeThroughSmoke(enemy, stranger, items)).toBe(true);
    expect(canTokenSeeThroughSmoke(hero, enemy, items)).toBe(false);
    expect(canTokenSeeThroughSmoke(enemy, hero, items)).toBe(false);
    expect(canTokenSeeThroughSmoke(hero, guard, items)).toBe(false);
});

test('a large token partially inside smoke participates in both interior and exterior vision', () => {
    const partial = { ...token('partial', 100), y: -100, width: 100, height: 200 };
    const above = { ...token('above', 120), y: -180 };
    const below = { ...token('below', 120), y: 150 };
    const inside = { ...token('inside', 120), y: 20 };
    const scene = [partial, above, below, inside, smoke];

    expect(isTokenInsideSmokeArea(partial, scene)).toBe(true);
    expect(isTokenPartiallyInsideSmokeArea(partial, scene)).toBe(true);
    expect(isTokenFullyInsideSmokeArea(partial, scene)).toBe(false);
    expect(canTokenSeeThroughSmoke(partial, inside, scene)).toBe(true);
    expect(canTokenSeeThroughSmoke(inside, partial, scene)).toBe(true);
    expect(canTokenSeeThroughSmoke(partial, above, scene)).toBe(true);
    expect(canTokenSeeThroughSmoke(above, partial, scene)).toBe(true);
    expect(canTokenSeeThroughSmoke(partial, below, scene)).toBe(false);
    expect(canTokenSeeThroughSmoke(below, partial, scene)).toBe(false);
    const perspective = getCanvasSmokePerspective(scene, { selectedTokenIds: ['partial'] });
    expect(perspective.outsideVisible).toBe(true);
    expect(perspective.visibleAreas.has(smoke)).toBe(true);
    expect(canViewerSeeCanvasToken(inside, scene, { selectedTokenIds: ['partial'] })).toBe(true);
    expect(canViewerSeeCanvasToken(above, scene, { selectedTokenIds: ['partial'] })).toBe(true);
    expect(canViewerSeeCanvasToken(below, scene, { selectedTokenIds: ['partial'] })).toBe(false);
});

test('a drag and an unconfirmed turn retain the starting view until movement is committed', () => {
    const starting = { ...token('starting', 120, ['Ada']), y: 20 };
    const outside = { ...token('outside', 250), y: 20 };
    const preview = { ...starting, x: 220 };
    const scene = [preview, outside, smoke];
    const viewer = { ...player, selectedTokenIds: ['starting'] };
    const origin = { x: starting.x, y: starting.y };
    const dragging = getCanvasCommittedVisionItems(scene, {
        draggedTokenId: 'starting', tokenOriginalPos: { starting: origin }, isPlayerView: true,
    });
    expect(dragging[0]).toMatchObject(origin);
    expect(canViewerSeeCanvasToken(outside, dragging, viewer)).toBe(false);
    expect(getCanvasSmokePerspective(dragging, viewer).outsideVisible).toBe(false);
    expect(canViewerSeeCanvasToken(outside, scene, viewer)).toBe(true);

    const pending = { tokenId: 'starting', startX: starting.x, startY: starting.y, x: preview.x, y: preview.y };
    const awaitingConfirmation = getCanvasCommittedVisionItems(scene, {
        pendingTurnState: pending, isPlayerView: true,
    });
    expect(canViewerSeeCanvasToken(outside, awaitingConfirmation, viewer)).toBe(false);
    expect(getCanvasCommittedVisionItems(scene, {
        draggedTokenId: 'starting', tokenOriginalPos: { starting: { x: 210, y: 20 } },
        pendingTurnState: pending, isPlayerView: true,
    })[0]).toMatchObject(origin);
    expect(getCanvasCommittedVisionItems(scene)).toBe(scene);
});

test('a 3x3 footprint remains targetable when a 2x2 smoke area covers only four cells', () => {
    const cloud = { ...smoke, x: 100, y: 50, width: 100, height: 100 };
    const large = { ...token('large', 100), y: 0, width: 150, height: 150 };
    const exposedObserver = { ...token('observer', 150), y: -100 };
    const scene = [large, exposedObserver, cloud];

    expect(isTokenPartiallyInsideSmokeArea(large, scene)).toBe(true);
    expect(canTokenSeeThroughSmoke(exposedObserver, large, scene)).toBe(true);
    expect(canViewerSeeCanvasToken(large, scene, { selectedTokenIds: ['observer'] })).toBe(true);
});

test('a large token fully covered by connected smoke remains an interior resident', () => {
    const large = { ...token('large', 100), y: 0, width: 100, height: 100 };
    const inside = { ...token('inside', 120), y: 20 };
    const outside = { ...token('outside', 120), y: -80 };
    const scene = [large, inside, outside, smoke];

    expect(isTokenFullyInsideSmokeArea(large, scene)).toBe(true);
    expect(isTokenPartiallyInsideSmokeArea(large, scene)).toBe(false);
    expect(canTokenSeeThroughSmoke(inside, large, scene)).toBe(true);
    expect(canTokenSeeThroughSmoke(outside, large, scene)).toBe(false);
});

test('contact inside smoke does not repeatedly reveal or stop environmental concealment', () => {
    const result = resolveHiddenDetectionAlongMovement({
        movingToken: ally, from: { x: 110, y: 10 }, to: { x: 180, y: 10 }, items,
        config: { cellWidth: 50, cellHeight: 50, offsetX: 0, offsetY: 0 },
    });
    expect(result.detected).toBe(false);
    expect(result.stopped).toBe(false);
    expect(isTokenInsideSmokeArea({ ...ally, ...result.finalPosition }, items)).toBe(true);
});

test('smoke dims the exterior by 50 percent while preserving radial vision and a clear interior', () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const perspective = getCanvasSmokePerspective(items, { selectedTokenIds: ['enemy'] });
    expect(perspective.outsideVisible).toBe(false);
    const html = renderToStaticMarkup(<svg><SmokeVisionMask perspective={perspective} bounds={bounds} /></svg>);
    expect(html).toContain('width="1000" height="800" fill="white" fill-opacity="0.5"');
    expect(html).toContain('data-smoke-memory-veil="true"');
    expect(html).toContain('fill="black" data-smoke-interior="smoke"');
    expect(getCanvasSmokePerspective(items, {}).outsideVisible).toBe(true);
    expect(getCanvasSmokePerspective(items, { showHiddenTokens: true }).bypass).toBe(true);
});

test('outside observers can see the cloud through the ordinary map visibility mask', () => {
    const perspective = getCanvasSmokePerspective(items, { ...player, selectedTokenIds: ['hero'] });
    const html = renderToStaticMarkup(<svg><SmokeVisionMask perspective={perspective} /></svg>);
    expect(html).not.toContain('<rect');
    expect(visible({ ...player, selectedTokenIds: ['hero'] })).toEqual(['hero', 'smoke']);
});

test('exclusive smoke perspective keeps all resident portraits clear with 20 percent fog', () => {
    for (const resident of [ally, enemy, stranger]) {
        expect(getCanvasTokenFogDensity(resident, items, { selectedTokenIds: ['enemy'] })).toBe(0.2);
        expect(getCanvasTokenFogDensity(resident, items, { ...player, selectedTokenIds: ['ally'] })).toBe(0.2);
        expect(getCanvasTokenFogDensity(resident, items, {})).toBe(0.65);
    }
    expect(getCanvasTokenFogDensity(hero, items, player)).toBe(0);
    expect(getCanvasTokenFogDensity({ ...enemy, status: ['oculto'] }, items, { selectedTokenIds: ['enemy'] })).toBe(0.65);
});

test('partial overlap relies on the area artwork instead of fogging the whole portrait', () => {
    const partial = { ...enemy, id: 'partial', x: 100, y: -50, width: 100, height: 100 };
    expect(getCanvasTokenFogDensity(partial, [partial, smoke], { selectedTokenIds: ['partial'] })).toBe(0);
});

test('master selection stays visible after carrying an unshared player into smoke', () => {
    const scene = [hero, stranger, smoke];
    expect(canViewerSeeCanvasToken(stranger, scene, {})).toBe(false);
    expect(canViewerSeeCanvasToken(stranger, scene, { selectedTokenIds: ['stranger'] })).toBe(true);
});


test('a continuous cloud joins overlaps and shared edges but not disconnected areas', () => {
    const second = { ...smoke, id: 'second', x: 200 };
    const far = token('far', 250);
    const scene = [enemy, far, smoke, second];
    expect(canTokenSeeThroughSmoke(enemy, far, scene)).toBe(true);
    expect(getCanvasSmokePerspective(scene, { selectedTokenIds: ['enemy'] }).visibleAreas.size).toBe(2);
    expect(canTokenSeeThroughSmoke(enemy, far, [enemy, far, smoke, { ...second, x: 201 }])).toBe(false);
});

test('outside line of sight goes around smoke, restores after removal, and preserves master reveal', () => {
    const above = { ...guard, y: -180 };
    expect(canTokenSeeThroughSmoke(hero, above, [...items, above])).toBe(true);
    expect(canTokenSeeThroughSmoke(hero, guard, items.filter(item => item !== smoke))).toBe(true);
    expect(canViewerSeeCanvasToken(guard, items, { selectedTokenIds: ['hero'], showHiddenTokens: true })).toBe(true);
});
