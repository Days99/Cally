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

  // Generate Google OAuth URL with multi-account support
  getAuthUrl(options = {}) {
    const { isAdditionalAccount = false, accountName = null, userId = null } = options;
    
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: JSON.stringify({
        isAdditionalAccount,
        accountName,
        userId
      })
    });

    return authUrl;
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

  // Create or update user and tokens with multi-account support
  async createOrUpdateUser(userInfo, tokens, options = {}) {
    try {
      const { isAdditionalAccount = false, accountName = null, userId = null } = options;
      let user;

      if (isAdditionalAccount && userId) {
        // Adding additional account to existing user
        user = await User.findByPk(userId);
        if (!user) {
          throw new Error('User not found for additional account');
        }
      } else {
        // Find or create user for primary account
        user = await User.findOne({ where: { googleId: userInfo.googleId } });
        
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
      }

      // Check if this is the first account for this provider
      const existingTokens = await Token.count({
        where: { userId: user.id, provider: 'google', isActive: true }
      });
      const isPrimary = existingTokens === 0;

      // Store Google tokens for this account
      const tokenData = {
        userId: user.id,
        provider: 'google',
        accountName: accountName || (isPrimary ? 'Primary' : userInfo.email),
        accountEmail: userInfo.email,
        accountId: userInfo.googleId,
        isPrimary,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope,
        isActive: true
      };

      // For additional accounts, create new token instead of upsert
      if (isAdditionalAccount) {
        // Check if this account already exists
        const existingAccount = await Token.findOne({
          where: {
            userId: user.id,
            provider: 'google',
            accountEmail: userInfo.email,
            isActive: true
          }
        });

        if (existingAccount) {
          await existingAccount.update(tokenData);
        } else {
          await Token.create(tokenData);
        }
      } else {
        // For primary accounts, use upsert
        await Token.upsert(tokenData, {
          where: { userId: user.id, provider: 'google', isPrimary: true }
        });
      }

      return user;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw new Error('Failed to create or update user');
    }
  }

  // Refresh Google access token for specific account
  async refreshAccessToken(userId, accountId = null) {
    try {
      const whereClause = { userId, provider: 'google', isActive: true };
      
      if (accountId) {
        whereClause.id = accountId;
      } else {
        whereClause.isPrimary = true;
      }

      const token = await Token.findOne({ where: whereClause });

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

  // Get valid access token for user (optionally for specific account)
  async getValidAccessToken(userId, accountId = null) {
    try {
      const whereClause = { userId, provider: 'google', isActive: true };
      
      if (accountId) {
        whereClause.id = accountId;
      } else {
        whereClause.isPrimary = true;
      }

      const token = await Token.findOne({ where: whereClause });

      if (!token) {
        throw new Error(`No Google token found for user${accountId ? ' and account' : ''}`);
      }

      // Check if token is expired
      if (token.expiresAt && new Date() >= token.expiresAt) {
        // Try to refresh token
        return await this.refreshAccessToken(userId, accountId);
      }

      return token.accessToken;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      throw error;
    }
  }

  // Revoke Google access for specific account or all accounts
  async revokeAccess(userId, accountId = null) {
    try {
      const whereClause = { userId, provider: 'google', isActive: true };
      
      if (accountId) {
        whereClause.id = accountId;
      }

      const tokens = await Token.findAll({ where: whereClause });

      for (const token of tokens) {
        try {
          // Revoke token with Google
          if (token.accessToken) {
            this.oauth2Client.setCredentials({ access_token: token.accessToken });
            await this.oauth2Client.revokeCredentials();
          }

          // Deactivate token in database
          await token.update({ isActive: false });
        } catch (revokeError) {
          console.error(`Error revoking token for account ${token.id}:`, revokeError);
          // Continue with other tokens
        }
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      throw new Error('Failed to revoke Google access');
    }
  }
}

module.exports = new GoogleAuthService(); 