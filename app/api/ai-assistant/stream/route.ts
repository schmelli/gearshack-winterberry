/**
 * AI Assistant Streaming API Route
 * Feature 050: AI Assistant - Streaming Support
 *
 * Provides real-time streaming of AI responses using Vercel AI SDK.
 * Returns Server-Sent Events (SSE) for word-by-word display.
 *
 * LIMITATION: This endpoint does NOT support tool calling (actions).
 * Tool execution (addToWishlist, compareGear, sendMessage, etc.) is only
 * available via the non-streaming Server Action in actions.ts.
 *
 * Use this endpoint for:
 * - Pure conversational responses
 * - Inventory analysis
 * - General questions
 *
 * Use the Server Action (sendAIMessage) for:
 * - Tool calling and action execution
 * - Adding items to wishlist
 * - Sending messages to other users
 * - Any operation requiring structured responses
 */

import { createClient } from '@/lib/supabase/server';
import { generateStreamingAIResponse, isAIAvailable } from '@/lib/ai-assistant/ai-client';
import { buildSystemPrompt } from '@/lib/ai-assistant/prompt-builder';
import { getCachedResponse, isCacheableQuery, getFallbackResponse } from '@/lib/ai-assistant/cache-strategy';
import { recordRateLimitExceeded, logAIQuery } from '@/lib/ai-assistant/observability';
import { MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } from '@/lib/ai-assistant/constants';
import type { UserContext } from '@/types/ai-assistant';

export const runtime = 'edge'; // Use Edge runtime for streaming

interface StreamRequest {
  conversationId: string | null;
  message: string;
  context: UserContext;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body: StreamRequest = await request.json();
    const { conversationId, message, context } = body;

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'You must be logged in to use the AI assistant' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check subscription tier (Trailblazer only for MVP)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Unable to verify account status' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const subscriptionTier = (profile as any).subscription_tier || 'standard';

    if (subscriptionTier !== 'trailblazer') {
      return new Response(
        JSON.stringify({ error: 'AI assistant is only available for Trailblazer subscribers' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check and increment rate limit atomically
    const { data: rateLimitDataRaw, error: rateLimitError } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: user.id,
      p_endpoint: '/api/ai-assistant/stream',
      p_limit: 100, // Increased for testing (was 30)
      p_window_hours: 1,
    });

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Unable to process request. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rateLimitData = rateLimitDataRaw as any;

    if (rateLimitData?.exceeded) {
      recordRateLimitExceeded(user.id, '/api/ai-assistant/stream');
      logAIQuery(user.id, conversationId || 'new', message, 'rate_limited');

      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. You can send ${rateLimitData.limit} messages per hour. Resets at ${new Date(rateLimitData.resets_at).toLocaleTimeString()}.`,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validate input
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < MIN_MESSAGE_LENGTH || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Check if AI is available, use cache/fallback if not
    if (!isAIAvailable()) {
      // Attempt cache lookup for common queries
      if (isCacheableQuery(trimmedMessage)) {
        const cachedResponse = await getCachedResponse(trimmedMessage, context.locale);
        if (cachedResponse) {
          logAIQuery(user.id, conversationId || 'new', trimmedMessage, 'cached');
          // Return cached response as stream (instant but still uses streaming format)
          const encoder = new TextEncoder();
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode(cachedResponse));
                controller.close();
              },
            }),
            {
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
              },
            }
          );
        }
      }

      // Fallback response
      const fallback = getFallbackResponse(context.locale);
      logAIQuery(user.id, conversationId || 'new', trimmedMessage, 'error');
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(fallback));
            controller.close();
          },
        }),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }
      );
    }

    // 6. Build context-aware system prompt
    const systemPrompt = await buildSystemPrompt(context, user.id);

    // 7. Generate streaming AI response
    const textStream = await generateStreamingAIResponse(systemPrompt, trimmedMessage);

    logAIQuery(user.id, conversationId || 'new', trimmedMessage, 'streaming');

    // 8. Return streaming response
    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error in streaming endpoint:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
