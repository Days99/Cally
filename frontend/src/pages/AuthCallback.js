import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');
      const errorMessage = searchParams.get('message');

      if (errorMessage) {
        setError(decodeURIComponent(errorMessage));
        setStatus('error');
        return;
      }

      if (!token || !refreshToken) {
        setError('Missing authentication tokens');
        setStatus('error');
        return;
      }

      // Store tokens
      authService.setTokens(token, refreshToken);
      
      // Update auth context
      await checkAuthStatus();
      
      setStatus('success');
      
      // Check if user should return to account management page
      const returnUrl = localStorage.getItem('oauth_return_url');
      localStorage.removeItem('oauth_return_url');
      
      // Redirect to the appropriate page after a short delay
      setTimeout(() => {
        if (returnUrl && returnUrl.includes('/accounts')) {
          navigate('/accounts', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 2000);

    } catch (error) {
      console.error('AuthCallback: Error during callback:', error);
      setError(error.message || 'Authentication failed');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completing Sign In...
          </h2>
          <p className="text-gray-600">
            Please wait while we set up your account.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome to Cally!
          </h2>
          <p className="text-gray-600 mb-4">
            You've successfully signed in with Google.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">
            {error || 'Something went wrong during sign in.'}
          </p>
          <button 
            onClick={handleRetry}
            className="btn-primary w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback; 