/**
 * StatusBadge Component
 *
 * Feature: 002-inventory-gallery
 * Displays gear status with appropriate color coding
 */

import type { GearStatus } from '@/types/gear';
import { GEAR_STATUS_LABELS } from '@/types/gear';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface StatusBadgeProps {
  /** The gear status to display */
  status: GearStatus;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Status Color Configuration
// =============================================================================

const STATUS_COLORS: Record<GearStatus, string> = {
  own: 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary',
  wishlist: 'bg-accent/15 text-accent dark:bg-accent/20 dark:text-accent',
  sold: 'bg-muted text-muted-foreground',
  lent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  retired: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

// =============================================================================
// Component
// =============================================================================

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = GEAR_STATUS_LABELS[status];
  const colorClass = STATUS_COLORS[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { STATUS_COLORS };
