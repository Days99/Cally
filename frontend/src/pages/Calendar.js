import React from 'react';

const Calendar = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">FullCalendar Integration</h3>
        <p className="text-gray-600 mb-4">
          Interactive calendar with Google Calendar integration coming in Phase 3.
        </p>
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-gray-500">📅 Calendar View Placeholder</p>
        </div>
      </div>
    </div>
  );
};

export default Calendar; 