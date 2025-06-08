// Environment configuration for different build targets
const environment = {
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isStaging: process.env.REACT_APP_ENV === 'staging',
  
  // API Configuration
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  
  // OAuth Configuration
  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  
  // App Configuration
  appName: process.env.REACT_APP_APP_NAME || 'Cally',
  appVersion: process.env.REACT_APP_VERSION || '1.0.0',
  
  // Feature Flags
  enableDebug: process.env.REACT_APP_DEBUG === 'true',
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enablePushNotifications: process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true',
  
  // Mobile-specific configuration
  mobile: {
    enableDeepLinks: process.env.REACT_APP_ENABLE_DEEP_LINKS === 'true',
    enableBiometrics: process.env.REACT_APP_ENABLE_BIOMETRICS === 'true',
    enableOfflineMode: process.env.REACT_APP_ENABLE_OFFLINE_MODE === 'true',
  },
  
  // Build information
  buildInfo: {
    buildNumber: process.env.REACT_APP_BUILD_NUMBER || '1',
    buildDate: process.env.REACT_APP_BUILD_DATE || new Date().toISOString(),
    commitHash: process.env.REACT_APP_COMMIT_HASH || 'unknown',
  }
};

// Validation function
export const validateEnvironment = () => {
  const required = ['googleClientId'];
  const missing = required.filter(key => !environment[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  
  return true;
};

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  if (environment.isProduction) {
    return {
      ...environment,
      apiUrl: environment.apiUrl,
      enableDebug: false,
      enableAnalytics: true,
    };
  }
  
  if (environment.isStaging) {
    return {
      ...environment,
      enableDebug: true,
      enableAnalytics: false,
    };
  }
  
  // Development
  return {
    ...environment,
    enableDebug: true,
    enableAnalytics: false,
  };
};

export default environment; 