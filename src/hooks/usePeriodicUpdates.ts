import { useRef, useCallback } from 'react';

interface UsePeriodicUpdatesReturn {
  startPeriodicUpdates: (
    isSharing: boolean,
    lastKnownPosition: { lat: number; lng: number } | null,
    onUpdate: (lat: number, lng: number, timestamp: number) => void,
    getSpeed?: () => number | null
  ) => void;
  clearPeriodicUpdates: () => void;
}

export const usePeriodicUpdates = (): UsePeriodicUpdatesReturn => {
  const periodicUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const lastIntervalMsRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPeriodicUpdates = useCallback((
    isSharing: boolean,
    lastKnownPosition: { lat: number; lng: number } | null,
    onUpdate: (lat: number, lng: number, timestamp: number) => void,
    getSpeed?: () => number | null
  ) => {
    // Clear any existing interval and restart timeout
    if (periodicUpdateRef.current) {
      clearInterval(periodicUpdateRef.current);
      console.log("Cleared existing periodic update interval");
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Helper to determine interval based on speed
    const getIntervalMs = () => {
      if (!getSpeed) return 300000; // fallback 5 min
      const speed = getSpeed();
      if (speed == null) return 300000; // 5 min for stationary users
      if (speed > 5) return 60000; // >18 km/h: 1 min
      if (speed > 1) return 120000; // >3.6 km/h: 2 min
      return 300000; // else: 5 min (changed from 10 min to 5 min for better heartbeat)
    };

    const setupInterval = () => {
      const intervalMs = getIntervalMs();
      lastIntervalMsRef.current = intervalMs;
      
    periodicUpdateRef.current = setInterval(() => {
      if (isSharing && lastKnownPosition) {
        const currentTime = Date.now();
          console.log("[Adaptive] Periodic update triggered at:", new Date(currentTime).toLocaleTimeString());
        onUpdate(lastKnownPosition.lat, lastKnownPosition.lng, currentTime);
      } else {
          console.log("[Adaptive] Periodic update skipped - conditions not met");
      }
        
        // Check if speed category changed, and if so, schedule restart
        const newInterval = getIntervalMs();
        if (newInterval !== lastIntervalMsRef.current) {
          console.log("[Adaptive] Speed category changed, scheduling restart to", newInterval, "ms");
          
          // Clear current interval
          if (periodicUpdateRef.current) {
            clearInterval(periodicUpdateRef.current);
            periodicUpdateRef.current = null;
          }
          
          // Schedule restart after a short delay to avoid conflicts
          restartTimeoutRef.current = setTimeout(() => {
          setupInterval();
          }, 1000); // 1 second delay
        }
      }, intervalMs);
      
      console.log("[Adaptive] Periodic update interval set to", intervalMs, "ms");
    };

    setupInterval();
  }, []);

  const clearPeriodicUpdates = useCallback(() => {
    if (periodicUpdateRef.current) {
      clearInterval(periodicUpdateRef.current);
      periodicUpdateRef.current = null;
      console.log("Cleared periodic update interval");
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
      console.log("Cleared restart timeout");
    }
  }, []);

  return {
    startPeriodicUpdates,
    clearPeriodicUpdates,
  };
}; 