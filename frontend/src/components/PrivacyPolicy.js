import React from 'react';

const PrivacyPolicy = ({ isModal = false }) => {
  const containerClass = isModal 
    ? "max-h-96 overflow-y-auto px-1" 
    : "max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8";

  return (
    <div className={containerClass}>
      <div className="prose prose-blue max-w-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <p className="text-gray-600 mb-6">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
          <p className="text-gray-700 mb-4">
            Welcome to Cally ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our calendar 
            and task management application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
          
          <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Information You Provide</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Account information (name, email address) when you sign up</li>
            <li>Calendar events and task data you create or import</li>
            <li>Integration credentials for third-party services (Google Calendar, Jira, GitHub)</li>
            <li>Communications you send to us</li>
          </ul>

          <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Information We Collect Automatically</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Usage data and analytics</li>
            <li>Device information and browser type</li>
            <li>IP address and location data</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h3 className="text-xl font-medium text-gray-800 mb-3">2.3 Third-Party Data</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Google Calendar events and metadata</li>
            <li>Jira issues, projects, and user information</li>
            <li>GitHub repositories, issues, and user data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Provide and maintain our service</li>
            <li>Synchronize your calendar and task data</li>
            <li>Send notifications and reminders</li>
            <li>Improve our application and user experience</li>
            <li>Provide customer support</li>
            <li>Ensure security and prevent fraud</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
          <p className="text-gray-700 mb-4">
            We do not sell, trade, or rent your personal information to others. We may share your information in the following circumstances:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Third-Party Services:</strong> With your consent, to integrate with Google Calendar, Jira, and GitHub</li>
            <li><strong>Service Providers:</strong> With trusted partners who assist in operating our service</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or asset sale</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
          <p className="text-gray-700 mb-4">
            We implement appropriate security measures to protect your personal information:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication and authorization protocols</li>
            <li>Regular security audits and updates</li>
            <li>Limited access to personal data by our team</li>
            <li>Secure hosting infrastructure</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
          <p className="text-gray-700 mb-4">
            We retain your personal information for as long as necessary to provide our services and comply with legal obligations. 
            When you delete your account, we will delete your personal data within 30 days, except where retention is required by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
          <p className="text-gray-700 mb-4">You have the following rights regarding your personal data:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Access:</strong> Request access to your personal data</li>
            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data</li>
            <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
            <li><strong>Objection:</strong> Object to processing of your personal data</li>
            <li><strong>Withdrawal:</strong> Withdraw consent at any time</li>
          </ul>
          <p className="text-gray-700 mt-4">
            To exercise these rights, contact us at privacy@cally.pt or through your account settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Third-Party Integrations</h2>
          <p className="text-gray-700 mb-4">
            Our service integrates with third-party platforms. Their privacy policies govern the data they collect:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Google:</strong> <a href="https://policies.google.com/privacy" className="text-blue-600 hover:text-blue-800">Google Privacy Policy</a></li>
            <li><strong>Atlassian (Jira):</strong> <a href="https://www.atlassian.com/legal/privacy-policy" className="text-blue-600 hover:text-blue-800">Atlassian Privacy Policy</a></li>
            <li><strong>GitHub:</strong> <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" className="text-blue-600 hover:text-blue-800">GitHub Privacy Statement</a></li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies and Tracking</h2>
          <p className="text-gray-700 mb-4">
            We use cookies and similar technologies to enhance your experience. You can control cookie settings through your browser.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. International Data Transfers</h2>
          <p className="text-gray-700 mb-4">
            Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards 
            are in place to protect your personal information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
          <p className="text-gray-700 mb-4">
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy 
            on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions about this privacy policy or our data practices, please contact us:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">
              <strong>Email:</strong> support@cally.pt<br/>
              <strong>Privacy Email:</strong> privacy@cally.pt<br/>
              <strong>Contact Form:</strong> <a href="/contact" className="text-blue-600 hover:text-blue-800">cally.pt/contact</a><br/>
              <strong>Website:</strong> https://cally.pt
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 