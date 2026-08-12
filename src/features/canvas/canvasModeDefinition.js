import { createCanvasCombatController } from './createCanvasCombatController';
import { CanvasWorkspaceShell } from './components/CanvasWorkspaceShell';
import { useCanvasFeatureController } from './useCanvasFeatureController';
import { buildCanvasTimelineTokens } from './canvasInitiative';
import { syncCanvasTokenWithSheet } from './rogueliteTokenSheetSync';
import CanvasTokenResources from './components/CanvasTokenResources';
import CanvasEquipmentSection from './components/CanvasEquipmentSection';
import {
    loadCanvasRogueliteRuntimeSheet,
    persistCanvasRogueliteRuns,
} from './rogueliteRunPersistence';

export const CANVAS_MODE_DEFINITION = Object.freeze({
    id: 'canvas',
    isBoardMode: false,
    scenarioCollectionName: 'canvas_scenarios',
    visibilityDocName: 'canvasVisibility',
    sectionTitle: 'Canvas Beta',
    buildTimelineTokens: buildCanvasTimelineTokens,
    syncTokenWithSheet: syncCanvasTokenWithSheet,
    loadRuntimeSheet: loadCanvasRogueliteRuntimeSheet,
    persistRuntimeItems: persistCanvasRogueliteRuns,
    TokenResourcesComponent: CanvasTokenResources,
    EquipmentSectionComponent: CanvasEquipmentSection,
    createCombatController: createCanvasCombatController,
    useFeatureController: useCanvasFeatureController,
    WorkspaceShell: CanvasWorkspaceShell,
});
