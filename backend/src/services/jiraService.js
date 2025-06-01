const axios = require('axios');
const { Token, User } = require('../models');

class JiraService {
  constructor() {
    this.baseURL = 'https://api.atlassian.com';
  }

  // Generate Jira OAuth URL
  getAuthUrl(options = {}) {
    const { userId = null, accountName = null } = options;
    
    const state = JSON.stringify({
      userId,
      accountName,
      isAdditionalAccount: !!userId
    });

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: process.env.JIRA_CLIENT_ID,
      scope: 'read:me read:jira-user read:jira-work write:jira-work manage:jira-project',
      redirect_uri: process.env.JIRA_REDIRECT_URI,
      state: state,
      response_type: 'code',
      prompt: 'consent'
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async getTokens(code) {
    try {
      // Validate environment variables
      if (!process.env.JIRA_CLIENT_ID || process.env.JIRA_CLIENT_ID.length !== 32) {
        throw new Error('Invalid JIRA_CLIENT_ID: should be 32 characters');
      }
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.JIRA_REDIRECT_URI
      });
      const response = await axios.post('https://auth.atlassian.com/oauth/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('Jira token exchange successful');
      return response.data;
    } catch (error) {
      console.error('Error getting Jira tokens:', error.response?.data || error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }

      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  // Get user info and accessible resources
  async getUserInfo(accessToken) {
    try {
      // Get user info
      const userResponse = await axios.get('https://api.atlassian.com/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      // Get accessible resources (Jira sites)
      const resourcesResponse = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      return {
        user: userResponse.data,
        resources: resourcesResponse.data
      };
    } catch (error) {
      console.error('Error getting Jira user info:', error.response?.data || error.message);
      throw new Error('Failed to get user information from Jira');
    }
  }

  // Get valid access token for user's Jira account
  async getValidAccessToken(userId, accountId = null) {
    try {
      const whereClause = { userId, provider: 'jira', isActive: true };
      
      if (accountId) {
        whereClause.id = accountId;
      } else {
        whereClause.isPrimary = true;
      }

      const token = await Token.findOne({ where: whereClause });

      if (!token) {
        throw new Error(`No active Jira token found for user${accountId ? ' and account' : ''}. Please connect your Jira account.`);
      }

      // Check if token is expired or will expire soon (within 5 minutes)
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      if (token.expiresAt && fiveMinutesFromNow >= token.expiresAt) {
        console.log(`🔄 Jira token expiring soon or expired for user ${userId}, attempting refresh...`);
        // Try to refresh token
        try {
          return await this.refreshAccessToken(userId, accountId);
        } catch (refreshError) {
          // If refresh fails, the token might have been marked as inactive
          if (refreshError.message.includes('Please reconnect')) {
            throw refreshError; // Re-throw the user-friendly message
          }
          throw new Error('Jira token expired and refresh failed. Please reconnect your Jira account.');
        }
      }

      return token.accessToken;
    } catch (error) {
      console.error('Error getting valid Jira access token:', error.message);
      throw error;
    }
  }

  // Refresh Jira access token
  async refreshAccessToken(userId, accountId = null) {
    let token = null;
    try {
      const whereClause = { userId, provider: 'jira', isActive: true };
      
      if (accountId) {
        whereClause.id = accountId;
      } else {
        whereClause.isPrimary = true;
      }

      token = await Token.findOne({ where: whereClause });

      if (!token) {
        throw new Error('No Jira token found');
      }

      if (!token.refreshToken) {
        throw new Error('No refresh token found');
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        refresh_token: token.refreshToken
      });

      console.log(`🔄 Refreshing Jira access token for user ${userId}${accountId ? `, account ${accountId}` : ''}`);

      const response = await axios.post('https://auth.atlassian.com/oauth/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, expires_in, refresh_token } = response.data;
      
      // Update token in database
      await token.update({
        accessToken: access_token,
        refreshToken: refresh_token || token.refreshToken,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
        lastRefreshedAt: new Date()
      });

      console.log(`✅ Successfully refreshed Jira access token for user ${userId}`);
      return access_token;
    } catch (error) {
      console.error('❌ Error refreshing Jira access token:', error.response?.data || error.message);
      
      // If we have a token and the refresh failed due to invalid refresh token,
      // mark the token as inactive so user needs to re-authenticate
      if (token && (
        error.response?.status === 400 || 
        error.response?.status === 401 ||
        error.message.includes('No refresh token found') ||
        error.response?.data?.error === 'invalid_grant'
      )) {
        console.log(`🔒 Marking Jira token as inactive for user ${userId} due to refresh failure`);
        await token.update({ 
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'refresh_token_invalid'
        });
        throw new Error('Jira token expired and cannot be refreshed. Please reconnect your Jira account.');
      }
      
      throw new Error('Failed to refresh access token');
    }
  }

  // Get Jira issues for a user
  async getIssues(userId, accountId = null, options = {}) {
    try {
      const accessToken = await this.getValidAccessToken(userId, accountId);
      
      // Get user's Jira account details
      const whereClause = { userId, provider: 'jira', isActive: true };
      if (accountId) whereClause.id = accountId;
      
      const account = await Token.findOne({ where: whereClause });
      if (!account || !account.metadata?.cloudId) {
        throw new Error('Jira account not found or missing cloud ID');
      }

      const { cloudId } = account.metadata;
      const {
        assignee = 'currentUser()',
        status = '',
        excludeDone = false,
        maxResults = 50,
        fields = 'summary,description,status,assignee,created,updated,priority,issuetype,project,timetracking'
      } = options;

      // Build JQL query
      let jql = `assignee = ${assignee}`;
      
      // Add status filter if specified
      if (status) {
        jql += ` AND status = "${status}"`;
      }
      
      // Optionally exclude done tasks (for event linking)
      if (excludeDone) {
        jql += ' AND statusCategory != Done';
      }
      
      jql += ' ORDER BY updated DESC';

      const response = await axios.get(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        params: {
          jql,
          maxResults,
          fields
        }
      });

      return response.data;
    } catch (error) {
      // Handle authentication errors specifically
      if (error.message.includes('Please reconnect') || error.message.includes('Please connect')) {
        console.error('🔒 Jira authentication required:', error.message);
        throw error; // Re-throw the user-friendly message
      }
      
      // Handle API errors
      if (error.response?.status === 401) {
        throw new Error('Jira authentication failed. Please reconnect your Jira account.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to access Jira. Please check your account permissions.');
      }
      
      console.error('Error fetching Jira issues:', error.response?.data || error.message);
      throw new Error('Failed to fetch Jira issues');
    }
  }

  // Get a specific Jira issue by key
  async getIssue(userId, issueKey, accountId = null) {
    try {
      const accessToken = await this.getValidAccessToken(userId, accountId);
      
      // Get user's Jira account details
      const whereClause = { userId, provider: 'jira', isActive: true };
      if (accountId) whereClause.id = accountId;
      
      const account = await Token.findOne({ where: whereClause });
      if (!account || !account.metadata?.cloudId) {
        throw new Error('Jira account not found or missing cloud ID');
      }

      const { cloudId } = account.metadata;

      const response = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          params: {
            fields: 'summary,description,status,assignee,created,updated,priority,issuetype,project,timetracking'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Issue not found
      }
      
      // Handle authentication errors specifically
      if (error.message.includes('Please reconnect') || error.message.includes('Please connect')) {
        console.error('🔒 Jira authentication required:', error.message);
        throw error; // Re-throw the user-friendly message
      }
      
      // Handle API errors
      if (error.response?.status === 401) {
        throw new Error('Jira authentication failed. Please reconnect your Jira account.');
      }
      
      console.error('Error fetching Jira issue:', error.response?.data || error.message);
      throw new Error('Failed to fetch Jira issue');
    }
  }

  // Update issue status
  async updateIssueStatus(userId, issueKey, transitionId, accountId = null) {
    try {
      const accessToken = await this.getValidAccessToken(userId, accountId);
      
      const whereClause = { userId, provider: 'jira', isActive: true };
      if (accountId) whereClause.id = accountId;
      
      const account = await Token.findOne({ where: whereClause });
      if (!account || !account.metadata?.cloudId) {
        throw new Error('Jira account not found or missing cloud ID');
      }

      const { cloudId } = account.metadata;

      const response = await axios.post(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
        {
          transition: {
            id: transitionId
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error updating Jira issue status:', error);
      throw new Error('Failed to update issue status');
    }
  }

  // Get available transitions for an issue
  async getIssueTransitions(userId, issueKey, accountId = null) {
    try {
      const accessToken = await this.getValidAccessToken(userId, accountId);
      
      const whereClause = { userId, provider: 'jira', isActive: true };
      if (accountId) whereClause.id = accountId;
      
      const account = await Token.findOne({ where: whereClause });
      if (!account || !account.metadata?.cloudId) {
        throw new Error('Jira account not found or missing cloud ID');
      }

      const { cloudId } = account.metadata;

      const response = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting Jira issue transitions:', error);
      throw new Error('Failed to get issue transitions');
    }
  }

  // Store Jira account information
  async createOrUpdateAccount(userInfo, tokens, options = {}) {
    try {
      const { userId, accountName, isAdditionalAccount = false } = options;
      const { user, resources } = userInfo;

      // Use the first available resource (Jira site)
      const primaryResource = resources[0];
      if (!primaryResource) {
        throw new Error('No Jira sites found for this account');
      }

      // Check if this is the first account for this provider
      const existingAccounts = await Token.count({
        where: { userId, provider: 'jira', isActive: true }
      });
      const isPrimary = existingAccounts === 0;

      const tokenData = {
        userId,
        provider: 'jira',
        accountName: accountName || (isPrimary ? 'Primary Jira' : user.email),
        accountEmail: user.email,
        accountId: user.account_id,
        isPrimary,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scope: tokens.scope,
        metadata: {
          cloudId: primaryResource.id,
          siteName: primaryResource.name,
          siteUrl: primaryResource.url,
          resourceType: primaryResource.resourceType
        },
        isActive: true
      };

      // Create or update the token
      if (isAdditionalAccount) {
        const existingAccount = await Token.findOne({
          where: {
            userId,
            provider: 'jira',
            accountEmail: user.email,
            isActive: true
          }
        });

        if (existingAccount) {
          await existingAccount.update(tokenData);
          return existingAccount;
        } else {
          return await Token.create(tokenData);
        }
      } else {
        const [account] = await Token.upsert(tokenData, {
          where: { userId, provider: 'jira', isPrimary: true }
        });
        return account;
      }
    } catch (error) {
      console.error('Error creating/updating Jira account:', error);
      throw new Error('Failed to create or update Jira account');
    }
  }

  // Check if Jira connection is healthy
  async checkConnectionHealth(userId, accountId = null) {
    try {
      const whereClause = { userId, provider: 'jira', isActive: true };
      
      if (accountId) {
        whereClause.id = accountId;
      } else {
        whereClause.isPrimary = true;
      }

      const token = await Token.findOne({ where: whereClause });

      if (!token) {
        return {
          healthy: false,
          status: 'not_connected',
          message: 'No Jira account connected'
        };
      }

      if (!token.refreshToken) {
        return {
          healthy: false,
          status: 'invalid_token',
          message: 'Token missing refresh capability - reconnection required'
        };
      }

      // Check if token will expire soon
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      if (token.expiresAt && oneHourFromNow >= token.expiresAt) {
        return {
          healthy: false,
          status: 'expires_soon',
          message: 'Token expires soon and may need refresh'
        };
      }

      return {
        healthy: true,
        status: 'connected',
        message: 'Jira connection is healthy',
        account: {
          id: token.id,
          name: token.name,
          email: token.email,
          lastRefreshedAt: token.lastRefreshedAt,
          expiresAt: token.expiresAt
        }
      };
    } catch (error) {
      console.error('Error checking Jira connection health:', error);
      return {
        healthy: false,
        status: 'error',
        message: 'Error checking connection health'
      };
    }
  }
}

module.exports = new JiraService(); 