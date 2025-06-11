import React from 'react';
import PropTypes from 'prop-types';
import Boton from './Boton';

const MasterMenu = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs bg-gray-800 rounded-xl shadow-xl p-8 space-y-4">
        <h2 className="text-xl font-bold text-center text-white">Selecciona vista</h2>
        <Boton color="green" className="w-full" onClick={() => onSelect('re4')}>
          🧳 Inventario RE4 (prototipo)
        </Boton>
        <Boton color="purple" className="w-full" onClick={() => onSelect('default')}>
          📋 Herramientas tradicionales
        </Boton>
      </div>
    </div>
  );
};

MasterMenu.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export default MasterMenu;
