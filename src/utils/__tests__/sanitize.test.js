import sanitize from '../sanitize';

test('removes undefined values from nested card deck payloads', () => {
  const payload = {
    cards: [
      {
        id: 'card-1',
        name: 'Carta',
        frontUrl: 'https://example.test/card.webp',
        visibleToPlayers: undefined,
        metadata: {
          backUrl: undefined,
          type: 'action',
        },
      },
    ],
  };

  expect(sanitize(payload)).toEqual({
    cards: [
      {
        id: 'card-1',
        name: 'Carta',
        frontUrl: 'https://example.test/card.webp',
        metadata: {
          type: 'action',
        },
      },
    ],
  });
});
