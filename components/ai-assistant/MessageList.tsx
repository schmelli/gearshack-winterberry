/**
 * Message List Component
 * Feature 050: AI Assistant - T033
 *
 * Scrollable container for AI chat messages.
 * Auto-scrolls to bottom on new messages.
 */

'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  inline_cards?: any[];
}

interface MessageListProps {
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming?: boolean;
}

export function MessageList({ conversationId, messages, isLoading, isStreaming = false }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Empty state
  if (!conversationId || messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
          <span className="text-3xl">👋</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold">Welcome to AI Gear Assistant!</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          I can help you optimize your loadouts, find lighter gear alternatives, and answer questions about your inventory.
        </p>
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Try asking:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "What's my base weight?",
              'Recommend a lighter tent',
              'Show me my sleeping bags',
            ].map((suggestion, i) => (
              <div
                key={i}
                className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs"
              >
                "{suggestion}"
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scroll-smooth px-6 py-4"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message, index) => {
          // Show streaming indicator on the last assistant message
          const isLastMessage = index === messages.length - 1;
          const isAssistantMessage = message.role === 'assistant';
          const showStreamingIndicator = isLastMessage && isAssistantMessage && isStreaming;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={showStreamingIndicator}
            />
          );
        })}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI is thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
