'use client';

/**
 * VIP Search Results Component
 *
 * Feature: 052-vip-loadouts
 * Task: T062
 *
 * Displays search results with loading states and pagination.
 */

import { useTranslations } from 'next-intl';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VipProfileCard } from './VipProfileCard';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipSearchResultsProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  results: VipWithStats[];
  total: number;
  hasMore: boolean;
  error: string | null;
  query: string;
  onLoadMore: () => void;
  onRetry?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function VipSearchResults({
  status,
  results,
  total,
  hasMore,
  error,
  query,
  onLoadMore,
  onRetry,
}: VipSearchResultsProps) {
  const t = useTranslations('vip');

  // Loading state (initial load)
  if (status === 'loading' && results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">
              {t('directory.errorTitle')}
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="ml-auto">
              {t('common.retry')}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (status === 'success' && results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">
            {query ? t('search.noResults') : t('directory.empty')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {query ? t('search.tryBroader') : t('directory.emptyHint')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results count */}
      {query && total > 0 && (
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((vip) => (
          <VipProfileCard key={vip.id} vip={vip} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('common.loading')}
              </>
            ) : (
              t('directory.loadMore')
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default VipSearchResults;
