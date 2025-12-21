/**
 * Mastra Chat API Route
 * Feature: 001-mastra-agentic-voice
 * Tasks: T023, T026-T032 [US1] - Persistent Memory Chat
 *
 * Provides streaming SSE responses for the Mastra agentic chat system
 * with persistent conversation memory, rate limiting, and observability.
 *
 * SSE Event Types:
 * - text: Text content chunk
 * - tool_call: Tool invocation metadata
 * - tool_result: Tool execution result
 * - workflow_progress: Multi-step workflow status updates
 * - done: Stream complete with final metadata
 * - error: Error occurred during streaming
 *
 * Memory Features (T026-T029):
 * - Conversation history retrieval (last 50 messages)
 * - Memory correction detection ("Actually, that's wrong...")
 * - Graceful degradation when memory unavailable
 * - Automatic message persistence
 *
 * Observability (T030-T032):
 * - Structured logging at each step
 * - Prometheus metrics (latency, counters, errors)
 * - Distributed tracing spans
 */

import { createClient } from '@/lib/supabase/server';
import {
  createStreamingResponse,
  createStreamingErrorResponse,
  encodeTextEvent,
  encodeDoneEvent,
  encodeErrorEvent,
} from '@/lib/mastra/streaming';
import {
  logInfo,
  logError,
  logDebug,
  logWarn,
  setLogContext,
  clearLogContext,
  createTimer,
} from '@/lib/mastra/logging';
import {
  recordChatRequest,
  recordAgentLatency,
  recordChatError,
  recordToolCall,
  classifyQuery,
} from '@/lib/mastra/metrics';
import { traceWorkflowStep, getTraceId } from '@/lib/mastra/tracing';
import { checkRateLimit, type OperationType } from '@/lib/mastra/rate-limiter';
import { createMemoryAdapter, type SupabaseMemoryAdapter } from '@/lib/mastra/memory-adapter';
import { buildMastraSystemPrompt, type PromptContext } from '@/lib/mastra/config';
import { generateStreamingAIResponse, isAIAvailable } from '@/lib/ai-assistant/ai-client';
import type { MastraChatRequest } from '@/types/mastra';
import type { UserContext } from '@/types/ai-assistant';
import type { Database } from '@/types/supabase';

// Force Node.js runtime for Mastra compatibility
export const runtime = 'nodejs';

// =====================================================
// Constants
// =====================================================

/** Maximum conversation history messages to retrieve */
const MEMORY_HISTORY_LIMIT = 50;

/** Patterns that indicate user is correcting previous information */
const CORRECTION_PATTERNS = [
  /actually,?\s+(that'?s?|it'?s?)\s+(wrong|incorrect|not\s+right)/i,
  /no,?\s+(that'?s?|it'?s?)\s+(wrong|incorrect|not\s+right)/i,
  /i\s+(meant|mean)\s+/i,
  /correction:\s*/i,
  /let\s+me\s+correct\s+/i,
  /to\s+clarify,?\s*/i,
  /i\s+should\s+have\s+said/i,
];

// =====================================================
// Types
// =====================================================

interface MemoryContext {
  available: boolean;
  adapter: SupabaseMemoryAdapter | null;
  history: Array<{ role: string; content: string }>;
  warning?: string;
}

// =====================================================
// Request Validation
// =====================================================

