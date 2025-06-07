import React, { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import calendarService from '../services/calendarService';
import eventService from '../services/eventService';
import accountService from '../services/accountService';
import EventModal from '../components/EventModal';
import { useAuth } from '../hooks/useAuth';

const Calendar = () => {
  const { user } = useAuth();
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [eventFilter, setEventFilter] = useState('all');
  const [view] = useState('dayGridMonth');
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [selectedDateForCreation, setSelectedDateForCreation] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Event type configurations for filtering
  const eventTypes = {
    all: { label: 'All Events', icon: '📅', color: 'bg-gray-100 text-gray-800' },
    manual: { label: 'Manual Events', icon: '📆', color: 'bg-gray-100 text-gray-800' },
    google_calendar: { label: 'Google Calendar', icon: '📅', color: 'bg-blue-100 text-blue-800' },
    jira_task: { label: 'Jira Tasks', icon: '📋', color: 'bg-green-100 text-green-800' },
    github_issue: { label: 'GitHub Issues', icon: '🐙', color: 'bg-purple-100 text-purple-800' }
  };

  const loadEvents = useCallback(async (forceSync = false) => {
    try {
      const calendarApi = calendarRef.current?.getApi();
      const currentView = calendarApi?.view;
      
      // Get date range for current calendar view with proper buffer
      let dateRange;
      if (currentView) {
        // For calendar views, use a wider range to ensure we capture all relevant events
        const viewStart = new Date(currentView.activeStart);
        const viewEnd = new Date(currentView.activeEnd);
        
        // Add buffer for better event loading
        viewStart.setDate(viewStart.getDate() - 7); // 1 week before
        viewEnd.setDate(viewEnd.getDate() + 7);     // 1 week after
        
        dateRange = {
          startDate: viewStart.toISOString().split('T')[0],
          endDate: viewEnd.toISOString().split('T')[0]
        };
        
        console.log('🔍 DEBUG: Calendar view detected:', currentView.type);
        console.log('🔍 DEBUG: View active range:', currentView.activeStart, 'to', currentView.activeEnd);
        console.log('🔍 DEBUG: Expanded date range for loading:', dateRange);
      } else {
        // Fallback to service date range
        dateRange = eventService.getDateRange(view);
        console.log('🔍 DEBUG: Using fallback date range:', dateRange);
      }

      console.log('🔍 DEBUG: loadEvents called - Filter:', eventFilter, 'Range:', dateRange);

      const options = {
        ...dateRange,
        eventType: eventFilter !== 'all' ? eventFilter : undefined
      };

      // Load unified events
      const eventsData = await eventService.getEvents(options);
      const formattedEvents = eventService.formatEventsForCalendar(eventsData);
      
      console.log('🔍 DEBUG: Loaded', eventsData?.length || 0, 'events, formatted to', formattedEvents?.length || 0);
      
      // Clear existing events before setting new ones
      setEvents([]);
      
      // Set new events
      setEvents(formattedEvents);
      
    } catch (error) {
      console.error('Error loading events:', error);
      setError(error.message);
    }
  }, [eventFilter, view]);

  const loadInitialData = useCallback(async () => {
    if (initialDataLoaded) {
      console.log('🔍 DEBUG: loadInitialData skipped - already loaded');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 DEBUG: Starting loadInitialData...');

      // Load accounts and initial data in parallel
      console.log('🔍 DEBUG: About to call accountService.getAccounts()...');
      
      const [accountsData, statsData] = await Promise.all([
        accountService.getAccounts().then(data => {
          console.log('🔍 DEBUG: accountService.getAccounts() SUCCESS:', data);
          return data;
        }).catch((error) => {
          console.error('🔍 DEBUG: accountService.getAccounts() FAILED:', error);
          console.warn('Failed to load accounts:', error);
          return [];
        }),
        eventService.getEventStats().then(data => {
          console.log('🔍 DEBUG: eventService.getEventStats() SUCCESS:', data);
          return data;
        }).catch((error) => {
          console.error('🔍 DEBUG: eventService.getEventStats() FAILED:', error);
          console.warn('Failed to load event stats:', error);
          return null;
        })
      ]);

      console.log('🔍 DEBUG: Raw accountsData received:', accountsData);
      console.log('🔍 DEBUG: Is accountsData an array?', Array.isArray(accountsData));
      
      const finalAccounts = Array.isArray(accountsData) ? accountsData : [];
      console.log('🔍 DEBUG: Final accounts to set:', finalAccounts);
      
      setAccounts(finalAccounts);
      setEventStats(statsData);
      
      // Mark as loaded BEFORE calling loadEvents to prevent loops
      setInitialDataLoaded(true);

      console.log('🔍 DEBUG: State updated, about to load events...');
      
      // Load events for the current view (call directly, not via callback)
      try {
        const options = {
          eventType: eventFilter !== 'all' ? eventFilter : undefined
        };
        const eventsData = await eventService.getEvents(options);
        const formattedEvents = eventService.formatEventsForCalendar(eventsData);
        setEvents(formattedEvents);
        console.log('🔍 DEBUG: Initial events loaded:', formattedEvents?.length || 0);
      } catch (eventError) {
        console.error('🔍 DEBUG: Failed to load initial events:', eventError);
      }
      
      console.log('🔍 DEBUG: loadInitialData completed successfully');
    } catch (error) {
      console.error('🔍 DEBUG: Error in loadInitialData:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [initialDataLoaded, eventFilter]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    // Reload events when filter changes
    if (initialDataLoaded) {
      loadEvents();
    }
  }, [eventFilter, loadEvents, initialDataLoaded]);

  // DEBUG: Monitor accounts state changes
  useEffect(() => {
    console.log('🔍 DEBUG: Accounts state changed - Length:', accounts?.length, 'Is Array:', Array.isArray(accounts));
  }, [accounts]);

  const handleSync = async () => {
    try {
      console.log('🔄 Starting unified sync (Google Calendar + Jira Tasks)...');
      
      setSyncing(true);
      setError(null);

      // Use full year range for comprehensive sync instead of just current view
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
      
      const dateRange = {
        timeMin: startOfYear.toISOString(),
        timeMax: endOfYear.toISOString(),
        maxResults: 2500 // Increased for full year
      };

      console.log(`📊 Full year sync range: ${dateRange.timeMin} to ${dateRange.timeMax}`);

      // Call unified sync endpoint that handles both Google Calendar and Jira
      const syncResult = await calendarService.syncAllSources(dateRange);
      
      console.log('📊 Sync results:', syncResult);
      
      // Show detailed sync results
      if (syncResult.syncResults) {
        const { googleCalendar, jiraTasks, total } = syncResult.syncResults;
        console.log(`📊 Detailed Sync Results:`);
        console.log(`   📅 Google Calendar: ${googleCalendar.synced} synced, ${googleCalendar.deleted} deleted`);
        console.log(`   📋 Jira Tasks: ${jiraTasks.synced} synced, ${jiraTasks.deleted} deleted`);
        console.log(`   🎯 Total: ${total.synced} synced, ${total.deleted} deleted`);
        
        if (total.errors && total.errors.length > 0) {
          console.warn(`⚠️  Sync errors:`, total.errors);
        }
      }
      
      // Reload events from unified database
      await loadEvents();
      console.log('✅ Local unified events reloaded');
      
      // Update stats to reflect new event counts
      try {
        const newStats = await eventService.getEventStats();
        setEventStats(newStats);
        console.log('✅ Event statistics updated');
      } catch (statsError) {
        console.warn('Failed to update stats:', statsError);
        // Don't fail the whole sync if stats fail
      }
      
      console.log('🎉 Unified sync completed successfully');
      console.log(`✅ Total: ${syncResult.syncResults?.total?.synced || 0} synced, ${syncResult.syncResults?.total?.deleted || 0} deleted`);
      
      // Show success notification briefly
      setSyncSuccess(true);
      setTimeout(() => {
        setSyncSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error during unified sync:', error);
      setError(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDateChange = (info) => {
    // Reload events when calendar view changes
    loadEvents();
  };

  const handleEventClick = (info) => {
    // Open event details modal
    setSelectedEvent(info.event);
    setIsEventModalOpen(true);
    setIsCreatingEvent(false);
    info.jsEvent.preventDefault();
  };

  const handleEventUpdated = async () => {
    // Reload events after an event is updated
    await loadEvents();
    // Update stats
    const newStats = await eventService.getEventStats();
    setEventStats(newStats);
  };

  const handleEventDeleted = async () => {
    // Reload events after an event is deleted
    await loadEvents();
    // Update stats
    const newStats = await eventService.getEventStats();
    setEventStats(newStats);
    // Close modal
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };

  // Handle event drag and drop
  const handleEventDrop = async (info) => {
    try {
      const event = info.event;
      const eventType = event.extendedProps?.eventType;
      
      // Prepare the updated event data
      const eventData = {
        title: event.extendedProps?.originalTitle || event.title,
        description: event.extendedProps?.description || '',
        startTime: event.start.toISOString(),
        endTime: event.end ? event.end.toISOString() : new Date(event.start.getTime() + 60 * 60 * 1000).toISOString(),
        location: event.extendedProps?.location || '',
        isAllDay: event.allDay
      };

      console.log('Updating event via drag & drop:', {
        eventId: event.id,
        eventType,
        newStart: event.start,
        newEnd: event.end
      });

      if (eventType === 'google_calendar') {
        // Update Google Calendar event
        const googleEventId = event.extendedProps?.googleEventId;
        const calendarId = event.extendedProps?.calendarId || 'primary';
        await calendarService.updateEvent(googleEventId, eventData, calendarId);
      } else {
        // Update unified event
        await eventService.updateEvent(event.id, eventData);
      }
      
      console.log('Event successfully updated via drag & drop');
      
      // Update stats
      const newStats = await eventService.getEventStats();
      setEventStats(newStats);
      
    } catch (error) {
      console.error('Error updating event via drag & drop:', error);
      setError(`Failed to update event: ${error.message}`);
      
      // Revert the visual change since the update failed
      info.revert();
    }
  };

  // Handle event resize (when user drags the end time)
  const handleEventResize = async (info) => {
    try {
      const event = info.event;
      const eventType = event.extendedProps?.eventType;
      
      const eventData = {
        title: event.extendedProps?.originalTitle || event.title,
        description: event.extendedProps?.description || '',
        startTime: event.start.toISOString(),
        endTime: event.end.toISOString(),
        location: event.extendedProps?.location || '',
        isAllDay: event.allDay
      };

      console.log('Resizing event:', {
        eventId: event.id,
        eventType,
        newEnd: event.end
      });

      if (eventType === 'google_calendar') {
        // Update Google Calendar event
        const googleEventId = event.extendedProps?.googleEventId;
        const calendarId = event.extendedProps?.calendarId || 'primary';
        await calendarService.updateEvent(googleEventId, eventData, calendarId);
      } else {
        // Update unified event
        await eventService.updateEvent(event.id, eventData);
      }

      console.log('Event successfully resized');
      
    } catch (error) {
      console.error('Error resizing event:', error);
      setError(`Failed to resize event: ${error.message}`);
      
      // Revert the visual change since the update failed
      info.revert();
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEvent && isEventModalOpen) {
          // Let EventModal handle deletion
          return;
        }
      }
      if (e.key === 'Escape') {
        setIsEventModalOpen(false);
        setSelectedEvent(null);
        setIsCreatingEvent(false);
      }
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCreateEvent();
      }
    };

    if (isEventModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEvent, isEventModalOpen]);

  const handleDateSelect = (selectInfo) => {
    // Handle date/time selection for creating new events
    const selectedDate = selectInfo.start;
    console.log('Date selected for event creation:', selectedDate);
    setSelectedDateForCreation(selectedDate);
    setIsCreatingEvent(true);
    setIsEventModalOpen(true);
    setSelectedEvent(null);
    
    selectInfo.view.calendar.unselect();
  };

  const handleCreateEvent = (defaultDate = null) => {
    const eventDate = defaultDate || new Date();
    console.log('Creating event with date:', eventDate);
    setSelectedDateForCreation(eventDate);
    setIsCreatingEvent(true);
    setIsEventModalOpen(true);
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom CSS for event types */}
      <style>{`
        .event-google_calendar {
          border-left: 4px solid #4285f4 !important;
        }
        .event-jira_task {
          border-left: 4px solid #0052cc !important;
        }
        .event-github_issue {
          border-left: 4px solid #6f42c1 !important;
        }
        .event-manual {
          border-left: 4px solid #6b7280 !important;
        }
        .fc-event:hover {
          transform: translateY(-1px);
          transition: transform 0.2s ease;
          cursor: pointer;
        }
        .fc-event-main {
          padding: 2px 4px;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Unified Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage events from all your connected services</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* Event Type Filter */}
          <select 
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="input-field"
          >
            {Object.entries(eventTypes).map(([key, type]) => (
              <option key={key} value={key}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>

          {/* Create Event Button */}
          <button
            onClick={() => handleCreateEvent()}
            className="btn-primary flex items-center whitespace-nowrap"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </button>

          {/* Sync Button */}
          <div className="relative">
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`btn-primary flex items-center relative ${
                syncing ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              title={
                syncing 
                  ? 'Syncing with Google Calendar...' 
                  : 'Sync with Google Calendar - Fetch latest events and update calendar (Debug: Always enabled for testing)'
              }
            >
              {syncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Syncing...</span>
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Sync</span>
                  {/* Debug indicator that button is always enabled */}
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full"></div>
                </>
              )}
            </button>
            
            {/* Sync status tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              Debug: Sync always enabled for testing
            </div>
          </div>
        </div>
      </div>

      {/* Event Statistics */}
      {eventStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                <span className="text-primary-600 dark:text-primary-400 text-sm">📅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Total</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{eventStats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 dark:text-yellow-400 text-sm">🕐</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Today</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{eventStats.today}</p>
              </div>
            </div>
          </div>

          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm">⏰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Upcoming</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{eventStats.upcoming}</p>
              </div>
            </div>
          </div>

          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-sm">📅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Google</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{eventStats.byType?.google_calendar || 0}</p>
              </div>
            </div>
          </div>

          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm">📋</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Jira</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{eventStats.byType?.jira_task || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected Accounts Status */}
      {Array.isArray(accounts) && accounts.length > 0 && (
        <div className="alert-info">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-primary-900 dark:text-primary-200">
                  Connected Services ({accounts.length})
                </p>
                <div className="flex items-center space-x-4 mt-1">
                  {accounts.filter(acc => acc.provider === 'google').length > 0 && (
                    <span className="text-xs text-primary-700 dark:text-primary-300">
                      📅 Google Calendar ({accounts.filter(acc => acc.provider === 'google').length})
                    </span>
                  )}
                  {accounts.filter(acc => acc.provider === 'jira').length > 0 && (
                    <span className="text-xs text-primary-700 dark:text-primary-300">
                      📋 Jira ({accounts.filter(acc => acc.provider === 'jira').length})
                    </span>
                  )}
                  {accounts.filter(acc => acc.provider === 'github').length > 0 && (
                    <span className="text-xs text-primary-700 dark:text-primary-300">
                      🐙 GitHub ({accounts.filter(acc => acc.provider === 'github').length})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {syncSuccess && (
        <div className="alert-success">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-success-400 dark:text-success-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-success-800 dark:text-success-200">
                🎉 Unified sync completed successfully! Your calendar is now up to date with Google Calendar and Jira tasks.
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSyncSuccess(false)}
                className="text-success-400 dark:text-success-300 hover:text-success-600 dark:hover:text-success-200 btn-icon"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert-error">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-error-400 dark:text-error-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-error-800 dark:text-error-200">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-error-400 dark:text-error-300 hover:text-error-600 dark:hover:text-error-200 btn-icon"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="card p-6">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDateChange}
          height="auto"
          eventDisplay="block"
          eventBackgroundColor="#4285f4"
          eventBorderColor="#3367d6"
          eventTextColor="#ffffff"
          nowIndicator={true}
          navLinks={true}
        />
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Calendar Instructions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Event Management</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Click on events to view, edit, or delete them</li>
              <li>• Click and drag to select time slots and create new events</li>
              <li>• Drag events to move them to different times/dates</li>
              <li>• Drag event edges to resize duration</li>
              <li>• Use <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 border rounded">Ctrl+N</kbd> to create new events</li>
              <li>• Filter events by type using the dropdown above</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Event Types</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 📅 <span className="text-blue-600 dark:text-blue-400">Google Calendar</span> events (blue)</li>
              <li>• 📋 <span className="text-green-600 dark:text-green-400">Jira Tasks</span> (green)</li>
              <li>• 🐙 <span className="text-purple-600 dark:text-purple-400">GitHub Issues</span> (purple)</li>
              <li>• 📆 <span className="text-gray-600 dark:text-gray-400">Manual Events</span> (gray)</li>
              <li>• Use sync button to fetch latest from connected services</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setIsCreatingEvent(false);
          setSelectedDateForCreation(null);
        }}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
        isCreating={isCreatingEvent}
        defaultDate={selectedDateForCreation || (isCreatingEvent ? new Date() : null)}
      />
    </div>
  );
};

export default Calendar; 