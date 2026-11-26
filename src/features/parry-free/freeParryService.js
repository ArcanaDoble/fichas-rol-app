import { collection, doc, getDocs, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '../../firebase';
import { applyGameCommand, FREE_PARRY_COLLECTION, gamePairId, makeGame, seatForViewer } from './freeParryProtocol';
import { applyRoomCommand, FREE_PARRY_ROOM_COLLECTION, FREE_PARRY_ROOM_ID } from './freeParryRoom';

export const freeParryService = {
  listenRoom(changed, failed) {
    return onSnapshot(doc(db, FREE_PARRY_ROOM_COLLECTION, FREE_PARRY_ROOM_ID), { includeMetadataChanges:true }, snapshot => {
      changed(snapshot.exists() ? snapshot.data() : null, snapshot.metadata.fromCache);
    }, failed);
  },
  async roomCommand(viewerId, event) {
    const reference = doc(db, FREE_PARRY_ROOM_COLLECTION, FREE_PARRY_ROOM_ID);
    const operation = { ...event, ...(['start', 'next'].includes(event.type) ? { nextRoundId:nanoid() } : {}) };
    return runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      const next = await applyRoomCommand(snapshot.exists() ? snapshot.data() : null, viewerId, operation);
      transaction.set(reference, next);
      return next;
    });
  },
  listen(viewerId, changed, failed) {
    return onSnapshot(query(collection(db, FREE_PARRY_COLLECTION), where('participantIds', 'array-contains', viewerId)), snapshot => {
      changed(snapshot.docs.map(item => ({ ...item.data(), id:item.id }))
        .filter(game => game.schemaVersion === 1 && seatForViewer(game, viewerId))
        .sort((a, b) => b.updatedAt - a.updatedAt));
    }, failed);
  },
  async directory() {
    const snapshot = await getDocs(collection(db, 'characters'));
    return snapshot.docs.map(item => { const data = item.data(); return {
      characterId:item.id, name:data.name || item.id, image:data.avatar || data.image || '', owner:data.owner || 'master',
    }; });
  },
  async create(options) {
    const id = await gamePairId([options.creator.controllerId, options.opponent.controllerId]);
    const reference = doc(db, FREE_PARRY_COLLECTION, id);
    const fresh = makeGame({ ...options, id, roundId:nanoid() });
    return runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      // One ongoing game per pair of controllers prevents duplicate simultaneous invitations.
      if (snapshot.exists() && ['active','invited'].includes(snapshot.data().status)) return { ...snapshot.data(), id };
      transaction.set(reference, fresh);
      return fresh;
    });
  },
  async command(game, viewerId, command) {
    const reference = doc(db, FREE_PARRY_COLLECTION, game.id);
    const operation = { ...command, sessionId:game.sessionId, roundId:game.roundId, ...(command.type === 'next' ? { nextRoundId:nanoid() } : {}) };
    return runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Esta partida ya no existe.');
      const current = { ...snapshot.data(), id:game.id };
      const next = await applyGameCommand(current, viewerId, operation);
      if (next !== current) transaction.set(reference, next);
      return next;
    });
  },
};
