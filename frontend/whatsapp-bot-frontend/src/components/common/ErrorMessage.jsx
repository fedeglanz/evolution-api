import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ErrorMessage = ({ 
  message = 'Ha ocurrido un error inesperado', 
  onRetry, 
  retryText = 'Reintentar',
  className = '',
  variant = 'default' 
}) => {
  const variantClasses = {
    default: 'bg-red-50 border-red-200 text-red-800',
    minimal: 'bg-transparent border-transparent text-red-600',
    card: 'bg-white border-red-200 text-red-800 shadow-sm'
  };

  return (
    <div className={`border rounded-lg p-4 ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon 
            className={`h-5 w-5 ${
              variant === 'minimal' ? 'text-red-500' : 'text-red-400'
            }`} 
          />
        </div>
        
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${
            variant === 'minimal' ? 'text-red-600' : 'text-red-800'
          }`}>
            {message}
          </p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-2 inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                variant === 'minimal' 
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                  : 'text-red-700 bg-red-100 hover:bg-red-200'
              }`}
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              {retryText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage; 