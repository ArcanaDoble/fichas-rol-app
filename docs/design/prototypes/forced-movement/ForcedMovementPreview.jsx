import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import TacticalSectionCore from '../../../../src/features/tactical-shared/TacticalSectionCore';
import { CANVAS_MODE_DEFINITION } from '../../../../src/features/canvas/canvasModeDefinition';
import { CanvasWorkspaceShell } from '../../../../src/features/canvas/components/CanvasWorkspaceShell';
import { useCanvasFeatureController } from '../../../../src/features/canvas/useCanvasFeatureController';
import { createCanvasCombatState, submitActionDice, markParticipantActed } from '../../../../src/features/canvas/combat/canvasCombatState';
import { readPreviewScene, savePreviewScene, resetPreviewScene } from '../fixtures/campaign-canvas-firestore';

const player = new URLSearchParams(location.search).get('view') === 'player';
const reset = () => {
    resetPreviewScene();
    const scene = readPreviewScene();
    const items = scene.items.map(item => item.id === 'yuuzu' ? { ...item, controlledBy: ['Ada'], status: player ? [] : ['derribado'],
        stats: { ...item.stats, movimiento: { current: player ? 2 : 0, max: 2 } } } : item);
    let combat = createCanvasCombatState(items, { rulesSystem: 'campaign', now: 1 });
    combat = submitActionDice(combat, 'yuuzu', [6, 4, 2]);
    combat = submitActionDice(combat, 'yerma', [7, 3, 2]);
    if (!player) combat = markParticipantActed(combat, 'yuuzu');
    combat = { ...combat, participants: { ...combat.participants, yuuzu: { ...combat.participants.yuuzu,
        movementRuntime: { ...combat.participants.yuuzu.movementRuntime, spent: player ? 0 : 2 } } } };
    savePreviewScene({ items, canvasCombat: combat });
};
reset();
function PreviewShell(props) {
    useEffect(() => {
        if (!props.activeScenario?.id) return;
        props.setSelectedTokenIds(['yuuzu']); props.setShowMasterCombatHUD(false);
        props.setShowSettings(false); props.setZoom(window.innerWidth < 600 ? 1 : 1.5);
    }, [props.activeScenario?.id]);
    useEffect(() => {
        window.render_game_to_text = () => JSON.stringify({ coordinates: 'World pixels, x right, y down',
            scene: readPreviewScene(), local: props.activeScenario?.items, forced: props.combatRuntime?.forcedMovement?.session,
            pending: props.pendingTurnState, offset: props.offset, zoom: props.zoom });
        window.advanceTime = ms => new Promise(resolve => setTimeout(resolve, Math.min(ms, 40)));
    });
    return <><CanvasWorkspaceShell {...props} /><button type="button" onClick={reset}
        style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 200, background: '#0b1120', color: '#c8aa6e', border: '1px solid #c8aa6e80', padding: '10px 14px' }}>
        Reiniciar prueba local</button></>;
}
const mode = { ...CANVAS_MODE_DEFINITION, WorkspaceShell: PreviewShell, useFeatureController: useCanvasFeatureController };
createRoot(document.getElementById('root')).render(<TacticalSectionCore modeDefinition={mode}
    onBack={() => location.reload()} playerName="Ada" currentUserId={player ? 'player' : 'master'} isMaster={!player} isPlayerView={player} />);
