import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { RiDoorOpenLine, RiDoorClosedLine, RiEyeOffLine } from 'react-icons/ri';
import Boton from './Boton';

const WallDoorMenu = ({ wall, onClose, onUpdate }) => {
  const [door, setDoor] = useState(wall.door || 'closed');
  const [color, setColor] = useState(wall.color || '#ff6600');

  useEffect(() => {
    onUpdate({ ...wall, door, color });
  }, [door, color]);

  const content = (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded shadow-xl p-4 space-y-3 w-64">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold">Ajustes de puerta</span>
          <button onClick={onClose} className="text-gray-400 hover:text-red-400">
            <FiX />
          </button>
        </div>
        <div className="space-y-2">
          <Boton
            className="w-full flex items-center justify-between"
            color={door === 'secret' ? 'blue' : 'gray'}
            size="sm"
            onClick={() => setDoor('secret')}
          >
            <span className="flex items-center gap-2">
              <RiDoorClosedLine />
              <RiEyeOffLine />
            </span>
            <span>Puerta Secreta</span>
          </Boton>
          <Boton
            className="w-full flex items-center justify-between"
            color={door === 'closed' ? 'blue' : 'gray'}
            size="sm"
            onClick={() => setDoor('closed')}
          >
            <RiDoorClosedLine />
            <span>Puerta Cerrada</span>
          </Boton>
          <Boton
            className="w-full flex items-center justify-between"
            color={door === 'open' ? 'blue' : 'gray'}
            size="sm"
            onClick={() => setDoor('open')}
          >
            <RiDoorOpenLine />
            <span>Puerta Abierta</span>
          </Boton>
        </div>
        <div>
          <label className="block mb-1">Color del muro</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-8 p-0 border-0"
          />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

WallDoorMenu.propTypes = {
  wall: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    color: PropTypes.string,
    door: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default WallDoorMenu;
