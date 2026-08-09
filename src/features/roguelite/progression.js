const normalizeName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const cloneLevels = (levels) => levels.map((level) => ({
  ...level,
  additionalFeatures: Array.isArray(level.additionalFeatures)
    ? level.additionalFeatures.map((feature) => ({ ...feature }))
    : [],
}));

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

export const normalizeRogueliteProgressionLevel = (level, index) => {
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

  return cloneLevels(sourceLevels).map(normalizeRogueliteProgressionLevel);
};

