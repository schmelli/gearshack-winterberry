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

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
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
import type { WishlistItemAvailability, CommunityAvailabilityRetryStatus } from '@/types/wishlist';
import { useConversations } from '@/hooks/messaging';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

interface CommunityAvailabilityPanelProps {
  /** Availability data for the wishlist item (null = not loaded) */
  availability: WishlistItemAvailability | null;
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
  const { startDirectConversation } = useConversations();

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

    // Empty state
    if (!availability || availability.matchCount === 0) {
      return <CommunityEmptyState noMatches={t('noMatches')} beFirst={t('beFirst')} />;
    }

    // Matches list
    return (
      <ul
        className="space-y-2 max-h-48 overflow-y-auto"
        aria-label={t('matchCountAria', { count: availability.matchCount })}
        role="list"
      >
        {availability.matches.map((match) => (
          <li key={match.matchedItemId}>
            <CommunityMatchCard
              match={match}
              onViewItem={onViewItem}
              onMessageUser={handleMessageUser}
              showSimilarityScore={showSimilarityScore}
              variant={variant}
              labels={labels}
            />
          </li>
        ))}
      </ul>
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
        {availability && availability.matchCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
            aria-label={t('matchCountAria', { count: availability.matchCount })}
          >
            {t('matchCount', { count: availability.matchCount })}
          </Badge>
        )}
      </div>

      {/* T084: Screen reader live region for status updates */}
      <VisuallyHidden aria-live="polite" role="status">
        {getStatusMessage()}
      </VisuallyHidden>

      {/* Content */}
      {renderContent()}
    </section>
  );
}

export default CommunityAvailabilityPanel;
