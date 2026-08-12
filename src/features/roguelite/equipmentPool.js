const EQUIPMENT_CATEGORIES = Object.freeze([
  'weapons',
  'armor',
  'abilities',
  'objects',
  'accessories',
]);

const HAND_SLOTS = Object.freeze(['mainHand', 'offHand']);
export const ROGUELITE_WEAPON_SET_COUNT = 2;

const clampWeaponSetIndex = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(ROGUELITE_WEAPON_SET_COUNT - 1, Math.max(0, parsed));
};

const createEmptyEquipmentPool = () => Object.fromEntries(
  EQUIPMENT_CATEGORIES.map((category) => [category, []]),
);

const normalizeText = (value) => String(value || '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const slugify = (value) => normalizeText(value)
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const resolveTraitText = (item = {}) => {
  const value = item.traits ?? item.rasgos ?? item.trait ?? item.properties ?? '';
  return Array.isArray(value) ? value.join(', ') : String(value || '');
};

export const resolveEquipmentHandsRequired = (item = {}) => {
  if (!item || typeof item !== 'object') return 1;

  const explicitValue = Number(
    item.handsRequired
    ?? item.requiredHands
    ?? item.manosRequeridas
    ?? item.manos,
  );

  if (explicitValue === 2) return 2;
  if (explicitValue === 1) return 1;

  const traits = normalizeText(resolveTraitText(item));
  return /(^|\W)(dos manos|2 manos|a dos manos|two handed|two-handed)(\W|$)/.test(traits)
    ? 2
    : 1;
};

export const resolveEquippedHandOccupancy = (equippedItems = {}) => {
  const mainHand = equippedItems?.mainHand || null;
  const offHand = equippedItems?.offHand || null;

  if (mainHand && resolveEquipmentHandsRequired(mainHand) === 2) {
    return {
      sourceSlot: 'mainHand',
      blockedSlot: 'offHand',
      item: mainHand,
    };
  }

  if (offHand && resolveEquipmentHandsRequired(offHand) === 2) {
    return {
      sourceSlot: 'offHand',
      blockedSlot: 'mainHand',
      item: offHand,
    };
  }

  return null;
};

export const normalizeEquippedHandSlots = (equippedItems = {}) => {
  const normalized = { ...(equippedItems || {}) };
  const occupancy = resolveEquippedHandOccupancy(normalized);

  if (occupancy) normalized[occupancy.blockedSlot] = null;
  return normalized;
};

const createEmptyWeaponSet = () => ({ mainHand: null, offHand: null });

const normalizeWeaponSet = (weaponSet = {}) => {
  const normalized = normalizeEquippedHandSlots({
    mainHand: weaponSet?.mainHand || null,
    offHand: weaponSet?.offHand || null,
  });

  return {
    mainHand: normalized.mainHand || null,
    offHand: normalized.offHand || null,
  };
};

export const normalizeEquippedWeaponSets = (equippedItems = {}) => {
  const source = equippedItems && typeof equippedItems === 'object'
    ? equippedItems
    : {};
  const activeWeaponSet = clampWeaponSetIndex(source.activeWeaponSet);
  const legacySet = normalizeWeaponSet(source);
  const storedSets = Array.isArray(source.weaponSets) ? source.weaponSets : [];
  const weaponSets = Array.from(
    { length: ROGUELITE_WEAPON_SET_COUNT },
    (_, index) => normalizeWeaponSet(
      storedSets[index]
      || (index === 0 ? legacySet : createEmptyWeaponSet()),
    ),
  );
  const activeSet = weaponSets[activeWeaponSet];

  return {
    ...source,
    weaponSets,
    activeWeaponSet,
    // Alias de compatibilidad para Canvas, inspector y consumidores antiguos.
    mainHand: activeSet.mainHand,
    offHand: activeSet.offHand,
  };
};

export const resolveEquippedWeaponSet = (equippedItems = {}, index = 0) => {
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  return normalized.weaponSets[clampWeaponSetIndex(index)];
};

export const equipItemInWeaponSet = (
  equippedItems = {},
  weaponSetIndex = 0,
  slot,
  item,
) => {
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const resolvedIndex = clampWeaponSetIndex(weaponSetIndex);
  const nextSet = equipItemInSlot(
    normalized.weaponSets[resolvedIndex],
    slot,
    item,
  );
  const weaponSets = normalized.weaponSets.map((weaponSet, index) => (
    index === resolvedIndex ? normalizeWeaponSet(nextSet) : weaponSet
  ));
  const activeSet = weaponSets[normalized.activeWeaponSet];

  return {
    ...normalized,
    weaponSets,
    mainHand: activeSet.mainHand,
    offHand: activeSet.offHand,
  };
};

export const activateWeaponSet = (equippedItems = {}, weaponSetIndex = 0) => {
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const activeWeaponSet = clampWeaponSetIndex(weaponSetIndex);
  const activeSet = normalized.weaponSets[activeWeaponSet];

  return {
    ...normalized,
    activeWeaponSet,
    mainHand: activeSet.mainHand,
    offHand: activeSet.offHand,
  };
};

export const equipItemInSlot = (equippedItems = {}, slot, item) => {
  const normalized = normalizeEquippedHandSlots(equippedItems);

  if (!HAND_SLOTS.includes(slot)) {
    return { ...normalized, [slot]: item };
  }

  if (!item) return { ...normalized, [slot]: null };

  const otherSlot = slot === 'mainHand' ? 'offHand' : 'mainHand';
  const next = { ...normalized, [slot]: item };

  if (
    resolveEquipmentHandsRequired(item) === 2
    || resolveEquipmentHandsRequired(normalized[otherSlot]) === 2
  ) {
    next[otherSlot] = null;
  }

  return next;
};

export const createEquipmentTemplateId = (item = {}, category = 'objects') => {
  const explicitId = item.templateId ?? item.catalogId ?? item.id;
  if (String(explicitId || '').trim()) return String(explicitId).trim();

  const name = item.name ?? item.nombre ?? 'objeto';
  return `${category}:${slugify(name) || 'sin-nombre'}`;
};

export const normalizeEquipmentPoolItem = (item = {}, category = 'objects') => {
  const normalized = {
    ...item,
    templateId: createEquipmentTemplateId(item, category),
  };

  if (category === 'armor' || item.itemType === 'armor') {
    delete normalized.actionCost;
    delete normalized.consumption;
    delete normalized.consumo;
    delete normalized.cost;
    delete normalized.coste;
  }

  if (category === 'weapons' || item.itemType === 'weapon') {
    normalized.handsRequired = resolveEquipmentHandsRequired(item);
  }

  return normalized;
};

export const normalizeRogueliteEquipmentPool = (equipment) => {
  const pool = createEmptyEquipmentPool();

  if (Array.isArray(equipment)) {
    equipment.forEach((item) => {
      const category = EQUIPMENT_CATEGORIES.includes(item?._category)
        ? item._category
        : 'objects';
      pool[category].push(normalizeEquipmentPoolItem(item, category));
    });
    return pool;
  }

  if (!equipment || typeof equipment !== 'object') return pool;

  EQUIPMENT_CATEGORIES.forEach((category) => {
    const seenIds = new Set();
    pool[category] = (Array.isArray(equipment[category]) ? equipment[category] : [])
      .map((item) => normalizeEquipmentPoolItem(item, category))
      .filter((item) => {
        if (seenIds.has(item.templateId)) return false;
        seenIds.add(item.templateId);
        return true;
      });
  });

  return pool;
};

export const resolveRogueliteEquipmentPool = (classDefinition = {}) => (
  normalizeRogueliteEquipmentPool(
    classDefinition.roguelite?.startingEquipmentPool
    ?? classDefinition.startingEquipmentPool
    ?? classDefinition.equipment
  )
);

export { EQUIPMENT_CATEGORIES };
