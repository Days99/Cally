import React from 'react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Google Calendar</h4>
              <p className="text-sm text-gray-600">Connect your Google Calendar account</p>
            </div>
            <button className="btn-secondary">Connect (Coming Soon)</button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Jira</h4>
              <p className="text-sm text-gray-600">Connect your Jira workspace</p>
            </div>
            <button className="btn-secondary">Connect (Coming Soon)</button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">GitHub</h4>
              <p className="text-sm text-gray-600">Connect your GitHub account</p>
            </div>
            <button className="btn-secondary">Connect (Coming Soon)</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 