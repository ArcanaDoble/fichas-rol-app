import React from 'react';

const variantStyles = {
  weapon: {
    border: 'border-red-600',
    icon: '⚔️',
  },
  armor: {
    border: 'border-blue-600',
    icon: '🛡️',
  },
  power: {
    border: 'border-purple-600',
    icon: '✨',
  },
};

const Tarjeta = ({ children, className = '', variant }) => {
  const style = variantStyles[variant] || {};
  return (
    <div
      className={`bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 border-2 ${style.border || 'border-gray-700'} relative ${className}`}
    >
      {style.icon && (
        <span className="absolute top-2 right-2 text-xl pointer-events-none">{style.icon}</span>
      )}
      {children}
    </div>
  );
};

export default Tarjeta;
