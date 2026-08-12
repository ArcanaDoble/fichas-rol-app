// Coordinate and geometry helpers contain no game-mode rules.
import {
    DEFAULT_GRID_CONFIG,
    getFiniteMapDimensions,
    getGridPixelDimensions,
    roundGridValue,
} from './grid';

export const GRID_SIZE = 50; // Tamaño de la celda en px
export const WORLD_SIZE = 12000; // Tamaño del mundo canvas en px (Aumentado para mapas 4k)

export const getGridWorldRect = (config = {}) => {
    if (config.isInfinite) {
        return { x: 0, y: 0, width: WORLD_SIZE, height: WORLD_SIZE };
    }

    const frameDimensions = getFiniteMapDimensions(config);
    const gridDimensions = getGridPixelDimensions(config);
    return {
        x: (WORLD_SIZE - frameDimensions.width) / 2,
        y: (WORLD_SIZE - frameDimensions.height) / 2,
        width: gridDimensions.width,
        height: gridDimensions.height,
    };
};

export const clampToRange = (value, min, max) => Math.min(Math.max(value, min), max);

export const getEffectiveItemSnap = (item, config = {}) => {
    if (!item) return false;
    if (item.snapToGrid !== undefined) return !!item.snapToGrid;
    return !!config.snapToGrid;
};

export const snapWorldPositionToGrid = (worldPos = {}, config = {}, itemSize = {}, options = {}) => {
    const cellWidth = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const cellHeight = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const gridRect = getGridWorldRect(config);
    const itemWidth = Math.max(0, Number(itemSize.width) || 0);
    const itemHeight = Math.max(0, Number(itemSize.height) || 0);
    const shouldCenterInCell = !!options.centerInCell;

    const compactOffsetX = shouldCenterInCell && itemWidth > 0 && itemWidth < cellWidth ? (cellWidth - itemWidth) / 2 : 0;
    const compactOffsetY = shouldCenterInCell && itemHeight > 0 && itemHeight < cellHeight ? (cellHeight - itemHeight) / 2 : 0;

    let x = gridRect.x + Math.round(((Number(worldPos.x) || 0) - gridRect.x - compactOffsetX) / cellWidth) * cellWidth + compactOffsetX;
    let y = gridRect.y + Math.round(((Number(worldPos.y) || 0) - gridRect.y - compactOffsetY) / cellHeight) * cellHeight + compactOffsetY;

    if (!config.isInfinite) {
        x = clampToRange(x, gridRect.x, gridRect.x + gridRect.width - itemWidth);
        y = clampToRange(y, gridRect.y, gridRect.y + gridRect.height - itemHeight);
    }

    return {
        x: roundGridValue(x),
        y: roundGridValue(y),
    };
};

export const getCenteredSpawnPosition = (config = {}, itemSize = {}, options = {}) => {
    const width = Number(itemSize.width) || Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const height = Number(itemSize.height) || Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const centeredPosition = {
        x: (WORLD_SIZE / 2) - (width / 2),
        y: (WORLD_SIZE / 2) - (height / 2),
    };

    return getEffectiveItemSnap({ snapToGrid: config.snapToGrid }, config)
        ? snapWorldPositionToGrid(centeredPosition, config, { width, height }, options)
        : centeredPosition;
};

