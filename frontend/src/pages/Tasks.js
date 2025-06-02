import React, { useState, useEffect } from 'react';
import { 
  ClipboardDocumentListIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import accountService from '../services/accountService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Tasks = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [taskTransitions, setTaskTransitions] = useState({});
  const [loadingTransitions, setLoadingTransitions] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState({});

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

  const toggleTaskExpansion = (issueKey) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(issueKey)) {
      newExpanded.delete(issueKey);
      // Clear transitions when collapsing
      setTaskTransitions(prev => {
        const newTransitions = { ...prev };
        delete newTransitions[issueKey];
        return newTransitions;
      });
    } else {
      newExpanded.add(issueKey);
      // Load transitions when expanding
      loadTaskTransitions(issueKey);
    }
    setExpandedTasks(newExpanded);
  };

  const loadTaskTransitions = async (issueKey) => {
    const issue = issues.find(i => i.key === issueKey);
    if (!issue?.accountId) return;

    try {
      setLoadingTransitions(prev => ({ ...prev, [issueKey]: true }));
      console.log('Loading transitions for issue:', issueKey);
      
      const response = await accountService.getJiraIssueTransitions(issue.accountId, issueKey);
      console.log('Loaded transitions:', response);
      
      setTaskTransitions(prev => ({
        ...prev,
        [issueKey]: response.transitions || []
      }));
    } catch (error) {
      console.error('Failed to load transitions:', error);
      setTaskTransitions(prev => ({ ...prev, [issueKey]: [] }));
    } finally {
      setLoadingTransitions(prev => ({ ...prev, [issueKey]: false }));
    }
  };

  const handleStatusTransition = async (issueKey, transitionId) => {
    const issue = issues.find(i => i.key === issueKey);
    if (!issue?.accountId) return;

    try {
      setUpdatingStatus(prev => ({ ...prev, [issueKey]: true }));
      
      console.log('Updating status for issue:', issueKey, 'transition:', transitionId);
      
      await accountService.updateJiraIssueStatus(issue.accountId, issueKey, transitionId);
      
      // Find the transition to get the new status
      const transitions = taskTransitions[issueKey] || [];
      const selectedTransition = transitions.find(t => t.id === transitionId);
      const newStatusName = selectedTransition?.to?.name || 'Updated';
      
      // Update the issue in the local state
      setIssues(prev => prev.map(i => {
        if (i.key === issueKey) {
          return {
            ...i,
            fields: {
              ...i.fields,
              status: {
                ...i.fields.status,
                name: newStatusName,
                statusCategory: selectedTransition?.to?.statusCategory || i.fields.status?.statusCategory
              }
            }
          };
        }
        return i;
      }));
      
      // Reload transitions in case new ones are available
      setTimeout(() => loadTaskTransitions(issueKey), 500);
      
      console.log(`Successfully updated ${issueKey} to ${newStatusName}`);
      
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [issueKey]: false }));
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
              <div key={issue.id} className="hover:bg-gray-50">
                {/* Main task row */}
                <div className="p-4">
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
                      <button
                        onClick={() => toggleTaskExpansion(issue.key)}
                        className="flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        {expandedTasks.has(issue.key) ? (
                          <>
                            <ChevronUpIcon className="h-4 w-4 mr-1" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon className="h-4 w-4 mr-1" />
                            Show Details
                          </>
                        )}
                      </button>
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

                {/* Expanded details */}
                {expandedTasks.has(issue.key) && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Task Details */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-3">Task Details</h5>
                        <div className="space-y-2 text-sm">
                          {issue.fields.description && (
                            <div>
                              <span className="font-medium text-gray-700">Description:</span>
                              <div className="mt-1 p-3 bg-white rounded border text-gray-800 max-h-32 overflow-y-auto">
                                {typeof issue.fields.description === 'string' 
                                  ? issue.fields.description 
                                  : 'Description available in Jira'}
                              </div>
                            </div>
                          )}
                          
                          {issue.fields.assignee && (
                            <div>
                              <span className="font-medium text-gray-700">Assignee:</span>
                              <span className="ml-1 text-gray-600">{issue.fields.assignee.displayName}</span>
                            </div>
                          )}
                          
                          {issue.fields.reporter && (
                            <div>
                              <span className="font-medium text-gray-700">Reporter:</span>
                              <span className="ml-1 text-gray-600">{issue.fields.reporter.displayName}</span>
                            </div>
                          )}
                          
                          <div>
                            <span className="font-medium text-gray-700">Created:</span>
                            <span className="ml-1 text-gray-600">
                              {new Date(issue.fields.created).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Transitions */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-3">Change Status</h5>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-700">Current Status:</span>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(issue.fields.status)}`}>
                                {getStatusIcon(issue.fields.status)}
                                <span className="ml-1">{issue.fields.status?.name}</span>
                              </span>
                            </div>
                          </div>

                          {loadingTransitions[issue.key] ? (
                            <div className="flex items-center text-blue-600">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                              Loading available transitions...
                            </div>
                          ) : taskTransitions[issue.key]?.length > 0 ? (
                            <div>
                              <label className="block text-sm text-gray-700 mb-2">
                                Available Transitions:
                              </label>
                              <div className="space-y-2">
                                {taskTransitions[issue.key].map((transition) => (
                                  <button
                                    key={transition.id}
                                    onClick={() => handleStatusTransition(issue.key, transition.id)}
                                    disabled={updatingStatus[issue.key]}
                                    className="w-full text-left px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {transition.name}
                                        {transition.to?.name && (
                                          <span className="text-gray-500 font-normal">
                                            {' → ' + transition.to.name}
                                          </span>
                                        )}
                                      </span>
                                      {updatingStatus[issue.key] && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              No transitions available for this issue
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks; 