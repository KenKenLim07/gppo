import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { ref, update, onValue, get } from 'firebase/database';
import { realtimeDb } from '../services/firebase';
import { Capacitor } from '@capacitor/core';
import { createEmergencyRoute, findAllActiveOfficersSorted } from '../utils/emergencyRouting';
import { sendEmergencyNotification } from '../utils/emergencyNotifications';
import type { Troop } from '../hooks/useTroops';
import type { EmergencyRoute } from '../utils/emergencyRouting';

interface EmergencyButtonProps {
  variant?: 'mobile' | 'web';
}

const EmergencyButton = ({ variant = 'mobile' }: EmergencyButtonProps) => {
  const [isTriggered, setIsTriggered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync with Firebase data on component mount
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = ref(realtimeDb, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setIsTriggered(userData.status === 'Emergency');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleEmergencyTrigger = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    setIsLoading(true);
    
    try {
      // First, get current user data to include location
      const userRef = ref(realtimeDb, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      
      if (!userSnapshot.exists()) {
        throw new Error('User data not found');
      }
      
      const userData = userSnapshot.val();
      
      // Get all officers for routing calculation
      const allUsersRef = ref(realtimeDb, 'users');
      const allUsersSnapshot = await get(allUsersRef);
      
      let emergencyRoute: EmergencyRoute | null = null;
      if (allUsersSnapshot.exists() && userData.lat && userData.lng) {
        const allUsers = allUsersSnapshot.val();
        const allOfficers: Troop[] = Object.keys(allUsers).map(uid => ({
          id: uid,
          name: allUsers[uid].name || 'Unknown',
          lat: allUsers[uid].lat,
          lng: allUsers[uid].lng,
          contact: allUsers[uid].contact || '',
          status: allUsers[uid].status || 'Active',
          rank: allUsers[uid].rank || '',
          station: allUsers[uid].station || '',
          badgeNumber: allUsers[uid].badgeNumber || '',
          email: allUsers[uid].email || '',
          lastUpdated: allUsers[uid].lastUpdated,
          emergencyTriggeredAt: allUsers[uid].emergencyTriggeredAt,
          unitType: allUsers[uid].unitType || 'Mobile Patrol',
          callSign: allUsers[uid].callSign || '',
          shift: allUsers[uid].shift || '',
          isHiddenFromMap: allUsers[uid].isHiddenFromMap || false,
          logoutTime: allUsers[uid].logoutTime,
          appClosedAt: allUsers[uid].appClosedAt,
          gracePeriodExpired: allUsers[uid].gracePeriodExpired,
          clearedByAdmin: allUsers[uid].clearedByAdmin,
          clearedAt: allUsers[uid].clearedAt,
        }));
        
        const emergencyOfficer: Troop = {
          id: user.uid,
          name: userData.name || 'Unknown',
          lat: userData.lat,
          lng: userData.lng,
          contact: userData.contact || '',
          status: 'Emergency',
          rank: userData.rank || '',
          station: userData.station || '',
          badgeNumber: userData.badgeNumber || '',
          email: userData.email || '',
          lastUpdated: userData.lastUpdated,
          emergencyTriggeredAt: Date.now(),
          unitType: userData.unitType || 'Mobile Patrol',
          callSign: userData.callSign || '',
          shift: userData.shift || '',
          isHiddenFromMap: userData.isHiddenFromMap || false,
          logoutTime: userData.logoutTime,
          appClosedAt: userData.appClosedAt,
          gracePeriodExpired: userData.gracePeriodExpired,
          clearedByAdmin: userData.clearedByAdmin,
          clearedAt: userData.clearedAt,
        };
        
        // Find all active officers sorted by distance
        const officersSorted = findAllActiveOfficersSorted(emergencyOfficer, allOfficers);
        // The closest officer is officersSorted[0]
        // Notify all, but label the closest
        // Calculate emergency route for the closest officer (for UI/ETA)
        if (officersSorted.length > 0) {
        emergencyRoute = await createEmergencyRoute(emergencyOfficer, allOfficers);
        }
        // Prepare notification data for all active officers
        const notifiedOfficerIds = officersSorted.map(({ officer }) => officer.id);
        // Update user status and include emergency route data
        await update(userRef, {
          status: 'Emergency',
          emergencyTriggeredAt: Date.now(),
          lastUpdated: Date.now(),
          emergencyRoute: emergencyRoute ? {
            nearestOfficerId: emergencyRoute.nearestOfficer.id,
            nearestOfficerName: emergencyRoute.nearestOfficer.name,
            distance: emergencyRoute.distance,
            estimatedTime: emergencyRoute.estimatedTime,
            drivingDistance: emergencyRoute.drivingDistance,
            drivingTime: emergencyRoute.drivingTime,
            routeCoordinates: emergencyRoute.route,
            turnByTurnDirections: emergencyRoute.turnByTurnDirections,
            googleMapsUrl: emergencyRoute.googleMapsUrl
          } : null,
          notifiedOfficerIds // Store all notified officers for reference
        });
        setIsTriggered(true);
        if (emergencyRoute) {
          // Send emergency notification to all active officers
          for (let i = 0; i < officersSorted.length; i++) {
            const { officer } = officersSorted[i];
            const isClosest = i === 0;
            try {
              await sendEmergencyNotification({
                ...emergencyRoute,
                notifiedOfficerId: officer.id,
                isClosest: isClosest
              });
            } catch (error) {
              console.error('Failed to send emergency notification to officer', officer.id, error);
            }
          }
        }

      }
      
      // Update user status and include emergency route data
      await update(userRef, {
        status: 'Emergency',
        emergencyTriggeredAt: Date.now(),
        lastUpdated: Date.now(),
        emergencyRoute: emergencyRoute ? {
          nearestOfficerId: emergencyRoute.nearestOfficer.id,
          nearestOfficerName: emergencyRoute.nearestOfficer.name,
          distance: emergencyRoute.distance,
          estimatedTime: emergencyRoute.estimatedTime,
          drivingDistance: emergencyRoute.drivingDistance,
          drivingTime: emergencyRoute.drivingTime,
          routeCoordinates: emergencyRoute.route,
          turnByTurnDirections: emergencyRoute.turnByTurnDirections,
          googleMapsUrl: emergencyRoute.googleMapsUrl
        } : null
      });

      setIsTriggered(true);
      
      if (emergencyRoute) {
        console.log('Emergency route calculated:', {
          emergencyOfficer: emergencyRoute.emergencyOfficer.name,
          nearestOfficer: emergencyRoute.nearestOfficer.name,
          distance: `${Math.round(emergencyRoute.distance / 1000 * 10) / 10} km`,
          estimatedTime: `${emergencyRoute.estimatedTime} minutes`
        });

        // Remove the old notification block that sends to only the nearest officer
        // if (emergencyRoute) {
        //   try {
        //     const notificationId = await sendEmergencyNotification(emergencyRoute);
        //     // Log the emergency response action
        //     await logEmergencyResponse(
        //       emergencyRoute.emergencyOfficer.id,
        //       emergencyRoute.nearestOfficer.id,
        //       'notification_sent',
        //       {
        //         notificationId,
        //         distance: emergencyRoute.distance,
        //         estimatedTime: emergencyRoute.estimatedTime
        //       }
        //     );
        //     console.log('Emergency notification sent successfully:', notificationId);
        //   } catch (error) {
        //     console.error('Failed to send emergency notification:', error);
        //   }
        // }
      }

    } catch (error) {
      console.error('Error triggering emergency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyReset = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);
    
    try {
      const officerRef = ref(realtimeDb, `users/${user.uid}`);
      
      await update(officerRef, {
        status: 'Active',
        emergencyTriggeredAt: null,
        emergencyRoute: null,
        lastUpdated: Date.now()
      });

      setIsTriggered(false);
    } catch (error) {
      console.error('Error resetting emergency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show on mobile/native platforms for mobile variant
  if (variant === 'mobile' && !Capacitor.isNativePlatform()) {
    return null;
  }

  if (variant === 'web') {
    return (
      <div className="flex items-center space-x-1 w-12">
        <button
          onClick={isTriggered ? handleEmergencyReset : handleEmergencyTrigger}
          disabled={isLoading}
          className={`w-12 h-8 flex items-center justify-center rounded-full transition-all duration-200 border border-red-700 shadow-sm p-0 ${
            isTriggered 
              ? 'bg-red-700 animate-pulse' 
              : 'bg-red-600 hover:bg-red-700 disabled:bg-red-500'
          }`}
          style={isTriggered ? {
            animation: 'staticPulse 0.8s infinite'
          } : {}}
          aria-label="SOS"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="font-bold text-white text-xs tracking-widest">SOS</span>
          )}
        </button>
        {isTriggered && (
          <style>{`
            @keyframes staticPulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-24 right-4 z-[10001]">
      {isTriggered ? (
        // Emergency Active State
          <button
            onClick={handleEmergencyReset}
            disabled={isLoading}
          className="w-12 h-8 bg-red-600 hover:bg-red-700 disabled:bg-red-500 rounded-full shadow flex items-center justify-center transition-all duration-200 relative group animate-pulse border border-red-700 p-0"
          aria-label="SOS"
          >
            {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
            <span className="font-bold text-white text-xs tracking-widest">SOS</span>
            )}
          {/* Tooltip */}
          <span className="absolute left-1/2 -bottom-7 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg">
            SOS
          </span>
          </button>
      ) : (
        // Emergency Trigger Button
        <button
          onClick={handleEmergencyTrigger}
          disabled={isLoading}
          className="w-12 h-8 bg-red-600 hover:bg-red-700 disabled:bg-red-500 rounded-full shadow flex items-center justify-center transition-all duration-200 relative group hover:scale-105 active:scale-95 border border-red-700 p-0"
          aria-label="SOS"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="font-bold text-white text-xs tracking-widest">SOS</span>
          )}
          {/* Tooltip */}
          <span className="absolute left-1/2 -bottom-7 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg">
            SOS
          </span>
        </button>
      )}
    </div>
  );
};

export default EmergencyButton; 