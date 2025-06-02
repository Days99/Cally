const express = require('express');
const router = express.Router();

// POST /api/contact - Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // TODO: Implement actual email sending logic
    // For now, just log the contact form submission
    const contactSubmission = {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    };

    console.log('📧 Contact Form Submission:', contactSubmission);

    // TODO: Send email to support@cally.pt
    // TODO: Send confirmation email to user
    // TODO: Store in database for tracking

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you within 24 hours.',
      submissionId: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

// GET /api/contact/info - Get contact information
router.get('/info', (req, res) => {
  res.json({
    success: true,
    contact: {
      email: 'support@cally.pt',
      privacyEmail: 'privacy@cally.pt',
      website: 'https://cally.pt',
      responseTime: '24 hours',
      supportHours: 'Monday to Friday, 9 AM - 6 PM CET',
      subjects: [
        'General Inquiry',
        'Technical Support',
        'Account Issues',
        'Feature Request',
        'Bug Report',
        'Privacy Policy',
        'Integration Help (Google/Jira/GitHub)',
        'Billing',
        'Other'
      ]
    }
  });
});

module.exports = router; 