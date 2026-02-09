/**
 * Community Availability Panel Component
 *
 * Feature: 049-wishlist-view (User Story 2)
 * Tasks: T040-T047, T082, T084
 *
 * Displays community members who have matching items available for sale/trade/lending.
 * Shown on medium/detailed GearCard views in wishlist context.
 *
 * Architecture: Feature-Sliced Light (stateless UI, receives all data via props)
 *
 * Orchestrates extracted sub-components:
 * - CommunityMatchCard (individual match display with actions)
 * - CommunityLoadingState / CommunityRetryingState / CommunityErrorState / CommunityEmptyState
 *
 * Accessibility Features (T082, T084):
 * - aria-label on panel container for screen readers
 * - aria-busy="true" during loading state
 * - role="status" on empty state for announcements
 * - aria-live="polite" for dynamic content updates
 * - Descriptive aria-labels on action buttons
 */

'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { CommunityMatchCard } from '@/components/wishlist/CommunityMatchCard';
import {
  CommunityLoadingState,
  CommunityRetryingState,
  CommunityErrorState,
  CommunityEmptyState,
} from '@/components/wishlist/CommunityAvailabilityStates';
import { MarketplaceItemModal } from '@/components/marketplace/MarketplaceItemModal';
import type { WishlistItemAvailability, CommunityAvailabilityRetryStatus, CommunityAvailabilityMatch } from '@/types/wishlist';
import type { WishlistMarketplaceMatch } from '@/lib/supabase/wishlist-marketplace-matching';
import type { MarketplaceListing } from '@/types/marketplace';
import { useConversations } from '@/hooks/messaging';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { toast } from 'sonner';
import { Store } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface CommunityAvailabilityPanelProps {
  /** Availability data for the wishlist item (null = not loaded) */
  availability: WishlistItemAvailability | null;
  /** Marketplace matches for this wishlist item */
  marketplaceMatches?: WishlistMarketplaceMatch[];
  /** Loading state for marketplace matches */
  marketplaceLoading?: boolean;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error message (null = no error) - displayed subtly per graceful degradation */
  error?: string | null;
  /** T077: Retry status for displaying retry state */
  retryStatus?: CommunityAvailabilityRetryStatus;
  /** T077: Current retry attempt count */
  retryCount?: number;
  /** T077: Callback for manual retry after max retries exhausted */
  onManualRetry?: () => void;
  /** Callback to view an item (opens detail modal) */
  onViewItem?: (itemId: string, ownerId: string) => void;
  /** Show similarity score (debugging aid, usually hidden from users) */
  showSimilarityScore?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Variant for display size */
  variant?: 'compact' | 'full';
}

// =============================================================================
// Main Component - T040, T082
// =============================================================================

