import React from 'react';
import Boton from './Boton';

const MasterMenu = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl mb-2">🎮</div>
          <h2 className="text-2xl font-bold text-white">Modo Máster</h2>
          <p className="text-gray-400 text-sm">Selecciona las herramientas que necesitas</p>
        </div>

        {/* Opciones */}
        <div className="space-y-4">
          <Boton
            color="green"
            className="w-full h-16 text-left flex items-center space-x-4 hover:scale-105 transition-transform"
            onClick={() => onSelect('re4')}
          >
            <div className="text-2xl">🎒</div>
            <div>
              <div className="font-bold">Inventario RE4</div>
              <div className="text-sm opacity-80">Sistema avanzado con grid 10×8</div>
            </div>
          </Boton>

          <Boton
            color="purple"
            className="w-full h-16 text-left flex items-center space-x-4 hover:scale-105 transition-transform"
            onClick={() => onSelect('default')}
          >
            <div className="text-2xl">📋</div>
            <div>
              <div className="font-bold">Herramientas Tradicionales</div>
              <div className="text-sm opacity-80">Gestión de catálogo y habilidades</div>
            </div>
          </Boton>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t border-gray-700 pt-4">
          <p>Fichas de Rol • Versión 2.0</p>
          <p>Sistema mejorado con inventario RE4</p>
        </div>
      </div>
    </div>
  );
};

export default MasterMenu;
