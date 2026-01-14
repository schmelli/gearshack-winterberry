/**
 * ManufacturerPriceSection Component
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Display manufacturer price, shipping, and product link for wishlist items
 *
 * Constitution: UI components must be stateless - all logic in hooks
 */

'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MsrpPriceDisplay } from '@/components/wishlist/MsrpPriceDisplay';

// =============================================================================
// Types
// =============================================================================

interface ManufacturerPriceSectionProps {
  /** Manufacturer price amount */
  manufacturerPrice: number | null | undefined;
  /** Currency for manufacturer price */
  manufacturerCurrency: string | null | undefined;
  /** Shipping cost (if available) */
  shippingCost?: number | null;
  /** Product URL on manufacturer's website */
  productUrl: string | null | undefined;
  /** Brand URL as fallback */
  brandUrl?: string | null;
  /** MSRP from catalog (fallback if no manufacturer price) */
  msrpAmount?: number | null;
  /** Whether MSRP is loading */
  msrpLoading?: boolean;
}

// =============================================================================
// Main Component
// =============================================================================

export function ManufacturerPriceSection({
  manufacturerPrice,
  manufacturerCurrency,
  shippingCost,
  productUrl,
  brandUrl,
  msrpAmount,
  msrpLoading = false,
}: ManufacturerPriceSectionProps) {
  const t = useTranslations('ManufacturerPrice');

  // Determine if we have any price to show
  const hasManufacturerPrice = manufacturerPrice != null;
  const hasMsrp = msrpAmount != null;
  const hasAnyPrice = hasManufacturerPrice || hasMsrp;
  const hasLink = productUrl || brandUrl;

  // If no data at all, show empty state
  if (!hasAnyPrice && !hasLink && !msrpLoading) {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          {t('title')}
        </h3>
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              {t('noData')}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <TrendingDown className="h-4 w-4" />
        {t('title')}
      </h3>
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Manufacturer Price */}
          {hasManufacturerPrice && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{t('price')}</span>
              <span className="text-lg font-semibold text-primary">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: manufacturerCurrency ?? 'EUR',
                }).format(manufacturerPrice!)}
              </span>
            </div>
          )}

          {/* MSRP fallback */}
          {!hasManufacturerPrice && (hasMsrp || msrpLoading) && (
            <MsrpPriceDisplay
              msrpAmount={msrpAmount ?? null}
              isLoading={msrpLoading}
              variant="inline"
            />
          )}

          {/* Shipping Cost */}
          {shippingCost != null && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{t('shipping')}</span>
              <span className="text-sm font-medium">
                {shippingCost === 0
                  ? t('freeShipping')
                  : new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: manufacturerCurrency ?? 'EUR',
                    }).format(shippingCost)}
              </span>
            </div>
          )}

          {/* Product Link */}
          {hasLink && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              asChild
            >
              <a
                href={productUrl || brandUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('viewOnManufacturer')}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
