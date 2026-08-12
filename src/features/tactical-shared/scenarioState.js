// Persistence comparison helpers shared by both tactical surfaces.
export const areScenarioFieldValuesEqual = (left, right) => {
    if (left === right) return true;

    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch {
        return false;
    }
};
