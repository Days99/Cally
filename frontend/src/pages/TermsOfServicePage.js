import React from 'react';
import { Link } from 'react-router-dom';
import TermsOfService from '../components/TermsOfService';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">Cally</span>
            </Link>
            <Link 
              to="/login" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white">
        <TermsOfService isModal={false} />
      </div>

      {/* Footer */}
      <div className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Questions about these terms?
            </p>
            <div className="flex justify-center space-x-6">
              <a 
                href="mailto:support@cally.app" 
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Contact Support
              </a>
              <Link 
                to="/privacy" 
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/login" 
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage; 