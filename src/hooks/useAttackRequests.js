import { useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const normalizeName = (value) => (typeof value === 'string' ? value.trim() : '');

const partitionIds = (ids, size = 10) => {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
};

export default function useAttackRequests({
  tokens,
  playerName,
  userType,
  pageId,
  onAttack,
}) {
  const tokensRef = useRef(tokens);
  const callbackRef = useRef(onAttack);
  const playerNameRef = useRef(playerName);

  // Mantener referencia actualizada sin recrear el listener
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    callbackRef.current = onAttack;
  }, [onAttack]);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  const normalizedPlayerName = useMemo(() => normalizeName(playerName), [playerName]);

  const controlledTokenIds = useMemo(() => {
    if (userType === 'master') return [];
    if (!tokens?.length || !normalizedPlayerName) return [];
    const ids = tokens
      .filter((token) => normalizeName(token?.controlledBy) === normalizedPlayerName)
      .map((token) => token?.id)
      .filter(Boolean);
    ids.sort();
    return ids;
  }, [tokens, normalizedPlayerName, userType]);

  const controlledIdsKey = useMemo(
    () => (controlledTokenIds.length ? controlledTokenIds.join('|') : 'none'),
    [controlledTokenIds]
  );

  const controlledIdsRef = useRef(controlledTokenIds);

  useEffect(() => {
    controlledIdsRef.current = controlledTokenIds;
  }, [controlledIdsKey, controlledTokenIds]);

  useEffect(() => {
    const handleSnapshot = (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        if (change.type === 'added') {
          const currentTokens = tokensRef.current || [];
          const target = currentTokens.find(t => t.id === data.targetId);
          if (!target && userType !== 'master') return;
          const isTargetPlayer = target?.controlledBy === playerNameRef.current;
          const isMaster = userType === 'master';
          if (isTargetPlayer || isMaster) {
            callbackRef.current && callbackRef.current({ id: change.doc.id, ...data });
          }
        } else if (change.type === 'removed') {
          callbackRef.current && callbackRef.current({ id: change.doc.id, deleted: true });
        }
      });
    };

    const constraints = [where('completed', '==', false)];
    if (pageId) {
      constraints.push(where('pageId', '==', pageId));
    }

    if (userType === 'master') {
      const q = query(collection(db, 'attacks'), ...constraints);
      const unsubscribe = onSnapshot(q, handleSnapshot);
      return () => unsubscribe();
    }

    if (controlledIdsKey !== 'none') {
      const ids = controlledIdsRef.current || [];
      const partitions = partitionIds(ids);
      const unsubscribers = partitions
        .filter((chunk) => chunk.length)
        .map((chunk) =>
          onSnapshot(
            query(collection(db, 'attacks'), ...constraints, where('targetId', 'in', chunk)),
            handleSnapshot
          )
        );
      if (!unsubscribers.length) {
        return () => {};
      }
      return () => {
        unsubscribers.forEach((unsub) => unsub && unsub());
      };
    }

    if (normalizedPlayerName) {
      const q = query(
        collection(db, 'attacks'),
        ...constraints,
        where('targetControlledIds', 'array-contains', normalizedPlayerName)
      );
      const unsubscribe = onSnapshot(q, handleSnapshot);
      return () => unsubscribe();
    }

    return () => {};
  }, [pageId, userType, controlledIdsKey, normalizedPlayerName]);
}
