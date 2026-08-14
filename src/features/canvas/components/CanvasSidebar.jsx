import React from 'react';

import { CanvasSidebar as TacticalSidebar } from '../../tactical-shared/components/TacticalSidebar';
import CanvasCombatPanel from './CanvasCombatPanel';

export const CanvasSidebar = (props) => (
  <TacticalSidebar {...props} CombatPanelComponent={CanvasCombatPanel} />
);
