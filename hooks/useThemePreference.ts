import { useTheme } from 'next-themes';

/**
 * useThemePreference Hook
 *
 * Feature: 004-nature-vibe-polish
 * Wrapper hook around next-themes useTheme for theme preference management.
 * Provides a simplified interface for toggling between light and dark modes.
 */
export function useThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const isDarkMode = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  const setLightMode = () => setTheme('light');
  const setDarkMode = () => setTheme('dark');

  return {
    /** Current theme setting ('light' | 'dark') */
    theme,
    /** Resolved theme after hydration */
    resolvedTheme,
    /** Whether dark mode is currently active */
    isDarkMode,
    /** Toggle between light and dark modes */
    toggleTheme,
    /** Set theme to light mode */
    setLightMode,
    /** Set theme to dark mode */
    setDarkMode,
    /** Set theme directly */
    setTheme,
  };
}
