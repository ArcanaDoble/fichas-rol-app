import { createTacticalCombatController } from '../tactical-shared/createTacticalCombatController';

/**
 * Board-owned combat seam. It currently preserves the established tactical
 * resolution, but future board changes can diverge here without changing the
 * CanvasSection entry point or its mode definition.
 */
export const createBoardCombatController = (dependencies) => (
    createTacticalCombatController(dependencies)
);
