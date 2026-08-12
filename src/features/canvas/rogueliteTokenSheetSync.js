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
  if (!isRogueliteClassSheet(sheetData)) {
    return syncLegacyTokenWithSheet(token, sheetData, catalogs, options);
  }

  const activeRun = createRogueliteActiveRun(sheetData, {
    owner: sheetData.owner,
    scenarioId: options.scenarioId,
  });
  const equipped = resolveRogueliteEquippedItems(activeRun.equippedItems);
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

  const equippedSlotsByTemplate = equipped.items.reduce((slotsByTemplate, item) => {
    const key = item.templateId || item.id || item.runItemId || item.name || item.nombre;
    if (!key) return slotsByTemplate;
    slotsByTemplate.set(key, [...(slotsByTemplate.get(key) || []), item.canvasSlot]);
    return slotsByTemplate;
  }, new Map());
  const runInventory = flattenRogueliteRunInventory(activeRun.inventory).map((item) => {
    const key = item.templateId || item.id || item.runItemId || item.name || item.nombre;
    const equippedSlots = key ? (equippedSlotsByTemplate.get(key) || []) : [];
    return {
      ...item,
      isEquipped: equippedSlots.length > 0,
      equippedSlots,
    };
  });

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
    equippedItems: preserveRuntimeState && token.equippedItems
      ? token.equippedItems
      : equipped.items,
    equipmentLoadout: preserveRuntimeState && token.equipmentLoadout
      ? token.equipmentLoadout
      : equipped.loadout,
    activeWeaponSet: preserveRuntimeState && token.activeWeaponSet !== undefined
      ? token.activeWeaponSet
      : equipped.activeWeaponSet,
    inventory: preserveRuntimeState && token.inventory ? token.inventory : runInventory,
    money: preserveRuntimeState && token.money !== undefined ? token.money : activeRun.money,
    velocidad: token.velocidad || 0,
  };
};
