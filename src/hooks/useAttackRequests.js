import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function useAttackRequests({ tokens, playerName, userType, onAttack }) {
  useEffect(() => {
    if (!tokens || tokens.length === 0) return () => {};
    const q = collection(db, 'attacks');
    const unsub = onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        const target = tokens.find(t => t.id === data.targetId);
        if (!target) return;
        const isTargetPlayer = target.controlledBy === playerName;
        const isMaster = userType === 'master';
        if (isTargetPlayer || isMaster) {
          onAttack && onAttack({ id: change.doc.id, ...data });
        }
      });
    });
    return () => unsub();
  }, [tokens, playerName, userType, onAttack]);
}
