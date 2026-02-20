/**
 * Message List Component
 * Feature 050: AI Assistant - T033
 * Feature 001: Mastra Voice - Voice Output Integration
 *
 * Scrollable container for AI chat messages.
 * Auto-scrolls to bottom on new messages.
 * Supports TTS playback for assistant messages.
 */

'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InlineCard {
  id: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  inline_cards?: InlineCard[];
}

interface MessageListProps {
  conversationId?: string | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming?: boolean;
  /** Callback to speak a message via TTS */
  onSpeakMessage?: (text: string) => void;
  /** Whether audio is currently playing */
  isPlayingAudio?: boolean;
  /** Current workflow progress message from the AI pipeline */
  progressMessage?: string | null;
}

export function MessageList({
  messages,
  isLoading,
  isStreaming = false,
  onSpeakMessage,
  isPlayingAudio = false,
  progressMessage = null,
}: MessageListProps) {
  const t = useTranslations('AIAssistant');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Empty state
  if (messages.length === 0) {
    const suggestions = [
      t('welcome.suggestion1'),
      t('welcome.suggestion2'),
      t('welcome.suggestion3'),
    ];

    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
          <span className="text-3xl">👋</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t('welcome.title')}</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {t('welcome.description')}
        </p>
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">{t('welcome.tryAsking')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, i) => (
              <div
                key={i}
                className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs"
              >
                &ldquo;{suggestion}&rdquo;
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
      className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-4"
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
              onSpeak={isAssistantMessage && onSpeakMessage ? () => onSpeakMessage(message.content) : undefined}
              isPlayingAudio={isPlayingAudio}
            />
          );
        })}
        {/* Show progress indicator when last assistant message is empty (waiting for content) */}
        {(() => {
          const lastMsg = messages[messages.length - 1];
          const showProgressIndicator = isStreaming && lastMsg?.role === 'assistant' && !lastMsg.content;

          if (showProgressIndicator) {
            return (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex max-w-[75%] flex-col items-start gap-2">
                  <div className="rounded-2xl bg-muted px-4 py-2 text-foreground">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{progressMessage || t('thinking')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (isLoading) {
            return (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('thinking')}</span>
              </div>
            );
          }

          return null;
        })()}
      </div>
    </div>
  );
}
