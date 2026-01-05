/**
 * LoadoutCard Component
 *
 * Feature: 005-loadout-management
 * FR-006: Show loadout name, trip date, total weight, and item count
 * FR-009: Enable navigation to the loadout editor when clicking a card
 * FR-025: Delete loadouts with confirmation
 */

'use client';

import { Link } from '@/i18n/navigation';
import { Calendar, Package, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteLoadoutDialog } from '@/components/loadouts/DeleteLoadoutDialog';
import { useStore } from '@/hooks/useSupabaseStore';
import { WeightDisplay } from '@/components/ui/weight-display';
import type { Loadout } from '@/types/loadout';
import type { GearItem } from '@/types/gear';
import {
  calculateTotalWeight,
  formatTripDate,
  getWeightCategory,
  getWeightCategoryColor,
} from '@/lib/loadout-utils';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface LoadoutCardProps {
  loadout: Loadout;
  items: GearItem[];
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutCard({ loadout, items }: LoadoutCardProps) {
  const t = useTranslations('Loadouts');
  const deleteLoadout = useStore((state) => state.deleteLoadout);

  // FR-004: Guard against invalid loadout IDs (e.g., hex colors, malformed data)
  if (!loadout.id || !/^[a-zA-Z0-9_-]{10,}$/.test(loadout.id)) {
    console.warn('[LoadoutCard] Invalid loadout ID, skipping render:', loadout.id);
    return null;
  }

  // Get items for this loadout
  const loadoutItems = items.filter((item) => loadout.itemIds.includes(item.id));
  const totalWeight = calculateTotalWeight(loadoutItems);
  const weightCategory = getWeightCategory(totalWeight);
  const weightColorClass = getWeightCategoryColor(weightCategory);

  const handleDelete = async () => {
    await deleteLoadout(loadout.id);
  };

  // Structure note: The delete dialog is placed OUTSIDE the Link to prevent
  // navigation events when the dialog closes during deletion (fixes 404 bug).
  return (
    <div className="group relative">
      <Link href={`/loadouts/${loadout.id}`}>
        <Card className="transition-colors hover:border-primary/50 hover:bg-muted/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="line-clamp-1 text-lg pr-8">{loadout.name}</CardTitle>
              {/* Spacer for delete button positioning */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {/* Trip Date */}
              {loadout.tripDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatTripDate(loadout.tripDate)}</span>
                </div>
              )}

              {/* Stats Row */}
              <div className="flex items-center gap-4">
                {/* Item Count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>
                    {t('itemCount', { count: loadoutItems.length })}
                  </span>
                </div>

                {/* Total Weight */}
                <div className={cn('flex items-center gap-2 text-sm font-medium', weightColorClass)}>
                  <Scale className="h-4 w-4" />
                  <WeightDisplay value={totalWeight} showToggle />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      {/* Delete button positioned absolutely OUTSIDE the Link to prevent navigation during deletion */}
      <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
        <DeleteLoadoutDialog
          loadoutName={loadout.name}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
