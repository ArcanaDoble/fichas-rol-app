import { serverTimestamp } from 'firebase/firestore';

export const DAMAGE_EVENT_STALE_MS = 9500;

export const buildDamageEventWrite = (payload = {}, pageId, now = Date.now()) => {
  const clientTimestamp =
    typeof payload.clientTimestamp === 'number'
      ? payload.clientTimestamp
      : typeof payload.ts === 'number'
        ? payload.ts
        : now;

  return {
    ...payload,
    ts: clientTimestamp,
    clientTimestamp,
    pageId,
    timestamp: serverTimestamp(),
  };
};

export const getDamageEventTimestampMs = (eventData) => {
  if (typeof eventData?.clientTimestamp === 'number') return eventData.clientTimestamp;
  if (eventData?.timestamp?.toMillis) return eventData.timestamp.toMillis();
  if (typeof eventData?.timestamp === 'number') return eventData.timestamp;
  if (typeof eventData?.ts === 'number') return eventData.ts;
  return 0;
};

export const isDamageEventStale = (
  eventData,
  now = Date.now(),
  maxAgeMs = DAMAGE_EVENT_STALE_MS,
) => {
  const timestampMs = eventData?.timestamp?.toMillis
    ? eventData.timestamp.toMillis()
    : typeof eventData?.timestamp === 'number'
      ? eventData.timestamp
      : 0;
  if (!timestampMs) return false;
  return now - timestampMs > maxAgeMs;
};
