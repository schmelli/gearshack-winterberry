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
            return { text: cachedResponse, tokensUsed: 0, finishReason: 'stop' };
          }
        }

        // Fallback response
        const fallback = getFallbackResponse(context.locale as 'en' | 'de');
        logAIQuery(user.id, activeConversationId!, trimmedMessage, 'error');
        return { text: fallback, tokensUsed: 0, finishReason: 'stop' };
      }

      // Build context-aware system prompt
      const systemPrompt = buildSystemPrompt(context);

      // Call Vercel AI SDK
      const result = await generateAIResponse(systemPrompt, trimmedMessage);
      logAIQuery(user.id, activeConversationId!, trimmedMessage, 'success');

      return result;
    });

    // 8. Parse and sanitize AI response
    const sanitized = sanitizeResponse(aiResponse.text);
    const { cleanText, inlineCards, actions } = parseAIResponse(sanitized);

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
