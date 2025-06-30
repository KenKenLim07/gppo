import { createContext, useContext, useEffect, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { useAuth } from "./AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { usePeriodicUpdates } from "../hooks/usePeriodicUpdates";
import { backgroundTrackingService, requestAllPermissions } from "../services/backgroundTracking";
import { 
  updateLocationInFirebase, 
  removeLocationFromFirebase, 
  isLocationRecent,
  type LocationData,
  getDistanceMeters
} from "../utils/locationUtils";
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

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
  const { /* getLocationWithFallback, */ startLocationWatching, clearLocationWatching } = useGeolocation();
  const { startPeriodicUpdates, clearPeriodicUpdates } = usePeriodicUpdates();
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const lastLocationTimeRef = useRef<number>(0);
  const lastKnownPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const isSharingRef = useRef(false);
  const currentWatchIdRef = useRef<string | null>(null);

  const MIN_MOVEMENT_METERS = 10; // Only update if moved at least 10 meters
  const MAX_ACCEPTABLE_ACCURACY = 50; // Only update if accuracy is better than 50m

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

  const handleLocationUpdate = async (lat: number, lng: number, timestamp: number, accuracy?: number) => {
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
    if (lastKnownPositionRef.current) {
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
        const { latitude, longitude, accuracy } = position.coords;
        const currentTime = Date.now();
        handleLocationUpdate(latitude, longitude, currentTime, accuracy);
      },
      handleLocationError
    );

    // Start periodic updates (every 5 minutes for timestamp freshness, not location)
    console.log("Calling startPeriodicUpdates...");
    startPeriodicUpdates(
      isSharingRef.current,
      lastKnownPositionRef.current,
      (lat, lng, timestamp) => handleLocationUpdate(lat, lng, timestamp, 0) // Pass 0 accuracy for periodic
    );
  };

  // Helper: Get user location with permission checks and improved logging
  async function getUserLocation() {
    if (Capacitor.isNativePlatform()) {
      // Native: Use Capacitor Geolocation
      let perm = await Geolocation.checkPermissions();
      console.log('📋 Location permission status:', JSON.stringify(perm));
      if (perm.location !== 'granted') {
        perm = await Geolocation.requestPermissions();
        console.log('📥 Requested Geo Permissions:', JSON.stringify(perm));
        if (perm.location !== 'granted') {
          alert("Location permission not granted.");
          return null;
        }
      }
      try {
        const coords = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        });
        console.log("📍 Location from Capacitor:", coords);
        return coords;
      } catch (err) {
        let msg = '';
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'object') msg = JSON.stringify(err);
        else msg = String(err);
        console.error("❌ Error getting location:", err, msg);
        alert("Failed to get location: " + msg);
        return null;
      }
    } else if ('geolocation' in navigator) {
      // Web: Use browser geolocation
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("📍 Location from browser:", position);
            resolve(position);
          },
          (err) => {
            let msg = '';
            if (err instanceof Error) msg = err.message;
            else if (typeof err === 'object') msg = JSON.stringify(err);
            else msg = String(err);
            console.error("❌ Error getting location (web):", err, msg);
            alert("Failed to get location: " + msg);
            reject(err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      });
    } else {
      alert("Location API not supported on this platform.");
      return null;
    }
  }

  const toggleLocation = async () => {
    if (!user) {
      console.log("No user found");
      return;
    }
    console.log("Toggle clicked. Current state:", JSON.stringify({ isSharingLocation, locationLoading }));
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
        console.log("Cleared retryTimeoutRef");
      }
      clearLocationWatching(currentWatchIdRef.current);
      console.log("Cleared location watcher");
      clearPeriodicUpdates();
      console.log("Cleared periodic updates");
      currentWatchIdRef.current = null;
      lastKnownPositionRef.current = null;
      // Reset error count
      consecutiveErrorsRef.current = 0;
      try {
        await removeLocationFromFirebase(user.uid);
        setLocationData(null);
        console.log("Location sharing turned OFF successfully");
      } catch (error) {
        console.error("Error turning off location:", error, JSON.stringify(error));
      }
      setLocationLoading(false);
      return;
    }
    // Turn on location sharing
    console.log("Turning ON location sharing");
    setLocationError(null);
    setLocationLoading(true);
    setIsSharingLocation(true);
    isSharingRef.current = true;
    console.log("Location state set to true, starting geolocation...");
    // Use improved permission and location logic
    const position = await getUserLocation();
    if (!position) {
      setIsSharingLocation(false);
      isSharingRef.current = false;
      setIsLive(false);
      setLocationLoading(false);
      return;
    }
    try {
      // Handle both Capacitor and browser geolocation result types
      let lat: number | undefined;
      let lng: number | undefined;
      if (position && typeof position === 'object') {
        if ('coords' in position && position.coords && typeof position.coords === 'object') {
          // Browser geolocation or Capacitor (web)
          lat = (position as any).coords.latitude;
          lng = (position as any).coords.longitude;
        } else if ('latitude' in position && 'longitude' in position) {
          // Capacitor native result
          lat = (position as any).latitude;
          lng = (position as any).longitude;
        }
      }
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new Error('Could not extract latitude/longitude from geolocation result');
      }
      const currentTime = Date.now();
      await handleLocationUpdate(lat, lng, currentTime);
      console.log("Location saved to Firebase successfully");
      // Reset error count on successful start
      consecutiveErrorsRef.current = 0;
      // Start continuous tracking
      console.log("About to call startLocationTracking...");
      startLocationTracking();
      console.log("startLocationTracking called successfully");
    } catch (error) {
      let msg = '';
      if (error instanceof Error) {
        msg = error.message;
      } else if (typeof error === 'object') {
        msg = JSON.stringify(error);
      } else {
        msg = String(error);
      }
      console.error("Error getting initial location:", error, msg);
      setLocationError(msg);
      setIsSharingLocation(false);
      isSharingRef.current = false;
      setIsLive(false);
    }
    setLocationLoading(false);
  };

  const toggleBackgroundTracking = async () => {
    if (!user) {
      console.log("No user found for background tracking");
      return;
    }

    try {
      if (backgroundTrackingActive) {
        console.log("Stopping background tracking...");
        await backgroundTrackingService.stopTracking();
        setBackgroundTrackingActive(false);
        console.log("Background tracking stopped");
        return;
      }

      // 1. Check/request permissions
      let perm;
      try {
        perm = await requestAllPermissions();
        console.log("Permission result:", perm);
      } catch (e) {
        console.error("Error requesting permissions for background tracking:", e);
        setLocationError("Failed to request background location permissions.");
        return;
      }

      // 2. If not granted, guide user to settings (only once)
      if (perm.location !== 'granted' && perm.always !== 'granted') {
        setLocationError("Background location or notification permission denied. Please enable in settings.");
        console.warn("Permission denied for background location or notifications.", perm);
        if (window.confirm("Permission denied. Open app settings to enable?")) {
          await backgroundTrackingService.openSettings();
        }
        return;
      }

      // 3. Start background tracking
      console.log("Starting background tracking...");
      await backgroundTrackingService.startTracking();
      setBackgroundTrackingActive(true);
      console.log("Background tracking started");
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