/**
 * GearDetailPurchaseInfo Component
 *
 * Extracted from GearDetailContent.tsx
 * Displays purchase information: price paid, retailer, and purchase date.
 */

'use client';

import { useTranslations } from 'next-intl';

// =============================================================================
// Types
// =============================================================================

interface GearDetailPurchaseInfoProps {
  /** Price paid for the item */
  pricePaid?: number | null;
  /** Currency code (e.g., 'USD', 'EUR') */
  currency?: string | null;
  /** Retailer name */
  retailer?: string | null;
  /** Purchase date (Date object or ISO string) */
  purchaseDate?: Date | string | null;
}

// =============================================================================
// Component
// =============================================================================

export function GearDetailPurchaseInfo({
  pricePaid,
  currency,
  retailer,
  purchaseDate,
}: GearDetailPurchaseInfoProps) {
  const t = useTranslations('GearDetail');

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {pricePaid != null && (
        <span className="font-medium">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency ?? 'USD',
          }).format(pricePaid)}
        </span>
      )}
      {retailer && (
        <span className="text-muted-foreground">
          {t('purchaseInfo.from')} {retailer}
        </span>
      )}
      {purchaseDate && (
        <span className="text-muted-foreground">
          {new Date(purchaseDate).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
