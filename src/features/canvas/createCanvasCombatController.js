import { createTacticalCombatController } from '../tactical-shared/createTacticalCombatController';

/** Canvas-owned combat extension point. */
export const createCanvasCombatController = (dependencies) => (
    createTacticalCombatController(dependencies)
);
