import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

function Collapsible({ title, children, defaultOpen = false, variant = 'default' }) {
  const [open, setOpen] = useState(defaultOpen);
  const [height, setHeight] = useState(defaultOpen ? 'auto' : '0px');
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      const el = contentRef.current;
      const h = `${el.scrollHeight}px`;
      setHeight(h);
      const timer = setTimeout(() => setHeight('auto'), 300);
      return () => clearTimeout(timer);
    }
    setHeight('0px');
  }, [open, children]);

  const isPremium = variant === 'premium';

  const containerClass = isPremium
    ? 'mb-4 bg-[#161f32]/80 backdrop-blur-sm rounded-xl overflow-hidden border border-[#c8aa6e]/20'
    : 'mb-4 bg-gray-800 rounded-xl overflow-hidden';

  const buttonClass = isPremium
    ? "w-full flex justify-between items-center px-5 py-4 text-left font-semibold bg-[#161f32] hover:bg-[#1e293b] transition-all duration-200 text-[#f0e6d2] border-b border-[#c8aa6e]/10"
    : "w-full flex justify-between items-center px-4 py-3 text-left font-semibold bg-gray-700 hover:bg-gray-600 transition-all duration-200";

  const arrowClass = isPremium
    ? `ml-2 transition-transform duration-200 text-[#c8aa6e] ${open ? 'rotate-180' : 'rotate-0'}`
    : `ml-2 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`;

  return (
    <div className={containerClass}>
      <button
        className={buttonClass}
        onClick={() => setOpen(o => !o)}
      >
        <span className={isPremium ? "font-['Cinzel'] tracking-wide" : ""}>{title}</span>
        <span className={arrowClass}>
          ▼
        </span>
      </button>
      <div
        ref={contentRef}
        style={{ height }}
        className="transition-all duration-300 ease-in-out overflow-hidden"
      >
        <div className={isPremium ? "p-5" : "p-4"}>
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
  variant: PropTypes.oneOf(['default', 'premium']),
};

export default Collapsible;

