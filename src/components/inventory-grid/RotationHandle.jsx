import React from 'react';

const RotationHandle = ({ onRotate }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onRotate && onRotate();
    }}
    className="absolute -top-2 -right-2 bg-black/50 text-white text-xs px-1 rounded"
  >
    🔄
  </button>
);

export default RotationHandle;
