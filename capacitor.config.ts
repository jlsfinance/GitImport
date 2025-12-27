import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.billbook.app',
  appName: 'JLS Suite',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlay: true,
      style: 'DARK',
      backgroundColor: '#0B1220'
    },
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false
    }
  }
};

export default config;

