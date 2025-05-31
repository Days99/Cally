import React from 'react';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Sign in to Cally
        </h2>
        <p className="text-center text-gray-600 mb-6">
          OAuth authentication coming in Phase 2
        </p>
        <button className="btn-primary w-full">
          Google Sign In (Coming Soon)
        </button>
      </div>
    </div>
  );
};

export default Login; 