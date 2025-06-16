import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Boton from './Boton';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closable = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  footer,
  className = '',
  overlayClassName = '',
}) => {
  const modalRef = useRef(null);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && closeOnEscape && closable) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEscape, closable, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlay && closable) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black/50 backdrop-blur-sm
        animate-in fade-in duration-200
        ${overlayClassName}
      `}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative w-full ${sizes[size]}
          bg-gray-800 rounded-xl shadow-2xl
          border border-gray-700
          animate-in zoom-in-95 duration-200
          focus:outline-none
          ${className}
        `}
      >
        {/* Header */}
        {(title || closable) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            {title && (
              <h2 className="text-xl font-bold text-white">
                {title}
              </h2>
            )}
            {closable && (
              <button
                onClick={onClose}
                className="
                  p-2 text-gray-400 hover:text-white
                  rounded-lg hover:bg-gray-700
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
                aria-label="Cerrar modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 text-gray-100">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Componente de confirmación
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message = '¿Estás seguro de que quieres continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'red',
  loading = false,
}) => {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Boton
            color="gray"
            onClick={onClose}
            disabled={loading}
            size="md"
          >
            {cancelText}
          </Boton>
          <Boton
            color={confirmColor}
            onClick={handleConfirm}
            loading={loading}
            size="md"
          >
            {confirmText}
          </Boton>
        </>
      }
    >
      <p className="text-gray-300">{message}</p>
    </Modal>
  );
};

// Hook para manejar modales
export const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = React.useState(initialState);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const toggleModal = () => setIsOpen(!isOpen);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
};

export default Modal;
