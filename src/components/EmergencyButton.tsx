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

  // Redesigned floating button: now inherits position from parent
  return (
    <div>
      <button
        onClick={isTriggered ? handleEmergencyReset : handleEmergencyTrigger}
        disabled={isLoading}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          ${isTriggered ? 'bg-red-700 text-white animate-pulse' : 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-500'}`}
        style={isTriggered ? { animation: 'staticPulse 0.8s infinite' } : {}}
        aria-label={isTriggered ? 'Reset Emergency' : 'Trigger Emergency'}
      >
        {/* Icon */}
        <span className="text-lg mr-1">🚨</span>
        {/* Label */}
        <span>{isLoading ? '...' : (isTriggered ? 'ALARM' : 'ALARM')}</span>
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
};

export default EmergencyButton; 