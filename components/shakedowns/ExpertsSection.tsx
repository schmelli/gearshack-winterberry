/**
 * ExpertsSection Component
 *
 * Feature: 001-community-shakedowns
 * Task: T070
 *
 * Displays a leaderboard of top community shakedown reviewers.
 * Shows experts who have earned recognition through helpful feedback.
 * Can be embedded on the shakedowns feed page or community page.
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Award, ChevronRight, Users, ThumbsUp, MessageSquare } from 'lucide-react';

import type { ShakedownExpert, ShakedownBadge } from '@/types/shakedown';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';
import { Link } from '@/i18n/navigation';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpertBadge } from './ExpertBadge';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ExpertsSectionProps {
  /** Maximum number of experts to display (default: 5) */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
}

type LoadingState = 'idle' | 'loading' | 'error' | 'success';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get initials from display name for avatar fallback
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Determine the highest badge based on helpful votes
 */
function getHighestBadgeFromVotes(helpfulVotes: number): ShakedownBadge | null {
  const { BADGE_THRESHOLDS } = SHAKEDOWN_CONSTANTS;

  if (helpfulVotes >= BADGE_THRESHOLDS.community_legend) {
    return 'community_legend';
  }
  if (helpfulVotes >= BADGE_THRESHOLDS.trail_expert) {
    return 'trail_expert';
  }
  if (helpfulVotes >= BADGE_THRESHOLDS.shakedown_helper) {
    return 'shakedown_helper';
  }
  return null;
}

// =============================================================================
// Expert Card Sub-component
// =============================================================================

interface ExpertCardProps {
  expert: ShakedownExpert;
}

function ExpertCard({ expert }: ExpertCardProps) {
  const t = useTranslations('Shakedowns.experts');
  const tCommon = useTranslations('Common');

  // Determine badge to display (from data or calculated from votes)
  const displayBadge = useMemo(() => {
    return expert.highestBadge ?? getHighestBadgeFromVotes(expert.helpfulVotesReceived);
  }, [expert.highestBadge, expert.helpfulVotesReceived]);

  // Handle null displayName with i18n fallback
  const displayName = expert.displayName ?? tCommon('genericUser');

  return (
    <div className="flex items-center gap-3 py-3 px-1 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <Avatar className="size-10 shrink-0">
        {expert.avatarUrl && (
          <AvatarImage src={expert.avatarUrl} alt={displayName} />
        )}
        <AvatarFallback className="text-sm font-medium">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {displayName}
          </span>
          {displayBadge && (
            <ExpertBadge badge={displayBadge} size="sm" showLabel showTooltip={false} />
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title={t('helpfulVotes', { count: expert.helpfulVotesReceived })}>
            <ThumbsUp className="size-3" />
            {expert.helpfulVotesReceived}
          </span>
          <span className="flex items-center gap-1" title={t('shakedownsReviewed', { count: expert.shakedownsReviewed })}>
            <MessageSquare className="size-3" />
            {expert.shakedownsReviewed}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Loading Skeleton Sub-component
// =============================================================================

interface ExpertSkeletonProps {
  count: number;
}

function ExpertSkeleton({ count }: ExpertSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-1">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Empty State Sub-component
// =============================================================================

function EmptyState() {
  const t = useTranslations('Shakedowns.experts');

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Users className="size-10 text-muted-foreground/30 mb-3" />
      <h4 className="text-sm font-medium text-muted-foreground">
        {t('empty')}
      </h4>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
        {t('emptyDescription')}
      </p>
    </div>
  );
}

// =============================================================================
// Error State Sub-component
// =============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  const t = useTranslations('Shakedowns.errors');

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Users className="size-10 text-destructive/30 mb-3" />
      <p className="text-sm text-muted-foreground">
        {t('loadFailed')}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="mt-2"
      >
        {t('retry') || 'Retry'}
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ExpertsSection({ limit = 5, className }: ExpertsSectionProps) {
  const t = useTranslations('Shakedowns.experts');

  // State
  const [experts, setExperts] = useState<ShakedownExpert[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [hasMore, setHasMore] = useState(false);

  // Fetch experts from API
  const fetchExperts = async () => {
    setLoadingState('loading');

    try {
      const response = await fetch(`/api/shakedowns/experts?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch experts');
      }

      const data = await response.json();
      setExperts(data.experts ?? []);
      setHasMore(data.hasMore ?? false);
      setLoadingState('success');
    } catch {
      setLoadingState('error');
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchExperts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Retry handler
  const handleRetry = () => {
    fetchExperts();
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-forest-600 dark:text-forest-400" />
          <CardTitle className="text-base font-semibold">
            {t('title')}
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('description')}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Loading State */}
        {loadingState === 'loading' && (
          <ExpertSkeleton count={limit} />
        )}

        {/* Error State */}
        {loadingState === 'error' && (
          <ErrorState onRetry={handleRetry} />
        )}

        {/* Success State */}
        {loadingState === 'success' && (
          <>
            {experts.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="divide-y divide-border">
                {experts.map((expert) => (
                  <ExpertCard key={expert.userId} expert={expert} />
                ))}
              </div>
            )}

            {/* View All Link */}
            {hasMore && experts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <Link
                  href="/community/experts"
                  className="flex items-center justify-center gap-1 text-sm text-forest-600 dark:text-forest-400 hover:underline"
                >
                  {t('viewAll')}
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default ExpertsSection;
