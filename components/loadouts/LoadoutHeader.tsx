/**
 * LoadoutHeader - Enhanced header with sans-serif title, badges, and weight progress
 *
 * Feature: 006-ui-makeover
 * FR-007: Interactive activity badges
 * FR-008: Interactive season badges
 * FR-009: Weight progress bar showing current base weight
 * FR-010: Persist badge selections with loadout
 *
 * Feature: 007-grand-polish-sprint
 * US4: Display Total Weight and Base Weight
 *
 * Feature: 009-grand-visual-polish
 * FR-012: Loadout title in sans-serif font (not Rock Salt)
 * FR-013: Description positioned in header right-side
 * FR-014: Inline description editing (no modal)
 */

'use client';

import { Link } from '@/i18n/navigation';
import { ArrowLeft, Calendar, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ToggleBadge } from '@/components/ui/toggle-badge';
import { WeightDonut } from '@/components/loadouts/WeightDonut';
import { Textarea } from '@/components/ui/textarea';
import { formatTripDate, formatWeight, DEFAULT_WEIGHT_GOAL_GRAMS } from '@/lib/loadout-utils';
import { useLoadoutInlineEdit } from '@/hooks/useLoadoutInlineEdit';
import { ActivityMatrix } from '@/components/loadouts/ActivityMatrix';
import { LoadoutShareButton } from '@/components/loadouts/LoadoutShareButton';
import type { Loadout, CategoryWeight, ActivityType, Season, LoadoutItemState } from '@/types/loadout';
import type { GearItem } from '@/types/gear';
import { ACTIVITY_TYPE_LABELS, SEASON_LABELS } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface LoadoutHeaderProps {
  loadout: Loadout;
  totalWeight: number;
  baseWeight: number; // US4: Base Weight calculation
  categoryWeights: CategoryWeight[];
  activityTypes: ActivityType[];
  seasons: Season[];
  onToggleActivity: (activity: ActivityType) => void;
  onToggleSeason: (season: Season) => void;
  /** Currently selected category for chart highlight (FR-012) */
  selectedCategoryId?: string | null;
  /** Callback when chart segment is clicked (FR-012) */
  onSegmentClick?: (categoryId: string) => void;
  /** Callback when edit button is clicked (US5) */
  onEdit?: () => void;
  /** Callback when description is changed inline (FR-014) */
  onDescriptionChange?: (description: string | null) => void;
  /** Props for share button */
  items?: GearItem[];
  itemStates?: LoadoutItemState[];
}

// =============================================================================
// Activity Types and Seasons Lists
// =============================================================================

const ACTIVITY_OPTIONS: ActivityType[] = ['hiking', 'camping', 'backpacking', 'climbing', 'skiing'];
const SEASON_OPTIONS: Season[] = ['spring', 'summer', 'fall', 'winter'];

// =============================================================================
// Weight Progress Bar Component (US4: Enhanced with Total/Base display)
// =============================================================================

interface WeightProgressBarProps {
  totalWeight: number;
  baseWeight: number;
}

