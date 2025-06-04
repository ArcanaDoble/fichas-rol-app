import React from 'react';

const Input = ({ className = '', ...props }) => {
  return (
    <input
      {...props}
      className={`appearance-none bg-gray-700/70 text-white border border-gray-500 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${className}`}
    />
  );
};

export default Input;
