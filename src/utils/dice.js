export const parseAndRollFormula = (formula) => {
  const cleanFormula = formula.replace(/\s/g, '').toLowerCase();
  const diceRegex = /(\d*)d(\d+)/g;
  const modifierRegex = /[+-]\d+/g;

  let total = 0;
  let details = [];

  let match;
  while ((match = diceRegex.exec(cleanFormula)) !== null) {
    const count = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]);
    const rolls = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }
    details.push({
      type: 'dice',
      formula: `${count}d${sides}`,
      rolls,
      subtotal: rolls.reduce((sum, r) => sum + r, 0),
    });
  }

  const modifiers = cleanFormula.match(modifierRegex) || [];
  modifiers.forEach((mod) => {
    const value = parseInt(mod);
    total += value;
    details.push({ type: 'modifier', value, formula: mod });
  });

  return { total, details };
};

export const parseAndRollFormulaCritical = (formula) => {
  const cleanFormula = formula.replace(/\s/g, '').toLowerCase();
  const diceRegex = /(\d*)d(\d+)/g;
  const modifierRegex = /[+-]\d+/g;

  let total = 0;
  let details = [];

  let match;
  while ((match = diceRegex.exec(cleanFormula)) !== null) {
    const count = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]);
    const rolls = [];
    for (let i = 0; i < count; i++) {
      let roll = Math.floor(Math.random() * sides) + 1;
      rolls.push({ value: roll, critical: false });
      total += roll;
      while (roll === sides) {
        roll = Math.floor(Math.random() * sides) + 1;
        rolls.push({ value: roll, critical: true });
        total += roll;
      }
    }
    details.push({
      type: 'dice',
      formula: `${count}d${sides}`,
      rolls,
      subtotal: rolls.reduce((sum, r) => sum + r.value, 0),
    });
  }

  const modifiers = cleanFormula.match(modifierRegex) || [];
  modifiers.forEach((mod) => {
    const value = parseInt(mod);
    total += value;
    details.push({ type: 'modifier', value, formula: mod });
  });

  return { total, details };
};

export const rollExpression = (expr) => {
  const formula = expr.trim();
  if (!formula) throw new Error('Empty expression');

  if (!/\d+d\d+/i.test(formula)) {
    const safe = formula.replace(/[^0-9+\-*/().,% ]/g, '');
    const safeEval = safe.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    // eslint-disable-next-line no-eval
    const total = eval(safeEval);
    if (typeof total !== 'number' || isNaN(total)) throw new Error('Invalid');
    return { formula: expr, total, details: [{ type: 'calc', formula: safe, value: total }] };
  }
  const parsed = parseAndRollFormula(formula);
  return { formula: expr, total: parsed.total, details: parsed.details };
};

export const rollExpressionCritical = (expr) => {
  const formula = expr.trim();
  if (!formula) throw new Error('Empty expression');

  if (!/\d+d\d+/i.test(formula)) {
    const safe = formula.replace(/[^0-9+\-*/().,% ]/g, '');
    const safeEval = safe.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    // eslint-disable-next-line no-eval
    const total = eval(safeEval);
    if (typeof total !== 'number' || isNaN(total)) throw new Error('Invalid');
    return {
      formula: expr,
      total,
      details: [{ type: 'calc', formula: safe, value: total }],
    };
  }
  const parsed = parseAndRollFormulaCritical(formula);
  return { formula: expr, total: parsed.total, details: parsed.details };
};
