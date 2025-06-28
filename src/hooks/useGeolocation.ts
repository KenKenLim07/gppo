import { useRef, useCallback } from 'react';

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
  ) => number | null;
  clearLocationWatching: (watchId: number | null) => void;
}

export const useGeolocation = (): UseGeolocationReturn => {
  const watchIdRef = useRef<number | null>(null);

  const getLocationWithFallback = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
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
    });
  }, []);

  const startLocationWatching = useCallback((
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationPositionError) => void,
    options: GeolocationOptions = {}
  ): number | null => {
    if (!navigator.geolocation) {
      onError({ code: 2, message: "Geolocation not supported", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
      return null;
    }

    // Clear existing watcher
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const watchOptions = {
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 60000,
      ...options
    };

    console.log("Setting up watchPosition with options:", watchOptions);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        console.log("watchPosition callback triggered");
        onSuccess(position);
      },
      (error) => {
        console.error("Error in continuous tracking:", error);
        onError(error);
      },
      watchOptions
    );

    console.log("watchPosition set up with ID:", watchIdRef.current);
    return watchIdRef.current;
  }, []);

  const clearLocationWatching = useCallback((watchId: number | null) => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      console.log("Cleared location watcher with ID:", watchId);
    }
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      console.log("Cleared existing location watcher");
    }
  }, []);

  return {
    getLocationWithFallback,
    startLocationWatching,
    clearLocationWatching,
  };
}; 