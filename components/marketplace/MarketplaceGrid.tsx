/**
 * Marketplace Listing Grid
 *
 * Feature: 056-community-hub-enhancements
 * Task: T021
 *
 * Responsive grid of marketplace cards with infinite scroll,
 * empty state, and error handling.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Package } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { MarketplaceCard } from './MarketplaceCard';
import { MarketplaceSkeleton } from './MarketplaceSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { MarketplaceListing } from '@/types/marketplace';

// ============================================================================
// Types
// ============================================================================

type LoadingState = 'idle' | 'loading' | 'loading-more' | 'error';

interface MarketplaceGridProps {
  listings: MarketplaceListing[];
  loadingState: LoadingState;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onMessageSeller: (listing: MarketplaceListing) => void;
  locale?: string;
}

// ============================================================================
// Component
// ============================================================================

export function MarketplaceGrid({
  listings,
  loadingState,
  error,
  hasMore,
  onLoadMore,
  onMessageSeller,
  locale = 'en',
}: MarketplaceGridProps) {
  const t = useTranslations('Marketplace');
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Handle seller avatar click - navigate to public profile
  const handleSellerClick = useCallback(
    (sellerId: string) => {
      router.push(`/profile/${sellerId}`);
    },
    [router]
  );

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Don't observe if loading or no more items
    if (loadingState !== 'idle' || !hasMore) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px', // Trigger 200px before reaching the end
        threshold: 0,
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadingState, hasMore, onLoadMore]);

  // Initial loading state
  if (loadingState === 'loading' && listings.length === 0) {
    return <MarketplaceSkeleton />;
  }

  // Error state
  if (error && listings.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (listings.length === 0 && loadingState === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {t('empty')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Listings grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((listing) => (
          <MarketplaceCard
            key={listing.id}
            listing={listing}
            onMessageSeller={onMessageSeller}
            onSellerClick={handleSellerClick}
            locale={locale}
          />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {loadingState === 'loading-more' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MarketplaceSkeleton count={4} />
          </div>
        )}

        {error && listings.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={onLoadMore}>
              Try again
            </Button>
          </div>
        )}

        {!hasMore && listings.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t('endOfListings')}
          </p>
        )}
      </div>
    </div>
  );
}
