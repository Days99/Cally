const { TaskSession, TimeManagerState, CalendarEvent, User } = require('../models');
const { Op } = require('sequelize');

class TimeManagerService {
  
  /**
   * Get current time manager state for a user
   */
  async getCurrentState(userId) {
    try {
      let state = await TimeManagerState.findOne({
        where: { userId },
        include: [
          {
            model: TaskSession,
            as: 'currentMainTask',
            include: [
              {
                model: CalendarEvent,
                as: 'event'
              }
            ]
          }
        ]
      });

      // Create state if it doesn't exist
      if (!state) {
        state = await TimeManagerState.create({
          userId,
          currentMainTaskId: null,
          currentSubTasks: [],
          lastActiveTime: new Date(),
          dailyStats: this.getEmptyDailyStats(),
          preferences: {
            overrunThreshold: 60,
            autoStartMeetings: true,
            breakReminders: true,
            focusMode: false
          }
        });
      }

      // Get active sessions
      const activeSessions = await TaskSession.findAll({
        where: {
          userId,
          status: 'active'
        },
        include: [
          {
            model: CalendarEvent,
            as: 'event'
          }
        ],
        order: [['startTime', 'DESC']]
      });

      // Calculate current session duration if there's an active main task
      let currentSessionDuration = 0;
      if (state.currentMainTask && state.currentMainTask.status === 'active') {
        const now = new Date();
        const startTime = new Date(state.currentMainTask.startTime);
        currentSessionDuration = Math.floor((now - startTime) / (1000 * 60)); // minutes
      }

      return {
        state,
        activeSessions,
        currentSessionDuration,
        hasActiveTask: !!state.currentMainTaskId,
        isOverrun: currentSessionDuration > (state.preferences?.overrunThreshold || 60)
      };
    } catch (error) {
      console.error('Error getting current state:', error);
      throw error;
    }
  }

  /**
   * Start a new task session
   */
  async startTask(userId, eventId, options = {}) {
    try {
      const {
        isMainTask = true,
        estimatedDuration = null,
        notes = null,
        startEarly = false
      } = options;

      // Get the event
      const event = await CalendarEvent.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if user already has an active main task
      const currentState = await this.getCurrentState(userId);
      
      if (isMainTask && currentState.hasActiveTask) {
        // Pause current main task
        await this.pauseTask(userId, currentState.state.currentMainTaskId);
      }

      // Create new task session
      const session = await TaskSession.create({
        userId,
        eventId,
        startTime: new Date(),
        estimatedDuration,
        status: 'active',
        isMainTask,
        notes,
        metadata: {
          startedEarly: startEarly,
          originalStartTime: event.startTime
        }
      });

      // Update time manager state if this is the main task
      if (isMainTask) {
        await TimeManagerState.update(
          {
            currentMainTaskId: session.id,
            lastActiveTime: new Date()
          },
          { where: { userId } }
        );
      } else {
        // Add to sub-tasks
        const state = await TimeManagerState.findOne({ where: { userId } });
        const subTasks = state.currentSubTasks || [];
        subTasks.push(session.id);
        
        await TimeManagerState.update(
          {
            currentSubTasks: subTasks,
            lastActiveTime: new Date()
          },
          { where: { userId } }
        );
      }

      // Return session with event details
      return await TaskSession.findByPk(session.id, {
        include: [
          {
            model: CalendarEvent,
            as: 'event'
          }
        ]
      });
    } catch (error) {
      console.error('Error starting task:', error);
      throw error;
    }
  }

