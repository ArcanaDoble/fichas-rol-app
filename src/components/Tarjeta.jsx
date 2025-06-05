import React from 'react';

const Tarjeta = ({ children, className = '', Icon }) => {
  return (
    <div className={`relative bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700 shadow-lg transition transform hover:-translate-y-1 hover:shadow-xl ${className}`}>
      {Icon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <Icon className="text-8xl" />
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default Tarjeta;
