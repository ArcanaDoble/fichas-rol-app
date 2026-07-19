import {
  DEFAULT_CARD_BACK_URL,
  getCardBackImage,
  getCardDisplayImage,
} from '../cardImages';

test('face-down cards without a custom back use the default SVG', () => {
  expect(getCardDisplayImage({ faceDown: true, frontImage: '/front.png' }))
    .toBe(DEFAULT_CARD_BACK_URL);
});

test('custom card backs take precedence over the default SVG', () => {
  const card = { faceDown: true, frontImage: '/front.png', backImage: '/custom-back.png' };
  expect(getCardBackImage(card)).toBe('/custom-back.png');
  expect(getCardDisplayImage(card)).toBe('/custom-back.png');
});

test('face-up cards continue to show their front image', () => {
  expect(getCardDisplayImage({ faceDown: false, frontImage: '/front.png' }))
    .toBe('/front.png');
});
