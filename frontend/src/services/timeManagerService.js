import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class TimeManagerService {
  
  /**
   * Get current time manager state
   */
  async getCurrentState() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/time-manager/state`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting current state:', error);
      throw error;
    }
  }

  /**
   * Start a new task session
   */
  async startTask(eventId, options = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/time-manager/start`, {
        eventId,
        ...options
      });
      return response.data.data;
    } catch (error) {
      console.error('Error starting task:', error);
      throw error;
    }
  }

  /**
   * Complete a task session
   */
  async completeTask(sessionId, options = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/time-manager/complete/${sessionId}`, options);
      return response.data.data;
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Pause a task session
   */
  async pauseTask(sessionId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/time-manager/pause/${sessionId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error pausing task:', error);
      throw error;
    }
  }

  /**
   * Switch to a different task
   */
  async switchTask(eventId, options = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/time-manager/switch`, {
        eventId,
        ...options
      });
      return response.data.data;
    } catch (error) {
      console.error('Error switching task:', error);
      throw error;
    }
  }

  /**
   * Check for task overruns
   */
  async checkOverruns() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/time-manager/overruns`);
      return response.data.data;
    } catch (error) {
      console.error('Error checking overruns:', error);
      throw error;
    }
  }

  /**
   * Get task suggestions
   */
  async getTaskSuggestions() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/time-manager/suggestions`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting task suggestions:', error);
      throw error;
    }
  }

  /**
   * Get time spent on an event
   */
  async getTimeSpent(eventId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/time-manager/time-spent/${eventId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting time spent:', error);
      throw error;
    }
  }

  /**
   * Get daily productivity stats
   */
  async getDailyStats(date = null) {
    try {
      const params = date ? { date } : {};
      const response = await axios.get(`${API_BASE_URL}/api/time-manager/daily-stats`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Error getting daily stats:', error);
      throw error;
    }
  }

  /**
   * Format duration in minutes to human readable format
   */
  formatDuration(minutes) {
    if (!minutes || minutes < 0) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(actualMinutes, estimatedMinutes) {
    if (!estimatedMinutes || estimatedMinutes <= 0) return 0;
    return Math.min(100, Math.round((actualMinutes / estimatedMinutes) * 100));
  }

  /**
   * Get status color based on progress
   */
  getStatusColor(progress, isOverrun = false) {
    if (isOverrun) return 'text-red-600 bg-red-100';
    if (progress >= 100) return 'text-green-600 bg-green-100';
    if (progress >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority) {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Calculate estimated duration for an event
   */
  calculateEstimatedDuration(event) {
    if (event.endTime && event.startTime) {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      return Math.floor((end - start) / (1000 * 60)); // minutes
    }
    return 60; // default 1 hour
  }
}

export default new TimeManagerService(); 