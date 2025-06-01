const jiraService = require('../services/jiraService');

class JiraController {
  // Get Jira OAuth URL
  async getAuthUrl(req, res) {
    try {
      const userId = req.user.id;
      const { accountName } = req.body;

      const authUrl = jiraService.getAuthUrl({
        userId,
        accountName
      });

      res.json({
        success: true,
        authUrl,
        message: 'Jira OAuth URL generated successfully'
      });
    } catch (error) {
      console.error('Error generating Jira auth URL:', error);
      res.status(500).json({
        error: 'Failed to generate auth URL',
        message: error.message
      });
    }
  }

  // Handle Jira OAuth callback
  async callback(req, res) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({
          error: 'Authorization code required',
          message: 'No authorization code provided'
        });
      }

      // Parse state parameter
      let stateData = {};
      if (state) {
        try {
          stateData = JSON.parse(state);
        } catch (e) {
          console.log('Invalid state parameter:', state);
        }
      }

      // Exchange code for tokens
      const tokens = await jiraService.getTokens(code);

      // Get user info and resources
      const userInfo = await jiraService.getUserInfo(tokens.access_token);

      // Store account information
      await jiraService.createOrUpdateAccount(userInfo, tokens, {
        userId: stateData.userId,
        accountName: stateData.accountName,
        isAdditionalAccount: stateData.isAdditionalAccount
      });

      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/accounts?jira=connected`);
    } catch (error) {
      console.error('Error in Jira callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(error.message)}`);
    }
  }

  // Get user's Jira issues
  async getIssues(req, res) {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;
      const { status, assignee, maxResults = 50 } = req.query;

      const issues = await jiraService.getIssues(userId, accountId, {
        status,
        assignee,
        maxResults: parseInt(maxResults)
      });

      res.json({
        success: true,
        issues: issues.issues || [],
        total: issues.total || 0,
        message: 'Issues fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching Jira issues:', error);
      
      // Handle authentication errors with specific status codes
      if (error.message.includes('Please reconnect') || error.message.includes('Please connect')) {
        return res.status(401).json({
          error: 'Authentication required',
          message: error.message,
          requiresReconnection: true
        });
      }
      
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: error.message
        });
      }
      
      res.status(500).json({
        error: 'Failed to fetch issues',
        message: error.message
      });
    }
  }

  // Get issues for all user's Jira accounts
  async getAllIssues(req, res) {
    try {
      const userId = req.user.id;
      const { status, assignee, maxResults = 50 } = req.query;

      // Get all Jira accounts for the user
      const { Token } = require('../models');
      const accounts = await Token.findAll({
        where: {
          userId,
          provider: 'jira',
          isActive: true
        }
      });

      if (accounts.length === 0) {
        return res.json({
          success: true,
          issues: [],
          total: 0,
          message: 'No Jira accounts connected',
          requiresConnection: true
        });
      }

      // Fetch issues from all accounts
      const allIssues = [];
      const failedAccounts = [];
      
      for (const account of accounts) {
        try {
          const issues = await jiraService.getIssues(userId, account.id, {
            status,
            assignee,
            maxResults: parseInt(maxResults)
          });

          // Add account info to each issue
          const issuesWithAccount = issues.issues.map(issue => ({
            ...issue,
            accountId: account.id,
            accountName: account.accountName,
            siteName: account.metadata?.siteName
          }));

          allIssues.push(...issuesWithAccount);
        } catch (error) {
          console.error(`Error fetching issues for account ${account.id}:`, error);
          
          // Track failed accounts for better user feedback
          failedAccounts.push({
            accountId: account.id,
            accountName: account.accountName,
            error: error.message,
            requiresReconnection: error.message.includes('Please reconnect') || error.message.includes('Please connect')
          });
        }
      }

      const response = {
        success: true,
        issues: allIssues,
        total: allIssues.length,
        message: 'Issues fetched successfully from all accounts'
      };

      // Add failed accounts info if any
      if (failedAccounts.length > 0) {
        response.partialFailure = true;
        response.failedAccounts = failedAccounts;
        response.message = `Issues fetched from ${accounts.length - failedAccounts.length}/${accounts.length} accounts`;
      }

      res.json(response);
    } catch (error) {
      console.error('Error fetching all Jira issues:', error);
      res.status(500).json({
        error: 'Failed to fetch issues',
        message: error.message
      });
    }
  }

  // Update issue status
  async updateIssueStatus(req, res) {
    try {
      const userId = req.user.id;
      const { accountId, issueKey } = req.params;
      const { transitionId } = req.body;

      if (!transitionId) {
        return res.status(400).json({
          error: 'Transition ID required',
          message: 'Please provide a transition ID'
        });
      }

      await jiraService.updateIssueStatus(userId, issueKey, transitionId, accountId);

      res.json({
        success: true,
        message: 'Issue status updated successfully'
      });
    } catch (error) {
      console.error('Error updating issue status:', error);
      res.status(500).json({
        error: 'Failed to update issue status',
        message: error.message
      });
    }
  }

  // Get available transitions for an issue
  async getIssueTransitions(req, res) {
    try {
      const userId = req.user.id;
      const { accountId, issueKey } = req.params;

      const transitions = await jiraService.getIssueTransitions(userId, issueKey, accountId);

      res.json({
        success: true,
        transitions: transitions.transitions || [],
        message: 'Transitions fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching issue transitions:', error);
      res.status(500).json({
        error: 'Failed to fetch transitions',
        message: error.message
      });
    }
  }

  // Check Jira connection health
  async checkHealth(req, res) {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      const health = await jiraService.checkConnectionHealth(userId, accountId);

      const statusCode = health.healthy ? 200 : 
                        health.status === 'not_connected' ? 404 : 401;

      res.status(statusCode).json({
        success: health.healthy,
        health,
        message: health.message
      });
    } catch (error) {
      console.error('Error checking Jira health:', error);
      res.status(500).json({
        error: 'Failed to check connection health',
        message: error.message
      });
    }
  }
}

module.exports = new JiraController(); 