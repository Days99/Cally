import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App as CapacitorApp } from '@capacitor/app';
import './styles/index.css';

// Import providers
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { NotificationProvider } from './components/NotificationSystem';
import { PageLoader } from './components/LoadingStates';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Calendar = React.lazy(() => import('./pages/Calendar'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Accounts = React.lazy(() => import('./pages/Accounts'));
const Login = React.lazy(() => import('./pages/Login'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = React.lazy(() => import('./pages/TermsOfServicePage'));

function App() {
  useEffect(() => {
    // Mobile app initialization
    if (Capacitor.isNativePlatform()) {
      console.log('🚀 Running in native mobile app mode');
      
      // Configure status bar for mobile
      StatusBar.setStyle({
        style: Style.Default,
      });

      StatusBar.setBackgroundColor({
        color: '#3B82F6',
      });

      // Handle keyboard behavior
      Keyboard.addListener('keyboardWillShow', (info) => {
        document.body.style.height = `calc(100vh - ${info.keyboardHeight}px)`;
      });

      Keyboard.addListener('keyboardWillHide', () => {
        document.body.style.height = '100vh';
      });

      // Handle back button on Android
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          CapacitorApp.exitApp();
        }
      });

      // Handle app state changes
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
        if (isActive) {
          // App came to foreground - refresh data if needed
          console.log('App resumed - refreshing data...');
        }
      });

    } else {
      console.log('🌐 Running in web browser mode');
      
      // Register service worker for PWA functionality
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
              console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
              console.log('SW registration failed: ', registrationError);
            });
        });
      }

      // Add PWA install prompt
      let deferredPrompt;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button or banner
        console.log('PWA install prompt available');
      });

      // Handle PWA installation
      window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
      });
    }

    // Add mobile-specific class to body
    document.body.classList.add(Capacitor.isNativePlatform() ? 'capacitor-app' : 'web-app');

    // Cleanup listeners on unmount
    return () => {
      if (Capacitor.isNativePlatform()) {
        Keyboard.removeAllListeners();
        CapacitorApp.removeAllListeners();
      }
    };
  }, []);

  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${
              Capacitor.isNativePlatform() ? 'safe-area-top safe-area-bottom' : ''
            }`}>
              <Navbar />
              
              <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
                Capacitor.isNativePlatform() ? 'pb-safe' : ''
              }`}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfServicePage />} />
                    
                    {/* Protected routes */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/calendar"
                      element={
                        <ProtectedRoute>
                          <Calendar />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tasks"
                      element={
                        <ProtectedRoute>
                          <Tasks />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/accounts"
                      element={
                        <ProtectedRoute>
                          <Accounts />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Settings route redirects to accounts for backward compatibility */}
                    <Route
                      path="/settings"
                      element={<Navigate to="/accounts" replace />}
                    />
                    
                    {/* Catch all route */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App; 