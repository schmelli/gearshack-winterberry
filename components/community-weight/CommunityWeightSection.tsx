/**
 * CommunityWeightSection Component
 * Feature: community-verified-weights
 *
 * Displays community weight data for a gear item, including:
 * - Community-verified weight badge
 * - Comparison between manufacturer and community weight
 * - Button to submit/update weight report
 * - List of existing reports
 *
 * Orchestrates the useWeightReports hook and renders sub-components.
 */

'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityWeightBadge } from '@/components/community-weight/CommunityWeightBadge';
import { WeightReportDialog } from '@/components/community-weight/WeightReportDialog';
import { WeightReportsList } from '@/components/community-weight/WeightReportsList';
import { useWeightReports } from '@/hooks/useWeightReports';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface CommunityWeightSectionProps {
  /** Catalog product ID to fetch reports for. Null disables the section. */
  catalogProductId: string | null;
  /** Manufacturer-stated weight in grams (from catalog) */
  manufacturerWeightGrams: number | null;
  /** Product name for display in dialog */
  productName?: string;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CommunityWeightSection({
  catalogProductId,
  manufacturerWeightGrams,
  productName,
  className,
}: CommunityWeightSectionProps) {
  const t = useTranslations('CommunityWeight');
  const { user } = useAuthContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showReports, setShowReports] = useState(false);

  const {
    reports,
    stats,
    userReport,
    isLoading,
    isSubmitting,
    submitReport,
  } = useWeightReports(catalogProductId);

  // Calculate weight difference between manufacturer and community
  const weightDiff = useMemo(() => {
    if (!stats?.communityWeightGrams || !manufacturerWeightGrams) return null;
    const diff = stats.communityWeightGrams - manufacturerWeightGrams;
    const percentage = Math.round((diff / manufacturerWeightGrams) * 100);
    return { grams: diff, percentage };
  }, [stats?.communityWeightGrams, manufacturerWeightGrams]);

  // Don't render if no catalogProductId
  if (!catalogProductId) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
    );
  }

  const hasReports = stats && stats.reportCount > 0;
  const isAuthenticated = !!user;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header row: Community Weight info + action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground font-medium">
              {t('section.title')}
            </span>
          </div>
          {hasReports && stats && (
            <CommunityWeightBadge
              isVerified={stats.isVerified}
              reportCount={stats.reportCount}
              communityWeightGrams={stats.communityWeightGrams}
            />
          )}
        </div>

        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDialogOpen(true)}
          >
            {userReport ? t('section.updateReport') : t('section.addReport')}
          </Button>
        )}
      </div>

      {/* Community weight display */}
      {stats?.isVerified && stats.communityWeightGrams && (
        <div className="rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 p-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                {stats.communityWeightGrams >= 1000
                  ? `${(stats.communityWeightGrams / 1000).toFixed(2)} kg`
                  : `${stats.communityWeightGrams.toLocaleString()} g`}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('section.basedOnReports', { count: stats.reportCount })}
              </p>
            </div>
            {weightDiff && (
              <div className="text-right">
                <p
                  className={cn(
                    'text-sm font-medium',
                    weightDiff.grams > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {weightDiff.grams > 0 ? '+' : ''}
                  {weightDiff.grams} g ({weightDiff.grams > 0 ? '+' : ''}
                  {weightDiff.percentage}%)
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('section.vsManufacturer')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress towards verification */}
      {hasReports && stats && !stats.isVerified && (
        <div className="rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {t('section.pendingVerification', {
              count: stats.reportCount,
              needed: 3 - stats.reportCount,
            })}
          </p>
        </div>
      )}

      {/* No reports yet */}
      {!hasReports && (
        <p className="text-sm text-muted-foreground">
          {t('section.noReportsYet')}
        </p>
      )}

      {/* Expandable reports list */}
      {hasReports && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 px-0 hover:bg-transparent"
            onClick={() => setShowReports((v) => !v)}
          >
            {showReports ? (
              <>
                <ChevronUp className="h-3 w-3" />
                {t('section.hideReports')}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                {t('section.showReports', { count: reports.length })}
              </>
            )}
          </Button>
          {showReports && <WeightReportsList reports={reports} className="mt-2" />}
        </div>
      )}

      {/* Report dialog */}
      <WeightReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={submitReport}
        isSubmitting={isSubmitting}
        existingReport={userReport}
        manufacturerWeightGrams={manufacturerWeightGrams}
        productName={productName}
      />
    </div>
  );
}
