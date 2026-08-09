import { createBoardCombatController } from './createBoardCombatController';
import { BoardWorkspaceShell } from './components/BoardWorkspaceShell';
import { useBoardController } from './useBoardController';
import { buildBoardTimelineTokens } from './boardInitiative';

export const BOARD_MODE_DEFINITION = Object.freeze({
    id: 'board',
    isBoardMode: true,
    scenarioCollectionName: 'board_scenarios',
    visibilityDocName: 'boardVisibility',
    sectionTitle: 'Tablero',
    buildTimelineTokens: buildBoardTimelineTokens,
    createCombatController: createBoardCombatController,
    useFeatureController: useBoardController,
    WorkspaceShell: BoardWorkspaceShell,
});
