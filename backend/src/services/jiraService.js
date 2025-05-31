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
        throw new Error(`No Jira token found for user${accountId ? ' and account' : ''}`);
      }

      // Check if token is expired
      if (token.expiresAt && new Date() >= token.expiresAt) {
        // Try to refresh token
        return await this.refreshAccessToken(userId, accountId);
      }

      return token.accessToken;
    } catch (error) {
      console.error('Error getting valid Jira access token:', error);
      throw error;
    }
  }

  // Refresh Jira access token
  async refreshAccessToken(userId, accountId = null) {
    try {
      const whereClause = { userId, provider: 'jira', isActive: true };
      
      if (accountId) {
        whereClause.id = accountId;
      } else {
        whereClause.isPrimary = true;
      }

      const token = await Token.findOne({ where: whereClause });

      if (!token || !token.refreshToken) {
        throw new Error('No refresh token found');
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        refresh_token: token.refreshToken
      });

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
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null
      });

      return access_token;
    } catch (error) {
      console.error('Error refreshing Jira access token:', error);
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
        maxResults = 50,
        fields = 'summary,status,assignee,created,updated,priority,issuetype'
      } = options;

      let jql = `assignee = ${assignee}`;
      if (status) {
        jql += ` AND status = "${status}"`;
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
      console.error('Error fetching Jira issues:', error);
      throw new Error('Failed to fetch Jira issues');
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
}

module.exports = new JiraService(); 