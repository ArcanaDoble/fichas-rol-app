import { createToken } from '../token';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(),
}));
jest.mock('../../firebase', () => ({ db: {} }));

test('generated tokens across pages have unique tokenSheetId', () => {
  const page1 = [createToken({ id: 1 }), createToken({ id: 2 })];
  const page2 = [createToken({ id: 3 }), createToken({ id: 4 })];
  const ids = [...page1, ...page2].map(t => t.tokenSheetId);
  const unique = new Set(ids);
  expect(unique.size).toBe(ids.length);
});
