/**
 * Mastra Chat API Route
 * Feature: 001-mastra-agentic-voice
 * Tasks: T023, T026-T032 [US1] - Persistent Memory Chat
 *
 * Provides streaming SSE responses for the Mastra agentic chat system
 * with persistent conversation memory, rate limiting, and observability.
 *
 * Pipeline: Uses the Mastra Workflow `gear-assistant` for structured
 * orchestration of Classify → Prefetch → Build Context, then streams
 * the agent response via SSE.
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
 * - Per-step OTel tracing via Mastra Workflow engine
 */

import { createClient } from '@/lib/supabase/server';
import {
  createStreamingResponse,
  createStreamingErrorResponse,
  encodeTextEvent,
  encodeDoneEvent,
  encodeErrorEvent,
  encodeWorkflowProgressEvent,
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
import { checkAndIncrementRateLimit, type OperationType } from '@/lib/mastra/rate-limiter';
import { createGearAgent, streamMastraResponse } from '@/lib/mastra/mastra-agent';
import {
  generateProactiveSuggestions,
  formatSuggestionsForStream,
  shouldShowProactiveSuggestions,
} from '@/lib/mastra/proactive-suggestions';
import { mastra } from '@/lib/mastra/instance';
import type { GearAssistantWorkflowOutput } from '@/lib/mastra/workflows/gear-assistant-workflow';
import type { MastraChatRequest } from '@/types/mastra';

// Force Node.js runtime for Mastra compatibility
export const runtime = 'nodejs';

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

  // SECURITY: Sanitize input to prevent control character injection and null bytes
  // Remove null bytes, control characters (except newlines/tabs), and other dangerous chars
  const sanitizedMessage = trimmedMessage
    .replace(/\0/g, '') // Null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Control chars (keep \n \r \t)

  if (sanitizedMessage !== trimmedMessage) {
    return { valid: false, error: 'message contains invalid control characters' };
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

// buildPromptContext logic is now handled by the gear-assistant workflow's buildContext step

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

    // 6. Check rate limits (must remain outside stream for proper HTTP status codes)
    const currentLoadoutId = context?.currentLoadoutId as string | undefined;
    const rateLimitResult = await checkAndIncrementRateLimit(user.id, operationType as OperationType);

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

    // 7. Check AI availability before starting stream (proper HTTP 503)
    if (!process.env.AI_GATEWAY_KEY && !process.env.AI_GATEWAY_API_KEY) {
      logWarn('AI service unavailable - AI_GATEWAY_KEY not configured', { userId: user.id });
      recordChatError('ai_unavailable');

      return createStreamingErrorResponse(
        'AI service is temporarily unavailable. Please try again later.',
        'AI_UNAVAILABLE',
        503
      );
    }

    // 8. Start the stream IMMEDIATELY, then do slow pipeline work inside start()
    // This allows us to emit workflow_progress SSE events during memory fetch,
    // intent classification, and prefetch so the user sees real-time progress.
    const encoder = new TextEncoder();
    const messageId = crypto.randomUUID();
    let fullResponse = '';

    // Determine locale for progress messages (hardcoded server-side, no i18n needed)
    const locale = (context?.locale as string) === 'de' ? 'de' : 'en';

    const progressMessages = {
      en: {
        memory: 'Loading your profile...',
        context: 'Analysing your gear...',
        thinking: 'Preparing answer...',
      },
      de: {
        memory: 'Profil wird geladen...',
        context: 'Ausrüstung wird analysiert...',
        thinking: 'Antwort wird vorbereitet...',
      },
    } as const;

    const stream = new ReadableStream({
      async start(controller) {
        let hadError = false;

        // Helper to emit progress events
        const emitProgress = (step: string, msg: string) => {
          controller.enqueue(encoder.encode(encodeWorkflowProgressEvent(step, 'running', msg)));
        };

        try {
          // =============================================================
          // Phase 1-3: Execute Mastra Workflow (Classify → Prefetch → Build Context)
          // The gear-assistant workflow handles:
          //   Step 1 (classifyIntent): Gemini Flash intent classification
          //   Step 2 (prefetchData): Parallel data fetching
          //   Step 3 (buildContext): System prompt assembly + fast-path attempt
          // =============================================================
          emitProgress('memory', progressMessages[locale].memory);

          const workflow = mastra.getWorkflow('gear-assistant');
          const run = await workflow.createRun({ resourceId: user.id });

          const workflowResult = await run.start({
            inputData: {
              message,
              userId: user.id,
              conversationId,
              locale: (context?.locale as string) || 'en',
              screen: (context?.screen as string) || 'inventory',
              inventoryCount: (context?.inventoryCount as number) || 0,
              currentLoadoutId,
              enableTools,
            },
          });

          // Extract workflow output
          if (workflowResult.status !== 'success' || !workflowResult.result) {
            const stepErrors = Object.entries(workflowResult.steps)
              .filter(([, step]) => step?.status === 'failed')
              .map(([name]) => name);

            throw new Error(
              `Workflow failed at step(s): ${stepErrors.join(', ') || 'unknown'}`,
            );
          }

          const pipelineOutput = workflowResult.result as GearAssistantWorkflowOutput;

          logInfo('Gear-assistant workflow completed', {
            userId: user.id,
            conversationId,
            metadata: {
              intent: pipelineOutput.intent,
              confidence: pipelineOutput.confidence,
              hasFastAnswer: !!pipelineOutput.fastAnswer,
              workflowSteps: Object.keys(workflowResult.steps),
            },
          });

          // =============================================================
          // Fast-path: If the workflow produced a fast answer, return it
          // =============================================================
          if (pipelineOutput.fastAnswer) {
            logInfo('Fast-path answer served via workflow', {
              userId: user.id,
              conversationId,
              metadata: {
                intent: pipelineOutput.intent,
                latencyMs: requestTimer(),
              },
            });

            fullResponse = pipelineOutput.fastAnswer;
            const totalLatencyMs = requestTimer();
            controller.enqueue(encoder.encode(encodeTextEvent(pipelineOutput.fastAnswer)));
            controller.enqueue(
              encoder.encode(encodeDoneEvent(messageId, 'stop', undefined, totalLatencyMs)),
            );

            recordAgentLatency(totalLatencyMs / 1000, 'simple');
            controller.close();
            return;
          }

          // =============================================================
          // Phase 4: Agent Streaming (uses workflow output as context)
          // =============================================================
          emitProgress('thinking', progressMessages[locale].thinking);

          const { result: streamingResult } = await traceWorkflowStep(
            `chat-${conversationId}`,
            'agent_generation',
            async () => {
              const agent = createGearAgent(user.id, pipelineOutput.enrichedSystemPrompt);
              return await streamMastraResponse(
                agent,
                message,
                user.id,
                conversationId,
                currentLoadoutId,
              );
            },
            { userId: user.id },
          );

          // Stream text chunks
          let chunkCount = 0;
          for await (const chunk of streamingResult.textStream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(encodeTextEvent(chunk)));
            chunkCount++;
          }

          logDebug('Text stream completed', {
            userId: user.id,
            conversationId,
            metadata: {
              chunkCount,
              fullResponseLength: fullResponse.length,
              responsePreview: fullResponse.substring(0, 100),
            },
          });

          // Wait for tool calls and finish reason
          const [toolCalls, finishReason] = await Promise.all([
            streamingResult.toolCalls,
            streamingResult.finishReason,
          ]);

          logDebug('Streaming finished', {
            userId: user.id,
            conversationId,
            metadata: {
              finishReason,
              toolCallCount: toolCalls?.length || 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool calls have dynamic structure from AI SDK
              toolNames: toolCalls?.map((tc: any) => tc.toolName || tc.name || 'unknown').join(', ') || 'none',
            },
          });

          // Record tool call metrics (T031)
          if (toolCalls && Array.isArray(toolCalls)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool calls have dynamic structure from AI SDK
            for (const tc of toolCalls as any[]) {
              recordToolCall(tc.toolName || tc.name || 'unknown');
            }
          }

          // BUGFIX: Detect empty responses and provide fallback message
          if (!fullResponse || fullResponse.trim().length === 0) {
            const fallbackMessage = toolCalls && toolCalls.length > 0
              ? "I apologize, but I'm having trouble accessing your data right now. This might be due to temporary rate limiting. Please try again in a moment, or rephrase your question."
              : "I apologize, but I wasn't able to generate a response. Please try asking your question again.";

            fullResponse = fallbackMessage;
            controller.enqueue(encoder.encode(encodeTextEvent(fallbackMessage)));

            logWarn('Empty AI response detected, injected fallback message', {
              userId: user.id,
              conversationId,
              metadata: {
                hadToolCalls: toolCalls?.length || 0,
                finishReason,
              },
            });
          }

          // Improvement #4: Add proactive suggestions to stream
          const isNaturalCompletion = finishReason === 'stop';
          if (isNaturalCompletion && shouldShowProactiveSuggestions(fullResponse.length, hadError)) {
            const suggestions = generateProactiveSuggestions(
              {
                screen: (context?.screen as string) || 'inventory',
                locale: (context?.locale as string) || 'en',
                inventoryCount: (context?.inventoryCount as number) || 0,
                currentLoadoutId,
                userId: user.id,
                subscriptionTier: 'standard',
              },
              null,
              (context?.locale as 'en' | 'de') || 'en',
            );

            if (suggestions.length > 0) {
              const suggestionsText = formatSuggestionsForStream(
                suggestions,
                (context?.locale as 'en' | 'de') || 'en',
              );
              controller.enqueue(encoder.encode(encodeTextEvent(suggestionsText)));
              fullResponse += suggestionsText;

              logDebug('Proactive suggestions added to response', {
                userId: user.id,
                conversationId,
                metadata: {
                  suggestionCount: suggestions.length,
                  finishReason,
                },
              });
            }
          }

          // Record latency metrics (T031)
          const totalLatencyMs = requestTimer();
          recordAgentLatency(totalLatencyMs / 1000, queryType);

          // Send completion event
          controller.enqueue(
            encoder.encode(encodeDoneEvent(messageId, finishReason || 'stop', undefined, totalLatencyMs)),
          );

          logInfo('Mastra chat request completed', {
            metadata: {
              messageId,
              latencyMs: totalLatencyMs,
              responseLength: fullResponse.length,
              toolCallCount: toolCalls?.length || 0,
            },
          });

          controller.close();
        } catch (streamError) {
          hadError = true;
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

    // Return streaming response with rate limit headers and conversation ID
    const headers: Record<string, string> = {
      ...rateLimitHeaders,
      'X-Conversation-Id': conversationId,
    };

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
