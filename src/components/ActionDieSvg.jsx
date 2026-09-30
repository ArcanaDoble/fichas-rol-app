import React, { useId } from 'react';

const PALETTES = {
  teal: {
    accent: '#7bc7bb',
    accentBright: '#d6f0e8',
    accentDark: '#305e55',
    ember: '#5ca99a',
    numeral: '#e5f6ef',
  },
  arcane: {
    accent: '#a798d6',
    accentBright: '#e0d9ff',
    accentDark: '#51416f',
    ember: '#9683ce',
    numeral: '#f0eaff',
  },
  amber: {
    accent: '#e6a054',
    accentBright: '#ffe0af',
    accentDark: '#8a451d',
    ember: '#e78a32',
    numeral: '#fff0d7',
  },
  gold: {
    accent: '#d7b867',
    accentBright: '#f4dfa4',
    accentDark: '#6f4f1d',
    ember: '#d98b2b',
    numeral: '#fff2c6',
  },
  blue: {
    accent: '#67a9d8',
    accentBright: '#c4e7ff',
    accentDark: '#244d72',
    ember: '#4da9e8',
    numeral: '#e6f6ff',
  },
  red: {
    accent: '#d66a5f',
    accentBright: '#ffc1b7',
    accentDark: '#702d2a',
    ember: '#d34b3f',
    numeral: '#ffe4dd',
  },
  slate: {
    accent: '#64748b',
    accentBright: '#cbd5e1',
    accentDark: '#273244',
    ember: '#64748b',
    numeral: '#d8dee9',
  },
};

