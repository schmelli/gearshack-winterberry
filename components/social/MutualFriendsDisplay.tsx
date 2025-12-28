/**
 * MutualFriendsDisplay Component
 *
 * Feature: 001-social-graph
 * Tasks: T055, T056, T057
 *
 * Displays mutual friends between current user and a target user.
 * Shows count and expandable list of mutual friends.
 *
 * Features:
 * - Compact count display with avatar stack
 * - Expandable to show full list
 * - Handles empty state gracefully (T057)
 */

'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Users, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useMutualFriends } from '@/hooks/social/useMutualFriends';
import { useTranslations } from 'next-intl';

// =============================================================================
// Types
// =============================================================================

interface MutualFriendsDisplayProps {
  /** The user ID to compare mutual friends with */
  targetUserId: string;
  /** Display variant */
  variant?: 'compact' | 'inline' | 'card';
  /** Maximum avatars to show in compact mode */
  maxAvatars?: number;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Avatar Stack Component
// =============================================================================

interface AvatarStackProps {
  friends: Array<{
    id: string;
    display_name: string;
    avatar_url?: string | null;
  }>;
  maxShow: number;
  remaining: number;
}

function AvatarStack({ friends, maxShow, remaining }: AvatarStackProps) {
  const visibleFriends = friends.slice(0, maxShow);

  return (
    <div className="flex -space-x-2">
      {visibleFriends.map((friend) => (
        <Avatar
          key={friend.id}
          className="h-8 w-8 border-2 border-background"
        >
          {friend.avatar_url ? (
            <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-xs text-primary">
            {getInitials(friend.display_name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Variant
// =============================================================================

function CompactMutualFriends({
  targetUserId,
  maxAvatars = 3,
  className,
}: Omit<MutualFriendsDisplayProps, 'variant'>) {
  const t = useTranslations('Social');
  const { mutualFriends, count, isLoading } = useMutualFriends(targetUserId);
  const [isOpen, setIsOpen] = useState(false);

  // T057: Don't render if no mutual friends
  if (!isLoading && count === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">...</span>
      </div>
    );
  }

  const remaining = Math.max(0, count - maxAvatars);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <AvatarStack
            friends={mutualFriends}
            maxShow={maxAvatars}
            remaining={remaining}
          />
          <span>
            {count === 1
              ? t('friends.mutualFriend')
              : t('friends.mutualFriends', { count })}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        <div className="space-y-2 rounded-lg border border-border p-3">
          {mutualFriends.map((friend) => (
            <Link
              key={friend.id}
              href={`/profile/${friend.id}`}
              className="flex items-center gap-2 rounded-md p-1 hover:bg-muted/50"
            >
              <Avatar className="h-6 w-6">
                {friend.avatar_url ? (
                  <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {getInitials(friend.display_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{friend.display_name}</span>
            </Link>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// Inline Variant
// =============================================================================

function InlineMutualFriends({
  targetUserId,
  className,
}: Omit<MutualFriendsDisplayProps, 'variant'>) {
  const t = useTranslations('Social');
  const { count, isLoading } = useMutualFriends(targetUserId);

  // T057: Don't render if no mutual friends
  if (!isLoading && count === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
        ...
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <Users className="h-3 w-3" />
      {count === 1
        ? t('friends.mutualFriend')
        : t('friends.mutualFriends', { count })}
    </span>
  );
}

// =============================================================================
// Card Variant
// =============================================================================

function CardMutualFriends({
  targetUserId,
  maxAvatars = 5,
  className,
}: Omit<MutualFriendsDisplayProps, 'variant'>) {
  const t = useTranslations('Social');
  const { mutualFriends, count, isLoading } = useMutualFriends(targetUserId);
  const [showAll, setShowAll] = useState(false);

  // T057: Don't render if no mutual friends
  if (!isLoading && count === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-border p-4', className)}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading mutual friends...</span>
        </div>
      </div>
    );
  }

  const displayedFriends = showAll ? mutualFriends : mutualFriends.slice(0, maxAvatars);
  const hasMore = count > maxAvatars;

  return (
    <div className={cn('rounded-lg border border-border p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {count === 1
            ? t('friends.mutualFriend')
            : t('friends.mutualFriends', { count })}
        </span>
      </div>

      <div className="space-y-2">
        {displayedFriends.map((friend) => (
          <Link
            key={friend.id}
            href={`/profile/${friend.id}`}
            className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
          >
            <Avatar className="h-8 w-8">
              {friend.avatar_url ? (
                <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(friend.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{friend.display_name}</span>
          </Link>
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="mt-2 w-full"
        >
          {showAll
            ? 'Show less'
            : t('friends.seeAll')}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MutualFriendsDisplay({
  targetUserId,
  variant = 'compact',
  maxAvatars = 3,
  className,
}: MutualFriendsDisplayProps) {
  switch (variant) {
    case 'inline':
      return (
        <InlineMutualFriends
          targetUserId={targetUserId}
          className={className}
        />
      );
    case 'card':
      return (
        <CardMutualFriends
          targetUserId={targetUserId}
          maxAvatars={maxAvatars}
          className={className}
        />
      );
    case 'compact':
    default:
      return (
        <CompactMutualFriends
          targetUserId={targetUserId}
          maxAvatars={maxAvatars}
          className={className}
        />
      );
  }
}

export default MutualFriendsDisplay;
