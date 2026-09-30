import { getGridWorldRect } from './spatial';

export const isTarZone = item => item?.type === 'geometry'
    && (item.geometryKind === 'tar' || item.areaEffect?.type === 'tar');

export const getTerrainCells = (item, config = {}) => {
    const grid = getGridWorldRect(config);
    const w = Number(config.cellWidth) || 50;
    const h = Number(config.cellHeight) || 50;
    const cells = [];
    if (item.type !== 'geometry') {
        const column = Math.round((item.x - grid.x) / w);
        const row = Math.round((item.y - grid.y) / h);
        for (let dy = 0; dy < Math.max(1, Math.round((item.height || h) / h)); dy += 1)
            for (let dx = 0; dx < Math.max(1, Math.round((item.width || w) / w)); dx += 1) cells.push({ column: column + dx, row: row + dy });
        return cells;
    }
    for (let row = Math.floor((item.y - grid.y + 0.001) / h); row < Math.ceil((item.y + (item.height || h) - grid.y - 0.001) / h); row += 1) {
        for (let column = Math.floor((item.x - grid.x + 0.001) / w); column < Math.ceil((item.x + (item.width || w) - grid.x - 0.001) / w); column += 1) cells.push({ column, row });
    }
    return cells;
};
const key = cell => `${cell.column}:${cell.row}`;
export const getTokenTarCoverage = (token, items = [], config = {}) => {
    if (!token) return 0;
    const cells = getTerrainCells(token, config);
    const tarCells = new Set(items.filter(isTarZone).flatMap(item => getTerrainCells(item, config)).map(key));
    return cells.length ? cells.filter(cell => tarCells.has(key(cell))).length / cells.length : 0;
};
const neighbors = cell => [cell, { column: cell.column - 1, row: cell.row }, { column: cell.column + 1, row: cell.row }, { column: cell.column, row: cell.row - 1 }, { column: cell.column, row: cell.row + 1 }];

// Price each entered cell along the same straight route used by dragging.
// Multiple overlapping terrain sources never multiply the surcharge.
export const getTerrainMovementCost = ({ token, from, to, items = [], config = {}, exceptional = false }) => {
    const w = Number(config.cellWidth) || 50;
    const h = Number(config.cellHeight) || 50;
    const steps = Math.max(Math.round(Math.abs(to.x - from.x) / w), Math.round(Math.abs(to.y - from.y) / h));
    if (!steps || exceptional) return steps;
    const terrain = items.filter(item => isTarZone(item) || item.areaEffect?.difficultTerrain);
    if (!terrain.length) return steps;
    const occupied = new Set(terrain.flatMap(item => getTerrainCells(item, config)).map(key));
    let cost = 0;
    for (let step = 1; step <= steps; step += 1) {
        const position = { ...token,
            x: from.x + Math.round((to.x - from.x) / w * step / steps) * w,
            y: from.y + Math.round((to.y - from.y) / h * step / steps) * h };
        cost += getTerrainCells(position, config).some(cell => occupied.has(key(cell))) ? 2 : 1;
    }
    return cost;
};

export const resolveTarIgnition = ({ items = [], fireCells = [], config = {} }) => {
    const zones = items.filter(isTarZone);
    const cells = new Map(zones.flatMap(zone => getTerrainCells(zone, config)).map(cell => [key(cell), cell]));
    const queue = fireCells.flatMap(neighbors).filter(cell => cells.has(key(cell)));
    const burned = new Map();
    while (queue.length) {
        const cell = queue.pop();
        if (burned.has(key(cell))) continue;
        burned.set(key(cell), cell);
        neighbors(cell).forEach(next => { if (cells.has(key(next)) && !burned.has(key(next))) queue.push(next); });
    }
    return { cells: [...burned.values()], zoneIds: zones.filter(zone => getTerrainCells(zone, config).some(cell => burned.has(key(cell)))).map(zone => zone.id) };
};
