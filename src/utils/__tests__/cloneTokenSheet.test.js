import { createToken, cloneTokenSheet } from '../token';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(),
}));
jest.mock('../../firebase', () => ({ db: {} }));

beforeEach(() => {
  localStorage.clear();
});

test('copy token clones sheet data', () => {
  const original = createToken({ id: 1 });
  const sheet = { id: original.tokenSheetId, stats: { vida: { base: 5 } } };
  localStorage.setItem('tokenSheets', JSON.stringify({ [sheet.id]: sheet }));

  const copy = createToken({ ...original, id: 2 });
  let eventDetail;
  const handler = (e) => {
    eventDetail = e.detail;
  };
  window.addEventListener('tokenSheetSaved', handler);
  cloneTokenSheet(original.tokenSheetId, copy.tokenSheetId);
  window.removeEventListener('tokenSheetSaved', handler);

  const sheets = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(sheets[copy.tokenSheetId]).toEqual({ ...sheet, id: copy.tokenSheetId });
  expect(eventDetail.id).toBe(copy.tokenSheetId);
});
