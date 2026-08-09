
export const DEFAULT_FINITE_COLUMNS = 12;
export const DEFAULT_FINITE_ROWS = 8;
export const TARGET_GRID_CELL_SIZE = 256;
export const DEFAULT_TOKEN_CELL_SCALE = 0.5;
export const MIN_GRID_CELL_SIZE = 10;
export const MAX_GRID_CELL_SIZE = 500;
export const MIN_GRID_COUNT = 1;
export const MAX_GRID_COUNT = 100;

export const clampGridCount = (rawValue, fallback = DEFAULT_FINITE_COLUMNS) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(MAX_GRID_COUNT, Math.max(MIN_GRID_COUNT, Math.round(numericValue)));
};

export const clampCellSize = (rawValue, fallback = TARGET_GRID_CELL_SIZE) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(MAX_GRID_CELL_SIZE, Math.max(MIN_GRID_CELL_SIZE, Math.round(numericValue)));
};

export const DEFAULT_GRID_CONFIG = {
    cellWidth: TARGET_GRID_CELL_SIZE,
    cellHeight: TARGET_GRID_CELL_SIZE,
    color: '#334155',
    opacity: 0.3,
    lineWidth: 1,
    lineType: 'solid',
    isInfinite: true,
    columns: DEFAULT_FINITE_COLUMNS,
    rows: DEFAULT_FINITE_ROWS,
    backgroundImage: null,
    backgroundImageHash: null,
    imageWidth: null,
    imageHeight: null,
    snapToGrid: false,
    ambientDarkness: 0,
    fogOfWar: false,
    isCombatActive: false,
    lockFiniteMapSize: false,
};

export const normalizeGridConfig = (config = {}) => ({
    ...DEFAULT_GRID_CONFIG,
    ...(config || {}),
    columns: clampGridCount(config?.columns ?? DEFAULT_GRID_CONFIG.columns, DEFAULT_GRID_CONFIG.columns),
    rows: clampGridCount(config?.rows ?? DEFAULT_GRID_CONFIG.rows, DEFAULT_GRID_CONFIG.rows),
    cellWidth: clampCellSize(config?.cellWidth ?? DEFAULT_GRID_CONFIG.cellWidth, DEFAULT_GRID_CONFIG.cellWidth),
    cellHeight: clampCellSize(config?.cellHeight ?? DEFAULT_GRID_CONFIG.cellHeight, DEFAULT_GRID_CONFIG.cellHeight),
});

export const roundGridValue = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return value;
    return Math.round(numericValue * 100) / 100;
};

export const getFiniteMapDimensions = (config = {}) => {
    return {
        width: (Number(config.columns) || DEFAULT_GRID_CONFIG.columns) * (Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth),
        height: (Number(config.rows) || DEFAULT_GRID_CONFIG.rows) * (Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight),
    };
};

export const getGridPixelDimensions = (config = {}) => ({
    width: (Number(config.columns) || DEFAULT_GRID_CONFIG.columns) * (Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth),
    height: (Number(config.rows) || DEFAULT_GRID_CONFIG.rows) * (Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight),
});

export const buildBackgroundGridPreset = (imageWidth, imageHeight, rawColumns, rawRows) => {
    const columns = clampGridCount(rawColumns);
    const rows = clampGridCount(rawRows, DEFAULT_FINITE_ROWS);
    const aspectRatio = imageWidth / imageHeight;
    const cellWidthFromImage = imageWidth / columns;
    const cellHeightFromImage = imageHeight / rows;
    const cellSize = clampCellSize((cellWidthFromImage + cellHeightFromImage) / 2);
    const frameWidth = columns * cellSize;
    const frameHeight = rows * cellSize;
    const aspectDelta = Math.abs((frameWidth / frameHeight) - aspectRatio) / aspectRatio;
    const cellDelta = Math.abs(cellSize - TARGET_GRID_CELL_SIZE);

    return {
        columns,
        rows,
        cellSize,
        frameWidth,
        frameHeight,
        aspectDelta,
        cellDelta,
        score: (aspectDelta * 1000) + cellDelta,
    };
};

export const getExactBackgroundGridPresets = (config = {}, minimumCellSize = MIN_GRID_CELL_SIZE) => {
    const imageWidth = Math.round(Number(config.imageWidth) || 0);
    const imageHeight = Math.round(Number(config.imageHeight) || 0);

    if (imageWidth <= 0 || imageHeight <= 0) {
        return [];
    }

    const aspectRatio = imageWidth / imageHeight;
    const approxColumns = clampGridCount(imageWidth / TARGET_GRID_CELL_SIZE, DEFAULT_FINITE_COLUMNS);
    const approxRows = clampGridCount(imageHeight / TARGET_GRID_CELL_SIZE, DEFAULT_FINITE_ROWS);
    const candidates = new globalThis.Map();

    const addCandidate = (columns, rows) => {
        if (columns < MIN_GRID_COUNT || rows < MIN_GRID_COUNT) return;
        const preset = buildBackgroundGridPreset(imageWidth, imageHeight, columns, rows);
        if (preset.cellSize < minimumCellSize) return;
        const key = `${preset.columns}x${preset.rows}`;
        const existingPreset = candidates.get(key);
        if (!existingPreset || preset.score < existingPreset.score) {
            candidates.set(key, preset);
        }
    };

    for (let delta = -18; delta <= 18; delta += 1) {
        const columns = approxColumns + delta;
        const derivedRows = Math.max(1, Math.round(columns / aspectRatio));
        addCandidate(columns, derivedRows - 1);
        addCandidate(columns, derivedRows);
        addCandidate(columns, derivedRows + 1);
    }

    for (let delta = -12; delta <= 12; delta += 1) {
        const rows = approxRows + delta;
        const derivedColumns = Math.max(1, Math.round(rows * aspectRatio));
        addCandidate(derivedColumns - 1, rows);
        addCandidate(derivedColumns, rows);
        addCandidate(derivedColumns + 1, rows);
    }

    addCandidate(DEFAULT_FINITE_COLUMNS, DEFAULT_FINITE_ROWS);
    addCandidate(approxColumns, approxRows);

    return Array.from(candidates.values()).sort((a, b) => {
        if (b.cellSize !== a.cellSize) return b.cellSize - a.cellSize;
        if (a.aspectDelta !== b.aspectDelta) return a.aspectDelta - b.aspectDelta;
        return a.cellDelta - b.cellDelta;
    });
};

