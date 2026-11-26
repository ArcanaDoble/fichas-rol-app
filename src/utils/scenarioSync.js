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

const isRecord = value => value && typeof value === 'object' && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

// Persist the edited leaves, not a stale copy of the whole stats/loadout object.
const mergeEditedValues = (current, edited, original) => {
  if (areValuesEqual(edited, original)) return current;
  if (!isRecord(edited) || !isRecord(original)) return edited;
  const result = { ...(isRecord(current) ? current : {}) };
  Object.keys(original).forEach(key => { if (!(key in edited)) delete result[key]; });
  Object.entries(edited).forEach(([key, value]) => {
    if (!areValuesEqual(value, original[key])) result[key] = mergeEditedValues(result[key], value, original[key]);
  });
  return result;
};

const mergePhysicalInventoryDelta = (current, edited, original) => {
  if (![current, edited, original].every(Array.isArray)) return edited;
  const identity = item => item?.instanceId || item?.runItemId;
  if (![...current, ...edited, ...original].every(item => identity(item))) return edited;
  const before = new Map(original.map(item => [identity(item), item]));
  const after = new Map(edited.map(item => [identity(item), item]));
  const remaining = current.filter(item => !before.has(identity(item)) || after.has(identity(item)))
    .map(item => before.has(identity(item)) && after.has(identity(item))
      ? mergeEditedValues(item, after.get(identity(item)), before.get(identity(item))) : item);
  const present = new Set(remaining.map(identity));
  edited.forEach(item => {
    const id = identity(item);
    // Only actual additions may be appended. An unchanged copy consumed remotely
    // must not reappear when this client picks up a different object.
    if (!before.has(id) && !present.has(id)) { remaining.push(item); present.add(id); }
  });
  return remaining;
};

export const CANVAS_RUNTIME_FIELDS = new Set([
  'stats', 'inventory', 'equipmentLoadout', 'equippedItems', 'runRevision', 'runtimeDirty',
  'canvasRuntimeRevision', 'canvasHealingEffect', 'status', 'arcaneBarrier',
]);

export const isStaleScenarioSnapshot = (current, remote) => (
  Number(remote?.lastModified || 0) < Number(current?.lastModified || 0)
);

// Shared by the real listener and the two-client regression harness. Runtime commits
// supersede old optimistic fields; they must never be rolled back by a UI lock.
export const reconcileScenarioItemSnapshot = (remote, local, {
  draft = {}, recentWrite = null, now = Date.now(),
} = {}) => {
  const nextDraft = { ...draft };
  const recent = normalizeRecentLocalWrite(recentWrite);
  const remoteRevision = Number(remote.canvasRuntimeRevision || 0);
  const newerRuntime = remoteRevision > Number(local?.canvasRuntimeRevision || 0);
  Object.entries(nextDraft).forEach(([key, value]) => {
    if (areValuesEqual(remote[key], value) || (CANVAS_RUNTIME_FIELDS.has(key) && (
      newerRuntime || (remoteRevision > 0 && areValuesEqual(local?.[key], remote[key]) && !areValuesEqual(local?.[key], value))
    ))) delete nextDraft[key];
  });
  const fields = {};
  if (recent && now - recent.time < RECENT_LOCAL_WRITE_PROTECTION_MS) {
    Object.entries(recent.fields).forEach(([key, value]) => {
      const superseded = CANVAS_RUNTIME_FIELDS.has(key)
        && remoteRevision > Number(recent.baseRuntimeRevision || 0);
      if (!superseded && !areValuesEqual(remote[key], value)) fields[key] = value;
    });
  }
  return {
    item: { ...remote, ...nextDraft, ...fields },
    draft: Object.keys(nextDraft).length ? nextDraft : null,
    recentWrite: Object.keys(fields).length ? { ...recent, fields } : null,
  };
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

      const next = mergeEditedValues(item, modifiedItem, originalMap.get(item.id));
      for (const field of ['inventory', 'equippedItems']) {
        if (field in changedFields && originalMap.has(item.id)) {
          next[field] = mergePhysicalInventoryDelta(item[field], modifiedItem[field], originalMap.get(item.id)[field]);
        }
      }
      if (['rogueliteClass', 'rogueliteEnemy'].includes(item.profileType)
        && Object.keys(changedFields).some(key => CANVAS_RUNTIME_FIELDS.has(key))) {
        next.canvasRuntimeRevision = Number(item.canvasRuntimeRevision || 0) + 1;
      }
      return next;
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
      ...(write.baseRuntimeRevision !== undefined ? { baseRuntimeRevision: write.baseRuntimeRevision } : {}),
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
