/**
 * WeightSummaryTable Component
 *
 * Feature: loadout-ux-enhancements
 * LighterPack-style weight summary showing:
 * - Total weight
 * - Worn weight (excluded from base)
 * - Consumable weight (excluded from base)
 * - Base weight (Total - Worn - Consumable)
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { WeightDisplay } from '@/components/ui/weight-display';
import type { GearItem } from '@/types/gear';
import type { LoadoutItemState } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface WeightSummaryTableProps {
  items: GearItem[];
  itemStates: LoadoutItemState[];
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function WeightSummaryTable({
  items,
  itemStates,
  className,
}: WeightSummaryTableProps) {
  const t = useTranslations('Loadouts');

  // Calculate weight breakdown
  const weightSummary = useMemo(() => {
    // Create Map for O(1) lookup instead of O(M) find() calls
    const itemStateMap = new Map(itemStates.map(s => [s.itemId, s]));

    let totalWeight = 0;
    let wornWeight = 0;
    let consumableWeight = 0;
    const excludedItemIds = new Set<string>();

    // First pass: calculate total and identify excluded items
    for (const item of items) {
      const weight = item.weightGrams ?? 0;
      totalWeight += weight;

      const state = itemStateMap.get(item.id);
      if (state?.isWorn) {
        wornWeight += weight;
        excludedItemIds.add(item.id);
      }
      if (state?.isConsumable) {
        consumableWeight += weight;
        excludedItemIds.add(item.id);
      }
    }

    // Calculate excluded weight (items that are either worn OR consumable, not double-counted)
    const excludedWeight = items
      .filter(item => excludedItemIds.has(item.id))
      .reduce((sum, item) => sum + (item.weightGrams ?? 0), 0);

    // Base weight = Total - Excluded (worn + consumable, without double-counting)
    const baseWeight = totalWeight - excludedWeight;

    return {
      totalWeight,
      wornWeight,
      consumableWeight,
      baseWeight,
    };
  }, [items, itemStates]);

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Desktop: Table */}
      <table className="hidden md:table w-full text-sm">
        <tbody>
          {/* Total */}
          <tr className="border-b">
            <td className="px-4 py-2.5 font-medium">{t('weightSummary.total')}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">
              <WeightDisplay value={weightSummary.totalWeight} showToggle />
            </td>
          </tr>

          {/* Worn */}
          <tr className="border-b bg-muted/30">
            <td className="px-4 py-2 text-muted-foreground">{t('weightSummary.worn')}</td>
            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
              − <WeightDisplay value={weightSummary.wornWeight} />
            </td>
          </tr>

          {/* Consumable */}
          <tr className="border-b bg-muted/30">
            <td className="px-4 py-2 text-muted-foreground">{t('weightSummary.consumable')}</td>
            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
              − <WeightDisplay value={weightSummary.consumableWeight} />
            </td>
          </tr>

          {/* Base Weight */}
          <tr className="bg-primary/5">
            <td className="px-4 py-2.5 font-semibold text-primary">{t('weightSummary.baseWeight')}</td>
            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary">
              <WeightDisplay value={weightSummary.baseWeight} showToggle />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Mobile: Stacked Weight Cards */}
      <div className="space-y-0 md:hidden text-sm">
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <span className="font-medium">{t('weightSummary.total')}</span>
          <span className="tabular-nums">
            <WeightDisplay value={weightSummary.totalWeight} showToggle />
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-muted-foreground">{t('weightSummary.worn')}</span>
          <span className="tabular-nums text-muted-foreground">
            − <WeightDisplay value={weightSummary.wornWeight} />
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-muted-foreground">{t('weightSummary.consumable')}</span>
          <span className="tabular-nums text-muted-foreground">
            − <WeightDisplay value={weightSummary.consumableWeight} />
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5">
          <span className="font-semibold text-primary">{t('weightSummary.baseWeight')}</span>
          <span className="tabular-nums font-semibold text-primary">
            <WeightDisplay value={weightSummary.baseWeight} showToggle />
          </span>
        </div>
      </div>
    </div>
  );
}
