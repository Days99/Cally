import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    
    // Set up axios interceptors
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor to add auth header
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newTokens = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Get Google OAuth URL
  async getGoogleAuthUrl() {
    try {
      const response = await axios.get(`${API_URL}/api/auth/google`);
      return response.data.authUrl;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get auth URL');
    }
  }

  // Handle OAuth callback tokens
  setTokens(accessToken, refreshToken) {
    console.log('authService: Setting tokens');
    this.token = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    console.log('authService: Tokens stored in localStorage');
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      const response = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken: this.refreshToken
      });

      const { accessToken, refreshToken } = response.data;
      this.setTokens(accessToken, refreshToken);
      
      return { accessToken, refreshToken };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to refresh token');
    }
  }

  // Get current user profile
  async getProfile() {
    try {
      console.log('authService: Getting profile, token exists:', !!this.token);
      const response = await axios.get(`${API_URL}/api/auth/me`);
      console.log('authService: Profile response:', response.data);
      return response.data.user;
    } catch (error) {
      console.error('authService: Profile request failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get profile');
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await axios.put(`${API_URL}/api/auth/me`, profileData);
      return response.data.user;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  // Check authentication status
  async checkAuth() {
    try {
      const response = await axios.get(`${API_URL}/api/auth/check`);
      return response.data;
    } catch (error) {
      return { authenticated: false };
    }
  }

  // Logout user
  async logout() {
    try {
      if (this.token) {
        await axios.post(`${API_URL}/api/auth/logout`);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      this.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  // Disconnect integration
  async disconnectIntegration(provider) {
    try {
      const response = await axios.delete(`${API_URL}/api/auth/integrations/${provider}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || `Failed to disconnect ${provider}`);
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const hasToken = !!this.token;
    const tokenInStorage = localStorage.getItem('accessToken');
    console.log('authService: isAuthenticated check:', {
      hasToken,
      tokenInStorage: !!tokenInStorage,
      tokensMatch: this.token === tokenInStorage
    });
    return hasToken;
  }

  // Get stored token
  getToken() {
    return this.token;
  }

  // Start Google OAuth flow
  async loginWithGoogle() {
    try {
      const authUrl = await this.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      throw new Error('Failed to start Google login');
    }
  }
}

export default new AuthService(); 