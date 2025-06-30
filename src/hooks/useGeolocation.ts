import { useRef, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseGeolocationReturn {
  getLocationWithFallback: () => Promise<GeolocationPosition>;
  startLocationWatching: (
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationPositionError) => void,
    options?: GeolocationOptions
  ) => string | null;
  clearLocationWatching: (watchId: string | null) => void;
}

export const useGeolocation = (): UseGeolocationReturn => {
  const watchIdRef = useRef<string | null>(null);

  const getLocationWithFallback = useCallback((): Promise<GeolocationPosition> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if Capacitor is available (mobile app)
        if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
          console.log('Using Capacitor Geolocation');
          
          // Request permissions first
          const permissionState = await Geolocation.checkPermissions();
          if (permissionState.location !== 'granted') {
            const requestResult = await Geolocation.requestPermissions();
            if (requestResult.location !== 'granted') {
              reject(new Error('Location permission denied'));
              return;
            }
          }

          // Get current position with Capacitor
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
          });

          // For Capacitor, we'll use the browser geolocation to get a proper GeolocationPosition
          // This is a workaround for the type compatibility issue
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              resolve,
              (error) => reject(error),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
            );
          } else {
            reject(new Error("Geolocation not supported"));
          }

          console.log('📍 Capacitor location received:', position.coords.latitude, position.coords.longitude);
        } else {
          // Fallback to browser geolocation for web
          console.log('Using browser Geolocation (fallback)');
          
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported"));
            return;
          }

          // Try high accuracy first
          const highAccuracyOptions = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
          };

          // Try low accuracy as fallback
          const lowAccuracyOptions = {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 60000
          };

          const tryHighAccuracy = () => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              (error) => {
                console.log("High accuracy failed, trying low accuracy:", error.message);
                // If high accuracy fails, try low accuracy
                navigator.geolocation.getCurrentPosition(
                  resolve,
                  (lowAccuracyError) => {
                    console.log("Low accuracy also failed:", lowAccuracyError.message);
                    reject(lowAccuracyError);
                  },
                  lowAccuracyOptions
                );
              },
              highAccuracyOptions
            );
          };

          tryHighAccuracy();
        }
      } catch (error: any) {
        console.error('Error getting location:', error);
        reject(error);
      }
    });
  }, []);

  const startLocationWatching = useCallback((
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationPositionError) => void,
    options: GeolocationOptions = {}
  ): string | null => {
    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 30000,
      ...options
    };

    console.log("Setting up location watching with options:", watchOptions);

    // Check if Capacitor is available (mobile app)
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
      console.log('Using Capacitor watchPosition');
      
      // Clear existing watcher
      if (watchIdRef.current) {
        Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }

      // For Capacitor, we'll use browser geolocation for consistency
      // This ensures we get proper GeolocationPosition objects
      if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            console.log("Capacitor watchPosition callback triggered");
            onSuccess(position);
          },
          (error) => {
            console.error("Error in Capacitor continuous tracking:", error);
            onError(error);
          },
          watchOptions
        );

        watchIdRef.current = watchId.toString();
        console.log("Capacitor watchPosition set up with ID:", watchId);
        return watchIdRef.current;
      } else {
        onError({ code: 2, message: "Geolocation not supported", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        return null;
      }
    } else {
      // Fallback to browser geolocation for web
      console.log('Using browser watchPosition (fallback)');
      
      if (!navigator.geolocation) {
        onError({ code: 2, message: "Geolocation not supported", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        return null;
      }

      // Clear existing watcher
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
        watchIdRef.current = null;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log("Browser watchPosition callback triggered");
          onSuccess(position);
        },
        (error) => {
          console.error("Error in browser continuous tracking:", error);
          onError(error);
        },
        watchOptions
      );

      watchIdRef.current = watchId.toString();
      console.log("Browser watchPosition set up with ID:", watchId);
      return watchIdRef.current;
    }
  }, []);

  const clearLocationWatching = useCallback((watchId: string | null) => {
    if (watchId) {
      if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
        Geolocation.clearWatch({ id: watchId });
        console.log("Cleared Capacitor location watcher with ID:", watchId);
      } else {
        navigator.geolocation.clearWatch(parseInt(watchId));
        console.log("Cleared browser location watcher with ID:", watchId);
      }
    }
    if (watchIdRef.current) {
      if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
        Geolocation.clearWatch({ id: watchIdRef.current });
        console.log("Cleared existing Capacitor location watcher");
      } else {
        navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
        console.log("Cleared existing browser location watcher");
      }
      watchIdRef.current = null;
    }
  }, []);

  return {
    getLocationWithFallback,
    startLocationWatching,
    clearLocationWatching,
  };
}; 