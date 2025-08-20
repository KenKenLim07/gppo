import type { Troop } from '../hooks/useTroops';
import { getDistanceMeters } from './locationUtils';

export interface EmergencyRoute {
  emergencyOfficer: Troop;
  nearestOfficer: Troop;
  distance: number;
  route: [number, number][];
  estimatedTime: number; // in minutes
  drivingDistance: number; // actual road distance in meters
  drivingTime: number; // actual driving time in minutes
  turnByTurnDirections: string[];
  googleMapsUrl: string;
}

export interface NavigationLine {
  coordinates: [number, number][];
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
}

// Get driving directions with simple straight-line routing (Google Maps handles actual navigation)
export async function getDrivingDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{
  route: [number, number][];
  distance: number;
  duration: number;
  directions: string[];
  googleMapsUrl: string;
} | null> {
  try {
    // Simple straight-line route (Google Maps will handle actual road routing)
    const route: [number, number][] = [
      [originLat, originLng],
      [destLat, destLng]
    ];
    
    // Calculate straight-line distance
    const distance = getDistanceMeters(originLat, originLng, destLat, destLng);
    
    // Estimate driving time (Google Maps will provide accurate time)
    const averageSpeedKmh = 30; // 30 km/h urban average
    const averageSpeedMs = averageSpeedKmh * 1000 / 3600;
    const drivingTimeSeconds = distance / averageSpeedMs;
    const drivingTimeMinutes = Math.ceil(drivingTimeSeconds / 60);
    
    // Simple directions (Google Maps provides detailed turn-by-turn)
    const directions = [
      "Navigate to emergency location",
      "Follow Google Maps directions"
    ];
    
    // Create Google Maps navigation URL
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
    
    return {
      route,
      distance,
      duration: drivingTimeMinutes,
      directions,
      googleMapsUrl
    };
  } catch (error) {
    console.error('Error generating driving directions:', error);
    return null;
  }
}



// Find the nearest available officer to respond to an emergency
export function findNearestOfficer(
  emergencyOfficer: Troop,
  allOfficers: Troop[],
  excludeOfficers: string[] = []
): Troop | null {
  const availableOfficers = allOfficers.filter(officer => 
    officer.id !== emergencyOfficer.id &&
    !excludeOfficers.includes(officer.id) &&
    officer.lat && officer.lng &&
    officer.status !== 'Unavailable' &&
    !officer.isHiddenFromMap
  );

  if (availableOfficers.length === 0) {
    return null;
  }

  // Calculate distances to all available officers
  const officersWithDistance = availableOfficers.map(officer => ({
    officer,
    distance: getDistanceMeters(
      emergencyOfficer.lat!,
      emergencyOfficer.lng!,
      officer.lat!,
      officer.lng!
    )
  }));

  // Sort by distance and return the nearest
  officersWithDistance.sort((a, b) => a.distance - b.distance);
  return officersWithDistance[0].officer;
}

// Generate a route between two points using a simple straight-line approach
// This is the fallback when Google Directions API is not available
export function generateRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): [number, number][] {
  // For now, return a straight line between points
  // In production, this would call a routing API
  return [
    [startLat, startLng],
    [endLat, endLng]
  ];
}

// Calculate estimated travel time based on distance and average speed
export function calculateEstimatedTime(distanceMeters: number): number {
  // Assume average speed of 30 km/h in urban areas
  const averageSpeedKmh = 30;
  const averageSpeedMs = averageSpeedKmh * 1000 / 3600; // Convert to m/s
  const timeSeconds = distanceMeters / averageSpeedMs;
  return Math.ceil(timeSeconds / 60); // Convert to minutes
}

