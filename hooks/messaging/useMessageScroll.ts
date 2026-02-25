/**
 * useMessageScroll Hook
 *
 * Handles two conversation page effects:
 * 1. Auto-scrolling to the bottom when new messages arrive
 * 2. Marking messages as read when viewing a conversation
 *
 * Feature: Code Quality Review
 * Extracts useEffect calls from conversation detail page
 * following Feature-Sliced Light architecture (no useEffect in UI components).
 */

import { useEffect, type RefObject } from 'react';

interface UseMessageScrollOptions {
  /** Ref to the scroll anchor element at the bottom of the messages list */
  messagesEndRef: RefObject<HTMLDivElement | null>;
  /** The current messages array (scroll triggers on length change) */
  messages: ReadonlyArray<unknown>;
  /** The conversation ID (used to trigger mark-as-read) */
  conversationId: string;
  /** Function to mark all messages in the conversation as read */
  markAsRead: () => Promise<void>;
}

/**
 * Scrolls to the bottom of the messages list when new messages arrive
 * and marks the conversation as read.
 *
 * @example
 * const messagesEndRef = useRef<HTMLDivElement>(null);
 * useMessageScroll({
 *   messagesEndRef,
 *   messages,
 *   conversationId,
 *   markAsRead,
 * });
 * // Then in JSX: <div ref={messagesEndRef} />
 */
export function useMessageScroll({
  messagesEndRef,
  messages,
  conversationId,
  markAsRead,
}: UseMessageScrollOptions): void {
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  // Mark as read when viewing
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    let isCancelled = false;
    const doMarkAsRead = async () => {
      if (!isCancelled) {
        await markAsRead();
      }
    };
    doMarkAsRead();

    return () => {
      isCancelled = true;
    };
  }, [conversationId, messages.length, markAsRead]);
}
