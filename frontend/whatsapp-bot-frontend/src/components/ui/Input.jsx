import { forwardRef } from 'react';
import { clsx } from 'clsx';

const Input = forwardRef(({ 
  type = 'text', 
  error, 
  label, 
  className = '', 
  disabled = false,
  ...props 
}, ref) => {
  const baseStyles = 'w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed';
  
  const errorStyles = error 
    ? 'border-error-300 text-error-900 focus:ring-error-500 focus:border-error-500' 
    : 'border-gray-300 text-gray-900 focus:ring-primary-500 focus:border-primary-500';

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={clsx(
          baseStyles,
          errorStyles,
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-error-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 