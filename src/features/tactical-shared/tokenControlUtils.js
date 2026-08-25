export const canControlToken = (token, isPlayerView, playerName) => {
    if (!isPlayerView) return true;
    if (!token) return false;
    if (!playerName) return true;

    if (Array.isArray(token.controlledBy)) {
        if (
            token.controlledBy.includes(playerName)
            || token.controlledBy.includes('all')
            || token.controlledBy.includes('everyone')
        ) {
            return true;
        }
    }

    if (
        typeof token.controlledBy === 'string'
        && (
            token.controlledBy === playerName
            || token.controlledBy === 'all'
            || token.controlledBy === 'everyone'
        )
    ) {
        return true;
    }

    if (token.linkedClassOwner === playerName) return true;
    if (token.owner === playerName) return true;
    if (token.ownerName === playerName) return true;
    if (token.name === playerName) return true;

    return false;
};

export const isCanvasCombatRoundActive = (scenario) => (
    scenario?.canvasCombat?.status === 'active'
);
