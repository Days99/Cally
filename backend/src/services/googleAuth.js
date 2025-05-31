const { google } = require('googleapis');
const { User, Token } = require('../models');

class GoogleAuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Generate Google OAuth URL
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  // Get user info from Google
  async getUserInfo(accessToken) {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      
      return {
        googleId: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to get user information from Google');
    }
  }

  // Create or update user and tokens
  async createOrUpdateUser(userInfo, tokens) {
    try {
      // Find or create user
      let user = await User.findOne({ where: { googleId: userInfo.googleId } });
      
      if (!user) {
        // Check if user exists with same email
        user = await User.findOne({ where: { email: userInfo.email } });
        
        if (user) {
          // Update existing user with Google ID
          await user.update({
            googleId: userInfo.googleId,
            name: userInfo.name,
            avatar: userInfo.avatar,
            lastLoginAt: new Date()
          });
        } else {
          // Create new user
          user = await User.create({
            googleId: userInfo.googleId,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.avatar,
            lastLoginAt: new Date()
          });
        }
      } else {
        // Update existing user
        await user.update({
          name: userInfo.name,
          avatar: userInfo.avatar,
          lastLoginAt: new Date()
        });
      }

      // Store or update Google tokens
      await Token.upsert({
        userId: user.id,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope,
        isActive: true
      });

      return user;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw new Error('Failed to create or update user');
    }
  }

  // Refresh Google access token
  async refreshAccessToken(userId) {
    try {
      const token = await Token.findOne({
        where: { userId, provider: 'google', isActive: true }
      });

      if (!token || !token.refreshToken) {
        throw new Error('No refresh token found');
      }

      this.oauth2Client.setCredentials({
        refresh_token: token.refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update token in database
      await token.update({
        accessToken: credentials.access_token,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      });

      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // Get valid access token for user
  async getValidAccessToken(userId) {
    try {
      const token = await Token.findOne({
        where: { userId, provider: 'google', isActive: true }
      });

      if (!token) {
        throw new Error('No Google token found for user');
      }

      // Check if token is expired
      if (token.expiresAt && new Date() >= token.expiresAt) {
        // Try to refresh token
        return await this.refreshAccessToken(userId);
      }

      return token.accessToken;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      throw error;
    }
  }

  // Revoke Google access
  async revokeAccess(userId) {
    try {
      const token = await Token.findOne({
        where: { userId, provider: 'google', isActive: true }
      });

      if (token) {
        // Revoke token with Google
        if (token.accessToken) {
          this.oauth2Client.setCredentials({ access_token: token.accessToken });
          await this.oauth2Client.revokeCredentials();
        }

        // Deactivate token in database
        await token.update({ isActive: false });
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      throw new Error('Failed to revoke Google access');
    }
  }
}

module.exports = new GoogleAuthService(); 