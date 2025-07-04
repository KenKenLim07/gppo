import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  error?: string | null;
  isLive?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  loading = false,
  label,
  size = 'md',
  className = '',
  error,
  isLive = false,
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-5 w-9',
      handle: 'h-3 w-3',
      translate: checked ? 'translate-x-5' : 'translate-x-0.5',
      text: 'text-xs',
      spinner: 'w-3 h-3',
    },
    md: {
      container: 'h-6 w-11',
      handle: 'h-4 w-4',
      translate: checked ? 'translate-x-6' : 'translate-x-0.5',
      text: 'text-xs',
      spinner: 'w-4 h-4',
    },
    lg: {
      container: 'h-7 w-14',
      handle: 'h-5 w-5',
      translate: checked ? 'translate-x-8' : 'translate-x-0.5',
      text: 'text-sm',
      spinner: 'w-5 h-5',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        {label && (
          <span className={`font-medium text-gray-600 dark:text-gray-400 ${currentSize.text}`}>
            {label}
          </span>
        )}
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onChange}
            disabled={disabled || loading}
            className={`
              relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${currentSize.container} p-0.5
              ${checked 
                ? 'bg-green-600 dark:bg-green-500' 
                : 'bg-gray-300 dark:bg-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${loading ? 'opacity-75' : ''}
            `}
            type="button"
            aria-checked={checked}
            role="switch"
          >
            <span
              className={`
                inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
                ${currentSize.handle} ${currentSize.translate}
              `}
            />
          </button>
          
          {/* Live indicator - always reserve space */}
          <div className={`${currentSize.spinner} flex items-center justify-center`}>
            {checked && isLive && !loading && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
            {loading && (
              <div className={`border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin ${currentSize.spinner}`} />
            )}
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className={`text-red-600 dark:text-red-400 ${currentSize.text} max-w-xs`}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ToggleSwitch; 