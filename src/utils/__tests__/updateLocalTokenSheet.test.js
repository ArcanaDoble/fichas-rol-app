import { updateLocalTokenSheet } from '../token';
import { setDoc } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
}));
jest.mock('../../firebase', () => ({ db: {} }));

test('stores sheet locally without touching Firestore', () => {
  localStorage.clear();
  const sheet = { id: 's1', stats: { vida: { base: 5 } } };
  let detail;
  const handler = (e) => {
    detail = e.detail;
  };
  window.addEventListener('tokenSheetSaved', handler);
  updateLocalTokenSheet(sheet);
  window.removeEventListener('tokenSheetSaved', handler);

  const stored = JSON.parse(localStorage.getItem('tokenSheets'));
  expect(stored.s1.stats.vida.base).toBe(5);
  expect(detail).toEqual(sheet);
  expect(setDoc).not.toHaveBeenCalled();
});
