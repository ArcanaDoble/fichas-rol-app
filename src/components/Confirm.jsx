import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Boton from './Boton';

const ConfirmContext = createContext(null);

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-80">
      <p className="text-white mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <Boton className="w-auto px-3 py-1 text-sm" color="gray" onClick={onCancel}>
          Cancelar
        </Boton>
        <Boton className="w-auto px-3 py-1 text-sm" color="red" onClick={onConfirm}>
          Aceptar
        </Boton>
      </div>
    </div>
  </div>
);

ConfirmationModal.propTypes = {
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state.resolve(false);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmationModal
          message={state.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

ConfirmProvider.propTypes = {
  children: PropTypes.node,
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export default ConfirmationModal;
