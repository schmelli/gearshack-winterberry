'use client';

/**
 * ShakedownFeed Component
 *
 * Feature: 001-community-shakedowns
 * Task: T030
 *
 * Displays the list of shakedowns with infinite scroll.
 * Uses IntersectionObserver for loading more items and
 * integrates with useShakedowns hook for data management.
 */

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useShakedowns } from '@/hooks/shakedowns';
import type {
  SortOption,
  ShakedownFilters,
} from '@/hooks/shakedowns/useShakedowns';
import { ShakedownCard } from './ShakedownCard';

// =============================================================================
// Types
// =============================================================================

interface ShakedownFeedProps {
  /** Additional CSS classes */
  className?: string;
  /** Initial sort option */
  initialSort?: SortOption;
  /** Initial filters */
  initialFilters?: ShakedownFilters;
  /** Callback when a shakedown is clicked */
  onShakedownClick?: (id: string) => void;
}

// =============================================================================
// Skeleton Component
// =============================================================================

function ShakedownCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        {/* Header: Avatar + Author info */}
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Trip name */}
        <div className="mt-4">
          <Skeleton className="h-5 w-48" />
        </div>

        {/* Trip dates */}
        <div className="mt-2">
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Concerns preview */}
        <div className="mt-3 space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Footer: Stats */}
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
  onCreateShakedown?: () => void;
}

function EmptyState({ hasFilters, onClearFilters, onCreateShakedown }: EmptyStateProps) {
  const t = useTranslations('Shakedowns');

  if (hasFilters) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-medium">
            {t('filters.noResults')}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {t('filters.noResultsDescription')}
          </p>
          {onClearFilters && (
            <Button variant="outline" onClick={onClearFilters}>
              {t('filters.clearAll')}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <RefreshCw className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-medium">{t('noShakedowns')}</h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {t('noShakedownsDescription')}
        </p>
        {onCreateShakedown && (
          <Button onClick={onCreateShakedown}>
            {t('create')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Error State Component
// =============================================================================

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  const t = useTranslations('Shakedowns');

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h3 className="mb-2 text-lg font-medium text-destructive">
          {t('errors.loadFailed')}
        </h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {error.message}
        </p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('actions.retry')}
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ShakedownFeed({
  className,
  initialSort = 'recent',
  initialFilters = {},
  onShakedownClick,
}: ShakedownFeedProps) {
  const t = useTranslations('Shakedowns');

  // Data hook
  const {
    shakedowns,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    filters,
    setFilters,
  } = useShakedowns(initialSort, initialFilters);

  // Ref for IntersectionObserver sentinel element
  const observerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Start loading a bit before reaching the bottom
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, isLoading, loadMore]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.status !== undefined ||
    filters.experienceLevel !== undefined ||
    (filters.search?.trim().length ?? 0) > 0 ||
    filters.friendsFirst === true;

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({});
  };

  // ==========================================================================
  // Render States
  // ==========================================================================

  // Initial loading state
  if (isLoading && shakedowns.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 4 }).map((_, index) => (
          <ShakedownCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  // Error state
  if (error && shakedowns.length === 0) {
    return (
      <div className={className}>
        <ErrorState error={error} onRetry={refresh} />
      </div>
    );
  }

  // Empty state
  if (!isLoading && shakedowns.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
        />
      </div>
    );
  }

  // ==========================================================================
  // Main Render
  // ==========================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Shakedown cards */}
      {shakedowns.map((shakedown) => (
        <ShakedownCard
          key={shakedown.id}
          shakedown={shakedown}
          onClick={
            onShakedownClick
              ? () => onShakedownClick(shakedown.id)
              : undefined
          }
        />
      ))}

      {/* Load more sentinel + spinner */}
      {hasMore && (
        <div
          ref={observerRef}
          className="flex items-center justify-center py-6"
          aria-hidden="true"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('loadMore')}</span>
            </div>
          )}
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && shakedowns.length > 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          {t('endOfList')}
        </div>
      )}

      {/* Error during load more (shows below existing items) */}
      {error && shakedowns.length > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error.message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            className="ml-2 h-auto p-1 text-destructive hover:text-destructive"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default ShakedownFeed;
