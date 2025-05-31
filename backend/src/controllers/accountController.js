const accountManager = require('../services/accountManager');
const googleAuthService = require('../services/googleAuth');

class AccountController {
  // Get all accounts for the current user
  async getAccounts(req, res) {
    try {
      const userId = req.user.id;
      const accounts = await accountManager.getAllAccounts(userId);

      res.json({
        success: true,
        accounts,
        message: 'Accounts fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({
        error: 'Failed to fetch accounts',
        message: error.message
      });
    }
  }

  // Get accounts for a specific provider
  async getAccountsByProvider(req, res) {
    try {
      const userId = req.user.id;
      const { provider } = req.params;

      const accounts = await accountManager.getAccountsByProvider(userId, provider);

      res.json({
        success: true,
        accounts,
        provider,
        message: `${provider} accounts fetched successfully`
      });
    } catch (error) {
      console.error('Error fetching provider accounts:', error);
      res.status(500).json({
        error: 'Failed to fetch provider accounts',
        message: error.message
      });
    }
  }

  // Initiate adding a new Google account
  async addGoogleAccount(req, res) {
    try {
      const userId = req.user.id;
      const { accountName } = req.body;

      // Generate auth URL for additional account
      const authUrl = await googleAuthService.getAuthUrl({
        userId,
        isAdditionalAccount: true,
        accountName
      });

      res.json({
        success: true,
        authUrl,
        message: 'Please authorize the additional Google account'
      });
    } catch (error) {
      console.error('Error initiating Google account addition:', error);
      res.status(500).json({
        error: 'Failed to initiate account addition',
        message: error.message
      });
    }
  }

  // Remove an account
  async removeAccount(req, res) {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      await accountManager.removeAccount(userId, accountId);

      res.json({
        success: true,
        message: 'Account removed successfully'
      });
    } catch (error) {
      console.error('Error removing account:', error);
      res.status(500).json({
        error: 'Failed to remove account',
        message: error.message
      });
    }
  }

  // Set an account as primary
  async setPrimaryAccount(req, res) {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      await accountManager.setPrimaryAccount(userId, accountId);

      res.json({
        success: true,
        message: 'Primary account updated successfully'
      });
    } catch (error) {
      console.error('Error setting primary account:', error);
      res.status(500).json({
        error: 'Failed to set primary account',
        message: error.message
      });
    }
  }

  // Update account name
  async updateAccountName(req, res) {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;
      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Account name is required'
        });
      }

      const updatedAccount = await accountManager.updateAccountName(userId, accountId, name.trim());

      res.json({
        success: true,
        account: updatedAccount,
        message: 'Account name updated successfully'
      });
    } catch (error) {
      console.error('Error updating account name:', error);
      res.status(500).json({
        error: 'Failed to update account name',
        message: error.message
      });
    }
  }

  // Get account connection status and stats
  async getAccountStats(req, res) {
    try {
      const userId = req.user.id;
      const accounts = await accountManager.getAllAccounts(userId);

      const stats = {
        totalAccounts: 0,
        byProvider: {}
      };

      Object.keys(accounts).forEach(provider => {
        const providerAccounts = accounts[provider];
        stats.totalAccounts += providerAccounts.length;
        stats.byProvider[provider] = {
          count: providerAccounts.length,
          accounts: providerAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            email: acc.email,
            isPrimary: acc.isPrimary,
            connectedAt: acc.connectedAt
          }))
        };
      });

      res.json({
        success: true,
        stats,
        message: 'Account stats fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching account stats:', error);
      res.status(500).json({
        error: 'Failed to fetch account stats',
        message: error.message
      });
    }
  }
}

module.exports = new AccountController(); 