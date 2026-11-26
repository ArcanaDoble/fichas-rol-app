import { getTemporaryLife } from '../../tactical-shared/potionBuffs';
import { getArcaneBarrierBonus } from '../spells/arcaneBarrierState';
import { isPoisonTrait } from '../../tactical-shared/poisonRules';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import { parseActionDiceCost } from '../../roguelite/catalogItem';
import { resolveWeaponForm } from '../../roguelite/weaponForms';
import { canTokenSeeThroughSmoke } from '../../tactical-shared/tokenVisibilityAccess';
import {
  areTokensAllied,
  canUseTouchAgainstAdjacentLockedTarget,
  getTokenCombatCellContext,
  getTokenDistanceInCells,
} from '../../tactical-shared/legacyCombatRules';

const RANGE_VALUES = Object.freeze({
  toque: 0,
  cercano: 1,
  intermedio: 2,
  lejano: 3,
  extremo: Number.POSITIVE_INFINITY,
});

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const asInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

export const hasCanvasStatus = (token, id) => (token?.status || []).some(status =>
  normalizeText(typeof status === 'string' ? status : status?.id || status?.name || status?.label) === id);
export const isCanvasProne = token => hasCanvasStatus(token, 'derribado');

export const getCanvasWeaponTraits = (weapon = {}) => {
  const source = weapon.rasgos ?? weapon.traits ?? weapon.properties ?? [];
  if (Array.isArray(source)) return source.map(normalizeText).map(trait => isPoisonTrait(trait) ? 'venenosa' : ['perforacion', 'penetrante'].includes(trait) ? 'perforante' : trait).filter(Boolean);
  return String(source || '').split(',').map(normalizeText).map(trait => isPoisonTrait(trait) ? 'venenosa' : ['perforacion', 'penetrante'].includes(trait) ? 'perforante' : trait).filter(Boolean);
};

export const hasCanvasWeaponTrait = (weapon, trait) => (
  getCanvasWeaponTraits(weapon).some((candidate) => candidate === normalizeText(trait))
);

export const parseWeaponDiceProfile = (weapon = {}) => {
  const source = weapon.defenseDiceProfile
    ?? weapon.perfilDefensa
    ?? weapon.dano
    ?? weapon.damage
    ?? weapon.poder
    ?? weapon.power
    ?? '';
  const matches = [...String(source).toLowerCase().matchAll(/(\d*)\s*d\s*(4|6|8|10|12|20)/g)];
  return matches.flatMap((match) => {
    const count = Math.max(1, Math.min(6, asInteger(match[1] || 1, 1)));
    const sides = asInteger(match[2], 6);
    return Array.from({ length: count }, (_, index) => ({
      id: `weapon-die-${match.index}-${index}`,
      sides,
      die: `d${sides}`,
    }));
  });
};

export const getCanvasWeaponActionCost = (weapon = {}, attacker = null) => {
  if (attacker?.profileType === 'rogueliteEnemy') return 0;
  if (weapon.attackMode === 'dual') return 2;
  const explicit = parseActionDiceCost(
    weapon.actionCost ?? weapon.consumo ?? weapon.cost ?? weapon.coste,
    1,
  );
  return Math.max(hasCanvasWeaponTrait(weapon, 'pesada') ? 2 : 1, explicit);
};

const getTokenEquippedItems = (token = {}) => {
  if (Array.isArray(token.equippedItems) && !token.equipmentLoadout) return token.equippedItems.filter(item => item && typeof item === 'object').map(item => resolveWeaponForm(item.payload ? { ...item.payload, ...item } : item));
  const loadout = token.equipmentLoadout || token.equippedItems || {};
  const activeSetIndex = Number(loadout.activeWeaponSet) === 1 ? 1 : 0;
  const activeSet = Array.isArray(loadout.weaponSets)
    ? (loadout.weaponSets[activeSetIndex] || loadout.weaponSets[0] || {})
    : loadout;
  return [['mainHand', activeSet.mainHand], ['offHand', activeSet.offHand], ['body', loadout.body], ['accessory_1', loadout.accessory_1], ['accessory_2', loadout.accessory_2]]
    .filter(([, item]) => item).map(([canvasSlot, item]) => resolveWeaponForm({ ...item.payload, ...item, canvasSlot }));
};

