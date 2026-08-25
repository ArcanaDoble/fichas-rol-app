export const ROGUELITE_TALENT_SLOT_COUNT = 3;

const slugifyTalentId = (value, index = 0) => {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `talento-${index + 1}`;
};

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const resolveEditableText = (value, primaryKey, legacyKey, fallback = '') => {
  if (hasOwn(value, primaryKey)) {
    return String(value[primaryKey] ?? '');
  }
  if (hasOwn(value, legacyKey)) {
    return String(value[legacyKey] ?? '');
  }
  return fallback;
};

const normalizeTalent = (talent, index, legacySource = false) => {
  const rawTalent = talent && typeof talent === 'object' ? talent : {};
  const name = resolveEditableText(
    rawTalent,
    'name',
    'nombre',
    `Talento ${index + 1}`
  );

  return {
    ...rawTalent,
    id: String(rawTalent.id || slugifyTalentId(name, index)).trim(),
    name,
    description: resolveEditableText(rawTalent, 'description', 'desc'),
    image: rawTalent.image || rawTalent.icon || '',
    imageSource: rawTalent.imageSource || '',
    available: legacySource
      ? Boolean(rawTalent.isActive)
      : rawTalent.available !== false,
  };
};

export const resolveRogueliteTalentCatalog = (classDefinition = {}) => {
  const dedicatedCatalog = Array.isArray(classDefinition.talentCatalog)
    ? classDefinition.talentCatalog
    : classDefinition.roguelite?.talentCatalog;
  const usesDedicatedCatalog = Array.isArray(dedicatedCatalog);
  const source = usesDedicatedCatalog
    ? dedicatedCatalog
    : classDefinition.actionData?.reaction || [];

  const usedIds = new Set();
  return (Array.isArray(source) ? source : []).map((talent, index) => {
    const normalized = normalizeTalent(talent, index, !usesDedicatedCatalog);
    let uniqueId = normalized.id;
    let suffix = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${normalized.id}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(uniqueId);
    return { ...normalized, id: uniqueId };
  });
};

export const resolveEquippedTalentIds = (
  storedConfiguration = {},
  talentCatalog = []
) => {
  const catalogById = new Map(
    talentCatalog.map((talent) => [talent.id, talent])
  );
  const catalogByName = new Map(
    talentCatalog.map((talent) => [talent.name.trim().toLowerCase(), talent.id])
  );
  const storedSlots = Array.isArray(storedConfiguration.equippedTalentIds)
    ? storedConfiguration.equippedTalentIds
    : storedConfiguration.talents?.slots;
  return Array.from({ length: ROGUELITE_TALENT_SLOT_COUNT }, (_, index) => {
    const storedTalent = Array.isArray(storedSlots) ? storedSlots[index] : null;
    const candidateId =
      typeof storedTalent === 'string'
        ? storedTalent
        : storedTalent?.id ||
          catalogByName.get(
            String(storedTalent?.name || storedTalent?.nombre || '')
              .trim()
              .toLowerCase()
          );

    if (!candidateId || !catalogById.has(candidateId)) return null;
    return candidateId;
  });
};

export const ROGUELITE_SKILL_SLOT_COUNT = 3;

export const resolveEquippedSkillIds = (
  storedConfiguration = {},
  abilityCatalog = []
) => {
  const storedSlots = Array.isArray(storedConfiguration.equippedSkillIds)
    ? storedConfiguration.equippedSkillIds
    : storedConfiguration.skills?.slots;

  return Array.from({ length: ROGUELITE_SKILL_SLOT_COUNT }, (_, index) => {
    const stored = Array.isArray(storedSlots) ? storedSlots[index] : null;
    const candidateId =
      typeof stored === 'string'
        ? stored
        : stored?.templateId || stored?.id || stored?.name || null;
    if (!candidateId) return null;
    return String(candidateId).trim();
  });
};

export const createEmptyRogueliteTalent = (existingCatalog = []) => {
  const baseId = `talento-${Date.now()}`;
  let id = baseId;
  let suffix = 2;
  const existingIds = new Set(existingCatalog.map((talent) => talent.id));
  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return {
    id,
    name: 'Nuevo talento',
    description: 'Describe el efecto de este talento.',
    image: '',
    imageSource: '',
    available: true,
  };
};
