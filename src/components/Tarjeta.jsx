import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

const variantStyles = {
  weapon: {
    icon: '/marcas/Espada.png',
    fallbackIcon: '⚔️',
    gradient: 'from-red-900/20 to-orange-900/20',
    border: 'border-red-700/50 hover:border-red-600/70',
    glow: '',
  },
  armor: {
    icon: '/marcas/Armadura.png',
    fallbackIcon: '🛡️',
    gradient: 'from-blue-900/20 to-cyan-900/20',
    border: 'border-blue-700/50 hover:border-blue-600/70',
    glow: 'hover:shadow-blue-500/20',
  },
  power: {
    icon: '/marcas/Músculo.png',
    fallbackIcon: '💪',
    gradient: 'from-purple-900/20 to-pink-900/20',
    border: 'border-purple-700/50 hover:border-purple-600/70',
    glow: 'hover:shadow-purple-500/20',
  },
  magic: {
    gradient: 'from-amber-200/10 via-purple-900/25 to-slate-900/70',
    border: 'border-amber-400/30 hover:border-amber-300/60',
    glow: 'hover:shadow-[0_18px_45px_rgba(250,204,21,0.25)]',
  },
  default: {
    gradient: 'from-gray-900/20 to-gray-800/20',
    border: 'border-gray-700/50 hover:border-gray-600/70',
    glow: 'hover:shadow-gray-500/20',
  },
};

