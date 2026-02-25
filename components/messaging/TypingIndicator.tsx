/**
 * TypingIndicator - Typing Status Display Component
 *
 * Feature: 046-user-messaging-system
 * Task: T061
 *
 * Displays who is currently typing in the conversation.
 */

'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface TypingUser {
  userId: string;
  displayName: string;
  timestamp: number;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

/**
 * Animated typing indicator showing who is typing.
 */
export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  const t = useTranslations('Messaging');

  if (typingUsers.length === 0) {
    return null;
  }

  // Build typing text
  let typingText: string;
  if (typingUsers.length === 1) {
    typingText = t('typing.oneUser', { name: typingUsers[0].displayName });
  } else if (typingUsers.length === 2) {
    typingText = t('typing.twoUsers', { name1: typingUsers[0].displayName, name2: typingUsers[1].displayName });
  } else {
    typingText = t('typing.several');
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground',
        className
      )}
    >
      {/* Animated dots */}
      <span className="flex items-center gap-0.5">
        <span className="animate-bounce-slow h-1.5 w-1.5 rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
        <span className="animate-bounce-slow h-1.5 w-1.5 rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
        <span className="animate-bounce-slow h-1.5 w-1.5 rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
      </span>

      <span>{typingText}</span>
    </div>
  );
}
