const { CalendarEvent, Token } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const googleCalendar = require('../services/googleCalendar');
const jiraService = require('../services/jiraService');

class EventController {
  // Get all events for a user (unified view)
  async getAllEvents(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, eventType } = req.query;

      const whereClause = { userId };
      
      if (startDate && endDate) {
        whereClause.startTime = {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        };
      }

      if (eventType && eventType !== 'all') {
        whereClause.eventType = eventType;
      }

      const events = await CalendarEvent.findAll({
        where: whereClause,
        include: [{
          model: Token,
          as: 'token',
          attributes: ['accountName', 'accountEmail', 'provider', 'isPrimary']
        }],
        order: [['startTime', 'ASC']]
      });

      res.json({
        success: true,
        events,
        message: 'Events fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({
        error: 'Failed to fetch events',
        message: error.message
      });
    }
  }

  // Create a new event (any type)
  async createEvent(req, res) {
    try {
      const userId = req.user.id;
      const {
        eventType = 'manual',
        title,
        description,
        startTime,
        endTime,
        isAllDay = false,
        location,
        priority = 'medium',
        status = 'confirmed',
        calendarId,
        metadata = {},
        accountId
      } = req.body;

      // Validate required fields
      if (!title || !startTime || !endTime) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Title, start time, and end time are required'
        });
      }

      // Generate color based on event type
      const eventColors = {
        manual: '#6B7280',
        google_calendar: '#3B82F6',
        jira_task: '#10B981',
        github_issue: '#8B5CF6',
        outlook: '#F59E0B',
        teams: '#6366F1'
      };

      const eventData = {
        userId,
        eventType,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isAllDay,
        location,
        priority,
        status,
        metadata,
        color: eventColors[eventType] || eventColors.manual,
        syncStatus: 'manual'
      };

      // Handle event-type specific creation
      if (eventType === 'google_calendar') {
        // Create in Google Calendar first
        if (!accountId) {
          return res.status(400).json({
            error: 'Account required',
            message: 'Google Calendar account must be specified'
          });
        }

        const token = await Token.findOne({
          where: { id: accountId, userId, provider: 'google', isActive: true }
        });

        if (!token) {
          return res.status(404).json({
            error: 'Account not found',
            message: 'Google Calendar account not found or inactive'
          });
        }

        // Create event in Google Calendar (this will also save to our database via saveEventToDatabase)
        const googleEvent = await googleCalendar.createEvent(userId, calendarId || 'primary', {
          title,
          description,
          startTime,
          endTime,
          isAllDay,
          location,
          attendees: metadata.attendees || []
        });

        // Find the event that was created in our database by saveEventToDatabase
        const event = await CalendarEvent.findOne({
          where: {
            userId,
            externalId: googleEvent.id,
            eventType: 'google_calendar'
          },
          include: [{
            model: Token,
            as: 'token',
            attributes: ['accountName', 'accountEmail', 'provider', 'isPrimary']
          }]
        });

        if (!event) {
          throw new Error('Event was created in Google Calendar but not found in database');
        }

        return res.status(201).json({
          success: true,
          event: event,
          message: 'Google Calendar event created successfully'
        });
        
      } else if (eventType === 'jira_task') {
        // Create Jira issue
        if (!accountId) {
          return res.status(400).json({
            error: 'Account required',
            message: 'Jira account must be specified'
          });
        }

        const token = await Token.findOne({
          where: { id: accountId, userId, provider: 'jira', isActive: true }
        });

        if (!token) {
          return res.status(404).json({
            error: 'Account not found',
            message: 'Jira account not found or inactive'
          });
        }

        // For now, we'll create the event in our database and sync to Jira later
        // TODO: Implement jiraService.createIssue method
        eventData.externalId = `MANUAL-${Date.now()}`; // Temporary ID
        eventData.calendarId = metadata.projectKey;
        eventData.tokenId = accountId;
        eventData.syncStatus = 'pending'; // Will sync to Jira later
        eventData.metadata = {
          ...metadata,
          jiraKey: `PENDING-${Date.now()}`,
          needsJiraSync: true
        };
      }

      // Store in our database (only for non-Google Calendar events)
      const event = await CalendarEvent.create(eventData);

      // Fetch with token info for response
      const eventWithToken = await CalendarEvent.findByPk(event.id, {
        include: [{
          model: Token,
          as: 'token',
          attributes: ['accountName', 'accountEmail', 'provider', 'isPrimary']
        }]
      });

      res.status(201).json({
        success: true,
        event: eventWithToken,
        message: 'Event created successfully'
      });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({
        error: 'Failed to create event',
        message: error.message
      });
    }
  }

  // Update an event
  async updateEvent(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updateData = req.body;

      const event = await CalendarEvent.findOne({
        where: { id, userId }
      });

      if (!event) {
        return res.status(404).json({
          error: 'Event not found',
          message: 'Event not found or access denied'
        });
      }

      // Handle event-type specific updates
      if (event.eventType === 'google_calendar' && event.externalId) {
        // Update in Google Calendar
        const token = await Token.findByPk(event.tokenId);
        if (token) {
          await googleCalendar.updateEvent(
            userId,
            event.calendarId,
            event.externalId,
            updateData
          );
        }
      } else if (event.eventType === 'jira_task' && event.externalId) {
        // Update Jira issue
        if (updateData.status) {
          await jiraService.updateIssueStatus(
            userId,
            event.externalId,
            updateData.status,
            event.tokenId
          );
        }
      }

      // Update in our database
      await event.update(updateData);

      // Fetch updated event with token info
      const updatedEvent = await CalendarEvent.findByPk(event.id, {
        include: [{
          model: Token,
          as: 'token',
          attributes: ['accountName', 'accountEmail', 'provider', 'isPrimary']
        }]
      });

      res.json({
        success: true,
        event: updatedEvent,
        message: 'Event updated successfully'
      });
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({
        error: 'Failed to update event',
        message: error.message
      });
    }
  }

  // Delete an event
  async deleteEvent(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const event = await CalendarEvent.findOne({
        where: { id, userId }
      });

      if (!event) {
        return res.status(404).json({
          error: 'Event not found',
          message: 'Event not found or access denied'
        });
      }

      // Handle event-type specific deletion
      if (event.eventType === 'google_calendar' && event.externalId) {
        // Delete from Google Calendar
        const token = await Token.findByPk(event.tokenId);
        if (token) {
          await googleCalendar.deleteEvent(
            userId,
            event.calendarId,
            event.externalId
          );
        }
      } else if (event.eventType === 'jira_task' && event.externalId) {
        // For Jira, we might just update status to "cancelled" instead of deleting
        await jiraService.updateIssueStatus(
          userId,
          event.externalId,
          'cancelled',
          event.tokenId
        );
      }

      // Delete from our database
      await event.destroy();

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({
        error: 'Failed to delete event',
        message: error.message
      });
    }
  }

  // Get event statistics
  async getEventStats(req, res) {
    try {
      const userId = req.user.id;
      const { Op } = require('sequelize');

      const stats = await CalendarEvent.findAll({
        where: { userId },
        attributes: [
          'eventType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['eventType'],
        raw: true
      });

      const totalEvents = await CalendarEvent.count({ where: { userId } });

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

      const todayEvents = await CalendarEvent.count({
        where: {
          userId,
          startTime: {
            [Op.gte]: startOfToday,
            [Op.lt]: endOfToday
          }
        }
      });

      const upcomingEvents = await CalendarEvent.count({
        where: {
          userId,
          startTime: {
            [Op.gt]: new Date()
          }
        }
      });

      res.json({
        success: true,
        stats: {
          total: totalEvents,
          today: todayEvents,
          upcoming: upcomingEvents,
          byType: stats.reduce((acc, stat) => {
            acc[stat.eventType] = parseInt(stat.count);
            return acc;
          }, {})
        },
        message: 'Event statistics fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching event stats:', error);
      res.status(500).json({
        error: 'Failed to fetch event statistics',
        message: error.message
      });
    }
  }
}

module.exports = new EventController(); 