/**
 * UserSearch - User Search Component
 *
 * Feature: 046-user-messaging-system
 * Task: T030
 *
 * Search interface for finding other GearShack members.
 */

'use client';

import { Search, Loader2, User, MessageCircle, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useUserSearch, type SearchedUser } from '@/hooks/messaging/useUserSearch';
import { useFriends } from '@/hooks/messaging/useFriends';

interface UserSearchProps {
  /** Callback when user wants to message someone */
  onMessageUser?: (userId: string, displayName: string) => void;
  /** Callback when user wants to view a profile */
  onViewProfile?: (userId: string) => void;
  /** Placeholder text */
  placeholder?: string;
}

export function UserSearch({
  onMessageUser,
  onViewProfile,
  placeholder = 'Search by name or trail name...',
}: UserSearchProps) {
  const { query, setQuery, results, isSearching, error } = useUserSearch();
  const { isFriend, addFriend } = useFriends();

  const handleAddFriend = async (userId: string) => {
    await addFriend(userId);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Error State */}
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      {/* Empty State */}
      {!isSearching && query.length >= 2 && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <User className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No users found matching &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-4">
            {results.map((user) => (
              <UserSearchResult
                key={user.id}
                user={user}
                isFriend={isFriend(user.id)}
                onMessage={() =>
                  onMessageUser?.(user.id, user.display_name ?? 'Unknown')
                }
                onViewProfile={() => onViewProfile?.(user.id)}
                onAddFriend={() => handleAddFriend(user.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Initial State */}
      {!isSearching && query.length < 2 && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Search for GearShack members to connect
          </p>
          <p className="text-xs text-muted-foreground/70">
            Enter at least 2 characters to search
          </p>
        </div>
      )}
    </div>
  );
}

interface UserSearchResultProps {
  user: SearchedUser;
  isFriend: boolean;
  onMessage: () => void;
  onViewProfile: () => void;
  onAddFriend: () => void;
}

function UserSearchResult({
  user,
  isFriend: isFriendStatus,
  onMessage,
  onViewProfile,
  onAddFriend,
}: UserSearchResultProps) {
  const displayName = user.display_name ?? 'Unknown';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onViewProfile}
    >
      <CardContent className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{displayName}</p>
          {user.trail_name && (
            <p className="truncate text-xs text-muted-foreground">
              &ldquo;{user.trail_name}&rdquo;
            </p>
          )}
          {user.bio && !user.trail_name && (
            <p className="truncate text-xs text-muted-foreground">
              {user.bio}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
            title="Send message"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          {!isFriendStatus && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onAddFriend();
              }}
              title="Add friend"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
