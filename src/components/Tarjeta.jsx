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
      className={`bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 border-2 ${style.border || 'border-gray-700'} relative overflow-hidden ${className}`}
    >
      {style.icon && (
        <span className="absolute inset-0 flex items-center justify-center text-[7rem] sm:text-[8rem] text-white/30 opacity-30 pointer-events-none select-none blur-sm">
          {style.icon}
        </span>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default Tarjeta;