const expandHex = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  const normalized = hex.trim().toLowerCase();
  if (/^#([0-9a-f]{6})$/.test(normalized)) return normalized;
  if (/^#([0-9a-f]{3})$/.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  return null;
};

const hexToRgb = (hex) => {
  const normalized = expandHex(hex);
  if (!normalized) return null;
  const int = parseInt(normalized.slice(1), 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const mixWithWhite = (rgb, amount = 0.5) => {
  const weight = Math.min(Math.max(amount, 0), 1);
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * weight),
    g: Math.round(rgb.g + (255 - rgb.g) * weight),
    b: Math.round(rgb.b + (255 - rgb.b) * weight),
  };
};

const rgbToRgbaString = (rgb, alpha) =>
  `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${typeof alpha === 'number' ? alpha : 1})`;

const Tarjeta = ({
  children,
  className = '',
  variant,
  interactive = true,
  hoverTransforms = true,
  loading = false,
  onClick,
  header,
  footer,
  style: externalStyle = {},
  rarityColor,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const style = variantStyles[variant] || variantStyles.default;

  const rarityPalette = useMemo(() => {
    if (!rarityColor) return null;
    const rgb = hexToRgb(rarityColor);
    if (!rgb) return null;
    const lightRgb = mixWithWhite(rgb, 0.45);
    const softRgb = mixWithWhite(rgb, 0.7);
    return {
      border: rgbToRgbaString(rgb, 0.55),
      borderHover: rgbToRgbaString(rgb, 0.75),
      shadowSoft: rgbToRgbaString(rgb, 0.28),
      shadowStrong: rgbToRgbaString(rgb, 0.42),
      overlayAccent: rgbToRgbaString(rgb, 0.38),
      overlaySoft: rgbToRgbaString(lightRgb, 0.3),
      overlayTint: rgbToRgbaString(softRgb, 0.2),
    };
  }, [rarityColor]);

  // Crear URL con cache busting para forzar recarga en móviles
  const cacheBust = useMemo(() => Date.now(), []);
  const getImageUrl = useCallback(
    (url) => {
      if (!url) return url;
      // Agregar timestamp una sola vez para evitar múltiples solicitudes
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}v=${cacheBust}`;
    },
    [cacheBust]
  );

  const baseClasses = `
    relative overflow-hidden
    bg-gray-800/80 backdrop-blur-sm
    rounded-xl shadow-lg
    transition-all duration-300 ease-in-out
    border-2
  `;

  const cursorClass = interactive ? 'cursor-pointer' : 'cursor-default';
  const hoverBackgroundClass = rarityPalette
    ? ''
    : 'hover:bg-gradient-to-br hover:from-amber-100/10 hover:via-purple-900/20 hover:to-gray-900/80';
  const transformClass = interactive && hoverTransforms ? 'transform hover:-translate-y-1 hover:scale-[1.015]' : '';
  const glowClass = interactive && !rarityPalette ? style.glow : '';

  const cardClasses = `
    ${baseClasses}
    ${cursorClass}
    ${hoverBackgroundClass}
    ${transformClass}
    ${glowClass}
    ${rarityPalette ? 'border-transparent' : style.border}
    ${className}
    ${
      variant === 'magic'
        ? 'transition-transform duration-500 will-change-transform z-10 sm:z-30 relative backdrop-saturate-150'
        : 'relative'
    }
  `;

  const baseCardStyle = variant === 'magic'
    ? {
        boxShadow: isHovered
          ? '0 22px 45px -18px rgba(250, 204, 21, 0.45), 0 14px 44px rgba(56, 189, 248, 0.25)'
          : '0 16px 40px rgba(8, 7, 21, 0.7)',
        transform: isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
        zIndex: isHovered ? 50 : 10,
        borderRadius: '1.6rem',
        overflow: 'visible',
        minHeight: '340px',
        width: '100%',
        margin: 0,
        height: '100%',
        backgroundImage:
          'radial-gradient(circle at 12% 20%, rgba(250, 204, 21, 0.18), transparent 55%), radial-gradient(circle at 88% 16%, rgba(99, 102, 241, 0.22), transparent 60%), linear-gradient(140deg, rgba(26, 20, 12, 0.95), rgba(9, 10, 20, 0.92))',
        border: '1px solid rgba(250, 204, 21, 0.18)',
      }
    : {
        boxShadow: '0 2px 12px 0 #0006',
        borderRadius: '1rem',
        overflow: 'hidden',
        minHeight: 'unset',
        maxWidth: 'unset',
        margin: 'unset',
      };

  const handleMouseEnter = () => {
    if (interactive) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (interactive) setIsHovered(false);
  };

  const combinedStyle = { ...baseCardStyle, ...externalStyle };

  if (rarityPalette) {
    combinedStyle.borderColor = isHovered
      ? rarityPalette.borderHover
      : rarityPalette.border;
    combinedStyle.boxShadow = isHovered
      ? `0 18px 36px ${rarityPalette.shadowStrong}`
      : `0 12px 28px ${rarityPalette.shadowSoft}`;
    combinedStyle.transition = 'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease';
  }

  return (
    <div
      className={cardClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={combinedStyle}
      tabIndex={0}
      {...props}
    >
      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          rarityPalette
            ? 'transition-opacity duration-300'
            : `bg-gradient-to-br ${style.gradient} ${
                variant === 'magic' ? 'opacity-50' : 'opacity-20'
              }`
        }`}
        style={
          rarityPalette
            ? {
                backgroundImage: `radial-gradient(circle at 18% 16%, ${rarityPalette.overlayAccent}, transparent 58%), radial-gradient(circle at 82% 30%, ${rarityPalette.overlaySoft}, transparent 62%), linear-gradient(135deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.35)), linear-gradient(180deg, ${rarityPalette.overlayTint}, transparent)`,
                opacity: isHovered ? 0.65 : 0.4,
              }
            : undefined
        }
      />

      {/* Animated border glow */}
      {/* {isHovered && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      )} */}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Icon como marca de agua */}
      {style.icon && (
        <>
          {/* Siempre intentar mostrar la imagen PNG primero con cache busting */}
          <img
            src={getImageUrl(style.icon)}
            alt=""
            className={`
              absolute top-3 right-3 w-6 h-6 pointer-events-none z-10
              transition-all duration-300
              ${isHovered ? 'scale-110 opacity-80' : 'opacity-60'}
              ${imageError ? 'hidden' : ''}
            `}
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
          />

          {/* Marca de agua difuminada en el fondo con cache busting */}
          <img
            src={getImageUrl(style.icon)}
            alt=""
            className={`
              absolute inset-0 w-full h-full object-contain opacity-15 pointer-events-none z-0 blur-sm
              ${imageError ? 'hidden' : ''}
            `}
            onError={() => setImageError(true)}
          />

          {/* Fallback con emoji solo si la imagen PNG falla completamente */}
          {imageError && style.fallbackIcon && (
            <>
              {/* Emoji pequeño en la esquina como último recurso */}
              <div
                className={`
                  absolute top-3 right-3 text-lg pointer-events-none z-10
                  transition-all duration-300
                  ${isHovered ? 'scale-110 opacity-80' : 'opacity-60'}
                `}
              >
                {style.fallbackIcon}
              </div>
              {/* Marca de agua emoji difuminada en el fondo como último recurso */}
              <div
                className="absolute bottom-4 right-4 text-8xl opacity-10 pointer-events-none z-0"
                style={{ filter: 'blur(2px)' }}
              >
                {style.fallbackIcon}
              </div>
            </>
          )}
        </>
      )}

      {/* Content */}
      <div className={`relative z-10 ${variant === 'magic' ? 'p-2 sm:p-4 flex flex-col h-full min-h-[260px]' : 'p-3'} `}>
        {header && (
          <div className="mb-2 pb-2 border-b border-gray-600/50 text-center text-base font-bold tracking-wide text-yellow-200 drop-shadow">
            {header}
          </div>
        )}

        <div className={`flex-1 flex flex-col justify-between ${loading ? 'opacity-50' : ''}`}>
          {children}
        </div>

        {footer && (
          <div className="mt-2 pt-2 border-t border-gray-600/50 text-center text-xs text-gray-300">
            {footer}
          </div>
        )}
      </div>

      {/* Shine effect on hover */}
      {/* {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-full animate-pulse" />
      )} */}
    </div>
  );
};

Tarjeta.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.string,
  interactive: PropTypes.bool,
  hoverTransforms: PropTypes.bool,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
  header: PropTypes.node,
  footer: PropTypes.node,
  style: PropTypes.object,
  rarityColor: PropTypes.string,
};

export default Tarjeta;
