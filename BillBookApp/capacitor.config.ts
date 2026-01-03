import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jls.billbook',
  appName: 'JLS Bill',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "231225025529-9njphhsjd5s5ib5vgmdmrvquvafpje9u.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    },
    StatusBar: {
      overlay: false,
      style: 'DARK',
      backgroundColor: '#0F172A'
    },
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;

