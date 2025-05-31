import React, { useState, useEffect } from 'react';
import calendarService from '../services/calendarService';
import accountService from '../services/accountService';
import eventService from '../services/eventService';

const EventModal = ({ isOpen, onClose, event, onEventUpdated, onEventDeleted, isCreating = false, defaultDate = null }) => {
  const [isEditing, setIsEditing] = useState(isCreating);
  const [isDeleting, setIsDeleting] = useState(false);
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
    status: 'confirmed'
  });
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);

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

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      
      if (event && !isCreating) {
        // Editing existing event
        console.log('Loading existing event for editing:', event);
        setFormData({
          eventType: event.extendedProps?.eventType || getEventType(),
          title: event.extendedProps?.originalTitle || event.title || '',
          description: event.extendedProps?.description || '',
          startDateTime: formatDateTimeForInput(event.start),
          endDateTime: formatDateTimeForInput(event.end),
          location: event.extendedProps?.location || '',
          isAllDay: event.allDay || false,
          priority: event.extendedProps?.priority || 'medium',
          status: event.extendedProps?.status || 'confirmed',
          // Copy metadata
          ...event.extendedProps?.metadata
        });
        setIsEditing(false);
      } else if (isCreating) {
        // Creating new event
        console.log('Creating new event with defaultDate:', defaultDate);
        
        // Ensure we always have a valid date
        const baseDate = defaultDate ? new Date(defaultDate) : new Date();
        console.log('Base date for new event:', baseDate);
        
        // Validate the date
        if (isNaN(baseDate.getTime())) {
          console.error('Invalid date provided, using current date');
          baseDate = new Date();
        }
        
        const startTime = baseDate.toISOString().slice(0, 16);
        const endTime = new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
          
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
          jiraIssueType: 'Task',
          googleCalendarId: 'primary',
          assignee: '',
          labels: [],
          status: 'confirmed'
        });
        setIsEditing(true);
      }
      setError(null);
    }
  }, [event, isOpen, isCreating, defaultDate]);

  const loadAccounts = async () => {
    try {
      const accountsData = await accountService.getAccounts();
      console.log('Loaded accounts:', accountsData);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError(`Failed to load accounts: ${error.message}`);
      setAccounts([]); // Ensure accounts is always an array
    }
  };

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

  const getEventType = () => {
    // First check if event type is already determined
    if (event?.extendedProps?.eventType) {
      return event.extendedProps.eventType;
    }
    
    // Fallback to detection logic
    if (event?.extendedProps?.googleEventId) return 'google_calendar';
    if (event?.extendedProps?.jiraKey) return 'jira_task';
    if (event?.extendedProps?.githubIssue) return 'github_issue';
    return 'manual';
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
      
      const eventData = {
        eventType: formData.eventType,
        title: formData.title,
        description: formData.description,
        startTime: formData.isAllDay ? formData.startDateTime.split('T')[0] : formData.startDateTime,
        endTime: formData.isAllDay ? formData.endDateTime.split('T')[0] : formData.endDateTime,
        location: formData.location,
        isAllDay: formData.isAllDay,
        priority: formData.priority,
        status: formData.status,
        metadata: {},
        accountId: formData.accountId
      };

      // Add event-type specific metadata
      if (formData.eventType === 'jira_task') {
        eventData.metadata = {
          projectKey: formData.jiraProjectKey,
          issueType: formData.jiraIssueType,
          assignee: formData.assignee
        };
      } else if (formData.eventType === 'google_calendar') {
        eventData.calendarId = formData.googleCalendarId;
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

  if (!isOpen) return null;

  const eventTypeDisplay = event && !isCreating ? getEventTypeDisplay() : eventTypes[formData.eventType];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{eventTypeDisplay.icon}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isCreating ? 'Create New Event' : (isEditing ? 'Edit Event' : 'Event Details')}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${eventTypeDisplay.color}`}>
                  {eventTypeDisplay.label}
                </span>
                {eventTypeDisplay.account && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    👥 {eventTypeDisplay.account.name || eventTypeDisplay.account.email}
                    {eventTypeDisplay.account.isPrimary && (
                      <span className="ml-1 text-yellow-600">★</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              {/* Event Type Selection (only for new events) */}
              {isCreating && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{type.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{type.label}</p>
                            <p className="text-xs text-gray-500">{type.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Selection (for integrated event types) */}
              {formData.eventType !== 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account *
                  </label>
                  <select
                    name="accountId"
                    value={formData.accountId || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Priority (for task-type events) */}
              {(formData.eventType === 'jira_task' || formData.eventType === 'github_issue') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* All Day Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isAllDay"
                  checked={formData.isAllDay}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  All day event
                </label>
              </div>

              {/* Date/Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start {formData.isAllDay ? 'Date' : 'Date & Time'} *
                  </label>
                  <input
                    type={formData.isAllDay ? "date" : "datetime-local"}
                    name="startDateTime"
                    value={formData.isAllDay ? formData.startDateTime.split('T')[0] : formData.startDateTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End {formData.isAllDay ? 'Date' : 'Date & Time'} *
                  </label>
                  <input
                    type={formData.isAllDay ? "date" : "datetime-local"}
                    name="endDateTime"
                    value={formData.isAllDay ? formData.endDateTime.split('T')[0] : formData.endDateTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Event Type Specific Fields */}
              {formData.eventType === 'jira_task' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-3">Jira Task Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Project Key
                      </label>
                      <input
                        type="text"
                        name="jiraProjectKey"
                        value={formData.jiraProjectKey}
                        onChange={handleInputChange}
                        placeholder="e.g., PROJ"
                        className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Issue Type
                      </label>
                      <select
                        name="jiraIssueType"
                        value={formData.jiraIssueType}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                      >
                        <option value="Task">Task</option>
                        <option value="Story">Story</option>
                        <option value="Bug">Bug</option>
                        <option value="Epic">Epic</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {formData.eventType === 'google_calendar' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Google Calendar Settings</h4>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">
                      Calendar
                    </label>
                    <select
                      name="googleCalendarId"
                      value={formData.googleCalendarId}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="primary">Primary Calendar</option>
                      {/* TODO: Load user's calendars */}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {event?.extendedProps?.originalTitle || event?.title}
                </h3>
              </div>

              {/* Description */}
              {event?.extendedProps?.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.extendedProps.description}</p>
                </div>
              )}

              {/* Date/Time */}
              {event && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">When</h4>
                  <div className="text-gray-600">
                    {event.allDay ? (
                      <span>
                        {new Date(event.start).toLocaleDateString()} 
                        {event.end && new Date(event.end).toDateString() !== new Date(event.start).toDateString() && 
                          ` - ${new Date(event.end).toLocaleDateString()}`}
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">All day</span>
                      </span>
                    ) : (
                      <span>
                        {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {event?.extendedProps?.location && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Location</h4>
                  <p className="text-gray-600">📍 {event.extendedProps.location}</p>
                </div>
              )}

              {/* Event Type Specific Info */}
              {event && getEventType() === 'google_calendar' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Google Calendar Details</h4>
                  <div className="space-y-2 text-sm">
                    {event.extendedProps?.status && (
                      <div>
                        <span className="font-medium text-blue-700">Status:</span>
                        <span className="ml-1 text-blue-600 capitalize">{event.extendedProps.status}</span>
                      </div>
                    )}
                    {event.extendedProps?.hangoutLink && (
                      <div>
                        <span className="font-medium text-blue-700">Meet Link:</span>
                        <a 
                          href={event.extendedProps.hangoutLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 hover:text-blue-500 underline"
                        >
                          Join Meeting
                        </a>
                      </div>
                    )}
                    {event.extendedProps?.lastSyncAt && (
                      <div>
                        <span className="font-medium text-blue-700">Last Synced:</span>
                        <span className="ml-1 text-blue-600">
                          {new Date(event.extendedProps.lastSyncAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {event && getEventType() === 'jira_task' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Jira Task Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-green-700">Key:</span>
                      <span className="ml-1 text-green-600">{event?.extendedProps?.jiraKey}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Status:</span>
                      <span className="ml-1 text-green-600">{event?.extendedProps?.status}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Priority:</span>
                      <span className="ml-1 text-green-600">{event?.extendedProps?.priority || 'Medium'}</span>
                    </div>
                  </div>
                </div>
              )}

              {event && getEventType() === 'github_issue' && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-purple-900 mb-2">GitHub Issue Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-purple-700">Issue #:</span>
                      <span className="ml-1 text-purple-600">{event?.extendedProps?.githubIssue}</span>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Repository:</span>
                      <span className="ml-1 text-purple-600">{event?.extendedProps?.repository}</span>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Assignee:</span>
                      <span className="ml-1 text-purple-600">{event?.extendedProps?.assignee || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            {!isEditing && !isCreating && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2 inline-block"></div>
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          <p className="text-xs text-gray-500">
            💡 Tip: Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Delete</kbd> or <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Backspace</kbd> to delete, <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventModal; 