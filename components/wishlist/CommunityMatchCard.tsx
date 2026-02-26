/**
 * CommunityMatchCard Component
 *
 * Extracted from CommunityAvailabilityPanel.tsx
 * Displays a single community availability match with owner info,
 * item details, availability badges, and action buttons.
 *
 * Tasks: T041-T044, T082
 */

'use client';

import Image from 'next/image';
import { DollarSign, HandHeart, ArrowLeftRight, Eye, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-utils';
import type { CommunityAvailabilityMatch } from '@/types/wishlist';

// =============================================================================
// Types
// =============================================================================

export interface CommunityMatchCardLabels {
  forSale: string;
  lendable: string;
  tradeable: string;
  viewItem: string;
  message: string;
}

interface CommunityMatchCardProps {
  /** The availability match data */
  match: CommunityAvailabilityMatch;
  /** Callback when the entire card is clicked (opens detail modal) */
  onCardClick?: (match: CommunityAvailabilityMatch) => void;
  /** Callback to view an item (opens detail modal) */
  onViewItem?: (itemId: string, ownerId: string) => void;
  /** Callback to send a message to the item owner */
  onMessageUser: (userId: string) => void;
  /** Show similarity score (debugging aid) */
  showSimilarityScore?: boolean;
  /** Display variant */
  variant: 'compact' | 'full';
  /** Pre-translated label strings */
  labels: CommunityMatchCardLabels;
}

// =============================================================================
// Availability Badges Sub-component - T043
// =============================================================================

interface AvailabilityBadgesProps {
  forSale: boolean;
  lendable: boolean;
  tradeable: boolean;
  labels: {
    forSale: string;
    lendable: string;
    tradeable: string;
  };
}

function AvailabilityBadges({
  forSale,
  lendable,
  tradeable,
  labels,
}: AvailabilityBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {forSale && (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0"
        >
          <DollarSign className="h-2.5 w-2.5 mr-0.5" />
          {labels.forSale}
        </Badge>
      )}
      {lendable && (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0"
        >
          <HandHeart className="h-2.5 w-2.5 mr-0.5" />
          {labels.lendable}
        </Badge>
      )}
      {tradeable && (
        <Badge
          variant="secondary"
          className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] px-1.5 py-0"
        >
          <ArrowLeftRight className="h-2.5 w-2.5 mr-0.5" />
          {labels.tradeable}
        </Badge>
      )}
    </div>
  );
}

// =============================================================================
// Component - T041-T044
// =============================================================================

export function CommunityMatchCard({
  match,
  onCardClick,
  onViewItem,
  onMessageUser,
  showSimilarityScore = false,
  variant,
  labels,
}: CommunityMatchCardProps) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCardClick?.(match);
    }
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-2 p-2 rounded-md',
        'bg-stone-50 dark:bg-stone-800/50',
        'border border-stone-200 dark:border-stone-700',
        'hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors',
        onCardClick && 'cursor-pointer'
      )}
      onClick={onCardClick ? () => onCardClick(match) : undefined}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={onCardClick ? handleKeyDown : undefined}
    >
      {/* Item Image */}
      {variant === 'full' && match.primaryImageUrl && (
        <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-white dark:bg-stone-900">
          <Image
            src={optimizeCloudinaryUrl(match.primaryImageUrl, { width: 96, quality: 'auto:good' })}
            alt={match.itemName}
            fill
            loading="lazy"
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
          labels={{
            forSale: labels.forSale,
            lendable: labels.lendable,
            tradeable: labels.tradeable,
          }}
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
              {labels.viewItem}
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
              {labels.message}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
