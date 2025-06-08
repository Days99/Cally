// Get environment-specific configuration
const getAppId = () => {
  const env = process.env.REACT_APP_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'com.dayz99.cally';
    case 'staging':
      return 'com.dayz99.cally.staging';
    default:
      return 'com.dayz99.cally.dev';
  }
};

const getAppName = () => {
  const env = process.env.REACT_APP_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'Cally';
    case 'staging':
      return 'Cally Staging';
    default:
      return 'Cally Dev';
  }
};

const config = {
  appId: getAppId(),
  appName: getAppName(),
  webDir: 'frontend/build',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Allow localhost in development
    ...(process.env.NODE_ENV === 'development' && {
      url: 'http://localhost:3000',
      cleartext: true
    })
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3B82F6',
      showSpinner: false,
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#3B82F6',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    App: {
      disallowOverscroll: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Browser: {
      presentationStyle: 'popover',
    },
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    // Environment-specific bundle IDs
    bundleId: getAppId(),
  },
  android: {
    allowMixedContent: process.env.NODE_ENV === 'development',
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    // Environment-specific package names
    packageName: getAppId(),
  },
};

export default config; 