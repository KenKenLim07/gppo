import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { updateNotificationStatus } from '../utils/emergencyNotifications';
import type { EmergencyNotification } from '../utils/emergencyNotifications';

interface EmergencyNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmergencyNotificationModal = ({ isOpen, onClose }: EmergencyNotificationModalProps) => {
  const { user } = useAuth();
  const { locationData } = useLocation();
  const [notifications, setNotifications] = useState<EmergencyNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    // Listen for emergency notifications where this user is the nearest officer
    const notificationsRef = ref(realtimeDb, 'emergencyNotifications');
    
    onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userNotifications: EmergencyNotification[] = [];
        
        Object.keys(data).forEach(key => {
          const notification = data[key];
          if (notification.nearestOfficerId === user.uid) {
            userNotifications.push({
              id: key,
              ...notification
            });
          }
        });
        
        // Sort by timestamp (newest first)
        userNotifications.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(userNotifications);
      } else {
        setNotifications([]);
      }
    });

    return () => {
      off(notificationsRef);
    };
  }, [isOpen, user]);

  const handleAcknowledge = async (notificationId: string) => {
    setLoading(true);
    try {
      await updateNotificationStatus(notificationId, 'acknowledged');
    } catch (error) {
      console.error('Failed to acknowledge notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (notificationId: string) => {
    setLoading(true);
    try {
      await updateNotificationStatus(notificationId, 'responding');
    } catch (error) {
      console.error('Failed to update response status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (notificationId: string) => {
    setLoading(true);
    try {
      await updateNotificationStatus(notificationId, 'completed');
    } catch (error) {
      console.error('Failed to complete response:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: EmergencyNotification['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'acknowledged': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'responding': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: EmergencyNotification['status']) => {
    switch (status) {
      case 'pending': return 'Pending Response';
      case 'acknowledged': return 'Acknowledged';
      case 'responding': return 'Responding';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  // Get navigation URL with current user location as origin
  const getNavigationUrl = (emergencyLocation: { lat: number; lng: number }) => {
    if (!locationData) {
      // Fallback: use emergency location as both origin and destination
      // This will prompt user to set their current location in Google Maps
      return `https://www.google.com/maps/dir/?api=1&destination=${emergencyLocation.lat},${emergencyLocation.lng}&travelmode=driving`;
    }
    
    // Use current user location as origin, emergency location as destination
    return `https://www.google.com/maps/dir/?api=1&origin=${locationData.lat},${locationData.lng}&destination=${emergencyLocation.lat},${emergencyLocation.lng}&travelmode=driving`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h3 className="text-lg font-bold">Emergency Alerts</h3>
              <p className="text-sm text-red-100">Response Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-200 transition-colors bg-transparent border-none outline-none focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No Active Emergency Alerts</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🚨</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {notification.emergencyOfficerName}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(notification.status)}`}>
                      {getStatusText(notification.status)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Distance:</span>
                      <span className="font-medium">
                        {Math.round(notification.distance / 1000 * 10) / 10} km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Time:</span>
                      <span className="font-medium">{notification.estimatedTime} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span className="font-medium">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {notification.status === 'pending' && (
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={() => handleAcknowledge(notification.id)}
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
                      >
                        {loading ? 'Acknowledging...' : 'Acknowledge'}
                      </button>
                      <button
                        onClick={() => handleRespond(notification.id)}
                        disabled={loading}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
                      >
                        {loading ? 'Responding...' : 'Respond'}
                      </button>
                    </div>
                  )}

                  {notification.status === 'acknowledged' && (
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={() => handleRespond(notification.id)}
                        disabled={loading}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
                      >
                        {loading ? 'Responding...' : 'Start Response'}
                      </button>
                    </div>
                  )}

                  {notification.status === 'responding' && (
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={() => handleComplete(notification.id)}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
                      >
                        {loading ? 'Completing...' : 'Complete Response'}
                      </button>
                    </div>
                  )}

                  {/* Navigation Links */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                    <a
                      href={getNavigationUrl(notification.emergencyOfficerLocation)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                      </svg>
                      <span>
                        {locationData ? 'Start Navigation' : 'Open in Maps'}
                      </span>
                    </a>
                    <a
                      href={`https://www.google.com/maps?q=${notification.emergencyOfficerLocation.lat},${notification.emergencyOfficerLocation.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-700 text-sm font-medium flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>View Location</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyNotificationModal; 