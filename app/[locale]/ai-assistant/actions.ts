'use server';

/**
 * AI Assistant Server Actions
 * Feature 050: AI Assistant
 *
 * Provides server-side action execution for AI-suggested actions:
 * - Wishlist management
 * - Gear comparison
 * - Community messaging
 * - Navigation
 * - Action result persistence
 *
 * NOTE: The old sendAIMessage function has been removed.
 * All AI chat is now handled by /api/mastra/chat via the useMastraChat hook.
 * See the Mastra implementation for memory, tools, and streaming.
 */

import { createClient } from '@/lib/supabase/server';
import { MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } from '@/lib/ai-assistant/constants';
import type { Json } from '@/types/supabase';
import { z } from 'zod';

// =====================================================
// Security Utilities
// =====================================================

/**
 * Sanitize error messages before returning to client
 * Prevents leaking sensitive information (database errors, stack traces, etc.)
 *
 * @param error - The error object or message
 * @param fallbackMessage - Generic message to return
 * @returns Sanitized error message safe for client
 */
function sanitizeError(error: unknown, fallbackMessage: string): string {
  // Log the full error server-side for debugging
  console.error('Error details:', error);

  // Return generic message to client
  return fallbackMessage;
}

/**
 * Validate and sanitize message content
 * Prevents XSS attacks and enforces length limits
 */
const messageContentSchema = z
  .string()
  .trim()
  .min(MIN_MESSAGE_LENGTH, 'Message cannot be empty')
  .max(MAX_MESSAGE_LENGTH, `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`)
  .transform((str) => {
    // Remove any potentially dangerous HTML/script tags
    // Note: This is defense-in-depth; client should also sanitize
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove inline event handlers
  });

/**
 * Delete a conversation and all its messages
 *
 * @param conversationId - Conversation UUID to delete
 * @returns Success status
 */
export async function deleteConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id); // Ensure user owns the conversation

  if (error) {
    return { success: false, error: sanitizeError(error, 'Failed to delete conversation') };
  }

  return { success: true };
}

// =====================================================
// User Story 2: Action Execution Server Actions
// =====================================================

/**
 * T054: Add gear item to wishlist
 *
 * @param gearItemId - Gear item UUID to add to wishlist
 * @returns Success status
 */
export async function executeAddToWishlist(gearItemId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify the gear item exists and belongs to the user
  const { data: gearItem, error: fetchError } = await supabase
    .from('gear_items')
    .select('id, status')
    .eq('id', gearItemId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !gearItem) {
    return { success: false, error: 'Gear item not found' };
  }

  // Update status to wishlist
  const { error: updateError } = await supabase
    .from('gear_items')
    .update({ status: 'wishlist' })
    .eq('id', gearItemId)
    .eq('user_id', user.id);

  if (updateError) {
    return { success: false, error: sanitizeError(updateError, 'Failed to add item to wishlist') };
  }

  return { success: true };
}

/**
 * T055: Prepare gear comparison
 *
 * @param gearItemIds - Array of gear item UUIDs to compare
 * @returns Comparison URL with query params
 */
export async function executeCompareGear(
  gearItemIds: string[]
): Promise<{ success: boolean; compareUrl?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate gear item IDs (must be at least 2, max 4)
  if (!gearItemIds || gearItemIds.length < 2) {
    return { success: false, error: 'Need at least 2 items to compare' };
  }

  if (gearItemIds.length > 4) {
    return { success: false, error: 'Can compare at most 4 items' };
  }

  // Verify all gear items exist and belong to the user
  const { data: gearItems, error: fetchError } = await supabase
    .from('gear_items')
    .select('id')
    .in('id', gearItemIds)
    .eq('user_id', user.id);

  if (fetchError || !gearItems || gearItems.length !== gearItemIds.length) {
    return { success: false, error: 'One or more gear items not found' };
  }

  // Build comparison URL with query params
  const compareUrl = `/inventory/compare?ids=${gearItemIds.join(',')}`;

  return { success: true, compareUrl };
}

/**
 * T056: Send community message to another user
 *
 * @param recipientId - Recipient user UUID
 * @param message - Message content
 * @returns Conversation ID
 */
