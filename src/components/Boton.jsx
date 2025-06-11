import React from 'react';
import PropTypes from 'prop-types';

const colores = {
  gray: 'bg-gradient-to-b from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500',
  red: 'bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700',
  green: 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
  blue: 'bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
  purple: 'bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
};

const Boton = ({ children, color = 'gray', onClick, className = '', ...props }) => {
  const base = 'px-4 py-2 rounded font-extrabold text-white transition-all duration-300 tracking-wide shadow-md text-lg active:scale-95';
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

Boton.propTypes = {
  children: PropTypes.node,
  color: PropTypes.oneOf(['gray', 'red', 'green', 'blue', 'purple']),
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Boton;
