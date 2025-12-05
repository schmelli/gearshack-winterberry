/**
 * AvatarWithFallback Component
 *
 * Feature: 008-auth-and-profile
 * T016: Avatar display with initials fallback
 * FR-012: Prioritize Firestore avatarUrl over Auth photoURL
 */

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate initials from display name
 * Examples:
 * - "John Doe" -> "JD"
 * - "John" -> "J"
 * - "john doe" -> "JD"
 * - "" -> "?"
 */
function getInitials(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) {
    return '?';
  }

  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

// =============================================================================
// Component
// =============================================================================

interface AvatarWithFallbackProps {
  /** Avatar image URL */
  src?: string | null;
  /** User's display name for initials fallback */
  name?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export function AvatarWithFallback({
  src,
  name,
  size = 'md',
  className,
}: AvatarWithFallbackProps) {
  const initials = getInitials(name);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src && <AvatarImage src={src} alt={name || 'User avatar'} />}
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
