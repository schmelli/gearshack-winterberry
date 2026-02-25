/**
 * ViewDensityToggle Component
 *
 * Feature: 002-inventory-gallery
 * Segmented control for switching between Compact/Standard/Detailed views
 */

import type { ViewDensity } from '@/types/inventory';
import { VIEW_DENSITY_OPTIONS, VIEW_DENSITY_LABELS } from '@/types/inventory';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ViewDensityToggleProps {
  /** Current view density */
  value: ViewDensity;
  /** Callback when view density changes */
  onChange: (density: ViewDensity) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ViewDensityToggle({
  value,
  onChange,
  className,
}: ViewDensityToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border bg-muted p-1',
        className
      )}
      role="radiogroup"
      aria-label="View density"
    >
      {VIEW_DENSITY_OPTIONS.map((density) => (
        <button
          key={density}
          type="button"
          role="radio"
          aria-checked={value === density}
          onClick={() => onChange(density)}
          className={cn(
            'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            value === density
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {VIEW_DENSITY_LABELS[density]}
        </button>
      ))}
    </div>
  );
}
