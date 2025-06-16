import React, { useState, forwardRef } from 'react';

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-3 text-lg',
};

const variants = {
  default: 'bg-gray-700/70 border-gray-500 focus:border-blue-500 focus:ring-blue-500',
  success: 'bg-gray-700/70 border-green-500 focus:border-green-400 focus:ring-green-500',
  error: 'bg-gray-700/70 border-red-500 focus:border-red-400 focus:ring-red-500',
  warning: 'bg-gray-700/70 border-yellow-500 focus:border-yellow-400 focus:ring-yellow-500',
};

const Input = forwardRef(({
  className = '',
  size = 'md',
  variant = 'default',
  error,
  success,
  warning,
  label,
  helperText,
  icon,
  iconPosition = 'left',
  loading = false,
  onClear,
  clearable = false,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  // Determinar variante basada en props
  let currentVariant = variant;
  if (error) currentVariant = 'error';
  else if (success) currentVariant = 'success';
  else if (warning) currentVariant = 'warning';

  const baseClasses = `
    appearance-none w-full text-white border rounded-lg
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed
    placeholder-gray-400
  `;

  const sizeClasses = sizes[size];
  const variantClasses = variants[currentVariant];

  const inputClasses = `
    ${baseClasses}
    ${sizeClasses}
    ${variantClasses}
    ${icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''}
    ${clearable && props.value ? 'pr-10' : ''}
    ${className}
  `;

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (props.onChange) {
      props.onChange({ target: { value: '' } });
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
        )}

        <input
          ref={ref}
          {...props}
          className={inputClasses}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />

        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {clearable && props.value && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {icon && iconPosition === 'right' && !loading && !clearable && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
      </div>

      {(helperText || error || success || warning) && (
        <p className={`mt-1 text-sm ${
          error ? 'text-red-400' :
          success ? 'text-green-400' :
          warning ? 'text-yellow-400' :
          'text-gray-400'
        }`}>
          {error || success || warning || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  className: PropTypes.string,
};

export default Input;
