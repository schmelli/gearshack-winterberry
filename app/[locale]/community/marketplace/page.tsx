/**
 * Marketplace Page
 *
 * Feature: 056-community-hub-enhancements
 * Task: T023
 *
 * Community marketplace for browsing and exchanging gear.
 */

'use client';

import { Suspense, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useMarketplace } from '@/hooks/marketplace';
import { useConversations } from '@/hooks/messaging/useConversations';
import {
  MarketplaceFilters,
  MarketplaceGrid,
} from '@/components/marketplace';
import type { MarketplaceListing } from '@/types/marketplace';

// ============================================================================
// Loading Fallback
// ============================================================================

function MarketplaceLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// ============================================================================
// Marketplace Content (uses useSearchParams via hooks)
// ============================================================================

function MarketplaceContent() {
  const t = useTranslations('Marketplace');
  const locale = useLocale();
  const router = useRouter();
  const { startDirectConversation } = useConversations();

  const {
    listings,
    loadingState,
    error,
    hasMore,
    filters,
    loadMore,
  } = useMarketplace();

  /**
   * Handle messaging a seller
   * Opens or creates a conversation with gear item context
   */
  const handleMessageSeller = useCallback(
    async (listing: MarketplaceListing) => {
      try {
        const result = await startDirectConversation(listing.sellerId);

        if (result.success && result.conversationId) {
          router.push(`/messages/${result.conversationId}`);
        } else if (result.error) {
          console.error('Failed to start conversation:', result.error);
          // Fallback: navigate to messages with seller ID
          router.push(`/messages?recipient=${listing.sellerId}`);
        }
      } catch (err) {
        console.error('Failed to start conversation:', err);
        // Fallback: navigate to messages with seller ID
        router.push(`/messages?recipient=${listing.sellerId}`);
      }
    },
    [startDirectConversation, router]
  );

  return (
    <>
      {/* Filters */}
      <MarketplaceFilters
        type={filters.filters.type}
        sortBy={filters.filters.sortBy}
        sortOrder={filters.filters.sortOrder}
        search={filters.filters.search}
        onTypeChange={filters.setType}
        onSortByChange={filters.setSortBy}
        onSortOrderChange={filters.setSortOrder}
        onSearchChange={filters.setSearch}
        onClearFilters={filters.clearFilters}
        hasActiveFilters={filters.hasActiveFilters}
      />

      {/* Listings grid */}
      <MarketplaceGrid
        listings={listings}
        loadingState={loadingState}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onMessageSeller={handleMessageSeller}
        locale={locale}
      />
    </>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function MarketplacePage() {
  const t = useTranslations('Marketplace');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Content wrapped in Suspense for useSearchParams */}
      <Suspense fallback={<MarketplaceLoading />}>
        <MarketplaceContent />
      </Suspense>
    </div>
  );
}
