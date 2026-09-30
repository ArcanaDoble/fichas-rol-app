import React from 'react';
import { TacticalWorkspaceShell } from '../../tactical-shared/components/TacticalWorkspaceShell';
import { BoardCardMenu } from './BoardCardMenu';

/** Board-owned UI entry point. Board-specific evolution starts at this boundary. */
export const BoardWorkspaceShell = (props) => {
    const card = props.activeScenario?.items?.find(item => props.boardCardMenu?.stackKey
        ? item.stackKey === props.boardCardMenu.stackKey && !item.stackParentId
        : item.id === props.boardCardMenu?.cardId);
    return <>
        <TacticalWorkspaceShell {...props} isBoardMode mode="board" />
        <BoardCardMenu menu={props.boardCardMenu} card={card} isPlayerView={props.isPlayerView}
            busy={props.boardCardActionBusy} onAction={props.runBoardCardAction} onClose={props.closeBoardCardMenu}
            onFlip={() => { props.updateItem(card.id, { faceDown: !card.faceDown }, true); props.closeBoardCardMenu(); }} />
    </>;
};
