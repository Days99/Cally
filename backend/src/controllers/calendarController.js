const googleCalendarService = require('../services/googleCalendar');

class CalendarController {
  // Get user's calendars
  async getCalendars(req, res) {
    try {
      const userId = req.user.id;
      const calendars = await googleCalendarService.getUserCalendars(userId);
      
      res.json({
        success: true,
        calendars,
        message: 'Calendars fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching calendars:', error);
      res.status(500).json({
        error: 'Failed to fetch calendars',
        message: error.message
      });
    }
  }

  // Get events from a specific calendar
  async getCalendarEvents(req, res) {
    try {
      const userId = req.user.id;
      const { calendarId = 'primary' } = req.params;
      const { 
        timeMin, 
        timeMax, 
        maxResults = 250,
        sync = false 
      } = req.query;

      let events;
      
      if (sync === 'true') {
        // Sync events from Google Calendar and return fresh data
        console.log(`Syncing events for user ${userId}, calendar ${calendarId}`);
        events = await googleCalendarService.syncCalendarEvents(userId, calendarId, {
          timeMin,
          timeMax,
          maxResults: parseInt(maxResults)
        });
      } else {
        // Get events from database
        events = await googleCalendarService.getEventsFromDatabase(userId, {
          startDate: timeMin ? new Date(timeMin) : undefined,
          endDate: timeMax ? new Date(timeMax) : undefined,
          limit: parseInt(maxResults)
        });
      }

      res.json({
        success: true,
        events: events.map(event => ({
          id: event.id || event.externalId,
          googleEventId: event.externalId,
          title: event.title,
          description: event.description,
          startDateTime: event.startTime,
          endDateTime: event.endTime,
          isAllDay: event.isAllDay,
          location: event.location,
          status: event.status,
          htmlLink: event.htmlLink,
          hangoutLink: event.hangoutLink,
          lastSyncAt: event.lastSyncAt
        })),
        count: events.length,
        message: `Events ${sync === 'true' ? 'synced' : 'fetched'} successfully`
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({
        error: 'Failed to fetch calendar events',
        message: error.message
      });
    }
  }

  // Sync all calendar events
  async syncEvents(req, res) {
    try {
      const userId = req.user.id;
      const { calendarId = 'primary' } = req.params;
      const { timeMin, timeMax, maxResults = 250 } = req.query;

      console.log(`Manual sync requested for user ${userId}, calendar ${calendarId}`);
      
      const events = await googleCalendarService.syncCalendarEvents(userId, calendarId, {
        timeMin,
        timeMax,
        maxResults: parseInt(maxResults)
      });

      res.json({
        success: true,
        events: events.map(event => ({
          id: event.id,
          googleEventId: event.externalId,
          title: event.title,
          startDateTime: event.startTime,
          endDateTime: event.endTime,
          isAllDay: event.isAllDay,
          lastSyncAt: event.lastSyncAt
        })),
        count: events.length,
        message: `Successfully synced ${events.length} events`
      });
    } catch (error) {
      console.error('Error syncing calendar events:', error);
      res.status(500).json({
        error: 'Failed to sync calendar events',
        message: error.message
      });
    }
  }

  // Create a new calendar event
  async createEvent(req, res) {
    try {
      const userId = req.user.id;
      const { calendarId = 'primary' } = req.params;
      const eventData = req.body;

      // Validate required fields
      if (!eventData.title) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Event title is required'
        });
      }

      if (!eventData.startTime && !eventData.startDate) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Event start time/date is required'
        });
      }

      const googleEvent = await googleCalendarService.createEvent(userId, calendarId, eventData);

      res.json({
        success: true,
        event: {
          id: googleEvent.id,
          title: googleEvent.summary,
          description: googleEvent.description,
          startDateTime: googleEvent.start.dateTime || googleEvent.start.date,
          endDateTime: googleEvent.end.dateTime || googleEvent.end.date,
          htmlLink: googleEvent.htmlLink
        },
        message: 'Event created successfully'
      });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({
        error: 'Failed to create calendar event',
        message: error.message
      });
    }
  }

  // Update an existing calendar event
  async updateEvent(req, res) {
    try {
      const userId = req.user.id;
      const { calendarId = 'primary', eventId } = req.params;
      const eventData = req.body;

      const googleEvent = await googleCalendarService.updateEvent(userId, calendarId, eventId, eventData);

      res.json({
        success: true,
        event: {
          id: googleEvent.id,
          title: googleEvent.summary,
          description: googleEvent.description,
          startDateTime: googleEvent.start.dateTime || googleEvent.start.date,
          endDateTime: googleEvent.end.dateTime || googleEvent.end.date,
          htmlLink: googleEvent.htmlLink
        },
        message: 'Event updated successfully'
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({
        error: 'Failed to update calendar event',
        message: error.message
      });
    }
  }

  // Delete a calendar event
  async deleteEvent(req, res) {
    try {
      const userId = req.user.id;
      const { calendarId = 'primary', eventId } = req.params;

      await googleCalendarService.deleteEvent(userId, calendarId, eventId);

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({
        error: 'Failed to delete calendar event',
        message: error.message
      });
    }
  }

  // Get calendar sync status
  async getSyncStatus(req, res) {
    try {
      const userId = req.user.id;
      
      // Get latest sync info from database
      const { CalendarEvent } = require('../models');
      const lastSync = await CalendarEvent.findOne({
        where: { userId },
        order: [['lastSyncAt', 'DESC']],
        attributes: ['lastSyncAt']
      });

      const totalEvents = await CalendarEvent.count({
        where: { userId }
      });

      res.json({
        success: true,
        syncStatus: {
          lastSyncAt: lastSync?.lastSyncAt || null,
          status: lastSync ? 'synced' : 'never_synced',
          totalEvents,
          isConnected: true // User has Google token if they reached this endpoint
        },
        message: 'Sync status retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting sync status:', error);
      res.status(500).json({
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  }
}

module.exports = new CalendarController(); 