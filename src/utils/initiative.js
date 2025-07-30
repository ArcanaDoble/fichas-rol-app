import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { saveTokenSheet } from './token';

export const addSpeedForToken = async (token, speed) => {
  if (!token || !token.id || speed <= 0) return;
  try {
    const initiativeRef = doc(db, 'initiative', 'current');
    const initiativeDoc = await getDoc(initiativeRef);
    let participants = [];
    if (initiativeDoc.exists()) {
      participants = initiativeDoc.data().participants || [];
    }
    const name = token.customName || token.name || 'Token sin nombre';
    const addedBy = token.controlledBy || 'unknown';

    const idx = participants.findIndex(
      (p) => p.name === name && p.addedBy === addedBy
    );
    if (idx >= 0) {
      participants[idx] = {
        ...participants[idx],
        speed: (participants[idx].speed || 0) + speed,
      };
    } else {
      const newParticipant = {
        id: Date.now().toString(),
        name,
        speed,
        type: addedBy === 'master' ? 'enemy' : 'player',
        addedBy: addedBy === 'master' ? 'master' : addedBy,
      };
      participants = [...participants, newParticipant];
    }
    await updateDoc(initiativeRef, { participants });
  } catch (err) {
    console.error('Error updating initiative speed:', err);
  }
};

export const consumeStatForToken = async (token, stat, amount, pageId) => {
  if (!token?.tokenSheetId || amount <= 0) return;
  try {
    const stored = localStorage.getItem('tokenSheets');
    const sheets = stored ? JSON.parse(stored) : {};
    let sheet = sheets[token.tokenSheetId];
    if (!sheet) {
      const snap = await getDoc(doc(db, 'tokenSheets', token.tokenSheetId));
      if (snap.exists()) sheet = snap.data();
    }
    if (!sheet?.stats?.[stat]) return;
    sheet = {
      ...sheet,
      stats: {
        ...sheet.stats,
        [stat]: { ...sheet.stats[stat], actual: Math.max(0, (sheet.stats[stat].actual || 0) - amount) },
      },
    };
    sheets[token.tokenSheetId] = sheet;
    localStorage.setItem('tokenSheets', JSON.stringify(sheets));
    window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: sheet }));
    saveTokenSheet(sheet);

    if (pageId) {
      let effectivePageId = pageId;
      try {
        const visibilityDoc = await getDoc(doc(db, 'gameSettings', 'playerVisibility'));
        if (visibilityDoc.exists()) {
          effectivePageId = visibilityDoc.data().playerVisiblePageId || pageId;
        }
      } catch (err) {
        console.warn('No se pudo obtener playerVisiblePageId, usando pageId actual:', err);
      }
      try {
        await addDoc(collection(db, 'damageEvents'), {
          tokenId: token.id,
          value: amount,
          stat,
          ts: Date.now(),
          pageId: effectivePageId,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        console.error('Error registrando consumo de stat:', err);
      }
    }
  } catch (err) {
    console.error('Error consuming stat for token:', err);
  }
};
