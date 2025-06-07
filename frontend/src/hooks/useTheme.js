import { useState, useEffect, useContext, createContext } from 'react';

// Create theme context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [systemTheme, setSystemTheme] = useState('light');

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from localStorage or use system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      setTheme('system');
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = theme === 'system' ? systemTheme : theme;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    root.classList.add(effectiveTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#111827' : '#ffffff');
    }
  }, [theme, systemTheme]);

  // Save theme to localStorage
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Get effective theme (resolves 'system' to actual theme)
  const getEffectiveTheme = () => {
    return theme === 'system' ? systemTheme : theme;
  };

  // Toggle between light and dark (skips system)
  const toggleTheme = () => {
    const effectiveTheme = getEffectiveTheme();
    updateTheme(effectiveTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    systemTheme,
    effectiveTheme: getEffectiveTheme(),
    setTheme: updateTheme,
    toggleTheme,
    isDark: getEffectiveTheme() === 'dark',
    isLight: getEffectiveTheme() === 'light',
    isSystem: theme === 'system'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default useTheme; 