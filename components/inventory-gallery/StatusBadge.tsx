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
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  wishlist:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  sold: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
