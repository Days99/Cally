import React, { useState, useEffect, useRef } from 'react';
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
  const [view, setView] = useState('dayGridMonth');
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [selectedDateForCreation, setSelectedDateForCreation] = useState(null);
  const [eventStats, setEventStats] = useState(null);

  // Event type configurations for filtering
  const eventTypes = {
    all: { label: 'All Events', icon: '📅', color: 'bg-gray-100 text-gray-800' },
    manual: { label: 'Manual Events', icon: '📆', color: 'bg-gray-100 text-gray-800' },
    google_calendar: { label: 'Google Calendar', icon: '📅', color: 'bg-blue-100 text-blue-800' },
    jira_task: { label: 'Jira Tasks', icon: '📋', color: 'bg-green-100 text-green-800' },
    github_issue: { label: 'GitHub Issues', icon: '🐙', color: 'bg-purple-100 text-purple-800' }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Reload events when filter changes
    loadEvents();
  }, [eventFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load accounts and initial data in parallel
      const [accountsData, statsData] = await Promise.all([
        accountService.getAccounts().catch((error) => {
          console.warn('Failed to load accounts:', error);
          return [];
        }),
        eventService.getEventStats().catch((error) => {
          console.warn('Failed to load event stats:', error);
          return null;
        })
      ]);

      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setEventStats(statsData);

      // Load events for the current view
      await loadEvents();
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (forceSync = false) => {
    try {
      const calendarApi = calendarRef.current?.getApi();
      const currentView = calendarApi?.view;
      
      // Get date range for current calendar view
      const dateRange = currentView ? {
        startDate: currentView.activeStart.toISOString().split('T')[0],
        endDate: currentView.activeEnd.toISOString().split('T')[0]
      } : eventService.getDateRange(view);

      console.log('Loading events with date range:', dateRange, 'Filter:', eventFilter);

      const options = {
        ...dateRange,
        eventType: eventFilter
      };

      // Load unified events
      const eventsData = await eventService.getEvents(options);
      console.log('Loaded events data:', eventsData);
      
      const formattedEvents = eventService.formatEventsForCalendar(eventsData);
      console.log('Formatted events for calendar:', formattedEvents);
      
      setEvents(formattedEvents);
      
      // If sync requested, sync Google Calendar accounts
      if (forceSync) {
        await syncGoogleCalendarAccounts();
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setError(error.message);
    }
  };

  const syncGoogleCalendarAccounts = async () => {
    try {
      const googleAccounts = Array.isArray(accounts) ? accounts.filter(acc => acc.provider === 'google') : [];
      
      if (googleAccounts.length === 0) {
        console.log('No Google Calendar accounts to sync');
        return;
      }

      console.log(`Syncing ${googleAccounts.length} Google Calendar account(s)...`);
      
      // Sync each Google account
      for (const account of googleAccounts) {
        try {
          const calendarApi = calendarRef.current?.getApi();
          const currentView = calendarApi?.view;
          
          const dateRange = currentView ? {
            timeMin: currentView.activeStart.toISOString(),
            timeMax: currentView.activeEnd.toISOString()
          } : calendarService.getDateRange(view);

          await calendarService.syncEvents('primary', dateRange);
          console.log(`Synced account: ${account.accountEmail}`);
        } catch (error) {
          console.error(`Error syncing account ${account.accountEmail}:`, error);
        }
      }
      
      // Reload events after sync
      await loadEvents();
      
      // Update stats
      const newStats = await eventService.getEventStats();
      setEventStats(newStats);
      
    } catch (error) {
      console.error('Error during sync:', error);
      throw error;
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);

      await syncGoogleCalendarAccounts();
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Error syncing events:', error);
      setError(error.message);
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom CSS for event types */}
      <style jsx>{`
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
          <h1 className="text-2xl font-bold text-gray-900">Unified Calendar</h1>
          <p className="text-gray-600">Manage events from all your connected services</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* Event Type Filter */}
          <select 
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="btn-secondary flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing || !Array.isArray(accounts) || accounts.filter(acc => acc.provider === 'google').length === 0}
            className="btn-primary flex items-center"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync
              </>
            )}
          </button>
        </div>
      </div>

      {/* Event Statistics */}
      {eventStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <span className="text-primary-600 text-sm">📅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Total</p>
                <p className="text-lg font-semibold text-gray-900">{eventStats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-sm">🕐</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Today</p>
                <p className="text-lg font-semibold text-gray-900">{eventStats.today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-sm">⏰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Upcoming</p>
                <p className="text-lg font-semibold text-gray-900">{eventStats.upcoming}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-sm">📅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Google</p>
                <p className="text-lg font-semibold text-gray-900">{eventStats.byType?.google_calendar || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-sm">📋</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Jira</p>
                <p className="text-lg font-semibold text-gray-900">{eventStats.byType?.jira_task || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected Accounts Status */}
      {Array.isArray(accounts) && accounts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Connected Services ({accounts.length})
                </p>
                <div className="flex items-center space-x-4 mt-1">
                  {accounts.filter(acc => acc.provider === 'google').length > 0 && (
                    <span className="text-xs text-blue-700">
                      📅 Google Calendar ({accounts.filter(acc => acc.provider === 'google').length})
                    </span>
                  )}
                  {accounts.filter(acc => acc.provider === 'jira').length > 0 && (
                    <span className="text-xs text-blue-700">
                      📋 Jira ({accounts.filter(acc => acc.provider === 'jira').length})
                    </span>
                  )}
                  {accounts.filter(acc => acc.provider === 'github').length > 0 && (
                    <span className="text-xs text-blue-700">
                      🐙 GitHub ({accounts.filter(acc => acc.provider === 'github').length})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
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
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Calendar Instructions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">Event Management</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Click on events to view, edit, or delete them</li>
              <li>• Click and drag to select time slots and create new events</li>
              <li>• Drag events to move them to different times/dates</li>
              <li>• Drag event edges to resize duration</li>
              <li>• Use <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Ctrl+N</kbd> to create new events</li>
              <li>• Filter events by type using the dropdown above</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">Event Types</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 📅 <span className="text-blue-600">Google Calendar</span> events (blue)</li>
              <li>• 📋 <span className="text-green-600">Jira Tasks</span> (green)</li>
              <li>• 🐙 <span className="text-purple-600">GitHub Issues</span> (purple)</li>
              <li>• 📆 <span className="text-gray-600">Manual Events</span> (gray)</li>
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