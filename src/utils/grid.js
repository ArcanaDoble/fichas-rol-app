export const DEFAULT_GRID_SIZE = 50;
export const DEFAULT_GRID_CELLS = 30;

const toFiniteNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (value === null || value === undefined) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

export const resolveGridSize = (value, previous) => {
  const candidate = toFiniteNumber(value);
  const fallback = toFiniteNumber(previous);
  const resolved = candidate ?? fallback ?? DEFAULT_GRID_SIZE;
  return Math.max(1, resolved);
};

export const resolveGridCells = (value, previous) => {
  const candidate = toFiniteNumber(value);
  const fallback = toFiniteNumber(previous);
  const resolved = candidate ?? fallback ?? DEFAULT_GRID_CELLS;
  return Math.max(1, Math.round(resolved));
};
