const normalize = value => String(typeof value === 'object' ? value?.id || value?.name || value?.label : value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const list = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value ? [value] : [];
export const isBleedingStatus = value => normalize(value) === 'sangrado';
export const isCanvasBleeding = token => [...list(token?.status), ...list(token?.statusEffects)].some(isBleedingStatus);
export const bleedingActivationKey = combat => `${combat?.startedAt}:${combat?.round}:${combat?.activeBlockIndex}`;
export const isBleedingActivation = (combat, id) => combat?.status === 'active' && combat.roundPhase === 'turns'
    && combat.blocks?.[combat.activeBlockIndex]?.memberIds.includes(id)
    && !combat.blocks[combat.activeBlockIndex].actedIds.includes(id);
export const setCanvasBleeding = (token, active, combat = null) => ({ ...token,
    status: [...list(token?.status).filter(value => !isBleedingStatus(value)), ...(active ? ['sangrado'] : [])],
    ...(token?.statusEffects !== undefined ? { statusEffects: list(token.statusEffects).filter(value => !isBleedingStatus(value)) } : {}),
    // An application during the creature's own activation first takes effect next activation.
    bleedingDeferredActivation: active && isBleedingActivation(combat, token.id) ? bleedingActivationKey(combat) : null,
});
export const needsBleedingChoice = (token, combat) => token?.rulesSystem !== 'campaign'
    && combat?.rulesSystem !== 'campaign' && isCanvasBleeding(token) && Number(token?.stats?.vida?.current) > 0
    && isBleedingActivation(combat, token.id)
    && token.bleedingDeferredActivation !== bleedingActivationKey(combat)
    && combat.participants?.[token.id]?.bleedingChoice?.activation !== bleedingActivationKey(combat);
export const applyAttackBleeding = (token, weapon, resolution, suppressTraits = false, combat = null) => {
    if (suppressTraits || !(resolution?.lifeLost > 0) || isCanvasBleeding(token)) return token;
    return list(weapon?.rasgos ?? weapon?.traits ?? weapon?.properties).some(isBleedingStatus)
        ? setCanvasBleeding(token, true, combat) : token;
};

export const resolveBleedingChoice = (token, combat, choice, now = Date.now()) => {
    if (!['life', 'movement'].includes(choice) || !needsBleedingChoice(token, combat)) return null;
    const participant = combat.participants[token.id];
    const activation = bleedingActivationKey(combat);
    const temporary = Math.max(0, Number(token.stats?.vidaTemporal?.current) || 0);
    const life = Math.max(0, Number(token.stats?.vida?.current) || 0);
    const loseTemporary = choice === 'life' && temporary > 0;
    const nextToken = choice === 'life' ? { ...token, stats: { ...token.stats,
        ...(loseTemporary ? { vidaTemporal: { ...token.stats.vidaTemporal, current: temporary - 1 } }
            : { vida: { ...token.stats.vida, current: Math.max(0, life - 1) } }),
    } } : token;
    return { token: nextToken, combat: { ...combat, updatedAt: now, participants: { ...combat.participants,
        [token.id]: { ...participant, bleedingChoice: { activation, choice },
            ...(choice === 'movement' ? { movementRuntime: { ...participant.movementRuntime, bleedingForfeit: true } } : {}),
        },
    } }, lifeLost: choice === 'life' && !loseTemporary ? 1 : 0, temporaryLifeLost: loseTemporary ? 1 : 0 };
};
