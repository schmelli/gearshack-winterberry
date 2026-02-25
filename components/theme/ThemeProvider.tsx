'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider Component
 *
 * Feature: 004-nature-vibe-polish
 * Wraps the application with next-themes provider for dark mode support.
 * Uses class strategy for Tailwind CSS dark mode compatibility.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
