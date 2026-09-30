import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';

const PLAYER_SUBCOLLECTIONS = ['rogueliteClasses', 'assets'];

const normalizePlayerId = (playerId) => String(playerId || '').trim();

const deleteDocuments = async (documents = []) => {
  await Promise.all(documents.map((documentSnapshot) => deleteDoc(documentSnapshot.ref)));
};

/**
 * Removes every document whose lifecycle belongs to one player.
 *
 * Firestore does not cascade-delete subcollections when their parent document
 * is removed. Keeping this operation here prevents a reused player name from
 * inheriting an orphaned Roguelite profile, inventory or equipped loadout.
 */
export const deletePlayerData = async (
  playerId,
  { deletePlayerDocument = true } = {},
) => {
  const normalizedPlayerId = normalizePlayerId(playerId);
  if (!normalizedPlayerId) throw new Error('Se necesita un identificador de jugador');

  const [subcollectionSnapshots, ownedCharactersSnapshot] = await Promise.all([
    Promise.all(PLAYER_SUBCOLLECTIONS.map((subcollectionName) => getDocs(collection(
      db,
      'players',
      normalizedPlayerId,
      subcollectionName,
    )))),
    getDocs(query(
      collection(db, 'characters'),
      where('owner', '==', normalizedPlayerId),
    )),
  ]);

  // Delete descendants and other player-owned records before the parent. If a
  // write fails, the visible player remains available so the operation can be
  // retried instead of leaving only hidden orphan data behind.
  await Promise.all([
    ...subcollectionSnapshots.map((snapshot) => deleteDocuments(snapshot.docs)),
    deleteDocuments(ownedCharactersSnapshot.docs),
    deleteDoc(doc(db, 'inventory', normalizedPlayerId)),
  ]);

  if (deletePlayerDocument) {
    await deleteDoc(doc(db, 'players', normalizedPlayerId));
  }
};

export const clearPlayerLocalData = (playerId, storage = globalThis?.localStorage) => {
  const normalizedPlayerId = normalizePlayerId(playerId);
  if (!normalizedPlayerId || !storage) return;

  [
    `player_${normalizedPlayerId}`,
    `player_${normalizedPlayerId}_backup`,
    `assetSidebar_${normalizedPlayerId}`,
  ].forEach((key) => storage.removeItem(key));
};
