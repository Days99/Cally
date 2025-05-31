import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class AccountService {
  // Get all user accounts
  async getAccounts() {
    try {
      console.log('🔍 DEBUG: accountService.getAccounts() - Making API call to:', `${API_URL}/api/accounts`);
      const response = await axios.get(`${API_URL}/api/accounts`);
      console.log('🔍 DEBUG: accountService.getAccounts() - Raw response:', response);
      console.log('🔍 DEBUG: accountService.getAccounts() - Response data:', response.data);
      console.log('🔍 DEBUG: accountService.getAccounts() - Accounts array:', response.data.accounts);
      
      // Handle grouped accounts format from backend
      const accountsData = response.data.accounts;
      console.log('🔍 DEBUG: accountService.getAccounts() - Accounts data type:', typeof accountsData);
      console.log('🔍 DEBUG: accountService.getAccounts() - Is accounts data an array?', Array.isArray(accountsData));
      
      if (Array.isArray(accountsData)) {
        // Already a flat array
        console.log('🔍 DEBUG: accountService.getAccounts() - Returning flat array:', accountsData);
        return accountsData;
      } else if (accountsData && typeof accountsData === 'object') {
        // Grouped by provider - need to flatten
        const flattenedAccounts = [];
        for (const [provider, accounts] of Object.entries(accountsData)) {
          if (Array.isArray(accounts)) {
            flattenedAccounts.push(...accounts);
          }
        }
        console.log('🔍 DEBUG: accountService.getAccounts() - Flattened accounts:', flattenedAccounts);
        return flattenedAccounts;
      } else {
        console.log('🔍 DEBUG: accountService.getAccounts() - No accounts data, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('🔍 DEBUG: accountService.getAccounts() - Error occurred:', error);
      console.error('🔍 DEBUG: accountService.getAccounts() - Error response:', error.response);
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

  // Get Jira issues for an account
  async getJiraIssues(accountId) {
    try {
      console.log('🔍 DEBUG: accountService.getJiraIssues() - Making API call to:', `${API_URL}/api/accounts/${accountId}/jira/issues`);
      const response = await axios.get(`${API_URL}/api/accounts/${accountId}/jira/issues`);
      console.log('🔍 DEBUG: accountService.getJiraIssues() - Response:', response.data);
      return response.data.issues;
    } catch (error) {
      console.error('🔍 DEBUG: accountService.getJiraIssues() - Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch Jira issues');
    }
  }
}

const accountService = new AccountService();
export default accountService; 