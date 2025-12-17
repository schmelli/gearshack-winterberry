/**
 * VisuallyHidden Component
 *
 * Feature: 049-wishlist-view
 * Task: T084
 *
 * Renders content that is hidden visually but remains accessible to screen readers.
 * Essential for providing context and announcements to assistive technology users.
 *
 * Uses the standard CSS technique recommended by accessibility experts:
 * - Positions content off-screen without using display:none or visibility:hidden
 * - Maintains content in the accessibility tree
 * - Supports aria-live regions for dynamic announcements
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Content to hide visually but keep accessible to screen readers */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function VisuallyHidden({
  children,
  className,
  ...props
}: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        // Standard visually-hidden technique
        'absolute',
        'h-px w-px',
        'overflow-hidden',
        'whitespace-nowrap',
        'border-0',
        'p-0',
        'm-[-1px]',
        '[clip:rect(0,0,0,0)]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// =============================================================================
// Announcement Component for aria-live regions
// =============================================================================

interface AnnouncementProps {
  /** The message to announce to screen readers */
  message: string;
  /** Politeness level: 'polite' for non-critical, 'assertive' for important */
  politeness?: 'polite' | 'assertive';
  /** Atomic: announce the entire region, not just changed parts */
  atomic?: boolean;
  /** Relevant: types of changes that should be announced */
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

/**
 * Announcement Component
 *
 * Creates an aria-live region for dynamic screen reader announcements.
 * Use 'polite' for non-critical updates (e.g., filter results changed).
 * Use 'assertive' for important updates (e.g., error messages, successful actions).
 */
export function Announcement({
  message,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions',
}: AnnouncementProps) {
  return (
    <VisuallyHidden
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
    >
      {message}
    </VisuallyHidden>
  );
}

export default VisuallyHidden;
