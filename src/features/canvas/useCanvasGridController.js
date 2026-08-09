import { useCallback, useState } from 'react';
import {
    clampCellSize, clampGridCount, getFiniteMapDimensions,
    resolveBackgroundGridChange, roundGridValue,
} from './grid';
import { adjustItemsForGridChange } from './spatial';

/** Owns editable grid configuration and its normalized dimensions. */
export const useCanvasGridController = ({
    backgroundGridPresets,
    finiteGridDimensions,
    finiteMapFrameDimensions,
    gridConfig,
    gridInputDrafts,
    registerLocalConfigDraft,
    registerLocalItemDraftChanges,
    setActiveScenario,
    setGridConfig,
    setGridInputDrafts,
}) => {
const finiteMapWidth = finiteMapFrameDimensions?.width || (gridConfig.columns * gridConfig.cellWidth);
    const finiteMapHeight = finiteMapFrameDimensions?.height || (gridConfig.rows * gridConfig.cellHeight);
    const finiteGridWidth = finiteGridDimensions?.width || (gridConfig.columns * gridConfig.cellWidth);
    const finiteGridHeight = finiteGridDimensions?.height || (gridConfig.rows * gridConfig.cellHeight);

    // Estado para mostrar/ocultar panel de configuración
    const [showSettings, setShowSettings] = useState(false);

    // Helpers para inputs con lógica de sincronización si hay imagen
    const handleConfigChange = (key, value) => {
        setGridConfig(prev => {
            const newConfig = { ...prev, [key]: value };
            const shouldLockFiniteMapSize =
                !prev.isInfinite &&
                prev.lockFiniteMapSize &&
                ['columns', 'rows', 'cellWidth', 'cellHeight'].includes(key);
            const shouldLockSquareCells =
                !prev.isInfinite &&
                ['columns', 'rows', 'cellWidth', 'cellHeight'].includes(key);
            const hasBackgroundFrame =
                !!prev.backgroundImage &&
                Number(prev.imageWidth) > 0 &&
                Number(prev.imageHeight) > 0;

            if (hasBackgroundFrame && ['columns', 'rows', 'cellWidth', 'cellHeight'].includes(key)) {
                const resolvedConfig = resolveBackgroundGridChange(prev, key, value);
                newConfig.columns = resolvedConfig.columns;
                newConfig.rows = resolvedConfig.rows;
                newConfig.cellWidth = resolvedConfig.cellWidth;
                newConfig.cellHeight = resolvedConfig.cellHeight;
            // Si el mapa es finito sin imagen y el bloqueo está activo, sincronizar dimensiones para mantener el tamaño del mapa
            } else if (shouldLockFiniteMapSize) {
                const { width: baseMapWidth, height: baseMapHeight } = getFiniteMapDimensions(prev);
                if (key === 'columns') {
                    const nextColumns = clampGridCount(value, prev.columns);
                    const nextSquareSize = roundGridValue(baseMapWidth / nextColumns);
                    newConfig.columns = nextColumns;
                    newConfig.cellWidth = nextSquareSize;
                    if (shouldLockSquareCells) {
                        newConfig.cellHeight = nextSquareSize;
                        newConfig.rows = clampGridCount(baseMapHeight / nextSquareSize, prev.rows);
                    }
                } else if (key === 'rows') {
                    const nextRows = clampGridCount(value, prev.rows);
                    const nextSquareSize = roundGridValue(baseMapHeight / nextRows);
                    newConfig.rows = nextRows;
                    newConfig.cellHeight = nextSquareSize;
                    if (shouldLockSquareCells) {
                        newConfig.cellWidth = nextSquareSize;
                        newConfig.columns = clampGridCount(baseMapWidth / nextSquareSize, prev.columns);
                    }
                } else if (key === 'cellWidth') {
                    const nextSquareSize = clampCellSize(value, prev.cellWidth);
                    newConfig.cellWidth = nextSquareSize;
                    newConfig.columns = clampGridCount(baseMapWidth / nextSquareSize, prev.columns);
                    if (shouldLockSquareCells) {
                        newConfig.cellHeight = nextSquareSize;
                        newConfig.rows = clampGridCount(baseMapHeight / nextSquareSize, prev.rows);
                    }
                } else if (key === 'cellHeight') {
                    const nextSquareSize = clampCellSize(value, prev.cellHeight);
                    newConfig.cellHeight = nextSquareSize;
                    newConfig.rows = clampGridCount(baseMapHeight / nextSquareSize, prev.rows);
                    if (shouldLockSquareCells) {
                        newConfig.cellWidth = nextSquareSize;
                        newConfig.columns = clampGridCount(baseMapWidth / nextSquareSize, prev.columns);
                    }
                }
            } else if (shouldLockSquareCells) {
                if (key === 'cellWidth') {
                    const nextSquareSize = clampCellSize(value, prev.cellWidth);
                    newConfig.cellWidth = nextSquareSize;
                    newConfig.cellHeight = nextSquareSize;
                } else if (key === 'cellHeight') {
                    const nextSquareSize = clampCellSize(value, prev.cellHeight);
                    newConfig.cellHeight = nextSquareSize;
                    newConfig.cellWidth = nextSquareSize;
                } else if (key === 'columns') {
                    newConfig.columns = clampGridCount(value, prev.columns);
                } else if (key === 'rows') {
                    newConfig.rows = clampGridCount(value, prev.rows);
                }
            }

            const cellSizeChanged =
                Math.abs((Number(prev.cellWidth) || 0) - (Number(newConfig.cellWidth) || 0)) >= 0.001 ||
                Math.abs((Number(prev.cellHeight) || 0) - (Number(newConfig.cellHeight) || 0)) >= 0.001;
            registerLocalConfigDraft(prev, newConfig);

            setActiveScenario(currentScenario => {
                if (!currentScenario) return currentScenario;

                const nextItems = cellSizeChanged
                    ? adjustItemsForGridChange(currentScenario.items || [], prev, newConfig)
                    : currentScenario.items;
                if (cellSizeChanged) {
                    registerLocalItemDraftChanges(currentScenario.items || [], nextItems);
                }

                return {
                    ...currentScenario,
                    config: newConfig,
                    items: nextItems,
                };
            });

            return newConfig;
        });
    };

    const handleGridDraftChange = useCallback((key, rawValue) => {
        setGridInputDrafts(prev => ({ ...prev, [key]: rawValue }));
    }, []);

    const resetGridDraft = useCallback((key) => {
        setGridInputDrafts(prev => ({
            ...prev,
            [key]: String(gridConfig[key] ?? ''),
        }));
    }, [gridConfig]);

    const commitGridDraft = useCallback((key) => {
        const rawValue = gridInputDrafts[key]?.trim?.() ?? '';
        if (rawValue === '') {
            resetGridDraft(key);
            return;
        }

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            resetGridDraft(key);
            return;
        }

        handleConfigChange(key, numericValue);
    }, [gridInputDrafts, handleConfigChange, resetGridDraft]);

    const handleGridDraftKeyDown = useCallback((key, event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            resetGridDraft(key);
            event.currentTarget.blur();
        }
    }, [commitGridDraft, resetGridDraft]);

    const applyBackgroundGridPreset = useCallback((presetIndex) => {
        if (!backgroundGridPresets.length) return;

        const clampedIndex = Math.min(Math.max(Number(presetIndex) || 0, 0), backgroundGridPresets.length - 1);
        const preset = backgroundGridPresets[clampedIndex];
        if (!preset) return;

        setGridConfig(prev => {
            const newConfig = {
                ...prev,
                columns: preset.columns,
                rows: preset.rows,
                cellWidth: preset.cellSize,
                cellHeight: preset.cellSize,
            };
            registerLocalConfigDraft(prev, newConfig);

            setActiveScenario(currentScenario => {
                if (!currentScenario) return currentScenario;
                return {
                    ...currentScenario,
                    config: newConfig,
                    items: currentScenario.items,
                };
            });

            return newConfig;
        });
    }, [backgroundGridPresets]);

    return {
        finiteMapWidth,
        finiteMapHeight,
        finiteGridWidth,
        finiteGridHeight,
        showSettings,
        setShowSettings,
        handleConfigChange,
        handleGridDraftChange,
        commitGridDraft,
        handleGridDraftKeyDown,
        applyBackgroundGridPreset,
    };
};
