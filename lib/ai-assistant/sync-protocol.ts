/**
 * Supabase Realtime Sync Protocol
 * Feature 050: AI Assistant
 *
 * Implements hybrid Realtime synchronization:
 * - Postgres Changes: For new messages in conversations (persistent events)
 * - Broadcast: For typing indicators and context updates (ephemeral events)
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Message } from '@/types/ai-assistant';

// =====================================================
// Event Types
// =====================================================

export type SyncEvent =
  | { type: 'message_inserted'; message: Message }
  | { type: 'typing_started'; userId: string; conversationId: string }
  | { type: 'typing_stopped'; userId: string; conversationId: string }
  | { type: 'context_updated'; userId: string; screen: string; loadoutId?: string };

export type SyncEventHandler = (event: SyncEvent) => void;

// =====================================================
// Postgres Changes Handlers
// =====================================================

/**
 * Handle new message insertion via Postgres Changes
 *
 * Triggered when a new row is inserted into the ai_messages table.
 * Filters to only show messages for the user's AI conversations.
 *
 * @param payload - Realtime payload from Supabase
 * @param handler - Callback to handle the event
 */
// Define the expected shape of ai_messages table row
interface AIMessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  inline_cards: unknown[] | null;
  actions: unknown[] | null;
  context: Record<string, unknown> | null;
  tokens_used: number | null;
}

export function handleMessageInsert(
  payload: RealtimePostgresChangesPayload<AIMessageRow>,
  handler: SyncEventHandler
): void {
  if (payload.eventType === 'INSERT' && payload.new) {
    const message: Message = {
      id: payload.new.id,
      conversationId: payload.new.conversation_id,
      role: payload.new.role,
      content: payload.new.content,
      createdAt: new Date(payload.new.created_at),
      inlineCards: payload.new.inline_cards || null,
      actions: payload.new.actions || null,
      context: payload.new.context || null,
      tokensUsed: payload.new.tokens_used || null,
    };

    handler({ type: 'message_inserted', message });
  }
}

// =====================================================
// Broadcast Event Handlers
// =====================================================

/**
 * Handle typing indicator broadcast event
 *
 * @param payload - Broadcast payload
 * @param handler - Callback to handle the event
 */
export function handleTypingBroadcast(
  payload: { userId: string; conversationId: string; typing: boolean },
  handler: SyncEventHandler
): void {
  const event: SyncEvent = payload.typing
    ? { type: 'typing_started', userId: payload.userId, conversationId: payload.conversationId }
    : { type: 'typing_stopped', userId: payload.userId, conversationId: payload.conversationId };

  handler(event);
}

/**
 * Handle context update broadcast event
 *
 * Used to synchronize user context across multiple browser tabs/sessions.
 *
 * @param payload - Broadcast payload
 * @param handler - Callback to handle the event
 */
export function handleContextBroadcast(
  payload: { userId: string; screen: string; loadoutId?: string },
  handler: SyncEventHandler
): void {
  handler({
    type: 'context_updated',
    userId: payload.userId,
    screen: payload.screen,
    loadoutId: payload.loadoutId,
  });
}

// =====================================================
// Channel Setup Helpers
// =====================================================

/**
 * Subscribe to Postgres Changes for a specific conversation
 *
 * @param channel - Realtime channel instance
 * @param conversationId - Conversation UUID to subscribe to
 * @param handler - Event handler callback
 */
export function subscribeToConversationMessages(
  channel: RealtimeChannel,
  conversationId: string,
  handler: SyncEventHandler
): void {
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'ai_messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => handleMessageInsert(payload, handler)
  );
}

/**
 * Subscribe to typing indicator broadcasts
 *
 * @param channel - Realtime channel instance
 * @param handler - Event handler callback
 */
export function subscribeToTypingIndicators(
  channel: RealtimeChannel,
  handler: SyncEventHandler
): void {
  channel.on(
    'broadcast',
    { event: 'typing' },
    (payload) => handleTypingBroadcast(payload.payload, handler)
  );
}

/**
 * Subscribe to context update broadcasts
 *
 * @param channel - Realtime channel instance
 * @param handler - Event handler callback
 */
export function subscribeToContextUpdates(
  channel: RealtimeChannel,
  handler: SyncEventHandler
): void {
  channel.on(
    'broadcast',
    { event: 'context' },
    (payload) => handleContextBroadcast(payload.payload, handler)
  );
}

// =====================================================
// Broadcast Senders
// =====================================================

/**
 * Broadcast typing indicator to other sessions
 *
 * @param channel - Realtime channel instance
 * @param userId - Current user ID
 * @param conversationId - Conversation UUID
 * @param typing - True if typing, false if stopped
 */
export async function broadcastTypingIndicator(
  channel: RealtimeChannel,
  userId: string,
  conversationId: string,
  typing: boolean
): Promise<void> {
  await channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId, conversationId, typing },
  });
}

/**
 * Broadcast context update to other sessions
 *
 * @param channel - Realtime channel instance
 * @param userId - Current user ID
 * @param screen - Current route/screen
 * @param loadoutId - Current loadout ID (if applicable)
 */
export async function broadcastContextUpdate(
  channel: RealtimeChannel,
  userId: string,
  screen: string,
  loadoutId?: string
): Promise<void> {
  await channel.send({
    type: 'broadcast',
    event: 'context',
    payload: { userId, screen, loadoutId },
  });
}

// =====================================================
// Cleanup
// =====================================================

/**
 * Unsubscribe from all events and clean up channel
 *
 * @param channel - Realtime channel to clean up
 */
export async function cleanupChannel(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe();
}
