const itemName = item => item?.name || item?.nombre || 'Bomba explosiva';

export const createExplosiveBlastPendingAttack = (blast, targetId, index = 0) => blast.attackTemplate ? ({
  ...(blast.targetAttackTemplates?.[targetId] || blast.attackTemplate),
  id: `${blast.id}-target-${encodeURIComponent(targetId)}`,
  targetId, targetName: blast.targetNames?.[targetId] || 'Objetivo',
  actionDieIds: [], status: 'awaiting-defense',
  blastId: blast.id, blastIndex: index, blastCount: blast.targetIds.length,
}) : ({
  id: `${blast.id}-target-${encodeURIComponent(targetId)}`,
  attackerId: blast.sourceTokenId,
  targetId,
  attackerName: blast.sourceName,
  targetName: blast.targetNames?.[targetId] || 'Objetivo',
  weapon: blast.item,
  weaponName: itemName(blast.item),
  weaponDiceProfile: [
    { id: `${blast.id}-d8-1`, die: 'd8', sides: 8, source: 'Explosión' },
    { id: `${blast.id}-d8-2`, die: 'd8', sides: 8, source: 'Explosión' },
  ],
  weaponResults: [...blast.rolls],
  actionDice: blast.resource.kind === 'action-die' ? [blast.resource] : [],
  actionDieIds: [],
  attackThreatDice: blast.resource.kind === 'threat-die'
    ? [{ ...blast.resource, source: 'stored' }] : [],
  pressure: {
    actionPressure: blast.resource.kind === 'action-die' ? blast.resource.value : 0,
    threatPressure: blast.resource.kind === 'threat-die' ? blast.resource.value : 0,
    weaponPressure: blast.rolls[0] + blast.rolls[1],
    thrownPenalty: blast.distance,
    total: blast.pressure,
  },
  range: { distance: blast.distance, suppressTraits: false },
  blastId: blast.id,
  blastIndex: index,
  blastCount: blast.targetIds.length,
  source: 'digital',
  status: 'awaiting-defense',
  createdAt: blast.createdAt,
});

export const startCanvasExplosiveBlast = (combat, blast) => ({
  ...combat,
  explosiveBlast: blast.targetIds.length ? { ...blast, nextTargetIndex: 1 } : null,
  pendingAttack: blast.targetIds.length
    ? createExplosiveBlastPendingAttack(blast, blast.targetIds[0], 0) : null,
  updatedAt: blast.createdAt,
});

const continueQueuedFire = combat => {
  if (combat.pendingAttack || combat.explosiveBlast || !combat.queuedFireBursts?.length) return combat;
  const [next, ...remaining] = combat.queuedFireBursts;
  return startCanvasExplosiveBlast({ ...combat, queuedFireBursts: remaining }, next);
};

export const continueCanvasExplosiveBlast = (combat, resolvedPending, items = []) => {
  const stored = combat?.explosiveBlast;
  const blast = stored?.attackTemplate && resolvedPending?.blastIndex === 0 ? { ...stored,
    attackTemplate: { ...stored.attackTemplate, pressure: resolvedPending.pressure,
      actionDice: resolvedPending.actionDice, adjustment: resolvedPending.adjustment || null } } : stored;
  if (!blast) return continueQueuedFire(combat);
  if (blast.id !== resolvedPending?.blastId || combat.pendingAttack) return combat;
  const presentIds = new Set(items.map(item => item.id));
  let nextIndex = blast.nextTargetIndex;
  while (nextIndex < blast.targetIds.length && !presentIds.has(blast.targetIds[nextIndex])) nextIndex += 1;
  if (nextIndex >= blast.targetIds.length) return continueQueuedFire({ ...combat, explosiveBlast: null,
    ...(combat.arcaneChain?.id === blast.id ? { arcaneChain: { ...combat.arcaneChain, phase: 'choose-target' } } : {}) });
  return {
    ...combat,
    explosiveBlast: { ...blast, nextTargetIndex: nextIndex + 1 },
    pendingAttack: createExplosiveBlastPendingAttack(blast, blast.targetIds[nextIndex], nextIndex),
  };
};
