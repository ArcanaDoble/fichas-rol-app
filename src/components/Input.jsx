import React from 'react';

const Input = ({ className = '', ...props }) => {
  return (
    <input
      {...props}
      className={`appearance-none bg-gray-700 text-white border border-gray-500 rounded px-4 py-2 ${className}`}
    />
  );
};

export default Input;
