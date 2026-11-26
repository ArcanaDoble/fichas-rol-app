const EQUIPMENT_CATEGORIES = Object.freeze([
  'weapons',
  'armor',
  'abilities',
  'objects',
  'accessories',
]);

const HAND_SLOTS = Object.freeze(['mainHand', 'offHand']);
export const ROGUELITE_WEAPON_SET_COUNT = 2;

export const resolveBeltSlotCount = (equippedItems = {}) => {
  const storedCount = equippedItems.beltSlotCount;
  if (storedCount != null && Number.isInteger(Number(storedCount)) && Number(storedCount) >= 0) {
    return Math.min(9, Number(storedCount));
  }
  const occupiedIndices = Object.entries(equippedItems)
    .filter(([slot, item]) => /^belt_\d+$/.test(slot) && item)
    .map(([slot]) => Number(slot.slice(5)));
  return Math.min(9, Math.max(3, ...occupiedIndices.map((index) => index + 1)));
};

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
  const alreadyUsedElsewhere = item && normalized.weaponSets.some((weaponSet, index) => (
    ['mainHand', 'offHand'].some((candidateSlot) => (
      !(index === resolvedIndex && candidateSlot === slot)
      && equipmentItemsShareInstance(weaponSet[candidateSlot], item)
    ))
  ));
  if (alreadyUsedElsewhere) return normalized;

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
  if (Array.isArray(equippedItems?.weaponSets) && HAND_SLOTS.includes(slot)) {
    return equipItemInWeaponSet(
      equippedItems,
      equippedItems.activeWeaponSet,
      slot,
      item,
    );
  }

  const normalized = normalizeEquippedHandSlots(equippedItems);

  if (!HAND_SLOTS.includes(slot)) {
    return { ...normalized, [slot]: item };
  }

  if (!item) return { ...normalized, [slot]: null };

  const otherSlot = slot === 'mainHand' ? 'offHand' : 'mainHand';
  if (equipmentItemsShareInstance(normalized[otherSlot], item)) return normalized;
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

export const resolveEquipmentInstanceId = (item = {}) => {
  const explicitId = item?.instanceId ?? item?.runItemId ?? item?.inventoryInstanceId;
  return String(explicitId || '').trim() || null;
};

export const equipmentItemsShareInstance = (left, right) => {
  if (!left || !right) return false;

  const leftInstanceId = resolveEquipmentInstanceId(left);
  const rightInstanceId = resolveEquipmentInstanceId(right);
  if (leftInstanceId && rightInstanceId) return leftInstanceId === rightInstanceId;

  const leftIndex = Number(left?._index);
  const rightIndex = Number(right?._index);
  const leftCategory = left?._category || left?.itemType || left?.type;
  const rightCategory = right?._category || right?.itemType || right?.type;
  if (
    Number.isInteger(leftIndex)
    && Number.isInteger(rightIndex)
    && leftIndex === rightIndex
    && String(leftCategory || '') === String(rightCategory || '')
  ) {
    return true;
  }

  // Legacy loadouts did not store a physical instance id. Falling back to the
  // template keeps one old item from being interpreted as infinite copies.
  if (!leftInstanceId && !rightInstanceId) {
    return createEquipmentTemplateId(left, left?._category)
      === createEquipmentTemplateId(right, right?._category);
  }

  return false;
};

export const materializeEquipmentInstances = (items = [], fallbackCategory = 'objects') => {
  const occurrences = new Map();
  const assignedIds = new Set(
    items.map(resolveEquipmentInstanceId).filter(Boolean),
  );

  return items.map((item) => {
    const category = EQUIPMENT_CATEGORIES.includes(item?._category)
      ? item._category
      : fallbackCategory;
    const templateId = createEquipmentTemplateId(item, category);
    const explicitInstanceId = resolveEquipmentInstanceId(item);
    if (explicitInstanceId) {
      return { ...item, templateId, instanceId: explicitInstanceId };
    }

    let occurrence = (occurrences.get(`${category}:${templateId}`) || 0) + 1;
    let instanceId = `${templateId}::${occurrence}`;
    while (assignedIds.has(instanceId)) {
      occurrence += 1;
      instanceId = `${templateId}::${occurrence}`;
    }
    occurrences.set(`${category}:${templateId}`, occurrence);
    assignedIds.add(instanceId);

    return { ...item, templateId, instanceId };
  });
};

