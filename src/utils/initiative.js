import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
