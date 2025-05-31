import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('useAuth: Starting auth status check');
      setLoading(true);
      
      if (authService.isAuthenticated()) {
        console.log('useAuth: Service says authenticated, getting profile');
        const profile = await authService.getProfile();
        console.log('useAuth: Profile received:', profile);
        setUser(profile);
        setAuthenticated(true);
        console.log('useAuth: Authentication state set to true');
      } else {
        console.log('useAuth: Service says not authenticated');
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('useAuth: Auth check failed:', error);
      setUser(null);
      setAuthenticated(false);
      // Clear invalid tokens
      authService.logout();
    } finally {
      setLoading(false);
      console.log('useAuth: Auth check completed');
    }
  };

  const login = async () => {
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const disconnectIntegration = async (provider) => {
    try {
      await authService.disconnectIntegration(provider);
      // Refresh user profile to update integrations
      await checkAuthStatus();
    } catch (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
      throw error;
    }
  };

  const value = {
    user,
    authenticated,
    loading,
    login,
    logout,
    updateProfile,
    disconnectIntegration,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 