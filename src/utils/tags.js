export const DEFAULT_TAG_COLOR = '#ef4444';

export const normalizeTagColor = (value, fallback = DEFAULT_TAG_COLOR) => {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
};

export const parseTag = (value) => {
  const [name = '', color = ''] = String(value || '').split('|');
  return {
    name,
    color: normalizeTagColor(color),
  };
};

export const serializeTag = (name, color) => (
  `${String(name || '')}|${normalizeTagColor(color)}`
);

const normalizeTagName = (value) => parseTag(value).name.trim().toLowerCase();

export const isStatusEffectTag = (value, statusEffects = {}) => {
  const tagName = normalizeTagName(value);
  if (!tagName) return false;

  return Object.entries(statusEffects).some(([key, config]) => (
    key.trim().toLowerCase() === tagName
    || String(config?.label || '').trim().toLowerCase() === tagName
  ));
};

export const isNavigationTag = (value) => (
  ['canvas', 'tablero', 'board'].includes(normalizeTagName(value))
);

export const resolveClassAuthorTags = (tags, statusEffects = {}) => (
  (Array.isArray(tags) ? tags : []).filter((tag) => (
    normalizeTagName(tag)
    && !isStatusEffectTag(tag, statusEffects)
    && !isNavigationTag(tag)
  ))
);

export const resolvePersonalStatusTags = (tags, statusEffects = {}) => (
  (Array.isArray(tags) ? tags : []).filter((tag) => isStatusEffectTag(tag, statusEffects))
);

export const mergeInheritedAndPersonalTags = (inheritedTags, personalTags) => {
  const seenNames = new Set();

  return [...(inheritedTags || []), ...(personalTags || [])].filter((tag) => {
    const tagName = normalizeTagName(tag);
    if (!tagName || seenNames.has(tagName)) return false;
    seenNames.add(tagName);
    return true;
  });
};
