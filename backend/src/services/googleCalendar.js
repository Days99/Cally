const { google } = require('googleapis');
const { CalendarEvent, User, Token } = require('../models');
const googleAuthService = require('./googleAuth');

class GoogleCalendarService {
  constructor() {
    this.calendar = google.calendar('v3');
  }

  // Get authenticated calendar client for user
  async getCalendarClient(userId) {
    try {
      const accessToken = await googleAuthService.getValidAccessToken(userId);
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({ access_token: accessToken });
      
      return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
      console.error('Error getting calendar client:', error);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  // Fetch user's calendars
  async getUserCalendars(userId) {
    try {
      const calendar = await this.getCalendarClient(userId);
      const response = await calendar.calendarList.list();
      
      return response.data.items.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        primary: cal.primary,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        timeZone: cal.timeZone
      }));
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw new Error('Failed to fetch user calendars');
    }
  }

  // Fetch events from a specific calendar
  async getCalendarEvents(userId, calendarId = 'primary', options = {}) {
    try {
      const calendar = await this.getCalendarClient(userId);
      
      const {
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        maxResults = 250,
        singleEvents = true,
        orderBy = 'startTime'
      } = options;

      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents,
        orderBy
      });

      return response.data.items;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  // Sync calendar events to database
  async syncCalendarEvents(userId, calendarId = 'primary', options = {}) {
    try {
      console.log(`Syncing calendar events for user ${userId}, calendar ${calendarId}`);
      
      // Fetch events from Google Calendar
      const googleEvents = await this.getCalendarEvents(userId, calendarId, options);
      const syncedEvents = [];

      // Get Google event IDs for comparison
      const googleEventIds = new Set(googleEvents.map(event => event.id));

      // First, get existing events from database for this calendar and time range
      const {
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      } = options;

      const existingEvents = await CalendarEvent.findAll({
        where: {
          userId,
          calendarId,
          startTime: {
            [require('sequelize').Op.gte]: new Date(timeMin),
            [require('sequelize').Op.lte]: new Date(timeMax)
          }
        }
      });

      // Find events that exist in database but not in Google Calendar (deleted events)
      const deletedEvents = existingEvents.filter(dbEvent => 
        !googleEventIds.has(dbEvent.externalId)
      );

      // Delete events that were removed from Google Calendar
      if (deletedEvents.length > 0) {
        console.log(`Removing ${deletedEvents.length} deleted events from database`);
        await CalendarEvent.destroy({
          where: {
            id: {
              [require('sequelize').Op.in]: deletedEvents.map(event => event.id)
            }
          }
        });
      }

      // Sync/update events from Google Calendar
      for (const event of googleEvents) {
        try {
          const calendarEvent = await this.saveEventToDatabase(userId, calendarId, event);
          syncedEvents.push(calendarEvent);
        } catch (error) {
          console.error(`Error saving event ${event.id}:`, error);
          // Continue with other events even if one fails
        }
      }

      console.log(`Synced ${syncedEvents.length} events, removed ${deletedEvents.length} deleted events for user ${userId}`);
      return syncedEvents;
    } catch (error) {
      console.error('Error syncing calendar events:', error);
      throw error;
    }
  }

  // Save individual event to database
  async saveEventToDatabase(userId, calendarId, googleEvent) {
    try {
      const eventData = {
        userId,
        externalId: googleEvent.id,
        calendarId: calendarId,
        title: googleEvent.summary || 'No Title',
        description: googleEvent.description || null,
        startTime: this.parseDateTime(googleEvent.start),
        endTime: this.parseDateTime(googleEvent.end),
        isAllDay: !!(googleEvent.start.date || googleEvent.end.date),
        location: googleEvent.location || null,
        attendees: googleEvent.attendees || [],
        status: googleEvent.status || 'confirmed',
        visibility: googleEvent.visibility || 'default',
        recurrence: googleEvent.recurrence || null,
        lastSyncAt: new Date()
      };

      // Use upsert to handle updates to existing events
      const [calendarEvent, created] = await CalendarEvent.upsert(eventData, {
        where: { userId, externalId: googleEvent.id },
        returning: true
      });

      console.log(`${created ? 'Created' : 'Updated'} event: ${eventData.title}`);
      return calendarEvent;
    } catch (error) {
      console.error('Error saving event to database:', error);
      throw error;
    }
  }

  // Parse Google Calendar datetime
  parseDateTime(dateTime) {
    if (!dateTime) return null;
    
    // All-day events use 'date' field, timed events use 'dateTime'
    if (dateTime.date) {
      return new Date(dateTime.date);
    } else if (dateTime.dateTime) {
      return new Date(dateTime.dateTime);
    }
    
    return null;
  }

  // Get events from database for a user
  async getEventsFromDatabase(userId, options = {}) {
    try {
      const {
        startDate = new Date(),
        endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        limit = 100
      } = options;

      const events = await CalendarEvent.findAll({
        where: {
          userId,
          startTime: {
            [require('sequelize').Op.gte]: startDate,
            [require('sequelize').Op.lte]: endDate
          }
        },
        order: [['startTime', 'ASC']],
        limit
      });

      return events;
    } catch (error) {
      console.error('Error fetching events from database:', error);
      throw error;
    }
  }

  // Create a new event in Google Calendar
  async createEvent(userId, calendarId = 'primary', eventData) {
    try {
      const calendar = await this.getCalendarClient(userId);
      
      // Helper function to format datetime for Google Calendar API
      const formatDateTime = (dateTimeString, isAllDay = false) => {
        if (isAllDay) {
          // For all-day events, use just the date part
          return { date: dateTimeString.split('T')[0] };
        } else {
          // For timed events, ensure proper ISO format with timezone
          const date = new Date(dateTimeString);
          return { dateTime: date.toISOString() };
        }
      };

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: formatDateTime(eventData.startTime, eventData.isAllDay),
        end: formatDateTime(eventData.endTime, eventData.isAllDay),
        location: eventData.location,
        attendees: eventData.attendees
      };

      console.log('Creating Google Calendar event with data:', JSON.stringify(event, null, 2));

      const response = await calendar.events.insert({
        calendarId,
        resource: event
      });

      // Sync the created event back to our database
      await this.saveEventToDatabase(userId, calendarId, response.data);

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  // Update an existing event
  async updateEvent(userId, calendarId, eventId, eventData) {
    try {
      const calendar = await this.getCalendarClient(userId);
      
      // Helper function to format datetime for Google Calendar API
      const formatDateTime = (dateTimeString, isAllDay = false) => {
        if (isAllDay) {
          // For all-day events, use just the date part
          return { date: dateTimeString.split('T')[0] };
        } else {
          // For timed events, ensure proper ISO format with timezone
          const date = new Date(dateTimeString);
          return { dateTime: date.toISOString() };
        }
      };

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: formatDateTime(eventData.startTime, eventData.isAllDay),
        end: formatDateTime(eventData.endTime, eventData.isAllDay),
        location: eventData.location
      };

      console.log('Updating Google Calendar event with data:', JSON.stringify(event, null, 2));

      const response = await calendar.events.update({
        calendarId,
        eventId,
        resource: event
      });

      // Sync the updated event back to our database
      await this.saveEventToDatabase(userId, calendarId, response.data);

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  // Delete an event
  async deleteEvent(userId, calendarId, eventId) {
    try {
      const calendar = await this.getCalendarClient(userId);
      
      await calendar.events.delete({
        calendarId,
        eventId
      });

      // Remove from our database
      await CalendarEvent.destroy({
        where: {
          userId,
          externalId: eventId,
          calendarId: calendarId
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }
}

module.exports = new GoogleCalendarService(); 