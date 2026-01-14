/**
 * useMediaQuery Hook
 *
 * Feature: User Onboarding
 *
 * A hook for responsive design that tracks CSS media query matches.
 * Returns true if the media query matches, false otherwise.
 *
 * Usage:
 * ```tsx
 * import { MEDIA_QUERIES } from '@/lib/constants/breakpoints';
 *
 * const isMobile = useMediaQuery(MEDIA_QUERIES.mobile);
 * const prefersReducedMotion = useMediaQuery(MEDIA_QUERIES.reducedMotion);
 * ```
 */

'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // Initialize with false to avoid hydration mismatch
  // Server always renders as if media query doesn't match
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener for changes
    // Use addEventListener with 'change' event (modern browsers)
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
