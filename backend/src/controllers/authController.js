const googleAuthService = require('../services/googleAuth');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { User, Token } = require('../models');

class AuthController {
  // Get Google OAuth URL
  async getGoogleAuthUrl(req, res) {
    try {
      const authUrl = googleAuthService.getAuthUrl();
      res.json({ 
        success: true,
        authUrl,
        message: 'Google OAuth URL generated successfully'
      });
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      res.status(500).json({ 
        error: 'Failed to generate auth URL',
        message: error.message 
      });
    }
  }

  // Handle Google OAuth callback
  async googleCallback(req, res) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({ 
          error: 'Authorization code required',
          message: 'No authorization code provided' 
        });
      }

      // Parse state parameter for additional account info
      let stateData = {};
      if (state) {
        try {
          stateData = JSON.parse(state);
        } catch (e) {
          console.log('Invalid state parameter:', state);
        }
      }

      // Exchange code for tokens
      const tokens = await googleAuthService.getTokens(code);
      
      // Get user info from Google
      const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
      
      // Create or update user - handle additional accounts
      const user = await googleAuthService.createOrUpdateUser(userInfo, tokens, {
        isAdditionalAccount: stateData.isAdditionalAccount || false,
        accountName: stateData.accountName,
        userId: stateData.userId
      });
      
      // Generate JWT tokens
      const accessToken = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Redirect to frontend with tokens (in production, use secure cookies)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in Google callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  // Handle mobile Google OAuth (from @capacitor-community/google-auth)
  async googleMobileAuth(req, res) {
    try {
      const { accessToken, idToken, email, name, imageUrl } = req.body;

      if (!accessToken) {
        return res.status(400).json({ 
          error: 'Access token required',
          message: 'No access token provided from mobile app' 
        });
      }

      // Verify the token with Google
      const userInfo = await googleAuthService.getUserInfo(accessToken);
      
      // Additional validation: ensure the token is valid and matches the provided info
      if (email && userInfo.email !== email) {
        return res.status(400).json({ 
          error: 'Token validation failed',
          message: 'Email mismatch between token and provided data' 
        });
      }

      // Create minimal tokens object for mobile auth
      const tokens = {
        access_token: accessToken,
        refresh_token: null, // Mobile tokens are handled by the app
        expires_in: 3600, // 1 hour default
        token_type: 'Bearer'
      };

      // Create or update user
      const user = await googleAuthService.createOrUpdateUser(userInfo, tokens, {
        isAdditionalAccount: false,
        mobileAuth: true
      });
      
      // Generate JWT tokens for our backend
      const jwtAccessToken = generateToken(user.id);
      const jwtRefreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        },
        message: 'Mobile authentication successful'
      });
    } catch (error) {
      console.error('Error in mobile Google auth:', error);
      res.status(500).json({ 
        error: 'Mobile authentication failed',
        message: error.message 
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = req.user;
      
      // Get user's connected integrations
      const tokens = await Token.findAll({
        where: { userId: user.id, isActive: true },
        attributes: ['provider', 'createdAt', 'expiresAt']
      });

      const integrations = tokens.reduce((acc, token) => {
        acc[token.provider] = {
          connected: true,
          connectedAt: token.createdAt,
          expiresAt: token.expiresAt
        };
        return acc;
      }, {});

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          lastLoginAt: user.lastLoginAt,
          integrations
        }
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ 
        error: 'Failed to get profile',
        message: error.message 
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const user = req.user;
      const { name, preferences } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (preferences) updateData.preferences = { ...user.preferences, ...preferences };

      await user.update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences
        }
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        message: error.message 
      });
    }
  }

  // Refresh JWT token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ 
          error: 'Refresh token required',
          message: 'Please provide a refresh token' 
        });
      }

      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(400).json({ 
          error: 'Invalid token type',
          message: 'Token is not a refresh token' 
        });
      }

      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ 
          error: 'Invalid user',
          message: 'User not found or inactive' 
        });
      }

      const newAccessToken = generateToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        message: 'Tokens refreshed successfully'
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(403).json({ 
        error: 'Invalid refresh token',
        message: error.message 
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const user = req.user;
      
      // Optionally revoke Google access (uncomment if needed)
      // await googleAuthService.revokeAccess(user.id);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ 
        error: 'Logout failed',
        message: error.message 
      });
    }
  }

  // Disconnect integration
  async disconnectIntegration(req, res) {
    try {
      const user = req.user;
      const { provider } = req.params;

      if (!['google', 'jira', 'github'].includes(provider)) {
        return res.status(400).json({ 
          error: 'Invalid provider',
          message: 'Provider must be google, jira, or github' 
        });
      }

      if (provider === 'google') {
        await googleAuthService.revokeAccess(user.id);
      } else {
        // For other providers, just deactivate the token
        await Token.update(
          { isActive: false },
          { where: { userId: user.id, provider, isActive: true } }
        );
      }

      res.json({
        success: true,
        message: `${provider} integration disconnected successfully`
      });
    } catch (error) {
      console.error(`Error disconnecting ${req.params.provider}:`, error);
      res.status(500).json({ 
        error: 'Failed to disconnect integration',
        message: error.message 
      });
    }
  }

  // Check authentication status
  async checkAuth(req, res) {
    try {
      if (req.user) {
        res.json({
          success: true,
          authenticated: true,
          user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            avatar: req.user.avatar
          }
        });
      } else {
        res.json({
          success: true,
          authenticated: false
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      res.status(500).json({ 
        error: 'Failed to check authentication',
        message: error.message 
      });
    }
  }
}

module.exports = new AuthController(); 