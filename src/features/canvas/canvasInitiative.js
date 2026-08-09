import { getCombatSpeedTokens, isMasterControlledCombatToken } from './combatRules';

/** Canvas initiative is the combat speed timeline. */
export const buildCanvasTimelineTokens = (items = []) => (
    getCombatSpeedTokens(items).map((token) => ({
        ...token,
        timelineSide: isMasterControlledCombatToken(token) ? 'master' : 'players',
    }))
);
