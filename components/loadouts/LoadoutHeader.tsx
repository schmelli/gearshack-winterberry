/**
 * LoadoutHeader - Editing section below the hero image
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
 * FR-013: Description positioned in header
 * FR-014: Inline description editing (no modal)
 *
 * Note: Title, back link, and action buttons have moved to LoadoutHeroImage.
 * This component now focuses on interactive editing (badges, description).
 */

'use client';

import { Calendar, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ToggleBadge } from '@/components/ui/toggle-badge';
import { EnhancedWeightDonut } from '@/components/loadouts/EnhancedWeightDonut';
import { WeightSummaryTable } from '@/components/loadouts/WeightSummaryTable';
import { Textarea } from '@/components/ui/textarea';
import { formatTripDate } from '@/lib/loadout-utils';
import { useLoadoutInlineEdit } from '@/hooks/useLoadoutInlineEdit';
import type { Loadout, ActivityType, Season, LoadoutItemState } from '@/types/loadout';
import type { GearItem } from '@/types/gear';
import { ACTIVITY_TYPE_LABELS, SEASON_LABELS } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface LoadoutHeaderProps {
  loadout: Loadout;
  /** Gear items in the loadout */
  items: GearItem[];
  /** Item states (worn/consumable flags) */
  itemStates: LoadoutItemState[];
  activityTypes: ActivityType[];
  seasons: Season[];
  onToggleActivity: (activity: ActivityType) => void;
  onToggleSeason: (season: Season) => void;
  /** Currently selected category for chart highlight */
  selectedCategoryId?: string | null;
  /** Callback when chart segment is clicked (includes level for drill-down) */
  onSegmentClick?: (categoryId: string, level: 'category' | 'subcategory') => void;
  /** Callback when description is changed inline (FR-014) */
  onDescriptionChange?: (description: string | null) => void;
}

// =============================================================================
// Activity Types and Seasons Lists
// =============================================================================

const ACTIVITY_OPTIONS: ActivityType[] = ['hiking', 'camping', 'backpacking', 'climbing', 'skiing'];
const SEASON_OPTIONS: Season[] = ['spring', 'summer', 'fall', 'winter'];

// =============================================================================
// Component
// =============================================================================

export function LoadoutHeader({
  loadout,
  items,
  itemStates,
  activityTypes,
  seasons,
  onToggleActivity,
  onToggleSeason,
  selectedCategoryId,
  onSegmentClick,
  onDescriptionChange,
}: LoadoutHeaderProps) {
  const tLoadouts = useTranslations('Loadouts');
  const tCommon = useTranslations('Common');
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
        <div className="flex flex-col gap-6">
          {/* Main content row: stacks on mobile, side-by-side on md+ */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Left: Description, Date, and Badges */}
            <div className="flex-1 space-y-4">
            {/* Trip Date */}
            {loadout.tripDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatTripDate(loadout.tripDate)}</span>
              </div>
            )}

            {/* Description with Inline Editing */}
            <div className="max-w-lg">
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editValue}
                    onChange={(e) => updateValue(e.target.value)}
                    placeholder={tLoadouts('addDescription')}
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
                      {tCommon('save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="h-8"
                    >
                      <X className="mr-1 h-3 w-3" />
                      {tCommon('cancel')}
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
                      {tLoadouts('clickToAddDescription')}
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

            {/* Weight Summary Table (LighterPack style) */}
            <WeightSummaryTable
              items={items}
              itemStates={itemStates}
              className="max-w-sm"
            />
          </div>

            {/* Right: Enhanced Donut Chart - visible on md+ beside content */}
            <div className="hidden shrink-0 md:flex md:items-start md:justify-end">
              <EnhancedWeightDonut
                items={items}
                selectedId={selectedCategoryId}
                onSegmentClick={onSegmentClick}
                size={260}
              />
            </div>
          </div>

          {/* Mobile: Donut Chart below content, centered */}
          <div className="flex justify-center md:hidden">
            <EnhancedWeightDonut
              items={items}
              selectedId={selectedCategoryId}
              onSegmentClick={onSegmentClick}
              size={220}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
