import { createCanvasCombatController } from './createCanvasCombatController';
import { CanvasWorkspaceShell } from './components/CanvasWorkspaceShell';
import { useCanvasFeatureController } from './useCanvasFeatureController';
import { buildCanvasTimelineTokens } from './canvasInitiative';

export const CANVAS_MODE_DEFINITION = Object.freeze({
    id: 'canvas',
    isBoardMode: false,
    scenarioCollectionName: 'canvas_scenarios',
    visibilityDocName: 'canvasVisibility',
    sectionTitle: 'Canvas Beta',
    buildTimelineTokens: buildCanvasTimelineTokens,
    createCombatController: createCanvasCombatController,
    useFeatureController: useCanvasFeatureController,
    WorkspaceShell: CanvasWorkspaceShell,
});
