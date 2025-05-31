import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class AccountService {
  // Get all user accounts
  async getAccounts() {
    try {
      const response = await axios.get(`${API_URL}/api/accounts`);
      return response.data.accounts;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch accounts');
    }
  }

  // Get account statistics
  async getAccountStats() {
    try {
      const response = await axios.get(`${API_URL}/api/accounts/stats`);
      return response.data.stats;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch account stats');
    }
  }

  // Add a new account
  async addAccount(provider, accountName) {
    try {
      const response = await axios.post(`${API_URL}/api/accounts`, {
        provider,
        accountName
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add account');
    }
  }

  // Update account
  async updateAccount(accountId, updateData) {
    try {
      const response = await axios.put(`${API_URL}/api/accounts/${accountId}`, updateData);
      return response.data.account;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update account');
    }
  }

  // Delete account
  async deleteAccount(accountId) {
    try {
      const response = await axios.delete(`${API_URL}/api/accounts/${accountId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete account');
    }
  }

  // Set primary account
  async setPrimaryAccount(accountId) {
    try {
      const response = await axios.post(`${API_URL}/api/accounts/${accountId}/primary`);
      return response.data.account;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to set primary account');
    }
  }

  // Get OAuth URL for provider
  async getOAuthUrl(provider, accountName) {
    try {
      let endpoint;
      switch (provider) {
        case 'google':
          endpoint = '/api/auth/google';
          break;
        case 'jira':
          endpoint = '/api/jira/auth';
          break;
        case 'github':
          endpoint = '/api/github/auth';
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const response = await axios.post(`${API_URL}${endpoint}`, { accountName });
      return response.data.authUrl;
    } catch (error) {
      throw new Error(error.response?.data?.message || `Failed to get ${provider} OAuth URL`);
    }
  }
}

export default new AccountService(); 