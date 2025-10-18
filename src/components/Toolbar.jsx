import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  FiMousePointer,
  FiEdit2,
  FiType,
  FiUsers,
  FiShield,
  FiImage,
} from 'react-icons/fi';
import { FaRuler, FaSun } from 'react-icons/fa';
import { GiBackpack, GiBrickWall, GiCrosshair, GiShoppingBag } from 'react-icons/gi';
import { motion, AnimatePresence } from 'framer-motion';
import ShopMenu from './ShopMenu';
import InventoryMenu from './InventoryMenu';
import PurchaseAnimation from './PurchaseAnimation';

const primaryTools = [
  { id: 'select', icon: FiMousePointer },
  { id: 'draw', icon: FiEdit2 },
  { id: 'wall', icon: GiBrickWall },
  { id: 'measure', icon: FaRuler },
  { id: 'text', icon: FiType },
  { id: 'target', icon: GiCrosshair },
];

const commerceTools = [
  { id: 'shop', icon: GiShoppingBag },
  { id: 'inventory', icon: GiBackpack },
];

const brushOptions = [
  { id: 'small', label: 'S' },
  { id: 'medium', label: 'M' },
  { id: 'large', label: 'L' },
];

const shapeOptions = [
  { id: 'line', label: 'Línea' },
  { id: 'square', label: 'Cuadrado' },
  { id: 'circle', label: 'Círculo' },
  { id: 'cone', label: 'Cono' },
  { id: 'beam', label: 'Haz' },
];

const snapOptions = [
  { id: 'center', label: 'Ajustar al centro' },
  { id: 'corner', label: 'Ajustar a la esquina' },
  { id: 'free', label: 'Sin ajuste' },
];

const measureRuleOptions = [
  { id: 'chebyshev', label: 'Chebyshev (máximo)' },
  { id: 'manhattan', label: 'Manhattan' },
  { id: 'euclidean', label: 'Euclídea' },
  { id: '5105', label: '5/10/5 (diagonales)' },
];

const unitLabelOptions = [
  { id: 'ft', label: 'ft' },
  { id: 'm', label: 'm' },
  { id: 'millas', label: 'millas' },
  { id: 'km', label: 'km' },
];

const fontOptions = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Comic Sans MS',
  'Trebuchet MS',
  'Impact',
  'Verdana',
];