export const getCanvasWeaponIdentity = (item = {}) => String(item.runItemId || item.instanceId || item.id || item.catalogId || item.name || item.nombre || '');

export const isCanvasShield = (item = {}) => {
  const source = item?.payload ? { ...item.payload, ...item } : item;
  if (source?.isShield === true || source?.shield === true) return true;
  return [source?.type, source?.itemType, source?._category, source?.category, source?.subtype, source?.id, source?.catalogId,
    source?.equipmentType, source?.name, source?.nombre, ...getCanvasWeaponTraits(source || {})]
    .some(value => /(^|\W)(escudos?|shields?)(\W|$)/.test(normalizeText(value).replace(/_/g, ' ')));
};

export const getCanvasCombatItems = (token = {}) => {
  const equipped = getTokenEquippedItems(token);
  if (token.profileType !== 'rogueliteEnemy') return equipped;
  const seen = new Set();
  return [...(Array.isArray(token.inventory) ? token.inventory : []), ...equipped].filter(item => item && typeof item === 'object').map(item => resolveWeaponForm(item.payload ? { ...item.payload, ...item } : item)).filter(item => {
    const key = getCanvasWeaponIdentity(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getCanvasEquippedWeapons = (token = {}) => (
  getCanvasCombatItems(token).filter((item) => {
    if (token.profileType === 'rogueliteEnemy' && isCanvasShield(item)) return false;
    return [item?.type, item?._category, item?.category].some(value => ['weapon', 'arma', 'weapons', 'armas'].includes(normalizeText(value)));
  })
);

export const getCanvasDefensiveEquipment = (token = {}) => (
  getCanvasCombatItems(token).filter((item) => {
    if (getCanvasWeaponTraits(item).includes('sin guardia')) return false;
    if (token.profileType === 'rogueliteEnemy' && isCanvasShield(item)) return true;
    if (parseWeaponDiceProfile(item).length === 0) return false;
    const type = normalizeText(item?.type ?? item?._category ?? item?.category);
    const traits = getCanvasWeaponTraits(item);
    return ['weapon', 'arma', 'weapons'].includes(type)
      || item?.defenseDiceProfile
      || item?.perfilDefensa
      || traits.some((trait) => ['defensiva', 'defensivo', 'guardia', 'bloqueo', 'parada'].includes(trait));
  })
);

export const resolveCanvasEnemyDefenseSelection = ({ token, equipmentIds = [] } = {}) => {
  const invalid = reason => ({ legal: false, items: [], weapons: [], shield: null, cdBonus: 0, reason });
  if (token?.profileType !== 'rogueliteEnemy') return invalid('La selección de equipo corresponde a un enemigo.');
  if (!Array.isArray(equipmentIds)) return invalid('Selecciona equipo válido del enemigo.');
  const ids = equipmentIds.map(String);
  if (new Set(ids).size !== ids.length) return invalid('Cada copia del equipo solo puede utilizarse una vez.');
  const available = getCanvasDefensiveEquipment(token);
  const items = ids.map(id => available.find(item => getCanvasWeaponIdentity(item) === id));
  if (items.some(item => !item)) return invalid('Algún equipo ya no está disponible en el inventario.');
  const shields = items.filter(isCanvasShield);
  const weapons = items.filter(item => !isCanvasShield(item));
  if (shields.length > 1) return invalid('Solo puedes utilizar un escudo.');
  const hands = shields.length + weapons.reduce((sum, item) => sum + resolveEquipmentHandsRequired(item), 0);
  if (hands > 2) return invalid('El equipo defensivo no puede ocupar más de dos manos.');
  return { legal: true, items, weapons, shield: shields[0] || null, cdBonus: shields.length ? 1 : 0, reason: '' };
};

export const getDefaultCanvasEnemyDefenseSelection = (token) => {
  if (token?.profileType !== 'rogueliteEnemy') return [];
  const equipment = getCanvasDefensiveEquipment(token);
  const shield = equipment.find(isCanvasShield);
  const weapons = equipment.filter(item => !isCanvasShield(item));
  if (shield) {
    const weapon = weapons.find(item => resolveEquipmentHandsRequired(item) === 1);
    return [shield, weapon].filter(Boolean).map(getCanvasWeaponIdentity);
  }
  return weapons[0] ? [getCanvasWeaponIdentity(weapons[0])] : [];
};

export const toggleCanvasEnemyDefenseEquipment = ({ token, equipmentIds = [], itemId } = {}) => {
  const equipment = getCanvasDefensiveEquipment(token);
  const id = String(itemId);
  const item = equipment.find(candidate => getCanvasWeaponIdentity(candidate) === id);
  if (!item || token?.profileType !== 'rogueliteEnemy') return equipmentIds;
  const ids = [...new Set(equipmentIds.map(String))];
  if (ids.includes(id)) return ids.filter(candidate => candidate !== id);
  const selected = ids.map(candidate => equipment.find(value => getCanvasWeaponIdentity(value) === candidate)).filter(Boolean);
  const oneHanded = selected.filter(candidate => !isCanvasShield(candidate) && resolveEquipmentHandsRequired(candidate) === 1);
  if (isCanvasShield(item)) return [item, oneHanded[0]].filter(Boolean).map(getCanvasWeaponIdentity);
  if (resolveEquipmentHandsRequired(item) === 2) return [id];
  const other = oneHanded[oneHanded.length - 1] || selected.find(isCanvasShield);
  return [other, item].filter(Boolean).map(getCanvasWeaponIdentity);
};

export const getEnemyActiveDefenseEligibility = ({ token, participant } = {}) => {
  if (!token || token.profileType !== 'rogueliteEnemy' || participant?.side !== 'enemies') {
    return { eligible: false, equipment: [], reason: 'El objetivo no es un enemigo.' };
  }
  const equipment = getCanvasDefensiveEquipment(token);
  const attackAction = (participant.enemyActions || []).find((action) => action.id === 'attack');
  if (!attackAction || attackAction.status === 'spent') {
    return { eligible: false, equipment, reason: 'La acción principal del enemigo ya está gastada.' };
  }
  if (token.preventActiveDefense || token.cannotDefend || participant.preventActiveDefense) {
    return { eligible: false, equipment, reason: 'Una regla impide que este enemigo se defienda.' };
  }
  if (!equipment.some(item => !isCanvasShield(item))) {
    return { eligible: false, equipment, reason: 'No tiene un arma o equipo defensivo empuñado.' };
  }
  return { eligible: true, equipment, reason: '' };
};

const getRangeName = (weapon = {}) => normalizeText(
  weapon.alcance ?? weapon.alc ?? weapon.range ?? weapon.payload?.alcance ?? weapon.payload?.range ?? 'Toque',
);

const getRangeValue = (weapon = {}) => {
  const rangeName = getRangeName(weapon);
  const named = Object.entries(RANGE_VALUES).find(([name]) => rangeName.includes(name));
  if (named) return named[1];
  const numeric = Number.parseInt(rangeName.match(/\d+/)?.[0], 10);
  return Number.isFinite(numeric) ? numeric : RANGE_VALUES.toque;
};

export const getCanvasWeaponRange = getRangeValue;

const isOneHanded = (weapon = {}) => resolveEquipmentHandsRequired(weapon) === 1;

export const evaluateCanvasAttackRange = ({
  attacker,
  target,
  weapon,
  items = [],
  gridConfig = {},
  deferThrownRange = true,
  allowAlliedTargets = false,
}) => {
  if (!attacker || !target || !weapon) {
    return { legal: false, reason: 'Faltan atacante, objetivo o arma.' };
  }

  if (attacker.id === target.id || (!allowAlliedTargets && areTokensAllied(attacker, target))) {
    return { legal: false, reason: 'El objetivo debe ser una criatura enemiga.' };
  }

  const distance = getTokenDistanceInCells(attacker, target, gridConfig);
  if (hasCanvasStatus(attacker, 'cegado') && distance > 0) {
    return { legal: false, distance, reason: 'Cegado: solo puedes elegir objetivos en tu misma casilla (Toque).' };
  }
  if (!canTokenSeeThroughSmoke(attacker, target, items)) {
    return { legal: false, distance, reason: 'El humo bloquea la línea de visión hacia ese objetivo.' };
  }
  const rangeName = getRangeName(weapon);
  const rangeValue = getRangeValue(weapon);
  const isThrown = deferThrownRange && hasCanvasWeaponTrait(weapon, 'arrojadiza');
  const attackerContext = getTokenCombatCellContext(attacker, items, gridConfig);
  const attackerInDuel = attackerContext.mode === 'duel';
  const duelist = hasCanvasWeaponTrait(weapon, 'duelista');

  if (attackerInDuel && hasCanvasWeaponTrait(weapon, 'a distancia')) {
    return { legal: false, distance, rangeName, reason: 'No puedes utilizar un arma A distancia mientras estás en Duelo.' };
  }

  if (attackerInDuel && rangeValue >= RANGE_VALUES.intermedio) {
    return {
      legal: false,
      distance,
      rangeName,
      reason: 'No puedes usar armas de alcance Intermedio o superior mientras estás en Duelo.',
    };
  }

  if (!isThrown && rangeValue === RANGE_VALUES.toque && distance === 1) {
    const touchException = canUseTouchAgainstAdjacentLockedTarget(attacker, target, gridConfig)
      || attacker.allowAdjacentTouchTraits === true
      || normalizeText(attacker.classIdentity).includes('picaro');
    if (touchException) return { legal: true, distance, rangeName, suppressTraits: false, note: '' };

    if (!isOneHanded(weapon)) {
      return {
        legal: false,
        distance,
        rangeName,
        reason: 'A una casilla, un arma de Toque debe empuñarse a una mano.',
      };
    }
    return {
      legal: true,
      distance,
      rangeName,
      suppressTraits: true,
      note: 'Ataque de Toque a una casilla: los rasgos del arma no se resuelven.',
    };
  }

  if (!isThrown && distance > rangeValue) {
    return {
      legal: false,
      distance,
      rangeName,
      reason: `El objetivo está a ${distance} casillas y el arma no alcanza.`,
    };
  }

  const suppressTraits = attackerInDuel && rangeValue === RANGE_VALUES.cercano && !duelist;
  return {
    legal: true,
    distance,
    rangeName,
    suppressTraits,
    note: suppressTraits ? 'Ataque en Duelo: se ignoran los rasgos de resolución del arma.' : '',
  };
};

export const getUsableAttackDice = (participant = {}) => (
  (participant.actionDice || []).filter((die) => die.status === 'available')
);

export const getUsableDefenseDice = (participant = {}) => (
  (participant.actionDice || []).filter((die) => die.status === 'committed')
);

export const getCanvasWeaponAvailability = ({ token, participant, weapon }) => {
  if (token?.profileType === 'rogueliteEnemy') {
    const attackAction = (participant?.enemyActions || []).find((action) => action.id === 'attack');
    return attackAction?.status === 'spent'
      ? { available: false, reason: 'La acción de ataque del enemigo ya está gastada.' }
      : { available: true, cost: 0, reason: '' };
  }
  const cost = getCanvasWeaponActionCost(weapon, token);
  const available = getUsableAttackDice(participant).length;
  return available >= cost
    ? { available: true, cost, reason: '' }
    : { available: false, cost, reason: `Necesitas ${cost} dados de acción disponibles; te quedan ${available}.` };
};

export const rollWeaponDice = (profile = [], random = Math.random) => (
  profile.map(({ sides }) => Math.floor(Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * sides) + 1)
);

export const rollCanvasThreatDie = ({
  threatMode = 'none',
  storedThreatValue = null,
  storedThreatDie = null,
  customThreatSides = 6,
  random = Math.random,
} = {}) => {
  const canUseStoredThreat = threatMode === 'stored'
    && storedThreatValue !== null
    && storedThreatValue !== undefined
    && Number.isFinite(Number(storedThreatValue));
  const customSides = [4, 6, 8, 10, 12, 20].includes(Number(customThreatSides))
    ? Number(customThreatSides)
    : 6;
  if (canUseStoredThreat) {
    const storedSides = Number.parseInt(String(storedThreatDie || '').match(/\d+/)?.[0], 10);
    return {
      die: storedThreatDie || 'Amenaza',
      ...(Number.isFinite(storedSides) ? { sides: storedSides } : {}),
      value: Number(storedThreatValue),
      source: 'stored',
    };
  }
  if (threatMode === 'custom') {
    return {
      die: `d${customSides}`,
      sides: customSides,
      value: rollWeaponDice([{ sides: customSides }], random)[0],
      source: 'custom',
    };
  }
  return null;
};

// Arrojadiza uses the committed resource rather than the weapon's printed
// range. A multi-die attack may use its highest visible die for reach, while
// an enemy uses its Base ofensiva (Threat only adds Pressure).
export const evaluateCanvasThrownRange = ({ attacker, weapon, actionDice = [], distance = 0, suppressTraits = false } = {}) => {
  if (suppressTraits || !hasCanvasWeaponTrait(weapon, 'arrojadiza')) {
    return { thrown: false, legal: true, maxRange: null, distance };
  }
  const maxRange = attacker?.profileType === 'rogueliteEnemy'
    ? Math.max(0, asInteger(attacker.offenseBase ?? attacker.stats?.ofensiva?.current, 0))
    : Math.max(0, ...actionDice.map(die => Math.max(0, asInteger(die.value, 0))));
  return { thrown: true, legal: distance <= maxRange, maxRange, distance,
    reason: distance > maxRange ? `Arrojadiza: el objetivo está a ${distance} casillas y el lanzamiento alcanza ${maxRange}.` : '' };
};

const THREAT_DIE_SIDES = [4, 6, 8, 10, 12, 20];

export const normalizeCanvasThreatSelection = ({
  threatSelection,
  threatMode = 'none',
  customThreatSides = 6,
  useThreat = false,
} = {}) => {
  if (threatSelection && typeof threatSelection === 'object') {
    return {
      useStored: threatSelection.useStored === true,
      customDice: (Array.isArray(threatSelection.customDice) ? threatSelection.customDice : [])
        .map(Number).filter(sides => THREAT_DIE_SIDES.includes(sides)),
    };
  }
  const mode = threatMode === 'none' && useThreat ? 'stored' : threatMode;
  return {
    useStored: mode === 'stored',
    customDice: mode === 'custom'
      ? [THREAT_DIE_SIDES.includes(Number(customThreatSides)) ? Number(customThreatSides) : 6]
      : [],
  };
};

export const rollCanvasThreatDice = (options = {}) => {
  const selection = normalizeCanvasThreatSelection(options);
  const dice = [];
  if (selection.useStored) {
    const stored = rollCanvasThreatDie({ ...options, threatMode: 'stored' });
    if (stored) dice.push({ ...stored, id: 'threat-stored', sides: stored.sides ?? null });
  }
  selection.customDice.forEach((sides, index) => {
    const die = rollCanvasThreatDie({ ...options, threatMode: 'custom', customThreatSides: sides });
    dice.push({ ...die, id: `threat-custom-${index}` });
  });
  return dice;
};

// New arrays are authoritative, including an explicitly empty selection. Older
// pending attacks reused threatUsed for the defender after the defense roll.
export const getCanvasAttackThreatDice = (pending = {}) => {
  if (Array.isArray(pending?.attackThreatDice)) return pending.attackThreatDice;
  const legacy = pending?.attackThreatUsed || (pending?.status !== 'defense-rolled' && !pending?.defenseItem && !pending?.defenseDice?.length
    ? pending?.threatUsed : null);
  return legacy ? [{ ...legacy, id: legacy.id || `attack-threat-${pending?.id || 'legacy'}` }] : [];
};

export const getCanvasDefenseThreatDice = (pending = {}) => {
  if (Array.isArray(pending?.defenseThreatDice)) return pending.defenseThreatDice;
  const legacy = pending?.threatUsed && (pending.status === 'defense-rolled' || pending.defenseItem || pending.defenseDice?.length)
    ? pending.threatUsed : null;
  return legacy ? [{ ...legacy, id: legacy.id || `defense-threat-${pending?.id || 'legacy'}` }] : [];
};

export const rollCanvasEnemyDefense = ({
  equipment,
  equipments,
  threatSelection,
  threatMode = 'none',
  storedThreatValue = null,
  storedThreatDie = null,
  customThreatSides = 6,
  useThreat = false,
  random = Math.random,
} = {}) => {
  const items = Array.isArray(equipments) ? equipments : Array.isArray(equipment) ? equipment : [equipment].filter(Boolean);
  const profile = items.filter(item => !isCanvasShield(item)).flatMap((item, index) => (
    parseWeaponDiceProfile(item).map(die => ({ ...die, weaponId: getCanvasWeaponIdentity(item) || `defense-equipment-${index}`,
      weaponName: item.name || item.nombre || 'Equipo defensivo' }))
  ));
  const values = rollWeaponDice(profile, random);
  const defenseDice = profile.map((die, index) => ({
    id: `enemy-defense-${index}`,
    die: die.die,
    sides: die.sides,
    value: values[index],
    weaponId: die.weaponId,
    weaponName: die.weaponName,
  }));
  const defenseThreatDice = rollCanvasThreatDice({
    threatSelection,
    threatMode,
    storedThreatValue,
    storedThreatDie,
    customThreatSides,
    useThreat,
    random,
  });
  const threatUsed = defenseThreatDice.length === 1 ? defenseThreatDice[0] : null;
  const totalDefense = [...defenseDice, ...defenseThreatDice].reduce((sum, die) => sum + die.value, 0);
  return { defenseDice, defenseThreatDice, threatUsed, totalDefense,
    consumedStoredThreat: defenseThreatDice.some(die => die.source === 'stored') };
};

export const validateWeaponResults = (profile = [], values = []) => (
  profile.length > 0
  && profile.length === values.length
  && profile.every(({ sides }, index) => {
    const value = Number(values[index]);
    return Number.isInteger(value) && value >= 1 && value <= sides;
  })
);

export const getCriticalDieSides = (profile = [], values = [], weapon = {}, suppressTraits = false) => {
  if (suppressTraits || !hasCanvasWeaponTrait(weapon, 'critico')) return null;
  const criticalIndex = profile.findIndex(({ sides, noCritical }, index) => !noCritical && Number(values[index]) === sides);
  return criticalIndex >= 0 ? profile[criticalIndex].sides : null;
};

export const rollCriticalWeaponDice = (
  profile = [],
  values = [],
  weapon = {},
  suppressTraits = false,
  random = Math.random,
) => {
  if (suppressTraits || !hasCanvasWeaponTrait(weapon, 'critico')) return [];

  return profile.flatMap(({ sides }, index) => {
    if (profile[index].noCritical || Number(values[index]) !== sides) return [];
    const chain = [];
    let result = sides;
    while (result === sides) {
      result = rollWeaponDice([{ sides }], random)[0];
      chain.push({ sides, value: result, sourceIndex: index });
    }
    return chain;
  });
};

export const calculateCanvasAttackPressure = ({
  attacker,
  actionDice = [],
  weaponResults = [],
  criticalResult = 0,
  criticalResults = [],
  threatValue = 0,
  threatDice,
  distance = 0,
  weapon,
  suppressTraits = false,
}) => {
  const actionPressure = attacker?.profileType === 'rogueliteEnemy'
    ? Math.max(0, asInteger(attacker.offenseBase ?? attacker.stats?.ofensiva?.current, 0))
    : actionDice.reduce((sum, die) => sum + Math.max(0, asInteger(die.value, 0)), 0);
  const threatPressure = attacker?.profileType === 'rogueliteEnemy'
    ? (Array.isArray(threatDice)
      ? threatDice.reduce((sum, die) => sum + Math.max(0, asInteger(die.value, 0)), 0)
      : Math.max(0, asInteger(threatValue, 0)))
    : 0;
  const criticalPressure = criticalResults.length > 0
    ? criticalResults.reduce((sum, result) => sum + Math.max(0, asInteger(result?.value ?? result, 0)), 0)
    : Math.max(0, asInteger(criticalResult, 0));
  const weaponPressure = weaponResults.reduce((sum, value) => sum + Math.max(0, asInteger(value, 0)), 0)
    + criticalPressure;
  const thrownPenalty = !suppressTraits && hasCanvasWeaponTrait(weapon, 'arrojadiza')
    ? Math.max(0, asInteger(distance, 0))
    : 0;
  return {
    actionPressure,
    threatPressure,
    weaponPressure,
    thrownPenalty,
    total: Math.max(0, actionPressure + threatPressure + weaponPressure - thrownPenalty),
  };
};

export const resolveCanvasAttackDamage = ({
  attackPressure,
  defenseDice = [],
  target,
  weapon,
  suppressTraits = false,
  defenseCdBonus = 0,
}) => {
  const defense = weapon?.preventsActiveDefense ? 0
    : defenseDice.reduce((sum, die) => sum + Math.max(0, asInteger(die.value, 0)), 0);
  const finalPressure = Math.max(0, asInteger(attackPressure, 0) - defense);
  const surplus = Math.max(0, defense - asInteger(attackPressure, 0));
  const baseCd = Math.max(1, asInteger(target?.stats?.cd?.current ?? target?.stats?.cd?.max, 1));
  const shieldBonus = target?.profileType === 'rogueliteEnemy'
    ? Math.min(1, Math.max(0, asInteger(defenseCdBonus, 0))) : 0;
  const barrierBonus = getArcaneBarrierBonus(target);
  const protectedCd = baseCd + shieldBonus + barrierBonus;
  const effectiveCd = !suppressTraits && hasCanvasWeaponTrait(weapon, 'perforante')
    ? Math.max(1, protectedCd - 1)
    : protectedCd;
  const currentLife = Math.max(0, asInteger(target?.stats?.vida?.current, 0));
  const temporaryLife = getTemporaryLife(target);
  const damageBlocks = Math.floor(finalPressure / effectiveCd);
  const weaknessValues = [target?.weaknesses, target?.weakness, target?.debilidades, target?.debilidad]
    .flatMap(value => Array.isArray(value) ? value : value ? [value] : [])
    .map(value => normalizeText(typeof value === 'string' ? value : value?.id || value?.name || value?.label));
  const weaknessTags = [target?.tags, target?.traits, target?.rasgos].flatMap(value => Array.isArray(value) ? value : value ? [value] : [])
    .map(value => normalizeText(typeof value === 'string' ? value : value?.id || value?.name || value?.label));
  const weakToFire = weaknessValues.some(value => ['fuego', 'fire', 'debilidad: fuego'].includes(value))
    || weaknessTags.some(value => /(?:debilidad|weakness)\s*:\s*(?:fuego|fire)(?:\s|$)/.test(value));
  const fireWeaknessBonus = damageBlocks > 0 && weakToFire && hasCanvasWeaponTrait(weapon, 'fuego')
    ? Math.min(1, Math.max(0, currentLife + temporaryLife - damageBlocks)) : 0;
  const temporaryLifeLost = Math.min(temporaryLife, damageBlocks + fireWeaknessBonus);
  const normalLifeLost = Math.min(currentLife, damageBlocks + fireWeaknessBonus - temporaryLifeLost);
  const lifeLost = normalLifeLost + temporaryLifeLost;
  return {
    defense,
    finalPressure,
    surplus,
    baseCd,
    shieldBonus,
    ...(barrierBonus ? { barrierBonus } : {}),
    effectiveCd,
    lifeLost,
    ...(fireWeaknessBonus ? { fireWeaknessBonus } : {}),
    ...(temporaryLife > 0 ? { temporaryLifeLost, normalLifeLost, nextTemporaryLife: temporaryLife - temporaryLifeLost } : {}),
    nextLife: Math.max(0, currentLife - normalLifeLost),
  };
};

/** Surplus counterattacks require equipped reach, but no action dice or weapon roll. */
export const getCanvasCounterattackWeapons = ({ defender, attacker, items = [], gridConfig = {} }) => {
  if (!defender || !attacker) return [];
  return getCanvasEquippedWeapons(defender).filter((weapon) => evaluateCanvasAttackRange({
    attacker: defender, target: attacker, weapon, items, gridConfig, deferThrownRange: false,
  }).legal);
};

export const getPreferredCanvasCounterattackWeapon = ({ pending, participant, weapons = [] } = {}) => {
  const defenseItems = [
    ...(Array.isArray(pending?.defenseItems) ? pending.defenseItems : []),
    pending?.defenseItem,
  ].filter(Boolean);
  const preferredIds = [
    ...defenseItems.map(item => getCanvasWeaponIdentity(item.weapon || item)),
    ...(Array.isArray(participant?.lastAttackWeaponIds) ? participant.lastAttackWeaponIds.map(String) : []),
  ];
  for (const id of preferredIds) {
    const weapon = weapons.find(item => getCanvasWeaponIdentity(item) === id);
    if (weapon) return weapon;
  }
  return weapons[0] || null;
};
