import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import calendarService from '../services/calendarService';
import eventService from '../services/eventService';

const Dashboard = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load sync status, recent events, and event statistics
      const [statusData, eventsData, statsData] = await Promise.all([
        calendarService.getSyncStatus(),
        calendarService.getEvents('primary', { 
          timeMin: new Date().toISOString(),
          maxResults: 5 
        }),
        eventService.getEventStats()
      ]);

      setSyncStatus(statusData);
      setRecentEvents(eventsData.events || []);
      setEventStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnifiedSync = async () => {
    try {
      setSyncing(true);
      console.log('🔄 Starting unified sync from Dashboard...');
      
      // Use unified sync that handles both Google Calendar and Jira
      const syncResult = await calendarService.syncAllSources({
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        maxResults: 250
      });
      
      console.log('📊 Dashboard sync results:', syncResult);
      
      // Reload dashboard data
      await loadDashboardData();
      
      console.log('🎉 Dashboard unified sync completed successfully');
      
    } catch (error) {
      console.error('❌ Error during dashboard sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatEventTime = (dateTime, isAllDay) => {
    if (isAllDay) {
      return new Date(dateTime).toLocaleDateString();
    }
    return new Date(dateTime).toLocaleString();
  };

  const formatLastSync = (lastSyncAt) => {
    if (!lastSyncAt) return 'Never';
    
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-primary-100">
          Your unified calendar and task management dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Google Calendar Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Google Calendar</h3>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {syncStatus?.totalEvents || 0}
              </p>
              <p className="text-gray-600">events synced</p>
              <p className="text-sm text-gray-500 mt-2">
                Last sync: {formatLastSync(syncStatus?.lastSyncAt)}
              </p>
            </div>
          )}
        </div>

        {/* Tasks (Placeholder) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Jira Tasks</h3>
            <div className={`w-3 h-3 rounded-full ${eventStats?.byType?.jira_task > 0 ? 'bg-green-400' : 'bg-gray-300'}`}></div>
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {eventStats?.byType?.jira_task || 0}
              </p>
              <p className="text-gray-600">active tasks</p>
              <p className="text-sm text-gray-500 mt-2">
                Connected to Jira workspace
              </p>
            </div>
          )}
        </div>

        {/* Manual Events */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Manual Events</h3>
            <div className={`w-3 h-3 rounded-full ${eventStats?.byType?.manual > 0 ? 'bg-blue-400' : 'bg-gray-300'}`}></div>
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {eventStats?.byType?.manual || 0}
              </p>
              <p className="text-gray-600">custom events</p>
              <p className="text-sm text-gray-500 mt-2">
                Created manually
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Integration Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Integration Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Google Calendar</h4>
                <p className="text-sm text-blue-700">
                  Phase 1-3: ✓ Connected & Active
                </p>
              </div>
              <div className="text-blue-600 text-2xl">📅</div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-900">Jira Integration</h4>
                <p className="text-sm text-green-700">
                  Phase 4: ✓ Connected & Active
                </p>
              </div>
              <div className="text-green-600 text-2xl">📋</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
            <Link 
              to="/calendar" 
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recentEvents.length > 0 ? (
            <div className="space-y-3">
              {recentEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatEventTime(event.startDateTime, event.isAllDay)}
                    </p>
                    {event.location && (
                      <p className="text-xs text-gray-400 truncate">
                        📍 {event.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">No upcoming events</p>
              <Link 
                to="/calendar"
                className="text-primary-600 hover:text-primary-500 text-sm font-medium mt-2 inline-block"
              >
                Sync your calendar →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link 
              to="/calendar"
              className="flex items-center p-3 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">View Calendar</p>
                <p className="text-sm text-gray-600">Browse your events</p>
              </div>
            </Link>

            <button 
              onClick={handleUnifiedSync}
              disabled={syncing}
              className={`w-full flex items-center p-3 rounded-md transition-colors text-left ${
                syncing 
                  ? 'bg-green-100 cursor-not-allowed' 
                  : 'bg-green-50 hover:bg-green-100'
              }`}
            >
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                {syncing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {syncing ? 'Syncing...' : 'Sync All Sources'}
                </p>
                <p className="text-sm text-gray-600">
                  {syncing ? 'Updating calendar and tasks...' : 'Refresh Google Calendar & Jira tasks'}
                </p>
              </div>
            </button>

            <Link 
              to="/settings"
              className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">Settings</p>
                <p className="text-sm text-gray-600">Manage integrations</p>
              </div>
            </Link>

            <Link 
              to="/accounts"
              className="flex items-center p-3 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
            >
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">Manage Accounts</p>
                <p className="text-sm text-gray-600">Add or configure integrations</p>
              </div>
            </Link>

            <Link 
              to="/tasks"
              className="flex items-center p-3 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors"
            >
              <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">View Tasks</p>
                <p className="text-sm text-gray-600">Manage Jira issues & tasks</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Development Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Development Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h4 className="font-medium text-green-900 mb-2">✅ Completed (Phases 1-4)</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Google OAuth Authentication</li>
              <li>• Database Schema & Models</li>
              <li>• Google Calendar Integration</li>
              <li>• Calendar UI with FullCalendar</li>
              <li>• Event Sync & Management</li>
              <li>• Multi-Account Support</li>
              <li>• Account Management Dashboard</li>
              <li>• Jira OAuth Integration</li>
              <li>• Task Fetching & Management</li>
              <li>• Issue Status Updates</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔄 Phase 5: Unified Event Creation</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Dynamic Event Modal</li>
              <li>• Multi-Type Event Creation</li>
              <li>• Database Schema Updates</li>
              <li>• Calendar Integration Hub</li>
              <li>• Event Type Detection</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="font-medium text-gray-900 mb-2">📋 Future Phases</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• GitHub Integration (Phase 6)</li>
              <li>• Drag & Drop Interface (Phase 7)</li>
              <li>• Advanced Filtering (Phase 8)</li>
              <li>• Mobile Optimization (Phase 9)</li>
              <li>• Performance Optimization (Phase 10)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 