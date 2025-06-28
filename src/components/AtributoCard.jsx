import React from 'react';
import PropTypes from 'prop-types';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export const DADOS = ['D4', 'D6', 'D8', 'D10', 'D12'];

const AtributoCard = ({ name, value, onChange, color, dadoImgUrl }) => {
  const index = DADOS.indexOf(value);
  const prev = () => onChange(DADOS[(index - 1 + DADOS.length) % DADOS.length]);
  const next = () => onChange(DADOS[(index + 1) % DADOS.length]);

  return (
    <div
      className="relative rounded-xl shadow-lg p-4 flex flex-col items-center text-gray-900 transform transition hover:-translate-y-1"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
    >
      <p className="text-lg font-bold capitalize mb-2">{name}</p>
      <div
        className="w-16 h-16 mb-2 flex items-center justify-center relative overflow-hidden rounded-full bg-gradient-to-br from-white/80 via-gray-100/80 to-gray-300/60 shadow-inner border-2 border-white/60"
        style={{ boxShadow: `0 2px 12px 0 ${color}44` }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={value}
            src={dadoImgUrl(value)}
            alt={value}
            className="w-12 h-12 select-none pointer-events-none"
            initial={{ opacity: 0, x: 30, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, duration: 0.25 }}
            draggable={false}
          />
        </AnimatePresence>
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-700 text-white rounded px-2 py-1 text-center mt-1"
      >
        {DADOS.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-900/70 text-white rounded-full p-1"
        onClick={prev}
      >
        <FaChevronLeft />
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900/70 text-white rounded-full p-1"
        onClick={next}
      >
        <FaChevronRight />
      </button>
    </div>
  );
};

AtributoCard.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  color: PropTypes.string,
  dadoImgUrl: PropTypes.func.isRequired,
};

export default AtributoCard;
