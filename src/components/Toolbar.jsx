import React from 'react';
import PropTypes from 'prop-types';
import { FiMousePointer, FiEdit2, FiType, FiUsers, FiShield } from 'react-icons/fi';
import { FaRuler, FaSun } from 'react-icons/fa';
import { GiBrickWall } from 'react-icons/gi';
import { motion, AnimatePresence } from 'framer-motion';

const tools = [
  { id: 'select', icon: FiMousePointer },
  { id: 'draw', icon: FiEdit2 },
  { id: 'wall', icon: GiBrickWall },
  { id: 'measure', icon: FaRuler },
  { id: 'text', icon: FiType },
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
  textOptions,
  onTextOptionsChange,
  activeLayer = 'fichas',
  onLayerChange,
  isPlayerView = false,
}) => {
  // Filtrar herramientas para jugadores
  const availableTools = isPlayerView
    ? tools.filter(tool => ['select', 'draw', 'measure', 'text'].includes(tool.id))
    : tools;

  return (
  <div className="fixed left-0 top-0 bottom-0 w-12 bg-gray-800 z-50 flex flex-col items-center py-2">
    <div className="flex flex-col items-center space-y-2 flex-1">
      {availableTools.map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
            activeTool === id ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
    
    {/* Sección de Capas - ocultar para jugadores */}
    {!isPlayerView && (
      <div className="flex flex-col items-center space-y-2 border-t border-gray-600 pt-2">
        <div className="text-xs text-gray-300 font-medium">Capas</div>
        <div className="flex flex-col items-center space-y-1">
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
      {activeTool === 'text' && (
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
        </motion.div>
      )}
    </AnimatePresence>
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
  activeLayer: PropTypes.string,
  onLayerChange: PropTypes.func,
  isPlayerView: PropTypes.bool,
};

export default Toolbar;
