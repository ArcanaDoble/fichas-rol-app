import { calculateCanvasAttackPressure, getCanvasWeaponTraits, rollCriticalWeaponDice, rollWeaponDice } from './canvasAttackRules';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export const isCanvasCunningPending = pending => ['awaiting-cunning', 'awaiting-cunning-choice'].includes(pending?.status);

export const getCanvasCunningOption = (token, attack = {}) => {
  const visible = token?.profileType === 'rogueliteClass'
    && (normalize(token.classIdentity) === 'picaro' || normalize(token.stats?.recurso?.label) === 'astucia');
  const available = Math.max(0, Math.floor(Number(token?.stats?.recurso?.current) || 0));
  const dice = (attack.weaponDiceProfile || []).flatMap((die, index) => {
    // Only the original profile of an eligible hand. Never action, bonus,
    // Sneak Attack, modifier or critical dice, even if they share a weapon id.
    const part = (attack.attackParts || []).find(candidate => candidate.weaponId === die.weaponId);
    if (!part || (die.source && normalize(die.source) !== 'arma')) return [];
    if (!part.profile?.some(base => `${part.weaponId}:${base.id}` === die.id)) return [];
    const traits = getCanvasWeaponTraits({ rasgos: part.traits || [] });
    const touch = normalize(part.weapon.alcance || part.weapon.range) === 'toque';
    if (!touch && !traits.includes('duelista') && !traits.includes('arrojadiza')) return [];
    return [{ ...die, index, value: attack.weaponResults?.[index], weaponName: part.weapon.name || part.weapon.nombre || 'Arma' }];
  });
  return { visible, available, dice, eligible: visible && dice.length > 0 && !attack.cunningSpent };
};

export const rollCanvasCunningDie = (pending, dieIndex, random = Math.random) => {
  const profile = pending.weaponDiceProfile[dieIndex];
  const value = rollWeaponDice([profile], random)[0];
  const criticalResults = rollCriticalWeaponDice([profile], [value], pending.weapon, pending.range?.suppressTraits, random)
    .map(die => ({ ...die, sourceIndex: dieIndex }));
  return { dieIndex, originalValue: pending.weaponResults[dieIndex], value, criticalResults,
    originalCriticalResults: (pending.criticalResults || []).filter(die => die.sourceIndex === dieIndex) };
};

export const finishCanvasCunning = (pending, attacker, choice) => {
  const status = pending.needsAdjustment ? 'awaiting-adjustment' : 'awaiting-defense';
  if (pending.status === 'awaiting-cunning' && choice === 'skip') return { ...pending, status, cunningDeclined: true };
  if (pending.status !== 'awaiting-cunning-choice' || !['original', 'rerolled'].includes(choice) || !pending.cunning) return null;
  const cunning = { ...pending.cunning, choice };
  const weaponResults = pending.weaponResults.map((value, index) => choice === 'rerolled' && index === cunning.dieIndex ? cunning.value : value);
  const criticalResults = choice === 'rerolled'
    ? [...(pending.criticalResults || []).filter(die => die.sourceIndex !== cunning.dieIndex), ...cunning.criticalResults]
    : pending.criticalResults || [];
  const pressure = calculateCanvasAttackPressure({ attacker, actionDice: pending.actionDice, weaponResults, criticalResults,
    threatDice: pending.attackThreatDice, distance: pending.range?.distance, weapon: pending.weapon, suppressTraits: pending.range?.suppressTraits });
  return { ...pending, status, cunning, weaponResults, criticalResults, pressure };
};