export const normalizeEquipmentPoolItem = (item = {}, category = 'objects') => {
  const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
  const details = item.details && typeof item.details === 'object'
    ? item.details
    : (item.detalles && typeof item.detalles === 'object' ? item.detalles : {});
  const rawDetails = details.raw && typeof details.raw === 'object' ? details.raw : {};
  const firstValue = (...values) => values.find((value) => (
    value !== undefined
    && value !== null
    && (typeof value !== 'string' || value.trim() !== '')
  ));
  const name = firstValue(
    item.name,
    item.nombre,
    payload.name,
    payload.nombre,
    rawDetails.name,
    rawDetails.nombre,
    details.name,
    details.nombre,
  );
  const rarity = firstValue(
    item.rareza,
    item.rarity,
    payload.rareza,
    payload.rarity,
    rawDetails.rareza,
    rawDetails.rarity,
  );
  const image = firstValue(
    item.image,
    item.imagen,
    item.imageUrl,
    item.img,
    payload.image,
    payload.imagen,
    payload.imageUrl,
    payload.img,
    rawDetails.image,
    rawDetails.imagen,
    rawDetails.imageUrl,
    rawDetails.img,
  );
  const description = firstValue(
    item.description,
    item.descripcion,
    item.detail,
    payload.description,
    payload.descripcion,
    payload.detail,
    rawDetails.description,
    rawDetails.descripcion,
    details.description,
    details.descripcion,
  );
  const normalized = {
    ...payload,
    ...rawDetails,
    ...details,
    ...item,
    ...(name ? { name } : {}),
    ...(rarity ? { rareza: rarity, rarity } : {}),
    ...(image ? { image } : {}),
    ...(description ? { description } : {}),
    templateId: createEquipmentTemplateId({ ...payload, ...rawDetails, ...details, ...item, name }, category),
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
    EQUIPMENT_CATEGORIES.forEach((category) => {
      pool[category] = materializeEquipmentInstances(pool[category], category);
    });
    return pool;
  }

  if (!equipment || typeof equipment !== 'object') return pool;

  EQUIPMENT_CATEGORIES.forEach((category) => {
    pool[category] = materializeEquipmentInstances(
      (Array.isArray(equipment[category]) ? equipment[category] : [])
        .map((item) => normalizeEquipmentPoolItem(item, category)),
      category,
    );
  });

  return pool;
};

const findInventoryCopy = (items, equippedItem, usedInstanceIds, category) => {
  if (!equippedItem) return null;
  const equippedInstanceId = resolveEquipmentInstanceId(equippedItem);
  const templateId = createEquipmentTemplateId(equippedItem, category);
  let match = equippedInstanceId
    ? items.find((item) => (
      resolveEquipmentInstanceId(item) === equippedInstanceId
      && !usedInstanceIds.has(equippedInstanceId)
    ))
    : null;

  const legacyIndex = Number(equippedItem?._index);
  if (!match && !equippedInstanceId && Number.isInteger(legacyIndex)) {
    const indexedItem = items[legacyIndex];
    if (
      indexedItem
      && createEquipmentTemplateId(indexedItem, category) === templateId
      && !usedInstanceIds.has(resolveEquipmentInstanceId(indexedItem))
    ) {
      match = indexedItem;
    }
  }

  // An authoritative runtime instance that has disappeared was dropped or
  // given away. Never silently replace it with another copy of the template.
  if (!match && equippedInstanceId) return null;

  if (!match) {
    match = items.find((item) => (
      createEquipmentTemplateId(item, category) === templateId
      && !usedInstanceIds.has(resolveEquipmentInstanceId(item))
    ));
  }
  if (!match) return null;

  const instanceId = resolveEquipmentInstanceId(match);
  if (instanceId) usedInstanceIds.add(instanceId);
  return {
    ...match,
    ...equippedItem,
    templateId: match.templateId,
    instanceId,
  };
};

export const reconcileEquippedItemsWithInventory = (equippedItems = {}, inventory = {}) => {
  const pool = normalizeRogueliteEquipmentPool(inventory);
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const usedInstanceIds = new Set();
  const weaponSets = normalized.weaponSets.map((weaponSet) => normalizeWeaponSet({
    mainHand: findInventoryCopy(
      pool.weapons,
      weaponSet.mainHand,
      usedInstanceIds,
      'weapons',
    ),
    offHand: findInventoryCopy(
      pool.weapons,
      weaponSet.offHand,
      usedInstanceIds,
      'weapons',
    ),
  }));
  const reconciled = {
    ...normalized,
    weaponSets,
    body: findInventoryCopy(pool.armor, normalized.body, usedInstanceIds, 'armor'),
    accessory_1: findInventoryCopy(
      pool.accessories,
      normalized.accessory_1,
      usedInstanceIds,
      'accessories',
    ),
    accessory_2: findInventoryCopy(
      pool.accessories,
      normalized.accessory_2,
      usedInstanceIds,
      'accessories',
    ),
  };

  if (Object.prototype.hasOwnProperty.call(normalized, 'reinforcement')) {
    reconciled.reinforcement = findInventoryCopy(
      [...pool.armor, ...pool.accessories],
      normalized.reinforcement,
      usedInstanceIds,
      'armor',
    );
  }

  Object.keys(normalized).forEach((slot) => {
    if (slot.startsWith('belt_')) {
      reconciled[slot] = findInventoryCopy(
        pool.objects,
        normalized[slot],
        usedInstanceIds,
        'objects',
      );
    }
  });

  return normalizeEquippedWeaponSets(reconciled);
};

export const resolveEquippedItemUsages = (equippedItems = {}, item = null) => {
  if (!item) return [];
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const usages = [];

  normalized.weaponSets.forEach((weaponSet, weaponSetIndex) => {
    ['offHand', 'mainHand'].forEach((slot) => {
      const equippedItem = weaponSet[slot];
      if (!equipmentItemsShareInstance(equippedItem, item)) return;
      usages.push({
        weaponSetIndex,
        slot,
        handsRequired: resolveEquipmentHandsRequired(equippedItem),
      });
    });
  });

  return usages;
};

export const resolveRogueliteEquipmentPool = (classDefinition = {}) => (
  normalizeRogueliteEquipmentPool(
    classDefinition.roguelite?.startingEquipmentPool
    ?? classDefinition.startingEquipmentPool
    ?? classDefinition.equipment
  )
);

export { EQUIPMENT_CATEGORIES };
