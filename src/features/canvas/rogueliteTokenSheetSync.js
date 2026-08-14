import {
  normalizeEquippedWeaponSets,
  resolveEquipmentHandsRequired,
  resolveEquippedWeaponSet,
} from '../roguelite/equipmentPool';
import {
  STATUS_EFFECT_IDS,
  syncTokenWithSheet as syncLegacyTokenWithSheet,
} from '../tactical-shared/tokenSheetSync';
import {
  createRogueliteActiveRun,
  createRogueliteRunStats,
  flattenRogueliteRunInventory,
} from '../roguelite/activeRun';

const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : Math.max(0, Number(fallback) || 0);
};

const flattenItem = (item, type, slot) => {
  if (!item || typeof item !== 'object') return null;
  const flattened = item.payload
    ? { ...item.payload, ...item, payload: undefined }
    : { ...item };

  return {
    ...flattened,
    type: flattened.type || type,
    canvasSlot: slot,
    handsRequired: type === 'weapon'
      ? resolveEquipmentHandsRequired(flattened)
      : flattened.handsRequired,
  };
};

export const isRogueliteClassSheet = (sheetData) => (
  sheetData?.profileType === 'rogueliteClass'
  || sheetData?.launchSource === 'rogueliteClass'
);

export const isRogueliteEnemySheet = (sheetData) => (
  sheetData?.profileType === 'rogueliteEnemy'
  || sheetData?.launchSource === 'rogueliteEnemy'
);

export const resolveRogueliteEquippedItems = (equippedItems = {}) => {
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const activeSet = resolveEquippedWeaponSet(normalized, normalized.activeWeaponSet);
  const resolved = [
    flattenItem(activeSet.mainHand, 'weapon', 'mainHand'),
    flattenItem(activeSet.offHand, 'weapon', 'offHand'),
    flattenItem(normalized.body, 'armor', 'body'),
    flattenItem(normalized.accessory_1, 'access', 'accessory_1'),
    flattenItem(normalized.accessory_2, 'access', 'accessory_2'),
    ...Object.entries(normalized)
      .filter(([slot, item]) => slot.startsWith('belt_') && item)
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([slot, item]) => flattenItem(item, 'object', slot)),
  ].filter(Boolean);

  return {
    activeWeaponSet: normalized.activeWeaponSet,
    loadout: normalized,
    items: resolved,
  };
};

export const createRogueliteTokenStats = createRogueliteRunStats;

const resolveStatusIds = (sheetData) => (
  (Array.isArray(sheetData.personalStatusTags) ? sheetData.personalStatusTags : sheetData.tags || [])
    .map((tag) => String(tag || '').split('|')[0].trim().toLowerCase())
    .filter((tag) => STATUS_EFFECT_IDS.includes(tag))
);

