import { useEffect, useMemo, useReducer } from 'react';
import { fetchPieceArt } from './roomClient';
import box from './starterBox.json';

const boxArt = new Map([
  ...box.characters.flatMap((c) => [
    [c.id, c.portrait],
    ...c.pool.map((i) => [i.id, i.image]),
  ]),
  ...box.enemies.map((e) => [e.name, e.image]),
]);
const needsRoom = (image) =>
  /^https:\/\/(?:firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//i.test(
    image || ''
  );

// A visible piece identifies each request. Its original Storage URL never has
// to be painted directly onto a cross-origin WebGL texture.
export default function usePieceArtwork(session, asSeat, game) {
  const cache = useMemo(() => new Map(), [session, asSeat]);
  const [revision, repaint] = useReducer((n) => n + 1, 0);
  const wanted = useMemo(() => {
    const images = new Map();
    for (const piece of Object.values(game?.pieces || {})) {
      if (needsRoom(piece.image) && !images.has(piece.image))
        images.set(piece.image, piece.id);
    }
    return JSON.stringify([...images]);
  }, [game?.pieces]);

  useEffect(
    () => () => {
      for (const slot of cache.values()) {
        slot.controller.abort();
        if (slot.url) URL.revokeObjectURL(slot.url);
      }
      cache.clear();
    },
    [cache]
  );

  useEffect(() => {
    if (!session) return;
    const needed = new Map(JSON.parse(wanted));
    for (const [source, slot] of cache) {
      if (needed.has(source) && (slot.url || slot.id === needed.get(source)))
        continue;
      slot.controller.abort();
      if (slot.url) URL.revokeObjectURL(slot.url);
      cache.delete(source);
    }
    const waiting = [];
    for (const [source, id] of needed) {
      if (cache.has(source)) continue;
      const slot = { id, controller: new AbortController(), url: null };
      cache.set(source, slot);
      waiting.push([source, slot]);
    }
    async function loadNext() {
      while (waiting.length) {
        const [source, slot] = waiting.shift();
        if (slot.controller.signal.aborted) continue;
        try {
          const blob = await fetchPieceArt(
            session,
            slot.id,
            asSeat,
            slot.controller.signal
          );
          if (blob.size && cache.get(source) === slot) {
            slot.url = URL.createObjectURL(blob);
            repaint();
          }
        } catch {
          // The original box artwork stays visible when the service is offline.
        }
      }
    }
    const workerCount = Math.min(waiting.length, 4);
    for (let i = 0; i < workerCount; i++) void loadNext();
  }, [cache, session, asSeat, wanted]);

  return useMemo(() => {
    if (!game || wanted === '[]') return game;
    const pieces = { ...game.pieces };
    for (const piece of Object.values(pieces)) {
      if (!needsRoom(piece.image)) continue;
      const seat = game.seats[piece.seatId];
      const fallbackId =
        piece.kind === 'token' || piece.kind === 'mat'
          ? seat?.classId
          : piece.catalogId;
      pieces[piece.id] = {
        ...piece,
        image:
          cache.get(piece.image)?.url ||
          boxArt.get(fallbackId) ||
          boxArt.get(piece.name) ||
          '',
      };
    }
    return { ...game, pieces };
  }, [cache, game, revision, wanted]);
}
