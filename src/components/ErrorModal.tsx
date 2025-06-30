import { useEffect, useState } from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
}

const ErrorModal = ({ isOpen, onClose, title, message, type = 'error' }: ErrorModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // Auto-close after 8 seconds for non-critical errors
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        if (type !== 'error') {
          onClose();
        }
      }, 8000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, onClose, type]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-500',
          textColor: 'text-yellow-900',
          borderColor: 'border-yellow-600'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-900',
          borderColor: 'border-blue-600'
        };
      default: // error
        return {
          icon: '❌',
          bgColor: 'bg-red-500',
          textColor: 'text-red-900',
          borderColor: 'border-red-600'
        };
    }
  };

  const { icon, bgColor, textColor, borderColor } = getIconAndColors();

  return (
    <div 
      className={`fixed top-16 left-4 right-4 z-[20000] transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      {/* Compact Toast Notification */}
      <div 
        className={`${bgColor} ${borderColor} border shadow-lg rounded-lg p-3 max-w-sm mx-auto backdrop-blur-sm bg-opacity-95`}
      >
        <div className="flex items-start space-x-2">
          {/* Icon */}
          <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`${textColor} font-semibold text-xs leading-tight mb-1`}>
              {title}
            </h4>
            <p className={`${textColor} text-xs leading-tight opacity-90`}>
              {message}
            </p>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className={`${textColor} hover:opacity-70 transition-opacity flex-shrink-0 ml-2`}
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Progress Bar for Auto-close */}
        {type !== 'error' && (
          <div className="mt-2 h-0.5 bg-black bg-opacity-20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black bg-opacity-40 transition-all duration-8000 ease-linear"
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorModal; 