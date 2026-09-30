import { createCanvasCombatController } from './createCanvasCombatController';
import { CanvasWorkspaceShell } from './components/CanvasWorkspaceShell';
import { useCanvasFeatureController } from './useCanvasFeatureController';
import { buildCanvasTimelineTokens } from './canvasInitiative';
import { syncCanvasTokenWithSheet } from './rogueliteTokenSheetSync';
import CanvasTokenResources from './components/CanvasTokenResources';
import CanvasEquipmentSection from './components/CanvasEquipmentSection';
import CanvasLootVisual from './components/CanvasLootVisual';
import CanvasSharedPointers from './components/CanvasSharedPointers';
import {
    getCanvasLootRenderPlacement,
    isCanvasLootItem,
    resolveCanvasLootRecipient,
} from './canvasInventoryTransfer';
import {
    loadCanvasRogueliteRuntimeSheet,
    persistCanvasRogueliteRuns,
} from './rogueliteRunPersistence';
import { didGainCanvasSharedVision } from './playerVisionAccess';

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
    didGainPlayerSharedVision: didGainCanvasSharedVision,
    allowPlayerTokenHoverInspection: true,
    SharedPointerOverlay: CanvasSharedPointers,
    TokenResourcesComponent: CanvasTokenResources,
    EquipmentSectionComponent: CanvasEquipmentSection,
    isScenePickupItem: isCanvasLootItem,
    getScenePickupRenderPlacement: getCanvasLootRenderPlacement,
    resolveScenePickupRecipient: resolveCanvasLootRecipient,
    createCombatController: createCanvasCombatController,
    useFeatureController: useCanvasFeatureController,
    WorkspaceShell: CanvasWorkspaceShell,
    sceneItemVisuals: {
        ScenePickupVisual: CanvasLootVisual,
    },
});
