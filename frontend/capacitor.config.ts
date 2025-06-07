import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dayz99.cally',
  appName: 'Cally',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;
