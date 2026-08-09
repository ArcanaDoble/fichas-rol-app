export const RECENT_LOCAL_WRITE_PROTECTION_MS = 12000;

export const createSerialPersistQueue = () => {
  let tail = Promise.resolve();

  return (persistTask) => {
    const queuedTask = tail
      .catch(() => undefined)
      .then(() => persistTask());

    tail = queuedTask.catch(() => undefined);
    return queuedTask;
  };
};

const areValuesEqual = (left, right) => {
  if (left === right) return true;

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

export const buildScenarioItemChanges = (
  itemsToPersist = [],
  originalItems = [],
  explicitModifiedIds = null
) => {
  const originalMap = new Map((originalItems || []).map(item => [item.id, item]));
  const finalMap = new Map((itemsToPersist || []).map(item => [item.id, item]));
  const explicitIdSet = Array.isArray(explicitModifiedIds)
    ? new Set(explicitModifiedIds.filter(Boolean))
    : null;

  const modifiedOrAdded = [];
  (itemsToPersist || []).forEach(item => {
    const original = originalMap.get(item.id);
    const isExplicit = explicitIdSet?.has(item.id);

    if (isExplicit || !original || !areValuesEqual(original, item)) {
      modifiedOrAdded.push(item);
    }
  });

  const deletedIds = [];
  (originalItems || []).forEach(item => {
    if (!finalMap.has(item.id)) {
      deletedIds.push(item.id);
    }
  });

  return {
    originalMap,
    finalMap,
    modifiedOrAdded,
    deletedIds,
  };
};

export const mergeScenarioItemsForPersist = (
  currentItems = [],
  modifiedOrAdded = [],
  deletedIds = [],
  originalItems = []
) => {
  const modifiedMap = new Map((modifiedOrAdded || []).map(item => [item.id, item]));
  const deletedIdSet = new Set(deletedIds || []);
  const originalMap = new Map((originalItems || []).map(item => [item.id, item]));

  const nextItems = (currentItems || [])
    .map(item => {
      if (deletedIdSet.has(item.id)) return null;
      const modifiedItem = modifiedMap.get(item.id);
      if (!modifiedItem) return item;

      const changedFields = getChangedItemFields(modifiedItem, originalMap.get(item.id));
      if (Object.keys(changedFields).length === 0) return item;

      return {
        ...item,
        ...changedFields,
      };
    })
    .filter(Boolean);

  const currentIds = new Set((currentItems || []).map(item => item.id));
  const originalIds = new Set((originalItems || []).map(item => item.id));

  (modifiedOrAdded || []).forEach(item => {
    if (!currentIds.has(item.id) && !originalIds.has(item.id)) {
      nextItems.push(item);
    }
  });

  return nextItems;
};

export const getChangedItemFields = (item, originalItem) => {
  if (!item) return {};

  return Object.entries(item).reduce((fields, [key, value]) => {
    if (!originalItem || !areValuesEqual(originalItem[key], value)) {
      fields[key] = value;
    }
    return fields;
  }, {});
};

export const normalizeRecentLocalWrite = (write) => {
  if (!write) return null;

  if (write.fields && typeof write.fields === 'object') {
    return {
      time: Number(write.time) || 0,
      fields: { ...write.fields },
    };
  }

  const { time, ...legacyFields } = write;
  return {
    time: Number(time) || 0,
    fields: legacyFields,
  };
};

export const isRecentLocalWrite = (
  write,
  now = Date.now(),
  protectionMs = RECENT_LOCAL_WRITE_PROTECTION_MS
) => {
  const normalized = normalizeRecentLocalWrite(write);
  if (!normalized) return false;
  return now - normalized.time < protectionMs;
};

export const hasRecentLocalPositionWrite = (
  write,
  now = Date.now(),
  protectionMs = RECENT_LOCAL_WRITE_PROTECTION_MS
) => {
  const normalized = normalizeRecentLocalWrite(write);
  if (!normalized || now - normalized.time >= protectionMs) return false;

  return (
    Object.prototype.hasOwnProperty.call(normalized.fields, 'x') ||
    Object.prototype.hasOwnProperty.call(normalized.fields, 'y')
  );
};

export const getRemoteModifiedItemIds = (remoteData) => {
  if (!Array.isArray(remoteData?.lastModifiedItemIds)) return null;
  return new Set(remoteData.lastModifiedItemIds.filter(Boolean));
};

export const shouldTreatRemotePositionAsConflict = ({
  itemId,
  remoteItem,
  originalItem,
  localItem,
  remoteModifiedItemIds = null,
  remoteWriterId = null,
  localWriterId = null,
  recentLocalWrite = null,
  now = Date.now(),
}) => {
  if (!itemId || !remoteItem || !originalItem || !localItem) return false;

  const remoteMovedFromOriginal = remoteItem.x !== originalItem.x || remoteItem.y !== originalItem.y;
  const remoteDiffersFromLocal = remoteItem.x !== localItem.x || remoteItem.y !== localItem.y;

  if (!remoteMovedFromOriginal || !remoteDiffersFromLocal) return false;
  if (remoteWriterId && localWriterId && remoteWriterId === localWriterId) return false;
  if (remoteModifiedItemIds && !remoteModifiedItemIds.has(itemId)) return false;

  if (!remoteModifiedItemIds && hasRecentLocalPositionWrite(recentLocalWrite, now)) {
    return false;
  }

  return true;
};
