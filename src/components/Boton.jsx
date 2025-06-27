import React from 'react';

const colores = {
  gray: 'bg-gradient-to-b from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 focus:ring-gray-500',
  red: 'bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 focus:ring-rose-500',
  green: 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:ring-emerald-500',
  blue: 'bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500',
  purple: 'bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:ring-purple-500',
  yellow: 'bg-gradient-to-b from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 focus:ring-yellow-500',
  indigo: 'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:ring-indigo-500',
  pink: 'bg-gradient-to-b from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 focus:ring-pink-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
};

const Boton = ({
  children,
  color = 'gray',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  onClick,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseClasses = `
    relative inline-flex items-center justify-center
    font-semibold tracking-wide rounded-lg
    transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
    active:scale-95 transform
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    shadow-md hover:shadow-lg
  `;

  // Si hay className personalizado, no aplicar colores por defecto
  const hasCustomColors = className.includes('bg-') || className.includes('text-') || className.includes('hover:bg-');
  
  const colorClasses = hasCustomColors ? '' : colores[color];
  const sizeClasses = sizes[size];

  const handleClick = (e) => {
    if (isDisabled) return;
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${colorClasses}
        ${sizeClasses}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className={`flex items-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </div>
    </button>
  );
};

export default Boton;
