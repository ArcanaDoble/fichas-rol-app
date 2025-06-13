import React, { useState } from 'react';

const variantStyles = {
  weapon: {
    icon: '/marcas/espada.png',
    gradient: 'from-red-900/20 to-orange-900/20',
    border: 'border-red-700/50 hover:border-red-600/70',
    glow: 'hover:shadow-red-500/20',
  },
  armor: {
    icon: '/marcas/armadura.png',
    gradient: 'from-blue-900/20 to-cyan-900/20',
    border: 'border-blue-700/50 hover:border-blue-600/70',
    glow: 'hover:shadow-blue-500/20',
  },
  power: {
    icon: '/marcas/musculo.png',
    gradient: 'from-purple-900/20 to-pink-900/20',
    border: 'border-purple-700/50 hover:border-purple-600/70',
    glow: 'hover:shadow-purple-500/20',
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
  const style = variantStyles[variant] || variantStyles.default;

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
    ${style.glow} hover:shadow-xl
  ` : '';

  const cardClasses = `
    ${baseClasses}
    ${interactiveClasses}
    ${style.border}
    ${className}
  `;

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
      {...props}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-50`} />

      {/* Animated border glow */}
      {isHovered && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Icon */}
      {style.icon && (
        <img
          src={style.icon}
          alt=""
          className={`
            absolute top-3 right-3 w-6 h-6 pointer-events-none z-10
            transition-all duration-300
            ${isHovered ? 'scale-110 opacity-80' : 'opacity-60'}
          `}
        />
      )}

      {/* Content */}
      <div className="relative z-10 p-4">
        {header && (
          <div className="mb-3 pb-3 border-b border-gray-600/50">
            {header}
          </div>
        )}

        <div className={loading ? 'opacity-50' : ''}>
          {children}
        </div>

        {footer && (
          <div className="mt-3 pt-3 border-t border-gray-600/50">
            {footer}
          </div>
        )}
      </div>

      {/* Shine effect on hover */}
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-full animate-pulse" />
      )}
    </div>
  );
};

export default Tarjeta;
