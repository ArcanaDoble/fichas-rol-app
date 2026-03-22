export const getCombatEventOrderValue = (entry) => {
  const event = entry?.event || {};

  if (typeof event.clientTimestamp === 'number') return event.clientTimestamp;
  if (event.timestamp && typeof event.timestamp.toMillis === 'function') return event.timestamp.toMillis();
  if (typeof event.timestamp === 'number') return event.timestamp;

  return Number.MAX_SAFE_INTEGER;
};

export const sortCombatQueueEntries = (queue) => {
  const safeQueue = Array.isArray(queue) ? queue : [];

  return safeQueue
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aOrder = getCombatEventOrderValue(a.entry);
      const bOrder = getCombatEventOrderValue(b.entry);

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
};

export const getCombatQueueDisplayState = ({ queue, resolvedCount = 0 }) => {
  const safeQueue = sortCombatQueueEntries(queue);

  const isWaitingReaction = (entry) => entry?.event?.status === 'esperando_reaccion';
  const isPendingResult = (entry) => typeof entry?.event?.status === 'string' && entry.event.status.endsWith('_pendiente');
  const isResolvedResult = (entry) => entry?.event?.status === 'resuelto';

  let activeIndex = safeQueue.findIndex(isWaitingReaction);
  if (activeIndex === -1) activeIndex = safeQueue.findIndex(isPendingResult);
  if (activeIndex === -1) activeIndex = safeQueue.findIndex(isResolvedResult);
  if (activeIndex === -1 && safeQueue.length > 0) activeIndex = 0;

  const activeEntry = activeIndex >= 0 ? safeQueue[activeIndex] : null;
  const completedBeforeActive = activeIndex >= 0 ? activeIndex : 0;
  const trackerIndex = resolvedCount + completedBeforeActive;

  return {
    activeEntry,
    activeIndex,
    queueTotal: safeQueue.length + resolvedCount,
    queueResolved: trackerIndex,
    queueCurrent: trackerIndex,
  };
};
