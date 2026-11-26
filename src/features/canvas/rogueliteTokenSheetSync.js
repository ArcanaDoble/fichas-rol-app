import { resolveWeaponForm } from '../roguelite/weaponForms';
import {
  normalizeEquippedWeaponSets,
  resolveEquipmentHandsRequired,
  resolveEquippedWeaponSet,
} from '../roguelite/equipmentPool';
import { refreshForgeEquipment } from '../../utils/forgeEquipmentSync';
import {
  STATUS_EFFECT_IDS,
  syncTokenWithSheet as syncLegacyTokenWithSheet,
} from '../tactical-shared/tokenSheetSync';
import {
  createRogueliteActiveRun,
  createRogueliteRunStats,
  flattenRogueliteRunInventory,
} from '../roguelite/activeRun';
import {
  ROGUELITE_SKILL_SLOT_COUNT,
  ROGUELITE_TALENT_SLOT_COUNT,
  resolveEquippedTalentIds,
  resolveRogueliteTalentCatalog,
} from '../roguelite/talents';
import {
  ARCANE_BARRIER_STATUS_ID,
  hasArcaneBarrier,
  withoutArcaneBarrierStatus,
} from '../../utils/arcaneBarrierStatus';

const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : Math.max(0, Number(fallback) || 0);
};