function validateRequest(body: unknown): {
  valid: true;
  data: MastraChatRequest;
} | {
  valid: false;
  error: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const request = body as Record<string, unknown>;

  // conversationId can be null/undefined for new conversations (will be generated)
  // or a non-empty string for existing conversations
  if (request.conversationId !== null && request.conversationId !== undefined) {
    if (typeof request.conversationId !== 'string' || request.conversationId.trim() === '') {
      return { valid: false, error: 'conversationId must be a non-empty string if provided' };
    }
  }

  if (typeof request.message !== 'string' || request.message.trim() === '') {
    return { valid: false, error: 'message is required and must be a non-empty string' };
  }

  const trimmedMessage = request.message.trim();
  if (trimmedMessage.length < 1) {
    return { valid: false, error: 'message must contain at least 1 character' };
  }
  if (trimmedMessage.length > 10000) {
    return { valid: false, error: 'message must not exceed 10000 characters' };
  }

  if (request.context !== undefined && (typeof request.context !== 'object' || request.context === null)) {
    return { valid: false, error: 'context must be an object if provided' };
  }

  if (request.enableTools !== undefined && typeof request.enableTools !== 'boolean') {
    return { valid: false, error: 'enableTools must be a boolean if provided' };
  }

  if (request.enableVoice !== undefined && typeof request.enableVoice !== 'boolean') {
    return { valid: false, error: 'enableVoice must be a boolean if provided' };
  }

  return {
    valid: true,
    data: {
      conversationId: (request.conversationId as string | null | undefined) ?? null,
      message: trimmedMessage,
      context: request.context as Record<string, unknown> | undefined,
      enableTools: request.enableTools as boolean | undefined,
      enableVoice: request.enableVoice as boolean | undefined,
    },
  };
}

// =====================================================
// Memory Functions (T026-T029)
// =====================================================

/**
 * T027: Fetch conversation history from memory
 * T029: Gracefully handle memory unavailability
 */
async function fetchMemoryContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string
): Promise<MemoryContext> {
  const getElapsed = createTimer();

  try {
    const adapter = createMemoryAdapter(supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>);

    logDebug('Fetching conversation history', {
      userId,
      conversationId,
      metadata: { limit: MEMORY_HISTORY_LIMIT },
    });

    const messages = await adapter.getMessages({
      userId,
      conversationId,
      limit: MEMORY_HISTORY_LIMIT,
    });

    // Reverse to get chronological order (oldest first)
    const history = messages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    logInfo('Memory retrieval completed', {
      userId,
      conversationId,
      metadata: {
        messageCount: history.length,
        latencyMs: getElapsed(),
      },
    });

    return {
      available: true,
      adapter,
      history,
    };
  } catch (error) {
    // T029: Graceful degradation - continue without memory
    logWarn('Memory unavailable, continuing in stateless mode', {
      userId,
      conversationId,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: getElapsed(),
      },
    });

    return {
      available: false,
      adapter: null,
      history: [],
      warning: 'Conversation memory is temporarily unavailable. This chat will not be saved.',
    };
  }
}

/**
 * T028: Detect memory correction patterns in user message
 */
