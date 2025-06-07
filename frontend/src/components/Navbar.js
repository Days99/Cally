import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

const Navbar = () => {
  const { user, authenticated, logout } = useAuth();
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Calendar', href: '/calendar', icon: '📅' },
    { name: 'Tasks', href: '/tasks', icon: '✅' },
    { name: 'Accounts', href: '/accounts', icon: '👥' },
  ];

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const ThemeIcon = () => {
    if (theme === 'system') {
      return '🖥️';
    }
    return isDark ? '🌙' : '☀️';
  };

  const themeOptions = [
    { key: 'light', label: 'Light', icon: '☀️' },
    { key: 'dark', label: 'Dark', icon: '🌙' },
    { key: 'system', label: 'System', icon: '🖥️' },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="relative">
                <img 
                  src="/cally_sunrise_calendar_icon.svg" 
                  alt="Cally Icon" 
                  className="h-8 w-8 transform transition-transform duration-200 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-primary-500 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-200" />
              </div>
              <span className="text-2xl font-bold text-gradient">Cally</span>
            </Link>

            {/* Desktop Navigation */}
            {authenticated && (
              <nav className="hidden md:flex ml-10 space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActivePath(item.href)
                        ? 'nav-link-active'
                        : 'nav-link'
                    } transition-all duration-200`}
                  >
                    <span className="mr-2 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="btn-icon text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                title="Toggle theme"
              >
                <span className="text-lg">{ThemeIcon()}</span>
              </button>

              {showThemeMenu && (
                <>
                  <div className="dropdown animate-scale-in">
                    {themeOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setTheme(option.key);
                          setShowThemeMenu(false);
                        }}
                        className={`dropdown-item flex items-center space-x-2 ${
                          theme === option.key ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                        {theme === option.key && (
                          <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowThemeMenu(false)}
                  />
                </>
              )}
            </div>

            {authenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg p-2 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-700">
                      <span className="text-white font-medium text-sm">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium truncate max-w-32">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                      {user.email}
                    </p>
                  </div>
                  <svg className="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <>
                    <div className="dropdown animate-scale-in min-w-56">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                      
                      <Link
                        to="/dashboard"
                        className="dropdown-item flex items-center space-x-2"
                        onClick={() => setShowDropdown(false)}
                      >
                        <span>📊</span>
                        <span>Dashboard</span>
                      </Link>

                      <Link
                        to="/accounts"
                        className="dropdown-item flex items-center space-x-2"
                        onClick={() => setShowDropdown(false)}
                      >
                        <span>👥</span>
                        <span>Accounts</span>
                      </Link>
                      
                      <Link
                        to="/contact"
                        className="dropdown-item flex items-center space-x-2"
                        onClick={() => setShowDropdown(false)}
                      >
                        <span>💬</span>
                        <span>Contact Support</span>
                      </Link>

                      <div className="dropdown-divider" />
                      
                      <button
                        onClick={handleLogout}
                        className="dropdown-item flex items-center space-x-2 text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"
                      >
                        <span>🚪</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowDropdown(false)}
                    />
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary animate-bounce-gentle"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {authenticated && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 pt-3 pb-3">
            <nav className="flex space-x-1 overflow-x-auto">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActivePath(item.href)
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  } flex items-center px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 