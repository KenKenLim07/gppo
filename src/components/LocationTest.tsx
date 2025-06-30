import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

const LocationTest = () => {
  const [location, setLocation] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    // Gather debug information on component mount
    const gatherDebugInfo = async () => {
      let info = `🔍 Debug Information:\n`;
      info += `Platform: ${Capacitor.isNativePlatform() ? 'Native (Android/iOS)' : 'Web Browser'}\n`;
      info += `User Agent: ${navigator.userAgent}\n`;
      info += `HTTPS: ${window.location.protocol === 'https:' ? 'Yes' : 'No'}\n`;
      info += `Localhost: ${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'Yes' : 'No'}\n`;
      info += `Geolocation Supported: ${navigator.geolocation ? 'Yes' : 'No'}\n`;
      info += `Capacitor Available: ${typeof Capacitor !== 'undefined' ? 'Yes' : 'No'}\n`;
      
      // Check permissions if available
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          info += `Permission State: ${permissionStatus.state}\n`;
        } catch (e) {
          info += `Permission Check Failed: ${e}\n`;
        }
      } else {
        info += `Permission API: Not Supported\n`;
      }

      // Check network connectivity
      info += `Online: ${navigator.onLine ? 'Yes' : 'No'}\n`;
      info += `Connection Type: ${(navigator as any).connection?.effectiveType || 'Unknown'}\n`;
      
      setDebugInfo(info);
    };

    gatherDebugInfo();
  }, []);

  const testCapacitorLocation = async () => {
    setLoading(true);
    setError('');
    setLocation('');

    try {
      // Check if we're on a native platform
      if (Capacitor.isNativePlatform()) {
        console.log('Testing Capacitor Geolocation on native platform');
        
        // Check permissions
        const permissionState = await Geolocation.checkPermissions();
        console.log('Permission state:', permissionState);
        
        if (permissionState.location !== 'granted') {
          const requestResult = await Geolocation.requestPermissions();
          console.log('Permission request result:', requestResult);
          
          if (requestResult.location !== 'granted') {
            setError('Location permission denied');
            return;
          }
        }

        // Get current position
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000
        });

        const locationText = `📍 Capacitor Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}
Accuracy: ${position.coords.accuracy}m
Timestamp: ${new Date(position.timestamp).toLocaleString()}`;
        
        setLocation(locationText);
        console.log('Capacitor location received:', position);
      } else {
        console.log('Testing browser Geolocation (not native platform)');
        
        if (!navigator.geolocation) {
          setError('Geolocation not supported in browser');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationText = `📍 Browser Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}
Accuracy: ${position.coords.accuracy}m
Timestamp: ${new Date(position.timestamp).toLocaleString()}`;
            
            setLocation(locationText);
            console.log('Browser location received:', position);
          },
          (error) => {
            let errorMessage = `Browser geolocation error: ${error.message}\n`;
            errorMessage += `Error Code: ${error.code}\n`;
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += '💡 Solution: Check browser location permissions in settings';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += '💡 Solution: Try moving to an area with better GPS signal';
                break;
              case error.TIMEOUT:
                errorMessage += '💡 Solution: Check internet connection and try again';
                break;
            }
            
            setError(errorMessage);
            console.error('Browser geolocation error:', error);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      console.error('Location test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = () => {
    setLocation('');
    setError('');
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Location Test & Debug
      </h3>
      
      {/* Debug Information */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border">
        <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          System Information
        </h4>
        <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
          {debugInfo}
        </pre>
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          onClick={testCapacitorLocation}
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Getting Location...' : 'Test Location'}
        </button>
        <button
          onClick={clearLocation}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
        >
          Clear
        </button>
      </div>

      {location && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
          <h4 className="text-sm font-semibold mb-2 text-green-800 dark:text-green-200">
            ✅ Location Success
          </h4>
          <pre className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap font-mono">
            {location}
          </pre>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <h4 className="text-sm font-semibold mb-2 text-red-800 dark:text-red-200">
            ❌ Location Error
          </h4>
          <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap font-mono">
            {error}
          </pre>
        </div>
      )}

      {/* Troubleshooting Tips */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
        <h4 className="text-sm font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
          🔧 Troubleshooting Tips
        </h4>
        <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
          <li>• Ensure location permissions are granted in browser settings</li>
          <li>• Try testing outdoors for better GPS signal</li>
          <li>• Check if HTTPS is required for your browser</li>
          <li>• Clear browser cache and permissions if needed</li>
          <li>• For mobile testing, ensure device location is enabled</li>
        </ul>
      </div>
    </div>
  );
};

export default LocationTest; 