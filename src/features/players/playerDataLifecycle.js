import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { CAMPAIGN_CHARACTER_SHEET_COLLECTION } from '../campaign/characterSheet';
import { clearPrivateParryChoices, FREE_PARRY_COLLECTION, parryViewerId } from '../parry-free/freeParryProtocol';
import { FREE_PARRY_ROOM_COLLECTION, FREE_PARRY_ROOM_ID, removeRoomPlayer } from '../parry-free/freeParryRoom';

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

  const [subcollectionSnapshots, ownedCharactersSnapshot, campaignSheetsSnapshot, parryGamesSnapshot] = await Promise.all([
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
    getDocs(query(
      collection(db, CAMPAIGN_CHARACTER_SHEET_COLLECTION),
      where('owner', '==', normalizedPlayerId),
    )),
    getDocs(query(
      collection(db, FREE_PARRY_COLLECTION),
      where('participantIds', 'array-contains', parryViewerId(false, normalizedPlayerId)),
    )),
  ]);

  // Campaign sheets are keyed by character ID. Include sheets found by owner to
  // clean up records left behind by an interrupted character deletion.
  const campaignSheetIds = new Set([
    ...ownedCharactersSnapshot.docs.map((characterSnapshot) => characterSnapshot.id),
    ...campaignSheetsSnapshot.docs.map((sheetSnapshot) => sheetSnapshot.id),
  ]);
  await Promise.all([...campaignSheetIds].map((characterId) => deleteDoc(doc(
    db,
    CAMPAIGN_CHARACTER_SHEET_COLLECTION,
    characterId,
  ))));

  // Delete descendants and other player-owned records before the parent. If a
  // write fails, the visible player remains available so the operation can be
  // retried instead of leaving only hidden orphan data behind.
  await Promise.all([
    runTransaction(db, async transaction => {
      const reference = doc(db, FREE_PARRY_ROOM_COLLECTION, FREE_PARRY_ROOM_ID);
      const snapshot = await transaction.get(reference);
      if (snapshot.exists()) transaction.set(reference, removeRoomPlayer(snapshot.data(), parryViewerId(false, normalizedPlayerId)));
    }),
    ...subcollectionSnapshots.map((snapshot) => deleteDocuments(snapshot.docs)),
    deleteDocuments(ownedCharactersSnapshot.docs),
    deleteDocuments(parryGamesSnapshot.docs),
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
  clearPrivateParryChoices(parryViewerId(false, normalizedPlayerId), storage);
};
