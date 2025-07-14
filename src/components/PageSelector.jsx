import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiMoreVertical, FiPlus } from 'react-icons/fi';
import Modal from './Modal';
import Input from './Input';
import Boton from './Boton';

const PageSelector = ({ pages, currentId, onSelect, onAdd, onUpdate, onDelete }) => {
  const [editId, setEditId] = useState(null);
  const [pageData, setPageData] = useState({});

  const openEdit = (id) => {
    const p = pages.find(pg => pg.id === id);
    setPageData({
      name: p.name,
      gridSize: p.gridSize,
      gridCells: p.gridCells,
      gridOffsetX: p.gridOffsetX,
      gridOffsetY: p.gridOffsetY,
    });
    setEditId(id);
  };

  const closeEdit = () => setEditId(null);

  const handleSave = () => {
    onUpdate(editId, {
      name: pageData.name,
      gridSize: parseInt(pageData.gridSize, 10) || 1,
      gridCells: parseInt(pageData.gridCells, 10) || 1,
      gridOffsetX: parseInt(pageData.gridOffsetX, 10) || 0,
      gridOffsetY: parseInt(pageData.gridOffsetY, 10) || 0,
    });
    closeEdit();
  };

  const handleDelete = () => {
    onDelete(editId);
    closeEdit();
  };

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto overflow-y-visible py-1">
      {pages.map((p) => (
        <div key={p.id} className="relative group flex-shrink-0">
          <button
            onClick={() => onSelect(p.id)}
            className={`relative w-28 h-20 sm:w-36 sm:h-24 md:w-40 md:h-28 rounded-lg border border-gray-600 overflow-hidden ${
              p.id === currentId ? 'ring-2 ring-blue-400' : ''
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
            onClick={() => openEdit(p.id)}
            className="absolute top-1 right-1 p-1 bg-gray-700 hover:bg-gray-600 rounded-full text-white shadow focus:outline-none hidden group-hover:block"
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
        isOpen={editId !== null}
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
  currentId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default PageSelector;
