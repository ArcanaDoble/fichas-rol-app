import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export const FIREBALL_IMPACT_MS = 1100;
export const FIREBALL_RESOLVE_MS = 3000;
export const FIREBALL_DURATION_MS = 4400;
const MAX_EVENT_AGE_MS = 30000;

const baseline = (scenarioId, effect) => ({ scenarioId, lastId: effect?.id,
  seen: new Set(effect?.id ? [effect.id] : []), playback: null });

// Observe once at workspace level. The map and the resolution panel share the
// same local clock, giving a delayed defender the whole launch. Loading an
// existing scene, returning to it or reconnecting must not replay saved casts.
export const useCanvasSpellPresentation = (scenarioId, effect) => {
  const reducedMotion = Boolean(useReducedMotion());
  const [stored, setStored] = useState(() => baseline(scenarioId, effect));
  const [, tick] = useState(0);
  let state = stored;
  if (state.scenarioId !== scenarioId) {
    state = baseline(scenarioId, effect);
    setStored(state);
  } else if (state.lastId !== effect?.id) {
    const now = Date.now();
    const startedAt = Number(effect?.startedAt) || 0;
    const fresh = !state.seen.has(effect?.id) && ['fireball', 'arcane-projectile', 'arcane-mist', 'runic-barrier'].includes(effect?.spellId) && effect.placement && startedAt
      && now - startedAt < MAX_EVENT_AGE_MS && startedAt <= now + 1000 && !document.hidden;
    const seen = new Set(state.seen);
    if (effect?.id) seen.add(effect.id);
    if (seen.size > 256) seen.delete(seen.values().next().value);
    state = { ...state, lastId: effect?.id,
      seen, playback: fresh ? { ...effect, presentationStartedAt: now } : null };
    setStored(state);
  }

  const playback = state.playback;
  const resolveMs = reducedMotion ? 600 : FIREBALL_RESOLVE_MS;
  const durationMs = reducedMotion ? 1800 : FIREBALL_DURATION_MS;
  useEffect(() => {
    if (!playback) return undefined;
    const elapsed = Date.now() - playback.presentationStartedAt;
    const timers = [resolveMs, durationMs].filter(at => at > elapsed)
      .map(at => setTimeout(() => tick(value => value + 1), at - elapsed));
    return () => timers.forEach(clearTimeout);
  }, [playback, resolveMs, durationMs]);
  useEffect(() => {
    const end = () => setStored(previous => ({ ...previous, playback: null }));
    const hide = () => { if (document.hidden) end(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('offline', end);
    window.addEventListener('online', end);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('offline', end);
      window.removeEventListener('online', end);
    };
  }, []);
  const elapsed = playback ? Math.max(0, Date.now() - playback.presentationStartedAt) : Infinity;
  return { effect: elapsed < durationMs ? playback : null, reducedMotion, durationMs,
    resolvingDeferred: elapsed < resolveMs };
};

export const isSpellResolutionDeferred = (presentation, pending) => Boolean(
  presentation?.resolvingDeferred && ['fireball', 'arcane-projectile'].includes(pending?.spellId)
  && presentation.effect?.id === pending.blastId,
);
