import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../components/NotificationSystem';
import calendarService from '../services/calendarService';
import eventService from '../services/eventService';
import TimeManager from '../components/TimeManager';
import { 
  SkeletonDashboard, 
  SkeletonEventList, 
  LoadingButton,
  Spinner 
} from '../components/LoadingStates';

const Dashboard = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useNotifications();
  const [syncStatus, setSyncStatus] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [appInfo, setAppInfo] = useState(null);
  const [mobileFeatures, setMobileFeatures] = useState({
    isNative: false,
    isPWA: false,
    hasOfflineSupport: false,
    canInstall: false
  });

  useEffect(() => {
    loadDashboardData();
    detectMobileFeatures();
  }, []);

  const detectMobileFeatures = async () => {
    try {
      const isNative = Capacitor.isNativePlatform();
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   window.navigator.standalone === true;
      const hasOfflineSupport = 'serviceWorker' in navigator && 
                               await navigator.serviceWorker.getRegistration();
      const canInstall = window.deferredPrompt !== undefined;

      let appInfoData = null;
      if (isNative) {
        appInfoData = await App.getInfo();
      }

      setMobileFeatures({
        isNative,
        isPWA,
        hasOfflineSupport: !!hasOfflineSupport,
        canInstall
      });
      
      setAppInfo(appInfoData);
    } catch (error) {
      console.error('Error detecting mobile features:', error);
    }
  };

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
      showError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnifiedSync = async () => {
    try {
      setSyncing(true);
      showInfo('Starting unified sync...', { duration: 3000 });
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
      
      showSuccess('Sync completed successfully!', {
        title: 'Calendar & Tasks Updated',
        duration: 4000
      });
      
      console.log('🎉 Dashboard unified sync completed successfully');
      
    } catch (error) {
      console.error('❌ Error during dashboard sync:', error);
      showError('Sync failed. Please try again.', {
        title: 'Sync Error',
        actions: [
          {
            label: 'Retry',
            onClick: () => handleUnifiedSync(),
            primary: true
          }
        ]
      });
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

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header with Mobile Status */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 rounded-xl p-6 text-white shadow-colored animate-slide-up">
        <div className="flex items-center mb-4">
          <div className="animate-float">
            <img 
              src="/cally_sunrise_calendar_icon.svg" 
              alt="Cally Icon" 
              className="h-12 w-12 mr-4 drop-shadow-lg"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              Welcome back, {user?.name || 'User'}! 👋
            </h1>
            <p className="text-primary-100 mt-1">
              Your unified calendar and task management dashboard
            </p>
            
            {/* Mobile Phase Badge */}
            <div className="flex items-center mt-3 space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                📱 Phase 10: Mobile Ready
              </span>
              
              {mobileFeatures.isNative && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  🚀 Native App
                </span>
              )}
              
              {mobileFeatures.isPWA && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  ⚡ PWA Mode
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Features Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          📱 Mobile Application Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Platform Detection */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Platform</span>
              <div className={`w-3 h-3 rounded-full ${mobileFeatures.isNative ? 'bg-green-500' : 'bg-blue-500'}`}></div>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {mobileFeatures.isNative ? 'Native Mobile' : 'Web Browser'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {mobileFeatures.isNative ? `${Capacitor.getPlatform()} App` : 'Progressive Web App'}
            </p>
          </div>

          {/* PWA Support */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PWA Support</span>
              <div className={`w-3 h-3 rounded-full ${mobileFeatures.isPWA || mobileFeatures.hasOfflineSupport ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {mobileFeatures.isPWA ? 'Active' : 'Available'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {mobileFeatures.hasOfflineSupport ? 'Service Worker Ready' : 'Install Available'}
            </p>
          </div>

          {/* Offline Support */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Offline Mode</span>
              <div className={`w-3 h-3 rounded-full ${mobileFeatures.hasOfflineSupport ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {mobileFeatures.hasOfflineSupport ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Cached data available
            </p>
          </div>

          {/* App Version */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Version</span>
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {appInfo?.version || 'v1.0.0'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {appInfo?.build || 'Development'}
            </p>
          </div>
        </div>

        {/* Mobile Phase Progress */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            🚧 Phase 10 Progress: Mobile Application Development
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">✅ Week 1-2: Mobile Framework Setup</span>
              <span className="text-green-600 dark:text-green-400 font-medium">100%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">🔨 Week 3-4: Native Features Integration</span>
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">In Progress</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">📱 Week 5-6: App Store Preparation</span>
              <span className="text-gray-500 dark:text-gray-400 font-medium">Planned</span>
            </div>
          </div>
          
          <div className="mt-3 bg-white dark:bg-gray-800 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Google Calendar Status */}
        <div className="card-interactive animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-header">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📅</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Google Calendar</h3>
            </div>
            <div className="status-online animate-pulse" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {syncStatus?.totalEvents || 0}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-3">events synced</p>
            <div className="flex items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Last sync:</span>
              <span className="ml-2 badge-gray">
                {formatLastSync(syncStatus?.lastSyncAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Jira Tasks */}
        <div className="card-interactive animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📋</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Jira Tasks</h3>
            </div>
            <div className={`${eventStats?.byType?.jira_task > 0 ? 'status-online' : 'status-offline'} animate-pulse`} />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {eventStats?.byType?.jira_task || 0}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-3">active tasks</p>
            <div className="badge-primary">
              Connected to Jira workspace
            </div>
          </div>
        </div>

        {/* Manual Events */}
        <div className="card-interactive animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="card-header">
            <div className="flex items-center space-x-2">
              <span className="text-lg">✨</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manual Events</h3>
            </div>
            <div className={`${eventStats?.byType?.manual > 0 ? 'status-online' : 'status-offline'} animate-pulse`} />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {eventStats?.byType?.manual || 0}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-3">custom events</p>
            <div className="badge-gray">
              Created manually
            </div>
          </div>
        </div>
      </div>

      {/* TimeManager Widget */}
      <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <TimeManager />
      </div>

      {/* Integration Status */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.6s' }}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Integration Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="alert-info animate-slide-in-left">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Google Calendar</h4>
                <p className="text-sm opacity-90">
                  Phase 1-3: ✓ Connected & Active
                </p>
              </div>
              <div className="text-2xl">📅</div>
            </div>
          </div>
          
          <div className="alert-success animate-slide-in-right">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Jira Integration</h4>
                <p className="text-sm opacity-90">
                  Phase 4-6: ✓ Connected & Active with Dynamic Transitions
                </p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <div className="card-header">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🗓️</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Events</h3>
            </div>
            <Link 
              to="/calendar" 
              className="text-primary-600 dark:text-primary-400 hover:text-primary-500 text-sm font-medium transition-colors duration-200"
            >
              View All →
            </Link>
          </div>
          
          {recentEvents.length > 0 ? (
            <div className="space-y-3">
              {recentEvents.slice(0, 5).map((event, index) => (
                <div 
                  key={event.id} 
                  className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 animate-slide-in-left"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-3 h-3 bg-primary-500 rounded-full mt-2 flex-shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {event.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatEventTime(event.startDateTime, event.isAllDay)}
                    </p>
                    {event.location && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex items-center mt-1">
                        <span className="mr-1">📍</span>
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-500 dark:text-gray-400 mb-3">No upcoming events</p>
              <Link 
                to="/calendar"
                className="btn-primary"
              >
                View Calendar
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.8s' }}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <span className="mr-2">⚡</span>
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Link 
              to="/calendar"
              className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/30 dark:hover:to-blue-700/30 transition-all duration-200 transform hover:scale-105 group"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 group-hover:shadow-lg transition-all duration-200">
                <span className="text-xl">📅</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">View Calendar</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Browse your events and schedule</p>
              </div>
            </Link>

            <LoadingButton
              onClick={handleUnifiedSync}
              loading={syncing}
              loadingText="Syncing..."
              className="w-full flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl hover:from-green-100 hover:to-green-200 dark:hover:from-green-800/30 dark:hover:to-green-700/30 transition-all duration-200 transform hover:scale-105 group text-left"
            >
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 group-hover:shadow-lg transition-all duration-200">
                {syncing ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <span className="text-xl">🔄</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {syncing ? 'Syncing All Sources...' : 'Sync All Sources'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {syncing ? 'Updating calendar and tasks...' : 'Refresh Google Calendar & Jira tasks'}
                </p>
              </div>
            </LoadingButton>

            <Link 
              to="/tasks"
              className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-800/30 dark:hover:to-orange-700/30 transition-all duration-200 transform hover:scale-105 group"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 group-hover:shadow-lg transition-all duration-200">
                <span className="text-xl">✅</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">View Tasks</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage Jira issues & tasks</p>
              </div>
            </Link>

            <Link 
              to="/accounts"
              className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/30 dark:hover:to-purple-700/30 transition-all duration-200 transform hover:scale-105 group"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 group-hover:shadow-lg transition-all duration-200">
                <span className="text-xl">👥</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">Accounts</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage integrations & connected accounts</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Development Status */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.9s' }}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <span className="mr-2">🚀</span>
          Development Progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="alert-success">
            <h4 className="font-semibold mb-3 flex items-center">
              <span className="mr-2">✅</span>
              Completed (Phases 1-7)
            </h4>
            <ul className="text-sm space-y-2 opacity-90">
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Google OAuth Authentication</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Database Schema & Models</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Google Calendar Integration</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Calendar UI with FullCalendar</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Event Sync & Management</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Multi-Account Support</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Jira OAuth Integration</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Unified Event Creation System</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Dynamic Jira Workflow Transitions</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Task Management Interface</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>Real-time Status Updates</li>
              <li className="flex items-start"><span className="mr-2 text-success-500">•</span>TimeManager System</li>
            </ul>
          </div>
          
          <div className="alert-info">
            <h4 className="font-semibold mb-3 flex items-center">
              <span className="mr-2">🎨</span>
              Current: Enhanced UI & UX (Phase 8)
            </h4>
            <ul className="text-sm space-y-2 opacity-90">
              <li className="flex items-start"><span className="mr-2 text-primary-500">•</span>Dark Mode Support</li>
              <li className="flex items-start"><span className="mr-2 text-primary-500">•</span>Enhanced Animations</li>
              <li className="flex items-start"><span className="mr-2 text-primary-500">•</span>Improved Loading States</li>
              <li className="flex items-start"><span className="mr-2 text-primary-500">•</span>Advanced Notification System</li>
              <li className="flex items-start"><span className="mr-2 text-primary-500">•</span>Better Visual Hierarchy</li>
              <li className="flex items-start"><span className="mr-2 text-primary-500">•</span>Enhanced Form Designs</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <span className="mr-2">📋</span>
              Upcoming Phases
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <li className="flex items-start"><span className="mr-2 text-gray-400">•</span>Advanced Drag & Drop (Phase 9)</li>
              <li className="flex items-start"><span className="mr-2 text-gray-400">•</span>Mobile Optimization (Phase 10)</li>
              <li className="flex items-start"><span className="mr-2 text-gray-400">•</span>Performance Optimization (Phase 11)</li>
              <li className="flex items-start"><span className="mr-2 text-gray-400">•</span>GitHub Integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 