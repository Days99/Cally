import React from 'react';
import { Link } from 'react-router-dom';
import ContactForm from '../components/ContactForm';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">Cally</span>
            </Link>
            <div className="flex space-x-4">
              <Link 
                to="/privacy" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Privacy
              </Link>
              <Link 
                to="/login" 
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white">
        <ContactForm />
      </div>

      {/* Additional Contact Info */}
      <div className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Contact Info */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Us</h3>
              <p className="text-gray-600 mb-2">
                <a href="mailto:support@cally.pt" className="text-primary-600 hover:text-primary-700">
                  support@cally.pt
                </a>
              </p>
              <p className="text-sm text-gray-500">
                We typically respond within 24 hours
              </p>
            </div>

            {/* Response Time */}
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Response Time</h3>
              <p className="text-gray-600 mb-2">
                Within 24 hours
              </p>
              <p className="text-sm text-gray-500">
                Monday to Friday, 9 AM - 6 PM CET
              </p>
            </div>

            {/* Support Hours */}
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Global Support</h3>
              <p className="text-gray-600 mb-2">
                Available worldwide
              </p>
              <p className="text-sm text-gray-500">
                Supporting users across all time zones
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 pt-12 border-t border-gray-200">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h3>
              <p className="text-gray-600">
                Quick answers to common questions about Cally
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  How do I connect my Google Calendar?
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  After signing in with Google, your calendar is automatically connected. 
                  You can manage permissions in your account settings.
                </p>

                <h4 className="font-semibold text-gray-900 mb-2">
                  Can I integrate with Jira and GitHub?
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Yes! Cally supports full integration with both Jira and GitHub for 
                  seamless task and project management.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Is my data secure?
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Absolutely. We use enterprise-grade encryption and follow strict 
                  privacy policies. Read our{' '}
                  <Link to="/privacy" className="text-primary-600 hover:text-primary-700">
                    Privacy Policy
                  </Link>{' '}
                  for details.
                </p>

                <h4 className="font-semibold text-gray-900 mb-2">
                  How do I report a bug?
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Use the contact form above with "Bug Report" as the subject, 
                  or email us directly at support@cally.pt with detailed steps to reproduce.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Need more help? Explore our resources:
              </p>
              <div className="flex flex-wrap justify-center space-x-6">
                <Link 
                  to="/privacy" 
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Privacy Policy
                </Link>
                <Link 
                  to="/terms" 
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Terms of Service
                </Link>
                <Link 
                  to="/login" 
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Sign In
                </Link>
                <Link 
                  to="/" 
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage; 