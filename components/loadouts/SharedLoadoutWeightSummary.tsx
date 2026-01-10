/**
 * SharedLoadoutWeightSummary Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Extracted from: VirtualGearShakedown.tsx
 *
 * Displays weight breakdown for shared loadouts.
 */

import { useTranslations } from 'next-intl';
import { formatWeight } from '@/lib/loadout-utils';

interface WeightSummary {
  totalWeight: number;
  baseWeight: number;
  wornWeight: number;
  consumableWeight: number;
}

interface SharedLoadoutWeightSummaryProps {
  weightSummary: WeightSummary;
  className?: string;
}

export function SharedLoadoutWeightSummary({
  weightSummary,
  className,
}: SharedLoadoutWeightSummaryProps): React.ReactElement {
  const tShared = useTranslations('SharedLoadout');

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tShared('totalWeight')}</p>
          <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.totalWeight)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tShared('baseWeight')}</p>
          <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.baseWeight)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tShared('worn')}</p>
          <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.wornWeight)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tShared('consumables')}</p>
          <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.consumableWeight)}</p>
        </div>
      </div>
    </div>
  );
}

export default SharedLoadoutWeightSummary;
