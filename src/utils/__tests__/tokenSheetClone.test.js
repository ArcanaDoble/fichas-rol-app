import { createToken } from '../token';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(),
}));
jest.mock('../../firebase', () => ({ db: {} }));

describe('token sheet cloning', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('copy token preserves sheet data', () => {
    const original = createToken({ id: 1 });
    const sheet = { id: original.tokenSheetId, stats: { vida: { base: 5 } } };
    localStorage.setItem('tokenSheets', JSON.stringify({ [sheet.id]: sheet }));

    const copy = createToken({ id: 2 });

    const stored = localStorage.getItem('tokenSheets');
    const sheets = stored ? JSON.parse(stored) : {};
    const source = sheets[original.tokenSheetId];
    const clone = JSON.parse(JSON.stringify(source));
    clone.id = copy.tokenSheetId;
    sheets[copy.tokenSheetId] = clone;
    localStorage.setItem('tokenSheets', JSON.stringify(sheets));

    const result = JSON.parse(localStorage.getItem('tokenSheets'));
    expect(result[copy.tokenSheetId]).toEqual(clone);
  });
});
