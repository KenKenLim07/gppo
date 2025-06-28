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
    },
    md: {
      container: 'h-6 w-11',
      handle: 'h-4 w-4',
      translate: checked ? 'translate-x-6' : 'translate-x-0.5',
      text: 'text-xs',
    },
    lg: {
      container: 'h-7 w-14',
      handle: 'h-5 w-5',
      translate: checked ? 'translate-x-8' : 'translate-x-0.5',
      text: 'text-sm',
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
        
        <div className="flex items-center space-x-1">
          <span className={`font-medium ${currentSize.text} ${
            checked 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {checked ? 'ON' : 'OFF'}
          </span>
          
          {/* Live indicator */}
          {checked && isLive && (
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 bg-red-500 rounded-full animate-pulse ${currentSize.text === 'text-xs' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}></div>
            </div>
          )}
        </div>
        
        {/* Fixed space for loading spinner to prevent layout shift */}
        <div className={`${currentSize.text === 'text-xs' ? 'w-4 h-4' : currentSize.text === 'text-sm' ? 'w-5 h-5' : 'w-4 h-4'} flex items-center justify-center`}>
          {loading && (
            <div className={`border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin ${
              size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
            }`} />
          )}
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