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
      <div className="flex items-center space-x-2 w-20">
        <button
          onClick={isTriggered ? handleEmergencyReset : handleEmergencyTrigger}
          disabled={isLoading}
          className={`px-2 py-1 text-white text-xs font-medium rounded transition-all duration-200 w-full ${
            isTriggered 
              ? 'bg-red-700 animate-pulse' 
              : 'bg-red-600 hover:bg-red-700 disabled:bg-red-500'
          }`}
          style={isTriggered ? {
            animation: 'staticPulse 0.8s infinite'
          } : {}}
        >
          {isLoading ? '...' : 'ALARM'}
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
    <div className="fixed bottom-24 right-4 z-50">
      {isTriggered ? (
        // Emergency Active State
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={handleEmergencyReset}
            disabled={isLoading}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 disabled:bg-red-500 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 animate-pulse"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-white text-xl"></span>
            )}
          </button>
          <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            EMERGENCY ACTIVE
          </div>
        </div>
      ) : (
        // Emergency Trigger Button
        <button
          onClick={handleEmergencyTrigger}
          disabled={isLoading}
          className="w-16 h-16 bg-red-600 hover:bg-red-700 disabled:bg-red-500 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="text-white text-xl font-bold"></span>
          )}
        </button>
      )}
    </div>
  );
};

export default EmergencyButton; 