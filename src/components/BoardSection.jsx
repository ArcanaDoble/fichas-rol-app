import React from 'react';
import TacticalSectionCore from '../features/tactical-shared/TacticalSectionCore';
import { BOARD_MODE_DEFINITION } from '../features/board/boardModeDefinition';

/** Independent root for the cards, dice and board initiative experience. */
const BoardSection = (props) => (
    <TacticalSectionCore {...props} modeDefinition={BOARD_MODE_DEFINITION} />
);

export default BoardSection;
