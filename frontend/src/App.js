import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
              <Navbar />
              
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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