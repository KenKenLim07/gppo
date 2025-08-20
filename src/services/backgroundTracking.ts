import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location as BackgroundLocation } from '@capacitor-community/background-geolocation';
import { ref, update, get } from 'firebase/database';
import { realtimeDb } from './firebase';
import { auth } from './firebase';
import { LocalNotifications } from '@capacitor/local-notifications';

// Helper: request notification permissions
async function ensureNotificationPermission() {
  const perms = await LocalNotifications.checkPermissions();
  if (perms.display !== 'granted') {
    await LocalNotifications.requestPermissions();
  }
}

// Helper: notify user if tracking is paused/killed
async function notifyTrackingPaused() {
  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Location Tracking Paused',
        body: 'Please reopen the app to continue sharing your location.',
        id: 1,
        schedule: { at: new Date(Date.now() + 1000) },
      }
    ]
  });
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

class BackgroundTrackingService {
  private isInitialized = false;
  private isTracking = false;
  private watcherId: string | null = null;
  private heartbeatInterval: any = null;
  private lastLocation: BackgroundLocation | null = null;
  private lastUpdateTime: number = 0;
  private HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Background tracking already initialized');
      return;
    }

    try {
      console.log('Initializing background tracking...');
      await ensureNotificationPermission();
      // No explicit initialize method for this plugin
      this.isInitialized = true;
      console.log('✅ Background tracking initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize background tracking:', error);
      throw error;
    }
  }

  async startTracking(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isTracking) {
      console.log('Background tracking already active');
      return;
    }

    try {
      console.log('Starting background location tracking...');

      this.watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Guimaras Patrol is tracking your location',
          backgroundTitle: 'Guimaras Patrol',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10, // update only if moved 10 meters
        },
        async (location: BackgroundLocation | undefined, error?: any) => {
          if (error) {
            console.error('❌ Background GPS Error:', error);
            await notifyTrackingPaused();
            return;
          }

          if (location) {
            this.lastLocation = location;
            this.lastUpdateTime = Date.now();
            await this.updateLocationInFirebase(location);
            this.resetHeartbeat(); // Reset heartbeat on movement
          }
        }
      );
      
      this.isTracking = true;
      this.startHeartbeat(); // Start heartbeat timer
      console.log('✅ Background tracking started successfully with ID:', this.watcherId);
    } catch (error) {
      console.error('❌ Failed to start background tracking:', error);
      await notifyTrackingPaused();
      throw error;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      if (this.lastLocation && Date.now() - this.lastUpdateTime >= this.HEARTBEAT_INTERVAL_MS) {
        await this.updateLocationInFirebase(this.lastLocation);
        this.lastUpdateTime = Date.now();
        console.log('[Heartbeat] Sent stationary heartbeat update');
      }
    }, this.HEARTBEAT_INTERVAL_MS);
    console.log('[Heartbeat] Heartbeat system started with', this.HEARTBEAT_INTERVAL_MS / 1000, 'second interval');
  }

  private resetHeartbeat() {
    this.lastUpdateTime = Date.now();
    // Optionally, you can restart the interval here if you want
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[Heartbeat] Heartbeat system stopped');
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      console.log('Background tracking not active');
      return;
    }

    try {
      console.log('Stopping background location tracking...');

      if (this.watcherId) {
        await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
        this.watcherId = null;
      }
      
      this.isTracking = false;
      this.stopHeartbeat();
      console.log('✅ Background tracking stopped successfully');
      await notifyTrackingPaused();
    } catch (error) {
      console.error('❌ Failed to stop background tracking:', error);
      throw error;
    }
  }

  private async updateLocationInFirebase(location: BackgroundLocation): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, skipping Firebase update');
      return;
    }

    try {
      // First, get the current user data to preserve existing fields
      const userRef = ref(realtimeDb, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      let existingData = {};
      if (snapshot.exists()) {
        existingData = snapshot.val();
      }
      
      // Update location while preserving all existing data
      await update(userRef, {
        ...existingData, // Preserve all existing fields (including isHiddenFromMap)
        lat: location.latitude,
        lng: location.longitude,
        lastUpdated: location.time || Date.now(),
        accuracy: location.accuracy,
        altitude: location.altitude,
        heading: location.bearing,
        speed: location.speed,
        source: 'background',
        isSharingLocation: true // Mark user as actively sharing location
      });

      console.log('✅ Background location updated in Firebase');
    } catch (error) {
      console.error('❌ Failed to update background location in Firebase:', error);
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      // This plugin doesn't have a checkPermissions method
      // We'll assume permissions are granted if we can start tracking
      return true;
    } catch (error) {
      console.error('Error checking background permissions:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // This plugin handles permissions automatically when addWatcher is called
      // with requestPermissions: true
      return true;
    } catch (error) {
      console.error('Error requesting background permissions:', error);
      return false;
    }
  }

  async openSettings(): Promise<void> {
    try {
      // Not all platforms support this, but it's in the type definition
      if (BackgroundGeolocation.openSettings) {
        await BackgroundGeolocation.openSettings();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  }

  isActive(): boolean {
    return this.isTracking;
  }

  getStatus(): { initialized: boolean; tracking: boolean; watcherId: string | null } {
    return {
      initialized: this.isInitialized,
      tracking: this.isTracking,
      watcherId: this.watcherId
    };
  }
}

// Export singleton instance
export const backgroundTrackingService = new BackgroundTrackingService(); 