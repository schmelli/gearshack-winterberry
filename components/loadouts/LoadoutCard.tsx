/**
 * LoadoutCard Component
 *
 * Feature: 005-loadout-management, 048-ai-loadout-image-gen
 * FR-006: Show loadout name, trip date, total weight, and item count
 * FR-009: Enable navigation to the loadout editor when clicking a card
 * FR-025: Delete loadouts with confirmation
 * Feature 048: Display AI-generated hero image as card background
 */

'use client';

import Image from 'next/image';
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

  // Check if loadout has a hero image
  const hasHeroImage = !!loadout.heroImageUrl;

  // Structure note: The delete dialog is placed OUTSIDE the Link to prevent
  // navigation events when the dialog closes during deletion (fixes 404 bug).
  return (
    <div className="group relative">
      <Link href={`/loadouts/${loadout.id}`}>
        <Card className={cn(
          'relative overflow-hidden transition-all hover:border-primary/50',
          hasHeroImage ? 'min-h-[200px]' : 'hover:bg-muted/50'
        )}>
          {/* Hero Image Background (Feature 048) */}
          {hasHeroImage && (
            <>
              <Image
                src={loadout.heroImageUrl!}
                alt={`${loadout.name} hero image`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </>
          )}

          <CardHeader className={cn('pb-3', hasHeroImage && 'relative z-10')}>
            <div className="flex items-start justify-between">
              <CardTitle className={cn(
                'line-clamp-1 text-lg pr-8',
                hasHeroImage && 'text-white drop-shadow-lg'
              )}>
                {loadout.name}
              </CardTitle>
              {/* Spacer for delete button positioning */}
            </div>
          </CardHeader>
          <CardContent className={cn(hasHeroImage && 'relative z-10 mt-auto')}>
            <div className="flex flex-col gap-3">
              {/* Trip Date */}
              {loadout.tripDate && (
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  hasHeroImage ? 'text-white/90' : 'text-muted-foreground'
                )}>
                  <Calendar className="h-4 w-4" />
                  <span>{formatTripDate(loadout.tripDate)}</span>
                </div>
              )}

              {/* Stats Row */}
              <div className="flex items-center gap-4">
                {/* Item Count */}
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  hasHeroImage ? 'text-white/90' : 'text-muted-foreground'
                )}>
                  <Package className="h-4 w-4" />
                  <span>
                    {t('itemCount', { count: loadoutItems.length })}
                  </span>
                </div>

                {/* Total Weight */}
                <div className={cn(
                  'flex items-center gap-2 text-sm font-medium',
                  hasHeroImage ? 'text-white' : weightColorClass
                )}>
                  <Scale className="h-4 w-4" />
                  <WeightDisplay value={totalWeight} showToggle />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      {/* Delete button positioned absolutely OUTSIDE the Link to prevent navigation during deletion */}
      <div className={cn(
        'absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100',
        hasHeroImage && 'z-20'
      )}>
        <DeleteLoadoutDialog
          loadoutName={loadout.name}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
