import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function useAttackRequests({ tokens, playerName, userType, onAttack }) {
  const tokensRef = useRef(tokens);
  const callbackRef = useRef(onAttack);

  // Mantener referencia actualizada sin recrear el listener
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    callbackRef.current = onAttack;
  }, [onAttack]);

  useEffect(() => {
    const q = query(collection(db, 'attacks'), where('completed', '==', false));
    const unsub = onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        if (change.type === 'added') {
          const currentTokens = tokensRef.current || [];
          const target = currentTokens.find(t => t.id === data.targetId);
          if (!target) return;
          const isTargetPlayer = target.controlledBy === playerName;
          const isMaster = userType === 'master';
          if (isTargetPlayer || isMaster) {
            callbackRef.current && callbackRef.current({ id: change.doc.id, ...data });
          }
        } else if (change.type === 'removed') {
          callbackRef.current && callbackRef.current({ id: change.doc.id, deleted: true });
        }
      });
    });
    return () => unsub();
  }, [playerName, userType]);
}
