import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardDocumentListIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XMarkIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import accountService from '../services/accountService';
import eventService from '../services/eventService';

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

  // New issue creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [newIssueForm, setNewIssueForm] = useState({
    accountId: '',
    projectKey: '',
    summary: '',
    description: '',
    issueType: '',
    priority: '',
    assignee: '',
    // Calendar event fields
    createCalendarEvent: false,
    eventTitle: '',
    eventDate: '',
    eventStartTime: '',
    eventEndTime: '',
    eventLocation: ''
  });

  // Projects state for the selected account
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Project metadata state (issue types, priorities, assignees)
  const [projectMetadata, setProjectMetadata] = useState({
    issueTypes: [],
    priorities: [],
    assignableUsers: []
  });
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Priority options
  const priorityOptions = [
    { value: 'highest', label: 'Highest', color: 'text-red-600 dark:text-red-400' },
    { value: 'high', label: 'High', color: 'text-orange-600 dark:text-orange-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
    { value: 'low', label: 'Low', color: 'text-green-600 dark:text-green-400' },
    { value: 'lowest', label: 'Lowest', color: 'text-gray-600 dark:text-gray-400' }
  ];

  useEffect(() => {
    fetchIssues();
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const accountsData = await accountService.getAccounts();
      setAccounts(accountsData.filter(acc => acc.provider === 'jira'));
      
      // Auto-select first Jira account if available
      const jiraAccounts = accountsData.filter(acc => acc.provider === 'jira');
      if (jiraAccounts.length > 0) {
        setNewIssueForm(prev => ({ ...prev, accountId: jiraAccounts[0].id }));
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setCreateError('Failed to load accounts');
    }
  };

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setCreateError(null);
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
      setCreateError('Failed to load issues');
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
                statusCategory: selectedTransition?.to?.statusCategory
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
    // Handle different priority formats safely
    let priorityValue = '';
    
    if (typeof priority === 'string') {
      priorityValue = priority.toLowerCase();
    } else if (priority && typeof priority === 'object' && priority.name) {
      priorityValue = priority.name.toLowerCase();
    } else {
      priorityValue = '';
    }
    
    const option = priorityOptions.find(opt => opt.value === priorityValue);
    return option ? option.color : 'text-gray-600 dark:text-gray-400';
  };

  const filteredIssues = issues.filter(issue => {
    // Safely handle toLowerCase for search matching
    const summary = issue.fields?.summary || '';
    const issueKey = issue.key || '';
    const summaryStr = typeof summary === 'string' ? summary : '';
    const keyStr = typeof issueKey === 'string' ? issueKey : '';
    
    const matchesSearch = summaryStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         keyStr.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    
    const statusName = issue.fields?.status?.name || '';
    const statusNameStr = typeof statusName === 'string' ? statusName.toLowerCase() : '';
    
    switch (filter) {
      case 'todo':
        return matchesSearch && (statusNameStr.includes('to do') || statusNameStr.includes('open') || statusNameStr.includes('new'));
      case 'progress':
        return matchesSearch && (statusNameStr.includes('progress') || statusNameStr.includes('development'));
      case 'done':
        return matchesSearch && (statusNameStr.includes('done') || statusNameStr.includes('complete') || statusNameStr.includes('closed'));
      default:
        return matchesSearch;
    }
  });

  const handleCreateNewIssue = async () => {
    if (!newIssueForm.accountId || !newIssueForm.projectKey || !newIssueForm.summary) {
      setCreateError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      console.log('Creating new Jira issue with form data:', newIssueForm);
      console.log('Project metadata:', projectMetadata);

      // Helper function to check if a value has meaningful content
      const hasContent = (value) => value && typeof value === 'string' && value.trim().length > 0;

      // Create the Jira issue - only include fields that have meaningful content
      const issueData = {
        accountId: newIssueForm.accountId,
        projectKey: newIssueForm.projectKey,
        summary: newIssueForm.summary,
      };

      // Only add optional fields if they have meaningful content
      if (hasContent(newIssueForm.description)) {
        issueData.description = newIssueForm.description;
      }

      if (hasContent(newIssueForm.issueType)) {
        issueData.issueType = newIssueForm.issueType;
      }

      if (hasContent(newIssueForm.priority)) {
        issueData.priority = newIssueForm.priority;
      }

      if (hasContent(newIssueForm.assignee)) {
        issueData.assignee = newIssueForm.assignee;
      }

      console.log('Issue data being sent to backend:', issueData);

      const createdIssue = await accountService.createJiraIssue(issueData);
      console.log('Created Jira issue:', createdIssue);

      // If user wants to create a calendar event, create it and link to the issue
      if (newIssueForm.createCalendarEvent && newIssueForm.eventDate) {
        const eventData = {
          eventType: 'jira_task',
          title: newIssueForm.eventTitle || newIssueForm.summary,
          description: `Jira Issue: ${createdIssue.key}\n\n${newIssueForm.description}`,
          isAllDay: false,
          accountId: newIssueForm.accountId,
          metadata: {
            associationType: 'existing',
            existingIssueKey: createdIssue.key,
            linkExisting: true,
            jiraKey: createdIssue.key,
            project: newIssueForm.projectKey,
            issueType: newIssueForm.issueType
          }
        };

        // Add date - always required for calendar events
        eventData.eventDate = newIssueForm.eventDate;

        // Only add time fields if they have meaningful content
        if (hasContent(newIssueForm.eventStartTime)) {
          eventData.startTime = `${newIssueForm.eventDate}T${newIssueForm.eventStartTime}`;
        }

        if (hasContent(newIssueForm.eventEndTime)) {
          eventData.endTime = `${newIssueForm.eventDate}T${newIssueForm.eventEndTime}`;
        }

        // Only add optional fields if they have meaningful content
        if (hasContent(newIssueForm.eventLocation)) {
          eventData.location = newIssueForm.eventLocation;
        }

        // Only add priority if the Jira issue has a priority
        if (hasContent(newIssueForm.priority)) {
          // Safely handle priority value for calendar event
          const priorityValue = typeof newIssueForm.priority === 'string' 
            ? newIssueForm.priority.toLowerCase() 
            : (newIssueForm.priority?.name || '').toLowerCase();
          eventData.priority = priorityValue;
        }

        console.log('Creating calendar event for issue:', eventData);
        await eventService.createEvent(eventData);
        console.log('Created calendar event for issue');
      }

      // Refresh the issues list
      await fetchIssues();
      
      // Reset form and close modal
      setNewIssueForm({
        accountId: '',
        projectKey: '',
        summary: '',
        description: '',
        issueType: '',
        priority: '',
        assignee: '',
        createCalendarEvent: false,
        eventTitle: '',
        eventDate: '',
        eventStartTime: '',
        eventEndTime: '',
        eventLocation: ''
      });
      setProjects([]);
      setProjectMetadata({
        issueTypes: [],
        priorities: [],
        assignableUsers: []
      });
      setCreateError(null);
      setShowCreateModal(false);

      console.log('Successfully created new issue with optional calendar event');

    } catch (error) {
      console.error('Error creating issue:', error);
      setCreateError(error.message || 'Failed to create issue');
    } finally {
      setCreating(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle account change - load projects and reset project selection
    if (name === 'accountId') {
      setNewIssueForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        projectKey: '' // Reset project when account changes
      }));
      
      // Load projects for the selected account
      if (value) {
        loadProjects(value);
      } else {
        setProjects([]);
      }
      return;
    }

    // Handle project change - load metadata and reset dependent fields
    if (name === 'projectKey') {
      setNewIssueForm(prev => ({
        ...prev,
        [name]: value,
        issueType: '', // Reset issue type when project changes
        priority: '', // Reset priority when project changes
        assignee: '' // Reset assignee when project changes
      }));
      
      // Load metadata for the selected project
      if (value && newIssueForm.accountId) {
        loadProjectMetadata(newIssueForm.accountId, value);
      } else {
        setProjectMetadata({
          issueTypes: [],
          priorities: [],
          assignableUsers: []
        });
      }
      return;
    }

    // Handle calendar event checkbox - set smart defaults when enabled or clear when disabled
    if (name === 'createCalendarEvent') {
      if (checked) {
        // Use async function to get truly available time
        const now = new Date();
        getNextAvailableHour(now).then(nextHour => {
          const defaultEndTime = new Date(nextHour.getTime() + 60 * 60 * 1000); // 1 hour later
          
          setNewIssueForm(prev => ({
            ...prev,
            [name]: checked,
            eventDate: nextHour.toISOString().split('T')[0], // YYYY-MM-DD format
            eventStartTime: nextHour.toTimeString().slice(0, 5), // HH:MM format
            eventEndTime: defaultEndTime.toTimeString().slice(0, 5), // HH:MM format
            eventTitle: prev.summary || '' // Use current summary as default title
          }));
        }).catch(error => {
          console.error('Error getting available time:', error);
          // Fallback to simple next hour if smart scheduling fails
          const simpleNextHour = new Date(now);
          simpleNextHour.setHours(simpleNextHour.getHours() + 1, 0, 0, 0);
          const simpleEndTime = new Date(simpleNextHour.getTime() + 60 * 60 * 1000);
          
          setNewIssueForm(prev => ({
            ...prev,
            [name]: checked,
            eventDate: simpleNextHour.toISOString().split('T')[0],
            eventStartTime: simpleNextHour.toTimeString().slice(0, 5),
            eventEndTime: simpleEndTime.toTimeString().slice(0, 5),
            eventTitle: prev.summary || ''
          }));
        });
      } else {
        // Clear calendar event fields when unchecked
        setNewIssueForm(prev => ({
          ...prev,
          [name]: checked,
          eventDate: '',
          eventStartTime: '',
          eventEndTime: '',
          eventTitle: '',
          eventLocation: ''
        }));
      }
      return;
    }

    setNewIssueForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-populate event title when summary changes (handles both cases)
    if (name === 'summary') {
      // If calendar event is enabled, update if empty or matches previous summary
      // If calendar event is disabled, only update if empty (for future use)
      const shouldUpdate = newIssueForm.createCalendarEvent 
        ? (!newIssueForm.eventTitle || newIssueForm.eventTitle === newIssueForm.summary)
        : !newIssueForm.eventTitle;
        
      if (shouldUpdate) {
        setNewIssueForm(prev => ({
          ...prev,
          eventTitle: value
        }));
      }
    }
  };

  const loadProjectMetadata = async (accountId, projectKey) => {
    if (!accountId || !projectKey) {
      setProjectMetadata({
        issueTypes: [],
        priorities: [],
        assignableUsers: []
      });
      return;
    }

    try {
      setLoadingMetadata(true);
      setCreateError(null);
      const metadata = await accountService.getJiraProjectMetadata(accountId, projectKey);
      setProjectMetadata(metadata);
      
      // Helper function to check if a value has meaningful content
      const hasContent = (value) => value && typeof value === 'string' && value.trim().length > 0;
      
      // Always update form fields based on metadata availability
      const updates = {};
      
      if (metadata.issueTypes.length > 0) {
        // Check if current value is valid for this project
        const isValidIssueType = metadata.issueTypes.some(it => it.name === newIssueForm.issueType);
        if (!isValidIssueType) {
          // Set first available issue type (no hardcoded defaults)
          updates.issueType = metadata.issueTypes[0].name;
        }
      } else {
        // Always clear if not available
        updates.issueType = '';
      }
      
      if (metadata.priorities.length > 0) {
        // Check if current value is valid for this project
        const isValidPriority = metadata.priorities.some(p => p.name === newIssueForm.priority);
        if (!isValidPriority) {
          // Set middle priority or first available (no hardcoded defaults)
          const middleIndex = Math.floor(metadata.priorities.length / 2);
          updates.priority = metadata.priorities[middleIndex].name;
        }
      } else {
        // Always clear if not available
        updates.priority = '';
      }
      
      if (metadata.assignableUsers.length > 0) {
        // Keep existing assignee if it's valid, otherwise clear
        const isValidAssignee = hasContent(newIssueForm.assignee) && metadata.assignableUsers.some(user => 
          user.accountId === newIssueForm.assignee
        );
        console.log('Assignee validation:', {
          currentAssignee: newIssueForm.assignee,
          hasContent: hasContent(newIssueForm.assignee),
          availableUsers: metadata.assignableUsers.map(u => ({ accountId: u.accountId, displayName: u.displayName })),
          isValidAssignee
        });
        if (!isValidAssignee) {
          updates.assignee = '';
        }
      } else {
        // Always clear if not available
        updates.assignee = '';
      }
      
      // Apply all updates at once
      if (Object.keys(updates).length > 0) {
        setNewIssueForm(prev => ({ ...prev, ...updates }));
      }
      
    } catch (error) {
      console.error('Failed to load project metadata:', error);
      setCreateError(`Failed to load project metadata: ${error.message}`);
      setProjectMetadata({
        issueTypes: [],
        priorities: [],
        assignableUsers: []
      });
      // Clear all fields when metadata loading fails
      setNewIssueForm(prev => ({ 
        ...prev, 
        issueType: '', 
        priority: '', 
        assignee: '' 
      }));
    } finally {
      setLoadingMetadata(false);
    }
  };

  // Calculate the next available hour for smart scheduling, considering existing events
  const getNextAvailableHour = async (currentDate) => {
    const now = new Date(currentDate);
    
    // Start from next hour
    let candidateTime = new Date(now);
    candidateTime.setMinutes(0, 0, 0); // Reset minutes, seconds, milliseconds
    candidateTime.setHours(candidateTime.getHours() + 1);
    
    // Define business hours
    const BUSINESS_START = 8; // 8 AM
    const BUSINESS_END = 18;  // 6 PM
    
    // Helper function to check if time is within business hours and not weekend
    const isBusinessTime = (date) => {
      const day = date.getDay();
      const hour = date.getHours();
      return day !== 0 && day !== 6 && hour >= BUSINESS_START && hour < BUSINESS_END;
    };
    
    // Helper function to move to next business day at 9 AM
    const moveToNextBusinessDay = (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(9, 0, 0, 0);
      
      // Skip weekends
      while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
        nextDay.setDate(nextDay.getDate() + 1);
      }
      
      return nextDay;
    };
    
    // If not in business hours, move to next business day
    if (!isBusinessTime(candidateTime)) {
      candidateTime = moveToNextBusinessDay(candidateTime);
    }
    
    // Try to fetch existing events for the candidate date
    try {
      const candidateDate = candidateTime.toISOString().split('T')[0];
      const existingEvents = await eventService.getEvents({
        startDate: candidateDate,
        endDate: candidateDate
      });
      
      console.log('Checking for conflicts on', candidateDate, '- found', existingEvents.length, 'events');
      
      // Check for conflicts and find next available slot
      let maxAttempts = 24; // Prevent infinite loop
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        // Check if current candidateTime conflicts with any existing event
        const candidateStart = candidateTime.getTime();
        const candidateEnd = candidateStart + (60 * 60 * 1000); // 1 hour later
        
        const hasConflict = existingEvents.some(event => {
          if (event.isAllDay) return true; // Avoid all-day events
          
          if (!event.startTime || !event.endTime) return false;
          
          const eventStart = new Date(event.startTime).getTime();
          const eventEnd = new Date(event.endTime).getTime();
          
          // Check for overlap
          return (candidateStart < eventEnd && candidateEnd > eventStart);
        });
        
        if (!hasConflict) {
          console.log('Found available slot at:', candidateTime.toLocaleString());
          return candidateTime;
        }
        
        // Move to next hour
        candidateTime.setHours(candidateTime.getHours() + 1);
        
        // If we've moved past business hours, go to next business day
        if (!isBusinessTime(candidateTime)) {
          candidateTime = moveToNextBusinessDay(candidateTime);
          
          // If we've moved to a new day, fetch events for that day
          const newDate = candidateTime.toISOString().split('T')[0];
          if (newDate !== candidateDate) {
            const newEvents = await eventService.getEvents({
              startDate: newDate,
              endDate: newDate
            });
            existingEvents.length = 0;
            existingEvents.push(...newEvents);
            console.log('Moved to new day', newDate, '- found', existingEvents.length, 'events');
          }
        }
        
        attempts++;
      }
      
      console.warn('Could not find available slot after', maxAttempts, 'attempts');
      return candidateTime; // Return last attempt
      
    } catch (error) {
      console.error('Error fetching events for smart scheduling:', error);
      // Fallback to simple logic if API fails
      return candidateTime;
    }
  };

  const loadProjects = async (accountId) => {
    if (!accountId) {
      setProjects([]);
      return;
    }

    try {
      setLoadingProjects(true);
      setCreateError(null);
      const projectsData = await accountService.getJiraProjects(accountId);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setCreateError(`Failed to load projects: ${error.message}`);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Check if the form is valid for submission
  const isFormValid = () => {
    // Basic required fields
    if (!newIssueForm.accountId || !newIssueForm.projectKey || !newIssueForm.summary) {
      return false;
    }

    // If issue types are available and none is selected, form is invalid
    if (projectMetadata.issueTypes.length > 0 && !newIssueForm.issueType) {
      return false;
    }

    // If calendar event is enabled, require event date
    if (newIssueForm.createCalendarEvent && !newIssueForm.eventDate) {
      return false;
    }

    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading issues...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Tasks & Issues</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your Jira issues across all connected accounts.
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-success flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Issue
            </button>
            
            <button
              onClick={syncIssues}
              disabled={syncing}
              className="btn-primary flex items-center"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Issues'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <FunnelIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
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
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card-compact">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{issues.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Issues</div>
        </div>
        <div className="card-compact">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {issues.filter(i => i.fields.status?.name?.toLowerCase().includes('progress')).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
        </div>
        <div className="card-compact">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {issues.filter(i => i.fields.status?.name?.toLowerCase().includes('done')).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="card-compact">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {issues.filter(i => i.fields.priority?.name?.toLowerCase().includes('high')).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">High Priority</div>
        </div>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="card p-8 text-center">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No issues found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {issues.length === 0 
              ? "Connect your Jira account to start managing issues."
              : "Try adjusting your filters or search term."
            }
          </p>
          {issues.length === 0 && (
            <div className="mt-4">
              <a
                href="/accounts"
                className="btn-primary"
              >
                Connect Jira Account
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredIssues.map((issue) => (
              <div key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {/* Main task row */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{issue.key}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.fields.status)}`}>
                          {getStatusIcon(issue.fields.status)}
                          <span className="ml-1">{issue.fields.status?.name}</span>
                        </span>
                        {issue.accountName && (
                          <span className="badge-secondary">
                            {issue.accountName}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {issue.fields.summary}
                      </h4>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
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
                        className="btn-secondary flex items-center"
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
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        View in Jira →
                      </a>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedTasks.has(issue.key) && (
                  <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Task Details */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Task Details</h5>
                        <div className="space-y-2 text-sm">
                          {issue.fields.description && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                              <div className="mt-1 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-800 dark:text-gray-200 max-h-32 overflow-y-auto">
                                {typeof issue.fields.description === 'string' 
                                  ? issue.fields.description 
                                  : 'Description available in Jira'}
                              </div>
                            </div>
                          )}
                          
                          {issue.fields.assignee && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Assignee:</span>
                              <span className="ml-1 text-gray-600 dark:text-gray-400">{issue.fields.assignee.displayName}</span>
                            </div>
                          )}
                          
                          {issue.fields.reporter && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Reporter:</span>
                              <span className="ml-1 text-gray-600 dark:text-gray-400">{issue.fields.reporter.displayName}</span>
                            </div>
                          )}
                          
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                            <span className="ml-1 text-gray-600 dark:text-gray-400">
                              {new Date(issue.fields.created).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Transitions */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Change Status</h5>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Current Status:</span>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(issue.fields.status)}`}>
                                {getStatusIcon(issue.fields.status)}
                                <span className="ml-1">{issue.fields.status?.name}</span>
                              </span>
                            </div>
                          </div>

                          {loadingTransitions[issue.key] ? (
                            <div className="flex items-center text-blue-600 dark:text-blue-400">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-2"></div>
                              Loading available transitions...
                            </div>
                          ) : taskTransitions[issue.key]?.length > 0 ? (
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                                Available Transitions:
                              </label>
                              <div className="space-y-2">
                                {taskTransitions[issue.key].map((transition) => (
                                  <button
                                    key={transition.id}
                                    onClick={() => handleStatusTransition(issue.key, transition.id)}
                                    disabled={updatingStatus[issue.key]}
                                    className="w-full text-left px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-gray-800"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {transition.name}
                                        {transition.to?.name && (
                                          <span className="text-gray-500 dark:text-gray-400 font-normal">
                                            {' → ' + transition.to.name}
                                          </span>
                                        )}
                                      </span>
                                      {updatingStatus[issue.key] && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
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

      {/* Create New Issue Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Jira Issue</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Create a new issue with optional calendar event</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setProjects([]);
                  setProjectMetadata({
                    issueTypes: [],
                    priorities: [],
                    assignableUsers: []
                  });
                  setCreateError(null);
                }}
                className="btn-icon text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {createError && (
                <div className="alert-error mb-4">
                  <p className="text-sm text-error-800 dark:text-error-200">{createError}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Account Selection */}
                <div className="form-group">
                  <label className="form-label">
                    Jira Account *
                  </label>
                  <select
                    name="accountId"
                    value={newIssueForm.accountId}
                    onChange={handleFormChange}
                    className="input-field"
                    required
                  >
                    <option value="">Select an account...</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountName} ({account.accountEmail})
                        {account.isPrimary && ' ★'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Issue Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">
                      Project Key *
                    </label>
                    <select
                      name="projectKey"
                      value={newIssueForm.projectKey}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                      disabled={!newIssueForm.accountId || loadingProjects}
                    >
                      <option value="">
                        {!newIssueForm.accountId 
                          ? "Select an account first..." 
                          : loadingProjects 
                            ? "Loading projects..." 
                            : "Select a project..."
                        }
                      </option>
                      {projects.map(project => (
                        <option key={project.id} value={project.key}>
                          {project.name} ({project.key})
                        </option>
                      ))}
                    </select>
                    {loadingProjects && (
                      <div className="mt-1 flex items-center text-sm text-blue-600 dark:text-blue-400">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400 mr-1"></div>
                        Loading available projects...
                      </div>
                    )}
                  </div>
                  
                  {/* Dynamic Issue Type - only show if data is available */}
                  {projectMetadata.issueTypes.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">
                        Issue Type *
                      </label>
                      <select
                        name="issueType"
                        value={newIssueForm.issueType}
                        onChange={handleFormChange}
                        className="input-field"
                        disabled={loadingMetadata}
                        required
                      >
                        <option value="">
                          {loadingMetadata ? "Loading issue types..." : "Select issue type..."}
                        </option>
                        {projectMetadata.issueTypes.map(issueType => (
                          <option key={issueType.id} value={issueType.name}>
                            {issueType.name}
                          </option>
                        ))}
                      </select>
                      {loadingMetadata && (
                        <div className="mt-1 flex items-center text-sm text-blue-600 dark:text-blue-400">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400 mr-1"></div>
                          Loading project configuration...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Summary *
                  </label>
                  <input
                    type="text"
                    name="summary"
                    value={newIssueForm.summary}
                    onChange={handleFormChange}
                    placeholder="Brief description of the issue"
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newIssueForm.description}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="Detailed description of the issue"
                    className="input-field"
                  />
                </div>

                {/* Dynamic Priority and Assignee Grid - only show sections with data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dynamic Priority - only show if data is available */}
                  {projectMetadata.priorities.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={newIssueForm.priority}
                        onChange={handleFormChange}
                        className="input-field"
                        disabled={loadingMetadata}
                      >
                        <option value="">
                          {loadingMetadata ? "Loading priorities..." : "Select priority..."}
                        </option>
                        {projectMetadata.priorities.map(priority => (
                          <option key={priority.id} value={priority.name}>
                            {priority.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Dynamic Assignee - only show if data is available */}
                  {projectMetadata.assignableUsers.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">
                        Assignee
                      </label>
                      <select
                        name="assignee"
                        value={newIssueForm.assignee}
                        onChange={handleFormChange}
                        className="input-field"
                        disabled={loadingMetadata}
                      >
                        <option value="">Unassigned</option>
                        {projectMetadata.assignableUsers.map(user => (
                          <option key={user.accountId} value={user.accountId}>
                            {user.displayName} ({user.emailAddress || user.accountId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Calendar Event Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      name="createCalendarEvent"
                      checked={newIssueForm.createCalendarEvent}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Create associated calendar event
                    </label>
                  </div>

                  {newIssueForm.createCalendarEvent && (
                    <div className="space-y-4 pl-6 border-l-2 border-green-200 dark:border-green-800">
                      <div className="form-group">
                        <label className="form-label">
                          Event Title
                        </label>
                        <input
                          type="text"
                          name="eventTitle"
                          value={newIssueForm.eventTitle}
                          onChange={handleFormChange}
                          placeholder="Will use issue summary if empty"
                          className="input-field"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Event Date *
                        </label>
                        <input
                          type="date"
                          name="eventDate"
                          value={newIssueForm.eventDate}
                          onChange={handleFormChange}
                          className="input-field"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                          <label className="form-label">
                            Start Time
                          </label>
                          <input
                            type="time"
                            name="eventStartTime"
                            value={newIssueForm.eventStartTime}
                            onChange={handleFormChange}
                            className="input-field"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            End Time
                          </label>
                          <input
                            type="time"
                            name="eventEndTime"
                            value={newIssueForm.eventEndTime}
                            onChange={handleFormChange}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Location
                        </label>
                        <input
                          type="text"
                          name="eventLocation"
                          value={newIssueForm.eventLocation}
                          onChange={handleFormChange}
                          placeholder="Meeting room, URL, etc."
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setProjects([]);
                    setProjectMetadata({
                      issueTypes: [],
                      priorities: [],
                      assignableUsers: []
                    });
                    setCreateError(null);
                  }}
                  disabled={creating}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewIssue}
                  disabled={creating || !isFormValid()}
                  className="btn-success"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Issue'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks; 