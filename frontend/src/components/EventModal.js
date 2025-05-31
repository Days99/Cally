import React, { useState, useEffect } from 'react';
import calendarService from '../services/calendarService';

const EventModal = ({ isOpen, onClose, event, onEventUpdated, onEventDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    isAllDay: false
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (event && isOpen) {
      setFormData({
        title: event.extendedProps?.originalTitle || event.title || '',
        description: event.extendedProps?.description || '',
        startDateTime: formatDateTimeForInput(event.start),
        endDateTime: formatDateTimeForInput(event.end),
        location: event.extendedProps?.location || '',
        isAllDay: event.allDay || false
      });
      setIsEditing(false);
      setError(null);
    }
  }, [event, isOpen]);

  const formatDateTimeForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getEventType = () => {
    // First check if event type is already determined
    if (event?.extendedProps?.eventType) {
      return event.extendedProps.eventType;
    }
    
    // Fallback to detection logic
    if (event?.extendedProps?.googleEventId) return 'google';
    if (event?.extendedProps?.jiraKey) return 'jira';
    if (event?.extendedProps?.githubIssue) return 'github';
    return 'unknown';
  };

  const getEventTypeDisplay = () => {
    const type = getEventType();
    switch (type) {
      case 'google':
        return { label: 'Google Calendar Event', color: 'bg-blue-100 text-blue-800', icon: '📅' };
      case 'jira':
        return { label: 'Jira Task', color: 'bg-green-100 text-green-800', icon: '📋' };
      case 'github':
        return { label: 'GitHub Issue', color: 'bg-purple-100 text-purple-800', icon: '🐙' };
      default:
        return { label: 'Calendar Event', color: 'bg-gray-100 text-gray-800', icon: '📆' };
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      setError(null);
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        startTime: formData.isAllDay ? formData.startDateTime.split('T')[0] : formData.startDateTime,
        endTime: formData.isAllDay ? formData.endDateTime.split('T')[0] : formData.endDateTime,
        location: formData.location,
        isAllDay: formData.isAllDay
      };

      if (getEventType() === 'google') {
        await calendarService.updateEvent(
          event.extendedProps.googleEventId,
          eventData,
          'primary' // TODO: Get actual calendar ID
        );
      }
      // TODO: Add handlers for Jira and GitHub events

      setIsEditing(false);
      onEventUpdated?.();
    } catch (error) {
      console.error('Error updating event:', error);
      setError(error.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      if (getEventType() === 'google') {
        await calendarService.deleteEvent(
          event.extendedProps.googleEventId,
          'primary' // TODO: Get actual calendar ID
        );
      }
      // TODO: Add handlers for Jira and GitHub events

      onEventDeleted?.();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDelete();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !event) return null;

  const eventTypeDisplay = getEventTypeDisplay();

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
                {isEditing ? 'Edit Event' : 'Event Details'}
              </h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${eventTypeDisplay.color}`}>
                {eventTypeDisplay.label}
              </span>
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
              {getEventType() === 'jira' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Jira Task Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-700">Key:</span>
                      <span className="ml-1 text-green-600">{event?.extendedProps?.jiraKey}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Status:</span>
                      <span className="ml-1 text-green-600">{event?.extendedProps?.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {getEventType() === 'github' && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-purple-900 mb-2">GitHub Issue Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-purple-700">Issue #:</span>
                      <span className="ml-1 text-purple-600">{event?.extendedProps?.githubIssue}</span>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Repository:</span>
                      <span className="ml-1 text-purple-600">{event?.extendedProps?.repository}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {event.extendedProps?.originalTitle || event.title}
                </h3>
              </div>

              {/* Description */}
              {event.extendedProps?.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.extendedProps.description}</p>
                </div>
              )}

              {/* Date/Time */}
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

              {/* Location */}
              {event.extendedProps?.location && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Location</h4>
                  <p className="text-gray-600">📍 {event.extendedProps.location}</p>
                </div>
              )}

              {/* Event Type Specific Info */}
              {getEventType() === 'google' && (
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

              {getEventType() === 'jira' && (
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

              {getEventType() === 'github' && (
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
            {!isEditing && (
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
            
            {event.url && (
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
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Save Changes
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