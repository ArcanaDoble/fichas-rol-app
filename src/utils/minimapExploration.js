import {
  arrayRemove,
  arrayUnion,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const sanitizeKeys = (keys) => {
  if (!Array.isArray(keys)) return [];
  const seen = new Set();
  const sanitized = [];
  keys.forEach((raw) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) return;
    if (!/^\d+-\d+$/.test(trimmed)) return;
    seen.add(trimmed);
    sanitized.push(trimmed);
  });
  return sanitized;
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

export const updateMinimapExplorationCells = async ({
  db,
  quadrantId,
  keys,
  action = 'add',
  masterMode = false,
  exploredCellsSet,
  explorerFrontierSet,
  setExploredCellKeys,
}) => {
  if (!db || !quadrantId) return [];
  const sanitized = sanitizeKeys(keys);
  if (sanitized.length === 0) return [];

  const exploredSet = exploredCellsSet instanceof Set ? exploredCellsSet : new Set();
  const frontierSet = explorerFrontierSet instanceof Set ? explorerFrontierSet : new Set();
  const mode = action === 'remove' ? 'remove' : 'add';

  const filtered = sanitized.filter((key) => {
    if (mode === 'add') {
      if (exploredSet.has(key)) return false;
      return frontierSet.has(key);
    }
    if (!masterMode) return false;
    return exploredSet.has(key);
  });

  if (filtered.length === 0) return [];

  if (typeof setExploredCellKeys === 'function') {
    if (mode === 'add') {
      setExploredCellKeys((prev) => {
        const prevArray = toArray(prev);
        const merged = new Set(prevArray);
        filtered.forEach((key) => merged.add(key));
        if (merged.size === prevArray.length) return prevArray;
        return Array.from(merged);
      });
    } else {
      const removeSet = new Set(filtered);
      setExploredCellKeys((prev) => {
        const prevArray = toArray(prev);
        let changed = false;
        const next = prevArray.filter((key) => {
          if (removeSet.has(key)) {
            changed = true;
            return false;
          }
          return true;
        });
        return changed ? next : prevArray;
      });
    }
  }

  const explorationDocRef = doc(db, 'minimapExplorations', quadrantId);
  const fieldValue =
    mode === 'add'
      ? arrayUnion(...filtered)
      : arrayRemove(...filtered);

  await setDoc(
    explorationDocRef,
    {
      cells: fieldValue,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return filtered;
};
