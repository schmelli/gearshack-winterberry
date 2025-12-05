/**
 * ActivityMatrix Component
 *
 * Feature: 009-grand-visual-polish
 * FR-015: Activity Matrix with 4 progress bars
 * FR-016: Shows Weight, Comfort, Durability, Safety priorities
 * FR-017: Predefined values per activity type
 * FR-018: Values update visually when activity selection changes
 *
 * Uses computeAveragePriorities from useLoadoutEditor (Constitution Principle I)
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { computeAveragePriorities } from '@/hooks/useLoadoutEditor';
import type { ActivityType, ActivityPriorities } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface ActivityMatrixProps {
  /** Selected activity types for the loadout */
  selectedActivities: ActivityType[];
  /** Optional custom class name */
  className?: string;
}

// =============================================================================
// Priority Labels and Colors
// =============================================================================

const PRIORITY_CONFIG: Array<{
  key: keyof ActivityPriorities;
  label: string;
  colorClass: string;
}> = [
  { key: 'weight', label: 'Weight Priority', colorClass: 'bg-blue-500' },
  { key: 'comfort', label: 'Comfort', colorClass: 'bg-green-500' },
  { key: 'durability', label: 'Durability', colorClass: 'bg-amber-500' },
  { key: 'safety', label: 'Safety', colorClass: 'bg-red-500' },
];

// =============================================================================
// Component
// =============================================================================

export function ActivityMatrix({ selectedActivities, className }: ActivityMatrixProps) {
  // Compute averaged priorities (T029: returns neutral 50 if no activities selected)
  const priorities = computeAveragePriorities(selectedActivities);

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Activity Priorities
      </p>
      <div className="space-y-3">
        {PRIORITY_CONFIG.map(({ key, label, colorClass }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{priorities[key]}%</span>
            </div>
            <Progress
              value={priorities[key]}
              className="h-2"
              indicatorClassName={colorClass}
            />
          </div>
        ))}
      </div>
      {selectedActivities.length === 0 && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Select activities to see priority breakdown
        </p>
      )}
    </div>
  );
}
