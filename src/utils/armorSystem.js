const normalizeKey = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const splitBracketTraits = (value) => {
  const text = String(value || '');
  const matches = text.match(/\[[^\]]+\]/g);
  if (!matches) return null;
  return matches
    .map((entry) => entry.replace(/[[\]]/g, '').trim())
    .filter(Boolean);
};

export const parseCombatTraits = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((value) =>
        value !== undefined && value !== null ? value.toString().trim() : ''
      )
      .filter(Boolean);
  }
  const bracketTraits = splitBracketTraits(input);
  if (bracketTraits) return bracketTraits;
  return String(input)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

export const normalizeCombatTrait = (trait) => {
  const normalized = normalizeKey(trait);
  const compact = normalized.replace(/[\s_-]+/g, '');

  if (!normalized) return '';
  if (['derribado', 'derribar', 'derribo'].includes(normalized)) return 'derribo';
  if (normalized === 'penetrante') return 'perforante';
  if (normalized === 'balistica') return 'balistico';
  if (normalized === 'bloquear') return 'bloqueo';
  if (normalized === 'ralentizar') return 'ralentizado';
  if (normalized === 'empujar') return 'empuje';
  if (compact === 'singuardia') return 'sin guardia';
  return normalized;
};

export const getItemName = (item) =>
  (item?.nombre || item?.name || item?.label || '').toString().trim();

export const getItemTraits = (item) =>
  parseCombatTraits(
    item?.rasgos || item?.traits || item?.trait || item?.properties || []
  );

const ARMOR_CD_TRAIT_MAP = new Map([
  ['destreza', 'destreza'],
  ['dexterity', 'destreza'],
  ['vigor', 'vigor'],
  ['intelecto', 'intelecto'],
  ['intellect', 'intelecto'],
  ['voluntad', 'voluntad'],
  ['willpower', 'voluntad'],
]);

const resolveArmorCdTrait = (trait) =>
  ARMOR_CD_TRAIT_MAP.get(normalizeKey(trait)) || null;

export const getArmorBlocks = (armor) => {
  const rawValue =
    armor?.blocks ??
    armor?.bloques ??
    armor?.defensa ??
    armor?.defense ??
    armor?.details?.blocks ??
    armor?.details?.defense ??
    '';

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return Math.max(0, Math.floor(rawValue));
  }

  const text = String(rawValue || '').trim();
  if (!text) return 0;

  const numeric = parseInt(text, 10);
  if (!Number.isNaN(numeric)) {
    return Math.max(0, numeric);
  }

  const iconMatches =
    text.match(/[■□⬛⬜◼◻◾◽▪▫🛡]/g) ||
    text.match(/\[[^\]]+\]/g) ||
    [];
  return iconMatches.length;
};

const isWeaponLikeType = (value = '') => {
  const normalized = normalizeKey(value);
  return (
    normalized.includes('weapon') ||
    normalized.includes('arma') ||
    normalized.includes('ability') ||
    normalized.includes('habilidad') ||
    normalized.includes('power') ||
    normalized.includes('poder')
  );
};

export const isArmorItem = (item, armorCatalog = []) => {
  if (!item) return false;
  const type = normalizeKey(
    item.type || item.category || item.slot || item.bodySlot || ''
  );
  if (isWeaponLikeType(type)) return false;
  if (type.includes('armor') || type.includes('armadura')) return true;
  if (normalizeKey(item?.slot || item?.bodySlot || '') === 'body') return true;
  return !!findCatalogMatch(armorCatalog, getItemName(item));
};

const flattenItem = (item) => {
  if (!item) return null;
  if (typeof item === 'string') return { nombre: item };
  if (item.payload && typeof item.payload === 'object') {
    return { ...item.payload, ...item, payload: undefined };
  }
  return item;
};

const findCatalogMatch = (catalog = [], targetName = '') => {
  const normalizedTarget = normalizeKey(targetName);
  if (!normalizedTarget) return null;
  return (
    catalog.find(
      (entry) => normalizeKey(entry?.nombre || entry?.name) === normalizedTarget
    ) || null
  );
};

const getEquippedArray = (entity = {}) => {
  if (Array.isArray(entity?.equippedItems)) {
    return entity.equippedItems.map(flattenItem).filter(Boolean);
  }

  if (entity?.equippedItems && typeof entity.equippedItems === 'object') {
    const items = [];
    Object.entries(entity.equippedItems).forEach(([slot, rawItem]) => {
      if (!rawItem || slot === 'beltSlotCount') return;
      const item = flattenItem(rawItem);
      if (!item) return;
      let type = item.type;
      if (!type) {
        if (slot === 'body') type = 'armor';
        else if (slot === 'mainHand' || slot === 'offHand') type = 'weapon';
        else if (slot.startsWith('accessory_') || slot.startsWith('belt_')) {
          type = 'access';
        }
      }
      items.push(type ? { ...item, type } : item);
    });
    return items;
  }

  return [];
};

const buildArmorCandidateFromCatalog = (entry, armorCatalog = []) => {
  const item = flattenItem(entry);
  if (!item) return null;
  const name = getItemName(item);
  const fromCatalog = findCatalogMatch(armorCatalog, name);
  const merged = fromCatalog ? { ...fromCatalog, ...item } : item;
  return {
    ...merged,
    type: merged.type || 'armor',
  };
};

