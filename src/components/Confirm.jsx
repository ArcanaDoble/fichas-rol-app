import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Boton from './Boton';

const ConfirmContext = createContext(null);

import { motion, AnimatePresence } from 'framer-motion';

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 flex items-center justify-center bg-black/60 z-[9999] backdrop-blur-[2px]"
  >
    <motion.div
      initial={{ scale: 0.9, y: 20, opacity: 0, filter: 'blur(10px)' }}
      animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
      exit={{ scale: 0.9, y: 10, opacity: 0, filter: 'blur(5px)' }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="bg-[#0b1120]/95 border border-[#c8aa6e]/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-[360px] relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c8aa6e]/50 to-transparent" />

      <p className="text-[#f0e6d2] mb-8 text-center font-['Cinzel'] font-bold text-lg leading-snug tracking-wide lowercase first-letter:uppercase">
        {message}
      </p>

      <div className="flex justify-center gap-4">
        <Boton
          className="w-full px-4 py-2 text-xs font-bold uppercase tracking-widest border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          onClick={onCancel}
        >
          Cancelar
        </Boton>
        <Boton
          className="w-full px-4 py-2 text-xs font-bold uppercase tracking-widest bg-[#c8aa6e] text-[#0b1120] hover:bg-[#d8ba7e] shadow-[0_0_15px_rgba(200,170,110,0.3)] transition-all"
          onClick={onConfirm}
        >
          Aceptar
        </Boton>
      </div>
    </motion.div>
  </motion.div>
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
      <AnimatePresence>
        {state && (
          <ConfirmationModal
            message={state.message}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>
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
