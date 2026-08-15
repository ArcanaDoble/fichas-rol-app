import React from 'react';
import { TacticalWorkspaceShell } from '../../tactical-shared/components/TacticalWorkspaceShell';
import { CanvasSidebar } from './CanvasSidebar';
import CanvasCombatPanel from './CanvasCombatPanel';
import CanvasInitiativeTimeline from './CanvasInitiativeTimeline';
import CanvasCombatActionModal from './CanvasCombatActionModal';

/** Canvas-owned UI entry point. Shared tactical primitives stay behind this boundary. */
export const CanvasWorkspaceShell = (props) => {
    const handleCanvasCombatAction = (tokenId, actionId, data) => {
        if (
            actionId === 'attack'
            && data
            && props.targetingState?.phase === 'weapon_selection'
            && props.focusedTargetId
        ) {
            const opened = props.combatRuntime?.beginAttackDraft?.({
                attackerId: tokenId,
                targetId: props.focusedTargetId,
                weapon: data,
            });
            if (opened) props.handleCombatAction?.(tokenId, 'cancel_targeting');
            return;
        }
        props.handleCombatAction?.(tokenId, actionId, data);
    };

    return (
        <>
            <TacticalWorkspaceShell
                {...props}
                handleCombatAction={handleCanvasCombatAction}
                isBoardMode={false}
                mode="canvas"
                SidebarComponent={CanvasSidebar}
                CombatPanelComponent={CanvasCombatPanel}
                TimelineComponent={CanvasInitiativeTimeline}
                timelineMode="initiative"
            />
            <CanvasCombatActionModal
                activeScenario={props.activeScenario}
                combatRuntime={props.combatRuntime}
                isPlayerView={props.isPlayerView}
            />
        </>
    );
};
