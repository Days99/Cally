import React from 'react';
import { Link } from 'react-router-dom';
import PrivacyPolicy from '../components/PrivacyPolicy';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Simple header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">Cally</span>
            </Link>
            <Link 
              to="/login" 
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white dark:bg-gray-800">
        <PrivacyPolicy isModal={false} />
      </div>

      {/* Footer */}
      <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Questions about this privacy policy?
            </p>
            <div className="flex justify-center space-x-6">
              <a 
                href="mailto:privacy@cally.app" 
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Contact Us
              </a>
              <Link 
                to="/login" 
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
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

export default PrivacyPolicyPage; 