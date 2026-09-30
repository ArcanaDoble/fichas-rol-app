export const hasCanvasAttackAdjustment = token => Boolean(token?.canAdjustAttack
  || String(token?.classIdentity || '').toLowerCase().includes('guerrero')
  || [...(token?.equippedTalents || []), ...(token?.equippedSkills || [])].some(item => /\bajuste\b/i.test(item.name || item.title || item.nombre || '')));

export const adjustCanvasPendingAttack = (combat, { replaceDieId, withDieId } = {}) => {
  const pending = combat?.pendingAttack;
  if (pending?.status !== 'awaiting-adjustment') return combat;
  if (!replaceDieId && !withDieId) return { ...combat, pendingAttack: { ...pending, status: 'awaiting-defense' } };
  const participant = combat.participants?.[pending.attackerId];
  const previous = pending.actionDice?.find(die => die.id === replaceDieId);
  const replacement = participant?.actionDice?.find(die => die.id === withDieId && die.status === 'available');
  if (!previous || !replacement || pending.actionDieIds.includes(withDieId)) return combat;
  const difference = replacement.value - previous.value;
  return {
    ...combat,
    participants: { ...combat.participants, [pending.attackerId]: { ...participant,
      actionDice: participant.actionDice.map(die => die.id === previous.id ? { ...die, value: previous.value, status: 'available' }
        : die.id === replacement.id ? { ...die, status: 'spent' } : die),
    } },
    pendingAttack: { ...pending, status: 'awaiting-defense',
      actionDieIds: pending.actionDieIds.map(id => id === previous.id ? replacement.id : id),
      actionDice: pending.actionDice.map(die => die.id === previous.id ? replacement : die),
      pressure: { ...pending.pressure, actionPressure: pending.pressure.actionPressure + difference, total: Math.max(0, pending.pressure.total + difference) },
      adjustment: { previous, replacement },
    },
  };
};
