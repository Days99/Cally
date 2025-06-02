import React from 'react';

const TermsOfService = ({ isModal = false }) => {
  const containerClass = isModal 
    ? "max-h-96 overflow-y-auto px-1" 
    : "max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8";

  return (
    <div className={containerClass}>
      <div className="prose prose-blue max-w-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <p className="text-gray-600 mb-6">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-4">
            By accessing and using Cally ("the Service"), you accept and agree to be bound by the terms and 
            provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-700 mb-4">
            Cally is a calendar and task management application that integrates with third-party services 
            including Google Calendar, Jira, and GitHub to provide unified scheduling and task tracking capabilities.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Account</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
            <li>You are responsible for all activities that occur under your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
          <p className="text-gray-700 mb-4">You agree not to use the Service to:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Violate any laws or regulations</li>
            <li>Infringe on the rights of others</li>
            <li>Transmit harmful or malicious content</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Use the Service for commercial purposes without permission</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Third-Party Integrations</h2>
          <p className="text-gray-700 mb-4">
            Our Service integrates with third-party platforms. Your use of these integrations is subject to 
            their respective terms of service and privacy policies. We are not responsible for the practices 
            or content of these third-party services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data and Privacy</h2>
          <p className="text-gray-700 mb-4">
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use 
            of the Service, to understand our practices.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Service Availability</h2>
          <p className="text-gray-700 mb-4">
            We strive to provide reliable service but cannot guarantee 100% uptime. We may temporarily 
            suspend the Service for maintenance or updates.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-700 mb-4">
            The Service is provided "as is" without warranties of any kind. We shall not be liable for any 
            indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
          <p className="text-gray-700 mb-4">
            We may terminate or suspend your account and access to the Service at our sole discretion, 
            without prior notice, for conduct that we believe violates these Terms or is harmful to other users.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
          <p className="text-gray-700 mb-4">
            We reserve the right to modify these terms at any time. We will notify users of any changes 
            by posting the new Terms of Service on this page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">
              <strong>Email:</strong> support@cally.app<br/>
              <strong>Website:</strong> https://cally.app
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService; 