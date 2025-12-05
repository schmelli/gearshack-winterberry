/**
 * SeasonSelector - Icon-based season selection component
 *
 * Feature: 012-visual-identity-fixes
 * T020: Create SeasonSelector with icon cards
 * Allows single-select season selection with visual icon cards
 */

'use client';

import { Sun, Snowflake, Leaf, Flower2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Constants
// =============================================================================

const SEASONS = [
  { value: 'spring', label: 'Spring', icon: Flower2 },
  { value: 'summer', label: 'Summer', icon: Sun },
  { value: 'fall', label: 'Fall', icon: Leaf },
  { value: 'winter', label: 'Winter', icon: Snowflake },
] as const;

type Season = typeof SEASONS[number]['value'];

// =============================================================================
// Types
// =============================================================================

interface SeasonSelectorProps {
  /** Currently selected season (null if none) */
  value?: Season | null;
  /** Callback when selection changes */
  onChange: (season: Season | null) => void;
}

// =============================================================================
// Component
// =============================================================================

export function SeasonSelector({ value, onChange }: SeasonSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {SEASONS.map((season) => {
        const Icon = season.icon;
        const isSelected = value === season.value;
        return (
          <button
            key={season.value}
            type="button"
            onClick={() => onChange(isSelected ? null : season.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50 hover:bg-muted'
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium">{season.label}</span>
          </button>
        );
      })}
    </div>
  );
}
