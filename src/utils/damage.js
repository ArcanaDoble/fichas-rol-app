export const parseDieValue = (diceStr) => {
  if (!diceStr) return 0;
  const match = String(diceStr).match(/d(\d+)/i);
  if (match) return parseInt(match[1], 10) || 0;
  const n = parseInt(diceStr, 10);
  return isNaN(n) ? 0 : n;
};

export const applyDamage = (sheet, damage, stat) => {
  if (!sheet || !sheet.stats || !sheet.stats[stat]) {
    return { sheet, blocks: 0, remaining: damage };
  }
  const attrMap = {
    postura: 'destreza',
    vida: 'vigor',
    armadura: 'vigor',
  };
  const attrName = attrMap[stat];
  const dieStr = sheet.atributos?.[attrName];
  const dieValue = parseDieValue(dieStr) || 1;
  const available = sheet.stats[stat].actual || 0;
  const blocks = Math.min(Math.floor(damage / dieValue), available);
  const usedDamage = blocks * dieValue;
  const updated = {
    ...sheet,
    stats: { ...sheet.stats, [stat]: { ...sheet.stats[stat] } },
  };
  updated.stats[stat].actual = available - blocks;
  return { sheet: updated, blocks, remaining: Math.max(0, damage - usedDamage) };
};
