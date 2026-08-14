/** Canvas-only initiative projection. BoardCards keeps its own initiative adapter. */
export const buildCanvasTimelineTokens = (items = [], options = {}) => {
    const combatState = options.combatState;
    if (!combatState || combatState.status === 'finished' || combatState.roundPhase !== 'turns') return [];

    const participantMap = combatState.participants || {};
    const blockByMember = new Map();
    (combatState.blocks || []).forEach((block, blockIndex) => {
        block.memberIds.forEach((tokenId) => blockByMember.set(tokenId, { block, blockIndex }));
    });

    return items.flatMap((token) => {
        const participant = participantMap[token.id];
        if (
            !participant
            || participant.initiative === null
            || participant.initiative === undefined
            || !Number.isFinite(Number(participant.initiative))
        ) return [];
        const blockEntry = blockByMember.get(token.id);
        return [{
            ...token,
            initiative: Number(participant.initiative),
            timelineSide: participant.side === 'enemies' ? 'master' : 'players',
            initiativeSide: participant.side,
            initiativeBlockId: blockEntry?.block.id || null,
            initiativeBlockIndex: blockEntry?.blockIndex ?? -1,
            isInitiativeActive: blockEntry?.blockIndex === combatState.activeBlockIndex,
            hasActed: Boolean(blockEntry?.block.actedIds?.includes(token.id)),
        }];
    });
};
