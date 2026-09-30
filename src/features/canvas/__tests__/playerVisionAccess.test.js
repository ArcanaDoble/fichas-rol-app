import { didGainCanvasSharedVision } from '../playerVisionAccess';

const token = (controlledBy, hasVision = true) => ({
    id: 'token-1',
    controlledBy,
    hasVision,
});

describe('Canvas shared vision access', () => {
    test('detects when a player gains vision from an existing token', () => {
        expect(didGainCanvasSharedVision(
            [token(['Bruno'])],
            [token(['Bruno', 'Ada'])],
            'Ada',
        )).toBe(true);
    });

    test('detects when vision is enabled after control was granted', () => {
        expect(didGainCanvasSharedVision(
            [token(['Ada'], false)],
            [token(['Ada'], true)],
            'Ada',
        )).toBe(true);
    });

    test('ignores unrelated permission changes and revoked access', () => {
        expect(didGainCanvasSharedVision(
            [token(['Ada'])],
            [token(['Ada', 'Bruno'])],
            'Ada',
        )).toBe(false);
        expect(didGainCanvasSharedVision(
            [token(['Ada'])],
            [token([])],
            'Ada',
        )).toBe(false);
    });

    test('detects shared vision as soon as a token joins the player team', () => {
        const playerToken = { id: 'ada', controlledBy: ['Ada'], teamId: 'aliados', hasVision: true };
        const alliedToken = { id: 'bruno', controlledBy: ['Bruno'], hasVision: true };

        expect(didGainCanvasSharedVision(
            [playerToken, alliedToken],
            [playerToken, { ...alliedToken, teamId: 'ALIADOS' }],
            'Ada',
        )).toBe(true);
    });
});
