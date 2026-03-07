/**
 * LoadoutComparisonTable Component
 *
 * Feature: 053-merchant-integration
 * Task: T078
 *
 * Side-by-side comparison table showing weight, price, and item differences.
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ComparisonItem {
  name: string;
  brand: string | null;
  price?: number;
  weightGrams?: number | null;
}

interface ComparisonDifference {
  categoryId: string;
  categoryName: string;
  merchantItem: ComparisonItem | null;
  userItem: {
    name: string;
    brand: string | null;
  } | null;
  priceDiff: number | null;
  weightDiff: number | null;
}

export interface LoadoutComparisonTableProps {
  differences: ComparisonDifference[];
  merchantName: string;
  userName: string;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatWeight(grams: number | null | undefined): string {
  if (!grams) return '-';
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutComparisonTable({
  differences,
  merchantName,
  userName,
  className,
}: LoadoutComparisonTableProps) {
  const t = useTranslations('LoadoutComparison');

  if (differences.length === 0) {
    return (
      <div className={cn('p-8 text-center text-muted-foreground', className)}>
        {t('noItemsToCompare')}
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {/* Desktop: Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">{t('category')}</TableHead>
              <TableHead>{merchantName}</TableHead>
              <TableHead>{userName}</TableHead>
              <TableHead className="text-right w-[100px]">{t('weight')}</TableHead>
              <TableHead className="text-right w-[100px]">{t('price')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {differences.map((diff) => {
              const merchantOnly = diff.merchantItem && !diff.userItem;
              const userOnly = !diff.merchantItem && diff.userItem;

              return (
                <TableRow
                  key={diff.categoryId}
                  className={cn(
                    merchantOnly && 'bg-green-50 dark:bg-green-950/20',
                    userOnly && 'bg-amber-50 dark:bg-amber-950/20'
                  )}
                >
                  <TableCell className="font-medium">
                    {diff.categoryName}
                  </TableCell>
                  <TableCell>
                    {diff.merchantItem ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {diff.merchantItem.name}
                        </p>
                        {diff.merchantItem.brand && (
                          <p className="text-xs text-muted-foreground">
                            {diff.merchantItem.brand}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {t('notIncluded')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {diff.userItem ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{diff.userItem.name}</p>
                        {diff.userItem.brand && (
                          <p className="text-xs text-muted-foreground">
                            {diff.userItem.brand}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {t('notIncluded')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {diff.weightDiff !== null ? (
                      <div className="flex items-center justify-end gap-1">
                        {diff.weightDiff > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <ArrowUp className="h-3 w-3" />
                            +{formatWeight(diff.weightDiff)}
                          </Badge>
                        ) : diff.weightDiff < 0 ? (
                          <Badge variant="default" className="gap-1 bg-green-600">
                            <ArrowDown className="h-3 w-3" />
                            {formatWeight(Math.abs(diff.weightDiff))}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Minus className="h-3 w-3" />
                            {t('same')}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {diff.priceDiff !== null ? (
                      <span className="font-medium">
                        {formatCurrency(diff.priceDiff)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Stacked Comparison Cards */}
      <div className="space-y-3 md:hidden">
        {differences.map((diff) => {
          const merchantOnly = diff.merchantItem && !diff.userItem;
          const userOnly = !diff.merchantItem && diff.userItem;

          return (
            <Card
              key={diff.categoryId}
              className={cn(
                'p-4',
                merchantOnly && 'border-green-200 dark:border-green-800',
                userOnly && 'border-amber-200 dark:border-amber-800'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{diff.categoryName}</span>
                <div className="flex items-center gap-2">
                  {diff.weightDiff !== null && (
                    diff.weightDiff > 0 ? (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <ArrowUp className="h-3 w-3" />
                        +{formatWeight(diff.weightDiff)}
                      </Badge>
                    ) : diff.weightDiff < 0 ? (
                      <Badge variant="default" className="gap-1 text-xs bg-green-600">
                        <ArrowDown className="h-3 w-3" />
                        {formatWeight(Math.abs(diff.weightDiff))}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Minus className="h-3 w-3" />
                        {t('same')}
                      </Badge>
                    )
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{merchantName}</span>
                  <span>
                    {diff.merchantItem ? (
                      <span>
                        {diff.merchantItem.name}
                        {diff.merchantItem.brand && (
                          <span className="text-muted-foreground"> ({diff.merchantItem.brand})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {t('notIncluded')}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{userName}</span>
                  <span>
                    {diff.userItem ? (
                      <span>
                        {diff.userItem.name}
                        {diff.userItem.brand && (
                          <span className="text-muted-foreground"> ({diff.userItem.brand})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {t('notIncluded')}
                      </span>
                    )}
                  </span>
                </div>
                {diff.priceDiff !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('price')}</span>
                    <span className="font-medium">{formatCurrency(diff.priceDiff)}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-100 dark:bg-green-950" />
          <span>{t('legendMerchantOnly')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-950" />
          <span>{t('legendUserOnly')}</span>
        </div>
      </div>
    </div>
  );
}
