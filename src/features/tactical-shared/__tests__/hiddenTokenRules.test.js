import {
    actionRevealsHidden,
    getCanvasRenderItemsForViewer,
    getHiddenSafeMovementPreviewItems,
    isTokenInsideSmokeArea,
    resolveHiddenDetectionAlongMovement,
    tokenHasHiddenStatus,
} from '../tokenVisibilityAccess';
import { getCombatRenderPlacement } from '../legacyCombatRules';

const config = { cellWidth: 50, cellHeight: 50, offsetX: 0, offsetY: 0 };
const token = (id, cellX, cellY, overrides = {}) => ({
    id,
    type: 'token',
    x: cellX * 50,
    y: cellY * 50,
    width: 25,
    height: 25,
    controlledBy: [],
    status: [],
    ...overrides,
});

describe('Oculto movement and reveal rules', () => {
    test('a rejected route through a wall cannot reveal a hidden occupant', () => {
        const mover = token('hero', 0, 0, { teamId: 'heroes' });
        const hidden = token('enemy', 2, 0, { teamId: 'enemies', status: ['oculto'] });
        const wall = { id: 'wall', type: 'wall', x1: 75, y1: -50, x2: 75, y2: 150 };
        const result = resolveHiddenDetectionAlongMovement({ movingToken: mover, from: mover,
            to: { x: 150, y: 0 }, items: [mover, hidden, wall], config });
        expect(result.detected).toBe(false);
        expect(result.revealedTokenIds).toEqual([]);
        expect(result.items.find(item => item.id === 'enemy').status).toEqual(['oculto']);
    });
    test('enemy previews do not expose a hidden hostile occupant', () => {
        const mover = token('enemy', 0, 0, { teamId: 'enemies' });
        const hidden = token('hidden', 1, 0, { teamId: 'heroes', status: ['oculto'] });

        expect(getHiddenSafeMovementPreviewItems(mover, [mover, hidden])).toEqual([mover]);
    });

    test('allied hidden occupants remain known during movement preview', () => {
        const mover = token('hero', 0, 0, { teamId: 'heroes' });
        const hiddenAlly = token('ally', 1, 0, { teamId: 'heroes', status: ['oculto'] });

        expect(getHiddenSafeMovementPreviewItems(mover, [mover, hiddenAlly])).toEqual([mover, hiddenAlly]);
    });

    test('reveals on the first touched step and stops a longer route there', () => {
        const mover = token('enemy', 0, 0, { teamId: 'enemies' });
        const hidden = token('hidden', 2, 0, { teamId: 'heroes', status: ['oculto'] });
        const result = resolveHiddenDetectionAlongMovement({
            movingToken: mover,
            from: { x: 0, y: 0 },
            to: { x: 200, y: 0 },
            items: [mover, hidden],
            config,
        });

        expect(result.detected).toBe(true);
        expect(result.blocked).toBe(false);
        expect(result.spentCost).toBe(2);
        expect(result.finalPosition).toEqual({ x: 112.5, y: 12.5 });
        expect(tokenHasHiddenStatus(result.items.find(({ id }) => id === 'hidden'))).toBe(false);
    });

    test('a full hidden formation reveals and blocks entry without spending the failed step', () => {
        const mover = token('enemy', 0, 0, { teamId: 'enemies' });
        const hiddenA = token('hidden-a', 1, 0, { teamId: 'heroes', status: ['oculto'] });
        const hiddenB = token('hidden-b', 1, 0, { teamId: 'heroes', status: ['oculto'] });
        const result = resolveHiddenDetectionAlongMovement({
            movingToken: mover,
            from: { x: 0, y: 0 },
            to: { x: 150, y: 0 },
            items: [mover, hiddenA, hiddenB],
            config,
        });

        expect(result.detected).toBe(true);
        expect(result.blocked).toBe(true);
        expect(result.spentCost).toBe(0);
        expect(result.finalPosition).toEqual({ x: 0, y: 0 });
        expect(result.revealedTokenIds).toEqual(expect.arrayContaining(['hidden-a', 'hidden-b']));
    });

    test('only counts cells traversed before a blocked hidden formation', () => {
        const mover = token('enemy', 0, 0, { teamId: 'enemies' });
        const hiddenA = token('hidden-a', 3, 0, { teamId: 'heroes', status: ['oculto'] });
        const hiddenB = token('hidden-b', 3, 0, { teamId: 'heroes', status: ['oculto'] });
        const result = resolveHiddenDetectionAlongMovement({
            movingToken: mover,
            from: { x: 0, y: 0 },
            to: { x: 250, y: 0 },
            items: [mover, hiddenA, hiddenB],
            config,
        });

        expect(result.blocked).toBe(true);
        expect(result.spentCost).toBe(2);
        expect(result.finalPosition).toEqual({ x: 112.5, y: 12.5 });
    });

    test('a hidden mover is revealed when it touches an enemy, including against a large token', () => {
        const hiddenMover = token('hidden', 0, 0, { teamId: 'heroes', status: ['oculto'] });
        const largeEnemy = token('large', 2, 0, { teamId: 'enemies', width: 100, height: 100 });
        const result = resolveHiddenDetectionAlongMovement({
            movingToken: hiddenMover,
            from: { x: 0, y: 0 },
            to: { x: 200, y: 0 },
            items: [hiddenMover, largeEnemy],
            config,
        });

        expect(result.detected).toBe(true);
        expect(result.revealedTokenIds).toContain('hidden');
        expect(result.blocked).toBe(true);
        expect(result.spentCost).toBe(1);
    });

    test('a hidden formation does not displace its visible member for an enemy viewer', () => {
        const observer = token('observer', 5, 0, { teamId: 'enemies', controlledBy: ['Ada'] });
        const visibleAlly = token('visible', 1, 0, { x: 62.5, y: 12.5, teamId: 'heroes' });
        const hiddenAlly = token('hidden', 1, 0, { x: 62.5, y: 12.5, teamId: 'heroes', status: ['oculto'] });
        const hiddenItems = [observer, visibleAlly, hiddenAlly];
        const enemyRenderItems = getCanvasRenderItemsForViewer(hiddenItems, {
            isPlayerView: true,
            playerName: 'Ada',
        });

        expect(enemyRenderItems.map(({ id }) => id)).toEqual(['observer', 'visible']);
        expect(getCombatRenderPlacement(visibleAlly, enemyRenderItems, config)).toEqual({ x: 62.5, y: 12.5 });

        const revealedItems = hiddenItems.map((item) => (
            item.id === hiddenAlly.id ? { ...item, status: [] } : item
        ));
        expect(getCombatRenderPlacement(visibleAlly, revealedItems, config).x).not.toBe(62.5);
    });

    test('attacks always reveal and other actions opt in with revelaOculto', () => {
        expect(actionRevealsHidden({ type: 'attack' })).toBe(true);
        expect(actionRevealsHidden({ actionId: 'attack' })).toBe(true);
        expect(actionRevealsHidden({ actionId: 'sweep' })).toBe(true);
        expect(actionRevealsHidden({ type: 'spell', revelaOculto: true })).toBe(true);
        expect(actionRevealsHidden({ type: 'move' })).toBe(false);
    });

    test('a persistent smoke area blocks vision without granting the Oculto status', () => {
        const observer = token('observer', 5, 0, { teamId: 'enemies', controlledBy: ['Ada'] });
        const concealed = token('concealed', 1, 1, { teamId: 'heroes' });
        const smoke = {
            id: 'smoke-zone',
            type: 'geometry',
            geometryKind: 'smoke',
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            areaEffect: { type: 'smoke', statusId: 'oculto' },
        };
        const items = [observer, concealed, smoke];

        expect(isTokenInsideSmokeArea(concealed, items)).toBe(true);
        expect(tokenHasHiddenStatus(concealed, items)).toBe(false);
        expect(getCanvasRenderItemsForViewer(items, {
            isPlayerView: true,
            playerName: 'Ada',
        }).map(({ id }) => id)).toEqual(['observer', 'smoke-zone']);

        const outside = { ...concealed, x: 200, y: 200 };
        expect(tokenHasHiddenStatus(outside, [observer, outside, smoke])).toBe(false);
    });
});
