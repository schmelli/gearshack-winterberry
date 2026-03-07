/**
 * Responsive Toaster Component
 *
 * Feature: Mobile-First Responsive Refactoring
 *
 * Wraps Sonner's Toaster with responsive positioning:
 * - Mobile: top-center (avoids being hidden by mobile browser chrome)
 * - Desktop: bottom-right (conventional desktop toast position)
 *
 * Uses the existing useMediaQuery hook and MEDIA_QUERIES constants.
 */

'use client';

import { Toaster } from 'sonner';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MEDIA_QUERIES } from '@/lib/constants/breakpoints';

export function ResponsiveToaster() {
  const isDesktop = useMediaQuery(MEDIA_QUERIES.desktop);

  return (
    <Toaster
      richColors
      position={isDesktop ? 'bottom-right' : 'top-center'}
    />
  );
}
