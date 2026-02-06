/**
 * Messages Page - Conversation List
 *
 * Feature: 046-user-messaging-system
 *
 * Displays user's conversations with real-time updates.
 */

'use client';



import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, User, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useConversations } from '@/hooks/messaging/useConversations';
import { useRecipientRedirect } from '@/hooks/messaging/useRecipientRedirect';
import { Link } from '@/i18n/navigation';
import type { ConversationListItem } from '@/types/messaging';
import { cn } from '@/lib/utils';

// ============================================================================
// Conversation List Item Component
// ============================================================================

interface ConversationItemProps {
  item: ConversationListItem;
  locale: string;
}

function ConversationItem({ item, locale }: ConversationItemProps) {
  const t = useTranslations('Messages');
  const dateLocale = locale === 'de' ? de : enUS;

  // Get the other participant for direct conversations
  const otherParticipant = item.participants.find(
    (p) => p.display_name !== 'You'
  );
  const displayName =
    item.conversation.type === 'group'
      ? item.conversation.name || t('unnamedGroup')
      : otherParticipant?.display_name || t('unknownUser');
  const avatarUrl =
    item.conversation.type === 'group'
      ? null
      : otherParticipant?.avatar_url;

  // Format last message time
  const lastMessageTime = item.last_message?.created_at
    ? formatDistanceToNow(new Date(item.last_message.created_at), {
        addSuffix: true,
        locale: dateLocale,
      })
    : null;

  return (
    <Link href={`/messages/${item.conversation.id}`}>
      <Card
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted/50',
          item.unread_count > 0 && 'border-primary/50 bg-primary/5'
        )}
      >
        <CardContent className="flex items-center gap-3 p-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback>
              {item.conversation.type === 'group' ? (
                <MessageCircle className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3
                className={cn(
                  'truncate text-sm',
                  item.unread_count > 0 ? 'font-semibold' : 'font-medium'
                )}
              >
                {displayName}
              </h3>
              {lastMessageTime && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {lastMessageTime}
                </span>
              )}
            </div>
            {item.last_message && (
              <p className="truncate text-sm text-muted-foreground">
                {item.last_message.content || t('mediaMessage')}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex shrink-0 items-center gap-2">
            {item.unread_count > 0 && (
              <Badge variant="default" className="h-5 min-w-5 rounded-full px-1.5">
                {item.unread_count}
              </Badge>
            )}
            {item.is_muted && (
              <Badge variant="secondary" className="text-xs">
                {t('muted')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  const t = useTranslations('Messages');

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <MessageCircle className="mb-4 h-16 w-16 text-muted-foreground/50" />
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {t('empty.title')}
      </h3>
      <p className="text-sm text-muted-foreground">{t('empty.description')}</p>
    </div>
  );
}

// ============================================================================
// Messages Content
// ============================================================================

function MessagesContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const recipientId = searchParams.get('recipient');

  const { conversations, isLoading, error, startDirectConversation } =
    useConversations();

  // Handle recipient query param - start conversation with that user
  const { isStartingConversation, hasRecipient } = useRecipientRedirect({
    recipientId,
    startDirectConversation,
  });

  // Show loading while starting conversation with recipient
  if (hasRecipient || isStartingConversation) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2">
      {conversations.map((item) => (
        <ConversationItem key={item.conversation.id} item={item} locale={locale} />
      ))}
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function MessagesPage() {
  const t = useTranslations('Messages');

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl space-y-6 p-4">
        {/* Page header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        {/* Conversations list */}
        <MessagesContent />
      </div>
    </ProtectedRoute>
  );
}
