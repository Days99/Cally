import React from 'react';

// Basic spinner component
export const Spinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-primary-600 dark:text-primary-400',
    white: 'text-white',
    gray: 'text-gray-400',
    success: 'text-success-600 dark:text-success-400',
    error: 'text-error-600 dark:text-error-400'
  };

  return (
    <div className={`inline-block ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Dots loading indicator
export const DotsLoader = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const colorClasses = {
    primary: 'bg-primary-600 dark:bg-primary-400',
    gray: 'bg-gray-400',
    success: 'bg-success-600 dark:bg-success-400',
    error: 'bg-error-600 dark:bg-error-400'
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s'
          }}
        />
      ))}
    </div>
  );
};

// Pulse loader
export const PulseLoader = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'bg-primary-200 dark:bg-primary-800',
    gray: 'bg-gray-200 dark:bg-gray-700',
    success: 'bg-success-200 dark:bg-success-800',
    error: 'bg-error-200 dark:bg-error-800'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse ${className}`} />
  );
};

// Skeleton components
export const SkeletonText = ({ lines = 1, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton-text ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

export const SkeletonTitle = ({ className = '' }) => {
  return <div className={`skeleton-title w-1/2 ${className}`} />;
};

export const SkeletonAvatar = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return <div className={`skeleton-avatar ${sizeClasses[size]} ${className}`} />;
};

export const SkeletonButton = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-16',
    md: 'h-10 w-20',
    lg: 'h-12 w-24'
  };

  return <div className={`skeleton rounded-lg ${sizeClasses[size]} ${className}`} />;
};

export const SkeletonCard = ({ showAvatar = false, lines = 3, className = '' }) => {
  return (
    <div className={`card animate-pulse ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        {showAvatar && <SkeletonAvatar />}
        <div className="flex-1">
          <SkeletonTitle className="mb-2" />
          <div className="skeleton-text w-1/3" />
        </div>
      </div>
      <SkeletonText lines={lines} />
      <div className="flex justify-between items-center mt-4">
        <SkeletonButton size="sm" />
        <div className="skeleton-text w-16" />
      </div>
    </div>
  );
};

// Dashboard skeleton
export const SkeletonDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6 animate-pulse">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-white/30 rounded-lg mr-4" />
          <div className="skeleton-title w-64" />
        </div>
        <div className="skeleton-text w-96" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="skeleton-text w-24" />
              <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            <div className="skeleton-title w-16 mb-2" />
            <div className="skeleton-text w-20 mb-2" />
            <div className="skeleton-text w-32" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard showAvatar lines={4} />
        <SkeletonCard showAvatar lines={4} />
      </div>
    </div>
  );
};

// Calendar skeleton
export const SkeletonCalendar = () => {
  return (
    <div className="card animate-pulse">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton-title w-32" />
        <div className="flex space-x-2">
          <SkeletonButton size="sm" />
          <SkeletonButton size="sm" />
          <SkeletonButton size="sm" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {/* Week headers */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton-text h-8" />
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded" />
        ))}
      </div>
    </div>
  );
};

// Event list skeleton
export const SkeletonEventList = ({ count = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <div className="flex-1">
            <div className="skeleton-text w-48 mb-1" />
            <div className="skeleton-text w-24" />
          </div>
          <div className="skeleton-text w-16" />
        </div>
      ))}
    </div>
  );
};

// Loading overlay
export const LoadingOverlay = ({ children, loading, text = 'Loading...', backdrop = true }) => {
  if (!loading) return children;

  return (
    <div className="relative">
      {children}
      <div className={`absolute inset-0 flex items-center justify-center z-10 ${
        backdrop ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm' : ''
      }`}>
        <div className="flex flex-col items-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{text}</p>
        </div>
      </div>
    </div>
  );
};

// Page loading component
export const PageLoader = ({ text = 'Loading page...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Spinner size="xl" />
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">{text}</p>
        <DotsLoader className="mt-4 justify-center" />
      </div>
    </div>
  );
};

// Button loading state
export const LoadingButton = ({ 
  children, 
  loading = false, 
  disabled = false, 
  className = '', 
  loadingText = 'Loading...',
  ...props 
}) => {
  return (
    <button
      className={`btn-primary ${className} ${loading ? 'cursor-not-allowed' : ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <Spinner size="sm" color="white" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// Shimmer effect component
export const ShimmerBox = ({ width = 'w-full', height = 'h-4', className = '' }) => {
  return (
    <div className={`shimmer ${width} ${height} rounded ${className}`} />
  );
};

export default {
  Spinner,
  DotsLoader,
  PulseLoader,
  SkeletonText,
  SkeletonTitle,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonDashboard,
  SkeletonCalendar,
  SkeletonEventList,
  LoadingOverlay,
  PageLoader,
  LoadingButton,
  ShimmerBox
}; 