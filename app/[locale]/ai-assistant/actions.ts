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
import { MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } from '@/lib/ai-assistant/constants';
import { searchCommunityOffers, type CommunitySearchResult } from '@/lib/ai-assistant/community-search';
import type { UserContext } from '@/types/ai-assistant';
import type { Json } from '@/types/supabase';
import { z } from 'zod';

// =====================================================
// Types
// =====================================================

export type AIMessageResult =
  | { success: true; messageId: string; response: string }
  | { success: false; error: string; errorCode: 'RATE_LIMITED' | 'UNAUTHORIZED' | 'AI_UNAVAILABLE' | 'INVALID_INPUT' };

/**
 * Supabase Profile with subscription_tier field
 * Matches profiles table schema
 */
interface ProfileWithSubscription {
  subscription_tier: 'standard' | 'trailblazer' | null;
  [key: string]: unknown; // Allow other profile fields
}

/**
 * Response from check_ai_rate_limit RPC function
 * Matches database function return type
 */
interface RateLimitCheckResult {
  exceeded: boolean;
  count: number;
  limit: number;
  resets_at: string; // ISO 8601 timestamp
}

/**
 * AI message insert payload with JSONB columns
 * Matches ai_messages table schema
 */
interface AIMessageInsert {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  inline_cards?: Json | null;
  actions?: Json | null;
  context?: Json;
  tokens_used?: number | null;
}

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
    return {
      success: false,
      error: sanitizeError(profileError, 'Unable to verify account status'),
      errorCode: 'UNAUTHORIZED',
    };
  }

  // Type-safe access to subscription_tier field
  const profileWithSub = profile as ProfileWithSubscription;
  const subscriptionTier = profileWithSub.subscription_tier || 'standard';

  if (subscriptionTier !== 'trailblazer') {
    return {
      success: false,
      error: 'AI assistant is only available for Trailblazer subscribers',
      errorCode: 'UNAUTHORIZED',
    };
  }

  // 3. Check and increment rate limit atomically (30 messages per hour)
  // @ts-expect-error - RPC function exists but types not regenerated
  const { data: rateLimitDataRaw, error: rateLimitError } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: user.id,
    p_endpoint: '/api/chat',
    p_limit: 30,
    p_window_hours: 1,
  });

  if (rateLimitError) {
    console.error('Rate limit check failed:', rateLimitError);
    return {
      success: false,
      error: 'Unable to process request. Please try again.',
      errorCode: 'AI_UNAVAILABLE',
    };
  }

  // Type-safe access to RPC response
  const rateLimitData = rateLimitDataRaw as RateLimitCheckResult | null;

  if (rateLimitData?.exceeded) {
    recordRateLimitExceeded(user.id, '/api/chat');
    logAIQuery(user.id, conversationId || 'new', message, 'rate_limited');

    return {
      success: false,
      error: `Rate limit exceeded. You can send ${rateLimitData.limit} messages per hour. Resets at ${new Date(rateLimitData.resets_at).toLocaleTimeString()}.`,
      errorCode: 'RATE_LIMITED',
    };
  }

  // Note: Rate limit is already incremented atomically by check_and_increment_rate_limit above
  // No separate increment call needed - this prevents race conditions

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
          const cachedResponse = await getCachedResponse(trimmedMessage, context.locale);
          if (cachedResponse) {
            logAIQuery(user.id, activeConversationId!, trimmedMessage, 'cached');
            return { text: cachedResponse, tokensUsed: 0, finishReason: 'stop', toolCalls: [] };
          }
        }

        // Fallback response (supports any locale with fallback to English)
        const fallback = getFallbackResponse(context.locale);
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

    // 8. Execute any tool calls (e.g., searchCommunity)
    // Store execution results for each tool call by toolCallId
    const toolResults = new Map<string, CommunitySearchResult | unknown>();

    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      for (const toolCall of aiResponse.toolCalls) {
        if (toolCall.toolName === 'searchCommunity' && toolCall.args) {
          try {
            const searchResult = await searchCommunityOffers(
              user.id,
              toolCall.args.query || '',
              {
                maxPrice: toolCall.args.maxPrice,
                maxWeight: toolCall.args.maxWeight,
              }
            );
            toolResults.set(toolCall.toolCallId, searchResult);
          } catch (error) {
            console.error('Error executing searchCommunity tool:', error);
            // Continue without results - won't show inline cards
          }
        }
      }
    }

    // 9. Parse and sanitize AI response (T059: pass tool calls and results)
    const sanitized = sanitizeResponse(aiResponse.text);
    const { cleanText, inlineCards, actions } = parseAIResponse(sanitized, aiResponse.toolCalls, toolResults);

    // 10. Save AI message
    const aiMessagePayload: AIMessageInsert = {
      conversation_id: activeConversationId,
      role: 'assistant',
      content: cleanText,
      inline_cards: inlineCards.length > 0 ? (inlineCards as unknown as Json) : null,
      actions: actions.length > 0 ? (actions as unknown as Json) : null,
      tokens_used: aiResponse.tokensUsed,
    };

    const { data: aiMessage, error: messageError } = await supabase
      .from('ai_messages')
      .insert(aiMessagePayload)
      .select('id')
      .single();

    if (messageError || !aiMessage) {
      throw new Error('Failed to save AI response');
    }

    // 11. Record metrics
    if (aiResponse.tokensUsed > 0) {
      recordTokenUsage(aiResponse.tokensUsed);
    }

    // 12. Update conversation metadata
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
    return {
      success: false,
      error: sanitizeError(error, 'Unable to process your message. Please try again.'),
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
