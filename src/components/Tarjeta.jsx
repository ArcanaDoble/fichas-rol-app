import React from 'react';

const Tarjeta = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 ${className}`}>
      {children}
    </div>
  );
};

export default Tarjeta;
