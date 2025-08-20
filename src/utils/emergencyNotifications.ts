import { ref, push, set } from 'firebase/database';
import { realtimeDb } from '../services/firebase';
import type { EmergencyRoute } from './emergencyRouting';

export interface EmergencyNotification {
  id: string;
  emergencyOfficerId: string;
  emergencyOfficerName: string;
  emergencyOfficerLocation: {
    lat: number;
    lng: number;
  };
  nearestOfficerId: string;
  nearestOfficerName: string;
  distance: number;
  estimatedTime: number;
  timestamp: number;
  status: 'pending' | 'acknowledged' | 'responding' | 'completed';
  acknowledgedAt?: number;
  respondingAt?: number;
  completedAt?: number;
  notifiedOfficerId: string; // Officer receiving this notification
  isClosest: boolean; // True if this officer is the closest
}

// Send emergency notification to an officer (not just nearest)
export async function sendEmergencyNotification(
  emergencyRoute: EmergencyRoute & { notifiedOfficerId: string; isClosest: boolean }
): Promise<string> {
  const notification: Omit<EmergencyNotification, 'id'> = {
    emergencyOfficerId: emergencyRoute.emergencyOfficer.id,
    emergencyOfficerName: emergencyRoute.emergencyOfficer.name,
    emergencyOfficerLocation: {
      lat: emergencyRoute.emergencyOfficer.lat!,
      lng: emergencyRoute.emergencyOfficer.lng!
    },
    nearestOfficerId: emergencyRoute.nearestOfficer.id,
    nearestOfficerName: emergencyRoute.nearestOfficer.name,
    distance: emergencyRoute.distance,
    estimatedTime: emergencyRoute.estimatedTime,
    timestamp: Date.now(),
    status: 'pending',
    notifiedOfficerId: emergencyRoute.notifiedOfficerId,
    isClosest: emergencyRoute.isClosest
  };

  const notificationsRef = ref(realtimeDb, 'emergencyNotifications');
  const newNotificationRef = push(notificationsRef);
  
  await set(newNotificationRef, notification);
  
  console.log('Emergency notification sent:', {
    emergencyOfficer: emergencyRoute.emergencyOfficer.name,
    nearestOfficer: emergencyRoute.nearestOfficer.name,
    distance: `${Math.round(emergencyRoute.distance / 1000 * 10) / 10} km`,
    estimatedTime: `${emergencyRoute.estimatedTime} minutes`
  });

  return newNotificationRef.key!;
}

// Update notification status
export async function updateNotificationStatus(
  notificationId: string,
  status: EmergencyNotification['status']
): Promise<void> {
  const notificationRef = ref(realtimeDb, `emergencyNotifications/${notificationId}`);
  
  const updateData: Partial<EmergencyNotification> = {
    status,
    ...(status === 'acknowledged' && { acknowledgedAt: Date.now() }),
    ...(status === 'responding' && { respondingAt: Date.now() }),
    ...(status === 'completed' && { completedAt: Date.now() })
  };

  await set(notificationRef, updateData);
  
  console.log(`Emergency notification ${notificationId} status updated to: ${status}`);
}

// Get emergency notifications for a specific officer
export async function getEmergencyNotificationsForOfficer(
  _officerId: string
): Promise<EmergencyNotification[]> {
  // This would typically use a query to filter by officerId
  // For now, we'll return all notifications and filter client-side
  // In production, you'd want to use Firebase queries for efficiency
  
  return [];
}

// Create audit log entry for emergency response
export async function logEmergencyResponse(
  emergencyOfficerId: string,
  respondingOfficerId: string,
  action: 'notification_sent' | 'notification_acknowledged' | 'response_started' | 'response_completed',
  details?: any
): Promise<void> {
  // Audit logging disabled to save Firebase costs - can be re-enabled later
  // const auditRef = ref(realtimeDb, 'auditLog');
  // const newAuditRef = push(auditRef);
  
  // const auditEntry = {
  //   timestamp: Date.now(),
  //   type: 'emergency_response',
  //   action,
  //   emergencyOfficerId,
  //   respondingOfficerId,
  //   details: details || {},
  //   severity: 'high'
  // };

  // await set(newAuditRef, auditEntry);
  
  console.log('Emergency response audit logged (audit disabled):', {
    emergencyOfficerId,
    respondingOfficerId,
    action,
    details
  });
} 