import { getPlayerCanvasVisionTokens } from '../tactical-shared/tokenVisibilityAccess';

const getSharedVisionTokenIds = (items = [], playerName = '') => new globalThis.Set(
    getPlayerCanvasVisionTokens(items, playerName)
        .map((item) => item.id)
        .filter(Boolean),
);

export const didGainCanvasSharedVision = (previousItems = [], nextItems = [], playerName = '') => {
    if (!playerName) return false;

    const previousIds = getSharedVisionTokenIds(previousItems, playerName);
    const nextIds = getSharedVisionTokenIds(nextItems, playerName);

    return Array.from(nextIds).some((tokenId) => !previousIds.has(tokenId));
};
