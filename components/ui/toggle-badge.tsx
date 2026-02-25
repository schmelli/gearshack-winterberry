/**
 * ToggleBadge - A reusable toggle badge component
 *
 * Feature: 006-ui-makeover
 * Combines Toggle and Badge for activity/season selection
 */

'use client';

import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ToggleBadgeProps {
  /** The label to display */
  label: string;
  /** Whether the badge is currently selected */
  pressed: boolean;
  /** Callback when toggle state changes */
  onPressedChange: (pressed: boolean) => void;
  /** Optional className for additional styling */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ToggleBadge({
  label,
  pressed,
  onPressedChange,
  className,
}: ToggleBadgeProps) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn('h-auto p-0', className)}
      aria-label={`Toggle ${label}`}
    >
      <Badge
        variant={pressed ? 'default' : 'outline'}
        className={cn(
          'cursor-pointer transition-colors',
          pressed && 'bg-primary text-primary-foreground'
        )}
      >
        {label}
      </Badge>
    </Toggle>
  );
}
