export const DEFAULT_CARD_BACK_URL = '/cards/card-back-default.svg';

export const getCardFrontImage = (card) => (
  card?.frontImage || card?.frontUrl || card?.img || null
);

export const getCardBackImage = (card) => (
  card?.backImage || card?.backUrl || DEFAULT_CARD_BACK_URL
);

export const getCardDisplayImage = (card) => (
  card?.faceDown
    ? getCardBackImage(card)
    : (getCardFrontImage(card) || card?.backImage || card?.backUrl || DEFAULT_CARD_BACK_URL)
);
