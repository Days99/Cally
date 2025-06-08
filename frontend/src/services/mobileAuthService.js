import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import authService from './authService';

class MobileAuthService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  // Mobile-specific Google OAuth flow using browser
  async loginWithGoogle() {
    if (!this.isNative) {
      // Use web OAuth flow
      return authService.loginWithGoogle();
    }

    try {
      console.log('🔐 Starting mobile browser OAuth...');
      
      // Get OAuth URL from backend
      const authUrl = await authService.getGoogleAuthUrl();
      
      // Add mobile app callback URL with updated app ID
      const mobileAuthUrl = authUrl.replace(
        encodeURIComponent('http://localhost:3000/auth/callback'),
        encodeURIComponent(`com.dayz99.cally://oauth/callback`)
      );

      console.log('🌐 Opening browser for OAuth:', mobileAuthUrl);

      // Open browser for OAuth
      await Browser.open({
        url: mobileAuthUrl,
        windowName: '_self'
      });

      // Listen for app URL scheme callback
      return new Promise((resolve, reject) => {
        const listener = App.addListener('appUrlOpen', async (data) => {
          try {
            console.log('📱 Received app URL:', data.url);
            
            // Close the browser
            await Browser.close();
            
            // Remove listener
            listener.remove();

            // Parse the callback URL
            const url = new URL(data.url);
            const searchParams = url.searchParams;
            
            if (searchParams.has('error')) {
              reject(new Error(searchParams.get('error_description') || 'OAuth failed'));
              return;
            }

            const code = searchParams.get('code');
            if (!code) {
              reject(new Error('No authorization code received'));
              return;
            }

            console.log('✅ Authorization code received, exchanging for tokens...');

            // Exchange code for tokens (call your backend)
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/auth/google/callback`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code }),
            });

            const tokenData = await response.json();
            
            if (!response.ok) {
              reject(new Error(tokenData.message || 'Failed to exchange code for tokens'));
              return;
            }

            // Store tokens
            authService.setTokens(tokenData.accessToken, tokenData.refreshToken);
            
            console.log('✅ Mobile authentication successful');
            resolve(tokenData);
          } catch (error) {
            console.error('❌ Auth callback error:', error);
            reject(error);
          }
        });

        // Set a timeout for the OAuth flow
        setTimeout(() => {
          listener.remove();
          reject(new Error('OAuth timeout - please try again'));
        }, 300000); // 5 minutes timeout
      });

    } catch (error) {
      console.error('❌ Mobile OAuth error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('UNIMPLEMENTED')) {
        throw new Error('Browser plugin not available. Please install @capacitor/browser');
      }
      
      throw error;
    }
  }

  // Handle deep link authentication
  async handleAuthCallback(url) {
    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (error) {
        throw new Error(urlObj.searchParams.get('error_description') || 'OAuth error');
      }

      if (code) {
        // Exchange code for tokens
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const tokenData = await response.json();
        
        if (response.ok) {
          authService.setTokens(tokenData.accessToken, tokenData.refreshToken);
          return tokenData;
        } else {
          throw new Error(tokenData.message || 'Token exchange failed');
        }
      }

      throw new Error('No valid OAuth response');
    } catch (error) {
      console.error('Auth callback error:', error);
      throw error;
    }
  }

  // Logout with mobile-specific cleanup
  async logout() {
    try {
      // Close any open browsers
      if (this.isNative) {
        await Browser.close().catch(() => {}); // Ignore errors if browser not open
      }
      
      // Call standard logout
      await authService.logout();
    } catch (error) {
      console.error('Mobile logout error:', error);
    }
  }
}

export default new MobileAuthService(); 