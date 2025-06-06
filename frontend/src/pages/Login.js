import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { login, authenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already authenticated
    if (authenticated) {
      navigate('/', { replace: true });
    }
  }, [authenticated, navigate]);

  // Check if user has previously accepted privacy policy
  useEffect(() => {
    const hasAcceptedPrivacy = localStorage.getItem('privacy_policy_accepted');
    if (hasAcceptedPrivacy === 'true') {
      setPrivacyAccepted(true);
    }
  }, []);

  const handlePrivacyAccept = () => {
    setPrivacyAccepted(true);
    setShowPrivacyModal(false);
    localStorage.setItem('privacy_policy_accepted', 'true');
    localStorage.setItem('privacy_policy_date', new Date().toISOString());
  };

  const handlePrivacyDecline = () => {
    setPrivacyAccepted(false);
    setShowPrivacyModal(false);
    localStorage.removeItem('privacy_policy_accepted');
    localStorage.removeItem('privacy_policy_date');
  };

  const handlePrivacyToggle = (checked) => {
    if (checked) {
      setShowPrivacyModal(true);
    } else {
      setPrivacyAccepted(false);
      localStorage.removeItem('privacy_policy_accepted');
      localStorage.removeItem('privacy_policy_date');
    }
  };

  const handleGoogleLogin = async () => {
    if (!privacyAccepted) {
      setError('Please accept the Privacy Policy to continue');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login();
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to start Google login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/cally_sunrise_calendar_icon.svg" 
              alt="Cally Icon" 
              className="h-12 w-12 mr-3"
            />
            <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">Cally</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to access your unified calendar and task management
          </p>
        </div>

        {error && (
          <div className="alert-error mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-error-400 dark:text-error-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-error-800 dark:text-error-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Policy Agreement */}
        <div className="mb-6">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="privacy-agreement"
                name="privacy-agreement"
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => handlePrivacyToggle(e.target.checked)}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="privacy-agreement" className="text-gray-700 dark:text-gray-300">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 underline font-medium"
                >
                  Privacy Policy
                </button>
                {' '}and{' '}
                <Link 
                  to="/terms" 
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 underline font-medium"
                >
                  Terms of Service
                </Link>
                {' '}*
              </label>
            </div>
          </div>
          {!privacyAccepted && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              You must accept our privacy policy to create an account and use Cally
            </p>
          )}
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading || !privacyAccepted}
          className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 dark:focus:ring-offset-gray-900 transition-colors duration-200 ${
            !privacyAccepted ? 'opacity-50 cursor-not-allowed' : 'disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 dark:border-gray-300"></div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help? Read our{' '}
            <Link 
              to="/privacy" 
              className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 underline"
            >
              Privacy Policy
            </Link>
            {' '}to learn how we protect your data.
          </p>
        </div>

        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              What you'll get with Cally:
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Google Calendar integration
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Jira & GitHub task management
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unified task scheduling
              </li>
            </ul>
          </div>
        </div>

        {/* Privacy Policy Modal */}
        <PrivacyPolicyModal
          isOpen={showPrivacyModal}
          onAccept={handlePrivacyAccept}
          onDecline={handlePrivacyDecline}
        />
      </div>
    </div>
  );
};

export default Login; 