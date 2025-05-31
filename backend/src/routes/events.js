const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const eventController = require('../controllers/eventController');

// All routes require authentication
router.use(authenticateToken);

// Event management routes
router.get('/', eventController.getAllEvents);
router.post('/', eventController.createEvent);
router.get('/stats', eventController.getEventStats);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router; 