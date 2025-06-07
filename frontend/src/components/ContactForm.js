import React, { useState } from 'react';

const ContactForm = ({ isModal = false, onClose = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      console.log('Contact form submitted successfully:', data);
      setIsSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' });
        setIsSubmitted(false);
        if (onClose) onClose();
      }, 3000);

    } catch (error) {
      console.error('Error submitting contact form:', error);
      setErrors({ submit: error.message || 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerClass = isModal 
    ? "p-6" 
    : "max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8";

  if (isSubmitted) {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Message Sent Successfully!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Thank you for contacting us. We'll get back to you within 24 hours at <strong>{formData.email}</strong>.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can also reach us directly at <strong>support@cally.pt</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Contact Us</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Have questions about Cally? Need help with your account? We'd love to hear from you.
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Direct Email:</strong> support@cally.pt
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                We typically respond within 24 hours
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{errors.submit}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`input-field ${
                errors.name ? 'border-red-300 dark:border-red-600' : ''
              }`}
              placeholder="Your full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`input-field ${
                errors.email ? 'border-red-300 dark:border-red-600' : ''
              }`}
              placeholder="your.email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subject *
          </label>
          <select
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            className={`input-field ${
              errors.subject ? 'border-red-300 dark:border-red-600' : ''
            }`}
          >
            <option value="">Select a subject</option>
            <option value="General Inquiry">General Inquiry</option>
            <option value="Technical Support">Technical Support</option>
            <option value="Account Issues">Account Issues</option>
            <option value="Feature Request">Feature Request</option>
            <option value="Bug Report">Bug Report</option>
            <option value="Privacy Policy">Privacy Policy Question</option>
            <option value="Integration Help">Integration Help (Google/Jira/GitHub)</option>
            <option value="Billing">Billing & Subscription</option>
            <option value="Other">Other</option>
          </select>
          {errors.subject && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject}</p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            value={formData.message}
            onChange={handleInputChange}
            className={`input-field ${
              errors.message ? 'border-red-300 dark:border-red-600' : ''
            }`}
            placeholder="Please describe your question or issue in detail..."
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Minimum 10 characters. Be as specific as possible to help us assist you better.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            * Required fields
          </p>
          
          <div className="flex space-x-3">
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Looking for quick answers? Check out our documentation:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
              User Guide
            </a>
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
              API Documentation
            </a>
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
              FAQ
            </a>
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
              Integration Help
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm; 