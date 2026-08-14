import { nanoid } from 'nanoid';
import { normalizeCropPercentages, normalizeImageFocus } from './imageFraming';

export const ROGUELITE_ENEMY_SLOT_MIN = 1;
export const ROGUELITE_ENEMY_SLOT_MAX = 4;
export const ROGUELITE_ENEMY_STAT_MAX = 20;

export const ROGUELITE_ENEMY_RARITIES = [
  { id: 'comun', label: 'Común', accent: '#8d9aab', soft: 'rgba(141, 154, 171, 0.32)', faint: 'rgba(141, 154, 171, 0.1)' },
  { id: 'poco-comun', label: 'Poco común', accent: '#55b978', soft: 'rgba(85, 185, 120, 0.32)', faint: 'rgba(85, 185, 120, 0.1)' },
  { id: 'rara', label: 'Rara', accent: '#54a8dc', soft: 'rgba(84, 168, 220, 0.32)', faint: 'rgba(84, 168, 220, 0.1)' },
  { id: 'epica', label: 'Épica', accent: '#b96bd6', soft: 'rgba(185, 107, 214, 0.32)', faint: 'rgba(185, 107, 214, 0.1)' },
  { id: 'legendaria', label: 'Legendaria', accent: '#e0a45b', soft: 'rgba(224, 164, 91, 0.32)', faint: 'rgba(224, 164, 91, 0.1)' },
];

export const ROGUELITE_THREAT_DICE = ['', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : Math.max(0, Number(fallback) || 0);
};

export const clampRogueliteEnemyStat = (value, fallback = 0) => (
  Math.min(ROGUELITE_ENEMY_STAT_MAX, Math.max(0, Math.round(asNumber(value, fallback))))
);

const clampSlotCount = (value, fallback = 3) => (
  Math.min(
    ROGUELITE_ENEMY_SLOT_MAX,
    Math.max(ROGUELITE_ENEMY_SLOT_MIN, Math.round(asNumber(value, fallback)))
  )
);

const normalizeSlots = (slots, count, normalizeSlot = (slot) => slot) => Array.from(
  { length: clampSlotCount(count) },
  (_, index) => (slots?.[index] ? normalizeSlot(slots[index]) : null)
);

const normalizeTraits = (value) => (
  (Array.isArray(value) ? value : String(value || '').split(','))
    .map((trait) => String(trait || '').trim())
    .filter(Boolean)
);

export const normalizeRogueliteEnemyAbility = (candidate = {}) => ({
  ...candidate,
  id: candidate.id || `enemy-ability-${nanoid(8)}`,
  name: String(candidate.name || candidate.nombre || 'Habilidad sin nombre').trim() || 'Habilidad sin nombre',
  description: String(candidate.description || candidate.descripcion || ''),
  damage: String(candidate.damage ?? candidate.dano ?? '').trim(),
  range: String(candidate.range ?? candidate.alcance ?? 'Arma').trim() || 'Arma',
  traits: normalizeTraits(candidate.traits ?? candidate.rasgos),
  image: candidate.image || candidate.imagen || candidate.imageUrl || '',
  imageSource: candidate.imageSource || candidate.image || candidate.imagen || candidate.imageUrl || '',
});

export const createEmptyRogueliteEnemyAbility = () => normalizeRogueliteEnemyAbility({
  id: `enemy-ability-${nanoid(8)}`,
  name: 'Nueva habilidad',
  description: 'Describe el efecto de esta habilidad.',
  damage: '',
  range: 'Arma',
  traits: [],
  image: '',
  imageSource: '',
});

export const createEmptyRogueliteEnemy = () => normalizeRogueliteEnemy({
  id: `roguelite-enemy-${nanoid(10)}`,
  name: 'Nuevo enemigo',
  description: 'Describe su aspecto, comportamiento y papel durante el encuentro.',
  rarity: 'comun',
  image: '',
  imageSource: '',
  headerImage: '',
  imageCrop: null,
  imageFocus: { x: 0.68, y: 0.38 },
  headerFocus: { x: 0.68, y: 0.38 },
  stats: {
    vida: { current: 6, max: 6 },
    cd: { current: 1, max: 1 },
    movimiento: { current: 2, max: 2 },
    iniciativa: { current: 2, max: 2 },
    ofensiva: { current: 2, max: 2 },
  },
  threatDie: '',
  equipmentSlotCount: 3,
  equipmentSlots: [],
  abilitySlotCount: 3,
  abilitySlots: [],
});

