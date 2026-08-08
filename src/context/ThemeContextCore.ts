import { createContext } from 'react';

export type Theme = 'light' | 'dark' | 'oled' | 'cyberpunk';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Kept for backward compat (header quick-toggle): cycles light ↔ dark only. */
  toggleTheme: () => void;
}

// Split from ThemeContext.tsx: a file that exports a component (ThemeProvider)
// can't also export a context object without tripping
// react-refresh/only-export-components, so the context itself lives here.
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
