import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiMoreVertical, FiPlus } from 'react-icons/fi';
import Modal from './Modal';
import Input from './Input';
import Boton from './Boton';

const PageSelector = ({ pages, current, onSelect, onAdd, onUpdate, onDelete }) => {
  const [editIndex, setEditIndex] = useState(null);
  const [pageData, setPageData] = useState({});

  const openEdit = (index) => {
    const p = pages[index];
    setPageData({
      name: p.name,
      gridSize: p.gridSize,
      gridCells: p.gridCells,
      gridOffsetX: p.gridOffsetX,
      gridOffsetY: p.gridOffsetY,
      enableDarkness: p.enableDarkness !== undefined ? p.enableDarkness : true,
      darknessOpacity: p.darknessOpacity !== undefined ? p.darknessOpacity : 0.7,
    });
    setEditIndex(index);
  };

  const closeEdit = () => setEditIndex(null);

  const handleSave = () => {
    onUpdate(editIndex, {
      name: pageData.name,
      gridSize: parseInt(pageData.gridSize, 10) || 1,
      gridCells: parseInt(pageData.gridCells, 10) || 1,
      gridOffsetX: parseInt(pageData.gridOffsetX, 10) || 0,
      gridOffsetY: parseInt(pageData.gridOffsetY, 10) || 0,
      enableDarkness: pageData.enableDarkness,
      darknessOpacity: parseFloat(pageData.darknessOpacity) || 0.7,
    });
    closeEdit();
  };

  const handleDelete = () => {
    onDelete(editIndex);
    closeEdit();
  };

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto overflow-y-visible py-1">
      {pages.map((p, i) => (
        <div key={p.id} className="relative group flex-shrink-0">
          <button
            onClick={() => onSelect(i)}
            className={`relative w-28 h-20 sm:w-36 sm:h-24 md:w-40 md:h-28 rounded-lg border border-gray-600 overflow-hidden ${
              i === current ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            {p.background && (
              <img
                src={p.background}
                alt="miniatura"
                className="absolute inset-0 object-cover w-full h-full"
              />
            )}
            <span className="absolute bottom-0 left-0 right-0 bg-gray-800/60 text-sm text-center">
              {p.name}
            </span>
          </button>
          <button
            onClick={() => openEdit(i)}
            className="absolute top-1 right-1 p-1 bg-gray-700 hover:bg-gray-600 rounded-full text-white shadow focus:outline-none hidden group-hover:block"
            aria-label="Editar"
          >
            <FiMoreVertical />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex-shrink-0 w-28 h-20 sm:w-36 sm:h-24 md:w-40 md:h-28 rounded-lg border-2 border-dashed border-gray-600 hover:border-green-500 active:border-green-400 bg-transparent hover:bg-gray-800/20 flex items-center justify-center transition-all duration-200 group"
        aria-label="Nueva página"
      >
        <FiPlus className="w-8 h-8 text-gray-600 group-hover:text-green-500 group-active:text-green-400 transition-colors duration-200" />
      </button>
      <Modal
        isOpen={editIndex !== null}
        onClose={closeEdit}
        title="Editar página"
        footer={
          <>
            <Boton color="red" onClick={handleDelete}>Eliminar</Boton>
            <Boton color="gray" onClick={closeEdit}>Cancelar</Boton>
            <Boton color="green" onClick={handleSave}>Guardar</Boton>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={pageData.name || ''}
            onChange={e => setPageData({ ...pageData, name: e.target.value })}
          />
          <Input
            type="number"
            label="Tamaño de celda"
            value={pageData.gridSize || 1}
            onChange={e => setPageData({ ...pageData, gridSize: e.target.value })}
          />
          <Input
            type="number"
            label="Nº casillas"
            value={pageData.gridCells || 1}
            onChange={e => setPageData({ ...pageData, gridCells: e.target.value })}
          />
          <Input
            type="number"
            label="Offset X"
            value={pageData.gridOffsetX || 0}
            onChange={e => setPageData({ ...pageData, gridOffsetX: e.target.value })}
          />
          <Input
            type="number"
            label="Offset Y"
            value={pageData.gridOffsetY || 0}
            onChange={e => setPageData({ ...pageData, gridOffsetY: e.target.value })}
          />

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="enableDarkness"
              checked={pageData.enableDarkness || false}
              onChange={e => setPageData({ ...pageData, enableDarkness: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="enableDarkness" className="text-sm font-medium text-gray-300">
              Activar sistema de oscuridad en esta página
            </label>
          </div>

          {pageData.enableDarkness && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Opacidad de la oscuridad: {Math.round((pageData.darknessOpacity || 0.7) * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={pageData.darknessOpacity || 0.7}
                onChange={e => setPageData({ ...pageData, darknessOpacity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

PageSelector.propTypes = {
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      gridSize: PropTypes.number.isRequired,
      gridCells: PropTypes.number.isRequired,
      gridOffsetX: PropTypes.number.isRequired,
      gridOffsetY: PropTypes.number.isRequired,
    })
  ).isRequired,
  current: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default PageSelector;
