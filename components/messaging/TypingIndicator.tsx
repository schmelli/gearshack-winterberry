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
  if (typingUsers.length === 0) {
    return null;
  }

  // Build typing text
  let typingText: string;
  if (typingUsers.length === 1) {
    typingText = `${typingUsers[0].displayName} is typing`;
  } else if (typingUsers.length === 2) {
    typingText = `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing`;
  } else {
    typingText = 'Several people are typing';
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
