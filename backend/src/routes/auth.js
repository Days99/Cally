const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/status', (req, res) => {
  res.json({ 
    message: 'Auth routes active',
    endpoints: {
      'GET /google': 'Get Google OAuth URL',
      'GET /google/callback': 'Handle Google OAuth callback',
      'POST /refresh': 'Refresh JWT token',
      'GET /me': 'Get user profile (requires auth)',
      'PUT /me': 'Update user profile (requires auth)',
      'POST /logout': 'Logout user (requires auth)',
      'DELETE /integrations/:provider': 'Disconnect integration (requires auth)'
    }
  });
});

// Google OAuth routes
router.get('/google', authController.getGoogleAuthUrl);
router.get('/google/callback', authController.googleCallback);

// Token management
router.post('/refresh', authController.refreshToken);

// Check authentication status (optional auth)
router.get('/check', optionalAuth, authController.checkAuth);

// Protected routes (require authentication)
router.get('/me', authenticateToken, authController.getProfile);
router.put('/me', authenticateToken, authController.updateProfile);
router.post('/logout', authenticateToken, authController.logout);
router.delete('/integrations/:provider', authenticateToken, authController.disconnectIntegration);

module.exports = router; 