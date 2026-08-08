import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContextCore';
import type { Theme } from './ThemeContextCore';

export type { Theme, ThemeContextType } from './ThemeContextCore';

const THEME_CLASSES: Record<Theme, string[]> = {
  light: [],
  dark: ['dark'],
  cyberpunk: ['dark', 'theme-cyberpunk'],
  oled: ['dark', 'theme-oled'],
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored && ['light', 'dark', 'oled', 'cyberpunk'].includes(stored)) return stored as Theme;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes, then apply the current theme's set.
    root.classList.remove('dark', 'theme-cyberpunk', 'theme-oled');
    THEME_CLASSES[theme].forEach((cls) => root.classList.add(cls));
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  // Legacy toggle: cycles light ↔ dark; from oled/cyberpunk returns to light.
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      return 'light';
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
