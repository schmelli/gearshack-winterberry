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
import { ArrowLeft, Calendar, Pencil, Check, X, Users, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ToggleBadge } from '@/components/ui/toggle-badge';
import { EnhancedWeightDonut } from '@/components/loadouts/EnhancedWeightDonut';
import { WeightSummaryTable } from '@/components/loadouts/WeightSummaryTable';
import { Textarea } from '@/components/ui/textarea';
import { formatTripDate } from '@/lib/loadout-utils';
import { useLoadoutInlineEdit } from '@/hooks/useLoadoutInlineEdit';
import { LoadoutShareButton } from '@/components/loadouts/LoadoutShareButton';
import { CompareToVipButton } from '@/components/loadouts/CompareToVipButton';
import { LoadoutExportMenu } from '@/components/loadouts/LoadoutExportMenu';
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
  /** Callback when edit button is clicked (US5) */
  onEdit?: () => void;
  /** Callback when description is changed inline (FR-014) */
  onDescriptionChange?: (description: string | null) => void;
  /** Whether to show the "Request Community Shakedown" button (only for owner) */
  showShakedownButton?: boolean;
  /** Total weight for export menu */
  totalWeight: number;
  /** Base weight for export menu */
  baseWeight: number;
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
  onEdit,
  onDescriptionChange,
  showShakedownButton = false,
  totalWeight,
  baseWeight,
}: LoadoutHeaderProps) {
  const t = useTranslations('Shakedowns');
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
        {/* Back Link */}
        <Link
          href="/loadouts"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {tLoadouts('backToLoadouts')}
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
                <LoadoutExportMenu
                  loadout={loadout}
                  items={items}
                  itemStates={itemStates}
                  activityTypes={activityTypes}
                  seasons={seasons}
                  totalWeight={totalWeight}
                  baseWeight={baseWeight}
                  iconOnly
                />
                {showShakedownButton && (
                  <>
                    <CompareToVipButton
                      loadoutId={loadout.id}
                      variant="ghost"
                      size="icon"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label={t('actions.requestShakedown')}
                      asChild
                    >
                      <Link href={`/community/shakedowns/new?loadoutId=${loadout.id}`}>
                        <Users className="h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                )}
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

          {/* Right: Enhanced Donut Chart with drill-down */}
          <div className="hidden lg:flex lg:items-start lg:justify-end">
            <EnhancedWeightDonut
              items={items}
              selectedId={selectedCategoryId}
              onSegmentClick={onSegmentClick}
              size={300}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
