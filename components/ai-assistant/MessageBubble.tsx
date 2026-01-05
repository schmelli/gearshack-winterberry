/**
 * Message Bubble Component
 * Feature 050: AI Assistant - T034, T060
 * Feature 001: Mastra Voice - TTS Play Button
 *
 * Renders individual chat messages with role-based styling.
 * Supports markdown formatting, inline gear cards, action buttons, and TTS playback.
 */

'use client';

import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { InlineGearCard } from './InlineGearCard';
import { ActionButtons } from './ActionButtons';
import { InlinePlayButton } from './AudioPlaybackControls';
import { useChatActions } from '@/hooks/ai-assistant/useChatActions';
import { formatDistanceToNow } from 'date-fns';
import type { Action } from '@/types/ai-assistant';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  inline_cards?: any[];
  actions?: Action[];
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  /** Callback to speak this message via TTS */
  onSpeak?: () => void;
  /** Whether audio is currently playing */
  isPlayingAudio?: boolean;
}

export function MessageBubble({
  message,
  isStreaming = false,
  onSpeak,
  isPlayingAudio = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const { executeAction, isExecuting } = useChatActions();

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex max-w-[75%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 text-sm">
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="my-0">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => <code className="rounded bg-muted-foreground/10 px-1 py-0.5 font-mono text-xs">{children}</code>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
              {!isUser && isStreaming && (
                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-current" />
              )}
            </div>
            {/* TTS Play Button for assistant messages */}
            {!isUser && onSpeak && message.content && !isStreaming && (
              <InlinePlayButton
                isPlaying={isPlayingAudio}
                onClick={onSpeak}
                className="shrink-0 mt-0.5"
              />
            )}
          </div>
        </div>

        {/* Inline Cards (Gear References) */}
        {!isUser && message.inline_cards && message.inline_cards.length > 0 && (
          <div className="space-y-2">
            {message.inline_cards.map((card: any, index: number) => (
              <InlineGearCard key={card.id || index} gearId={card.id} />
            ))}
          </div>
        )}

        {/* T060: Action Buttons */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <ActionButtons
            actions={message.actions}
            onActionClick={executeAction}
            disabled={isExecuting}
          />
        )}

        {/* Timestamp */}
        <span className="px-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
