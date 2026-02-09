/**
 * ComparisonMatrix Component
 *
 * Feature: Shakedown Detail Enhancement - Side-by-Side Gear Comparison
 *
 * Displays a comparison table for selected gear items with winner highlighting.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Crown, X, Package, ArrowRight, Lightbulb, Scale } from 'lucide-react';

import type {
  ComparisonItem,
  ComparisonCriterion,
  SuggestedSwap,
} from '@/hooks/shakedowns/useGearComparison';
import { cn } from '@/lib/utils';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// =============================================================================
// Types
// =============================================================================

interface ComparisonMatrixProps {
  /** Items being compared */
  items: ComparisonItem[];
  /** Comparison criteria with values and winners */
  criteria: ComparisonCriterion[];
  /** Swap suggestions */
  suggestedSwaps: SuggestedSwap[];
  /** Callback to remove an item from comparison */
  onRemoveItem: (itemId: string) => void;
  /** Callback to swap an item */
  onSwapItem?: (currentId: string, newItem: ComparisonItem) => void;
  /** Callback to close comparison */
  onClose: () => void;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatValue(value: string | number | null, unit?: string): string {
  if (value === null) return '—';
  if (typeof value === 'number') {
    if (unit === 'g' && value >= 1000) {
      return `${(value / 1000).toFixed(2)} kg`;
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  }
  return value;
}

// =============================================================================
// Component
// =============================================================================

export function ComparisonMatrix({
  items,
  criteria,
  suggestedSwaps,
  onRemoveItem,
  onSwapItem: _onSwapItem,
  onClose,
  className,
}: ComparisonMatrixProps): React.ReactElement {
  const t = useTranslations('Shakedowns.comparison');

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Package className="size-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">{t('noItems')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="size-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('subtitle', { count: items.length })}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Item Headers */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
          {items.map((item, _index) => (
            <div
              key={item.id}
              className="relative p-3 rounded-lg bg-muted/30 border text-center"
            >
              {/* Remove button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-2 -right-2 size-6 rounded-full p-0"
                onClick={() => onRemoveItem(item.id)}
              >
                <X className="size-3" />
              </Button>

              {/* Item avatar */}
              <Avatar className="size-12 mx-auto mb-2">
                {item.imageUrl ? (
                  <AvatarImage src={item.imageUrl} alt={item.name} className="object-cover" />
                ) : null}
                <AvatarFallback>
                  <Package className="size-5" />
                </AvatarFallback>
              </Avatar>

              {/* Item name */}
              <p className="text-sm font-medium truncate">{item.name}</p>
              {item.brand && (
                <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Comparison Table */}
        {criteria.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t('criterion')}</TableHead>
                  {items.map((item) => (
                    <TableHead key={item.id} className="text-center">
                      <span className="sr-only">{item.name}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.map((criterion) => (
                  <TableRow key={criterion.key}>
                    <TableCell className="font-medium text-sm">
                      {t(`criteria.${criterion.key}`, { defaultValue: criterion.label })}
                    </TableCell>
                    {criterion.values.map((value, index) => {
                      const isWinner = criterion.winner === index;
                      return (
                        <TableCell
                          key={index}
                          className={cn(
                            'text-center',
                            isWinner && 'bg-emerald-50 dark:bg-emerald-900/20'
                          )}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isWinner && (
                              <Crown className="size-3 text-emerald-600 dark:text-emerald-400" />
                            )}
                            <span
                              className={cn(
                                'text-sm',
                                isWinner && 'font-semibold text-emerald-700 dark:text-emerald-300'
                              )}
                            >
                              {formatValue(value, criterion.unit)}
                            </span>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('selectMoreItems')}
          </p>
        )}

        {/* Swap Suggestions */}
        {suggestedSwaps.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                {t('suggestions.title')}
              </h4>
              <div className="space-y-2">
                {suggestedSwaps.map((swap, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                  >
                    {/* Current item */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="size-8 shrink-0">
                        {swap.currentItem.imageUrl ? (
                          <AvatarImage src={swap.currentItem.imageUrl} />
                        ) : null}
                        <AvatarFallback>
                          <Package className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{swap.currentItem.name}</span>
                    </div>

                    <ArrowRight className="size-4 text-muted-foreground shrink-0" />

                    {/* Suggested item */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="size-8 shrink-0">
                        {swap.suggestedItem.imageUrl ? (
                          <AvatarImage src={swap.suggestedItem.imageUrl} />
                        ) : null}
                        <AvatarFallback>
                          <Package className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{swap.suggestedItem.name}</span>
                    </div>

                    {/* Savings badge */}
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      -{swap.weightSavings}g
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ComparisonMatrix;
