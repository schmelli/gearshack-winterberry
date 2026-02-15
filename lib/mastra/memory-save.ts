/**
 * Memory Save Utility
 * Feature: 060-ai-agent-evolution
 *
 * Shared function for saving conversation messages to memory.
 * Used by both the main chat route and the retry queue.
 */

import { logDebug, logInfo, logError, createTimer } from './logging';
import type { SupabaseMemoryAdapter } from './memory-adapter';

/**
 * Save user and assistant messages to conversation memory
 *
 * @param adapter - Memory adapter (can be null for graceful degradation)
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @param userMessage - User's message
 * @param assistantResponse - Assistant's response
 * @param isCorrection - Whether this is a correction of previous message
 * @returns Object with message IDs or null if save failed
 */
export async function saveToMemory(
  adapter: SupabaseMemoryAdapter | null,
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantResponse: string,
  isCorrection: boolean
): Promise<{ userMessageId: string; assistantMessageId: string } | null> {
  if (!adapter) {
    logDebug('Skipping memory save - adapter unavailable', { userId, conversationId });
    return null;
  }

  const getElapsed = createTimer();

  try {
    const now = new Date();
    const metadata = isCorrection ? { isCorrection: true } : {};

    // Generate UUIDs that will be used for both saving and embedding
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    await adapter.saveMessages([
      {
        id: userMessageId,
        userId,
        conversationId,
        role: 'user',
        content: userMessage,
        metadata,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: assistantMessageId,
        userId,
        conversationId,
        role: 'assistant',
        content: assistantResponse,
        metadata: {},
        createdAt: new Date(now.getTime() + 1),
        updatedAt: new Date(now.getTime() + 1),
      },
    ]);

    logInfo('Messages saved to memory', {
      userId,
      conversationId,
      metadata: {
        isCorrection,
        latencyMs: getElapsed(),
      },
    });

    return { userMessageId, assistantMessageId };
  } catch (error) {
    // Log but don't fail the request
    logError('Failed to save messages to memory', error, {
      userId,
      conversationId,
      metadata: { latencyMs: getElapsed() },
    });
    return null;
  }
}
