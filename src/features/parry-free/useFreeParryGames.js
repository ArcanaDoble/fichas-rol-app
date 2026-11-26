import { useCallback, useEffect, useRef, useState } from 'react';
import { bothCommitted, privateChoiceReveal, readPrivateChoice, seatForViewer, verifiedGameResult } from './freeParryProtocol';

const keyFor = game => `${game.id}:${game.roundId}`;
const emptyGames = [];
export default function useFreeParryGames(viewerId, service, storage) {
  const [snapshot, setSnapshot] = useState({ viewerId:'', games:[], loading:false, error:'' });
  const [results, setResults] = useState({});
  const [revealErrors, setRevealErrors] = useState({});
  const [retry, setRetry] = useState(0);
  const flights = useRef(new Set());
  const currentViewer = useRef(viewerId);
  currentViewer.current = viewerId;
  const games = snapshot.viewerId === viewerId ? snapshot.games : emptyGames;
  useEffect(() => {
    setResults({}); setRevealErrors({});
    if (!viewerId) { setSnapshot({ viewerId:'', games:[], loading:false, error:'' }); return undefined; }
    let active = true;
    setSnapshot({ viewerId, games:[], loading:true, error:'' });
    const unsubscribe = service.listen(viewerId,
      next => { if (active) setSnapshot({ viewerId, games:next, loading:false, error:'' }); },
      () => { if (active) setSnapshot(previous => ({ ...previous, viewerId, loading:false, error:'No se pudo conectar con Parry libre. Reintenta la conexión.' })); });
    return () => { active = false; unsubscribe?.(); };
  }, [viewerId, service, retry]);

  useEffect(() => {
    let active = true;
    const live = games.filter(game => game.status === 'active');
    if (!live.length) return undefined;
    Promise.all(live.map(async game => [keyFor(game), await verifiedGameResult(game)]))
      .then(entries => {
        if (!active) return;
        setResults(Object.fromEntries(entries));
        const invalid = live.filter(game => game.reveals.a && game.reveals.b && !entries.find(([key]) => key === keyFor(game))?.[1]);
        if (invalid.length) setRevealErrors(previous => ({ ...previous, ...Object.fromEntries(invalid.map(game => [keyFor(game), 'No se pudieron verificar ambas elecciones. No se mostrará un resultado incorrecto.'])) }));
      }).catch(() => { if (active) setRevealErrors(previous => ({ ...previous, connection:'No se pudieron verificar las elecciones. Reintenta la conexión.' })); });
    for (const game of live) {
      const seat = seatForViewer(game, viewerId), key = keyFor(game);
      const flightKey = `${viewerId}:${key}`;
      if (!bothCommitted(game) || game.reveals[seat] || flights.current.has(flightKey)) continue;
      const choice = readPrivateChoice(game, viewerId, storage);
      if (!choice) continue;
      flights.current.add(flightKey);
      service.command(game, viewerId, { type:'reveal', reveal:privateChoiceReveal(choice) })
        .then(() => { if (currentViewer.current === viewerId) setRevealErrors(previous => ({ ...previous, [key]:'' })); })
        .catch(() => { if (currentViewer.current === viewerId) setRevealErrors(previous => ({ ...previous, [key]:'No se pudo completar la revelación. Tu elección sigue fijada.' })); })
        .finally(() => flights.current.delete(flightKey));
    }
    return () => { active = false; };
  }, [games, viewerId, service, storage]);
  const reconnect = useCallback(() => { setRevealErrors({}); setRetry(value => value + 1); }, []);
  return { games, loading:snapshot.viewerId !== viewerId || snapshot.loading, error:snapshot.error,
    results, revealErrors, resultFor:game => results[keyFor(game)] || null,
    errorFor:game => revealErrors[keyFor(game)] || revealErrors.connection || snapshot.error, reconnect };
}
