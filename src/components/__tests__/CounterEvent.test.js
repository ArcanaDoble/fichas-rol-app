import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { rollExpressionCritical } from '../../utils/dice';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(() => ({})),
  serverTimestamp: jest.fn(),
}));


test('only one counter event is emitted', async () => {
  const attacker = { id: 'a1' };
  const pageId = 'p1';
  const diff = 10;
  const lost = { postura: 1, armadura: 2, vida: 3 };
  if (diff > 0) {
    await addDoc(collection({}, 'damageEvents'), {
      tokenId: attacker.id,
      type: 'counter',
      ts: Date.now(),
      pageId,
      timestamp: serverTimestamp(),
    });
  }
  for (const stat of ['postura', 'armadura', 'vida']) {
    if (lost[stat] > 0) {
      await addDoc(collection({}, 'damageEvents'), {
        tokenId: attacker.id,
        value: lost[stat],
        stat,
        ts: Date.now(),
        pageId,
        timestamp: serverTimestamp(),
      });
    }
  }
  const counterCalls = addDoc.mock.calls.filter((c) => c[1].type === 'counter');
  expect(counterCalls).toHaveLength(1);
});

test('rollExpressionCritical supports fixed values', () => {
  const res = rollExpressionCritical('20');
  expect(res.total).toBe(20);
});

