import { createToken, mergeTokens } from '../token';

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

test('deleting token with numeric id removes it after normalization', () => {
  const prev = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
  ];
  const changed = [{ id: 1, _deleted: true }];
  const result = mergeTokens(prev, changed);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('2');
  expect(result.find(t => t.id === '1')).toBeUndefined();
});
