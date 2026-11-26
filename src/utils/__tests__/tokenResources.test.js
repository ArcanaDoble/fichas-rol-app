import { consumeStatForToken } from '../tokenResources';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { saveTokenSheet } from '../token';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((database, ...parts) => ({ path: parts.join('/') })),
  collection: jest.fn((database, ...parts) => ({ path: parts.join('/') })),
  getDoc: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'event' }),
  serverTimestamp: jest.fn(),
}));
jest.mock('../../firebase', () => ({ db: {} }));
jest.mock('../token', () => ({ saveTokenSheet: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  doc.mockImplementation((database, ...parts) => ({ path: parts.join('/') }));
  collection.mockImplementation((database, ...parts) => ({ path: parts.join('/') }));
  addDoc.mockResolvedValue({ id: 'event' });
  serverTimestamp.mockReturnValue('server-time');
});

test('consumes Ingenio while preserving the rest of the sheet and notifies the linked token', async () => {
  const sheet = { id: 'sheet', stats: { ingenio: { actual: 4, total: 6 }, vida: { actual: 8, total: 10 } } };
  localStorage.setItem('tokenSheets', JSON.stringify({ sheet }));
  const listener = jest.fn();
  window.addEventListener('tokenSheetSaved', listener);

  try {
    await consumeStatForToken({ id: 'token', tokenSheetId: 'sheet' }, 'ingenio', 2);
    const expected = { ...sheet, stats: { ...sheet.stats, ingenio: { actual: 2, total: 6 } } };
    expect(JSON.parse(localStorage.getItem('tokenSheets')).sheet).toEqual(expected);
    expect(saveTokenSheet).toHaveBeenCalledWith(expected);
    expect(listener.mock.calls[0][0].detail).toEqual(expected);
    expect(addDoc).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener('tokenSheetSaved', listener);
  }
});

test('loads a remote sheet, clamps the resource and emits feedback on the visible page', async () => {
  getDoc.mockImplementation(async reference => reference.path === 'tokenSheets/sheet'
    ? { exists: () => true, data: () => ({ id: 'sheet', stats: { ingenio: { actual: 1, total: 4 } } }) }
    : { exists: () => true, data: () => ({ playerVisiblePageId: 'visible-page' }) });

  await consumeStatForToken({ id: 'token', tokenSheetId: 'sheet' }, 'ingenio', 2, 'old-page');
  expect(saveTokenSheet).toHaveBeenCalledWith(expect.objectContaining({ stats: { ingenio: { actual: 0, total: 4 } } }));
  expect(addDoc).toHaveBeenCalledWith({ path: 'damageEvents' }, expect.objectContaining({ tokenId: 'token', stat: 'ingenio', value: 2, pageId: 'visible-page' }));
  expect(doc.mock.calls.map(args => args[1])).toEqual(['tokenSheets', 'gameSettings']);
});
