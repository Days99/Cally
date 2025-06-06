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

  // Get projects for a specific Jira account
  async getProjects(req, res) {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          error: 'Missing account ID',
          message: 'Account ID is required'
        });
      }

      const projects = await jiraService.getProjects(userId, accountId);

      res.json({
        success: true,
        projects: projects,
        message: 'Projects fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching Jira projects:', error);
      
      // Handle authentication errors with specific status codes
      if (error.message.includes('Please reconnect') || error.message.includes('Authentication failed')) {
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
        error: 'Failed to fetch projects',
        message: error.message
      });
    }
  }

  // Get project metadata (issue types, priorities, assignable users)
  async getProjectMetadata(req, res) {
    try {
      const userId = req.user.id;
      const { accountId, projectKey } = req.params;

      if (!accountId || !projectKey) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'Account ID and project key are required'
        });
      }

      const metadata = await jiraService.getProjectMetadata(userId, accountId, projectKey);

      res.json({
        success: true,
        metadata: metadata,
        message: 'Project metadata fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching project metadata:', error);
      
      // Handle authentication errors with specific status codes
      if (error.message.includes('Please reconnect') || error.message.includes('Authentication failed')) {
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
      
      if (error.message.includes('Project not found')) {
        return res.status(404).json({
          error: 'Project not found',
          message: error.message
        });
      }
      
      res.status(500).json({
        error: 'Failed to fetch project metadata',
        message: error.message
      });
    }
  }

  // Create a new Jira issue
  async createIssue(req, res) {
    try {
      const userId = req.user.id;
      const { 
        accountId, 
        projectKey, 
        summary, 
        description, 
        issueType, 
        priority, 
        assignee 
      } = req.body;

      // Validate required fields
      if (!accountId || !projectKey || !summary) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'accountId, projectKey, and summary are required'
        });
      }

      // Create the issue
      const issueData = {
        projectKey,
        summary,
        description,
        issueType: issueType,
        priority: priority,
        assignee
      };

      console.log('Creating Jira issue:', issueData);
      const createdIssue = await jiraService.createIssue(userId, accountId, issueData);

      res.json({
        success: true,
        issue: createdIssue,
        message: 'Issue created successfully'
      });
    } catch (error) {
      console.error('Error creating Jira issue:', error);
      res.status(500).json({
        error: 'Failed to create issue',
        message: error.message
      });
    }
  }

  // Get Jira workflow preferences
  async getWorkflowPreferences(req, res) {
    try {
      const userId = req.user.id;
      const { User } = require('../models');
      
      const user = await User.findByPk(userId);
      const jiraWorkflow = user.preferences?.jiraWorkflow || {
        enabled: false,
        statusActions: {
          // Default workflow actions (can be customized)
          'To Do': null, // No action when moving to backlog
          'In Progress': 'developing', // Move to "In Progress" when working on it
          'In Review': 'review', // Move to "In Review" when ready for review  
          'Done': 'done' // Move to "Done" when completed
        },
        deleteEventOnComplete: true, // Delete calendar event when Jira task is marked as Done
        createEventOnAssign: false // Automatically create calendar event when assigned
      };

      res.json({
        success: true,
        workflow: jiraWorkflow,
        message: 'Jira workflow preferences retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting Jira workflow preferences:', error);
      res.status(500).json({
        error: 'Failed to get workflow preferences',
        message: error.message
      });
    }
  }

  // Update Jira workflow preferences
  async updateWorkflowPreferences(req, res) {
    try {
      const userId = req.user.id;
      const { User } = require('../models');
      const { workflow } = req.body;

      const user = await User.findByPk(userId);
      
      // Update preferences
      const updatedPreferences = {
        ...user.preferences,
        jiraWorkflow: {
          ...user.preferences?.jiraWorkflow,
          ...workflow
        }
      };

      await user.update({ preferences: updatedPreferences });

      res.json({
        success: true,
        workflow: updatedPreferences.jiraWorkflow,
        message: 'Jira workflow preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating Jira workflow preferences:', error);
      res.status(500).json({
        error: 'Failed to update workflow preferences',
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

      res.json({
        success: true,
        health,
        message: health.healthy ? 'Connection is healthy' : health.message
      });
    } catch (error) {
      console.error('Error checking Jira health:', error);
      res.status(500).json({
        error: 'Failed to check connection health',
        message: error.message
      });
    }
  }

  // Get accounts that need reconnection
  async getAccountsNeedingReconnection(req, res) {
    try {
      const userId = req.user.id;

      const accounts = await jiraService.getAccountsNeedingReconnection(userId);

      res.json({
        success: true,
        accounts,
        message: accounts.length > 0 
          ? `${accounts.length} account(s) need reconnection`
          : 'All Jira accounts are properly configured'
      });
    } catch (error) {
      console.error('Error getting accounts needing reconnection:', error);
      res.status(500).json({
        error: 'Failed to get account status',
        message: error.message
      });
    }
  }
}

module.exports = new JiraController(); 