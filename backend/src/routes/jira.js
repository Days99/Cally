const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const jiraController = require('../controllers/jiraController');

// Jira OAuth callback (public route)
router.get('/callback', jiraController.callback);

// All other routes require authentication
router.use(authenticateToken);

// Jira OAuth routes
router.post('/auth', jiraController.getAuthUrl);

// Workflow preferences
router.get('/workflow', jiraController.getWorkflowPreferences);
router.put('/workflow', jiraController.updateWorkflowPreferences);

// Connection health check
router.get('/health', jiraController.checkHealth);
router.get('/health/:accountId', jiraController.checkHealth);

// Issue management routes
router.get('/issues', jiraController.getAllIssues);
router.get('/issues/:accountId', jiraController.getIssues);
router.put('/issues/:accountId/:issueKey/status', jiraController.updateIssueStatus);
router.get('/issues/:accountId/:issueKey/transitions', jiraController.getIssueTransitions);

module.exports = router; 