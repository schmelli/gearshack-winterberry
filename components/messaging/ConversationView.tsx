/**
 * ConversationView - Message Thread View Component
 *
 * Feature: 046-user-messaging-system
 * Task: T015, T022
 *
 * Displays the message thread with real-time updates.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Lock } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { useMessages } from '@/hooks/messaging/useMessages';
import { useTypingIndicator } from '@/hooks/messaging/useTypingIndicator';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { ConversationListItem, ReactionEmoji, MessageType, MessageMetadata } from '@/types/messaging';
import { toast } from 'sonner';
import { addReaction, removeReaction } from '@/lib/supabase/messaging-queries';

interface ConversationViewProps {
  conversation: ConversationListItem;
  onBack?: () => void;
}

/**
 * Displays the message thread for a conversation.
 */
export function ConversationView({ conversation }: ConversationViewProps) {
  const { user } = useSupabaseAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationId = conversation.conversation.id;

  const {
    messages,
    isLoading,
    error,
    send,
    sendWithMedia,
    markAsRead,
    deleteForMe,
    deleteForAll,
    getDeliveryStatus,
  } = useMessages(conversationId);

  const { typingUsers, setTyping } = useTypingIndicator(conversationId);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    if (conversationId && user?.id) {
      markAsRead();
    }
  }, [conversationId, user?.id, markAsRead]);

  const handleSend = useCallback(
    async (content: string) => {
      try {
        await send(content);
      } catch {
        toast.error('Failed to send message');
      }
    },
    [send]
  );

  const handleSendWithMedia = useCallback(
    async (
      content: string | null,
      messageType: MessageType,
      mediaUrl: string | null,
      metadata?: MessageMetadata
    ) => {
      try {
        await sendWithMedia(content, messageType, mediaUrl, metadata);
      } catch {
        toast.error('Failed to send message');
      }
    },
    [sendWithMedia]
  );

  const handleViewGear = useCallback((gearItemId: string) => {
    // TODO: Open gear detail modal
    toast.info('Viewing gear item: ' + gearItemId);
  }, []);

  const handleReact = useCallback(
    async (messageId: string, emoji: ReactionEmoji) => {
      if (!user) return;
      const userId = user.id;

      try {
        // Check if already reacted
        const message = messages.find((m) => m.id === messageId);
        const existingReaction = message?.reactions.find(
          (r) => r.user_id === userId && r.emoji === emoji
        );

        if (existingReaction) {
          await removeReaction(messageId, userId, emoji);
        } else {
          await addReaction(messageId, userId, emoji);
        }
      } catch {
        toast.error('Failed to update reaction');
      }
    },
    [user, messages]
  );

  const handleDelete = useCallback(
    async (messageId: string, forAll: boolean) => {
      try {
        if (forAll) {
          await deleteForAll(messageId);
          toast.success('Message deleted for everyone');
        } else {
          await deleteForMe(messageId);
          toast.success('Message deleted');
        }
      } catch {
        toast.error('Failed to delete message');
      }
    },
    [deleteForAll, deleteForMe]
  );

  const handleReport = useCallback((messageId: string) => {
    // TODO: Open report dialog
    toast.info('Report feature coming soon');
    console.log('Report message:', messageId);
  }, []);

  const handleCopy = useCallback(() => {
    toast.success('Message copied to clipboard');
  }, []);

  // Check if conversation is blocked or privacy restricted
  const isPrivacyBlocked = false; // TODO: Check against privacy settings

  if (isLoading) {
    return <ConversationViewSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-center">{error}</p>
      </div>
    );
  }

  if (isPrivacyBlocked) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-muted-foreground">
        <Lock className="h-12 w-12" />
        <div className="text-center">
          <p className="font-medium">Cannot send messages</p>
          <p className="mt-1 text-sm">
            This user has restricted who can message them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwnMessage = message.sender_id === user?.id;
              const showSender =
                conversation.conversation.type === 'group' ||
                index === 0 ||
                messages[index - 1]?.sender_id !== message.sender_id;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showSender={showSender}
                  deliveryStatus={getDeliveryStatus(message)}
                  onReact={(emoji) => handleReact(message.id, emoji)}
                  onDelete={(forAll) => handleDelete(message.id, forAll)}
                  onReport={() => handleReport(message.id)}
                  onCopy={handleCopy}
                  onViewGear={handleViewGear}
                />
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Message input */}
      <MessageInput
        onSend={handleSend}
        onSendWithMedia={handleSendWithMedia}
        onTyping={setTyping}
      />
    </div>
  );
}

function ConversationViewSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-4">
        {/* Received message */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-16 w-48 rounded-2xl" />
        </div>
        {/* Sent message */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-40 rounded-2xl" />
        </div>
        {/* Received message */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-20 w-56 rounded-2xl" />
        </div>
      </div>
      <div className="border-t p-3">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
