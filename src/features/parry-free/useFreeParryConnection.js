import { useCallback, useEffect, useRef, useState } from 'react';
import { PARRY_PRESENCE_MS, roomMember } from './freeParryRoom';

const HEARTBEAT_MS = 30000;

export default function useFreeParryConnection(viewerId, service) {
  const [snapshot, setSnapshot] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const serverUpdates = useRef(0);
  const retryDelay = useRef(1000);
  const reconnect = useCallback(() => setAttempt(value => value + 1), []);
  const viewerSnapshot = snapshot?.viewerId === viewerId ? snapshot : null;
  const room = viewerSnapshot?.room ?? null;
  const self = roomMember(room, viewerId);
  const joined = Boolean(self);

  useEffect(() => {
    if (!viewerId) return undefined;
    let lastTick = Date.now();
    let lastWake = -Infinity;
    const wake = () => {
      const time = Date.now();
      if (document.visibilityState === 'hidden' || navigator.onLine === false || time - lastWake < 1000) return;
      // Unlocking can dispatch visibilitychange, pageshow and focus together.
      lastWake = lastTick = time;
      setNow(time);
      reconnect();
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') lastWake = -Infinity;
      else wake();
    };
    const pageShow = event => { if (event.persisted) wake(); };
    const offline = () => {
      lastWake = -Infinity;
      setSnapshot(previous => previous?.viewerId === viewerId ? { ...previous, synced:false } : previous);
    };
    const clock = setInterval(() => {
      const time = Date.now();
      // Some mobile browsers suspend timers without delivering a visibility event.
      if (time - lastTick >= PARRY_PRESENCE_MS) wake();
      lastTick = time;
      setNow(time);
    }, 15000);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('resume', wake);
    window.addEventListener('pageshow', pageShow);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    window.addEventListener('offline', offline);
    return () => {
      clearInterval(clock);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('resume', wake);
      window.removeEventListener('pageshow', pageShow);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', offline);
    };
  }, [viewerId, reconnect]);

  useEffect(() => {
    if (!viewerId) { setSnapshot(null); return undefined; }
    let active = true;
    let retryTimer;
    const unsubscribe = service.listenRoom((next, fromCache = false) => {
      if (!active) return;
      if (!fromCache) {
        serverUpdates.current += 1;
        retryDelay.current = 1000;
      }
      setSnapshot(previous => ({ viewerId, attempt, synced:!fromCache, error:'',
        room:fromCache && previous?.viewerId === viewerId ? previous.room : next }));
    }, failure => {
      if (!active) return;
      setSnapshot(previous => ({ viewerId, attempt, synced:false, room:previous?.viewerId === viewerId ? previous.room : null,
        error:'No se pudo conectar con la sala. Reintenta la conexión.' }));
      if (['unavailable', 'deadline-exceeded', 'aborted'].includes(failure?.code)) {
        retryTimer = setTimeout(reconnect, retryDelay.current);
        retryDelay.current = Math.min(HEARTBEAT_MS, retryDelay.current * 2);
      }
    });
    return () => { active = false; clearTimeout(retryTimer); unsubscribe?.(); };
  }, [viewerId, service, attempt, reconnect]);

  useEffect(() => {
    if (!viewerId || !joined) return undefined;
    let active = true, pending = false;
    const heartbeat = async () => {
      if (pending || navigator.onLine === false) return;
      pending = true;
      const before = serverUpdates.current;
      try {
        const next = await service.roomCommand(viewerId, { type:'heartbeat' });
        // The transaction reads the server even if the live stream is still waking up.
        // A later snapshot may already contain the rival's next move.
        if (active && next && serverUpdates.current === before && navigator.onLine !== false) {
          setSnapshot(previous => ({ viewerId, attempt, room:next, synced:true,
            error:previous?.attempt === attempt && previous.viewerId === viewerId ? previous.error : '' }));
        }
      } catch { /* The next pulse or foreground event retries presence. Never rejoin on behalf of a member who left. */ }
      finally { pending = false; }
    };
    heartbeat();
    const timer = setInterval(heartbeat, HEARTBEAT_MS);
    return () => { active = false; clearInterval(timer); };
  }, [viewerId, joined, service, attempt]);

  const current = viewerSnapshot?.attempt === attempt;
  const error = current ? viewerSnapshot.error : '';
  const syncing = !(current && viewerSnapshot.synced && !error);
  return { room, self, joined, now, attempt, reconnect, error, syncing, loading:Boolean(viewerId && !room && syncing && !error) };
}
