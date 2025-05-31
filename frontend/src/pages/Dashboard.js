import React from 'react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Cally</h3>
          <p className="text-gray-600">Your unified calendar and task management solution.</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Stats</h3>
          <p className="text-gray-600">Coming soon - Integration statistics and insights.</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h3>
          <p className="text-gray-600">Coming soon - Recent tasks and calendar events.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 