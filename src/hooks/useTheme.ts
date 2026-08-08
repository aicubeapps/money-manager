import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContextCore';
import type { ThemeContextType } from '../context/ThemeContextCore';

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
