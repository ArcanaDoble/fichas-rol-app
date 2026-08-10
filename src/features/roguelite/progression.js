const normalizeName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const cloneLevels = (levels) => levels.map((level) => ({
  ...level,
  effects: Array.isArray(level.effects)
    ? level.effects.map((effect) => ({ ...effect }))
    : undefined,
  additionalFeatures: Array.isArray(level.additionalFeatures)
    ? level.additionalFeatures.map((feature) => ({ ...feature }))
    : [],
}));

export const ROGUELITE_LEVEL_EFFECT_TARGETS = Object.freeze([
  { key: 'life.max', label: 'Vida máxima', tone: 'life' },
  { key: 'defense.max', label: 'CD máxima', tone: 'defense' },
  { key: 'movement.max', label: 'Movimiento', tone: 'movement' },
  { key: 'initiative.max', label: 'Iniciativa', tone: 'initiative' },
  { key: 'resource.max', label: 'Recurso máximo', tone: 'resource' },
  { key: 'custom', label: 'Mejora personalizada', tone: 'custom' },
]);

const EFFECT_TARGET_KEYS = new Set(ROGUELITE_LEVEL_EFFECT_TARGETS.map(({ key }) => key));

const normalizeEffectOperation = (value) => (value === 'set' ? 'set' : 'add');

const normalizeEffectColor = (value) => {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '';
};

export const normalizeRogueliteLevelEffect = (effect, index = 0) => {
  const source = effect && typeof effect === 'object' ? effect : {};
  const target = EFFECT_TARGET_KEYS.has(source.target) ? source.target : 'custom';
  const parsedValue = Number(source.value);

  return {
    id: String(source.id || `effect-${index + 1}`),
    target,
    operation: normalizeEffectOperation(source.operation),
    value: Number.isFinite(parsedValue) ? parsedValue : 0,
    label: target === 'custom' ? String(source.label || 'Nueva mejora') : '',
    color: target === 'custom' ? normalizeEffectColor(source.color) : '',
  };
};

const LEGACY_EFFECT_FIELDS = Object.freeze([
  { field: 'maxLife', target: 'life.max' },
  { field: 'defenseClass', target: 'defense.max' },
  { field: 'movement', target: 'movement.max' },
  { field: 'initiative', target: 'initiative.max' },
  { field: 'resourceMaximum', target: 'resource.max' },
]);

const deriveLegacyEffects = (level, index, levels) => {
  if (index <= 0 || !Array.isArray(levels)) return [];
  const previousLevel = levels[index - 1] || {};

  return LEGACY_EFFECT_FIELDS.flatMap(({ field, target }) => {
    const currentValue = toOptionalNumber(level?.[field]);
    const previousValue = toOptionalNumber(previousLevel?.[field]);
    if (currentValue === null || previousValue === null || currentValue === previousValue) return [];

    return [{
      id: `legacy-${target.replace('.', '-')}`,
      target,
      operation: 'add',
      value: currentValue - previousValue,
      label: '',
    }];
  });
};

export const getRogueliteLevelEffects = (level, index = 0, levels = []) => {
  if (Array.isArray(level?.effects)) {
    return level.effects.map(normalizeRogueliteLevelEffect);
  }
  return deriveLegacyEffects(level, index, levels).map(normalizeRogueliteLevelEffect);
};

export const getRogueliteEffectDefinition = (target) => (
  ROGUELITE_LEVEL_EFFECT_TARGETS.find((definition) => definition.key === target)
  || ROGUELITE_LEVEL_EFFECT_TARGETS.at(-1)
);

export const getRogueliteEffectLabel = (effect, resourceName = 'Recurso') => {
  const normalized = normalizeRogueliteLevelEffect(effect);
  if (normalized.target === 'resource.max') return `${resourceName} máximo`;
  if (normalized.target === 'custom') return normalized.label || 'Mejora personalizada';
  return getRogueliteEffectDefinition(normalized.target).label;
};

export const describeRogueliteLevelEffect = (effect, resourceName = 'Recurso') => {
  const normalized = normalizeRogueliteLevelEffect(effect);
  const label = getRogueliteEffectLabel(normalized, resourceName);
  const value = normalized.operation === 'set'
    ? `se fija en ${normalized.value}`
    : `${normalized.value >= 0 ? '+' : ''}${normalized.value}`;
  return `${label}: ${value}`;
};

export const DOCUMENTED_BARBARIAN_LEVELS = Object.freeze([
  {
    title: 'Furia',
    description: 'Obtienes el núcleo completo de Furia descrito para la clase.',
    maxLife: 8,
    movement: 2,
    resourceMaximum: 3,
  },
  {
    title: 'Sed de batalla',
    description: 'Al comenzar cada combate, obtienes 1 dado de Furia.',
    maxLife: 8,
    movement: 2,
    resourceMaximum: 3,
  },
  {
    title: 'Movimiento salvaje',
    description: 'Una vez por turno, puedes gastar 1 de Furia para duplicar tu Movimiento durante ese turno, sin gastar un dado de acción.',
    maxLife: 8,
    movement: 2,
    resourceMaximum: 3,
  },
  {
    title: 'Mejora de vida',
    description: 'Tu Vida máxima aumenta en 1 bloque y tu Movimiento aumenta en 1 casilla.',
    maxLife: 9,
    movement: 3,
    resourceMaximum: 3,
  },
  {
    title: 'Mejora de Furia',
    description: 'Tu reserva máxima de Furia aumenta de 3 a 4 dados.',
    maxLife: 9,
    movement: 3,
    resourceMaximum: 4,
  },
  {
    title: 'Furia desatada',
    description: 'Una vez por ronda, cuando gastes Furia para potenciar un ataque, puedes gastar un segundo dado de Furia y añadir también su resultado a la Presión.',
    maxLife: 9,
    movement: 3,
    resourceMaximum: 4,
  },
  {
    title: 'Instinto de supervivencia',
    description: 'Ante un ataque, puedes gastar 1 de Furia para añadir a la defensa el dado de un arma empuñada, sin consumir otro dado reservado. Este dado todavía no puede activar Crítico.',
    maxLife: 9,
    movement: 3,
    resourceMaximum: 4,
  },
  {
    title: 'Crítico salvaje',
    description: 'El dado de arma añadido por Instinto de supervivencia puede activar Crítico. Su explosión aumenta la defensa y el posible excedente defensivo.',
    maxLife: 9,
    movement: 3,
    resourceMaximum: 4,
  },
  {
    title: 'Furia temeraria',
    description: 'Cuando te Expongas, puedes hacer que el enemigo añada 2d6 a la Presión en lugar de 1d6. Si lo haces, obtienes 2 de Furia en lugar de 1 después del ataque.',
    maxLife: 9,
    movement: 3,
    resourceMaximum: 4,
  },
  {
    title: 'Último aliento',
    description: 'Cuando un ataque fuese a reducir tu Vida a 0, puedes gastar cualquier cantidad de Furia. Por cada Furia gastada, reduces en 1 los bloques de Vida que perderías.',
    maxLife: 9,
    movement: 3,
    resourceMaximum: 4,
  },
]);

