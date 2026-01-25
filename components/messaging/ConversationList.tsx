/**
 * ConversationList - Conversation List Component
 *
 * Feature: 046-user-messaging-system
 * Task: T009
 *
 * Displays a list of conversations with previews.
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversations } from '@/hooks/messaging/useConversations';
import { useFriends } from '@/hooks/messaging/useFriends';
import { usePresenceStatus } from '@/hooks/messaging/usePresenceStatus';
import type { ConversationListItem } from '@/types/messaging';

interface ConversationListProps {
  onSelectConversation: (conversation: ConversationListItem) => void;
}

/**
 * Displays the list of user's conversations.
 */
export function ConversationList({ onSelectConversation }: ConversationListProps) {
  const t = useTranslations('Messaging.conversationList');
  const { conversations, isLoading, error } = useConversations();
  const { isFriend } = useFriends();
  const { isUserOnline } = usePresenceStatus();

  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-destructive">
        {t('loadError', { error })}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">{t('empty')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <ConversationListItemRow
          key={conversation.conversation.id}
          conversation={conversation}
          onClick={() => onSelectConversation(conversation)}
          isFriend={isFriend}
          isUserOnline={isUserOnline}
          translations={{
            muted: t('muted'),
            friend: t('friend'),
            noMessagesYet: t('noMessagesYet'),
            sentAnImage: t('sentAnImage'),
            sentVoiceMessage: t('sentVoiceMessage'),
            sharedLocation: t('sharedLocation'),
            sharedGearItem: t('sharedGearItem'),
            postedGearTrade: t('postedGearTrade'),
            sentTripInvitation: t('sentTripInvitation'),
            newMessage: t('newMessage'),
          }}
        />
      ))}
    </div>
  );
}

interface ConversationListItemTranslations {
  muted: string;
  friend: string;
  noMessagesYet: string;
  sentAnImage: string;
  sentVoiceMessage: string;
  sharedLocation: string;
  sharedGearItem: string;
  postedGearTrade: string;
  sentTripInvitation: string;
  newMessage: string;
}

interface ConversationListItemRowProps {
  conversation: ConversationListItem;
  onClick: () => void;
  isFriend: (userId: string) => boolean;
  isUserOnline: (userId: string) => boolean;
  translations: ConversationListItemTranslations;
}

function ConversationListItemRow({
  conversation,
  onClick,
  isFriend,
  isUserOnline,
  translations,
}: ConversationListItemRowProps) {
  const { conversation: conv, participants, unread_count, last_message, is_muted } =
    conversation;

  // Get first participant for direct conversations
  const firstParticipant = participants.length > 0 ? participants[0] : null;
  const isOnline = firstParticipant && conv.type === 'direct' ? isUserOnline(firstParticipant.id) : false;
  const isFriendStatus = firstParticipant && conv.type === 'direct' ? isFriend(firstParticipant.id) : false;

  // For direct conversations, show the other participant
  // For groups, show the group name
  const displayName =
    conv.type === 'group'
      ? conv.name
      : participants.map((p) => p.display_name).join(', ');

  const avatar =
    conv.type === 'direct' && participants.length > 0
      ? participants[0].avatar_url
      : null;

  const initials = displayName
    ? displayName
        .split(' ')
        .filter((n) => n.length > 0)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'
    : '?';

  const lastMessagePreview = last_message
    ? getMessagePreview(last_message.message_type, last_message.content, translations)
    : translations.noMessagesYet;

  const timeAgo = last_message
    ? formatDistanceToNow(new Date(last_message.created_at), { addSuffix: true })
    : '';

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50"
    >
      {/* Avatar with online indicator */}
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatar ?? undefined} alt={displayName ?? ''} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1">
            <span
              className={`truncate font-medium ${
                unread_count > 0 ? 'text-foreground' : 'text-foreground/80'
              }`}
            >
              {displayName}
            </span>
            {isFriendStatus && (
              <span title={translations.friend}>
                <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
              </span>
            )}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {last_message?.sender_name && conv.type === 'group' && (
              <span className="font-medium">{last_message.sender_name}: </span>
            )}
            {lastMessagePreview}
          </p>

          <div className="flex shrink-0 items-center gap-1">
            {is_muted && (
              <Badge variant="outline" className="h-5 px-1 text-xs">
                {translations.muted}
              </Badge>
            )}
            {unread_count > 0 && (
              <Badge className="h-5 min-w-5 justify-center px-1 text-xs">
                {unread_count > 99 ? '99+' : unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function getMessagePreview(
  type: string,
  content: string | null,
  translations: ConversationListItemTranslations
): string {
  switch (type) {
    case 'text':
      return content ?? '';
    case 'image':
      return translations.sentAnImage;
    case 'voice':
      return translations.sentVoiceMessage;
    case 'location':
      return translations.sharedLocation;
    case 'gear_reference':
      return translations.sharedGearItem;
    case 'gear_trade':
      return translations.postedGearTrade;
    case 'trip_invitation':
      return translations.sentTripInvitation;
    default:
      return translations.newMessage;
  }
}

function ConversationListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