  /**
   * Complete a task session
   */
  async completeTask(userId, sessionId, options = {}) {
    try {
      const { notes = null, rating = null } = options;

      const session = await TaskSession.findOne({
        where: { id: sessionId, userId }
      });

      if (!session) {
        throw new Error('Task session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Task session is not active');
      }

      const endTime = new Date();
      const startTime = new Date(session.startTime);
      const actualDuration = Math.floor((endTime - startTime) / (1000 * 60)); // minutes

      // Update session
      await session.update({
        endTime,
        actualDuration,
        status: 'completed',
        notes: notes || session.notes,
        metadata: {
          ...session.metadata,
          completedAt: endTime,
          rating
        }
      });

      // Update time manager state
      const state = await TimeManagerState.findOne({ where: { userId } });
      
      if (session.isMainTask && state.currentMainTaskId === sessionId) {
        // Clear main task
        await state.update({
          currentMainTaskId: null,
          lastActiveTime: new Date()
        });
      } else {
        // Remove from sub-tasks
        const subTasks = (state.currentSubTasks || []).filter(id => id !== sessionId);
        await state.update({
          currentSubTasks: subTasks,
          lastActiveTime: new Date()
        });
      }

      // Update daily stats
      await this.updateDailyStats(userId, session);

      return session;
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Pause a task session
   */
  async pauseTask(userId, sessionId) {
    try {
      const session = await TaskSession.findOne({
        where: { id: sessionId, userId }
      });

      if (!session) {
        throw new Error('Task session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Task session is not active');
      }

      const endTime = new Date();
      const startTime = new Date(session.startTime);
      const actualDuration = Math.floor((endTime - startTime) / (1000 * 60)); // minutes

      await session.update({
        endTime,
        actualDuration,
        status: 'paused',
        metadata: {
          ...session.metadata,
          pausedAt: endTime
        }
      });

      // Update time manager state
      const state = await TimeManagerState.findOne({ where: { userId } });
      
      if (session.isMainTask && state.currentMainTaskId === sessionId) {
        await state.update({
          currentMainTaskId: null,
          lastActiveTime: new Date()
        });
      }

      return session;
    } catch (error) {
      console.error('Error pausing task:', error);
      throw error;
    }
  }

  /**
   * Check for task overruns and handle them
   */
  async checkForOverruns(userId) {
    try {
      const state = await TimeManagerState.findOne({
        where: { userId },
        include: [
          {
            model: TaskSession,
            as: 'currentMainTask'
          }
        ]
      });

      if (!state || !state.currentMainTask) {
        return null;
      }

      const session = state.currentMainTask;
      const now = new Date();
      const startTime = new Date(session.startTime);
      const currentDuration = Math.floor((now - startTime) / (1000 * 60)); // minutes
      
      const overrunThreshold = state.preferences?.overrunThreshold || 60;
      const estimatedDuration = session.estimatedDuration || 60;
      
      // Check if task is overrunning
      if (currentDuration > estimatedDuration + overrunThreshold) {
        // Auto-pause the task
        await session.update({
          status: 'overrun',
          metadata: {
            ...session.metadata,
            overrunDetectedAt: now,
            overrunDuration: currentDuration - estimatedDuration
          }
        });

        // Clear from state
        await state.update({
          currentMainTaskId: null,
          lastActiveTime: new Date()
        });

        return {
          type: 'overrun',
          session,
          overrunDuration: currentDuration - estimatedDuration,
          suggestions: await this.getNextTaskSuggestions(userId)
        };
      }

      // Check if approaching overrun (warning)
      if (currentDuration > estimatedDuration && currentDuration <= estimatedDuration + overrunThreshold) {
        return {
          type: 'warning',
          session,
          overrunDuration: currentDuration - estimatedDuration,
          timeRemaining: overrunThreshold - (currentDuration - estimatedDuration)
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking for overruns:', error);
      throw error;
    }
  }

  /**
   * Get suggestions for next tasks
   */
  async getNextTaskSuggestions(userId) {
    try {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Get upcoming events for today
      const upcomingEvents = await CalendarEvent.findAll({
        where: {
          userId,
          startTime: {
            [Op.between]: [now, endOfDay]
          }
        },
        order: [['startTime', 'ASC']],
        limit: 5
      });

      // Filter out events that already have active sessions
      const activeSessions = await TaskSession.findAll({
        where: {
          userId,
          status: 'active'
        }
      });

      const activeEventIds = activeSessions.map(s => s.eventId);
      const availableEvents = upcomingEvents.filter(e => !activeEventIds.includes(e.id));

      return availableEvents.map(event => ({
        eventId: event.id,
        title: event.title,
        startTime: event.startTime,
        estimatedDuration: this.calculateEstimatedDuration(event),
        priority: this.calculatePriority(event, now),
        canStartEarly: new Date(event.startTime) > now
      }));
    } catch (error) {
      console.error('Error getting task suggestions:', error);
      throw error;
    }
  }

  /**
   * Get time spent on an event
   */
  async getTimeSpent(userId, eventId) {
    try {
      const sessions = await TaskSession.findAll({
        where: {
          userId,
          eventId,
          status: {
            [Op.in]: ['completed', 'paused']
          }
        }
      });

      const totalMinutes = sessions.reduce((total, session) => {
        return total + (session.actualDuration || 0);
      }, 0);

      return {
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        sessionCount: sessions.length,
        sessions: sessions.map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.actualDuration,
          status: s.status
        }))
      };
    } catch (error) {
      console.error('Error getting time spent:', error);
      throw error;
    }
  }

  /**
   * Update daily statistics
   */
  async updateDailyStats(userId, completedSession) {
    try {
      const state = await TimeManagerState.findOne({ where: { userId } });
      const today = new Date().toISOString().split('T')[0];
      
      let dailyStats = state.dailyStats || {};
      if (!dailyStats[today]) {
        dailyStats[today] = this.getEmptyDailyStats();
      }

      const todayStats = dailyStats[today];
      todayStats.tasksCompleted += 1;
      todayStats.totalTimeSpent += completedSession.actualDuration || 0;
      
      if (completedSession.estimatedDuration) {
        todayStats.estimatedTime += completedSession.estimatedDuration;
        const variance = (completedSession.actualDuration || 0) - completedSession.estimatedDuration;
        todayStats.timeVariance += variance;
      }

      dailyStats[today] = todayStats;

      await state.update({ dailyStats });
      return todayStats;
    } catch (error) {
      console.error('Error updating daily stats:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  getEmptyDailyStats() {
    return {
      tasksCompleted: 0,
      totalTimeSpent: 0,
      estimatedTime: 0,
      timeVariance: 0,
      focusScore: 0
    };
  }

  calculateEstimatedDuration(event) {
    if (event.endTime && event.startTime) {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      return Math.floor((end - start) / (1000 * 60)); // minutes
    }
    return 60; // default 1 hour
  }

  calculatePriority(event, now) {
    const timeUntilStart = new Date(event.startTime) - now;
    const hoursUntilStart = timeUntilStart / (1000 * 60 * 60);
    
    if (hoursUntilStart < 0.5) return 'urgent';
    if (hoursUntilStart < 2) return 'high';
    if (hoursUntilStart < 4) return 'medium';
    return 'low';
  }
}

module.exports = new TimeManagerService(); 