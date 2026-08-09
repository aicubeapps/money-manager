import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ACCENT_COLORS, ThemeContext } from './ThemeContextCore';
import type { AccentColor, Theme } from './ThemeContextCore';

export type { Theme, AccentColor, ThemeContextType } from './ThemeContextCore';
export { ACCENT_COLORS } from './ThemeContextCore';

const THEME_CLASSES: Record<Theme, string[]> = {
  light: ['theme-light'],
  dark: ['dark'],
  oled: ['dark', 'theme-oled'],
};

const DEFAULT_ACCENT: AccentColor = 'indigo';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    // Any value outside this list — including a legacy 'cyberpunk' from
    // before that theme was removed — falls through to the system
    // preference below, same as no stored value at all.
    if (stored && ['light', 'dark', 'oled'].includes(stored)) return stored;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    const stored = localStorage.getItem('theme-accent') as AccentColor | null;
    if (stored && ACCENT_COLORS.includes(stored)) return stored;
    return DEFAULT_ACCENT;
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes, then apply the current theme's set.
    root.classList.remove('dark', 'theme-oled', 'theme-light');
    THEME_CLASSES[theme].forEach((cls) => root.classList.add(cls));
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('theme-accent', accent);
  }, [accent]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setAccent = useCallback((a: AccentColor) => setAccentState(a), []);

  // Legacy toggle: cycles light ↔ dark; from oled returns to light.
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      return 'light';
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, accent, setAccent }),
    [theme, setTheme, toggleTheme, accent, setAccent]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
