import { createContext } from 'react';

export type Theme = 'light' | 'dark' | 'oled';

export const ACCENT_COLORS = [
  'indigo', 'violet', 'rose', 'amber', 'emerald', 'cyan',
  'sky', 'pink', 'orange', 'lime', 'teal', 'red',
] as const;

export type AccentColor = typeof ACCENT_COLORS[number];

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Kept for backward compat (header quick-toggle): cycles light ↔ dark only. */
  toggleTheme: () => void;
  /** OLED-only accent color; stored regardless of active theme but only
   * visually applied while theme === 'oled' (see .theme-oled scoping in
   * accent-themes.css). */
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
}

// Split from ThemeContext.tsx: a file that exports a component (ThemeProvider)
// can't also export a context object without tripping
// react-refresh/only-export-components, so the context itself lives here.
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
