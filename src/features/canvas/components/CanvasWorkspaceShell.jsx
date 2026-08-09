import React from 'react';
import { TacticalWorkspaceShell } from '../../tactical-shared/components/TacticalWorkspaceShell';

/** Canvas-owned UI entry point. Shared tactical primitives stay behind this boundary. */
export const CanvasWorkspaceShell = (props) => (
    <TacticalWorkspaceShell {...props} isBoardMode={false} mode="canvas" />
);
