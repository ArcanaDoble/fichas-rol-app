import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = '', 
  fullScreen = false,
  overlay = false,
  className = '' 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colors = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    red: 'border-red-500',
    purple: 'border-purple-500',
    yellow: 'border-yellow-500',
    white: 'border-white',
    gray: 'border-gray-500',
  };

  const spinnerClasses = `
    ${sizes[size]}
    border-2 border-t-transparent rounded-full animate-spin
    ${colors[color]}
  `;

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50'
    : overlay
    ? 'absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10'
    : `flex items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-3">
        <div className={spinnerClasses}></div>
        {text && (
          <p className="text-gray-300 text-sm font-medium animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

// Componente para mostrar múltiples spinners con diferentes animaciones
export const LoadingDots = ({ color = 'blue', className = '' }) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    white: 'bg-white',
    gray: 'bg-gray-500',
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${colors[color]} animate-bounce`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
};

// Componente para barras de progreso
export const LoadingBar = ({ 
  progress = 0, 
  color = 'blue', 
  height = 'h-2',
  animated = true,
  className = '' 
}) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${height} ${className}`}>
      <div
        className={`
          ${height} ${colors[color]} rounded-full transition-all duration-300 ease-out
          ${animated ? 'animate-pulse' : ''}
        `}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};

// Componente para skeleton loading
export const LoadingSkeleton = ({ 
  lines = 3, 
  className = '',
  animated = true 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`
            h-4 bg-gray-700 rounded
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

export default LoadingSpinner;
