import React from 'react';

const variantStyles = {
  weapon: {
    image: '/marcas/Espada.png',
  },
  armor: {
    image: '/marcas/Armadura.png',
  },
  power: {
    image: '/marcas/Músculo.png',
  },
};

const Tarjeta = ({ children, className = '', variant }) => {
  const style = variantStyles[variant] || {};
  return (
    <div
      className={`bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 border border-gray-700 relative overflow-hidden ${className}`}
    >
      {style.image && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <img src={style.image} alt="" className="w-3/4 opacity-20 blur-sm" />
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default Tarjeta;
