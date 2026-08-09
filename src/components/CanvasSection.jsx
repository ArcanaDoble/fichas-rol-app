import React from 'react';
import TacticalSectionCore from '../features/tactical-shared/TacticalSectionCore';
import { CANVAS_MODE_DEFINITION } from '../features/canvas/canvasModeDefinition';

/** Independent root for the canvas combat experience. */
const CanvasSection = (props) => (
    <TacticalSectionCore {...props} modeDefinition={CANVAS_MODE_DEFINITION} />
);

export default CanvasSection;
