import { useEffect, useRef, useState } from 'react';
import { bothCommitted, privateChoiceReveal, readPrivateChoice, seatForViewer, verifiedGameResult } from './freeParryProtocol';
import useFreeParryConnection from './useFreeParryConnection';

export default function useFreeParryRoom(viewerId, service, storage) {
  const connection = useFreeParryConnection(viewerId, service);
  const { room, attempt, syncing } = connection;
  const [results, setResults] = useState({});
  const [revealError, setRevealError] = useState('');
  const flights = useRef(new Set());
  const game = room?.current;
  const history = room?.history;
  const key = `${viewerId}:${game?.roundId}:${attempt}`;
  const latest = useRef(key);
  latest.current = key;
  useEffect(() => { setRevealError(''); }, [key]);
  useEffect(() => {
    let active = true;
    const rounds = [...(history || []), ...(game?.status === 'active' ? [game] : [])];
    Promise.all(rounds.map(async item => [item.roundId, await verifiedGameResult(item)]))
      .then(entries => {
        if (!active) return;
        setResults(Object.fromEntries(entries));
        if (game?.reveals.a && game?.reveals.b && !entries.find(([id]) => id === game.roundId)?.[1]) {
          setRevealError('No se pudieron verificar ambas elecciones. No se mostrará un resultado incorrecto.');
        }
      })
      .catch(() => { if (active) setRevealError('No se pudieron verificar las elecciones. Reintenta la conexión.'); });
    const seat = seatForViewer(game, viewerId);
    if (!syncing && seat && bothCommitted(game) && !game.reveals[seat] && !flights.current.has(key)) {
      const choice = readPrivateChoice(game, viewerId, storage);
      if (choice) {
        flights.current.add(key);
        service.roomCommand(viewerId, { type:'reveal', roundId:game.roundId, sessionId:game.sessionId,
          reveal:privateChoiceReveal(choice) })
          .then(() => { if (latest.current === key) setRevealError(''); })
          .catch(() => { if (latest.current === key) setRevealError('No se pudo completar la revelación. Tu elección sigue fijada.'); })
          .finally(() => flights.current.delete(key));
      }
    }
    return () => { active = false; };
  }, [game, history, viewerId, service, storage, syncing, key]);
  return { ...connection, error:connection.error || revealError, resultFor:item => results[item?.roundId] || null };
}
