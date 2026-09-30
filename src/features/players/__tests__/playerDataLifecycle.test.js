import {
  clearPlayerLocalData,
  deletePlayerData,
} from '../playerDataLifecycle';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

jest.mock('../../../firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...segments) => ({ path: segments.slice(1).join('/') })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn((...segments) => ({ path: segments.slice(1).join('/') })),
  getDocs: jest.fn(),
  query: jest.fn((ref) => ref),
  where: jest.fn(() => ({})),
}));

const snapshot = (...paths) => ({
  docs: paths.map((path) => ({ ref: { path } })),
});

beforeEach(() => {
  jest.clearAllMocks();
  collection.mockImplementation((...segments) => ({ path: segments.slice(1).join('/') }));
  doc.mockImplementation((...segments) => ({ path: segments.slice(1).join('/') }));
  query.mockImplementation((ref) => ref);
  where.mockImplementation(() => ({}));
  deleteDoc.mockResolvedValue(undefined);
  getDocs.mockImplementation(async (ref) => {
    if (ref.path === 'players/Prueba/rogueliteClasses') {
      return snapshot(
        'players/Prueba/rogueliteClasses/rogue',
        'players/Prueba/rogueliteClasses/barbarian',
      );
    }
    if (ref.path === 'players/Prueba/assets') {
      return snapshot('players/Prueba/assets/folders');
    }
    if (ref.path === 'characters') {
      return snapshot('characters/prueba-character');
    }
    return snapshot();
  });
});

test('deletes personal subcollections and owned data before deleting the player document', async () => {
  await deletePlayerData('Prueba');

  expect(collection).toHaveBeenCalledWith({}, 'players', 'Prueba', 'rogueliteClasses');
  expect(collection).toHaveBeenCalledWith({}, 'players', 'Prueba', 'assets');
  expect(where).toHaveBeenCalledWith('owner', '==', 'Prueba');
  expect(query).toHaveBeenCalled();

  const deletedPaths = deleteDoc.mock.calls.map(([reference]) => reference.path);
  expect(deletedPaths).toEqual(expect.arrayContaining([
    'players/Prueba/rogueliteClasses/rogue',
    'players/Prueba/rogueliteClasses/barbarian',
    'players/Prueba/assets/folders',
    'characters/prueba-character',
    'inventory/Prueba',
    'players/Prueba',
  ]));

  const parentCall = deleteDoc.mock.calls.findIndex(([reference]) => reference.path === 'players/Prueba');
  const childCall = deleteDoc.mock.calls.findIndex(
    ([reference]) => reference.path === 'players/Prueba/rogueliteClasses/rogue',
  );
  expect(parentCall).toBeGreaterThan(childCall);
});

test('can purge orphaned data without deleting the newly reserved player document id', async () => {
  await deletePlayerData('Prueba', { deletePlayerDocument: false });

  expect(deleteDoc).not.toHaveBeenCalledWith(expect.objectContaining({ path: 'players/Prueba' }));
  expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({
    path: 'players/Prueba/rogueliteClasses/rogue',
  }));
  expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'inventory/Prueba' }));
});

test('clears every local key tied to a player name', () => {
  const storage = { removeItem: jest.fn() };

  clearPlayerLocalData(' Prueba ', storage);

  expect(storage.removeItem.mock.calls.map(([key]) => key)).toEqual([
    'player_Prueba',
    'player_Prueba_backup',
    'assetSidebar_Prueba',
  ]);
});
