import { useEffect, useRef } from 'react';
import { ref, set, get } from 'firebase/database';
import { realtimeDb } from '../services/firebase';

export const useAppCloseDetection = (userId: string | null, isSharingLocation: boolean) => {
  const gracePeriodRef = useRef<NodeJS.Timeout | null>(null);
  const appCloseTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId || !isSharingLocation) return;

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      // Set app close time
      appCloseTimeRef.current = Date.now();
      
      try {
        // Mark user as app closed but keep location data for grace period
        await set(ref(realtimeDb, `users/${userId}/appClosedAt`), Date.now());
        console.log('App close detected, starting 5-minute grace period');
      } catch (error) {
        console.error('Error setting app close time:', error);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // App went to background
        appCloseTimeRef.current = Date.now();
        try {
          await set(ref(realtimeDb, `users/${userId}/appClosedAt`), Date.now());
          console.log('App backgrounded, starting 5-minute grace period');
        } catch (error) {
          console.error('Error setting app close time:', error);
        }
      } else {
        // App came back to foreground
        if (appCloseTimeRef.current) {
          try {
            // Clear the app close time since user is back
            await set(ref(realtimeDb, `users/${userId}/appClosedAt`), null);
            console.log('App returned to foreground, clearing grace period');
          } catch (error) {
            console.error('Error clearing app close time:', error);
          }
        }
        appCloseTimeRef.current = null;
      }
    };

    // Set up 5-minute grace period timer
    const startGracePeriod = () => {
      if (gracePeriodRef.current) {
        clearTimeout(gracePeriodRef.current);
      }
      
      gracePeriodRef.current = setTimeout(async () => {
        try {
          // First, get the current user data to preserve existing fields
          const userRef = ref(realtimeDb, `users/${userId}`);
          const snapshot = await get(userRef);
          
          let existingData = {};
          if (snapshot.exists()) {
            existingData = snapshot.val();
          }
          
          // After 5 minutes, remove location data
          await set(userRef, {
            ...existingData, // Preserve all existing fields (including isHiddenFromMap)
            lat: null,
            lng: null,
            isSharingLocation: false,
            lastUpdated: null,
            appClosedAt: null,
            gracePeriodExpired: true
          });
          console.log('Grace period expired, user marked as offline');
        } catch (error) {
          console.error('Error expiring grace period:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Listen for app close events
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start grace period if app was already closed
    const checkAppClosedStatus = async () => {
      try {
        const userRef = ref(realtimeDb, `users/${userId}`);
        const snapshot = await import('firebase/database').then(({ get }) => get(userRef));
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.appClosedAt) {
            const timeSinceClose = Date.now() - userData.appClosedAt;
            if (timeSinceClose < 5 * 60 * 1000) {
              // App was closed recently, start grace period
              const remainingTime = (5 * 60 * 1000) - timeSinceClose;
              gracePeriodRef.current = setTimeout(async () => {
                // First, get the current user data to preserve existing fields
                const currentSnapshot = await get(userRef);
                
                let existingData = {};
                if (currentSnapshot.exists()) {
                  existingData = currentSnapshot.val();
                }
                
                await set(userRef, {
                  ...existingData, // Preserve all existing fields (including isHiddenFromMap)
                  lat: null,
                  lng: null,
                  isSharingLocation: false,
                  lastUpdated: null,
                  appClosedAt: null,
                  gracePeriodExpired: true
                });
              }, remainingTime);
            }
          }
        }
      } catch (error) {
        console.error('Error checking app closed status:', error);
      }
    };

    checkAppClosedStatus();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (gracePeriodRef.current) {
        clearTimeout(gracePeriodRef.current);
      }
    };
  }, [userId, isSharingLocation]);
}; 