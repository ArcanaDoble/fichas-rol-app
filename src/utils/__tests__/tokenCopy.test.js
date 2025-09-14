import { createToken, cloneTokenSheet } from '../token';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(),
}));
jest.mock('../../firebase', () => ({ db: {} }));

beforeEach(() => {
  localStorage.clear();
});

test('copying a token duplicates full sheet data and keeps independent stats', () => {
  const original = createToken({ id: 1, estados: ['poisoned'] });
  const sheet = {
    id: original.tokenSheetId,
    resourcesList: [{ id: 'vida', color: '#ff0000', tokenRow: 0, tokenAnchor: 'top' }],
    stats: {
      vida: {
        actual: 4,
        base: 10,
        total: 10,
        color: '#ff0000',
        showOnToken: true,
        label: 'Vida',
        tokenRow: 0,
        tokenAnchor: 'top',
      },
    },
  };
  localStorage.setItem('tokenSheets', JSON.stringify({ [sheet.id]: sheet }));

  const data = JSON.parse(JSON.stringify(original));
  const copy = createToken({ ...data, id: 2 });
  cloneTokenSheet(original.tokenSheetId, copy.tokenSheetId);

  const sheets = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(sheets[copy.tokenSheetId]).toEqual({ ...sheet, id: copy.tokenSheetId });

  sheets[copy.tokenSheetId].stats.vida.actual = 3;
  expect(sheets[original.tokenSheetId].stats.vida.actual).toBe(4);

  copy.estados.push('burned');
  expect(original.estados).toEqual(['poisoned']);
});

