import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { RiDoorOpenLine, RiDoorClosedLine, RiEyeOffLine } from 'react-icons/ri';
import Boton from './Boton';
import HexColorInput from './HexColorInput';

const WallDoorMenu = ({ wall, onClose, onUpdate, isMaster = false }) => {
  const [door, setDoor] = useState(wall.door || 'closed');
  const [color, setColor] = useState(wall.color || '#ff6600');
  const [difficulty, setDifficulty] = useState(wall.difficulty || 1);

  const handleDoor = (newDoor) => {
    setDoor(newDoor);
    onUpdate({ ...wall, door: newDoor, color });
  };

  const handleColor = (newColor) => {
    setColor(newColor);
    onUpdate({ ...wall, door, color: newColor });
  };

  const handleDifficulty = (value) => {
    const num = parseInt(value, 10) || 1;
    setDifficulty(num);
    onUpdate({ ...wall, door, color, difficulty: num });
  };

  const handleReset = () => {
    const resetVal = wall.baseDifficulty || 1;
    setDifficulty(resetVal);
    onUpdate({ ...wall, door, color, difficulty: resetVal });
  };

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
            onClick={() => handleDoor('secret')}
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
            onClick={() => handleDoor('closed')}
          >
            <RiDoorClosedLine />
            <span>Puerta Cerrada</span>
          </Boton>
          <Boton
            className="w-full flex items-center justify-between"
            color={door === 'open' ? 'blue' : 'gray'}
            size="sm"
            onClick={() => handleDoor('open')}
          >
            <RiDoorOpenLine />
            <span>Puerta Abierta</span>
          </Boton>
        </div>
        <div>
          <label className="block mb-1">Color del muro</label>
          <HexColorInput value={color} onChange={handleColor} />
        </div>
        {isMaster && (
          <div className="space-y-2">
            <div>
              <label className="block mb-1">Control de dificultad</label>
              <input
                type="number"
                min="1"
                value={difficulty}
                onChange={(e) => handleDifficulty(e.target.value)}
                className="w-full bg-gray-700 text-white"
              />
            </div>
            <Boton className="w-full" size="sm" color="gray" onClick={handleReset}>
              Resetear prueba
            </Boton>
          </div>
        )}
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
    difficulty: PropTypes.number,
    baseDifficulty: PropTypes.number,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  isMaster: PropTypes.bool,
};

export default WallDoorMenu;
