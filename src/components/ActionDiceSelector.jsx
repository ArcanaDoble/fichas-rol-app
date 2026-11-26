import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ActionDieSvg from './ActionDieSvg';

const DiceSelector = ({ value, onChange, allowUnset = false, disabled = false, ariaLabel, menuAlign }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const diceOptions = ['d4', 'd6', 'd8', 'd10', 'd12'];
  const getFaces = (die) => Number.parseInt(String(die).replace(/\D/g, ''), 10) || 6;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={ariaLabel || value || 'Sin definir'}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-[72px] w-[72px] items-center justify-center transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c8aa6e] disabled:cursor-default disabled:hover:translate-y-0"
      >
        <ActionDieSvg
          faces={getFaces(value)}
          value={value ? getFaces(value) : '?'}
          title={value ? value.toUpperCase() : 'Dado sin definir'}
          className="h-full w-full"
        />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={menuAlign === 'center' ? { left: 'calc(50% - 105px)' } : undefined}
            className={`absolute top-full ${menuAlign ? menuAlign === 'start' ? 'left-0' : menuAlign === 'end' ? 'right-0' : '' : 'left-1/2 -translate-x-1/2'} mt-2 bg-[#0f172a] border border-[#c8aa6e]/40 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50 p-2 grid grid-cols-5 gap-x-1 gap-y-0 w-[210px] backdrop-blur-md`}
          >
            {diceOptions.map((dice) => {
              const gridPos = {
                'd4': 'col-start-1 row-start-1',
                'd10': 'col-start-2 row-start-2',
                'd6': 'col-start-3 row-start-1',
                'd12': 'col-start-4 row-start-2',
                'd8': 'col-start-5 row-start-1',
              }[dice];

              return (
                <button
                  key={dice}
                  type="button"
                  aria-label={dice}
                  onClick={() => {
                    onChange(dice);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all duration-200 group ${gridPos} ${value === dice ? 'bg-[#c8aa6e]/20 border border-[#c8aa6e]/50' : 'hover:bg-[#c8aa6e]/10 border border-transparent'}`}
                >
                  <div className="w-8 h-8 mb-0.5 transition-transform group-hover:scale-110">
                    <ActionDieSvg
                      faces={getFaces(dice)}
                      value={getFaces(dice)}
                      title={dice.toUpperCase()}
                      className="h-full w-full"
                      selected={value === dice}
                    />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-tighter ${value === dice ? 'text-[#c8aa6e]' : 'text-slate-400 group-hover:text-[#c8aa6e]'}`}>
                    {dice.toUpperCase()}
                  </span>
                </button>
              );
            })}
            {allowUnset && (
              <button
                type="button"
                onClick={() => { onChange(null); setIsOpen(false); }}
                className="col-span-5 mt-1 border-t border-[#c8aa6e]/20 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-[#c8aa6e]"
              >
                Sin definir
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default DiceSelector;
