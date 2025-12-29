'use client';

/**
 * VIP Comparison View Component
 *
 * Feature: 052-vip-loadouts
 * Task: T066
 *
 * Side-by-side loadout comparison with weight differences.
 */

import { useTranslations } from 'next-intl';
import { Scale, ArrowUp, ArrowDown, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatWeight } from '@/lib/utils/weight';
import type { LoadoutComparison } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipComparisonViewProps {
  comparison: LoadoutComparison;
  onAddToWishlist?: (itemName: string) => void;
}

// =============================================================================
// Helper Components
// =============================================================================

function WeightDifference({ grams }: { grams: number }) {
  const t = useTranslations('vip.compare');

  if (grams === 0) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        {t('same')}
      </span>
    );
  }

  const isLighter = grams < 0;
  const absWeight = Math.abs(grams);

  return (
    <span
      className={`flex items-center gap-1 ${
        isLighter ? 'text-green-600' : 'text-amber-600'
      }`}
    >
      {isLighter ? (
        <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUp className="h-4 w-4" />
      )}
      {isLighter
        ? t('lighter', { weight: formatWeight(absWeight) })
        : t('heavier', { weight: formatWeight(absWeight) })}
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

export function VipComparisonView({
  comparison,
  onAddToWishlist,
}: VipComparisonViewProps) {
  const t = useTranslations('vip.compare');

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {t('comparison')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {/* User Loadout */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t('yourLoadout')}</p>
              <p className="text-lg font-semibold">{comparison.userLoadout.name}</p>
              <p className="text-2xl font-bold text-primary">
                {formatWeight(comparison.userLoadout.totalWeightGrams)}
              </p>
            </div>

            {/* Difference */}
            <div className="p-4 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('weightDifference')}
                </p>
                <WeightDifference grams={comparison.weightDifferenceGrams} />
              </div>
            </div>

            {/* VIP Loadout */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t('vipLoadout')}</p>
              <p className="text-lg font-semibold">
                {comparison.vipLoadout.vipName}&apos;s {comparison.vipLoadout.name}
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatWeight(comparison.vipLoadout.totalWeightGrams)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t('categoryBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparison.categoryComparison.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="font-medium">{cat.category}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-20 text-right">
                    {formatWeight(cat.userWeightGrams)}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="w-20">
                    {formatWeight(cat.vipWeightGrams)}
                  </span>
                  <span
                    className={`w-24 text-right ${
                      cat.differenceGrams < 0
                        ? 'text-green-600'
                        : cat.differenceGrams > 0
                          ? 'text-amber-600'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {cat.differenceGrams === 0
                      ? '—'
                      : `${cat.differenceGrams > 0 ? '+' : ''}${formatWeight(cat.differenceGrams)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items Unique to VIP */}
      {comparison.uniqueToVip.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('uniqueToVip')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.uniqueToVip.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <div className="flex gap-2 mt-1">
                      {item.brand && (
                        <Badge variant="outline" className="text-xs">
                          {item.brand}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatWeight(item.weightGrams)}
                    </span>
                    {onAddToWishlist && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddToWishlist(item.name)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t('addToWishlist')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Items */}
      {comparison.commonItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('commonItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.commonItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.brand && (
                      <p className="text-sm text-muted-foreground">{item.brand}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{formatWeight(item.userWeightGrams)}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span>{formatWeight(item.vipWeightGrams)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Unique to User */}
      {comparison.uniqueToUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('uniqueToYou')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.uniqueToUser.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <div className="flex gap-2 mt-1">
                      {item.brand && (
                        <Badge variant="outline" className="text-xs">
                          {item.brand}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatWeight(item.weightGrams)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default VipComparisonView;
