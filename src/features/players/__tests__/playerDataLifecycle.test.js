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
  runTransaction: jest.fn(async (database, action) => action({ get:async () => ({ exists:() => false }), set:jest.fn() })),
  where: jest.fn(() => ({})),
}));

const snapshot = (...paths) => ({
  docs: paths.map((path) => ({ id: path.split('/').pop(), ref: { path } })),
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
    if (ref.path === 'campaignCharacterSheets') {
      return snapshot(
        'campaignCharacterSheets/prueba-character',
        'campaignCharacterSheets/orphan-sheet',
      );
    }
    if (ref.path === 'parryFreeGames') return snapshot('parryFreeGames/old-game');
    return snapshot();
  });
});

test('deletes personal subcollections and owned data before deleting the player document', async () => {
  await deletePlayerData('Prueba');

  expect(collection).toHaveBeenCalledWith({}, 'players', 'Prueba', 'rogueliteClasses');
  expect(collection).toHaveBeenCalledWith({}, 'players', 'Prueba', 'assets');
  expect(collection).toHaveBeenCalledWith({}, 'campaignCharacterSheets');
  expect(where).toHaveBeenCalledWith('owner', '==', 'Prueba');
  expect(where).toHaveBeenCalledWith('participantIds', 'array-contains', 'player:Prueba');
  expect(query).toHaveBeenCalled();

  const deletedPaths = deleteDoc.mock.calls.map(([reference]) => reference.path);
  expect(deletedPaths).toEqual(expect.arrayContaining([
    'players/Prueba/rogueliteClasses/rogue',
    'players/Prueba/rogueliteClasses/barbarian',
    'players/Prueba/assets/folders',
    'characters/prueba-character',
    'campaignCharacterSheets/prueba-character',
    'campaignCharacterSheets/orphan-sheet',
    'inventory/Prueba',
    'parryFreeGames/old-game',
    'players/Prueba',
  ]));

  const parentCall = deleteDoc.mock.calls.findIndex(([reference]) => reference.path === 'players/Prueba');
  const childCall = deleteDoc.mock.calls.findIndex(
    ([reference]) => reference.path === 'players/Prueba/rogueliteClasses/rogue',
  );
  expect(parentCall).toBeGreaterThan(childCall);
  const characterCall = deletedPaths.indexOf('characters/prueba-character');
  expect(characterCall).toBeGreaterThan(deletedPaths.indexOf('campaignCharacterSheets/prueba-character'));
  expect(parentCall).toBeGreaterThan(deletedPaths.indexOf('campaignCharacterSheets/orphan-sheet'));
});

test('can purge orphaned data without deleting the newly reserved player document id', async () => {
  await deletePlayerData('Prueba', { deletePlayerDocument: false });

  expect(deleteDoc).not.toHaveBeenCalledWith(expect.objectContaining({ path: 'players/Prueba' }));
  expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({
    path: 'players/Prueba/rogueliteClasses/rogue',
  }));
  expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'inventory/Prueba' }));
  expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path:'parryFreeGames/old-game' }));
  expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({
    path: 'campaignCharacterSheets/prueba-character',
  }));
});

test('deletes a campaign sheet by character id even when its owner query does not return it', async () => {
  const originalGetDocs = getDocs.getMockImplementation();
  getDocs.mockImplementation(async (ref) => (
    ref.path === 'campaignCharacterSheets' ? snapshot() : originalGetDocs(ref)
  ));

  await deletePlayerData('Prueba');

  expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({
    path: 'campaignCharacterSheets/prueba-character',
  }));
});

test('keeps character and player documents when campaign sheet deletion fails', async () => {
  deleteDoc.mockImplementation((reference) => (
    reference.path === 'campaignCharacterSheets/prueba-character'
      ? Promise.reject(new Error('Sin conexión'))
      : Promise.resolve()
  ));

  await expect(deletePlayerData('Prueba')).rejects.toThrow('Sin conexión');

  expect(deleteDoc).not.toHaveBeenCalledWith(expect.objectContaining({
    path: 'characters/prueba-character',
  }));
  expect(deleteDoc).not.toHaveBeenCalledWith(expect.objectContaining({ path: 'players/Prueba' }));
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
