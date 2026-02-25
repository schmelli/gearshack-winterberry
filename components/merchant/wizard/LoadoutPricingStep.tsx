/**
 * LoadoutPricingStep Component
 *
 * Feature: 053-merchant-integration
 * Task: T036
 *
 * Third step of the loadout creation wizard.
 * Displays pricing summary and allows setting bundle discount.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Percent, DollarSign, Scale, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { LoadoutPricing } from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

export interface LoadoutPricingStepProps {
  /** Calculated pricing */
  pricing: LoadoutPricing;
  /** Current discount value from basics */
  discountPercent: number;
  /** Callback to update discount */
  onUpdateDiscount: (discountPercent: number) => void;
  /** Currency symbol */
  currencySymbol?: string;
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutPricingStep({
  pricing,
  discountPercent,
  onUpdateDiscount,
  currencySymbol = '$',
}: LoadoutPricingStepProps) {
  const t = useTranslations('MerchantLoadouts.wizard.pricing');

  // Format weight for display
  const formatWeight = (grams: number): string => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams} g`;
  };

  return (
    <div className="space-y-6">
      {/* Discount Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4" />
            {t('bundleDiscount')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discount-percent">{t('discountPercent')}</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="discount-slider"
                value={[discountPercent]}
                onValueChange={([value]) => onUpdateDiscount(value)}
                max={50}
                step={1}
                className="flex-1"
              />
              <div className="relative w-20">
                <Input
                  id="discount-percent"
                  type="number"
                  value={discountPercent}
                  onChange={(e) =>
                    onUpdateDiscount(
                      Math.min(100, Math.max(0, Number(e.target.value)))
                    )
                  }
                  min={0}
                  max={100}
                  className="pr-8 text-right"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('discountHelp')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            {t('preview')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Individual Total */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('individualTotal')}</span>
            <span className="font-mono">
              {currencySymbol}
              {pricing.individualTotal.toFixed(2)}
            </span>
          </div>

          {/* Discount Amount */}
          {discountPercent > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {t('savings')} ({discountPercent}%)
              </span>
              <span className="font-mono">
                -{currencySymbol}
                {pricing.discountAmount.toFixed(2)}
              </span>
            </div>
          )}

          <Separator />

          {/* Bundle Price */}
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>{t('bundlePrice')}</span>
            <span className="font-mono text-primary">
              {currencySymbol}
              {pricing.bundlePrice.toFixed(2)}
            </span>
          </div>

          <Separator />

          {/* Total Weight */}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Scale className="h-3 w-3" />
              {t('totalWeight')}
            </span>
            <span className="font-mono">
              {formatWeight(pricing.totalWeightGrams)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tips */}
      <div className="rounded-lg bg-muted/50 p-4">
        <h4 className="font-medium text-sm mb-2">Pricing Tips</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• 10-15% discount is common for starter bundles</li>
          <li>• Higher discounts (20%+) work well for premium complete kits</li>
          <li>• Consider your margins when setting the discount</li>
          <li>• Customers see both individual and bundle prices</li>
        </ul>
      </div>
    </div>
  );
}

export default LoadoutPricingStep;
