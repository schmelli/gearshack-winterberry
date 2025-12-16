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
 * Accessibility Features (T082, T084):
 * - aria-label on panel container for screen readers
 * - aria-busy="true" during loading state
 * - role="status" on empty state for announcements
 * - aria-live="polite" for dynamic content updates
 * - Descriptive aria-labels on action buttons
 */

'use client';

import Image from 'next/image';
import { useRouter } from '@/i18n/navigation';
import { DollarSign, HandHeart, ArrowLeftRight, Eye, MessageCircle, Loader2, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import type { CommunityAvailabilityMatch, WishlistItemAvailability, CommunityAvailabilityRetryStatus } from '@/types/wishlist';
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

interface MatchCardProps {
  match: CommunityAvailabilityMatch;
  onViewItem?: (itemId: string, ownerId: string) => void;
  onMessageUser: (userId: string) => void;
  showSimilarityScore?: boolean;
  variant: 'compact' | 'full';
}

// =============================================================================
// Availability Badge Component
// =============================================================================

function AvailabilityBadges({
  forSale,
  lendable,
  tradeable,
}: {
  forSale: boolean;
  lendable: boolean;
  tradeable: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {forSale && (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0"
        >
          <DollarSign className="h-2.5 w-2.5 mr-0.5" />
          For Sale
        </Badge>
      )}
      {lendable && (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0"
        >
          <HandHeart className="h-2.5 w-2.5 mr-0.5" />
          Lendable
        </Badge>
      )}
      {tradeable && (
        <Badge
          variant="secondary"
          className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] px-1.5 py-0"
        >
          <ArrowLeftRight className="h-2.5 w-2.5 mr-0.5" />
          Tradeable
        </Badge>
      )}
    </div>
  );
}

// =============================================================================
// Match Card Component - T041-T044
// =============================================================================