// Create emergency response route with real driving directions
export async function createEmergencyRoute(
  emergencyOfficer: Troop,
  allOfficers: Troop[]
): Promise<EmergencyRoute | null> {
  if (!emergencyOfficer.lat || !emergencyOfficer.lng) {
    return null;
  }

  const nearestOfficer = findNearestOfficer(emergencyOfficer, allOfficers);
  if (!nearestOfficer || !nearestOfficer.lat || !nearestOfficer.lng) {
    return null;
  }

  // Get enhanced driving directions (works without API key)
  const drivingDirections = await getDrivingDirections(
    nearestOfficer.lat,
    nearestOfficer.lng,
    emergencyOfficer.lat,
    emergencyOfficer.lng
  );

  if (!drivingDirections) {
    return null;
  }

  return {
    emergencyOfficer,
    nearestOfficer,
    distance: getDistanceMeters(
      emergencyOfficer.lat,
      emergencyOfficer.lng,
      nearestOfficer.lat,
      nearestOfficer.lng
    ),
    route: drivingDirections.route,
    estimatedTime: drivingDirections.duration,
    drivingDistance: drivingDirections.distance,
    drivingTime: drivingDirections.duration,
    turnByTurnDirections: drivingDirections.directions,
    googleMapsUrl: drivingDirections.googleMapsUrl
  };
}

// Generate navigation line for map display
export function generateNavigationLine(route: EmergencyRoute): NavigationLine {
  return {
    coordinates: route.route,
    color: '#dc2626', // Red color for emergency
    weight: 4,
    opacity: 0.8,
    dashArray: '10, 5' // Dashed line for navigation
  };
}

// Find multiple nearest officers for backup
export function findNearestOfficers(
  emergencyOfficer: Troop,
  allOfficers: Troop[],
  count: number = 3
): Troop[] {
  const availableOfficers = allOfficers.filter(officer => 
    officer.id !== emergencyOfficer.id &&
    officer.lat && officer.lng &&
    officer.status !== 'Unavailable' &&
    !officer.isHiddenFromMap
  );

  if (availableOfficers.length === 0) {
    return [];
  }

  // Calculate distances to all available officers
  const officersWithDistance = availableOfficers.map(officer => ({
    officer,
    distance: getDistanceMeters(
      emergencyOfficer.lat!,
      emergencyOfficer.lng!,
      officer.lat!,
      officer.lng!
    )
  }));

  // Sort by distance and return the nearest N officers
  officersWithDistance.sort((a, b) => a.distance - b.distance);
  return officersWithDistance.slice(0, count).map(item => item.officer);
}

// Create multiple emergency routes for backup officers
export async function createMultipleEmergencyRoutes(
  emergencyOfficer: Troop,
  allOfficers: Troop[],
  count: number = 3
): Promise<EmergencyRoute[]> {
  const routes: EmergencyRoute[] = [];
  const usedOfficers = new Set<string>();

  for (let i = 0; i < count; i++) {
    const nearestOfficer = findNearestOfficer(
      emergencyOfficer,
      allOfficers,
      Array.from(usedOfficers)
    );

    if (!nearestOfficer) break;

    const route = await createEmergencyRoute(emergencyOfficer, allOfficers);
    if (route) {
      routes.push(route);
      usedOfficers.add(nearestOfficer.id);
    }
  }

  return routes;
}

// Generate different colored navigation lines for multiple routes
export function generateMultipleNavigationLines(routes: EmergencyRoute[]): NavigationLine[] {
  const colors = ['#dc2626', '#ea580c', '#d97706']; // Red, Orange, Amber
  
  return routes.map((route, index) => ({
    coordinates: route.route,
    color: colors[index] || '#dc2626',
    weight: 4 - index, // Decreasing weight for backup routes
    opacity: 0.8 - (index * 0.2), // Decreasing opacity for backup routes
    dashArray: '10, 5'
  }));
} 

// Find all available officers sorted by distance to the emergency
export function findAllActiveOfficersSorted(
  emergencyOfficer: Troop,
  allOfficers: Troop[]
): { officer: Troop, distance: number }[] {
  const availableOfficers = allOfficers.filter(officer => 
    officer.id !== emergencyOfficer.id &&
    officer.lat && officer.lng &&
    officer.status !== 'Unavailable' &&
    !officer.isHiddenFromMap
  );

  // Calculate distances to all available officers
  const officersWithDistance = availableOfficers.map(officer => ({
    officer,
    distance: getDistanceMeters(
      emergencyOfficer.lat!,
      emergencyOfficer.lng!,
      officer.lat!,
      officer.lng!
    )
  }));

  // Sort by distance
  officersWithDistance.sort((a, b) => a.distance - b.distance);
  return officersWithDistance;
} 