/**
 * LoadoutComparisonModal Component
 *
 * Feature: 053-merchant-integration
 * Task: T077
 *
 * Modal for comparing merchant loadout with user's loadouts.
 */

'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadoutComparisonTable } from './LoadoutComparisonTable';
import { useLoadoutComparison } from '@/hooks/merchant/useLoadoutComparison';
import { Scale, Package, DollarSign, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface LoadoutComparisonModalProps {
  merchantLoadoutId: string;
  open: boolean;
  onClose: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutComparisonModal({
  merchantLoadoutId,
  open,
  onClose,
}: LoadoutComparisonModalProps) {
  const t = useTranslations('LoadoutComparison');

  const {
    merchantLoadout,
    userLoadout,
    differences,
    userLoadoutOptions,
    isLoading,
    isLoadingOptions,
    error,
    loadMerchantLoadout,
    selectUserLoadout,
    fetchUserLoadoutOptions,
    clearComparison,
  } = useLoadoutComparison();

  // Load merchant loadout and user options when modal opens
  useEffect(() => {
    if (open && merchantLoadoutId) {
      loadMerchantLoadout(merchantLoadoutId);
      fetchUserLoadoutOptions();
    }
  }, [open, merchantLoadoutId, loadMerchantLoadout, fetchUserLoadoutOptions]);

  // Clear on close
  const handleClose = () => {
    clearComparison();
    onClose();
  };

  // Calculate summary stats
  const weightDiff =
    merchantLoadout && userLoadout
      ? merchantLoadout.totalWeightGrams - userLoadout.totalWeightGrams
      : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="p-4 text-center text-destructive">{error}</div>
        ) : (
          <div className="space-y-6">
            {/* Loadout Selection */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Merchant Loadout Card */}
              <Card>
                <CardContent className="p-4">
                  {isLoading && !merchantLoadout ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : merchantLoadout ? (
                    <div className="space-y-3">
                      <div>
                        <Badge variant="secondary" className="mb-2">
                          {t('merchantLoadout')}
                        </Badge>
                        <h3 className="font-semibold">{merchantLoadout.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {merchantLoadout.ownerName}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                        <div>
                          <Scale className="h-4 w-4 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {formatWeight(merchantLoadout.totalWeightGrams)}
                          </p>
                        </div>
                        <div>
                          <Package className="h-4 w-4 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {merchantLoadout.itemCount} {t('items')}
                          </p>
                        </div>
                        <div>
                          <DollarSign className="h-4 w-4 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {formatCurrency(merchantLoadout.bundlePrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* User Loadout Selection */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {t('yourLoadout')}
                      </Badge>
                      {isLoadingOptions ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Select
                          value={userLoadout?.id ?? ''}
                          onValueChange={selectUserLoadout}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectLoadout')} />
                          </SelectTrigger>
                          <SelectContent>
                            {userLoadoutOptions.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                {t('noLoadouts')}
                              </div>
                            ) : (
                              userLoadoutOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  <div className="flex items-center justify-between gap-4">
                                    <span>{option.name}</span>
                                    <span className="text-muted-foreground text-xs">
                                      {option.itemCount} {t('items')}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {userLoadout && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                        <div>
                          <Scale className="h-4 w-4 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {formatWeight(userLoadout.totalWeightGrams)}
                          </p>
                        </div>
                        <div>
                          <Package className="h-4 w-4 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {userLoadout.itemCount} {t('items')}
                          </p>
                        </div>
                        <div>
                          <DollarSign className="h-4 w-4 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium">-</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            {merchantLoadout && userLoadout && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        {t('weightDifference')}
                      </p>
                      <p
                        className={cn(
                          'text-lg font-bold',
                          weightDiff && weightDiff > 0
                            ? 'text-red-600'
                            : weightDiff && weightDiff < 0
                              ? 'text-green-600'
                              : ''
                        )}
                      >
                        {weightDiff !== null
                          ? `${weightDiff > 0 ? '+' : ''}${formatWeight(weightDiff)}`
                          : '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        {t('itemDifference')}
                      </p>
                      <p className="text-lg font-bold">
                        {merchantLoadout.itemCount - userLoadout.itemCount > 0
                          ? '+'
                          : ''}
                        {merchantLoadout.itemCount - userLoadout.itemCount}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        {t('bundlePrice')}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(merchantLoadout.bundlePrice)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comparison Table */}
            {userLoadout && (
              <LoadoutComparisonTable
                differences={differences}
                merchantName={merchantLoadout?.ownerName ?? t('merchant')}
                userName={t('you')}
              />
            )}

            {/* No Selection Message */}
            {!userLoadout && merchantLoadout && (
              <div className="p-8 text-center text-muted-foreground border rounded-lg">
                {t('selectToCompare')}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
