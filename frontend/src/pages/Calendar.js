import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import calendarService from '../services/calendarService';
import EventModal from '../components/EventModal';
import { useAuth } from '../hooks/useAuth';

const Calendar = () => {
  const { user } = useAuth();
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [view, setView] = useState('dayGridMonth');
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load calendars and sync status in parallel
      const [calendarsData, syncStatusData] = await Promise.all([
        calendarService.getCalendars(),
        calendarService.getSyncStatus()
      ]);

      setCalendars(calendarsData);
      setSyncStatus(syncStatusData);

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
        timeMin: currentView.activeStart.toISOString(),
        timeMax: currentView.activeEnd.toISOString()
      } : calendarService.getDateRange(view);

      const options = {
        ...dateRange,
        sync: forceSync
      };

      const response = await calendarService.getEvents(selectedCalendar, options);
      const formattedEvents = calendarService.formatEventsForCalendar(response.events);
      
      setEvents(formattedEvents);
      
      if (forceSync) {
        // Update sync status after successful sync
        const newSyncStatus = await calendarService.getSyncStatus();
        setSyncStatus(newSyncStatus);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setError(error.message);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);

      const calendarApi = calendarRef.current?.getApi();
      const currentView = calendarApi?.view;
      
      const dateRange = currentView ? {
        timeMin: currentView.activeStart.toISOString(),
        timeMax: currentView.activeEnd.toISOString()
      } : calendarService.getDateRange(view);

      console.log('Starting bidirectional sync with Google Calendar...');
      const response = await calendarService.syncEvents(selectedCalendar, dateRange);
      console.log('Sync response:', response);
      
      await loadEvents(); // Reload events after sync
      
      // Show success message with sync details
      if (response.message) {
        console.log(`Sync completed: ${response.message}`);
      }
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
    // Open event details modal instead of directly opening URL
    setSelectedEvent(info.event);
    setIsEventModalOpen(true);
    info.jsEvent.preventDefault();
  };

  const handleEventUpdated = async () => {
    // Reload events after an event is updated
    await loadEvents();
    // Update sync status
    const newSyncStatus = await calendarService.getSyncStatus();
    setSyncStatus(newSyncStatus);
  };

  const handleEventDeleted = async () => {
    // Reload events after an event is deleted
    await loadEvents();
    // Update sync status
    const newSyncStatus = await calendarService.getSyncStatus();
    setSyncStatus(newSyncStatus);
    // Close modal
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };

  // Handle event drag and drop
  const handleEventDrop = async (info) => {
    try {
      const event = info.event;
      const googleEventId = event.extendedProps?.googleEventId;
      
      if (!googleEventId) {
        console.warn('Cannot update event: missing Google Event ID');
        info.revert(); // Revert the visual change
        return;
      }

      // Prepare the updated event data
      const eventData = {
        title: event.extendedProps?.originalTitle || event.title,
        description: event.extendedProps?.description || '',
        startTime: event.start.toISOString(),
        endTime: event.end ? event.end.toISOString() : new Date(event.start.getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hour if no end
        location: event.extendedProps?.location || '',
        isAllDay: event.allDay
      };

      console.log('Updating event via drag & drop:', {
        googleEventId,
        newStart: event.start,
        newEnd: event.end,
        eventData
      });

      // Update the event in Google Calendar
      await calendarService.updateEvent(googleEventId, eventData, selectedCalendar);
      
      console.log('Event successfully updated via drag & drop');
      
      // Update sync status
      const newSyncStatus = await calendarService.getSyncStatus();
      setSyncStatus(newSyncStatus);
      
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
      const googleEventId = event.extendedProps?.googleEventId;
      
      if (!googleEventId) {
        console.warn('Cannot resize event: missing Google Event ID');
        info.revert();
        return;
      }

      const eventData = {
        title: event.extendedProps?.originalTitle || event.title,
        description: event.extendedProps?.description || '',
        startTime: event.start.toISOString(),
        endTime: event.end.toISOString(),
        location: event.extendedProps?.location || '',
        isAllDay: event.allDay
      };

      console.log('Resizing event:', {
        googleEventId,
        newStart: event.start,
        newEnd: event.end
      });

      await calendarService.updateEvent(googleEventId, eventData, selectedCalendar);
      
      console.log('Event successfully resized');
      
      // Update sync status
      const newSyncStatus = await calendarService.getSyncStatus();
      setSyncStatus(newSyncStatus);
      
    } catch (error) {
      console.error('Error resizing event:', error);
      setError(`Failed to resize event: ${error.message}`);
      info.revert();
    }
  };

  // Handle keyboard shortcuts for event operations
  const handleKeyDown = (e) => {
    // Only handle shortcuts when no modal is open and an event is selected
    if (!isEventModalOpen && selectedEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setIsEventModalOpen(true);
      }
    }
  };

  // Add global keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEvent, isEventModalOpen]);

  const handleDateSelect = (selectInfo) => {
    // Handle date/time selection for creating new events
    const title = prompt('Enter event title:');
    
    if (title) {
      createEvent({
        title,
        startTime: selectInfo.start.toISOString(),
        endTime: selectInfo.end.toISOString(),
        isAllDay: selectInfo.allDay
      });
    }
    
    selectInfo.view.calendar.unselect();
  };

  const createEvent = async (eventData) => {
    try {
      await calendarService.createEvent(eventData, selectedCalendar);
      await loadEvents(); // Reload events after creation
    } catch (error) {
      console.error('Error creating event:', error);
      setError(error.message);
    }
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
        .event-google {
          border-left: 4px solid #4285f4 !important;
        }
        .event-jira {
          border-left: 4px solid #0052cc !important;
        }
        .event-github {
          border-left: 4px solid #6f42c1 !important;
        }
        .event-unknown {
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
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600">View and manage your Google Calendar events</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* Calendar Selector */}
          <select 
            value={selectedCalendar}
            onChange={(e) => setSelectedCalendar(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="primary">Primary Calendar</option>
            {calendars.map(calendar => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.name}
              </option>
            ))}
          </select>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
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

      {/* Sync Status */}
      {syncStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Google Calendar Connected
                </p>
                <p className="text-sm text-blue-700">
                  Last sync: {formatLastSync(syncStatus.lastSyncAt)} • {syncStatus.totalEvents} events
                </p>
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
              <li>• Use <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Delete</kbd> key to quickly delete selected events</li>
              <li>• Different event types are color-coded with icons</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">Event Types</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 📅 <span className="text-blue-600">Google Calendar</span> events (blue)</li>
              <li>• 📋 <span className="text-blue-700">Jira Tasks</span> (dark blue)</li>
              <li>• 🐙 <span className="text-purple-600">GitHub Issues</span> (purple)</li>
              <li>• Use sync button to fetch latest events from all sources</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          isOpen={isEventModalOpen}
          onClose={() => {
            setIsEventModalOpen(false);
            setSelectedEvent(null);
          }}
          onEventUpdated={handleEventUpdated}
          onEventDeleted={handleEventDeleted}
        />
      )}
    </div>
  );
};

export default Calendar; 