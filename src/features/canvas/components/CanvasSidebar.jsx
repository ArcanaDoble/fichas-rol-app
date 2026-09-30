import React from 'react';

import { CanvasSidebar as TacticalSidebar } from '../../tactical-shared/components/TacticalSidebar';
import CanvasCombatPanel from './CanvasCombatPanel';
import CanvasItemGeneratorPanel from './CanvasItemGeneratorPanel';

export const CanvasSidebar = (props) => (
  <TacticalSidebar
    {...props}
    CombatPanelComponent={CanvasCombatPanel}
    TokenLibraryExtensionComponent={CanvasItemGeneratorPanel}
  />
);
