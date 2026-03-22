jest.mock('firebase/firestore', () => ({
  serverTimestamp: jest.fn(() => 'server-ts'),
}));

const {
  DAMAGE_EVENT_STALE_MS,
  buildDamageEventWrite,
  getDamageEventTimestampMs,
  isDamageEventStale,
} = require('../damageEvents');

test('buildDamageEventWrite keeps a stable client timestamp for damage events', () => {
  const payload = buildDamageEventWrite(
    { tokenId: 't1', stat: 'vida', value: 2, ts: 1234 },
    'page-1',
    9999,
  );

  expect(payload).toEqual({
    tokenId: 't1',
    stat: 'vida',
    value: 2,
    ts: 1234,
    clientTimestamp: 1234,
    pageId: 'page-1',
  });
  expect(Object.prototype.hasOwnProperty.call(payload, 'timestamp')).toBe(true);
});

test('getDamageEventTimestampMs prefers clientTimestamp over server timestamp placeholders', () => {
  expect(
    getDamageEventTimestampMs({
      clientTimestamp: 555,
      timestamp: { toMillis: () => 999 },
      ts: 111,
    }),
  ).toBe(555);
});

test('isDamageEventStale only expires events older than the allowed window', () => {
  expect(isDamageEventStale({ timestamp: 1000 }, 1000 + DAMAGE_EVENT_STALE_MS - 1)).toBe(false);
  expect(isDamageEventStale({ timestamp: 1000 }, 1000 + DAMAGE_EVENT_STALE_MS + 1)).toBe(true);
});