export const findClosestBackgroundGridPreset = (presets = [], key, rawTarget) => {
    if (!Array.isArray(presets) || presets.length === 0) return null;

    const target = Number(rawTarget);
    if (!Number.isFinite(target)) {
        return presets[presets.length - 1];
    }

    return presets.reduce((bestPreset, currentPreset) => {
        if (!bestPreset) return currentPreset;

        const currentDistance = Math.abs((Number(currentPreset[key]) || 0) - target);
        const bestDistance = Math.abs((Number(bestPreset[key]) || 0) - target);

        if (currentDistance !== bestDistance) {
            return currentDistance < bestDistance ? currentPreset : bestPreset;
        }

        return (Number(currentPreset.cellSize) || 0) > (Number(bestPreset.cellSize) || 0)
            ? currentPreset
            : bestPreset;
    }, null);
};

export const resolveBackgroundGridChange = (config = {}, key, rawValue) => {
    const imageWidth = Math.round(Number(config.imageWidth) || 0);
    const imageHeight = Math.round(Number(config.imageHeight) || 0);

    if (imageWidth <= 0 || imageHeight <= 0) {
        return {
            columns: clampGridCount(config.columns, DEFAULT_GRID_CONFIG.columns),
            rows: clampGridCount(config.rows, DEFAULT_GRID_CONFIG.rows),
            cellWidth: clampCellSize(config.cellWidth, DEFAULT_GRID_CONFIG.cellWidth),
            cellHeight: clampCellSize(config.cellHeight, DEFAULT_GRID_CONFIG.cellHeight),
        };
    }

    const presets = getExactBackgroundGridPresets({ imageWidth, imageHeight }, MIN_GRID_CELL_SIZE);
    const aspectRatio = imageWidth / imageHeight;

    if (key === 'columns') {
        const columns = clampGridCount(rawValue, clampGridCount(config.columns, DEFAULT_GRID_CONFIG.columns));
        const rows = clampGridCount(Math.round(columns / aspectRatio), DEFAULT_FINITE_ROWS);
        const preset = buildBackgroundGridPreset(imageWidth, imageHeight, columns, rows);
        return {
            columns: preset.columns,
            rows: preset.rows,
            cellWidth: preset.cellSize,
            cellHeight: preset.cellSize,
        };
    }

    if (key === 'rows') {
        const rows = clampGridCount(rawValue, clampGridCount(config.rows, DEFAULT_GRID_CONFIG.rows));
        const columns = clampGridCount(Math.round(rows * aspectRatio), DEFAULT_FINITE_COLUMNS);
        const preset = buildBackgroundGridPreset(imageWidth, imageHeight, columns, rows);
        return {
            columns: preset.columns,
            rows: preset.rows,
            cellWidth: preset.cellSize,
            cellHeight: preset.cellSize,
        };
    }

    const targetCellSize = clampCellSize(rawValue, TARGET_GRID_CELL_SIZE);
    const matchedPreset = findClosestBackgroundGridPreset(presets, 'cellSize', targetCellSize)
        || buildBackgroundGridPreset(imageWidth, imageHeight, imageWidth / targetCellSize, imageHeight / targetCellSize);

    return {
        columns: matchedPreset.columns,
        rows: matchedPreset.rows,
        cellWidth: matchedPreset.cellSize,
        cellHeight: matchedPreset.cellSize,
    };
};

export const getBackgroundGridPresetIndex = (config = {}, presets = []) => {
    if (!Array.isArray(presets) || presets.length === 0) return 0;

    const exactIndex = presets.findIndex((preset) =>
        Number(preset.columns) === Number(config.columns) &&
        Number(preset.rows) === Number(config.rows) &&
        Number(preset.cellSize) === Number(config.cellWidth)
    );

    if (exactIndex >= 0) return exactIndex;

    const closestPreset = findClosestBackgroundGridPreset(presets, 'cellSize', config.cellWidth);
    const closestIndex = presets.findIndex((preset) =>
        Number(preset.columns) === Number(closestPreset?.columns) &&
        Number(preset.rows) === Number(closestPreset?.rows) &&
        Number(preset.cellSize) === Number(closestPreset?.cellSize)
    );

    return closestIndex >= 0 ? closestIndex : 0;
};
