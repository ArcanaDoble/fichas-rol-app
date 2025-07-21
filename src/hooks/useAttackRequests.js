import { useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function useAttackRequests({ tokens, playerName, userType, onAttack }) {
  const tokensRef = useRef(tokens);

  // Mantener referencia actualizada sin recrear el listener
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    const q = collection(db, 'attacks');
    const unsub = onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        const currentTokens = tokensRef.current || [];
        const target = currentTokens.find(t => t.id === data.targetId);
        if (!target) return;
        const isTargetPlayer = target.controlledBy === playerName;
        const isMaster = userType === 'master';
        if (isTargetPlayer || isMaster) {
          onAttack && onAttack({ id: change.doc.id, ...data });
        }
      });
    });
    return () => unsub();
  }, [playerName, userType, onAttack]);
}
