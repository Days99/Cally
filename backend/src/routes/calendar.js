const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all calendar routes
router.use(authenticateToken);

// Route status
router.get('/status', (req, res) => {
  res.json({
    message: 'Calendar routes active',
    endpoints: {
      'GET /calendars': 'Get user calendars',
      'GET /events/:calendarId?': 'Get events from calendar',
      'POST /sync/:calendarId?': 'Sync calendar events',
      'POST /events/:calendarId?': 'Create new event',
      'PUT /events/:calendarId/:eventId': 'Update event',
      'DELETE /events/:calendarId/:eventId': 'Delete event',
      'GET /sync-status': 'Get sync status'
    }
  });
});

// Calendar management
router.get('/calendars', calendarController.getCalendars);
router.get('/sync-status', calendarController.getSyncStatus);

// Unified sync for all calendar sources (Google + Jira)
router.post('/sync-all', calendarController.syncAllCalendarSources);

// Sync calendar events (Google Calendar only)
router.post('/sync/:calendarId?', calendarController.syncEvents);

// Event management (default to primary calendar if not specified)
router.get('/events/:calendarId?', calendarController.getCalendarEvents);
router.post('/events/:calendarId?', calendarController.createEvent);
router.put('/events/:calendarId/:eventId', calendarController.updateEvent);
router.delete('/events/:calendarId/:eventId', calendarController.deleteEvent);

module.exports = router; 