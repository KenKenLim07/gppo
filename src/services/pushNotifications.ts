import { PushNotifications } from '@capacitor/push-notifications';
import type { Token, PushNotificationSchema } from '@capacitor/push-notifications';

// Professional push notification registration and handler
export function registerPush() {
  // Request permission for push notifications
  PushNotifications.requestPermissions().then(result => {
    if (result.receive === 'granted') {
      PushNotifications.register();
    } else {
      console.warn('Push notification permission not granted');
    }
  });

  // Listen for successful registration and log the device token
  PushNotifications.addListener('registration', (token: Token) => {
    console.log('[Push] Registration success, device token:', token.value);
    // TODO: Send this token to your server for push targeting
  });

  // Listen for registration errors
  PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] Registration error:', error);
  });

  // Listen for incoming push notifications (foreground)
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[Push] Notification received:', notification);
    // Handle silent/data-only push for keepalive/heartbeat
    if (notification.data && notification.data.type === 'keepalive') {
      // TODO: Call your location update/heartbeat function here
      // Example: backgroundTrackingService.forceHeartbeat();
      console.log('[Push] Keepalive/heartbeat push received');
    }
  });

  // Listen for notification actions (user taps)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] Notification action performed:', action);
    // Handle notification tap if needed
  });
}
 