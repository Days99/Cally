import React, { useState, useEffect, useCallback } from 'react';
import calendarService from '../services/calendarService';
import accountService from '../services/accountService';
import eventService from '../services/eventService';

const EventModal = ({ isOpen, onClose, event, onEventUpdated, onEventDeleted, isCreating = false, defaultDate = null }) => {
  const [isEditing, setIsEditing] = useState(isCreating);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    eventType: 'manual',
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    isAllDay: false,
    priority: 'medium',
    // Event type specific fields
    jiraProjectKey: '',
    jiraIssueType: 'Task',
    googleCalendarId: 'primary',
    assignee: '',
    labels: [],
    status: 'confirmed',
    accountId: '',
    // Association types
    jiraAssociationType: 'create',
    existingJiraKey: '',
    githubAssociationType: 'create',
    githubRepository: '',
    githubIssueNumber: '',
    githubLabels: '',
    githubAssignee: ''
  });
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [jiraIssues, setJiraIssues] = useState([]);
  const [loadingJiraIssues, setLoadingJiraIssues] = useState(false);

  // Jira dynamic metadata states (same as Tasks page)
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectMetadata, setProjectMetadata] = useState({
    issueTypes: [],
    priorities: [],
    assignableUsers: []
  });
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [issueTransitions, setIssueTransitions] = useState([]);
  const [loadingTransitions, setLoadingTransitions] = useState(false);

  // Event type configurations
  const eventTypes = {
    manual: {
      label: 'Manual Event',
      icon: '📅',
      color: 'bg-gray-100 text-gray-800',
      description: 'Create a manual calendar event'
    },
    google_calendar: {
      label: 'Google Calendar Event',
      icon: '📅',
      color: 'bg-blue-100 text-blue-800',
      description: 'Create an event in Google Calendar'
    },
    jira_task: {
      label: 'Jira Task',
      icon: '📋',
      color: 'bg-green-100 text-green-800',
      description: 'Create or link a Jira task'
    },
    github_issue: {
      label: 'GitHub Issue',
      icon: '🐙',
      color: 'bg-purple-100 text-purple-800',
      description: 'Create or link a GitHub issue'
    }
  };

  const priorityOptions = [
    { value: 'highest', label: 'Highest', color: 'text-red-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'lowest', label: 'Lowest', color: 'text-gray-600' }
  ];

  const getEventType = useCallback(() => {
    // First check if event type is already determined
    if (event?.extendedProps?.eventType) {
      return event.extendedProps.eventType;
    }
    
    // Fallback to detection logic
    if (event?.extendedProps?.googleEventId) return 'google_calendar';
    if (event?.extendedProps?.jiraKey) return 'jira_task';
    if (event?.extendedProps?.githubIssue) return 'github_issue';
    return 'manual';
  }, [event]);

  const loadAccounts = useCallback(async () => {
    // Only load accounts once and when modal is open
    if (accountsLoaded || !isOpen) return;
    
    try {
      console.log('Loading accounts...');
      setAccountsLoaded(true); // Set this immediately to prevent multiple calls
      const accountsData = await accountService.getAccounts();
      console.log('Loaded accounts:', accountsData);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setError(`Failed to load accounts: ${error.message}`);
      setAccounts([]); // Ensure accounts is always an array
      setAccountsLoaded(false); // Reset on error so it can retry later
    }
  }, [isOpen, accountsLoaded]);

  // Load Jira projects (same as Tasks page)
  const loadProjects = useCallback(async (accountId) => {
    if (!accountId) {
      setProjects([]);
      return;
    }

    try {
      setLoadingProjects(true);
      console.log('Loading Jira projects for account:', accountId);
      const projectsData = await accountService.getJiraProjects(accountId);
      console.log('Loaded Jira projects:', projectsData);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error('Failed to load Jira projects:', error);
      setError(`Failed to load Jira projects: ${error.message}`);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Load project metadata (same as Tasks page)
  const loadProjectMetadata = useCallback(async (accountId, projectKey) => {
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
      setError(null);
      const metadata = await accountService.getJiraProjectMetadata(accountId, projectKey);
      setProjectMetadata(metadata);
      
      // Helper function to check if a value has meaningful content
      const hasContent = (value) => value && typeof value === 'string' && value.trim().length > 0;
      
      // Get current form data to validate against metadata
      setFormData(prev => {
        const updates = {};
        
        if (metadata.issueTypes.length > 0) {
          // Check if current value is valid for this project
          const isValidIssueType = metadata.issueTypes.some(it => it.name === prev.jiraIssueType);
          if (!isValidIssueType) {
            // Set first available issue type (no hardcoded defaults)
            updates.jiraIssueType = metadata.issueTypes[0].name;
          }
        } else {
          // Always clear if not available
          updates.jiraIssueType = '';
        }
        
        if (metadata.priorities.length > 0) {
          // Check if current value is valid for this project
          const isValidPriority = metadata.priorities.some(p => p.name === prev.priority);
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
          const isValidAssignee = hasContent(prev.assignee) && metadata.assignableUsers.some(user => 
            user.accountId === prev.assignee
          );
          console.log('Assignee validation:', {
            currentAssignee: prev.assignee,
            hasContent: hasContent(prev.assignee),
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
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
      
    } catch (error) {
      console.error('Failed to load project metadata:', error);
      setError(`Failed to load project metadata: ${error.message}`);
      setProjectMetadata({
        issueTypes: [],
        priorities: [],
        assignableUsers: []
      });
      // Clear all fields when metadata loading fails
      setFormData(prev => ({ 
        ...prev, 
        jiraIssueType: '', 
        priority: '', 
        assignee: '' 
      }));
    } finally {
      setLoadingMetadata(false);
    }
  }, []);

  // Load issue transitions for editing existing Jira tasks
  const loadIssueTransitions = useCallback(async (accountId, issueKey) => {
    if (!accountId || !issueKey) {
      setIssueTransitions([]);
      return;
    }

    try {
      setLoadingTransitions(true);
      console.log('Loading transitions for issue:', issueKey);
      
      const response = await accountService.getJiraIssueTransitions(accountId, issueKey);
      console.log('Loaded transitions:', response);
      
      setIssueTransitions(response.transitions || []);
    } catch (error) {
      console.error('Failed to load transitions:', error);
      setIssueTransitions([]);
    } finally {
      setLoadingTransitions(false);
    }
  }, []);

  // Load Jira issues when linking existing issue
  const loadJiraIssues = useCallback(async (accountId) => {
    if (!accountId) {
      setJiraIssues([]);
      return;
    }

    try {
      setLoadingJiraIssues(true);
      console.log('Loading Jira issues for account:', accountId);
      const issues = await accountService.getJiraIssues(accountId);
      console.log('Loaded Jira issues:', issues);
      setJiraIssues(Array.isArray(issues) ? issues : []);
    } catch (error) {
      console.error('Failed to load Jira issues:', error);
      setError(`Failed to load Jira issues: ${error.message}`);
      setJiraIssues([]);
    } finally {
      setLoadingJiraIssues(false);
    }
  }, []); // No dependencies to prevent loops

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      
      if (event && !isCreating) {
        // Editing existing event
        console.log('Loading existing event for editing:', event);
        
        // Extract metadata values
        const metadata = event.extendedProps?.metadata || {};
        const eventType = event.extendedProps?.eventType || getEventType();
        
        // Get account ID from token info
        const accountId = event.extendedProps?.account?.id || '';
        
        setFormData({
          eventType: eventType,
          title: event.extendedProps?.originalTitle || event.title?.replace(/^[📅📋🐙📆]\s/, '') || '',
          description: event.extendedProps?.description || '',
          startDateTime: formatDateTimeForInput(event.start),
          endDateTime: formatDateTimeForInput(event.end),
          location: event.extendedProps?.location || '',
          isAllDay: event.allDay || false,
          priority: event.extendedProps?.priority || 'medium',
          status: event.extendedProps?.status || 'confirmed',
          accountId: accountId,
          
          // Event type specific fields
          googleCalendarId: metadata.calendarId || 'primary',
          
          // Jira specific fields
          jiraProjectKey: metadata.projectKey || event.extendedProps?.jiraKey?.split('-')[0] || '',
          jiraIssueType: metadata.issueType || 'Task',
          assignee: metadata.assignee || event.extendedProps?.assignee || '',
          jiraAssociationType: metadata.associationType || (event.extendedProps?.jiraKey ? 'existing' : 'create'),
          existingJiraKey: event.extendedProps?.jiraKey || '',
          
          // GitHub specific fields
          githubRepository: metadata.repository || event.extendedProps?.repository || '',
          githubIssueNumber: metadata.issueNumber || event.extendedProps?.githubIssue || '',
          githubLabels: metadata.labels ? (Array.isArray(metadata.labels) ? metadata.labels.join(',') : metadata.labels) : '',
          githubAssignee: metadata.assignee || event.extendedProps?.assignee || '',
          githubAssociationType: metadata.associationType || (event.extendedProps?.githubIssue ? 'existing' : 'create'),
          
          // Legacy compatibility
          labels: metadata.labels || []
        });
        setIsEditing(false);

        // Load Jira data if it's a Jira task
        if (eventType === 'jira_task' && accountId) {
          if (metadata.projectKey || event.extendedProps?.jiraKey?.split('-')[0]) {
            const projectKey = metadata.projectKey || event.extendedProps?.jiraKey?.split('-')[0];
            loadProjects(accountId);
            loadProjectMetadata(accountId, projectKey);
          }
          
          // Load Jira issues if we're in existing association mode
          if (metadata.associationType === 'existing' || event.extendedProps?.jiraKey) {
            loadJiraIssues(accountId);
          }
          
          // Load transitions if we have an existing issue
          if (event.extendedProps?.jiraKey) {
            loadIssueTransitions(accountId, event.extendedProps.jiraKey);
          }
        }
      } else if (isCreating) {
        // Creating new event
        console.log('Creating new event with defaultDate:', defaultDate);
        
        // Ensure we always have a valid date - using let to allow reassignment
        let baseDate = defaultDate ? new Date(defaultDate) : new Date();
        console.log('Base date for new event:', baseDate);
        
        // Validate the date
        if (isNaN(baseDate.getTime())) {
          console.error('Invalid date provided, using current date');
          baseDate = new Date();
        }
        
        // Use local time formatting to prevent timezone shifts
        const startTime = formatLocalDateTime(baseDate);
        const endTime = formatLocalDateTime(new Date(baseDate.getTime() + 60 * 60 * 1000));
          
        console.log('Setting form data with:', { startTime, endTime });
        
        setFormData({
          eventType: 'manual',
          title: '',
          description: '',
          startDateTime: startTime,
          endDateTime: endTime,
          location: '',
          isAllDay: false,
          priority: 'medium',
          jiraProjectKey: '',
          jiraIssueType: '',
          googleCalendarId: 'primary',
          assignee: '',
          labels: [],
          status: 'confirmed',
          accountId: '',
          // Association types
          jiraAssociationType: 'create',
          existingJiraKey: '',
          githubAssociationType: 'create',
          githubRepository: '',
          githubIssueNumber: '',
          githubLabels: '',
          githubAssignee: ''
        });
        setIsEditing(true);
      }
      setError(null);
    } else {
      // Reset state when modal closes
      setAccountsLoaded(false);
      setAccounts([]);
      setProjects([]);
      setProjectMetadata({
        issueTypes: [],
        priorities: [],
        assignableUsers: []
      });
      setIssueTransitions([]);
      setError(null);
    }
  }, [event, isOpen, isCreating, defaultDate, getEventType, loadAccounts, loadProjects, loadProjectMetadata, loadIssueTransitions]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Set default project when creating new Jira events and projects load
  useEffect(() => {
    if (isCreating && formData.eventType === 'jira_task' && projects.length > 0 && !formData.jiraProjectKey) {
      // Set first project as default when creating new events
      const firstProject = projects[0];
      setFormData(prev => ({
        ...prev,
        jiraProjectKey: firstProject.key
      }));
      
      // Load metadata for the default project
      if (formData.accountId) {
        loadProjectMetadata(formData.accountId, firstProject.key);
      }
    }
  }, [isCreating, formData.eventType, formData.accountId, formData.jiraProjectKey, projects, loadProjectMetadata]);

  const formatDateTimeForInput = (date) => {
    if (!date) {
      console.warn('formatDateTimeForInput received null/undefined date');
      return '';
    }
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        console.error('formatDateTimeForInput received invalid date:', date);
        return '';
      }
      
      // Use local time instead of UTC to prevent timezone shifts
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting date for input:', error, 'Date value:', date);
      return '';
    }
  };

  // Helper function to format date for datetime-local input (local time)
  const formatLocalDateTime = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Format as YYYY-MM-DDTHH:MM in local time
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getEventTypeDisplay = () => {
    const type = getEventType();
    const accountInfo = event?.extendedProps?.account;
    
    return {
      ...eventTypes[type],
      account: accountInfo
    };
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle account change - load projects and reset project selection
    if (name === 'accountId') {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        jiraProjectKey: '', // Reset project when account changes
        jiraIssueType: '', // Reset issue type when account changes
        priority: 'medium', // Reset priority when account changes
        assignee: '', // Reset assignee when account changes
        existingJiraKey: '' // Reset existing issue when account changes
      }));
      
      // Load projects for the selected account (only for Jira tasks)
      if (value && formData.eventType === 'jira_task') {
        loadProjects(value);
        
        // Also load Jira issues if we're in existing association mode
        if (formData.jiraAssociationType === 'existing') {
          loadJiraIssues(value);
        }
      } else {
        setProjects([]);
        setJiraIssues([]);
      }
      
      // Clear metadata when account changes
      setProjectMetadata({
        issueTypes: [],
        priorities: [],
        assignableUsers: []
      });
      setIssueTransitions([]);
      return;
    }

    // Handle project change - load metadata and reset dependent fields
    if (name === 'jiraProjectKey') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        jiraIssueType: '', // Reset issue type when project changes
        priority: 'medium', // Reset priority when project changes
        assignee: '' // Reset assignee when project changes
      }));
      
      // Load metadata for the selected project
      if (value && formData.accountId) {
        loadProjectMetadata(formData.accountId, value);
      } else {
        setProjectMetadata({
          issueTypes: [],
          priorities: [],
          assignableUsers: []
        });
      }
      return;
    }

    // Handle existing Jira key change - load transitions for editing status
    if (name === 'existingJiraKey') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Load transitions for the selected issue
      if (value && formData.accountId) {
        loadIssueTransitions(formData.accountId, value);
      } else {
        setIssueTransitions([]);
      }
      return;
    }

    // Handle Jira association type change - load issues when switching to 'existing'
    if (name === 'jiraAssociationType') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        existingJiraKey: '' // Reset existing key when changing association type
      }));
      
      // Load Jira issues if switching to 'existing' mode
      if (value === 'existing' && formData.accountId) {
        loadJiraIssues(formData.accountId);
      } else {
        setJiraIssues([]);
      }
      setIssueTransitions([]);
      return;
    }

    // Handle event type change
    if (name === 'eventType') {
      const newValue = type === 'checkbox' ? checked : value;
      setFormData(prev => ({
        ...prev,
        [name]: newValue,
        // Reset Jira-specific fields when changing event type
        jiraProjectKey: '',
        jiraIssueType: '',
        assignee: '',
        existingJiraKey: ''
      }));
      
      // Load projects if switching to Jira task and account is selected
      if (newValue === 'jira_task' && formData.accountId) {
        loadProjects(formData.accountId);
        
        // Also load Jira issues if we're in existing association mode
        if (formData.jiraAssociationType === 'existing') {
          loadJiraIssues(formData.accountId);
        }
      } else {
        setProjects([]);
        setJiraIssues([]);
        setProjectMetadata({
          issueTypes: [],
          priorities: [],
          assignableUsers: []
        });
        setIssueTransitions([]);
      }
      return;
    }

    // Default case for all other inputs
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getAvailableAccounts = (eventType) => {
    if (!Array.isArray(accounts)) {
      console.warn('accounts is not an array in getAvailableAccounts:', accounts);
      return [];
    }
    
    switch (eventType) {
      case 'google_calendar':
        return accounts.filter(acc => acc.provider === 'google');
      case 'jira_task':
        return accounts.filter(acc => acc.provider === 'jira');
      case 'github_issue':
        return accounts.filter(acc => acc.provider === 'github');
      default:
        return [];
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    
    if (new Date(formData.startDateTime) >= new Date(formData.endDateTime)) {
      setError('End time must be after start time');
      return false;
    }

    if (formData.eventType !== 'manual') {
      const availableAccounts = getAvailableAccounts(formData.eventType);
      if (availableAccounts.length === 0) {
        setError(`No ${formData.eventType.replace('_', ' ')} accounts connected. Please add an account first.`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      setError(null);
      
      // Helper function to convert datetime-local string to ISO string in local timezone
      const formatDateTimeForBackend = (dateTimeString) => {
        if (!dateTimeString) return null;
        
        // dateTimeString is in format "YYYY-MM-DDTHH:MM" (local time)
        // We need to create a Date object that represents this local time
        const date = new Date(dateTimeString);
        return date.toISOString();
      };
      
      const eventData = {
        eventType: formData.eventType,
        title: formData.title,
        description: formData.description,
        startTime: formData.isAllDay ? formData.startDateTime.split('T')[0] : formatDateTimeForBackend(formData.startDateTime),
        endTime: formData.isAllDay ? formData.endDateTime.split('T')[0] : formatDateTimeForBackend(formData.endDateTime),
        location: formData.location,
        isAllDay: formData.isAllDay,
        priority: formData.priority,
        status: formData.status,
        metadata: {},
        accountId: formData.accountId
      };

      console.log('Sending event data to backend:', eventData);

      // Add event-type specific metadata
      if (formData.eventType === 'jira_task') {
        if (formData.jiraAssociationType === 'existing') {
          eventData.metadata = {
            associationType: 'existing',
            existingIssueKey: formData.existingJiraKey,
            linkExisting: true
          };
        } else {
          eventData.metadata = {
            associationType: 'create',
            projectKey: formData.jiraProjectKey,
            issueType: formData.jiraIssueType,
            assignee: formData.assignee,
            createNew: true
          };
        }
      } else if (formData.eventType === 'google_calendar') {
        eventData.calendarId = formData.googleCalendarId;
      } else if (formData.eventType === 'github_issue') {
        if (formData.githubAssociationType === 'existing') {
          eventData.metadata = {
            associationType: 'existing',
            repository: formData.githubRepository,
            issueNumber: formData.githubIssueNumber,
            linkExisting: true
          };
        } else {
          eventData.metadata = {
            associationType: 'create',
            repository: formData.githubRepository,
            labels: formData.githubLabels ? formData.githubLabels.split(',').map(l => l.trim()) : [],
            assignee: formData.githubAssignee,
            createNew: true
          };
        }
      }

      if (isCreating) {
        // Create new event
        await eventService.createEvent(eventData);
      } else {
        // Update existing event
        if (getEventType() === 'google_calendar') {
          await calendarService.updateEvent(
            event.extendedProps.googleEventId,
            eventData,
            formData.googleCalendarId || 'primary'
          );
        } else {
          // Update using unified events API
          await eventService.updateEvent(event.id, eventData);
        }
      }

      setIsEditing(false);
      onEventUpdated?.();
      if (isCreating) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving event:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (getEventType() === 'google_calendar') {
        await calendarService.deleteEvent(
          event.extendedProps.googleEventId,
          event.extendedProps.calendarId || 'primary'
        );
      } else {
        // Delete using unified events API
        await eventService.deleteEvent(event.id);
      }

      onEventDeleted?.(event.id);
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isEditing) {
        e.preventDefault();
        handleDelete();
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle Jira status transition
  const handleStatusTransition = async (transitionId) => {
    if (!formData.accountId || !formData.existingJiraKey) return;

    try {
      setLoadingTransitions(true);
      
      console.log('Updating status for issue:', formData.existingJiraKey, 'transition:', transitionId);
      
      await accountService.updateJiraIssueStatus(formData.accountId, formData.existingJiraKey, transitionId);
      
      // Find the transition to get the new status
      const selectedTransition = issueTransitions.find(t => t.id === transitionId);
      const newStatusName = selectedTransition?.to?.name || 'Updated';
      
      console.log(`Successfully updated ${formData.existingJiraKey} to ${newStatusName}`);
      
      // Reload transitions in case new ones are available
      setTimeout(() => loadIssueTransitions(formData.accountId, formData.existingJiraKey), 500);
      
      // Update form with new status if needed
      if (selectedTransition?.to?.name) {
        setFormData(prev => ({
          ...prev,
          status: selectedTransition.to.name.toLowerCase().replace(/\s+/g, '_')
        }));
      }
      
    } catch (error) {
      console.error('Error updating status:', error);
      setError(`Failed to update status: ${error.message}`);
    } finally {
      setLoadingTransitions(false);
    }
  };

  if (!isOpen) return null;

  const eventTypeDisplay = event && !isCreating ? getEventTypeDisplay() : eventTypes[formData.eventType];

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="modal-content max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{eventTypeDisplay.icon}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {isCreating ? 'Create New Event' : (isEditing ? 'Edit Event' : 'Event Details')}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${eventTypeDisplay.color}`}>
                  {eventTypeDisplay.label}
                </span>
                {eventTypeDisplay.account && (
                  <span className="badge-gray">
                    👥 {eventTypeDisplay.account.name || eventTypeDisplay.account.email}
                    {eventTypeDisplay.account.isPrimary && (
                      <span className="ml-1 text-yellow-600 dark:text-yellow-400">★</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="alert-error mb-4">
              <p className="text-sm text-error-800 dark:text-error-200">{error}</p>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              {/* Event Type Selection (only for new events) */}
              {isCreating && (
                <div className="form-group">
                  <label className="form-label">
                    Event Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(eventTypes).map(([key, type]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, eventType: key }))}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          formData.eventType === key
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{type.icon}</span>
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{type.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Selection (for integrated event types) */}
              {formData.eventType !== 'manual' && (
                <div className="form-group">
                  <label className="form-label">
                    Account *
                  </label>
                  <select
                    name="accountId"
                    value={formData.accountId || ''}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  >
                    <option value="">Select an account...</option>
                    {getAvailableAccounts(formData.eventType).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountName} ({account.accountEmail})
                        {account.isPrimary && ' ★'}
                      </option>
                    ))}
                  </select>
                  {getAvailableAccounts(formData.eventType).length === 0 && (
                    <p className="form-error">
                      No {formData.eventType.replace('_', ' ')} accounts connected. Please add an account first.
                    </p>
                  )}
                  <p className="form-help">
                    Debug: {accounts.length} total accounts loaded, {getAvailableAccounts(formData.eventType).length} available for {formData.eventType}
                  </p>
                </div>
              )}

              {/* Title */}
              <div className="form-group">
                <label className="form-label">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                />
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isAllDay"
                  checked={formData.isAllDay}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                />
                <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                  All day event
                </label>
              </div>

              {/* Date/Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">
                    Start {formData.isAllDay ? 'Date' : 'Date & Time'} *
                  </label>
                  <input
                    type={formData.isAllDay ? "date" : "datetime-local"}
                    name="startDateTime"
                    value={formData.isAllDay ? formData.startDateTime.split('T')[0] : formData.startDateTime}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    End {formData.isAllDay ? 'Date' : 'Date & Time'} *
                  </label>
                  <input
                    type={formData.isAllDay ? "date" : "datetime-local"}
                    name="endDateTime"
                    value={formData.isAllDay ? formData.endDateTime.split('T')[0] : formData.endDateTime}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              {/* Event Type Specific Fields */}
              {formData.eventType === 'jira_task' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-200 mb-3">Jira Task Details</h4>
                  
                  {/* Task Association Type */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                      Task Association
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="jiraAssociationType"
                          value="create"
                          checked={formData.jiraAssociationType === 'create'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                        <span className="ml-2 text-sm text-green-700 dark:text-green-300">Create New Issue</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="jiraAssociationType"
                          value="existing"
                          checked={formData.jiraAssociationType === 'existing'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                        <span className="ml-2 text-sm text-green-700 dark:text-green-300">Link Existing Issue</span>
                      </label>
                    </div>
                  </div>

                  {formData.jiraAssociationType === 'existing' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                          Select Issue *
                        </label>
                        {loadingJiraIssues ? (
                          <div className="w-full px-2 py-1 text-sm border border-green-300 dark:border-green-700 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 dark:border-green-400 mr-2"></div>
                            Loading available issues...
                          </div>
                        ) : jiraIssues.length > 0 ? (
                          <select
                            name="existingJiraKey"
                            value={formData.existingJiraKey || ''}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1 text-sm border border-green-300 dark:border-green-700 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">Select an issue...</option>
                            {jiraIssues.map(issue => (
                              <option key={issue.key} value={issue.key}>
                                {issue.key} - {issue.summary} ({issue.status})
                              </option>
                            ))}
                          </select>
                        ) : formData.accountId && !loadingJiraIssues ? (
                          <div className="w-full px-2 py-1 text-sm border border-orange-300 dark:border-orange-700 rounded bg-orange-50 dark:bg-orange-900/20">
                            <p className="text-orange-700 dark:text-orange-300">No open issues found assigned to you.</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              You can still create a new issue instead.
                            </p>
                          </div>
                        ) : (
                          <div className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            Select a Jira account first to load available issues
                          </div>
                        )}
                        
                        {/* Show selected issue details */}
                        {formData.existingJiraKey && jiraIssues.length > 0 && (
                          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs">
                            {(() => {
                              const selectedIssue = jiraIssues.find(issue => issue.key === formData.existingJiraKey);
                              if (selectedIssue) {
                                return (
                                  <div className="text-green-800 dark:text-green-200">
                                    <p><strong>Issue:</strong> {selectedIssue.key}</p>
                                    <p><strong>Summary:</strong> {selectedIssue.summary}</p>
                                    <p><strong>Status:</strong> {selectedIssue.status}</p>
                                    <p><strong>Priority:</strong> {selectedIssue.priority}</p>
                                    <p><strong>Project:</strong> {selectedIssue.project}</p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Dynamic Project Selection */}
                      <div>
                        <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                          Project *
                        </label>
                        {loadingProjects ? (
                          <div className="w-full px-2 py-1 text-sm border border-green-300 dark:border-green-700 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 dark:border-green-400 mr-2"></div>
                            Loading projects...
                          </div>
                        ) : projects.length > 0 ? (
                          <select
                            name="jiraProjectKey"
                            value={formData.jiraProjectKey}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1 text-sm border border-green-300 dark:border-green-700 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            required
                          >
                            <option value="">Select a project...</option>
                            {projects.map(project => (
                              <option key={project.key} value={project.key}>
                                {project.key} - {project.name}
                              </option>
                            ))}
                          </select>
                        ) : formData.accountId && !loadingProjects ? (
                          <div className="w-full px-2 py-1 text-sm border border-orange-300 dark:border-orange-700 rounded bg-orange-50 dark:bg-orange-900/20">
                            <p className="text-orange-700 dark:text-orange-300">No projects found for this account.</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              Make sure you have permissions to create issues.
                            </p>
                          </div>
                        ) : (
                          <div className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            Select a Jira account first to load projects
                          </div>
                        )}
                        {loadingProjects && (
                          <div className="mt-1 flex items-center text-xs text-green-600 dark:text-green-400">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 dark:border-green-400 mr-1"></div>
                            Loading available projects...
                          </div>
                        )}
                      </div>

                      {/* Dynamic Issue Type - only show if data is available */}
                      {projectMetadata.issueTypes.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                            Issue Type *
                          </label>
                          <select
                            name="jiraIssueType"
                            value={formData.jiraIssueType}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1 text-sm border border-green-300 dark:border-green-700 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                            <div className="mt-1 flex items-center text-xs text-green-600 dark:text-green-400">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 dark:border-green-400 mr-1"></div>
                              Loading project configuration...
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dynamic Priority and Assignee Grid - only show sections with data */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dynamic Priority - only show if data is available */}
                        {projectMetadata.priorities.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                              Priority
                            </label>
                            <select
                              name="priority"
                              value={formData.priority}
                              onChange={handleInputChange}
                              className="w-full px-2 py-1 text-sm border border-green-300 dark:border-green-700 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                          <div>
                            <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                              Assignee
                            </label>
                            <select
                              name="assignee"
                              value={formData.assignee}
                              onChange={handleInputChange}
                              className="w-full px-2 py-1 text-sm border border-green-300 dark:border-green-700 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              disabled={loadingMetadata}
                            >
                              <option value="">
                                {loadingMetadata ? "Loading assignees..." : "Select assignee..."}
                              </option>
                              {projectMetadata.assignableUsers.map(user => (
                                <option key={user.accountId} value={user.accountId}>
                                  {user.displayName} ({user.emailAddress})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* GitHub Issue Fields */}
              {formData.eventType === 'github_issue' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4">
                  <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-3">GitHub Issue Details</h4>
                  
                  {/* GitHub fields would go here - similar to Jira fields but for GitHub */}
                  <p className="text-sm text-purple-700 dark:text-purple-300">GitHub integration coming soon...</p>
                </div>
              )}
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-4">
              {/* Basic Event Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{event?.title}</h3>
                  {event?.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{event.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Date & Time:</span>
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      {event?.allDay ? (
                        <div>{formatLocalDateTime(event?.start)}</div>
                      ) : (
                        <div>
                          <div>Start: {formatLocalDateTime(event?.start)}</div>
                          <div>End: {formatLocalDateTime(event?.end)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {event?.extendedProps?.location && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">{event.extendedProps.location}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Type Specific Details */}
              {event && getEventType() === 'google_calendar' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Google Calendar Event</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">Calendar:</span>
                      <span className="ml-1 text-blue-600 dark:text-blue-400">{event?.extendedProps?.calendarSummary || 'Primary'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">Status:</span>
                      <span className="ml-1 text-blue-600 dark:text-blue-400">{event?.extendedProps?.status || 'confirmed'}</span>
                    </div>
                    {event?.extendedProps?.htmlLink && (
                      <div>
                        <span className="font-medium text-blue-700 dark:text-blue-300">Link:</span>
                        <a 
                          href={event.extendedProps.htmlLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                        >
                          Open in Google Calendar
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {event && getEventType() === 'jira_task' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">Jira Task Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-green-700 dark:text-green-300">Issue Key:</span>
                      <span className="ml-1 text-green-600 dark:text-green-400">{event?.extendedProps?.jiraKey}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700 dark:text-green-300">Status:</span>
                      <span className="ml-1 text-green-600 dark:text-green-400">{event?.extendedProps?.status}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700 dark:text-green-300">Priority:</span>
                      <span className="ml-1 text-green-600 dark:text-green-400">{event?.extendedProps?.priority}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700 dark:text-green-300">Project:</span>
                      <span className="ml-1 text-green-600 dark:text-green-400">{event?.extendedProps?.project}</span>
                    </div>
                    {event?.extendedProps?.jiraUrl && (
                      <div>
                        <span className="font-medium text-green-700 dark:text-green-300">Link:</span>
                        <a 
                          href={event.extendedProps.jiraUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
                        >
                          Open in Jira
                        </a>
                      </div>
                    )}
                    {event?.extendedProps?.metadata?.lastSynced && (
                      <div>
                        <span className="font-medium text-green-700 dark:text-green-300">Last Synced:</span>
                        <span className="ml-1 text-green-600 dark:text-green-400 text-xs">
                          {new Date(event.extendedProps.metadata.lastSynced).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Transitions - available in view mode for linked Jira tasks */}
                  {event?.extendedProps?.jiraKey && event?.extendedProps?.account?.id && (
                    <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
                      <h5 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Change Status</h5>
                      {issueTransitions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {issueTransitions.map((transition) => (
                            <button
                              key={transition.id}
                              type="button"
                              onClick={() => {
                                // Store the issue key for status transition
                                setFormData(prev => ({
                                  ...prev,
                                  accountId: event.extendedProps.account.id,
                                  existingJiraKey: event.extendedProps.jiraKey
                                }));
                                handleStatusTransition(transition.id);
                              }}
                              disabled={loadingTransitions}
                              className="px-3 py-2 text-xs bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-800/30 border border-green-300 dark:border-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-green-800 dark:text-green-200">
                                  {transition.name}
                                  {transition.to?.name && (
                                    <span className="text-green-600 dark:text-green-400 font-normal">
                                      {' → ' + transition.to.name}
                                    </span>
                                  )}
                                </span>
                                {loadingTransitions && (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 dark:border-green-400"></div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            // Load transitions when button is clicked
                            setFormData(prev => ({
                              ...prev,
                              accountId: event.extendedProps.account.id,
                              existingJiraKey: event.extendedProps.jiraKey
                            }));
                            loadIssueTransitions(event.extendedProps.account.id, event.extendedProps.jiraKey);
                          }}
                          disabled={loadingTransitions}
                          className="px-3 py-2 text-xs bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-800/30 border border-green-300 dark:border-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {loadingTransitions ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 dark:border-green-400 mr-2"></div>
                              <span className="text-green-800 dark:text-green-200">Loading transitions...</span>
                            </>
                          ) : (
                            <span className="text-green-800 dark:text-green-200">
                              🔄 Load Available Status Changes
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {event && getEventType() === 'github_issue' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4">
                  <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">GitHub Issue Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-purple-700 dark:text-purple-300">Issue #:</span>
                      <span className="ml-1 text-purple-600 dark:text-purple-400">{event?.extendedProps?.githubIssue}</span>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700 dark:text-purple-300">Repository:</span>
                      <span className="ml-1 text-purple-600 dark:text-purple-400">{event?.extendedProps?.repository}</span>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700 dark:text-purple-300">Assignee:</span>
                      <span className="ml-1 text-purple-600 dark:text-purple-400">{event?.extendedProps?.assignee || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-2">
            {!isEditing && !isCreating && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="btn-error"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-error-700 mr-2 inline-block"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </>
                )}
              </button>
            )}
            
            {event?.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Original
              </a>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => isCreating ? onClose() : setIsEditing(false)}
                  disabled={isSaving}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      {isCreating ? 'Creating...' : 'Saving...'}
                    </>
                  ) : (
                    isCreating ? 'Create Event' : 'Save Changes'
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary"
                >
                  <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Tip: Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 border rounded">Delete</kbd> or <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 border rounded">Backspace</kbd> to delete, <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 border rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventModal; 