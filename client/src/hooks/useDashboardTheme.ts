import { useState, useEffect } from 'react';

export default function useDashboardTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cr_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cr_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
}
