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
    gradient: 'from-yellow-100/10 to-purple-900/30',
    border: 'border-yellow-900/40 hover:border-yellow-400/80',
    glow: '',
  },
  default: {
    gradient: 'from-gray-900/20 to-gray-800/20',
    border: 'border-gray-700/50 hover:border-gray-600/70',
    glow: 'hover:shadow-gray-500/20',
  },
};

const Tarjeta = ({
  children,
  className = '',
  variant,
  interactive = true,
  loading = false,
  onClick,
  header,
  footer,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const style = variantStyles[variant] || variantStyles.default;

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

  const interactiveClasses = interactive ? `
    transform hover:-translate-y-1 hover:scale-[1.02]
    cursor-pointer
    ${style.glow} hover:shadow-lg hover:bg-yellow-100/10 hover:bg-gradient-to-br hover:from-yellow-200/10 hover:to-purple-900/30
  ` : '';

  const cardClasses = `
    ${baseClasses}
    ${interactiveClasses}
    ${style.border}
    ${className}
    ${variant === 'magic' ? 'transition-transform duration-300 will-change-transform z-10 sm:z-30 relative' : 'relative'}
  `;

  const cardStyle = variant === 'magic'
    ? {
        boxShadow: isHovered ? '0 8px 32px 0 #000a, 0 0 0 4px #facc15aa' : '0 2px 12px 0 #0006',
        transform: isHovered ? 'scale(1.04) translateZ(0.1px)' : 'scale(1)',
        zIndex: isHovered ? 50 : 10,
        borderRadius: '1.25rem',
        overflow: 'visible',
        minHeight: '320px',
        maxWidth: '420px',
        margin: 'auto',
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

  return (
    <div
      className={cardClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={cardStyle}
      tabIndex={0}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} ${variant === 'magic' ? 'opacity-50' : 'opacity-20'} pointer-events-none`} />

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
};

export default Tarjeta;
