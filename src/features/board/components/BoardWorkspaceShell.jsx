import React from 'react';
import { TacticalWorkspaceShell } from '../../tactical-shared/components/TacticalWorkspaceShell';

/** Board-owned UI entry point. Board-specific evolution starts at this boundary. */
export const BoardWorkspaceShell = (props) => (
    <TacticalWorkspaceShell {...props} isBoardMode mode="board" />
);