export function normalizeRogueliteEnemy(candidate = {}) {
  const sourceStats = candidate.stats || {};
  const stat = (key, fallback) => {
    const value = sourceStats[key] || {};
    const maximum = clampRogueliteEnemyStat(value.max ?? value.maximum ?? value.current, fallback);
    return {
      current: Math.min(clampRogueliteEnemyStat(value.current ?? value.actual, maximum), maximum),
      max: maximum,
    };
  };
  const equipmentSlotCount = clampSlotCount(
    candidate.equipmentSlotCount,
    candidate.equipmentSlots?.length || 3
  );
  const abilitySlotCount = clampSlotCount(
    candidate.abilitySlotCount,
    candidate.abilitySlots?.length || 3
  );

  return {
    ...candidate,
    id: candidate.id || `roguelite-enemy-${nanoid(10)}`,
    name: String(candidate.name || 'Enemigo').trim() || 'Enemigo',
    description: String(candidate.description || ''),
    rarity: ROGUELITE_ENEMY_RARITIES.some((rarity) => rarity.id === candidate.rarity)
      ? candidate.rarity
      : 'comun',
    image: candidate.image || candidate.portrait || '',
    imageSource: candidate.imageSource || candidate.image || candidate.portrait || '',
    headerImage: candidate.headerImage || candidate.cardImage || '',
    imageCrop: normalizeCropPercentages(candidate.imageCrop || candidate.headerCrop),
    imageFocus: normalizeImageFocus(candidate.imageFocus),
    headerFocus: normalizeImageFocus(candidate.headerFocus),
    sortOrder: Number.isFinite(Number(candidate.sortOrder)) ? Number(candidate.sortOrder) : null,
    stats: {
      vida: stat('vida', 6),
      cd: stat('cd', 1),
      movimiento: stat('movimiento', 2),
      iniciativa: stat('iniciativa', 2),
      ofensiva: stat('ofensiva', 2),
    },
    threatDie: ROGUELITE_THREAT_DICE.includes(candidate.threatDie)
      ? candidate.threatDie
      : '',
    equipmentSlotCount,
    equipmentSlots: normalizeSlots(candidate.equipmentSlots, equipmentSlotCount),
    abilitySlotCount,
    abilitySlots: normalizeSlots(candidate.abilitySlots, abilitySlotCount, normalizeRogueliteEnemyAbility),
  };
}

export const sortRogueliteEnemies = (enemies = []) => enemies
  .map((enemy, index) => ({ enemy, index }))
  .sort((left, right) => {
    const leftOrder = Number(left.enemy?.sortOrder);
    const rightOrder = Number(right.enemy?.sortOrder);
    const leftHasOrder = left.enemy?.sortOrder !== null && left.enemy?.sortOrder !== undefined && Number.isFinite(leftOrder);
    const rightHasOrder = right.enemy?.sortOrder !== null && right.enemy?.sortOrder !== undefined && Number.isFinite(rightOrder);
    if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;
    return left.index - right.index;
  })
  .map(({ enemy }) => enemy);

export const reorderRogueliteEnemies = (enemies = [], sourceId, targetId) => {
  if (!sourceId || !targetId || sourceId === targetId) return enemies;
  const sourceIndex = enemies.findIndex((enemy) => enemy?.id === sourceId);
  const targetIndex = enemies.findIndex((enemy) => enemy?.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return enemies;
  const reordered = [...enemies];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered.map((enemy, index) => ({ ...enemy, sortOrder: index }));
};

export const mergeRogueliteEnemySnapshot = (currentEnemies = [], remoteEnemies = []) => {
  const remoteIds = new Set(remoteEnemies.map((enemy) => enemy.id).filter(Boolean));
  const candidates = [
    ...remoteEnemies.map((remoteEnemy) => (
      currentEnemies.find((enemy) => enemy.id === remoteEnemy.id && enemy._dirty) || remoteEnemy
    )),
    ...currentEnemies.filter((enemy) => enemy._localOnly && !remoteIds.has(enemy.id)),
  ];
  const seen = new Set();
  return candidates.filter((enemy) => {
    if (!enemy?.id || seen.has(enemy.id)) return false;
    seen.add(enemy.id);
    return true;
  });
};

const flattenSlotItem = (slot, type, index) => {
  if (!slot || typeof slot !== 'object') return null;
  const item = slot.payload ? { ...slot.payload, ...slot } : { ...slot };
  delete item.payload;
  return {
    ...item,
    type: item.type || type,
    canvasSlot: `${type}_${index + 1}`,
    isEquipped: type !== 'ability',
    isPrepared: type === 'ability',
  };
};

export const createRogueliteEnemyTokenPayload = (candidate = {}, options = {}) => {
  const enemy = normalizeRogueliteEnemy(candidate);
  const equipment = enemy.equipmentSlots
    .map((slot, index) => flattenSlotItem(slot, 'equipment', index))
    .filter(Boolean);
  const abilities = enemy.abilitySlots
    .map((slot, index) => flattenSlotItem(slot, 'ability', index))
    .filter(Boolean);
  const portrait = enemy.image || enemy.imageSource || '';

  return {
    profileType: 'rogueliteEnemy',
    canvasRuntime: 'roguelite',
    linkedEnemyId: enemy.id,
    name: enemy.name,
    img: portrait,
    portrait,
    controlledBy: ['master'],
    teamId: 'enemies',
    isCircular: true,
    hasVision: true,
    visionRadius: 300,
    status: [],
    stats: enemy.stats,
    fixedInitiative: enemy.stats.iniciativa.current,
    offenseBase: enemy.stats.ofensiva.current,
    threatDie: enemy.threatDie || null,
    velocidad: enemy.stats.iniciativa.current,
    equipmentSlots: enemy.equipmentSlots,
    abilitySlots: enemy.abilitySlots,
    equippedItems: equipment,
    enemyAbilities: abilities,
    inventory: [...equipment, ...abilities],
    rarity: enemy.rarity,
    description: enemy.description,
    ...options,
  };
};

export const prepareRogueliteEnemyForFirestore = (value) => {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(prepareRogueliteEnemyForFirestore);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, prepareRogueliteEnemyForFirestore(entry)])
  );
};
