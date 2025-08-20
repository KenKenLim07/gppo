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
    // First, get the current user data to preserve existing fields
    const { get } = await import('firebase/database');
    const userRef = ref(realtimeDb, `users/${userId}`);
    const snapshot = await get(userRef);
    
    let existingData = {};
    if (snapshot.exists()) {
      existingData = snapshot.val();
    }
    
    // Update location while preserving all existing data
    await update(userRef, {
      ...existingData, // Preserve all existing fields (including isHiddenFromMap)
      lat,
      lng,
      lastUpdated: timestamp,
      isSharingLocation: true, // Mark user as actively sharing location
    });
    
    console.log("Location updated:", { lat, lng, time: new Date(timestamp).toLocaleTimeString() });
  } catch (error) {
    console.error("Error updating location:", error);
    throw error;
  }
};

export const removeLocationFromFirebase = async (userId: string): Promise<void> => {
  try {
    // First, get the current user data to preserve existing fields
    const { get } = await import('firebase/database');
    const userRef = ref(realtimeDb, `users/${userId}`);
    const snapshot = await get(userRef);
    
    let existingData = {};
    if (snapshot.exists()) {
      existingData = snapshot.val();
    }
    
    // Remove location data and set isSharingLocation to false while preserving other fields
    await update(userRef, {
      ...existingData, // Preserve all existing fields (including isHiddenFromMap)
      isSharingLocation: false, // Mark user as not sharing location
    });
    
    // Remove the location-specific fields
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

export const isLocationRecent = (lastUpdated: number, thresholdMs: number = 300000): boolean => {
  const timeDiff = Date.now() - lastUpdated;
  return timeDiff < thresholdMs; // Default 5 minutes (changed from 2 minutes)
};

// Haversine formula to calculate distance between two lat/lng points in meters
export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
} 