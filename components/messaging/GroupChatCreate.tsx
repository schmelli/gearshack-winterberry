/**
 * GroupChatCreate - Group Chat Creation Component
 *
 * Feature: 046-user-messaging-system
 * Task: T034
 *
 * Interface for creating a new group chat with participant picker.
 */

'use client';

import { useState, useCallback } from 'react';
import { Users, X, Loader2, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversations } from '@/hooks/messaging/useConversations';
import { useUserSearch, type SearchedUser } from '@/hooks/messaging/useUserSearch';
import { useFriends } from '@/hooks/messaging/useFriends';
import { useTranslations } from 'next-intl';

interface GroupChatCreateProps {
  /** Callback when group is successfully created */
  onGroupCreated?: (conversationId: string) => void;
  /** Callback to go back */
  onCancel?: () => void;
}

export function GroupChatCreate({ onGroupCreated, onCancel }: GroupChatCreateProps) {
  const t = useTranslations('Messaging');
  const { createGroup } = useConversations();
  const { friends } = useFriends();
  const { query, setQuery, results, isSearching } = useUserSearch();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SearchedUser[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUser = useCallback((user: SearchedUser) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setQuery('');
  }, [selectedUsers, setQuery]);

  const handleRemoveUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError(t('groupChat.errorNoName'));
      return;
    }

    if (selectedUsers.length === 0) {
      setError(t('groupChat.errorNoParticipants'));
      return;
    }

    setIsCreating(true);
    setError(null);

    const result = await createGroup(
      groupName.trim(),
      selectedUsers.map((u) => u.id)
    );

    setIsCreating(false);

    if (result.success && result.conversationId) {
      onGroupCreated?.(result.conversationId);
    } else {
      setError(result.error || t('groupChat.errorCreateFailed'));
    }
  };

  // Filter out already selected users from search results
  const filteredResults = results.filter(
    (r) => !selectedUsers.find((s) => s.id === r.id)
  );

  // Get friends that aren't selected yet
  const suggestedFriends = friends
    .filter((f) => !selectedUsers.find((s) => s.id === f.id))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Group Name */}
      <div className="space-y-2">
        <Label htmlFor="group-name">{t('groupChat.groupName')}</Label>
        <Input
          id="group-name"
          placeholder={t('groupChat.groupNamePlaceholder')}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          maxLength={50}
        />
      </div>

      {/* Selected Participants */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          <Label>{t('groupChat.participants', { count: selectedUsers.length })}</Label>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <Badge
                key={user.id}
                variant="secondary"
                className="flex items-center gap-1.5 py-1 pl-1 pr-2"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(user.display_name ?? 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-20 truncate">{user.display_name}</span>
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add Participants Search */}
      <div className="space-y-2">
        <Label htmlFor="participant-search">{t('groupChat.addParticipants')}</Label>
        <div className="relative">
          <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="participant-search"
            placeholder={t('groupChat.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Search Results */}
      {filteredResults.length > 0 && (
        <ScrollArea className="max-h-32">
          <div className="space-y-1 pr-4">
            {filteredResults.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onSelect={() => handleAddUser(user)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Suggested Friends */}
      {query.length < 2 && suggestedFriends.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">{t('groupChat.suggestedFriends')}</Label>
          <div className="space-y-1">
            {suggestedFriends.map((friend) => (
              <UserRow
                key={friend.id}
                user={{
                  id: friend.id,
                  display_name: friend.display_name,
                  avatar_url: friend.avatar_url,
                  trail_name: null,
                  bio: null,
                }}
                onSelect={() =>
                  handleAddUser({
                    id: friend.id,
                    display_name: friend.display_name,
                    avatar_url: friend.avatar_url,
                    trail_name: null,
                    bio: null,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {t('groupChat.cancel')}
        </Button>
        <Button
          onClick={handleCreateGroup}
          disabled={isCreating || !groupName.trim() || selectedUsers.length === 0}
          className="flex-1"
        >
          {isCreating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Users className="mr-2 h-4 w-4" />
          )}
          {t('groupChat.createGroup')}
        </Button>
      </div>
    </div>
  );
}

interface UserRowProps {
  user: SearchedUser;
  onSelect: () => void;
}

function UserRow({ user, onSelect }: UserRowProps) {
  const displayName = user.display_name ?? 'Unknown';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatar_url ?? undefined} alt={displayName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        {user.trail_name && (
          <p className="truncate text-xs text-muted-foreground">
            &ldquo;{user.trail_name}&rdquo;
          </p>
        )}
      </div>
    </button>
  );
}
