/**
 * Mutable runtime registry for physical Board dice.
 *
 * It lives outside either feature boundary because the shared pointer host must
 * ignore a die while the Board renderer owns its physical animation.
 */
export const BOARD_DIE_SIDES = Object.freeze([4, 6, 8, 10, 12, 20]);
export const BOARD_DICE_ROLL_SIDES = BOARD_DIE_SIDES;
export const ACTIVE_BOARD_DIE_ROLL_IDS = new Set();
