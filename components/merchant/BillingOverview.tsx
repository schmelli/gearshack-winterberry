/**
 * BillingOverview Component
 *
 * Feature: 053-merchant-integration
 * Task: T069
 *
 * Overview of merchant billing showing fees, commissions, and totals.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Receipt,
  CreditCard,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type {
  BillingSummary,
  BillingCycle,
  BillingCycleStatus,
} from '@/types/conversion';

// =============================================================================
// Types
// =============================================================================

export interface BillingOverviewProps {
  summary: BillingSummary | null;
  billingCycles: BillingCycle[];
  isLoading?: boolean;
  onDownloadInvoice?: (cycleId: string) => void;
  onViewCycle?: (cycleId: string) => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getStatusBadge(
  status: BillingCycleStatus,
  t: ReturnType<typeof useTranslations>
) {
  switch (status) {
    case 'paid':
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t('statusPaid')}
        </Badge>
      );
    case 'overdue':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('statusOverdue')}
        </Badge>
      );
    case 'invoiced':
      return (
        <Badge variant="secondary" className="gap-1">
          <Receipt className="h-3 w-3" />
          {t('statusInvoiced')}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {t('statusPending')}
        </Badge>
      );
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function BillingOverview({
  summary,
  billingCycles,
  isLoading = false,
  onDownloadInvoice,
  onViewCycle,
  className,
}: BillingOverviewProps) {
  const t = useTranslations('MerchantBilling');

  if (isLoading) {
    return (
      <div className={className}>
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
        <Card className="mt-6">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('listingFees')}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary?.totalListingFees ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('offerFees')}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary?.totalOfferFees ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('commissions')}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary?.totalCommissions ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('outstanding')}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary?.totalOutstanding ?? 0)}
                </p>
              </div>
              <div
                className={`rounded-lg p-2 ${
                  (summary?.totalOutstanding ?? 0) > 0
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('billingHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {billingCycles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('noBillingHistory')}
            </p>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('period')}</TableHead>
                      <TableHead className="text-right">{t('listing')}</TableHead>
                      <TableHead className="text-right">{t('offers')}</TableHead>
                      <TableHead className="text-right">
                        {t('commission')}
                      </TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingCycles.map((cycle) => (
                      <TableRow
                        key={cycle.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onViewCycle?.(cycle.id)}
                      >
                        <TableCell className="font-medium">
                          {formatMonth(cycle.cycleStart)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cycle.listingFees)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cycle.offerFees)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cycle.commissions)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cycle.totalDue)}
                        </TableCell>
                        <TableCell>{getStatusBadge(cycle.status, t)}</TableCell>
                        <TableCell>
                          {cycle.invoiceUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownloadInvoice?.(cycle.id);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Billing Cards */}
              <div className="space-y-3 md:hidden">
                {billingCycles.map((cycle) => (
                  <Card
                    key={cycle.id}
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewCycle?.(cycle.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{formatMonth(cycle.cycleStart)}</span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(cycle.status, t)}
                        {cycle.invoiceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadInvoice?.(cycle.id);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('listing')}</span>
                        <span>{formatCurrency(cycle.listingFees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('offers')}</span>
                        <span>{formatCurrency(cycle.offerFees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('commission')}</span>
                        <span>{formatCurrency(cycle.commissions)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="font-medium">{t('total')}</span>
                        <span className="font-medium">{formatCurrency(cycle.totalDue)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Monthly Breakdown Chart Placeholder */}
      {summary?.monthlyBreakdown && summary.monthlyBreakdown.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('monthlyBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.monthlyBreakdown.slice(0, 6).map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {formatMonth(month.month + '-01')}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(month.total)}
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    {month.total > 0 && (
                      <>
                        <div
                          className="bg-blue-500"
                          style={{
                            width: `${(month.listingFees / month.total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-purple-500"
                          style={{
                            width: `${(month.offerFees / month.total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-green-500"
                          style={{
                            width: `${(month.commissions / month.total) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>{t('listingFees')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                <span>{t('offerFees')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span>{t('commissions')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
