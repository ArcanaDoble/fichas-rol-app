import React from 'react';
import { TacticalWorkspaceShell } from '../../tactical-shared/components/TacticalWorkspaceShell';
import { CanvasSidebar } from './CanvasSidebar';
import CanvasCombatPanel from './CanvasCombatPanel';
import CanvasInitiativeTimeline from './CanvasInitiativeTimeline';

/** Canvas-owned UI entry point. Shared tactical primitives stay behind this boundary. */
export const CanvasWorkspaceShell = (props) => (
    <TacticalWorkspaceShell
        {...props}
        isBoardMode={false}
        mode="canvas"
        SidebarComponent={CanvasSidebar}
        CombatPanelComponent={CanvasCombatPanel}
        TimelineComponent={CanvasInitiativeTimeline}
        timelineMode="initiative"
    />
);