export function CommunityAvailabilityPanel({
  availability,
  marketplaceMatches = [],
  marketplaceLoading = false,
  isLoading,
  error: _error, // Kept for future use, graceful degradation handles errors silently
  retryStatus = 'idle',
  retryCount = 0,
  onManualRetry,
  onViewItem,
  showSimilarityScore = false,
  className,
  variant = 'full',
}: CommunityAvailabilityPanelProps) {
  const router = useRouter();
  const t = useTranslations('Wishlist.communityAvailability');
  const locale = useLocale();
  const { startDirectConversation } = useConversations();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Modal state for MarketplaceItemModal
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if we have marketplace matches
  const hasMarketplaceMatches = marketplaceMatches.length > 0;

  // Handle message user action - T042
  const handleMessageUser = async (userId: string) => {
    try {
      const result = await startDirectConversation(userId);

      if (result.success && result.conversationId) {
        // Navigate to messages with this conversation
        router.push(`/messages?conversation=${result.conversationId}`);
      } else if (result.error === 'privacy_restricted') {
        toast.error(t('unableToMessage'), {
          description: t('privacyRestricted'),
        });
      } else {
        toast.error(t('conversationFailed'), {
          description: result.error || t('tryAgainLater'),
        });
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
      toast.error(t('conversationFailed'), {
        description: t('unexpectedError'),
      });
    }
  };

  // Handle card click → open MarketplaceItemModal
  const handleCardClick = (match: CommunityAvailabilityMatch) => {
    const listing: MarketplaceListing = {
      id: match.matchedItemId,
      name: match.itemName,
      brand: match.itemBrand || null,
      primaryImageUrl: match.primaryImageUrl || null,
      condition: '',
      pricePaid: null,
      currency: null,
      isForSale: match.forSale,
      canBeTraded: match.tradeable,
      canBeBorrowed: match.lendable,
      listedAt: new Date().toISOString(),
      sellerId: match.ownerId,
      sellerName: match.ownerDisplayName,
      sellerAvatar: match.ownerAvatarUrl || null,
    };
    setSelectedListing(listing);
    setIsModalOpen(true);
  };

  // Handle message seller from modal
  const handleMessageSeller = (listing: MarketplaceListing) => {
    setIsModalOpen(false);
    handleMessageUser(listing.sellerId);
  };

  // Handle seller profile click from modal
  const handleSellerClick = (sellerId: string) => {
    setIsModalOpen(false);
    router.push(`/community/members/${sellerId}`);
  };

  // Labels for child components
  const labels = {
    forSale: t('forSale'),
    lendable: t('lendable'),
    tradeable: t('tradeable'),
    viewItem: t('viewItem'),
    message: t('message'),
  };

  // T077: Show error state with retry button after max retries exhausted
  // Only show error state if retry status is 'failed' and we have no data
  if (retryStatus === 'failed' && !availability) {
    return (
      <section
        className={cn(
          'border-t border-stone-200 dark:border-stone-700',
          'bg-stone-50/50 dark:bg-stone-900/30',
          'p-3',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        aria-label={t('loadFailed')}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('title')}
          </h4>
        </div>
        <CommunityErrorState
          onRetry={onManualRetry}
          loadFailed={t('loadFailed')}
          tryAgain={t('tryAgain')}
        />
      </section>
    );
  }

  // Generate status message for screen readers
  const getStatusMessage = () => {
    if (retryStatus === 'retrying') return t('retryingMessage', { count: retryCount });
    if (isLoading) return t('loadingMessage');
    if (!availability || availability.matchCount === 0) return t('noMatches');
    return t('matchCountAria', { count: availability.matchCount });
  };

  // Determine which content state to render
  const renderContent = () => {
    // T077: Show retrying state during automatic retries
    if (retryStatus === 'retrying') {
      return (
        <CommunityRetryingState
          retryCount={retryCount}
          retryingText={t('retrying', { count: retryCount })}
          retryingMessage={t('retryingMessage', { count: retryCount })}
        />
      );
    }

    // Standard loading state
    if (isLoading) {
      return (
        <CommunityLoadingState
          checkingCommunity={t('checkingCommunity')}
          loadingMessage={t('loadingMessage')}
        />
      );
    }

    // Empty state - only show if we have no community matches AND no marketplace matches
    if ((!availability || availability.matchCount === 0) && !hasMarketplaceMatches) {
      return <CommunityEmptyState noMatches={t('noMatches')} beFirst={t('beFirst')} />;
    }

    // If we only have marketplace matches (no community matches)
    if ((!availability || availability.matchCount === 0) && hasMarketplaceMatches) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              {t('marketplaceOffers', { count: marketplaceMatches.length })}
            </h5>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
            >
              {marketplaceMatches.length}
            </Badge>
          </div>
          <ul className="space-y-2" role="list">
            {marketplaceMatches.map((match) => (
              <li key={match.listing.id}>
                <CommunityMatchCard
                  match={{
                    matchedItemId: match.listing.id,
                    ownerId: match.listing.sellerId,
                    ownerDisplayName: match.listing.sellerName,
                    ownerAvatarUrl: match.listing.sellerAvatar,
                    itemName: match.listing.name,
                    itemBrand: match.listing.brand,
                    forSale: match.listing.isForSale,
                    lendable: match.listing.canBeBorrowed,
                    tradeable: match.listing.canBeTraded,
                    similarityScore: match.similarityScore,
                    primaryImageUrl: match.listing.primaryImageUrl,
                  }}
                  onCardClick={handleCardClick}
                  onViewItem={onViewItem}
                  onMessageUser={handleMessageUser}
                  showSimilarityScore={showSimilarityScore}
                  variant={variant}
                  labels={labels}
                />
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Matches list (availability is guaranteed non-null here due to prior checks)
    return (
      <div className="space-y-3">
        {/* Community Matches */}
        <ul
          className="space-y-2 max-h-48 overflow-y-auto"
          aria-label={t('matchCountAria', { count: availability?.matchCount ?? 0 })}
          role="list"
        >
          {availability?.matches.map((match) => (
            <li key={match.matchedItemId}>
              <CommunityMatchCard
                match={match}
                onCardClick={handleCardClick}
                onViewItem={onViewItem}
                onMessageUser={handleMessageUser}
                showSimilarityScore={showSimilarityScore}
                variant={variant}
                labels={labels}
              />
            </li>
          ))}
        </ul>

        {/* Marketplace Matches */}
        {hasMarketplaceMatches && (
          <div className="border-t border-stone-200 dark:border-stone-700 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                {t('marketplaceOffers', { count: marketplaceMatches.length })}
              </h5>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              >
                {marketplaceMatches.length}
              </Badge>
            </div>
            <ul className="space-y-2" role="list">
              {marketplaceMatches.map((match) => (
                <li key={match.listing.id}>
                  <CommunityMatchCard
                    match={{
                      matchedItemId: match.listing.id,
                      ownerId: match.listing.sellerId,
                      ownerDisplayName: match.listing.sellerName,
                      ownerAvatarUrl: match.listing.sellerAvatar,
                      itemName: match.listing.name,
                      itemBrand: match.listing.brand,
                      forSale: match.listing.isForSale,
                      lendable: match.listing.canBeBorrowed,
                      tradeable: match.listing.canBeTraded,
                      similarityScore: match.similarityScore,
                      primaryImageUrl: match.listing.primaryImageUrl,
                    }}
                    onCardClick={handleCardClick}
                    onViewItem={onViewItem}
                    onMessageUser={handleMessageUser}
                    showSimilarityScore={showSimilarityScore}
                    variant={variant}
                    labels={labels}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      className={cn(
        'border-t border-stone-200 dark:border-stone-700',
        'bg-stone-50/50 dark:bg-stone-900/30',
        'p-3',
        className
      )}
      onClick={(e) => e.stopPropagation()} // Prevent card click when interacting with panel
      // T082: Descriptive aria-label for the panel
      aria-label={t('title')}
      // T082: Indicate loading state
      aria-busy={isLoading || retryStatus === 'retrying'}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          id="community-availability-heading"
        >
          {t('title')}
        </h4>
        {((availability && availability.matchCount > 0) || hasMarketplaceMatches) && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
            aria-label={t('matchCountAria', { count: (availability?.matchCount || 0) + marketplaceMatches.length })}
          >
            {t('matchCount', { count: (availability?.matchCount || 0) + marketplaceMatches.length })}
          </Badge>
        )}
      </div>

      {/* T084: Screen reader live region for status updates */}
      <VisuallyHidden aria-live="polite" role="status">
        {getStatusMessage()}
      </VisuallyHidden>

      {/* Content */}
      {renderContent()}

      {/* Item Detail Modal */}
      <MarketplaceItemModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        listing={selectedListing}
        isMobile={isMobile}
        onMessageSeller={handleMessageSeller}
        onSellerClick={handleSellerClick}
        locale={locale}
      />
    </section>
  );
}

export default CommunityAvailabilityPanel;