function detectCorrectionIntent(message: string): boolean {
  return CORRECTION_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * T026: Save messages to memory after response
 */
async function saveToMemory(
  adapter: SupabaseMemoryAdapter | null,
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantResponse: string,
  isCorrection: boolean
): Promise<void> {
  if (!adapter) {
    logDebug('Skipping memory save - adapter unavailable', { userId, conversationId });
    return;
  }

  const getElapsed = createTimer();

  try {
    const now = new Date();
    const metadata = isCorrection ? { isCorrection: true } : {};

    await adapter.saveMessages([
      {
        id: `user-${Date.now()}`,
        userId,
        conversationId,
        role: 'user',
        content: userMessage,
        metadata,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `assistant-${Date.now() + 1}`,
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
  } catch (error) {
    // Log but don't fail the request
    logError('Failed to save messages to memory', error, {
      userId,
      conversationId,
      metadata: { latencyMs: getElapsed() },
    });
  }
}

// =====================================================
// System Prompt Builder
// =====================================================

function buildPromptContext(
  userContext: Record<string, unknown> | undefined,
  history: Array<{ role: string; content: string }>,
  memoryWarning?: string,
  userId?: string,
  subscriptionTier?: 'standard' | 'trailblazer'
): PromptContext {
  const locale = (userContext?.locale as string) || 'en';
  const screen = (userContext?.screen as string) || 'inventory';
  const inventoryCount = (userContext?.inventoryCount as number) || 0;
  const currentLoadoutId = userContext?.currentLoadoutId as string | undefined;

  // Build UserContext for prompt builder
  const promptUserContext: UserContext = {
    screen,
    locale,
    inventoryCount,
    currentLoadoutId,
    userId: userId || 'anonymous',
    subscriptionTier: subscriptionTier || 'standard',
  };

  const promptContext: PromptContext = {
    userContext: promptUserContext,
  };

  // Add memory context hint if there's history
  if (history.length > 0) {
    promptContext.gearList = `Previous conversation context: ${history.length} messages in history.`;
  }

  // Add memory warning if applicable
  if (memoryWarning) {
    promptContext.catalogResults = `SYSTEM NOTE: ${memoryWarning}`;
  }

  return promptContext;
}

// =====================================================
// POST Handler
// =====================================================

export async function POST(request: Request): Promise<Response> {
  const requestTimer = createTimer();
  const traceId = getTraceId();

  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logError('Failed to parse request body');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate request structure
    const validation = validateRequest(body);
    if (!validation.valid) {
      logError('Request validation failed', new Error(validation.error));
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, context, enableTools = true, enableVoice } = validation.data;
    // Generate conversation ID if not provided (ensures memory persistence works)
    const conversationId = validation.data.conversationId || crypto.randomUUID();

    // 3. Authenticate user via Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logError('Authentication failed', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in to use the chat.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Set logging context (T030)
    setLogContext({
      userId: user.id,
      conversationId,
      traceId,
      metadata: { enableTools, enableVoice },
    });

    logInfo('Mastra chat request started', {
      metadata: {
        messageLength: message.length,
        hasContext: !!context,
        enableTools,
        enableVoice,
      },
    });

    // 5. Classify query and record metrics (T031)
    const queryType = classifyQuery(message);
    const operationType = enableVoice ? 'voice' : (queryType === 'complex' ? 'workflow' : 'simple_query');
    recordChatRequest(operationType);

    // 6. Check rate limits and fetch memory context in parallel (optimized)
    // Running both in parallel saves ~50-200ms per request in the happy path
    const [rateLimitResult, memoryContextResult] = await Promise.all([
      checkRateLimit(user.id, operationType as OperationType),
      traceWorkflowStep(
        `chat-${conversationId}`,
        'memory_retrieval',
        () => fetchMemoryContext(supabase, user.id, conversationId),
        { userId: user.id }
      ).then(r => r.result),
    ]);

    // Check rate limit result first (early return if exceeded)
    if (!rateLimitResult.allowed) {
      logWarn('Rate limit exceeded', {
        userId: user.id,
        metadata: {
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
      });
      recordChatError('rate_limit');

      // T106: Rate limit exceeded response with proper headers
      const resetTimestamp = rateLimitResult.resetAt
        ? Math.ceil(rateLimitResult.resetAt.getTime() / 1000)
        : Math.ceil(Date.now() / 1000) + 3600;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetTimestamp * 1000 - Date.now()) / 1000)
      );

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You have exceeded your rate limit. Please wait ${retryAfterSeconds} seconds before trying again.`,
          limit: rateLimitResult.limit,
          remaining: 0,
          resetAt: rateLimitResult.resetAt?.toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(rateLimitResult.limit ?? 'unlimited'),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetTimestamp),
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    // Store rate limit info for response headers (T105)
    const rateLimitHeaders: Record<string, string> = {};
    if (rateLimitResult.limit !== null) {
      rateLimitHeaders['X-RateLimit-Limit'] = String(rateLimitResult.limit);
      rateLimitHeaders['X-RateLimit-Remaining'] = String(rateLimitResult.remaining ?? 0);
      if (rateLimitResult.resetAt) {
        rateLimitHeaders['X-RateLimit-Reset'] = String(
          Math.ceil(rateLimitResult.resetAt.getTime() / 1000)
        );
      }
    }

    // Use the memory context fetched in parallel
    const memoryContext = memoryContextResult;

    // 8. Detect correction intent (T028)
    const isCorrection = detectCorrectionIntent(message);
    if (isCorrection) {
      logInfo('Correction intent detected', {
        userId: user.id,
        conversationId,
      });
    }

    // 9. Build system prompt with memory context
    const promptContext = buildPromptContext(context, memoryContext.history, memoryContext.warning, user.id);
    const systemPrompt = buildMastraSystemPrompt(promptContext);

    // 10. Check AI availability
    if (!isAIAvailable()) {
      logWarn('AI service unavailable', { userId: user.id });
      recordChatError('ai_unavailable');

      return createStreamingErrorResponse(
        'AI service is temporarily unavailable. Please try again later.',
        'AI_UNAVAILABLE',
        503
      );
    }

    // 11. Generate streaming response with tracing (T032)
    const encoder = new TextEncoder();
    const messageId = crypto.randomUUID();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream AI response
          const { result: streamingResult } = await traceWorkflowStep(
            `chat-${conversationId}`,
            'agent_generation',
            async () => {
              return await generateStreamingAIResponse(
                systemPrompt,
                message,
                enableTools,
                undefined,
                user.id
              );
            },
            { userId: user.id }
          );

          // Stream text chunks
          for await (const chunk of streamingResult.textStream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(encodeTextEvent(chunk)));
          }

          // Wait for tool calls and finish reason
          const [toolCalls, finishReason] = await Promise.all([
            streamingResult.toolCalls,
            streamingResult.finishReason,
          ]);

          // Record tool call metrics (T031)
          if (toolCalls && Array.isArray(toolCalls)) {
            for (const tc of toolCalls) {
              recordToolCall(tc.toolName || 'unknown');
            }
          }

          // Save to memory after successful response (T026)
          await traceWorkflowStep(
            `chat-${conversationId}`,
            'memory_save',
            () => saveToMemory(
              memoryContext.adapter,
              user.id,
              conversationId,
              message,
              fullResponse,
              isCorrection
            ),
            { userId: user.id }
          );

          // Record latency metrics (T031)
          const totalLatencyMs = requestTimer();
          recordAgentLatency(totalLatencyMs / 1000, queryType);

          // Send completion event (tokensUsed not available from streaming, pass undefined)
          controller.enqueue(
            encoder.encode(encodeDoneEvent(messageId, finishReason || 'stop', undefined, totalLatencyMs))
          );

          logInfo('Mastra chat request completed', {
            metadata: {
              messageId,
              latencyMs: totalLatencyMs,
              responseLength: fullResponse.length,
              toolCallCount: toolCalls?.length || 0,
              memoryAvailable: memoryContext.available,
              isCorrection,
            },
          });

          controller.close();
        } catch (streamError) {
          const errorMessage =
            streamError instanceof Error ? streamError.message : 'Unknown streaming error';

          logError('Streaming error', streamError instanceof Error ? streamError : undefined);
          recordChatError('stream_error');

          controller.enqueue(encoder.encode(encodeErrorEvent(errorMessage, 'STREAM_ERROR')));
          controller.close();
        } finally {
          clearLogContext();
        }
      },

      cancel() {
        logInfo('Client disconnected, stream cancelled');
        clearLogContext();
      },
    });

    // Return streaming response with memory warning and rate limit headers (T105)
    const headers: Record<string, string> = {
      ...rateLimitHeaders,
    };
    if (memoryContext.warning) {
      headers['X-Memory-Warning'] = memoryContext.warning;
    }

    return createStreamingResponse(stream, headers);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    logError('Mastra chat request failed', error instanceof Error ? error : undefined);
    recordChatError('server_error');
    clearLogContext();

    return createStreamingErrorResponse(errorMessage, 'SERVER_ERROR', 500);
  }
}

// =====================================================
// Method Not Allowed Handlers
// =====================================================

export function GET(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
  );
}

export function PUT(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
  );
}

export function DELETE(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
  );
}
