import React, { useState } from 'react';
import PropTypes from 'prop-types';

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 bg-gray-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex justify-between items-center px-4 py-3 text-left font-semibold bg-gray-700 hover:bg-gray-600 transition"
        onClick={() => setOpen(o => !o)}
      >
        <span>{title}</span>
        <span className="ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

Collapsible.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  defaultOpen: PropTypes.bool,
};

export default Collapsible;
