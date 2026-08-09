import { BOARD_MODE_DEFINITION } from '../../board/boardModeDefinition';
import { buildBoardTimelineTokens } from '../../board/boardInitiative';
import { CANVAS_MODE_DEFINITION } from '../../canvas/canvasModeDefinition';
import { buildCanvasTimelineTokens } from '../../canvas/canvasInitiative';

test('canvas and board expose independent mode contracts', () => {
    expect(CANVAS_MODE_DEFINITION.id).toBe('canvas');
    expect(BOARD_MODE_DEFINITION.id).toBe('board');
    expect(CANVAS_MODE_DEFINITION.scenarioCollectionName).toBe('canvas_scenarios');
    expect(BOARD_MODE_DEFINITION.scenarioCollectionName).toBe('board_scenarios');
    expect(CANVAS_MODE_DEFINITION.createCombatController)
        .not.toBe(BOARD_MODE_DEFINITION.createCombatController);
    expect(CANVAS_MODE_DEFINITION.useFeatureController)
        .not.toBe(BOARD_MODE_DEFINITION.useFeatureController);
    expect(CANVAS_MODE_DEFINITION.WorkspaceShell)
        .not.toBe(BOARD_MODE_DEFINITION.WorkspaceShell);
});

test('canvas initiative is based on token speed and control side', () => {
    const tokens = buildCanvasTimelineTokens([
        { id: 'master', type: 'token', isCircular: true, velocidad: 2, controlledBy: [] },
        { id: 'player', type: 'token', isCircular: true, velocidad: 5, controlledBy: ['Ada'] },
        { id: 'decoration', type: 'geometry' },
    ]);

    expect(tokens.map(({ id, timelineSide }) => ({ id, timelineSide }))).toEqual([
        { id: 'master', timelineSide: 'master' },
        { id: 'player', timelineSide: 'players' },
    ]);
});

test('board initiative is based on cards held by each token seat', () => {
    const tokens = buildBoardTimelineTokens([
        { id: 'master', type: 'token', isCircular: true, controlledBy: [] },
        { id: 'player', type: 'token', isCircular: true, controlledBy: ['Ada'] },
        { id: 'm1', type: 'card', zone: 'hand', handTokenId: 'master', ownerName: 'Master' },
        { id: 'p1', type: 'card', zone: 'hand', handTokenId: 'player', handSeatId: 'Ada' },
        { id: 'p2', type: 'card', zone: 'hand', handTokenId: 'player', handSeatId: 'Ada' },
    ]);

    expect(tokens.map(({ id, initiative, timelineSide }) => ({ id, initiative, timelineSide })))
        .toEqual([
            { id: 'master', initiative: 1, timelineSide: 'master' },
            { id: 'player', initiative: 2, timelineSide: 'players' },
        ]);
});
