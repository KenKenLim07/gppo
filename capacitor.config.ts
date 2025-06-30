import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.k3n.gpatrol',
  appName: 'Guimaras Patrol',
  webDir: 'dist',
  android: {
    useLegacyBridge: true
  }
};

export default config;
