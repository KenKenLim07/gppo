import { createContext, useContext, useEffect, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { useAuth } from "./AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { usePeriodicUpdates } from "../hooks/usePeriodicUpdates";
import { 
  updateLocationInFirebase, 
  removeLocationFromFirebase, 
  getLocationErrorMessage,
  isLocationRecent,
  type LocationData 
} from "../utils/locationUtils";

interface LocationContextType {
  isSharingLocation: boolean;
  locationLoading: boolean;
  toggleLocation: () => Promise<void>;
  locationData: LocationData | null;
  locationError: string | null;
  isLive: boolean;
}

const LocationContext = createContext<LocationContextType>({
  isSharingLocation: false,
  locationLoading: false,
  toggleLocation: async () => {},
  locationData: null,
  locationError: null,
  isLive: false,
});

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  const { user } = useAuth();
  const { getLocationWithFallback, startLocationWatching, clearLocationWatching } = useGeolocation();
  const { startPeriodicUpdates, clearPeriodicUpdates } = usePeriodicUpdates();
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const lastLocationTimeRef = useRef<number>(0);
  const lastKnownPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const isSharingRef = useRef(false);
  const currentWatchIdRef = useRef<number | null>(null);

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

  const handleLocationUpdate = async (lat: number, lng: number, timestamp: number) => {
    if (!user) return;
    
    try {
      await updateLocationInFirebase(user.uid, lat, lng, timestamp);
      setLocationData({ lat, lng, lastUpdated: timestamp });
      setIsLive(true);
      lastLocationTimeRef.current = timestamp;
      lastKnownPositionRef.current = { lat, lng };
    } catch (error) {
      console.error("Error updating location:", error);
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
        setLocationError("Location permission denied. Please enable location access in your browser settings.");
        setIsSharingLocation(false);
        isSharingRef.current = false;
        setIsLive(false);
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setLocationError("Location services temporarily unavailable. Retrying...");
        setIsLive(false);
        // Retry after a delay
        retryTimeoutRef.current = setTimeout(() => {
          if (isSharingRef.current) {
            console.log("Retrying location watch after error...");
            startLocationTracking();
          }
        }, 10000); // Retry after 10 seconds
      }
    } else {
      // For first few errors, just show a temporary message
      setLocationError("GPS signal weak. Trying to reconnect...");
      setIsLive(false);
      // Retry after a shorter delay
      retryTimeoutRef.current = setTimeout(() => {
        if (isSharingRef.current) {
          console.log("Retrying location watch after temporary error...");
          startLocationTracking();
        }
      }, 5000); // Retry after 5 seconds
    }
  };

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
        const watchLat = position.coords.latitude;
        const watchLng = position.coords.longitude;
        const currentTime = Date.now();
        
        // Reset error count on successful location
        consecutiveErrorsRef.current = 0;
        setLocationError(null);
        
        // Update Firebase and local state
        handleLocationUpdate(watchLat, watchLng, currentTime);
      },
      handleLocationError
    );

    // Start periodic updates
    console.log("Calling startPeriodicUpdates...");
    startPeriodicUpdates(
      isSharingRef.current,
      lastKnownPositionRef.current,
      handleLocationUpdate
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

  return (
    <LocationContext.Provider value={{
      isSharingLocation,
      locationLoading,
      toggleLocation,
      locationData,
      locationError,
      isLive,
    }}>
      {children}
    </LocationContext.Provider>
  );
}; 