export const resolveEquippedArmor = (entity, { armaduras = [] } = {}) => {
  if (!entity) return null;

  const equippedItems = getEquippedArray(entity);
  const firstEquippedArmor =
    equippedItems.find(
      (item) =>
        normalizeKey(item?.slot || item?.bodySlot || '') === 'body' ||
        isArmorItem(item, armaduras)
    ) ||
    equippedItems.find((item) => isArmorItem(item, armaduras));

  if (firstEquippedArmor) {
    return buildArmorCandidateFromCatalog(firstEquippedArmor, armaduras);
  }

  if (Array.isArray(entity?.armaduras) && entity.armaduras.length > 0) {
    const firstArmor = entity.armaduras[0];
    return buildArmorCandidateFromCatalog(firstArmor, armaduras);
  }

  return null;
};

export const getArmorStatSnapshot = (stats = {}) => {
  const armorStat = stats?.armadura || {};
  const hasTokenShape =
    armorStat.current !== undefined || armorStat.max !== undefined;
  const current = hasTokenShape
    ? Number(armorStat.current ?? 0)
    : Number(armorStat.actual ?? 0);
  const max = hasTokenShape
    ? Number(armorStat.max ?? armorStat.current ?? 0)
    : Number(armorStat.total ?? armorStat.base ?? 0);
  return {
    current: Number.isFinite(current) ? current : 0,
    max: Number.isFinite(max) ? max : 0,
    shape: hasTokenShape ? 'token' : 'sheet',
  };
};

export const getArmorCdAttribute = (entity, { armaduras = [] } = {}) => {
  const activeArmor = resolveEquippedArmor(entity, { armaduras });
  const armorTraits = getItemTraits(activeArmor);

  for (const trait of armorTraits) {
    const attributeId = resolveArmorCdTrait(trait);
    if (attributeId) return attributeId;
  }

  return 'vigor';
};

const buildArmorSourceKey = (armor) => {
  if (!armor) return null;
  const name = getItemName(armor);
  const id = armor?.id || normalizeKey(name);
  const blocks = getArmorBlocks(armor);
  return `armor:${id}:${blocks}`;
};

export const syncArmorState = (
  entity,
  { armaduras = [], mode = 'sheet' } = {}
) => {
  if (!entity || typeof entity !== 'object') return entity;

  const activeArmor = resolveEquippedArmor(entity, { armaduras });
  const resolvedBlocks = activeArmor ? getArmorBlocks(activeArmor) : 0;

  if (activeArmor && resolvedBlocks <= 0) {
    return entity;
  }

  const nextSourceKey = buildArmorSourceKey(activeArmor);
  const prevSourceKey = entity?.armorSync?.sourceKey ?? null;

  if (prevSourceKey === nextSourceKey && entity?.armorSync) {
    return entity;
  }

  const blocks = activeArmor ? resolvedBlocks : 0;
  const nextStats = { ...(entity.stats || {}) };

  if (mode === 'token') {
    const currentArmor = nextStats.armadura || {};
    nextStats.armadura = {
      ...currentArmor,
      current: blocks,
      max: blocks,
    };
  } else {
    const currentArmor = nextStats.armadura || {};
    nextStats.armadura = {
      ...currentArmor,
      base: blocks,
      buff: 0,
      total: blocks,
      actual: blocks,
    };
  }

  return {
    ...entity,
    stats: nextStats,
    armorSync: {
      sourceKey: nextSourceKey,
      armorName: getItemName(activeArmor),
      blocks,
    },
  };
};

export const getArmorProtection = (
  defender,
  weapon,
  { armaduras = [] } = {}
) => {
  const activeArmor = resolveEquippedArmor(defender, { armaduras });
  const weaponTraits = getItemTraits(weapon);
  const armorTraits = getItemTraits(activeArmor).filter(
    (trait) => !resolveArmorCdTrait(trait)
  );
  const armorStat = getArmorStatSnapshot(defender?.stats || {});
  const armorIsActive = !!activeArmor && armorStat.current > 0;

  if (!armorIsActive || weaponTraits.length === 0 || armorTraits.length === 0) {
    return {
      activeArmor,
      armorProtectionSource: getItemName(activeArmor),
      negatedTraits: [],
      armorCurrent: armorStat.current,
      armorActive: armorIsActive,
    };
  }

  const armorTraitKeys = new Set(armorTraits.map(normalizeCombatTrait));
  const negatedTraits = weaponTraits.filter((trait) =>
    armorTraitKeys.has(normalizeCombatTrait(trait))
  );

  return {
    activeArmor,
    armorProtectionSource: getItemName(activeArmor),
    negatedTraits,
    armorCurrent: armorStat.current,
    armorActive: armorIsActive,
  };
};

export const applyNegatedTraitsToItem = (item, negatedTraits = []) => {
  if (!item || negatedTraits.length === 0) return item;

  const blockedTraitKeys = new Set(negatedTraits.map(normalizeCombatTrait));
  const filterTraits = (value) => {
    const traits = parseCombatTraits(value).filter(
      (trait) => !blockedTraitKeys.has(normalizeCombatTrait(trait))
    );
    if (Array.isArray(value)) return traits;
    if (typeof value === 'string') return traits.join(', ');
    return traits;
  };

  const nextItem = { ...item };
  ['rasgos', 'traits', 'trait', 'properties'].forEach((field) => {
    if (nextItem[field] !== undefined) {
      nextItem[field] = filterTraits(nextItem[field]);
    }
  });

  return nextItem;
};
