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
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.startDateTime,
      end: event.endDateTime,
      allDay: event.isAllDay,
      url: event.htmlLink,
      extendedProps: {
        description: event.description,
        location: event.location,
        status: event.status,
        hangoutLink: event.hangoutLink,
        googleEventId: event.googleEventId,
        lastSyncAt: event.lastSyncAt
      },
      backgroundColor: '#4285f4', // Google blue
      borderColor: '#3367d6',
      textColor: '#ffffff'
    }));
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