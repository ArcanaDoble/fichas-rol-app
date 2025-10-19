import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const VARIANT_DURATION = 1.2; // seconds

const FRAME_TRANSITION = {
  duration: VARIANT_DURATION,
  times: [0, 0.33, 0.66, 1],
  ease: 'steps(4, end)',
};

const VARIANTS = {
  damage: {
    hidden: { opacity: 0, scale: 0.75, y: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      scale: [0.75, 1, 1.1, 1],
      y: [0, -10, -20, -26],
      transition: FRAME_TRANSITION,
    },
  },
  counter: {
    hidden: { opacity: 0, scale: 0.7, y: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      scale: [0.7, 1.15, 1.05, 0.95],
      y: [0, -8, -18, -22],
      transition: FRAME_TRANSITION,
    },
  },
  perfect: {
    hidden: { opacity: 0, scale: 0.8, y: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      scale: [0.8, 1.2, 1.05, 1],
      y: [0, -12, -24, -30],
      transition: FRAME_TRANSITION,
    },
  },
  resist: {
    hidden: { opacity: 0, scale: 0.85, y: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      scale: [0.85, 1, 0.95, 0.9],
      y: [0, -6, -16, -20],
      transition: FRAME_TRANSITION,
    },
  },
};

const TYPE_THEMES = {
  damage: {
    backgroundColor: '#a91c1c',
    borderColor: '#450a0a',
    textColor: '#ffe4e6',
    pixelShadow: '2px 2px 0 #000000, 4px 4px 0 #000000',
    iconBackground: '#701a1a',
    iconBorder: '#000000',
    icon: (
      <span aria-hidden className="block text-xs" style={{ lineHeight: 1 }}>
        ✖
      </span>
    ),
  },
  counter: {
    backgroundColor: '#d97706',
    borderColor: '#78350f',
    textColor: '#fff7ed',
    pixelShadow: '2px 2px 0 #000000, 4px 4px 0 #000000',
    iconBackground: '#92400e',
    iconBorder: '#000000',
    icon: (
      <span aria-hidden className="block text-xs" style={{ lineHeight: 1 }}>
        ↺
      </span>
    ),
  },
  perfect: {
    backgroundColor: '#4338ca',
    borderColor: '#1e1b4b',
    textColor: '#ede9fe',
    pixelShadow: '2px 2px 0 #000000, 4px 4px 0 #000000',
    iconBackground: '#312e81',
    iconBorder: '#000000',
    icon: (
      <span aria-hidden className="block text-xs" style={{ lineHeight: 1 }}>
        ★
      </span>
    ),
  },
  resist: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0c4a6e',
    textColor: '#ecfeff',
    pixelShadow: '2px 2px 0 #000000, 4px 4px 0 #000000',
    iconBackground: '#0369a1',
    iconBorder: '#000000',
    icon: (
      <span aria-hidden className="block text-xs" style={{ lineHeight: 1 }}>
        ⛨
      </span>
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
        className="flex items-center gap-2 px-3 py-1.5"
        style={{
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
          border: `1px solid ${theme.borderColor}`,
          boxShadow: theme.pixelShadow,
          fontFamily: '"Press Start 2P", "VT323", "Courier New", monospace',
          imageRendering: 'pixelated',
          letterSpacing: '0.05em',
        }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center"
          style={{
            backgroundColor: theme.iconBackground,
            border: `1px solid ${theme.iconBorder}`,
            boxShadow: '1px 1px 0 #000000',
            imageRendering: 'pixelated',
          }}
        >
          {theme.icon}
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-xs font-semibold uppercase" style={{ imageRendering: 'pixelated' }}>
            {message}
          </span>
          {themeKey === 'damage' && STAT_LABELS[stat] ? (
            <span className="text-[10px] opacity-80" style={{ imageRendering: 'pixelated' }}>
              {STAT_LABELS[stat] || ''}
            </span>
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
