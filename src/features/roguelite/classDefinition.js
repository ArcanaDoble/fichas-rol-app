import { resolveRogueliteClassLevels } from './progression';

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDice = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((die) => String(die || '').trim().toLowerCase())
    .filter((die) => /^d\d+$/.test(die));
};

export const normalizeRogueliteClass = (classItem = {}) => {
  const rules = classItem.roguelite || classItem.ruleset || {};
  const resource = rules.resource || classItem.resource || {};
  const maxLife = Math.max(0, toNumber(rules.maxLife ?? classItem.maxLife, 0));
  const lifeInitial = Math.min(
    maxLife,
    Math.max(0, toNumber(rules.lifeInitial ?? classItem.lifeInitial, maxLife)),
  );
  const rawDefenseClass = Math.max(
    0,
    toNumber(rules.defenseClass ?? classItem.defenseClass, 0),
  );
  const maxDefenseClass = Math.max(
    rawDefenseClass,
    toNumber(rules.maxDefenseClass ?? classItem.maxDefenseClass, rawDefenseClass),
  );
  const rawMovement = Math.max(0, toNumber(rules.movement ?? classItem.movement, 0));
  const maxMovement = Math.max(
    rawMovement,
    toNumber(rules.maxMovement ?? classItem.maxMovement, rawMovement),
  );
  const rawInitiative = Math.max(
    0,
    toNumber(rules.initiativeBase ?? classItem.initiativeBase, 0),
  );
  const maxInitiative = Math.max(
    rawInitiative,
    toNumber(rules.maxInitiative ?? classItem.maxInitiative, rawInitiative),
  );
  const resourceMaximum = Math.max(0, toNumber(resource.maximum ?? resource.max, 0));
  const resourceInitial = Math.min(
    resourceMaximum,
    Math.max(0, toNumber(
      resource.initial ?? resource.starting ?? resource.start ?? resource.current,
      0,
    )),
  );

  return {
    ...classItem,
    id: String(classItem.id || '').trim(),
    name: String(classItem.name || 'Clase sin nombre').trim(),
    subtitle: String(classItem.subtitle || classItem.role || 'Clase de aventura').trim(),
    description: String(classItem.description || 'Esta clase todavía no tiene descripción.').trim(),
    image: classItem.image || classItem.portraitSource || '',
    level: Math.max(1, toNumber(classItem.level, 1)),
    actionDice: normalizeDice(rules.actionDice || classItem.actionDice),
    lifeInitial,
    maxLife,
    defenseClass: rawDefenseClass,
    maxDefenseClass,
    movement: rawMovement,
    maxMovement,
    initiativeBase: rawInitiative,
    maxInitiative,
    classLevels: resolveRogueliteClassLevels(classItem),
    rogueliteProgressionConfigured: Boolean(
      classItem.rogueliteProgressionConfigured ?? rules.progressionConfigured,
    ),
    resource: {
      name: String(resource.name || '').trim(),
      color: resource.color || '#c8aa6e',
      maximum: resourceMaximum,
      initial: resourceInitial,
    },
  };
};

export const mergeRogueliteClassCatalogs = (
  legacyClasses = [],
  rogueliteClasses = [],
) => {
  const classById = new Map();

  [...legacyClasses, ...rogueliteClasses].forEach((classItem) => {
    const classId = String(classItem?.id || '').trim();
    if (!classId) return;

    const previousClass = classById.get(classId) || {};
    const previousRules = previousClass.roguelite || {};
    const nextRules = classItem.roguelite || {};
    classById.set(classId, {
      ...previousClass,
      ...classItem,
      id: classId,
      roguelite: {
        ...previousRules,
        ...nextRules,
        resource: {
          ...(previousRules.resource || {}),
          ...(nextRules.resource || {}),
        },
      },
    });
  });

  return Array.from(classById.values()).map(normalizeRogueliteClass).sort((left, right) => (
    left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })
  ));
};