export const adjustItemsForGridChange = (items = [], previousConfig = {}, nextConfig = {}) => {
    if (previousConfig.backgroundImage || nextConfig.backgroundImage) {
        return items;
    }

    const previousCellWidth = Number(previousConfig.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const previousCellHeight = Number(previousConfig.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
    const nextCellWidth = Number(nextConfig.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
    const nextCellHeight = Number(nextConfig.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;

    if (
        Math.abs(previousCellWidth - nextCellWidth) < 0.001 &&
        Math.abs(previousCellHeight - nextCellHeight) < 0.001
    ) {
        return items;
    }

    const previousRect = getGridWorldRect(previousConfig);
    const nextRect = getGridWorldRect(nextConfig);

    const convertX = (value) => roundGridValue(
        nextRect.x + (((Number(value) || 0) - previousRect.x) / previousCellWidth) * nextCellWidth
    );
    const convertY = (value) => roundGridValue(
        nextRect.y + (((Number(value) || 0) - previousRect.y) / previousCellHeight) * nextCellHeight
    );
    const convertWidth = (value) => roundGridValue(((Number(value) || nextCellWidth) / previousCellWidth) * nextCellWidth);
    const convertHeight = (value) => roundGridValue(((Number(value) || nextCellHeight) / previousCellHeight) * nextCellHeight);

    return items.map((item) => {
        if (!getEffectiveItemSnap(item, previousConfig)) {
            return item;
        }

        if (item.type === 'wall') {
            const x1 = convertX(item.x1);
            const y1 = convertY(item.y1);
            const x2 = convertX(item.x2);
            const y2 = convertY(item.y2);

            return {
                ...item,
                x1,
                y1,
                x2,
                y2,
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.max(Math.abs(x2 - x1), 5),
                height: Math.max(Math.abs(y2 - y1), 5),
            };
        }

        const width = Math.max(convertWidth(item.width), 5);
        const height = Math.max(convertHeight(item.height), 5);
        let x = convertX(item.x);
        let y = convertY(item.y);

        if (!nextConfig.isInfinite) {
            x = clampToRange(x, nextRect.x, nextRect.x + nextRect.width - width);
            y = clampToRange(y, nextRect.y, nextRect.y + nextRect.height - height);
        }

        return {
            ...item,
            x,
            y,
            width,
            height,
        };
    });
};

// Helpers matemáticos para Muros y Colisiones
export const linesIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (det === 0) return false;
    const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
    const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
    return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
};

// Genera los puntos de un polígono de sombra proyectado
export const calculateShadowPoints = (lx, ly, x1, y1, x2, y2, projection = 10000) => {
    // Protección contra valores no numéricos que romperían el SVG en móvil
    if (!Number.isFinite(lx) || !Number.isFinite(ly) || !Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
        return "0,0 0,0 0,0 0,0";
    }

    // Calculamos la dirección del muro para extenderlo un poco (1px) y evitar fugas en las esquinas
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nudge = 1.5; // Pequeño margen para solapar sombras en las uniones

    const nx1 = x1 - (dx / len) * nudge;
    const ny1 = y1 - (dy / len) * nudge;
    const nx2 = x2 + (dx / len) * nudge;
    const ny2 = y2 + (dy / len) * nudge;

    const angle1 = Math.atan2(ny1 - ly, nx1 - lx);
    const angle2 = Math.atan2(ny2 - ly, nx2 - lx);

    const px1 = nx1 + Math.cos(angle1) * projection;
    const py1 = ny1 + Math.sin(angle1) * projection;
    const px2 = nx2 + Math.cos(angle2) * projection;
    const py2 = ny2 + Math.sin(angle2) * projection;

    return `${nx1},${ny1} ${nx2},${ny2} ${px2},${py2} ${px1},${py1}`;
};

export const lineRectIntersect = (x1, y1, x2, y2, rx, ry, rw, rh) => {
    // 1. Verificar si alguno de los puntos finales está dentro del rectángulo
    const isInside = (px, py) => px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    if (isInside(x1, y1) || isInside(x2, y2)) return true;

    // 2. Verificar intersección con los 4 lados del rectángulo
    const sides = [
        [rx, ry, rx + rw, ry], // Top
        [rx + rw, ry, rx + rw, ry + rh], // Right
        [rx + rw, ry + rh, rx, ry + rh], // Bottom
        [rx, ry + rh, rx, ry] // Left
    ];

    return sides.some(side => linesIntersect(x1, y1, x2, y2, side[0], side[1], side[2], side[3]));
};
