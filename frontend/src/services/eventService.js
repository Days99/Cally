import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class EventService {
  // Get all events for a user
  async getEvents(options = {}) {
    try {
      const {
        startDate,
        endDate,
        eventType = 'all'
      } = options;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (eventType && eventType !== 'all') params.append('eventType', eventType);

      const response = await axios.get(`${API_URL}/api/events?${params}`);
      return response.data.events;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch events');
    }
  }

  // Create a new event
  async createEvent(eventData) {
    try {
      const response = await axios.post(`${API_URL}/api/events`, eventData);
      return response.data.event;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create event');
    }
  }

  // Update an existing event
  async updateEvent(eventId, eventData) {
    try {
      const response = await axios.put(`${API_URL}/api/events/${eventId}`, eventData);
      return response.data.event;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update event');
    }
  }

  // Delete an event
  async deleteEvent(eventId) {
    try {
      const response = await axios.delete(`${API_URL}/api/events/${eventId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete event');
    }
  }

  // Get event statistics
  async getEventStats() {
    try {
      const response = await axios.get(`${API_URL}/api/events/stats`);
      return response.data.stats;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch event statistics');
    }
  }

  // Sync Jira task statuses
  async syncJiraTaskStatuses() {
    try {
      const response = await axios.post(`${API_URL}/api/events/sync/jira`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to sync Jira task statuses');
    }
  }

  // Helper method to format events for FullCalendar
  formatEventsForCalendar(events) {
    if (!Array.isArray(events)) {
      console.warn('formatEventsForCalendar received non-array:', events);
      return [];
    }

    console.log('Formatting events for calendar:', events.length, 'events');

    return events.map(event => {
      // Determine event type and styling based on eventType field
      let backgroundColor, borderColor, textColor, icon;
      
      switch (event.eventType) {
        case 'google_calendar':
          backgroundColor = '#4285f4';
          borderColor = '#3367d6';
          textColor = '#ffffff';
          icon = '📅';
          break;
        case 'jira_task':
          backgroundColor = '#0052cc';
          borderColor = '#0043a8';
          textColor = '#ffffff';
          icon = '📋';
          break;
        case 'github_issue':
          backgroundColor = '#6f42c1';
          borderColor = '#5a2d9d';
          textColor = '#ffffff';
          icon = '🐙';
          break;
        case 'manual':
        default:
          backgroundColor = event.color || '#6b7280';
          borderColor = '#4b5563';
          textColor = '#ffffff';
          icon = '📆';
          break;
      }

      // Ensure proper date formatting for FullCalendar
      const startTime = event.startTime ? new Date(event.startTime).toISOString() : null;
      const endTime = event.endTime ? new Date(event.endTime).toISOString() : null;

      if (!startTime) {
        console.warn('Event missing start time:', event);
      }

      const formattedEvent = {
        id: event.id,
        title: `${icon} ${event.title}`,
        start: startTime,
        end: endTime,
        allDay: event.isAllDay || false,
        url: event.htmlLink,
        extendedProps: {
          description: event.description,
          location: event.location,
          status: event.status,
          priority: event.priority,
          eventType: event.eventType,
          syncStatus: event.syncStatus,
          metadata: event.metadata,
          externalId: event.externalId,
          calendarId: event.calendarId,
          lastSyncAt: event.lastSyncAt,
          originalTitle: event.title, // Store original title without icon
          account: event.token ? {
            name: event.token.accountName,
            email: event.token.accountEmail,
            provider: event.token.provider,
            isPrimary: event.token.isPrimary
          } : null,
          
          // Legacy compatibility
          googleEventId: event.eventType === 'google_calendar' ? event.externalId : null,
          jiraKey: event.eventType === 'jira_task' ? event.externalId : null,
          githubIssue: event.eventType === 'github_issue' ? event.externalId : null,
          
          // Extract from metadata
          hangoutLink: event.metadata?.hangoutLink,
          repository: event.metadata?.repository,
          assignee: event.metadata?.assignee
        },
        backgroundColor,
        borderColor,
        textColor,
        classNames: [`event-${event.eventType}`]
      };

      console.log('Formatted event:', formattedEvent);
      return formattedEvent;
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

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }
}

const eventService = new EventService();
export default eventService; 