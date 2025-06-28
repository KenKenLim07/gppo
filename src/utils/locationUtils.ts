import { update, remove, ref } from "firebase/database";
import { realtimeDb } from "../services/firebase";

export interface LocationData {
  lat: number;
  lng: number;
  lastUpdated: number;
}

export const updateLocationInFirebase = async (
  userId: string,
  lat: number,
  lng: number,
  timestamp: number
): Promise<void> => {
  try {
    await update(ref(realtimeDb, `users/${userId}`), {
      lat,
      lng,
      lastUpdated: timestamp,
    });
    
    console.log("Location updated:", { lat, lng, time: new Date(timestamp).toLocaleTimeString() });
  } catch (error) {
    console.error("Error updating location:", error);
    throw error;
  }
};

export const removeLocationFromFirebase = async (userId: string): Promise<void> => {
  try {
    const locationRef = ref(realtimeDb, `users/${userId}/lat`);
    const lngRef = ref(realtimeDb, `users/${userId}/lng`);
    const lastUpdatedRef = ref(realtimeDb, `users/${userId}/lastUpdated`);
    
    await Promise.all([
      remove(locationRef),
      remove(lngRef),
      remove(lastUpdatedRef)
    ]);
    
    console.log("Location removed from Firebase successfully");
  } catch (error) {
    console.error("Error removing location:", error);
    throw error;
  }
};

export const getLocationErrorMessage = (error: GeolocationPositionError): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Please enable location access in your browser settings.";
    case error.POSITION_UNAVAILABLE:
      return "Location services temporarily unavailable. Please try again.";
    case error.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return "Failed to get location";
  }
};

export const isLocationRecent = (lastUpdated: number, thresholdMs: number = 120000): boolean => {
  const timeDiff = Date.now() - lastUpdated;
  return timeDiff < thresholdMs; // Default 2 minutes
}; 