'use server';

/**
 * AI Assistant Server Actions
 * Feature 050: AI Assistant
 *
 * Provides server-side API for AI chat interactions with:
 * - Authentication checks
 * - Rate limiting (30 messages/hour)
 * - Conversation management
 * - AI query processing with caching fallback
 */

import { createClient } from '@/lib/supabase/server';
import { generateAIResponse, isAIAvailable } from '@/lib/ai-assistant/ai-client';
import { buildSystemPrompt } from '@/lib/ai-assistant/prompt-builder';
import { parseAIResponse, sanitizeResponse } from '@/lib/ai-assistant/response-parser';
import { getCachedResponse, isCacheableQuery, getFallbackResponse } from '@/lib/ai-assistant/cache-strategy';
import { traceAIQuery, recordTokenUsage, recordRateLimitExceeded, logAIQuery } from '@/lib/ai-assistant/observability';
import type { UserContext } from '@/types/ai-assistant';

// =====================================================
// Types
// =====================================================

export type AIMessageResult =
  | { success: true; messageId: string; response: string }
  | { success: false; error: string; errorCode: 'RATE_LIMITED' | 'UNAUTHORIZED' | 'AI_UNAVAILABLE' | 'INVALID_INPUT' };

// =====================================================
// Main Server Action
// =====================================================

/**
 * Send a message to the AI assistant
 *
 * Workflow:
 * 1. Authenticate user and check subscription tier
 * 2. Check rate limit (30 messages/hour)
 * 3. Create or retrieve conversation
 * 4. Build context-aware system prompt
 * 5. Check cache for common queries (if AI unavailable)
 * 6. Generate AI response via Vercel AI SDK
 * 7. Save message to database
 * 8. Return response to client
 *
 * @param conversationId - Existing conversation ID (null for new conversation)
 * @param message - User's message text
 * @param context - User's current context (screen, locale, etc.)
 * @returns AI response or error
 */
export async function sendAIMessage(
  conversationId: string | null,
  message: string,
  context: UserContext
): Promise<AIMessageResult> {
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be logged in to use the AI assistant',
      errorCode: 'UNAUTHORIZED',
    };
  }

  // 2. Check subscription tier (Trailblazer only for MVP)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError);
    return {
      success: false,
      error: 'Failed to verify subscription status',
      errorCode: 'UNAUTHORIZED',
    };
  }

  // Type assertion needed due to Supabase type generation timing
  const subscriptionTier = ((profile as any).subscription_tier as 'standard' | 'trailblazer' | null) || 'standard';

  if (subscriptionTier !== 'trailblazer') {
    return {
      success: false,
      error: 'AI assistant is only available for Trailblazer subscribers',
      errorCode: 'UNAUTHORIZED',
    };
  }

  // 3. Check rate limit (30 messages per hour)
  const { data: rateLimitDataRaw } = await supabase.rpc('check_ai_rate_limit', {
    p_user_id: user.id,
    p_endpoint: '/api/chat',
    p_limit: 30,
    p_window_hours: 1,
  });

  // Type assertion for RPC JSON response
  const rateLimitData = rateLimitDataRaw as any;

  if (rateLimitData?.exceeded) {
    recordRateLimitExceeded(user.id, '/api/chat');
    logAIQuery(user.id, conversationId || 'new', message, 'rate_limited');

    return {
      success: false,
      error: `Rate limit exceeded. You can send ${rateLimitData.limit} messages per hour. Resets at ${new Date(rateLimitData.resets_at).toLocaleTimeString()}.`,
      errorCode: 'RATE_LIMITED',
    };
  }

  // 4. Validate input
  const trimmedMessage = message.trim();
  if (!trimmedMessage || trimmedMessage.length > 1000) {
    return {
      success: false,
      error: 'Message must be between 1 and 1000 characters',
      errorCode: 'INVALID_INPUT',
    };
  }

  try {
    // 5. Create or retrieve conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: null, // Will be auto-generated from first message
          message_count: 0,
          context_snapshot: {
            screen: context.screen,
            locale: context.locale,
            inventoryCount: context.inventoryCount,
          },
        })
        .select('id')
        .single();

      if (convError || !newConversation) {
        throw new Error('Failed to create conversation');
      }

      activeConversationId = newConversation.id;
    }

    // 6. Save user message
    await supabase.from('ai_messages').insert({
      conversation_id: activeConversationId,
      role: 'user',
      content: trimmedMessage,
      context: {
        screen: context.screen,
        locale: context.locale,
        inventoryCount: context.inventoryCount,
        currentLoadoutId: context.currentLoadoutId,
        timestamp: new Date().toISOString(),
      },
    });

    // 7. Generate AI response
    const aiResponse = await traceAIQuery(user.id, activeConversationId, async () => {
      // Check if AI is available
      if (!isAIAvailable()) {
        // Attempt cache lookup for common queries
        if (isCacheableQuery(trimmedMessage)) {
          const cachedResponse = await getCachedResponse(trimmedMessage, context.locale as 'en' | 'de');
          if (cachedResponse) {
            logAIQuery(user.id, activeConversationId!, trimmedMessage, 'cached');
            return { text: cachedResponse, tokensUsed: 0, finishReason: 'stop', toolCalls: [] };
          }
        }

        // Fallback response
        const fallback = getFallbackResponse(context.locale as 'en' | 'de');
        logAIQuery(user.id, activeConversationId!, trimmedMessage, 'error');
        return { text: fallback, tokensUsed: 0, finishReason: 'stop', toolCalls: [] };
      }

      // Build context-aware system prompt (T071: includes inventory analysis)
      const systemPrompt = await buildSystemPrompt(context, user.id);

      // Call Vercel AI SDK
      const result = await generateAIResponse(systemPrompt, trimmedMessage);
      logAIQuery(user.id, activeConversationId!, trimmedMessage, 'success');

      return result;
    });

    // 8. Parse and sanitize AI response (T059: pass tool calls)
    const sanitized = sanitizeResponse(aiResponse.text);
    const { cleanText, inlineCards, actions } = parseAIResponse(sanitized, aiResponse.toolCalls);

    // 9. Save AI message
    const { data: aiMessage, error: messageError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'assistant',
        content: cleanText,
        inline_cards: inlineCards.length > 0 ? inlineCards : null,
        actions: actions.length > 0 ? actions : null,
        tokens_used: aiResponse.tokensUsed,
      } as any)
      .select('id')
      .single();

    if (messageError || !aiMessage) {
      throw new Error('Failed to save AI response');
    }

    // 10. Record metrics
    if (aiResponse.tokensUsed > 0) {
      recordTokenUsage(aiResponse.tokensUsed);
    }

    // 11. Update conversation metadata
    // Note: message_count increment happens via database trigger or separate update
    await supabase
      .from('ai_conversations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeConversationId);

    return {
      success: true,
      messageId: aiMessage.id,
      response: cleanText,
    };
  } catch (error) {
    console.error('Error in sendAIMessage:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      errorCode: 'AI_UNAVAILABLE',
    };
  }
}

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
    return { success: false, error: error.message };
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
    return { success: false, error: updateError.message };
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

  // Insert message
  const { error: messageError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: message,
  });

  if (messageError) {
    return { success: false, error: messageError.message };
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
