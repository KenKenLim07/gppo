import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { ref, update, onValue } from 'firebase/database';
import { realtimeDb } from '../services/firebase';
import { Capacitor } from '@capacitor/core';

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
      const officerRef = ref(realtimeDb, `users/${user.uid}`);
      
      await update(officerRef, {
        status: 'Emergency',
        emergencyTriggeredAt: Date.now(),
        lastUpdated: Date.now()
      });

      setIsTriggered(true);

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
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 border border-red-700 shadow-sm p-0 ${
            isTriggered 
              ? 'bg-red-700 animate-pulse' 
              : 'bg-red-600 hover:bg-red-700 disabled:bg-red-500'
          }`}
          style={isTriggered ? {
            animation: 'staticPulse 0.8s infinite'
          } : {}}
          aria-label="Emergency Alarm"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            // Alarm icon SVG
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19a2 2 0 002-2H10a2 2 0 002 2zm6.364-2.364A9 9 0 003 16.636M21 16.636A9 9 0 006.636 3M17 9V7a5 5 0 00-10 0v2m-2 0h14" />
            </svg>
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
          className="w-8 h-8 bg-red-600 hover:bg-red-700 disabled:bg-red-500 rounded-full shadow flex items-center justify-center transition-all duration-200 relative group animate-pulse border border-red-700 p-0"
          aria-label="Emergency Alarm"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            // Alarm icon SVG
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19a2 2 0 002-2H10a2 2 0 002 2zm6.364-2.364A9 9 0 003 16.636M21 16.636A9 9 0 006.636 3M17 9V7a5 5 0 00-10 0v2m-2 0h14" />
            </svg>
          )}
          {/* Tooltip */}
          <span className="absolute left-1/2 -bottom-7 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg">
            Emergency
          </span>
        </button>
      ) : (
        // Emergency Trigger Button
        <button
          onClick={handleEmergencyTrigger}
          disabled={isLoading}
          className="w-8 h-8 bg-red-600 hover:bg-red-700 disabled:bg-red-500 rounded-full shadow flex items-center justify-center transition-all duration-200 relative group hover:scale-105 active:scale-95 border border-red-700 p-0"
          aria-label="Emergency Alarm"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            // Alarm icon SVG
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19a2 2 0 002-2H10a2 2 0 002 2zm6.364-2.364A9 9 0 003 16.636M21 16.636A9 9 0 006.636 3M17 9V7a5 5 0 00-10 0v2m-2 0h14" />
            </svg>
          )}
          {/* Tooltip */}
          <span className="absolute left-1/2 -bottom-7 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg">
            Emergency
          </span>
        </button>
      )}
    </div>
  );
};

export default EmergencyButton; 