/**
 * AI Assistant Streaming API Route
 * Feature 050: AI Assistant - Streaming Support
 * Phase 1: Tool Support in Streaming
 *
 * Provides real-time streaming of AI responses using Vercel AI SDK.
 * Returns Server-Sent Events (SSE) for word-by-word display.
 *
 * Phase 1 Enhancement: Now supports tool calling during streaming.
 * Tool metadata is emitted via SSE events for client-side orchestration.
 *
 * SSE Event Types:
 * - text: Text content chunk
 * - tool_call: Tool invocation metadata
 * - done: Stream complete with final metadata
 * - error: Error occurred during streaming
 *
 * Request Body:
 * - conversationId: string | null - Existing conversation or null for new
 * - message: string - User's message
 * - context: UserContext - Current app context
 * - enableTools?: boolean - Enable tool calling (default: false for backwards compat)
 */

import { createClient } from '@/lib/supabase/server';
import { generateStreamingAIResponse, isAIAvailable } from '@/lib/ai-assistant/ai-client';
import { buildSystemPrompt } from '@/lib/ai-assistant/prompt-builder';
import { getCachedResponse, isCacheableQuery, getFallbackResponse } from '@/lib/ai-assistant/cache-strategy';
import { recordRateLimitExceeded, logAIQuery } from '@/lib/ai-assistant/observability';
import { MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } from '@/lib/ai-assistant/constants';
import {
  encodeTextChunk,
  encodeDoneEvent,
  encodeErrorEvent,
} from '@/lib/ai-assistant/stream-parser';
import type { UserContext } from '@/types/ai-assistant';
import { validateAIConfig } from '@/lib/env';

// Note: Using Node.js runtime because dependencies (prom-client, MCP SDK)
// require Node.js APIs (cluster, child_process, v8). SSE streaming works fine with Node.js.
export const runtime = 'nodejs';

interface StreamRequest {
  conversationId: string | null;
  message: string;
  context: UserContext;
  /** Phase 1: Enable tool calling in streaming (default: false) */
  enableTools?: boolean;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body: StreamRequest = await request.json();
    const { conversationId, message, context, enableTools = false } = body;

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

    // 2. Check if rate limiting is disabled (for testing)
    // Validate AI config (throws if invalid) - result intentionally unused
    validateAIConfig();
    const rateLimitingDisabled = process.env.AI_RATE_LIMITING_DISABLED === 'true';

    if (!rateLimitingDisabled) {
      // 2a. Check subscription tier (Trailblazer only for MVP)
      const { data: profile, error: profileError } = await (supabase as any)
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

      // 2b. Check and increment rate limit atomically
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
    } else {
      console.log('[AI Assistant] Rate limiting disabled for testing');
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

    // 6. Build context-aware system prompt (with catalog search)
    const systemPrompt = await buildSystemPrompt(context, user.id, trimmedMessage);

    // 7. Generate streaming AI response (Phase 1: with optional tools)
    const streamingResult = await generateStreamingAIResponse(
      systemPrompt,
      trimmedMessage,
      enableTools,
      undefined, // Use default timeout
      user.id // Pass userId for tool execution
    );

    logAIQuery(user.id, conversationId || 'new', trimmedMessage, 'streaming');

    // 8. Create SSE stream with text and tool metadata
    // Phase 1: When enableTools is true, use SSE format for tool support
    // When enableTools is false, maintain backwards compatibility with plain text
    if (enableTools) {
      // SSE format with tool support
      const encoder = new TextEncoder();

      const sseStream = new ReadableStream({
        async start(controller) {
          try {
            // Stream text chunks as SSE events
            for await (const chunk of streamingResult.textStream) {
              controller.enqueue(encoder.encode(encodeTextChunk(chunk)));
            }

            // Wait for tool calls and finish reason
            const [toolCalls, finishReason] = await Promise.all([
              streamingResult.toolCalls,
              streamingResult.finishReason,
            ]);

            // Send done event with tool calls
            controller.enqueue(
              encoder.encode(encodeDoneEvent(finishReason, toolCalls))
            );

            controller.close();
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Streaming error';
            controller.enqueue(
              encoder.encode(encodeErrorEvent(errorMessage, 'STREAM_ERROR'))
            );
            controller.close();
          }
        },
      });

      return new Response(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Backwards compatible plain text stream (no SSE formatting)
      return new Response(streamingResult.textStream as unknown as BodyInit, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }
  } catch (error) {
    console.error('Error in streaming endpoint:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
