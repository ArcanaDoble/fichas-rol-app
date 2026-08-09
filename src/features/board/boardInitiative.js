import {
    MASTER_HAND_SEAT_ID,
    getCardHandSeatId,
    getCardHandTokenId,
    isHandCardItem,
    isLegacyTokenHandCard,
    normalizeHandSeatId,
} from '../../utils/cardBoard';
import { isCombatTokenItem } from '../canvas/combatRules';

/** Board initiative is derived exclusively from the cards held by each seat. */
export const buildBoardTimelineTokens = (items = []) => {
    const handCards = items.filter(isHandCardItem);
    const handTokenIds = new globalThis.Set(handCards.map(getCardHandTokenId).filter(Boolean));
    const combatTokens = items.filter((item) => (
        isCombatTokenItem(item)
        && (item.isCircular || item.stats || item.name || handTokenIds.has(item.id))
    ));

    return combatTokens.map((token) => {
        const controlledBy = Array.isArray(token.controlledBy)
            ? token.controlledBy.filter(Boolean).map(normalizeHandSeatId)
            : [];
        const seatIds = controlledBy.length > 0 ? controlledBy : [MASTER_HAND_SEAT_ID];
        const tokenHandCards = handCards.filter((card) => getCardHandTokenId(card) === token.id);
        const explicitSeatCards = tokenHandCards.filter((card) => (
            card.handSeatId && seatIds.includes(getCardHandSeatId(card))
        ));
        const initiativeCards = explicitSeatCards.length > 0
            ? explicitSeatCards
            : tokenHandCards.filter((card) => {
                const cardSeatId = getCardHandSeatId(card);
                if (!isLegacyTokenHandCard(card, token.id)) return seatIds.includes(cardSeatId);
                return seatIds.includes(MASTER_HAND_SEAT_ID) && controlledBy.length === 0;
            });

        return {
            ...token,
            initiative: initiativeCards.length,
            timelineSide: controlledBy.length > 0 ? 'players' : 'master',
        };
    });
};
