import { useState } from 'react';

interface TurnByTurnDirectionsProps {
  directions: string[];
  googleMapsUrl: string;
  distance: number;
  estimatedTime: number;
  isOpen: boolean;
  onClose: () => void;
}

const TurnByTurnDirections = ({ 
  directions, 
  googleMapsUrl, 
  distance, 
  estimatedTime, 
  isOpen, 
  onClose 
}: TurnByTurnDirectionsProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🧭</span>
            <div>
              <h3 className="text-lg font-bold">Turn-by-Turn Navigation</h3>
              <p className="text-sm text-blue-100">Emergency Response Route</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Route Summary */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {Math.round(distance / 1000 * 10) / 10} km
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Distance</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {estimatedTime} min
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Est. Time</div>
              </div>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
            >
              Open in Maps
            </a>
          </div>
        </div>

        {/* Directions List */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {directions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🧭</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No turn-by-turn directions available</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Use the "Open in Maps" button for navigation
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {directions.map((direction, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                    index === currentStep
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      index === currentStep
                        ? 'text-blue-900 dark:text-blue-100 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {direction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        {directions.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Step {currentStep + 1} of {directions.length}
              </span>
              
              <button
                onClick={() => setCurrentStep(Math.min(directions.length - 1, currentStep + 1))}
                disabled={currentStep === directions.length - 1}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
            >
              Close
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors text-center"
            >
              Start Navigation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurnByTurnDirections; 