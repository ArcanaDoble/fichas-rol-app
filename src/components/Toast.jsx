import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
};

const panelVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95, filter: 'blur(8px)' },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    filter: 'blur(4px)',
    transition: { duration: 0.2 }
  }
};

const Toast = ({ toast, onRemove }) => {
  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const colors = {
    success: 'bg-green-600/90 border-green-500/50 text-green-50 shadow-green-900/20',
    error: 'bg-red-600/90 border-red-500/50 text-red-50 shadow-red-900/20',
    warning: 'bg-yellow-600/90 border-yellow-500/50 text-yellow-50 shadow-yellow-900/20',
    info: 'bg-blue-600/90 border-blue-500/50 text-blue-50 shadow-blue-900/20',
  };

  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className={`
        relative flex items-center gap-3 p-4 mb-3
        rounded-xl border backdrop-blur-xl shadow-2xl
        ${colors[toast.type]}
      `}
    >
      <div className="flex-shrink-0">
        {icons[toast.type]}
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-bold text-sm tracking-tight">
            {toast.title}
          </p>
        )}
        <p className="text-sm opacity-90 font-medium leading-tight">
          {toast.message}
        </p>
      </div>

      {toast.dismissible !== false && (
        <button
          onClick={() => onRemove(toast.id)}
          className="
            flex-shrink-0 p-1.5 rounded-full
            hover:bg-white/20 transition-all
            focus:outline-none active:scale-90
          "
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Progress bar para auto-dismiss */}
      {toast.duration && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-xl overflow-hidden">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: toast.duration / 1000, ease: 'linear' }}
            className="h-full bg-white/40"
          />
        </div>
      )}
    </motion.div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return createPortal(
    <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full flex flex-col items-end">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 7000,
      dismissible: true,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove si tiene duración
    if (newToast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, [removeToast]);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Métodos de conveniencia
  const success = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'success' });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'error' });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'warning' });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'info' });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export default Toast;
