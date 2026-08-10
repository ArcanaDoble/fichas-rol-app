import { applyRogueliteLevelEffects } from './progression';

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

const DEFAULT_EQUIPMENT = Object.freeze({
  weapons: [],
  armor: [],
  abilities: [],
  objects: [],
  accessories: [],
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

export const createRogueliteProfileClass = (
  classDefinition,
  storedConfiguration,
  playerName,
) => {
  const definition = clone(classDefinition || {});
  const hasStoredConfiguration = Boolean(
    storedConfiguration && typeof storedConfiguration === 'object',
  );
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
    equipment: clone(DEFAULT_EQUIPMENT),
    equippedItems: { mainHand: null, offHand: null, body: null },
    talents: {},
    storeItems: [],
    money: 0,
    tags: [],
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

  return {
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
    classLevels: resetProgression(definition.classLevels),
    rogueliteProgressionConfigured: Boolean(definition.rogueliteProgressionConfigured),
    id: definition.id,
    templateId: definition.id,
    owner: playerName,
    profileType: 'rogueliteClass',
    level: resolvedLevel,
  };
};
