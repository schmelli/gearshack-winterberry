/**
 * UserProfileModal - View Other Users' Profiles
 *
 * Feature: 046-user-messaging-system
 * Task: T025
 *
 * Modal for viewing another user's profile with messaging-related actions:
 * - Send message
 * - Add/Remove friend
 * - Block user
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { MessageCircle, UserPlus, UserMinus, Shield, Loader2, MapPin, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useFriends } from '@/hooks/messaging/useFriends';
import { usePresenceStatus } from '@/hooks/messaging/usePresenceStatus';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_name: string | null;
  created_at: string;
}

interface UserProfileModalProps {
  /** User ID to display */
  userId: string | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when user wants to send a message */
  onSendMessage?: (userId: string, displayName: string) => void;
  /** Callback when user wants to block */
  onBlock?: (userId: string) => void;
}

export function UserProfileModal({
  userId,
  open,
  onOpenChange,
  onSendMessage,
  onBlock,
}: UserProfileModalProps) {
  const t = useTranslations('Messaging');
  const { isFriend, addFriend, removeFriend } = useFriends();
  const { isUserOnline } = usePresenceStatus();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      if (!userId || !open) return;

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, location_name, created_at')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;
        setProfile(data);
      } catch (err) {
        console.error('[UserProfileModal] Failed to fetch profile:', err);
        setError(t('userProfile.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [userId, open]);

  const handleFriendToggle = useCallback(async () => {
    if (!profile) return;

    setFriendActionLoading(true);
    if (isFriend(profile.id)) {
      await removeFriend(profile.id);
    } else {
      await addFriend(profile.id);
    }
    setFriendActionLoading(false);
  }, [profile, isFriend, addFriend, removeFriend]);

  const handleSendMessage = useCallback(() => {
    if (!profile) return;
    onSendMessage?.(profile.id, profile.display_name ?? 'Unknown');
    onOpenChange(false);
  }, [profile, onSendMessage, onOpenChange]);

  const handleBlock = useCallback(() => {
    if (!profile) return;
    onBlock?.(profile.id);
    onOpenChange(false);
  }, [profile, onBlock, onOpenChange]);

  if (!userId) return null;

  const isOnline = profile ? isUserOnline(profile.id) : false;
  const friendStatus = profile ? isFriend(profile.id) : false;
  const displayName = profile?.display_name ?? 'Unknown';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">{t('userProfile.title')}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {profile && !isLoading && (
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Avatar with online indicator */}
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={profile.avatar_url ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              {isOnline && (
                <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-4 border-background bg-green-500" />
              )}
            </div>

            {/* Name and status */}
            <div className="text-center">
              <h3 className="text-lg font-semibold">{displayName}</h3>
              <p className="text-sm text-muted-foreground">
                {isOnline ? t('userProfile.online') : t('userProfile.offline')}
              </p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-center text-sm text-muted-foreground">
                {profile.bio}
              </p>
            )}

            {/* Location and member since */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              {profile.location_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.location_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('userProfile.memberSince', {
                  time: formatDistanceToNow(new Date(profile.created_at), {
                    addSuffix: true,
                  }),
                })}
              </span>
            </div>

            {/* Actions */}
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button onClick={handleSendMessage} className="w-full">
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('userProfile.sendMessage')}
              </Button>

              <Button
                variant={friendStatus ? 'outline' : 'secondary'}
                onClick={handleFriendToggle}
                disabled={friendActionLoading}
                className="w-full"
              >
                {friendActionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : friendStatus ? (
                  <UserMinus className="mr-2 h-4 w-4" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {friendStatus ? t('userProfile.removeFriend') : t('userProfile.addFriend')}
              </Button>

              <Button
                variant="ghost"
                onClick={handleBlock}
                className="w-full text-destructive hover:text-destructive"
              >
                <Shield className="mr-2 h-4 w-4" />
                {t('userProfile.blockUser')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
