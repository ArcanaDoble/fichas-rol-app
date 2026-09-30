import { getGridWorldRect } from './spatial';

const asPositiveInteger = (value, fallback = 1) => {
    const parsed = Math.floor(Number(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getCellMetrics = (gridConfig = {}) => ({
    width: Math.max(1, Number(gridConfig.cellWidth) || 50),
    height: Math.max(1, Number(gridConfig.cellHeight) || 50),
});

const getGridCell = (point = {}, gridConfig = {}) => {
    const gridRect = getGridWorldRect(gridConfig);
    const cell = getCellMetrics(gridConfig);
    return {
        column: Math.floor(((Number(point.x) || 0) - gridRect.x) / cell.width),
        row: Math.floor(((Number(point.y) || 0) - gridRect.y) / cell.height),
    };
};

const getItemCells = (item = {}, gridConfig = {}) => {
    const gridRect = getGridWorldRect(gridConfig);
    const cell = getCellMetrics(gridConfig);
    const start = getGridCell({ x: item.x, y: item.y }, gridConfig);
    const endColumn = Math.max(
        start.column,
        Math.ceil(((Number(item.x) || 0) + Math.max(1, Number(item.width) || cell.width) - gridRect.x) / cell.width) - 1,
    );
    const endRow = Math.max(
        start.row,
        Math.ceil(((Number(item.y) || 0) + Math.max(1, Number(item.height) || cell.height) - gridRect.y) / cell.height) - 1,
    );
    const cells = [];
    for (let row = start.row; row <= endRow; row += 1) {
        for (let column = start.column; column <= endColumn; column += 1) {
            cells.push({ column, row });
        }
    }
    return cells;
};

const getTemplateCells = (anchor, columns, rows) => {
    const cells = [];
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            cells.push({ column: anchor.column + column, row: anchor.row + row });
        }
    }
    return cells;
};

const getChebyshevDistance = (sourceCells, targetCells) => {
    if (!sourceCells.length || !targetCells.length) return Number.POSITIVE_INFINITY;
    return Math.min(...sourceCells.flatMap((source) => targetCells.map((target) => (
        Math.max(Math.abs(source.column - target.column), Math.abs(source.row - target.row))
    ))));
};

export const resolveAreaPlacement = ({
    point,
    source,
    gridConfig = {},
    shape = 'rect',
    size = {},
    range = Number.POSITIVE_INFINITY,
    validate,
    items = [],
} = {}) => {
    const gridRect = getGridWorldRect(gridConfig);
    const cell = getCellMetrics(gridConfig);
    const columns = asPositiveInteger(size.columns ?? size.width, 1);
    const rows = asPositiveInteger(size.rows ?? size.height, 1);
    const anchor = getGridCell(point, gridConfig);
    const cells = getTemplateCells(anchor, columns, rows);
    const width = columns * cell.width;
    const height = rows * cell.height;
    const x = gridRect.x + anchor.column * cell.width;
    const y = gridRect.y + anchor.row * cell.height;
    const sourceCells = source ? getItemCells(source, gridConfig) : [];
    const distance = source ? getChebyshevDistance(sourceCells, cells) : 0;
    const maxRange = Math.max(0, Number(range));
    const insideBounds = gridConfig.isInfinite || (
        x >= gridRect.x
        && y >= gridRect.y
        && x + width <= gridRect.x + gridRect.width
        && y + height <= gridRect.y + gridRect.height
    );
    const withinRange = !source || !Number.isFinite(maxRange) || distance <= maxRange;
    const placement = {
        shape,
        x,
        y,
        width,
        height,
        columns,
        rows,
        cells,
        distance,
        range: maxRange,
        insideBounds,
        withinRange,
        valid: insideBounds && withinRange,
        reason: !insideBounds ? 'outside-grid' : !withinRange ? 'out-of-range' : null,
    };
    const customResult = typeof validate === 'function'
        ? validate({ placement, source, items, gridConfig })
        : true;

    if (customResult !== true && customResult !== undefined) {
        placement.valid = false;
        placement.reason = typeof customResult === 'string' ? customResult : 'invalid-placement';
    }
    return placement;
};

export const getTerrainAreaDefinition = (kind) => {
    if (kind === 'smoke') return {
        name: 'Humo', geometryKind: 'smoke', backgroundColor: '#64748b', opacity: 0.32,
        areaEffect: { id: 'smoke-concealment', type: 'smoke', persistent: true },
    };
    if (kind === 'tar') return {
        name: 'Brea', geometryKind: 'tar', backgroundColor: '#17130f', opacity: 1,
        areaEffect: { id: 'tar-terrain', type: 'tar', difficultTerrain: true, inflammable: true, persistent: true },
    };
    return null;
};

export const createAreaSceneItem = ({
    id = globalThis.crypto?.randomUUID?.() || `area-${Date.now()}`,
    placement,
    name = 'Área',
    geometryKind = 'rect',
    backgroundColor = '#c8aa6e',
    opacity = 0.2,
    controlledBy = ['master'],
    areaEffect = null,
    metadata = {},
} = {}) => {
    if (!placement?.valid) return null;
    return {
        id,
        type: 'geometry',
        shapeType: placement.shape || 'rect',
        geometryKind,
        name,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        rotation: 0,
        snapToGrid: true,
        backgroundColor,
        opacity,
        controlledBy,
        isCircular: placement.shape === 'circle',
        ...(areaEffect ? { areaEffect } : {}),
        ...metadata,
    };
};

export const AreaPlacementSystem = {
    resolve: resolveAreaPlacement,
    createSceneItem: createAreaSceneItem,
};

export default AreaPlacementSystem;
