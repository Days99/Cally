import React, { useState, useEffect, useCallback } from 'react';
import timeManagerService from '../services/timeManagerService';

const TimeManager = () => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Real-time timer state
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Load time manager state
  const loadState = useCallback(async () => {
    try {
      setError(null);
      const data = await timeManagerService.getCurrentState();
      setState(data);
      
      // Load suggestions if no active task
      if (!data.hasActiveTask) {
        const suggestionsData = await timeManagerService.getTaskSuggestions();
        setSuggestions(suggestionsData);
      }
    } catch (error) {
      console.error('Error loading time manager state:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        setError('Your session has expired. Please logout and login again.');
      } else if (error.response?.status === 401) {
        setError('Authentication required. Please login to use TimeManager.');
      } else if (error.message.includes('does not exist') || error.message.includes('relation') || error.message.includes('table')) {
        setError('TimeManager database tables not found. Backend needs to sync database tables.');
      } else {
        setError(error.response?.data?.message || error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time updates
  useEffect(() => {
    loadState();
    
    // Update every 30 seconds
    const stateInterval = setInterval(loadState, 30000);
    
    // Update timer every second
    const timerInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(stateInterval);
      clearInterval(timerInterval);
    };
  }, [loadState]);

  // Calculate live timer duration
  const getLiveSessionDuration = () => {
    if (!state?.hasActiveTask || !state?.state?.currentMainTask) return 0;
    
    const startTime = new Date(state.state.currentMainTask.startTime);
    return Math.floor((currentTime - startTime) / (1000 * 60)); // minutes
  };

  // Handle task actions
  const handleStartTask = async (eventId, options = {}) => {
    try {
      setActionLoading(true);
      await timeManagerService.startTask(eventId, options);
      await loadState();
      setShowSuggestions(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!state?.state?.currentMainTaskId) return;
    
    try {
      setActionLoading(true);
      await timeManagerService.completeTask(state.state.currentMainTaskId);
      await loadState();
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseTask = async () => {
    if (!state?.state?.currentMainTaskId) return;
    
    try {
      setActionLoading(true);
      await timeManagerService.pauseTask(state.state.currentMainTaskId);
      await loadState();
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitchTask = async (eventId) => {
    try {
      setActionLoading(true);
      await timeManagerService.switchTask(eventId);
      await loadState();
      setShowSuggestions(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Current task display
  const renderCurrentTask = () => {
    if (!state?.hasActiveTask || !state?.state?.currentMainTask) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⏱️</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">No active task</p>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="btn-primary"
          >
            Start Working
          </button>
        </div>
      );
    }

    const task = state.state.currentMainTask;
    const event = task.event;
    const liveSessionDuration = getLiveSessionDuration();
    const estimatedDuration = task.estimatedDuration || timeManagerService.calculateEstimatedDuration(event);
    const progress = timeManagerService.calculateProgress(liveSessionDuration, estimatedDuration);
    const isOverrun = state.isOverrun || liveSessionDuration > estimatedDuration;

    return (
      <div className="space-y-4">
        {/* Task Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            isOverrun 
              ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' 
              : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
          }`}>
            {isOverrun ? 'Overrun' : 'Active'}
          </div>
        </div>

        {/* Live Timer */}
        <div className="text-center py-4">
          <div className={`text-3xl font-mono font-bold ${
            isOverrun ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {timeManagerService.formatDuration(liveSessionDuration)}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {estimatedDuration > 0 && (
              <>Estimated: {timeManagerService.formatDuration(estimatedDuration)}</>
            )}
          </p>
        </div>

        {/* Progress Bar */}
        {estimatedDuration > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${
                  isOverrun ? 'bg-red-500' : progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Overrun Warning */}
        {isOverrun && (
          <div className="alert-error">
            <div className="flex items-center space-x-2">
              <span className="text-error-600 dark:text-error-400">⚠️</span>
              <p className="text-error-800 dark:text-error-200 text-sm">
                Task is running over estimated time. Consider wrapping up or switching tasks.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleCompleteTask}
            disabled={actionLoading}
            className="btn-success flex-1"
          >
            ✓ Complete
          </button>
          <button
            onClick={handlePauseTask}
            disabled={actionLoading}
            className="btn-warning flex-1"
          >
            ⏸️ Pause
          </button>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            disabled={actionLoading}
            className="btn-primary px-3"
          >
            🔄
          </button>
        </div>
      </div>
    );
  };

  // Task suggestions display
  const renderSuggestions = () => {
    if (!showSuggestions) return null;

    return (
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Suggested Tasks</h4>
          <button
            onClick={() => setShowSuggestions(false)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 btn-icon"
          >
            ✕
          </button>
        </div>
        
        {suggestions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            No upcoming tasks for today
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.eventId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {suggestion.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(suggestion.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {timeManagerService.formatDuration(suggestion.estimatedDuration)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      timeManagerService.getPriorityColor(suggestion.priority)
                    }`}>
                      {suggestion.priority}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-1 ml-3">
                  {suggestion.canStartEarly && (
                    <button
                      onClick={() => handleStartTask(suggestion.eventId, { startEarly: true })}
                      disabled={actionLoading}
                      className="px-2 py-1 text-xs btn-secondary"
                    >
                      Start Early
                    </button>
                  )}
                  <button
                    onClick={() => 
                      state?.hasActiveTask 
                        ? handleSwitchTask(suggestion.eventId)
                        : handleStartTask(suggestion.eventId)
                    }
                    disabled={actionLoading}
                    className="px-2 py-1 text-xs btn-primary"
                  >
                    {state?.hasActiveTask ? 'Switch' : 'Start'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 skeleton-text w-1/2 mb-4"></div>
          <div className="h-8 skeleton-text w-3/4 mb-4"></div>
          <div className="h-2 skeleton-text w-full mb-4"></div>
          <div className="flex space-x-2">
            <div className="h-8 skeleton-text flex-1"></div>
            <div className="h-8 skeleton-text flex-1"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Time Manager</h2>
        </div>
        
        {/* Quick Stats */}
        {state && (
          <div className="text-right">
            <p className="text-xs text-gray-600 dark:text-gray-400">Today</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {state.state.dailyStats?.[new Date().toISOString().split('T')[0]]?.tasksCompleted || 0} tasks
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert-error mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-error-600 dark:text-error-400 text-lg">⚠️</div>
            <div className="flex-1">
              <p className="text-error-800 dark:text-error-200 text-sm font-medium mb-2">{error}</p>
              
              {/* Setup Instructions */}
              {(error.includes('setup required') || error.includes('database tables')) && (
                <div className="bg-white dark:bg-gray-900 border border-error-200 dark:border-error-800 rounded p-3 mt-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-2">🔧 Setup Instructions:</p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Stop the backend server if running</li>
                    <li>Open terminal in the <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">backend</code> folder</li>
                    <li>Run: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">FORCE_DB_SYNC=true npm start</code></li>
                    <li>This will create the TimeManager database tables</li>
                    <li>Refresh this page once the backend is running</li>
                  </ol>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 <strong>Note:</strong> This is a one-time setup for the new TimeManager feature.
                  </p>
                </div>
              )}
              
              {/* Authentication Instructions */}
              {error.includes('session') && (
                <div className="bg-white dark:bg-gray-900 border border-error-200 dark:border-error-800 rounded p-3 mt-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-2">🔐 Authentication Fix:</p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Open browser Developer Console (F12)</li>
                    <li>Type: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">localStorage.removeItem('token')</code></li>
                    <li>Press Enter to clear your token</li>
                    <li>Refresh the page and login again</li>
                    <li>TimeManager should then work properly</li>
                  </ol>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 <strong>Note:</strong> Your session token may have expired or become invalid.
                  </p>
                </div>
              )}
              
              <button
                onClick={() => setError(null)}
                className="text-error-600 dark:text-error-400 text-xs underline mt-2 hover:text-error-700 dark:hover:text-error-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {state && renderCurrentTask()}
      
      {/* Loading Overlay */}
      {actionLoading && (
        <div className="absolute inset-0 bg-white/75 dark:bg-gray-900/75 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 dark:border-primary-400"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
          </div>
        </div>
      )}

      {/* Task Suggestions */}
      {renderSuggestions()}
    </div>
  );
};

export default TimeManager; 