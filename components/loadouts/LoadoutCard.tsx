/**
 * LoadoutCard Component
 *
 * Feature: 005-loadout-management
 * FR-006: Show loadout name, trip date, total weight, and item count
 * FR-009: Enable navigation to the loadout editor when clicking a card
 * FR-025: Delete loadouts with confirmation
 */

'use client';

import Link from 'next/link';
import { Calendar, Package, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteLoadoutDialog } from '@/components/loadouts/DeleteLoadoutDialog';
import { useStore } from '@/hooks/useStore';
import type { Loadout } from '@/types/loadout';
import type { GearItem } from '@/types/gear';
import {
  calculateTotalWeight,
  formatWeight,
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

  return (
    <Link href={`/loadouts/${loadout.id}`}>
      <Card className="group transition-colors hover:border-primary/50 hover:bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="line-clamp-1 text-lg">{loadout.name}</CardTitle>
            <div className="opacity-0 transition-opacity group-hover:opacity-100">
              <DeleteLoadoutDialog
                loadoutName={loadout.name}
                onConfirm={handleDelete}
              />
            </div>
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
                  {loadoutItems.length} {loadoutItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Total Weight */}
              <div className={cn('flex items-center gap-2 text-sm font-medium', weightColorClass)}>
                <Scale className="h-4 w-4" />
                <span>{formatWeight(totalWeight)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
