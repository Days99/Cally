import React, { useState, useEffect } from 'react';
import { 
  ClipboardDocumentListIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Tasks = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/jira/issues`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
      } else {
        console.error('Failed to fetch issues');
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncIssues = async () => {
    try {
      setSyncing(true);
      await fetchIssues();
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status) => {
    const statusName = status?.name?.toLowerCase() || '';
    
    if (statusName.includes('done') || statusName.includes('complete')) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    } else if (statusName.includes('progress') || statusName.includes('development')) {
      return <PlayIcon className="h-4 w-4 text-blue-500" />;
    } else if (statusName.includes('review') || statusName.includes('testing')) {
      return <ClockIcon className="h-4 w-4 text-yellow-500" />;
    } else {
      return <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    const statusName = status?.name?.toLowerCase() || '';
    
    if (statusName.includes('done') || statusName.includes('complete')) {
      return 'bg-green-100 text-green-800';
    } else if (statusName.includes('progress') || statusName.includes('development')) {
      return 'bg-blue-100 text-blue-800';
    } else if (statusName.includes('review') || statusName.includes('testing')) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    const priorityName = priority?.name?.toLowerCase() || '';
    
    if (priorityName.includes('highest') || priorityName.includes('critical')) {
      return 'text-red-600';
    } else if (priorityName.includes('high')) {
      return 'text-orange-600';
    } else if (priorityName.includes('medium')) {
      return 'text-yellow-600';
    } else {
      return 'text-gray-600';
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.fields.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.key.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    
    const statusName = issue.fields.status?.name?.toLowerCase() || '';
    
    switch (filter) {
      case 'todo':
        return matchesSearch && (statusName.includes('to do') || statusName.includes('open') || statusName.includes('new'));
      case 'progress':
        return matchesSearch && (statusName.includes('progress') || statusName.includes('development'));
      case 'done':
        return matchesSearch && (statusName.includes('done') || statusName.includes('complete') || statusName.includes('closed'));
      default:
        return matchesSearch;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading issues...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tasks & Issues</h1>
            <p className="text-gray-600">
              Manage your Jira issues across all connected accounts.
            </p>
          </div>
          
          <button
            onClick={syncIssues}
            disabled={syncing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Issues'}
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'todo', label: 'To Do' },
                { key: 'progress', label: 'In Progress' },
                { key: 'done', label: 'Done' }
              ].map((filterOption) => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filter === filterOption.key
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filterOption.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{issues.length}</div>
          <div className="text-sm text-gray-600">Total Issues</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {issues.filter(i => i.fields.status?.name?.toLowerCase().includes('progress')).length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {issues.filter(i => i.fields.status?.name?.toLowerCase().includes('done')).length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">
            {issues.filter(i => i.fields.priority?.name?.toLowerCase().includes('high')).length}
          </div>
          <div className="text-sm text-gray-600">High Priority</div>
        </div>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No issues found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {issues.length === 0 
              ? "Connect your Jira account to start managing issues."
              : "Try adjusting your filters or search term."
            }
          </p>
          {issues.length === 0 && (
            <div className="mt-4">
              <a
                href="/accounts"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Connect Jira Account
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredIssues.map((issue) => (
              <div key={issue.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-blue-600">{issue.key}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.fields.status)}`}>
                        {getStatusIcon(issue.fields.status)}
                        <span className="ml-1">{issue.fields.status?.name}</span>
                      </span>
                      {issue.accountName && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {issue.accountName}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {issue.fields.summary}
                    </h4>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="font-medium">Type:</span>
                        <span className="ml-1">{issue.fields.issuetype?.name}</span>
                      </div>
                      {issue.fields.priority && (
                        <div className="flex items-center">
                          <span className="font-medium">Priority:</span>
                          <span className={`ml-1 font-medium ${getPriorityColor(issue.fields.priority)}`}>
                            {issue.fields.priority.name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="font-medium">Updated:</span>
                        <span className="ml-1">
                          {new Date(issue.fields.updated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={`https://${issue.siteName || 'your-domain'}.atlassian.net/browse/${issue.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                    >
                      View in Jira →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks; 