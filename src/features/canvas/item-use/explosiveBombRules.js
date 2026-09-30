import { resolveAreaPlacement } from '../../tactical-shared/areaPlacementSystem';
import { getTokenOccupiedGridCells, isCombatTokenItem } from '../../tactical-shared/legacyCombatRules';
import { getGridWorldRect } from '../../tactical-shared/spatial';

const isGridCell = (cell) => (
    Number.isInteger(cell?.column) && Number.isInteger(cell?.row)
);

const getCellMetrics = (gridConfig = {}) => ({
    width: Math.max(1, Number(gridConfig.cellWidth) || 50),
    height: Math.max(1, Number(gridConfig.cellHeight) || 50),
});

const getCellWorldPoint = (cell, gridConfig) => {
    const gridRect = getGridWorldRect(gridConfig);
    const metrics = getCellMetrics(gridConfig);
    return {
        x: gridRect.x + cell.column * metrics.width + metrics.width / 2,
        y: gridRect.y + cell.row * metrics.height + metrics.height / 2,
    };
};

// Orientations describe which side of the chosen impact cell contains the 2x2 area.
const ORIENTATIONS = [
    { id: 'nw', columnOffset: -1, rowOffset: -1 },
    { id: 'ne', columnOffset: 0, rowOffset: -1 },
    { id: 'sw', columnOffset: -1, rowOffset: 0 },
    { id: 'se', columnOffset: 0, rowOffset: 0 },
];

export const getExplosiveBombDistance = ({ source, impactCell, gridConfig = {} } = {}) => {
    if (!source || !isGridCell(impactCell)) return Number.POSITIVE_INFINITY;
    const occupiedCells = getTokenOccupiedGridCells(source, gridConfig);
    if (!occupiedCells.length) return Number.POSITIVE_INFINITY;
    return Math.min(...occupiedCells.map((cell) => Math.max(
        Math.abs(cell.x - impactCell.column),
        Math.abs(cell.y - impactCell.row),
    )));
};

export const getExplosiveBombMaxRange = ({ source, resourceValue } = {}) => (
    source?.profileType === 'rogueliteEnemy'
        ? Math.max(0, Number(source.offenseBase ?? source.stats?.ofensiva?.current) || 0)
        : Math.max(0, Number(resourceValue) || 0)
);

export const resolveExplosiveBombAreaPlacements = ({ impactCell, gridConfig = {}, source, maxRange } = {}) => {
    if (!isGridCell(impactCell)) return [];
    const impactPlacement = resolveAreaPlacement({
        point: getCellWorldPoint(impactCell, gridConfig),
        gridConfig,
        size: { columns: 1, rows: 1 },
    });
    if (!impactPlacement.valid) return [];

    const distance = source ? getExplosiveBombDistance({ source, impactCell, gridConfig }) : 0;
    if (source && Number.isFinite(Number(maxRange)) && distance > Number(maxRange)) return [];
    return ORIENTATIONS.flatMap(({ id, columnOffset, rowOffset }) => {
        const anchor = {
            column: impactCell.column + columnOffset,
            row: impactCell.row + rowOffset,
        };
        const placement = resolveAreaPlacement({
            point: getCellWorldPoint(anchor, gridConfig),
            gridConfig,
            size: { columns: 2, rows: 2 },
            range: Number.POSITIVE_INFINITY,
        });
        return placement.valid ? [{ ...placement, impactCell, orientation: id, distance }] : [];
    });
};

export const getExplosiveBombTargets = ({ items = [], placement, gridConfig = {} } = {}) => {
    if (!placement?.valid || !Array.isArray(placement.cells)) return [];
    const areaCells = new Set(placement.cells.map((cell) => `${cell.column}:${cell.row}`));
    const seen = new Set();
    return items.filter((item) => {
        if (!isCombatTokenItem(item)
            || !['rogueliteClass', 'rogueliteEnemy'].includes(item.profileType)) return false;
        const key = item.id ?? item;
        if (seen.has(key)) return false;
        const insideArea = getTokenOccupiedGridCells(item, gridConfig)
            .some((cell) => areaCells.has(`${cell.x}:${cell.y}`));
        if (insideArea) seen.add(key);
        return insideArea;
    });
};

export const calculateExplosiveBombPressure = ({ resourceValue, rolls, distance, maxRange = resourceValue } = {}) => {
    const actionValue = Number(resourceValue);
    const travelled = Number(distance);
    if (!Number.isFinite(actionValue) || actionValue < 0
        || !Number.isInteger(travelled) || travelled < 0
        || travelled > Number(maxRange)
        || !Array.isArray(rolls) || rolls.length !== 2
        || !rolls.every((roll) => Number.isInteger(roll) && roll >= 1 && roll <= 8)) {
        throw new RangeError('La bomba explosiva necesita un dado, 2d8 y una distancia válidos.');
    }
    return Math.max(0, actionValue + rolls[0] + rolls[1] - travelled);
};
