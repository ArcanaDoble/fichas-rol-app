import React from 'react';
import PropTypes from 'prop-types';

const solidColors = {
  gray: 'bg-gradient-to-b from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 focus:ring-gray-500 text-white',
  red: 'bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 focus:ring-rose-500 text-white',
  green: 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:ring-emerald-500 text-white',
  blue: 'bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500 text-white',
  purple: 'bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:ring-purple-500 text-white',
  yellow: 'bg-gradient-to-b from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 focus:ring-yellow-500 text-white',
  indigo: 'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:ring-indigo-500 text-white',
  pink: 'bg-gradient-to-b from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 focus:ring-pink-500 text-white',
  amber: 'bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 focus:ring-amber-500 text-gray-900',
  slate: 'bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 focus:ring-slate-500 text-slate-100',
};

const outlineColors = {
  gray: 'bg-transparent border border-gray-500/50 text-gray-300 hover:bg-gray-500/10 hover:border-gray-400 focus:ring-gray-500',
  red: 'bg-rose-500/5 border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 hover:border-rose-400 hover:text-rose-300 focus:ring-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]',
  blue: 'bg-blue-500/5 border border-blue-500/40 text-blue-400 hover:bg-blue-500/15 hover:border-blue-400 hover:text-blue-300 focus:ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
  green: 'bg-emerald-500/5 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-400 hover:text-emerald-300 focus:ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  purple: 'bg-purple-500/5 border border-purple-500/40 text-purple-400 hover:bg-purple-500/15 hover:border-purple-400 hover:text-purple-300 focus:ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
  amber: 'bg-amber-500/5 border border-amber-500/40 text-amber-400 hover:bg-amber-500/15 hover:border-amber-400 hover:text-amber-300 focus:ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
  slate: 'bg-slate-700/20 border border-slate-600/50 text-slate-300 hover:bg-slate-700/40 hover:border-slate-500 hover:text-slate-200 focus:ring-slate-500',
  indigo: 'bg-indigo-500/5 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-400 hover:text-indigo-300 focus:ring-indigo-500',
  pink: 'bg-pink-500/5 border border-pink-500/40 text-pink-400 hover:bg-pink-500/15 hover:border-pink-400 hover:text-pink-300 focus:ring-pink-500',
  yellow: 'bg-yellow-500/5 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/15 hover:border-yellow-400 hover:text-yellow-300 focus:ring-yellow-500',
};

const ghostColors = {
  gray: 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50',
  red: 'bg-transparent text-rose-400 hover:text-rose-300 hover:bg-rose-500/10',
  blue: 'bg-transparent text-blue-400 hover:text-blue-300 hover:bg-blue-500/10',
  green: 'bg-transparent text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10',
  purple: 'bg-transparent text-purple-400 hover:text-purple-300 hover:bg-purple-500/10',
  amber: 'bg-transparent text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
  slate: 'bg-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-700/50',
  indigo: 'bg-transparent text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10',
  pink: 'bg-transparent text-pink-400 hover:text-pink-300 hover:bg-pink-500/10',
  yellow: 'bg-transparent text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10',
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
  variant = 'solid', // solid, outline, ghost
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
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    ${variant === 'solid' ? 'shadow-md hover:shadow-lg active:scale-95' : 'active:scale-95'}
  `;

  let colorClasses;
  if (variant === 'outline') {
    colorClasses = outlineColors[color] || outlineColors.gray;
  } else if (variant === 'ghost') {
    colorClasses = ghostColors[color] || ghostColors.gray;
  } else {
    colorClasses = solidColors[color] || solidColors.gray;
  }

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
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
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

Boton.propTypes = {
  children: PropTypes.node,
  color: PropTypes.oneOf([
    'gray', 'red', 'green', 'blue', 'purple',
    'yellow', 'indigo', 'pink', 'amber', 'slate',
  ]),
  variant: PropTypes.oneOf(['solid', 'outline', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Boton;
