import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import EstadoSelector from './EstadoSelector';

const TokenEstadoMenu = ({ token, onClose, onUpdate }) => {
  const [selected, setSelected] = useState(token.estados || []);

  useEffect(() => {
    onUpdate({ ...token, estados: selected });
  }, [selected]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const content = (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded shadow-xl p-4 max-w-md">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Estados</span>
          <button onClick={onClose} className="text-gray-400 hover:text-red-400">
            <FiX />
          </button>
        </div>
        <EstadoSelector selected={selected} onToggle={toggle} />
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

TokenEstadoMenu.propTypes = {
  token: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default TokenEstadoMenu;
