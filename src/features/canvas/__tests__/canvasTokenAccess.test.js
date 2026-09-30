import { canControlToken } from '../../tactical-shared/tokenControlUtils';
import {
    canPlayerAccessCanvasToken,
    canViewerSeeCanvasToken,
    getPlayerCanvasVisionTokens,
    tokenHasHiddenStatus,
} from '../../tactical-shared/tokenVisibilityAccess';

const token = (id, overrides = {}) => ({
    id,
    name: id,
    type: 'token',
    hasVision: true,
    controlledBy: [],
    status: [],
    ...overrides,
});

describe('Canvas token access', () => {
    const ada = token('ada', { controlledBy: ['Ada'], teamId: 'Aliados' });
    const bruno = token('bruno', { controlledBy: ['Bruno'], teamId: ' aliados ', status: ['oculto'] });
    const enemy = token('enemy', { teamId: 'enemigos', status: ['Oculto'] });
    const hiddenPlayer = token('hidden-player', { controlledBy: ['Bruno'], status: ['oculto'] });
    const items = [ada, bruno, enemy, hiddenPlayer];

    test('recognizes the hidden status independent of label casing', () => {
        expect(tokenHasHiddenStatus(bruno)).toBe(true);
        expect(tokenHasHiddenStatus(enemy)).toBe(true);
    });

    test('same Team ID grants vision access without granting control', () => {
        expect(canPlayerAccessCanvasToken(bruno, items, 'Ada')).toBe(true);
        expect(canControlToken(bruno, true, 'Ada')).toBe(false);
        expect(getPlayerCanvasVisionTokens(items, 'Ada').map(({ id }) => id)).toEqual(['ada', 'bruno']);
    });

    test('players cannot see hidden tokens from another team', () => {
        expect(canViewerSeeCanvasToken(enemy, items, { isPlayerView: true, playerName: 'Ada' })).toBe(false);
        expect(canViewerSeeCanvasToken(bruno, items, { isPlayerView: true, playerName: 'Ada' })).toBe(true);
    });

    test('master sees master-owned hidden tokens but not player-controlled hidden tokens', () => {
        expect(canViewerSeeCanvasToken(enemy, items, { isPlayerView: false })).toBe(true);
        expect(canViewerSeeCanvasToken(hiddenPlayer, items, { isPlayerView: false })).toBe(false);
        expect(canViewerSeeCanvasToken(
            token('owner-only', { controlledBy: [], ownerName: 'Bruno', status: ['oculto'] }),
            items,
            { isPlayerView: false },
        )).toBe(false);
    });
});
