import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'oled' | 'cyberpunk';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Kept for backward compat (header quick-toggle): cycles light ↔ dark only. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored && ['light', 'dark', 'oled', 'cyberpunk'].includes(stored)) return stored;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    // OLED and Cyberpunk are both dark-base — Tailwind dark: variants apply to all non-light themes.
    if (theme === 'light') {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.removeAttribute('data-theme');
    } else {
      root.classList.add('dark');
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};