const flattenItem = (original, type, slot) => {
  const item = resolveWeaponForm(original);
  if (!item || typeof item !== 'object') return null;
  const { payload, ...itemFields } = item;
  const flattened = payload
    ? { ...payload, ...itemFields }
    : itemFields;
  const handsRequired = type === 'weapon'
    ? resolveEquipmentHandsRequired(flattened)
    : flattened.handsRequired;

  return {
    ...flattened,
    ...(flattened.instanceId && flattened.runItemId ? { runItemId: flattened.instanceId } : {}),
    type: flattened.type || type,
    canvasSlot: slot,
    ...(handsRequired !== undefined ? { handsRequired } : {}),
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
    normalized.reinforcement && {
      ...flattenItem(normalized.reinforcement, 'armor', 'reinforcement'), type: 'armor',
    },
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
  withoutArcaneBarrierStatus(Array.isArray(sheetData.personalStatusTags) ? sheetData.personalStatusTags : sheetData.tags)
    .map((tag) => String(tag || '').split('|')[0].trim().toLowerCase())
    .filter((tag) => STATUS_EFFECT_IDS.includes(tag))
);

const keepEncounterBarrier = (token, syncedToken, preserveBarrier) => ({
  ...syncedToken,
  status: [
    ...withoutArcaneBarrierStatus(syncedToken.status),
    ...(preserveBarrier && hasArcaneBarrier(token) ? [ARCANE_BARRIER_STATUS_ID] : []),
  ],
  arcaneBarrier: preserveBarrier && hasArcaneBarrier(token) ? token.arcaneBarrier || null : null,
});

export const syncCanvasTokenWithSheet = (token, sheetData, catalogs = {}, options = {}) => {
  if (isRogueliteEnemySheet(sheetData)) {
    const sceneId = options.scenarioId || sheetData.runScenarioId || token.runScenarioId;
    const preserveBarrier = (options.preserveEncounterBarrier ?? (options.preserveTokenState !== false))
      && (!token.runScenarioId || !sceneId || token.runScenarioId === sceneId)
      && (!token.linkedEnemyId || !sheetData.id || token.linkedEnemyId === sheetData.id);
    const portrait = sheetData.image || sheetData.portrait || sheetData.imageSource || sheetData.img || token.portrait || token.img;
    const tokenImage = sheetData.tokenImageSource
      || sheetData.imageSource
      || token.tokenImageSource
      || sheetData.img
      || token.img
      || portrait;
    return keepEncounterBarrier(token, {
      ...token,
      ...sheetData,
      profileType: 'rogueliteEnemy',
      canvasRuntime: 'roguelite',
      img: tokenImage,
      portrait,
      tokenImageSource: tokenImage,
      tokenImageFit: sheetData.tokenImageFit || token.tokenImageFit || 'contain',
      controlledBy: ['master'],
      teamId: sheetData.teamId || 'enemies',
      linkedEnemyId: sheetData.id || sheetData.linkedEnemyId || token.linkedEnemyId || null,
      stats: sheetData.stats || token.stats || {},
      inventory: sheetData.inventory || token.inventory || [],
      equippedItems: sheetData.equippedItems || token.equippedItems || [],
      enemyAbilities: sheetData.enemyAbilities || token.enemyAbilities || [],
      ...(sceneId ? { runScenarioId: sceneId } : {}),
      velocidad: Number(sheetData.stats?.iniciativa?.current ?? sheetData.velocidad ?? token.velocidad) || 0,
      fixedInitiative: Number(sheetData.stats?.iniciativa?.current ?? sheetData.fixedInitiative ?? token.fixedInitiative) || 0,
      offenseBase: Number(sheetData.stats?.ofensiva?.current ?? sheetData.offenseBase ?? token.offenseBase) || 0,
    }, preserveBarrier);
  }
  if (!isRogueliteClassSheet(sheetData)) {
    return syncLegacyTokenWithSheet(token, sheetData, catalogs, options);
  }

  const activeRun = createRogueliteActiveRun(sheetData, {
    owner: sheetData.owner,
    scenarioId: options.scenarioId,
  });
  // Durante una aventura el loadout del activeRun es la fuente autoritativa.
  // La configuración superior de la ficha puede conservar todavía un objeto
  // que el token ya soltó, o no contener aún uno recogido durante el encuentro.
  const hasStoredActiveRun = Boolean(
    sheetData.activeRun
    && typeof sheetData.activeRun === 'object'
    && sheetData.activeRun.status !== 'finished'
    && (!sheetData.activeRun.id || sheetData.activeRun.id === activeRun.id)
  );
  const isExistingClassToken = Boolean(
    token?.profileType === 'rogueliteClass'
    && token?.linkedClassId
    && token.linkedClassId === sheetData.id,
  );
  const preserveRuntimeState = options.preserveTokenState !== undefined
    ? options.preserveTokenState
    : isExistingClassToken;
  const sceneId = options.scenarioId || activeRun.currentScenarioId || token.runScenarioId;
  // Refreshing a personal run can replace stats/loadout while the scene's
  // protection remains active. Relinks, new encounters and resets still clear it.
  const preserveBarrier = (options.preserveEncounterBarrier ?? preserveRuntimeState)
    && (!token.runId || !sheetData.activeRun?.id || token.runId === activeRun.id)
    && (!token.runScenarioId || !sceneId || token.runScenarioId === sceneId)
    && (!token.linkedClassId || token.linkedClassId === sheetData.id);
  const equipmentSource = preserveRuntimeState && token.equipmentLoadout
      ? token.equipmentLoadout
      : hasStoredActiveRun ? activeRun.equippedItems : (sheetData.equippedItems || activeRun.equippedItems);
  // Live Forge definitions also apply to already equipped adventure copies.
  // Keep runtime ownership, slots and stats; only refresh their definitions.
  const equipped = resolveRogueliteEquippedItems(
    refreshForgeEquipment({ equippedItems: equipmentSource }, catalogs).equippedItems,
  );
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

  const physicalIdentity = item => item?.instanceId || item?.runItemId || item?.payload?.instanceId || item?.payload?.runItemId;

  const preparedSkillIds = new Set(
    (preserveRuntimeState && Array.isArray(token.equippedSkillIds) ? token.equippedSkillIds : activeRun.equippedSkillIds || sheetData.equippedSkillIds || [])
      .flatMap((id) => resolveItemIdentityKeys({ id }))
  );

  const mapItemFlags = (item) => {
    const keys = resolveItemIdentityKeys(item);
    const identity = physicalIdentity(item);
    const equippedSlots = equipped.items.filter(candidate => {
      const equippedIdentity = physicalIdentity(candidate);
      return identity && equippedIdentity ? String(identity) === String(equippedIdentity)
        : resolveItemIdentityKeys(candidate).some(key => keys.includes(key));
    }).map(candidate => candidate.canvasSlot);
    const isPrepared = keys.some((key) => preparedSkillIds.has(key));
    return {
      ...item,
      ...(item.instanceId && item.runItemId ? { runItemId: item.instanceId } : {}),
      isEquipped: equippedSlots.length > 0,
      isPrepared,
      equippedSlots: Array.from(new Set(equippedSlots)),
    };
  };

  const baseInventory = preserveRuntimeState
    && Array.isArray(token.inventory)
    ? token.inventory
    : flattenRogueliteRunInventory(activeRun.inventory);
  const syncedInventory = refreshForgeEquipment({ equipment: baseInventory }, catalogs).equipment.map(mapItemFlags);
  const storedTalentSlots = Array.isArray(sheetData.equippedTalentIds)
    ? sheetData.equippedTalentIds
    : (Array.isArray(sheetData.talents?.slots)
      ? sheetData.talents.slots
      : token.equippedTalentIds);
  const talentCandidates = [
    ...resolveRogueliteTalentCatalog(sheetData),
    ...(Array.isArray(token.talentCatalog) ? token.talentCatalog : []),
    ...(Array.isArray(token.equippedTalentSlots) ? token.equippedTalentSlots : []),
    ...(Array.isArray(token.equippedTalents) ? token.equippedTalents : []),
    ...(Array.isArray(sheetData.talents?.slots)
      ? sheetData.talents.slots.filter((talent) => talent && typeof talent === 'object')
      : []),
  ].filter((talent) => talent && typeof talent === 'object');
  const seenTalentIds = new Set();
  const talentCatalog = talentCandidates.filter((talent) => {
    const identity = String(talent.id || talent.name || talent.nombre || '').trim().toLowerCase();
    if (!identity || seenTalentIds.has(identity)) return false;
    seenTalentIds.add(identity);
    return true;
  });
  const equippedTalentIds = resolveEquippedTalentIds(
    { ...sheetData, equippedTalentIds: storedTalentSlots },
    talentCatalog,
  );
  const talentRarity = sheetData.talents?.rarity || sheetData.talentRarity || 'rara';
  const equippedTalentSlots = Array.from(
    { length: ROGUELITE_TALENT_SLOT_COUNT },
    (_, index) => {
      const talentId = equippedTalentIds[index];
      if (!talentId) return null;
      const talent = talentCatalog.find((candidate) => candidate.id === talentId);
      return talent ? {
        ...talent,
        rarity: talent.rarity || talent.rareza || talentRarity,
      } : null;
    },
  );
  const equippedTalents = equippedTalentSlots.filter(Boolean);
  const equippedSkillIds = preserveRuntimeState && Array.isArray(token.equippedSkillIds)
    ? token.equippedSkillIds
    : Array.isArray(activeRun.equippedSkillIds)
    ? activeRun.equippedSkillIds
    : (Array.isArray(sheetData.equippedSkillIds)
      ? sheetData.equippedSkillIds
      : (token.equippedSkillIds || []));
  const abilityCandidates = [
    ...syncedInventory,
    ...(sheetData.classEquipmentPool?.abilities || []),
    ...(sheetData.equipment?.abilities || []),
    ...(Array.isArray(token.equippedSkillSlots) ? token.equippedSkillSlots : []),
    ...(Array.isArray(token.equippedSkills) ? token.equippedSkills : []),
  ];
  const equippedSkillSlots = Array.from(
    { length: ROGUELITE_SKILL_SLOT_COUNT },
    (_, index) => {
      const skillId = equippedSkillIds[index];
      const normalizedSkillId = String(skillId || '').trim().toLowerCase();
      if (!normalizedSkillId) return null;
      const matchedSkill = abilityCandidates.find((item) => (
        resolveItemIdentityKeys(item).includes(normalizedSkillId)
      ));
      return matchedSkill
        ? { ...matchedSkill, type: 'ability', isPrepared: true }
        : { id: String(skillId), name: String(skillId), type: 'ability', isPrepared: true };
    },
  );
  const equippedSkills = equippedSkillSlots.filter(Boolean);

  return keepEncounterBarrier(token, {
    ...token,
    profileType: 'rogueliteClass',
    proficiencies: sheetData.summary?.proficiencies || sheetData.proficiencies || token.proficiencies || null,
    classIdentity: sheetData.classIdentity || sheetData.name || sheetData.templateId || token.classIdentity || null,
    canvasRuntime: 'roguelite',
    linkedClassId: sheetData.id || sheetData.templateId || token.linkedClassId || null,
    linkedClassOwner: sheetData.owner || token.linkedClassOwner || null,
    linkedCharacterId: null,
    runId: activeRun.id,
    runRevision: Math.max(0, Number(activeRun.revision) || 0, preserveRuntimeState ? Number(token.runRevision) || 0 : 0),
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
    talentCatalog,
    equippedTalentIds,
    equippedTalentSlots,
    equippedTalents,
    equippedSkillIds,
    equippedSkillSlots,
    equippedSkills,
    usedSkillSlots: preserveRuntimeState ? (token.usedSkillSlots || activeRun.usedSkillSlots || []) : (activeRun.usedSkillSlots || []),
    usedSkillSlotIds: preserveRuntimeState ? (token.usedSkillSlotIds || activeRun.usedSkillSlotIds || []) : (activeRun.usedSkillSlotIds || []),
    equipmentLoadout: equipped.loadout,
    activeWeaponSet: equipped.activeWeaponSet,
    inventory: syncedInventory,
    money: preserveRuntimeState && token.money !== undefined ? token.money : activeRun.money,
    velocidad: token.velocidad || 0,
  }, preserveBarrier);
};
