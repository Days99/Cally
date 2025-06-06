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
      scope: 'offline_access read:me read:jira-user read:jira-work write:jira-work manage:jira-project',
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

      // Use form-encoded data for authorization code exchange (OAuth 2.0 standard)
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.JIRA_REDIRECT_URI
      });

      const response = await axios.post('https://auth.atlassian.com/oauth/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      // Validate response format
      const { access_token, refresh_token, expires_in, scope } = response.data;
      
      if (!access_token) {
        throw new Error('Invalid token response: missing access_token');
      }

      console.log('Jira token exchange successful', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        expiresIn: expires_in,
        scope: scope
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Jira tokens:', error.response?.data || error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }

      // Handle specific OAuth errors
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error === 'invalid_grant') {
          throw new Error('Authorization code is invalid or expired. Please try the authorization flow again.');
        }
        if (errorData.error === 'invalid_client') {
          throw new Error('Invalid client credentials. Please check your Jira OAuth configuration.');
        }
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
        
        // Check if we have a refresh token
        if (!token.refreshToken) {
          console.log(`⚠️  No refresh token available for user ${userId}. Token was likely connected before offline_access scope was added.`);
          
          // Instead of failing immediately, let's try using the current token
          // and provide a helpful message for the user
          console.log(`🔄 Attempting to use existing token for user ${userId} (may be expired)`);
          
          // Mark this token as needing reconnection for future reference
          await token.update({
            metadata: {
              ...token.metadata,
              needsReconnection: true,
              lastRefreshAttempt: new Date(),
              refreshFailureReason: 'missing_refresh_token'
            }
          });
          
          // Try to use the existing token - if it fails, the API call will handle it
          return token.accessToken;
        }
        
        // Try to refresh token if we have refresh token
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

      // Use JSON payload as specified in Atlassian documentation
      const payload = {
        grant_type: 'refresh_token',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        refresh_token: token.refreshToken
      };

      console.log(`🔄 Refreshing Jira access token for user ${userId}${accountId ? `, account ${accountId}` : ''}`);

      const response = await axios.post('https://auth.atlassian.com/oauth/token', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const { access_token, refresh_token, expires_in, scope } = response.data;
      
      // Validate response - access_token is required
      if (!access_token) {
        throw new Error('Invalid response: missing access_token');
      }

      // Update token in database with new values
      // Important: Always use the new refresh_token if provided (rotating refresh tokens)
      await token.update({
        accessToken: access_token,
        refreshToken: refresh_token || token.refreshToken, // Use new refresh token if provided
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
        scope: scope || token.scope, // Update scope if provided
        lastRefreshedAt: new Date(),
        // Clear any reconnection flags since refresh was successful
        metadata: {
          ...token.metadata,
          needsReconnection: false,
          lastSuccessfulRefresh: new Date(),
          refreshFailureReason: null
        }
      });

      console.log(`✅ Successfully refreshed Jira access token for user ${userId}`);
      return access_token;
    } catch (error) {
      console.error('❌ Error refreshing Jira access token:', error.response?.data || error.message);
      
      // Handle specific error cases based on Atlassian documentation
      if (token) {
        let shouldDeactivate = false;
        let deactivationReason = 'refresh_failed';
        let userMessage = 'Failed to refresh access token';

        // Check for specific error conditions mentioned in the documentation
        if (error.response?.status === 403 && error.response?.data?.error === 'invalid_grant') {
          // 403 Forbidden with invalid_grant error
          const errorDescription = error.response.data.error_description || '';
          
          if (errorDescription.includes('Unknown or invalid refresh token')) {
            shouldDeactivate = true;
            deactivationReason = 'invalid_refresh_token';
            userMessage = 'Jira refresh token is invalid or expired. This can happen if your Atlassian account password was changed or the refresh token has expired. Please reconnect your Jira account.';
          }
        } else if (error.response?.status === 400 || error.response?.status === 401) {
          // General authentication errors
          shouldDeactivate = true;
          deactivationReason = 'refresh_token_invalid';
          userMessage = 'Jira token expired and cannot be refreshed. Please reconnect your Jira account.';
        } else if (error.message.includes('No refresh token found')) {
          // No refresh token available
          deactivationReason = 'missing_refresh_token';
          userMessage = 'Jira account was connected before automatic token refresh was available. Please reconnect your Jira account to enable automatic token refresh.';
          
          // Don't deactivate immediately for missing refresh token, mark for reconnection instead
          await token.update({
            metadata: {
              ...token.metadata,
              needsReconnection: true,
              lastRefreshAttempt: new Date(),
              refreshFailureReason: deactivationReason
            }
          });
          
          throw new Error(userMessage);
        }

        // Deactivate token if necessary
        if (shouldDeactivate) {
          console.log(`🔒 Marking Jira token as inactive for user ${userId} due to refresh failure: ${deactivationReason}`);
          await token.update({ 
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: deactivationReason,
            metadata: {
              ...token.metadata,
              lastRefreshAttempt: new Date(),
              refreshFailureReason: deactivationReason
            }
          });
          throw new Error(userMessage);
        }
      }
      
      // Generic error if we couldn't categorize it
      throw new Error('Failed to refresh access token. Please try again or reconnect your Jira account if the problem persists.');
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

      // If we successfully made the API call, clear any reconnection flags
      if (account.metadata?.needsReconnection) {
        await account.update({
          metadata: {
            ...account.metadata,
            needsReconnection: false,
            lastSuccessfulCall: new Date()
          }
        });
      }

      return response.data;
    } catch (error) {
      // Handle authentication errors specifically
      if (error.message.includes('Please reconnect') || error.message.includes('Please connect')) {
        console.error('🔒 Jira authentication required:', error.message);
        throw error; // Re-throw the user-friendly message
      }
      
      // Handle API authentication failures (401/403)
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Check if this account needs reconnection due to missing refresh token
        const whereClause = { userId, provider: 'jira', isActive: true };
        if (accountId) whereClause.id = accountId;
        
        const account = await Token.findOne({ where: whereClause });
        
        if (account && !account.refreshToken) {
          console.log(`🔄 Token expired for account without refresh capability. Account needs to be reconnected with updated permissions.`);
          
          // Mark token as needing reconnection
          await account.update({
            metadata: {
              ...account.metadata,
              needsReconnection: true,
              lastFailedCall: new Date(),
              refreshFailureReason: 'token_expired_no_refresh'
            }
          });
          
          throw new Error('Jira token has expired and cannot be automatically refreshed. Please reconnect your Jira account to restore access.');
        }
        
        // Standard auth error for tokens with refresh capability
        throw new Error('Jira authentication failed. Please reconnect your Jira account.');
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

  // Get available workflows for a project (for configuration)
  async getProjectWorkflows(userId, projectKey, accountId = null) {
    try {
      const accessToken = await this.getValidAccessToken(userId, accountId);
      
      const whereClause = { userId, provider: 'jira', isActive: true };
      if (accountId) whereClause.id = accountId;
      
      const account = await Token.findOne({ where: whereClause });
      if (!account || !account.metadata?.cloudId) {
        throw new Error('Jira account not found or missing cloud ID');
      }

      const { cloudId } = account.metadata;

      // Get project info first
      const projectResponse = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${projectKey}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      // Get issue types for the project
      const issueTypesResponse = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${projectKey}/statuses`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        project: projectResponse.data,
        issueTypes: issueTypesResponse.data
      };
    } catch (error) {
      console.error('Error getting Jira project workflows:', error);
      throw new Error('Failed to get project workflows');
    }
  }

  // Get available projects that the user can create issues in
  async getProjects(userId, accountId) {
    try {
      const accessToken = await this.getValidAccessToken(userId, accountId);
      
      const account = await Token.findOne({ 
        where: { 
          id: accountId,
          userId, 
          provider: 'jira', 
          isActive: true 
        } 
      });
      
      if (!account || !account.metadata?.cloudId) {
        throw new Error('Jira account not found or missing cloud ID');
      }

      const { cloudId } = account.metadata;

      console.log('Fetching projects for Jira account:', accountId);

      const response = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          params: {
            // Only get projects where user has CREATE_ISSUES permission
            action: 'create',
            maxResults: 50,
            expand: 'description,lead,url'
          }
        }
      );

      console.log('Fetched projects:', response.data);

      // Format projects for frontend use
      const projects = response.data.values.map(project => ({
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description,
        projectTypeKey: project.projectTypeKey,
        lead: project.lead?.displayName,
        url: project.self
      }));

      return projects;

    } catch (error) {
      console.error('Error fetching Jira projects:', error.response?.data || error.message);
      
      // Handle specific Jira API errors
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please reconnect your Jira account.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to view projects');
      }
      
      throw new Error('Failed to fetch Jira projects');
    }
  }

  // Get project metadata (issue types, priorities, assignable users)
  async getProjectMetadata(userId, accountId, projectKey) {
    try {
      const accessToken = await this.getValidAccessToken(userId, accountId);
      
      const account = await Token.findOne({ 
        where: { 
          id: accountId,
          userId, 
          provider: 'jira', 
          isActive: true 
        } 
      });
      
      if (!account || !account.metadata?.cloudId) {
        throw new Error('Jira account not found or missing cloud ID');
      }

      const { cloudId } = account.metadata;

      console.log('Fetching project metadata for:', projectKey);

      // Fetch project details with issue types
      const projectResponse = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${projectKey}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          params: {
            expand: 'issueTypes'
          }
        }
      );

      // Fetch create metadata for the project (this gives us available fields and their options)
      const createMetaResponse = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/createmeta`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          params: {
            projectKeys: projectKey,
            expand: 'projects.issuetypes.fields'
          }
        }
      );

      // Fetch assignable users for the project
      const assignableUsersResponse = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/user/assignable/search`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          params: {
            project: projectKey,
            maxResults: 50
          }
        }
      );

      const projectData = createMetaResponse.data.projects[0];
      if (!projectData) {
        throw new Error('Project metadata not found');
      }

      // Extract issue types and their fields
      const issueTypes = projectData.issuetypes.map(issueType => ({
        id: issueType.id,
        name: issueType.name,
        description: issueType.description,
        iconUrl: issueType.iconUrl,
        subtask: issueType.subtask
      }));

      // Extract priorities from the first issue type (usually consistent across issue types)
      const firstIssueType = projectData.issuetypes[0];
      const priorityField = firstIssueType?.fields?.priority;
      const priorities = priorityField?.allowedValues?.map(priority => ({
        id: priority.id,
        name: priority.name,
        description: priority.description,
        iconUrl: priority.iconUrl
      })) || [];

      // Format assignable users
      const assignableUsers = assignableUsersResponse.data.map(user => ({
        accountId: user.accountId,
        emailAddress: user.emailAddress,
        displayName: user.displayName,
        avatarUrls: user.avatarUrls,
        active: user.active
      })).filter(user => user.active); // Only active users

      console.log('Project metadata fetched successfully:', {
        issueTypes: issueTypes.length,
        priorities: priorities.length,
        assignableUsers: assignableUsers.length
      });

      return {
        project: {
          id: projectData.id,
          key: projectData.key,
          name: projectData.name
        },
        issueTypes,
        priorities,
        assignableUsers
      };

    } catch (error) {
      console.error('Error fetching project metadata:', error.response?.data || error.message);
      
      // Handle specific Jira API errors
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please reconnect your Jira account.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to access project metadata');
      }
      
      if (error.response?.status === 404) {
        throw new Error('Project not found or you do not have access to it');
      }
      
      throw new Error('Failed to fetch project metadata');
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
          status: 'needs_reconnection',
          message: 'Token missing refresh capability - reconnection recommended for automatic token refresh',
          canUpgrade: true,
          account: {
            id: token.id,
            name: token.accountName,
            email: token.accountEmail,
            connectedAt: token.createdAt
          }
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
          name: token.accountName,
          email: token.accountEmail,
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

  // Get accounts that need reconnection
  async getAccountsNeedingReconnection(userId) {
    try {
      const accounts = await Token.findAll({
        where: {
          userId,
          provider: 'jira',
          isActive: true
        },
        attributes: ['id', 'accountName', 'accountEmail', 'refreshToken', 'expiresAt', 'metadata', 'createdAt']
      });

      const needsReconnection = accounts.filter(account => {
        // Account needs reconnection if:
        // 1. No refresh token
        // 2. Marked as needing reconnection in metadata
        // 3. Token is expired and no refresh token
        const hasRefreshToken = !!account.refreshToken;
        const markedForReconnection = account.metadata?.needsReconnection;
        const isExpired = account.expiresAt && new Date() > account.expiresAt;
        
        return !hasRefreshToken || markedForReconnection || (isExpired && !hasRefreshToken);
      });

      return needsReconnection.map(account => ({
        id: account.id,
        name: account.accountName,
        email: account.accountEmail,
        connectedAt: account.createdAt,
        reason: !account.refreshToken 
          ? 'missing_refresh_token' 
          : account.metadata?.refreshFailureReason || 'needs_upgrade',
        message: !account.refreshToken
          ? 'Account was connected before automatic token refresh was available'
          : 'Account needs to be reconnected for optimal functionality'
      }));
    } catch (error) {
      console.error('Error getting accounts needing reconnection:', error);
      return [];
    }
  }

  // Create a new Jira issue
  async createIssue(userId, accountId, issueData) {
    try {
      const accessToken = await this.getValidAccessToken(userId, accountId);
      
      const account = await Token.findOne({ 
        where: { 
          id: accountId,
          userId, 
          provider: 'jira', 
          isActive: true 
        } 
      });
      
      if (!account || !account.metadata?.cloudId) {
        throw new Error('Jira account not found or missing cloud ID');
      }

      const { cloudId } = account.metadata;
      const { projectKey, summary, description, issueType, priority, assignee } = issueData;

      console.log('Creating Jira issue:', issueData);

      // Helper function to check if a value has meaningful content
      const hasContent = (value) => value && typeof value === 'string' && value.trim().length > 0 && !/^\s*$/.test(value);

      // Validate required fields
      if (!hasContent(projectKey)) {
        throw new Error('Project key is required');
      }
      if (!hasContent(summary)) {
        throw new Error('Summary is required');
      }
      if (!hasContent(issueType)) {
        throw new Error('Issue type is required');
      }

      // Build the issue payload with only required fields
      const issuePayload = {
        fields: {
          project: {
            key: projectKey.trim()
          },
          summary: summary.trim(),
          issuetype: {
            name: issueType.trim()
          }
        }
      };

      // Add optional fields only if they have meaningful values
      if (hasContent(description)) {
        issuePayload.fields.description = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description.trim()
                }
              ]
            }
          ]
        };
      }

      // Only include priority if it has meaningful content
      if (hasContent(priority)) {
        issuePayload.fields.priority = {
          name: priority.trim()
        };
      }

      // Only include assignee if it has meaningful content
      if (hasContent(assignee)) {
        const trimmedAssignee = assignee.trim();
        
        console.log('Processing assignee:', trimmedAssignee);
        
        // Handle assignee by email, account ID, or username
        if (trimmedAssignee.includes('@')) {
          // Assign by email address
          console.log('Assigning by email address');
          issuePayload.fields.assignee = {
            emailAddress: trimmedAssignee
          };
        } else if (trimmedAssignee.includes(':') || trimmedAssignee.length >= 24) {
          // Assign by account ID (Atlassian account IDs are typically 24+ chars and may contain colons)
          console.log('Assigning by account ID');
          issuePayload.fields.assignee = {
            accountId: trimmedAssignee
          };
        } else {
          // For shorter strings without @ or :, assume it's an account ID anyway (modern Jira)
          // Account IDs are the preferred method in modern Jira
          console.log('Assigning by account ID (fallback)');
          issuePayload.fields.assignee = {
            accountId: trimmedAssignee
          };
        }
      }

      console.log('Creating Jira issue with payload:', JSON.stringify(issuePayload, null, 2));

      const response = await axios.post(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
        issuePayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Jira issue created successfully:', response.data);

      // Return the created issue with additional details
      return {
        key: response.data.key,
        id: response.data.id,
        self: response.data.self,
        summary: summary,
        projectKey: projectKey,
        issueType: issueType,
        priority: priority,
        assignee: assignee
      };

    } catch (error) {
      console.error('Error creating Jira issue:', error.response?.data || error.message);
      
      // Handle specific Jira API errors
      if (error.response?.status === 400) {
        const errorDetails = error.response.data?.errors || {};
        const errorMessages = Object.values(errorDetails).join(', ');
        throw new Error(`Invalid issue data: ${errorMessages || 'Please check the project key and required fields'}`);
      }
      
      if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to create issues in this project');
      }
      
      if (error.response?.status === 404) {
        throw new Error('Project not found or you do not have access to it');
      }
      
      throw new Error('Failed to create Jira issue');
    }
  }
}

module.exports = new JiraService(); 