function MatchCard({
  match,
  onViewItem,
  onMessageUser,
  showSimilarityScore = false,
  variant,
}: MatchCardProps) {
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewItem?.(match.matchedItemId, match.ownerId);
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMessageUser(match.ownerId);
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-2 p-2 rounded-md',
        'bg-stone-50 dark:bg-stone-800/50',
        'border border-stone-200 dark:border-stone-700',
        'hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors'
      )}
    >
      {/* Item Image */}
      {variant === 'full' && match.primaryImageUrl && (
        <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-white dark:bg-stone-900">
          <Image
            src={match.primaryImageUrl}
            alt={match.itemName}
            fill
            unoptimized
            className="object-contain p-0.5"
            sizes="48px"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Owner Info */}
        <div className="flex items-center gap-1.5 mb-1">
          <Avatar className="h-5 w-5">
            {match.ownerAvatarUrl && (
              <AvatarImage src={match.ownerAvatarUrl} alt={match.ownerDisplayName} />
            )}
            <AvatarFallback className="text-[8px]">
              {getInitials(match.ownerDisplayName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground truncate">
            {match.ownerDisplayName}
          </span>
          {/* Similarity Score (optional, for debugging) - T044 */}
          {showSimilarityScore && (
            <span className="text-[9px] text-muted-foreground ml-auto">
              {Math.round(match.similarityScore * 100)}% match
            </span>
          )}
        </div>

        {/* Item Name */}
        <p className="text-xs text-muted-foreground truncate mb-1.5">
          {match.itemBrand ? `${match.itemBrand} ` : ''}
          {match.itemName}
        </p>

        {/* Availability Badges - T043 */}
        <AvailabilityBadges
          forSale={match.forSale}
          lendable={match.lendable}
          tradeable={match.tradeable}
        />

        {/* Actions - T041, T042, T082 */}
        {variant === 'full' && (
          <div
            className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
            role="group"
            aria-label={`Actions for ${match.ownerDisplayName}'s item`}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={handleViewClick}
              // T082: Descriptive aria-label including context
              aria-label={`View ${match.itemBrand ? `${match.itemBrand} ` : ''}${match.itemName} from ${match.ownerDisplayName}`}
            >
              <Eye className="h-3 w-3 mr-1" aria-hidden="true" />
              View Item
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={handleMessageClick}
              // T082: Descriptive aria-label including user name
              aria-label={`Send message to ${match.ownerDisplayName}`}
            >
              <MessageCircle className="h-3 w-3 mr-1" aria-hidden="true" />
              Message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Loading State Component - T082
// =============================================================================

function LoadingState() {
  return (
    <div
      className="flex items-center justify-center py-4"
      role="status"
      aria-busy="true"
      aria-label="Loading community availability"
    >
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="ml-2 text-xs text-muted-foreground">
        Checking community...
      </span>
      {/* T084: Screen reader announcement for loading state */}
      <VisuallyHidden aria-live="polite">
        Loading community availability matches. Please wait.
      </VisuallyHidden>
    </div>
  );
}

// =============================================================================
// T077: Retrying State Component
// =============================================================================

function RetryingState({ retryCount }: { retryCount: number }) {
  return (
    <div
      className="flex items-center justify-center py-4"
      role="status"
      aria-busy="true"
      aria-label={`Retrying community availability, attempt ${retryCount}`}
    >
      <RefreshCw className="h-4 w-4 animate-spin text-amber-500" aria-hidden="true" />
      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
        Retrying... (attempt {retryCount}/3)
      </span>
      <VisuallyHidden aria-live="polite">
        Retrying to load community availability. Attempt {retryCount} of 3.
      </VisuallyHidden>
    </div>
  );
}

// =============================================================================
// T077: Error State Component with Manual Retry
// =============================================================================

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-4 text-center"
      role="alert"
      aria-label="Failed to load community availability"
    >
      <AlertTriangle className="h-5 w-5 text-destructive/70 mb-1.5" aria-hidden="true" />
      <p className="text-xs text-destructive/80">
        Failed to load community availability
      </p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="mt-2 h-7 px-3 text-xs gap-1.5"
          aria-label="Retry loading community availability"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Empty State Component - T047, T082
// =============================================================================

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-4 text-center"
      role="status"
      aria-label="No community matches found"
    >
      <Users className="h-6 w-6 text-muted-foreground/50 mb-1.5" aria-hidden="true" />
      <p className="text-xs text-muted-foreground">
        No community matches found
      </p>
      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
        Be the first to add this item to your inventory!
      </p>
    </div>
  );
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
  const { startDirectConversation } = useConversations();

  // Handle message user action - T042
  const handleMessageUser = async (userId: string) => {
    try {
      const result = await startDirectConversation(userId);

      if (result.success && result.conversationId) {
        // Navigate to messages with this conversation
        router.push(`/messages?conversation=${result.conversationId}`);
      } else if (result.error === 'privacy_restricted') {
        toast.error('Unable to message this user', {
          description: 'Their privacy settings prevent messages from non-friends.',
        });
      } else {
        toast.error('Failed to start conversation', {
          description: result.error || 'Please try again later.',
        });
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
      toast.error('Failed to start conversation', {
        description: 'An unexpected error occurred. Please try again.',
      });
    }
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
        aria-label="Community availability error"
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Community Availability
          </h4>
        </div>
        <ErrorState onRetry={onManualRetry} />
      </section>
    );
  }

  // Generate status message for screen readers
  const getStatusMessage = () => {
    if (retryStatus === 'retrying') return `Retrying community availability, attempt ${retryCount}`;
    if (isLoading) return 'Loading community availability';
    if (!availability || availability.matchCount === 0) return 'No community matches found';
    return `${availability.matchCount} community ${availability.matchCount === 1 ? 'match' : 'matches'} found`;
  };

  // Determine which content state to render
  const renderContent = () => {
    // T077: Show retrying state during automatic retries
    if (retryStatus === 'retrying') {
      return <RetryingState retryCount={retryCount} />;
    }

    // Standard loading state
    if (isLoading) {
      return <LoadingState />;
    }

    // Empty state
    if (!availability || availability.matchCount === 0) {
      return <EmptyState />;
    }

    // Matches list
    return (
      <ul
        className="space-y-2 max-h-48 overflow-y-auto"
        aria-label={`${availability.matchCount} community members have this item`}
        role="list"
      >
        {availability.matches.map((match) => (
          <li key={match.matchedItemId}>
            <MatchCard
              match={match}
              onViewItem={onViewItem}
              onMessageUser={handleMessageUser}
              showSimilarityScore={showSimilarityScore}
              variant={variant}
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
      aria-label="Community availability matches"
      // T082: Indicate loading state
      aria-busy={isLoading || retryStatus === 'retrying'}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          id="community-availability-heading"
        >
          Community Availability
        </h4>
        {availability && availability.matchCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
            aria-label={`${availability.matchCount} ${availability.matchCount === 1 ? 'match' : 'matches'}`}
          >
            {availability.matchCount} match{availability.matchCount !== 1 ? 'es' : ''}
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
