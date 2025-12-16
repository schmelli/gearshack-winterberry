/**
 * Message Bubble Component
 * Feature 050: AI Assistant - T034
 *
 * Renders individual chat messages with role-based styling.
 * Supports markdown formatting and inline gear cards.
 */

'use client';

import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';
import { InlineGearCard } from './InlineGearCard';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  inline_cards?: any[];
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

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
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>

        {/* Inline Cards (Gear References) */}
        {!isUser && message.inline_cards && message.inline_cards.length > 0 && (
          <div className="space-y-2">
            {message.inline_cards.map((card: any, index: number) => (
              <InlineGearCard key={card.id || index} gearId={card.id} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="px-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
