/**
 * Conversation Detail Page
 *
 * Feature: 046-user-messaging-system
 *
 * Displays messages in a conversation with real-time updates.
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Send, ArrowLeft, User, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useMessages } from '@/hooks/messaging/useMessages';
import { useConversations } from '@/hooks/messaging/useConversations';
import { useMessageScroll } from '@/hooks/messaging/useMessageScroll';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Link } from '@/i18n/navigation';
import type { MessageWithSender } from '@/types/messaging';
import { cn } from '@/lib/utils';

// ============================================================================
// Message Bubble Component
// ============================================================================

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  locale: string;
}

function MessageBubble({ message, isOwn, locale }: MessageBubbleProps) {
  const dateLocale = locale === 'de' ? de : enUS;

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';

    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: dateLocale });
    } else if (isYesterday(date)) {
      return `${locale === 'de' ? 'Gestern' : 'Yesterday'} ${format(date, 'HH:mm', { locale: dateLocale })}`;
    }
    return format(date, 'dd.MM.yyyy HH:mm', { locale: dateLocale });
  };

  return (
    <div
      className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0">
          {message.sender?.avatar_url && (
            <AvatarImage
              src={message.sender.avatar_url}
              alt={message.sender.display_name || 'User'}
            />
          )}
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {!isOwn && message.sender && (
          <p className="mb-1 text-xs font-medium opacity-70">
            {message.sender.display_name}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content}
        </p>
        <p
          className={cn(
            'mt-1 text-xs',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Conversation Content
// ============================================================================

function ConversationContent() {
  const t = useTranslations('Messages');
  const locale = useLocale();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { user } = useSupabaseAuth();

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isLoading, error, send, markAsRead } =
    useMessages(conversationId);
  const { conversations } = useConversations();

  // Find the current conversation for header info
  const currentConversation = conversations.find(
    (c) => c.conversation.id === conversationId
  );
  const otherParticipant = currentConversation?.participants.find(
    (p) => p.id !== user?.id
  );
  const conversationName =
    currentConversation?.conversation.type === 'group'
      ? currentConversation.conversation.name || t('unnamedGroup')
      : otherParticipant?.display_name || t('unknownUser');

  // Scroll to bottom on new messages and mark as read
  useMessageScroll({ messagesEndRef, messages, conversationId, markAsRead });

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await send(newMessage.trim());
      setNewMessage('');
      inputRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isSending, send]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4">
        <Link href="/messages">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Avatar className="h-10 w-10">
          {otherParticipant?.avatar_url && (
            <AvatarImage
              src={otherParticipant.avatar_url}
              alt={conversationName}
            />
          )}
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{conversationName}</h2>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t('conversation.noMessages')}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === user?.id}
                locale={locale}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('conversation.placeholder')}
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function ConversationPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto h-[calc(100vh-120px)] max-w-2xl">
        <Card className="h-full overflow-hidden">
          <ConversationContent />
        </Card>
      </div>
    </ProtectedRoute>
  );
}
