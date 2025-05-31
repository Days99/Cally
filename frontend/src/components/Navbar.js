import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">Cally</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="btn-secondary">
              Sign In (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 