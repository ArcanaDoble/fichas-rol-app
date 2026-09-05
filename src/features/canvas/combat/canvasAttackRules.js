import { parseActionDiceCost } from '../../roguelite/catalogItem';
import {
  areTokensAllied,
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

export const getCanvasWeaponTraits = (weapon = {}) => {
  const source = weapon.rasgos ?? weapon.traits ?? weapon.properties ?? [];
  if (Array.isArray(source)) return source.map(normalizeText).filter(Boolean);
  return String(source || '').split(',').map(normalizeText).filter(Boolean);
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
  const explicit = parseActionDiceCost(
    weapon.actionCost ?? weapon.consumo ?? weapon.cost ?? weapon.coste,
    1,
  );
  return Math.max(hasCanvasWeaponTrait(weapon, 'pesada') ? 2 : 1, explicit);
};

const getTokenEquippedItems = (token = {}) => {
  if (Array.isArray(token.equippedItems)) return token.equippedItems;
  const loadout = token.equipmentLoadout || token.equippedItems || {};
  const activeSetIndex = Number(loadout.activeWeaponSet) === 1 ? 1 : 0;
  const activeSet = Array.isArray(loadout.weaponSets)
    ? (loadout.weaponSets[activeSetIndex] || loadout.weaponSets[0] || {})
    : loadout;
  return [activeSet.mainHand, activeSet.offHand, loadout.body, loadout.accessory_1, loadout.accessory_2]
    .filter(Boolean);
};

export const getCanvasEquippedWeapons = (token = {}) => (
  getTokenEquippedItems(token).filter((item) => {
    const type = normalizeText(item?.type ?? item?._category ?? item?.category);
    return type === 'weapon' || type === 'arma' || type === 'weapons';
  })
);

export const getCanvasDefensiveEquipment = (token = {}) => (
  getTokenEquippedItems(token).filter((item) => {
    if (parseWeaponDiceProfile(item).length === 0) return false;
    const type = normalizeText(item?.type ?? item?._category ?? item?.category);
    const traits = getCanvasWeaponTraits(item);
    return ['weapon', 'arma', 'weapons'].includes(type)
      || item?.defenseDiceProfile
      || item?.perfilDefensa
      || traits.some((trait) => ['defensiva', 'defensivo', 'guardia', 'bloqueo', 'parada'].includes(trait));
  })
);

export const getEnemyActiveDefenseEligibility = ({ token, participant } = {}) => {
  if (!token || token.profileType !== 'rogueliteEnemy' || participant?.side !== 'enemies') {
    return { eligible: false, equipment: [], reason: 'El objetivo no es un enemigo.' };
  }
  const attackAction = (participant.enemyActions || []).find((action) => action.id === 'attack');
  if (!attackAction || attackAction.status === 'spent') {
    return { eligible: false, equipment: [], reason: 'La acción principal del enemigo ya está gastada.' };
  }
  if (token.preventActiveDefense || token.cannotDefend || participant.preventActiveDefense) {
    return { eligible: false, equipment: [], reason: 'Una regla impide que este enemigo se defienda.' };
  }
  const equipment = getCanvasDefensiveEquipment(token);
  if (equipment.length === 0) {
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

const isOneHanded = (weapon = {}) => {
  const hands = asInteger(
    weapon.handsRequired ?? weapon.requiredHands ?? weapon.manosRequeridas ?? weapon.manos,
    1,
  );
  return hands <= 1 && !hasCanvasWeaponTrait(weapon, 'dos manos');
};

export const evaluateCanvasAttackRange = ({
  attacker,
  target,
  weapon,
  items = [],
  gridConfig = {},
}) => {
  if (!attacker || !target || !weapon) {
    return { legal: false, reason: 'Faltan atacante, objetivo o arma.' };
  }

  if (attacker.id === target.id || areTokensAllied(attacker, target)) {
    return { legal: false, reason: 'El objetivo debe ser una criatura enemiga.' };
  }

  const distance = getTokenDistanceInCells(attacker, target, gridConfig);
  const rangeName = getRangeName(weapon);
  const rangeValue = getRangeValue(weapon);
  const attackerContext = getTokenCombatCellContext(attacker, items, gridConfig);
  const attackerInDuel = attackerContext.mode === 'duel';
  const duelist = hasCanvasWeaponTrait(weapon, 'duelista');

  if (attackerInDuel && rangeValue >= RANGE_VALUES.intermedio) {
    return {
      legal: false,
      distance,
      rangeName,
      reason: 'No puedes usar armas de alcance Intermedio o superior mientras estás en Duelo.',
    };
  }

  if (rangeValue === RANGE_VALUES.toque && distance === 1) {
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

  if (distance > rangeValue) {
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

export const rollCanvasEnemyDefense = ({
  equipment,
  threatMode = 'none',
  storedThreatValue = null,
  storedThreatDie = null,
  customThreatSides = 6,
  random = Math.random,
} = {}) => {
  const profile = parseWeaponDiceProfile(equipment);
  const values = rollWeaponDice(profile, random);
  const defenseDice = profile.map((die, index) => ({
    id: `enemy-defense-${index}`,
    die: die.die,
    sides: die.sides,
    value: values[index],
  }));
  const threatUsed = rollCanvasThreatDie({
    threatMode,
    storedThreatValue,
    storedThreatDie,
    customThreatSides,
    random,
  });
  const totalDefense = defenseDice.reduce((sum, die) => sum + die.value, 0) + (threatUsed?.value || 0);
  return { defenseDice, threatUsed, totalDefense, consumedStoredThreat: threatUsed?.source === 'stored' };
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
  const criticalIndex = profile.findIndex(({ sides }, index) => Number(values[index]) === sides);
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
    if (Number(values[index]) !== sides) return [];
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
  distance = 0,
  weapon,
  suppressTraits = false,
}) => {
  const actionPressure = attacker?.profileType === 'rogueliteEnemy'
    ? Math.max(0, asInteger(attacker.offenseBase ?? attacker.stats?.ofensiva?.current, 0))
    : actionDice.reduce((sum, die) => sum + Math.max(0, asInteger(die.value, 0)), 0);
  const threatPressure = attacker?.profileType === 'rogueliteEnemy'
    ? Math.max(0, asInteger(threatValue, 0))
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
}) => {
  const defense = defenseDice.reduce((sum, die) => sum + Math.max(0, asInteger(die.value, 0)), 0);
  const finalPressure = Math.max(0, asInteger(attackPressure, 0) - defense);
  const surplus = Math.max(0, defense - asInteger(attackPressure, 0));
  const baseCd = Math.max(1, asInteger(target?.stats?.cd?.current ?? target?.stats?.cd?.max, 1));
  const effectiveCd = !suppressTraits && hasCanvasWeaponTrait(weapon, 'perforante')
    ? Math.max(1, baseCd - 1)
    : baseCd;
  const currentLife = Math.max(0, asInteger(target?.stats?.vida?.current, 0));
  const lifeLost = Math.min(currentLife, Math.floor(finalPressure / effectiveCd));
  return {
    defense,
    finalPressure,
    surplus,
    baseCd,
    effectiveCd,
    lifeLost,
    nextLife: Math.max(0, currentLife - lifeLost),
  };
};