function WeightProgressBar({ totalWeight, baseWeight }: WeightProgressBarProps) {
  const progress = Math.min((baseWeight / DEFAULT_WEIGHT_GOAL_GRAMS) * 100, 100);
  const isOverGoal = baseWeight > DEFAULT_WEIGHT_GOAL_GRAMS;

  return (
    <div className="space-y-2">
      {/* Total Weight and Base Weight Display (US4) */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total Weight</span>
        <span className="font-medium">{formatWeight(totalWeight)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Base Weight</span>
        <span className={cn('font-medium', isOverGoal && 'text-destructive')}>
          {formatWeight(baseWeight)} / {formatWeight(DEFAULT_WEIGHT_GOAL_GRAMS)}
        </span>
      </div>
      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full transition-all duration-300',
            isOverGoal ? 'bg-destructive' : 'bg-primary'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutHeader({
  loadout,
  totalWeight,
  baseWeight,
  categoryWeights,
  activityTypes,
  seasons,
  onToggleActivity,
  onToggleSeason,
  selectedCategoryId,
  onSegmentClick,
  onEdit,
  onDescriptionChange,
  items = [],
  itemStates = [],
}: LoadoutHeaderProps) {
  // Inline description editing state (FR-014, Constitution Principle I)
  const {
    isEditing,
    editValue,
    startEdit,
    cancelEdit,
    updateValue,
    getValueToSave,
  } = useLoadoutInlineEdit();

  // Handle save description
  const handleSaveDescription = () => {
    if (onDescriptionChange) {
      onDescriptionChange(getValueToSave());
    }
    cancelEdit();
  };

  return (
    <div className="border-b bg-background">
      <div className="container max-w-6xl py-6">
        {/* Back Link */}
        <Link
          href="/loadouts"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Loadouts
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Title, Date, and Badges */}
          <div className="flex-1 space-y-4">
            {/* Title in sans-serif font with edit and share icons (Feature: 009-grand-visual-polish FR-012) */}
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold leading-relaxed">
                {loadout.name}
              </h1>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEdit}
                    className="h-8 w-8 shrink-0"
                    aria-label="Edit loadout metadata"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <LoadoutShareButton
                  loadout={loadout}
                  items={items}
                  itemStates={itemStates}
                  activityTypes={activityTypes}
                  seasons={seasons}
                  variant="ghost"
                  size="icon"
                  showLabel={false}
                />
              </div>
            </div>

            {/* Trip Date */}
            {loadout.tripDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatTripDate(loadout.tripDate)}</span>
              </div>
            )}

            {/* Description with Inline Editing (moved from right side for better flow) */}
            <div className="max-w-lg">
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editValue}
                    onChange={(e) => updateValue(e.target.value)}
                    placeholder="Add a description for this loadout..."
                    className="min-h-[60px] resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveDescription}
                      className="h-8"
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="h-8"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(loadout.description)}
                  className="group w-full rounded-md text-left transition-colors hover:bg-muted/50"
                >
                  {loadout.description ? (
                    <p className="text-sm text-muted-foreground">{loadout.description}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground/60">
                      Click to add a description...
                    </p>
                  )}
                </button>
              )}
            </div>

            {/* Activity Badges - FR-007 */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Activity
              </p>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_OPTIONS.map((activity) => (
                  <ToggleBadge
                    key={activity}
                    label={ACTIVITY_TYPE_LABELS[activity]}
                    pressed={activityTypes.includes(activity)}
                    onPressedChange={() => onToggleActivity(activity)}
                  />
                ))}
              </div>
            </div>

            {/* Activity Matrix - FR-015, FR-016, FR-017, FR-018 */}
            <ActivityMatrix
              selectedActivities={activityTypes}
              className="max-w-xs"
            />

            {/* Season Badges - FR-008 */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Season
              </p>
              <div className="flex flex-wrap gap-2">
                {SEASON_OPTIONS.map((season) => (
                  <ToggleBadge
                    key={season}
                    label={SEASON_LABELS[season]}
                    pressed={seasons.includes(season)}
                    onPressedChange={() => onToggleSeason(season)}
                  />
                ))}
              </div>
            </div>

            {/* Weight Progress Bar - FR-009 (US4: Enhanced with Total/Base) */}
            <div className="max-w-sm">
              <WeightProgressBar totalWeight={totalWeight} baseWeight={baseWeight} />
            </div>
          </div>

          {/* Right: Donut Chart */}
          <div className="hidden lg:flex lg:items-start lg:justify-end">
            {/* Donut Chart with interactive filtering (FR-012) */}
            <WeightDonut
              categoryWeights={categoryWeights}
              size="large"
              selectedCategoryId={selectedCategoryId}
              onSegmentClick={onSegmentClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