export async function executeSendMessage(
  recipientId: string,
  message: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate and sanitize message content
  const validationResult = messageContentSchema.safeParse(message);
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0]?.message || 'Invalid message content',
    };
  }
  const sanitizedMessage = validationResult.data;

  // Validate recipient exists
  const { data: recipient, error: recipientError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', recipientId)
    .single();

  if (recipientError || !recipient) {
    return { success: false, error: 'Recipient not found' };
  }

  // Find existing direct conversation between these two users
  // Query for conversations where both users are participants
  const { data: userConversations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id);

  const { data: recipientConversations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', recipientId);

  // Find common conversation IDs
  const commonConversationIds =
    userConversations
      ?.filter((uc) => recipientConversations?.some((rc) => rc.conversation_id === uc.conversation_id))
      .map((uc) => uc.conversation_id) || [];

  let conversationId: string | null = null;

  // Check if any of these common conversations are direct (type='direct')
  if (commonConversationIds.length > 0) {
    const { data: directConversation } = await supabase
      .from('conversations')
      .select('id')
      .in('id', commonConversationIds)
      .eq('type', 'direct')
      .limit(1)
      .single();

    if (directConversation) {
      conversationId = directConversation.id;
    }
  }

  // If no existing conversation, create a new one
  if (!conversationId) {
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (createError || !newConversation) {
      return { success: false, error: 'Failed to create conversation' };
    }

    conversationId = newConversation.id;

    // Add both users as participants
    const { error: participantsError } = await supabase.from('conversation_participants').insert([
      {
        conversation_id: conversationId,
        user_id: user.id,
        role: 'member',
      },
      {
        conversation_id: conversationId,
        user_id: recipientId,
        role: 'member',
      },
    ]);

    if (participantsError) {
      return { success: false, error: 'Failed to add participants' };
    }
  }

  // Insert message (using sanitized content)
  const { error: messageError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: sanitizedMessage,
  });

  if (messageError) {
    return { success: false, error: sanitizeError(messageError, 'Failed to send message') };
  }

  return { success: true, conversationId };
}

/**
 * T057: Navigate to a specific screen
 *
 * @param destination - Navigation destination (e.g., "inventory", "loadouts", "loadout:123")
 * @returns Navigation path
 */
export async function executeNavigate(destination: string): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Parse destination and build navigation path
  let path: string;

  if (destination === 'inventory') {
    path = '/inventory';
  } else if (destination === 'wishlist') {
    path = '/wishlist';
  } else if (destination === 'loadouts') {
    path = '/loadouts';
  } else if (destination.startsWith('loadout:')) {
    const loadoutId = destination.split(':')[1];
    // Verify loadout exists and belongs to user
    const { data: loadout, error } = await supabase
      .from('loadouts')
      .select('id')
      .eq('id', loadoutId)
      .eq('user_id', user.id)
      .single();

    if (error || !loadout) {
      return { success: false, error: 'Loadout not found' };
    }

    path = `/loadouts/${loadoutId}`;
  } else if (destination.startsWith('gear:')) {
    const gearId = destination.split(':')[1];
    // Verify gear item exists and belongs to user
    const { data: gear, error } = await supabase
      .from('gear_items')
      .select('id')
      .eq('id', gearId)
      .eq('user_id', user.id)
      .single();

    if (error || !gear) {
      return { success: false, error: 'Gear item not found' };
    }

    path = `/inventory/${gearId}`;
  } else {
    return { success: false, error: 'Invalid navigation destination' };
  }

  return { success: true, path };
}

// =====================================================
// Action Results Persistence (Issue #60)
// =====================================================

/**
 * Update action execution results in the database
 *
 * Persists action status (completed/failed) to prevent data loss on page reload
 * and provide audit trail of executed actions.
 *
 * @param messageId - AI message UUID containing the action
 * @param actionId - Unique action identifier (e.g., "add_to_wishlist_0")
 * @param status - Execution status ("completed" or "failed")
 * @param result - Optional result data from successful execution
 * @param error - Optional error message from failed execution
 * @returns Success status
 */
export async function updateActionResult(
  messageId: string,
  actionId: string,
  status: 'completed' | 'failed',
  result?: Record<string, unknown>,
  error?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify the message exists and belongs to user's conversation
  const { data: message, error: fetchError } = await supabase
    .from('ai_messages')
    .select('id, action_results, conversation_id')
    .eq('id', messageId)
    .single();

  if (fetchError || !message) {
    return { success: false, error: 'Message not found' };
  }

  // Verify conversation ownership
  const { data: conversation, error: convError } = await supabase
    .from('ai_conversations')
    .select('user_id')
    .eq('id', message.conversation_id)
    .single();

  if (convError || !conversation || conversation.user_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // Build updated action_results object
  const currentResults = (message.action_results as Record<string, unknown>) || {};
  const updatedResults = {
    ...currentResults,
    [actionId]: {
      status,
      executed_at: new Date().toISOString(),
      ...(result && { result }),
      ...(error && { error }),
    },
  };

  // Update message with new action results
  const { error: updateError } = await supabase
    .from('ai_messages')
    .update({ action_results: updatedResults as unknown as Json })
    .eq('id', messageId);

  if (updateError) {
    return { success: false, error: sanitizeError(updateError, 'Failed to update action results') };
  }

  return { success: true };
}
