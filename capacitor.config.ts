import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ci.miav.ekklesia',
  appName: 'MIAV ERP',
  webDir: 'dist/EKKLESIA_FRONTEND/browser',
  plugins: {
    SplashScreen: {
      // Le splash reste affiché le temps que la WebView charge, puis est
      // masqué par NativeAppService (ou automatiquement après ce délai max).
      launchAutoHide: true,
      launchShowDuration: 4000,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
