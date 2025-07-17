import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import Boton from './Boton';

const PortalConfigMenu = ({
  portal,
  pages,
  currentPage,
  onClose,
  onUpdate,
  onDelete,
  currentPagePortals = [] // Portales de la página actual
}) => {
  const [selectedTargetPage, setSelectedTargetPage] = useState(
    portal.targetPageId ? pages.findIndex(p => p.id === portal.targetPageId) : -1
  );
  const [selectedTargetPortal, setSelectedTargetPortal] = useState(portal.targetPortalId || '');
  const [portalName, setPortalName] = useState(portal.name || '');

  // Obtener todos los portales disponibles para conectar (de la página actual por ahora)
  const getAllAvailablePortals = () => {
    const allPortals = [];

    // Por ahora, mostrar solo portales de la página actual excepto el portal actual
    currentPagePortals.forEach(pagePortal => {
      // No incluir el portal actual
      if (pagePortal.id !== portal.id) {
        allPortals.push({
          ...pagePortal,
          pageIndex: currentPage,
          pageName: pages[currentPage]?.name || 'Página Actual',
          displayName: `${pagePortal.name || `Portal ${pagePortal.id.slice(0, 8)}`}`
        });
      }
    });

    return allPortals;
  };

  const handleSave = () => {
    const selectedPortal = availablePortals.find(p => p.id === selectedTargetPortal);
    const updatedPortal = {
      ...portal,
      name: portalName || `Portal ${portal.id.slice(0, 8)}`,
      targetPageId: selectedPortal?.pageIndex !== undefined ? pages[selectedPortal.pageIndex]?.id : null,
      targetPageName: selectedPortal?.pageName || null,
      targetPortalId: selectedTargetPortal || null,
      isConnected: !!selectedTargetPortal
    };
    onUpdate(updatedPortal);
    onClose();
  };

  const handleDelete = () => {
    onDelete(portal.id);
    onClose();
  };

  const availablePortals = getAllAvailablePortals();

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="🌀 Configurar Portal"
      footer={
        <>
          <Boton color="red" onClick={handleDelete}>
            Eliminar Portal
          </Boton>
          <Boton color="gray" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton color="blue" onClick={handleSave}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Información del portal */}
        <div className="bg-gray-100 p-3 rounded">
          <div className="text-sm font-medium text-gray-700 mb-2">Portal Actual</div>
          <div className="text-xs text-gray-600">
            <div>ID: {portal.id.slice(0, 8)}...</div>
            <div>Posición: ({Math.round(portal.x)}, {Math.round(portal.y)})</div>
            <div>Página: {pages[currentPage]?.name}</div>
          </div>
        </div>

        {/* Nombre del portal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Portal
          </label>
          <input
            type="text"
            value={portalName}
            onChange={(e) => setPortalName(e.target.value)}
            placeholder={`Portal ${portal.id.slice(0, 8)}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
          />
        </div>

        {/* Selección de portal destino */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Portal de Destino
          </label>
          {availablePortals.length > 0 ? (
            <select
              value={selectedTargetPortal}
              onChange={(e) => setSelectedTargetPortal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">Seleccionar portal...</option>
              {availablePortals.map((targetPortal) => (
                <option key={targetPortal.id} value={targetPortal.id}>
                  {targetPortal.displayName}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-700 italic p-2 bg-gray-50 rounded">
              No hay otros portales disponibles.
              <br />
              Crea portales en otras páginas para poder conectarlos.
            </div>
          )}</div>

        {/* Estado de conexión */}
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm font-medium text-gray-700 mb-1">Estado</div>
          <div className={`text-sm ${
            selectedTargetPortal
              ? 'text-green-700'
              : 'text-orange-700'
          }`}>
            {selectedTargetPortal
              ? '✅ Portal conectado y funcional'
              : '⚠️ Portal no conectado'}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="text-xs text-gray-700 bg-blue-50 p-2 rounded">
          <strong>💡 Cómo funciona:</strong>
          <ul className="mt-1 space-y-1">
            <li>• Los portales conectan dos páginas diferentes</li>
            <li>• Necesitas crear portales en ambas páginas</li>
            <li>• Los jugadores pueden usar portales en la capa "Fichas"</li>
            <li>• Al activar un portal, el jugador aparece en el portal conectado</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

PortalConfigMenu.propTypes = {
  portal: PropTypes.shape({
    id: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    name: PropTypes.string,
    targetPageId: PropTypes.string,
    targetPortalId: PropTypes.string,
    isConnected: PropTypes.bool,
  }).isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      portals: PropTypes.array,
    })
  ).isRequired,
  currentPage: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  currentPagePortals: PropTypes.array,
};

export default PortalConfigMenu;
