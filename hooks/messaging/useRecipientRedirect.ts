/**
 * useRecipientRedirect Hook
 *
 * Handles starting a direct conversation when a recipient query param is present.
 * Automatically redirects to the new conversation page on success.
 *
 * Feature: Code Quality Review
 * Extracts useEffect from messages page following Feature-Sliced Light architecture.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UseRecipientRedirectOptions {
  /** Recipient user ID from URL search params (null if not present) */
  recipientId: string | null;
  /** Function to start a direct conversation, returns conversationId on success */
  startDirectConversation: (
    recipientId: string
  ) => Promise<{ success: boolean; conversationId?: string }>;
}

interface UseRecipientRedirectReturn {
  /** Whether a conversation is currently being started */
  isStartingConversation: boolean;
  /** Whether a recipient param is present (used to show loading UI) */
  hasRecipient: boolean;
}

/**
 * When a recipientId URL param is present, starts a direct conversation
 * and redirects to the conversation page.
 *
 * @example
 * const { isStartingConversation, hasRecipient } = useRecipientRedirect({
 *   recipientId: searchParams.get('recipient'),
 *   startDirectConversation,
 * });
 */
export function useRecipientRedirect({
  recipientId,
  startDirectConversation,
}: UseRecipientRedirectOptions): UseRecipientRedirectReturn {
  const router = useRouter();
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  useEffect(() => {
    if (!recipientId || isStartingConversation) return;

    let isCancelled = false;

    const startConversation = async () => {
      setIsStartingConversation(true);
      try {
        const result = await startDirectConversation(recipientId);
        if (isCancelled) return;
        if (result.success && result.conversationId) {
          router.replace(`/messages/${result.conversationId}`);
        } else {
          setIsStartingConversation(false);
        }
      } catch (error) {
        console.error('Failed to start conversation:', error);
        if (!isCancelled) {
          setIsStartingConversation(false);
        }
      }
    };

    startConversation();

    return () => {
      isCancelled = true;
    };
  }, [recipientId, startDirectConversation, router, isStartingConversation]);

  return {
    isStartingConversation,
    hasRecipient: !!recipientId,
  };
}
