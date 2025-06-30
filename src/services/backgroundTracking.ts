import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ref, update } from 'firebase/database';
import { realtimeDb } from './firebase';
import { auth } from './firebase';

const BackgroundGeolocationPluginInstance = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

interface BackgroundLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  simulated?: boolean;
  speed?: number | null;
  bearing?: number | null;
  time?: number | null;
}

interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
  always?: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
}

class BackgroundTrackingService {
  private isInitialized = false;
  private isTracking = false;
  private watcherId: string | null = null;
  private periodicUpdateInterval: NodeJS.Timeout | null = null;
  private lastKnownLocation: BackgroundLocation | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Background tracking already initialized');
      return;
    }
    try {
      console.log('Initializing background tracking...');
      this.isInitialized = true;
      console.log('✅ Background tracking initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize background tracking:', error);
      throw error;
    }
  }

  async checkPermissions(): Promise<PermissionStatus> {
    try {
      // For old version, we'll assume permissions are granted if we can start tracking
      return { location: 'granted' };
    } catch (error) {
      console.error('Error checking background permissions:', error);
      throw error;
    }
  }

  async requestPermissions(): Promise<PermissionStatus> {
    try {
      // For old version, we'll assume permissions are granted
      return { location: 'granted' };
    } catch (error) {
      console.error('Error requesting background permissions:', error);
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
      this.watcherId = await BackgroundGeolocationPluginInstance.addWatcher(
        {
          backgroundMessage: 'Guimaras Patrol is tracking your location',
          backgroundTitle: 'Guimaras Patrol',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10,
        },
        async (location: BackgroundLocation | undefined, error?: any) => {
          if (error) {
            console.error('❌ Background GPS Error:', error);
            return;
          }
          if (location) {
            this.lastKnownLocation = location;
            console.log('📡 Background location received:', {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy,
              timestamp: location.time ? new Date(location.time).toLocaleString() : 'No timestamp'
            });
            await this.updateLocationInFirebase(location);
          }
        }
      );
      // Start periodic keep-alive update every 5 minutes
      this.periodicUpdateInterval = setInterval(async () => {
        if (this.lastKnownLocation) {
          const keepAliveLocation = { ...this.lastKnownLocation, time: Date.now() };
          console.log('⏰ Sending periodic keep-alive location update to Firebase');
          await this.updateLocationInFirebase(keepAliveLocation);
        }
      }, 300000); // 5 minutes
      this.isTracking = true;
      console.log('✅ Background tracking started successfully with ID:', this.watcherId);
    } catch (error) {
      console.error('❌ Failed to start background tracking:', error);
      throw error;
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
        await BackgroundGeolocationPluginInstance.removeWatcher({ id: this.watcherId });
        this.watcherId = null;
      }
      // Clear periodic keep-alive interval
      if (this.periodicUpdateInterval) {
        clearInterval(this.periodicUpdateInterval);
        this.periodicUpdateInterval = null;
      }
      this.isTracking = false;
      console.log('✅ Background tracking stopped successfully');
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
      await update(ref(realtimeDb, `users/${user.uid}`), {
        lat: location.latitude,
        lng: location.longitude,
        lastUpdated: location.time || Date.now(),
        accuracy: location.accuracy,
        altitude: location.altitude,
        heading: location.bearing,
        speed: location.speed,
        source: 'background'
      });
      console.log('✅ Background location updated in Firebase');
    } catch (error) {
      console.error('❌ Failed to update background location in Firebase:', error);
    }
  }

  async openSettings(): Promise<void> {
    try {
      if (BackgroundGeolocationPluginInstance.openSettings) {
        await BackgroundGeolocationPluginInstance.openSettings();
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

export const backgroundTrackingService = new BackgroundTrackingService();

// Request all necessary permissions (location, background location, notifications)
export async function requestAllPermissions() {
  // Request location/background location (cast to any to access method)
  const locPerm = await (BackgroundGeolocationPluginInstance as any).requestPermissions();
  // Request notification permission (Android 13+)
  try {
    await requestNotificationPermissionIfNeeded();
  } catch (e) {
    // Ignore if not supported
  }
  return locPerm;
}

// User-friendly notification permission request
export async function requestNotificationPermissionIfNeeded() {
  const permStatus = await LocalNotifications.checkPermissions();
  if (permStatus.display !== 'granted') {
    // Optionally show your own dialog explaining why you need notifications
    if (window.confirm(
      'We need notification permission to keep you safe while tracking in the background.\n\nAllow notifications?'
    )) {
      await LocalNotifications.requestPermissions();
    }
    // If user cancels, do nothing (permission remains not granted)
  }
} 