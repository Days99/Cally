const { Token, User } = require('../models');
const googleAuthService = require('./googleAuth');

class AccountManager {
  // Get all accounts for a user and provider
  async getAccountsByProvider(userId, provider) {
    try {
      const accounts = await Token.findAll({
        where: {
          userId,
          provider,
          isActive: true
        },
        order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
        attributes: [
          'id', 'accountName', 'accountEmail', 'accountId', 
          'isPrimary', 'isActive', 'createdAt', 'metadata'
        ]
      });

      return accounts.map(account => ({
        id: account.id,
        name: account.accountName || account.accountEmail || 'Unnamed Account',
        email: account.accountEmail,
        isPrimary: account.isPrimary,
        isActive: account.isActive,
        provider: provider,
        connectedAt: account.createdAt,
        metadata: account.metadata || {}
      }));
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  // Get all accounts for a user across all providers
  async getAllAccounts(userId) {
    try {
      const accounts = await Token.findAll({
        where: {
          userId,
          isActive: true
        },
        order: [['provider', 'ASC'], ['isPrimary', 'DESC'], ['createdAt', 'ASC']]
      });

      // Group by provider
      const groupedAccounts = accounts.reduce((acc, account) => {
        if (!acc[account.provider]) {
          acc[account.provider] = [];
        }
        
        acc[account.provider].push({
          id: account.id,
          name: account.accountName || account.accountEmail || 'Unnamed Account',
          email: account.accountEmail,
          isPrimary: account.isPrimary,
          isActive: account.isActive,
          provider: account.provider,
          connectedAt: account.createdAt,
          metadata: account.metadata || {}
        });
        
        return acc;
      }, {});

      return groupedAccounts;
    } catch (error) {
      console.error('Error fetching all accounts:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  // Add a new account for a provider
  async addAccount(userId, provider, tokenData, accountInfo = {}) {
    try {
      // Check if this is the first account for this provider
      const existingAccounts = await Token.count({
        where: { userId, provider, isActive: true }
      });

      const isPrimary = existingAccounts === 0;

      // Create the new token/account
      const account = await Token.create({
        userId,
        provider,
        accountName: accountInfo.name,
        accountEmail: accountInfo.email,
        accountId: accountInfo.id,
        isPrimary,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        scope: tokenData.scope,
        metadata: accountInfo.metadata || {}
      });

      return {
        id: account.id,
        name: account.accountName || account.accountEmail || 'Unnamed Account',
        email: account.accountEmail,
        isPrimary: account.isPrimary,
        provider: account.provider,
        connectedAt: account.createdAt
      };
    } catch (error) {
      console.error('Error adding account:', error);
      throw new Error('Failed to add account');
    }
  }

  // Remove an account
  async removeAccount(userId, accountId) {
    try {
      const account = await Token.findOne({
        where: { id: accountId, userId, isActive: true }
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // If this was the primary account, make another account primary
      if (account.isPrimary) {
        const otherAccount = await Token.findOne({
          where: {
            userId,
            provider: account.provider,
            isActive: true,
            id: { [require('sequelize').Op.ne]: accountId }
          }
        });

        if (otherAccount) {
          await otherAccount.update({ isPrimary: true });
        }
      }

      // Soft delete by setting isActive to false
      await account.update({ isActive: false });

      return true;
    } catch (error) {
      console.error('Error removing account:', error);
      throw new Error('Failed to remove account');
    }
  }

  // Set an account as primary
  async setPrimaryAccount(userId, accountId) {
    try {
      const account = await Token.findOne({
        where: { id: accountId, userId, isActive: true }
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Remove primary flag from other accounts of the same provider
      await Token.update(
        { isPrimary: false },
        { 
          where: { 
            userId, 
            provider: account.provider, 
            isActive: true,
            id: { [require('sequelize').Op.ne]: accountId }
          }
        }
      );

      // Set this account as primary
      await account.update({ isPrimary: true });

      return true;
    } catch (error) {
      console.error('Error setting primary account:', error);
      throw new Error('Failed to set primary account');
    }
  }

  // Update account name
  async updateAccountName(userId, accountId, newName) {
    try {
      const account = await Token.findOne({
        where: { id: accountId, userId, isActive: true }
      });

      if (!account) {
        throw new Error('Account not found');
      }

      await account.update({ accountName: newName });

      return {
        id: account.id,
        name: newName,
        email: account.accountEmail,
        isPrimary: account.isPrimary,
        provider: account.provider
      };
    } catch (error) {
      console.error('Error updating account name:', error);
      throw new Error('Failed to update account name');
    }
  }

  // Get a specific account with token
  async getAccountWithToken(userId, accountId) {
    try {
      const account = await Token.findOne({
        where: { id: accountId, userId, isActive: true }
      });

      if (!account) {
        throw new Error('Account not found');
      }

      return account;
    } catch (error) {
      console.error('Error fetching account with token:', error);
      throw new Error('Failed to fetch account');
    }
  }

  // Get primary account for a provider
  async getPrimaryAccount(userId, provider) {
    try {
      const account = await Token.findOne({
        where: {
          userId,
          provider,
          isPrimary: true,
          isActive: true
        }
      });

      return account;
    } catch (error) {
      console.error('Error fetching primary account:', error);
      throw new Error('Failed to fetch primary account');
    }
  }
}

module.exports = new AccountManager(); 