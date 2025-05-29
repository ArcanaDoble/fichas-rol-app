import React from 'react';

const Input = ({ className = '', ...props }) => {
  return (
    <input
      className={`bg-gray-700 text-white border border-gray-500 rounded px-4 py-2 ${className}`}
      {...props}
    />
  );
};

export default Input;
