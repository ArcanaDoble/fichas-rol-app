import { createCanvasCombatController } from './createCanvasCombatController';
import { CanvasWorkspaceShell } from './components/CanvasWorkspaceShell';
import { useCanvasFeatureController } from './useCanvasFeatureController';
import { buildCanvasTimelineTokens } from './canvasInitiative';
import { createCanvasImageToken } from './canvasImageToken';
import { syncCanvasSystemToken, getCanvasSystem, isCampaignSheet } from './campaignSystem';
import { loadCanvasSystemSheet, persistCanvasSystemItems, prepareCanvasSystemSave } from './campaignPersistence';
import CanvasTokenResources from './components/CanvasTokenResources';
import CanvasEquipmentSection from './components/CanvasEquipmentSection';
import CanvasLootVisual from './components/CanvasLootVisual';
import CanvasSharedPointers from './components/CanvasSharedPointers';
import {
    getCanvasLootRenderPlacement,
    isCanvasLootItem,
    resolveCanvasLootRecipient,
} from './canvasInventoryTransfer';
import { didGainCanvasSharedVision } from './playerVisionAccess';

export const CANVAS_MODE_DEFINITION = Object.freeze({
    id: 'canvas',
    isBoardMode: false,
    scenarioCollectionName: 'canvas_scenarios',
    visibilityDocName: 'canvasVisibility',
    sectionTitle: 'Canvas Beta',
    buildTimelineTokens: buildCanvasTimelineTokens,
    createImageToken: createCanvasImageToken,
    syncTokenWithSheet: syncCanvasSystemToken,
    loadRuntimeSheet: loadCanvasSystemSheet,
    persistRuntimeItems: persistCanvasSystemItems,
    prepareScenarioSave: prepareCanvasSystemSave,
    validateEntry: (scene, sheet) => {
        if ((getCanvasSystem(scene) === 'campaign') !== isCampaignSheet(sheet)) {
            throw new Error(`El encuentro está en modo ${getCanvasSystem(scene) === 'campaign' ? 'Campaña' : 'Roguelite'}. El máster debe guardar el modo correspondiente a tu ficha.`);
        }
    },
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