const Toolbar = ({
  activeTool,
  onSelect,
  drawColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  measureShape,
  onMeasureShapeChange,
  measureSnap,
  onMeasureSnapChange,
  measureVisible,
  onMeasureVisibleChange,
  measureRule,
  onMeasureRuleChange,
  measureUnitValue,
  onMeasureUnitValueChange,
  measureUnitLabel,
  onMeasureUnitLabelChange,
  textOptions,
  onTextOptionsChange,
  onResetTextOptions,
  shopConfig = {},
  onShopConfigChange,
  onShopApply,
  shopActivePlayers = [],
  shopAvailableItems = [],
  onShopPurchase,
  shopHasPendingChanges = false,
  inventoryData = {},
  inventoryPlayers = [],
  onInventoryAddItem,
  onInventoryRemoveItem,
  canManageInventory = false,
  purchaseAnimation = null,
  stylePresets = [],
  onSaveStylePreset,
  onApplyStylePreset,
  showTextMenu = false,
  activeLayer = 'fichas',
  onLayerChange,
  isPlayerView = false,
  playerName = '',
  rarityColorMap = {},
  ambientLights = [],
  selectedAmbientLightId = null,
  onSelectAmbientLight = () => {},
  onCreateAmbientLight = () => {},
  onUpdateAmbientLight = () => {},
  onDeleteAmbientLight = () => {},
  gridCellSize = 50,
}) => {
  // Filtrar herramientas para jugadores
  const availableTools = isPlayerView
    ? primaryTools.filter((tool) => ['select', 'draw', 'measure', 'text', 'target'].includes(tool.id))
    : primaryTools;

  const commerceButtons = isPlayerView
    ? commerceTools
    : commerceTools;

  const selectedAmbientLight = useMemo(
    () => ambientLights.find((light) => light.id === selectedAmbientLightId) || null,
    [ambientLights, selectedAmbientLightId]
  );

  const cellsFromPx = (value) => {
    if (!gridCellSize) return Number.isFinite(value) ? value : 0;
    return Number.isFinite(value) ? Number((value / gridCellSize).toFixed(2)) : 0;
  };

  const pxFromCells = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return null;
    return gridCellSize ? numeric * gridCellSize : numeric;
  };

  const handleAmbientFieldChange = (field, value) => {
    if (!selectedAmbientLight) return;
    if (field === 'color') {
      onUpdateAmbientLight(selectedAmbientLight.id, { [field]: value });
      return;
    }
    if (field === 'enabled') {
      onUpdateAmbientLight(selectedAmbientLight.id, { enabled: Boolean(value) });
      return;
    }
    if (field === 'opacity') {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return;
      const clamped = Math.max(0, Math.min(1, numeric));
      onUpdateAmbientLight(selectedAmbientLight.id, { opacity: clamped });
      return;
    }
    const pxValue = pxFromCells(value);
    if (pxValue === null) return;
    onUpdateAmbientLight(selectedAmbientLight.id, { [field]: pxValue });
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 w-12 bg-gray-800 z-50 flex flex-col items-center py-2 relative">
      <div className="flex flex-col items-center space-y-2 flex-1">
        <div className="flex flex-col items-center space-y-2">
          {availableTools.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                activeTool === id
                  ? id === 'target'
                    ? 'bg-red-700 text-white'
                    : 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Icon />
            </button>
          ))}
        </div>
        <div className="relative w-9 border-t border-gray-700 pt-2 flex flex-col items-center space-y-2">
          {commerceButtons.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                activeTool === id
                  ? id === 'shop'
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Icon />
            </button>
          ))}
          <PurchaseAnimation event={isPlayerView ? purchaseAnimation : null} />
        </div>
      </div>

    {/* Sección de Capas - ocultar para jugadores */}
    {!isPlayerView && (
      <div className="flex flex-col items-center space-y-2 border-t border-gray-600 pt-2">
        <div className="text-xs text-gray-300 font-medium">Capas</div>
        <div className="flex flex-col items-center space-y-1">
          <button
            onClick={() => onLayerChange && onLayerChange('tiles')}
            className={`w-10 h-10 flex flex-col items-center justify-center rounded transition-colors ${
              activeLayer === 'tiles' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
            title="Capa de Tiles"
          >
            <FiImage className="text-sm" />
          </button>
          <div className="text-xs text-gray-300">Tiles</div>

          <button
            onClick={() => onLayerChange && onLayerChange('fichas')}
            className={`w-10 h-10 flex flex-col items-center justify-center rounded transition-colors ${
              activeLayer === 'fichas' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
            title="Capa de Fichas"
          >
            <FiUsers className="text-sm" />
          </button>
          <div className="text-xs text-gray-300">Fichas</div>

          <button
            onClick={() => onLayerChange && onLayerChange('master')}
            className={`w-10 h-10 flex flex-col items-center justify-center rounded transition-colors ${
              activeLayer === 'master' ? 'bg-fuchsia-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
            title="Capa de Master"
          >
            <FiShield className="text-sm" />
          </button>
          <div className="text-xs text-gray-300">Master</div>

          <button
            onClick={() => onLayerChange && onLayerChange('luz')}
            className={`w-10 h-10 flex flex-col items-center justify-center rounded transition-colors ${
              activeLayer === 'luz' ? 'bg-yellow-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
            title="Capa de Luz"
          >
            <FaSun className="text-sm" />
          </button>
          <div className="text-xs text-gray-300">Luz</div>
        </div>
      </div>
    )}
    <AnimatePresence>
      {activeTool === 'draw' && (
        <motion.div
          key="draw-menu"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute left-12 top-2 bg-gray-800 p-2 rounded shadow-lg space-y-2 w-fit"
        >
          <input
            type="color"
            value={drawColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-8 p-0 border-0"
          />
          <div className="flex space-x-1">
            {brushOptions.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onBrushSizeChange(id)}
                className={`px-2 py-1 rounded text-sm ${
                  brushSize === id ? 'bg-gray-700' : 'bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
      {activeTool === 'measure' && (
        <motion.div
          key="measure-menu"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute left-12 top-2 bg-gray-800 p-2 rounded shadow-lg space-y-2 text-white w-52"
        >
          <div>
            <label className="block mb-1 text-xs">Forma</label>
            <select
              value={measureShape}
              onChange={(e) => onMeasureShapeChange(e.target.value)}
              className="bg-gray-700 w-full"
            >
              {shapeOptions.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-xs">Regla de distancia</label>
            <select
              value={measureRule}
              onChange={(e) => onMeasureRuleChange(e.target.value)}
              className="bg-gray-700 w-full"
            >
              {measureRuleOptions.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-xs">Cuadrícula</label>
            <select
              value={measureSnap}
              onChange={(e) => onMeasureSnapChange(e.target.value)}
              className="bg-gray-700 w-full"
            >
              {snapOptions.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-xs">Conversión</label>
            <div className="flex space-x-2">
              <input
                type="number"
                min={0.1}
                step={0.5}
                value={measureUnitValue}
                onChange={(e) => onMeasureUnitValueChange(e.target.value)}
                className="bg-gray-700 w-20 px-2 py-1 text-sm"
              />
              <select
                value={measureUnitLabel}
                onChange={(e) => onMeasureUnitLabelChange(e.target.value)}
                className="bg-gray-700 flex-1"
              >
                {unitLabelOptions.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-gray-300 mt-1">
              1 casilla = {measureUnitValue} {measureUnitLabel}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="measure-visible"
              type="checkbox"
              checked={measureVisible}
              onChange={(e) => onMeasureVisibleChange(e.target.checked)}
            />
            <label htmlFor="measure-visible" className="text-xs select-none">
              Visible para todos
            </label>
          </div>
        </motion.div>
      )}
      {activeTool === 'shop' && (
        <motion.div
          key="shop-menu"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute left-12 top-2"
        >
          <ShopMenu
            config={shopConfig}
            onConfigChange={onShopConfigChange}
            onApply={onShopApply}
            readOnly={isPlayerView}
            activePlayers={shopActivePlayers}
            availableItems={shopAvailableItems}
            currentPlayerName={playerName}
            onPurchase={onShopPurchase}
            rarityColorMap={rarityColorMap}
            hasPendingChanges={shopHasPendingChanges}
          />
        </motion.div>
      )}
      {activeTool === 'inventory' && (
        <motion.div
          key="inventory-menu"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute left-14 top-2"
        >
          <InventoryMenu
            inventories={inventoryData}
            availablePlayers={inventoryPlayers}
            isPlayerView={isPlayerView}
            currentPlayerName={playerName}
            availableItems={shopAvailableItems}
            rarityColorMap={rarityColorMap}
            onAddItem={onInventoryAddItem}
            onRemoveItem={onInventoryRemoveItem}
            canManageInventory={canManageInventory}
          />
        </motion.div>
      )}
      {showTextMenu && (
        <motion.div
          key="text-menu"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute left-12 top-2 bg-gray-800 p-2 rounded shadow-lg space-y-2 text-white w-56"
        >
          <div>
            <label className="block mb-1 text-xs">Color texto</label>
            <input
              type="color"
              value={textOptions.fill}
              onChange={(e) =>
                onTextOptionsChange({ ...textOptions, fill: e.target.value })
              }
              className="w-8 h-8 p-0 border-0"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs">Color fondo</label>
            <input
              type="color"
              value={textOptions.bgColor}
              onChange={(e) =>
                onTextOptionsChange({ ...textOptions, bgColor: e.target.value })
              }
              className="w-8 h-8 p-0 border-0"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs">Fuente</label>
            <select
              value={textOptions.fontFamily}
              onChange={(e) =>
                onTextOptionsChange({
                  ...textOptions,
                  fontFamily: e.target.value,
                })
              }
              className="bg-gray-700 w-full"
            >
              {fontOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-xs">Tamaño</label>
            <input
              type="number"
              value={textOptions.fontSize}
              min={8}
              max={72}
              onChange={(e) =>
                onTextOptionsChange({
                  ...textOptions,
                  fontSize: parseInt(e.target.value, 10) || 1,
                })
              }
              className="bg-gray-700 w-full"
            />
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() =>
                onTextOptionsChange({
                  ...textOptions,
                  bold: !textOptions.bold,
                })
              }
              className={`px-2 py-1 rounded text-sm ${
                textOptions.bold ? 'bg-gray-700' : 'bg-gray-600'
              }`}
            >
              N
            </button>
            <button
              onClick={() =>
                onTextOptionsChange({
                  ...textOptions,
                  italic: !textOptions.italic,
                })
              }
              className={`px-2 py-1 rounded text-sm ${
                textOptions.italic ? 'bg-gray-700' : 'bg-gray-600'
              }`}
            >
              I
            </button>
            <button
              onClick={() =>
                onTextOptionsChange({
                  ...textOptions,
                  underline: !textOptions.underline,
                })
              }
              className={`px-2 py-1 rounded text-sm ${
                textOptions.underline ? 'bg-gray-700' : 'bg-gray-600'
              }`}
            >
              S
            </button>
          </div>
          <div className="flex space-x-1 mt-2">
            <button
              onClick={onResetTextOptions}
              className="px-2 py-1 rounded text-xs bg-gray-600"
            >
              Reset
            </button>
            <button
              onClick={onSaveStylePreset}
              className="px-2 py-1 rounded text-xs bg-gray-600"
            >
              Guardar
            </button>
          </div>
          {stylePresets.length > 0 && (
            <div className="mt-2">
              <div className="text-xs mb-1">Guardados</div>
              <div className="flex space-x-2 overflow-x-auto pb-1">
                {stylePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => onApplyStylePreset && onApplyStylePreset(preset)}
                    className="w-8 h-8 flex-shrink-0 rounded border flex items-center justify-center"
                    style={{
                      backgroundColor: preset.bgColor,
                      color: preset.fill,
                      fontFamily: preset.fontFamily,
                    }}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
      {!isPlayerView && activeLayer === 'luz' && (
        <motion.div
          key="ambient-light-menu"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute left-12 bottom-4 bg-gray-800 p-3 rounded shadow-lg space-y-3 text-white w-72 max-h-[28rem] overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Luces ambientales</h3>
            <button
              onClick={onCreateAmbientLight}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 rounded"
            >
              Nueva luz
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {ambientLights.length === 0 && (
              <span className="text-xs text-gray-300">No hay luces creadas.</span>
            )}
            {ambientLights.map((light, index) => {
              const label = light.name || `Luz ${index + 1}`;
              const isSelected = light.id === selectedAmbientLightId;
              return (
                <button
                  key={light.id}
                  onClick={() => onSelectAmbientLight(light.id)}
                  className={`px-2 py-1 text-xs rounded ${
                    isSelected ? 'bg-yellow-600 text-gray-900 font-semibold' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {selectedAmbientLight && (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-gray-300">Posición X (celdas)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={cellsFromPx(selectedAmbientLight.x)}
                    onChange={(e) => handleAmbientFieldChange('x', e.target.value)}
                    className="bg-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-300">Posición Y (celdas)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={cellsFromPx(selectedAmbientLight.y)}
                    onChange={(e) => handleAmbientFieldChange('y', e.target.value)}
                    className="bg-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-300">Radio brillante (celdas)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={cellsFromPx(selectedAmbientLight.brightRadius || 0)}
                    onChange={(e) => handleAmbientFieldChange('brightRadius', e.target.value)}
                    className="bg-gray-700 rounded px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-300">Radio tenue (celdas)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={cellsFromPx(selectedAmbientLight.dimRadius || 0)}
                    onChange={(e) => handleAmbientFieldChange('dimRadius', e.target.value)}
                    className="bg-gray-700 rounded px-2 py-1"
                  />
                </label>
              </div>
              <label className="flex items-center justify-between gap-2">
                <span className="text-gray-300">Color</span>
                <input
                  type="color"
                  value={selectedAmbientLight.color || '#ffa500'}
                  onChange={(e) => handleAmbientFieldChange('color', e.target.value)}
                  className="w-10 h-8 border-0"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-300">Opacidad</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedAmbientLight.opacity ?? 0.5}
                  onChange={(e) => handleAmbientFieldChange('opacity', e.target.value)}
                />
                <span className="text-right text-gray-300">
                  {(selectedAmbientLight.opacity ?? 0.5).toFixed(2)}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedAmbientLight.enabled !== false}
                  onChange={(e) => handleAmbientFieldChange('enabled', e.target.checked)}
                />
                <span className="text-gray-300">Luz activa</span>
              </label>
              <button
                onClick={() => onDeleteAmbientLight(selectedAmbientLight.id)}
                className="w-full px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
              >
                Eliminar luz
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    <PurchaseAnimation event={isPlayerView ? purchaseAnimation : null} />
  </div>
  );
};

Toolbar.propTypes = {
  activeTool: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  drawColor: PropTypes.string,
  onColorChange: PropTypes.func,
  brushSize: PropTypes.string,
  onBrushSizeChange: PropTypes.func,
  measureShape: PropTypes.string,
  onMeasureShapeChange: PropTypes.func,
  measureSnap: PropTypes.string,
  onMeasureSnapChange: PropTypes.func,
  measureVisible: PropTypes.bool,
  onMeasureVisibleChange: PropTypes.func,
  measureRule: PropTypes.string,
  onMeasureRuleChange: PropTypes.func,
  measureUnitValue: PropTypes.number,
  onMeasureUnitValueChange: PropTypes.func,
  measureUnitLabel: PropTypes.string,
  onMeasureUnitLabelChange: PropTypes.func,
  textOptions: PropTypes.shape({
    fill: PropTypes.string,
    bgColor: PropTypes.string,
    fontFamily: PropTypes.string,
    fontSize: PropTypes.number,
    bold: PropTypes.bool,
    italic: PropTypes.bool,
    underline: PropTypes.bool,
  }),
  onTextOptionsChange: PropTypes.func,
  onResetTextOptions: PropTypes.func,
  shopConfig: PropTypes.shape({
    gold: PropTypes.number,
    suggestedItemIds: PropTypes.arrayOf(PropTypes.string),
    playerWallets: PropTypes.objectOf(PropTypes.number),
  }),
  onShopConfigChange: PropTypes.func,
  onShopApply: PropTypes.func,
  shopActivePlayers: PropTypes.arrayOf(PropTypes.string),
  shopAvailableItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      typeLabel: PropTypes.string.isRequired,
      cost: PropTypes.number,
      costLabel: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      summary: PropTypes.array,
      description: PropTypes.string,
      rarity: PropTypes.string,
      searchText: PropTypes.string,
    })
  ),
  onShopPurchase: PropTypes.func,
  shopHasPendingChanges: PropTypes.bool,
  inventoryData: PropTypes.objectOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        entryId: PropTypes.string.isRequired,
        itemId: PropTypes.string,
        itemName: PropTypes.string.isRequired,
        typeLabel: PropTypes.string,
        rarity: PropTypes.string,
        cost: PropTypes.number,
      })
    )
  ),
  inventoryPlayers: PropTypes.arrayOf(PropTypes.string),
  onInventoryAddItem: PropTypes.func,
  onInventoryRemoveItem: PropTypes.func,
  canManageInventory: PropTypes.bool,
  purchaseAnimation: PropTypes.shape({
    key: PropTypes.string.isRequired,
    itemName: PropTypes.string,
    typeLabel: PropTypes.string,
    rarity: PropTypes.string,
    playerName: PropTypes.string,
  }),
  stylePresets: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string,
      fill: PropTypes.string,
      bgColor: PropTypes.string,
      fontFamily: PropTypes.string,
      fontSize: PropTypes.number,
      bold: PropTypes.bool,
      italic: PropTypes.bool,
      underline: PropTypes.bool,
    })
  ),
  onSaveStylePreset: PropTypes.func,
  onApplyStylePreset: PropTypes.func,
  showTextMenu: PropTypes.bool,
  activeLayer: PropTypes.string,
  onLayerChange: PropTypes.func,
  isPlayerView: PropTypes.bool,
  playerName: PropTypes.string,
  rarityColorMap: PropTypes.objectOf(PropTypes.string),
  ambientLights: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      x: PropTypes.number,
      y: PropTypes.number,
      brightRadius: PropTypes.number,
      dimRadius: PropTypes.number,
      color: PropTypes.string,
      opacity: PropTypes.number,
      enabled: PropTypes.bool,
    })
  ),
  selectedAmbientLightId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onSelectAmbientLight: PropTypes.func,
  onCreateAmbientLight: PropTypes.func,
  onUpdateAmbientLight: PropTypes.func,
  onDeleteAmbientLight: PropTypes.func,
  gridCellSize: PropTypes.number,
};

export default Toolbar;
