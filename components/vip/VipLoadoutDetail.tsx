'use client';

/**
 * VIP Loadout Detail Component
 *
 * Feature: 052-vip-loadouts
 * Task: T023
 *
 * Full loadout view with items grouped by category,
 * weight breakdown chart, and source attribution.
 */

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Backpack,
  Scale,
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatWeightFromGrams } from '@/lib/utils/weight';
import type { VipLoadoutWithItems, CategoryBreakdown } from '@/types/vip';
import { VipSourceAttribution } from './VipSourceAttribution';

// =============================================================================
// Types
// =============================================================================

interface VipLoadoutDetailProps {
  loadout: VipLoadoutWithItems;
  isBookmarked: boolean;
  onBookmarkToggle?: () => void;
  onCopyToAccount?: () => void;
  isAuthenticated?: boolean;
  isCopying?: boolean;
  isBookmarking?: boolean;
}

// =============================================================================
// Helper Components
// =============================================================================

function WeightBreakdownChart({ breakdown }: { breakdown: CategoryBreakdown[] }) {
  const totalWeight = breakdown.reduce((sum, cat) => sum + cat.weightGrams, 0);

  // Color palette for categories
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-indigo-500',
  ];

  return (
    <div className="space-y-3">
      {/* Visual bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        {breakdown.map((cat, index) => {
          const percentage = totalWeight > 0 ? (cat.weightGrams / totalWeight) * 100 : 0;
          return (
            <div
              key={cat.category}
              className={`${colors[index % colors.length]} transition-all`}
              style={{ width: `${percentage}%` }}
              title={`${cat.category}: ${formatWeightFromGrams(cat.weightGrams, 'g')}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {breakdown.map((cat, index) => (
          <div key={cat.category} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
            <span className="text-muted-foreground truncate">{cat.category}</span>
            <span className="ml-auto font-medium">{formatWeightFromGrams(cat.weightGrams, 'g')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadoutItemsList({ loadout }: { loadout: VipLoadoutWithItems }) {
  // Group items by category
  const itemsByCategory = loadout.items.reduce(
    (acc, item) => {
      const category = item.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, typeof loadout.items>
  );

  return (
    <div className="space-y-6">
      {Object.entries(itemsByCategory).map(([category, items]) => {
        const categoryWeight = items.reduce(
          (sum, item) => sum + item.weightGrams * item.quantity,
          0
        );

        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">{category}</h3>
              <span className="text-sm text-muted-foreground">
                {formatWeightFromGrams(categoryWeight, 'g')}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {item.quantity > 1 && (
                        <span className="text-muted-foreground mr-1">{item.quantity}×</span>
                      )}
                      {item.name}
                    </p>
                    {item.brand && (
                      <p className="text-sm text-muted-foreground">{item.brand}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground ml-4">
                    {formatWeightFromGrams(item.weightGrams * item.quantity, 'g')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function VipLoadoutDetail({
  loadout,
  isBookmarked,
  onBookmarkToggle,
  onCopyToAccount,
  isAuthenticated = false,
  isCopying = false,
  isBookmarking = false,
}: VipLoadoutDetailProps) {
  const locale = useLocale();
  const t = useTranslations('vip');

  const vipProfileUrl = `/${locale}/vip/${loadout.vip.slug}`;

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href={vipProfileUrl}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('loadout.backToProfile', { name: loadout.vip.name })}
      </Link>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{loadout.name}</CardTitle>
              <p className="text-muted-foreground">
                {t('loadout.byVip', { name: loadout.vip.name })}
              </p>
              {/* TODO: Update to use activityTypes/seasons from new schema */}
              {/* Trip Type/Date Range - DEPRECATED fields removed */}
            </div>

            {/* Action Buttons */}
            {isAuthenticated && (
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBookmarkToggle}
                  disabled={isBookmarking}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4 mr-2" />
                  )}
                  {isBookmarked ? t('loadout.bookmarked') : t('loadout.bookmark')}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={onCopyToAccount}
                  disabled={isCopying}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t('loadout.copyToAccount')}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Row */}
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-lg">
                {formatWeightFromGrams(loadout.totalWeightGrams, 'g')}
              </span>
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Backpack className="h-5 w-5" />
              {t('loadout.itemCount', { count: loadout.itemCount })}
            </span>
          </div>

          {/* Description */}
          {loadout.description && (
            <div className="max-h-32 overflow-y-auto text-muted-foreground leading-relaxed">
              {loadout.description}
            </div>
          )}

          <Separator />

          {/* Source Attribution */}
          {/* TODO: Update VipSourceAttribution component to use new schema */}
          {/* eslint-disable @typescript-eslint/no-explicit-any */}
          <VipSourceAttribution
            sourceUrl={(loadout as any).sourceUrl || (loadout as any).source_attribution?.url || ''}
            isSourceAvailable={!!(loadout as any).sourceUrl || !!(loadout as any).source_attribution?.url}
          />
          {/* eslint-enable @typescript-eslint/no-explicit-any */}
        </CardContent>
      </Card>

      {/* Weight Breakdown */}
      {loadout.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('loadout.weightBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightBreakdownChart breakdown={loadout.categoryBreakdown} />
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('loadout.items')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadoutItemsList loadout={loadout} />
        </CardContent>
      </Card>
    </div>
  );
}

export default VipLoadoutDetail;
