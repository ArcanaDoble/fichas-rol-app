import { isCanvasProne } from './canvasAttackRules';

export const standUpCanvasToken = (combat, token, dieId = null) => {
  if (!isCanvasProne(token)) return null;
  const standing = { ...token, status: token.status.filter(status =>
    !isCanvasProne({ status: [status] })) };
  if (!combat || combat.status === 'finished') return { combat, token: standing };
  const participant = combat.participants?.[token.id];
  const block = combat.blocks?.[combat.activeBlockIndex];
  if (combat.roundPhase !== 'turns' || !block?.memberIds.includes(token.id) || block.actedIds?.includes(token.id)) return null;
  const runtime = participant?.movementRuntime;
  if (!runtime) return null;
  let next = participant;
  if (dieId) {
    const die = participant.actionDice?.find(candidate => candidate.id === dieId && candidate.status === 'available');
    if (!die) return null;
    next = { ...participant, actionDice: participant.actionDice.map(candidate => candidate.id === dieId ? { ...candidate, status: 'spent' } : candidate) };
  } else {
    const base = Math.max(0, Number(runtime.base) + Number(runtime.modifier || 0));
    if (base <= 0 || Number(runtime.spent) > 0) return null;
    next = { ...participant, movementRuntime: { ...runtime, spent: base }, enemyActions: (participant.enemyActions || []).map(action => action.id === 'movement' ? { ...action, status: 'spent' } : action) };
  }
  return { token: standing, combat: { ...combat, participants: { ...combat.participants, [token.id]: next } } };
};
