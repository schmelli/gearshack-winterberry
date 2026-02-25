/**
 * CategoryBreakdownCard Component
 * Feature 050: AI Assistant - T074
 *
 * Renders inventory category breakdown with weight and item stats.
 * Used in AI chat responses to show inventory analysis.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CategoryBreakdown } from '@/lib/ai-assistant/inventory-analyzer';
import { formatWeight } from '@/lib/ai-assistant/inventory-analyzer';

interface CategoryBreakdownCardProps {
  breakdowns: CategoryBreakdown[];
  locale?: string;
}

export function CategoryBreakdownCard({
  breakdowns,
  locale = 'en',
}: CategoryBreakdownCardProps) {
  const t = useTranslations('aiAssistant.inventory');

  if (breakdowns.length === 0) {
    return null;
  }

  return (
    <Card className="mt-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t('categoryBreakdown')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {breakdowns.slice(0, 5).map((category) => (
          <div
            key={category.categoryId}
            className="flex items-center justify-between p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {category.categoryName}
              </p>
              <p className="text-xs text-muted-foreground">
                {category.itemCount} {category.itemCount === 1 ? t('item') : t('items')}
                {category.heaviestItem && (
                  <span className="ml-2">
                    • {t('heaviest')}: {category.heaviestItem.name}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right ml-3">
              <p className="font-semibold text-sm">
                {formatWeight(category.totalWeight, locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('avg')}: {formatWeight(category.averageWeight, locale)}
              </p>
            </div>
          </div>
        ))}
        {breakdowns.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            {t('showingTopN', { count: 5 })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
