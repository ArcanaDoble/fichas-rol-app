import React from 'react';

const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-xl p-4 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white font-bold text-xl"
          aria-label="Cerrar"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
