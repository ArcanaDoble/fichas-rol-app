import React from 'react';

const Tarjeta = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800 p-4 rounded ${className}`}>
      {children}
    </div>
  );
};

export default Tarjeta;
