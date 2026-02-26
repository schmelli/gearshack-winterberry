/**
 * GearDetailSpecifications Component
 *
 * Extracted from GearDetailContent.tsx
 * Renders the specifications grid with labeled rows for weight, model,
 * dimensions, size, color, volume, materials, construction, and quantity.
 */

'use client';

import { useTranslations } from 'next-intl';
import { SpecIcon } from '@/components/gear/SpecIcon';
import type { SpecIconType } from '@/components/gear/SpecIcon';
import { formatWeight } from '@/lib/loadout-utils';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

interface GearDetailSpecificationsProps {
  /** The gear item whose specs to display */
  item: GearItem;
}

// =============================================================================
// SpecRow Helper
// =============================================================================

function SpecRow({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string | null | undefined;
  icon?: SpecIconType;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
        {icon && <SpecIcon type={icon} size={14} className="opacity-70" />}
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function GearDetailSpecifications({ item }: GearDetailSpecificationsProps) {
  const t = useTranslations('GearDetail');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
      <SpecRow
        label={t('specLabels.weight')}
        value={item.weightGrams ? formatWeight(item.weightGrams) : null}
        icon="weight"
      />
      <SpecRow label={t('specLabels.model')} value={item.modelNumber} icon="model" />
      {(item.lengthCm || item.widthCm || item.heightCm) && (
        <div className="col-span-2">
          <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
            <SpecIcon type="dimensions" size={14} className="opacity-70" />
            {t('specLabels.dimensions')}
          </p>
          <p className="font-medium">
            {item.lengthCm ?? '\u2013'} \u00d7 {item.widthCm ?? '\u2013'} \u00d7{' '}
            {item.heightCm ?? '\u2013'} cm
          </p>
        </div>
      )}
      <SpecRow label={t('specLabels.size')} value={item.size} icon="size" />
      <SpecRow label={t('specLabels.color')} value={item.color} icon="color" />
      <SpecRow
        label={t('specLabels.volume')}
        value={item.volumeLiters ? `${item.volumeLiters} L` : null}
        icon="volume"
      />
      <SpecRow label={t('specLabels.materials')} value={item.materials} icon="materials" />
      <SpecRow label={t('specLabels.construction')} value={item.tentConstruction} icon="construction" />
      {item.quantity != null && item.quantity > 1 && (
        <SpecRow label={t('specLabels.quantity')} value={`${item.quantity}`} icon="quantity" />
      )}
    </div>
  );
}