const getDocumentedLevels = (classItem = {}) => {
  const identity = `${normalizeName(classItem.id)} ${normalizeName(classItem.name)}`;
  return identity.includes('barbar') ? DOCUMENTED_BARBARIAN_LEVELS : null;
};

const toOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
};

export const normalizeRogueliteProgressionLevel = (level, index, levels = []) => {
  const source = level && typeof level === 'object'
    ? level
    : { description: String(level || '') };

  return {
    ...source,
    title: String(source.title || `Nivel ${index + 1} — Nuevo avance`).trim(),
    description: String(source.description || '').trim(),
    maxLife: toOptionalNumber(source.maxLife ?? source.life ?? source.vida),
    movement: toOptionalNumber(source.movement ?? source.movimiento),
    resourceMaximum: toOptionalNumber(
      source.resourceMaximum ?? source.resourceMax ?? source.furiaMaxima,
    ),
    effects: getRogueliteLevelEffects(source, index, levels),
    completed: Boolean(source.completed),
    acquired: Boolean(source.acquired),
    additionalFeatures: Array.isArray(source.additionalFeatures)
      ? source.additionalFeatures.map((feature) => ({ ...feature }))
      : [],
  };
};

export const resolveRogueliteClassLevels = (classItem = {}) => {
  const rogueliteRules = classItem.roguelite || {};
  const configured = Boolean(
    classItem.rogueliteProgressionConfigured
    ?? rogueliteRules.progressionConfigured,
  );
  const explicitLevels = rogueliteRules.progression?.levels
    ?? rogueliteRules.classLevels
    ?? classItem.classLevels;
  const documentedLevels = getDocumentedLevels(classItem);
  const sourceLevels = !configured && documentedLevels
    ? documentedLevels
    : (Array.isArray(explicitLevels) ? explicitLevels : []);

  const clonedLevels = cloneLevels(sourceLevels);
  return clonedLevels.map((level, index) => (
    normalizeRogueliteProgressionLevel(level, index, clonedLevels)
  ));
};

const applyNumericEffect = (currentValue, effect) => {
  const base = Number(currentValue) || 0;
  return effect.operation === 'set' ? effect.value : base + effect.value;
};

export const applyRogueliteLevelEffects = (classDefinition = {}, level = 1) => {
  const levels = Array.isArray(classDefinition.classLevels) ? classDefinition.classLevels : [];
  const maximumLevel = Math.max(1, levels.length || 1);
  const resolvedLevel = Math.min(maximumLevel, Math.max(1, Math.trunc(Number(level) || 1)));
  const result = {
    maxLife: Number(classDefinition.maxLife ?? classDefinition.roguelite?.maxLife) || 0,
    maxDefenseClass: Number(
      classDefinition.maxDefenseClass
      ?? classDefinition.defenseClass
      ?? classDefinition.roguelite?.maxDefenseClass
      ?? classDefinition.roguelite?.defenseClass,
    ) || 0,
    maxMovement: Number(
      classDefinition.maxMovement
      ?? classDefinition.movement
      ?? classDefinition.roguelite?.maxMovement
      ?? classDefinition.roguelite?.movement,
    ) || 0,
    maxInitiative: Number(
      classDefinition.maxInitiative
      ?? classDefinition.initiativeBase
      ?? classDefinition.roguelite?.maxInitiative
      ?? classDefinition.roguelite?.initiativeBase,
    ) || 0,
    resource: {
      ...(classDefinition.roguelite?.resource || {}),
      ...(classDefinition.resource || {}),
    },
  };

  levels.slice(0, resolvedLevel).forEach((progressionLevel, index) => {
    getRogueliteLevelEffects(progressionLevel, index, levels).forEach((rawEffect) => {
      const effect = normalizeRogueliteLevelEffect(rawEffect);
      if (effect.target === 'life.max') result.maxLife = applyNumericEffect(result.maxLife, effect);
      if (effect.target === 'defense.max') result.maxDefenseClass = applyNumericEffect(result.maxDefenseClass, effect);
      if (effect.target === 'movement.max') result.maxMovement = applyNumericEffect(result.maxMovement, effect);
      if (effect.target === 'initiative.max') result.maxInitiative = applyNumericEffect(result.maxInitiative, effect);
      if (effect.target === 'resource.max') {
        result.resource.maximum = applyNumericEffect(result.resource.maximum, effect);
      }
    });
  });

  return result;
};
