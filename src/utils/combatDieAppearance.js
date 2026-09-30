// Shared source colors for the combat roll and its history. Labels remain
// visible so color is never the only way to identify a die.
export const getCombatDieAppearance = (source, critical = false) => {
  const key = String(source || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (critical || key === 'critico') return { accent: 'amber', color: '#e6a054' };
  if (key === 'furia') return { accent: 'red', color: '#d66a5f' };
  if (key === 'mana') return { accent: 'arcane', color: '#a798d6' };
  if (key === 'astucia') return { accent: 'teal', color: '#7bc7bb' };
  if (key === 'modificador') return { accent: 'blue', color: '#67a9d8' };
  if (key === 'amenaza') return { accent: 'red', color: '#d66a5f' };
  return { accent: 'gold', color: '#d7b867' };
};
