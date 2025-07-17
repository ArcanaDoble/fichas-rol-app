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
  onDelete 
}) => {
  const [selectedTargetPage, setSelectedTargetPage] = useState(
    portal.targetPageId ? pages.findIndex(p => p.id === portal.targetPageId) : -1
  );
  const [selectedTargetPortal, setSelectedTargetPortal] = useState(portal.targetPortalId || '');
  const [portalName, setPortalName] = useState(portal.name || '');

  // Obtener portales de la página seleccionada
  const getTargetPagePortals = () => {
    if (selectedTargetPage === -1) return [];
    const targetPage = pages[selectedTargetPage];
    return targetPage.portals || [];
  };

  const handleSave = () => {
    const targetPage = pages[selectedTargetPage];
    const updatedPortal = {
      ...portal,
      name: portalName || `Portal ${portal.id.slice(0, 8)}`,
      targetPageId: targetPage?.id || null,
      targetPageName: targetPage?.name || null,
      targetPortalId: selectedTargetPortal || null,
      isConnected: !!(targetPage?.id && selectedTargetPortal)
    };
    onUpdate(updatedPortal);
    onClose();
  };

  const handleDelete = () => {
    onDelete(portal.id);
    onClose();
  };

  const availablePages = pages.filter((_, index) => index !== currentPage);
  const targetPortals = getTargetPagePortals();

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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Selección de página destino */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Página de Destino
          </label>
          <select
            value={selectedTargetPage}
            onChange={(e) => {
              setSelectedTargetPage(parseInt(e.target.value));
              setSelectedTargetPortal(''); // Reset portal selection
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={-1}>Seleccionar página...</option>
            {availablePages.map((page, originalIndex) => {
              // Encontrar el índice original en el array completo de páginas
              const realIndex = pages.findIndex(p => p.id === page.id);
              return (
                <option key={page.id} value={realIndex}>
                  {page.name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Selección de portal destino */}
        {selectedTargetPage !== -1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portal de Destino
            </label>
            {targetPortals.length > 0 ? (
              <select
                value={selectedTargetPortal}
                onChange={(e) => setSelectedTargetPortal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar portal...</option>
                {targetPortals.map((targetPortal) => (
                  <option key={targetPortal.id} value={targetPortal.id}>
                    {targetPortal.name || `Portal ${targetPortal.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                No hay portales en la página "{pages[selectedTargetPage]?.name}".
                <br />
                Crea un portal en esa página primero.
              </div>
            )}
          </div>
        )}

        {/* Estado de conexión */}
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm font-medium text-gray-700 mb-1">Estado</div>
          <div className={`text-sm ${
            selectedTargetPage !== -1 && selectedTargetPortal 
              ? 'text-green-600' 
              : 'text-orange-600'
          }`}>
            {selectedTargetPage !== -1 && selectedTargetPortal 
              ? '✅ Portal conectado y funcional' 
              : '⚠️ Portal no conectado'}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
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
};

export default PortalConfigMenu;
