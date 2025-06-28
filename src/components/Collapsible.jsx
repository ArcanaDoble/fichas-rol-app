import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [height, setHeight] = useState(defaultOpen ? 'auto' : '0px');
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? `${contentRef.current.scrollHeight}px` : '0px');
    }
  }, [open, children]);

  return (
    <div className="mb-4 bg-gray-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex justify-between items-center px-4 py-3 text-left font-semibold bg-gray-700 hover:bg-gray-600 transition-all duration-200"
        onClick={() => setOpen(o => !o)}
      >
        <span>{title}</span>
        <span className={`ml-2 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}>
          ▼
        </span>
      </button>
      <div
        ref={contentRef}
        style={{ height }}
        className="transition-all duration-300 ease-in-out overflow-hidden"
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

Collapsible.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  defaultOpen: PropTypes.bool,
};

export default Collapsible;
