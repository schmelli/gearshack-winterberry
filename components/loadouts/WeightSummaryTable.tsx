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
import { formatWeight } from '@/lib/loadout-utils';
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
      <table className="w-full text-sm">
        <tbody>
          {/* Total */}
          <tr className="border-b">
            <td className="px-4 py-2.5 font-medium">{t('weightSummary.total')}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">
              {formatWeight(weightSummary.totalWeight)}
            </td>
          </tr>

          {/* Worn */}
          <tr className="border-b bg-muted/30">
            <td className="px-4 py-2 text-muted-foreground">{t('weightSummary.worn')}</td>
            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
              − {formatWeight(weightSummary.wornWeight)}
            </td>
          </tr>

          {/* Consumable */}
          <tr className="border-b bg-muted/30">
            <td className="px-4 py-2 text-muted-foreground">{t('weightSummary.consumable')}</td>
            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
              − {formatWeight(weightSummary.consumableWeight)}
            </td>
          </tr>

          {/* Base Weight */}
          <tr className="bg-primary/5">
            <td className="px-4 py-2.5 font-semibold text-primary">{t('weightSummary.baseWeight')}</td>
            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary">
              {formatWeight(weightSummary.baseWeight)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
