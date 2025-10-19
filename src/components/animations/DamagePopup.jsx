import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const VARIANT_DURATION = 1.2; // seconds

const VARIANTS = {
  damage: {
    hidden: { opacity: 0, scale: 0.65, y: 0, rotate: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      scale: [0.65, 1.1, 1],
      y: [0, -36, -68],
      rotate: [0, -4, 0],
      filter: [
        'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
        'drop-shadow(0px 18px 24px rgba(0,0,0,0.5))',
        'drop-shadow(0px 6px 16px rgba(0,0,0,0.25))',
        'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
      ],
      transition: {
        duration: VARIANT_DURATION,
        times: [0, 0.25, 0.75, 1],
        ease: 'easeOut',
      },
    },
  },
  counter: {
    hidden: { opacity: 0, scale: 0.6, y: 0, rotate: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      scale: [0.6, 1.25, 1.1],
      y: [0, -28, -56],
      rotate: [0, 6, 0],
      filter: [
        'drop-shadow(0 0 0 rgba(0,0,0,0))',
        'drop-shadow(0 14px 18px rgba(251,191,36,0.45))',
        'drop-shadow(0 4px 12px rgba(245,158,11,0.35))',
        'drop-shadow(0 0 0 rgba(0,0,0,0))',
      ],
      transition: {
        duration: VARIANT_DURATION,
        times: [0, 0.2, 0.7, 1],
        ease: 'easeOut',
      },
    },
  },
  perfect: {
    hidden: { opacity: 0, scale: 0.7, y: 0, rotate: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      scale: [0.7, 1.3, 1.05],
      y: [0, -32, -64],
      rotate: [0, -8, 0],
      filter: [
        'drop-shadow(0 0 0 rgba(0,0,0,0))',
        'drop-shadow(0 16px 22px rgba(147,197,253,0.5))',
        'drop-shadow(0 8px 18px rgba(59,130,246,0.4))',
        'drop-shadow(0 0 0 rgba(0,0,0,0))',
      ],
      transition: {
        duration: VARIANT_DURATION,
        times: [0, 0.25, 0.65, 1],
        ease: 'easeOut',
      },
    },
  },
  resist: {
    hidden: { opacity: 0, scale: 0.7, y: 0, rotate: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      scale: [0.7, 1.05, 0.95],
      y: [0, -24, -48],
      rotate: [0, 0, 0],
      filter: [
        'drop-shadow(0 0 0 rgba(0,0,0,0))',
        'drop-shadow(0 10px 14px rgba(96,165,250,0.5))',
        'drop-shadow(0 4px 10px rgba(59,130,246,0.35))',
        'drop-shadow(0 0 0 rgba(0,0,0,0))',
      ],
      transition: {
        duration: VARIANT_DURATION,
        times: [0, 0.35, 0.8, 1],
        ease: 'easeOut',
      },
    },
  },
};

const TYPE_THEMES = {
  damage: {
    gradient: 'linear-gradient(135deg, #dc2626, #7f1d1d)',
    border: 'rgba(248, 113, 113, 0.6)',
    textColor: '#fee2e2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path
          d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3z"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  counter: {
    gradient: 'linear-gradient(135deg, #facc15, #f97316)',
    border: 'rgba(250, 204, 21, 0.45)',
    textColor: '#1f2937',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-amber-700">
        <path
          d="M12 3l7 4v6c0 3.87-3.13 7-7 7s-7-3.13-7-7V7l7-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  perfect: {
    gradient: 'linear-gradient(135deg, #60a5fa, #7c3aed)',
    border: 'rgba(147, 197, 253, 0.55)',
    textColor: '#f5f3ff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-indigo-100">
        <path
          d="M12 3l6 4v6l-6 8-6-8V7l6-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9.5 12L11 13.5 14.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  resist: {
    gradient: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
    border: 'rgba(56, 189, 248, 0.45)',
    textColor: '#ecfeff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-sky-100">
        <path
          d="M12 3l7 4v5c0 4.5-3 7-7 9-4-2-7-4.5-7-9V7l7-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

const STAT_LABELS = {
  vida: 'Vida',
  armadura: 'Armadura',
  postura: 'Postura',
  ingenio: 'Ingenio',
};

const DamagePopup = ({ x, y, offset = 0, stat, type, value, onExit }) => {
  const themeKey = type || 'damage';
  const variants = VARIANTS[themeKey] || VARIANTS.damage;
  const theme = TYPE_THEMES[themeKey] || TYPE_THEMES.damage;

  const message = useMemo(() => {
    if (type === 'resist') return '¡Resiste!';
    if (type === 'counter') return '¡Contraataque!';
    if (type === 'perfect') return '¡Bloqueo perfecto!';
    if (typeof value === 'number') {
      const prefix = themeKey === 'damage' ? '-' : '+';
      return `${prefix}${Math.abs(value)}`;
    }
    return `${value ?? ''}`.trim();
  }, [type, value, themeKey]);

  return (
    <motion.div
      className="pointer-events-none"
      initial="hidden"
      animate="visible"
      variants={variants}
      onAnimationComplete={(definition) => {
        if (definition === 'visible' && typeof onExit === 'function') {
          onExit();
        }
      }}
      style={{
        position: 'absolute',
        left: x + offset,
        top: y,
        transform: 'translate(-50%, -90%)',
      }}
    >
      <div
        className="flex items-center gap-2 rounded-full px-3 py-1.5 shadow-lg backdrop-blur"
        style={{
          background: theme.gradient,
          color: theme.textColor,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 10px 25px rgba(0,0,0,0.45)',
        }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
          {theme.icon}
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-wide uppercase">{message}</span>
          {themeKey === 'damage' && STAT_LABELS[stat] ? (
            <span className="text-xs text-white/80">{STAT_LABELS[stat] || ''}</span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

DamagePopup.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  offset: PropTypes.number,
  stat: PropTypes.string,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onExit: PropTypes.func,
};

export default DamagePopup;
