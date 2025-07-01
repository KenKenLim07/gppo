import { useRef, useCallback } from 'react';

interface UsePeriodicUpdatesReturn {
  startPeriodicUpdates: (
    isSharing: boolean,
    lastKnownPosition: { lat: number; lng: number } | null,
    onUpdate: (lat: number, lng: number, timestamp: number) => void
  ) => void;
  clearPeriodicUpdates: () => void;
}

export const usePeriodicUpdates = (): UsePeriodicUpdatesReturn => {
  const periodicUpdateRef = useRef<NodeJS.Timeout | null>(null);

  const startPeriodicUpdates = useCallback((
    isSharing: boolean,
    lastKnownPosition: { lat: number; lng: number } | null,
    onUpdate: (lat: number, lng: number, timestamp: number) => void
  ) => {
    // Clear any existing interval
    if (periodicUpdateRef.current) {
      clearInterval(periodicUpdateRef.current);
      console.log("Cleared existing periodic update interval");
    }

    console.log("Starting periodic location updates every 5 minutes...");
    console.log("Current state - isSharing:", isSharing, "lastKnownPosition:", lastKnownPosition);

    // Update location every 5 minutes to keep timestamp fresh
    periodicUpdateRef.current = setInterval(() => {
      console.log("Periodic update check - isSharing:", isSharing, "lastKnownPosition:", lastKnownPosition);
      
      if (isSharing && lastKnownPosition) {
        const currentTime = Date.now();
        console.log("Periodic update triggered at:", new Date(currentTime).toLocaleTimeString());
        
        onUpdate(lastKnownPosition.lat, lastKnownPosition.lng, currentTime);
      } else {
        console.log("Periodic update skipped - conditions not met");
      }
    }, 300000); // Every 5 minutes (300,000 ms)

    console.log("Periodic update interval set with ID:", periodicUpdateRef.current);
  }, []);

  const clearPeriodicUpdates = useCallback(() => {
    if (periodicUpdateRef.current) {
      clearInterval(periodicUpdateRef.current);
      periodicUpdateRef.current = null;
      console.log("Cleared periodic update interval");
    }
  }, []);

  return {
    startPeriodicUpdates,
    clearPeriodicUpdates,
  };
}; 