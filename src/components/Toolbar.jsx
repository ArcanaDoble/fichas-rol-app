import React from 'react';
import PropTypes from 'prop-types';
import { FiMousePointer, FiEdit2, FiType } from 'react-icons/fi';
import { FaRuler } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const tools = [
  { id: 'select', icon: FiMousePointer },
  { id: 'draw', icon: FiEdit2 },
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
}) => (
  <div className="fixed left-0 top-0 bottom-0 w-12 bg-gray-800 z-50 flex flex-col items-center py-2 space-y-2">
    {tools.map(({ id, icon: Icon }) => (
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
    </AnimatePresence>
  </div>
);

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
};

export default Toolbar;
