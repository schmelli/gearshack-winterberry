'use client';

/**
 * VIP Directory Content Component
 *
 * Feature: 052-vip-loadouts
 * Task: T030
 *
 * Client component for VIP directory with search and infinite scroll.
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Loader2, AlertCircle, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VipProfileCard } from './VipProfileCard';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipDirectoryState {
  vips: VipWithStats[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  hasMore: boolean;
  offset: number;
}

// =============================================================================
// Component
// =============================================================================

export function VipDirectoryContent() {
  const t = useTranslations('vip');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [state, setState] = useState<VipDirectoryState>({
    vips: [],
    status: 'idle',
    error: null,
    hasMore: true,
    offset: 0,
  });

  const LIMIT = 12;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch VIPs
  const fetchVips = useCallback(async (searchQuery: string, offset: number, append: boolean) => {
    setState((prev) => ({
      ...prev,
      status: append ? prev.status : 'loading',
      error: null,
    }));

    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(offset),
      });
      if (searchQuery.trim()) {
        params.set('query', searchQuery.trim());
      }

      const response = await fetch(`/api/vip?${params}`);
      if (!response.ok) throw new Error('Failed to fetch VIPs');

      const data = await response.json();

      setState((prev) => ({
        vips: append ? [...prev.vips, ...data.vips] : data.vips,
        status: 'success',
        error: null,
        hasMore: data.hasMore,
        offset: offset + data.vips.length,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'An error occurred',
      }));
    }
  }, []);

  // Initial load and search
  useEffect(() => {
    fetchVips(debouncedQuery, 0, false);
  }, [debouncedQuery, fetchVips]);

  // Load more
  const handleLoadMore = () => {
    if (state.hasMore && state.status !== 'loading') {
      fetchVips(debouncedQuery, state.offset, true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('directory.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State (initial) */}
      {state.status === 'loading' && state.vips.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {state.status === 'error' && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">
                {t('directory.errorTitle')}
              </p>
              <p className="text-sm text-muted-foreground">{state.error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchVips(debouncedQuery, 0, false)}
              className="ml-auto"
            >
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {state.status === 'success' && state.vips.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">
              {query ? t('directory.noResults') : t('directory.empty')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {query
                ? t('directory.noResultsHint')
                : t('directory.emptyHint')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* VIP Grid */}
      {state.vips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.vips.map((vip) => (
            <VipProfileCard key={vip.id} vip={vip} />
          ))}
        </div>
      )}

      {/* Load More */}
      {state.hasMore && state.vips.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={state.status === 'loading'}
          >
            {state.status === 'loading' ? (
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

export default VipDirectoryContent;
