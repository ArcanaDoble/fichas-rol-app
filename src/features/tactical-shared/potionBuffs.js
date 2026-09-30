export const getTemporaryLife = token => Math.max(0, Number(token?.stats?.vidaTemporal?.current) || 0);

export const describeLifeLoss = resolution => {
    const temporary = Number(resolution?.temporaryLifeLost) || 0;
    const normal = Number(resolution?.normalLifeLost ?? resolution?.lifeLost) || 0;
    const blocks = count => `${count} ${count === 1 ? 'bloque' : 'bloques'}`;
    return [temporary > 0 ? `${blocks(temporary)} de Vida temporal` : null,
        normal > 0 ? `${blocks(normal)} de Vida` : null].filter(Boolean).join(' y ') || '0 bloques de Vida';
};

export const getBuffPotionBlockReason = token => Number(token?.stats?.vida?.current) > 0
    ? null : 'Necesitas estar en pie para beber la poción.';

export const applyVitalityPotion = token => ({ ...token, stats: { ...token.stats,
    vidaTemporal: { current: 2, max: 2, source: 'vitality-potion' },
} });

export const applyHastePotion = (token, combat) => {
    const participant = combat.participants[token.id];
    const runtime = participant.movementRuntime;
    const previousBonus = Number(participant.hasteBonus) || 0;
    const bonus = 1;
    const movementRuntime = { ...runtime, base: runtime.base + bonus - previousBonus,
        sprintBonus: (Number(runtime.sprintBonus) || 0) + 4 };
    const nextParticipant = { ...participant, hasteBonus: bonus, hasteTurnBonus: (Number(participant.hasteTurnBonus) || 0) + 4, movementRuntime,
        enemyActions: (participant.enemyActions || []).map(action => action.id === 'movement' ? { ...action, status: 'available' } : action) };
    const allowance = movementRuntime.base + (Number(movementRuntime.modifier) || 0) + movementRuntime.sprintBonus;
    return {
        combat: { ...combat, participants: { ...combat.participants, [token.id]: nextParticipant } },
        token: { ...token, stats: { ...token.stats, movimiento: { ...token.stats?.movimiento,
            potionBase: runtime.base - previousBonus, potionBonus: bonus,
            current: Math.max(0, allowance - (Number(runtime.spent) || 0)),
            max: Math.max(Number(runtime.statMax) || 0, allowance),
        } } },
    };
};

export const clearPotionBuffs = token => {
    if (!token.stats?.vidaTemporal && !token.stats?.movimiento?.potionBonus) return token;
    const stats = { ...token.stats };
    delete stats.vidaTemporal;
    if (stats.movimiento?.potionBonus) {
        const { potionBase, potionBonus, ...movement } = stats.movimiento;
        stats.movimiento = { ...movement, current: potionBase, max: potionBase };
    }
    return { ...token, stats };
};
