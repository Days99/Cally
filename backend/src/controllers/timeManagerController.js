const timeManagerService = require('../services/timeManager');
const { authenticateToken } = require('../middleware/auth');

/**
 * Get current time manager state
 */
const getCurrentState = async (req, res) => {
  try {
    const userId = req.user.id;
    const state = await timeManagerService.getCurrentState(userId);
    
    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error('Error getting current state:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Start a new task session
 */
const startTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, isMainTask, estimatedDuration, notes, startEarly } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required'
      });
    }

    const session = await timeManagerService.startTask(userId, eventId, {
      isMainTask,
      estimatedDuration,
      notes,
      startEarly
    });

    res.json({
      success: true,
      data: session,
      message: `Task "${session.event.title}" started successfully`
    });
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Complete a task session
 */
const completeTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { notes, rating } = req.body;

    const session = await timeManagerService.completeTask(userId, sessionId, {
      notes,
      rating
    });

    res.json({
      success: true,
      data: session,
      message: 'Task completed successfully'
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Pause a task session
 */
const pauseTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const session = await timeManagerService.pauseTask(userId, sessionId);

    res.json({
      success: true,
      data: session,
      message: 'Task paused successfully'
    });
  } catch (error) {
    console.error('Error pausing task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check for overruns
 */
const checkOverruns = async (req, res) => {
  try {
    const userId = req.user.id;
    const overrunInfo = await timeManagerService.checkForOverruns(userId);

    res.json({
      success: true,
      data: overrunInfo
    });
  } catch (error) {
    console.error('Error checking overruns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get task suggestions
 */
const getTaskSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const suggestions = await timeManagerService.getNextTaskSuggestions(userId);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error getting task suggestions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get time spent on an event
 */
const getTimeSpent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    const timeSpent = await timeManagerService.getTimeSpent(userId, eventId);

    res.json({
      success: true,
      data: timeSpent
    });
  } catch (error) {
    console.error('Error getting time spent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Switch to a different task
 */
const switchTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, estimatedDuration, notes } = req.body;

    // Get current state to pause current task
    const currentState = await timeManagerService.getCurrentState(userId);
    
    // Pause current task if exists
    if (currentState.hasActiveTask) {
      await timeManagerService.pauseTask(userId, currentState.state.currentMainTaskId);
    }

    // Start new task
    const session = await timeManagerService.startTask(userId, eventId, {
      isMainTask: true,
      estimatedDuration,
      notes
    });

    res.json({
      success: true,
      data: session,
      message: `Switched to task "${session.event.title}"`
    });
  } catch (error) {
    console.error('Error switching task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get daily productivity stats
 */
const getDailyStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    
    const currentState = await timeManagerService.getCurrentState(userId);
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const dailyStats = currentState.state.dailyStats?.[targetDate] || timeManagerService.getEmptyDailyStats();

    res.json({
      success: true,
      data: {
        date: targetDate,
        stats: dailyStats,
        hasActiveTask: currentState.hasActiveTask,
        currentSessionDuration: currentState.currentSessionDuration
      }
    });
  } catch (error) {
    console.error('Error getting daily stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getCurrentState,
  startTask,
  completeTask,
  pauseTask,
  checkOverruns,
  getTaskSuggestions,
  getTimeSpent,
  switchTask,
  getDailyStats
}; 