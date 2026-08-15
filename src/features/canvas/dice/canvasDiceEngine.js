export const SUPPORTED_DICE_FACES = [4, 6, 8, 10, 12, 20];

export const normalizeDieFaces = (faces) => {
  const numeric = Number(faces);
  if (SUPPORTED_DICE_FACES.includes(numeric)) return numeric;
  return 20;
};

export const rollSingleDie = (faces, random = Math.random) => {
  const sides = normalizeDieFaces(faces);
  return Math.floor(random() * sides) + 1;
};

export const formatDiceFormula = (pool = {}, explosiveMap = {}) => {
  const parts = [];
  SUPPORTED_DICE_FACES.forEach((faces) => {
    const count = Number(pool[faces] || pool[`d${faces}`] || 0);
    const isExplosive = Boolean(explosiveMap[faces] || explosiveMap[`d${faces}`]);
    if (count > 0) {
      parts.push(`${count}d${faces}${isExplosive ? ' (crítico)' : ''}`);
    }
  });
  return parts.length > 0 ? parts.join(' + ') : '';
};

export const countTotalDiceInPool = (pool = {}) => (
  SUPPORTED_DICE_FACES.reduce((total, faces) => (
    total + Number(pool[faces] || pool[`d${faces}`] || 0)
  ), 0)
);

export const calculateEffectiveTotal = (roll = {}) => {
  const dice = Array.isArray(roll.dice) ? roll.dice : [];
  const excludedSet = new Set(Array.isArray(roll.excludedRollIndexes) ? roll.excludedRollIndexes : []);
  const diceSum = dice.reduce((sum, die, index) => (
    excludedSet.has(index) ? sum : sum + (Number(die.value) || 0)
  ), 0);
  return diceSum + (Number(roll.modifier) || 0);
};

export const toggleRollDieExcluded = (roll, index) => {
  if (!roll || !Array.isArray(roll.dice) || index < 0 || index >= roll.dice.length) {
    return roll;
  }
  const currentIndexes = Array.isArray(roll.excludedRollIndexes) ? roll.excludedRollIndexes : [];
  const nextIndexes = currentIndexes.includes(index)
    ? currentIndexes.filter((i) => i !== index)
    : [...currentIndexes, index];

  const updatedRoll = {
    ...roll,
    excludedRollIndexes: nextIndexes,
  };
  return {
    ...updatedRoll,
    effectiveTotal: calculateEffectiveTotal(updatedRoll),
  };
};

export const rollDicePool = (pool = {}, options = {}) => {
  const random = options.random || Math.random;
  const rolledBy = options.rolledBy || 'Jugador';
  const label = options.label || null;
  const modifier = Number(options.modifier || 0);
  const fixedBonuses = Array.isArray(options.fixedBonuses) ? options.fixedBonuses : [];
  const explosiveMap = options.explosive || options.critical || {};
  const now = options.now || Date.now();

  const diceResults = [];

  SUPPORTED_DICE_FACES.forEach((faces) => {
    const count = Number(pool[faces] || pool[`d${faces}`] || 0);
    const isExplosive = Boolean(explosiveMap[faces] || explosiveMap[`d${faces}`]);

    for (let index = 0; index < count; index += 1) {
      let value = rollSingleDie(faces, random);
      const rootDieId = `die-${faces}-${index}-${now}-${Math.random().toString(36).slice(2, 6)}`;
      diceResults.push({
        id: rootDieId,
        faces,
        value,
        explosive: isExplosive,
        exploded: false,
      });

      // Si es explosivo / crítico y sacó el valor máximo, explota (relanza dado extra)
      if (isExplosive && value === faces) {
        let explosions = 0;
        let explodedValue = value;
        while (explodedValue === faces && explosions < 10) {
          explosions += 1;
          explodedValue = rollSingleDie(faces, random);
          diceResults.push({
            id: `${rootDieId}-exp-${explosions}`,
            faces,
            value: explodedValue,
            explosive: true,
            exploded: true,
            parentDieId: rootDieId,
          });
        }
      }
    }
  });

  const fixedSum = fixedBonuses.reduce((sum, b) => sum + (Number(b.value) || 0), 0);
  const totalItemsCount = diceResults.length + (fixedSum !== 0 || modifier !== 0 ? 1 : 0);

  if (totalItemsCount === 0 && diceResults.length === 0) {
    throw new Error('Selecciona al menos un dado o modificador para realizar la tirada.');
  }

  const diceTotal = diceResults.reduce((sum, die) => sum + die.value, 0);
  const total = diceTotal + fixedSum + modifier;

  const formulaParts = [];
  const diceFormula = formatDiceFormula(pool, explosiveMap);
  if (diceFormula) formulaParts.push(diceFormula);
  fixedBonuses.forEach((b) => {
    formulaParts.push(`+ ${b.value}${b.label ? ` (${b.label})` : ''}`);
  });
  if (modifier !== 0) {
    formulaParts.push(modifier > 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`);
  }
  const formula = formulaParts.join(' ');

  const rollResult = {
    id: `roll-${now}-${Math.random().toString(36).slice(2, 8)}`,
    rolledBy,
    label,
    formula,
    pool: { ...pool },
    explosiveMap: { ...explosiveMap },
    dice: diceResults,
    fixedBonuses,
    excludedRollIndexes: [],
    modifier: fixedSum + modifier,
    diceTotal,
    total,
    effectiveTotal: total,
    timestamp: now,
  };

  return rollResult;
};
