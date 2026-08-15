import { parseActionDiceCost } from '../../roguelite/catalogItem';
import {
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
  const source = weapon.dano ?? weapon.damage ?? weapon.poder ?? weapon.power ?? '';
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

export const getCanvasEquippedWeapons = (token = {}) => (
  (Array.isArray(token.equippedItems) ? token.equippedItems : []).filter((item) => {
    const type = normalizeText(item?.type ?? item?._category ?? item?.category);
    return type === 'weapon' || type === 'arma' || type === 'weapons';
  })
);

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
  (participant.actionDice || []).filter((die) => die.status !== 'spent')
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

export const calculateCanvasAttackPressure = ({
  attacker,
  actionDice = [],
  weaponResults = [],
  criticalResult = 0,
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
  const weaponPressure = weaponResults.reduce((sum, value) => sum + Math.max(0, asInteger(value, 0)), 0)
    + Math.max(0, asInteger(criticalResult, 0));
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
