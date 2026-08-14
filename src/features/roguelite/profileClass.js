import { applyRogueliteLevelEffects } from './progression';
import { DEFAULT_STATUS_EFFECTS } from '../../utils/statusEffects';
import {
  isNavigationTag,
  mergeInheritedAndPersonalTags,
  resolveClassAuthorTags,
} from '../../utils/tags';
import {
  ROGUELITE_SKILL_SLOT_COUNT,
  ROGUELITE_TALENT_SLOT_COUNT,
  resolveEquippedSkillIds,
  resolveEquippedTalentIds,
  resolveRogueliteTalentCatalog,
} from './talents';
import {
  normalizeEquippedWeaponSets,
  resolveRogueliteEquipmentPool,
} from './equipmentPool';
import {
  applyRogueliteActiveRunToProfile,
  resolveRogueliteProfileSyncState,
} from './activeRun';

const DEFAULT_ATTRIBUTES = Object.freeze({
  destreza: 'd4',
  vigor: 'd4',
  intelecto: 'd4',
  voluntad: 'd4',
});

const DEFAULT_STATS = Object.freeze({
  postura: { current: 3, max: 4 },
  vida: { current: 4, max: 4 },
  ingenio: { current: 2, max: 3 },
  cordura: { current: 3, max: 3 },
  armadura: { current: 1, max: 2 },
});

const clone = (value) => JSON.parse(JSON.stringify(value));

export const normalizeRogueliteProfileLevel = (value, maximum = 10) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const resolvedMaximum = Math.max(1, Math.trunc(Number(maximum) || 10));
  return Math.min(resolvedMaximum, Math.max(1, Math.trunc(parsed)));
};

const resetProgression = (levels = []) => (
  Array.isArray(levels)
    ? levels.map((level) => ({
      ...(level && typeof level === 'object' ? clone(level) : { description: String(level || '') }),
      completed: false,
      acquired: false,
    }))
    : []
);

const resolveInheritedTags = (definition) => (
  Array.isArray(definition.classTags)
    ? definition.classTags
    : resolveClassAuthorTags(definition.tags, DEFAULT_STATUS_EFFECTS)
);

const resolveStoredPersonalStatuses = (storedConfiguration, inheritedTags) => {
  if (Array.isArray(storedConfiguration?.personalStatusTags)) {
    return storedConfiguration.personalStatusTags;
  }

  const inheritedNames = new Set(
    inheritedTags.map((tag) => String(tag || '').split('|')[0].trim().toLowerCase()),
  );

  // Compatibilidad con perfiles anteriores: los estados se guardaban mezclados
  // en `tags` como claves simples, mientras que las etiquetas nuevas llevan color.
  return (Array.isArray(storedConfiguration?.tags) ? storedConfiguration.tags : [])
    .filter((tag) => !String(tag || '').includes('|'))
    .filter((tag) => {
      const name = String(tag || '').trim().toLowerCase();
      return name && !inheritedNames.has(name) && !isNavigationTag(tag);
    });
};

export const createRogueliteProfileClass = (
  classDefinition,
  storedConfiguration,
  playerName,
) => {
  const definition = clone(classDefinition || {});
  const hasStoredConfiguration = Boolean(
    storedConfiguration && typeof storedConfiguration === 'object',
  );
  const inheritedTags = resolveInheritedTags(definition);
  const personalStatusTags = resolveStoredPersonalStatuses(storedConfiguration, inheritedTags);
  const talentCatalog = resolveRogueliteTalentCatalog(definition);
  const equippedTalentIds = resolveEquippedTalentIds(storedConfiguration, talentCatalog);
  const equippedSkillIds = resolveEquippedSkillIds(storedConfiguration, definition.equipment?.abilities || []);
  const equipmentPool = resolveRogueliteEquipmentPool(definition);
  const cleanConfiguration = {
    ...definition,
    id: definition.id,
    templateId: definition.id,
    owner: playerName,
    profileType: 'rogueliteClass',
    level: 1,
    rating: 1,
    attributes: clone(DEFAULT_ATTRIBUTES),
    stats: clone(DEFAULT_STATS),
    classEquipmentPool: clone(equipmentPool),
    equipment: clone(equipmentPool),
    equippedItems: { mainHand: null, offHand: null, body: null },
    talents: {
      ...(definition.talents || {}),
      slots: Array(ROGUELITE_TALENT_SLOT_COUNT).fill(null),
    },
    talentCatalog: clone(talentCatalog),
    equippedTalentIds: Array(ROGUELITE_TALENT_SLOT_COUNT).fill(null),
    equippedSkillIds: Array(ROGUELITE_SKILL_SLOT_COUNT).fill(null),
    storeItems: [],
    money: 0,
    tags: clone(inheritedTags),
    personalStatusTags: [],
    inspiration: (definition.inspiration || []).map((entry) => ({
      ...clone(entry),
      completed: false,
    })),
    classLevels: resetProgression(definition.classLevels),
  };
  const profileClass = hasStoredConfiguration
    ? { ...cleanConfiguration, ...clone(storedConfiguration) }
    : cleanConfiguration;
  const maximumLevel = definition.rogueliteProgressionConfigured
    ? Math.max(1, definition.classLevels?.length || 0)
    : Math.max(10, definition.classLevels?.length || 0);
  const resolvedLevel = normalizeRogueliteProfileLevel(profileClass.level, maximumLevel);
  const progressionStats = applyRogueliteLevelEffects(definition, resolvedLevel);

  const projectedProfile = applyRogueliteActiveRunToProfile({
    ...profileClass,
    name: definition.name,
    subtitle: definition.subtitle,
    description: definition.description,
    image: definition.image,
    avatar: definition.avatar,
    portraitSource: definition.portraitSource,
    actionDice: clone(definition.actionDice || []),
    lifeInitial: definition.lifeInitial,
    maxLife: progressionStats.maxLife,
    defenseClass: definition.defenseClass,
    maxDefenseClass: progressionStats.maxDefenseClass,
    movement: definition.movement,
    maxMovement: progressionStats.maxMovement,
    initiativeBase: definition.initiativeBase,
    maxInitiative: progressionStats.maxInitiative,
    resource: clone(progressionStats.resource),
    classEquipmentPool: clone(equipmentPool),
    equipment: clone(equipmentPool),
    equippedItems: normalizeEquippedWeaponSets(
      profileClass.equippedItems || cleanConfiguration.equippedItems,
    ),
    talentCatalog: clone(talentCatalog),
    equippedTalentIds: clone(equippedTalentIds),
    equippedSkillIds: clone(equippedSkillIds),
    talents: {
      ...(profileClass.talents || {}),
      ...(definition.talents || {}),
      slots: clone(equippedTalentIds),
    },
    summary: {
      ...(profileClass.summary || {}),
      ...(definition.summary || {}),
      proficiencies: clone(
        definition.summary?.proficiencies
        || profileClass.summary?.proficiencies
        || { weapons: {}, armor: {} },
      ),
    },
    classTags: clone(inheritedTags),
    personalStatusTags: clone(personalStatusTags),
    tags: mergeInheritedAndPersonalTags(inheritedTags, personalStatusTags),
    classLevels: resetProgression(definition.classLevels),
    rogueliteProgressionConfigured: Boolean(definition.rogueliteProgressionConfigured),
    id: definition.id,
    templateId: definition.id,
    owner: playerName,
    profileType: 'rogueliteClass',
    level: resolvedLevel,
  });

  return {
    ...projectedProfile,
    ...resolveRogueliteProfileSyncState(definition, projectedProfile),
  };
};