const normalizeFaces = (faces) => {
  const parsed = Number.parseInt(String(faces || '').replace(/\D/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 6;
};

const DieGeometry = ({ faces, ids, connectedFaces }) => {
  const shared = {
    fill: `url(#${ids.body})`,
    stroke: `url(#${ids.metal})`,
    strokeWidth: 4,
    strokeLinejoin: 'round',
  };
  const facet = {
    fill: `url(#${ids.facet})`,
    stroke: `url(#${ids.metal})`,
    strokeWidth: 1.35,
    strokeLinejoin: 'round',
  };
  const facetLine = {
    fill: 'none',
    stroke: `url(#${ids.metal})`,
    strokeWidth: 1.15,
    strokeLinejoin: 'round',
    opacity: 0.34,
  };

  if (faces === 20 && connectedFaces) {
    return (
      <>
        <polygon data-d20-outline="connected" points="60,7 110,32 110,88 60,113 10,88 10,32" {...shared} />
        <polygon data-d20-facet="upper-left" points="60,7 10,32 28,39" {...facet} fillOpacity="0.72" />
        <polygon data-d20-facet="upper" points="60,7 28,39 92,39" {...facet} fillOpacity="0.9" />
        <polygon data-d20-facet="upper-right" points="60,7 92,39 110,32" {...facet} fillOpacity="0.78" />
        <polygon data-d20-facet="middle-left" points="10,32 10,88 28,39" {...facet} fillOpacity="0.62" />
        <polygon data-d20-facet="middle-right" points="110,32 92,39 110,88" {...facet} fillOpacity="0.7" />
        <polygon data-d20-facet="center" points="28,39 92,39 60,94" fill={`url(#${ids.body})`} stroke={`url(#${ids.metal})`} strokeWidth="2" strokeLinejoin="round" />
        <polygon data-d20-facet="lower-left" points="28,39 10,88 60,94" {...facet} fillOpacity="0.66" />
        <polygon data-d20-facet="lower-right" points="92,39 60,94 110,88" {...facet} fillOpacity="0.76" />
        <polygon data-d20-facet="base-left" points="10,88 60,113 60,94" {...facet} fillOpacity="0.58" />
        <polygon data-d20-facet="base-right" points="60,94 60,113 110,88" {...facet} fillOpacity="0.7" />
      </>
    );
  }

  switch (faces) {
    case 4:
      return (
        <>
          <polygon points="60,9 108,101 12,101" {...shared} />
          <polygon points="60,9 60,84 108,101" {...facet} opacity="0.58" />
          <polygon points="12,101 60,84 108,101" {...facet} opacity="0.34" />
          <path d="M60 9L60 84M12 101L60 84L108 101" {...facetLine} />
        </>
      );
    case 6:
      return (
        <>
          <path d="M16 31L36 12H102V76L81 99H16Z" {...shared} />
          <polygon points="16,31 36,12 102,12 81,31" {...facet} opacity="0.72" />
          <polygon points="81,31 102,12 102,76 81,99" {...facet} opacity="0.52" />
          <polygon points="16,31 81,31 81,99 16,99" fill={`url(#${ids.body})`} stroke={`url(#${ids.metal})`} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M16 31H81V99M81 31L102 12" {...facetLine} />
        </>
      );
    case 8:
      return (
        <>
          <polygon points="60,7 110,58 60,111 10,58" {...shared} />
          <polygon points="60,7 60,58 10,58" {...facet} opacity="0.68" />
          <polygon points="60,7 110,58 60,58" {...facet} opacity="0.34" />
          <polygon points="10,58 60,58 60,111" {...facet} opacity="0.25" />
          <polygon points="60,58 110,58 60,111" {...facet} opacity="0.5" />
          <path d="M10 58H110M60 7V111" {...facetLine} />
        </>
      );
    case 10:
    case 100:
      return (
        <>
          <polygon points="53,8 6,58 29,53" {...facet} strokeWidth="2.6" fillOpacity="0.72" />
          <polygon points="67,8 114,58 91,53" {...facet} strokeWidth="2.6" fillOpacity="0.86" />
          <polygon points="29,57 8,62 58,114 58,71 32,59" {...facet} strokeWidth="2.6" fillOpacity="0.64" />
          <polygon points="88,59 62,71 62,114 112,62 91,57" {...facet} strokeWidth="2.6" fillOpacity="0.78" />
          <polygon points="60,6 32,54 60,67 88,54" fill={`url(#${ids.body})`} stroke={`url(#${ids.metal})`} strokeWidth="3.2" strokeLinejoin="round" />
        </>
      );
    case 12:
      return (
        <>
          <polygon points="58,33 58,11 31,20 15,43 35,49" {...facet} strokeWidth="2.6" fillOpacity="0.72" />
          <polygon points="106,43 89,20 62,11 62,33 85,49" {...facet} strokeWidth="2.6" fillOpacity="0.86" />
          <polygon points="34,54 13,47 13,75 30,98 42,80" {...facet} strokeWidth="2.6" fillOpacity="0.64" />
          <polygon points="86,54 78,80 90,98 107,75 107,47" {...facet} strokeWidth="2.6" fillOpacity="0.78" />
          <polygon points="46,83 33,100 60,109 87,100 74,83" {...facet} strokeWidth="2.6" fillOpacity="0.7" />
          <polygon points="47,78 74,78 82,53 60,37 38,53" fill={`url(#${ids.body})`} stroke={`url(#${ids.metal})`} strokeWidth="3.2" strokeLinejoin="round" />
        </>
      );
    case 20:
    default:
      return (
        <>
          <polygon data-d20-facet="upper-left" points="8,27 44,4 27,40" {...facet} strokeWidth="2" fillOpacity="0.72" />
          <polygon data-d20-facet="upper" points="60,3 33,42 87,42" {...facet} strokeWidth="2" fillOpacity="0.9" />
          <polygon data-d20-facet="upper-right" points="76,4 112,27 93,40" {...facet} strokeWidth="2" fillOpacity="0.78" />
          <polygon data-d20-facet="middle-left" points="5,36 24,47 5,75" {...facet} strokeWidth="2" fillOpacity="0.62" />
          <polygon data-d20-facet="middle-right" points="115,36 96,47 115,75" {...facet} strokeWidth="2" fillOpacity="0.7" />
          <polygon data-d20-facet="center" points="35,49 85,49 60,90" fill={`url(#${ids.body})`} stroke={`url(#${ids.metal})`} strokeWidth="2.4" strokeLinejoin="round" />
          <polygon data-d20-facet="lower-left" points="29,52 54,95 5,90" {...facet} strokeWidth="2" fillOpacity="0.66" />
          <polygon data-d20-facet="lower-right" points="91,52 66,95 115,90" {...facet} strokeWidth="2" fillOpacity="0.76" />
          <polygon data-d20-facet="base-left" points="8,99 56,104 56,116" {...facet} strokeWidth="2" fillOpacity="0.58" />
          <polygon data-d20-facet="base-right" points="64,104 112,99 64,116" {...facet} strokeWidth="2" fillOpacity="0.7" />
        </>
      );
  }
};

const ActionDieSvg = ({
  faces,
  value,
  className = '',
  title,
  accent = 'gold',
  status = 'available',
  selected = false,
  connectedFaces = false,
}) => {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ids = {
    body: `action-die-body-${reactId}`,
    facet: `action-die-facet-${reactId}`,
    metal: `action-die-metal-${reactId}`,
    glow: `action-die-glow-${reactId}`,
    aura: `action-die-aura-${reactId}`,
  };
  const normalizedFaces = normalizeFaces(faces);
  const palette = PALETTES[status === 'spent' ? 'slate' : accent] || PALETTES.gold;
  const displayValue = value ?? normalizedFaces;
  const textY = normalizedFaces === 20 && connectedFaces ? 58 : normalizedFaces === 4 ? 70 : normalizedFaces === 6 ? 69 : normalizedFaces === 10 ? 43 : normalizedFaces === 12 ? 60 : 64;
  const textX = normalizedFaces === 6 ? 48 : normalizedFaces === 12 ? 59 : 60;
  const fontSize = String(displayValue).length > 1 ? 24 : normalizedFaces === 4 ? 33 : 35;
  const isSpent = status === 'spent';
  const isCommitted = status === 'committed';
  const ariaLabel = title || `D${normalizedFaces} con valor ${displayValue}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={`action-die-svg ${className}`}
      role="img"
      aria-label={ariaLabel}
      data-action-die={normalizedFaces}
      data-die-accent={isSpent ? 'slate' : accent}
    >
      <title>{ariaLabel}</title>
      <defs>
        <linearGradient id={ids.body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={isSpent ? '#1a202b' : '#273247'} />
          <stop offset="0.42" stopColor={isSpent ? '#0f141d' : '#101723'} />
          <stop offset="1" stopColor="#05080e" />
        </linearGradient>
        <radialGradient id={ids.facet} cx="36%" cy="24%" r="88%">
          <stop offset="0" stopColor={isSpent ? '#334155' : palette.accent} stopOpacity={isSpent ? 0.18 : 0.27} />
          <stop offset="0.48" stopColor="#111827" stopOpacity="0.44" />
          <stop offset="1" stopColor="#020409" stopOpacity="0.82" />
        </radialGradient>
        <linearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.accentBright} />
          <stop offset="0.26" stopColor={palette.accent} />
          <stop offset="0.58" stopColor={palette.accentDark} />
          <stop offset="0.82" stopColor={palette.accentBright} />
          <stop offset="1" stopColor={palette.accentDark} />
        </linearGradient>
        <filter id={ids.glow} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation={selected ? 3.5 : 2.1} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={ids.aura} x="-60%" y="-100%" width="220%" height="300%">
          <feGaussianBlur stdDeviation={selected ? 6 : 4} />
        </filter>
      </defs>

      <ellipse
        cx="60"
        cy="106"
        rx={selected ? 34 : 28}
        ry={selected ? 7 : 5}
        fill={palette.ember}
        opacity={isSpent ? 0.06 : selected ? 0.34 : 0.17}
        filter={`url(#${ids.aura})`}
      />
      <g opacity={isSpent ? 0.46 : 1} filter={selected || isCommitted ? `url(#${ids.glow})` : undefined}>
        <DieGeometry faces={normalizedFaces} ids={ids} connectedFaces={connectedFaces} />
        <text
          x={textX}
          y={textY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={palette.numeral}
          stroke={palette.accentDark}
          strokeWidth="1.25"
          paintOrder="stroke"
          fontFamily="Cinzel, Georgia, serif"
          fontSize={fontSize}
          fontWeight="700"
        >
          {displayValue}
        </text>
      </g>
    </svg>
  );
};

export default ActionDieSvg;
