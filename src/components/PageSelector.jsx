import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiMoreVertical, FiPlus } from 'react-icons/fi';
import Modal from './Modal';
import Input from './Input';
import Boton from './Boton';

const PageSelector = ({ pages, current, onSelect, onAdd, onUpdate }) => {
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
    });
    closeEdit();
  };

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto">
      {pages.map((p, i) => (
        <div key={p.id} className="relative group">
          <button
            onClick={() => onSelect(i)}
            className={`relative w-40 h-28 rounded-lg border border-gray-600 overflow-hidden ${
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
            className="absolute -top-2 -right-2 hidden group-hover:block p-1 bg-gray-700 rounded-full"
            aria-label="Editar"
          >
            <FiMoreVertical />
          </button>
        </div>
      ))}
      <Boton size="sm" color="green" onClick={onAdd} icon={<FiPlus />}>
        Nueva página
      </Boton>
      <Modal
        isOpen={editIndex !== null}
        onClose={closeEdit}
        title="Editar página"
        footer={
          <>
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
};

export default PageSelector;
