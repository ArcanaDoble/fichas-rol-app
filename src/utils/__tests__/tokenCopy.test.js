import { createToken, cloneTokenSheet } from '../token';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(),
}));
jest.mock('../../firebase', () => ({ db: {} }));

beforeEach(() => {
  localStorage.clear();
});

test('copying a token duplicates stats and keeps independent data', () => {
  const original = createToken({ id: 1, estados: ['poisoned'] });
  const sheet = { id: original.tokenSheetId, stats: { vida: { actual: 8 } } };
  localStorage.setItem('tokenSheets', JSON.stringify({ [sheet.id]: sheet }));

  const data = JSON.parse(JSON.stringify(original));
  const copy = createToken({ ...data, id: 2 });
  cloneTokenSheet(original.tokenSheetId, copy.tokenSheetId);

  const sheets = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(sheets[copy.tokenSheetId]).toEqual({ ...sheet, id: copy.tokenSheetId });

  sheets[copy.tokenSheetId].stats.vida.actual = 3;
  expect(sheets[original.tokenSheetId].stats.vida.actual).toBe(8);

  copy.estados.push('burned');
  expect(original.estados).toEqual(['poisoned']);
});

