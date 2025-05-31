import React from 'react';

const Tasks = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-4 h-4 bg-jira rounded mr-2"></span>
            Jira Tasks
          </h3>
          <p className="text-gray-600">Integration coming in Phase 4</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-4 h-4 bg-github rounded mr-2"></span>
            GitHub Issues
          </h3>
          <p className="text-gray-600">Integration coming in Phase 5</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-4 h-4 bg-google rounded mr-2"></span>
            Calendar Events
          </h3>
          <p className="text-gray-600">Integration coming in Phase 3</p>
        </div>
      </div>
    </div>
  );
};

export default Tasks; 