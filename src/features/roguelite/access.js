export const EMPTY_ROGUELITE_ACCESS = Object.freeze({
  enabled: false,
  unlockedClassIds: [],
});

export const DEFAULT_CHARACTER_ACCESS = Object.freeze({
  enabled: true,
});

const normalizeClassId = (value) => String(value || '').trim();

export const normalizeRogueliteAccess = (player = {}) => {
  const source = player?.gameAccess?.roguelite || player?.rogueliteAccess || {};
  const unlockedClassIds = Array.from(
    new Set(
      (Array.isArray(source.unlockedClassIds) ? source.unlockedClassIds : [])
        .map(normalizeClassId)
        .filter(Boolean),
    ),
  );

  return {
    enabled: source.enabled === true,
    unlockedClassIds,
  };
};

export const normalizeCharacterAccess = (player = {}) => {
  const source = player?.gameAccess?.characters || player?.characterAccess;

  return {
    // Existing players predate this setting and keep their current behaviour.
    enabled: source?.enabled !== false,
  };
};

export const setCharacterAccessEnabled = (player, enabled) => ({
  ...normalizeCharacterAccess(player),
  enabled: Boolean(enabled),
});

export const setRogueliteEnabled = (player, enabled) => ({
  ...normalizeRogueliteAccess(player),
  enabled: Boolean(enabled),
});

export const toggleRogueliteClass = (player, classId) => {
  const normalizedId = normalizeClassId(classId);
  const access = normalizeRogueliteAccess(player);
  if (!normalizedId) return access;

  const isUnlocked = access.unlockedClassIds.includes(normalizedId);
  return {
    ...access,
    unlockedClassIds: isUnlocked
      ? access.unlockedClassIds.filter((id) => id !== normalizedId)
      : [...access.unlockedClassIds, normalizedId],
  };
};

export const withRogueliteAccess = (player, rogueliteAccess) => ({
  ...player,
  gameAccess: {
    ...(player?.gameAccess || {}),
    roguelite: normalizeRogueliteAccess({ rogueliteAccess }),
  },
});

export const withCharacterAccess = (player, characterAccess) => ({
  ...player,
  gameAccess: {
    ...(player?.gameAccess || {}),
    characters: {
      enabled: characterAccess?.enabled !== false,
    },
  },
});
