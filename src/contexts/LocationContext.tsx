import { createContext, useContext, useEffect, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { useAuth } from "./AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { usePeriodicUpdates } from "../hooks/usePeriodicUpdates";
import { backgroundTrackingService } from "../services/backgroundTracking";
import { 
  updateLocationInFirebase, 
  removeLocationFromFirebase, 
  getLocationErrorMessage,
  isLocationRecent,
  type LocationData,
  getDistanceMeters
} from "../utils/locationUtils";

interface LocationContextType {
  isSharingLocation: boolean;
  locationLoading: boolean;
  toggleLocation: () => Promise<void>;
  locationData: LocationData | null;
  locationError: string | null;
  isLive: boolean;
  backgroundTrackingActive: boolean;
  toggleBackgroundTracking: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType>({
  isSharingLocation: false,
  locationLoading: false,
  toggleLocation: async () => {},
  locationData: null,
  locationError: null,
  isLive: false,
  backgroundTrackingActive: false,
  toggleBackgroundTracking: async () => {},
});

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [backgroundTrackingActive, setBackgroundTrackingActive] = useState(false);
  
  const { user } = useAuth();
  const { getLocationWithFallback, startLocationWatching, clearLocationWatching } = useGeolocation();
  const { startPeriodicUpdates, clearPeriodicUpdates } = usePeriodicUpdates();
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const lastLocationTimeRef = useRef<number>(0);
  const lastKnownPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const isSharingRef = useRef(false);
  const currentWatchIdRef = useRef<string | null>(null);
  const positionHistoryRef = useRef<{ lat: number; lng: number; timestamp: number }[]>([]);

  const MIN_MOVEMENT_METERS = 10; // Only update if moved at least 10 meters
  const MAX_ACCEPTABLE_ACCURACY = 50; // Only update if accuracy is better than 50m

  // Smoothing: moving average of last N positions
  const getSmoothedPosition = () => {
    const history = positionHistoryRef.current;
    if (history.length === 0) return null;
    const avgLat = history.reduce((sum, p) => sum + p.lat, 0) / history.length;
    const avgLng = history.reduce((sum, p) => sum + p.lng, 0) / history.length;
    return { lat: avgLat, lng: avgLng };
  };

  // Speed/heading validation
  const MAX_SPEED_MPS = 60; // 216 km/h
  const MAX_TIME_GAP_MS = 10 * 60 * 1000; // 10 minutes
  const isPlausibleMovement = (prev: { lat: number; lng: number; timestamp: number } | null, next: { lat: number; lng: number; timestamp: number }) => {
    if (!prev) return true;
    const timeDeltaMs = next.timestamp - prev.timestamp;
    if (timeDeltaMs > MAX_TIME_GAP_MS) return true; // Accept big jumps after long gaps
    const dist = getDistanceMeters(prev.lat, prev.lng, next.lat, next.lng);
    const speed = dist / (timeDeltaMs / 1000); // m/s
    return speed < MAX_SPEED_MPS;
  };

  // For exponential backoff
  const baseRetryDelay = 5000; // 5 seconds
  const maxRetryDelay = 5 * 60 * 1000; // 5 minutes
  const backoffRef = useRef(baseRetryDelay);

  // For offline queueing
  const OFFLINE_QUEUE_KEY = 'location_offline_queue';
  const enqueueOfflineUpdate = (lat: number, lng: number, timestamp: number) => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({ lat, lng, timestamp });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('[Offline] Queued location update:', { lat, lng, timestamp });
  };
  const flushOfflineQueue = async () => {
    if (!user) return;
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length === 0) return;
    for (const item of queue) {
      try {
        await updateLocationInFirebase(user.uid, item.lat, item.lng, item.timestamp);
        console.log('[Offline] Flushed queued update:', item);
      } catch (err) {
        console.error('[Offline] Failed to flush queued update:', item, err);
        break; // Stop if any fail
      }
    }
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  };

  // Initialize background tracking service on mount
  useEffect(() => {
    const initializeBackgroundTracking = async () => {
      try {
        await backgroundTrackingService.initialize();
        setBackgroundTrackingActive(backgroundTrackingService.isActive());
      } catch (error) {
        console.error('Failed to initialize background tracking:', error);
      }
    };

    initializeBackgroundTracking();
  }, []);

  // Listen for real-time location changes
  useEffect(() => {
    if (!user) {
      setIsSharingLocation(false);
      setLocationData(null);
      setLocationError(null);
      setIsLive(false);
      isSharingRef.current = false;
      return;
    }

    const profileRef = ref(realtimeDb, `users/${user.uid}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Check if location data exists and is valid
        const hasLocation = data.lat && data.lng && 
                          typeof data.lat === 'number' && 
                          typeof data.lng === 'number' &&
                          !isNaN(data.lat) && 
                          !isNaN(data.lng);
        
        setIsSharingLocation(hasLocation);
        isSharingRef.current = hasLocation;
        setLocationData(hasLocation ? { 
          lat: data.lat, 
          lng: data.lng, 
          lastUpdated: data.lastUpdated 
        } : null);
        setLocationError(null);
        
        // Check if location is recent
        if (hasLocation && data.lastUpdated) {
          setIsLive(isLocationRecent(data.lastUpdated));
        } else {
          setIsLive(false);
        }
      } else {
        setIsSharingLocation(false);
        isSharingRef.current = false;
        setLocationData(null);
        setLocationError(null);
        setIsLive(false);
      }
    }, (error) => {
      console.error("Firebase connection error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      clearLocationWatching(currentWatchIdRef.current);
      clearPeriodicUpdates();
    };
  }, [clearLocationWatching, clearPeriodicUpdates]);

  const handleLocationUpdate = async (lat: number, lng: number, timestamp: number, accuracy?: number, forceUpdate: boolean = false) => {
    if (!user) return;
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      console.warn("Invalid coordinates received:", { lat, lng });
      return;
    }

    // Check for accuracy
    if (typeof accuracy === 'number' && accuracy > MAX_ACCEPTABLE_ACCURACY) {
      console.warn('Ignoring update due to poor accuracy:', accuracy);
      return;
    }

    // Check for extreme coordinate changes (likely GPS errors)
    if (!forceUpdate && lastKnownPositionRef.current) {
      const dist = getDistanceMeters(lat, lng, lastKnownPositionRef.current.lat, lastKnownPositionRef.current.lng);
      if (dist < MIN_MOVEMENT_METERS) {
        console.log('Ignoring update, not enough movement:', dist, 'meters');
        return;
      }
      const latDiff = Math.abs(lat - lastKnownPositionRef.current.lat);
      const lngDiff = Math.abs(lng - lastKnownPositionRef.current.lng);
      if (latDiff > 0.1 || lngDiff > 0.1) {
        console.warn("Extreme coordinate change detected, ignoring:", {
          old: lastKnownPositionRef.current,
          new: { lat, lng },
          diff: { latDiff, lngDiff }
        });
        return;
      }
    }

    // Speed/heading validation
    const prev = positionHistoryRef.current.length > 0 ? positionHistoryRef.current[positionHistoryRef.current.length - 1] : null;
    const next = { lat, lng, timestamp };
    if (!isPlausibleMovement(prev, next)) {
      console.warn('Ignoring update due to implausible speed. Prev:', prev, 'Next:', next);
      return;
    }

    // Add to history for smoothing
    positionHistoryRef.current.push({ lat, lng, timestamp });
    if (positionHistoryRef.current.length > 5) positionHistoryRef.current.shift();

    // Use smoothed position
    const smoothed = getSmoothedPosition();
    const finalLat = smoothed ? smoothed.lat : lat;
    const finalLng = smoothed ? smoothed.lng : lng;

    try {
      await updateLocationInFirebase(user.uid, finalLat, finalLng, timestamp);
      setLocationData({ lat: finalLat, lng: finalLng, lastUpdated: timestamp });
      setIsLive(true);
      lastLocationTimeRef.current = timestamp;
      lastKnownPositionRef.current = { lat: finalLat, lng: finalLng };
      
      // Simple auto-unhide: if user is hidden and sharing location, unhide them
      if (user) {
        const { ref, get, set } = await import('firebase/database');
        const userRef = ref(realtimeDb, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.isHiddenFromMap) {
            // Auto-unhide user when they start sharing location
            await set(userRef, {
              ...userData,
              isHiddenFromMap: false
            });
            console.log('User auto-unhidden after resuming duty');
          }
        }
      }
      
      // Try to flush any offline queue if online
      if (navigator.onLine) {
        flushOfflineQueue();
      }
    } catch (error) {
      console.error("Error updating location:", error);
      // If offline, queue the update
      if (!navigator.onLine) {
        enqueueOfflineUpdate(finalLat, finalLng, timestamp);
      }
    }
  };



  const handleLocationError = (error: GeolocationPositionError) => {
    console.error("Error in continuous tracking:", error);
    
    // Increment error count
    consecutiveErrorsRef.current += 1;
    
    // Check if we haven't received location for a while
    const timeSinceLastLocation = Date.now() - lastLocationTimeRef.current;
    if (timeSinceLastLocation > 120000) { // 2 minutes
      setIsLive(false);
    }
    
    // Only show error and potentially stop sharing after multiple consecutive failures
    if (consecutiveErrorsRef.current >= 3) {
      if (error.code === error.PERMISSION_DENIED) {
        setLocationError("Location permission denied. Please enable location access in your browser settings.\nGo to your browser or device settings to re-enable location for this app.");
        setIsSharingLocation(false);
        isSharingRef.current = false;
        setIsLive(false);
        // Optionally, show a UI prompt/modal here for user action
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setLocationError("Location services temporarily unavailable. Retrying...");
        setIsLive(false);
        // Exponential backoff for retries
        retryTimeoutRef.current = setTimeout(() => {
          if (isSharingRef.current) {
            console.log("[Backoff] Retrying location watch after error...");
            startLocationTracking();
            // Increase backoff (up to max)
            backoffRef.current = Math.min(backoffRef.current * 2, maxRetryDelay);
          }
        }, backoffRef.current);
      }
    } else {
      // For first few errors, just show a temporary message
      setLocationError("GPS signal weak. Trying to reconnect...");
      setIsLive(false);
      // Exponential backoff for retries (reset to base for first errors)
      retryTimeoutRef.current = setTimeout(() => {
        if (isSharingRef.current) {
          console.log("[Backoff] Retrying location watch after temporary error...");
          startLocationTracking();
          backoffRef.current = Math.min(backoffRef.current * 2, maxRetryDelay);
        }
      }, backoffRef.current);
    }
  };

  // Listen for online event to flush offline queue
  useEffect(() => {
    const handleOnline = () => {
      flushOfflineQueue();
      backoffRef.current = baseRetryDelay; // Reset backoff on reconnect
  };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const startLocationTracking = () => {
    console.log("startLocationTracking called - user:", !!user, "isSharingRef:", isSharingRef.current);
    
    if (!user || !isSharingRef.current) {
      console.log("startLocationTracking skipped - user or isSharingRef not available");
      return;
    }

    console.log("Starting location tracking...");

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Clear existing watcher
    clearLocationWatching(currentWatchIdRef.current);
    currentWatchIdRef.current = null;

    // Start location watching
    currentWatchIdRef.current = startLocationWatching(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const currentTime = Date.now();
        handleLocationUpdate(latitude, longitude, currentTime, accuracy);
      },
      handleLocationError
    );

    // Start periodic updates (adaptive frequency)
    console.log("Calling startPeriodicUpdates...");
    // Helper to get current speed (m/s) from last two positions
    const getSpeed = () => {
      const h = positionHistoryRef.current;
      if (h.length < 2) return null;
      const prev = h[h.length - 2];
      const curr = h[h.length - 1];
      const dist = getDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng);
      const timeDelta = (curr.timestamp - prev.timestamp) / 1000; // seconds
      if (timeDelta <= 0) return null;
      return dist / timeDelta;
    };
    startPeriodicUpdates(
      isSharingRef.current,
      lastKnownPositionRef.current,
      (lat, lng, timestamp) => handleLocationUpdate(lat, lng, timestamp, 0, true),
      getSpeed
    );
  };

  const toggleLocation = async () => {
    if (!user) {
      console.log("No user found");
      return;
    }
    
    console.log("Toggle clicked. Current state:", { isSharingLocation, locationLoading });
    
    if (isSharingLocation) {
      // Turn off location sharing
      console.log("Turning OFF location sharing");
      setIsSharingLocation(false);
      isSharingRef.current = false;
      setLocationLoading(true);
      setLocationError(null);
      setIsLive(false);
      
      // Clear all timers and watchers
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      clearLocationWatching(currentWatchIdRef.current);
      clearPeriodicUpdates();
      
      currentWatchIdRef.current = null;
      lastKnownPositionRef.current = null;
      
      // Reset error count
      consecutiveErrorsRef.current = 0;
      
      try {
        await removeLocationFromFirebase(user.uid);
        setLocationData(null);
        console.log("Location sharing turned OFF successfully");
      } catch (error) {
        console.error("Error turning off location:", error);
      }
      setLocationLoading(false);
    } else {
      // Turn on location sharing
      console.log("Turning ON location sharing");
      setLocationError(null);
      
      if (!navigator.geolocation) {
        const error = "Geolocation is not supported by this browser";
        console.error(error);
        setLocationError(error);
        return;
      }
      
      setLocationLoading(true);
      setIsSharingLocation(true);
      isSharingRef.current = true;
      
      console.log("Location state set to true, starting geolocation...");
      
      try {
        const position = await getLocationWithFallback();
        console.log("Location received:", position.coords);
        
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const currentTime = Date.now();
        
        await handleLocationUpdate(lat, lng, currentTime);
        console.log("Location saved to Firebase successfully");
        
        // Reset error count on successful start
        consecutiveErrorsRef.current = 0;
        
        // Start continuous tracking
        console.log("About to call startLocationTracking...");
        startLocationTracking();
        console.log("startLocationTracking called successfully");
        
      } catch (error: any) {
        console.error("Error getting initial location:", error);
        
        const errorMessage = getLocationErrorMessage(error);
        setLocationError(errorMessage);
        setIsSharingLocation(false);
        isSharingRef.current = false;
        setIsLive(false);
      }
      
      setLocationLoading(false);
    }
  };

  const toggleBackgroundTracking = async () => {
    if (!user) {
      console.log("No user found for background tracking");
      return;
    }

    try {
      if (backgroundTrackingActive) {
        // Stop background tracking
        await backgroundTrackingService.stopTracking();
        setBackgroundTrackingActive(false);
        console.log("Background tracking stopped");
      } else {
        // Start background tracking
        const hasPermission = await backgroundTrackingService.checkPermissions();
        if (!hasPermission) {
          const granted = await backgroundTrackingService.requestPermissions();
          if (!granted) {
            setLocationError("Background location permission denied");
            return;
          }
        }

        await backgroundTrackingService.startTracking();
        setBackgroundTrackingActive(true);
        console.log("Background tracking started");
      }
    } catch (error: any) {
      console.error("Error toggling background tracking:", error);
      setLocationError(`Background tracking error: ${error.message}`);
    }
  };

  return (
    <LocationContext.Provider value={{
      isSharingLocation,
      locationLoading,
      toggleLocation,
      locationData,
      locationError,
      isLive,
      backgroundTrackingActive,
      toggleBackgroundTracking,
    }}>
      {children}
    </LocationContext.Provider>
  );
}; 