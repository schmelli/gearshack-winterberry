/**
 * MerchantBillingClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T071
 *
 * Client component for merchant billing page.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useMerchantProfile, useMerchantBilling } from '@/hooks/merchant';
import { BillingOverview } from '@/components/merchant/BillingOverview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, RefreshCw, AlertCircle, Download, Receipt } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

// =============================================================================
// Component
// =============================================================================

export function MerchantBillingClient() {
  const t = useTranslations('MerchantBilling');
  const { merchant, isLoading: profileLoading } = useMerchantProfile();

  const {
    billingCycles,
    currentCycle,
    summary,
    isLoading,
    isProcessing,
    error,
    fetchBillingCycle,
    setCycleFilters,
    downloadInvoice,
    refresh,
  } = useMerchantBilling();

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  const handleViewCycle = useCallback(
    async (cycleId: string) => {
      await fetchBillingCycle(cycleId);
      setIsDetailOpen(true);
    },
    [fetchBillingCycle]
  );

  const handleDownloadInvoice = useCallback(
    async (cycleId: string) => {
      const url = await downloadInvoice(cycleId);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.info(t('invoiceNotAvailable'));
      }
    },
    [downloadInvoice, t]
  );

  const handleYearChange = useCallback(
    (year: string) => {
      setSelectedYear(year);
      const parsed = parseInt(year, 10);
      if (Number.isFinite(parsed)) {
        setCycleFilters({ year: parsed });
      }
    },
    [setCycleFilters]
  );

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('noAccess')}</AlertTitle>
        <AlertDescription>{t('noAccessDescription')}</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Generate year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Billing Overview */}
      <BillingOverview
        summary={summary}
        billingCycles={billingCycles}
        isLoading={isLoading}
        onDownloadInvoice={handleDownloadInvoice}
        onViewCycle={handleViewCycle}
      />

      {/* Cycle Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t('cycleDetail')}
            </SheetTitle>
          </SheetHeader>

          {isProcessing ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : currentCycle ? (
            <div className="space-y-6 mt-6">
              {/* Period Info */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('billingPeriod')}</p>
                <p className="font-medium">
                  {formatDate(currentCycle.cycleStart)} -{' '}
                  {formatDate(currentCycle.cycleEnd)}
                </p>
              </div>

              {/* Line Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('lineItems')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentCycle.lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.date)}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('listingFees')}</span>
                    <span>{formatCurrency(currentCycle.listingFees)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('offerFees')}</span>
                    <span>{formatCurrency(currentCycle.offerFees)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('commissions')}</span>
                    <span>{formatCurrency(currentCycle.commissions)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>{t('totalDue')}</span>
                    <span>{formatCurrency(currentCycle.totalDue)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                {currentCycle.invoiceUrl && (
                  <Button
                    className="flex-1"
                    onClick={() => handleDownloadInvoice(currentCycle.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('downloadInvoice')}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
