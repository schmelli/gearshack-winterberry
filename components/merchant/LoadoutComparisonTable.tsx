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
    <div className={cn('overflow-x-auto', className)}>
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
                {/* Category */}
                <TableCell className="font-medium">
                  {diff.categoryName}
                </TableCell>

                {/* Merchant Item */}
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

                {/* User Item */}
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

                {/* Weight Difference */}
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

                {/* Price */}
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
