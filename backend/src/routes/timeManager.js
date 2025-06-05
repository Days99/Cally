const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const timeManagerController = require('../controllers/timeManagerController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/time-manager/state
 * @desc Get current time manager state for the user
 * @access Private
 */
router.get('/state', timeManagerController.getCurrentState);

/**
 * @route POST /api/time-manager/start
 * @desc Start a new task session
 * @access Private
 * @body { eventId, isMainTask?, estimatedDuration?, notes?, startEarly? }
 */
router.post('/start', timeManagerController.startTask);

/**
 * @route POST /api/time-manager/complete/:sessionId
 * @desc Complete a task session
 * @access Private
 * @body { notes?, rating? }
 */
router.post('/complete/:sessionId', timeManagerController.completeTask);

/**
 * @route POST /api/time-manager/pause/:sessionId
 * @desc Pause a task session
 * @access Private
 */
router.post('/pause/:sessionId', timeManagerController.pauseTask);

/**
 * @route POST /api/time-manager/switch
 * @desc Switch to a different task (pause current, start new)
 * @access Private
 * @body { eventId, estimatedDuration?, notes? }
 */
router.post('/switch', timeManagerController.switchTask);

/**
 * @route GET /api/time-manager/overruns
 * @desc Check for task overruns
 * @access Private
 */
router.get('/overruns', timeManagerController.checkOverruns);

/**
 * @route GET /api/time-manager/suggestions
 * @desc Get task suggestions for the user
 * @access Private
 */
router.get('/suggestions', timeManagerController.getTaskSuggestions);

/**
 * @route GET /api/time-manager/time-spent/:eventId
 * @desc Get time spent on a specific event
 * @access Private
 */
router.get('/time-spent/:eventId', timeManagerController.getTimeSpent);

/**
 * @route GET /api/time-manager/daily-stats
 * @desc Get daily productivity statistics
 * @access Private
 * @query { date? } - Optional date in YYYY-MM-DD format
 */
router.get('/daily-stats', timeManagerController.getDailyStats);

module.exports = router; 