export const syncCanvasTokenWithSheet = (token, sheetData, catalogs = {}, options = {}) => {
  if (isRogueliteEnemySheet(sheetData)) {
    const portrait = sheetData.image || sheetData.imageSource || sheetData.portrait || sheetData.img || token.portrait || token.img;
    return {
      ...token,
      ...sheetData,
      profileType: 'rogueliteEnemy',
      canvasRuntime: 'roguelite',
      img: portrait,
      portrait,
      controlledBy: ['master'],
      teamId: sheetData.teamId || 'enemies',
      linkedEnemyId: sheetData.id || sheetData.linkedEnemyId || token.linkedEnemyId || null,
      stats: sheetData.stats || token.stats || {},
      inventory: sheetData.inventory || token.inventory || [],
      equippedItems: sheetData.equippedItems || token.equippedItems || [],
      enemyAbilities: sheetData.enemyAbilities || token.enemyAbilities || [],
      velocidad: Number(sheetData.stats?.iniciativa?.current ?? sheetData.velocidad ?? token.velocidad) || 0,
      fixedInitiative: Number(sheetData.stats?.iniciativa?.current ?? sheetData.fixedInitiative ?? token.fixedInitiative) || 0,
      offenseBase: Number(sheetData.stats?.ofensiva?.current ?? sheetData.offenseBase ?? token.offenseBase) || 0,
    };
  }
  if (!isRogueliteClassSheet(sheetData)) {
    return syncLegacyTokenWithSheet(token, sheetData, catalogs, options);
  }

  const activeRun = createRogueliteActiveRun(sheetData, {
    owner: sheetData.owner,
    scenarioId: options.scenarioId,
  });
  const equipped = resolveRogueliteEquippedItems(sheetData.equippedItems || activeRun.equippedItems);
  const isExistingClassToken = Boolean(
    token?.profileType === 'rogueliteClass'
    && token?.linkedClassId
    && token.linkedClassId === sheetData.id,
  );
  const preserveRuntimeState = options.preserveTokenState !== undefined
    ? options.preserveTokenState
    : isExistingClassToken;
  const portrait = sheetData.avatar
    || sheetData.portraitSource
    || sheetData.image
    || token.portrait
    || token.img;

  const resolveItemIdentityKeys = (item) => {
    if (!item) return [];
    if (typeof item !== 'object') {
      return [String(item).trim().toLowerCase()].filter(Boolean);
    }
    return [
      item.templateId, item.catalogId, item.id, item.runItemId, item.name, item.nombre,
      item.payload?.templateId, item.payload?.catalogId, item.payload?.id,
      item.payload?.name, item.payload?.nombre,
    ]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);
  };

  const equippedSlotsByTemplate = equipped.items.reduce((slotsByTemplate, item) => {
    const keys = resolveItemIdentityKeys(item);
    keys.forEach((key) => {
      slotsByTemplate.set(key, [...(slotsByTemplate.get(key) || []), item.canvasSlot]);
    });
    return slotsByTemplate;
  }, new Map());

  const preparedSkillIds = new Set(
    (activeRun.equippedSkillIds || sheetData.equippedSkillIds || [])
      .flatMap((id) => resolveItemIdentityKeys({ id }))
  );

  const mapItemFlags = (item) => {
    const keys = resolveItemIdentityKeys(item);
    const equippedSlots = keys.flatMap((key) => equippedSlotsByTemplate.get(key) || []);
    const isPrepared = keys.some((key) => preparedSkillIds.has(key));
    return {
      ...item,
      isEquipped: equippedSlots.length > 0,
      isPrepared,
      equippedSlots: Array.from(new Set(equippedSlots)),
    };
  };

  const baseInventory = preserveRuntimeState && Array.isArray(token.inventory) && token.inventory.length > 0
    ? token.inventory
    : flattenRogueliteRunInventory(activeRun.inventory);
  const syncedInventory = baseInventory.map(mapItemFlags);

  return {
    ...token,
    profileType: 'rogueliteClass',
    canvasRuntime: 'roguelite',
    linkedClassId: sheetData.id || sheetData.templateId || token.linkedClassId || null,
    linkedClassOwner: sheetData.owner || token.linkedClassOwner || null,
    linkedCharacterId: null,
    runId: activeRun.id,
    runRevision: Math.max(0, Number(activeRun.revision) || 0),
    runScenarioId: options.scenarioId || token.runScenarioId || activeRun.currentScenarioId || null,
    runtimeDirty: preserveRuntimeState ? Boolean(token.runtimeDirty) : false,
    level: clampNumber(sheetData.level, 1),
    name: sheetData.name || token.name,
    img: portrait,
    portrait,
    actionDice: Array.isArray(sheetData.actionDice) ? sheetData.actionDice : [],
    status: preserveRuntimeState
      ? (token.status || activeRun.statusEffects || resolveStatusIds(sheetData))
      : (activeRun.statusEffects || resolveStatusIds(sheetData)),
    stats: preserveRuntimeState && token.stats
      ? token.stats
      : activeRun.stats,
    equippedItems: equipped.items,
    equippedSkillIds: (activeRun.equippedSkillIds || sheetData.equippedSkillIds || []),
    equipmentLoadout: equipped.loadout,
    activeWeaponSet: equipped.activeWeaponSet,
    inventory: syncedInventory,
    money: preserveRuntimeState && token.money !== undefined ? token.money : activeRun.money,
    velocidad: token.velocidad || 0,
  };
};
