import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class CalendarService {
  // Get user's calendars
  async getCalendars() {
    try {
      const response = await axios.get(`${API_URL}/api/calendar/calendars`);
      return response.data.calendars;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch calendars');
    }
  }

  // Get calendar events
  async getEvents(calendarId = 'primary', options = {}) {
    try {
      const {
        timeMin,
        timeMax,
        maxResults = 250,
        sync = false
      } = options;

      const params = new URLSearchParams();
      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);
      if (maxResults) params.append('maxResults', maxResults.toString());
      if (sync) params.append('sync', 'true');

      const url = calendarId && calendarId !== 'primary' 
        ? `/api/calendar/events/${calendarId}`
        : '/api/calendar/events';

      const response = await axios.get(`${API_URL}${url}?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch events');
    }
  }

  // Sync calendar events
  async syncEvents(calendarId = 'primary', options = {}) {
    try {
      const {
        timeMin,
        timeMax,
        maxResults = 250
      } = options;

      const params = new URLSearchParams();
      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);
      if (maxResults) params.append('maxResults', maxResults.toString());

      const url = calendarId && calendarId !== 'primary'
        ? `/api/calendar/sync/${calendarId}`
        : '/api/calendar/sync';

      const response = await axios.post(`${API_URL}${url}?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to sync events');
    }
  }

  // Unified sync for all calendar sources (Google Calendar + Jira Tasks)
  async syncAllSources(options = {}) {
    try {
      const {
        timeMin,
        timeMax,
        maxResults = 250
      } = options;

      const params = new URLSearchParams();
      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);
      if (maxResults) params.append('maxResults', maxResults.toString());

      const response = await axios.post(`${API_URL}/api/calendar/sync-all?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to sync all calendar sources');
    }
  }

  // Create a new event
  async createEvent(eventData, calendarId = 'primary') {
    try {
      const url = calendarId && calendarId !== 'primary'
        ? `/api/calendar/events/${calendarId}`
        : '/api/calendar/events';

      const response = await axios.post(`${API_URL}${url}`, eventData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create event');
    }
  }

  // Update an existing event
  async updateEvent(eventId, eventData, calendarId = 'primary') {
    try {
      const response = await axios.put(
        `${API_URL}/api/calendar/events/${calendarId}/${eventId}`, 
        eventData
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update event');
    }
  }

  // Delete an event
  async deleteEvent(eventId, calendarId = 'primary') {
    try {
      const response = await axios.delete(
        `${API_URL}/api/calendar/events/${calendarId}/${eventId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete event');
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const response = await axios.get(`${API_URL}/api/calendar/sync-status`);
      return response.data.syncStatus;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get sync status');
    }
  }

  // Helper method to format events for FullCalendar
  formatEventsForCalendar(events) {
    return events.map(event => {
      // Determine event type and styling based on the eventType field
      let backgroundColor, borderColor, textColor, icon, eventType;
      
      // Determine event type from the new unified structure
      if (event.eventType === 'google_calendar' || event.googleEventId) {
        eventType = 'google_calendar';
        backgroundColor = '#4285f4';
        borderColor = '#3367d6';
        textColor = '#ffffff';
        icon = '📅';
      } else if (event.eventType === 'jira_task' || event.jiraKey || event.externalId?.startsWith('JIRA-') || event.metadata?.jiraKey) {
        eventType = 'jira_task';
        backgroundColor = '#0052cc';
        borderColor = '#0043a8';
        textColor = '#ffffff';
        icon = '📋';
      } else if (event.eventType === 'github_issue' || event.githubIssue) {
        eventType = 'github_issue';
        backgroundColor = '#6f42c1';
        borderColor = '#5a2d9d';
        textColor = '#ffffff';
        icon = '🐙';
      } else if (event.eventType === 'manual') {
        eventType = 'manual';
        backgroundColor = '#6b7280';
        borderColor = '#4b5563';
        textColor = '#ffffff';
        icon = '📆';
      } else {
        // Default/unknown events
        eventType = 'unknown';
        backgroundColor = '#6b7280';
        borderColor = '#4b5563';
        textColor = '#ffffff';
        icon = '📆';
      }

      return {
        id: event.id,
        title: `${icon} ${event.title}`,
        start: event.startTime || event.startDateTime,
        end: event.endTime || event.endDateTime,
        allDay: event.isAllDay,
        url: event.htmlLink,
        extendedProps: {
          description: event.description,
          location: event.location,
          status: event.status,
          priority: event.priority,
          eventType: eventType,
          metadata: event.metadata || {},
          syncStatus: event.syncStatus,
          
          // Legacy support for backward compatibility
          hangoutLink: event.hangoutLink || event.metadata?.hangoutLink,
          googleEventId: event.googleEventId || (event.eventType === 'google_calendar' ? event.externalId : null),
          jiraKey: event.jiraKey || event.metadata?.jiraKey || (event.eventType === 'jira_task' ? event.externalId : null),
          githubIssue: event.githubIssue || event.metadata?.githubIssue,
          repository: event.repository || event.metadata?.repository,
          assignee: event.assignee || event.metadata?.assignee,
          
          // Account information
          account: event.token ? {
            id: event.token.id || event.tokenId,
            name: event.token.accountName,
            email: event.token.accountEmail,
            provider: event.token.provider
          } : null,
          
          lastSyncAt: event.lastSyncAt,
          originalTitle: event.title, // Store original title without icon
        },
        backgroundColor: event.color || backgroundColor,
        borderColor: borderColor,
        textColor: textColor,
        classNames: [`event-${eventType}`]
      };
    });
  }

  // Helper method to get date range for calendar view
  getDateRange(view = 'month', date = new Date()) {
    const start = new Date(date);
    const end = new Date(date);

    switch (view) {
      case 'week':
        start.setDate(date.getDate() - date.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'day':
        end.setDate(date.getDate());
        break;
      case 'month':
      default:
        start.setDate(1);
        end.setMonth(date.getMonth() + 1, 0);
        break;
    }

    // Add some padding for better sync coverage
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString()
    };
  }
}

export default new CalendarService(); 