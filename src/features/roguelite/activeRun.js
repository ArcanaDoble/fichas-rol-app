import {
  EQUIPMENT_CATEGORIES,
  normalizeRogueliteEquipmentPool,
} from './equipmentPool';

export const ROGUELITE_ACTIVE_RUN_VERSION = 1;

export const resolveRogueliteTemplateRevision = (classDefinition = {}) => (
  Math.max(1, Math.trunc(Number(classDefinition.templateRevision) || 1))
);

const CATEGORY_TYPES = Object.freeze({
  weapons: 'weapon',
  armor: 'armor',
  abilities: 'ability',
  objects: 'object',
  accessories: 'accessory',
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : Math.max(0, Number(fallback) || 0);
};

const createStat = (current, maximum, extra = {}) => {
  const max = clampNumber(maximum, current);
  return {
    current: Math.min(clampNumber(current, max), max),
    max,
    ...extra,
  };
};

const resolveItemCategory = (item = {}) => {
  const explicit = String(item._category || '').toLowerCase();
  if (EQUIPMENT_CATEGORIES.includes(explicit)) return explicit;

  const type = String(item.itemType || item.type || item.category || '').toLowerCase();
  if (type.includes('weapon') || type.includes('arma')) return 'weapons';
  if (type.includes('armor') || type.includes('armadura')) return 'armor';
  if (type.includes('abil') || type.includes('habil') || type.includes('power')) return 'abilities';
  if (type.includes('access') || type.includes('acces')) return 'accessories';
  return 'objects';
};

const normalizeRunInventory = (inventory) => {
  if (!Array.isArray(inventory)) return normalizeRogueliteEquipmentPool(inventory);

  return normalizeRogueliteEquipmentPool(inventory.map((item) => ({
    ...(item || {}),
    _category: resolveItemCategory(item),
  })));
};

const resolveInventoryItemId = (item = {}) => String(
  item.templateId || item.catalogId || item.id || item.runItemId || item.name || item.nombre || '',
).trim();

const resolveInventoryTemplateIds = (inventory) => (
  flattenRogueliteRunInventory(inventory)
    .map(resolveInventoryItemId)
    .filter(Boolean)
);

const resolveClassEquipmentPool = (sheetData = {}) => (
  sheetData.classEquipmentPool
  ?? sheetData.roguelite?.startingEquipmentPool
  ?? sheetData.startingEquipmentPool
  ?? sheetData.equipment
);

const resolveStableRunInventory = (sheetData, activeRun) => (
  Array.isArray(activeRun?.baseInventoryTemplateIds)
    ? normalizeRunInventory(activeRun.inventory)
    : reconcileRogueliteRunInventory(resolveClassEquipmentPool(sheetData), activeRun)
);

export const reconcileRogueliteRunInventory = (classEquipment, activeRun = {}) => {
  const classPool = normalizeRunInventory(classEquipment);
  const runInventory = normalizeRunInventory(activeRun.inventory);
  const hasBaseSnapshot = Array.isArray(activeRun.baseInventoryTemplateIds);
  const previousBaseIds = new Set(activeRun.baseInventoryTemplateIds || []);
  const removedBaseIds = new Set(activeRun.removedBaseInventoryTemplateIds || []);

  const reconciled = Object.fromEntries(EQUIPMENT_CATEGORIES.map((category) => {
    const classItems = classPool[category].filter((item) => (
      !removedBaseIds.has(resolveInventoryItemId(item))
    ));
    const runtimeItems = runInventory[category].filter((item) => (
      !hasBaseSnapshot || !previousBaseIds.has(resolveInventoryItemId(item))
    ));
    const seen = new Set();
    const items = [...classItems, ...runtimeItems].filter((item) => {
      const id = resolveInventoryItemId(item);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return [category, items];
  }));

  return normalizeRunInventory(reconciled);
};

export const createRogueliteRunStats = (sheetData = {}) => {
  const resource = sheetData.resource || {};
  const resourceName = resource.name || resource.label || 'Recurso';
  const resourceMaximum = resource.maximum ?? resource.max ?? resource.initial ?? 0;
  const resourceCurrent = resource.current ?? resource.initial ?? resourceMaximum;

  return {
    vida: createStat(
      sheetData.lifeCurrent ?? sheetData.lifeInitial ?? sheetData.maxLife,
      sheetData.maxLife ?? sheetData.lifeInitial,
      { label: 'Vida', color: '#e7a0a8' },
    ),
    cd: createStat(
      sheetData.defenseClassCurrent ?? sheetData.defenseClass ?? sheetData.maxDefenseClass,
      sheetData.maxDefenseClass ?? sheetData.defenseClass,
      { label: 'CD', color: '#c8c6be' },
    ),
    movimiento: createStat(
      sheetData.movementCurrent ?? sheetData.movement ?? sheetData.maxMovement,
      sheetData.maxMovement ?? sheetData.movement,
      { label: 'Movimiento', color: '#86bfe2' },
    ),
    iniciativa: createStat(
      sheetData.initiativeCurrent ?? sheetData.initiativeBase ?? sheetData.maxInitiative,
      sheetData.maxInitiative ?? sheetData.initiativeBase,
      { label: 'Iniciativa', color: '#d7b867' },
    ),
    recurso: createStat(resourceCurrent, resourceMaximum, {
      label: resourceName,
      color: resource.color || '#a77bd4',
    }),
  };
};

export const resolveRogueliteRunInventory = (sheetData = {}) => normalizeRunInventory(
  sheetData.activeRun?.inventory ?? sheetData.inventory ?? sheetData.equipment,
);

export const flattenRogueliteRunInventory = (inventory) => {
  const normalized = normalizeRunInventory(inventory);
  return EQUIPMENT_CATEGORIES.flatMap((category) => (
    normalized[category].map((item, index) => ({
      ...clone(item),
      _category: category,
      itemType: item.itemType || CATEGORY_TYPES[category],
      runItemId: item.runItemId
        || `${item.templateId || item.id || item.name || item.nombre || category}:${index}`,
    }))
  ));
};

export const isRogueliteActiveRun = (run, classId = null, owner = null) => Boolean(
  run
  && typeof run === 'object'
  && run.status !== 'finished'
  && (!classId || !run.classId || run.classId === classId)
  && (!owner || !run.owner || run.owner === owner),
);

export const createRogueliteActiveRun = (sheetData = {}, options = {}) => {
  const classId = sheetData.id || sheetData.templateId || options.classId || null;
  const owner = sheetData.owner || options.owner || null;
  const existingRun = isRogueliteActiveRun(sheetData.activeRun, classId, owner)
    ? sheetData.activeRun
    : null;

  if (existingRun) {
    return {
      ...clone(existingRun),
      inventory: resolveStableRunInventory(sheetData, existingRun),
      baseInventoryTemplateIds: Array.isArray(existingRun.baseInventoryTemplateIds)
        ? clone(existingRun.baseInventoryTemplateIds)
        : resolveInventoryTemplateIds(resolveClassEquipmentPool(sheetData)),
      removedBaseInventoryTemplateIds: clone(existingRun.removedBaseInventoryTemplateIds || []),
    };
  }

  const inventory = resolveRogueliteRunInventory(sheetData);

  return {
    version: ROGUELITE_ACTIVE_RUN_VERSION,
    id: options.runId || `run-${owner || 'player'}-${classId || 'class'}-${Date.now()}`,
    status: 'active',
    classId,
    templateId: sheetData.templateId || classId,
    templateRevision: resolveRogueliteTemplateRevision(sheetData),
    owner,
    revision: 0,
    currentScenarioId: options.scenarioId || null,
    stats: createRogueliteRunStats(sheetData),
    statusEffects: Array.isArray(sheetData.personalStatusTags)
      ? clone(sheetData.personalStatusTags)
      : [],
    inventory,
    baseInventoryTemplateIds: resolveInventoryTemplateIds(resolveClassEquipmentPool(sheetData)),
    removedBaseInventoryTemplateIds: [],
    equippedItems: clone(sheetData.equippedItems || {}),
    activeWeaponSet: Number(sheetData.equippedItems?.activeWeaponSet) === 1 ? 1 : 0,
    money: clampNumber(sheetData.money, 0),
    createdAt: options.now ?? Date.now(),
    updatedAt: options.now ?? Date.now(),
  };
};

export const resolveRogueliteProfileSyncState = (classDefinition = {}, profile = {}) => {
  const templateRevision = resolveRogueliteTemplateRevision(classDefinition);
  const hasActiveRun = isRogueliteActiveRun(
    profile.activeRun,
    classDefinition.id || profile.id,
    profile.owner,
  );
  const appliedTemplateRevision = hasActiveRun
    ? Math.max(1, Number(profile.activeRun?.templateRevision || profile.appliedTemplateRevision) || 1)
    : templateRevision;
  const templateUpdateAvailable = hasActiveRun && appliedTemplateRevision < templateRevision;

  return {
    templateRevision,
    appliedTemplateRevision,
    hasActiveRun,
    templateUpdateAvailable,
    templateSyncStatus: templateUpdateAvailable
      ? 'update-available'
      : (hasActiveRun ? 'run-active' : 'synced'),
  };
};

export const rebaseRogueliteActiveRun = (activeRun, resolvedBaseProfile = {}, options = {}) => {
  if (!isRogueliteActiveRun(activeRun)) return activeRun;

  const baseStats = createRogueliteRunStats(resolvedBaseProfile);
  const previousStats = activeRun.stats || {};
  const stats = Object.fromEntries(Object.entries(baseStats).map(([statId, baseStat]) => {
    const previousStat = previousStats[statId] || {};
    const maximum = clampNumber(baseStat.max, previousStat.max);
    return [statId, {
      ...baseStat,
      current: Math.min(clampNumber(previousStat.current, baseStat.current), maximum),
      max: maximum,
    }];
  }));
  const classEquipment = resolveClassEquipmentPool(resolvedBaseProfile);

  return {
    ...clone(activeRun),
    templateRevision: resolveRogueliteTemplateRevision(resolvedBaseProfile),
    revision: Math.max(0, Number(activeRun.revision) || 0) + 1,
    stats,
    inventory: reconcileRogueliteRunInventory(classEquipment, activeRun),
    baseInventoryTemplateIds: resolveInventoryTemplateIds(classEquipment),
    updatedAt: options.now ?? Date.now(),
  };
};

export const createRogueliteActiveRunFromToken = (
  token,
  previousRun = null,
  options = {},
) => {
  const inventory = normalizeRunInventory(token?.inventory || previousRun?.inventory);
  const equipmentLoadout = token?.equipmentLoadout || previousRun?.equippedItems || {};
  const inventoryIds = new Set(resolveInventoryTemplateIds(inventory));
  const previousBaseIds = Array.isArray(previousRun?.baseInventoryTemplateIds)
    ? previousRun.baseInventoryTemplateIds
    : [];
  const removedBaseInventoryTemplateIds = previousBaseIds.filter((id) => !inventoryIds.has(id));

  return {
    ...(previousRun ? clone(previousRun) : {}),
    version: ROGUELITE_ACTIVE_RUN_VERSION,
    id: token?.runId || previousRun?.id,
    status: 'active',
    classId: token?.linkedClassId || previousRun?.classId || null,
    templateId: token?.linkedClassId || previousRun?.templateId || null,
    owner: token?.linkedClassOwner || previousRun?.owner || null,
    revision: Math.max(0, Number(options.revision ?? previousRun?.revision) || 0),
    currentScenarioId: options.scenarioId || previousRun?.currentScenarioId || null,
    lastTokenId: token?.id || previousRun?.lastTokenId || null,
    stats: clone(token?.stats || previousRun?.stats || {}),
    statusEffects: clone(token?.status || previousRun?.statusEffects || []),
    inventory,
    baseInventoryTemplateIds: clone(previousBaseIds),
    removedBaseInventoryTemplateIds,
    equippedItems: clone(equipmentLoadout),
    activeWeaponSet: Number(token?.activeWeaponSet ?? equipmentLoadout.activeWeaponSet) === 1 ? 1 : 0,
    money: clampNumber(token?.money ?? previousRun?.money, 0),
    createdAt: previousRun?.createdAt || options.now || Date.now(),
    updatedAt: options.now || Date.now(),
  };
};

export const updateRogueliteActiveRunFromProfile = (profileClass = {}, options = {}) => {
  const activeRun = profileClass.activeRun;
  if (!isRogueliteActiveRun(activeRun, profileClass.id, profileClass.owner)) return activeRun;

  const inventory = normalizeRunInventory(profileClass.equipment || activeRun.inventory);
  const classEquipment = resolveClassEquipmentPool(profileClass);

  return {
    ...clone(activeRun),
    revision: Math.max(0, Number(activeRun.revision) || 0) + (options.incrementRevision === false ? 0 : 1),
    stats: createRogueliteRunStats(profileClass),
    inventory,
    baseInventoryTemplateIds: resolveInventoryTemplateIds(classEquipment),
    equippedItems: clone(profileClass.equippedItems || activeRun.equippedItems || {}),
    activeWeaponSet: Number(profileClass.equippedItems?.activeWeaponSet) === 1 ? 1 : 0,
    money: clampNumber(profileClass.money, activeRun.money),
    statusEffects: clone(profileClass.personalStatusTags || activeRun.statusEffects || []),
    updatedAt: options.now ?? Date.now(),
  };
};

export const canRogueliteTokenClaimRun = (token, activeRun, scenarioId) => {
  if (!token?.runId || !activeRun?.id || token.runId !== activeRun.id) return false;
  if (!activeRun.currentScenarioId || activeRun.currentScenarioId === scenarioId) return true;
  return (Number(token.runRevision) || 0) >= (Number(activeRun.revision) || 0);
};

export const applyRogueliteActiveRunToProfile = (profileClass = {}) => {
  const activeRun = profileClass.activeRun;
  if (!isRogueliteActiveRun(activeRun, profileClass.id, profileClass.owner)) return profileClass;

  const reconciledRun = {
    ...clone(activeRun),
    inventory: resolveStableRunInventory(profileClass, activeRun),
    baseInventoryTemplateIds: Array.isArray(activeRun.baseInventoryTemplateIds)
      ? clone(activeRun.baseInventoryTemplateIds)
      : resolveInventoryTemplateIds(resolveClassEquipmentPool(profileClass)),
    removedBaseInventoryTemplateIds: clone(activeRun.removedBaseInventoryTemplateIds || []),
  };
  const stats = reconciledRun.stats || {};
  const vida = stats.vida || {};
  const cd = stats.cd || {};
  const movimiento = stats.movimiento || {};
  const iniciativa = stats.iniciativa || {};
  const recurso = stats.recurso || {};
  const runStatusEffects = clone(reconciledRun.statusEffects || []);
  const inheritedTags = clone(profileClass.classTags || []);
  const inheritedTagNames = new Set(inheritedTags.map((tag) => (
    String(tag || '').split('|')[0].trim().toLowerCase()
  )));

  return {
    ...profileClass,
    activeRun: reconciledRun,
    runReference: {
      maxLife: profileClass.maxLife,
      maxDefenseClass: profileClass.maxDefenseClass,
      maxMovement: profileClass.maxMovement,
      maxInitiative: profileClass.maxInitiative,
      resource: clone(profileClass.resource || {}),
    },
    lifeCurrent: clampNumber(vida.current, profileClass.lifeInitial),
    lifeInitial: clampNumber(vida.current, profileClass.lifeInitial),
    maxLife: clampNumber(vida.max, profileClass.maxLife),
    defenseClassCurrent: clampNumber(cd.current, profileClass.defenseClass),
    defenseClass: clampNumber(cd.current, profileClass.defenseClass),
    maxDefenseClass: clampNumber(cd.max, profileClass.maxDefenseClass),
    movementCurrent: clampNumber(movimiento.current, profileClass.movement),
    movement: clampNumber(movimiento.current, profileClass.movement),
    maxMovement: clampNumber(movimiento.max, profileClass.maxMovement),
    initiativeCurrent: clampNumber(iniciativa.current, profileClass.initiativeBase),
    initiativeBase: clampNumber(iniciativa.current, profileClass.initiativeBase),
    maxInitiative: clampNumber(iniciativa.max, profileClass.maxInitiative),
    resource: {
      ...(profileClass.resource || {}),
      name: recurso.label || profileClass.resource?.name || 'Recurso',
      color: recurso.color || profileClass.resource?.color || '#a77bd4',
      current: clampNumber(recurso.current, profileClass.resource?.initial),
      initial: clampNumber(recurso.current, profileClass.resource?.initial),
      maximum: clampNumber(recurso.max, profileClass.resource?.maximum),
    },
    equipment: reconciledRun.inventory,
    equippedItems: clone(reconciledRun.equippedItems || profileClass.equippedItems || {}),
    money: clampNumber(reconciledRun.money, profileClass.money),
    personalStatusTags: runStatusEffects,
    tags: [
      ...inheritedTags,
      ...runStatusEffects.filter((tag) => (
        !inheritedTagNames.has(String(tag || '').split('|')[0].trim().toLowerCase())
      )),
    ],
  };
};
