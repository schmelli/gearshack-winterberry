/**
 * WeightReportsList Component
 * Feature: community-verified-weights
 *
 * Displays a compact list of weight reports for a catalog product.
 * Shows individual reports with relative time and measurement context.
 * Stateless — receives all data via props.
 */

'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { Scale, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeightReport } from '@/types/weight-report';

// =============================================================================
// Types
// =============================================================================

interface WeightReportsListProps {
  /** Weight reports to display */
  reports: WeightReport[];
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function WeightReportsList({ reports, className }: WeightReportsListProps) {
  const t = useTranslations('CommunityWeight');
  const format = useFormatter();

  if (reports.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {t('reports.empty')}
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {reports.map((report) => (
        <div
          key={report.id}
          className={cn(
            'flex items-start gap-2 rounded-md px-3 py-2 text-sm',
            report.isOwnReport
              ? 'bg-primary/5 border border-primary/10'
              : 'bg-muted/30'
          )}
        >
          <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {report.reportedWeightGrams.toLocaleString()} g
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {format.relativeTime(new Date(report.createdAt))}
              </span>
            </div>
            {report.measurementContext && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {report.measurementContext}
              </p>
            )}
            {report.isOwnReport && (
              <div className="flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary">{t('reports.yourReport')}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
