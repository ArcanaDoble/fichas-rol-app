const noop = () => undefined;
const emptyList = () => [];

/**
 * Canvas feature boundary for tabletop-only commands.
 * Keeping these inert commands outside the shared core means CanvasSection does
 * not import or initialize the board cards/dice controller.
 */
export const useCanvasFeatureController = () => ({
    handleBoardCardBackUpload: noop,
    addCardToBoard: noop,
    getHandCardsForToken: emptyList,
    addCardToHand: noop,
    addCardContainerToBoard: noop,
    addDeckToBoard: noop,
    addBoardMarkerToBoard: noop,
    addBoardDieToBoard: noop,
    adjustBoardDiceCount: noop,
    toggleBoardDiceExplosive: noop,
    clearBoardDicePool: noop,
    rollBoardDicePool: noop,
    toggleBoardDiceRollDie: noop,
    removeCardFromContainer: noop,
    moveBoardCardToHand: noop,
    playHandCardToBoard: noop,
    closeBoardCardPreview: noop,
    openBoardCardPreview: noop,
    startBoardCardLongPressPreview: noop,
    handleHandCardDragStart: noop,
    toggleHandCardFace: noop,
    consumeCardStackQuickActionEvent: noop,
    unstackSpecificCard: noop,
});
