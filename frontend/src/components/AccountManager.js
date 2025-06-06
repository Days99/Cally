import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  PlusIcon, 
  Cog6ToothIcon, 
  TrashIcon, 
  StarIcon, 
  EnvelopeIcon,
  CalendarIcon, 
  ExclamationCircleIcon, 
  CheckCircleIcon, 
  ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const AccountManager = () => {
  const [accounts, setAccounts] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [addingAccount, setAddingAccount] = useState(null);
  const [newAccountName, setNewAccountName] = useState('');

  useEffect(() => {
    fetchAccounts();
    fetchStats();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/accounts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || {});
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddAccount = async (provider) => {
    if (provider === 'google') {
      try {
        setAddingAccount(provider);
        
        const response = await fetch(`${API_URL}/api/accounts/google/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            accountName: newAccountName || `${provider} Account`
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Store current location for redirect after OAuth
          localStorage.setItem('oauth_return_url', window.location.pathname);
          
          // Redirect to Google OAuth - this will redirect to root domain automatically
          window.location.href = data.authUrl;
        } else {
          throw new Error('Failed to initiate account addition');
        }
      } catch (error) {
        console.error('Error adding account:', error);
        setAddingAccount(null);
      }
    } else if (provider === 'jira') {
      try {
        setAddingAccount(provider);
        
        const response = await fetch(`${API_URL}/api/jira/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            accountName: newAccountName || `${provider} Account`
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Store current location for redirect after OAuth
          localStorage.setItem('oauth_return_url', window.location.pathname);
          
          // Redirect to Jira OAuth
          window.location.href = data.authUrl;
        } else {
          throw new Error('Failed to initiate Jira account addition');
        }
      } catch (error) {
        console.error('Error adding Jira account:', error);
        setAddingAccount(null);
      }
    }
  };

  const handleRemoveAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to remove this account? All associated data will be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        await fetchAccounts();
        await fetchStats();
      } else {
        throw new Error('Failed to remove account');
      }
    } catch (error) {
      console.error('Error removing account:', error);
    }
  };

  const handleSetPrimary = async (accountId) => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/${accountId}/primary`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        await fetchAccounts();
      } else {
        throw new Error('Failed to set primary account');
      }
    } catch (error) {
      console.error('Error setting primary account:', error);
    }
  };

  const handleUpdateName = async (accountId, newName) => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/${accountId}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ name: newName })
      });

      if (response.ok) {
        await fetchAccounts();
      } else {
        throw new Error('Failed to update account name');
      }
    } catch (error) {
      console.error('Error updating account name:', error);
    }
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'google':
        return '📅';
      case 'jira':
        return '📋';
      case 'github':
        return '🐙';
      default:
        return '🔗';
    }
  };

  const getProviderColor = (provider) => {
    switch (provider) {
      case 'google':
        return 'bg-blue-500';
      case 'jira':
        return 'bg-blue-600';
      case 'github':
        return 'bg-gray-800';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading accounts...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Account Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your connected integration accounts for Calendar, Jira, and GitHub.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card-compact">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalAccounts || 0}</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Google Calendars</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.byProvider?.google?.count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Integrations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Object.keys(accounts).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Sections by Provider */}
      {Object.keys(accounts).length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No accounts connected</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by connecting your first integration account.
          </p>
        </div>
      ) : (
        Object.entries(accounts).map(([provider, providerAccounts]) => (
          <div key={provider} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 capitalize flex items-center">
                <span className="mr-2">{getProviderIcon(provider)}</span>
                {provider} Accounts ({providerAccounts.length})
              </h2>
              
              {provider === 'google' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Account name (optional)"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="input-field text-sm"
                  />
                  <button
                    onClick={() => handleAddAccount(provider)}
                    disabled={addingAccount === provider}
                    className="btn-primary flex items-center text-sm disabled:opacity-50 whitespace-nowrap"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    {addingAccount === provider ? 'Adding...' : 'Add Account'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerAccounts.map((account) => (
                <div key={account.id} className="card-interactive">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full ${getProviderColor(provider)} mr-3`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {account.name}
                          </h3>
                          {account.isPrimary && (
                            <StarIconSolid className="h-4 w-4 text-yellow-400 dark:text-yellow-300 ml-1" fill="currentColor" />
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <EnvelopeIcon className="h-3 w-3 mr-1" />
                          <span className="truncate">{account.email}</span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Connected {new Date(account.connectedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-2">
                      {!account.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(account.id)}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400"
                          title="Set as primary"
                        >
                          <StarIcon className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          const newName = prompt('Enter new account name:', account.name);
                          if (newName && newName !== account.name) {
                            handleUpdateName(account.id, newName);
                          }
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"
                        title="Rename account"
                      >
                        <Cog6ToothIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleRemoveAccount(account.id)}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                        title="Remove account"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add New Integration Section */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Add New Integration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleAddAccount('google')}
            disabled={addingAccount === 'google'}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          >
            <div className="text-center">
              <span className="text-2xl mb-2 block">📅</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Google Calendar</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connect your calendar</p>
            </div>
          </button>

          <button
            onClick={() => handleAddAccount('jira')}
            disabled={addingAccount === 'jira'}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          >
            <div className="text-center">
              <span className="text-2xl mb-2 block">📋</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Jira</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{addingAccount === 'jira' ? 'Connecting...' : 'Connect your issues'}</p>
            </div>
          </button>

          <button
            disabled
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
          >
            <div className="text-center">
              <span className="text-2xl mb-2 block opacity-50">🐙</span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">GitHub</span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Coming soon</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountManager; 