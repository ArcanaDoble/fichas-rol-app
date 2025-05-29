import React from 'react';

const colores = {
  gray: 'bg-gray-700 hover:bg-gray-600',
  red: 'bg-rose-500 hover:bg-rose-600',
  green: 'bg-emerald-500 hover:bg-emerald-600',
  blue: 'bg-blue-500 hover:bg-blue-600',
  purple: 'bg-purple-500 hover:bg-purple-600',
};

const Boton = ({ children, color = 'gray', onClick, className = '', ...props }) => {
  const base = 'px-4 py-2 rounded font-extrabold text-white transition tracking-wide shadow-sm text-lg';
  return (
    <button
      onClick={onClick}
      className={`w-full ${base} ${colores[color]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Boton;
