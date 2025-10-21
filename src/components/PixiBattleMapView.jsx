import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import PixiMapCanvas from './PixiMapCanvas';
import Toolbar from './Toolbar';
import { DEFAULT_GRID_SIZE } from '../utils/grid';
import { useDrop } from 'react-dnd';
import { AssetTypes } from './AssetSidebar';
import { createToken, cloneTokenSheet } from '../utils/token';

const DEFAULT_TEXT_OPTIONS = {
  fill: '#ffffff',
  bgColor: 'rgba(0,0,0,0.5)',
  fontFamily: 'Arial',
  fontSize: 20,
  bold: false,
  italic: false,
  underline: false,
};

const isEditableElement = (element) => {
  if (!element) {
    return false;
  }
  const tag = element.tagName;
  return (
    element.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT'
  );
};

const normalizeLight = (light) => {
  if (!light) {
    return null;
  }
  const id = light.id ?? nanoid();
  return {
    enabled: true,
    ...light,
    id,
    layer: light.layer || 'luz',
  };
};

const sanitizeOpacity = (value, fallback = 0.2) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numeric));
};

const sanitizeNumber = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const PixiBattleMapView = ({
  backgroundImage,
  gridSize = DEFAULT_GRID_SIZE,
  gridCells = null,
  gridOffsetX = 0,
  gridOffsetY = 0,
  showGrid: propShowGrid = true,
  gridColor: propGridColor = '#ffffff',
  gridOpacity: propGridOpacity = 0.2,
  tokens = [],
  onTokensChange,
  shopConfig = {},
  onShopConfigChange,
  onShopApply,
  shopActivePlayers = [],
  shopAvailableItems = [],
  onShopPurchase,
  shopHasPendingChanges = false,
  shopSoldItemIds = [],
  inventoryData = {},
  inventoryPlayers = [],
  onInventoryAddItem,
  onInventoryRemoveItem,
  canManageInventory = false,
  stylePresets = [],
  onSaveStylePreset,
  onApplyStylePreset,
  activeLayer = 'fichas',
  onLayerChange = () => {},
  isPlayerView = false,
  playerName = '',
  userType = 'master',
  rarityColorMap = {},
  ambientLights: propAmbientLights = [],
  onAmbientLightsChange,
  onGridSettingsChange,
  inventoryFeedback = null,
  showTextMenu = false,
}) => {
  const pixiRef = useRef(null);
  const containerRef = useRef(null);
  const previousLightsRef = useRef(new Set());

  const [activeTool, setActiveTool] = useState('select');
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState('medium');
  const [measureVisible, setMeasureVisible] = useState(true);
  const [measureShape, setMeasureShape] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('measureShape');
      if (stored) {
        return stored;
      }
    }
    return 'line';
  });
  const [measureSnap, setMeasureSnap] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('measureSnap');
      if (stored) {
        return stored;
      }
    }
    return 'center';
  });
  const [measureRule, setMeasureRule] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('measureRule');
      if (stored) {
        return stored;
      }
    }
    return 'chebyshev';
  });
  const [measureUnitValue, setMeasureUnitValue] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('measureUnitValue');
      const parsed = parseFloat(stored);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 5;
  });
  const [measureUnitLabel, setMeasureUnitLabel] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('measureUnitLabel');
      if (stored) {
        return stored;
      }
    }
    return 'ft';
  });

  const [textOptions, setTextOptions] = useState(DEFAULT_TEXT_OPTIONS);
  const [savedTextPresets, setSavedTextPresets] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('text-presets');
      if (stored) {
        try {
          return JSON.parse(stored) || [];
        } catch (error) {
          console.warn('[PixiBattleMapView] Error parsing text presets:', error);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('measureShape', measureShape);
    }
  }, [measureShape]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('measureSnap', measureSnap);
    }
  }, [measureSnap]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('measureRule', measureRule);
    }
  }, [measureRule]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('measureUnitValue', String(measureUnitValue));
    }
  }, [measureUnitValue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('measureUnitLabel', measureUnitLabel);
    }
  }, [measureUnitLabel]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('text-presets', JSON.stringify(savedTextPresets));
    }
  }, [savedTextPresets]);

  const [showGrid, setShowGrid] = useState(Boolean(propShowGrid));
  const [gridColor, setGridColor] = useState(propGridColor);
  const [gridOpacity, setGridOpacity] = useState(() =>
    sanitizeOpacity(propGridOpacity)
  );

  useEffect(() => {
    setShowGrid(Boolean(propShowGrid));
  }, [propShowGrid]);

  useEffect(() => {
    if (typeof propGridColor === 'string' && propGridColor.trim() !== '') {
      setGridColor(propGridColor);
    }
  }, [propGridColor]);

  useEffect(() => {
    if (propGridOpacity === undefined) {
      return;
    }
    setGridOpacity(sanitizeOpacity(propGridOpacity));
  }, [propGridOpacity]);

  const emitGridSettingsChange = useCallback(
    (nextSettings, meta = {}) => {
      if (!onGridSettingsChange) {
        return;
      }
      onGridSettingsChange(nextSettings, {
        source: 'pixi-battlemap',
        ...meta,
      });
    },
    [onGridSettingsChange]
  );

  const applyGridSettingsToPixi = useCallback(() => {
    const map = pixiRef.current;
    if (!map || typeof map.setGrid !== 'function') {
      return;
    }
    map.setGrid({
      cellSize: gridSize,
      color: gridColor,
      opacity: gridOpacity,
      visible: showGrid,
    });
  }, [gridColor, gridOpacity, gridSize, showGrid]);

  useEffect(() => {
    applyGridSettingsToPixi();
  }, [applyGridSettingsToPixi]);

  const canEditGrid = userType === 'master' || !isPlayerView;
  const gridOpacityPercent = Math.round(gridOpacity * 100);

  const handleGridVisibilityChange = useCallback(
    (nextVisible) => {
      setShowGrid(nextVisible);
      emitGridSettingsChange({ showGrid: nextVisible }, { interaction: 'commit' });
    },
    [emitGridSettingsChange]
  );

  const handleGridColorChange = useCallback(
    (value) => {
      const sanitized =
        typeof value === 'string' && value.trim() !== ''
          ? value.trim().toLowerCase()
          : '#ffffff';
      setGridColor(sanitized);
      emitGridSettingsChange(
        { gridColor: sanitized },
        { interaction: 'commit' }
      );
    },
    [emitGridSettingsChange]
  );

  const handleGridOpacityChange = useCallback(
    (value) => {
      const numeric = sanitizeOpacity(value, gridOpacity);
      setGridOpacity(numeric);
      emitGridSettingsChange(
        { gridOpacity: numeric },
        { interaction: 'commit' }
      );
    },
    [emitGridSettingsChange, gridOpacity]
  );

  const [clipboard, setClipboard] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback((event) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    setMousePosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, []);

  const handleAssetDrop = useCallback(
    async (item, clientOffset) => {
      const map = pixiRef.current;
      if (!map || !clientOffset || typeof map.addToken !== 'function') {
        return;
      }

      try {
        const snappedPosition = await map.getSnappedPositionFromClient(
          clientOffset.x,
          clientOffset.y,
        );

        if (!snappedPosition) {
          return;
        }

        const { x, y } = snappedPosition;

        const newToken = createToken({
          x,
          y,
          w: 1,
          h: 1,
          size: gridSize,
          angle: 0,
          url: item.url,
          name: item.name || '',
          enemyId: item.enemyId || null,
          customName: '',
          showName: false,
          controlledBy: 'master',
          barsVisibility: 'all',
          auraRadius: 0,
          auraShape: 'circle',
          auraColor: '#ffff00',
          auraOpacity: 0.25,
          auraVisibility: 'all',
          opacity: 1,
          tintColor: '#ff0000',
          tintOpacity: 0,
          estados: [],
          layer: activeLayer,
        });

        if (item.tokenSheetId) {
          cloneTokenSheet(item.tokenSheetId, newToken.tokenSheetId);
        }

        await map.addToken({
          id: newToken.id,
          textureUrl: newToken.url,
          x,
          y,
          size: newToken.size || gridSize,
          layer: newToken.layer,
          metadata: {
            name: newToken.name,
            customName: newToken.customName,
            enemyId: newToken.enemyId,
            tokenSheetId: newToken.tokenSheetId,
            controlledBy: newToken.controlledBy,
            barsVisibility: newToken.barsVisibility,
          },
        });

        if (typeof onTokensChange === 'function') {
          const nextTokens = Array.isArray(tokens)
            ? [...tokens, newToken]
            : [newToken];
          onTokensChange(nextTokens);
        }
      } catch (error) {
        console.error('[PixiBattleMapView] Error al soltar un asset en el mapa:', error);
      }
    },
    [activeLayer, gridSize, onTokensChange, tokens]
  );

  const [{ isOver: isAssetOverMap }, dropTarget] = useDrop(
    () => ({
      accept: AssetTypes.IMAGE,
      drop: (item, monitor) => {
        const offset = monitor.getClientOffset();
        if (!offset) {
          return;
        }
        handleAssetDrop(item, offset);
      },
    }),
    [handleAssetDrop]
  );

  const setContainerRef = useCallback(
    (node) => {
      containerRef.current = node;
      dropTarget(node);
    },
    [dropTarget]
  );

  const handleCopySelection = useCallback(() => {
    const map = pixiRef.current;
    if (!map || typeof map.copySelection !== 'function') {
      return;
    }
    const data = map.copySelection();
    if (data) {
      setClipboard(data);
    }
  }, []);

  const handlePasteSelection = useCallback(() => {
    const map = pixiRef.current;
    if (!map || typeof map.pasteAt !== 'function') {
      return;
    }
    map.pasteAt({ x: mousePosition.x, y: mousePosition.y }).then((result) => {
      if (Array.isArray(result) && result.length > 0) {
        setClipboard(map.copySelection());
      }
    });
  }, [mousePosition.x, mousePosition.y]);

  const handleDeleteSelection = useCallback(() => {
    const map = pixiRef.current;
    if (!map || typeof map.deleteSelection !== 'function') {
      return;
    }
    map.deleteSelection();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) {
        return;
      }
      const activeElement = document.activeElement;
      if (isEditableElement(activeElement)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === 'c') {
        event.preventDefault();
        handleCopySelection();
      } else if (event.ctrlKey && key === 'v') {
        event.preventDefault();
        handlePasteSelection();
      } else if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        handleDeleteSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCopySelection, handleDeleteSelection, handlePasteSelection]);

  useEffect(() => {
    const map = pixiRef.current;
    if (!map || typeof map.setTool !== 'function') {
      return;
    }
    map.setTool(activeTool);
  }, [activeTool]);

  const normalizedAmbientLights = useMemo(
    () => propAmbientLights.map(normalizeLight).filter(Boolean),
    [propAmbientLights]
  );

  const [ambientLights, setAmbientLights] = useState(normalizedAmbientLights);
  const [selectedAmbientLightId, setSelectedAmbientLightId] = useState(null);

  useEffect(() => {
    setAmbientLights(normalizedAmbientLights);
  }, [normalizedAmbientLights]);

  const updateAmbientLights = useCallback(
    (updater) => {
      setAmbientLights((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (onAmbientLightsChange) {
          onAmbientLightsChange(next);
        }
        return next;
      });
    },
    [onAmbientLightsChange]
  );

  const handleCreateAmbientLight = useCallback(() => {
    const size = sanitizeNumber(gridSize, DEFAULT_GRID_SIZE);
    const centerX = size * 8;
    const centerY = size * 6;
    const newLight = {
      id: nanoid(),
      name: '',
      x: centerX,
      y: centerY,
      brightRadius: size * 3,
      dimRadius: size * 5,
      color: '#facc15',
      opacity: 0.5,
      enabled: true,
      layer: 'luz',
      createdBy: playerName || 'Master',
    };
    updateAmbientLights((prev) => [...prev, newLight]);
    setSelectedAmbientLightId(newLight.id);
  }, [gridSize, playerName, updateAmbientLights]);

  const handleAmbientLightUpdate = useCallback(
    (lightId, patch) => {
      if (!lightId) {
        return;
      }
      updateAmbientLights((prev) =>
        prev.map((light) =>
          String(light.id) === String(lightId)
            ? { ...light, ...patch }
            : light
        )
      );
    },
    [updateAmbientLights]
  );

  const handleAmbientLightDelete = useCallback(
    (lightId) => {
      if (!lightId) {
        return;
      }
      updateAmbientLights((prev) =>
        prev.filter((light) => String(light.id) !== String(lightId))
      );
      setSelectedAmbientLightId((prev) =>
        String(prev) === String(lightId) ? null : prev
      );
    },
    [updateAmbientLights]
  );

  useEffect(() => {
    const map = pixiRef.current;
    if (!map) {
      return;
    }
    let cancelled = false;
    const syncLights = async () => {
      const instance = pixiRef.current;
      if (!instance || cancelled) {
        return;
      }
      const nextIds = new Set();
      for (const light of ambientLights) {
        if (!light || light.enabled === false) {
          if (light?.id != null) {
            await instance.removeLight(light.id);
          }
          continue;
        }
        nextIds.add(String(light.id));
        await instance.addLight(light);
      }
      const previousIds = previousLightsRef.current;
      previousIds.forEach((id) => {
        if (!nextIds.has(id)) {
          instance.removeLight(id);
        }
      });
      previousLightsRef.current = nextIds;
    };
    syncLights();
    return () => {
      cancelled = true;
    };
  }, [ambientLights]);

  const textMenuVisible = showTextMenu || activeTool === 'text';

  const handleTextOptionsChange = useCallback((options) => {
    setTextOptions(options);
  }, []);

  const handleResetTextOptions = useCallback(() => {
    setTextOptions(DEFAULT_TEXT_OPTIONS);
  }, []);

  const handleSaveTextPreset = useCallback(() => {
    setSavedTextPresets((prev) => [...prev, { ...textOptions }]);
    if (typeof onSaveStylePreset === 'function') {
      onSaveStylePreset({ ...textOptions });
    }
  }, [onSaveStylePreset, textOptions]);

  const handleApplyTextPreset = useCallback(
    (preset) => {
      if (!preset) {
        return;
      }
      const { text: _text, ...restPreset } = preset;
      setTextOptions((prev) => ({ ...prev, ...restPreset }));
      if (typeof onApplyStylePreset === 'function') {
        onApplyStylePreset(restPreset);
      }
    },
    [onApplyStylePreset]
  );

  const toolbarStylePresets = useMemo(
    () => (stylePresets.length > 0 ? stylePresets : savedTextPresets),
    [savedTextPresets, stylePresets]
  );

    return (
      <div
        ref={setContainerRef}
        className={`relative h-full w-full ${
          isAssetOverMap ? 'ring-2 ring-indigo-400/70' : ''
        }`}
        onPointerMove={handlePointerMove}
      >
        <PixiMapCanvas
          ref={pixiRef}
          backgroundImage={backgroundImage}
          gridSize={gridSize}
          gridCells={gridCells}
          gridOffsetX={gridOffsetX}
          gridOffsetY={gridOffsetY}
          gridColor={gridColor}
          gridOpacity={gridOpacity}
          showGrid={showGrid}
          tokens={tokens}
          onTokensChange={onTokensChange}
          activeLayer={activeLayer}
          onAssetDrop={handleAssetDrop}
        />
      <Toolbar
        activeTool={activeTool}
        onSelect={setActiveTool}
        drawColor={drawColor}
        onColorChange={setDrawColor}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        measureShape={measureShape}
        onMeasureShapeChange={setMeasureShape}
        measureSnap={measureSnap}
        onMeasureSnapChange={setMeasureSnap}
        measureVisible={measureVisible}
        onMeasureVisibleChange={setMeasureVisible}
        measureRule={measureRule}
        onMeasureRuleChange={setMeasureRule}
        measureUnitValue={measureUnitValue}
        onMeasureUnitValueChange={(value) => {
          const numeric = Number(value);
          if (!Number.isFinite(numeric) || numeric <= 0) {
            return;
          }
          setMeasureUnitValue(numeric);
        }}
        measureUnitLabel={measureUnitLabel}
        onMeasureUnitLabelChange={setMeasureUnitLabel}
        textOptions={textOptions}
        onTextOptionsChange={handleTextOptionsChange}
        onResetTextOptions={handleResetTextOptions}
        shopConfig={shopConfig}
        onShopConfigChange={onShopConfigChange}
        onShopApply={onShopApply}
        shopActivePlayers={shopActivePlayers}
        shopAvailableItems={shopAvailableItems}
        onShopPurchase={onShopPurchase}
        shopHasPendingChanges={shopHasPendingChanges}
        shopSoldItemIds={shopSoldItemIds}
        inventoryData={inventoryData}
        inventoryPlayers={inventoryPlayers}
        onInventoryAddItem={onInventoryAddItem}
        onInventoryRemoveItem={onInventoryRemoveItem}
        canManageInventory={canManageInventory}
        stylePresets={toolbarStylePresets}
        onSaveStylePreset={handleSaveTextPreset}
        onApplyStylePreset={handleApplyTextPreset}
        showTextMenu={textMenuVisible}
        activeLayer={activeLayer}
        onLayerChange={onLayerChange}
        isPlayerView={isPlayerView}
        playerName={playerName}
        rarityColorMap={rarityColorMap}
        ambientLights={ambientLights}
        selectedAmbientLightId={selectedAmbientLightId}
        onSelectAmbientLight={setSelectedAmbientLightId}
        onCreateAmbientLight={handleCreateAmbientLight}
        onUpdateAmbientLight={handleAmbientLightUpdate}
        onDeleteAmbientLight={handleAmbientLightDelete}
        gridCellSize={gridSize}
        inventoryFeedback={inventoryFeedback}
      />
      <div className="absolute top-4 right-4 flex flex-col items-end gap-3 pointer-events-none z-50">
        {canEditGrid && (
          <div className="w-64 max-w-[90vw] rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 shadow-lg backdrop-blur pointer-events-auto">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-400"
                  checked={showGrid}
                  onChange={(e) => handleGridVisibilityChange(e.target.checked)}
                />
                Cuadrícula
              </label>
              <span className="text-xs font-mono text-gray-400">{gridOpacityPercent}%</span>
            </div>
            <div className={`mt-2 space-y-2 ${showGrid ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">Color</span>
                <input
                  type="color"
                  value={gridColor || '#ffffff'}
                  onChange={(e) => handleGridColorChange(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-gray-600 bg-gray-800 p-0"
                />
                <span className="flex-1 text-right text-xs font-mono text-gray-400">
                  {String(gridColor || '#ffffff').toUpperCase()}
                </span>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                  Opacidad
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={gridOpacity}
                  onChange={(e) => handleGridOpacityChange(e.target.value)}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      {clipboard && (clipboard.tokens?.length ?? 0) > 0 && (
        <div className="absolute bottom-4 right-4 z-40 rounded-lg bg-purple-600 px-3 py-2 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">📋 Clipboard:</span>
            <span className="font-bold">{clipboard.tokens.length} tokens</span>
          </div>
          <div className="text-xs opacity-75">Ctrl+V para pegar en el cursor</div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-4 left-16 rounded bg-gray-900/70 px-3 py-1 text-xs text-gray-200">
        Herramientas Pixi · Usa Ctrl+C / Ctrl+V / Delete para gestionar tokens
      </div>
    </div>
  );
};

PixiBattleMapView.propTypes = {
  backgroundImage: PropTypes.string,
  gridSize: PropTypes.number,
  gridCells: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      columns: PropTypes.number,
      rows: PropTypes.number,
    }),
  ]),
  gridOffsetX: PropTypes.number,
  gridOffsetY: PropTypes.number,
  showGrid: PropTypes.bool,
  gridColor: PropTypes.string,
  gridOpacity: PropTypes.number,
  tokens: PropTypes.arrayOf(PropTypes.object),
  onTokensChange: PropTypes.func,
  shopConfig: PropTypes.object,
  onShopConfigChange: PropTypes.func,
  onShopApply: PropTypes.func,
  shopActivePlayers: PropTypes.array,
  shopAvailableItems: PropTypes.array,
  onShopPurchase: PropTypes.func,
  shopHasPendingChanges: PropTypes.bool,
  shopSoldItemIds: PropTypes.array,
  inventoryData: PropTypes.object,
  inventoryPlayers: PropTypes.array,
  onInventoryAddItem: PropTypes.func,
  onInventoryRemoveItem: PropTypes.func,
  canManageInventory: PropTypes.bool,
  stylePresets: PropTypes.array,
  onSaveStylePreset: PropTypes.func,
  onApplyStylePreset: PropTypes.func,
  activeLayer: PropTypes.string,
  onLayerChange: PropTypes.func,
  isPlayerView: PropTypes.bool,
  playerName: PropTypes.string,
  rarityColorMap: PropTypes.object,
  ambientLights: PropTypes.array,
  onAmbientLightsChange: PropTypes.func,
  onGridSettingsChange: PropTypes.func,
  inventoryFeedback: PropTypes.object,
  showTextMenu: PropTypes.bool,
  userType: PropTypes.oneOf(['master', 'player']),
};

export default PixiBattleMapView;
