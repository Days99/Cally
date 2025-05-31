const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const accountController = require('../controllers/accountController');

// All routes require authentication
router.use(authenticateToken);

// Get all accounts for current user
router.get('/', accountController.getAccounts);

// Get accounts by provider
router.get('/provider/:provider', accountController.getAccountsByProvider);

// Get account statistics
router.get('/stats', accountController.getAccountStats);

// Get Jira issues for an account
router.get('/:accountId/jira/issues', accountController.getJiraIssues);

// Add a new Google account
router.post('/google/add', accountController.addGoogleAccount);

// Update account name
router.put('/:accountId/name', accountController.updateAccountName);

// Set account as primary
router.put('/:accountId/primary', accountController.setPrimaryAccount);

// Remove an account
router.delete('/:accountId', accountController.removeAccount);

module.exports = router; 